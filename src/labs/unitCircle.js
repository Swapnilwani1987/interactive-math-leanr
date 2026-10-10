import { setupCanvas, createAnimator, pointerPos } from '../lib/canvas.js';
import { COLORS, TAU, clamp, text } from '../lib/theme.js';

const DEG = Math.PI / 180;
const gcd = (a, b) => (b ? gcd(b, a % b) : a);

// 30° -> "π/6", 270° -> "3π/2"; other angles fall back to decimals.
function radLabel(deg) {
  const rad = (deg * DEG).toFixed(3);
  if (!Number.isInteger(deg) || deg % 15 !== 0) return rad;
  if (deg === 0) return '0';
  let num = deg / 15;
  let den = 12;
  const g = gcd(num, den);
  num /= g;
  den /= g;
  return `${num === 1 ? '' : num}π${den === 1 ? '' : `/${den}`} ≈ ${rad}`;
}

function quadrant(deg) {
  if (deg % 90 === 0) return 'On an axis';
  if (deg < 90) return 'Quadrant I · sin +, cos +';
  if (deg < 180) return 'Quadrant II · sin +, cos −';
  if (deg < 270) return 'Quadrant III · sin −, cos −';
  return 'Quadrant IV · sin −, cos +';
}

export function initUnitCircle(root) {
  const $ = (name) => root.querySelector(`[data-el="${name}"]`);
  const canvas = $('canvas');
  const playBtn = $('play');
  const angleIn = $('angle');
  const speedIn = $('speed');
  const cosToggle = $('show-cos');
  const snapToggle = $('snap');
  const out = {
    angle: $('angle-out'), speed: $('speed-out'), deg: $('r-deg'), rad: $('r-rad'),
    sin: $('r-sin'), cos: $('r-cos'), tan: $('r-tan'), quad: $('r-quad'),
  };

  const state = { theta: 30 * DEG, speed: 60, showCos: false, snap: false };
  let layout = null;
  let dragging = null;

  const { ctx, size } = setupCanvas(canvas, (w) => (w < 560 ? 1.3 : 2.3), () => draw());

  const anim = createAnimator(canvas, (dt) => {
    state.theta = (state.theta + state.speed * DEG * dt) % TAU;
    update();
  });

  function setPlaying(on) {
    on ? anim.start() : anim.stop();
    playBtn.textContent = on ? 'Pause' : 'Play';
    playBtn.setAttribute('aria-pressed', String(on));
  }

  function update() {
    const deg = Math.round((state.theta / DEG) * 1000) / 1000;
    const shown = Math.round(deg) % 360;
    const exact = Math.abs(deg - Math.round(deg)) < 1e-6 ? shown : null;
    const s = Math.sin(state.theta);
    const c = Math.cos(state.theta);

    angleIn.value = String(shown);
    out.angle.textContent = `${shown}°`;
    out.deg.textContent = `${shown}°`;
    out.rad.textContent = exact === null ? (state.theta).toFixed(3) : radLabel(exact);
    out.sin.textContent = s.toFixed(3);
    out.cos.textContent = c.toFixed(3);
    out.tan.textContent = Math.abs(c) < 1e-3 ? 'undefined' : (s / c).toFixed(3);
    out.quad.textContent = quadrant(exact ?? deg);
    draw();
  }

  function draw() {
    const { w, h } = size;
    if (!w) return;
    ctx.clearRect(0, 0, w, h);

    const narrow = w < 560;
    const pad = narrow ? 14 : 28;
    const R = Math.min(h * 0.36, w * (narrow ? 0.19 : 0.17));
    const cx = pad + R + 8;
    const cy = h / 2;
    const x0 = cx + R + (narrow ? 26 : Math.max(36, w * 0.06));
    const x1 = w - pad;
    const waveW = x1 - x0;
    const mapX = (t) => x0 + (t / TAU) * waveW;
    layout = { R, cx, cy, x0, x1, waveW };

    const th = state.theta;
    const px = cx + R * Math.cos(th);
    const py = cy - R * Math.sin(th);
    const fs = narrow ? 11 : 13;

    // --- circle axes & grid
    ctx.lineWidth = 1;
    ctx.strokeStyle = COLORS.axis;
    ctx.beginPath();
    ctx.moveTo(cx - R - 14, cy); ctx.lineTo(cx + R + 14, cy);
    ctx.moveTo(cx, cy - R - 14); ctx.lineTo(cx, cy + R + 14);
    ctx.stroke();

    ctx.strokeStyle = COLORS.whiteSoft;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.stroke();

    // --- wave axes
    ctx.strokeStyle = COLORS.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, cy); ctx.lineTo(x1, cy);
    ctx.moveTo(x0, cy - R - 12); ctx.lineTo(x0, cy + R + 12);
    ctx.stroke();

    ctx.setLineDash([3, 5]);
    ctx.strokeStyle = COLORS.grid;
    ctx.beginPath();
    ctx.moveTo(x0, cy - R); ctx.lineTo(x1, cy - R);
    ctx.moveTo(x0, cy + R); ctx.lineTo(x1, cy + R);
    ctx.stroke();
    ctx.setLineDash([]);
    text(ctx, '1', x0 - 8, cy - R, { color: COLORS.muted, size: fs, align: 'right' });
    text(ctx, '−1', x0 - 8, cy + R, { color: COLORS.muted, size: fs, align: 'right' });

    const ticks = [['π/2', 0.25], ['π', 0.5], ['3π/2', 0.75], ['2π', 1]];
    for (const [label, f] of ticks) {
      const x = mapX(f * TAU);
      ctx.strokeStyle = COLORS.axis;
      ctx.beginPath(); ctx.moveTo(x, cy - 4); ctx.lineTo(x, cy + 4); ctx.stroke();
      text(ctx, label, x, cy + R + 22, { color: COLORS.muted, size: fs, align: f === 1 ? 'right' : 'center' });
    }

    // --- full curves (faint) + traced curves (bright)
    const curve = (fn, from, to, color, width) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      const steps = Math.max(2, Math.ceil(((to - from) / TAU) * 240));
      for (let i = 0; i <= steps; i++) {
        const t = from + ((to - from) * i) / steps;
        const x = mapX(t);
        const y = cy - R * fn(t);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    };
    curve(Math.sin, 0, TAU, COLORS.yellowFaint, 2);
    if (state.showCos) curve(Math.cos, 0, TAU, 'rgba(245,245,245,0.1)', 2);
    if (th > 0.001) {
      curve(Math.sin, 0, th, COLORS.yellow, 3);
      if (state.showCos) curve(Math.cos, 0, th, COLORS.white, 2.5);
    }

    // --- angle arc
    ctx.strokeStyle = COLORS.yellow;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.22, 0, -th, true);
    ctx.stroke();
    const mid = th / 2;
    text(ctx, 'θ', cx + R * 0.34 * Math.cos(mid), cy - R * 0.34 * Math.sin(mid), { color: COLORS.yellow, size: fs + 1, weight: 700 });

    // --- radius, cos & sin legs
    ctx.strokeStyle = COLORS.whiteSoft;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, py); ctx.stroke();

    ctx.lineCap = 'round';
    ctx.strokeStyle = COLORS.white;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, cy); ctx.stroke();

    ctx.strokeStyle = COLORS.yellow;
    ctx.beginPath(); ctx.moveTo(px, cy); ctx.lineTo(px, py); ctx.stroke();
    ctx.lineCap = 'butt';

    const sinSide = Math.cos(th) >= 0 ? 1 : -1;
    if (Math.abs(Math.sin(th)) > 0.12) {
      text(ctx, 'sin θ', px + sinSide * 8, (cy + py) / 2, { color: COLORS.yellow, size: fs, weight: 700, align: sinSide > 0 ? 'left' : 'right' });
    }
    if (Math.abs(Math.cos(th)) > 0.2) {
      text(ctx, 'cos θ', (cx + px) / 2, cy + (Math.sin(th) >= 0 ? 14 : -14), { color: COLORS.white, size: fs, weight: 700 });
    }

    // --- connector from circle to the wave
    const wx = mapX(th);
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = COLORS.yellowSoft;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(wx, py); ctx.stroke();
    ctx.setLineDash([]);

    const dot = (x, y, r, fill) => {
      ctx.fillStyle = fill;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    };
    if (state.showCos) dot(wx, cy - R * Math.cos(th), 5, COLORS.white);
    dot(wx, py, 6, COLORS.yellow);
    dot(px, py, 10, COLORS.yellow);
    dot(px, py, 4, COLORS.black);

    text(ctx, 'Drag the dot ↻', cx, cy + R + 22, { color: COLORS.muted, size: fs });
  }

  // --- interaction
  function hit(p) {
    if (!layout) return null;
    const { cx, cy, R, x0, x1 } = layout;
    if (Math.hypot(p.x - cx, p.y - cy) < R * 1.45) return 'circle';
    if (p.x >= x0 - 10 && p.x <= x1 + 10) return 'wave';
    return null;
  }

  function setFromPointer(p) {
    const { cx, cy, x0, waveW } = layout;
    let th = dragging === 'circle'
      ? Math.atan2(-(p.y - cy), p.x - cx)
      : clamp((p.x - x0) / waveW) * TAU;
    th = (th + TAU) % TAU;
    if (state.snap) th = ((Math.round(th / (15 * DEG)) * 15) % 360) * DEG;
    else if (dragging === 'wave' && th >= TAU - 1e-9) th = TAU - 0.0001;
    state.theta = th;
    update();
  }

  canvas.addEventListener('pointerdown', (e) => {
    const p = pointerPos(canvas, e);
    dragging = hit(p);
    if (!dragging) return;
    canvas.setPointerCapture(e.pointerId);
    setPlaying(false);
    setFromPointer(p);
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = pointerPos(canvas, e);
    if (dragging) setFromPointer(p);
    else canvas.style.cursor = hit(p) ? 'grab' : 'default';
  });
  const endDrag = () => { dragging = null; };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  playBtn.addEventListener('click', () => setPlaying(!anim.running));
  $('reset').addEventListener('click', () => {
    setPlaying(false);
    state.theta = 0;
    update();
  });
  angleIn.addEventListener('input', () => {
    setPlaying(false);
    state.theta = (Number(angleIn.value) % 360) * DEG;
    update();
  });
  speedIn.addEventListener('input', () => {
    state.speed = Number(speedIn.value);
    out.speed.textContent = `${state.speed}°/s`;
  });
  cosToggle.addEventListener('change', () => { state.showCos = cosToggle.checked; draw(); });
  snapToggle.addEventListener('change', () => { state.snap = snapToggle.checked; });

  root.querySelectorAll('[data-angle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setPlaying(false);
      state.theta = Number(btn.dataset.angle) * DEG;
      update();
    });
  });

  update();
}
