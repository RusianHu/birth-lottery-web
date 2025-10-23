/**
 * 世界地图控制器
 * 负责SVG地图的加载、数据绑定、交互和动画
 */

import { animate, stagger } from './anime.esm.js';

export class WorldMapController {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            interactive: true,
            showTooltip: true,
            colorScheme: 'probability', // 'probability' | 'gdp' | 'birthrate'
            enableZoom: true,
            enablePan: true,
            ...options
        };

        this.svg = null;
        this.countries = new Map();
        this.data = null;
        this.tooltip = null;
        this.selectedCountry = null;

        // 缩放和平移状态
        this.transform = {
            scale: 1,
            translateX: 0,
            translateY: 0
        };
        this.isPanning = false;
        this.panStart = { x: 0, y: 0 };

        this.init();
    }
    
    /**
     * 初始化地图
     */
    async init() {
        try {
            await this.loadSVG();
            this.setupTooltip();
            this.bindEvents();
        } catch (error) {
            console.error('地图初始化失败:', error);
        }
    }
    
    /**
     * 加载SVG地图
     */
    async loadSVG() {
        const response = await fetch('world-map-real.svg');
        const svgText = await response.text();
        this.container.innerHTML = svgText;
        this.svg = this.container.querySelector('svg');

        // 创建变换组
        this.createTransformGroup();

        // 收集所有国家元素
        const countryElements = this.svg.querySelectorAll('.country');
        countryElements.forEach(el => {
            const iso = el.getAttribute('data-iso');
            const name = el.getAttribute('data-name');
            this.countries.set(iso, {
                element: el,
                iso: iso,
                name: name,
                data: null
            });
        });

        console.log(`已加载 ${this.countries.size} 个国家/地区`);
    }

    /**
     * 创建变换组
     */
    createTransformGroup() {
        // 查找countries组
        const countriesGroup = this.svg.querySelector('#countries');
        if (!countriesGroup) return;

        // 创建变换组包裹countries
        const transformGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        transformGroup.id = 'transform-group';

        // 将countries组移到transform组中
        countriesGroup.parentNode.insertBefore(transformGroup, countriesGroup);
        transformGroup.appendChild(countriesGroup);

        this.transformGroup = transformGroup;
    }
    
    /**
     * 绑定业务数据
     */
    bindData(data) {
        this.data = data;
        
        // 计算数据范围用于颜色映射
        const probabilities = data.countries.map(c => c.probability || 0);
        const gdps = data.countries.map(c => c.gdpPerCapita || 0);
        const birthRates = data.countries.map(c => c.birthRate || 0);
        
        this.dataRanges = {
            probability: { min: Math.min(...probabilities), max: Math.max(...probabilities) },
            gdp: { min: Math.min(...gdps), max: Math.max(...gdps) },
            birthRate: { min: Math.min(...birthRates), max: Math.max(...birthRates) }
        };
        
        // 为每个国家绑定数据
        data.countries.forEach(countryData => {
            const iso = countryData.iso2 || countryData.iso || countryData.code;
            const country = this.countries.get(iso);
            if (country) {
                country.data = countryData;
            }
        });
        
        // 更新颜色
        this.updateColors();
    }
    
    /**
     * 更新国家颜色
     */
    updateColors(scheme = this.options.colorScheme) {
        this.options.colorScheme = scheme;
        
        this.countries.forEach((country, iso) => {
            if (!country.data) {
                country.element.style.fill = '#e8f4f8'; // 默认颜色
                return;
            }
            
            let value, range;
            switch (scheme) {
                case 'gdp':
                    value = country.data.gdpPerCapita || 0;
                    range = this.dataRanges.gdp;
                    break;
                case 'birthrate':
                    value = country.data.birthRate || 0;
                    range = this.dataRanges.birthRate;
                    break;
                case 'probability':
                default:
                    value = country.data.probability || 0;
                    range = this.dataRanges.probability;
            }
            
            const color = this.getColorForValue(value, range);
            country.element.style.fill = color;
        });
    }
    
    /**
     * 根据数值获取颜色
     */
    getColorForValue(value, range) {
        if (range.max === range.min) return '#ff6b9d';
        
        const normalized = (value - range.min) / (range.max - range.min);
        
        // 使用渐变色方案: 浅蓝 -> 粉红 -> 深红
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
     * 设置提示框
     */
    setupTooltip() {
        if (!this.options.showTooltip) return;
        
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'map-tooltip';
        this.tooltip.style.cssText = `
            position: absolute;
            background: rgba(255, 255, 255, 0.95);
            border: 2px solid #ff6b9d;
            border-radius: 12px;
            padding: 12px 16px;
            font-size: 14px;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.3s;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        `;
        document.body.appendChild(this.tooltip);
    }
    
    /**
     * 绑定事件
     */
    bindEvents() {
        if (!this.options.interactive) return;

        this.countries.forEach((country, iso) => {
            const el = country.element;

            el.addEventListener('mouseenter', (e) => this.onCountryHover(country, e));
            el.addEventListener('mouseleave', () => this.onCountryLeave(country));
            el.addEventListener('mousemove', (e) => this.onCountryMove(country, e));
            el.addEventListener('click', () => this.onCountryClick(country));
        });

        // 绑定缩放和平移事件
        if (this.options.enableZoom) {
            this.svg.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
        }

        if (this.options.enablePan) {
            this.svg.addEventListener('mousedown', (e) => this.onPanStart(e));
            this.svg.addEventListener('mousemove', (e) => this.onPanMove(e));
            this.svg.addEventListener('mouseup', () => this.onPanEnd());
            this.svg.addEventListener('mouseleave', () => this.onPanEnd());
        }
    }

    /**
     * 鼠标滚轮缩放
     */
    onWheel(event) {
        event.preventDefault();

        const delta = event.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.max(1, Math.min(10, this.transform.scale * delta));

        if (newScale === this.transform.scale) return;

        // 获取鼠标在SVG中的位置
        const rect = this.svg.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        // 计算缩放中心
        const scaleRatio = newScale / this.transform.scale;
        this.transform.translateX = mouseX - (mouseX - this.transform.translateX) * scaleRatio;
        this.transform.translateY = mouseY - (mouseY - this.transform.translateY) * scaleRatio;
        this.transform.scale = newScale;

        this.applyTransform();
    }

    /**
     * 开始平移
     */
    onPanStart(event) {
        // 只在点击背景时启用平移
        if (event.target.classList.contains('country')) return;

        this.isPanning = true;
        this.panStart = {
            x: event.clientX - this.transform.translateX,
            y: event.clientY - this.transform.translateY
        };
        this.svg.style.cursor = 'grabbing';
    }

    /**
     * 平移中
     */
    onPanMove(event) {
        if (!this.isPanning) return;

        this.transform.translateX = event.clientX - this.panStart.x;
        this.transform.translateY = event.clientY - this.panStart.y;

        this.applyTransform();
    }

    /**
     * 结束平移
     */
    onPanEnd() {
        this.isPanning = false;
        this.svg.style.cursor = 'default';
    }

    /**
     * 应用变换
     */
    applyTransform() {
        if (!this.transformGroup) return;

        const { scale, translateX, translateY } = this.transform;
        this.transformGroup.setAttribute('transform',
            `translate(${translateX}, ${translateY}) scale(${scale})`
        );
    }
    
    /**
     * 国家悬停事件
     */
    onCountryHover(country, event) {
        if (this.selectedCountry === country) return;
        
        // 高亮动画
        animate(country.element, {
            scale: 1.05,
            duration: 300,
            ease: 'out(3)'
        });
        
        // 显示提示框
        if (this.tooltip && country.data) {
            this.updateTooltip(country);
            this.tooltip.style.opacity = '1';
        }
    }
    
    /**
     * 国家离开事件
     */
    onCountryLeave(country) {
        if (this.selectedCountry === country) return;
        
        // 恢复动画
        animate(country.element, {
            scale: 1,
            duration: 300,
            ease: 'out(3)'
        });
        
        // 隐藏提示框
        if (this.tooltip) {
            this.tooltip.style.opacity = '0';
        }
    }
    
    /**
     * 鼠标移动事件
     */
    onCountryMove(country, event) {
        if (this.tooltip && this.tooltip.style.opacity === '1') {
            this.tooltip.style.left = (event.pageX + 15) + 'px';
            this.tooltip.style.top = (event.pageY + 15) + 'px';
        }
    }
    
    /**
     * 国家点击事件
     */
    onCountryClick(country) {
        // 触发自定义事件
        const event = new CustomEvent('countrySelected', {
            detail: { country: country.data, iso: country.iso }
        });
        this.container.dispatchEvent(event);
    }
    
    /**
     * 更新提示框内容
     */
    updateTooltip(country) {
        const data = country.data;
        const formatNumber = (num) => new Intl.NumberFormat('zh-CN').format(Math.round(num));
        
        this.tooltip.innerHTML = `
            <div style="font-weight: bold; color: #c44569; margin-bottom: 8px; font-size: 16px;">
                ${country.name}
            </div>
            ${data.probability !== undefined ? `
                <div style="margin-bottom: 4px;">
                    <span style="color: #636e72;">出生概率:</span>
                    <span style="font-weight: bold; color: #2d3436;">${data.probability.toFixed(4)}%</span>
                </div>
            ` : ''}
            ${data.gdpPerCapita !== undefined ? `
                <div style="margin-bottom: 4px;">
                    <span style="color: #636e72;">人均GDP:</span>
                    <span style="font-weight: bold; color: #2d3436;">$${formatNumber(data.gdpPerCapita)}</span>
                </div>
            ` : ''}
            ${data.birthRate !== undefined ? `
                <div>
                    <span style="color: #636e72;">出生率:</span>
                    <span style="font-weight: bold; color: #2d3436;">${data.birthRate.toFixed(2)}‰</span>
                </div>
            ` : ''}
        `;
    }
    
    /**
     * 聚焦到指定国家
     */
    focusCountry(iso, options = {}) {
        const country = this.countries.get(iso);
        if (!country) {
            console.warn(`国家 ${iso} 未找到`);
            return;
        }

        const duration = options.duration || 2500;
        const targetScale = options.zoom || 4;

        // 获取国家边界框
        const bbox = country.element.getBBox();
        const centerX = bbox.x + bbox.width / 2;
        const centerY = bbox.y + bbox.height / 2;

        // 获取SVG视口尺寸
        const viewBox = this.svg.viewBox.baseVal;
        const svgWidth = viewBox.width;
        const svgHeight = viewBox.height;

        // 计算目标变换
        const targetTranslateX = svgWidth / 2 - centerX * targetScale;
        const targetTranslateY = svgHeight / 2 - centerY * targetScale;

        // 保存当前变换
        const startScale = this.transform.scale;
        const startTranslateX = this.transform.translateX;
        const startTranslateY = this.transform.translateY;

        // 使用anime.js执行平滑动画
        if (!this.transformGroup) return;

        const animObj = {
            scale: startScale,
            translateX: startTranslateX,
            translateY: startTranslateY
        };

        animate(animObj, {
            scale: targetScale,
            translateX: targetTranslateX,
            translateY: targetTranslateY,
            duration: duration,
            ease: 'inOut(3)',
            update: () => {
                this.transform.scale = animObj.scale;
                this.transform.translateX = animObj.translateX;
                this.transform.translateY = animObj.translateY;
                this.applyTransform();
            },
            onComplete: () => {
                // 动画完成后高亮国家
                this.highlightCountry(iso, { pulse: true });
            }
        });
    }
    
    /**
     * 高亮国家
     */
    highlightCountry(iso, options = {}) {
        const country = this.countries.get(iso);
        if (!country) return;

        // 清除之前的选中状态
        if (this.selectedCountry && this.selectedCountry !== country) {
            this.selectedCountry.element.classList.remove('selected');
        }

        this.selectedCountry = country;

        // 添加选中样式类
        country.element.classList.add('selected');

        if (options.pulse) {
            // 脉动动画
            const pulseAnimation = () => {
                animate(country.element, {
                    scale: [1, 1.05, 1],
                    duration: 1500,
                    ease: 'inOut(2)',
                    onComplete: () => {
                        if (this.selectedCountry === country) {
                            pulseAnimation();
                        }
                    }
                });
            };
            pulseAnimation();
        }
    }
    
    /**
     * 重置视图
     */
    resetView(duration = 1000) {
        if (!this.transformGroup) return;

        const animObj = {
            scale: this.transform.scale,
            translateX: this.transform.translateX,
            translateY: this.transform.translateY
        };

        animate(animObj, {
            scale: 1,
            translateX: 0,
            translateY: 0,
            duration: duration,
            ease: 'inOut(3)',
            update: () => {
                this.transform.scale = animObj.scale;
                this.transform.translateX = animObj.translateX;
                this.transform.translateY = animObj.translateY;
                this.applyTransform();
            }
        });

        // 清除选中状态
        if (this.selectedCountry) {
            this.selectedCountry.element.classList.remove('selected');
            this.selectedCountry = null;
            this.updateColors();
        }
    }
    
    /**
     * 销毁地图
     */
    destroy() {
        if (this.tooltip) {
            this.tooltip.remove();
        }
        this.container.innerHTML = '';
        this.countries.clear();
    }
}

