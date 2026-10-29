import { describe, expect, it } from 'vitest';
import { compile, evalConst, ExprError, principalAxes3 } from './expr';

const ev = (src: string, vals: Record<string, number> = {}) => {
  const names = Object.keys(vals);
  return compile(src, names).fn(names.map((n) => vals[n]!));
};

describe('compile', () => {
  it('precedence and associativity', () => {
    expect(ev('1+2*3')).toBe(7);
    expect(ev('2^3^2')).toBe(512);
    expect(ev('-2^2')).toBe(-4);
    expect(ev('2**-1')).toBe(0.5);
    expect(ev('(1+2)*3')).toBe(9);
    expect(ev('8/2/2')).toBe(2);
  });
  it('functions and constants', () => {
    expect(ev('sin(pi/2)')).toBeCloseTo(1, 15);
    expect(ev('ln(e)')).toBeCloseTo(1, 15);
    expect(ev('log(1000)')).toBeCloseTo(3, 15);
    expect(ev('atan2(1, 1)')).toBeCloseTo(Math.PI / 4, 15);
    expect(ev('max(1, 5, 3)')).toBe(5);
    expect(ev('exp(-a^2)', { a: 2 })).toBeCloseTo(Math.exp(-4), 15);
  });
  it('implicit multiplication and unicode operators', () => {
    expect(ev('2a', { a: 3 })).toBe(6);
    expect(ev('2(a+1)', { a: 3 })).toBe(8);
    expect(ev('a cos(b)', { a: 2, b: 0 })).toBe(2);
    expect(ev('2pi')).toBeCloseTo(2 * Math.PI, 15);
    expect(ev('a·b − 1', { a: 2, b: 3 })).toBe(5);
  });
  it('reports the variables used', () => {
    expect(compile('x*cos(b)', ['a', 'b', 'x', 'y']).vars).toEqual(['b', 'x']);
  });
  it('rejects unknown names and bad syntax', () => {
    expect(() => compile('q+1', ['a'])).toThrow(ExprError);
    expect(() => compile('ab', ['a', 'b'])).toThrow(/a\*b/);
    expect(() => compile('foo(a)', ['a'])).toThrow(/fonksiyon yok/);
    expect(() => compile('sin a', ['a'])).toThrow(ExprError);
    expect(() => compile('(1+2', [])).toThrow(ExprError);
    expect(() => compile('atan2(1)', [])).toThrow(/2 argüman/);
    expect(evalConst('2*')).toBeNaN();
  });
});

describe('principalAxes3', () => {
  it('finds the axes of an elongated, rotated cloud', () => {
    const pts: [number, number, number][] = [];
    for (let i = -10; i <= 10; i++) for (let j = -3; j <= 3; j++) {
      // long along (1,1,0)/√2, short along z
      const u = i / 2, w = j / 10;
      pts.push([u / Math.SQRT2 + 1, u / Math.SQRT2 - 2, w]);
    }
    const { mean, axes, sigma } = principalAxes3(pts);
    expect(mean[0]).toBeCloseTo(1, 12);
    expect(mean[1]).toBeCloseTo(-2, 12);
    expect(Math.abs(axes[0]![0] * Math.SQRT1_2 + axes[0]![1] * Math.SQRT1_2)).toBeCloseTo(1, 10);
    expect(Math.abs(axes[1]![2])).toBeCloseTo(1, 10);
    expect(sigma[2]).toBeLessThan(1e-9);
    expect(sigma[0]).toBeGreaterThan(sigma[1]);
  });
});
