// Type K thermocouple, 0…500 °C: temperature T(E) from the thermovoltage E (mV).
// NIST ITS-90 reference function E(T) for T ≥ 0 °C, inverted with Newton's method.

const C = [
  -0.176004136860e-01, 0.389212049750e-01, 0.185587700320e-04, -0.994575928740e-07, 0.318409457190e-09,
  -0.560728448890e-12, 0.560750590590e-15, -0.320207200030e-18, 0.971511471520e-22, -0.121047212750e-25,
];
const A0 = 0.118597600000e+00, A1 = -0.118343200000e-03, A2 = 0.126968600000e+03;
// NIST inverse polynomial (0…500 °C, ±0.05 °C), only used as Newton start value
const D = [0, 2.508355e1, 7.860106e-2, -2.503131e-1, 8.315270e-2, -1.228034e-2, 9.804036e-4, -4.413030e-5,
  1.057734e-6, -1.052755e-8];

const horner = (c: readonly number[], x: number) => c.reduceRight((s, ci) => s * x + ci, 0);

/** Thermovoltage E(T) in mV for T in °C (T ≥ 0). */
export function thermoE(T: number): number {
  return horner(C, T) + A0 * Math.exp(A1 * (T - A2) ** 2);
}

function thermoDE(T: number): number {
  let d = 0;
  for (let k = C.length - 1; k >= 1; k--) d = d * T + k * C[k]!;
  return d + A0 * Math.exp(A1 * (T - A2) ** 2) * 2 * A1 * (T - A2);
}

/** Exact temperature T(E) in °C for E in mV (inverse of thermoE). */
export function thermoT(E: number): number {
  let T = horner(D, E);
  for (let i = 0; i < 30; i++) {
    const step = (thermoE(T) - E) / thermoDE(T);
    T -= step;
    if (Math.abs(step) < 1e-13) break;
  }
  return T;
}

/** Calibrator display: exact temperature rounded to 0.01 °C (data error ≤ 0.005 °C). */
export function thermoCalibrator(E: number): number {
  return Math.round(thermoT(E) * 100) / 100;
}

/** Thermovoltage range for 0…500 °C. */
export const THERMO_RANGE: [number, number] = [0, thermoE(500)];
