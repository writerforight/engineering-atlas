import { cdiv, cexp, cmul, type Complex } from './complex';
import { cumulativeTrapezoid, simpson } from './integrate';

/**
 * Causal test signals f(t) (f = 0 for t < 0) together with their running
 * integral g(t) = int_0^t f and Laplace transforms F(s), G(s) = F(s)/s.
 */
export interface CausalSignal {
  id: string;
  f: (t: number) => number;
  /** g(t) = int_0^t f(tau) d tau */
  g: (t: number) => number;
  /** F(s) */
  F: (s: Complex) => Complex;
  /** Abscissa of convergence of F: the integral converges for Re s > rocF. */
  rocF: number;
  /** lim_{t->inf} g(t) = F(0) when it exists, otherwise null. */
  gInfinity: number | null;
}

/** G(s) = F(s) / s with ROC Re s > max(rocF, 0). */
export function integralTransform(sig: CausalSignal, s: Complex): Complex {
  return cdiv(sig.F(s), s);
}

export function rocG(sig: CausalSignal): number {
  return Math.max(sig.rocF, 0);
}

const pos = (t: number) => t >= 0;

export function stepSignal(): CausalSignal {
  return {
    id: 'step',
    f: (t) => (pos(t) ? 1 : 0),
    g: (t) => (pos(t) ? t : 0),
    F: (s) => cdiv([1, 0], s),
    rocF: 0,
    gInfinity: null,
  };
}

export function rampSignal(): CausalSignal {
  return {
    id: 'ramp',
    f: (t) => (pos(t) ? t : 0),
    g: (t) => (pos(t) ? (t * t) / 2 : 0),
    F: (s) => cdiv([1, 0], cmul(s, s)),
    rocF: 0,
    gInfinity: null,
  };
}

/** f(t) = e^{-alpha t} sin(w0 t), F(s) = w0 / ((s + alpha)^2 + w0^2). */
export function dampedSineSignal(alpha: number, w0: number): CausalSignal {
  const k = alpha * alpha + w0 * w0;
  return {
    id: 'damped-sine',
    f: (t) => (pos(t) ? Math.exp(-alpha * t) * Math.sin(w0 * t) : 0),
    g: (t) =>
      pos(t)
        ? (w0 - Math.exp(-alpha * t) * (alpha * Math.sin(w0 * t) + w0 * Math.cos(w0 * t))) / k
        : 0,
    F: (s) => {
      const sp: Complex = [s[0] + alpha, s[1]];
      return cdiv([w0, 0], [sp[0] * sp[0] - sp[1] * sp[1] + w0 * w0, 2 * sp[0] * sp[1]]);
    },
    rocF: -alpha,
    gInfinity: alpha > 0 ? w0 / k : null,
  };
}

/**
 * User-drawn signal: piecewise-linear through samples ys on [0, duration],
 * zero afterwards. Finite support makes F entire (rocF = -inf); its transform
 * is evaluated numerically, which is exact up to quadrature error.
 */
export function drawnSignal(ys: readonly number[], duration: number): CausalSignal {
  const n = ys.length - 1;
  const h = duration / n;
  const f = (t: number) => {
    if (t < 0 || t > duration || n < 1) return 0;
    const x = t / h;
    const k = Math.min(Math.floor(x), n - 1);
    const u = x - k;
    return ys[k]! * (1 - u) + ys[k + 1]! * u;
  };
  const gs = cumulativeTrapezoid(ys, h);
  const total = gs[n] ?? 0;
  const g = (t: number) => {
    if (t <= 0) return 0;
    if (t >= duration) return total;
    // Exact integral of the linear interpolant on the partial panel.
    const x = t / h;
    const k = Math.min(Math.floor(x), n - 1);
    const u = x - k;
    const fk = ys[k]!;
    const fk1 = ys[k + 1]!;
    return gs[k]! + h * (fk * u + (fk1 - fk) * u * u * 0.5);
  };
  const F = (s: Complex): Complex => {
    const [sg, w] = s;
    const panels = Math.max(400, 2 * n);
    return [
      simpson((t) => f(t) * Math.exp(-sg * t) * Math.cos(w * t), 0, duration, panels),
      simpson((t) => -f(t) * Math.exp(-sg * t) * Math.sin(w * t), 0, duration, panels),
    ];
  };
  return { id: 'drawn', f, g, F, rocF: -Infinity, gInfinity: total };
}

/**
 * The sigma -> 0 limit of G(sigma + j w) = F(sigma + j w) / (sigma + j w).
 * Near w = 0, F ~ F(0) and 1/(sigma + j w) = (sigma - j w)/(sigma^2 + w^2):
 * the real part is a Lorentzian of area pi F(0) (-> pi F(0) delta(w)), the
 * imaginary part tends to -F(0)/w, i.e. F(0)/(j w).
 */
export function lorentzian(sigma: number, w: number): number {
  return sigma / (sigma * sigma + w * w);
}

/** Phasor e^{-s T}, handy for tail corrections. */
export function expMinus(s: Complex, T: number): Complex {
  return cexp([-s[0] * T, -s[1] * T]);
}

