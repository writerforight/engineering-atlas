import { add, identity, inv2, mat2, mul, scale, type Mat } from './matrix';

/**
 * Traceless 2x2 matrix M = [[a, b], [c, -a]] with c chosen so that M^2 = -I.
 * M^2 = (a^2 + bc) I, so M^2 = -I  <=>  c = -(1 + a^2) / b  (needs b != 0).
 */
export function complexStructure(a: number, b: number): Mat {
  if (b === 0) throw new Error('complexStructure: b must be non-zero');
  return mat2(a, b, -(1 + a * a) / b, -a);
}

/**
 * Closed form e^{tM} = cos(t) I + sin(t) M, valid for any square M with M^2 = -I:
 * the even powers of M are (-1)^k I and the odd ones (-1)^k M, so the exponential
 * series splits into the cosine and sine series.
 */
export function expComplexStructure(M: Mat, t: number): Mat {
  return add(scale(identity(M.length), Math.cos(t)), scale(M, Math.sin(t)));
}

/**
 * P with M = P J P^{-1}, J = [[0,-1],[1,0]]. Choosing columns P = [v, M v] for
 * any v != 0 works because M v = P e2 = P J e1 and M (M v) = -v = P J e2.
 * We take v = e1, giving P = [[1, a], [0, c]].
 */
export function conjugatorToJ(M: Mat): Mat {
  return mat2(1, M[0]![0]!, 0, M[1]![0]!);
}

/** A(t) = e^{tM} A e^{-tM}. */
export function conjugateFlow(M: Mat, A: Mat, t: number): Mat {
  return mul(mul(expComplexStructure(M, t), A), expComplexStructure(M, -t));
}

/** Convenience: P J P^{-1} (should reproduce M). */
export function fromConjugator(P: Mat, J: Mat): Mat {
  return mul(mul(P, J), inv2(P));
}
