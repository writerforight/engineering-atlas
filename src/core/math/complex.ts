/** Minimal complex arithmetic on [re, im] tuples. */

export type Complex = readonly [number, number];

export const c = (re: number, im = 0): Complex => [re, im];
export const cadd = (a: Complex, b: Complex): Complex => [a[0] + b[0], a[1] + b[1]];
export const csub = (a: Complex, b: Complex): Complex => [a[0] - b[0], a[1] - b[1]];
export const cmul = (a: Complex, b: Complex): Complex => [
  a[0] * b[0] - a[1] * b[1],
  a[0] * b[1] + a[1] * b[0],
];
export function cdiv(a: Complex, b: Complex): Complex {
  const d = b[0] * b[0] + b[1] * b[1];
  return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d];
}
export const cabs = (a: Complex): number => Math.hypot(a[0], a[1]);
export const carg = (a: Complex): number => Math.atan2(a[1], a[0]);
/** e^{a} for complex a. */
export function cexp(a: Complex): Complex {
  const m = Math.exp(a[0]);
  return [m * Math.cos(a[1]), m * Math.sin(a[1])];
}
