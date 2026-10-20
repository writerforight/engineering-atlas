/**
 * Pure plotting helpers: linear scales, tick generation and a small 2D
 * "viewport" used by every canvas in the project.
 */

export interface Scale {
  (v: number): number;
  invert: (p: number) => number;
}

export function linearScale(d0: number, d1: number, r0: number, r1: number): Scale {
  const k = (r1 - r0) / (d1 - d0 || 1);
  const s = ((v: number) => r0 + (v - d0) * k) as Scale;
  s.invert = (p: number) => d0 + (p - r0) / k;
  return s;
}

/** Roughly `count` round tick values covering [min, max]. */
export function niceTicks(min: number, max: number, count = 5): number[] {
  if (!(max > min)) return [min];
  const raw = (max - min) / Math.max(1, count);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * mag;
  const start = Math.ceil(min / step - 1e-9) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step * 1e-9; v += step) ticks.push(Math.abs(v) < step * 1e-9 ? 0 : v);
  return ticks;
}

/** Compact number label for tick marks. */
export function fmtTick(v: number): string {
  if (v === 0) return '0';
  const a = Math.abs(v);
  if (a >= 1e4 || a < 1e-3) return v.toExponential(0);
  return String(Number(v.toPrecision(4)));
}

export interface Viewport {
  x: Scale;
  y: Scale;
  /** Plot area in CSS pixels. */
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * Viewport mapping world [x0,x1]x[y0,y1] into a canvas with padding.
 * With `equal` the scales share units (circles stay circles), the domain
 * being expanded symmetrically along the slack axis.
 */
export function makeViewport(
  width: number,
  height: number,
  domain: { x: [number, number]; y: [number, number] },
  pad: { l: number; r: number; t: number; b: number } = { l: 36, r: 12, t: 12, b: 26 },
  equal = false,
): Viewport {
  let [x0, x1] = domain.x;
  let [y0, y1] = domain.y;
  const left = pad.l;
  const right = width - pad.r;
  const top = pad.t;
  const bottom = height - pad.b;
  if (equal) {
    const kx = (right - left) / (x1 - x0);
    const ky = (bottom - top) / (y1 - y0);
    if (kx > ky) {
      const half = (right - left) / ky / 2;
      const c = (x0 + x1) / 2;
      [x0, x1] = [c - half, c + half];
    } else {
      const half = (bottom - top) / kx / 2;
      const c = (y0 + y1) / 2;
      [y0, y1] = [c - half, c + half];
    }
  }
  return {
    x: linearScale(x0, x1, left, right),
    y: linearScale(y0, y1, bottom, top),
    left,
    right,
    top,
    bottom,
  };
}
