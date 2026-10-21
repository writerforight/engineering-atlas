import { describe, expect, it } from 'vitest';
import {
  backwardDifference,
  backwardGain,
  checkDerivative,
  checkIntegral,
  energeticBins,
  fft,
  gaussPulse,
  ifftReal,
  magnitude,
  seriesMaxAbs,
  seriesMaxDiff,
  omegaGrid,
  phaseDifference,
  removeMean,
  spectralDerivative,
  spectralIntegral,
  twoSines,
  whiteNoise,
} from './spectral';

const GRIDS: Array<[number, number]> = [
  [64, 0.05],
  [256, 0.01],
  [1024, 0.002],
  [2048, 0.001],
];

describe('FFT basics', () => {
  it('matches a direct DFT and round-trips', () => {
    const x = Array.from({ length: 16 }, (_, n) => Math.sin(n) + 0.3 * n);
    const X = fft(x);
    for (let k = 0; k < 16; k++) {
      let re = 0;
      let im = 0;
      for (let n = 0; n < 16; n++) {
        re += x[n]! * Math.cos((-2 * Math.PI * k * n) / 16);
        im += x[n]! * Math.sin((-2 * Math.PI * k * n) / 16);
      }
      expect(X.re[k]).toBeCloseTo(re, 12);
      expect(X.im[k]).toBeCloseTo(im, 12);
    }
    expect(seriesMaxDiff(ifftReal(X), x)).toBeLessThan(1e-13);
  });

  it('omega grid: bins above N/2 are negative frequencies', () => {
    const w = omegaGrid(8, 0.5);
    const step = (2 * Math.PI) / 4;
    expect(Array.from(w)).toEqual([0, 1, 2, 3, -4, -3, -2, -1].map((k) => k * step));
  });
});

describe('done criteria: |F′| = |ω||F| (rel. err < 1e-10) and phase ±π/2 (within 1e-8)', () => {
  for (const [N, Ts] of GRIDS) {
    it(`two sines, N=${N}, Ts=${Ts}`, () => {
      const s = twoSines(N, Ts, 3, Math.min(17, N / 4 - 1));
      const { dx } = spectralDerivative(s.x, Ts);
      const c = checkDerivative(s.x, dx, Ts);
      expect(c.magRelErr).toBeLessThan(1e-10);
      expect(c.phaseErr).toBeLessThan(1e-8);
      expect(seriesMaxDiff(dx, s.dx!) / seriesMaxAbs(s.dx!)).toBeLessThan(1e-10);
    });

    it(`Gauss pulse, N=${N}, Ts=${Ts}`, () => {
      const s = gaussPulse(N, Ts, 0.05);
      const { dx } = spectralDerivative(s.x, Ts);
      const c = checkDerivative(s.x, dx, Ts);
      expect(c.magRelErr).toBeLessThan(1e-10);
      expect(c.phaseErr).toBeLessThan(1e-8);
      expect(seriesMaxDiff(dx, s.dx!) / seriesMaxAbs(s.dx!)).toBeLessThan(1e-9);
    });
  }
});

describe('independent check: FFT of the sampled analytic f′ equals iω·F (the theorem, not the implementation)', () => {
  for (const [N, Ts] of GRIDS) {
    it(`two sines and Gauss pulse, N=${N}, Ts=${Ts}`, () => {
      for (const s of [twoSines(N, Ts, 3, Math.min(17, N / 4 - 1)), gaussPulse(N, Ts, 0.05)]) {
        const c = checkDerivative(s.x, s.dx!, Ts);
        expect(c.magRelErr).toBeLessThan(1e-10);
        expect(c.phaseErr).toBeLessThan(1e-8);
      }
    });
  }

  it('with leakage the analytic f′ no longer matches iωF (plots B and D break)', () => {
    const s = twoSines(256, 0.01, 3.4, 17.4);
    const c = checkDerivative(s.x, s.dx!, 0.01);
    expect(c.magRelErr).toBeGreaterThan(1e-3);
    expect(c.phaseErr).toBeGreaterThan(0.1);
  });
});

describe('integral: |F_int| = |F|/|ω|, phase −π/2 (DC excluded)', () => {
  it('two sines match the analytic zero-mean antiderivative', () => {
    const N = 512;
    const Ts = 0.01;
    const s = twoSines(N, Ts, 4, 21);
    const { ix } = spectralIntegral(s.x, Ts);
    const c = checkIntegral(s.x, ix, Ts);
    expect(c.magRelErr).toBeLessThan(1e-10);
    expect(c.phaseErr).toBeLessThan(1e-8);
    expect(seriesMaxDiff(ix, s.ix!) / seriesMaxAbs(s.ix!)).toBeLessThan(1e-10);
  });

  it('Gauss pulse (mean removed): differentiating the integral gives the signal back', () => {
    const Ts = 0.01;
    const x = removeMean(gaussPulse(512, Ts, 0.05).x);
    const { ix } = spectralIntegral(x, Ts);
    expect(checkIntegral(x, ix, Ts).phaseErr).toBeLessThan(1e-8);
    expect(seriesMaxDiff(spectralDerivative(ix, Ts).dx, x)).toBeLessThan(1e-12);
  });
});

describe('backward difference', () => {
  it('its spectrum is (2/Ts)|sin(ωTs/2)| · |F|, flattening below |ω| towards Nyquist', () => {
    const N = 256;
    const Ts = 0.01;
    const s = twoSines(N, Ts, 5, 90);
    const X = fft(s.x);
    const D = fft(backwardDifference(s.x, Ts));
    const w = omegaGrid(N, Ts);
    for (const k of energeticBins(X)) {
      expect(magnitude(D, k) / magnitude(X, k)).toBeCloseTo(backwardGain(w[k]!, Ts), 8);
      expect(phaseDifference(X, D, k)).toBeCloseTo(Math.sign(w[k]!) * (Math.PI / 2) - (w[k]! * Ts) / 2, 8);
    }
    // 90 cycles of 256 samples: gain / |ω| = sin(x)/x with x = π·90/256, i.e. about 19 % too small.
    const k90 = 90;
    const x = (Math.PI * 90) / 256;
    expect(backwardGain(w[k90]!, Ts) / Math.abs(w[k90]!)).toBeCloseTo(Math.sin(x) / x, 12);
    expect(Math.sin(x) / x).toBeLessThan(0.82);
  });
});

describe('pitfalls behave as described', () => {
  it('leakage: fractional cycles spread energy over many bins and break the time-domain match', () => {
    const N = 256;
    const Ts = 0.01;
    const whole = twoSines(N, Ts, 3, 17);
    const frac = twoSines(N, Ts, 3.4, 17.4);
    expect(energeticBins(fft(whole.x), 1e-6).length).toBe(4);
    expect(energeticBins(fft(frac.x), 1e-6).length).toBeGreaterThan(100);
    const d = spectralDerivative(frac.x, Ts).dx;
    expect(seriesMaxDiff(d, frac.dx!) / seriesMaxAbs(frac.dx!)).toBeGreaterThan(0.1);
  });

  it('noise: the derivative amplifies it, more so for the spectral method than the difference', () => {
    const N = 1024;
    const Ts = 0.001;
    const s = twoSines(N, Ts, 3, 17);
    const noise = whiteNoise(N, 0.01);
    const noisy = s.x.map((v, n) => v + noise[n]!);
    const spec = seriesMaxDiff(spectralDerivative(noisy, Ts).dx, s.dx!);
    const diff = seriesMaxDiff(backwardDifference(noisy, Ts), s.dx!);
    expect(spec / seriesMaxAbs(s.dx!)).toBeGreaterThan(10 * (0.01 / seriesMaxAbs(s.x)));
    expect(spec).toBeGreaterThan(diff);
  });

  it('round-off bins: phase on bins below the threshold is meaningless', () => {
    const s = twoSines(256, 0.01, 3, 17);
    const X = fft(s.x);
    const D = fft(spectralDerivative(s.x, 0.01).dx);
    const quiet = Array.from({ length: 127 }, (_, i) => i + 1).filter((k) => !energeticBins(X).includes(k));
    const worst = Math.max(...quiet.map((k) => Math.abs(phaseDifference(X, D, k) - Math.PI / 2)));
    expect(worst).toBeGreaterThan(1e-3);
  });
});
