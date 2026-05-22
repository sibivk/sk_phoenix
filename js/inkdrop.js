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

  // ── Precise visual measurement of KAITHARATH ─────────────────────────
  //
  // Problem 1 (desktop): .hero-name-line is display:block with line-height:0.88.
  // getBoundingClientRect().bottom includes Bebas Neue's descender metric gap
  // (~20% of em), placing the "floor" ~80-100px below the actual letter bottoms.
  // Fix: insert a zero-height inline-block with vertical-align:baseline — its
  // bottom edge lands exactly on the text baseline (= visual bottom of all-caps).
  //
  // Problem 2 (mobile): the block element's right edge is the full container
  // width, not the glyph edge. Fix: use Range.getBoundingClientRect() which
  // returns the actual ink-column bounding box of the text.

  // 1. Locate baseline (visual bottom of KAITHARATH letters)
  const blMark = document.createElement('span');
  blMark.style.cssText = 'display:inline-block;width:0;height:0;overflow:hidden;vertical-align:baseline;';
  kLine.appendChild(blMark);
  const baselineY = blMark.getBoundingClientRect().bottom;
  kLine.removeChild(blMark);

  // 2. Locate visual right edge of "H" (text width, not block width)
  const range = document.createRange();
  range.selectNodeContents(kLine);
  const textRect = range.getBoundingClientRect();

  const floorY  = baselineY        - heroRect.top;
  const targetX = textRect.right   - heroRect.left + 8;  // 8px gap after the H

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
  const T_HOLD   = 2200;      // ms to hold as period
  const T_FADE   = 900;       // ms to fade out

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
      const totalAnim = T_SHRINK + T_HOLD + T_FADE;

      if (settleTimer >= totalAnim) {
        cvs.remove();
        return;
      }

      if (settleTimer < T_SHRINK) {
        // Shrink ball radius down to period size, drop to sit on floor
        const p     = easeInOut(settleTimer / T_SHRINK);
        const r     = BALL_R   + (PERIOD_R   - BALL_R)            * p;
        const yBase = floorY - BALL_R;
        const yEnd  = floorY - PERIOD_R;
        const y     = yBase + (yEnd - yBase) * p;
        drawBall(posX, y, r, 0, 1);

      } else if (settleTimer < T_SHRINK + T_HOLD) {
        // Hold as period
        drawBall(posX, floorY - PERIOD_R, PERIOD_R, 0, 1);

      } else {
        // Fade out
        const fp    = (settleTimer - T_SHRINK - T_HOLD) / T_FADE;
        const alpha = 1 - easeIn(fp);
        drawBall(posX, floorY - PERIOD_R, PERIOD_R, 0, alpha);
      }

      requestAnimationFrame(frame);
    }
  }

  requestAnimationFrame(frame);
}
