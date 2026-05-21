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
  cursorDot.style.left = mouseX + 'px';
  cursorDot.style.top  = mouseY + 'px';
});

// Smooth cursor follow
(function animateCursor() {
  cursorX += (mouseX - cursorX) * 0.12;
  cursorY += (mouseY - cursorY) * 0.12;
  cursor.style.left = cursorX + 'px';
  cursor.style.top  = cursorY + 'px';
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
const audio   = document.getElementById('bgAudio');
const musicBtn = document.getElementById('musicBtn');
const iconPlay  = musicBtn.querySelector('.music-icon-play');
const iconPause = musicBtn.querySelector('.music-icon-pause');

audio.volume = 0.4;

function setPlaying(playing) {
  iconPlay.style.display  = playing ? 'none'  : '';
  iconPause.style.display = playing ? ''      : 'none';
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

// Splash screen — dismisses on Enter click and starts audio
const splash = document.getElementById('splash');
const splashEnter = document.getElementById('splashEnter');

splashEnter.addEventListener('click', () => {
  audio.play().then(() => setPlaying(true)).catch(() => {});
  splash.classList.add('hidden');
  setTimeout(() => splash.remove(), 1000);
});

// Subtle parallax on hero image
const heroImg = document.getElementById('heroImg');
if (heroImg) {
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y < window.innerHeight) {
      heroImg.style.transform = `scale(1) translateY(${y * 0.12}px)`;
    }
  }, { passive: true });
}
