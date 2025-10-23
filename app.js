/**
 * 投胎模拟器 - 主应用逻辑
 */

import { animate, random } from './anime.esm.js';
import { WorldMapController } from './world-map-d3.js';

// 全局状态
const state = {
    data: null,
    currentResult: null,
    tenDrawResults: null,
    isDrawing: false,
    isTenDrawing: false,
    maps: {
        start: null,
        drawing: null,
        result: null,
        tenDraw: null
    }
};

// DOM 元素
const elements = {
    loading: document.getElementById('loading'),
    mainContent: document.getElementById('main-content'),
    startScreen: document.getElementById('start-screen'),
    drawingScreen: document.getElementById('drawing-screen'),
    resultScreen: document.getElementById('result-screen'),
    tenDrawResultScreen: document.getElementById('ten-draw-result-screen'),
    startBtn: document.getElementById('start-btn'),
    tenDrawBtn: document.getElementById('ten-draw-btn'),
    retryBtn: document.getElementById('retry-btn'),
    shareBtn: document.getElementById('share-btn'),
    tenDrawRetryBtn: document.getElementById('ten-draw-retry-btn'),
    tenDrawShareBtn: document.getElementById('ten-draw-share-btn'),
    backToStartBtn: document.getElementById('back-to-start-btn'),
    totalCountries: document.getElementById('total-countries'),
    totalBirths: document.getElementById('total-births'),
    roulette: document.getElementById('roulette'),
    tenDrawResults: document.getElementById('ten-draw-results'),
    shareModal: document.getElementById('share-modal'),
    closeShareModal: document.getElementById('close-share-modal'),
    shareCanvas: document.getElementById('share-canvas'),
    shareImage: document.getElementById('share-image'),
    saveImageBtn: document.getElementById('save-image-btn'),
    copyTextBtn: document.getElementById('copy-text-btn')
};

/**
 * 初始化应用
 */
async function init() {
    try {
        // 加载数据
        await loadData();
        
        // 隐藏加载界面，显示主内容
        animate(elements.loading, {
            opacity: [1, 0],
            duration: 500,
            ease: 'out(2)',
            onComplete: () => {
                elements.loading.style.display = 'none';
                elements.mainContent.style.display = 'block';

                // 显示开始界面动画
                animate(elements.startScreen, {
                    opacity: [0, 1],
                    y: [30, 0],
                    duration: 800,
                    ease: 'out(3)'
                });
            }
        });
        
        // 绑定事件
        bindEvents();
        
    } catch (error) {
        console.error('初始化失败:', error);
        showError('数据加载失败，请刷新页面重试');
    }
}

/**
 * 加载数据
 */
async function loadData() {
    try {
        const response = await fetch('fetch_data.php');
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || '数据加载失败');
        }
        
        state.data = result;
        
        // 更新统计信息
        updateStats();
        
    } catch (error) {
        throw new Error('无法连接到数据服务: ' + error.message);
    }
}

/**
 * 更新统计信息
 */
function updateStats() {
    if (!state.data) return;

    // 格式化数字
    const formatNumber = (num) => {
        return new Intl.NumberFormat('zh-CN').format(num);
    };

    elements.totalCountries.textContent = formatNumber(state.data.totalCountries);
    elements.totalBirths.textContent = formatNumber(state.data.totalBirths);

    // 初始化地图
    initializeMaps();
}

/**
 * 初始化地图
 */
async function initializeMaps() {
    try {
        // 初始化开始界面地图
        state.maps.start = new WorldMapController('world-map', {
            interactive: true,
            showTooltip: true,
            colorScheme: 'probability'
        });

        // 等待地图加载完成
        await new Promise(resolve => setTimeout(resolve, 500));

        // 绑定数据
        state.maps.start.bindData(state.data);

        // 绑定地图控制按钮
        bindMapControls();

        console.log('地图初始化完成');
    } catch (error) {
        console.error('地图初始化失败:', error);
    }
}

/**
 * 绑定地图控制按钮
 */
function bindMapControls() {
    const controlBtns = document.querySelectorAll('.map-control-btn');
    controlBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // 更新按钮状态
            controlBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // 更新地图颜色方案
            const scheme = btn.getAttribute('data-scheme');
            if (state.maps.start) {
                state.maps.start.updateColors(scheme);
            }
        });
    });
}

/**
 * 绑定事件
 */
function bindEvents() {
    elements.startBtn.addEventListener('click', startDrawing);
    elements.tenDrawBtn.addEventListener('click', startTenDraw);
    elements.retryBtn.addEventListener('click', retry);
    elements.shareBtn.addEventListener('click', share);
    elements.tenDrawRetryBtn.addEventListener('click', retryTenDraw);
    elements.tenDrawShareBtn.addEventListener('click', shareTenDraw);
    elements.backToStartBtn.addEventListener('click', backToStart);
    elements.closeShareModal.addEventListener('click', closeShareModal);
    elements.saveImageBtn.addEventListener('click', saveImage);
    elements.copyTextBtn.addEventListener('click', copyText);

    // 点击遮罩层关闭弹窗
    elements.shareModal.addEventListener('click', (e) => {
        if (e.target === elements.shareModal || e.target.classList.contains('modal-overlay')) {
            closeShareModal();
        }
    });

    // 初始化开始按钮特效
    initStartButtonAnimation();
}

/**
 * 初始化开始按钮动画特效
 */
function initStartButtonAnimation() {
    const btn = elements.startBtn;
    const btnGlow = btn.querySelector('.btn-glow');

    // 轻柔的悬浮动画
    animate(btn, {
        y: [-5, 5],
        duration: 3000,
        ease: 'inOut(2)',
        loop: true,
        alternate: true
    });

    // 轻微的缩放脉冲
    animate(btn, {
        scale: [1, 1.03, 1],
        duration: 2000,
        ease: 'inOut(3)',
        loop: true
    });

    // 光晕脉冲效果
    animate(btnGlow, {
        scale: [0, 1.8],
        opacity: [0.6, 0],
        duration: 2500,
        ease: 'out(3)',
        loop: true
    });

    // 鼠标悬停时的额外效果
    btn.addEventListener('mouseenter', () => {
        animate(btn, {
            scale: 1.08,
            duration: 400,
            ease: 'out(3)'
        });

        // 触发一次强烈的光晕
        animate(btnGlow, {
            scale: [0, 2.2],
            opacity: [0.9, 0],
            duration: 800,
            ease: 'out(3)'
        });
    });

    btn.addEventListener('mouseleave', () => {
        animate(btn, {
            scale: 1,
            duration: 400,
            ease: 'out(3)'
        });
    });

    // 点击时的特效
    btn.addEventListener('mousedown', () => {
        animate(btn, {
            scale: 0.96,
            duration: 100,
            ease: 'out(2)'
        });

        // 点击时的爆发光晕
        animate(btnGlow, {
            scale: [0, 3],
            opacity: [1, 0],
            duration: 500,
            ease: 'out(4)'
        });
    });

    btn.addEventListener('mouseup', () => {
        animate(btn, {
            scale: 1.08,
            duration: 200,
            ease: 'out(3)'
        });
    });

    // 添加随机的闪烁效果
    setInterval(() => {
        if (Math.random() > 0.7) {
            animate(btn, {
                opacity: [1, 0.85, 1],
                duration: 400,
                ease: 'inOut(2)'
            });
        }
    }, 4000);

    // 彩虹光晕动画（通过CSS变量控制）
    let hue = 0;
    setInterval(() => {
        hue = (hue + 2) % 360;
        btn.style.setProperty('--glow-hue', hue);
    }, 50);
}

/**
 * 开始抽签
 */
function startDrawing() {
    if (state.isDrawing) return;
    state.isDrawing = true;
    
    // 切换到抽签界面
    switchScreen(elements.startScreen, elements.drawingScreen);
    
    // 执行抽签动画
    performDrawing();
}

/**
 * 切换界面
 */
function switchScreen(fromScreen, toScreen) {
    animate(fromScreen, {
        opacity: [1, 0],
        y: [0, -30],
        duration: 400,
        ease: 'in(3)',
        onComplete: () => {
            fromScreen.classList.remove('active');
            toScreen.classList.add('active');

            animate(toScreen, {
                opacity: [0, 1],
                y: [30, 0],
                duration: 600,
                ease: 'out(3)'
            });
        }
    });
}

/**
 * 执行抽签动画
 */
async function performDrawing() {
    // 抽签完成，计算结果
    const result = drawCountry();
    state.currentResult = result;

    // 初始化抽签地图
    state.maps.drawing = new WorldMapController('drawing-map', {
        interactive: false,
        showTooltip: false
    });

    // 等待地图加载
    await new Promise(resolve => setTimeout(resolve, 500));

    // 绑定数据
    state.maps.drawing.bindData(state.data);

    // 显示国家名称
    const countryNameEl = document.getElementById('drawing-country-name');

    // 延迟后聚焦到目标国家
    setTimeout(() => {
        const iso = result.iso2 || result.iso || result.code;
        if (state.maps.drawing && iso) {
            state.maps.drawing.focusCountry(iso, {
                duration: 2500,
                zoom: 4
            });

            // 显示国家名称
            setTimeout(() => {
                countryNameEl.textContent = result.name;
                countryNameEl.classList.add('show');
            }, 1500);
        }

        // 延迟显示结果
        setTimeout(() => {
            showResult(result);
        }, 3500);
    }, 500);
}

/**
 * 抽取国家（加权随机）
 */
function drawCountry() {
    // 只从真实国家中抽取(排除聚合数据)
    const realCountries = state.data.countries.filter(c =>
        c.region !== 'Aggregates' &&
        c.iso2 &&
        c.iso2.length === 2 &&
        c.iso2.match(/^[A-Z]{2}$/)
    );

    // 计算真实国家的总出生人数
    const totalWeight = realCountries.reduce((sum, c) => sum + c.births, 0);

    // 生成随机数
    let random = Math.random() * totalWeight;

    // 加权选择
    for (let country of realCountries) {
        random -= country.births;
        if (random <= 0) {
            return country;
        }
    }

    // 兜底返回第一个真实国家
    return realCountries[0];
}

/**
 * 显示结果
 */
async function showResult(country) {
    // 切换到结果界面
    switchScreen(elements.drawingScreen, elements.resultScreen);

    // 填充数据
    populateResult(country);

    // 初始化结果地图
    await initResultMap(country);

    // 重置状态
    state.isDrawing = false;
}

/**
 * 初始化结果地图
 */
async function initResultMap(country) {
    try {
        state.maps.result = new WorldMapController('result-map', {
            interactive: false,
            showTooltip: false
        });

        await new Promise(resolve => setTimeout(resolve, 500));

        state.maps.result.bindData(state.data);

        // 聚焦到结果国家
        const iso = country.iso2 || country.iso || country.code;
        if (iso) {
            state.maps.result.focusCountry(iso, {
                duration: 1500,
                zoom: 3
            });
        }
    } catch (error) {
        console.error('结果地图初始化失败:', error);
    }
}

/**
 * 填充结果数据
 */
function populateResult(country) {
    // 国旗（使用emoji或可以后续替换为真实国旗图片）
    const flagEmoji = getFlagEmoji(country.iso2);
    document.getElementById('country-flag').textContent = flagEmoji;
    
    // 国家名称
    document.getElementById('country-name').textContent = country.name;
    
    // 基础信息
    document.getElementById('country-region').textContent = country.region || '未知';
    document.getElementById('country-capital').textContent = country.capital || '未知';
    document.getElementById('country-income').textContent = country.incomeLevel || '未知';
    document.getElementById('country-population').textContent = formatNumber(country.population);
    
    // 开局属性
    const maxGDP = 120000; // 参考最高GDP
    const maxProbability = Math.max(...state.data.countries.map(c => c.probability));
    const maxBirthRate = Math.max(...state.data.countries.map(c => c.birthRate));
    
    const gdpPercent = Math.min((country.gdpPerCapita / maxGDP) * 100, 100);
    const probPercent = (country.probability / maxProbability) * 100;
    const birthRatePercent = (country.birthRate / maxBirthRate) * 100;
    
    document.getElementById('gdp-value').textContent = `$${formatNumber(country.gdpPerCapita)}`;
    document.getElementById('probability-value').textContent = `${country.probability.toFixed(4)}%`;
    document.getElementById('birthrate-value').textContent = `${country.birthRate}‰`;
    
    // 属性条动画
    setTimeout(() => {
        animateStatBar('gdp-bar', gdpPercent);
        animateStatBar('probability-bar', probPercent);
        animateStatBar('birthrate-bar', birthRatePercent);
    }, 300);
    
    // 生成评价
    const comment = generateComment(country);
    document.getElementById('comment-text').textContent = comment;

    // 评价框动画
    animate('.comment-box', {
        scale: [0.9, 1],
        opacity: [0, 1],
        duration: 600,
        delay: 800,
        ease: 'outElastic(1)'
    });
}

/**
 * 属性条动画
 */
function animateStatBar(barId, percent) {
    const bar = document.getElementById(barId);
    animate(bar, {
        width: `${percent}%`,
        duration: 1500,
        ease: 'out(3)'
    });
}

/**
 * 生成评价
 */
function generateComment(country) {
    const gdp = country.gdpPerCapita;
    const prob = country.probability;
    
    let comment = '';
    
    // 根据GDP评价
    if (gdp > 60000) {
        comment = '🎉 恭喜！你投胎到了发达国家，开局经济条件优越！';
    } else if (gdp > 30000) {
        comment = '😊 不错！这是一个中等发达国家，生活质量较好。';
    } else if (gdp > 10000) {
        comment = '🤔 这是一个发展中国家，需要努力奋斗哦！';
    } else {
        comment = '💪 开局虽然困难，但机遇与挑战并存！';
    }
    
    // 根据概率补充
    if (prob > 1) {
        comment += ' 而且这是一个人口大国，你的同龄人会很多！';
    } else if (prob < 0.01) {
        comment += ' 这是一个小国，你很幸运能投胎到这里！';
    }
    
    return comment;
}

/**
 * 获取国旗emoji
 */
function getFlagEmoji(iso2) {
    if (!iso2 || iso2.length !== 2) return '🏳️';
    
    const codePoints = [...iso2.toUpperCase()].map(char => 
        127397 + char.charCodeAt(0)
    );
    return String.fromCodePoint(...codePoints);
}

/**
 * 格式化数字
 */
function formatNumber(num) {
    return new Intl.NumberFormat('zh-CN').format(Math.round(num));
}

/**
 * 重新抽签
 */
function retry() {
    // 清理地图
    if (state.maps.drawing) {
        state.maps.drawing.destroy();
        state.maps.drawing = null;
    }
    if (state.maps.result) {
        state.maps.result.destroy();
        state.maps.result = null;
    }

    // 重置开始地图视图
    if (state.maps.start) {
        state.maps.start.resetView();
    }

    // 隐藏国家名称
    const countryNameEl = document.getElementById('drawing-country-name');
    if (countryNameEl) {
        countryNameEl.classList.remove('show');
        countryNameEl.textContent = '';
    }

    // 切换回开始界面
    switchScreen(elements.resultScreen, elements.startScreen);
}

/**
 * 分享结果
 */
async function share() {
    if (!state.currentResult) return;

    // 显示分享弹窗
    elements.shareModal.classList.add('active');

    // 添加弹窗动画
    animate(elements.shareModal.querySelector('.modal-content'), {
        scale: [0.9, 1],
        opacity: [0, 1],
        duration: 400,
        ease: 'out(3)'
    });

    // 生成截图
    await generateShareImage();
}

/**
 * 关闭分享弹窗
 */
function closeShareModal() {
    animate(elements.shareModal.querySelector('.modal-content'), {
        scale: [1, 0.9],
        opacity: [1, 0],
        duration: 300,
        ease: 'in(3)',
        onComplete: () => {
            elements.shareModal.classList.remove('active');
        }
    });
}

/**
 * 生成分享图片
 */
async function generateShareImage() {
    const canvas = elements.shareCanvas;
    const ctx = canvas.getContext('2d');

    // 设置画布尺寸
    const width = 800;
    const height = 1000;
    canvas.width = width;
    canvas.height = height;

    // 绘制背景渐变
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 绘制装饰图案
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    for (let i = 0; i < 20; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const radius = Math.random() * 30 + 10;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    // 绘制白色卡片背景
    const cardPadding = 40;
    const cardY = 80;
    const cardHeight = height - 160;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 10;
    roundRect(ctx, cardPadding, cardY, width - cardPadding * 2, cardHeight, 20);
    ctx.fill();
    ctx.shadowColor = 'transparent';

    // 绘制标题
    ctx.fillStyle = '#ff6b9d';
    ctx.font = 'bold 48px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎲 投胎模拟器', width / 2, 150);

    // 绘制国旗
    const flagEmoji = getFlagEmoji(state.currentResult.iso2);
    ctx.font = '120px Arial';
    ctx.fillText(flagEmoji, width / 2, 280);

    // 绘制国家名称
    ctx.fillStyle = '#2d3436';
    ctx.font = 'bold 42px "Microsoft YaHei", sans-serif';
    ctx.fillText(state.currentResult.name, width / 2, 360);

    // 绘制分隔线
    ctx.strokeStyle = 'rgba(102, 126, 234, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(100, 400);
    ctx.lineTo(width - 100, 400);
    ctx.stroke();

    // 绘制属性信息
    const stats = [
        { label: '人均GDP', value: `$${formatNumber(state.currentResult.gdpPerCapita)}`, icon: '💰' },
        { label: '出生概率', value: `${state.currentResult.probability.toFixed(4)}%`, icon: '🎯' },
        { label: '出生率', value: `${state.currentResult.birthRate}‰`, icon: '👶' },
        { label: '所属地区', value: state.currentResult.region || '未知', icon: '🌍' }
    ];

    let yPos = 460;
    stats.forEach((stat, index) => {
        // 图标
        ctx.font = '32px Arial';
        ctx.fillText(stat.icon, 120, yPos);

        // 标签
        ctx.fillStyle = '#636e72';
        ctx.font = '24px "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(stat.label, 180, yPos);

        // 数值
        ctx.fillStyle = '#2d3436';
        ctx.font = 'bold 28px "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(stat.value, width - 120, yPos);

        yPos += 80;
    });

    // 绘制评价
    const comment = generateComment(state.currentResult);
    ctx.fillStyle = '#ff6b9d';
    ctx.font = '22px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';

    // 文字换行处理
    const maxWidth = width - 160;
    const words = comment.split('');
    let line = '';
    let lineY = yPos + 40;

    for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i];
        const metrics = ctx.measureText(testLine);

        if (metrics.width > maxWidth && i > 0) {
            ctx.fillText(line, width / 2, lineY);
            line = words[i];
            lineY += 35;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, width / 2, lineY);

    // 绘制底部信息
    ctx.fillStyle = '#b2bec3';
    ctx.font = '18px "Microsoft YaHei", sans-serif';
    ctx.fillText('体验投胎模拟器', width / 2, height - 60);

    // 将 Canvas 转换为图片显示（移动端长按保存支持更好）
    convertCanvasToImage();

    console.log('分享图片生成完成');
}

/**
 * 将 Canvas 转换为 Image 元素显示
 * 移动端对 img 元素的长按保存支持比 canvas 更好
 */
function convertCanvasToImage() {
    const canvas = elements.shareCanvas;
    const img = elements.shareImage;

    if (!canvas || !img) {
        console.error('Canvas 或 Image 元素未找到');
        return;
    }

    try {
        // 将 canvas 转换为 data URL
        const dataURL = canvas.toDataURL('image/png', 1.0);

        console.log('Canvas 转换成功，尺寸:', canvas.width, 'x', canvas.height);

        // 设置图片源
        img.src = dataURL;

        // 显示图片，隐藏 canvas
        canvas.style.display = 'none';
        img.style.display = 'block';

        console.log('图片已设置并显示，src 长度:', dataURL.length);

        // 等待图片加载完成
        img.onload = function() {
            console.log('图片加载完成，自然尺寸:', img.naturalWidth, 'x', img.naturalHeight);
        };

        img.onerror = function() {
            console.error('图片加载失败');
        };
    } catch (error) {
        console.error('Canvas 转换失败:', error);
    }
}

/**
 * 绘制圆角矩形
 */
function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

/**
 * 保存图片
 */
function saveImage() {
    const img = elements.shareImage;

    // 从 img 元素获取图片数据
    const dataURL = img.src;

    // 将 data URL 转换为 blob
    fetch(dataURL)
        .then(res => res.blob())
        .then(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            // 根据当前结果类型设置文件名
            // 优先判断是否是十连抽结果
            let fileName;
            if (state.tenDrawResults && state.tenDrawResults.length > 0) {
                fileName = `投胎模拟器-十连抽-${Date.now()}.png`;
            } else if (state.currentResult) {
                fileName = `投胎模拟器-${state.currentResult.name}-${Date.now()}.png`;
            } else {
                fileName = `投胎模拟器-${Date.now()}.png`;
            }

            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            // 显示提示
            showToast('图片已保存！');
        })
        .catch(err => {
            console.error('保存图片失败:', err);
            showToast('保存失败，请长按图片保存');
        });
}

/**
 * 复制文字
 */
function copyText() {
    if (!state.currentResult) return;

    const text = `我在投胎模拟器中抽到了 ${state.currentResult.name}！

🏳️ 国家：${state.currentResult.name}
💰 人均GDP：$${formatNumber(state.currentResult.gdpPerCapita)}
🎯 出生概率：${state.currentResult.probability.toFixed(4)}%
👶 出生率：${state.currentResult.birthRate}‰
🌍 地区：${state.currentResult.region || '未知'}

快来试试你的运气吧！`;

    navigator.clipboard.writeText(text).then(() => {
        showToast('文字已复制到剪贴板！');
    }).catch(() => {
        // 降级方案
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('文字已复制到剪贴板！');
    });
}

/**
 * 显示提示消息
 */
function showToast(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 15px 30px;
        border-radius: 10px;
        font-size: 16px;
        z-index: 10000;
        pointer-events: none;
    `;
    document.body.appendChild(toast);

    animate(toast, {
        opacity: [0, 1, 1, 0],
        scale: [0.8, 1, 1, 0.8],
        duration: 2000,
        ease: 'out(2)',
        onComplete: () => {
            document.body.removeChild(toast);
        }
    });
}

/**
 * 显示错误
 */
function showError(message) {
    elements.loading.innerHTML = `
        <div style="color: white; text-align: center;">
            <p style="font-size: 1.5rem; margin-bottom: 10px;">❌</p>
            <p style="font-size: 1.2rem;">${message}</p>
        </div>
    `;
}

/**
 * 创建粒子效果
 */
function createParticles() {
    const particlesContainer = document.getElementById('particles');
    if (!particlesContainer) return;

    // 创建粒子
    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.cssText = `
            position: fixed;
            width: ${Math.random() * 10 + 5}px;
            height: ${Math.random() * 10 + 5}px;
            background: rgba(255, 255, 255, ${Math.random() * 0.5 + 0.3});
            border-radius: 50%;
            pointer-events: none;
            z-index: 0;
        `;
        particlesContainer.appendChild(particle);

        // 粒子动画
        animate(particle, {
            x: () => random(-100, window.innerWidth + 100),
            y: () => random(-100, window.innerHeight + 100),
            scale: [0, 1, 0],
            opacity: [0, 1, 0],
            duration: () => random(3000, 8000),
            ease: 'inOut(2)',
            loop: true,
            delay: () => random(0, 3000)
        });
    }
}

/**
 * 添加按钮悬停效果
 */
function addButtonEffects() {
    const buttons = document.querySelectorAll('.btn');

    buttons.forEach(btn => {
        btn.addEventListener('mouseenter', () => {
            animate(btn, {
                scale: 1.05,
                duration: 300,
                ease: 'outElastic(1)'
            });
        });

        btn.addEventListener('mouseleave', () => {
            animate(btn, {
                scale: 1,
                duration: 300,
                ease: 'outElastic(1)'
            });
        });
    });
}

/**
 * 添加卡片入场动画
 */
function animateCardEntrance(card) {
    animate(card, {
        scale: [0.8, 1],
        opacity: [0, 1],
        duration: 800,
        ease: 'outElastic(1)'
    });
}

/**
 * ==================== 十连抽功能 ====================
 */

/**
 * 开始十连抽
 */
function startTenDraw() {
    if (state.isTenDrawing) return;
    state.isTenDrawing = true;

    // 切换到抽签界面（复用抽签界面显示进度）
    switchScreen(elements.startScreen, elements.drawingScreen);

    // 执行十连抽
    performTenDraw();
}

/**
 * 执行十连抽
 */
async function performTenDraw() {
    // 执行10次抽签
    const results = [];
    for (let i = 0; i < 10; i++) {
        const result = drawCountry();
        results.push({
            ...result,
            rank: i + 1
        });
    }

    state.tenDrawResults = results;

    // 初始化抽签地图
    state.maps.drawing = new WorldMapController('drawing-map', {
        interactive: false,
        showTooltip: false
    });

    // 等待地图加载
    await new Promise(resolve => setTimeout(resolve, 500));

    // 绑定数据
    state.maps.drawing.bindData(state.data);

    // 显示提示文字
    const countryNameEl = document.getElementById('drawing-country-name');
    countryNameEl.textContent = '正在抽取十连...';
    countryNameEl.classList.add('show');

    // 延迟后显示结果
    setTimeout(() => {
        showTenDrawResults(results);
    }, 2000);
}

/**
 * 显示十连抽结果
 */
async function showTenDrawResults(results) {
    // 切换到十连抽结果界面
    switchScreen(elements.drawingScreen, elements.tenDrawResultScreen);

    // 清空之前的结果
    elements.tenDrawResults.innerHTML = '';

    // 初始化十连抽地图
    state.maps.tenDraw = new WorldMapController('ten-draw-map', {
        interactive: true,
        showTooltip: true
    });

    // 等待地图加载
    await new Promise(resolve => setTimeout(resolve, 500));

    // 绑定数据
    state.maps.tenDraw.bindData(state.data);

    // 在地图上标记所有结果
    results.forEach((result, index) => {
        const iso = result.iso2 || result.iso || result.code;
        if (state.maps.tenDraw && iso) {
            // 高亮国家
            setTimeout(() => {
                state.maps.tenDraw.highlightCountry(iso, { pulse: false });
            }, index * 100);
        }
    });

    // 生成结果卡片（带动画）
    results.forEach((result, index) => {
        setTimeout(() => {
            const card = createTenDrawResultCard(result, index);
            elements.tenDrawResults.appendChild(card);

            // 添加入场动画
            animate(card, {
                opacity: [0, 1],
                y: [30, 0],
                duration: 500,
                ease: 'out(3)'
            });
        }, index * 150);
    });

    // 重置状态
    state.isTenDrawing = false;
}

/**
 * 创建十连抽结果卡片
 */
function createTenDrawResultCard(result, index) {
    const card = document.createElement('div');
    card.className = 'ten-draw-result-card';

    const flagEmoji = getFlagEmoji(result.iso2);

    card.innerHTML = `
        <div class="ten-draw-result-rank">#${result.rank}</div>
        <div class="ten-draw-result-flag">${flagEmoji}</div>
        <div class="ten-draw-result-name">${result.name}</div>
        <div class="ten-draw-result-stats">
            <div class="ten-draw-result-stat">
                <span class="ten-draw-result-stat-label">💰 人均GDP</span>
                <span class="ten-draw-result-stat-value">$${formatNumber(result.gdpPerCapita)}</span>
            </div>
            <div class="ten-draw-result-stat">
                <span class="ten-draw-result-stat-label">🎯 出生概率</span>
                <span class="ten-draw-result-stat-value">${result.probability.toFixed(4)}%</span>
            </div>
            <div class="ten-draw-result-stat">
                <span class="ten-draw-result-stat-label">👶 出生率</span>
                <span class="ten-draw-result-stat-value">${result.birthRate}‰</span>
            </div>
            <div class="ten-draw-result-stat">
                <span class="ten-draw-result-stat-label">🌍 地区</span>
                <span class="ten-draw-result-stat-value">${result.region || '未知'}</span>
            </div>
        </div>
    `;

    // 点击卡片聚焦到对应国家
    card.addEventListener('click', () => {
        const iso = result.iso2 || result.iso || result.code;
        if (state.maps.tenDraw && iso) {
            state.maps.tenDraw.focusCountry(iso, {
                duration: 1500,
                zoom: 4
            });
        }
    });

    return card;
}

/**
 * 再抽十连
 */
function retryTenDraw() {
    // 清理地图
    if (state.maps.drawing) {
        state.maps.drawing.destroy();
        state.maps.drawing = null;
    }
    if (state.maps.tenDraw) {
        state.maps.tenDraw.destroy();
        state.maps.tenDraw = null;
    }

    // 重置开始地图视图
    if (state.maps.start) {
        state.maps.start.resetView();
    }

    // 隐藏国家名称
    const countryNameEl = document.getElementById('drawing-country-name');
    if (countryNameEl) {
        countryNameEl.classList.remove('show');
        countryNameEl.textContent = '';
    }

    // 重新开始十连抽
    switchScreen(elements.tenDrawResultScreen, elements.startScreen);

    // 延迟后自动开始
    setTimeout(() => {
        startTenDraw();
    }, 500);
}

/**
 * 返回首页
 */
function backToStart() {
    // 清理地图
    if (state.maps.drawing) {
        state.maps.drawing.destroy();
        state.maps.drawing = null;
    }
    if (state.maps.tenDraw) {
        state.maps.tenDraw.destroy();
        state.maps.tenDraw = null;
    }

    // 重置开始地图视图
    if (state.maps.start) {
        state.maps.start.resetView();
    }

    // 隐藏国家名称
    const countryNameEl = document.getElementById('drawing-country-name');
    if (countryNameEl) {
        countryNameEl.classList.remove('show');
        countryNameEl.textContent = '';
    }

    // 切换回开始界面
    switchScreen(elements.tenDrawResultScreen, elements.startScreen);
}

/**
 * 分享十连抽结果
 */
async function shareTenDraw() {
    if (!state.tenDrawResults) return;

    // 显示分享弹窗
    elements.shareModal.classList.add('active');

    // 添加弹窗动画
    animate(elements.shareModal.querySelector('.modal-content'), {
        scale: [0.9, 1],
        opacity: [0, 1],
        duration: 400,
        ease: 'out(3)'
    });

    // 生成十连抽分享图片
    await generateTenDrawShareImage();
}

/**
 * 生成十连抽分享图片
 */
async function generateTenDrawShareImage() {
    const canvas = elements.shareCanvas;
    const ctx = canvas.getContext('2d');

    // 设置画布尺寸（更大以容纳10个结果）
    const width = 1200;
    const height = 1600;
    canvas.width = width;
    canvas.height = height;

    // 绘制背景渐变
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 绘制装饰图案
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    for (let i = 0; i < 30; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const radius = Math.random() * 30 + 10;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    // 绘制白色卡片背景
    const cardPadding = 40;
    const cardY = 60;
    const cardHeight = height - 120;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 10;
    roundRect(ctx, cardPadding, cardY, width - cardPadding * 2, cardHeight, 20);
    ctx.fill();
    ctx.shadowColor = 'transparent';

    // 绘制标题
    ctx.fillStyle = '#ff6b9d';
    ctx.font = 'bold 56px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎰 投胎模拟器 - 十连抽', width / 2, 140);

    // 绘制副标题
    ctx.fillStyle = '#636e72';
    ctx.font = '28px "Microsoft YaHei", sans-serif';
    ctx.fillText('我的十连抽结果', width / 2, 190);

    // 绘制分隔线
    ctx.strokeStyle = 'rgba(102, 126, 234, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(100, 220);
    ctx.lineTo(width - 100, 220);
    ctx.stroke();

    // 绘制10个结果（2列5行）
    const results = state.tenDrawResults;
    const cols = 2;
    const rows = 5;
    const resultCardWidth = (width - cardPadding * 2 - 60) / cols;
    const resultCardHeight = (height - 280 - cardPadding) / rows;
    const startX = cardPadding + 30;
    const startY = 250;

    for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = startX + col * resultCardWidth;
        const y = startY + row * resultCardHeight;

        // 绘制排名徽章
        ctx.fillStyle = '#ff6b9d';
        ctx.beginPath();
        ctx.arc(x + 30, y + 30, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = 'bold 18px "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${i + 1}`, x + 30, y + 37);

        // 绘制国旗
        const flagEmoji = getFlagEmoji(result.iso2);
        ctx.font = '48px Arial';
        ctx.fillText(flagEmoji, x + resultCardWidth / 2, y + 80);

        // 绘制国家名称
        ctx.fillStyle = '#2d3436';
        ctx.font = 'bold 22px "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';

        // 处理长国家名称
        const name = result.name;
        if (ctx.measureText(name).width > resultCardWidth - 40) {
            const shortName = name.length > 10 ? name.substring(0, 10) + '...' : name;
            ctx.fillText(shortName, x + resultCardWidth / 2, y + 120);
        } else {
            ctx.fillText(name, x + resultCardWidth / 2, y + 120);
        }

        // 绘制关键数据
        ctx.font = '16px "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#636e72';

        const dataY = y + 150;
        const lineHeight = 24;

        // GDP
        ctx.fillText('💰', x + 20, dataY);
        ctx.fillStyle = '#2d3436';
        ctx.font = 'bold 15px "Microsoft YaHei", sans-serif';
        const gdpText = `$${formatNumber(result.gdpPerCapita)}`;
        ctx.fillText(gdpText.length > 12 ? gdpText.substring(0, 12) : gdpText, x + 45, dataY);

        // 概率
        ctx.fillStyle = '#636e72';
        ctx.font = '16px "Microsoft YaHei", sans-serif';
        ctx.fillText('🎯', x + 20, dataY + lineHeight);
        ctx.fillStyle = '#2d3436';
        ctx.font = 'bold 15px "Microsoft YaHei", sans-serif';
        ctx.fillText(`${result.probability.toFixed(3)}%`, x + 45, dataY + lineHeight);
    }

    // 绘制底部信息
    ctx.fillStyle = '#b2bec3';
    ctx.font = '20px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('体验投胎模拟器', width / 2, height - 50);

    // 将 Canvas 转换为图片显示（移动端长按保存支持更好）
    convertCanvasToImage();

    console.log('十连抽分享图片生成完成');
}

// 启动应用
init();

// 创建背景粒子效果
createParticles();

// 添加按钮效果
setTimeout(() => {
    addButtonEffects();
}, 1000);

