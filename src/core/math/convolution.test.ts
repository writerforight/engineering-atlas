import { describe, expect, it } from 'vitest';
import { mulVec } from './matrix';
import {
  circulant, circularConv, cmatmul, dftMatrix, dftVec, hadamard, idftMatrix, idftReal, linearConv,
  lowerToeplitz, maxOffDiagonal, offDiagonalRatio, randomInts, toComplexMat, toeplitz, wrapTo,
} from './convolution';

const a = [3, 1, 4, 1];
const b = [5, 9, 2];

describe('convolution matrices', () => {
  it('linear convolution by hand', () => {
    expect(linearConv(a, b)).toEqual([15, 32, 35, 43, 17, 2]);
  });

  it('Toeplitz matrix reproduces a * b and has shape (La+Lb−1)×Lb', () => {
    const T = toeplitz(a, b.length);
    expect(T.length).toBe(6);
    expect(T[0]!.length).toBe(3);
    expect(mulVec(T, b)).toEqual(linearConv(a, b));
    // convolution commutes: T_b a = T_a b
    expect(mulVec(toeplitz(b, a.length), a)).toEqual(linearConv(a, b));
  });

  it('circulant: each column is the previous shifted down, and C b = a ⊛ b', () => {
    const C = circulant(a, 5);
    for (let j = 1; j < 5; j++) for (let i = 0; i < 5; i++) expect(C[i]![j]).toBe(C[(i - 1 + 5) % 5]![j - 1]);
    expect(mulVec(C, wrapTo(b, 5))).toEqual(circularConv(a, b, 5));
  });

  it('N ≥ La+Lb−1: circular equals linear; smaller N aliases (tail folds onto the start)', () => {
    const y = linearConv(a, b);
    expect(circularConv(a, b, 6)).toEqual(y);
    expect(circularConv(a, b, 8)).toEqual([...y, 0, 0]);
    expect(circularConv(a, b, 4)).toEqual(wrapTo(y, 4));
    expect(wrapTo(y, 4)).toEqual([15 + 17, 32 + 2, 35, 43]);
  });

  it('lower Toeplitz on zero-padded b gives the linear convolution too', () => {
    const N = a.length + b.length - 1;
    expect(mulVec(lowerToeplitz(a, N), wrapTo(b, N))).toEqual(linearConv(a, b));
  });

  it('random integers are bounded and keep their prefix when the length grows', () => {
    const x = randomInts(42, 10, 20), y = randomInts(42, 14, 20);
    expect(y.slice(0, 10)).toEqual(x);
    x.forEach((v) => { expect(Number.isInteger(v)).toBe(true); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(20); });
    randomInts(7, 50, 5, true).forEach((v) => { expect(v).toBeGreaterThanOrEqual(-5); expect(v).toBeLessThanOrEqual(5); });
  });
});

describe('DFT diagonalises the circulant', () => {
  for (const N of [4, 5, 7, 8]) {
    it(`F C F⁻¹ = diag(F a) for N = ${N}`, () => {
      const C = circulant(a, N);
      const F = dftMatrix(N);
      const L = cmatmul(cmatmul(F, toComplexMat(C)), idftMatrix(N));
      expect(maxOffDiagonal(L)).toBeLessThan(1e-9);
      const A = dftVec(wrapTo(a, N));
      L.forEach((r, k) => {
        expect(Math.abs(r[k]![0] - A[k]![0])).toBeLessThan(1e-9);
        expect(Math.abs(r[k]![1] - A[k]![1])).toBeLessThan(1e-9);
      });
    });
  }

  it('F F⁻¹ = I', () => {
    const P = cmatmul(dftMatrix(6), idftMatrix(6));
    P.forEach((r, i) => r.forEach(([re, im], j) => {
      expect(Math.abs(re - (i === j ? 1 : 0))).toBeLessThan(1e-12);
      expect(Math.abs(im)).toBeLessThan(1e-12);
    }));
  });

  it('a lower Toeplitz matrix is not diagonalised', () => {
    const N = 6;
    const L = cmatmul(cmatmul(dftMatrix(N), toComplexMat(lowerToeplitz(a, N))), idftMatrix(N));
    expect(offDiagonalRatio(L)).toBeGreaterThan(0.1);
  });

  it('convolution theorem: F(a ⊛ b) = (F a) ⊙ (F b)', () => {
    const N = 6;
    const Y = hadamard(dftVec(wrapTo(a, N)), dftVec(wrapTo(b, N)));
    const y = idftReal(Y);
    y.forEach((v, n) => expect(Math.abs(v - linearConv(a, b)[n]!)).toBeLessThan(1e-9));
  });
});
