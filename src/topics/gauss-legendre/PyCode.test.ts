import { describe, expect, it } from 'vitest';
import { CODE } from './PyCode';

const IDS = ['orthogonal', 'gram-schmidt', 'rekursion', 'matrix', 'symmetrisch', 'stuetzstellen', 'quadratur', 'exaktheitsgrad'];

describe('PP3 Python code sections', () => {
  it('has a line range for every chapter', () => {
    for (const id of IDS) {
      const r = CODE.ranges[id];
      expect(r, id).toBeDefined();
      expect(r![0]).toBeLessThanOrEqual(r![1]);
    }
  });
  it('drops the marker lines from the displayed code', () => {
    expect(CODE.lines.some((l) => /#\s*(>>>|<<<)/.test(l))).toBe(false);
  });
  it('chapter ranges start at a definition', () => {
    for (const id of IDS) expect(CODE.lines[CODE.ranges[id]![0] - 1]).toMatch(/^def /);
  });
});
