// Sizes a canvas to its parent's width (crisp on high-DPI screens) and
// redraws whenever the parent resizes.
export function setupCanvas(canvas, getAspect, onResize) {
  const ctx = canvas.getContext('2d');
  const size = { w: 0, h: 0 };

  const resize = () => {
    const w = Math.floor(canvas.parentElement.clientWidth);
    if (!w || w === size.w) return;
    const h = Math.round(w / getAspect(w));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    size.w = w;
    size.h = h;
    onResize();
  };

  // The observer fires once on observe(), which performs the first sizing.
  new ResizeObserver(resize).observe(canvas.parentElement);
  return { ctx, size };
}

// requestAnimationFrame loop that only runs while started AND on screen,
// so off-screen labs don't burn battery.
export function createAnimator(el, tick) {
  let running = false;
  let visible = true;
  let raf = 0;
  let last = 0;

  const loop = (now) => {
    const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 0;
    last = now;
    tick(dt);
    if (raf) raf = requestAnimationFrame(loop);
  };

  const sync = () => {
    const should = running && visible;
    if (should && !raf) {
      last = 0;
      raf = requestAnimationFrame(loop);
    } else if (!should && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  }).observe(el);

  return {
    start() { running = true; sync(); },
    stop() { running = false; sync(); },
    get running() { return running; },
  };
}

export function pointerPos(canvas, e) {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}
