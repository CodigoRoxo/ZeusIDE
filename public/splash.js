// Preloader splash: rotating phrases + progress bar until React calls hideZeusSplash()
(function() {
  try {
    const savedTheme = localStorage.getItem('zeus_theme');
    if (savedTheme === 'light') {
      document.getElementById('zeus-splash')?.classList.add('splash-light');
    }
  } catch (e) {}

  const phrases = [
    'Carregando módulos...',
    'Enchendo capacitores...',
    'Canalizando energia...',
    'Sintonizando frequências...',
    'Iniciando Zeus IDE...'
  ];

  let currentIdx = 0;
  const phraseEl = document.getElementById('splash-phrase');
  const barEl = document.getElementById('splash-bar');
  let isAppReady = false;
  const startTime = Date.now();

  function setProgress(idx) {
    if (!phraseEl || !barEl) return;
    phraseEl.classList.add('phrase-changing');
    setTimeout(() => {
      phraseEl.textContent = phrases[idx];
      phraseEl.classList.remove('phrase-changing');
    }, 120);
    const pct = Math.min(Math.round(((idx + 1) / phrases.length) * 100), 100);
    barEl.style.width = pct + '%';
  }

  setProgress(0);

  const interval = setInterval(() => {
    currentIdx++;
    if (currentIdx < phrases.length) {
      setProgress(currentIdx);
    } else {
      clearInterval(interval);
      if (isAppReady) {
        finishSplash();
      }
    }
  }, 360);

  function finishSplash() {
    const splash = document.getElementById('zeus-splash');
    if (!splash) return;
    if (barEl) barEl.style.width = '100%';
    setTimeout(() => {
      splash.style.opacity = '0';
      setTimeout(() => splash.remove(), 350);
    }, 120);
  }

  window.hideZeusSplash = function() {
    isAppReady = true;
    const elapsed = Date.now() - startTime;
    const minDisplay = 1200;
    const remaining = Math.max(minDisplay - elapsed, 0);
    setTimeout(() => {
      if (currentIdx >= phrases.length - 1) {
        finishSplash();
      }
    }, remaining);
  };
})();
