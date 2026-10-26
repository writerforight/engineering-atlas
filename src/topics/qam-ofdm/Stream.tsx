import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ofdmSignal, randomBits, runSymbol, type Mat, type SymbolRun } from '../../core/math';
import { Canvas, Slider, dot, drawGridAxes, fmt, makeViewport, polyline, type DrawContext } from '../../core/ui';

/** Symbols kept for the console and the scope; older ones only live on in the counters. */
const KEEP = 300;
/** Points kept for the BER-over-time plot. */
const KEEP_BER = 2000;
/** Rolling BER window, in symbols. */
const WINDOW = 20;
/** Symbols visible in the scope. */
const SCOPE_SYMBOLS = 4;
const PAD = { l: 44, r: 10, t: 10, b: 22 };
/** Scope redraw interval in seconds (~30 fps); the simulation itself runs every frame. */
const FRAME = 1 / 30;

export interface StreamSymbol extends SymbolRun {
  index: number;
  /** Start time and duration in seconds. */
  t0: number;
  T: number;
  K: number;
  L: number;
  bits: string;
  sigma: number;
  seed: number;
}

type Line = { kind: 'symbol'; sym: StreamSymbol } | { kind: 'event'; id: number; text: string };

interface Props {
  K: number;
  L: number;
  levels: readonly number[];
  Phi: Mat;
  sigma: number;
  /** Called at every symbol start with the symbol in flight, and with null on reset. */
  onSymbol: (sym: StreamSymbol | null) => void;
}

const groups = (bits: string, w: number) => bits.match(new RegExp(`.{1,${2 * w}}`, 'g')) ?? [];

/** Live stream: symbols are made, sent, decoded and logged in real time. */
export default function Stream({ K, L, levels, Phi, sigma, onSymbol }: Props) {
  const [running, setRunning] = useState(false);
  const [rate, setRate] = useState(1);
  const [now, setNow] = useState(0);
  const [lines, setLines] = useState<Line[]>([]);
  const [ber, setBer] = useState<Array<{ t: number; cum: number; win: number; sigma: number }>>([]);
  const [totals, setTotals] = useState({ symbols: 0, bits: 0, errors: 0 });

  // The animation loop reads current settings through a ref so it never restarts on a slider move.
  const cfg = useRef({ K, L, levels, Phi, sigma, rate, onSymbol });
  cfg.current = { K, L, levels, Phi, sigma, rate, onSymbol };
  const sim = useRef({ t: 0, index: 0, eventId: 0, inflight: null as StreamSymbol | null, recent: [] as StreamSymbol[], window: [] as Array<[number, number]>, bits: 0, errors: 0 });

  const pushEvent = useCallback((text: string) => {
    const id = ++sim.current.eventId;
    setLines((ls) => [...ls, { kind: 'event' as const, id, text }].slice(-KEEP));
  }, []);

  const startSymbol = useCallback((t0: number) => {
    const c = cfg.current;
    const w = Math.log2(c.L);
    const index = ++sim.current.index;
    const bits = randomBits(c.K * 2 * w);
    const seed = (index * 104729) % 2147483646 || 1;
    const sym: StreamSymbol = { ...runSymbol(c.Phi, c.levels, bits, c.sigma, seed), index, t0, T: 1 / c.rate, K: c.K, L: c.L, bits, sigma: c.sigma, seed };
    sim.current.inflight = sym;
    c.onSymbol(sym);
  }, []);

  const finishSymbol = useCallback((sym: StreamSymbol) => {
    const s = sim.current;
    s.recent = [...s.recent, sym].slice(-SCOPE_SYMBOLS - 1);
    s.bits += sym.bits.length;
    s.errors += sym.bitErrors;
    s.window = [...s.window, [sym.bitErrors, sym.bits.length] as [number, number]].slice(-WINDOW);
    const [we, wb] = s.window.reduce(([e, b], [ee, bb]) => [e + ee, b + bb], [0, 0]);
    const point = { t: sym.t0 + sym.T, cum: s.errors / s.bits, win: we / wb, sigma: sym.sigma };
    setLines((ls) => [...ls, { kind: 'symbol' as const, sym }].slice(-KEEP));
    setBer((b) => [...b, point].slice(-KEEP_BER));
    setTotals({ symbols: sym.index, bits: s.bits, errors: s.errors });
  }, []);

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last: number | null = null;
    let shown = -Infinity;
    const tick = (ms: number) => {
      // A hidden tab stops rAF; the cap keeps a return from flooding the log with a burst of symbols.
      const dt = last === null ? 0 : Math.min(0.1, (ms - last) / 1000);
      last = ms;
      const s = sim.current;
      s.t += dt;
      if (!s.inflight) startSymbol(s.t);
      while (s.inflight && s.t >= s.inflight.t0 + s.inflight.T) {
        const done = s.inflight;
        finishSymbol(done);
        startSymbol(done.t0 + done.T);
      }
      if (s.t - shown >= FRAME) {
        shown = s.t;
        setNow(s.t);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, startSymbol, finishSymbol]);

  // Log setting changes while streaming, so the console explains jumps in the BER plot.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (sim.current.index > 0) pushEvent(`ayar: K=${K}, ${L * L}-QAM, N=${Phi.length}`);
  }, [K, L, Phi.length, pushEvent]);
  const sigmaTimer = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (sim.current.index === 0) return;
    window.clearTimeout(sigmaTimer.current);
    sigmaTimer.current = window.setTimeout(() => pushEvent(`gürültü σ = ${fmt(sigma, 2)}`), 300);
  }, [sigma, pushEvent]);
  useEffect(() => () => window.clearTimeout(sigmaTimer.current), []);

  const reset = () => {
    setRunning(false);
    sim.current = { t: 0, index: 0, eventId: 0, inflight: null, recent: [], window: [], bits: 0, errors: 0 };
    setNow(0);
    setLines([]);
    setBer([]);
    setTotals({ symbols: 0, bits: 0, errors: 0 });
    onSymbol(null);
  };

  const toggle = () => {
    if (!running) pushEvent(`${sim.current.index === 0 ? 'başladı' : 'devam'}: K=${K}, ${L * L}-QAM, N=${Phi.length}, ${fmt(rate, 2)} sembol/s, σ=${fmt(sigma, 2)}`);
    else pushEvent('durduruldu');
    setRunning((v) => !v);
  };

  const drawScope = useCallback(
    ({ ctx, width, height, palette: pal }: DrawContext) => {
      const s = sim.current;
      const syms = [...s.recent, ...(s.inflight ? [s.inflight] : [])];
      const T = s.inflight?.T ?? 1 / rate;
      const t1 = Math.max(now, SCOPE_SYMBOLS * T);
      const t0 = t1 - SCOPE_SYMBOLS * T;
      let hi = 1;
      for (const sym of syms) for (const v of sym.r) hi = Math.max(hi, Math.abs(v));
      const vp = makeViewport(width, height, { x: [t0, t1], y: [-hi * 1.1, hi * 1.1] }, PAD);
      drawGridAxes(ctx, vp, pal, { xLabel: 't [s]', yLabel: 's(t), r[n]' });
      for (const sym of syms) {
        if (sym.t0 + sym.T < t0) continue;
        const end = Math.min(sym.t0 + sym.T, now);
        polyline(ctx, vp, [[sym.t0, -hi * 1.1], [sym.t0, hi * 1.1]], pal.grid, 1, [3, 3]);
        const pts: Array<[number, number]> = [];
        const steps = 120;
        for (let i = 0; i <= steps; i++) {
          const t = sym.t0 + ((end - sym.t0) * i) / steps;
          pts.push([t, ofdmSignal(sym.C, (t - sym.t0) / sym.T)]);
        }
        polyline(ctx, vp, pts, pal.fg, 1.8);
        const N = sym.r.length;
        sym.r.forEach((v, n) => {
          const t = sym.t0 + (n / N) * sym.T;
          if (t <= now) dot(ctx, vp, [t, v], pal.c1, 3);
        });
        ctx.save();
        ctx.fillStyle = sym.bitErrors > 0 ? pal.c2 : pal.muted;
        ctx.font = '11px system-ui, sans-serif';
        ctx.fillText(`#${sym.index}${sym === s.inflight ? ' →' : sym.bitErrors > 0 ? ` ✗${sym.bitErrors}` : ' ✓'}`, vp.x(sym.t0) + 4, vp.top + 12);
        ctx.restore();
      }
    },
    [now, rate],
  );

  const drawBer = useCallback(
    ({ ctx, width, height, palette: pal }: DrawContext) => {
      const tEnd = Math.max(1, ber.at(-1)?.t ?? 1);
      let yMax = 0.05;
      for (const p of ber) yMax = Math.max(yMax, p.win, p.cum);
      yMax = Math.min(0.6, yMax * 1.15);
      const vp = makeViewport(width, height, { x: [0, tEnd], y: [0, yMax] }, PAD);
      drawGridAxes(ctx, vp, pal, { xLabel: 't [s]', yLabel: 'BER' });
      // σ drawn on its own 0–3 scale mapped to the full height.
      polyline(ctx, vp, ber.map((p) => [p.t, (p.sigma / 3) * yMax]), pal.muted, 1.2, [4, 4]);
      polyline(ctx, vp, ber.map((p) => [p.t, p.win]), pal.c2, 1.6);
      polyline(ctx, vp, ber.map((p) => [p.t, p.cum]), pal.c1, 2.2);
    },
    [ber],
  );

  const bitRate = K * 2 * Math.log2(L) * rate;

  return (
    <div className="controls">
      <div className="row">
        <button className="btn" aria-pressed={running} onClick={toggle}>
          {running ? 'Durdur' : totals.symbols > 0 ? 'Devam' : 'Başlat'}
        </button>
        <button className="btn" onClick={reset} disabled={totals.symbols === 0 && !running}>
          Sıfırla
        </button>
        <div style={{ flex: '1 1 260px' }}>
          <Slider label="Sembol hızı" value={rate} min={0.25} max={10} step={0.25} onChange={setRate} format={(v) => `${fmt(v, 2)} sembol/s · T = ${fmt(1000 / v, 0)} ms`} />
        </div>
      </div>
      <p className="canvas-caption" style={{ margin: 0 }}>
        Her sembol süresinde: rastgele {K * 2 * Math.log2(L)} bit → Gray ile seviyeler → C → Φc → +gürültü → Φᵀ ile okuma → karar →
        bitler. Bit hızı {fmt(bitRate, 1)} bit/s. Yeni hız bir sonraki sembolden itibaren geçerli; yukarıdaki paneller o an
        gönderilen sembolü gösterir.
      </p>

      <div className="panel">
        <Canvas draw={drawScope} aspect={0.28} maxHeight={260} ariaLabel="Akan sinyal" />
        <div className="legend" style={{ marginTop: 8 }}>
          <span><i style={{ background: 'var(--fg)' }} />gönderilen s(t)</span>
          <span><i style={{ background: 'var(--c1)' }} />alınan örnekler r[n]</span>
          <span>#n ✓ / ✗hata sayısı / → yolda</span>
        </div>
      </div>

      <Console lines={lines} w={Math.log2(L)} />

      <div className="panel readout">
        <span>
          Sembol: {totals.symbols} · bit: {totals.bits} · hatalı bit:{' '}
          <span className={totals.errors === 0 ? 'ok' : 'bad'}>{totals.errors}</span> · BER (toplam) ={' '}
          {totals.bits ? totals.errors / totals.bits === 0 ? '0' : (totals.errors / totals.bits).toExponential(2) : '—'} · son {WINDOW} sembol ={' '}
          {ber.length ? fmt(ber.at(-1)!.win, 3) : '—'}
        </span>
      </div>

      <div className="panel">
        <Canvas draw={drawBer} aspect={0.28} maxHeight={240} ariaLabel="Zamana göre BER" />
        <div className="legend" style={{ marginTop: 8 }}>
          <span><i style={{ background: 'var(--c1)' }} />BER (baştan beri)</span>
          <span><i style={{ background: 'var(--c2)' }} />BER (son {WINDOW} sembol)</span>
          <span><i style={{ background: 'var(--muted)' }} />σ (kesikli, 0–3 tam yükseklik)</span>
        </div>
      </div>
    </div>
  );
}

/** Log of the stream; memoized so the 60 fps scope does not re-render it. */
const Console = memo(function Console({ lines, w }: { lines: Line[]; w: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [follow, setFollow] = useState(true);
  useLayoutEffect(() => {
    if (follow && box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [lines, follow]);
  return (
    <div className="panel" style={{ padding: 0 }}>
      <div
        ref={box}
        className="mat-table"
        onScroll={(e) => {
          const el = e.currentTarget;
          setFollow(el.scrollHeight - el.scrollTop - el.clientHeight < 8);
        }}
        style={{ height: 220, overflow: 'auto', padding: '8px 12px', background: 'var(--bg-sunk)', borderRadius: 'inherit', lineHeight: 1.6 }}
        role="log"
        aria-label="Akış konsolu"
      >
        {lines.length === 0 && <span style={{ color: 'var(--muted)' }}>Konsol boş. Başlat’a bas.</span>}
        {lines.map((l) =>
          l.kind === 'event' ? (
            <div key={`e${l.id}`} style={{ color: 'var(--c4)' }}>
              — {l.text}
            </div>
          ) : (
            <SymbolLine key={`s${l.sym.index}`} sym={l.sym} w={Math.log2(l.sym.L) || w} />
          ),
        )}
      </div>
    </div>
  );
});

function SymbolLine({ sym, w }: { sym: StreamSymbol; w: number }) {
  const tx = groups(sym.bits, w);
  const rx = groups(sym.rxBits, w);
  return (
    <div style={{ whiteSpace: 'nowrap' }}>
      <span style={{ color: 'var(--muted)' }}>
        #{String(sym.index).padStart(4, '0')} t={fmt(sym.t0, 2).padStart(7, ' ')}s{' '}
      </span>
      TX {tx.join(' ')} <span style={{ color: 'var(--muted)' }}>→</span> RX{' '}
      {rx.map((g, k) => (
        <span key={k}>
          {[...g].map((c, j) =>
            c === tx[k]?.[j] ? (
              c
            ) : (
              <b key={j} className="bad" style={{ textDecoration: 'underline' }}>
                {c}
              </b>
            ),
          )}{' '}
        </span>
      ))}
      {sym.bitErrors === 0 ? <span className="ok">✓</span> : <span className="bad">✗ {sym.bitErrors} bit</span>}
    </div>
  );
}
