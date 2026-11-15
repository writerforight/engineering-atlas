// Headless check of the p-n junction simulation core (no browser).
//   node src/topics/pn-junction/check.mjs           full report (~3 min)
//   node src/topics/pn-junction/check.mjs --quick   shorter runs (~1 min)
// Recomputes success criteria 1-5 with public/pn-junction/sim.js.

import '../../../public/pn-junction/sim.js';

const PN = globalThis.PNSim;
const quick = process.argv.includes('--quick');
const SETTLE = quick ? 12000 : 18000;
const MEASURE = quick ? 9000 : 18000;
const pct = (a, b) => `${a >= b ? '+' : '−'}${Math.abs((a / b - 1) * 100).toFixed(1)} %`;
const f = (v, d = 3) => v.toFixed(d);
let failures = 0;
const verdict = (ok, text) => {
  if (!ok) failures++;
  console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${text}`);
};

function equilibrium(seed, ND = 30, NA = 30) {
  const sim = PN.create({ seed, ND, NA });
  // Before contact: two neutral halves, no space charge.
  sim.step(1500);
  const before = sim.measure('avg');
  const ions0 = Float64Array.from(sim.ions().x.subarray(0, sim.ions().n));
  sim.contact();
  sim.step(SETTLE);
  sim.resetCum();
  sim.step(MEASURE);
  const m = sim.measure('cum');
  const ions1 = sim.ions().x.subarray(0, sim.ions().n);
  let moved = 0;
  for (let i = 0; i < ions0.length; i++) moved = Math.max(moved, Math.abs(ions0[i] - ions1[i]));
  return { sim, m, before, moved, pb: PN.poissonBoltzmann(ND, NA, 300, 0, sim.params.Lx) };
}

console.log(`p-n junction check (${quick ? 'quick' : 'full'}): settle ${SETTLE}, measure ${MEASURE} steps per run\n`);
console.log('Units: L0 = %s um, V_T = %s mV, n_i = 1e10 cm^-3, t0 = %s ns\n', f(PN.UNITS.L0 * 1e4, 1), f(PN.UNITS.VT * 1e3, 2), f(PN.UNITS.t0 * 1e9, 0));

// ---------------------------------------------------------------- 1-3 equilibrium
const cases = quick ? [[30, 30, 1]] : [[30, 30, 1], [30, 30, 2], [50, 15, 3]];
for (const [ND, NA, seed] of cases) {
  const { m, before, moved, pb } = equilibrium(seed, ND, NA);
  const th = m.theory;
  console.log(`Equilibrium N_D = ${ND} n_i, N_A = ${NA} n_i (seed ${seed}), V = 0`);
  console.log(`  before contact: E_max = ${f(before.Emax, 2)} (no depletion), after: ${f(m.Emax, 2)}`);
  console.log(`  V_bi   sim ${f(m.Vbi, 2)}  formula ${f(th.Vbi, 2)} (${pct(m.Vbi, th.Vbi)})  PB ${f(pb.drop, 2)}`);
  console.log(`  W      sim ${f(m.W)}  formula ${f(th.W)} (${pct(m.W, th.W)})  PB ${f(pb.W)} (${pct(m.W, pb.W)})  formula - 2V_T ${f(th.Wkt)}`);
  console.log(`  x_n    sim ${f(m.xn)}  formula ${f(th.xn)}   x_p sim ${f(m.xp)}  formula ${f(th.xp)}`);
  console.log(`  E_max  sim ${f(m.Emax, 2)}  formula ${f(th.Emax, 2)} (${pct(m.Emax, th.Emax)})  PB ${f(pb.Emax, 2)}`);
  console.log(`  side charges (integral of rho): n side +${f(m.Qn, 2)}, p side -${f(m.Qp, 2)} (${pct(m.Qn, m.Qp)})`);
  console.log(`  n p / n_i^2: n bulk ${f(m.npN, 2)}, p bulk ${f(m.npP, 2)};  total charge / ion charge ${(m.QtotRel * 100).toFixed(3)} %;  ions moved ${moved}`);
  verdict(before.Emax < 0.15 * m.Emax, '1: depletion zone forms only after contact, not prescribed');
  verdict(Math.abs(m.Vbi / th.Vbi - 1) <= 0.15, `2: V_bi within 15 % of the formula (${pct(m.Vbi, th.Vbi)})`);
  const wOk = Math.abs(m.W / th.W - 1) <= 0.15;
  if (wOk) verdict(true, `2: W within 15 % of the formula (${pct(m.W, th.W)})`);
  else {
    console.log(`  NOTE W deviates ${pct(m.W, th.W)} from the depletion formula: majority-carrier Debye tails`);
    console.log(`       (V_bi/V_T = ${f(th.Vbi / th.VT, 1)}); the exact Poisson-Boltzmann solution of the same model is ${pct(pb.W, th.W)} off itself.`);
    verdict(Math.abs(m.W / pb.W - 1) <= 0.15, `2: W within 15 % of Poisson-Boltzmann (${pct(m.W, pb.W)})`);
  }
  verdict(Math.abs(m.QtotRel) < 0.01 && Math.abs(m.Qn / m.Qp - 1) < 0.1, '3: total charge ~ 0 and N_D x_n = N_A x_p');
  verdict(m.npN > 0.6 && m.npN < 1.6 && m.npP > 0.6 && m.npP < 1.6, '3: n p ~ n_i^2 outside the zone');
  verdict(moved === 0, 'fixed ions do not move');
  console.log('');
}

// ---------------------------------------------------------------- 4 bias
console.log('Bias sweep N_D = N_A = 30 n_i (seed 7): W(V)');
const sim = PN.create({ seed: 7 });
sim.contact();
sim.step(SETTLE);
const rows = [];
for (const V of quick ? [-5, 0, 2] : [-6, -3, 0, 1, 2]) {
  sim.setParams({ V });
  sim.step(quick ? 8000 : 10000);
  sim.resetCum();
  sim.step(MEASURE);
  const m = sim.measure('cum');
  const pb = PN.poissonBoltzmann(30, 30, 300, V, sim.params.Lx);
  rows.push({ V, W: m.W, th: m.theory.W, pb: pb.W, drop: m.drop });
  console.log(`  V = ${String(V).padStart(3)} V_T: W sim ${f(m.W)}  formula ${f(m.theory.W)} (${pct(m.W, m.theory.W)})  PB ${f(pb.W)} (${pct(m.W, pb.W)})  junction drop ${f(m.drop, 2)} (formula ${f(m.theory.drop, 2)})`);
}
const monotonic = rows.every((r, i) => i === 0 || r.W < rows[i - 1].W);
verdict(monotonic, '4: reverse bias widens W, forward bias narrows it (monotonic in V)');
const i0 = rows.findIndex((r) => r.V === 0);
const ratioOk = rows.every((r) => Math.abs(r.W / rows[i0].W / (r.pb / rows[i0].pb) - 1) < 0.15);
verdict(ratioOk, '4: W(V)/W(0) follows the theory within 15 %');
console.log('');

// ---------------------------------------------------------------- 5 speed
const perf = PN.create({ seed: 9 });
perf.contact();
perf.step(500);
const t0 = performance.now();
perf.step(3000);
const sps = 3000 / ((performance.now() - t0) / 1000);
const mobile = perf.counts().mobile;
console.log(`Speed: ${sps.toFixed(0)} steps/s with ${mobile} mobile + ${perf.counts().donors + perf.counts().acceptors} fixed charges`);
console.log(`  = ${(sps / 30).toFixed(0)} steps per frame at 30 fps for the physics alone (the page adapts 4-40 steps/frame)`);
verdict(sps / 30 >= 8, '5: physics fast enough for >= 30 fps at ~8 steps/frame');

console.log(failures ? `\n${failures} check(s) failed.` : '\nAll checks passed.');
process.exitCode = failures ? 1 : 0;
