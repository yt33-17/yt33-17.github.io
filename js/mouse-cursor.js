// 魔法棒鼠标效果
(function () {
  const particles = [];
  const colors = ['#ff6b9d', '#ff8ab8', '#ff9ec7', '#ffb3d9', '#ffd6e8', '#ff69b4', '#ff1493', '#db7093', '#ffc0cb', '#ff85a2', '#e91e63', '#00bcd4', '#26c6da', '#ffd700', '#ff6b35', '#ba68c8', '#81d4fa'];

  let lastX = 0;
  let lastY = 0;
  let lastTime = 0;
  let animationId = null;
  let styleEl = null;

  // 注入光标样式
  function injectCursorStyle() {
    if (styleEl && styleEl.parentNode) {
      styleEl.parentNode.removeChild(styleEl);
    }
    
    styleEl = document.createElement('style');
    styleEl.setAttribute('data-cursor', 'magic-wand');
    styleEl.textContent = `
      html, body, div, span, applet, object, iframe,
      h1, h2, h3, h4, h5, h6, p, blockquote, pre,
      a, abbr, acronym, address, big, cite, code,
      del, dfn, em, img, ins, kbd, q, s, samp,
      small, strike, strong, sub, sup, tt, var,
      b, u, i, center,
      dl, dt, dd, ol, ul, li,
      fieldset, form, label, legend,
      table, caption, tbody, tfoot, thead, tr, th, td,
      article, aside, canvas, details, embed, 
      figure, figcaption, footer, header, hgroup, 
      menu, nav, output, ruby, section, summary,
      time, mark, audio, video {
        cursor: url("/img/magic-wand.svg") 8 8, auto !important;
      }
      input[type="text"], input[type="search"], input[type="password"], 
      input[type="email"], input:not([type]), textarea, select {
        cursor: text !important;
      }
      button:disabled, input:disabled {
        cursor: not-allowed !important;
      }
      html, body { overflow-x: hidden; }
      
      .paw-particle {
        position: fixed;
        pointer-events: none;
        z-index: 999999;
        border-radius: 50%;
        will-change: transform, opacity;
      }
    `;
    document.head.appendChild(styleEl);
    
    // 强制刷新光标样式
    forceRefreshCursor();
  }
  
  // 强制刷新光标 - 解决 pjax 切换后光标丢失问题
  function forceRefreshCursor() {
    // 直接在 document 上设置 cursor 样式
    document.documentElement.style.setProperty('cursor', 'url("/img/magic-wand.svg") 8 8, auto', 'important');
    document.body.style.setProperty('cursor', 'url("/img/magic-wand.svg") 8 8, auto', 'important');
    
    // 用 JS 遍历所有元素设置 cursor
    const allElements = document.querySelectorAll('*');
    allElements.forEach(function(el) {
      // 跳过 input/textarea/select
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
        return;
      }
      el.style.setProperty('cursor', 'url("/img/magic-wand.svg") 8 8, auto', 'important');
    });
  }

  // 鼠标移动生成粒子 - 明显跟随效果
  function handleMouseMove(e) {
    const now = Date.now();
    const deltaTime = now - lastTime;
    
    const deltaX = Math.abs(e.clientX - lastX);
    const deltaY = Math.abs(e.clientY - lastY);
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // 减小阈值，增加生成频率
    if (distance > 5 && deltaTime > 16) {
      // 增加粒子上限
      if (particles.length > 35) {
        const old = particles.shift();
        if (old.el && old.el.parentNode) old.el.parentNode.removeChild(old.el);
      }
      
      const color = colors[Math.floor(Math.random() * colors.length)];
      // 增大粒子尺寸
      const size = Math.random() * 2 + 1;
      
      // 计算鼠标移动方向，让粒子有跟随效果
      const moveDirX = e.clientX - lastX;
      const moveDirY = e.clientY - lastY;
      const moveLen = Math.sqrt(moveDirX * moveDirX + moveDirY * moveDirY) || 1;
      const moveNormX = moveDirX / moveLen;
      const moveNormY = moveDirY / moveLen;
      
      const el = document.createElement('div');
      el.className = 'paw-particle';
      el.style.cssText = `
        width: ${size * 2}px;
        height: ${size * 2}px;
        background: radial-gradient(circle, ${color} 0%, ${color}88 50%, transparent 70%);
        box-shadow: 0 0 ${size * 3}px ${color}, 0 0 ${size * 6}px ${color}44;
        left: ${e.clientX}px;
        top: ${e.clientY}px;
        opacity: 1;
      `;
      document.body.appendChild(el);
      
      // 随机方向，但偏向鼠标移动方向，减少纯向下的情况
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 2 + 1;
      
      particles.push({
        x: e.clientX,
        y: e.clientY,
        // 初始速度：随机方向 + 偏向移动方向 + 向上偏移
        vx: Math.cos(angle) * speed + moveNormX * 1.5,
        vy: Math.sin(angle) * speed + moveNormY * 1.5 - 1, // -1 给一个初始向上的力
        el: el,
        alpha: 1,
        size: size
      });

      lastX = e.clientX;
      lastY = e.clientY;
      lastTime = now;
    }
  }

  // 粒子动画 - 扩散效果，减少掉落
  function animateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      // 很小的重力，让粒子慢慢飘落
      p.vy += 0.02;
      // 空气阻力，让粒子速度快速衰减
      p.vx *= 0.95;
      p.vy *= 0.98;
      // 透明度衰减
      p.alpha -= 0.025;

      if (p.alpha <= 0) {
        if (p.el && p.el.parentNode) {
          p.el.parentNode.removeChild(p.el);
        }
        particles.splice(i, 1);
      } else {
        p.el.style.left = p.x + 'px';
        p.el.style.top = p.y + 'px';
        p.el.style.opacity = p.alpha;
      }
    }
    animationId = requestAnimationFrame(animateParticles);
  }

  // 初始化
  function init() {
    injectCursorStyle();
    document.addEventListener('mousemove', handleMouseMove);
    animateParticles();
  }

  // 页面加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 监听 Pjax 页面切换
  document.addEventListener('pjax:complete', function () {
    setTimeout(function() {
      injectCursorStyle();
      document.removeEventListener('mousemove', handleMouseMove);
      document.addEventListener('mousemove', handleMouseMove);
    }, 100);
  });

  window.addEventListener('load', function () {
    if (typeof window.$ !== undefined && window.$.support.pjax) {
      $(document).on('pjax:success', function () {
        setTimeout(function() {
          injectCursorStyle();
          document.removeEventListener('mousemove', handleMouseMove);
          document.addEventListener('mousemove', handleMouseMove);
        }, 100);
      });
    }
  });

  // 监控样式是否被清除，以及新元素添加
  const observer = new MutationObserver(function (mutations) {
    for (let mutation of mutations) {
      if (mutation.type === 'childList') {
        // 检查样式是否被清除
        if (styleEl && !document.head.contains(styleEl)) {
          injectCursorStyle();
        }
        // 检查是否有新元素被添加到 body
        if (mutation.target === document.body) {
          // 只处理新增的节点，避免性能问题
          mutation.addedNodes.forEach(function(node) {
            if (node.nodeType === 1 && node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE') {
              // 跳过 input/textarea/select
              if (node.tagName !== 'INPUT' && node.tagName !== 'TEXTAREA' && node.tagName !== 'SELECT') {
                node.style.setProperty('cursor', 'url("/img/magic-wand.svg") 8 8, auto', 'important');
              }
              // 处理子元素
              const children = node.querySelectorAll ? node.querySelectorAll('*') : [];
              children.forEach(function(child) {
                if (child.tagName !== 'INPUT' && child.tagName !== 'TEXTAREA' && child.tagName !== 'SELECT') {
                  child.style.setProperty('cursor', 'url("/img/magic-wand.svg") 8 8, auto', 'important');
                }
              });
            }
          });
        }
      }
    }
  });
  observer.observe(document.head, { childList: true });
  observer.observe(document.body, { childList: true });

})();
