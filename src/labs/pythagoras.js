import { setupCanvas, createAnimator } from '../lib/canvas.js';
import { COLORS, clamp, lerp, easeInOut, text } from '../lib/theme.js';

const fmt = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(2));

// Four copies of the right triangle inside an (a+b) square. Each triangle is
// placed by its right-angle corner P and the direction φ of its a-leg; the
// b-leg is the a-leg turned 90°. Moving only by translation between the two
// layouts keeps the uncovered (yellow) area constant: c² becomes a² + b².
// Moving them one at a time in this order means no two ever overlap, so the
// yellow area is constant at every frame, not just at the ends.
function triangleLayouts(a, b) {
  const s = a + b;
  return [
    { from: [0, s], to: [a, a], phi: 270, window: [0, 1 / 3] },
    { from: [0, 0], to: [0, a], phi: 0, window: [1 / 3, 2 / 3] },
    { from: [s, s], to: [a, s], phi: 180, window: [2 / 3, 1] },
    { from: [s, 0], to: [s, 0], phi: 90, window: null }, // never moves
  ];
}

export function initPythagoras(root) {
  const $ = (name) => root.querySelector(`[data-el="${name}"]`);
  const aIn = $('a');
  const bIn = $('b');
  const tIn = $('t');
  const playBtn = $('play');
  const out = {
    a: $('a-out'), b: $('b-out'), t: $('t-out'), a2: $('r-a2'), b2: $('r-b2'),
    sum: $('r-sum'), c: $('r-c'), triple: $('r-triple'),
  };

  const state = { a: 3, b: 4, t: 0, target: 1 };

  const sq = setupCanvas($('squares'), () => 1.05, () => drawSquares());
  const pf = setupCanvas($('proof'), () => 1.05, () => drawProof());

  const anim = createAnimator($('proof'), (dt) => {
    const step = dt * 0.35;
    state.t = state.target > state.t ? Math.min(state.target, state.t + step) : Math.max(state.target, state.t - step);
    if (state.t === state.target) setPlaying(false);
    tIn.value = String(Math.round(state.t * 100));
    out.t.textContent = `${Math.round(state.t * 100)}%`;
    drawProof();
  });

  function setPlaying(on) {
    if (on) {
      state.target = state.t >= 1 ? 0 : 1;
      anim.start();
    } else {
      anim.stop();
    }
    playBtn.textContent = on ? 'Pause' : state.t >= 1 ? 'Rewind proof' : 'Play proof';
    playBtn.setAttribute('aria-pressed', String(on));
  }

  function update() {
    const { a, b } = state;
    const c2 = a * a + b * b;
    const c = Math.sqrt(c2);
    out.a.textContent = a;
    out.b.textContent = b;
    out.a2.textContent = a * a;
    out.b2.textContent = b * b;
    out.sum.textContent = c2;
    out.c.textContent = Number.isInteger(c) ? c : `√${c2} ≈ ${c.toFixed(3)}`;
    out.triple.textContent = Number.isInteger(c)
      ? `${a}–${b}–${c} is a Pythagorean triple: all whole numbers!`
      : `c isn't a whole number here. Try 3–4, 5–12 or 8–15.`;
    out.triple.classList.toggle('is-win', Number.isInteger(c));
    drawSquares();
    drawProof();
  }

  // Square with corner q, edge directions e1/e2 (unit vectors) and side L.
  function drawSquare(ctx, q, e1, e2, L, k, fill, stroke) {
    const pt = (u, v) => [q[0] + (e1[0] * u + e2[0] * v) * k, q[1] + (e1[1] * u + e2[1] * v) * k];
    const corners = [pt(0, 0), pt(L, 0), pt(L, L), pt(0, L)];
    ctx.beginPath();
    corners.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();

    // unit grid, so learners can count the squares
    if (k >= 7) {
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = 'rgba(10,10,10,0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 1; i < L; i++) {
        let [x, y] = pt(i, 0); ctx.moveTo(x, y); [x, y] = pt(i, L); ctx.lineTo(x, y);
        [x, y] = pt(0, i); ctx.moveTo(x, y); [x, y] = pt(L, i); ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    }
    ctx.beginPath();
    corners.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
    return pt(L / 2, L / 2);
  }

  function drawSquares() {
    const { ctx, size: { w, h } } = sq;
    if (!w) return;
    ctx.clearRect(0, 0, w, h);
    const { a, b } = state;
    const c = Math.hypot(a, b);

    // Bounding box of triangle + three squares, in triangle units.
    const minX = -b, maxX = a + b, minY = -(a + b), maxY = a;
    const k = Math.min((w * 0.86) / (maxX - minX), (h * 0.86) / (maxY - minY));
    const O = [(w - (maxX - minX) * k) / 2 - minX * k, (h - (maxY - minY) * k) / 2 - minY * k];
    const A = [O[0] + a * k, O[1]];
    const B = [O[0], O[1] - b * k];
    const fs = w < 380 ? 12 : 14;

    const ca = drawSquare(ctx, O, [1, 0], [0, 1], a, k, 'rgba(255,212,0,0.55)', COLORS.yellow);
    const cb = drawSquare(ctx, O, [0, -1], [-1, 0], b, k, 'rgba(245,245,245,0.55)', COLORS.white);
    const cc = drawSquare(ctx, A, [-a / c, -b / c], [b / c, -a / c], c, k, 'rgba(255,212,0,0.22)', COLORS.yellow);

    text(ctx, `a² = ${a * a}`, ca[0], ca[1], { color: COLORS.black, size: fs, weight: 700 });
    text(ctx, `b² = ${b * b}`, cb[0], cb[1], { color: COLORS.black, size: fs, weight: 700 });
    text(ctx, `c² = ${fmt(c * c)}`, cc[0], cc[1], { color: COLORS.yellow, size: fs + 2, weight: 700 });

    // the triangle itself
    ctx.beginPath();
    ctx.moveTo(...O); ctx.lineTo(...A); ctx.lineTo(...B); ctx.closePath();
    ctx.fillStyle = COLORS.dark;
    ctx.fill();
    ctx.strokeStyle = COLORS.white;
    ctx.lineWidth = 2;
    ctx.stroke();

    const m = Math.min(12, k * 0.6);
    ctx.strokeStyle = COLORS.white;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(O[0], O[1] - m, m, m);
  }

  function drawProof() {
    const { ctx, size: { w, h } } = pf;
    if (!w) return;
    ctx.clearRect(0, 0, w, h);
    const { a, b, t } = state;
    const s = a + b;
    const k = (Math.min(w, h) * 0.8) / s;
    const ox = (w - s * k) / 2;
    const oy = (h - s * k) / 2;
    const X = (x) => ox + x * k;
    const Y = (y) => oy + y * k;
    const fs = w < 380 ? 12 : 14;

    // Everything not covered by a triangle shows through as yellow.
    ctx.fillStyle = COLORS.yellow;
    ctx.fillRect(X(0), Y(0), s * k, s * k);

    for (const tri of triangleLayouts(a, b)) {
      const local = tri.window ? easeInOut(clamp((t - tri.window[0]) / (tri.window[1] - tri.window[0]))) : 0;
      const px = X(lerp(tri.from[0], tri.to[0], local));
      const py = Y(lerp(tri.from[1], tri.to[1], local));
      const phi = (tri.phi * Math.PI) / 180;
      const u = [Math.cos(phi), Math.sin(phi)];
      const v = [-Math.sin(phi), Math.cos(phi)];
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + u[0] * a * k, py + u[1] * a * k);
      ctx.lineTo(px + v[0] * b * k, py + v[1] * b * k);
      ctx.closePath();
      ctx.fillStyle = COLORS.dark;
      ctx.fill();
      ctx.strokeStyle = COLORS.black;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.strokeStyle = COLORS.yellow;
    ctx.lineWidth = 2;
    ctx.strokeRect(X(0), Y(0), s * k, s * k);

    const startAlpha = clamp(1 - t * 4);
    const endAlpha = clamp((t - 0.75) * 4);
    text(ctx, 'c²', X(s / 2), Y(s / 2), { color: COLORS.black, size: fs + 10, weight: 700, alpha: startAlpha });
    text(ctx, 'a²', X(a / 2), Y(a / 2), { color: COLORS.black, size: fs + 6, weight: 700, alpha: endAlpha });
    text(ctx, 'b²', X(a + b / 2), Y(a + b / 2), { color: COLORS.black, size: fs + 10, weight: 700, alpha: endAlpha });

    // edge labels are the same in both arrangements
    const lbl = { color: COLORS.muted, size: fs };
    text(ctx, 'a', X(a / 2), Y(0) - 12, lbl);
    text(ctx, 'b', X(a + b / 2), Y(0) - 12, lbl);
    text(ctx, 'a', X(s) + 12, Y(a / 2), lbl);
    text(ctx, 'b', X(s) + 12, Y(a + b / 2), lbl);

    const caption = t < 0.5 ? 'Yellow area = c²' : t < 1 ? 'Same triangles, just moved…' : 'Yellow area = a² + b²';
    text(ctx, caption, w / 2, oy + s * k + 22, { color: COLORS.white, size: fs, weight: 600 });
  }

  aIn.addEventListener('input', () => { state.a = Number(aIn.value); update(); });
  bIn.addEventListener('input', () => { state.b = Number(bIn.value); update(); });
  tIn.addEventListener('input', () => {
    setPlaying(false);
    state.t = Number(tIn.value) / 100;
    out.t.textContent = `${tIn.value}%`;
    drawProof();
  });
  playBtn.addEventListener('click', () => setPlaying(!anim.running));
  root.querySelectorAll('[data-triple]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const [a, b] = btn.dataset.triple.split(',').map(Number);
      Object.assign(state, { a, b });
      aIn.value = String(a);
      bIn.value = String(b);
      update();
    });
  });

  update();
}
