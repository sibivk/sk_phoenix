// Ink Drop Animation
// A droplet falls, impacts the hero name, scatters into chaos,
// then snaps into a perfect grid — chaos resolved into structure.

function runInkDrop() {
  const hero     = document.getElementById('hero');
  const heroName = document.querySelector('.hero-name');
  if (!hero || !heroName) return;

  // Canvas setup (DPR-aware for crisp rendering)
  const dpr    = Math.min(window.devicePixelRatio || 1, 2);
  const W      = hero.offsetWidth;
  const H      = hero.offsetHeight;
  const canvas = document.createElement('canvas');
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:10;';
  hero.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  // Impact point — left-centre of the hero name
  const heroRect = hero.getBoundingClientRect();
  const nameRect = heroName.getBoundingClientRect();
  const impactX  = nameRect.left - heroRect.left + nameRect.width  * 0.30;
  const impactY  = nameRect.top  - heroRect.top  + nameRect.height * 0.55;

  // Grid of squares that will form over the name bounding box
  const CELL = 6, GAP = 2, STEP = CELL + GAP;
  const gx0  = nameRect.left - heroRect.left - STEP;
  const gy0  = nameRect.top  - heroRect.top  - STEP;
  const gw   = nameRect.width  + STEP * 2;
  const gh   = nameRect.height + STEP * 2;

  const squares = [];
  for (let x = gx0; x < gx0 + gw; x += STEP) {
    for (let y = gy0; y < gy0 + gh; y += STEP) {
      const angle = Math.atan2(y - impactY, x - impactX) + (Math.random() - 0.5) * 0.8;
      const dist  = 70 + Math.random() * 160;
      squares.push({
        gx: x, gy: y,                                  // final grid position
        sx: impactX + Math.cos(angle) * dist,           // scatter position
        sy: impactY + Math.sin(angle) * dist,
      });
    }
  }

  // Timing (ms)
  const T_DROP_HIT    =  880;   // drop reaches name
  const T_SCATTER_END = 1600;   // squares fully scattered
  const T_GRID_END    = 2700;   // squares locked to grid
  const T_HOLD_END    = 3500;   // hold complete
  const T_FADE_END    = 4800;   // fully faded

  // Easing helpers
  const eIn    = t => t * t * t;
  const eOut   = t => 1 - Math.pow(1 - t, 3);
  const eInOut = t => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;
  const lerp   = (a, b, t) => a + (b - a) * t;
  const clamp  = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const tr     = (ms, s, e) => clamp((ms - s) / (e - s), 0, 1);

  let t0 = null;

  function frame(ts) {
    if (!t0) t0 = ts;
    const ms = ts - t0;
    ctx.clearRect(0, 0, W, H);

    // Global fade-out in final phase
    ctx.globalAlpha = ms > T_HOLD_END
      ? 1 - eIn(tr(ms, T_HOLD_END, T_FADE_END))
      : 1;

    // ── Phase 1: drop falling ──────────────────────────────────────────
    if (ms < T_DROP_HIT) {
      const p  = eIn(tr(ms, 0, T_DROP_HIT));
      const dy = lerp(-20, impactY, p);
      const tailLen = Math.max(0, 45 * p);

      // Teardrop tail
      if (tailLen > 2) {
        const grad = ctx.createLinearGradient(impactX, dy - tailLen, impactX, dy);
        grad.addColorStop(0, 'rgba(255,255,255,0)');
        grad.addColorStop(1, 'rgba(255,255,255,0.7)');
        ctx.beginPath();
        ctx.moveTo(impactX - 3.5, dy - tailLen);
        ctx.quadraticCurveTo(impactX - 5, dy - tailLen * 0.4, impactX - 6, dy);
        ctx.lineTo(impactX + 6, dy);
        ctx.quadraticCurveTo(impactX + 5, dy - tailLen * 0.4, impactX + 3.5, dy - tailLen);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // Drop sphere
      ctx.beginPath();
      ctx.arc(impactX, dy, 10, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.fill();

    // ── Phase 2: impact ripple + scatter outward ───────────────────────
    } else if (ms < T_SCATTER_END) {
      // Expanding ripple rings
      const rp = tr(ms, T_DROP_HIT, T_DROP_HIT + 380);
      if (rp < 1) {
        [1, 0.55].forEach((scale, i) => {
          const rr = rp * 90 * scale;
          const ra = (1 - rp) * (i === 0 ? 0.55 : 0.25);
          ctx.beginPath();
          ctx.arc(impactX, impactY, rr, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255,255,255,${ra})`;
          ctx.lineWidth = i === 0 ? 2 : 1;
          ctx.stroke();
        });
      }

      // Scatter squares
      const sp = eOut(tr(ms, T_DROP_HIT, T_SCATTER_END));
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      squares.forEach(sq => {
        ctx.fillRect(
          lerp(impactX, sq.sx, sp) - CELL / 2,
          lerp(impactY, sq.sy, sp) - CELL / 2,
          CELL, CELL
        );
      });

    // ── Phase 3: snap to perfect grid ─────────────────────────────────
    } else if (ms < T_GRID_END) {
      const gp = eInOut(tr(ms, T_SCATTER_END, T_GRID_END));
      squares.forEach(sq => {
        const progress = Math.min(1, gp + (Math.random() < 0.01 ? 0 : 0)); // uniform snap
        const alpha = lerp(0.55, 0.72, gp);
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fillRect(lerp(sq.sx, sq.gx, gp), lerp(sq.sy, sq.gy, gp), CELL, CELL);
      });

    // ── Phase 4: hold — perfect grid over the name ────────────────────
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.72)';
      squares.forEach(sq => ctx.fillRect(sq.gx, sq.gy, CELL, CELL));
    }

    if (ms < T_FADE_END) {
      requestAnimationFrame(frame);
    } else {
      canvas.remove();
    }
  }

  requestAnimationFrame(frame);
}
