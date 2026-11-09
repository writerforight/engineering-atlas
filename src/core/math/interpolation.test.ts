import { describe, expect, it } from 'vitest';
import {
  baryEval, baryWeights, errorCurve, interpolate, lebesgueConst, linspace, nodeWeights, nodes,
} from './interpolation';

const grid = linspace(-1, 1, 100);
const runge = (t: number) => 1 / (1 + 25 * t * t);

describe('nodes and weights', () => {
  it('equidistant nodes include the ends; Chebyshev nodes are inside and ascending', () => {
    expect(nodes('equi', 5)).toEqual([-1, -0.5, 0, 0.5, 1]);
    const c = nodes('cheb', 6);
    expect(c[0]).toBeGreaterThan(-1);
    expect(c[5]).toBeLessThan(1);
    for (let j = 1; j < 6; j++) expect(c[j]!).toBeGreaterThan(c[j - 1]!);
  });

  it('closed-form weights match the general product formula up to scale', () => {
    for (const kind of ['equi', 'cheb'] as const) {
      for (const n of [2, 5, 12]) {
        const g = baryWeights(nodes(kind, n));
        const c = nodeWeights(kind, n);
        const k = g[0]! / c[0]!;
        c.forEach((v, j) => expect(v * k).toBeCloseTo(g[j]!, 10));
      }
    }
  });
});

describe('barycentric evaluation', () => {
  it('reproduces polynomials of degree < n exactly', () => {
    const q = (t: number) => 2 * t ** 3 - t + 0.5;
    for (const kind of ['equi', 'cheb'] as const) {
      const r = interpolate(q, kind, 4, grid);
      expect(r.max).toBeLessThan(1e-12);
    }
  });

  it('hits the data at the nodes', () => {
    const x = nodes('cheb', 7), f = x.map(Math.exp), w = nodeWeights('cheb', 7);
    x.forEach((xj, j) => expect(baryEval(x, f, w, xj)).toBe(f[j]));
  });
});

describe('Runge phenomenon and Lebesgue constant', () => {
  it('equidistant error grows with n, Chebyshev error shrinks', () => {
    const e = errorCurve(runge, 'equi', grid, 10, 20);
    const c = errorCurve(runge, 'cheb', grid, 10, 20);
    expect(e[e.length - 1]!.max).toBeGreaterThan(e[0]!.max);
    expect(c[c.length - 1]!.max).toBeLessThan(c[0]!.max);
    expect(c[c.length - 1]!.max).toBeLessThan(0.05);
  });

  it('Λ_n grows like (2/π) log n for Chebyshev and exponentially for equidistant', () => {
    const n = 20;
    const lc = lebesgueConst(nodes('cheb', n), nodeWeights('cheb', n));
    const le = lebesgueConst(nodes('equi', n), nodeWeights('equi', n));
    expect(lc).toBeLessThan((2 / Math.PI) * Math.log(n) + 1);
    expect(lc).toBeGreaterThan(1);
    expect(le).toBeGreaterThan(1e3);
    expect(lebesgueConst(nodes('equi', 2), nodeWeights('equi', 2))).toBeCloseTo(1, 6);
  });

  it('RMS never exceeds the max error', () => {
    const r = interpolate(runge, 'cheb', 15, grid);
    expect(r.rms).toBeLessThanOrEqual(r.max);
  });
});
