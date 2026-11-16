import { describe, expect, it } from 'vitest';
import {
  SYSTEMS, cartesianField, circleFlux, circulation, curl, divergence, frame, sphereFlux, type SystemId,
} from './vectorField';

const field = (id: SystemId, ...comps: ((q: number[]) => number)[]) => cartesianField(SYSTEMS[id], comps);

describe('coordinate systems', () => {
  it('fromCart inverts toCart and the basis is orthonormal', () => {
    const qs: Record<SystemId, number[]> = {
      cart2: [0.4, -1.2], polar: [1.3, 2.1], cart3: [0.4, -1.2, 0.7], cyl: [1.3, 4.0, -0.5], sph: [1.7, 0.9, 5.1],
    };
    for (const id of Object.keys(qs) as SystemId[]) {
      const s = SYSTEMS[id], q = qs[id];
      s.fromCart(s.toCart(q)).forEach((v, i) => expect(v).toBeCloseTo(q[i]!, 12));
      const E = s.basis(q);
      for (let i = 0; i < s.dim; i++)
        for (let j = 0; j < s.dim; j++)
          expect(E[i]!.reduce((a, v, k) => a + v * E[j]![k]!, 0)).toBeCloseTo(i === j ? 1 : 0, 12);
    }
  });
  it('frame is right-handed', () => {
    const [u, v, n] = frame([1, 2, 3]);
    expect(u[0]! * v[1]! - u[1]! * v[0]!).toBeCloseTo(n[2]!, 12);
  });
});

describe('divergence and curl', () => {
  it('Cartesian source and vortex', () => {
    const src = field('cart2', (q) => q[0]!, (q) => q[1]!);
    const vor = field('cart2', (q) => -q[1]!, (q) => q[0]!);
    expect(divergence(src, [0.3, 0.8])).toBeCloseTo(2, 6);
    expect(curl(src, [0.3, 0.8])[2]).toBeCloseTo(0, 6);
    expect(divergence(vor, [0.3, 0.8])).toBeCloseTo(0, 6);
    expect(curl(vor, [0.3, 0.8])[2]).toBeCloseTo(2, 6);
  });
  it('polar: e_r / r is source-free and e_phi / r is curl-free away from the origin', () => {
    const a = field('polar', (q) => 1 / q[0]!, () => 0);
    const b = field('polar', () => 0, (q) => 1 / q[0]!);
    expect(divergence(a, [0.9, -0.4])).toBeCloseTo(0, 5);
    expect(curl(b, [0.9, -0.4])[2]).toBeCloseTo(0, 5);
  });
  it('cylindrical rigid rotation r e_phi has curl 2 e_z', () => {
    const c = curl(field('cyl', () => 0, (q) => q[0]!, () => 0), [0.5, 0.7, 0.2]);
    expect(c[0]).toBeCloseTo(0, 6);
    expect(c[1]).toBeCloseTo(0, 6);
    expect(c[2]).toBeCloseTo(2, 6);
  });
  it('spherical r e_r has divergence 3', () => {
    expect(divergence(field('sph', (q) => q[0]!, () => 0, () => 0), [0.5, 0.7, 0.2])).toBeCloseTo(3, 6);
  });
});

describe('flux and circulation', () => {
  it('2D Gauss and Stokes: flux = div·πR², circulation = rot·πR² for linear fields', () => {
    const F = field('cart2', (q) => q[0]! - q[1]!, (q) => q[0]! + 0.5 * q[1]!);
    const R = 0.7, A = Math.PI * R * R;
    expect(circleFlux(F, [0.2, -0.3], R).total).toBeCloseTo(1.5 * A, 9);
    expect(circulation(F, [0.2, -0.3], R).total).toBeCloseTo(2 * A, 9);
  });
  it('e_r / r: flux 2π if the circle encloses the origin, else 0', () => {
    const F = field('polar', (q) => 1 / q[0]!, () => 0);
    expect(circleFlux(F, [0.2, 0.1], 1).total).toBeCloseTo(2 * Math.PI, 6);
    expect(circleFlux(F, [2, 0], 0.8).total).toBeCloseTo(0, 6);
  });
  it('e_phi / r: circulation 2π around the axis', () => {
    const F = field('cyl', () => 0, (q) => 1 / q[0]!, () => 0);
    expect(circulation(F, [0.1, 0.2, 0.4], 1, [0, 0, 1]).total).toBeCloseTo(2 * Math.PI, 6);
    expect(circulation(F, [0.1, 0.2, 0.4], 1, [1, 0, 0]).total).toBeCloseTo(0, 6);
  });
  it('e_r / r²: flux 4π through any sphere around the origin; r e_r: flux 3·volume', () => {
    const q = field('sph', (v) => 1 / v[0]! ** 2, () => 0, () => 0);
    expect(sphereFlux(q, [0.2, -0.1, 0.3], 1, [0, 0, 1]).total).toBeCloseTo(4 * Math.PI, 2);
    expect(sphereFlux(q, [2, 0, 0], 0.8, [1, 1, 0]).total).toBeCloseTo(0, 3);
    const s = field('sph', (v) => v[0]!, () => 0, () => 0);
    expect(sphereFlux(s, [0.3, 0.2, -0.4], 0.6).total).toBeCloseTo(4 * Math.PI * 0.6 ** 3, 3);
  });
  it('running integral ends at the total', () => {
    const s = circulation(field('cart2', (q) => -q[1]!, (q) => q[0]!), [0, 0], 1);
    expect(s.cum[s.cum.length - 1]).toBe(s.total);
    expect(s.cum[s.cum.length / 2 - 1]).toBeCloseTo(s.total / 2, 9);
  });
});
