import { describe, expect, it } from 'vitest';
import type { Complex } from './complex';
import { cabs, csub } from './complex';
import { laplaceNumeric, simpson } from './integrate';
import {
  dampedSineSignal,
  drawnSignal,
  integralTransform,
  lorentzian,
  rampSignal,
  rocG,
  stepSignal,
} from './signals';

/** Truncation time so that e^{-(sigma - roc) T} is negligible. */
const horizon = (sigma: number, roc: number) => Math.min(400, 40 / (sigma - roc));

describe('L{ int_0^t f } = F(s) / s, numerically', () => {
  const signals = [stepSignal(), rampSignal(), dampedSineSignal(0.5, 3), dampedSineSignal(0.1, 1)];
  const points: Complex[] = [
    [1, 0],
    [2, 1.5],
    [0.6, -4],
  ];

  for (const sig of signals) {
    for (const s of points) {
      it(`${sig.id} at s = ${s[0]} + ${s[1]}j`, () => {
        const T = horizon(s[0], rocG(sig));
        const numeric = laplaceNumeric(sig.g, s, T, 20000);
        const analytic = integralTransform(sig, s);
        expect(cabs(csub(numeric, analytic))).toBeLessThan(1e-6 * Math.max(1, cabs(analytic)));
      });
    }
  }

  it('closed-form g matches the numerical running integral', () => {
    for (const sig of signals) {
      for (const t of [0.5, 2, 7]) {
        expect(sig.g(t)).toBeCloseTo(simpson(sig.f, 0, t, 2000), 8);
      }
    }
  });

  it('drawn (finite-support) signal: G = F / s, and g(inf) = F(0)', () => {
    const ys = Array.from({ length: 41 }, (_, k) => Math.sin((k / 40) * 5) + 0.3);
    const sig = drawnSignal(ys, 4);
    for (const s of points) {
      const numeric = laplaceNumeric(sig.g, s, horizon(s[0], 0), 40000);
      const analytic = integralTransform(sig, s);
      expect(cabs(csub(numeric, analytic))).toBeLessThan(1e-5);
    }
    expect(sig.F([0, 0])[0]).toBeCloseTo(sig.gInfinity!, 5);
  });

  it('drawn signal with sharp zigzag (kinks at every knot) stays exact', () => {
    const ys = Array.from({ length: 81 }, (_, k) => (k % 2 ? 1 : -0.5));
    const sig = drawnSignal(ys, 8);
    for (const sigma of [0.5, 0.1, 0.02]) {
      // Integrate g e^{-sigma t} on [0, 8] and add the exact tail of the constant g(inf).
      const head = simpson((t) => sig.g(t) * Math.exp(-sigma * t), 0, 8, 9600);
      const tail = (sig.gInfinity! * Math.exp(-sigma * 8)) / sigma;
      const analytic = integralTransform(sig, [sigma, 0])[0];
      expect(Math.abs(head + tail - analytic)).toBeLessThan(1e-6 * Math.max(1, analytic));
    }
  });
});

describe('sigma -> 0 limit', () => {
  it('Lorentzian sigma/(sigma^2+w^2) has area pi for every sigma', () => {
    for (const sigma of [1, 0.1, 0.01]) {
      const W = 2000 * sigma;
      const area = simpson((w) => lorentzian(sigma, w), -W, W, 40000);
      // Tails beyond |w| > W contribute 2 * atan-complement ~ 2 sigma / W.
      expect(area).toBeCloseTo(Math.PI - 2 * Math.atan(sigma / W) * 1, 3);
    }
  });

  it('Im G(sigma + j w) -> -F(0)/w for w away from 0', () => {
    const sig = dampedSineSignal(1, 2);
    const F0 = sig.gInfinity!;
    const w = 0.05;
    const G = integralTransform(sig, [1e-6, w]);
    // Near w -> 0: G ~ F(0)/(j w) = -j F(0)/w up to O(1) corrections.
    expect(G[1] * w).toBeCloseTo(-F0, 1);
  });
});
