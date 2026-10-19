import type { Complex } from './complex';

/** Uniform grid t_k = t0 + k h, k = 0..n. */
export function grid(t0: number, t1: number, n: number): number[] {
  const h = (t1 - t0) / n;
  return Array.from({ length: n + 1 }, (_, k) => t0 + k * h);
}

/** Running integral g_k = int_{t_0}^{t_k} f via the trapezoid rule (g_0 = 0). */
export function cumulativeTrapezoid(ys: readonly number[], h: number): number[] {
  const out = new Array<number>(ys.length).fill(0);
  for (let k = 1; k < ys.length; k++) out[k] = out[k - 1]! + 0.5 * h * (ys[k - 1]! + ys[k]!);
  return out;
}

/** Composite Simpson rule on [a, b] with an even number n of panels. */
export function simpson(f: (t: number) => number, a: number, b: number, n = 2000): number {
  const m = n % 2 === 0 ? n : n + 1;
  const h = (b - a) / m;
  let s = f(a) + f(b);
  for (let k = 1; k < m; k++) s += (k % 2 ? 4 : 2) * f(a + k * h);
  return (s * h) / 3;
}

/**
 * One-sided Laplace transform F(s) = int_0^T f(t) e^{-s t} dt for complex
 * s = sigma + j omega, truncated at T and evaluated with Simpson's rule.
 * The caller must pick T so the tail is negligible (i.e. s inside the ROC).
 */
export function laplaceNumeric(
  f: (t: number) => number,
  s: Complex,
  T: number,
  n = 4000,
): Complex {
  const [sigma, omega] = s;
  const re = simpson((t) => f(t) * Math.exp(-sigma * t) * Math.cos(omega * t), 0, T, n);
  const im = simpson((t) => -f(t) * Math.exp(-sigma * t) * Math.sin(omega * t), 0, T, n);
  return [re, im];
}

/** g(t) = int_0^t f(tau) d tau, evaluated pointwise with Simpson's rule. */
export function integralOf(f: (t: number) => number, n = 400): (t: number) => number {
  return (t) => (t <= 0 ? 0 : simpson(f, 0, t, n));
}
