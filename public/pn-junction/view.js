/*
 * p-n junction page: drawing, controls, live plots and the comparison table.
 * Uses window.PNSim from sim.js (no physics here).
 */
(function () {
  'use strict';
  var PN = window.PNSim;
  var $ = function (id) {
    return document.getElementById(id);
  };

  // ---------------------------------------------------------------- theme
  // Same choices as the site: ?theme=, a message from the embedding page,
  // the site's stored choice, else the system setting.
  var params = new URLSearchParams(location.search);
  var embedded = params.has('embed');
  if (embedded) document.body.classList.add('embedded');
  function systemDark() {
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }
  function storedTheme() {
    try {
      return localStorage.getItem('atlas-theme');
    } catch (e) {
      return null;
    }
  }
  var forcedTheme = params.get('theme');
  function applyTheme(t) {
    var dark = t === 'dark' || (t !== 'light' && systemDark());
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    colors = readColors();
  }
  window.addEventListener('message', function (e) {
    if (e.origin !== location.origin && location.protocol !== 'file:') return;
    if (e.data && e.data.type === 'atlas-theme') applyTheme(e.data.theme);
  });
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
      applyTheme(forcedTheme || storedTheme() || 'system');
    });
  }
  var colors = {};
  function readColors() {
    var cs = getComputedStyle(document.documentElement);
    var get = function (n) {
      return cs.getPropertyValue(n).trim();
    };
    return {
      bg: get('--bg-elev'),
      fg: get('--fg'),
      muted: get('--muted'),
      grid: get('--grid'),
      axis: get('--axis'),
      border: get('--border'),
      elec: get('--elec'),
      hole: get('--hole'),
      don: get('--don'),
      acc: get('--acc'),
      pside: get('--pside'),
      nside: get('--nside'),
      theory: get('--theory'),
      pb: get('--pb'),
      meas: get('--meas'),
      sunk: get('--bg-sunk'),
    };
  }
  applyTheme(forcedTheme || storedTheme() || 'system');

  // Report the height to an embedding page (the site shows this in an iframe).
  function postHeight() {
    if (window.parent === window) return;
    try {
      // Content height (not scrollHeight, which never drops below the frame's own height).
      window.parent.postMessage({ type: 'pn-height', h: document.querySelector('main').getBoundingClientRect().height }, '*');
    } catch (e) {
      /* no parent */
    }
  }
  if (window.ResizeObserver) new ResizeObserver(postHeight).observe(document.body);

  // ---------------------------------------------------------------- simulation
  var sim = PN.create({ seed: (Date.now() & 0xffff) + 1 });
  var running = !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var slow = false;
  var stepsPerFrame = 12;
  var autoContactAt = performance.now() + 1200;
  var changeStep = 0; // step of the last parameter change (for the measurement window)
  var SETTLE = 12000; // steps to wait before the long mean starts (V_bi settles in ~10^4 steps)
  var cumStarted = false;
  var pb = null;

  function refreshReference() {
    var P = sim.params;
    pb = PN.poissonBoltzmann(P.ND, P.NA, P.T, P.V, P.Lx, 600);
  }
  refreshReference();

  function markChange() {
    changeStep = sim.measure('avg').steps;
    cumStarted = false;
    refreshReference();
  }

  // ---------------------------------------------------------------- controls
  var fmtE = function (v) {
    var e = Math.floor(Math.log10(v));
    return (v / Math.pow(10, e)).toFixed(1).replace('.', ',') + '·10' + sup(e);
  };
  function sup(e) {
    var map = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
    return String(e)
      .split('')
      .map(function (ch) {
        return map[ch];
      })
      .join('');
  }
  var num = function (v, d) {
    return v.toFixed(d === undefined ? 2 : d).replace('.', ',').replace('-', '−');
  };

  function syncLabels() {
    var P = sim.params;
    $('nd-out').textContent = P.ND + ' n_i = ' + fmtE(P.ND * PN.UNITS.N0) + ' cm⁻³';
    $('na-out').textContent = P.NA + ' n_i = ' + fmtE(P.NA * PN.UNITS.N0) + ' cm⁻³';
    $('temp-out').textContent = P.T + ' K (n_i = ' + fmtE(PN.niRel(P.T) * PN.UNITS.N0) + ' cm⁻³)';
    var mv = P.V * PN.UNITS.VT * 1000;
    $('volt-out').textContent = num(P.V, 1) + ' V_T = ' + num(mv, 0) + ' mV' + (P.V > 0 ? ' (ileri)' : P.V < 0 ? ' (ters)' : '');
  }

  $('nd').addEventListener('input', function () {
    sim.setParams({ ND: Number(this.value) });
    autoContactAt = performance.now() + 900;
    markChange();
    syncLabels();
  });
  $('na').addEventListener('input', function () {
    sim.setParams({ NA: Number(this.value) });
    autoContactAt = performance.now() + 900;
    markChange();
    syncLabels();
  });
  $('temp').addEventListener('input', function () {
    sim.setParams({ T: Number(this.value) });
    markChange();
    syncLabels();
  });
  $('volt').addEventListener('input', function () {
    sim.setParams({ V: Number(this.value) });
    markChange();
    syncLabels();
  });
  $('play').addEventListener('click', function () {
    running = !running;
    syncButtons();
  });
  $('reset').addEventListener('click', function () {
    sim.reset();
    autoContactAt = performance.now() + 1200;
    markChange();
  });
  $('contact').addEventListener('click', function () {
    sim.contact();
    autoContactAt = Infinity;
    markChange();
  });
  $('slow').addEventListener('click', function () {
    slow = !slow;
    syncButtons();
  });
  function syncButtons() {
    $('play').textContent = running ? 'Duraklat' : 'Devam';
    $('play').setAttribute('aria-pressed', String(!running));
    $('slow').setAttribute('aria-pressed', String(slow));
    $('contact').disabled = sim.contacted;
  }
  syncLabels();
  syncButtons();

  // ---------------------------------------------------------------- canvases
  function fit(canvas, aspect) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = canvas.clientWidth || canvas.parentNode.clientWidth;
    var h = Math.round(w * aspect);
    canvas.style.height = h + 'px';
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: w, h: h };
  }

  function drawBox(m) {
    var P = sim.params;
    var c = fit($('box'), P.Ly / P.Lx);
    var ctx = c.ctx, w = c.w, h = c.h;
    var sx = w / P.Lx, sy = h / P.Ly;
    var X = function (x) {
      return (x + P.Lx / 2) * sx;
    };
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = colors.pside;
    ctx.fillRect(0, 0, X(0), h);
    ctx.fillStyle = colors.nside;
    ctx.fillRect(X(0), 0, w - X(0), h);
    // contact zones
    ctx.fillStyle = colors.sunk;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(0, 0, P.contact * sx, h);
    ctx.fillRect(w - P.contact * sx, 0, P.contact * sx, h);
    ctx.globalAlpha = 1;

    // fixed ions: small squares (pale), drawn first
    var I = sim.ions();
    var r = Math.max(1.6, w / 520);
    ctx.fillStyle = colors.don;
    for (var i = 0; i < I.n; i++) if (I.s[i] > 0) ctx.fillRect(X(I.x[i]) - r, I.y[i] * sy - r, 2 * r, 2 * r);
    ctx.fillStyle = colors.acc;
    for (i = 0; i < I.n; i++) if (I.s[i] < 0) ctx.fillRect(X(I.x[i]) - r, I.y[i] * sy - r, 2 * r, 2 * r);

    // carriers: dots
    var C = sim.particles();
    var rr = Math.max(1.7, w / 480);
    function dots(sign, color) {
      ctx.fillStyle = color;
      ctx.beginPath();
      for (var k = 0; k < C.n; k++) {
        if (C.s[k] !== sign) continue;
        var px = X(C.x[k]), py = C.y[k] * sy;
        ctx.moveTo(px + rr, py);
        ctx.arc(px, py, rr, 0, 6.2832);
      }
      ctx.fill();
    }
    dots(-1, colors.elec);
    dots(+1, colors.hole);

    // junction, wall before contact, depletion edges
    ctx.lineWidth = sim.contacted ? 1 : 4;
    ctx.strokeStyle = sim.contacted ? colors.axis : colors.fg;
    ctx.setLineDash(sim.contacted ? [3, 4] : []);
    ctx.beginPath();
    ctx.moveTo(X(0), 0);
    ctx.lineTo(X(0), h);
    ctx.stroke();
    ctx.setLineDash([]);
    if (sim.contacted) {
      var th = m.theory;
      vline(ctx, X(-th.xp), h, colors.theory, [7, 5], 2);
      vline(ctx, X(th.xn), h, colors.theory, [7, 5], 2);
      if (isFinite(m.edgeP) && isFinite(m.edgeN)) {
        vline(ctx, X(-m.xp), h, colors.meas, [], 2);
        vline(ctx, X(m.xn), h, colors.meas, [], 2);
      }
    }
    // labels
    ctx.font = '600 13px ' + getComputedStyle(document.body).fontFamily;
    ctx.fillStyle = colors.fg;
    ctx.textBaseline = 'top';
    label(ctx, 'p tarafı', X(-P.Lx / 4), 6);
    label(ctx, 'n tarafı', X(P.Lx / 4), 6);
    ctx.font = '11px ' + getComputedStyle(document.body).fontFamily;
    ctx.fillStyle = colors.muted;
    ctx.save();
    ctx.translate(P.contact * sx * 0.5, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText(P.V !== 0 ? 'ohmik kontak' : 'kontak (açık devre)', 0, -6);
    ctx.restore();
    ctx.save();
    ctx.translate(w - P.contact * sx * 0.5, h / 2);
    ctx.rotate(Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText(P.V !== 0 ? 'ohmik kontak' : 'kontak (açık devre)', 0, -6);
    ctx.restore();
  }
  function label(ctx, text, x, y) {
    ctx.textAlign = 'center';
    var wd = ctx.measureText(text).width + 10;
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = colors.bg;
    ctx.fillRect(x - wd / 2, y - 2, wd, 18);
    ctx.restore();
    ctx.fillText(text, x, y);
  }
  function vline(ctx, x, h, color, dash, width) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width || 1;
    ctx.setLineDash(dash || []);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // ---------------------------------------------------------------- plots
  function plot(canvas, o) {
    var c = fit(canvas, 0.55);
    var ctx = c.ctx, w = c.w, h = c.h;
    var L = 46, Rm = 8, T = 8, B = 22;
    var x0 = o.x[0], x1 = o.x[1], y0 = o.y[0], y1 = o.y[1];
    var log = !!o.log;
    var tY = function (v) {
      return log ? Math.log10(Math.max(v, 1e-9)) : v;
    };
    var X = function (x) {
      return L + ((x - x0) / (x1 - x0)) * (w - L - Rm);
    };
    var Y = function (v) {
      return T + (1 - (tY(v) - y0) / (y1 - y0)) * (h - T - B);
    };
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, w, h);
    ctx.font = '11px ' + getComputedStyle(document.body).fontFamily;
    ctx.fillStyle = colors.muted;
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    // y grid
    var ticks = o.yticks;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (var i = 0; i < ticks.length; i++) {
      var yv = ticks[i];
      var py = T + (1 - (yv - y0) / (y1 - y0)) * (h - T - B);
      ctx.beginPath();
      ctx.moveTo(L, py);
      ctx.lineTo(w - Rm, py);
      ctx.stroke();
      ctx.fillText(log ? (yv === 0 ? '1' : '10' + sup(yv)) : num(yv, Math.abs(yv) < 10 && yv % 1 ? 1 : 0), L - 4, py);
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (var xv = Math.ceil(x0); xv <= x1; xv++) {
      var px = X(xv);
      var lastTick = xv + 1 > x1;
      ctx.beginPath();
      ctx.moveTo(px, T);
      ctx.lineTo(px, h - B);
      ctx.stroke();
      if (!lastTick) ctx.fillText(num(xv, 0), px, h - B + 4);
    }
    ctx.textAlign = 'right';
    ctx.fillText('x [L₀]', w - Rm, h - B + 4);
    // zero line
    if (!log && y0 < 0 && y1 > 0) {
      ctx.strokeStyle = colors.axis;
      ctx.beginPath();
      ctx.moveTo(L, Y(0));
      ctx.lineTo(w - Rm, Y(0));
      ctx.stroke();
    }
    // vertical markers
    (o.vlines || []).forEach(function (v) {
      if (!isFinite(v.x)) return;
      ctx.strokeStyle = v.color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash(v.dash || []);
      ctx.beginPath();
      ctx.moveTo(X(v.x), T);
      ctx.lineTo(X(v.x), h - B);
      ctx.stroke();
      ctx.setLineDash([]);
    });
    // series
    ctx.save();
    ctx.beginPath();
    ctx.rect(L, T, w - L - Rm, h - T - B);
    ctx.clip();
    o.series.forEach(function (s) {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width || 1.6;
      ctx.setLineDash(s.dash || []);
      ctx.beginPath();
      var started = false;
      for (var k = 0; k < s.xs.length; k++) {
        var vy = s.ys[k];
        if (!isFinite(vy) || (log && vy <= 0)) {
          started = false;
          continue;
        }
        var qx = X(s.xs[k]), qy = Y(vy);
        if (!started) {
          ctx.moveTo(qx, qy);
          started = true;
        } else ctx.lineTo(qx, qy);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    });
    ctx.restore();
  }

  function niceTicks(lo, hi, n) {
    var span = hi - lo, raw = span / n;
    var mag = Math.pow(10, Math.floor(Math.log10(raw)));
    var step = [1, 2, 5, 10].map(function (f) {
      return f * mag;
    }).find(function (s) {
      return span / s <= n;
    });
    var out = [];
    for (var v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Math.round(v / step) * step);
    return out;
  }

  // Depletion-approximation curves (the formulas), on the plot grid.
  function depletionCurves(th, ND, NA, xs) {
    var rho = [], E = [], phi = [];
    for (var k = 0; k < xs.length; k++) {
      var x = xs[k];
      if (x < -th.xp) {
        rho.push(0);
        E.push(0);
        phi.push(0);
      } else if (x < 0) {
        rho.push(-NA);
        E.push(-NA * (x + th.xp));
        phi.push((NA / 2) * Math.pow(x + th.xp, 2));
      } else if (x < th.xn) {
        rho.push(ND);
        E.push(-ND * (th.xn - x));
        phi.push(th.drop - (ND / 2) * Math.pow(th.xn - x, 2));
      } else {
        rho.push(0);
        E.push(0);
        phi.push(th.drop);
      }
    }
    return { rho: rho, E: E, phi: phi };
  }

  function drawPlots(m) {
    var P = sim.params;
    var pr = sim.profiles('avg');
    var th = m.theory;
    var xs = Array.prototype.slice.call(pr.x);
    var dep = depletionCurves(th, P.ND, P.NA, xs);
    var vl = [
      { x: -th.xp, color: colors.theory, dash: [6, 4] },
      { x: th.xn, color: colors.theory, dash: [6, 4] },
    ];
    if (sim.contacted) vl.push({ x: -m.xp, color: colors.meas }, { x: m.xn, color: colors.meas });
    var X = [-P.Lx / 2, P.Lx / 2];
    var nmax = Math.max(P.ND, P.NA);

    // phi: shift so that the p bulk sits at 0 (same reference for all curves)
    var phiSim = [], k;
    var ref = 0, cnt = 0;
    for (k = 0; k < xs.length; k++) {
      if (xs[k] > -P.Lx / 2 + P.contact + 0.05 && xs[k] < -P.Lx / 2 + P.contact + 0.9) {
        ref += pr.phi[k];
        cnt++;
      }
    }
    ref /= cnt || 1;
    for (k = 0; k < xs.length; k++) phiSim.push(pr.phi[k] - ref);
    var pbPhi = [], pbRef = 0, pbc = 0;
    for (k = 0; k < pb.x.length; k++) {
      if (pb.x[k] > -P.Lx / 2 + P.contact + 0.05 && pb.x[k] < -P.Lx / 2 + P.contact + 0.9) {
        pbRef += pb.phi[k];
        pbc++;
      }
    }
    pbRef /= pbc || 1;
    for (k = 0; k < pb.x.length; k++) pbPhi.push(pb.phi[k] - pbRef);
    var pbX = Array.prototype.slice.call(pb.x);

    var rhoLim = 1.35 * nmax;
    plot($('p-rho'), {
      x: X,
      y: [-rhoLim, rhoLim],
      yticks: niceTicks(-rhoLim, rhoLim, 5),
      vlines: vl,
      series: [
        { xs: xs, ys: Array.prototype.slice.call(pr.rho), color: colors.fg, width: 1.6 },
        { xs: pbX, ys: Array.prototype.slice.call(pb.rho), color: colors.pb, dash: [2, 3], width: 1.6 },
        { xs: xs, ys: dep.rho, color: colors.theory, dash: [6, 4], width: 2 },
      ],
    });
    var eLim = 1.25 * Math.max(th.Emax, 1);
    plot($('p-e'), {
      x: X,
      y: [-eLim, 0.25 * eLim],
      yticks: niceTicks(-eLim, 0.25 * eLim, 5),
      vlines: vl,
      series: [
        { xs: xs, ys: Array.prototype.slice.call(pr.E), color: colors.fg, width: 1.6 },
        { xs: pbX, ys: Array.prototype.slice.call(pb.E), color: colors.pb, dash: [2, 3], width: 1.6 },
        { xs: xs, ys: dep.E, color: colors.theory, dash: [6, 4], width: 2 },
      ],
    });
    var pLo = -0.15 * Math.max(th.drop, 1), pHi = 1.2 * Math.max(th.drop, 1);
    plot($('p-phi'), {
      x: X,
      y: [pLo, pHi],
      yticks: niceTicks(pLo, pHi, 5),
      vlines: vl,
      series: [
        { xs: xs, ys: phiSim, color: colors.fg, width: 1.6 },
        { xs: pbX, ys: pbPhi, color: colors.pb, dash: [2, 3], width: 1.6 },
        { xs: xs, ys: dep.phi, color: colors.theory, dash: [6, 4], width: 2 },
      ],
    });
    var lo = -3, hi = Math.ceil(Math.log10(nmax * 1.5) * 2) / 2;
    var bulkN = xs.map(function (x) {
      return x > 0 ? P.ND : (th.ni * th.ni) / P.NA;
    });
    var bulkP = xs.map(function (x) {
      return x < 0 ? P.NA : (th.ni * th.ni) / P.ND;
    });
    plot($('p-np'), {
      x: X,
      y: [lo, hi],
      log: true,
      yticks: niceTicks(lo, hi, 5).filter(function (v) {
        return v % 1 === 0;
      }),
      vlines: vl,
      series: [
        { xs: xs, ys: bulkN, color: colors.theory, dash: [6, 4], width: 1.4 },
        { xs: xs, ys: bulkP, color: colors.theory, dash: [6, 4], width: 1.4 },
        { xs: pbX, ys: Array.prototype.slice.call(pb.n), color: colors.pb, dash: [2, 3], width: 1.4 },
        { xs: pbX, ys: Array.prototype.slice.call(pb.p), color: colors.pb, dash: [2, 3], width: 1.4 },
        { xs: xs, ys: Array.prototype.slice.call(pr.n), color: colors.elec, width: 1.8 },
        { xs: xs, ys: Array.prototype.slice.call(pr.p), color: colors.hole, width: 1.8 },
      ],
    });
  }

  // ---------------------------------------------------------------- table
  function dev(a, b) {
    return b ? (a / b - 1) * 100 : NaN;
  }
  var settled = false;
  function devCell(d, limit) {
    if (!isFinite(d)) return '<td>—</td>';
    var cls = !settled ? 'wait' : Math.abs(d) <= (limit || 15) ? 'ok' : 'bad';
    return '<td class="' + cls + '">' + (d >= 0 ? '+' : '−') + num(Math.abs(d), 1) + ' %</td>';
  }
  function row(name, formula, pbv, meas, d, limit, digits) {
    var f = function (v) {
      return isFinite(v) ? num(v, digits === undefined ? 3 : digits) : '—';
    };
    return '<tr><td>' + name + '</td><td>' + f(formula) + '</td><td>' + f(pbv) + '</td><td>' + f(meas) + '</td>' + devCell(d, limit) + devCell(dev(meas, pbv), 15) + '</tr>';
  }

  function updateTable(m, source, isSettled) {
    settled = isSettled;
    var th = m.theory, P = sim.params;
    var L0um = PN.UNITS.L0 * 1e4;
    var html =
      '<thead><tr><th>Büyüklük</th><th>Formül</th><th>PB (tam)</th><th>Simülasyon</th><th>Sapma (formül)</th><th>Sapma (PB)</th></tr></thead><tbody>';
    if (P.V === 0) html += row('V<sub>bi</sub> [V<sub>T</sub>]', th.Vbi, pb.drop, m.Vbi, dev(m.Vbi, th.Vbi), 15, 2);
    else html += row('V<sub>bi</sub> − V [V<sub>T</sub>]', th.drop, pb.drop, m.drop, dev(m.drop, th.drop), 15, 2);
    html += row('W [L<sub>0</sub>]', th.W, pb.W, m.W, dev(m.W, th.W), 15);
    html += row('x<sub>n</sub> [L<sub>0</sub>]', th.xn, pb.xn, m.xn, dev(m.xn, th.xn), 15);
    html += row('x<sub>p</sub> [L<sub>0</sub>]', th.xp, pb.xp, m.xp, dev(m.xp, th.xp), 15);
    html += row('E<sub>max</sub> [V<sub>T</sub>/L<sub>0</sub>]', th.Emax, pb.Emax, m.Emax, dev(m.Emax, th.Emax), 15, 2);
    html +=
      '<tr><td>W, yarı yoğunluk sınırları</td><td>—</td><td>' +
      num(pb.Whalf, 3) +
      '</td><td>' +
      (isFinite(m.Whalf) ? num(m.Whalf, 3) : '—') +
      '</td><td>—</td>' +
      devCell(dev(m.Whalf, pb.Whalf), 15) +
      '</tr>';
    html += '</tbody>';
    var np1 = m.npN, np2 = m.npP;
    html +=
      '<tbody><tr><td colspan="6"><b>Denetimler</b></td></tr>' +
      '<tr><td>Yük dengesi N<sub>D</sub>x<sub>n</sub> = N<sub>A</sub>x<sub>p</sub></td><td colspan="2">' +
      num(P.ND * th.xn, 2) +
      ' = ' +
      num(P.NA * th.xp, 2) +
      '</td><td colspan="3">∫ρ dx ayrı ayrı: n tarafı +' +
      num(m.Qn, 2) +
      ', p tarafı −' +
      num(m.Qp, 2) +
      ' (fark ' +
      num(dev(m.Qn, m.Qp), 1) +
      ' %)</td></tr>' +
      '<tr><td>n·p / n<sub>i</sub><sup>2</sup> gövdede</td><td colspan="2">1</td><td colspan="3">n tarafı ' +
      num(np1, 2) +
      ', p tarafı ' +
      num(np2, 2) +
      (P.V !== 0 ? ' (kutuplamada gövde dengede kalır, kavşakta değil)' : '') +
      '</td></tr>' +
      '<tr><td>Toplam yük / iyon yükü</td><td colspan="2">0</td><td colspan="3">' +
      num(m.QtotRel * 100, 3) +
      ' %</td></tr>' +
      '<tr><td>Birimler (Si, 300 K)</td><td colspan="5">L<sub>0</sub> = ' +
      num(L0um, 1) +
      ' µm, V<sub>T</sub> = 25,85 mV, n<sub>i</sub> = 10¹⁰ cm⁻³ → W<sub>formül</sub> = ' +
      num(th.W * L0um, 1) +
      ' µm, V<sub>bi</sub> = ' +
      num(th.Vbi * PN.UNITS.VT * 1000, 0) +
      ' mV, E<sub>max</sub> = ' +
      num(th.Emax * PN.UNITS.E0, 0) +
      ' V/cm</td></tr>' +
      '<tr><td>Ortalama</td><td colspan="5">' +
      source +
      '</td></tr></tbody>';
    $('cmp').innerHTML = html;

    // explanations next to the numbers
    var notes = [];
    var dW = dev(m.W, th.W);
    if (!settled) {
      notes.push('<div class="callout warn">' + (sim.contacted ? 'Oturuyor: sapmalar henüz anlamlı değil (gri). Uzun ortalama başlayınca renklenir.' : 'Temastan önce: tükenim bölgesi yok.') + '</div>');
    } else if (Math.abs(dW) > 15) {
      notes.push(
        '<div class="callout info"><b>W formülden ' +
          num(Math.abs(dW), 0) +
          ' % ' +
          (dW < 0 ? 'küçük' : 'büyük') +
          ':</b> tükenim yaklaşımı bölgenin tamamen boş, dışının tamamen nötr olduğunu varsayar. Gerçekte çoğunluk taşıyıcıları bölgeye Debye uzunluğu L<sub>D</sub> = ' +
          num(th.LDn, 2) +
          ' L<sub>0</sub> kadar sızar; yük için V<sub>bi</sub> − V yerine yaklaşık V<sub>bi</sub> − V − 2V<sub>T</sub> kalır (W ≈ ' +
          num(th.Wkt, 3) +
          '). V<sub>bi</sub>/V<sub>T</sub> = ' +
          num(th.Vbi / th.VT, 1) +
          ' küçük olduğu için (gerçek parçacık sayısıyla azınlık taşıyıcısı ancak böyle kalır) fark belirgindir. Aynı istatistiğin tam çözümü (PB) ile karşılaştırma sağ sütunda.</div>',
      );
    }
    if (Math.max(th.xn, th.xp) > 1.5) {
      notes.push('<div class="callout warn">Tükenim bölgesi kutuya göre geniş: gövde ölçüm pencereleri (kontaktan 0,85 L<sub>0</sub>) bölgeye değebilir.</div>');
    }
    if (P.T < 295 && P.V === 0) {
      notes.push('<div class="callout warn">Düşük sıcaklıkta n<sub>i</sub> küçük: her tarafta ortalama birden az azınlık parçacığı kalır, V<sub>bi</sub> ölçümü yavaş oturur ve gürültülüdür.</div>');
    }
    $('callouts').innerHTML = notes.join('');
  }

  // ---------------------------------------------------------------- loop
  var lastT = performance.now(), fpsAvg = 60, simMs = 0, lastTable = 0;
  function frame(now) {
    var dt = now - lastT;
    lastT = now;
    if (dt > 0 && dt < 1000) fpsAvg += (1000 / dt - fpsAvg) * 0.05;
    if (running && !sim.contacted && now >= autoContactAt) {
      sim.contact();
      markChange();
    }
    var t0 = performance.now();
    if (running) {
      var n = slow ? 1 : stepsPerFrame;
      sim.step(n);
    }
    var spent = performance.now() - t0;
    simMs += (spent - simMs) * 0.1;
    // keep the frame budget: adapt the number of steps (8-30) per frame
    if (running && !slow) {
      if (simMs > 20 && stepsPerFrame > 4) stepsPerFrame--;
      else if (simMs < 12 && stepsPerFrame < 40) stepsPerFrame++;
    }
    var m = sim.measure('avg');
    // measurement window: wait SETTLE steps after a change, then start the long mean
    if (sim.contacted && !cumStarted && m.steps - changeStep > SETTLE) {
      sim.resetCum();
      cumStarted = true;
    }
    drawBox(m);
    drawPlots(m);
    if (now - lastTable > 300) {
      lastTable = now;
      var mc = sim.measure('cum');
      var useCum = cumStarted && mc.samples > 1500;
      updateTable(useCum ? mc : m, useCum ? 'oturduktan sonraki ' + mc.samples + ' adım (uzun ortalama)' : 'son ~2000 adım (oturma süresi; uzun ortalama ' + Math.max(0, SETTLE - (m.steps - changeStep)) + ' adım sonra başlar)', useCum);
      var cnt = sim.counts();
      $('perf').textContent =
        num(fpsAvg, 0) +
        ' kare/s · ' +
        (slow ? 1 : stepsPerFrame) +
        ' adım/kare · ' +
        cnt.mobile +
        ' hareketli + ' +
        (cnt.donors + cnt.acceptors) +
        ' sabit';
      $('status').textContent = !sim.contacted
        ? 'Temastan önce: iki taraf ayrı ve kendi içinde nötr (ortadaki duvar). Temas birazdan kendiliğinden olur.'
        : 'Temastan beri ' + (m.sinceContact | 0) + ' adım (≈ ' + num(((m.sinceContact * sim.params.dt * PN.UNITS.t0) * 1e9), 0) + ' ns). ' + (sim.params.V === 0 ? 'Açık devre: denge.' : 'Kutuplama: kontaklar taşıyıcı alıp veriyor.');
      syncButtons();
      postHeight();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  window.addEventListener('resize', postHeight);
})();
