import { add, identity, scale, mul, type Mat, type Vec } from './matrix';

/**
 * Cross-product (skew-symmetric) matrix of w in R^3:
 * [w]x v = w x v for every v, and [w]x^T = -[w]x.
 */
export function skew3(w: Vec): Mat {
  const [x, y, z] = [w[0]!, w[1]!, w[2]!];
  return [
    [0, -z, y],
    [z, 0, -x],
    [-y, x, 0],
  ];
}

/** Inverse of skew3: read w back from a 3x3 skew-symmetric matrix. */
export function vee3(K: Mat): Vec {
  return [K[2]![1]!, K[0]![2]!, K[1]![0]!];
}

export function cross3(a: Vec, b: Vec): Vec {
  return [a[1]! * b[2]! - a[2]! * b[1]!, a[2]! * b[0]! - a[0]! * b[2]!, a[0]! * b[1]! - a[1]! * b[0]!];
}

export function norm3(v: Vec): number {
  return Math.hypot(v[0]!, v[1]!, v[2]!);
}

/** [w]x^k for k >= 0. */
export function skewPower(w: Vec, k: number): Mat {
  let P = identity(3);
  const K = skew3(w);
  for (let i = 0; i < k; i++) P = mul(P, K);
  return P;
}

/**
 * Rodrigues: e^{t[w]x} = I + sin(theta) K + (1 - cos(theta)) K^2,
 * with theta = t|w| and K = [w/|w|]x. Uses K^3 = -K for a unit axis.
 */
export function rodrigues(w: Vec, t = 1): Mat {
  const n = norm3(w);
  if (n === 0) return identity(3);
  const th = t * n;
  const K = skew3(w.map((x) => x / n));
  return add(add(identity(3), scale(K, Math.sin(th))), scale(mul(K, K), 1 - Math.cos(th)));
}
