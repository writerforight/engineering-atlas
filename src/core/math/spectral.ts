/**
 * Discrete spectra of sampled signals: FFT, the angular-frequency grid, the
 * spectral derivative / integral and the backward difference, plus the test
 * signals and accuracy checks of the fourier-derivative topic.
 *
 * Convention: X_k = Σ_n x_n e^{-2πi kn/N}, x_n = (1/N) Σ_k X_k e^{+2πi kn/N}.
 * Then a periodic f with samples x_n = f(nTs) satisfies F{f'}_k = iω_k X_k
 * exactly whenever f is band-limited below Nyquist.
 */

/** Split real / imaginary arrays (avoids allocating a tuple per bin). */
export interface Spectrum {
  re: Float64Array;
  im: Float64Array;
}

export const isPow2 = (n: number) => n > 0 && (n & (n - 1)) === 0;

/** In-place iterative radix-2 FFT; `inverse` uses e^{+i...} and divides by N. */
function fftInPlace(re: Float64Array, im: Float64Array, inverse: boolean) {
  const n = re.length;
  if (!isPow2(n)) throw new Error(`FFT length must be a power of two, got ${n}`);
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j]!, re[i]!];
      [im[i], im[j]] = [im[j]!, im[i]!];
    }
  }
  const sign = inverse ? 1 : -1;
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1;
    for (let k = 0; k < half; k++) {
      // Twiddles from cos/sin directly (not by repeated multiplication) keep the error near 1e-16.
      const a = (sign * 2 * Math.PI * k) / len;
      const wr = Math.cos(a);
      const wi = Math.sin(a);
      for (let s = 0; s < n; s += len) {
        const p = s + k;
        const q = p + half;
        const tr = re[q]! * wr - im[q]! * wi;
        const ti = re[q]! * wi + im[q]! * wr;
        re[q] = re[p]! - tr;
        im[q] = im[p]! - ti;
        re[p] = re[p]! + tr;
        im[p] = im[p]! + ti;
      }
    }
  }
  if (inverse) {
    for (let i = 0; i < n; i++) {
      re[i] = re[i]! / n;
      im[i] = im[i]! / n;
    }
  }
}

export function fft(x: ArrayLike<number>): Spectrum {
  const re = Float64Array.from(x);
  const im = new Float64Array(re.length);
  fftInPlace(re, im, false);
  return { re, im };
}

/** Inverse FFT of a spectrum that should belong to a real signal: returns the real part. */
export function ifftReal(X: Spectrum): Float64Array {
  const re = Float64Array.from(X.re);
  const im = Float64Array.from(X.im);
  fftInPlace(re, im, true);
  return re;
}

/**
 * ω_k = 2π · fftfreq(N, Ts).
 * PITFALL: bins k > N/2 are NEGATIVE frequencies (k − N); they are not "high" positive ones.
 * Bin N/2 (Nyquist) is listed as negative, like numpy; it is zeroed before differentiating anyway.
 */
export function omegaGrid(N: number, Ts: number): Float64Array {
  const w = new Float64Array(N);
  for (let k = 0; k < N; k++) w[k] = (2 * Math.PI * (k < N / 2 ? k : k - N)) / (N * Ts);
  return w;
}

/**
 * X' = iω X, back to time.
 * The Nyquist bin is set to 0: its two "copies" ±ω_N would need iω and −iω at once, so iω X there
 * would make the result complex. For a real band-limited signal that bin carries nothing anyway.
 */
export function spectralDerivative(x: ArrayLike<number>, Ts: number): { dx: Float64Array; X: Spectrum; dX: Spectrum } {
  const N = x.length;
  const X = fft(x);
  const w = omegaGrid(N, Ts);
  const dX: Spectrum = { re: new Float64Array(N), im: new Float64Array(N) };
  for (let k = 0; k < N; k++) {
    if (k === N / 2) continue;
    // i·ω·(a + ib) = −ωb + iωa
    dX.re[k] = -w[k]! * X.im[k]!;
    dX.im[k] = w[k]! * X.re[k]!;
  }
  return { dx: ifftReal(dX), X, dX };
}

/**
 * X / (iω), back to time: the zero-mean antiderivative.
 * DC is set to 0: 1/(i·0) has no value, and a non-zero mean would integrate to a ramp,
 * which is not periodic and so cannot live in a DFT. Callers should pass a zero-mean signal.
 */
export function spectralIntegral(x: ArrayLike<number>, Ts: number): { ix: Float64Array; X: Spectrum; iX: Spectrum } {
  const N = x.length;
  const X = fft(x);
  const w = omegaGrid(N, Ts);
  const iX: Spectrum = { re: new Float64Array(N), im: new Float64Array(N) };
  for (let k = 1; k < N; k++) {
    if (k === N / 2) continue;
    // (a + ib) / (iω) = b/ω − i a/ω
    iX.re[k] = X.im[k]! / w[k]!;
    iX.im[k] = -X.re[k]! / w[k]!;
  }
  return { ix: ifftReal(iX), X, iX };
}

/**
 * Backward difference (x[n] − x[n−1]) / Ts, periodic (x[−1] = x[N−1]) so it has an exact DFT:
 * multiplier (1 − e^{−iωTs}) / Ts, magnitude (2/Ts)|sin(ωTs/2)|, phase π/2 − ωTs/2.
 */
export function backwardDifference(x: ArrayLike<number>, Ts: number): Float64Array {
  const N = x.length;
  const d = new Float64Array(N);
  for (let n = 0; n < N; n++) d[n] = (x[n]! - x[(n - 1 + N) % N]!) / Ts;
  return d;
}

/** |multiplier| of the backward difference at ω. */
export const backwardGain = (w: number, Ts: number) => (2 / Ts) * Math.abs(Math.sin((w * Ts) / 2));

export const magnitude = (X: Spectrum, k: number) => Math.hypot(X.re[k]!, X.im[k]!);

/** Wrap an angle to (−π, π]. */
export function wrapAngle(a: number): number {
  const t = a - 2 * Math.PI * Math.floor((a + Math.PI) / (2 * Math.PI));
  return t === -Math.PI ? Math.PI : t;
}

/** arg B_k − arg A_k computed as arg(B_k · conj(A_k)) (no wrap-around jumps). */
export function phaseDifference(A: Spectrum, B: Spectrum, k: number): number {
  const re = B.re[k]! * A.re[k]! + B.im[k]! * A.im[k]!;
  const im = B.im[k]! * A.re[k]! - B.re[k]! * A.im[k]!;
  return Math.atan2(im, re);
}

/**
 * Bins whose |X| exceeds `rel` × max|X| (DC and Nyquist excluded).
 * PITFALL: the phase of a bin holding only round-off (|X| ~ 1e-16 · max) is random, so phase and
 * ratio plots must use only these bins; otherwise the "phase of nothing" fills the plot with noise.
 */
export function energeticBins(X: Spectrum, rel = 1e-6): number[] {
  const N = X.re.length;
  let max = 0;
  for (let k = 0; k < N; k++) max = Math.max(max, magnitude(X, k));
  const out: number[] = [];
  for (let k = 1; k < N; k++) if (k !== N / 2 && magnitude(X, k) > rel * max) out.push(k);
  return out;
}

export interface DerivativeCheck {
  /** max_k | |F'_k| − |ω_k||F_k| | / max_k |ω_k||F_k| over all bins except Nyquist. */
  magRelErr: number;
  /** max over energetic bins of | (arg F'_k − arg F_k) − sign(ω_k)·π/2 |. */
  phaseErr: number;
}

/**
 * The identity F{f'} = iω F checked on actual spectra: F' is the FFT of the derivative signal
 * (round trip through time), not the multiplied array itself.
 */
export function checkDerivative(x: ArrayLike<number>, dx: ArrayLike<number>, Ts: number, rel = 1e-6): DerivativeCheck {
  const N = x.length;
  const X = fft(x);
  const D = fft(dx);
  const w = omegaGrid(N, Ts);
  let worst = 0;
  let scale = 0;
  for (let k = 0; k < N; k++) {
    if (k === N / 2) continue;
    const target = Math.abs(w[k]!) * magnitude(X, k);
    worst = Math.max(worst, Math.abs(magnitude(D, k) - target));
    scale = Math.max(scale, target);
  }
  let phaseErr = 0;
  for (const k of energeticBins(X, rel)) {
    phaseErr = Math.max(phaseErr, Math.abs(phaseDifference(X, D, k) - Math.sign(w[k]!) * (Math.PI / 2)));
  }
  return { magRelErr: scale > 0 ? worst / scale : 0, phaseErr };
}

/** Same check for the integral: |F_int| = |F|/|ω|, phase −sign(ω)·π/2. */
export function checkIntegral(x: ArrayLike<number>, ix: ArrayLike<number>, Ts: number, rel = 1e-6): DerivativeCheck {
  const N = x.length;
  const X = fft(x);
  const I = fft(ix);
  const w = omegaGrid(N, Ts);
  let worst = 0;
  let scale = 0;
  for (let k = 1; k < N; k++) {
    if (k === N / 2) continue;
    const target = magnitude(X, k) / Math.abs(w[k]!);
    worst = Math.max(worst, Math.abs(magnitude(I, k) - target));
    scale = Math.max(scale, target);
  }
  let phaseErr = 0;
  for (const k of energeticBins(X, rel)) {
    phaseErr = Math.max(phaseErr, Math.abs(phaseDifference(X, I, k) + Math.sign(w[k]!) * (Math.PI / 2)));
  }
  return { magRelErr: scale > 0 ? worst / scale : 0, phaseErr };
}

export const seriesMaxDiff = (a: ArrayLike<number>, b: ArrayLike<number>) => {
  let m = 0;
  for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i]! - b[i]!));
  return m;
};

export const seriesMaxAbs = (a: ArrayLike<number>) => {
  let m = 0;
  for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i]!));
  return m;
};

// ---------------------------------------------------------------------------
// Test signals on the window t ∈ [0, N·Ts)
// ---------------------------------------------------------------------------

export interface SampledSignal {
  x: Float64Array;
  /** Exact f'(t_n), when known in closed form. */
  dx: Float64Array | null;
  /** Exact zero-mean antiderivative at t_n, when known. */
  ix: Float64Array | null;
}

/**
 * A1 sin(2π c1 t/T) + A2 sin(2π c2 t/T), T = N·Ts, with c cycles in the window.
 * With integer c the window holds whole periods: each sine lands exactly on one bin pair.
 * PITFALL (leakage): with fractional c the periodic extension jumps at the window edge, the
 * energy smears over all bins, and the derivative spikes at the edges (Gibbs).
 */
export function twoSines(N: number, Ts: number, c1: number, c2: number, A1 = 1, A2 = 0.3): SampledSignal {
  const T = N * Ts;
  const w1 = (2 * Math.PI * c1) / T;
  const w2 = (2 * Math.PI * c2) / T;
  const x = new Float64Array(N);
  const dx = new Float64Array(N);
  const ix = new Float64Array(N);
  for (let n = 0; n < N; n++) {
    const t = n * Ts;
    x[n] = A1 * Math.sin(w1 * t) + A2 * Math.sin(w2 * t);
    dx[n] = A1 * w1 * Math.cos(w1 * t) + A2 * w2 * Math.cos(w2 * t);
    // −A cos(ωt)/ω has zero mean over whole periods; only then is it the DFT's antiderivative.
    ix[n] = -(A1 / w1) * Math.cos(w1 * t) - (A2 / w2) * Math.cos(w2 * t);
  }
  return { x, dx, ix };
}

/**
 * exp(−(t − T/2)² / 2σ²) with σ = width·T.
 * Small widths decay to ~0 at the window edges, so the periodic assumption costs nothing.
 * PITFALL: a wide pulse does not decay, its periodic copies meet with a kink and the spectral
 * derivative rings at the edges (Gibbs).
 */
export function gaussPulse(N: number, Ts: number, width: number): SampledSignal {
  const T = N * Ts;
  const s = width * T;
  const x = new Float64Array(N);
  const dx = new Float64Array(N);
  for (let n = 0; n < N; n++) {
    const u = n * Ts - T / 2;
    const g = Math.exp(-(u * u) / (2 * s * s));
    x[n] = g;
    dx[n] = (-u / (s * s)) * g;
  }
  return { x, dx, ix: null };
}

/** Seeded white Gaussian noise (Park–Miller + Box–Muller), so slider moves don't reshuffle it. */
export function whiteNoise(N: number, sigma: number, seed = 7): Float64Array {
  let s = seed >>> 0 || 1;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const out = new Float64Array(N);
  for (let n = 0; n < N; n++) {
    const u = Math.max(rnd(), 1e-300);
    out[n] = sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd());
  }
  return out;
}

export function removeMean(x: ArrayLike<number>): Float64Array {
  let m = 0;
  for (let i = 0; i < x.length; i++) m += x[i]!;
  m /= x.length;
  return Float64Array.from(x, (v) => v - m);
}
