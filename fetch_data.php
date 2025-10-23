<?php
/**
 * 数据获取脚本
 * 从世界银行API获取出生率、人口和GDP数据
 */

header('Content-Type: application/json; charset=utf-8');

// 允许跨域请求（开发环境）
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

// 数据缓存文件路径
$cacheFile = 'data_cache.json';
$cacheTime = 86400; // 缓存24小时

// 检查缓存是否有效
if (file_exists($cacheFile) && (time() - filemtime($cacheFile) < $cacheTime)) {
    echo file_get_contents($cacheFile);
    exit;
}

/**
 * 从API获取数据
 */
function fetchFromAPI($url) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Birth-Lottery-Web/1.0');
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    if (curl_errno($ch)) {
        $error = curl_error($ch);
        curl_close($ch);
        throw new Exception("cURL Error: $error");
    }
    
    curl_close($ch);
    
    if ($httpCode !== 200) {
        throw new Exception("HTTP Error: $httpCode");
    }
    
    return $response;
}

/**
 * 解析世界银行API响应
 */
function parseWorldBankData($jsonData) {
    $data = json_decode($jsonData, true);
    
    if (!$data || !is_array($data) || count($data) < 2) {
        throw new Exception("Invalid API response format");
    }
    
    // 世界银行API返回格式：[metadata, data]
    return $data[1];
}

try {
    // 1. 获取2023年出生率数据
    echo "<!-- Fetching birth rate data... -->\n";
    $birthRateUrl = 'https://api.worldbank.org/v2/country/all/indicator/SP.DYN.CBRT.IN?format=json&date=2023:2023&per_page=20000';
    $birthRateResponse = fetchFromAPI($birthRateUrl);
    $birthRateData = parseWorldBankData($birthRateResponse);
    
    // 2. 获取2023年人口数据
    echo "<!-- Fetching population data... -->\n";
    $populationUrl = 'https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL?format=json&date=2023:2023&per_page=20000';
    $populationResponse = fetchFromAPI($populationUrl);
    $populationData = parseWorldBankData($populationResponse);
    
    // 3. 获取2024年人均GDP数据
    echo "<!-- Fetching GDP per capita data... -->\n";
    $gdpUrl = 'https://api.worldbank.org/v2/country/all/indicator/NY.GDP.PCAP.CD?format=json&date=2024:2024&per_page=20000';
    $gdpResponse = fetchFromAPI($gdpUrl);
    $gdpData = parseWorldBankData($gdpResponse);
    
    // 4. 获取国家元数据
    echo "<!-- Fetching country metadata... -->\n";
    $countryUrl = 'https://api.worldbank.org/v2/country?format=json&per_page=400';
    $countryResponse = fetchFromAPI($countryUrl);
    $countryMetadata = parseWorldBankData($countryResponse);
    
    // 创建国家代码到元数据的映射
    $countryMap = [];
    foreach ($countryMetadata as $country) {
        if (isset($country['id'])) {
            $countryMap[$country['id']] = [
                'name' => $country['name'] ?? '',
                'iso2Code' => $country['iso2Code'] ?? '',
                'region' => $country['region']['value'] ?? '',
                'incomeLevel' => $country['incomeLevel']['value'] ?? '',
                'capitalCity' => $country['capitalCity'] ?? '',
                'longitude' => $country['longitude'] ?? '',
                'latitude' => $country['latitude'] ?? ''
            ];
        }
    }
    
    // 创建数据索引（使用 ISO3 代码作为键）
    $birthRateIndex = [];
    foreach ($birthRateData as $item) {
        if (isset($item['countryiso3code']) && $item['value'] !== null) {
            $birthRateIndex[$item['countryiso3code']] = floatval($item['value']);
        }
    }

    $populationIndex = [];
    foreach ($populationData as $item) {
        if (isset($item['countryiso3code']) && $item['value'] !== null) {
            $populationIndex[$item['countryiso3code']] = floatval($item['value']);
        }
    }

    $gdpIndex = [];
    foreach ($gdpData as $item) {
        if (isset($item['countryiso3code']) && $item['value'] !== null) {
            $gdpIndex[$item['countryiso3code']] = floatval($item['value']);
        }
    }
    
    // 合并数据
    $mergedData = [];
    $totalWeight = 0;

    // 调试信息
    $debugInfo = [
        'birthRateCount' => count($birthRateIndex),
        'populationCount' => count($populationIndex),
        'gdpCount' => count($gdpIndex),
        'countryMapCount' => count($countryMap)
    ];

    foreach ($birthRateIndex as $countryId => $birthRate) {
        // 只处理有完整数据的国家
        if (!isset($populationIndex[$countryId])) {
            continue;
        }

        if (!isset($countryMap[$countryId])) {
            continue;
        }

        $population = $populationIndex[$countryId];
        $gdp = $gdpIndex[$countryId] ?? 0;

        // 获取 ISO2 代码
        $iso2Code = $countryMap[$countryId]['iso2Code'] ?? '';

        // 跳过聚合数据（如世界、地区等）
        // 允许两位字符的 ISO2 代码
        if (empty($iso2Code) || strlen($iso2Code) > 2) {
            continue;
        }

        // 计算出生数（权重）
        $births = ($birthRate * $population) / 1000;

        // 只包含有意义的数据
        if ($births > 0 && $population > 0) {
            $mergedData[] = [
                'id' => $countryId,
                'name' => $countryMap[$countryId]['name'],
                'iso2' => $iso2Code,
                'region' => $countryMap[$countryId]['region'],
                'incomeLevel' => $countryMap[$countryId]['incomeLevel'],
                'capital' => $countryMap[$countryId]['capitalCity'],
                'longitude' => $countryMap[$countryId]['longitude'],
                'latitude' => $countryMap[$countryId]['latitude'],
                'birthRate' => round($birthRate, 2),
                'population' => $population,
                'gdpPerCapita' => round($gdp, 2),
                'births' => round($births, 0),
                'weight' => $births
            ];

            $totalWeight += $births;
        }
    }
    
    // 计算概率
    foreach ($mergedData as &$country) {
        $country['probability'] = ($country['weight'] / $totalWeight) * 100;
        $country['probability'] = round($country['probability'], 6);
    }
    unset($country);
    
    // 按出生数排序
    usort($mergedData, function($a, $b) {
        return $b['births'] - $a['births'];
    });
    
    // 准备最终输出
    $output = [
        'success' => true,
        'timestamp' => time(),
        'dataYear' => [
            'birthRate' => 2023,
            'population' => 2023,
            'gdp' => 2024
        ],
        'totalCountries' => count($mergedData),
        'totalBirths' => round($totalWeight, 0),
        'countries' => $mergedData
    ];
    
    $jsonOutput = json_encode($output, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
    // 保存缓存
    file_put_contents($cacheFile, $jsonOutput);
    
    // 输出结果
    echo $jsonOutput;
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}

