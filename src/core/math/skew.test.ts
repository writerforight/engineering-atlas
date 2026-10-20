import { describe, expect, it } from 'vitest';
import { approxEqual, det2, expm, identity, mul, mulVec, scale, transpose, add } from './matrix';
import { cross3, norm3, rodrigues, skew3, skewPower, vee3 } from './skew';

const ws = [
  [1, 0, 0],
  [0.3, -1.2, 2],
  [-2, 0.5, 0.7],
];

function det3(A: number[][]): number {
  const [a, b, c] = A as [number[], number[], number[]];
  return (
    a[0]! * (b[1]! * c[2]! - b[2]! * c[1]!) -
    a[1]! * (b[0]! * c[2]! - b[2]! * c[0]!) +
    a[2]! * (b[0]! * c[1]! - b[1]! * c[0]!)
  );
}

describe('skew-symmetric cross-product matrix', () => {
  it.each(ws)('w = (%f, %f, %f): [w]x v = w x v, skew, vee inverts', (...w) => {
    const K = skew3(w);
    const v = [0.4, -1.1, 2.5];
    mulVec(K, v).forEach((x, i) => expect(x).toBeCloseTo(cross3(w, v)[i]!, 12));
    expect(approxEqual(transpose(K), scale(K, -1))).toBe(true);
    expect(vee3(K)).toEqual(w);
  });

  it.each(ws)('w = (%f, %f, %f): K^3 = -|w|^2 K and K^2 = w w^T - |w|^2 I', (...w) => {
    const n2 = norm3(w) ** 2;
    expect(approxEqual(skewPower(w, 3), scale(skew3(w), -n2), 1e-12)).toBe(true);
    const wwT = w.map((a) => w.map((b) => a * b));
    expect(approxEqual(skewPower(w, 2), add(wwT, scale(identity(3), -n2)), 1e-12)).toBe(true);
  });

  it.each(ws)('w = (%f, %f, %f): Rodrigues equals expm and is a rotation', (...w) => {
    for (const t of [0.3, 1, 2.7]) {
      const R = rodrigues(w, t);
      expect(approxEqual(R, expm(skew3(w), t), 1e-11)).toBe(true);
      expect(approxEqual(mul(transpose(R), R), identity(3), 1e-12)).toBe(true);
      expect(det3(R)).toBeCloseTo(1, 12);
      // The axis is fixed.
      mulVec(R, w).forEach((x, i) => expect(x).toBeCloseTo(w[i]!, 12));
    }
  });

  it('zero vector gives the identity', () => {
    expect(rodrigues([0, 0, 0], 3)).toEqual(identity(3));
    expect(det2(identity(2))).toBe(1);
  });
});
