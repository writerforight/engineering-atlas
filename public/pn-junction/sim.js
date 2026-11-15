/*
 * p-n junction: particle simulation core (no DOM). Classic script: in the
 * browser it defines window.PNSim; in Node `await import('./sim.js')` (or the
 * checker in src/topics/pn-junction/check.mjs) defines globalThis.PNSim.
 *
 * UNITS (dimensionless, map 1:1 onto silicon at 300 K)
 *   density   N0  = n_i(300 K) = 1e10 cm^-3
 *   potential V_T = k_B T / q at 300 K = 25.85 mV
 *   length    L0  = sqrt(eps_Si V_T / (q N0)) = Debye length at N0 = 40.9 um
 *   charge density in q N0, so Poisson reads  phi'' = -rho
 *   energy    k_B * 300 K (= q V_T), temperature T' = T / 300 K
 *   time      t0  = L0^2 / D_n  (D_n = 36 cm^2/s -> 0.46 us)
 *
 * MODEL
 *   Mobile electrons (s = -1) and holes (s = +1), fixed ionised donors (+,
 *   x > 0) and acceptors (-, x < 0) in a 2D box [-Lx/2, Lx/2] x [0, Ly),
 *   periodic in y, depth Lz = 1 (each particle is a super-particle carrying
 *   charge c, so that the doping density is reached with ~2000 carriers).
 *
 *   Forces on a carrier (test charge s = +-1, as for one real carrier):
 *   1. Long range, "mesh": all charges (mobile and fixed) are deposited on an
 *      x grid (cloud-in-cell, averaged over y); 1D Poisson gives E(x). This
 *      is the exact Coulomb field of a planar (y, z homogeneous) charge
 *      distribution, i.e. the far field of the 1/r^2 law for this geometry.
 *   2. Short range, "particle": direct Coulomb F = k q1 q2 / (r^2 + eps^2)
 *      with k = 1/(4 pi), q1 = s_i, q2 = s_j c, between all pairs closer
 *      than r_c (cell list), shifted so that F(r_c) = 0 (no jump at the
 *      cut-off). The y-averaged part of these near pairs is also in the mesh
 *      field; the double-counted share is ~ 2 pi r_c^2 / (Ly Lz) ~ 1 %
 *      of the near-pair force and averages out for a homogeneous neighbourhood.
 *      (r_c = 0.12, eps = 0.05 keep the exaggerated super-particle
 *      correlations small: W agrees with a mesh-only run within ~1 %.)
 *
 *   Dynamics: Langevin  m dv/dt = F - gamma v + sqrt(2 gamma k T) xi(t),
 *   integrated with BAOAB (exact Ornstein-Uhlenbeck step for friction and
 *   noise). D = kT/gamma (Einstein), D_p / D_n = mu_p / mu_n of silicon.
 *
 *   Recombination: an electron-hole pair closer than r_rec annihilates with
 *   probability p_rec per step. Generation creates pairs at random places,
 *   with separation drawn from r * exp(-U(r)/kT) on [0, r_rec] and rate
 *   G = p_rec * n_i^2 * Z, Z = int_0^r_rec 2 pi r exp(-U/kT) dr. This is
 *   detailed balance for e + h <-> 0, so the stationary state has
 *   n p = n_i^2 everywhere in equilibrium. n_i enters the model ONLY here.
 *
 *   Boundaries. Walls reflect, y is periodic.
 *   V = 0 (open circuit, equilibrium): the device is closed; no carriers
 *     enter or leave, so the charge is conserved exactly and the outer
 *     regions stay neutral. Field: isolated slab (E = -Q/2 left, +Q/2
 *     right). The built-in voltage then follows from Boltzmann statistics
 *     and generation-recombination alone; nothing at the boundary knows V_bi.
 *     (A free potential AND particle exchange at both ends would leave the
 *     terminal voltage undetermined: the depletion charge random-walks.)
 *   V != 0 (battery): ohmic contacts. A zone of width `contact` at each end
 *     is kept exactly neutral by adding or removing MAJORITY carriers, and
 *     the contact potentials are fixed, phi(right) - phi(left) = V_bi - V
 *     (the battery sets the quasi-Fermi-level difference qV; the contacts'
 *     band positions come from their doping).
 *
 *   measure() works on y- and time-averaged profiles (see there);
 *   poissonBoltzmann() solves the same statistics without particles.
 */
(function (root) {
  'use strict';

  // ---------------------------------------------------------------- silicon
  var SI = {
    epsR: 11.7,
    eps0: 8.8541878e-14, // F/cm
    q: 1.602176634e-19, // C
    ni300: 1e10, // cm^-3
    VT300: 0.025852, // V
    Eg: 1.12, // eV (taken constant over the small T range)
    kB: 8.617333e-5, // eV/K
    Dn300: 36, // cm^2/s (mu_n = 1400 cm^2/Vs)
    mu_ratio: 450 / 1400, // mu_p / mu_n
  };
  var EPS = SI.epsR * SI.eps0;
  var UNITS = {
    N0: SI.ni300,
    VT: SI.VT300,
    L0: Math.sqrt((EPS * SI.VT300) / (SI.q * SI.ni300)), // cm
  };
  UNITS.E0 = UNITS.VT / UNITS.L0; // V/cm
  UNITS.t0 = (UNITS.L0 * UNITS.L0) / SI.Dn300; // s

  /** n_i(T) / n_i(300 K) for silicon. */
  function niRel(T) {
    return Math.pow(T / 300, 1.5) * Math.exp((-SI.Eg / (2 * SI.kB)) * (1 / T - 1 / 300));
  }

  /**
   * Analytic reference (depletion approximation), dimensionless.
   * ND, NA in units of n_i(300 K); T in K; V in units of V_T(300 K).
   */
  function theory(ND, NA, T, V) {
    var VT = T / 300;
    var ni = niRel(T);
    var Vbi = VT * Math.log((NA * ND) / (ni * ni));
    var drop = Math.max(Vbi - V, 0);
    var inv = 1 / NA + 1 / ND;
    var W = Math.sqrt(2 * inv * drop); // eps = q = 1
    var xn = (W * NA) / (NA + ND);
    var xp = (W * ND) / (NA + ND);
    // Majority-carrier tails: each side's charge needs (u - VT) instead of u,
    // i.e. V_bi - V - 2 V_T in total (Sze, Physics of Semiconductor Devices).
    var Wkt = Math.sqrt(2 * inv * Math.max(drop - 2 * VT, 0));
    return {
      VT: VT,
      ni: ni,
      Vbi: Vbi,
      drop: drop,
      W: W,
      xn: xn,
      xp: xp,
      Emax: ND * xn,
      Wkt: Wkt,
      LDn: Math.sqrt(VT / ND),
      LDp: Math.sqrt(VT / NA),
      balance: ND * xn - NA * xp, // = 0 by construction
    };
  }

  /**
   * Reference beyond the depletion approximation: 1D Poisson-Boltzmann on
   * [-Lx/2, Lx/2] (abrupt junction at x = 0), Newton iteration.
   *   phi'' = -(p - n + N_D(x) - N_A(x)),  n = n_i e^{(phi - phiFn)/V_T},
   *   p = n_i e^{(phiFp - phi)/V_T},  phiFn = 0, phiFp = V.
   * V = 0: exact equilibrium, free ends (E = 0). V != 0: quasi-equilibrium
   * (each carrier in equilibrium with its own contact), neutral contacts.
   * Same model statistics as the particles, without particles.
   */
  function poissonBoltzmann(ND, NA, T, V, Lx, M) {
    M = M || 600;
    var VT = T / 300, ni = niRel(T), h = Lx / M;
    var xs = new Float64Array(M + 1), phi = new Float64Array(M + 1), dop = new Float64Array(M + 1);
    var k;
    for (k = 0; k <= M; k++) {
      xs[k] = -Lx / 2 + k * h;
      dop[k] = xs[k] > 1e-12 ? ND : xs[k] < -1e-12 ? -NA : (ND - NA) / 2;
      // neutral start: phi = V_T asinh(dop / 2 n_i) (+ phiFp on the p side)
      phi[k] = VT * Math.asinh(dop[k] / (2 * ni)) + (xs[k] < 0 ? V : 0);
    }
    var phiL = phi[0], phiR = phi[M];
    var a = new Float64Array(M + 1), b = new Float64Array(M + 1), cc = new Float64Array(M + 1), r = new Float64Array(M + 1);
    function dens(i) {
      var n = ni * Math.exp(phi[i] / VT), p = ni * Math.exp((V - phi[i]) / VT);
      return [n, p];
    }
    for (var it = 0; it < 200; it++) {
      for (k = 0; k <= M; k++) {
        var d = dens(k), n = d[0], p = d[1];
        var rhoK = p - n + dop[k];
        var dRho = -(n + p) / VT;
        var left = k > 0 ? phi[k - 1] : phi[1]; // Neumann ghost
        var right = k < M ? phi[k + 1] : phi[M - 1];
        r[k] = -(left - 2 * phi[k] + right + h * h * rhoK);
        b[k] = -2 + h * h * dRho;
        a[k] = k > 0 ? 1 : 0;
        cc[k] = k < M ? 1 : 0;
        if (k === 0) cc[k] = 2;
        if (k === M) a[k] = 2;
        if (V !== 0 && (k === 0 || k === M)) {
          a[k] = 0;
          cc[k] = 0;
          b[k] = 1;
          r[k] = (k === 0 ? phiL : phiR) - phi[k];
        }
      }
      // Thomas algorithm
      for (k = 1; k <= M; k++) {
        var m = a[k] / b[k - 1];
        b[k] -= m * cc[k - 1];
        r[k] -= m * r[k - 1];
      }
      r[M] /= b[M];
      for (k = M - 1; k >= 0; k--) r[k] = (r[k] - cc[k] * r[k + 1]) / b[k];
      var maxd = 0;
      for (k = 0; k <= M; k++) {
        var step = Math.max(-VT, Math.min(VT, r[k]));
        phi[k] += step;
        maxd = Math.max(maxd, Math.abs(step));
      }
      if (maxd < 1e-10) break;
    }
    var E = new Float64Array(M + 1), rho = new Float64Array(M + 1), nn = new Float64Array(M + 1), pp = new Float64Array(M + 1);
    for (k = 0; k <= M; k++) {
      var dd = dens(k);
      nn[k] = dd[0];
      pp[k] = dd[1];
      rho[k] = dd[1] - dd[0] + dop[k];
      E[k] = k === 0 ? -(phi[1] - phi[0]) / h : k === M ? -(phi[M] - phi[M - 1]) / h : -(phi[k + 1] - phi[k - 1]) / (2 * h);
    }
    // Same definitions as the particle measurement.
    var Emax = 0;
    for (k = 0; k <= M; k++) Emax = Math.max(Emax, -E[k]);
    var edgeN = NaN, edgeP = NaN;
    for (k = M; k > 0; k--) {
      if (nn[k] >= ND / 2 && nn[k - 1] < ND / 2) {
        edgeN = xs[k - 1] + (h * (ND / 2 - nn[k - 1])) / (nn[k] - nn[k - 1]);
        break;
      }
    }
    for (k = 0; k < M; k++) {
      if (pp[k] >= NA / 2 && pp[k + 1] < NA / 2) {
        edgeP = xs[k] + (h * (pp[k] - NA / 2)) / (pp[k] - pp[k + 1]);
        break;
      }
    }
    return {
      x: xs,
      phi: phi,
      E: E,
      rho: rho,
      n: nn,
      p: pp,
      drop: phi[M] - phi[0],
      Emax: Emax,
      xn: Emax / ND,
      xp: Emax / NA,
      W: Emax * (1 / ND + 1 / NA),
      edgeN: edgeN,
      edgeP: edgeP,
      Whalf: edgeN - edgeP,
    };
  }

  // ---------------------------------------------------------------- random
  function rng(seed) {
    var a = seed >>> 0 || 1;
    var spare = null;
    function u() {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    function gauss() {
      if (spare !== null) {
        var s = spare;
        spare = null;
        return s;
      }
      var r, x, y;
      do {
        x = 2 * u() - 1;
        y = 2 * u() - 1;
        r = x * x + y * y;
      } while (r >= 1 || r === 0);
      var f = Math.sqrt((-2 * Math.log(r)) / r);
      spare = y * f;
      return x * f;
    }
    function poisson(lambda) {
      if (lambda > 30) return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * gauss()));
      var L = Math.exp(-lambda), k = 0, p = 1;
      do {
        k++;
        p *= u();
      } while (p > L);
      return k - 1;
    }
    return { u: u, gauss: gauss, poisson: poisson };
  }

  // ---------------------------------------------------------------- defaults
  var DEFAULTS = {
    ND: 30, // donors, units of n_i(300 K)  (3e11 cm^-3)
    NA: 30, // acceptors
    T: 300, // K
    V: 0, // applied voltage, units of V_T(300 K); > 0 forward
    Lx: 6,
    Ly: 3,
    contact: 0.3, // width of each ohmic contact zone
    carriers: 2000, // mobile majority carriers in total (sets the super-particle charge)
    bins: 120, // mesh nodes - 1
    rc: 0.12, // short-range cut-off
    soft: 0.05, // smoothing length eps in r^2 + eps^2
    rrec: 0.05, // recombination radius
    prec: 0.02, // recombination probability per step and pair in range (lifetime ~ 50 steps)
    dt: 3e-4,
    Dh: SI.mu_ratio, // hole diffusion constant (D_n = 1)
    tauV: 2, // momentum relaxation m/gamma_n in steps
    avgSteps: 2000, // time constant of the display average
    seed: 1,
    srScale: 1, // scale of the short-range pair force (1 = Coulomb; 0 = mesh only, for tests)
  };

  function create(options) {
    var P = {};
    var k;
    for (k in DEFAULTS) P[k] = DEFAULTS[k];
    for (k in options || {}) P[k] = options[k];

    var R = rng(P.seed);
    var X0 = -P.Lx / 2, X1 = P.Lx / 2;
    var M = P.bins, dx = P.Lx / M;

    // Cell list geometry (cells at least rc wide; y periodic).
    var ncx = Math.max(1, Math.floor(P.Lx / P.rc));
    var ncy = Math.max(3, Math.floor(P.Ly / P.rc));
    var cwx = P.Lx / ncx, cwy = P.Ly / ncy;

    // State (filled by reset).
    var c, kc, rc2, soft2, fShift;
    var CAP = 0;
    var x, y, vx, vy, fx, fy, sp, n = 0;
    var ix, iy, is, nI = 0; // fixed ions
    var headI, nextI, headM, nextM;
    var rhoFixed = new Float64Array(M + 1);
    var nodeE = new Float64Array(M + 1), nodeH = new Float64Array(M + 1);
    var rho = new Float64Array(M + 1), Ef = new Float64Array(M + 1), phi = new Float64Array(M + 1);
    var Ehalf = new Float64Array(M);
    var avg, cum;
    var contacted = false, stepCount = 0, contactStep = 0;
    var genTable = null, genZ = 0;
    var events = { rec: 0, gen: 0, inj: 0, out: 0 };
    var diag = { recX: new Float64Array(M + 1), genX: new Float64Array(M + 1), netInj: [0, 0] };
    var removeMark;

    function nodeVol(kk) {
      return (kk === 0 || kk === M ? dx / 2 : dx) * P.Ly;
    }

    function newAverager() {
      return {
        w: 0,
        rho: new Float64Array(M + 1),
        E: new Float64Array(M + 1),
        phi: new Float64Array(M + 1),
        n: new Float64Array(M + 1),
        p: new Float64Array(M + 1),
        Q: 0,
      };
    }

    function ensureCapacity(need) {
      if (need <= CAP) return;
      var cap = Math.max(need, Math.ceil(CAP * 1.5), 1024);
      function grow(a, T) {
        var b = new T(cap);
        if (a) b.set(a.subarray(0, n));
        return b;
      }
      x = grow(x, Float64Array);
      y = grow(y, Float64Array);
      vx = grow(vx, Float64Array);
      vy = grow(vy, Float64Array);
      fx = grow(fx, Float64Array);
      fy = grow(fy, Float64Array);
      sp = grow(sp, Int8Array);
      nextM = new Int32Array(cap);
      removeMark = new Uint8Array(cap);
      CAP = cap;
    }

    var gammaN = 1, gammaH = 1, massN = 1;

    function setDerived() {
      // Super-particle charge: ~P.carriers majority carriers in total.
      c = ((P.ND + P.NA) * (P.Lx / 2) * P.Ly) / P.carriers;
      kc = (P.srScale * c) / (4 * Math.PI);
      rc2 = P.rc * P.rc;
      soft2 = P.soft * P.soft;
      fShift = 1 / (rc2 + soft2);
      gammaN = 1; // D_n = kT(300)/gamma_n = 1
      gammaH = 1 / P.Dh;
      massN = P.tauV * P.dt * gammaN;
      buildGenTable();
    }

    // Pair potential energy of an e-h pair (attractive), in units of kT(300):
    // U(r) = -kc [ (atan(rc/eps) - atan(r/eps)) / eps - (rc - r) / (rc^2 + eps^2) ].
    function pairPsi(r) {
      var e = P.soft;
      return kc * ((Math.atan(P.rc / e) - Math.atan(r / e)) / e - (P.rc - r) * fShift);
    }

    function buildGenTable() {
      var Tn = P.T / 300;
      var K = 256, cdf = new Float64Array(K + 1), rr = new Float64Array(K + 1);
      var acc = 0, prev = 0;
      for (var i = 0; i <= K; i++) {
        var r = (P.rrec * i) / K;
        var f = 2 * Math.PI * r * Math.exp(pairPsi(r) / Tn);
        if (i > 0) acc += 0.5 * (f + prev) * (P.rrec / K);
        cdf[i] = acc;
        rr[i] = r;
        prev = f;
      }
      genZ = acc;
      genTable = { cdf: cdf, r: rr, K: K };
    }

    function sampleGenRadius() {
      var t = genTable, target = R.u() * genZ;
      var lo = 0, hi = t.K;
      while (hi - lo > 1) {
        var mid = (lo + hi) >> 1;
        if (t.cdf[mid] < target) lo = mid;
        else hi = mid;
      }
      var span = t.cdf[hi] - t.cdf[lo] || 1;
      return t.r[lo] + ((target - t.cdf[lo]) / span) * (t.r[hi] - t.r[lo]);
    }

    function addCarrier(s, px, py) {
      ensureCapacity(n + 1);
      var Tn = P.T / 300;
      x[n] = px;
      y[n] = py;
      var sd = Math.sqrt(Tn / massN);
      vx[n] = sd * R.gauss();
      vy[n] = sd * R.gauss();
      fx[n] = 0;
      fy[n] = 0;
      sp[n] = s;
      n++;
    }

    function removeAt(i) {
      n--;
      x[i] = x[n];
      y[i] = y[n];
      vx[i] = vx[n];
      vy[i] = vy[n];
      fx[i] = fx[n];
      fy[i] = fy[n];
      sp[i] = sp[n];
    }

    /** Count of carriers per area of density N (super-particles). */
    function countFor(N, area) {
      return (N * area) / c;
    }

    function stochRound(v) {
      var f = Math.floor(v);
      return f + (R.u() < v - f ? 1 : 0);
    }

    function placeIons(N, xa, xb, s) {
      // Jittered grid: random positions, but without large-scale clumps.
      var cnt = Math.round(countFor(N, (xb - xa) * P.Ly));
      var aspect = (xb - xa) / P.Ly;
      var ny = Math.max(1, Math.round(Math.sqrt(cnt / aspect)));
      var nx = Math.max(1, Math.ceil(cnt / ny));
      // nx*ny >= cnt slots: use a random subset, so no column is left short
      // (a short last column would be a sheet of missing doping).
      var slots = [];
      for (var a = 0; a < nx; a++) for (var b = 0; b < ny; b++) slots.push(a * ny + b);
      for (var m = slots.length - 1; m > 0; m--) {
        var r = Math.floor(R.u() * (m + 1));
        var t = slots[m];
        slots[m] = slots[r];
        slots[r] = t;
      }
      for (var k = 0; k < cnt; k++) {
        var sa = Math.floor(slots[k] / ny), sb = slots[k] % ny;
        ix[nI] = xa + ((sa + R.u()) / nx) * (xb - xa);
        iy[nI] = ((sb + R.u()) / ny) * P.Ly;
        is[nI] = s;
        nI++;
      }
    }

    function reset() {
      setDerived();
      var nd = countFor(P.ND, (P.Lx / 2) * P.Ly), na = countFor(P.NA, (P.Lx / 2) * P.Ly);
      ix = new Float64Array(Math.ceil(nd + na) + 16);
      iy = new Float64Array(ix.length);
      is = new Int8Array(ix.length);
      nI = 0;
      placeIons(P.NA, X0, 0, -1);
      placeIons(P.ND, 0, X1, +1);
      CAP = 0;
      x = y = vx = vy = fx = fy = sp = null;
      n = 0;
      ensureCapacity(Math.ceil((nd + na) * 1.3) + 64);
      // Each side neutral before contact: majority = doping + minority,
      // minority at its own equilibrium value n_i^2 / N.
      var ni = niRel(P.T);
      var area = (P.Lx / 2) * P.Ly;
      var holesN = stochRound(countFor((ni * ni) / P.ND, area));
      var elecP = stochRound(countFor((ni * ni) / P.NA, area));
      var i;
      var donors = 0, acceptors = 0;
      for (i = 0; i < nI; i++) is[i] > 0 ? donors++ : acceptors++;
      for (i = 0; i < donors + holesN; i++) addCarrier(-1, R.u() * X1, R.u() * P.Ly);
      for (i = 0; i < holesN; i++) addCarrier(+1, R.u() * X1, R.u() * P.Ly);
      for (i = 0; i < acceptors + elecP; i++) addCarrier(+1, X0 + R.u() * -X0, R.u() * P.Ly);
      for (i = 0; i < elecP; i++) addCarrier(-1, X0 + R.u() * -X0, R.u() * P.Ly);

      // Fixed-ion cell list and mesh charge (static).
      headI = new Int32Array(ncx * ncy).fill(-1);
      nextI = new Int32Array(nI);
      rhoFixed.fill(0);
      for (i = 0; i < nI; i++) {
        var cx = cellX(ix[i]), cy = cellY(iy[i]), cidx = cy * ncx + cx;
        nextI[i] = headI[cidx];
        headI[cidx] = i;
        deposit(rhoFixed, ix[i], is[i] * c);
      }
      for (i = 0; i <= M; i++) rhoFixed[i] /= nodeVol(i);
      zoneIons = [0, 0];
      for (i = 0; i < nI; i++) {
        if (ix[i] <= X0 + P.contact) zoneIons[0]++;
        else if (ix[i] >= X1 - P.contact) zoneIons[1]++;
      }
      headM = new Int32Array(ncx * ncy);
      contacted = false;
      stepCount = 0;
      contactStep = 0;
      events = { rec: 0, gen: 0, inj: 0, out: 0 };
      avg = newAverager();
      cum = newAverager();
      buildCells();
      computeForces();
    }

    function cellX(px) {
      var cx = Math.floor((px - X0) / cwx);
      return cx < 0 ? 0 : cx >= ncx ? ncx - 1 : cx;
    }
    function cellY(py) {
      var cy = Math.floor(py / cwy);
      return cy < 0 ? 0 : cy >= ncy ? ncy - 1 : cy;
    }

    function deposit(arr, px, q) {
      var u = (px - X0) / dx;
      var kk = Math.floor(u);
      if (kk < 0) {
        arr[0] += q;
        return;
      }
      if (kk >= M) {
        arr[M] += q;
        return;
      }
      var f = u - kk;
      arr[kk] += q * (1 - f);
      arr[kk + 1] += q * f;
    }

    function buildCells() {
      headM.fill(-1);
      for (var i = 0; i < n; i++) {
        var cidx = cellY(y[i]) * ncx + cellX(x[i]);
        nextM[i] = headM[cidx];
        headM[cidx] = i;
      }
    }

    // Mesh: deposit, 1D Poisson, boundary condition.
    function solveMesh() {
      nodeE.fill(0);
      nodeH.fill(0);
      for (var i = 0; i < n; i++) deposit(sp[i] > 0 ? nodeH : nodeE, x[i], 1);
      var Q = 0;
      for (var kk = 0; kk <= M; kk++) {
        var vol = nodeVol(kk);
        rho[kk] = rhoFixed[kk] + (c * (nodeH[kk] - nodeE[kk])) / vol;
        Q += rho[kk] * (vol / P.Ly);
      }
      // E at half nodes with E_left = 0, then shift by the boundary condition.
      var e = rho[0] * (dx / 2), S = 0;
      for (kk = 0; kk < M; kk++) {
        if (kk > 0) e += rho[kk] * dx;
        Ehalf[kk] = e;
        S += e * dx;
      }
      var EL;
      if (P.V === 0) EL = -Q / 2; // free boundaries (isolated slab)
      else {
        var th = theory(P.ND, P.NA, P.T, P.V);
        var target = th.Vbi - P.V; // phi(right) - phi(left)
        EL = -(target + S) / P.Lx;
      }
      for (kk = 0; kk < M; kk++) Ehalf[kk] += EL;
      Ef[0] = EL;
      Ef[M] = EL + Q;
      for (kk = 1; kk < M; kk++) Ef[kk] = 0.5 * (Ehalf[kk - 1] + Ehalf[kk]);
      phi[0] = 0;
      for (kk = 0; kk < M; kk++) phi[kk + 1] = phi[kk] - Ehalf[kk] * dx;
      return Q;
    }

    var lastQ = 0;
    function computeForces() {
      lastQ = solveMesh();
      var i, j;
      // Mesh field (gather with the same weights).
      for (i = 0; i < n; i++) {
        var u = (x[i] - X0) / dx;
        var kk = Math.floor(u);
        var E;
        if (kk < 0) E = Ef[0];
        else if (kk >= M) E = Ef[M];
        else {
          var f = u - kk;
          E = Ef[kk] * (1 - f) + Ef[kk + 1] * f;
        }
        fx[i] = sp[i] * E;
        fy[i] = 0;
      }
      // Short-range Coulomb (cell list).
      var Ly = P.Ly, halfLy = Ly / 2;
      for (var cy = 0; cy < ncy; cy++) {
        for (var cx = 0; cx < ncx; cx++) {
          var cidx = cy * ncx + cx;
          for (i = headM[cidx]; i !== -1; i = nextM[i]) {
            var xi = x[i], yi = y[i], si = sp[i];
            var ax = 0, ay = 0;
            for (var oy = -1; oy <= 1; oy++) {
              var ny = cy + oy;
              if (ny < 0) ny += ncy;
              else if (ny >= ncy) ny -= ncy;
              for (var ox = -1; ox <= 1; ox++) {
                var nx = cx + ox;
                if (nx < 0 || nx >= ncx) continue;
                var nidx = ny * ncx + nx;
                // mobile-mobile, each pair once (j < i)
                for (j = headM[nidx]; j !== -1; j = nextM[j]) {
                  if (j >= i) continue;
                  var ddx = xi - x[j], ddy = yi - y[j];
                  if (ddy > halfLy) ddy -= Ly;
                  else if (ddy < -halfLy) ddy += Ly;
                  var r2 = ddx * ddx + ddy * ddy;
                  if (r2 >= rc2 || r2 === 0) continue;
                  if (!contacted && xi * x[j] < 0) continue;
                  var mag = kc * si * sp[j] * (1 / (r2 + soft2) - fShift) / Math.sqrt(r2);
                  var gx = mag * ddx, gy = mag * ddy;
                  ax += gx;
                  ay += gy;
                  fx[j] -= gx;
                  fy[j] -= gy;
                }
                // mobile-fixed
                for (j = headI[nidx]; j !== -1; j = nextI[j]) {
                  var ex = xi - ix[j], ey = yi - iy[j];
                  if (ey > halfLy) ey -= Ly;
                  else if (ey < -halfLy) ey += Ly;
                  var s2 = ex * ex + ey * ey;
                  if (s2 >= rc2 || s2 === 0) continue;
                  if (!contacted && xi * ix[j] < 0) continue;
                  var mg = kc * si * is[j] * (1 / (s2 + soft2) - fShift) / Math.sqrt(s2);
                  ax += mg * ex;
                  ay += mg * ey;
                }
              }
            }
            fx[i] += ax;
            fy[i] += ay;
          }
        }
      }
    }

    function reflect(i, wasLeft) {
      // Insulating wall at x = 0 before contact: mirror back to the old side.
      if (!contacted && x[i] < 0 !== wasLeft) {
        x[i] = wasLeft ? -Math.abs(x[i]) - 1e-9 : Math.abs(x[i]);
        vx[i] = -vx[i];
      }
      if (x[i] < X0) {
        x[i] = 2 * X0 - x[i];
        vx[i] = -vx[i];
      } else if (x[i] > X1) {
        x[i] = 2 * X1 - x[i];
        vx[i] = -vx[i];
      }
      if (x[i] < X0) x[i] = X0; // pathological double bounce
      if (x[i] > X1) x[i] = X1;
      if (y[i] < 0) y[i] += P.Ly;
      else if (y[i] >= P.Ly) y[i] -= P.Ly;
    }

    function recombineAndGenerate() {
      var i, j;
      // Recombination: each e-h pair within r_rec fires with prob. prec.
      var rr2 = P.rrec * P.rrec, halfLy = P.Ly / 2, removed = 0;
      for (i = 0; i < n; i++) removeMark[i] = 0;
      for (i = 0; i < n; i++) {
        if (sp[i] !== 1 || removeMark[i]) continue;
        var cx = cellX(x[i]), cy = cellY(y[i]);
        var done = false;
        for (var oy = -1; oy <= 1 && !done; oy++) {
          var ny = (cy + oy + ncy) % ncy;
          for (var ox = -1; ox <= 1 && !done; ox++) {
            var nx = cx + ox;
            if (nx < 0 || nx >= ncx) continue;
            for (j = headM[ny * ncx + nx]; j !== -1; j = nextM[j]) {
              if (sp[j] !== -1 || removeMark[j]) continue;
              var ddx = x[i] - x[j], ddy = y[i] - y[j];
              if (ddy > halfLy) ddy -= P.Ly;
              else if (ddy < -halfLy) ddy += P.Ly;
              if (ddx * ddx + ddy * ddy >= rr2) continue;
              if (!contacted && x[i] * x[j] < 0) continue;
              if (R.u() < P.prec) {
                diag.recX[Math.min(M, Math.max(0, Math.round((x[i] - X0) / dx)))]++;
                removeMark[i] = 1;
                removeMark[j] = 1;
                removed++;
                done = true;
                break;
              }
            }
          }
        }
      }
      if (removed) {
        for (i = n - 1; i >= 0; i--) if (removeMark[i]) removeAt(i);
        events.rec += removed;
      }
      // Generation (detailed balance with the recombination above).
      var ni2 = niRel(P.T) / c; // particles per unit area
      var lambda = P.prec * ni2 * ni2 * genZ * P.Lx * P.Ly;
      var g = R.poisson(lambda);
      for (var k = 0; k < g; k++) {
        var ex = X0 + R.u() * P.Lx, ey = R.u() * P.Ly;
        var r = sampleGenRadius(), a = 2 * Math.PI * R.u();
        var hx = ex + r * Math.cos(a), hy = ey + r * Math.sin(a);
        if (hx < X0 || hx > X1) continue;
        if (!contacted && ex * hx < 0) continue;
        if (hy < 0) hy += P.Ly;
        else if (hy >= P.Ly) hy -= P.Ly;
        addCarrier(-1, ex, ey);
        addCarrier(+1, hx, hy);
        diag.genX[Math.min(M, Math.max(0, Math.round((ex - X0) / dx)))]++;
        events.gen++;
      }
    }

    var zoneIons = [0, 0];
    function contacts() {
      // Each contact zone is kept exactly neutral: majority carriers =
      // fixed ions in the zone + minority carriers in the zone. (Holding them
      // at N * area instead would leave the random ion count's surplus as a
      // fixed sheet charge, i.e. a small battery at each contact.)
      var zones = [
        { a: X0, b: X0 + P.contact, s: +1 },
        { a: X1 - P.contact, b: X1, s: -1 },
      ];
      for (var z = 0; z < 2; z++) {
        var Z = zones[z];
        var idx = [], minority = 0;
        for (var i = 0; i < n; i++) {
          if (x[i] < Z.a || x[i] > Z.b) continue;
          if (sp[i] === Z.s) idx.push(i);
          else minority++;
        }
        var target = zoneIons[z] + minority;
        var diff = target - idx.length;
        if (diff > 0) {
          for (var k = 0; k < diff; k++) addCarrier(Z.s, Z.a + R.u() * (Z.b - Z.a), R.u() * P.Ly);
          events.inj += diff;
          diag.netInj[z] += diff;
        } else if (diff < 0) {
          // remove -diff random ones (highest index first keeps idx valid)
          for (var m = idx.length - 1; m > 0; m--) {
            var r = Math.floor(R.u() * (m + 1));
            var t = idx[m];
            idx[m] = idx[r];
            idx[r] = t;
          }
          var del = idx.slice(0, -diff).sort(function (p, q) {
            return q - p;
          });
          for (var d = 0; d < del.length; d++) removeAt(del[d]);
          events.out += -diff;
          diag.netInj[z] += diff;
        }
      }
    }

    function accumulate(A, alpha) {
      for (var kk = 0; kk <= M; kk++) {
        var vol = nodeVol(kk);
        A.rho[kk] += alpha * (rho[kk] - A.rho[kk]);
        A.E[kk] += alpha * (Ef[kk] - A.E[kk]);
        A.phi[kk] += alpha * (phi[kk] - A.phi[kk]);
        A.n[kk] += alpha * ((c * nodeE[kk]) / vol - A.n[kk]);
        A.p[kk] += alpha * ((c * nodeH[kk]) / vol - A.p[kk]);
      }
      A.Q += alpha * (lastQ - A.Q);
    }

    function step(count) {
      count = count || 1;
      var Tn = P.T / 300;
      var dt = P.dt, h = dt / 2;
      var cN = Math.exp((-gammaN * dt) / massN), cH = Math.exp((-gammaH * dt) / massN);
      var sN = Math.sqrt((Tn / massN) * (1 - cN * cN)), sH = Math.sqrt((Tn / massN) * (1 - cH * cH));
      for (var s = 0; s < count; s++) {
        var i;
        for (i = 0; i < n; i++) {
          var wasLeft = x[i] < 0;
          // B
          vx[i] += (h * fx[i]) / massN;
          vy[i] += (h * fy[i]) / massN;
          // A
          x[i] += h * vx[i];
          y[i] += h * vy[i];
          // O
          var hole = sp[i] > 0;
          var c1 = hole ? cH : cN, s1 = hole ? sH : sN;
          vx[i] = c1 * vx[i] + s1 * R.gauss();
          vy[i] = c1 * vy[i] + s1 * R.gauss();
          // A
          x[i] += h * vx[i];
          y[i] += h * vy[i];
          reflect(i, wasLeft);
        }
        buildCells();
        recombineAndGenerate();
        // Ohmic contacts exchange carriers only when the battery fixes the
        // terminal voltage (V != 0). At V = 0 the device is in open-circuit
        // equilibrium: no net current, so the contacts would exchange nothing;
        // keeping it closed means the charge is conserved exactly and V_bi
        // is set by generation-recombination alone, not by the boundary.
        if (contacted && P.V !== 0) contacts();
        buildCells();
        computeForces();
        for (i = 0; i < n; i++) {
          vx[i] += (h * fx[i]) / massN;
          vy[i] += (h * fy[i]) / massN;
        }
        stepCount++;
        accumulate(avg, Math.max(1 / P.avgSteps, 1 / (avg.w + 1)));
        avg.w++;
        cum.w++;
        accumulate(cum, 1 / cum.w);
      }
    }

    function contact() {
      if (contacted) return;
      contacted = true;
      contactStep = stepCount;
      resetAverages();
    }

    function resetAverages() {
      avg = newAverager();
      cum = newAverager();
    }

    function setParams(p) {
      var needReset = false;
      for (var key in p) {
        if (p[key] === P[key]) continue;
        if (key === 'ND' || key === 'NA' || key === 'carriers' || key === 'Lx' || key === 'Ly') needReset = true;
        P[key] = p[key];
      }
      if (needReset) reset();
      else {
        buildGenTable();
        resetAverages();
      }
    }

    /** Measurements on an averaged profile ('avg' = display EMA, 'cum' = mean since last change). */
    function measure(which) {
      var A = which === 'cum' ? cum : avg;
      var th = theory(P.ND, P.NA, P.T, P.V);
      var xs = function (kk) {
        return X0 + kk * dx;
      };
      // Bulk windows: next to each contact zone, 0.85 wide.
      var pa = X0 + P.contact + 0.05, pb = pa + 0.85, nb = X1 - P.contact - 0.05, na = nb - 0.85;
      var phiP = 0, phiN = 0, EP = 0, EN = 0, nP = 0, pP = 0, nN = 0, pN = 0, cp = 0, cn = 0;
      for (var kk = 0; kk <= M; kk++) {
        var xx = xs(kk);
        if (xx >= pa && xx <= pb) {
          phiP += A.phi[kk];
          EP += A.E[kk];
          nP += A.n[kk];
          pP += A.p[kk];
          cp++;
        } else if (xx >= na && xx <= nb) {
          phiN += A.phi[kk];
          EN += A.E[kk];
          nN += A.n[kk];
          pN += A.p[kk];
          cn++;
        }
      }
      phiP /= cp;
      phiN /= cn;
      EP /= cp;
      EN /= cn;
      nP /= cp;
      pP /= cp;
      nN /= cn;
      pN /= cn;
      var Ebulk = 0.5 * (EP + EN);
      // Peak field (E < 0 points from n to p) and the depletion charge it implies.
      var Emax = 0, kMax = 0;
      for (kk = 0; kk <= M; kk++) {
        var v = Ebulk - A.E[kk];
        if (v > Emax) {
          Emax = v;
          kMax = kk;
        }
      }
      var Qd = Emax; // Gauss: eps E_max = depleted charge per area (eps = 1)
      // Independent check: integrate rho over each side up to its bulk window.
      var Qn = 0, Qp = 0;
      for (kk = 0; kk <= M; kk++) {
        var xk = xs(kk), wgt = kk === 0 || kk === M ? dx / 2 : dx;
        if (Math.abs(xk) < 1e-9) {
          Qn += (A.rho[kk] * wgt) / 2;
          Qp -= (A.rho[kk] * wgt) / 2;
        } else if (xk > 0 && xk < na) Qn += A.rho[kk] * wgt;
        else if (xk < 0 && xk > pb) Qp -= A.rho[kk] * wgt;
      }
      var xn = Qd / P.ND, xp = Qd / P.NA;
      // Half-density edges: where the majority carrier falls to N/2.
      var edgeN = NaN, edgeP = NaN;
      for (kk = M; kk > 0; kk--) {
        if (xs(kk) < 0) break;
        if (A.n[kk] >= P.ND / 2 && A.n[kk - 1] < P.ND / 2) {
          edgeN = xs(kk - 1) + (dx * (P.ND / 2 - A.n[kk - 1])) / (A.n[kk] - A.n[kk - 1]);
          break;
        }
      }
      for (kk = 0; kk < M; kk++) {
        if (xs(kk) > 0) break;
        if (A.p[kk] >= P.NA / 2 && A.p[kk + 1] < P.NA / 2) {
          edgeP = xs(kk) + (dx * (A.p[kk] - P.NA / 2)) / (A.p[kk] - A.p[kk + 1]);
          break;
        }
      }
      var ni2 = th.ni * th.ni;
      var totalAbs = c * nI;
      return {
        steps: stepCount,
        samples: A.w,
        time: stepCount * P.dt,
        contacted: contacted,
        sinceContact: stepCount - contactStep,
        drop: phiN - phiP, // measured potential step between the bulks
        Vbi: phiN - phiP + P.V, // equals V_bi when V = 0
        Emax: Emax,
        xJ: xs(kMax),
        xn: xn,
        xp: xp,
        W: xn + xp,
        Qn: Qn, // positive charge per area on the n side
        Qp: Qp, // negative charge per area on the p side (as a positive number)
        edgeN: edgeN,
        edgeP: edgeP,
        Whalf: edgeN - edgeP,
        npN: (nN * pN) / ni2, // n p / n_i^2 in the n bulk
        npP: (nP * pP) / ni2,
        nBulkN: nN,
        pBulkN: pN,
        nBulkP: nP,
        pBulkP: pP,
        Qtot: A.Q, // net charge per area (units q N0 L0)
        QtotRel: (A.Q * P.Ly) / totalAbs, // relative to the total ion charge
        theory: th,
      };
    }

    function counts() {
      var e = 0, h = 0;
      for (var i = 0; i < n; i++) sp[i] > 0 ? h++ : e++;
      return { electrons: e, holes: h, donors: nI - countAcceptors(), acceptors: countAcceptors(), mobile: n };
    }
    var accCache = -1;
    function countAcceptors() {
      if (accCache >= 0) return accCache;
      var a = 0;
      for (var i = 0; i < nI; i++) if (is[i] < 0) a++;
      return a;
    }

    reset();

    return {
      params: P,
      step: step,
      reset: function () {
        accCache = -1;
        reset();
      },
      contact: contact,
      setParams: function (p) {
        accCache = -1;
        setParams(p);
      },
      resetAverages: resetAverages,
      /** Restart only the long mean used by measure('cum') (the display average keeps running). */
      resetCum: function () {
        cum = newAverager();
      },
      measure: measure,
      counts: counts,
      events: function () {
        return events;
      },
      diag: function () {
        return diag;
      },
      get contacted() {
        return contacted;
      },
      get chargePerParticle() {
        return c;
      },
      // Live views for drawing (do not modify).
      particles: function () {
        return { n: n, x: x, y: y, s: sp };
      },
      ions: function () {
        return { n: nI, x: ix, y: iy, s: is };
      },
      profiles: function (which) {
        var A = which === 'cum' ? cum : avg;
        var xsArr = new Float64Array(M + 1);
        for (var kk = 0; kk <= M; kk++) xsArr[kk] = X0 + kk * dx;
        return { x: xsArr, rho: A.rho, E: A.E, phi: A.phi, n: A.n, p: A.p };
      },
      instant: function () {
        return { rho: rho, E: Ef, phi: phi };
      },
      genRate: function () {
        var ni2 = niRel(P.T) / c;
        return P.prec * ni2 * ni2 * genZ * P.Lx * P.Ly;
      },
    };
  }

  var api = { create: create, theory: theory, poissonBoltzmann: poissonBoltzmann, niRel: niRel, SI: SI, UNITS: UNITS, DEFAULTS: DEFAULTS };
  root.PNSim = api;
  if (typeof module === 'object' && module && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
