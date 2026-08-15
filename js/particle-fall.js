/**
 * 鼠标移动随机颜色粒子掉落效果
 * 性能优化：requestAnimationFrame + 节流 + 粒子上限 + Canvas
 */
(function () {
  // 避免重复初始化（pjax 切换页面时可能再次执行）
  if (window.__particleFallInit) return;
  window.__particleFallInit = true;

  var canvas = document.createElement('canvas');
  canvas.id = 'particle-fall-canvas';
  canvas.style.cssText =
    'position:fixed;top:0;left:0;width:100%;height:100%;' +
    'pointer-events:none;z-index:9998;will-change:transform;';
  document.body.appendChild(canvas);

  var ctx = canvas.getContext('2d');
  var dpr = window.devicePixelRatio || 1;

  function resize() {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  // 粒子池
  var particles = [];
  var MAX_PARTICLES = 50; // 粒子上限，防止性能下降

  // 随机鲜艳颜色（HSL）
  function randomColor() {
    var h = Math.floor(Math.random() * 360);
    var s = 75 + Math.floor(Math.random() * 25);
    var l = 55 + Math.floor(Math.random() * 15);
    return 'hsl(' + h + ',' + s + '%,' + l + '%)';
  }

  // 鼠标移动节流（约 30fps 生成频率）
  var lastTime = 0;
  var throttle = 30;

  function onMouseMove(e) {
    var now = Date.now();
    if (now - lastTime < throttle) return;
    lastTime = now;

    // 每次生成 1 个粒子
    var count = 1;
    for (var i = 0; i < count && particles.length < MAX_PARTICLES; i++) {
      particles.push({
        x: e.clientX + (Math.random() - 0.5) * 8,
        y: e.clientY + (Math.random() - 0.5) * 8,
        vx: (Math.random() - 0.5) * 2.5,
        vy: -Math.random() * 1.5 - 0.5, // 初始略向上
        size: 0.8 + Math.random() * 2,
        color: randomColor(),
        life: 1,
        decay: 0.008 + Math.random() * 0.015
      });
    }
  }

  document.addEventListener('mousemove', onMouseMove, { passive: true });

  // 触摸设备支持
  document.addEventListener('touchmove', function (e) {
    if (e.touches.length > 0) {
      onMouseMove({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
    }
  }, { passive: true });

  // 动画循环
  function animate() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];

      // 物理更新：重力 + 空气阻力
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12; // 重力加速度
      p.vx *= 0.99;
      p.life -= p.decay;

      // 移除过期或出界粒子
      if (p.life <= 0 || p.y > window.innerHeight + 20) {
        particles.splice(i, 1);
        continue;
      }

      // 绘制粒子（带发光效果）
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.shadowBlur = 8;
      ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    requestAnimationFrame(animate);
  }

  animate();

  // pjax 兼容：页面切换后确保 canvas 仍在
  document.addEventListener('pjax:complete', function () {
    if (!document.getElementById('particle-fall-canvas')) {
      document.body.appendChild(canvas);
    }
  });
})();
