import { useCallback, useMemo, useRef, useState } from 'react';
import {
  amplitudes, cosMatrix, derivCoeffs, derivative, diffMatrix, integral, project, sinMatrix, synth, trigGrid,
  type DiffMethod, type Mat, type TrigGrid,
} from '../../core/math';
import {
  Canvas, Slider, Tabs, Tex, dot, drawGridAxes, fmt, makeViewport, polyline,
  type CanvasPointer, type DrawContext,
} from '../../core/ui';

type Op = 'none' | 'deriv' | 'integral';
type Preset = 'cos2' | 'mix' | 'gauss' | 'square' | 'saw' | 'custom';

const PRESETS: Array<{ id: Exclude<Preset, 'custom'>; label: string; f: (t: number) => number }> = [
  { id: 'cos2', label: 'cos 2t', f: (t) => Math.cos(2 * t) },
  { id: 'mix', label: '1 + cos t + ½ sin 3t', f: (t) => 1 + Math.cos(t) + 0.5 * Math.sin(3 * t) },
  { id: 'gauss', label: 'Gauss darbesi', f: (t) => 1.8 * Math.exp(-((t - Math.PI) ** 2) / 0.5) },
  { id: 'square', label: 'Kare dalga', f: (t) => (t < Math.PI ? 1 : -1) },
  { id: 'saw', label: 'Testere', f: (t) => t / Math.PI - 1 },
];
const METHODS: Array<{ id: DiffMethod; label: string }> = [
  { id: 'central', label: 'Merkezi fark D' },
  { id: 'backward', label: 'Geri fark' },
  { id: 'spectral', label: 'Tam spektral (ω çarpanı)' },
];
const Y_MAX = 2.5;
const PAD = { l: 40, r: 10, t: 12, b: 24 };
const FINE = 400;

const sample = (g: TrigGrid, f: (t: number) => number) => g.t.map(f);

export default function Viz() {
  const [N, setN] = useState(10);
  const [preset, setPreset] = useState<Preset>('mix');
  const [f, setF] = useState(() => sample(trigGrid(10), PRESETS[1]!.f));
  const [op, setOp] = useState<Op>('deriv');
  const [method, setMethod] = useState<DiffMethod>('central');
  const [F0, setF0] = useState(0);
  const [selK, setSelK] = useState<number | null>(2);
  const [mat, setMat] = useState<'C' | 'S'>('C');
  const drag = useRef<number | null>(null);

  const g = useMemo(() => trigGrid(N), [N]);
  const C = useMemo(() => cosMatrix(g), [g]);
  const S = useMemo(() => sinMatrix(g), [g]);
  const amp = useMemo(() => amplitudes(g, f), [g, f]);
  const fc = useMemo(() => project(C, f, g.dt), [C, f, g]);
  const fs = useMemo(() => project(S, f, g.dt), [S, f, g]);

  // result samples and, where it exists, a continuous curve
  const res = useMemo(() => {
    if (op === 'none') return null;
    if (op === 'deriv') {
      const y = derivative(g, f, method);
      const d = derivCoeffs(g, amp.a, amp.b);
      return { y, exact: (t: number) => synth(g, d.a, d.b, t), mean: 0 };
    }
    const I = integral(g, f, method, F0);
    const spec = integral(g, f, 'spectral', F0);
    return { y: I.F, exact: spec.at!, mean: I.mean };
  }, [op, method, F0, g, f, amp]);
  const gc = useMemo(() => (res ? project(C, res.y, g.dt) : null), [res, C, g]);
  const gs = useMemo(() => (res ? project(S, res.y, g.dt) : null), [res, S, g]);

  const choosePreset = (p: Preset, n = N) => {
    setPreset(p);
    const def = PRESETS.find((x) => x.id === p);
    if (def) setF(sample(trigGrid(n), def.f));
  };
  const changeN = (n: number) => {
    setN(n);
    setSelK((k) => (k !== null && k > Math.floor(n / 2) ? null : k));
    // a hand-drawn signal is re-sampled from its interpolant so it keeps its shape
    if (preset === 'custom') {
      const g2 = trigGrid(n);
      setF(g2.t.map((t) => synth(g, amp.a, amp.b, t)));
    } else choosePreset(preset, n);
  };

  const timeVp = (w: number, h: number) => makeViewport(w, h, { x: [0, g.T], y: [-Y_MAX, Y_MAX] }, PAD);

  const drawTime = useCallback(({ ctx, width, height, palette: pal }: DrawContext) => {
    const vp = timeVp(width, height);
    drawGridAxes(ctx, vp, pal, { xLabel: 't', yLabel: 'f(t)' });
    if (selK !== null) {
      const w = g.omega[selK]!;
      const basis = (t: number) => (mat === 'C' ? Math.cos(w * t) : Math.sin(w * t));
      polyline(ctx, vp, fine(g.T).map((t) => [t, basis(t)]), pal.c4, 1.5, [5, 4]);
    }
    polyline(ctx, vp, fine(g.T).map((t) => [t, synth(g, amp.a, amp.b, t)]), pal.c1, 1.2);
    g.t.forEach((t, n) => dot(ctx, vp, [t, f[n]!], pal.c1, 6));
  }, [g, f, amp, selK, mat]);

  const onTimePointer = useCallback((p: CanvasPointer) => {
    const vp = timeVp(p.width, p.height);
    if (p.type === 'down') {
      let best = -1, bestD = 18;
      g.t.forEach((t, n) => {
        const d = Math.hypot(vp.x(t) - p.x, vp.y(f[n]!) - p.y);
        if (d < bestD) { best = n; bestD = d; }
      });
      drag.current = best >= 0 ? best : null;
      return;
    }
    if (p.type === 'up') { drag.current = null; return; }
    const n = drag.current;
    if (n === null || !p.buttons) return;
    const y = Math.max(-Y_MAX, Math.min(Y_MAX, vp.y.invert(p.y)));
    setF((old) => old.map((v, i) => (i === n ? Math.round(y * 100) / 100 : v)));
    setPreset('custom');
  }, [g, f]);

  const drawResult = useCallback(({ ctx, width, height, palette: pal }: DrawContext) => {
    if (!res) return;
    const xs = fine(g.T);
    const curve = xs.map((t) => res.exact(t));
    const all = [...res.y, ...curve].filter(Number.isFinite);
    const m = Math.max(0.5, ...all.map(Math.abs)) * 1.15;
    const vp = makeViewport(width, height, { x: [0, g.T], y: [-m, m] }, PAD);
    drawGridAxes(ctx, vp, pal, { xLabel: 't', yLabel: op === 'deriv' ? "f′(t)" : '∫f dt' });
    polyline(ctx, vp, xs.map((t, i) => [t, curve[i]!]), pal.muted, 1.2, [4, 4]);
    if (method === 'spectral') polyline(ctx, vp, xs.map((t, i) => [t, curve[i]!]), pal.c2, 1.6);
    else polyline(ctx, vp, g.t.map((t, n) => [t, res.y[n]!]), pal.c2, 1.4);
    g.t.forEach((t, n) => dot(ctx, vp, [t, res.y[n]!], pal.c2, 5));
  }, [res, g, op, method]);

  const drawSpectrum = useCallback(({ ctx, width, height, palette: pal }: DrawContext) => {
    const K = g.omega.length;
    const vals = [...fc, ...fs, ...(gc ?? []), ...(gs ?? [])];
    const m = Math.max(0.3, ...vals.map(Math.abs)) * 1.15;
    const vp = makeViewport(width, height, { x: [-0.6, K - 0.4], y: [-m, m] }, PAD);
    drawGridAxes(ctx, vp, pal, { xLabel: 'ω', ticks: 12 });
    const bw = (vp.x(1) - vp.x(0)) * (res ? 0.18 : 0.32);
    const bar = (k: number, slot: number, v: number, color: string, alpha = 1) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      const x = vp.x(k) + slot * bw - (res ? 2 * bw : bw);
      ctx.fillRect(x, Math.min(vp.y(0), vp.y(v)), bw - 1, Math.abs(vp.y(v) - vp.y(0)));
      ctx.restore();
    };
    for (let k = 0; k < K; k++) {
      if (k === selK) {
        ctx.save(); ctx.fillStyle = pal.grid; ctx.globalAlpha = 0.6;
        ctx.fillRect(vp.x(k - 0.48), vp.top, vp.x(1) - vp.x(0.04), vp.bottom - vp.top); ctx.restore();
      }
      bar(k, 0, fc[k]!, pal.c1);
      bar(k, 1, fs[k]!, pal.c3);
      if (gc && gs) {
        bar(k, 2, gc[k]!, pal.c2, 0.85);
        bar(k, 3, gs[k]!, pal.c4, 0.85);
        // ideal relation, from f's coefficients only: derivative a′ = ω b, b′ = −ω a; integral a′ = −b/ω, b′ = a/ω
        const w = g.omega[k]!;
        if (k > 0 && !(N % 2 === 0 && k === N / 2)) {
          const ideal = op === 'deriv' ? [w * fs[k]!, -w * fc[k]!] : [-fs[k]! / w, fc[k]! / w];
          ideal.forEach((v, j) => {
            const x = vp.x(k) + (2 + j) * bw - 2 * bw + bw / 2;
            // off-scale ideals (they grow like ω) sit on the edge, dashed
            const off = Math.abs(v) > m;
            const y = vp.y(Math.max(-m, Math.min(m, v)));
            ctx.save(); ctx.strokeStyle = pal.fg; ctx.lineWidth = 2; ctx.setLineDash(off ? [3, 2] : []);
            ctx.beginPath(); ctx.moveTo(x - bw / 2, y); ctx.lineTo(x + bw / 2, y); ctx.stroke(); ctx.restore();
          });
        }
      }
    }
  }, [g, fc, fs, gc, gs, res, selK, op, N]);

  const factor = selK !== null && selK > 0 ? factorText(g, selK, method, op) : null;

  return (
    <div className="controls">
      <div className="row">
        {PRESETS.map((p) => (
          <button key={p.id} className="btn" aria-pressed={preset === p.id} onClick={() => choosePreset(p.id)}>{p.label}</button>
        ))}
        {preset === 'custom' && <span className="muted" style={{ fontSize: 13 }}>elle çizildi</span>}
      </div>
      <Slider label={<>Örnek sayısı <Tex tex="N" /></>} value={N} min={4} max={32} step={1} onChange={changeN}
        format={(v) => `${v} (Δt = 2π/${v}, ω = 0…${Math.floor(v / 2)})`} />

      <div className="viz-grid">
        <div className="panel">
          <h3 style={{ margin: '0 0 6px', fontSize: 14 }}>Zaman: <Tex tex="\mathbf f_t" /> (noktaları sürükle)</h3>
          <Canvas draw={drawTime} aspect={0.55} onPointer={onTimePointer} ariaLabel="f(t) örnekleri; noktalar yukarı aşağı sürüklenebilir" />
          <div className="legend" style={{ marginTop: 6 }}>
            <span><i style={{ background: 'var(--c1)' }} />f örnekleri ve aralarındaki trigonometrik eğri</span>
            {selK !== null && <span><i style={{ background: 'var(--c4)' }} />seçili satır {mat === 'C' ? 'cos' : 'sin'}(ω={selK}·t)</span>}
          </div>
        </div>
        <div className="panel">
          <h3 style={{ margin: '0 0 6px', fontSize: 14 }}>Frekans: <Tex tex="\mathbf f_\omega=\Delta t\,C\,\mathbf f_t" />, <Tex tex="\Delta t\,S\,\mathbf f_t" /></h3>
          <Canvas draw={drawSpectrum} aspect={0.55} ariaLabel="Her ω için cos ve sin izdüşümleri, çubuk grafik" />
          <div className="legend" style={{ marginTop: 6 }}>
            <span><i style={{ background: 'var(--c1)' }} />f · cos</span>
            <span><i style={{ background: 'var(--c3)' }} />f · sin</span>
            {res && <span><i style={{ background: 'var(--c2)' }} />{op === 'deriv' ? 'f′' : '∫f'} · cos</span>}
            {res && <span><i style={{ background: 'var(--c4)' }} />{op === 'deriv' ? 'f′' : '∫f'} · sin</span>}
            {res && <span><i style={{ background: 'var(--fg)', height: 2 }} />ideal: {op === 'deriv' ? 'ω·b, −ω·a' : '−b/ω, a/ω'}</span>}
          </div>
        </div>
      </div>

      <div className="panel controls">
        <Tabs value={op} onChange={setOp} items={[
          { id: 'none', label: 'Sadece f' }, { id: 'deriv', label: 'Türev f′' }, { id: 'integral', label: 'İntegral ∫f' },
        ]} />
        {op !== 'none' && (
          <div className="row">
            {METHODS.map((m) => (
              <button key={m.id} className="btn" aria-pressed={method === m.id} onClick={() => setMethod(m.id)}>
                {op === 'integral' && m.id !== 'spectral' ? (m.id === 'central' ? 'Yamuk (merkezi)' : 'Dikdörtgen (geri)') : m.label}
              </button>
            ))}
          </div>
        )}
        {op === 'integral' && (
          <Slider label={<>Başlangıç değeri <Tex tex="F(0)" /></>} value={F0} min={-2} max={2} step={0.1} onChange={setF0} format={(v) => fmt(v, 1)} />
        )}
        {res && (
          <>
            <Canvas draw={drawResult} aspect={0.4} ariaLabel="Türev ya da integral sonucu" />
            <div className="legend">
              <span><i style={{ background: 'var(--c2)' }} />{method === 'spectral' ? 'spektral sonuç' : 'örneklerden hesap'}</span>
              <span><i style={{ background: 'var(--muted)' }} />f’nin trigonometrik eğrisinin tam {op === 'deriv' ? 'türevi' : 'integrali'}</span>
            </div>
            {op === 'integral' && Math.abs(res.mean) > 1e-9 && (
              <p className="muted" style={{ fontSize: 13, margin: 0 }}>
                f’nin ortalaması {fmt(res.mean, 3)} ≠ 0: integral her periyotta {fmt(res.mean * g.T, 2)} kadar artar, periyodik değildir (ω = 0 satırı ω’ya bölünemez).
              </p>
            )}
          </>
        )}
        {factor && <div className="readout" style={{ fontSize: 14 }}>{factor}</div>}
      </div>

      <MatrixPanel g={g} M={mat === 'C' ? C : S} name={mat} f={f} out={mat === 'C' ? fc : fs} selK={selK} onSel={setSelK} onTab={setMat} />
      {op === 'deriv' && method !== 'spectral' && (
        <details className="panel">
          <summary>Fark matrisi <Tex tex="D" /> ({N}×{N}, dairesel), <Tex tex="\mathbf f'=D\,\mathbf f" /></summary>
          <Heat M={diffMatrix(N, g.dt, method)} numbers={N <= 12} digits={2} />
        </details>
      )}
    </div>
  );
}

function fine(T: number) {
  return Array.from({ length: FINE + 1 }, (_, i) => (T * i) / FINE);
}

function factorText(g: TrigGrid, k: number, method: DiffMethod, op: Op) {
  if (op === 'none') return null;
  const w = g.omega[k]!, dt = g.dt;
  const gain = method === 'spectral' ? w : method === 'central' ? Math.sin(w * dt) / dt : (2 / dt) * Math.sin((w * dt) / 2);
  const tex = method === 'spectral' ? '\\omega' : method === 'central' ? '\\tfrac{\\sin\\omega\\Delta t}{\\Delta t}' : '\\tfrac{2}{\\Delta t}\\sin\\tfrac{\\omega\\Delta t}{2}';
  const what = op === 'deriv' ? 'türev' : 'integral (1/kazanç)';
  return (
    <span>
      Seçili satır ω = {fmt(w, 0)}: {what} için kazanç <Tex tex={`${tex}=${fmt(gain, 3)}`} />, ideal <Tex tex={`\\omega=${fmt(w, 3)}`} />, oran {fmt(gain / w, 3)}.
      {method === 'backward' && ' Geri farkta ayrıca ωΔt/2 kadar faz kayması var: cos katsayısı biraz da a’ya bağlı olur.'}
    </span>
  );
}

function cellColor(v: number, max: number) {
  const p = Math.round((65 * Math.min(1, Math.abs(v) / (max || 1))));
  return `color-mix(in srgb, ${v >= 0 ? 'var(--c1)' : 'var(--c2)'} ${p}%, transparent)`;
}

function Heat({ M, numbers, digits = 2, selRow, onRow }: { M: Mat; numbers: boolean; digits?: number; selRow?: number | null; onRow?: (k: number) => void }) {
  const max = Math.max(...M.flat().map(Math.abs));
  return (
    <table className="heat" style={{ borderCollapse: 'collapse', fontSize: 11, fontFamily: 'ui-monospace, monospace' }}>
      <tbody>
        {M.map((row, k) => (
          <tr key={k} onClick={onRow ? () => onRow(k) : undefined}
            style={{ cursor: onRow ? 'pointer' : 'default', outline: selRow === k ? '2px solid var(--c4)' : 'none' }}>
            {row.map((v, n) => (
              <td key={n} title={fmt(v, 4)} style={{ background: cellColor(v, max), padding: numbers ? '2px 4px' : '0', width: numbers ? undefined : 12, height: 18, textAlign: 'right', border: '1px solid var(--border)' }}>
                {numbers ? fmt(v, digits) : ''}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Column({ v, label, numbers = true }: { v: readonly number[]; label: string; numbers?: boolean }) {
  return (
    <div style={{ display: 'grid', justifyItems: 'center', gap: 4 }}>
      <Tex tex={label} />
      <Heat M={v.map((x) => [x])} numbers={numbers} digits={2} />
    </div>
  );
}

function MatrixPanel(props: {
  g: TrigGrid; M: Mat; name: 'C' | 'S'; f: readonly number[]; out: readonly number[];
  selK: number | null; onSel: (k: number | null) => void; onTab: (m: 'C' | 'S') => void;
}) {
  const { g, M, name, f, out, selK, onSel, onTab } = props;
  const numbers = g.N <= 16;
  return (
    <div className="panel controls">
      <Tabs value={name} onChange={onTab} items={[
        { id: 'C', label: <>cos matrisi <Tex tex="C" /></> }, { id: 'S', label: <>sin matrisi <Tex tex="S" /></> },
      ]} />
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>
        Satırlar frekans (ω = 0…{Math.floor(g.N / 2)}), sütunlar zaman (t₀…t<sub>{g.N - 1}</sub>): <Tex tex={`${name}_{kn}=\\${name === 'C' ? 'cos' : 'sin'}(\\omega_k t_n)`} />,
        boyut {M.length}×{g.N}. Bir satıra tıkla: o taban eğrisi zaman grafiğinde çizilir.
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflowX: 'auto', paddingBottom: 6 }}>
        <Column v={out} label={`\\mathbf f_\\omega^{(${name})}`} numbers />
        <Tex tex="=\Delta t\;\cdot" />
        <Heat M={M} numbers={numbers} selRow={selK} onRow={(k) => onSel(selK === k ? null : k)} />
        <Tex tex="\cdot" />
        <Column v={f} label="\mathbf f_t" numbers />
      </div>
      <p className="muted" style={{ margin: 0, fontSize: 12 }}>
        Δt = 2π/{g.N} = {fmt(g.dt, 3)}. Genliğe çevirmek için 2/T ile çarp (ω = 0{g.N % 2 === 0 ? ' ve son satır' : ''} için 1/T).
        {name === 'S' && ' S’nin ilk satırı (ω = 0) sıfır: sin 0 = 0.'}
      </p>
    </div>
  );
}

