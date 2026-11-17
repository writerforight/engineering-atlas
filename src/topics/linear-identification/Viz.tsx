import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  identifyLinear, maxAbsDiff, mul, mulVec, pinv, randnMat, sub, vecNorm, type Mat, type Vec,
} from '../../core/math';
import { Callout, Canvas, Slider, Tex, drawGridAxes, fmt, makeViewport, type DrawContext } from '../../core/ui';

const PAD = { l: 36, r: 10, t: 12, b: 24 };

export default function Viz() {
  const [n, setN] = useState(3);
  const [m, setM] = useState(3);
  const [K, setK] = useState(5);
  const [noise, setNoise] = useState(0);
  const [seedA, setSeedA] = useState(1);
  const [seedX, setSeedX] = useState(100);
  const [seedT, setSeedT] = useState(1000);

  // hidden system and experiments
  const A = useMemo(() => randnMat(m, n, seedA * 7919 + 13 * m + n), [m, n, seedA]);
  const X = useMemo(() => randnMat(n, K, seedX * 104729 + 31 * n + K), [n, K, seedX]);
  const Y = useMemo(() => {
    const E = randnMat(m, K, seedX * 15485863 + 7 * m + K);
    return mul(A, X).map((r, i) => r.map((v, k) => v + noise * E[i]![k]!));
  }, [A, X, m, K, noise, seedX]);

  // step 1: Â = Y X⁺
  const { Ahat, Xsvd } = useMemo(() => identifyLinear(X, Y), [X, Y]);
  // step 2: Â⁺ and the inversion test
  const inv = useMemo(() => pinv(Ahat), [Ahat]);
  const xTest = useMemo(() => randnMat(n, 1, seedT * 31337 + n).map((r) => r[0]!), [n, seedT]);
  const yTest = useMemo(() => {
    const e = randnMat(m, 1, seedT * 2654435 + m).map((r) => r[0]!);
    return mulVec(A, xTest).map((v, i) => v + noise * e[i]!);
  }, [A, xTest, m, noise, seedT]);
  const xHat = useMemo(() => mulVec(inv.P, yTest), [inv, yTest]);

  const errA = maxAbsDiff(Ahat, A);
  const errX = vecNorm(sub([xHat], [xTest])[0]!) / (vecNorm(xTest) || 1);
  const rankX = Xsvd.rank;
  const rankA = inv.svd.rank;

  const drawBars = useCallback(({ ctx, width, height, palette: pal }: DrawContext) => {
    const mx = Math.max(0.5, ...xTest.map(Math.abs), ...xHat.map(Math.abs)) * 1.15;
    const vp = makeViewport(width, height, { x: [-0.6, n - 0.4], y: [-mx, mx] }, PAD);
    drawGridAxes(ctx, vp, pal, { xLabel: 'bileşen i', ticks: Math.min(n, 8) });
    const bw = (vp.x(1) - vp.x(0)) * 0.3;
    const bar = (i: number, slot: number, v: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(vp.x(i) + (slot - 1) * bw, Math.min(vp.y(0), vp.y(v)), bw - 2, Math.abs(vp.y(v) - vp.y(0)));
    };
    for (let i = 0; i < n; i++) {
      bar(i, 0, xTest[i]!, pal.c1);
      bar(i, 1, xHat[i]!, pal.c2);
    }
  }, [xTest, xHat, n]);

  return (
    <div className="controls">
      <div className="panel controls">
        <Slider label={<>Girdi boyu <Tex tex="n" /></>} value={n} min={1} max={6} step={1} onChange={setN} format={(v) => `${v}`} />
        <Slider label={<>Çıktı boyu <Tex tex="m" /></>} value={m} min={1} max={6} step={1} onChange={setM} format={(v) => `${v}`} />
        <Slider label={<>Deney sayısı <Tex tex="K" /></>} value={K} min={1} max={12} step={1} onChange={setK} format={(v) => `${v}`} />
        <Slider label={<>Ölçüm gürültüsü <Tex tex="\sigma_\varepsilon" /></>} value={noise} min={0} max={0.5} step={0.01} onChange={setNoise} format={(v) => fmt(v, 2)} />
        <div className="row">
          <button className="btn" onClick={() => setSeedA((s) => s + 1)}>Yeni gizli A</button>
          <button className="btn" onClick={() => setSeedX((s) => s + 1)}>Yeni deneyler X</button>
          <button className="btn" onClick={() => setSeedT((s) => s + 1)}>Yeni test girdisi x</button>
        </div>
      </div>

      <div className="panel controls">
        <h3 style={{ margin: 0, fontSize: 14 }}>1 · Deneyler: <Tex tex={`Y = A\\,X${noise > 0 ? ' + E' : ''}`} /></h3>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          Her sütun bir deney: <Tex tex="\mathbf x_k" /> girdi ({n}×1) kutuya girer, <Tex tex="\mathbf y_k" /> çıktı ({m}×1) ölçülür. A gizli, sadece X ve Y biliniyor.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflowX: 'auto', paddingBottom: 6 }}>
          <Labeled label={`Y\\;(${m}\\times${K})`}><Heat M={Y} /></Labeled>
          <Tex tex="=" />
          <Labeled label={`A\\;(${m}\\times${n})\\;\\text{gizli}`}><Heat M={A} /></Labeled>
          <Tex tex="\cdot" />
          <Labeled label={`X\\;(${n}\\times${K})`}><Heat M={X} /></Labeled>
        </div>
      </div>

      <div className="panel controls">
        <h3 style={{ margin: 0, fontSize: 14 }}>2 · Tahmin: <Tex tex="\hat A = Y\,X^{+},\quad X^{+}=V\,\Sigma^{+}U^{\mathsf T}" /></h3>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          X’in tekil değerleri (= <Tex tex="XX^{\mathsf T}" /> özdeğerlerinin karekökü): {Xsvd.s.map((s) => fmt(s, 3)).join(', ')} · rank X = {rankX} / n = {n}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflowX: 'auto', paddingBottom: 6 }}>
          <Labeled label={`\\hat A\\;(${m}\\times${n})`}><Heat M={Ahat} /></Labeled>
          <Tex tex="\approx" />
          <Labeled label="A"><Heat M={A} /></Labeled>
        </div>
        <div className="readout" style={{ fontSize: 14 }}>
          <Tex tex={`\\max|\\hat A - A| = ${fmt(errA, 4)}`} />
        </div>
        {rankX < n && (
          <Callout kind="warn" title="Deneyler girdi uzayını kaplamıyor">
            rank X = {rankX} &lt; n = {n}: {n - rankX} yönde hiç deney yok. Â bu yönlerde sıfır verir, A’yı ancak denenen
            alt uzayda taklit eder. En az n = {n} bağımsız deney gerekir.
          </Callout>
        )}
      </div>

      <div className="panel controls">
        <h3 style={{ margin: 0, fontSize: 14 }}>3 · Ters: çıktıyı sok, girdiyi tahmin et <Tex tex="\hat{\mathbf x} = \hat A^{+}\mathbf y" /></h3>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          Â’nın tekil değerleri: {inv.svd.s.map((s) => fmt(s, 3)).join(', ')} · rank Â = {rankA}. Â kare değilse tersi yok;
          SVD ile sözde ters <Tex tex="\hat A^{+}" /> ({n}×{m}) alınır.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflowX: 'auto', paddingBottom: 6 }}>
          <Labeled label="\hat{\mathbf x}"><Heat M={xHat.map((v) => [v])} /></Labeled>
          <Tex tex="=" />
          <Labeled label={`\\hat A^{+}\\;(${n}\\times${m})`}><Heat M={inv.P} /></Labeled>
          <Tex tex="\cdot" />
          <Labeled label="\mathbf y=A\mathbf x"><Heat M={yTest.map((v) => [v])} /></Labeled>
          <Labeled label="\mathbf x\;\text{(gerçek)}"><Heat M={xTest.map((v) => [v])} /></Labeled>
        </div>
        <Canvas draw={drawBars} aspect={0.4} ariaLabel="Gerçek girdi x ve tahmin x̂, bileşen bileşen çubuklar" />
        <div className="legend">
          <span><i style={{ background: 'var(--c1)' }} />gerçek x</span>
          <span><i style={{ background: 'var(--c2)' }} />tahmin x̂ = Â⁺ y</span>
        </div>
        <div className="readout" style={{ fontSize: 14 }}>
          <Tex tex={`\\frac{\\|\\hat{\\mathbf x}-\\mathbf x\\|}{\\|\\mathbf x\\|} = ${fmt(errX, 4)}`} />
        </div>
        {rankA < n && (
          <Callout kind="warn" title="Girdi geri kazanılamaz">
            {m < n
              ? <>Çıktı boyu m = {m} &lt; girdi boyu n = {n}: dönüşüm {n - m} boyutluk bilgiyi siliyor (A’nın çekirdeği). Aynı y’yi veren sonsuz x var;
                Â⁺ bunların en kısasını, yani x’in satır uzayındaki izdüşümünü verir.</>
              : <>rank Â = {rankA} &lt; n = {n}: önce deneyleri tamamla (adım 2).</>}
          </Callout>
        )}
        {rankA === n && noise > 0 && (
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            Gürültü en küçük tekil değerle bölünerek büyür: kabaca <Tex tex={`\\sigma_\\varepsilon/\\sigma_{\\min}(\\hat A) = ${fmt(noise / inv.svd.s[rankA - 1]!, 3)}`} />.
          </p>
        )}
      </div>
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'grid', justifyItems: 'center', gap: 4 }}>
      <Tex tex={label} />
      {children}
    </div>
  );
}

function cellColor(v: number, max: number) {
  const p = Math.round(65 * Math.min(1, Math.abs(v) / (max || 1)));
  return `color-mix(in srgb, ${v >= 0 ? 'var(--c1)' : 'var(--c2)'} ${p}%, transparent)`;
}

function Heat({ M }: { M: Mat | Vec[] }) {
  const max = Math.max(1e-12, ...M.flat().map(Math.abs));
  return (
    <table style={{ borderCollapse: 'collapse', fontSize: 11, fontFamily: 'ui-monospace, monospace' }}>
      <tbody>
        {M.map((row, i) => (
          <tr key={i}>
            {row.map((v, j) => (
              <td key={j} title={fmt(v, 5)} style={{ background: cellColor(v, max), padding: '2px 4px', height: 18, textAlign: 'right', border: '1px solid var(--border)' }}>
                {fmt(v, 2)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
