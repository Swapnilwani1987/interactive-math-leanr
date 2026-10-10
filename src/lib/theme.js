// Canvas colours mirror the CSS tokens in style.css.
export const COLORS = {
  yellow: '#ffd400',
  yellowSoft: 'rgba(255, 212, 0, 0.28)',
  yellowFaint: 'rgba(255, 212, 0, 0.12)',
  white: '#f5f5f5',
  whiteSoft: 'rgba(245, 245, 245, 0.35)',
  muted: '#8a8a8a',
  axis: '#3a3a3a',
  grid: '#1e1e1e',
  dark: '#262626',
  black: '#0a0a0a',
};

export const FONT = '"Space Grotesk", system-ui, sans-serif';

export const TAU = Math.PI * 2;
export const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function text(ctx, str, x, y, opts = {}) {
  const { color = COLORS.white, size = 13, weight = 500, align = 'center', baseline = 'middle', alpha = 1 } = opts;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillText(str, x, y);
  ctx.restore();
}
