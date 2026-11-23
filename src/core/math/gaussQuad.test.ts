import { describe, expect, it } from 'vitest';
import {
  cellWidths, evalPoly, exactnessDegree, gaussLegendre, gramSchmidt, inner, jacobiMatrix, momentWeights,
  monicByRecurrence, monicNormSq, monicValues, recurrenceT, scalingD, texPoly, transformRule,
} from './gaussQuad';

describe('gaussQuad', () => {
  it('Gram–Schmidt gives the monic Legendre polynomials', () => {
    const gs = gramSchmidt(3);
    expect(gs[2]!.p[0]).toBeCloseTo(-1 / 3, 12);
    expect(gs[3]!.p[1]).toBeCloseTo(-3 / 5, 12);
    expect(gs[2]!.coef[1]).toBeCloseTo(0, 12); // ⟨x², x⟩ = 0
    expect(texPoly(gs[3]!.p)).toBe('x^{3} - \\tfrac{3}{5}x');
  });

  it('recurrence agrees with Gram–Schmidt and stays orthogonal', () => {
    const gs = gramSchmidt(8), rec = monicByRecurrence(8);
    rec.forEach((p, n) => p.forEach((c, i) => expect(c).toBeCloseTo(gs[n]!.p[i]!, 10)));
    expect(inner(rec[5]!, rec[3]!)).toBeCloseTo(0, 12);
    expect(inner(rec[6]!, rec[6]!)).toBeCloseTo(monicNormSq(6), 12);
    expect(monicValues(6, 0.3)[6]).toBeCloseTo(evalPoly(rec[6]!, 0.3), 12);
  });

  it('J = D T D⁻¹', () => {
    const N = 5, T = recurrenceT(N), d = scalingD(N), J = jacobiMatrix(N);
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) expect((d[i]! * T[i]![j]!) / d[j]!).toBeCloseTo(J[i]![j]!, 12);
  });

  it('Golub–Welsch: N = 2 and N = 3 by hand, weights sum to 2', () => {
    const g2 = gaussLegendre(2);
    expect(g2.x[1]).toBeCloseTo(1 / Math.sqrt(3), 12);
    expect(g2.w[0]).toBeCloseTo(1, 12);
    const g3 = gaussLegendre(3);
    expect(g3.x[2]).toBeCloseTo(Math.sqrt(0.6), 12);
    expect(g3.w[1]).toBeCloseTo(8 / 9, 12);
    const g40 = gaussLegendre(40);
    expect(g40.w.reduce((s, v) => s + v, 0)).toBeCloseTo(2, 12);
    expect(Math.min(...g40.w)).toBeGreaterThan(0);
  });

  it('weights are accurate to rounding level up to N = 40', () => {
    for (const N of [10, 25, 40]) {
      const g = gaussLegendre(N);
      for (let k = 0; k < 2 * N; k++) {
        const q = g.x.reduce((s, x, i) => s + g.w[i]! * x ** k, 0);
        expect(Math.abs(q - (k % 2 ? 0 : 2 / (k + 1)))).toBeLessThan(1e-14);
      }
    }
  });

  it('exactness degree is 2N − 1', () => {
    for (const N of [1, 2, 5, 10, 15]) expect(exactnessDegree(gaussLegendre(N), 1e-10)).toBe(2 * N - 1);
  });

  it('moment system reproduces the Gauss weights for small N', () => {
    const g = gaussLegendre(6), w = momentWeights(g.x);
    w.forEach((v, i) => expect(v).toBeCloseTo(g.w[i]!, 10));
  });

  it('transform and cell widths cover [a, b]', () => {
    const r = transformRule(gaussLegendre(4), 0, 3);
    expect(r.w.reduce((s, v) => s + v, 0)).toBeCloseTo(3, 12);
    expect(cellWidths(r.x, 0, 3).reduce((s, v) => s + v, 0)).toBeCloseTo(3, 12);
  });
});
