// 文章阅读进度条
(function () {
  // 只在文章详情页显示
  const postContent = document.querySelector('.post-content');
  if (!postContent) return;

  // 创建进度条容器
  const progressContainer = document.createElement('div');
  progressContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 4px;
    background: rgba(0, 0, 0, 0.05);
    z-index: 99999;
  `;

  // 创建进度条
  const progressBar = document.createElement('div');
  progressBar.style.cssText = `
    height: 100%;
    width: 0%;
    background: linear-gradient(90deg, #00bcd4, #26c6da, #4dd0e1);
    transition: width 0.1s ease-out;
    box-shadow: 0 0 10px rgba(0, 188, 212, 0.5);
  `;

  progressContainer.appendChild(progressBar);
  document.body.appendChild(progressContainer);

  // 更新进度
  function updateProgress() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    progressBar.style.width = progress + '%';
  }

  // 监听滚动
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);
  updateProgress();

  // 阅读完成提示
  const tipDelay = setTimeout(() => {
    if (scrollHeight <= 0) updateProgress();
  }, 500);

})();
