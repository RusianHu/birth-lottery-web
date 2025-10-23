/**
 * 基于D3.js的世界地图控制器
 * 使用D3.js和TopoJSON来渲染真实的世界地图
 */

import { animate, stagger } from './anime.esm.js';
import { countryNameToISO } from './country-iso-mapping.js';

export class WorldMapController {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            interactive: true,
            showTooltip: true,
            colorScheme: 'probability',
            enableZoom: true,
            enablePan: true,
            ...options
        };

        this.svg = null;
        this.g = null;
        this.countries = new Map();
        this.data = null;
        this.tooltip = null;
        this.selectedCountry = null;
        this.projection = null;
        this.path = null;
        this.zoom = null;

        // 中国-台湾联动配置
        this.unifiedRegions = {
            'CN': ['CN', 'TW'],  // 中国和台湾作为统一区域
            'TW': ['CN', 'TW']   // 台湾也映射到同一组
        };

        this.init();
    }

    /**
     * 初始化地图
     */
    async init() {
        try {
            this.createSVG();
            await this.loadTopoJSON();
            this.setupTooltip();
            this.bindEvents();
        } catch (error) {
            console.error('地图初始化失败:', error);
        }
    }

    /**
     * 创建SVG容器
     */
    createSVG() {
        const width = 960;
        const height = 500;

        // 创建SVG
        this.svg = d3.select(this.container)
            .append('svg')
            .attr('viewBox', `0 0 ${width} ${height}`)
            .attr('width', width)
            .attr('height', height);

        // 创建主组
        this.g = this.svg.append('g')
            .attr('id', 'countries');

        // 设置投影
        this.projection = d3.geoEquirectangular()
            .scale(153)
            .translate([width / 2, height / 2]);

        // 创建路径生成器
        this.path = d3.geoPath().projection(this.projection);

        // 设置缩放
        if (this.options.enableZoom) {
            this.zoom = d3.zoom()
                .scaleExtent([1, 8])
                .on('zoom', (event) => {
                    this.g.attr('transform', event.transform);
                });
            this.svg.call(this.zoom);
        }
    }

    /**
     * 加载TopoJSON数据
     */
    async loadTopoJSON() {
        const response = await fetch('countries-50m.json');
        const topology = await response.json();

        // 转换TopoJSON为GeoJSON
        const countries = topojson.feature(topology, topology.objects.countries);

        // 渲染国家
        this.g.selectAll('path')
            .data(countries.features)
            .enter()
            .append('path')
            .attr('class', 'country')
            .attr('d', this.path)
            .attr('data-iso', d => d.properties.iso_a2 || d.id)
            .attr('data-iso3', d => d.properties.iso_a3 || '')
            .attr('data-name', d => d.properties.name || d.properties.admin)
            .attr('data-id', (d, i) => i)
            .style('fill', '#e0e0e0')
            .style('stroke', '#ffffff')
            .style('stroke-width', '0.5')
            .style('vector-effect', 'non-scaling-stroke')
            .on('mouseenter', (event, d) => this.handleCountryHover(event, d))
            .on('mouseleave', (event, d) => this.handleCountryLeave(event, d))
            .on('click', (event, d) => this.handleCountryClick(event, d));

        // 收集国家信息
        const uniqueCountries = new Map();
        countries.features.forEach((feature, i) => {
            const name = feature.properties.name || feature.properties.admin;
            const numId = feature.id;

            // 从映射表获取ISO代码
            const iso2 = countryNameToISO[name] || null;

            const country = {
                element: this.g.selectAll('path').filter((d, j) => j === i).node(),
                iso2: iso2,
                numId: numId,
                name: name,
                data: null,
                feature: feature
            };

            // 使用ISO2作为主键（如果有的话）
            const primaryKey = iso2 || String(numId) || name;

            // 避免重复
            if (!uniqueCountries.has(primaryKey)) {
                uniqueCountries.set(primaryKey, country);

                // 使用多个键来存储,方便查找
                if (iso2) this.countries.set(iso2, country);
                if (numId) this.countries.set(String(numId), country);
                if (name) this.countries.set(name, country);
            }
        });

        console.log(`已加载 ${uniqueCountries.size} 个国家/地区`);
    }

    /**
     * 设置提示框
     */
    setupTooltip() {
        if (!this.options.showTooltip) return;

        this.tooltip = document.createElement('div');
        this.tooltip.className = 'map-tooltip';
        this.tooltip.style.cssText = `
            position: absolute;
            padding: 8px 12px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            border-radius: 4px;
            font-size: 12px;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s;
            z-index: 1000;
        `;
        document.body.appendChild(this.tooltip);
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 鼠标移动更新提示框位置
        this.container.addEventListener('mousemove', (e) => {
            if (this.tooltip && this.tooltip.style.opacity === '1') {
                this.tooltip.style.left = (e.pageX + 10) + 'px';
                this.tooltip.style.top = (e.pageY + 10) + 'px';
            }
        });
    }

    /**
     * 处理国家悬停
     */
    handleCountryHover(event, d) {
        if (!this.options.interactive) return;

        const iso = d.properties.iso_a2 || d.id;
        const country = this.countries.get(iso);

        if (country && country.element) {
            // 高亮当前国家
            d3.select(country.element)
                .style('fill', '#ffd700');

            // 同时高亮统一区域的其他国家
            const relatedCountries = this.getUnifiedRegionCountries(country.iso2);
            relatedCountries.forEach(c => {
                if (c !== country && c.element) {
                    d3.select(c.element)
                        .style('fill', '#ffd700');
                }
            });
        }

        if (this.tooltip && country) {
            const name = country.name;
            const data = country.data;
            let content = `<strong>${name}</strong>`;

            if (data) {
                if (this.options.colorScheme === 'probability') {
                    content += `<br>出生概率: ${(data.probability * 100).toFixed(4)}%`;
                } else if (this.options.colorScheme === 'gdp') {
                    content += `<br>人均GDP: $${data.gdpPerCapita.toLocaleString()}`;
                } else if (this.options.colorScheme === 'birthrate') {
                    content += `<br>出生率: ${data.birthRate.toFixed(2)}‰`;
                }
            }

            this.tooltip.innerHTML = content;
            this.tooltip.style.opacity = '1';
        }
    }

    /**
     * 处理国家离开
     */
    handleCountryLeave(event, d) {
        if (!this.options.interactive) return;

        const iso = d.properties.iso_a2 || d.id;
        const country = this.countries.get(iso);

        if (country && country.element && country !== this.selectedCountry) {
            // 恢复当前国家的颜色
            this.updateCountryColor(country);

            // 同时恢复统一区域的其他国家的颜色
            const relatedCountries = this.getUnifiedRegionCountries(country.iso2);
            relatedCountries.forEach(c => {
                if (c !== country && c.element && c !== this.selectedCountry) {
                    this.updateCountryColor(c);
                }
            });
        }

        if (this.tooltip) {
            this.tooltip.style.opacity = '0';
        }
    }

    /**
     * 处理国家点击
     */
    handleCountryClick(event, d) {
        const iso = d.properties.iso_a2 || d.id;
        const country = this.countries.get(iso);

        if (country) {
            console.log('点击国家:', country.name, country.iso);
        }
    }

    /**
     * 绑定业务数据
     */
    bindData(data) {
        this.data = data;

        // 处理数据格式:可能是数组或包含countries数组的对象
        const countries = Array.isArray(data) ? data : (data.countries || []);

        // 计算数据范围用于颜色映射
        const validCountries = countries.filter(c => c.iso2 && c.iso2.length === 2);
        const probabilities = validCountries.map(c => c.probability || 0);
        const gdps = validCountries.map(c => c.gdpPerCapita || 0);
        const birthRates = validCountries.map(c => c.birthRate || 0);

        this.dataRanges = {
            probability: {
                min: Math.min(...probabilities),
                max: Math.max(...probabilities)
            },
            gdp: {
                min: Math.min(...gdps),
                max: Math.max(...gdps)
            },
            birthRate: {
                min: Math.min(...birthRates),
                max: Math.max(...birthRates)
            }
        };

        console.log('数据范围:', this.dataRanges);

        let matchedCount = 0;
        countries.forEach(item => {
            // 尝试多种ISO代码和名称
            const iso2 = item.iso2 || item.iso || item.code;
            const iso3 = item.iso3;
            const name = item.name;

            let country = null;

            // 首先尝试通过ISO2代码查找
            if (iso2) {
                country = this.countries.get(iso2);
            }

            // 尝试通过ISO3代码查找
            if (!country && iso3) {
                country = this.countries.get(iso3);
            }

            // 尝试通过名称查找（需要处理名称变体）
            if (!country && name) {
                // 直接匹配
                country = this.countries.get(name);

                // 尝试常见的名称变体
                if (!country) {
                    const nameVariants = this.getNameVariants(name);
                    for (const variant of nameVariants) {
                        country = this.countries.get(variant);
                        if (country) break;
                    }
                }
            }

            if (country) {
                country.data = {
                    probability: item.probability || 0,
                    gdpPerCapita: item.gdpPerCapita || item.gdp_per_capita || 0,
                    birthRate: item.birthRate || item.birth_rate || 0
                };
                this.updateCountryColor(country);
                matchedCount++;
            } else {
                // 调试：记录未匹配的国家
                if (iso2 && iso2.length === 2) {
                    console.log('未匹配:', name, iso2);
                }
            }
        });

        console.log(`成功匹配 ${matchedCount} 个国家数据`);
    }

    /**
     * 获取国家名称的变体
     */
    getNameVariants(name) {
        const variants = [name];

        // 常见的名称映射
        const nameMap = {
            'United States': ['United States of America', 'USA'],
            'United Kingdom': ['United Kingdom of Great Britain and Northern Ireland'],
            'Russia': ['Russian Federation'],
            'South Korea': ['Korea, Republic of', 'Republic of Korea'],
            'North Korea': ['Korea, Democratic People\'s Republic of'],
            'Vietnam': ['Viet Nam'],
            'Iran': ['Iran, Islamic Republic of'],
            'Syria': ['Syrian Arab Republic'],
            'Venezuela': ['Venezuela, Bolivarian Republic of'],
            'Bolivia': ['Bolivia, Plurinational State of'],
            'Tanzania': ['United Republic of Tanzania'],
            'Congo, Rep.': ['Republic of the Congo', 'Congo'],
            'Congo, Dem. Rep.': ['Democratic Republic of the Congo'],
            'Czechia': ['Czech Republic'],
            'Turkiye': ['Turkey'],
            'Lao PDR': ['Laos', 'Lao People\'s Democratic Republic']
        };

        // 添加映射的变体
        if (nameMap[name]) {
            variants.push(...nameMap[name]);
        }

        // 反向查找
        for (const [key, values] of Object.entries(nameMap)) {
            if (values.includes(name)) {
                variants.push(key);
                variants.push(...values);
            }
        }

        return [...new Set(variants)];
    }

    /**
     * 更新国家颜色
     */
    updateCountryColor(country) {
        if (!country.data || !country.element) return;

        let color = '#e0e0e0';
        const data = country.data;

        // 如果没有数据范围，使用默认颜色
        if (!this.dataRanges) {
            d3.select(country.element).style('fill', color);
            return;
        }

        let value, range;
        switch (this.options.colorScheme) {
            case 'gdp':
                value = data.gdpPerCapita || 0;
                range = this.dataRanges.gdp;
                break;
            case 'birthrate':
                value = data.birthRate || 0;
                range = this.dataRanges.birthRate;
                break;
            case 'probability':
            default:
                value = data.probability || 0;
                range = this.dataRanges.probability;
        }

        color = this.getColorForValue(value, range);
        d3.select(country.element).style('fill', color);

        // 如果是统一区域（如中国-台湾），同步更新关联区域的颜色
        this.syncUnifiedRegionColors(country.iso2, color);
    }

    /**
     * 同步统一区域的颜色
     */
    syncUnifiedRegionColors(iso2, color) {
        if (!iso2 || !this.unifiedRegions[iso2]) return;

        const relatedIsos = this.unifiedRegions[iso2];
        relatedIsos.forEach(relatedIso => {
            if (relatedIso !== iso2) {
                const relatedCountry = this.countries.get(relatedIso);
                if (relatedCountry && relatedCountry.element) {
                    d3.select(relatedCountry.element).style('fill', color);
                }
            }
        });
    }

    /**
     * 根据数值获取颜色（使用渐变色方案）
     */
    getColorForValue(value, range) {
        if (!range || range.max === range.min) return '#e8f4f8';

        // 归一化到 0-1
        const normalized = Math.max(0, Math.min(1, (value - range.min) / (range.max - range.min)));

        // 使用渐变色方案: 浅蓝 -> 浅粉 -> 粉红 -> 深红
        if (normalized < 0.33) {
            // 浅蓝到浅粉
            const t = normalized / 0.33;
            return this.interpolateColor('#e8f4f8', '#ffb3c6', t);
        } else if (normalized < 0.67) {
            // 浅粉到粉红
            const t = (normalized - 0.33) / 0.34;
            return this.interpolateColor('#ffb3c6', '#ff6b9d', t);
        } else {
            // 粉红到深红
            const t = (normalized - 0.67) / 0.33;
            return this.interpolateColor('#ff6b9d', '#c44569', t);
        }
    }

    /**
     * 颜色插值
     */
    interpolateColor(color1, color2, t) {
        const c1 = this.hexToRgb(color1);
        const c2 = this.hexToRgb(color2);

        const r = Math.round(c1.r + (c2.r - c1.r) * t);
        const g = Math.round(c1.g + (c2.g - c1.g) * t);
        const b = Math.round(c1.b + (c2.b - c1.b) * t);

        return `rgb(${r}, ${g}, ${b})`;
    }

    /**
     * 十六进制转RGB
     */
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }

    /**
     * 切换配色方案
     */
    setColorScheme(scheme) {
        this.options.colorScheme = scheme;
        this.countries.forEach(country => {
            this.updateCountryColor(country);
        });
    }

    /**
     * 更新颜色(别名方法,兼容旧代码)
     */
    updateColors(scheme = this.options.colorScheme) {
        this.setColorScheme(scheme);
    }

    /**
     * 聚焦到指定国家
     */
    async focusCountry(iso, duration = 2000) {
        let country = this.countries.get(iso);

        // 如果找不到,尝试通过名称查找
        if (!country) {
            for (const [key, value] of this.countries.entries()) {
                if (value.iso2 === iso || value.iso3 === iso || value.numId === iso) {
                    country = value;
                    break;
                }
            }
        }

        if (!country) {
            console.warn(`国家 ${iso} 未找到`);
            return;
        }

        // 获取统一区域的所有国家（如中国-台湾）
        const relatedCountries = this.getUnifiedRegionCountries(country.iso2);

        // 计算统一区域的合并边界
        let combinedBounds = null;
        relatedCountries.forEach(c => {
            if (c.feature) {
                const bounds = this.path.bounds(c.feature);
                if (!combinedBounds) {
                    combinedBounds = [[...bounds[0]], [...bounds[1]]];
                } else {
                    combinedBounds[0][0] = Math.min(combinedBounds[0][0], bounds[0][0]);
                    combinedBounds[0][1] = Math.min(combinedBounds[0][1], bounds[0][1]);
                    combinedBounds[1][0] = Math.max(combinedBounds[1][0], bounds[1][0]);
                    combinedBounds[1][1] = Math.max(combinedBounds[1][1], bounds[1][1]);
                }
            }
        });

        if (!combinedBounds) {
            console.warn(`无法计算国家 ${iso} 的边界`);
            return;
        }

        // 计算合并区域的中心点和缩放
        const dx = combinedBounds[1][0] - combinedBounds[0][0];
        const dy = combinedBounds[1][1] - combinedBounds[0][1];
        const x = (combinedBounds[0][0] + combinedBounds[1][0]) / 2;
        const y = (combinedBounds[0][1] + combinedBounds[1][1]) / 2;
        const scale = Math.min(8, 0.9 / Math.max(dx / 960, dy / 500));
        const translate = [960 / 2 - scale * x, 500 / 2 - scale * y];

        // 使用D3缩放
        this.svg.transition()
            .duration(duration)
            .call(
                this.zoom.transform,
                d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
            );

        // 高亮所有相关国家
        this.selectedCountry = country;
        relatedCountries.forEach(c => {
            if (c.element) {
                d3.select(c.element)
                    .style('fill', '#ff6b6b')
                    .style('stroke', '#ff0000')
                    .style('stroke-width', '2');
            }
        });
    }

    /**
     * 获取统一区域的所有国家
     */
    getUnifiedRegionCountries(iso2) {
        const countries = [];

        if (iso2 && this.unifiedRegions[iso2]) {
            // 如果是统一区域，返回所有相关国家
            this.unifiedRegions[iso2].forEach(relatedIso => {
                const country = this.countries.get(relatedIso);
                if (country) {
                    countries.push(country);
                }
            });
        } else {
            // 否则只返回当前国家
            const country = this.countries.get(iso2);
            if (country) {
                countries.push(country);
            }
        }

        return countries;
    }

    /**
     * 重置视图
     */
    resetView(duration = 1000) {
        this.svg.transition()
            .duration(duration)
            .call(this.zoom.transform, d3.zoomIdentity);

        if (this.selectedCountry) {
            // 重置所有相关国家的颜色和边框
            const relatedCountries = this.getUnifiedRegionCountries(this.selectedCountry.iso2);
            relatedCountries.forEach(country => {
                this.updateCountryColor(country);
                if (country.element) {
                    d3.select(country.element)
                        .style('stroke', '#ffffff')
                        .style('stroke-width', '0.5');
                }
            });
            this.selectedCountry = null;
        }
    }

    /**
     * 销毁地图
     */
    destroy() {
        if (this.tooltip) {
            this.tooltip.remove();
        }
        if (this.svg) {
            this.svg.remove();
        }
    }
}

