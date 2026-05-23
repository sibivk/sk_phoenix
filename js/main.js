// Scroll progress bar
const progressBar = document.createElement('div');
progressBar.className = 'progress-bar';
document.body.prepend(progressBar);

window.addEventListener('scroll', () => {
  const scrolled = window.scrollY;
  const total = document.body.scrollHeight - window.innerHeight;
  progressBar.style.width = (scrolled / total * 100) + '%';
});

// Nav background on scroll
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

// Custom cursor
const cursor = document.getElementById('cursor');
const cursorDot = document.getElementById('cursorDot');
let mouseX = 0, mouseY = 0;
let cursorX = 0, cursorY = 0;

document.addEventListener('mousemove', e => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  // transform: GPU-composited, no layout reflow (unlike left/top)
  cursorDot.style.transform = `translate(calc(${mouseX}px - 50%), calc(${mouseY}px - 50%))`;
});

// Smooth cursor follow — only write to DOM when position meaningfully changed.
// Without the threshold, floating-point math never fully converges, causing
// a style write every rAF frame even when the cursor hasn't moved.
let prevCursorX = 0, prevCursorY = 0;
(function animateCursor() {
  cursorX += (mouseX - cursorX) * 0.12;
  cursorY += (mouseY - cursorY) * 0.12;
  if (Math.abs(cursorX - prevCursorX) > 0.1 || Math.abs(cursorY - prevCursorY) > 0.1) {
    cursor.style.transform = `translate(calc(${cursorX}px - 50%), calc(${cursorY}px - 50%))`;
    prevCursorX = cursorX;
    prevCursorY = cursorY;
  }
  requestAnimationFrame(animateCursor);
})();

// Scroll reveal via IntersectionObserver
const reveals = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

reveals.forEach(el => observer.observe(el));

// Background music
const audio    = document.getElementById('bgAudio');
const musicBtn = document.getElementById('musicBtn');

audio.volume = 0.4;

function setPlaying(playing) {
  musicBtn.classList.toggle('playing', playing);
}

musicBtn.addEventListener('click', () => {
  if (audio.paused) {
    audio.play().then(() => setPlaying(true)).catch(() => {});
  } else {
    audio.pause();
    setPlaying(false);
  }
});

// Pause music AND all CSS animations when tab loses focus
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    audio.pause();
    document.body.classList.add('tab-hidden');
  } else {
    if (musicBtn.classList.contains('playing')) audio.play().catch(() => {});
    document.body.classList.remove('tab-hidden');
  }
});

// Splash screen — lock scroll while visible, release on Enter
const splash = document.getElementById('splash');
const splashEnter = document.getElementById('splashEnter');

document.body.classList.add('splash-active');

splashEnter.addEventListener('click', () => {
  audio.play().then(() => setPlaying(true)).catch(() => {});
  splash.classList.add('hidden');
  document.body.classList.remove('splash-active');
  window.scrollTo(0, 0);
  setTimeout(() => splash.remove(), 1000);
  // Ink drop fires after hero text has fully animated in
  setTimeout(runInkDrop, 1800);
});

// Mobile: tap to expand/collapse — accordion (only one open at a time)
const allExpandItems = Array.from(document.querySelectorAll('.capability-item, .focus-item'));
let touchMoved = false;

allExpandItems.forEach(item => {
  item.addEventListener('touchstart', () => { touchMoved = false; }, { passive: true });
  item.addEventListener('touchmove',  () => { touchMoved = true;  }, { passive: true });
  item.addEventListener('touchend', () => {
    if (touchMoved) return;
    const isOpen = item.classList.contains('expanded');
    allExpandItems.forEach(i => i.classList.remove('expanded'));
    if (!isOpen) item.classList.add('expanded');
  });
});

// Scroll-driven word illumination on philosophy quote
const quoteWords = document.querySelectorAll('.philosophy-quote .word');

function illuminateWords() {
  if (!quoteWords.length) return;
  const vh = window.innerHeight;

  // Batch ALL reads before ANY writes — prevents layout thrashing.
  // Interleaving getBoundingClientRect() with style writes forces N
  // layout flushes instead of one, costing ~17× more on this quote.
  const data = Array.from(quoteWords).map(word => ({
    word,
    rect: word.getBoundingClientRect(),
  }));

  let allLit = true;
  data.forEach(({ word, rect }) => {
    const center   = rect.top + rect.height * 0.5;
    const progress = Math.max(0, Math.min(1, (vh * 0.88 - center) / (vh * 0.38)));
    const opacity  = 0.12 + progress * 0.88;
    word.style.setProperty('--word-opacity', opacity.toFixed(3));
    word.classList.toggle('word-lit', progress >= 0.98);
    if (progress < 0.98) allLit = false;
  });

  // All words fully lit — nothing left to track; stop the scroll listener
  if (allLit) {
    window.removeEventListener('scroll', scheduleIlluminate);
    window.removeEventListener('resize', scheduleIlluminate);
  }
}

// Throttle illuminateWords to once per animation frame — avoids
// calling getBoundingClientRect() multiple times per scroll event
let illuminatePending = false;
function scheduleIlluminate() {
  if (illuminatePending) return;
  illuminatePending = true;
  requestAnimationFrame(() => { illuminateWords(); illuminatePending = false; });
}

window.addEventListener('scroll', scheduleIlluminate, { passive: true });
window.addEventListener('resize', scheduleIlluminate, { passive: true });
illuminateWords();

// Philosophy word glow — fires once when section enters view
const philoSection = document.querySelector('.section-philosophy');
if (philoSection) {
  new IntersectionObserver((entries, obs) => {
    if (entries[0].isIntersecting) {
      document.querySelectorAll('.glow-word').forEach(el => el.classList.add('glow-active'));
      obs.disconnect();
    }
  }, { threshold: 0.25 }).observe(philoSection);
}

// Subtle parallax on hero image — rAF-gated so it runs at most once per frame
const heroImg = document.getElementById('heroImg');
if (heroImg) {
  let parallaxPending = false;
  window.addEventListener('scroll', () => {
    if (parallaxPending) return;
    parallaxPending = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      if (y < window.innerHeight) {
        heroImg.style.transform = `scale(1) translateY(${y * 0.12}px)`;
      }
      parallaxPending = false;
    });
  }, { passive: true });
}

// Pause glow animations when sections scroll out of view — prevents
// off-screen GPU work that causes intermittent stutter
const glowObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    entry.target.classList.toggle('glow-paused', !entry.isIntersecting);
  });
}, { threshold: 0 });

[
  document.getElementById('hero'),
  document.querySelector('.section-capabilities'),
  document.querySelector('.section-focus'),
  document.querySelector('.section-philosophy'),
].filter(Boolean).forEach(el => glowObserver.observe(el));
