// Success criteria of the p-n junction simulation, checked headless on the
// same classic-script core the page uses (public/pn-junction/sim.js).
// Fixed seeds; shorter runs than check.mjs to keep CI fast.
import { describe, expect, it } from 'vitest';
import source from '../../../public/pn-junction/sim.js?raw';

interface Measure {
  Vbi: number;
  W: number;
  Emax: number;
  Qn: number;
  Qp: number;
  QtotRel: number;
  npN: number;
  npP: number;
  theory: { Vbi: number; W: number };
}
interface Sim {
  step(n: number): void;
  contact(): void;
  resetCum(): void;
  setParams(p: Record<string, number>): void;
  measure(which: 'avg' | 'cum'): Measure;
  ions(): { n: number; x: Float64Array };
  params: { Lx: number };
}
interface PNApi {
  create(o?: Record<string, number>): Sim;
  theory(ND: number, NA: number, T: number, V: number): { Vbi: number; W: number; Wkt: number };
  poissonBoltzmann(ND: number, NA: number, T: number, V: number, Lx: number): { W: number; drop: number };
}

const root: { PNSim?: PNApi } = {};
new Function('globalThis', source)(root);
const PN = root.PNSim as PNApi;

describe('p-n junction particle simulation', () => {
  it('analytic reference: V_bi, W and the Poisson-Boltzmann solution', () => {
    const th = PN.theory(30, 30, 300, 0);
    expect(th.Vbi).toBeCloseTo(Math.log(900), 10);
    expect(th.W).toBeCloseTo(Math.sqrt(2 * (2 / 30) * Math.log(900)), 10);
    const pb = PN.poissonBoltzmann(30, 30, 300, 0, 6);
    expect(pb.drop).toBeCloseTo(th.Vbi, 1);
    expect(pb.W / th.Wkt).toBeGreaterThan(0.97);
    expect(pb.W / th.Wkt).toBeLessThan(1.03);
  });

  it(
    'equilibrium: zone forms by itself, V_bi and W match theory, charge balanced, n p = n_i^2',
    () => {
      const sim = PN.create({ seed: 1 });
      sim.step(1000);
      const before = sim.measure('avg');
      const ions0 = Float64Array.from(sim.ions().x.subarray(0, sim.ions().n));
      sim.contact();
      sim.step(12000);
      sim.resetCum();
      sim.step(8000);
      const m = sim.measure('cum');
      const pb = PN.poissonBoltzmann(30, 30, 300, 0, sim.params.Lx);

      expect(before.Emax).toBeLessThan(0.15 * m.Emax); // criterion 1
      expect(Math.abs(m.Vbi / m.theory.Vbi - 1)).toBeLessThan(0.15); // criterion 2
      expect(Math.abs(m.W / pb.W - 1)).toBeLessThan(0.15); // criterion 2 (vs exact theory; see Theory)
      expect(Math.abs(m.W / m.theory.W - 1)).toBeLessThan(0.3); // depletion formula: Debye tails
      expect(Math.abs(m.QtotRel)).toBeLessThan(0.01); // criterion 3
      expect(Math.abs(m.Qn / m.Qp - 1)).toBeLessThan(0.1); // N_D x_n = N_A x_p
      expect(m.npN).toBeGreaterThan(0.5);
      expect(m.npN).toBeLessThan(2);
      expect(m.npP).toBeGreaterThan(0.5);
      expect(m.npP).toBeLessThan(2);
      const ions1 = sim.ions().x.subarray(0, sim.ions().n);
      expect(Array.from(ions1)).toEqual(Array.from(ions0)); // fixed ions stay put
    },
    240_000,
  );

  it(
    'bias: reverse widens W, forward narrows it, as the theory says',
    () => {
      const sim = PN.create({ seed: 7 });
      sim.contact();
      sim.step(10000);
      const W: Record<number, number> = {};
      for (const V of [-5, 2]) {
        sim.setParams({ V });
        sim.step(6000);
        sim.resetCum();
        sim.step(6000);
        W[V] = sim.measure('cum').W;
      }
      const pbR = PN.poissonBoltzmann(30, 30, 300, -5, 6).W;
      const pbF = PN.poissonBoltzmann(30, 30, 300, 2, 6).W;
      expect(W[-5]!).toBeGreaterThan(W[2]! * 1.3);
      expect(Math.abs(W[-5]! / W[2]! / (pbR / pbF) - 1)).toBeLessThan(0.15);
    },
    240_000,
  );
});
