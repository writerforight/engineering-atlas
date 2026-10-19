import { describe, expect, it } from 'vitest';
import {
  J2,
  approxEqual,
  commutator,
  det2,
  eig2,
  expSeries,
  expm,
  identity,
  inv2,
  mat2,
  mul,
  scale,
  trace,
} from './matrix';

describe('matrix basics', () => {
  it('multiplies and inverts 2x2', () => {
    const A = mat2(2, 1, 1, 3);
    expect(approxEqual(mul(A, inv2(A)), identity(2))).toBe(true);
    expect(det2(A)).toBe(5);
    expect(trace(A)).toBe(5);
  });

  it('commutator is antisymmetric and vanishes for commuting matrices', () => {
    const A = mat2(1, 2, 3, 4);
    const B = mat2(0, 1, -1, 0);
    expect(approxEqual(commutator(A, B), scale(commutator(B, A), -1))).toBe(true);
    expect(approxEqual(commutator(A, scale(A, 3)), mat2(0, 0, 0, 0))).toBe(true);
  });

  it('eig2 returns complex pair for a rotation generator', () => {
    expect(eig2(J2)).toEqual([
      [0, 1],
      [0, -1],
    ]);
  });
});

describe('matrix exponential', () => {
  it('e^{tJ} is the rotation by t', () => {
    for (const t of [0.3, 1, Math.PI, 7.5]) {
      const R = mat2(Math.cos(t), -Math.sin(t), Math.sin(t), Math.cos(t));
      expect(approxEqual(expm(J2, t), R, 1e-12)).toBe(true);
    }
  });

  it('expm agrees with a long series for a generic matrix', () => {
    const A = mat2(0.4, -1.3, 0.7, -0.2);
    expect(approxEqual(expm(A, 2), expSeries(A, 2, 60), 1e-12)).toBe(true);
  });

  it('diagonal matrices exponentiate entrywise', () => {
    const D = mat2(1, 0, 0, -2);
    expect(approxEqual(expm(D), mat2(Math.E, 0, 0, Math.exp(-2)), 1e-12)).toBe(true);
  });
});
