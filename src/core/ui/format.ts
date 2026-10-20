import type { Mat } from '../math/matrix';

/** Fixed-precision number without "-0.000". */
export function fmt(x: number, digits = 3): string {
  const s = x.toFixed(digits);
  return /^-0\.?0*$/.test(s) ? s.slice(1) : s;
}

/** Scientific notation for tiny error readouts, e.g. 3.2e-16. */
export function fmtErr(x: number): string {
  return x === 0 ? '0' : x.toExponential(1);
}

/** LaTeX bmatrix for a numeric matrix. */
export function texMatrix(M: Mat, digits = 3): string {
  return `\\begin{bmatrix}${M.map((r) => r.map((v) => fmt(v, digits)).join('&')).join('\\\\')}\\end{bmatrix}`;
}
