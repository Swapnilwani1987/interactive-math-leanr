# MathPlay Lab — interactive math learning

A black-and-yellow landing page with three hands-on math animations, built with [Vite](https://vite.dev) and plain JavaScript + Canvas (no runtime dependencies).

| Lab | Concept | What you can play with |
| --- | --- | --- |
| 01 · Unit Circle & Sine Wave | Trigonometry | Drag the point (or the wave), play/pause, speed, special angles, cosine overlay, 15° snapping. Live sin / cos / tan and radians as fractions of π. |
| 02 · Pythagoras, Proved by Sliding | Geometry | Change sides a and b, jump to famous triples, scrub or play a rearrangement proof where the yellow area stays the same while c² becomes a² + b². |
| 03 · Why a Circle's Area is πr² | Measurement | Slice a circle into 4–60 pieces and unroll it into a near-rectangle; live readout of how close width × height gets to πr². |

## Run it

```bash
npm install
npm run dev       # local dev server with hot reload
npm run build     # production build to dist/
npm run preview   # serve the production build
```

## Project layout

```
index.html              landing page + lab markup
src/main.js             wires up the three labs
src/style.css           theme tokens (black / yellow) and layout
src/lib/canvas.js       hi-DPI canvas sizing + on-screen-only animation loop
src/lib/theme.js        shared colours and maths helpers
src/labs/*.js           one module per lab
```

Animations pause automatically when a lab scrolls off screen, and decorative motion respects `prefers-reduced-motion`.
