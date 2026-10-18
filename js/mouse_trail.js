// 鼠标蓝色拖尾线条特效
// 配置项从 window.MOUSE_TRAIL_CONFIG 读取（见 after-footer.ejs）
// 性能优化：仅在有拖尾时运行 requestAnimationFrame，鼠标静止后自动停止
(() => {
  const cfg = window.MOUSE_TRAIL_CONFIG || {};
  if (cfg.enable === false) return;
  // 移动端/触摸设备关闭
  if (cfg.disable_on_mobile && window.matchMedia('(max-width: 768px)').matches) return;
  // 用户系统设置了减少动态效果时关闭
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const MAX_POINTS = Math.min(Math.max(parseInt(cfg.length, 10) || 12, 4), 40);
  const LIFETIME = parseInt(cfg.lifetime, 10) || 400;
  const BASE_WIDTH = parseFloat(cfg.width) || 2.5;
  const COLOR = cfg.color || '#4d9fff';
  const Z_INDEX = parseInt(cfg.z_index, 10) || 9999;

  // 复用/清理旧画布（pjax 切换页面时脚本会重新执行）
  const OLD_ID = 'mouse-trail-canvas';
  const prev = document.getElementById(OLD_ID);
  if (prev) prev.remove();

  const canvas = document.createElement('canvas');
  canvas.id = OLD_ID;
  canvas.style.cssText =
    'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:' +
    Z_INDEX + ';';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  const resize = () => {
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  window.addEventListener('resize', resize);
  resize();

  // 把配置色解析成 r,g,b（支持 #hex、rgb() 等任意 CSS 颜色）
  const getRgb = (() => {
    try {
      const el = document.createElement('div');
      el.style.color = COLOR;
      el.style.display = 'none';
      document.body.appendChild(el);
      const m = getComputedStyle(el).color.match(/\d+/g);
      el.remove();
      if (m) return { r: +m[0], g: +m[1], b: +m[2] };
    } catch (e) {}
    return { r: 77, g: 159, b: 255 };
  })();

  const rgb = getRgb;
  let points = [];
  let rafId = null;
  let lastPush = 0;

  const clear = () => ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  const onMove = (e) => {
    const now = performance.now();
    // 限频：两次记录至少间隔 10ms，避免静止时刷屏
    if (now - lastPush < 10) return;
    const last = points[points.length - 1];
    if (last) {
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      if (dx * dx + dy * dy < 4) return; // 与上一点距离不足 2px 时不记录
    }
    lastPush = now;
    points.push({ x: e.clientX, y: e.clientY, t: now });
    if (points.length > MAX_POINTS) points.splice(0, points.length - MAX_POINTS);
    if (!rafId) rafId = requestAnimationFrame(step);
  };

  const step = () => {
    rafId = null;
    const now = performance.now();
    points = points.filter((p) => now - p.t < LIFETIME);
    clear();

    if (points.length >= 2) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      // 从尾部(旧)到头部(新)逐段绘制，透明度与线宽按所在位置渐变
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1];
        const b = points[i];
        const f = 1 - (now - (a.t + b.t) / 2) / LIFETIME;
        if (f <= 0) continue;
        const alpha = Math.min(f, 1) * 0.85;
        ctx.strokeStyle = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + alpha.toFixed(3) + ')';
        ctx.lineWidth = Math.max(BASE_WIDTH * f, 0.2);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    if (points.length) {
      rafId = requestAnimationFrame(step);
    } else {
      clear(); // 拖尾完全消失后停止动画，节省 GPU
    }
  };

  window.addEventListener('mousemove', onMove, { passive: true });
})();
