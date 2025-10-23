# 🎲 投胎模拟器 (Birth Lottery Simulator)

[![GitHub License](https://img.shields.io/github/license/RusianHu/birth-lottery-web)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/RusianHu/birth-lottery-web?style=social)](https://github.com/RusianHu/birth-lottery-web/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/RusianHu/birth-lottery-web?style=social)](https://github.com/RusianHu/birth-lottery-web/network/members)

一个基于真实数据的趣味投胎（模拟重开）模拟网站应用

## 🚀 快速开始

### 安装方式

从 GitHub 克隆

```bash
# 克隆仓库
git clone https://github.com/RusianHu/birth-lottery-web.git

# 进入项目目录
cd birth-lottery-web
```

### 环境要求

- PHP 8.0 或更高版本
- 已启用的 PHP 扩展：
  - `curl` - 用于API请求
  - `openssl` - 用于HTTPS支持
  - `mbstring` - 用于多字节字符串处理
  - `json` - 用于JSON数据处理

### 启动步骤

1. **启动 PHP 服务器**

2. **访问应用**

- 例如在浏览器中打开：`http://127.0.0.1:8080`


## 📊 数据来源

### 出生率数据
- **来源**：世界银行 WDI（源自 UN WPP 2024）
- **指标代码**：`SP.DYN.CBRT.IN`
- **年份**：2023年
- **API**：`https://api.worldbank.org/v2/country/all/indicator/SP.DYN.CBRT.IN`

### 人口数据
- **来源**：世界银行 WDI
- **指标代码**：`SP.POP.TOTL`
- **年份**：2023年
- **API**：`https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL`

### 人均GDP数据
- **来源**：世界银行 WDI
- **指标代码**：`NY.GDP.PCAP.CD`
- **年份**：2024年
- **API**：`https://api.worldbank.org/v2/country/all/indicator/NY.GDP.PCAP.CD`

### 国家元数据
- **来源**：世界银行
- **API**：`https://api.worldbank.org/v2/country`

详细数据源信息请参考 `数据来源备份.md`

## 🧮 算法说明

### 投胎概率计算

```
出生数 = (出生率 × 人口) / 1000
投胎概率 = (该国出生数 / 全球总出生数) × 100%
```

### 加权随机抽取

使用加权随机算法，每个国家的权重等于其年出生数，确保模拟结果符合真实的出生分布。

## 🎨 技术栈

- **前端**：HTML5, CSS3, JavaScript (ES6+)
- **动画库**：anime.js v4.2.2
- **后端**：PHP 8.4
- **数据源**：世界银行 API
- **图标**：Font Awesome 6.4.0

## 🔧 配置说明

### PHP 配置

确保 `php.ini` 中已启用以下扩展：

```ini
extension=curl
extension=openssl
extension=mbstring
```

### 缓存配置

数据缓存时间默认为 24 小时，可在 `fetch_data.php` 中修改：

```php
$cacheTime = 86400; // 秒数，86400 = 24小时
```

## 🐛 故障排除

### 数据加载失败

1. 检查 PHP 扩展是否已启用（访问 `test_api.php`）
2. 检查网络连接
3. 查看 PHP 错误日志
4. 删除 `data_cache.json` 重新获取数据

### 动画不流畅

1. 检查浏览器是否支持 ES6 模块
2. 确认 `anime.esm.js` 文件完整
3. 尝试使用现代浏览器（Chrome, Firefox, Edge）

### 样式显示异常

1. 清除浏览器缓存
2. 检查 `style.css` 文件是否正确加载
3. 确认浏览器支持 CSS Grid 和 Flexbox

## 📝 开发说明

### 添加新功能

1. 修改 `app.js` 添加新的交互逻辑
2. 更新 `style.css` 添加新的样式
3. 使用 anime.js 添加动画效果

### 自定义样式

主要颜色变量定义在 `style.css` 的 `:root` 中：

```css
:root {
    --primary-color: #ff6b9d;
    --secondary-color: #c44569;
    --accent-color: #ffa502;
    /* ... */
}
```

## 📄 许可证

本项目采用 [MIT 许可证](LICENSE)。

本项目仅供学习和娱乐使用。数据来源于世界银行公开数据。

## 🙏 致谢

- [世界银行开放数据](https://data.worldbank.org)
- [Our World in Data](https://ourworldindata.org)
- [anime.js](https://animejs.com)
- [Font Awesome](https://fontawesome.com)