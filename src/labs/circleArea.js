import { setupCanvas, createAnimator } from '../lib/canvas.js';
import { COLORS, TAU, clamp, lerp, easeInOut, text } from '../lib/theme.js';

export function initCircleArea(root) {
  const $ = (name) => root.querySelector(`[data-el="${name}"]`);
  const canvas = $('canvas');
  const nIn = $('n');
  const rIn = $('r');
  const tIn = $('t');
  const playBtn = $('play');
  const out = {
    n: $('n-out'), r: $('r-out'), t: $('t-out'), width: $('r-width'),
    height: $('r-height'), approx: $('r-approx'), exact: $('r-exact'), acc: $('r-acc'),
  };

  const state = { n: 8, r: 4, t: 0, target: 1 };
  const { ctx, size } = setupCanvas(canvas, (w) => (w < 560 ? 1.15 : 2.1), () => draw());

  const anim = createAnimator(canvas, (dt) => {
    const step = dt * 0.45;
    state.t = state.target > state.t ? Math.min(state.target, state.t + step) : Math.max(state.target, state.t - step);
    if (state.t === state.target) setPlaying(false);
    syncT();
    draw();
  });

  function setPlaying(on) {
    if (on) {
      state.target = state.t >= 1 ? 0 : 1;
      anim.start();
    } else {
      anim.stop();
    }
    playBtn.textContent = on ? 'Pause' : state.t >= 1 ? 'Roll it back' : 'Unroll circle';
    playBtn.setAttribute('aria-pressed', String(on));
  }

  function syncT() {
    tIn.value = String(Math.round(state.t * 100));
    out.t.textContent = `${Math.round(state.t * 100)}%`;
  }

  function update() {
    const { n, r } = state;
    const width = n * r * Math.sin(Math.PI / n); // n/2 chords of length 2r·sin(π/n)
    const height = r * Math.cos(Math.PI / n);
    const exact = Math.PI * r * r;
    out.n.textContent = n;
    out.r.textContent = r;
    out.width.textContent = `${width.toFixed(3)}  (πr = ${(Math.PI * r).toFixed(3)})`;
    out.height.textContent = `${height.toFixed(3)}  (r = ${r})`;
    out.approx.textContent = (width * height).toFixed(3);
    out.exact.textContent = exact.toFixed(3);
    out.acc.textContent = `${((width * height) / exact * 100).toFixed(2)}%`;
    draw();
  }

  function draw() {
    const { w, h } = size;
    if (!w) return;
    ctx.clearRect(0, 0, w, h);
    const { n, t } = state;
    const fs = w < 560 ? 12 : 14;

    const Rmax = Math.min((w * 0.84) / (Math.PI + 0.5), h * 0.4);
    const R = Rmax * (state.r / 5);
    const cx = w / 2;
    const cy = h / 2;

    // Rearranged layout: sectors alternate tip-down / tip-up. With height
    // R·cos(Δ/2) and spacing of one chord, neighbouring edges line up exactly.
    const D = TAU / n;
    const half = n / 2;
    const chord = 2 * R * Math.sin(D / 2);
    const H = R * Math.cos(D / 2);
    const W = half * chord + chord / 2;
    const x0 = cx - W / 2 + chord / 2;
    const top = cy - H / 2;
    const bottom = cy + H / 2;

    for (let i = 0; i < n; i++) {
      const alpha = (i + 0.5) * D;
      // Screen y points down, so angles in (π, 2π) face up on screen.
      const up = i >= half;
      const m = up ? i - half : half - 1 - i;
      const tx = up ? x0 + m * chord : x0 + m * chord + chord / 2;
      const ty = up ? bottom : top;
      const beta = up ? 1.5 * Math.PI : 0.5 * Math.PI;

      const delay = (m / half) * 0.35;
      const local = easeInOut(clamp((t - delay) / 0.65));
      const px = lerp(cx, tx, local);
      const py = lerp(cy, ty, local);
      const ang = lerp(alpha, beta, local);

      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.arc(px, py, R, ang - D / 2, ang + D / 2);
      ctx.closePath();
      ctx.fillStyle = up ? COLORS.yellow : '#3a3a3a';
      ctx.fill();
      ctx.strokeStyle = up ? COLORS.black : COLORS.yellow;
      ctx.lineWidth = n > 32 ? 0.75 : 1.5;
      ctx.stroke();
    }

    // Labels for the circle (fade out) and the "rectangle" (fade in).
    const startAlpha = clamp(1 - t * 5);
    if (startAlpha > 0) {
      ctx.globalAlpha = startAlpha;
      ctx.strokeStyle = COLORS.white;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + R, cy); ctx.stroke();
      ctx.globalAlpha = 1;
      text(ctx, 'r', cx + R / 2, cy - 10, { color: COLORS.white, size: fs + 2, weight: 700, alpha: startAlpha });
      text(ctx, 'Circumference = 2πr', cx, cy + R + 22, { color: COLORS.muted, size: fs, alpha: startAlpha });
    }

    const endAlpha = clamp((t - 0.85) / 0.15);
    if (endAlpha > 0) {
      ctx.globalAlpha = endAlpha;
      ctx.strokeStyle = COLORS.white;
      ctx.fillStyle = COLORS.white;
      ctx.lineWidth = 1.5;
      const yb = top + R + 16;
      dimension(ctx, x0, yb, x0 + half * chord, yb);
      const xl = x0 - chord / 2 - 14;
      dimension(ctx, xl, top, xl, bottom);
      ctx.globalAlpha = 1;
      text(ctx, '≈ πr  (half the circumference)', cx, yb + 16, { color: COLORS.white, size: fs, weight: 600, alpha: endAlpha });
      text(ctx, '≈ r', xl - 8, cy, { color: COLORS.white, size: fs, weight: 600, align: 'right', alpha: endAlpha });
    }
  }

  function dimension(c, xa, ya, xb, yb) {
    const ang = Math.atan2(yb - ya, xb - xa);
    c.beginPath(); c.moveTo(xa, ya); c.lineTo(xb, yb); c.stroke();
    for (const [x, y, dir] of [[xa, ya, ang + Math.PI], [xb, yb, ang]]) {
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x - 7 * Math.cos(dir - 0.4), y - 7 * Math.sin(dir - 0.4));
      c.lineTo(x - 7 * Math.cos(dir + 0.4), y - 7 * Math.sin(dir + 0.4));
      c.closePath();
      c.fill();
    }
  }

  nIn.addEventListener('input', () => { state.n = Number(nIn.value); update(); });
  rIn.addEventListener('input', () => { state.r = Number(rIn.value); update(); });
  tIn.addEventListener('input', () => {
    state.t = Number(tIn.value) / 100;
    out.t.textContent = `${tIn.value}%`;
    setPlaying(false);
    draw();
  });
  playBtn.addEventListener('click', () => setPlaying(!anim.running));

  update();
}
