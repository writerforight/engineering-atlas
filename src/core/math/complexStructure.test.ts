import { describe, expect, it } from 'vitest';
import {
  J2,
  approxEqual,
  commutator,
  det2,
  expSeries,
  expm,
  identity,
  inv2,
  mul,
  norm,
  scale,
  trace,
  add,
} from './matrix';
import {
  complexStructure,
  conjugateFlow,
  conjugatorToJ,
  expComplexStructure,
  fromConjugator,
} from './complexStructure';
import { L_I, L_J, L_K, pureQuatMatrix, qmul, sphericalToUnit } from './quaternion';

const samples: Array<[number, number]> = [
  [0, 1],
  [0.5, 2],
  [-1.2, 0.3],
  [2, -0.8],
  [0.01, -5],
];

describe('complex structure M = [[a,b],[c,-a]]', () => {
  it.each(samples)('a=%f, b=%f: M^2 = -I, tr M = 0, det M = 1', (a, b) => {
    const M = complexStructure(a, b);
    expect(approxEqual(mul(M, M), scale(identity(2), -1), 1e-12)).toBe(true);
    expect(trace(M)).toBeCloseTo(0, 14);
    expect(det2(M)).toBeCloseTo(1, 12);
  });

  it('rejects b = 0', () => {
    expect(() => complexStructure(1, 0)).toThrow();
  });

  it.each(samples)('a=%f, b=%f: cos t I + sin t M equals the exponential series', (a, b) => {
    const M = complexStructure(a, b);
    for (const t of [0.2, 1.1, 3, -2.4]) {
      const closed = expComplexStructure(M, t);
      // The series converges slowly for large ||tM||; compare against
      // scaling-and-squaring as well as the raw truncated series.
      expect(approxEqual(closed, expm(M, t), 1e-10)).toBe(true);
      if (norm(scale(M, t)) < 8) expect(approxEqual(closed, expSeries(M, t, 80), 1e-9)).toBe(true);
    }
  });

  it.each(samples)('a=%f, b=%f: M = P J P^{-1} and e^{tM} = P e^{tJ} P^{-1}', (a, b) => {
    const M = complexStructure(a, b);
    const P = conjugatorToJ(M);
    expect(approxEqual(fromConjugator(P, J2), M, 1e-12)).toBe(true);
    const t = 0.9;
    expect(approxEqual(mul(mul(P, expm(J2, t)), inv2(P)), expComplexStructure(M, t), 1e-12)).toBe(
      true,
    );
  });

  it('similarity flow has derivative [M, A] at t = 0 and fixes A = alpha I + beta M', () => {
    const M = complexStructure(0.7, 1.5);
    const A = [
      [2, 0.5],
      [0.5, -1],
    ];
    const h = 1e-6;
    const deriv = scale(add(conjugateFlow(M, A, h), scale(conjugateFlow(M, A, -h), -1)), 1 / (2 * h));
    expect(approxEqual(deriv, commutator(M, A), 1e-6)).toBe(true);
    const B = add(scale(identity(2), 0.3), scale(M, -1.7));
    expect(approxEqual(conjugateFlow(M, B, 1.234), B, 1e-12)).toBe(true);
    // Period pi: e^{pi M} = -I, so the conjugation flow returns after pi.
    expect(approxEqual(conjugateFlow(M, A, Math.PI), A, 1e-10)).toBe(true);
  });
});

describe('quaternion left multiplication', () => {
  const minusI = scale(identity(4), -1);

  it('L_i, L_j, L_k square to -I and anticommute (ij = k)', () => {
    for (const L of [L_I, L_J, L_K]) expect(approxEqual(mul(L, L), minusI)).toBe(true);
    expect(approxEqual(mul(L_I, L_J), L_K)).toBe(true);
    expect(approxEqual(add(mul(L_I, L_J), mul(L_J, L_I)), scale(identity(4), 0))).toBe(true);
  });

  it('matrix matches the Hamilton product', () => {
    const q = [0.3, -1, 2, 0.5] as const;
    const p = [1, 2, -0.5, 4] as const;
    const viaMatrix = mul(pureQuatMatrix([q[1], q[2], q[3]]), [[p[0]], [p[1]], [p[2]], [p[3]]]).map(
      (r) => r[0],
    );
    const direct = qmul([0, q[1], q[2], q[3]], p);
    viaMatrix.forEach((v, i) => expect(v).toBeCloseTo(direct[i]!, 12));
  });

  it('every unit pure quaternion gives M^2 = -I and the cos/sin exponential', () => {
    for (const [th, ph] of [
      [0.3, 1],
      [1.2, -2],
      [2.9, 4],
    ] as const) {
      const M = pureQuatMatrix(sphericalToUnit(th, ph));
      expect(approxEqual(mul(M, M), minusI, 1e-12)).toBe(true);
      expect(approxEqual(expComplexStructure(M, 1.3), expm(M, 1.3), 1e-10)).toBe(true);
    }
  });
});
