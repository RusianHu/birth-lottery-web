// 检查地图覆盖率
const fs = require('fs');

// 读取数据
const data = JSON.parse(fs.readFileSync('data_cache.json', 'utf8'));

// 读取SVG地图
const svg = fs.readFileSync('world-map-beautiful.svg', 'utf8');

// 提取SVG中的国家代码
const svgCountries = new Set();
const matches = svg.matchAll(/data-iso="([A-Z]{2})"/g);
for (const match of matches) {
    svgCountries.add(match[1]);
}

console.log(`SVG地图包含 ${svgCountries.size} 个国家`);
console.log('SVG国家列表:', Array.from(svgCountries).sort().join(', '));

// 统计真实国家(非聚合数据)
const realCountries = data.countries.filter(c => 
    c.region !== 'Aggregates' && 
    c.iso2 && 
    c.iso2.length === 2 &&
    c.iso2.match(/^[A-Z]{2}$/)
);

console.log(`\n数据中有 ${realCountries.length} 个真实国家`);

// 检查覆盖率
const covered = realCountries.filter(c => svgCountries.has(c.iso2));
const notCovered = realCountries.filter(c => !svgCountries.has(c.iso2));

console.log(`\n覆盖了 ${covered.length} 个国家 (${(covered.length/realCountries.length*100).toFixed(1)}%)`);

// 显示前20个未覆盖的国家(按出生人数排序)
console.log('\n未覆盖的主要国家(按出生人数排序):');
notCovered
    .sort((a, b) => b.births - a.births)
    .slice(0, 20)
    .forEach((c, i) => {
        console.log(`${i+1}. ${c.name} (${c.iso2}) - ${c.births.toLocaleString()} 出生人数`);
    });

// 显示已覆盖的国家
console.log('\n已覆盖的国家:');
covered
    .sort((a, b) => b.births - a.births)
    .slice(0, 30)
    .forEach((c, i) => {
        console.log(`${i+1}. ${c.name} (${c.iso2}) - ${c.births.toLocaleString()} 出生人数`);
    });

