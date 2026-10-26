import { useCallback, useMemo, useState } from 'react';
import {
  basisMatrix,
  decide,
  ofdmSignal,
  qamLevels,
  randomCoeffs,
  receive,
  receiveDft,
  transmit,
  type Mat,
} from '../../core/math';
import { Callout, Canvas, Slider, Tex, dot, drawGridAxes, fmt, fmtErr, makeViewport, polyline, type DrawContext } from '../../core/ui';

const ORDERS = [4, 16, 64] as const;
const PAD = { l: 44, r: 10, t: 10, b: 22 };
const CURVE_SAMPLES = 600;

type Layer = 'signal' | 'carriers' | 'samples' | 'seen';
const LAYERS: Array<{ id: Layer; label: string; color: string }> = [
  { id: 'signal', label: 's(t)', color: 'var(--fg)' },
  { id: 'carriers', label: 'alt taşıyıcılar aₖcos + bₖsin', color: 'var(--muted)' },
  { id: 'samples', label: 'örnekler s[n]', color: 'var(--c1)' },
  { id: 'seen', label: 'alıcının okuduğu Ĉ ile kurulan ŝ(t)', color: 'var(--c2)' },
];

const colLabel = (j: number) => `${j % 2 === 0 ? 'cos' : 'sin'} ${Math.floor(j / 2) + 1}ω₀`;

/** Numeric matrix as a table; cells tinted by sign and size relative to `scale`. */
function MatrixTable({
  M,
  rowLabels,
  colLabels,
  scale,
  digits = 2,
  cellClass,
}: {
  M: Mat;
  rowLabels: string[];
  colLabels: string[];
  scale: number;
  digits?: number;
  cellClass?: (i: number, j: number) => string | undefined;
}) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="mat-table" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th />
            {colLabels.map((c) => (
              <th key={c} style={{ padding: '2px 6px', fontWeight: 400, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {M.map((row, i) => (
            <tr key={i}>
              <th style={{ padding: '2px 6px', fontWeight: 400, color: 'var(--muted)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                {rowLabels[i]}
              </th>
              {row.map((v, j) => {
                const pct = Number.isFinite(v) ? Math.round(Math.min(1, Math.abs(v) / scale) * 45) : 0;
                const tint = v >= 0 ? 'var(--c1)' : 'var(--c2)';
                return (
                  <td
                    key={j}
                    className={cellClass?.(i, j)}
                    style={{
                      padding: '2px 6px',
                      textAlign: 'right',
                      border: '1px solid var(--border)',
                      background: `color-mix(in srgb, ${tint} ${pct}%, transparent)`,
                    }}
                  >
                    {Number.isFinite(v) ? fmt(v, digits) : '—'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Viz() {
  const [K, setK] = useState(4);
  const [order, setOrder] = useState<number>(16);
  const [ratio, setRatio] = useState(2);
  const [seed, setSeed] = useState(0);
  const [shown, setShown] = useState<Record<Layer, boolean>>({ signal: true, carriers: false, samples: true, seen: true });
  const [showMats, setShowMats] = useState(true);

  const levels = useMemo(() => qamLevels(order), [order]);
  // seed only forces a fresh draw when "Rastgele" is pressed.
  const C = useMemo(() => randomCoeffs(K, levels), [K, levels, seed]);
  const N = Math.max(1, Math.round(ratio * K));
  const Phi = useMemo(() => basisMatrix(K, N), [K, N]);
  const PhiT = useMemo(() => Phi[0]!.map((_, j) => Phi.map((row) => row[j]!)), [Phi]);
  const s = useMemo(() => transmit(Phi, C), [Phi, C]);
  const R = useMemo(() => receive(Phi, s), [Phi, s]);
  const Rf = useMemo(() => receiveDft(s, K), [s, K]);
  const decided = R.map((row) => row.map((v) => decide(v, levels)));

  const flatC = C.flat();
  const errors = decided.flat().filter((v, j) => v !== flatC[j]).length;
  const finite = R.flat().map((v, j) => [v, Rf.flat()[j]!]).filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b));
  const dftGap = finite.reduce((m, [a, b]) => Math.max(m, Math.abs(a! - b!)), 0);

  const toggle = (id: Layer) => setShown((v) => ({ ...v, [id]: !v[id] }));

  const draw = useCallback(
    ({ ctx, width, height, palette: pal }: DrawContext) => {
      const ts = Array.from({ length: CURVE_SAMPLES + 1 }, (_, i) => i / CURVE_SAMPLES);
      const sig: Array<[number, number]> = ts.map((t) => [t, ofdmSignal(C, t)]);
      const seen: Array<[number, number]> = ts.map((t) => [t, ofdmSignal(R.map((r) => r.map((v) => (Number.isFinite(v) ? v : 0))), t)]);
      let hi = 1;
      for (const [, y] of sig) hi = Math.max(hi, Math.abs(y));
      if (shown.seen) for (const [, y] of seen) hi = Math.max(hi, Math.abs(y));
      const vp = makeViewport(width, height, { x: [0, 1], y: [-hi * 1.1, hi * 1.1] }, PAD);
      drawGridAxes(ctx, vp, pal, { xLabel: 't / T', yLabel: 's(t)' });
      if (shown.carriers)
        C.forEach(([a, b], k) => {
          const w = 2 * Math.PI * (k + 1);
          const pts: Array<[number, number]> = ts.map((t) => [t, a! * Math.cos(w * t) + b! * Math.sin(w * t)]);
          polyline(ctx, vp, pts, pal.muted, 1);
        });
      if (shown.signal) polyline(ctx, vp, sig, pal.fg, 2);
      if (shown.seen) polyline(ctx, vp, seen, pal.c2, 1.6, [6, 4]);
      if (shown.samples)
        s.forEach((v, n) => {
          polyline(ctx, vp, [[n / N, 0], [n / N, v]], pal.c1, 1.2);
          dot(ctx, vp, [n / N, v], pal.c1, 3.5);
        });
    },
    [C, R, s, N, shown],
  );

  const rowsK = Array.from({ length: K }, (_, k) => `k=${k + 1}`);
  const cOk = (i: number, j: number) => (decided[i]![j] === C[i]![j] ? 'ok' : 'bad');

  return (
    <div className="controls">
      <div className="panel controls">
        <div className="viz-grid-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
          <Slider label="Alt taşıyıcı sayısı K" value={K} min={1} max={8} step={1} onChange={setK} format={(v) => String(v)} />
          <Slider
            label={<>Örnekleme <Tex tex="f_s / f_{\max}" /></>}
            value={ratio}
            min={1}
            max={4}
            step={0.25}
            onChange={setRatio}
            format={(v) => `${fmt(v, 2)} → N = ${Math.max(1, Math.round(v * K))}`}
          />
        </div>
        <div className="row">
          {ORDERS.map((m) => (
            <button key={m} className="btn" aria-pressed={order === m} onClick={() => setOrder(m)}>
              {m}-QAM
            </button>
          ))}
          <button className="btn" onClick={() => setSeed((v) => v + 1)}>
            Rastgele
          </button>
          <button className="btn" aria-pressed={showMats} onClick={() => setShowMats((v) => !v)}>
            Φ ve Φᵀ matrislerini {showMats ? 'gizle' : 'göster'}
          </button>
        </div>
        <p className="canvas-caption">
          <Tex tex={`\\omega_k = k\\,\\omega_0,\\ \\omega_0 = 2\\pi/T`} />. Seviyeler eksen başına{' '}
          <Tex tex={`\\{${levels.join(',')}\\}`} />. <Tex tex={`f_{\\max} = ${K}/T`} />, <Tex tex={`f_s = N/T = ${N}/T`} />.
        </p>
      </div>

      <div className="viz-grid">
        <div className="panel">
          <p className="canvas-caption" style={{ marginTop: 0 }}>1 · Taşıyıcı (seviye belirleme) matrisi</p>
          <Tex
            block
            tex={`B(t)=\\begin{bmatrix}${Array.from({ length: K }, (_, i) => `\\cos ${i === 0 ? '' : i + 1}\\omega_0 t & \\sin ${i === 0 ? '' : i + 1}\\omega_0 t`).join('\\\\')}\\end{bmatrix}`}
          />
        </div>
        <div className="panel">
          <p className="canvas-caption" style={{ marginTop: 0 }}>2 · Katsayı matrisi C = [aₖ bₖ]</p>
          <MatrixTable M={C} rowLabels={rowsK} colLabels={['aₖ (cos)', 'bₖ (sin)']} scale={levels.at(-1)!} digits={0} />
          <Tex block tex="s(t)=\sum_{k=1}^{K} a_k\cos k\omega_0 t + b_k\sin k\omega_0 t" />
        </div>
      </div>

      <div className="panel">
        <p className="canvas-caption" style={{ marginTop: 0 }}>3 · Gönderilen fonksiyon ve örnekleri (lejanttan aç/kapat)</p>
        <Canvas draw={draw} aspect={0.36} maxHeight={340} ariaLabel="OFDM sinyali ve örnekleri" />
        <div className="legend" style={{ marginTop: 8 }}>
          {LAYERS.map((l) => (
            <span
              key={l.id}
              role="button"
              tabIndex={0}
              aria-pressed={shown[l.id]}
              onClick={() => toggle(l.id)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggle(l.id)}
              style={{ cursor: 'pointer', opacity: shown[l.id] ? 1 : 0.4, textDecoration: shown[l.id] ? 'none' : 'line-through' }}
            >
              <i style={{ background: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
      </div>

      {showMats && (
        <div className="controls">
          <div className="panel">
            <p className="canvas-caption" style={{ marginTop: 0 }}>
              4 · Verici: <Tex tex={`\\Phi\\ (${N}\\times${2 * K}),\\ \\Phi_{nj}=\\cos/\\sin(k\\omega_0 t_n),\\ t_n=n/N`} />,{' '}
              <Tex tex="s=\Phi\,\mathrm{vec}(C)" />
            </p>
            <MatrixTable
              M={Phi.map((row, n) => [...row, s[n]!])}
              rowLabels={Array.from({ length: N }, (_, n) => `n=${n}`)}
              colLabels={[...Array.from({ length: 2 * K }, (_, j) => colLabel(j)), 's[n]']}
              scale={1}
            />
          </div>
          <div className="panel">
            <p className="canvas-caption" style={{ marginTop: 0 }}>
              5 · Alıcı: <Tex tex={`\\Phi^\\top\\ (${2 * K}\\times${N})`} />, her satır bir taşıyıcıyla korelasyon
            </p>
            <MatrixTable
              M={PhiT}
              rowLabels={Array.from({ length: 2 * K }, (_, j) => colLabel(j))}
              colLabels={Array.from({ length: N }, (_, n) => `n=${n}`)}
              scale={1}
            />
          </div>
        </div>
      )}

      <div className="viz-grid">
        <div className="panel">
          <p className="canvas-caption" style={{ marginTop: 0 }}>
            6 · Okunan <Tex tex="\hat C=D^{-1}\Phi^\top s" /> (<Tex tex="D=\mathrm{diag}\,\|\varphi_j\|^2" />) ve karar
          </p>
          <MatrixTable
            M={R.map((row, i) => [...row, ...decided[i]!])}
            rowLabels={rowsK}
            colLabels={['âₖ', 'b̂ₖ', 'karar a', 'karar b']}
            scale={levels.at(-1)!}
            cellClass={(i, j) => (j >= 2 ? cOk(i, j - 2) : undefined)}
          />
        </div>
        <div className="panel">
          <p className="canvas-caption" style={{ marginTop: 0 }}>
            7 · Aynısı DFT ile: <Tex tex="X_k=\tfrac N2(a_k-i\,b_k)\Rightarrow a_k=\tfrac2N\mathrm{Re}X_k,\ b_k=-\tfrac2N\mathrm{Im}X_k" />
          </p>
          <MatrixTable M={Rf} rowLabels={rowsK} colLabels={['âₖ (DFT)', 'b̂ₖ (DFT)']} scale={levels.at(-1)!} />
        </div>
      </div>

      <div className="panel readout">
        <span>
          Sembol hatası: <span className={errors === 0 ? 'ok' : 'bad'}>{errors}</span> / {2 * K}
        </span>
        <span>
          <Tex tex="\max|\hat C_{\Phi^\top}-\hat C_{\mathrm{DFT}}|" /> = {fmtErr(dftGap)}
        </span>
      </div>

      {N === 2 * K && (
        <Callout kind="warn" title="Tam 2 kat: en yüksek sinüs kayboldu">
          <Tex tex="t_n=n/(2K)" /> anlarında <Tex tex="\sin(K\omega_0 t_n)=\sin(\pi n)=0" />: son sin sütunu sıfır, <Tex tex="b_K" />{' '}
          okunamaz (—). Nyquist sınırı kesin eşitsizliktir: <Tex tex="f_s>2f_{\max}" />, yani <Tex tex="N\ge 2K+1" />.
        </Callout>
      )}
      {N < 2 * K && (
        <Callout kind="warn" title="Örtüşme (aliasing)">
          <Tex tex="k>N/2" /> olan taşıyıcıların örnekleri <Tex tex="N-k" /> taşıyıcısınınkilerle aynı: Φ’nin sütunları artık
          birbirinden ayrılamıyor, alıcı katsayıları karıştırıyor.
        </Callout>
      )}
    </div>
  );
}
