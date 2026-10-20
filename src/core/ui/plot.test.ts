import { describe, expect, it } from 'vitest';
import { linearScale, makeViewport, niceTicks } from './plot';

describe('plot helpers', () => {
  it('linear scale round-trips', () => {
    const s = linearScale(-2, 3, 10, 110);
    expect(s(-2)).toBe(10);
    expect(s(3)).toBe(110);
    expect(s.invert(s(1.7))).toBeCloseTo(1.7, 12);
  });

  it('niceTicks returns round values within range', () => {
    expect(niceTicks(0, 10, 5)).toEqual([0, 2, 4, 6, 8, 10]);
    const t = niceTicks(-1.3, 2.7, 4);
    expect(t[0]).toBeGreaterThanOrEqual(-1.3);
    expect(t.at(-1)).toBeLessThanOrEqual(2.7);
    expect(t).toContain(0);
  });

  it('equal-aspect viewport keeps units isotropic', () => {
    const vp = makeViewport(400, 200, { x: [-1, 1], y: [-1, 1] }, { l: 0, r: 0, t: 0, b: 0 }, true);
    const kx = vp.x(1) - vp.x(0);
    const ky = vp.y(0) - vp.y(1);
    expect(kx).toBeCloseTo(ky, 9);
  });
});
