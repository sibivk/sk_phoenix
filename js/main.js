// Scroll progress bar — uses transform:scaleX (GPU composited) instead of width (paint)
const progressBar = document.createElement('div');
progressBar.className = 'progress-bar';
document.body.prepend(progressBar);

// Nav background on scroll
const nav = document.getElementById('nav');

// Cache total scroll height — constant during scroll, only changes on resize.
// Reading document.body.scrollHeight on every scroll event forces a layout flush.
let scrollTotal = Math.max(document.body.scrollHeight - window.innerHeight, 1);
window.addEventListener('resize', () => {
  scrollTotal = Math.max(document.body.scrollHeight - window.innerHeight, 1);
}, { passive: true });

// One rAF-gated handler for both progress bar and nav — replaces two
// separate unthrottled listeners that previously fired on every scroll event
let scrollPending = false;
function onScroll() {
  if (scrollPending) return;
  scrollPending = true;
  requestAnimationFrame(() => {
    const y = window.scrollY;
    progressBar.style.transform = `scaleX(${y / scrollTotal})`;
    nav.classList.toggle('scrolled', y > 60);
    scrollPending = false;
  });
}
window.addEventListener('scroll', onScroll, { passive: true });

// Custom cursor
const cursor = document.getElementById('cursor');
const cursorDot = document.getElementById('cursorDot');
let mouseX = 0, mouseY = 0;
let cursorX = 0, cursorY = 0;

// mousemove only stores coordinates — no DOM write here.
// Previously cursorDot.style.transform was written on every mousemove event
// (up to 1000 Hz on high-precision devices). Moving it to the rAF loop caps
// DOM writes at 60fps which is all the display can show anyway.
document.addEventListener('mousemove', e => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

// Single rAF loop drives both cursor elements.
// Dot: instant snap (zero lag). Ring: smooth lag via exponential lerp.
// Both only write to DOM when position actually changed.
let prevCursorX = 0, prevCursorY = 0;
let prevDotX = -1, prevDotY = -1;
(function animateCursor() {
  // Instant cursor dot — write only when mouse moved
  if (mouseX !== prevDotX || mouseY !== prevDotY) {
    cursorDot.style.transform = `translate(calc(${mouseX}px - 50%), calc(${mouseY}px - 50%))`;
    prevDotX = mouseX;
    prevDotY = mouseY;
  }
  // Lagged cursor ring — write only when position meaningfully changed
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
        heroImg.style.transform = `translateY(${y * 0.12}px)`;
      }
      parallaxPending = false;
    });
  }, { passive: true });
}

// Pause glow animations when sections scroll out of view — prevents
// off-screen GPU work that causes intermittent stutter.
// threshold:0.05 — section must be 5 % visible before animations activate.
// At threshold:0 a section 1 px into the viewport would start all its filter
// animations, causing rapid on/off cycling during smooth-scroll navigation.
const glowObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    entry.target.classList.toggle('glow-paused', !entry.isIntersecting);
  });
}, { threshold: 0.05 });

[
  document.getElementById('hero'),
  document.querySelector('.section-capabilities'),
  document.querySelector('.section-focus'),
  document.querySelector('.section-philosophy'),
  document.querySelector('.section-incarnations'),
].filter(Boolean).forEach(el => glowObserver.observe(el));

// Nav-click animation freeze — pause all glow animations for 2 s after any
// nav link click.  When scroll-behavior:smooth scrolls through multiple
// sections rapidly, glow animations toggle on/off at every boundary crossing.
// CPU filter-paint cycling + GPU layer churn from 12-18 simultaneous filter
// animations leaves a ~20 s main-thread backlog once scrolling stops.
// Freezing for 2 s (long enough to cover the full smooth-scroll journey)
// eliminates that churn entirely.
let _navScrollTimer = null;
document.querySelectorAll('.nav-links a, .footer-nav a').forEach(link => {
  link.addEventListener('click', () => {
    document.body.classList.add('nav-scrolling');
    clearTimeout(_navScrollTimer);
    _navScrollTimer = setTimeout(() => {
      document.body.classList.remove('nav-scrolling');
    }, 2000);
  });
});

// GPU power-state ping — fires once per second to keep the GPU driver
// from entering deep DVFS power-save (which causes 5-8 s wake-up lag).
// A 60fps keepalive element caused thermal throttling after ~2 min; a
// 1fps ping prevents deep sleep without building sustained heat.
// Writes a sub-pixel (0.0002 px) alternating offset — genuinely different
// each call so the browser doesn't optimise the write away.
// Skipped when the tab is hidden so there is zero background drain.
let _gpuPingTick = 0;
setInterval(() => {
  if (document.hidden) return;
  _gpuPingTick ^= 1;
  const micro = _gpuPingTick * 0.0002; // 0 or 0.0002 px — physically undetectable
  cursorDot.style.transform =
    `translate(calc(${mouseX + micro}px - 50%), calc(${mouseY}px - 50%))`;
}, 1000);

// ── Incarnations card expand / collapse ──────────────────────────────────────
// Opening sequence (desktop):
//   1. Dormant cards flip out (rotateY + opacity, ~420 ms).
//   2. Dormant cards go display:none.  Active card is pinned at its current
//      visual width (inline width:Npx) and position (translateX:Npx) measured
//      BEFORE the layout change, so it appears at its original grid slot.
//   3. ic-active → grid-column:1/-1.  The inline width:Npx prevents the card
//      from instantly stretching to full-row width.
//   4. Double-rAF: remove both inline overrides simultaneously.
//      • transform transitions translateX(Npx) → translateX(0%) — card slides left.
//      • width   transitions startW px → gridW px  — card grows to full width.
//      Both run concurrently; the heading text reflows naturally as the card
//      widens (GOD MODE goes from stacked lines to a single line mid-animation).
//   5. After transitions land (~510 ms after step 4): clear inline width,
//      add ic-reveal — image + meta fade in.
//
// Closing: image/meta fade out, then all cards fade+flip back in together.
(function initIncarnations() {
  const cards = Array.from(document.querySelectorAll('.incarnation-card'));
  if (!cards.length) return;

  const grid = document.querySelector('.incarnations-grid');

  let active = null;
  let t1 = null, t2 = null;

  function expand(card) {
    if (active) return;
    active = card;
    const idx = cards.indexOf(card);

    // Measure BEFORE any DOM changes — dormant flip doesn't affect layout
    // (it's a CSS transform, not display:none yet) so these values are accurate.
    const cardRect = card.getBoundingClientRect();
    const gridRect = grid ? grid.getBoundingClientRect() : cardRect;
    const startLeft = cardRect.left - gridRect.left; // px from grid's left edge
    const startW    = cardRect.width;                // ~1/3 grid width
    const gridW     = gridRect.width;                // full grid width

    // Step 1: flip dormant cards out
    cards.forEach((c, i) => { if (i !== idx) c.classList.add('ic-dormant'); });

    t1 = setTimeout(() => {
      // Hide dormant from layout (visually already gone)
      cards.forEach(c => { if (c !== card) c.style.display = 'none'; });

      // Pin active card at its original visual position and width.
      // After display:none the card auto-places to column 1 (left=0),
      // so startLeft offset is needed to restore the visual origin.
      card.style.width     = `${startW}px`;
      card.style.transform = `translateX(${startLeft}px)`;

      // Apply expanded layout — grid-column:1/-1 + flex-direction:row.
      // The inline width above prevents it from snapping to full-row width.
      card.classList.add('ic-active');

      // Double-rAF: browser commits the pinned state, then we release both
      // overrides so their CSS transitions fire simultaneously.
      requestAnimationFrame(() => requestAnimationFrame(() => {
        card.style.transform = '';            // → CSS .ic-active: translateX(0%)
        card.style.width     = `${gridW}px`; // → animates startW → gridW
        // Text (e.g. "GOD MODE") reflows from stacked to inline as width grows.
      }));

      // After both transitions have landed, clean up and reveal image + meta
      t2 = setTimeout(() => {
        card.style.width = '';            // remove inline — natural full width
        card.classList.add('ic-reveal');
      }, 510);
    }, 420);
  }

  function collapse() {
    if (!active) return;
    const card = active;
    clearTimeout(t1);
    clearTimeout(t2);

    // Fade out expanded content; clear any lingering inline width immediately
    card.classList.remove('ic-reveal');
    card.style.width = '';

    t1 = setTimeout(() => {
      // Fade all cards out together so the layout reset is seamless
      cards.forEach(c => c.classList.add('ic-dormant'));
      card.classList.remove('ic-active');
      cards.forEach(c => { c.style.display = ''; });

      requestAnimationFrame(() => requestAnimationFrame(() => {
        cards.forEach(c => c.classList.remove('ic-dormant'));
        active = null;
      }));
    }, 380);
  }

  // Desktop: full slide + width animation.  Mobile (≤768 px): simple accordion.
  cards.forEach(card => {
    card.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        if (card === active) {
          card.classList.remove('ic-active', 'ic-reveal');
          active = null;
        } else {
          if (active) { active.classList.remove('ic-active', 'ic-reveal'); }
          active = card;
          card.classList.add('ic-active');
          requestAnimationFrame(() => card.classList.add('ic-reveal'));
        }
        return;
      }
      if (card === active) collapse();
      else if (!active) expand(card);
    });
  });
})();
