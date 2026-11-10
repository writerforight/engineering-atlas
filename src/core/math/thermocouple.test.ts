import { describe, expect, it } from 'vitest';
import { errorCurve, linspace } from './interpolation';
import { THERMO_RANGE, thermoCalibrator, thermoE, thermoT } from './thermocouple';

describe('type K thermocouple', () => {
  it('T(E) inverts E(T) on 0…500 °C', () => {
    for (const T of [0, 1, 50, 123.4, 250, 499.9, 500]) expect(thermoT(thermoE(T))).toBeCloseTo(T, 9);
    expect(THERMO_RANGE[1]).toBeCloseTo(20.644, 3); // NIST table: 20.644 mV at 500 °C
  });

  it('calibrator values are within 0.005 °C of the exact temperature', () => {
    for (const E of linspace(...THERMO_RANGE, 57)) expect(Math.abs(thermoCalibrator(E) - thermoT(E))).toBeLessThanOrEqual(0.005 + 1e-12);
  });

  it('PP2 behaviour: equidistant never reaches 0.1 °C, Chebyshev does from degree 9 on; data error ≤ Λ·δ', () => {
    const [a, b] = THERMO_RANGE;
    const grid = linspace(a, b, 2000);
    const curve = (kind: 'equi' | 'cheb') => errorCurve(thermoCalibrator, kind, grid, 2, 41, a, b, thermoT);
    const eq = curve('equi'), ch = curve('cheb');
    expect(Math.min(...eq.map((p) => p.max))).toBeGreaterThan(0.1);
    const first = ch.find((p) => p.max < 0.1)!;
    expect(first.n - 1).toBe(9); // n = node count, degree = n − 1
    for (const p of [...eq, ...ch]) expect(p.data).toBeLessThanOrEqual(p.lebesgue * 0.005 * 1.01);
  });
});
