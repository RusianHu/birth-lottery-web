<?php
/**
 * API测试脚本
 * 用于测试数据获取功能
 */

echo "<!DOCTYPE html>\n";
echo "<html lang='zh-CN'>\n";
echo "<head>\n";
echo "    <meta charset='UTF-8'>\n";
echo "    <title>API测试</title>\n";
echo "    <style>\n";
echo "        body { font-family: 'Microsoft YaHei', sans-serif; padding: 20px; background: #f5f5f5; }\n";
echo "        .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }\n";
echo "        h1 { color: #333; }\n";
echo "        .status { padding: 10px; margin: 10px 0; border-radius: 4px; }\n";
echo "        .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }\n";
echo "        .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }\n";
echo "        .info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }\n";
echo "        pre { background: #f8f9fa; padding: 15px; border-radius: 4px; overflow-x: auto; }\n";
echo "        .btn { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 10px 5px; }\n";
echo "        .btn:hover { background: #0056b3; }\n";
echo "    </style>\n";
echo "</head>\n";
echo "<body>\n";
echo "    <div class='container'>\n";
echo "        <h1>🧪 投胎模拟器 - API测试</h1>\n";

// 测试 PHP 版本
echo "        <div class='status info'>\n";
echo "            <strong>PHP版本:</strong> " . phpversion() . "\n";
echo "        </div>\n";

// 测试扩展
$extensions = ['curl', 'openssl', 'mbstring', 'json'];
echo "        <div class='status info'>\n";
echo "            <strong>已加载的扩展:</strong><br>\n";
foreach ($extensions as $ext) {
    $loaded = extension_loaded($ext);
    $status = $loaded ? '✅' : '❌';
    echo "            $status $ext<br>\n";
}
echo "        </div>\n";

// 测试数据获取
echo "        <h2>数据获取测试</h2>\n";

try {
    // 测试简单的API调用
    $testUrl = 'https://api.worldbank.org/v2/country/CN?format=json';
    
    echo "        <div class='status info'>\n";
    echo "            <strong>测试URL:</strong> $testUrl\n";
    echo "        </div>\n";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $testUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Birth-Lottery-Web/1.0');
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    if ($error) {
        echo "        <div class='status error'>\n";
        echo "            <strong>cURL错误:</strong> $error\n";
        echo "        </div>\n";
    } else {
        echo "        <div class='status success'>\n";
        echo "            <strong>HTTP状态码:</strong> $httpCode\n";
        echo "        </div>\n";
        
        if ($httpCode === 200) {
            $data = json_decode($response, true);
            echo "        <div class='status success'>\n";
            echo "            <strong>✅ API调用成功！</strong>\n";
            echo "        </div>\n";
            
            echo "        <h3>响应数据示例:</h3>\n";
            echo "        <pre>" . htmlspecialchars(json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) . "</pre>\n";
        }
    }
    
} catch (Exception $e) {
    echo "        <div class='status error'>\n";
    echo "            <strong>错误:</strong> " . $e->getMessage() . "\n";
    echo "        </div>\n";
}

// 检查缓存文件
echo "        <h2>缓存状态</h2>\n";
$cacheFile = 'data_cache.json';
if (file_exists($cacheFile)) {
    $cacheTime = filemtime($cacheFile);
    $cacheAge = time() - $cacheTime;
    $cacheSize = filesize($cacheFile);
    
    echo "        <div class='status info'>\n";
    echo "            <strong>缓存文件:</strong> 存在<br>\n";
    echo "            <strong>文件大小:</strong> " . number_format($cacheSize / 1024, 2) . " KB<br>\n";
    echo "            <strong>创建时间:</strong> " . date('Y-m-d H:i:s', $cacheTime) . "<br>\n";
    echo "            <strong>缓存年龄:</strong> " . round($cacheAge / 60, 2) . " 分钟\n";
    echo "        </div>\n";
} else {
    echo "        <div class='status info'>\n";
    echo "            <strong>缓存文件:</strong> 不存在（首次运行时会自动创建）\n";
    echo "        </div>\n";
}

echo "        <h2>操作</h2>\n";
echo "        <a href='fetch_data.php' class='btn' target='_blank'>📥 获取完整数据</a>\n";
echo "        <a href='index.html' class='btn'>🎲 打开应用</a>\n";
echo "        <a href='test_api.php' class='btn'>🔄 刷新测试</a>\n";

echo "    </div>\n";
echo "</body>\n";
echo "</html>\n";
?>

