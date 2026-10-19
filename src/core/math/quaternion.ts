import type { Mat, Vec } from './matrix';

/** Quaternion q = w + x i + y j + z k stored as [w, x, y, z]. */
export type Quat = readonly [number, number, number, number];

/** Hamilton product p * q. */
export function qmul(p: Quat, q: Quat): Quat {
  const [a1, b1, c1, d1] = p;
  const [a2, b2, c2, d2] = q;
  return [
    a1 * a2 - b1 * b2 - c1 * c2 - d1 * d2,
    a1 * b2 + b1 * a2 + c1 * d2 - d1 * c2,
    a1 * c2 - b1 * d2 + c1 * a2 + d1 * b2,
    a1 * d2 + b1 * c2 - c1 * b2 + d1 * a2,
  ];
}

/**
 * 4x4 real matrix of left multiplication p -> q * p, in the basis (1, i, j, k).
 * Column m is q * e_m, so the matrix is built straight from the product rule.
 */
export function leftMulMatrix(q: Quat): Mat {
  const basis: Quat[] = [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ];
  const columns = basis.map((e) => qmul(q, e));
  return [0, 1, 2, 3].map((r) => columns.map((col) => col[r]!));
}

export const L_I = leftMulMatrix([0, 1, 0, 0]);
export const L_J = leftMulMatrix([0, 0, 1, 0]);
export const L_K = leftMulMatrix([0, 0, 0, 1]);

/** Point on S^2 from polar angle theta (from +z) and azimuth phi. */
export function sphericalToUnit(theta: number, phi: number): Vec {
  return [Math.sin(theta) * Math.cos(phi), Math.sin(theta) * Math.sin(phi), Math.cos(theta)];
}

/** M_n = n1 L_i + n2 L_j + n3 L_k: left multiplication by the pure quaternion n. */
export function pureQuatMatrix(n: Vec): Mat {
  return leftMulMatrix([0, n[0]!, n[1]!, n[2]!]);
}
