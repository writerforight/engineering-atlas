import { describe, expect, it } from 'vitest';
import { mul, transpose } from './matrix';
import {
  amplitudes, cosMatrix, derivative, diffMatrix, integral, project, sinMatrix, synth, trigGrid,
} from './trigProjection';

const close = (x: number, y: number, tol = 1e-12) => expect(Math.abs(x - y)).toBeLessThan(tol);

describe('trig projection', () => {
  const g = trigGrid(10);

  it('uses the DFT grid: ω_k = k for T = 2π, K = N/2 + 1 rows', () => {
    expect(g.omega.length).toBe(6);
    g.omega.forEach((w, k) => close(w, k));
    expect(cosMatrix(g).length).toBe(6);
    expect(cosMatrix(g)[0]!.length).toBe(10);
  });

  it('rows are orthogonal on the grid', () => {
    const C = cosMatrix(g), S = sinMatrix(g);
    const G = mul(C, transpose(S));
    for (const row of G) for (const v of row) close(v, 0, 1e-12);
    const CC = mul(C, transpose(C));
    close(CC[2]![3]!, 0);
    close(CC[2]![2]!, g.N / 2);
  });

  it('recovers amplitudes and interpolates exactly', () => {
    const f = g.t.map((t) => 1.5 + 2 * Math.cos(2 * t) - 0.7 * Math.sin(3 * t));
    const { a, b } = amplitudes(g, f);
    close(a[0]!, 1.5); close(a[2]!, 2); close(b[3]!, -0.7); close(a[1]!, 0); close(b[1]!, 0);
    g.t.forEach((t, n) => close(synth(g, a, b, t), f[n]!));
  });

  it('central difference: Dᵀ c_ω = (sin ωΔt / Δt) s_ω', () => {
    const D = diffMatrix(g.N, g.dt, 'central');
    const Dt = transpose(D);
    const k = 3, w = g.omega[k]!;
    const c = cosMatrix(g)[k]!, s = sinMatrix(g)[k]!;
    const Dtc = Dt.map((row) => row.reduce((acc, d, n) => acc + d * c[n]!, 0));
    Dtc.forEach((v, n) => close(v, (Math.sin(w * g.dt) / g.dt) * s[n]!, 1e-12));
  });

  it('spectral derivative is exact for band-limited signals; differences are not', () => {
    const f = g.t.map((t) => Math.cos(2 * t));
    const exact = g.t.map((t) => -2 * Math.sin(2 * t));
    derivative(g, f, 'spectral').forEach((v, n) => close(v, exact[n]!, 1e-12));
    const central = derivative(g, f, 'central');
    const factor = Math.sin(2 * g.dt) / (2 * g.dt);
    central.forEach((v, n) => close(v, factor * exact[n]!, 1e-12));
  });

  it('spectral integral of sin t with F(0) = 0 is 1 − cos t; mean shows up as slope', () => {
    const f = g.t.map((t) => Math.sin(t));
    integral(g, f, 'spectral', 0).F.forEach((v, n) => close(v, 1 - Math.cos(g.t[n]!), 1e-12));
    const withMean = integral(g, g.t.map((t) => 2 + Math.cos(t)), 'spectral', 1);
    close(withMean.mean, 2);
    close(withMean.at!(1.3), 1 + 2 * 1.3 + Math.sin(1.3), 1e-12);
  });

  it('trapezoid is second order, rectangle first order', () => {
    const err = (N: number, m: 'central' | 'backward') => {
      const h = trigGrid(N);
      const F = integral(h, h.t.map((t) => Math.cos(t)), m, 0).F;
      return Math.max(...F.map((v, n) => Math.abs(v - Math.sin(h.t[n]!))));
    };
    expect(err(40, 'central') / err(80, 'central')).toBeGreaterThan(3.5);
    expect(err(40, 'backward') / err(80, 'backward')).toBeLessThan(2.5);
  });

  it('project matches Δt·C·f', () => {
    const f = g.t.map((t) => t);
    const p = project(cosMatrix(g), f, g.dt);
    close(p[0]!, g.dt * f.reduce((s, v) => s + v, 0));
  });
});
