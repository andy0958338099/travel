/**
 * 旅遊網頁增強腳本
 * 包含：背景音樂、返回頂部、載入動畫、卡片動畫等
 */

(function() {
    'use strict';

    // ===== 1. 載入動畫 =====
    function initLoader() {
        const loaderHTML = `
            <div class="loader-overlay" id="enhanceLoader">
                <div class="loader-plane">✈️</div>
                <div class="loader-text">正在準備您的旅程...</div>
            </div>
        `;
        document.body.insertAdjacentHTML('afterbegin', loaderHTML);
        
        // 1.5秒後隱藏
        setTimeout(function() {
            const loader = document.getElementById('enhanceLoader');
            if (loader) loader.classList.add('hidden');
        }, 1500);
    }

    // ===== 2. 背景音樂控制 =====
    function initMusicControl() {
        const musicHTML = `
            <div class="music-control">
                <button class="music-btn" id="musicToggle" title="播放/暫停背景音樂">
                    <span id="musicIcon">🔇</span>
                </button>
                <div class="volume-container">
                    <span class="volume-icon">🔊</span>
                    <input type="range" class="volume-slider" id="volumeSlider" min="0" max="100" value="40">
                </div>
                <span class="music-label">水晶音樂</span>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', musicHTML);
        
        // 初始化音樂
        const music = document.getElementById('bgMusic') || createMusicElement();
        let isPlaying = false;
        
        const musicToggle = document.getElementById('musicToggle');
        const musicIcon = document.getElementById('musicIcon');
        const volumeSlider = document.getElementById('volumeSlider');
        
        music.volume = 0.4;
        
        musicToggle.addEventListener('click', function() {
            if (isPlaying) {
                music.pause();
                musicIcon.textContent = '🔇';
                musicToggle.classList.remove('playing');
            } else {
                music.play().then(() => {
                    musicIcon.textContent = '🎵';
                    musicToggle.classList.add('playing');
                }).catch(() => {
                    alert('請點擊播放按鈕以啟用背景音樂 🎵');
                });
            }
            isPlaying = !isPlaying;
        });
        
        volumeSlider.addEventListener('input', function() {
            music.volume = this.value / 100;
        });
        
        // 鍵盤快捷鍵 M
        document.addEventListener('keydown', function(e) {
            if (e.key === 'm' || e.key === 'M') {
                if (!e.target.matches('input, textarea')) {
                    musicToggle.click();
                }
            }
        });
    }

    function createMusicElement() {
        const audio = document.createElement('audio');
        audio.id = 'bgMusic';
        audio.loop = true;
        audio.preload = 'auto';
        audio.innerHTML = `
            <source src="https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3" type="audio/mp3">
        `;
        document.body.appendChild(audio);
        return audio;
    }

    // ===== 3. 返回頂部按鈕 =====
    function initBackToTop() {
        const btnHTML = `<button class="back-to-top" id="backToTop" title="返回頂部">↑</button>`;
        document.body.insertAdjacentHTML('beforeend', btnHTML);
        
        const backToTop = document.getElementById('backToTop');
        
        window.addEventListener('scroll', function() {
            if (window.scrollY > 400) {
                backToTop.classList.add('visible');
            } else {
                backToTop.classList.remove('visible');
            }
        });
        
        backToTop.addEventListener('click', function() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        
        // 鍵盤快捷鍵 T
        document.addEventListener('keydown', function(e) {
            if ((e.key === 't' || e.key === 'T') && !e.target.matches('input, textarea')) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }

    // ===== 4. 浮動 LINE 客服 =====
    function initFloatContact() {
        const floatHTML = `
            <div class="float-contact">
                <a href="https://line.me/ti/p/@sticker-tycoon" target="_blank" class="float-btn line">
                    💬
                    <span class="tooltip">LINE 客服</span>
                </a>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', floatHTML);
    }

    // ===== 5. 添加樣式 =====
    function injectStyles() {
        const styles = `
            /* 載入動畫 */
            .loader-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                transition: opacity 0.6s ease, visibility 0.6s ease;
            }
            .loader-overlay.hidden { opacity: 0; visibility: hidden; }
            .loader-plane { font-size: 4rem; animation: fly 1.5s ease-in-out infinite; }
            @keyframes fly { 0%, 100% { transform: translateY(0) rotate(-10deg); } 50% { transform: translateY(-20px) rotate(10deg); } }
            .loader-text { margin-top: 20px; font-size: 1.2rem; color: #48dbfb; animation: pulse 1.5s ease-in-out infinite; }
            @keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }

            /* 背景音樂控制 */
            .music-control {
                position: fixed;
                bottom: 30px;
                left: 30px;
                z-index: 1000;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(15px);
                border-radius: 50px;
                padding: 12px 20px;
                display: flex;
                align-items: center;
                gap: 15px;
                border: 1px solid rgba(255, 255, 255, 0.15);
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
                opacity: 0;
                transform: translateY(20px);
                animation: slideUp 0.5s ease 1s forwards;
            }
            @keyframes slideUp { to { opacity: 1; transform: translateY(0); } }
            .music-btn {
                width: 44px;
                height: 44px;
                border-radius: 50%;
                border: none;
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: white;
                font-size: 1.3rem;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
            }
            .music-btn:hover { transform: scale(1.1); box-shadow: 0 5px 20px rgba(102, 126, 234, 0.5); }
            .music-btn.playing { background: linear-gradient(135deg, #f093fb, #f5576c); animation: pulse-btn 2s infinite; }
            @keyframes pulse-btn { 0%, 100% { box-shadow: 0 0 0 0 rgba(240, 147, 251, 0.5); } 50% { box-shadow: 0 0 0 10px rgba(240, 147, 251, 0); } }
            .volume-container { display: flex; align-items: center; gap: 10px; }
            .volume-icon { color: #aaa; font-size: 1rem; }
            .volume-slider {
                width: 80px;
                height: 6px;
                -webkit-appearance: none;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 3px;
                cursor: pointer;
            }
            .volume-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 16px;
                height: 16px;
                background: linear-gradient(135deg, #48dbfb, #0abde3);
                border-radius: 50%;
                cursor: pointer;
            }
            .music-label { font-size: 0.85rem; color: #aaa; white-space: nowrap; }

            /* 返回頂部 */
            .back-to-top {
                position: fixed;
                bottom: 30px;
                right: 30px;
                width: 55px;
                height: 55px;
                border-radius: 50%;
                background: linear-gradient(135deg, #48dbfb, #0abde3);
                color: white;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                z-index: 999;
                opacity: 0;
                transform: translateY(20px);
                transition: all 0.3s ease;
                box-shadow: 0 5px 20px rgba(72, 219, 251, 0.4);
            }
            .back-to-top.visible { opacity: 1; transform: translateY(0); }
            .back-to-top:hover { transform: translateY(-5px) scale(1.1); box-shadow: 0 10px 30px rgba(72, 219, 251, 0.6); }

            /* 浮動客服 */
            .float-contact {
                position: fixed;
                bottom: 100px;
                right: 30px;
                z-index: 998;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            .float-btn {
                width: 55px;
                height: 55px;
                border-radius: 50%;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                text-decoration: none;
            }
            .float-btn.line { background: #06C755; color: white; box-shadow: 0 5px 20px rgba(6, 199, 85, 0.4); }
            .float-btn:hover { transform: scale(1.1); }
            .float-btn .tooltip {
                position: absolute;
                right: 65px;
                background: rgba(0, 0, 0, 0.8);
                padding: 8px 15px;
                border-radius: 8px;
                font-size: 0.85rem;
                white-space: nowrap;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.3s;
                color: white;
            }
            .float-btn:hover .tooltip { opacity: 1; }

            /* 手機版 */
            @media (max-width: 768px) {
                .music-control { left: 15px; bottom: 20px; padding: 10px 15px; gap: 10px; }
                .volume-slider { width: 60px; }
                .music-label { display: none; }
                .back-to-top { right: 15px; bottom: 20px; }
                .float-contact { right: 15px; }
            }
        `;
        
        const styleEl = document.createElement('style');
        styleEl.textContent = styles;
        document.head.appendChild(styleEl);
    }

    // ===== 6. 卡片動畫 =====
    function initCardAnimations() {
        const cards = document.querySelectorAll('.trip-card, .card, .destination-card, .package-card');
        cards.forEach(function(card, index) {
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px)';
            card.style.transition = 'all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            
            setTimeout(function() {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, 200 + (index * 150));
        });
    }

    // ===== 初始化 =====
    function init() {
        injectStyles();
        initLoader();
        initMusicControl();
        initBackToTop();
        initFloatContact();
        
        // 頁面載入後執行卡片動畫
        if (document.readyState === 'complete') {
            setTimeout(initCardAnimations, 500);
        } else {
            window.addEventListener('load', function() {
                setTimeout(initCardAnimations, 500);
            });
        }
    }

    // 啟動
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();