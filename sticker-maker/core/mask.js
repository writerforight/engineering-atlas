// Pixel-level helpers on RGBA buffers: background removal for the cut-out
// shape and an exact Euclidean distance transform for the outline.
// Pure functions: no canvas, no DOM, so they run and test the same everywhere.

const INF = 1e20;

/** 1D squared distance transform (Felzenszwalb & Huttenlocher). */
function edt1d(f, n, d, v, z) {
  let k = 0;
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    const dq = q - v[k];
    d[q] = dq * dq + f[v[k]];
  }
}

/**
 * Squared Euclidean distance from every pixel to the nearest pixel where
 * inside[i] is true. Inside pixels get 0.
 * @param {Uint8Array} inside 1 = inside
 */
export function squaredDistance(inside, w, h) {
  const out = new Float64Array(w * h);
  for (let i = 0; i < out.length; i++) out[i] = inside[i] ? 0 : INF;
  const n = Math.max(w, h);
  const f = new Float64Array(n);
  const d = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = out[y * w + x];
    edt1d(f, h, d, v, z);
    for (let y = 0; y < h; y++) out[y * w + x] = d[y];
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = out[y * w + x];
    edt1d(f, w, d, v, z);
    for (let x = 0; x < w; x++) out[y * w + x] = d[x];
  }
  return out;
}

/**
 * Anti-aliased outline alpha (0..255) of thickness `width` around the opaque
 * part of an RGBA buffer (alpha >= 128 counts as opaque).
 */
export function outlineAlpha(rgba, w, h, width) {
  const inside = new Uint8Array(w * h);
  for (let i = 0; i < inside.length; i++) inside[i] = rgba[i * 4 + 3] >= 128 ? 1 : 0;
  const d2 = squaredDistance(inside, w, h);
  const a = new Uint8ClampedArray(w * h);
  for (let i = 0; i < a.length; i++) {
    const t = width + 0.5 - Math.sqrt(d2[i]);
    a[i] = t >= 1 ? 255 : t <= 0 ? 0 : Math.round(t * 255);
  }
  return a;
}

/** Share of border pixels that are already (semi-)transparent. */
export function borderTransparency(rgba, w, h) {
  let total = 0;
  let clear = 0;
  const visit = (x, y) => {
    total++;
    if (rgba[(y * w + x) * 4 + 3] < 250) clear++;
  };
  for (let x = 0; x < w; x++) { visit(x, 0); visit(x, h - 1); }
  for (let y = 1; y < h - 1; y++) { visit(0, y); visit(w - 1, y); }
  return total ? clear / total : 0;
}

/** Most common border colour, quantised to 4 bits per channel. */
export function dominantBorderColor(rgba, w, h) {
  const counts = new Map();
  const sums = new Map();
  const visit = (x, y) => {
    const i = (y * w + x) * 4;
    const key = ((rgba[i] >> 4) << 8) | ((rgba[i + 1] >> 4) << 4) | (rgba[i + 2] >> 4);
    counts.set(key, (counts.get(key) || 0) + 1);
    const s = sums.get(key) || [0, 0, 0];
    s[0] += rgba[i]; s[1] += rgba[i + 1]; s[2] += rgba[i + 2];
    sums.set(key, s);
  };
  for (let x = 0; x < w; x++) { visit(x, 0); visit(x, h - 1); }
  for (let y = 1; y < h - 1; y++) { visit(0, y); visit(w - 1, y); }
  let best = -1;
  let bestN = -1;
  for (const [k, n] of counts) if (n > bestN) { best = k; bestN = n; }
  const s = sums.get(best);
  return { color: [s[0] / bestN, s[1] / bestN, s[2] / bestN], share: bestN / (2 * w + 2 * h - 4) };
}

/**
 * Remove a (roughly uniform) background connected to the image border, in place.
 * tolerance 0..100. Returns the share of removed pixels.
 */
export function removeBackground(rgba, w, h, tolerance) {
  const { color } = dominantBorderColor(rgba, w, h);
  const thr = Math.max(4, tolerance * 2.2); // 0..100 -> 0..220 in RGB distance
  const dist = (i) => {
    const dr = rgba[i] - color[0];
    const dg = rgba[i + 1] - color[1];
    const db = rgba[i + 2] - color[2];
    return Math.sqrt(dr * dr + dg * dg + db * db);
  };
  const removed = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  let sp = 0;
  const seed = (p) => {
    if (!removed[p] && dist(p * 4) <= thr) { removed[p] = 1; stack[sp++] = p; }
  };
  for (let x = 0; x < w; x++) { seed(x); seed((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { seed(y * w); seed(y * w + w - 1); }
  while (sp > 0) {
    const p = stack[--sp];
    const x = p % w;
    const y = (p - x) / w;
    if (x > 0) seed(p - 1);
    if (x < w - 1) seed(p + 1);
    if (y > 0) seed(p - w);
    if (y < h - 1) seed(p + w);
  }
  let count = 0;
  for (let p = 0; p < removed.length; p++) {
    if (removed[p]) { rgba[p * 4 + 3] = 0; count++; continue; }
    // Soften the fringe: kept pixels touching the removed area fade with
    // their colour distance to the background.
    const x = p % w;
    const y = (p - x) / w;
    const touches = (x > 0 && removed[p - 1]) || (x < w - 1 && removed[p + 1]) || (y > 0 && removed[p - w]) || (y < h - 1 && removed[p + w]);
    if (touches) {
      const t = Math.min(1, Math.max(0, (dist(p * 4) - thr) / thr));
      rgba[p * 4 + 3] = Math.round(rgba[p * 4 + 3] * (0.35 + 0.65 * t));
    }
  }
  return count / removed.length;
}

/** Bounding box of pixels with alpha > threshold, or null. */
export function opaqueBounds(rgba, w, h, threshold = 16) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (rgba[(y * w + x) * 4 + 3] > threshold) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
