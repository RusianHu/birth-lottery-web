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

            // 使用多个键来存储,方便查找
            if (iso2) this.countries.set(iso2, country);
            if (numId) this.countries.set(String(numId), country);
            if (name) this.countries.set(name, country);
        });

        console.log(`已加载 ${this.countries.size} 个国家/地区`);
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
            d3.select(country.element)
                .style('fill', '#ffd700');
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
            this.updateCountryColor(country);
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

        countries.forEach(item => {
            // 尝试多种ISO代码
            const iso2 = item.iso2 || item.iso || item.code;
            const iso3 = item.iso3;
            const name = item.name;

            let country = this.countries.get(iso2);
            if (!country && iso3) {
                country = this.countries.get(iso3);
            }
            if (!country && name) {
                country = this.countries.get(name);
            }

            if (country) {
                country.data = {
                    probability: item.probability || 0,
                    gdpPerCapita: item.gdpPerCapita || item.gdp_per_capita || 0,
                    birthRate: item.birthRate || item.birth_rate || 0
                };
                this.updateCountryColor(country);
            }
        });
    }

    /**
     * 更新国家颜色
     */
    updateCountryColor(country) {
        if (!country.data || !country.element) return;

        let color = '#e0e0e0';
        const data = country.data;

        if (this.options.colorScheme === 'probability') {
            const intensity = Math.min(data.probability * 1000, 1);
            const r = Math.floor(255 - intensity * 100);
            const g = Math.floor(200 - intensity * 50);
            const b = Math.floor(255 - intensity * 100);
            color = `rgb(${r}, ${g}, ${b})`;
        } else if (this.options.colorScheme === 'gdp') {
            const maxGDP = 100000;
            const intensity = Math.min(data.gdpPerCapita / maxGDP, 1);
            const r = Math.floor(100 + intensity * 155);
            const g = Math.floor(200 + intensity * 55);
            const b = Math.floor(100 + intensity * 100);
            color = `rgb(${r}, ${g}, ${b})`;
        } else if (this.options.colorScheme === 'birthrate') {
            const maxRate = 50;
            const intensity = Math.min(data.birthRate / maxRate, 1);
            const r = Math.floor(255 - intensity * 100);
            const g = Math.floor(150 + intensity * 50);
            const b = Math.floor(150 - intensity * 50);
            color = `rgb(${r}, ${g}, ${b})`;
        }

        d3.select(country.element).style('fill', color);
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

        // 计算国家的中心点和边界
        const bounds = this.path.bounds(country.feature);
        const dx = bounds[1][0] - bounds[0][0];
        const dy = bounds[1][1] - bounds[0][1];
        const x = (bounds[0][0] + bounds[1][0]) / 2;
        const y = (bounds[0][1] + bounds[1][1]) / 2;
        const scale = Math.min(8, 0.9 / Math.max(dx / 960, dy / 500));
        const translate = [960 / 2 - scale * x, 500 / 2 - scale * y];

        // 使用D3缩放
        this.svg.transition()
            .duration(duration)
            .call(
                this.zoom.transform,
                d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
            );

        // 高亮国家
        this.selectedCountry = country;
        d3.select(country.element)
            .style('fill', '#ff6b6b')
            .style('stroke', '#ff0000')
            .style('stroke-width', '2');
    }

    /**
     * 重置视图
     */
    resetView(duration = 1000) {
        this.svg.transition()
            .duration(duration)
            .call(this.zoom.transform, d3.zoomIdentity);

        if (this.selectedCountry) {
            this.updateCountryColor(this.selectedCountry);
            d3.select(this.selectedCountry.element)
                .style('stroke', '#ffffff')
                .style('stroke-width', '0.5');
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

