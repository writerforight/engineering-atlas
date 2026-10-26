import type { Mat } from './matrix';
import { whiteNoise } from './spectral';

/**
 * Real-valued QAM-OFDM over one symbol of length T = 1: subcarrier k (1..K) is the pair
 * cos(2πkt), sin(2πkt), and the coefficient matrix C (K×2) holds [a_k, b_k].
 */

/** Per-axis levels of square M-QAM: ±1, ±3, …, ±(√M − 1). */
export function qamLevels(M: number): number[] {
  const L = Math.round(Math.sqrt(M));
  return Array.from({ length: L }, (_, i) => 2 * i - (L - 1));
}

export function randomCoeffs(K: number, levels: readonly number[], rand: () => number = Math.random): Mat {
  const pick = () => levels[Math.floor(rand() * levels.length)]!;
  return Array.from({ length: K }, () => [pick(), pick()]);
}

/** s(t) = Σ a_k cos(2πkt) + b_k sin(2πkt). */
export function ofdmSignal(C: Mat, t: number): number {
  let s = 0;
  C.forEach(([a, b], i) => {
    const w = 2 * Math.PI * (i + 1) * t;
    s += a! * Math.cos(w) + b! * Math.sin(w);
  });
  return s;
}

/** Sampled basis Φ (N×2K): row n = t_n = n/N, columns cos₁, sin₁, cos₂, sin₂, … */
export function basisMatrix(K: number, N: number): Mat {
  return Array.from({ length: N }, (_, n) =>
    Array.from({ length: 2 * K }, (_, j) => {
      const w = (2 * Math.PI * (Math.floor(j / 2) + 1) * n) / N;
      return j % 2 === 0 ? Math.cos(w) : Math.sin(w);
    }),
  );
}

/** Transmitter: samples s = Φ · vec(C). */
export function transmit(Phi: Mat, C: Mat): number[] {
  const c = C.flat();
  return Phi.map((row) => row.reduce((acc, v, j) => acc + v * c[j]!, 0));
}

/**
 * Receiver: Ĉ = D⁻¹ Φᵀ s with D = diag(‖φ_j‖²). A column that sampled to all zeros carries
 * no information and is returned as NaN.
 */
export function receive(Phi: Mat, s: readonly number[]): Mat {
  const cols = Phi[0]?.length ?? 0;
  const out: number[] = [];
  for (let j = 0; j < cols; j++) {
    let dot = 0;
    let nrm = 0;
    Phi.forEach((row, n) => {
      dot += row[j]! * s[n]!;
      nrm += row[j]! * row[j]!;
    });
    out.push(nrm < 1e-9 ? NaN : dot / nrm);
  }
  return Array.from({ length: cols / 2 }, (_, k) => [out[2 * k]!, out[2 * k + 1]!]);
}

/** Plain O(N²) DFT X_k = Σ s_n e^{−2πikn/N}, any N. */
export function dft(s: readonly number[]): { re: number[]; im: number[] } {
  const N = s.length;
  const re: number[] = [];
  const im: number[] = [];
  for (let k = 0; k < N; k++) {
    let r = 0;
    let i = 0;
    s.forEach((v, n) => {
      const w = (2 * Math.PI * k * n) / N;
      r += v * Math.cos(w);
      i -= v * Math.sin(w);
    });
    re.push(r);
    im.push(i);
  }
  return { re, im };
}

/**
 * Receiver via DFT: X_k = (N/2)(a_k − i b_k) for 0 < k < N/2. At k = N/2 the sine is lost
 * (NaN) and X = N·a. Bins k > N/2 alias: read X_{k mod N}, like Φᵀ does.
 */
export function receiveDft(s: readonly number[], K: number): Mat {
  const N = s.length;
  const X = dft(s);
  return Array.from({ length: K }, (_, i) => {
    const k = (i + 1) % N;
    if (2 * k === N) return [X.re[k]! / N, NaN];
    if (k === 0) return [X.re[0]! / N, NaN];
    return [(2 * X.re[k]!) / N, (-2 * X.im[k]!) / N];
  });
}

/** Nearest QAM level (decision). */
export function decide(v: number, levels: readonly number[]): number {
  if (!Number.isFinite(v)) return NaN;
  return levels.reduce((best, l) => (Math.abs(l - v) < Math.abs(best - v) ? l : best), levels[0]!);
}

/**
 * Gray-coded bits of one QAM level: neighbouring levels differ in one bit, so a small
 * decision error costs one bit. Unknown (NaN) or off-grid levels give '?' bits.
 */
export function levelBits(v: number, levels: readonly number[]): string {
  const width = Math.round(Math.log2(levels.length));
  const i = levels.indexOf(v);
  if (i < 0) return '?'.repeat(width);
  return (i ^ (i >> 1)).toString(2).padStart(width, '0');
}

/** Bit groups of C, one string per subcarrier: bits of a_k then b_k. */
export function matrixBits(C: Mat, levels: readonly number[]): string[] {
  return C.map(([a, b]) => levelBits(a!, levels) + levelBits(b!, levels));
}

/** Inverse of levelBits: Gray-coded bit string → level. */
export function bitsToLevel(bits: string, levels: readonly number[]): number {
  let b = parseInt(bits, 2);
  for (let shift = b >> 1; shift > 0; shift >>= 1) b ^= shift;
  return levels[b]!;
}

/** C from a bit string of length K·2·log₂L: per subcarrier the bits of a_k then b_k. */
export function symbolFromBits(bits: string, K: number, levels: readonly number[]): Mat {
  const w = Math.round(Math.log2(levels.length));
  return Array.from({ length: K }, (_, k) => [
    bitsToLevel(bits.slice(2 * k * w, (2 * k + 1) * w), levels),
    bitsToLevel(bits.slice((2 * k + 1) * w, (2 * k + 2) * w), levels),
  ]);
}

export function randomBits(n: number, rand: () => number = Math.random): string {
  let s = '';
  for (let i = 0; i < n; i++) s += rand() < 0.5 ? '0' : '1';
  return s;
}

export interface SymbolRun {
  C: Mat;
  s: number[];
  /** Received samples s + σw. */
  r: number[];
  decided: Mat;
  rxBits: string;
  bitErrors: number;
}

/** One symbol through the whole chain: bits → C → Φc → + noise → D⁻¹Φᵀr → decision → bits. */
export function runSymbol(Phi: Mat, levels: readonly number[], bits: string, sigma: number, noiseSeed: number): SymbolRun {
  const K = (Phi[0]?.length ?? 0) / 2;
  const C = symbolFromBits(bits, K, levels);
  const s = transmit(Phi, C);
  const w = whiteNoise(s.length, 1, noiseSeed);
  const r = s.map((v, n) => v + sigma * w[n]!);
  const decided = receive(Phi, r).map((row) => row.map((v) => decide(v, levels)));
  const rxBits = matrixBits(decided, levels).join('');
  let bitErrors = 0;
  for (let i = 0; i < bits.length; i++) if (rxBits[i] !== bits[i]) bitErrors++;
  return { C, s, r, decided, rxBits, bitErrors };
}
