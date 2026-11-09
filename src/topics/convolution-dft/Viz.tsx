import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  circulant, circularConv, cmatmul, dftMatrix, dftVec, hadamard, idftMatrix, linearConv, lowerToeplitz,
  maxOffDiagonal, offDiagonalRatio, randomInts, toComplexMat, toeplitz, wrapTo,
  type CMat, type Complex, type Mat,
} from '../../core/math';
import {
  Callout, Canvas, Slider, Tabs, Tex, drawGridAxes, fmt, fmtErr, makeViewport, useHashParam,
  type DrawContext, type Palette,
} from '../../core/ui';

type Mode = 'linear' | 'circular';
type Kern = 'a' | 'b';
type Square = 'toeplitz' | 'circulant';
type View = 'cart' | 'polar' | 'heat';

const MAX_LEN = 16;
const MAX_N = 32;
const PAD = { l: 44, r: 10, t: 12, b: 24 };

/** Keep the existing values, fill new positions from the seeded sequence. */
function resize(old: readonly number[], len: number, seed: number, max: number, signed: boolean) {
  const fresh = randomInts(seed, len, max, signed);
  return fresh.map((v, i) => old[i] ?? v);
}

export default function Viz() {
  const [maxVal, setMaxVal] = useState(20);
  const [signed, setSigned] = useState(false);
  const [seedA, setSeedA] = useState(5);
  const [seedB, setSeedB] = useState(6);
  const [a, setA] = useState(() => randomInts(5, 4, 20));
  const [b, setB] = useState(() => randomInts(6, 3, 20));
  const [mode, setMode] = useHashParam<Mode>('tab', 'circular', ['linear', 'circular']);
  const [Nc, setNc] = useState(4);
  const [kern, setKern] = useState<Kern>('a');
  const [square, setSquare] = useState<Square>('toeplitz');
  const [view, setView] = useState<View>('cart');
  const [digits, setDigits] = useState(1);

  const La = a.length, Lb = b.length, M = La + Lb - 1;
  const Nmin = Math.max(La, Lb);
  const N = mode === 'linear' ? M : Math.max(Nc, Nmin);

  const reroll = (which: 'a' | 'b' | 'both', max = maxVal, sg = signed) => {
    if (which !== 'b') { const s = seedA + 1000; setSeedA(s); setA(randomInts(s, La, max, sg)); }
    if (which !== 'a') { const s = seedB + 1000; setSeedB(s); setB(randomInts(s, Lb, max, sg)); }
  };
  const changeMax = (m: number) => {
    setMaxVal(m);
    setA(randomInts(seedA, La, m, signed));
    setB(randomInts(seedB, Lb, m, signed));
  };
  const changeSigned = (sg: boolean) => {
    setSigned(sg);
    setA(randomInts(seedA, La, maxVal, sg));
    setB(randomInts(seedB, Lb, maxVal, sg));
  };

  // h builds the matrix, x is the vector it multiplies (convolution commutes, so either works)
  const h = kern === 'a' ? a : b;
  const x = kern === 'a' ? b : a;
  const hName = kern, xName = kern === 'a' ? 'b' : 'a';

  const yLin = useMemo(() => linearConv(a, b), [a, b]);
  const yCirc = useMemo(() => circularConv(a, b, N), [a, b, N]);
  const y = mode === 'linear' ? yLin : yCirc;

  // the matrix that computes y (rectangular Toeplitz in linear mode)
  const H: Mat = useMemo(() => (mode === 'linear' ? toeplitz(h, x.length) : circulant(h, N)), [mode, h, x.length, N]);
  const xVec = mode === 'linear' ? x : wrapTo(x, N);

  // the N×N matrix that meets the DFT
  const Hs: Mat = useMemo(
    () => (mode === 'circular' || square === 'circulant' ? circulant(h, N) : lowerToeplitz(h, N)),
    [mode, square, h, N],
  );
  const F = useMemo(() => dftMatrix(N), [N]);
  const Finv = useMemo(() => idftMatrix(N), [N]);
  const FH = useMemo(() => cmatmul(F, toComplexMat(Hs)), [F, Hs]);
  const Lam = useMemo(() => cmatmul(FH, Finv), [FH, Finv]);
  const offRatio = offDiagonalRatio(Lam);
  const offMax = maxOffDiagonal(Lam);
  const diagonal = offRatio < 1e-9;

  const Xh = useMemo(() => dftVec(wrapTo(h, N)), [h, N]);
  const Xx = useMemo(() => dftVec(wrapTo(x, N)), [x, N]);
  const XY = useMemo(() => hadamard(Xh, Xx), [Xh, Xx]);
  const Fy = useMemo(() => dftVec(wrapTo(y, N)), [y, N]);
  // F·H = Λ_F·F where Λ_F = diag(F h): row k of F·H is row k of F times (F h)_k
  const rowScaleErr = useMemo(() => {
    let e = 0;
    FH.forEach((r, k) => r.forEach(([re, im], n) => {
      const [fr, fi] = F[k]![n]!, [lr, li] = Xh[k]!;
      e = Math.max(e, Math.hypot(re - (lr * fr - li * fi), im - (lr * fi + li * fr)));
    }));
    return e;
  }, [FH, F, Xh]);

  const aliased = mode === 'circular' && N < M;

  return (
    <div className="controls">
      <div className="panel controls">
        <Slider label={<>En büyük eleman değeri (<Tex tex={signed ? '-m\\le x[n]\\le m' : '0\\le x[n]\\le m'} />)</>}
          value={maxVal} min={1} max={50} step={1} onChange={changeMax} format={(v) => `m = ${v}`} />
        <div className="viz-grid" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)' }}>
          <SignalControls name="a" v={a} color="var(--c1)"
            onLen={(n) => setA(resize(a, n, seedA, maxVal, signed))} onSet={setA} onRoll={() => reroll('a')} />
          <SignalControls name="b" v={b} color="var(--c3)"
            onLen={(n) => setB(resize(b, n, seedB, maxVal, signed))} onSet={setB} onRoll={() => reroll('b')} />
        </div>
        <div className="row">
          <button className="btn" onClick={() => reroll('both')}>İkisini de yeniden rastgele üret</button>
          <label className="row" style={{ gap: 6, fontSize: 14 }}>
            <input type="checkbox" checked={signed} onChange={(e) => changeSigned(e.target.checked)} />
            negatif değerlere de izin ver
          </label>
        </div>
      </div>

      <div className="panel controls">
        <Tabs value={mode} onChange={setMode} items={[
          { id: 'linear', label: 'Doğrusal konvolüsyon (Toeplitz)' },
          { id: 'circular', label: 'Dairesel konvolüsyon (circulant)' },
        ]} />
        {mode === 'circular' ? (
          <>
            <Slider label={<>Dairesel uzunluk <Tex tex="N" /></>} value={N} min={Nmin} max={MAX_N} step={1} onChange={setNc}
              format={(v) => `${v}${v < M ? ' (örtüşme var)' : v === M ? ' (= La+Lb−1, doğrusal ile aynı)' : ' (sıfır dolgulu)'}`} />
            <div className="row">
              <button className="btn" aria-pressed={N === Nmin} onClick={() => setNc(Nmin)}>N = max(La, Lb) = {Nmin}</button>
              <button className="btn" aria-pressed={N === M} onClick={() => setNc(M)}>N = La + Lb − 1 = {M}</button>
            </div>
          </>
        ) : (
          <div className="row" style={{ fontSize: 14 }}>
            <span className="muted">DFT ile çarpılacak kare matris ({N}×{N}):</span>
            <button className="btn" aria-pressed={square === 'toeplitz'} onClick={() => setSquare('toeplitz')}>alt üçgen Toeplitz L</button>
            <button className="btn" aria-pressed={square === 'circulant'} onClick={() => setSquare('circulant')}>sıfır dolgulu circulant C</button>
          </div>
        )}
        <div className="row" style={{ fontSize: 14 }}>
          <span className="muted">Matrisi kurulan dizi:</span>
          <button className="btn" aria-pressed={kern === 'a'} onClick={() => setKern('a')}>a (vektör b)</button>
          <button className="btn" aria-pressed={kern === 'b'} onClick={() => setKern('b')}>b (vektör a)</button>
        </div>
      </div>

      <div className="viz-grid-3">
        <StemPanel title="a(n)" v={a} color="c1" />
        <StemPanel title="b(n)" v={b} color="c3" />
        <StemPanel title={mode === 'linear' ? 'y = a * b' : `y = a ⊛${N} b`} v={y} color="c2" ghost={mode === 'circular' ? yLin : undefined} />
      </div>
      {aliased && (
        <Callout kind="warn" title={`Örtüşme: N = ${N} < La + Lb − 1 = ${M}`}>
          Doğrusal sonucun son {M - N} örneği başa katlanıyor: <Tex tex={`y_{${N}}[n]=\\sum_m y[n+m${N}]`} />.
          Grafikte soluk halkalar doğrusal sonucu gösterir.
        </Callout>
      )}

      <div className="panel controls">
        <h3 style={{ margin: 0, fontSize: 15 }}>
          1. Konvolüsyon matrisi: <Tex tex={`\\mathbf y=${mode === 'linear' ? 'T' : 'C'}_${hName}\\,\\mathbf ${xName}`} />{' '}
          <span className="muted" style={{ fontWeight: 400 }}>({H.length}×{H[0]?.length ?? 0})</span>
        </h3>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          {mode === 'linear'
            ? <>Her sütun <Tex tex={`\\mathbf ${hName}`} />’nin bir aşağı kaydırılmış kopyası; alt kısım sıfırla dolar (Toeplitz, sarma yok). Satır <Tex tex="n" />, sütun <Tex tex="k" />: <Tex tex={`T_{nk}=${hName}[n-k]`} />.</>
            : <>Her sütun bir öncekinin dairesel olarak bir aşağı kaydırılmışı: alttan taşan eleman en üste döner (circulant). <Tex tex={`C_{nk}=${hName}[(n-k)\\bmod ${N}]`} />.</>}
        </p>
        <div className="mat-eq">
          <MatrixView M={y.map((v) => [[v, 0] as Complex])} real label="\mathbf y" digits={0} />
          <Tex tex="=" />
          <MatrixView M={toComplexMat(H)} real label={mode === 'linear' ? `T_${hName}` : `C_${hName}`} digits={0} />
          <Tex tex="\cdot" />
          <MatrixView M={xVec.map((v) => [[v, 0] as Complex])} real label={`\\mathbf ${xName}${mode === 'circular' && x.length < N ? '_{\\text{dolgulu}}' : ''}`} digits={0} />
        </div>
      </div>

      <div className="panel controls">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14 }}>Karmaşık matrislerin gösterimi:</span>
          <div className="row">
            <button className="btn" aria-pressed={view === 'cart'} onClick={() => setView('cart')}>a + bj</button>
            <button className="btn" aria-pressed={view === 'polar'} onClick={() => setView('polar')}>|z|∠θ</button>
            <button className="btn" aria-pressed={view === 'heat'} onClick={() => setView('heat')}>sadece renk</button>
            <label className="row" style={{ gap: 6, fontSize: 14 }}>
              ondalık
              <select value={digits} onChange={(e) => setDigits(Number(e.target.value))}>
                {[0, 1, 2, 3].map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
          </div>
        </div>
        <p className="muted" style={{ margin: 0, fontSize: 12 }}>
          Renk tonu = faz (0° kırmızı, 90° sarı-yeşil, 180° camgöbeği, −90° mor), koyuluk = |z|. Hücrenin üzerine gelince tam değer görünür. Tablolar genişse yatay kaydır.
        </p>
      </div>

      {mode === 'linear' && (
        <div className="panel controls">
          <h3 style={{ margin: 0, fontSize: 15 }}>
            2. Kare matris <Tex tex={square === 'toeplitz' ? `L_${hName}` : `C_${hName}`} /> ({N}×{N}, N = La + Lb − 1)
          </h3>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            {square === 'toeplitz'
              ? <>DFT kare matris ister: <Tex tex="T" />’yi sağa sıfır sütunlarla <Tex tex="N" />×<Tex tex="N" />’ye tamamlayınca alt üçgen Toeplitz <Tex tex="L" /> çıkar. Sağ üst köşe sıfır: sarma yok, bu yüzden DFT onu köşegenleştiremez.</>
              : <>Sağ üst köşeye sarılan elemanlar eklendi (circulant). Bu elemanlar <Tex tex={`\\mathbf ${xName}`} />’nin dolgu sıfırlarıyla çarpıldığı için <Tex tex="\mathbf y" /> değişmez, ama matris artık DFT ile köşegenleşir.</>}
          </p>
          <div className="mat-eq">
            <MatrixView M={toComplexMat(Hs)} real label={square === 'toeplitz' ? `L_${hName}` : `C_${hName}`} digits={0}
              mark={(i, j) => j > i && Hs[i]![j] !== 0} />
          </div>
        </div>
      )}

      <details className="panel" open>
        <summary style={{ fontSize: 15, fontWeight: 600 }}>
          {mode === 'linear' ? 3 : 2}. DFT matrisi <Tex tex={`F_{kn}=W^{kn},\\; W=e^{-2\\pi i/${N}}`} /> ({N}×{N})
        </summary>
        <p className="muted" style={{ fontSize: 13 }}>
          Satır <Tex tex="k" /> frekans, sütun <Tex tex="n" /> zaman. Her satır birim çember üzerinde <Tex tex="k" /> adımla dönen bir fazör: renk tonu satır boyunca <Tex tex="k" /> kat hızla döner.
        </p>
        <div className="mat-eq">
          <MatrixView M={F} view={view} digits={Math.max(digits, 2)} label="F" />
        </div>
        <details style={{ marginTop: 8 }}>
          <summary className="muted" style={{ fontSize: 13 }}>Ters DFT matrisi <Tex tex="F^{-1}=\overline F/N" /></summary>
          <div className="mat-eq"><MatrixView M={Finv} view={view} digits={Math.max(digits, 3)} label="F^{-1}" /></div>
        </details>
      </details>

      <details className="panel" open>
        <summary style={{ fontSize: 15, fontWeight: 600 }}>
          {mode === 'linear' ? 4 : 3}. Çarpım <Tex tex={`F\\,${sqName(mode, square, hName)}`} />
        </summary>
        <p className="muted" style={{ fontSize: 13 }}>
          {rowScaleErr < 1e-7 * (1 + maxAbs(Xh))
            ? <>Her satır, <Tex tex="F" />’nin aynı satırının <Tex tex={`(F\\mathbf ${hName})_k`} /> katı: <Tex tex={`F\\,C_${hName}=\\Lambda F`} /> (en büyük sapma {fmtErr(rowScaleErr)}). Yani <Tex tex="F" />’nin satırları matrisin sol özvektörleridir.</>
            : <>Satırlar artık <Tex tex="F" />’nin satırlarının katı değil (<Tex tex={`F L \\ne \\Lambda F`} />, en büyük sapma {fmt(rowScaleErr, 2)}): Toeplitz matrisin özvektörleri Fourier vektörleri değil.</>}
        </p>
        <div className="mat-eq">
          <MatrixView M={F} view={view} digits={Math.max(digits, 2)} label="F" />
          <Tex tex="\cdot" />
          <MatrixView M={toComplexMat(Hs)} real digits={0} label={sqName(mode, square, hName)} />
          <Tex tex="=" />
          <MatrixView M={FH} view={view} digits={digits} label={`F\\,${sqName(mode, square, hName)}`} />
        </div>
      </details>

      <details className="panel" open>
        <summary style={{ fontSize: 15, fontWeight: 600 }}>
          {mode === 'linear' ? 5 : 4}. Köşegenleştirme <Tex tex={`\\Lambda=F\\,${sqName(mode, square, hName)}\\,F^{-1}`} />
        </summary>
        <div className={diagonal ? 'callout info' : 'callout warn'}>
          {diagonal
            ? <><strong>Köşegen.</strong> Köşegen dışı en büyük değer {fmtErr(offMax)} (yuvarlama hatası). Köşegen tam olarak <Tex tex={`F\\mathbf ${hName}`} />: <Tex tex={`\\Lambda=\\operatorname{diag}(F\\mathbf ${hName})`} />.</>
            : <><strong>Köşegen değil.</strong> Köşegen dışı enerji oranı {fmt(100 * offRatio, 1)} %, en büyük köşegen dışı değer {fmt(offMax, 2)}. Toeplitz matrisin sağ üst köşesi eksik: “sıfır dolgulu circulant C” seçilince köşegenleşir.</>}
        </div>
        <div className="mat-eq">
          <MatrixView M={Lam} view={view} digits={digits} label="\Lambda" diag />
        </div>
      </details>

      <div className="panel controls">
        <h3 style={{ margin: 0, fontSize: 15 }}>
          {mode === 'linear' ? 6 : 5}. Hadamard çarpımı: <Tex tex={`F\\mathbf y=\\Lambda\\,F\\mathbf ${xName}=(F\\mathbf ${hName})\\odot(F\\mathbf ${xName})`} />
        </h3>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          Köşegen bir matrisle çarpmak, vektörü eleman eleman çarpmaktır. Zaman tarafında {N}² çarpmalık matris–vektör çarpımı, frekans tarafında {N} çarpmaya iner.
          {mode === 'linear' && square === 'toeplitz' && ' (Bu eşitlik circulant için kurulur; N = La + Lb − 1 olduğundan L ile aynı y’yi verir.)'}
        </p>
        <HadamardTable Xh={Xh} Xx={Xx} XY={XY} Fy={Fy} Lam={Lam} hName={hName} xName={xName} digits={Math.max(digits, 1)} />
      </div>
    </div>
  );
}

function sqName(mode: Mode, square: Square, h: string) {
  return mode === 'linear' && square === 'toeplitz' ? `L_${h}` : `C_${h}`;
}

const maxAbs = (v: readonly Complex[]) => Math.max(0, ...v.map(([r, i]) => Math.hypot(r, i)));

function SignalControls(props: {
  name: string; v: number[]; color: string;
  onLen: (n: number) => void; onSet: (v: number[]) => void; onRoll: () => void;
}) {
  const { name, v, color, onLen, onSet, onRoll } = props;
  const [draft, setDraft] = useState(v.join(', '));
  const [bad, setBad] = useState(false);
  useEffect(() => { setDraft(v.join(', ')); setBad(false); }, [v]);
  const commit = () => {
    const parts = draft.split(/[\s,;]+/).filter(Boolean).map(Number);
    if (!parts.length || parts.length > MAX_LEN || parts.some((p) => !Number.isFinite(p))) { setBad(true); return; }
    onSet(parts);
  };
  return (
    <div className="controls" style={{ gap: 6 }}>
      <Slider label={<span style={{ color }}>Uzunluk L<sub>{name}</sub></span>} value={v.length} min={1} max={MAX_LEN} step={1} onChange={onLen} format={(n) => String(n)} />
      <div className="row" style={{ flexWrap: 'nowrap' }}>
        <Tex tex={`${name}=`} />
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); }}
          aria-label={`${name} dizisinin elemanları, virgülle ayrılmış`} aria-invalid={bad}
          style={{ flex: 1, minWidth: 0, font: 'inherit', fontFamily: 'var(--mono)', fontSize: 13, padding: '4px 8px', borderRadius: 8,
            border: `1px solid ${bad ? 'var(--c2)' : 'var(--border)'}`, background: 'var(--bg-elev)', color: 'var(--fg)' }} />
        <button className="btn" onClick={onRoll} title={`${name} için yeni rastgele değerler`}>🎲</button>
      </div>
      {bad && <span className="bad" style={{ fontSize: 12 }}>1–{MAX_LEN} sayı, virgül ya da boşlukla ayrılmış.</span>}
    </div>
  );
}

function StemPanel({ title, v, color, ghost }: { title: string; v: readonly number[]; color: keyof Palette; ghost?: readonly number[] }) {
  const draw = useCallback(({ ctx, width, height, palette: pal }: DrawContext) => {
    const all = [...v, ...(ghost ?? []), 0];
    const lo = Math.min(...all), hi = Math.max(...all);
    const span = Math.max(1, hi - lo);
    const len = Math.max(v.length, ghost?.length ?? 0);
    const vp = makeViewport(width, height, { x: [-0.7, len - 0.3], y: [lo - 0.08 * span, hi + 0.12 * span] }, PAD);
    drawGridAxes(ctx, vp, pal, { xLabel: 'n', ticks: Math.min(8, len) });
    const stem = (n: number, val: number, c: string, filled: boolean) => {
      ctx.save();
      ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = filled ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(vp.x(n), vp.y(0)); ctx.lineTo(vp.x(n), vp.y(val)); ctx.stroke();
      ctx.beginPath(); ctx.arc(vp.x(n), vp.y(val), filled ? 4 : 6, 0, 2 * Math.PI);
      if (filled) ctx.fill(); else ctx.stroke();
      ctx.restore();
    };
    ghost?.forEach((val, n) => stem(n + 0.12, val, pal.muted, false));
    v.forEach((val, n) => stem(n, val, pal[color], true));
  }, [v, ghost, color]);
  return (
    <div className="panel">
      <h3 style={{ margin: '0 0 6px', fontSize: 14 }}>{title} <span className="muted" style={{ fontWeight: 400 }}>(uzunluk {v.length})</span></h3>
      <Canvas draw={draw} aspect={0.6} ariaLabel={`${title} gövde grafiği`} />
    </div>
  );
}

// ---- matrix tables -------------------------------------------------------

function cellText([re, im]: Complex, view: View, d: number, tiny: number): string {
  const r = Math.hypot(re, im);
  if (r <= tiny) return '0';
  if (view === 'heat') return '';
  if (view === 'polar') return `${fmt(r, d)}∠${fmt((Math.atan2(im, re) * 180) / Math.PI, 0)}°`;
  const reS = Math.abs(re) > tiny ? fmt(re, d) : '';
  const imAbs = Math.abs(im);
  if (imAbs <= tiny || fmt(imAbs, d) === fmt(0, d)) return reS || '0';
  const imS = `${fmt(imAbs, d)}j`;
  if (!reS || reS === fmt(0, d)) return `${im < 0 ? '−' : ''}${imS}`;
  return `${reS}${im < 0 ? '−' : '+'}${imS}`;
}

function cellBg([re, im]: Complex, max: number, real: boolean, tiny: number) {
  const r = Math.hypot(re, im);
  if (r <= tiny) return 'transparent';
  const p = Math.round(12 + 58 * Math.min(1, r / (max || 1)));
  if (real) return `color-mix(in srgb, ${re >= 0 ? 'var(--c1)' : 'var(--c2)'} ${p}%, transparent)`;
  const hue = ((Math.atan2(im, re) * 180) / Math.PI + 360) % 360;
  return `color-mix(in srgb, hsl(${hue.toFixed(0)} 75% 50%) ${p}%, transparent)`;
}

function MatrixView(props: {
  M: CMat; label: string; digits: number; view?: View; real?: boolean; diag?: boolean;
  mark?: (i: number, j: number) => boolean;
}) {
  const { M, label, digits, view = 'cart', real = false, diag = false, mark } = props;
  const max = Math.max(0, ...M.flat().map(([r, i]) => Math.hypot(r, i)));
  const tiny = Math.max(1e-9 * max, 1e-12);
  const cols = M[0]?.length ?? 0;
  const heat = view === 'heat' && !real;
  const head = { color: 'var(--muted)', fontSize: 10, padding: '0 3px', textAlign: 'center' as const, fontWeight: 400 };
  return (
    <div style={{ display: 'grid', justifyItems: 'center', gap: 4, flex: '0 0 auto' }}>
      <Tex tex={label} />
      <table style={{ borderCollapse: 'collapse', fontSize: 11, fontFamily: 'var(--mono)', fontVariantNumeric: 'tabular-nums' }}>
        {cols > 1 && (
          <thead>
            <tr><th />{Array.from({ length: cols }, (_, j) => <th key={j} style={head}>{j}</th>)}</tr>
          </thead>
        )}
        <tbody>
          {M.map((row, i) => (
            <tr key={i}>
              <th style={head}>{i}</th>
              {row.map((z, j) => {
                const onDiag = diag && i === j;
                const marked = mark?.(i, j) ?? false;
                return (
                  <td key={j}
                    title={`[${i},${j}] = ${fmt(z[0], 6)} ${z[1] < 0 ? '−' : '+'} ${fmt(Math.abs(z[1]), 6)}j   |z| = ${fmt(Math.hypot(z[0], z[1]), 6)}, ∠ = ${fmt((Math.atan2(z[1], z[0]) * 180) / Math.PI, 2)}°`}
                    style={{
                      background: cellBg(z, max, real, tiny),
                      padding: heat ? 0 : '2px 5px',
                      minWidth: heat ? 16 : undefined,
                      height: heat ? 16 : 20,
                      textAlign: 'right',
                      whiteSpace: 'nowrap',
                      border: onDiag || marked ? `2px solid ${marked ? 'var(--c2)' : 'var(--fg)'}` : '1px solid var(--border)',
                      color: Math.hypot(z[0], z[1]) <= tiny ? 'var(--muted)' : undefined,
                      fontWeight: onDiag ? 700 : undefined,
                    }}>
                    {real ? cellText(z, 'cart', digits, tiny) : cellText(z, view, digits, tiny)}
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

function HadamardTable(props: {
  Xh: Complex[]; Xx: Complex[]; XY: Complex[]; Fy: Complex[]; Lam: CMat; hName: string; xName: string; digits: number;
}) {
  const { Xh, Xx, XY, Fy, Lam, hName, xName, digits } = props;
  const cols: Array<[string, Complex[]]> = [
    [`(F\\mathbf ${hName})_k`, Xh],
    [`\\Lambda_{kk}`, Lam.map((r, k) => r[k]!)],
    [`(F\\mathbf ${xName})_k`, Xx],
    [`(F\\mathbf ${hName})_k(F\\mathbf ${xName})_k`, XY],
    [`(F\\mathbf y)_k`, Fy],
  ];
  const err = Math.max(0, ...XY.map(([r, i], k) => Math.hypot(r - Fy[k]![0], i - Fy[k]![1])));
  const scale = Math.max(1, maxAbs(Fy));
  const s = (z: Complex) => cellText(z, 'cart', digits, 1e-9 * scale);
  return (
    <>
      <div style={{ overflowX: 'auto' }}>
        <table className="mat-table" style={{ borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ padding: '2px 8px' }}><Tex tex="k" /></th>
              {cols.map(([t]) => <th key={t} style={{ padding: '2px 10px', textAlign: 'right' }}><Tex tex={t} /></th>)}
            </tr>
          </thead>
          <tbody>
            {Xh.map((_, k) => (
              <tr key={k} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '2px 8px', color: 'var(--muted)' }}>{k}</td>
                {cols.map(([t, v]) => <td key={t} style={{ padding: '2px 10px', textAlign: 'right', whiteSpace: 'nowrap' }}>{s(v[k]!)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={err < 1e-7 * scale ? 'ok' : 'bad'} style={{ margin: 0, fontSize: 13 }}>
        En büyük fark |(F{hName})⊙(F{xName}) − F y| = {fmtErr(err)}. Ters DFT: <Tex tex={`\\mathbf y=F^{-1}\\big[(F\\mathbf ${hName})\\odot(F\\mathbf ${xName})\\big]`} />.
      </p>
    </>
  );
}
