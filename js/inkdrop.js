// Ink Ball Animation
// A ball drops with gravity, bounces on the KAITHARATH baseline with
// decreasing energy, and settles as a period dot at the end of the word.

function runInkDrop() {
  const hero = document.getElementById('hero');
  if (!hero) return;

  // Target the KAITHARATH line (second .hero-name-line)
  const lines = hero.querySelectorAll('.hero-name-line');
  const kLine = lines[lines.length - 1];
  if (!kLine) return;

  const heroRect = hero.getBoundingClientRect();

  // Baseline marker: zero-height inline-block aligns to text baseline
  const blMark = document.createElement('span');
  blMark.style.cssText = 'display:inline-block;width:0;height:0;overflow:hidden;vertical-align:baseline;';
  kLine.appendChild(blMark);
  const baselineY = blMark.getBoundingClientRect().bottom;
  kLine.removeChild(blMark);

  // Range gives visual text width, not the full block-element width
  const range = document.createRange();
  range.selectNodeContents(kLine);
  const textRect = range.getBoundingClientRect();

  const floorY  = baselineY      - heroRect.top;
  const targetX = textRect.right - heroRect.left + 8;

  // Canvas
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W   = hero.offsetWidth;
  const H   = hero.offsetHeight;
  const cvs = document.createElement('canvas');
  cvs.width  = W * dpr;
  cvs.height = H * dpr;
  cvs.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:10;';
  hero.appendChild(cvs);
  const ctx = cvs.getContext('2d');
  ctx.scale(dpr, dpr);

  // ── Physics constants ────────────────────────────────────────────────
  const GRAVITY     = 1500;   // px/s²
  const RESTITUTION = 0.58;   // energy kept per bounce
  const BALL_R      = 13;     // ball radius while bouncing
  const PERIOD_R    = 7;      // final period radius
  const SETTLE_VEL  = 55;     // px/s — bounce velocity below this = settle

  // ── Ball state ───────────────────────────────────────────────────────
  let posX   = targetX;
  let posY   = -BALL_R;       // start above canvas
  let velY   = 0;
  let squish = 0;             // +1 = squashed, decays to 0

  let settled     = false;
  let settleTimer = 0;        // ms elapsed since settling

  // ── Timing after settle ──────────────────────────────────────────────
  const T_SHRINK = 500;       // ms to shrink ball → period

  // ── Helpers ──────────────────────────────────────────────────────────
  function easeOut(t)   { return 1 - Math.pow(1 - t, 3); }
  function easeInOut(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2; }
  function easeIn(t)    { return t * t * t; }
  function clamp(v,a,b) { return Math.max(a, Math.min(b, v)); }

  function drawBall(x, y, r, sq, alpha) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = clamp(alpha, 0, 1);
    ctx.translate(x, y);
    // squish: wider + shorter on impact
    ctx.scale(1 + sq * 0.45, 1 - sq * 0.30);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fill();
    ctx.restore();
  }

  let prevTs = null;

  function frame(ts) {
    if (!prevTs) prevTs = ts;
    const dt = clamp((ts - prevTs) / 1000, 0, 0.05);  // seconds, capped
    prevTs = ts;

    ctx.clearRect(0, 0, W, H);

    if (!settled) {
      // ── Gravity & bounce ───────────────────────────────────────────
      velY  += GRAVITY * dt;
      posY  += velY   * dt;
      squish = squish * Math.exp(-dt * 14);   // squish decays quickly

      const contact = floorY - BALL_R;

      if (posY >= contact) {
        posY   = contact;
        const speed = Math.abs(velY);
        velY   = -speed * RESTITUTION;
        squish = clamp(speed / 900, 0.1, 0.9);

        if (speed < SETTLE_VEL) {
          settled = true;
          posY    = contact;
          velY    = 0;
          squish  = 0;
        }
      }

      drawBall(posX, posY, BALL_R, squish, 1);
      requestAnimationFrame(frame);

    } else {
      // ── Settle → period ────────────────────────────────────────────
      settleTimer += dt * 1000;

      if (settleTimer < T_SHRINK) {
        // Shrink ball radius down to period size, drop to sit on floor
        const p     = easeInOut(settleTimer / T_SHRINK);
        const r     = BALL_R + (PERIOD_R - BALL_R) * p;
        const yBase = floorY - BALL_R;
        const yEnd  = floorY - PERIOD_R;
        const y     = yBase + (yEnd - yBase) * p;
        drawBall(posX, y, r, 0, 1);
        requestAnimationFrame(frame);

      } else {
        // Period is fully formed — draw it once and stop the loop permanently
        drawBall(posX, floorY - PERIOD_R, PERIOD_R, 0, 1);
        // Cascade the halo glow on S, V, K — CSS handles the animation
        document.querySelectorAll('.glow-letter').forEach(el => el.classList.add('glow-active'));
        // No further requestAnimationFrame — canvas stays with the period dot
      }
    }
  }

  requestAnimationFrame(frame);
}
