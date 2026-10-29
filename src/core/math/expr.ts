/**
 * Small, safe expression language for user-typed formulas (no eval):
 * numbers, + - * / ^ (also **), parentheses, implicit multiplication (2a, 3(a+b), 2 sin(a)),
 * the functions in FUNCS and the constants pi / π / e / tau. Unknown names are errors,
 * and the variables actually used are reported.
 */

type Fn = (...args: number[]) => number;

/** name -> [implementation, arity] (arity -1: one or more arguments). */
export const FUNCS: Record<string, [Fn, number]> = {
  sin: [Math.sin, 1], cos: [Math.cos, 1], tan: [Math.tan, 1],
  cot: [(x) => 1 / Math.tan(x), 1], sec: [(x) => 1 / Math.cos(x), 1], csc: [(x) => 1 / Math.sin(x), 1],
  asin: [Math.asin, 1], acos: [Math.acos, 1], atan: [Math.atan, 1], atan2: [Math.atan2, 2],
  sinh: [Math.sinh, 1], cosh: [Math.cosh, 1], tanh: [Math.tanh, 1],
  asinh: [Math.asinh, 1], acosh: [Math.acosh, 1], atanh: [Math.atanh, 1],
  exp: [Math.exp, 1], ln: [Math.log, 1], log: [Math.log10, 1], log2: [Math.log2, 1],
  sqrt: [Math.sqrt, 1], cbrt: [Math.cbrt, 1], abs: [Math.abs, 1], sign: [Math.sign, 1],
  floor: [Math.floor, 1], ceil: [Math.ceil, 1], round: [Math.round, 1],
  pow: [Math.pow, 2], mod: [(x, m) => ((x % m) + m) % m, 2],
  min: [Math.min, -1], max: [Math.max, -1], hypot: [Math.hypot, -1],
};

export const CONSTS: Record<string, number> = { pi: Math.PI, 'π': Math.PI, e: Math.E, tau: 2 * Math.PI };

export class ExprError extends Error {
  constructor(message: string, readonly pos: number) {
    super(message);
  }
}

export interface Compiled {
  /** Evaluate with variable values in the order of `allowed` given to compile(). */
  fn: (vals: ArrayLike<number>) => number;
  /** Variables that occur in the formula, in `allowed` order. */
  vars: string[];
}

type Tok = { t: 'num'; v: number; p: number } | { t: 'id'; v: string; p: number } | { t: 'op'; v: string; p: number };

function tokenize(src: string): Tok[] {
  const s = src.replace(/[−–]/g, '-').replace(/[·×]/g, '*');
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i]!;
    if (/\s/.test(ch)) { i++; continue; }
    const num = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(s.slice(i));
    if (num) { out.push({ t: 'num', v: Number(num[0]), p: i }); i += num[0].length; continue; }
    const id = /^[A-Za-zπ_][A-Za-z0-9_]*/.exec(s.slice(i));
    if (id) { out.push({ t: 'id', v: id[0], p: i }); i += id[0].length; continue; }
    if (s.startsWith('**', i)) { out.push({ t: 'op', v: '^', p: i }); i += 2; continue; }
    if ('+-*/^(),'.includes(ch)) { out.push({ t: 'op', v: ch, p: i }); i++; continue; }
    throw new ExprError(`Beklenmeyen karakter: "${ch}"`, i);
  }
  return out;
}

type Node = (v: ArrayLike<number>) => number;

/** Compile `src`; only names in `allowed` may be used as variables. */
export function compile(src: string, allowed: readonly string[]): Compiled {
  const toks = tokenize(src);
  const used = new Set<string>();
  let k = 0;
  const peek = () => toks[k];
  const isOp = (v: string) => peek()?.t === 'op' && peek()!.v === v;
  const end = () => (toks.length ? toks[toks.length - 1]!.p + 1 : 0);
  const expect = (v: string) => {
    if (!isOp(v)) throw new ExprError(`"${v}" bekleniyordu`, peek()?.p ?? end());
    k++;
  };

  // add := mul (('+'|'-') mul)*
  function add(): Node {
    let a = mul();
    while (isOp('+') || isOp('-')) {
      const op = toks[k++]!.v, l = a, r = mul();
      a = op === '+' ? (v) => l(v) + r(v) : (v) => l(v) - r(v);
    }
    return a;
  }
  // mul := unary (('*'|'/') unary | <implicit> pow)*
  function mul(): Node {
    let a = unary();
    for (;;) {
      if (isOp('*') || isOp('/')) {
        const op = toks[k++]!.v, l = a, r = unary();
        a = op === '*' ? (v) => l(v) * r(v) : (v) => l(v) / r(v);
      } else if (peek() && (peek()!.t !== 'op' || peek()!.v === '(')) {
        const l = a, r = pow();       // 2a, 2(a+b), a sin(b)
        a = (v) => l(v) * r(v);
      } else return a;
    }
  }
  // unary := ('-'|'+') unary | pow      (so -a^2 = -(a^2))
  function unary(): Node {
    if (isOp('-')) { k++; const r = unary(); return (v) => -r(v); }
    if (isOp('+')) { k++; return unary(); }
    return pow();
  }
  // pow := atom ('^' unary)?   (right associative: 2^3^2 = 2^9)
  function pow(): Node {
    const b = atom();
    if (!isOp('^')) return b;
    k++;
    const e = unary();
    return (v) => Math.pow(b(v), e(v));
  }
  function atom(): Node {
    const tk = peek();
    if (!tk) throw new ExprError('İfade eksik bitti', end());
    k++;
    if (tk.t === 'num') { const c = tk.v; return () => c; }
    if (tk.t === 'op') {
      if (tk.v !== '(') throw new ExprError(`Beklenmeyen "${tk.v}"`, tk.p);
      const inner = add();
      expect(')');
      return inner;
    }
    const name = tk.v;
    if (name in FUNCS) {
      const [f, arity] = FUNCS[name]!;
      if (!isOp('(')) throw new ExprError(`${name} bir fonksiyon: ${name}(…) yaz`, tk.p);
      k++;
      const args: Node[] = [add()];
      while (isOp(',')) { k++; args.push(add()); }
      expect(')');
      if (arity >= 0 && args.length !== arity) throw new ExprError(`${name} ${arity} argüman alır, ${args.length} verildi`, tk.p);
      if (args.length === 1) { const a0 = args[0]!; return (v) => f(a0(v)); }
      if (args.length === 2) { const [a0, a1] = args as [Node, Node]; return (v) => f(a0(v), a1(v)); }
      return (v) => f(...args.map((a) => a(v)));
    }
    if (isOp('(')) throw new ExprError(`"${name}" diye bir fonksiyon yok`, tk.p);
    if (name in CONSTS) { const c = CONSTS[name]!; return () => c; }
    const idx = allowed.indexOf(name);
    if (idx < 0) {
      const split = [...name].every((c) => allowed.includes(c) || c in CONSTS);
      const hint = split && name.length > 1 ? ` (${[...name].join('*')} mi demek istedin?)` : ` (kullanılabilir: ${allowed.join(', ')})`;
      throw new ExprError(`Bilinmeyen değişken "${name}"${hint}`, tk.p);
    }
    used.add(name);
    return (v) => v[idx]!;
  }

  if (!toks.length) throw new ExprError('Boş ifade', 0);
  const fn = add();
  if (k < toks.length) throw new ExprError(`Fazladan "${toks[k]!.v}"`, toks[k]!.p);
  return { fn, vars: allowed.filter((n) => used.has(n)) };
}

/** Compile and evaluate a constant expression (e.g. a range bound "2pi"); NaN on error. */
export function evalConst(src: string): number {
  try {
    return compile(src, []).fn([]);
  } catch {
    return NaN;
  }
}

/**
 * Principal axes of a 3D point cloud: mean, unit axes sorted by decreasing singular value,
 * and the singular values of the centred data matrix (Jacobi eigen-decomposition of XᵀX).
 */
export function principalAxes3(pts: ReadonlyArray<readonly [number, number, number]>): {
  mean: [number, number, number];
  axes: [number, number, number][];
  sigma: [number, number, number];
} {
  const n = pts.length || 1;
  const mean: [number, number, number] = [0, 0, 0];
  for (const p of pts) for (let i = 0; i < 3; i++) mean[i] = mean[i]! + p[i]! / n;
  const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (const p of pts)
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) A[i]![j] = A[i]![j]! + (p[i]! - mean[i]!) * (p[j]! - mean[j]!);
  const V = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  for (let sweep = 0; sweep < 50; sweep++) {
    let off = 0;
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) off += A[i]![j]! ** 2;
    if (off < 1e-24) break;
    for (let p = 0; p < 3; p++)
      for (let q = p + 1; q < 3; q++) {
        if (Math.abs(A[p]![q]!) < 1e-300) continue;
        // rotation that zeroes A[p][q]
        const th = (A[q]![q]! - A[p]![p]!) / (2 * A[p]![q]!);
        const t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1));
        const c = 1 / Math.sqrt(t * t + 1), s = t * c;
        for (let r = 0; r < 3; r++) {
          const arp = A[r]![p]!, arq = A[r]![q]!;
          A[r]![p] = c * arp - s * arq; A[r]![q] = s * arp + c * arq;
        }
        for (let r = 0; r < 3; r++) {
          const apr = A[p]![r]!, aqr = A[q]![r]!;
          A[p]![r] = c * apr - s * aqr; A[q]![r] = s * apr + c * aqr;
        }
        for (let r = 0; r < 3; r++) {
          const vrp = V[r]![p]!, vrq = V[r]![q]!;
          V[r]![p] = c * vrp - s * vrq; V[r]![q] = s * vrp + c * vrq;
        }
      }
  }
  const order = [0, 1, 2].sort((i, j) => A[j]![j]! - A[i]![i]!);
  const axes = order.map((i) => [V[0]![i]!, V[1]![i]!, V[2]![i]!] as [number, number, number]);
  const sigma = order.map((i) => Math.sqrt(Math.max(0, A[i]![i]!))) as [number, number, number];
  return { mean, axes, sigma };
}
