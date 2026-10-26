import { describe, expect, it } from 'vitest';
import { basisMatrix, bitsToLevel, decide, levelBits, matrixBits, randomBits, runSymbol, symbolFromBits, ofdmSignal, qamLevels, randomCoeffs, receive, receiveDft, transmit } from './ofdm';

const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

describe('QAM-OFDM', () => {
  it('levels of 16-QAM', () => {
    expect(qamLevels(16)).toEqual([-3, -1, 1, 3]);
  });

  it('samples match s(t)', () => {
    const C = randomCoeffs(4, qamLevels(16), seeded(3));
    const s = transmit(basisMatrix(4, 11), C);
    s.forEach((v, n) => expect(v).toBeCloseTo(ofdmSignal(C, n / 11), 12));
  });

  it('Φᵀ and DFT recover C exactly when N > 2K', () => {
    for (const K of [1, 3, 8]) {
      const C = randomCoeffs(K, qamLevels(64), seeded(K));
      const s = transmit(basisMatrix(K, 2 * K + 1), C);
      const a = receive(basisMatrix(K, 2 * K + 1), s);
      const b = receiveDft(s, K);
      a.flat().forEach((v, j) => expect(v).toBeCloseTo(C.flat()[j]!, 10));
      b.flat().forEach((v, j) => expect(v).toBeCloseTo(C.flat()[j]!, 10));
    }
  });

  it('N = 2K loses only the last sine', () => {
    const K = 4;
    const C = randomCoeffs(K, qamLevels(16), seeded(9));
    const Phi = basisMatrix(K, 2 * K);
    const R = receive(Phi, transmit(Phi, C));
    expect(R[K - 1]![1]).toBeNaN();
    R.flat().slice(0, -1).forEach((v, j) => expect(v).toBeCloseTo(C.flat()[j]!, 10));
    receiveDft(transmit(Phi, C), K).flat().slice(0, -1).forEach((v, j) => expect(v).toBeCloseTo(C.flat()[j]!, 10));
  });

  it('decision picks nearest level', () => {
    expect(decide(0.4, [-3, -1, 1, 3])).toBe(1);
    expect(decide(-2.6, [-3, -1, 1, 3])).toBe(-3);
  });

  it('Gray bits: neighbours differ in one bit, NaN is unknown', () => {
    const lv = qamLevels(64);
    for (let i = 1; i < lv.length; i++) {
      const a = levelBits(lv[i - 1]!, lv);
      const b = levelBits(lv[i]!, lv);
      expect([...a].filter((c, j) => c !== b[j]).length).toBe(1);
    }
    expect(levelBits(NaN, qamLevels(16))).toBe('??');
    expect(matrixBits([[-3, 3]], qamLevels(16))).toEqual(['0010']);
  });

  it('bits → level → bits round trip, and the noiseless chain is error-free', () => {
    const lv = qamLevels(256);
    for (const l of lv) expect(bitsToLevel(levelBits(l, lv), lv)).toBe(l);
    const bits = randomBits(5 * 2 * 4, seeded(5));
    expect(matrixBits(symbolFromBits(bits, 5, lv), lv).join('')).toBe(bits);
    const run = runSymbol(basisMatrix(5, 11), lv, bits, 0, 1);
    expect(run.rxBits).toBe(bits);
    expect(run.bitErrors).toBe(0);
  });

  it('heavy noise causes bit errors', () => {
    const lv = qamLevels(16);
    const bits = randomBits(4 * 2 * 2 * 50, seeded(2));
    let errs = 0;
    for (let i = 0; i < 50; i++) errs += runSymbol(basisMatrix(4, 9), lv, bits.slice(i * 16, i * 16 + 16), 3, i + 1).bitErrors;
    expect(errs).toBeGreaterThan(0);
  });
});
