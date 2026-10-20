import { useCallback, useMemo, useState } from 'react';
import {
  J2,
  add,
  commutator,
  complexStructure,
  conjugateFlow,
  conjugatorToJ,
  det2,
  expComplexStructure,
  expm,
  identity,
  inv2,
  maxAbsDiff,
  mul,
  mulVec,
  norm,
  pureQuatMatrix,
  scale,
  sphericalToUnit,
  sub,
  trace,
  transpose,
  type Mat,
  type Vec,
} from '../../core/math';
import {
  Callout,
  Canvas,
  Slider,
  Tabs,
  Tex,
  arrow,
  dot,
  drawGridAxes,
  fmt,
  fmtErr,
  label,
  makeViewport,
  polyline,
  prefersReducedMotion,
  texMatrix,
  useAnimatedTime,
  useHashParam,
  type CanvasPointer,
  type DrawContext,
  type Palette,
  type Viewport,
} from '../../core/ui';

type TabId = 'structure' | 'similarity' | 'quaternion';
const TAB_IDS: readonly TabId[] = ['structure', 'similarity', 'quaternion'];
const TWO_PI = 2 * Math.PI;
const ORBIT_SAMPLES = 240;

/** Keep b away from 0, where the family does not exist. */
function safeB(b: number): number {
  return Math.abs(b) < 0.05 ? (b < 0 ? -0.05 : 0.05) : b;
}

function orbit(f: (t: number) => readonly [number, number]): Array<readonly [number, number]> {
  return Array.from({ length: ORBIT_SAMPLES + 1 }, (_, k) => f((TWO_PI * k) / ORBIT_SAMPLES));
}

function unitCircleImage(A: Mat): Array<readonly [number, number]> {
  return orbit((s) => {
    const v = mulVec(A, [Math.cos(s), Math.sin(s)]);
    return [v[0]!, v[1]!];
  });
}

function extent(pts: ReadonlyArray<readonly [number, number]>, min = 1.4): number {
  let m = min;
  for (const [x, y] of pts) m = Math.max(m, Math.abs(x), Math.abs(y));
  return m * 1.12;
}

function squareViewport(width: number, height: number, R: number): Viewport {
  return makeViewport(width, height, { x: [-R, R], y: [-R, R] }, { l: 30, r: 10, t: 10, b: 22 }, true);
}

export default function Viz() {
  const [tab, setTab] = useHashParam<TabId>('tab', 'structure', TAB_IDS);
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  const [t, setT] = useAnimatedTime(playing, 0.7, TWO_PI);
  const [a, setA] = useState(0.6);
  const [b, setB] = useState(-1.3);

  return (
    <div>
      <Tabs<TabId>
        value={tab}
        onChange={setTab}
        items={[
          { id: 'structure', label: '2×2: M² = −I ve eᵗᴹ' },
          { id: 'similarity', label: 'Benzerlik ve [M, A]' },
          { id: 'quaternion', label: '4×4: kuaterniyonlar' },
        ]}
      />
      <div className="row" style={{ marginBottom: 12 }}>
        <button className="btn" aria-pressed={playing} onClick={() => setPlaying((p) => !p)}>
          {playing ? '❚❚ Durdur' : '▶ Oynat'}
        </button>
        <div style={{ flex: '1 1 240px' }}>
          <Slider
            label={<Tex tex="t" />}
            value={t}
            min={0}
            max={TWO_PI}
            step={0.005}
            onChange={(v) => {
              setPlaying(false);
              setT(v);
            }}
          />
        </div>
      </div>
      {tab === 'structure' && <StructureTab a={a} b={b} setA={setA} setB={setB} t={t} />}
      {tab === 'similarity' && <SimilarityTab a={a} b={b} setA={setA} setB={setB} t={t} />}
      {tab === 'quaternion' && <QuaternionTab t={t} />}
    </div>
  );
}

interface AbProps {
  a: number;
  b: number;
  setA: (v: number) => void;
  setB: (v: number) => void;
}

function AbSliders({ a, b, setA, setB }: AbProps) {
  return (
    <>
      <Slider label={<Tex tex="a" />} value={a} min={-2} max={2} onChange={setA} />
      <Slider label={<Tex tex="b" />} value={b} min={-3} max={3} onChange={setB} />
      {Math.abs(b) < 0.05 && (
        <Callout kind="warn" title="b = 0 yasak">
          <Tex tex="b=0" /> için <Tex tex="-a^2=1" /> gerekir, reel çözüm yok. Hesap{' '}
          <Tex tex={`b=${fmt(safeB(b), 2)}`} /> ile yapılıyor. İşaret değişince dönme yönü tersine döner.
        </Callout>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Tab 1: the 2x2 family, e^{tM} orbit as P * circle

function StructureTab({ a, b, setA, setB, t }: AbProps & { t: number }) {
  const [phi, setPhi] = useState(0);
  const [showJ, setShowJ] = useState(true);
  const M = useMemo(() => complexStructure(a, safeB(b)), [a, b]);
  const P = useMemo(() => conjugatorToJ(M), [M]);
  const Pinv = useMemo(() => inv2(P), [P]);
  const x0: Vec = [Math.cos(phi), Math.sin(phi)];
  const y0 = mulVec(Pinv, x0);
  const r = Math.hypot(y0[0]!, y0[1]!);

  const E = expComplexStructure(M, t);
  const xt = mulVec(E, x0);
  const yt = mulVec(expm(J2, t), y0);
  const M2 = mul(M, M);
  const errM2 = maxAbsDiff(M2, scale(identity(2), -1));
  const errExp = maxAbsDiff(E, expm(M, t));
  // M + M^T = 0 (skew-symmetric) exactly when e^{tM} is orthogonal, i.e. a true rotation.
  const skewErr = norm(add(M, transpose(M)));
  const isSkew = skewErr < 1e-9;

  const ellipse = useMemo(() => {
    const start = [Math.cos(phi), Math.sin(phi)];
    return orbit((s) => {
      const v = mulVec(expComplexStructure(M, s), start);
      return [v[0]!, v[1]!];
    });
  }, [M, phi]);
  const R = extent([...ellipse, [r, r], [P[0]![1]!, P[1]![1]!]]);

  const draw = useCallback(
    ({ ctx, width, height, palette: pal }: DrawContext) => {
      const vp = squareViewport(width, height, R);
      drawGridAxes(ctx, vp, pal);
      // Columns of P: e1 and M e1 (the skewed "axes" of the ellipse).
      arrow(ctx, vp, [0, 0], [1, 0], pal.muted, 1.5);
      arrow(ctx, vp, [0, 0], [P[0]![1]!, P[1]![1]!], pal.muted, 1.5);
      label(ctx, vp, [P[0]![1]!, P[1]![1]!], 'Me₁', pal.muted);
      if (showJ) {
        polyline(ctx, vp, orbit((s) => [r * Math.cos(s), r * Math.sin(s)]), pal.c2, 1.5, [5, 4]);
        dot(ctx, vp, [yt[0]!, yt[1]!], pal.c2, 4);
      }
      polyline(ctx, vp, ellipse, pal.c1, 2.2);
      arrow(ctx, vp, [0, 0], [x0[0]!, x0[1]!], pal.axis, 1.5);
      arrow(ctx, vp, [0, 0], [xt[0]!, xt[1]!], pal.c1, 2.5);
      label(ctx, vp, [xt[0]!, xt[1]!], 'eᵗᴹx₀', pal.c1);
    },
    [R, P, showJ, r, yt, ellipse, x0, xt],
  );

  return (
    <div className="viz-grid">
      <div className="panel">
        <Canvas draw={draw} aspect={1} maxHeight={560} ariaLabel="e^{tM} yörüngesi: elips ve karşılık gelen J çemberi" />
        <div className="legend" style={{ marginTop: 8 }}>
          <span>
            <i style={{ background: 'var(--c1)' }} />
            <Tex tex="e^{tM}x_0" /> (elips)
          </span>
          {showJ && (
            <span>
              <i style={{ background: 'var(--c2)' }} />
              <Tex tex="e^{tJ}P^{-1}x_0" /> (çember)
            </span>
          )}
          <span>
            <i style={{ background: 'var(--muted)' }} />
            <Tex tex="P" />’nin sütunları <Tex tex="e_1,\ Me_1" />
          </span>
        </div>
        <p className="canvas-caption">
          Turuncu çemberdeki noktayı <Tex tex="P" /> ile çarpınca mavi elipsteki nokta elde edilir:{' '}
          <Tex tex="e^{tM}x_0=P\,(e^{tJ}P^{-1}x_0)" />.
        </p>
      </div>
      <div className="controls panel">
        <AbSliders a={a} b={b} setA={setA} setB={setB} />
        <div className="row">
          <button className="btn" aria-pressed={isSkew && b < 0} onClick={() => (setA(0), setB(-1))}>
            Ters simetrik: J
          </button>
          <button className="btn" aria-pressed={isSkew && b > 0} onClick={() => (setA(0), setB(1))}>
            Ters simetrik: −J
          </button>
          <button className="btn" onClick={() => (setA(0.6), setB(-1.3))}>
            Eğik (genel)
          </button>
        </div>
        <Slider
          label={
            <>
              başlangıç <Tex tex="x_0" /> açısı
            </>
          }
          value={phi}
          min={0}
          max={TWO_PI}
          onChange={setPhi}
          format={(v) => `${Math.round((v * 180) / Math.PI)}°`}
        />
        <label className="row" style={{ fontSize: 14 }}>
          <input type="checkbox" checked={showJ} onChange={(e) => setShowJ(e.target.checked)} />
          J-dünyasındaki çemberi göster
        </label>
        <div className="readout">
          <Tex block tex={`M=${texMatrix(M)}`} />
          <Tex block tex={`M^2=${texMatrix(M2)}`} />
          <div>
            <span className={errM2 < 1e-12 ? 'ok' : 'bad'}>
              <Tex tex={`\\max|M^2+I| = ${fmtErr(errM2)}`} />
            </span>
          </div>
          <div>
            <Tex tex={`\\|M+M^{\\mathsf T}\\|_F=${fmt(skewErr)}`} />{' '}
            {isSkew ? (
              <span className="ok">ters simetrik: eᵗᴹ ortogonal, yörünge çember</span>
            ) : (
              <span style={{ color: 'var(--muted)' }}>ters simetrik değil: eᵗᴹ bir “eğik dönme”, yörünge elips</span>
            )}
          </div>
          <div>
            <Tex tex={`\\operatorname{tr}M=${fmt(trace(M))},\\quad \\det M=${fmt(det2(M), 4)}`} />
          </div>
          <Tex block tex={`P=${texMatrix(P)},\\ \\ PJP^{-1}=${texMatrix(mul(mul(P, J2), Pinv))}`} />
          <Tex
            block
            tex={`e^{tM}=\\underbrace{${fmt(Math.cos(t))}}_{\\cos t}I+\\underbrace{${fmt(Math.sin(t))}}_{\\sin t}M=${texMatrix(E)}`}
          />
          <div>
            Kapalı form ile sayısal <Tex tex="\exp" /> farkı:{' '}
            <span className="ok">
              <Tex tex={fmtErr(errExp)} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 2: similarity flow A(t) = e^{tM} A e^{-tM} and the commutator

const PRESETS: Record<string, { label: string; make: (M: Mat) => Mat }> = {
  sym: { label: 'Simetrik diag(1.6, 0.5)', make: () => [[1.6, 0], [0, 0.5]] },
  shear: { label: 'Kesme [[1,1],[0,1]]', make: () => [[1, 1], [0, 1]] },
  commuting: { label: 'αI + βM (değişmeli)', make: (M) => add(scale(identity(2), 0.8), scale(M, 0.4)) },
  anti: { label: 'Ters değişmeli (MA = −AM)', make: (M) => antiPart(M, [[0.9, 0.3], [0.3, -0.6]]) },
};

function antiPart(M: Mat, A: Mat): Mat {
  return scale(add(A, mul(mul(M, A), M)), 0.5);
}
function commutingPart(M: Mat, A: Mat): Mat {
  return scale(sub(A, mul(mul(M, A), M)), 0.5);
}

function SimilarityTab({ a, b, setA, setB, t }: AbProps & { t: number }) {
  const [A0, setA0] = useState<Mat>([
    [1.6, 0],
    [0, 0.5],
  ]);
  const [inJ, setInJ] = useState(false);
  const M = useMemo(() => complexStructure(a, safeB(b)), [a, b]);
  const P = useMemo(() => conjugatorToJ(M), [M]);
  const Pinv = useMemo(() => inv2(P), [P]);

  // In "J coordinates" we show B = P^{-1} A P, whose flow is a rigid rotation.
  const gen = inJ ? J2 : M;
  const A = inJ ? mul(mul(Pinv, A0), P) : A0;
  const At = conjugateFlow(gen, A, t);
  const C = commutator(M, A0);
  const Ac = commutingPart(M, A0);
  const Aa = antiPart(M, A0);
  const nA = norm(A0);
  const share = nA > 0 ? norm(Aa) / Math.hypot(norm(Ac), norm(Aa)) : 0;

  const before = unitCircleImage(A);
  const after = unitCircleImage(At);
  const R = extent([...before, ...after], 1.2);

  const draw = useCallback(
    ({ ctx, width, height, palette: pal }: DrawContext) => {
      const vp = squareViewport(width, height, R);
      drawGridAxes(ctx, vp, pal);
      polyline(ctx, vp, orbit((s) => [Math.cos(s), Math.sin(s)]), pal.grid, 1.5);
      polyline(ctx, vp, before, pal.axis, 1.5, [5, 4]);
      polyline(ctx, vp, after, pal.c1, 2.2);
      arrow(ctx, vp, [0, 0], [At[0]![0]!, At[1]![0]!], pal.c1, 2);
      arrow(ctx, vp, [0, 0], [At[0]![1]!, At[1]![1]!], pal.c3, 2);
      label(ctx, vp, [At[0]![0]!, At[1]![0]!], 'A(t)e₁', pal.c1);
      label(ctx, vp, [At[0]![1]!, At[1]![1]!], 'A(t)e₂', pal.c3);
    },
    [R, before, after, At],
  );

  const setEntry = (i: number, j: number) => (v: number) =>
    setA0((m) => m.map((row, r) => row.map((x, c) => (r === i && c === j ? v : x))));

  return (
    <div className="viz-grid">
      <div className="panel">
        <Canvas draw={draw} aspect={1} maxHeight={560} ariaLabel="Benzerlik akışı altında birim çemberin görüntüsü" />
        <div className="legend" style={{ marginTop: 8 }}>
          <span>
            <i style={{ background: 'var(--axis)' }} />
            {inJ ? 'B' : 'A'}’nın birim çemberi götürdüğü elips (t = 0)
          </span>
          <span>
            <i style={{ background: 'var(--c1)' }} />
            {inJ ? 'B(t)' : 'A(t)'}’nin görüntüsü
          </span>
        </div>
        <p className="canvas-caption">
          {inJ ? (
            <>
              <Tex tex="B=P^{-1}AP" /> koordinatlarında akış <Tex tex="e^{tJ}Be^{-tJ}" />: elips katı cisim gibi
              döner, ama yalnızca dönen kısmı (<Tex tex="B_a" />) iki kat hızla döner.
            </>
          ) : (
            <>Mavi elips, <Tex tex="A(t)" />’nin birim çemberi gönderdiği yer. Gri kesikli çizgi başlangıç.</>
          )}
        </p>
      </div>
      <div className="controls panel">
        <AbSliders a={a} b={b} setA={setA} setB={setB} />
        <div className="row">
          {Object.entries(PRESETS).map(([k, p]) => (
            <button key={k} className="btn" onClick={() => setA0(p.make(M))}>
              {p.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
          {[0, 1].flatMap((i) =>
            [0, 1].map((j) => (
              <Slider
                key={`${i}${j}`}
                label={<Tex tex={`A_{${i + 1}${j + 1}}`} />}
                value={A0[i]![j]!}
                min={-2}
                max={2}
                onChange={setEntry(i, j)}
              />
            )),
          )}
        </div>
        <label className="row" style={{ fontSize: 14 }}>
          <input type="checkbox" checked={inJ} onChange={(e) => setInJ(e.target.checked)} />
          J-koordinatlarında göster (<Tex tex="B=P^{-1}AP" />)
        </label>
        <div className="readout">
          <Tex block tex={`[M,A]=${texMatrix(C)},\\quad \\|[M,A]\\|_F=${fmt(norm(C))}`} />
          <Tex block tex={`A_c=${texMatrix(Ac)},\\quad A_a=${texMatrix(Aa)}`} />
          <div>
            “A ne kadar döner?” Dönen pay{' '}
            <Tex tex={`\\|A_a\\|/\\sqrt{\\|A_c\\|^2+\\|A_a\\|^2}=${fmt(share * 100, 1)}\\%`} />
            {norm(C) < 1e-9 && <span className="ok"> · A, M ile değişir: hiç dönmez.</span>}
          </div>
          <Tex block tex={`A(t)=${texMatrix(conjugateFlow(M, A0, t))}`} />
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            Periyot <Tex tex="\pi" />: <Tex tex="e^{\pi M}=-I" /> olduğu için{' '}
            <Tex tex="A(\pi)=A" />.
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 3: 4x4 left quaternion multiplication, n on S^2

const P0_OPTIONS: Record<string, { label: string; v: Vec }> = {
  one: { label: '1', v: [1, 0, 0, 0] },
  i: { label: 'i', v: [0, 1, 0, 0] },
  j: { label: 'j', v: [0, 0, 1, 0] },
  mix: { label: '(1+i+j+k)/2', v: [0.5, 0.5, 0.5, 0.5] },
  skew: { label: '(2+j−k)/√6', v: [2 / Math.sqrt(6), 0, 1 / Math.sqrt(6), -1 / Math.sqrt(6)] },
};
const AXIS_NAMES = ['1', 'i', 'j', 'k'] as const;
const PLANES: Array<[number, number]> = [
  [0, 1],
  [0, 2],
  [0, 3],
  [1, 2],
  [1, 3],
  [2, 3],
];

const dot3 = (p: Vec, q: Vec) => p[0]! * q[0]! + p[1]! * q[1]! + p[2]! * q[2]!;
function cross3(p: Vec, q: Vec): Vec {
  return [p[1]! * q[2]! - p[2]! * q[1]!, p[2]! * q[0]! - p[0]! * q[2]!, p[0]! * q[1]! - p[1]! * q[0]!];
}
function normalize3(p: Vec): Vec {
  const n = Math.hypot(p[0]!, p[1]!, p[2]!);
  return p.map((x) => x / n);
}

// Fixed camera for the S^2 picker.
const VIEW = sphericalToUnit(1.15, 0.55);
const RIGHT = normalize3(cross3([0, 0, 1], VIEW));
const UP = cross3(VIEW, RIGHT);

function QuaternionTab({ t }: { t: number }) {
  const [theta, setTheta] = useState(1.0);
  const [phiN, setPhiN] = useState(0.8);
  const [p0Key, setP0Key] = useState('mix');
  const [plane, setPlane] = useState(0);
  const n = sphericalToUnit(theta, phiN);
  const M = pureQuatMatrix(n);
  const errM2 = maxAbsDiff(mul(M, M), scale(identity(4), -1));
  const p0 = P0_OPTIONS[p0Key]!.v;
  const Mp0 = mulVec(M, p0);
  const at = (s: number) => p0.map((x, k) => Math.cos(s) * x + Math.sin(s) * Mp0[k]!);
  const pt = at(t);
  const [i1, i2] = PLANES[plane]!;

  const drawSphere = useCallback(
    ({ ctx, width, height, palette: pal }: DrawContext) => {
      const vp = squareViewport(width, height, 1.25);
      drawSpherePicker(ctx, vp, pal, n);
    },
    [n],
  );

  const onPointer = useCallback((p: CanvasPointer) => {
    if (p.type === 'up' || (p.type === 'move' && !p.buttons)) return;
    const vp = squareViewport(p.width, p.height, 1.25);
    let sx = vp.x.invert(p.x);
    let sy = vp.y.invert(p.y);
    const r2 = sx * sx + sy * sy;
    if (r2 > 1) {
      const r = Math.sqrt(r2);
      sx /= r;
      sy /= r;
    }
    const sz = Math.sqrt(Math.max(0, 1 - sx * sx - sy * sy));
    const w = [0, 1, 2].map((k) => sx * RIGHT[k]! + sy * UP[k]! + sz * VIEW[k]!);
    setTheta(Math.acos(Math.max(-1, Math.min(1, w[2]!))));
    setPhiN(Math.atan2(w[1]!, w[0]!));
  }, []);

  const drawProjection = useCallback(
    ({ ctx, width, height, palette: pal }: DrawContext) => {
      const vp = squareViewport(width, height, 1.2);
      drawGridAxes(ctx, vp, pal, { ticks: 4, xLabel: AXIS_NAMES[i1], yLabel: AXIS_NAMES[i2] });
      const path = orbit((s) => {
        const q = at(s);
        return [q[i1]!, q[i2]!];
      });
      polyline(ctx, vp, path, pal.c1, 2.2);
      dot(ctx, vp, [p0[i1]!, p0[i2]!], pal.axis, 4);
      dot(ctx, vp, [pt[i1]!, pt[i2]!], pal.c1, 5);
    },
    [i1, i2, at, p0, pt],
  );

  const drawInvariant = useCallback(
    ({ ctx, width, height, palette: pal }: DrawContext) => {
      const vp = squareViewport(width, height, 1.2);
      drawGridAxes(ctx, vp, pal, { ticks: 4, xLabel: 'p₀', yLabel: 'Mp₀' });
      // Coordinates of q(t) in the orthonormal basis (p0, M p0), computed numerically.
      const coord = (q: Vec): [number, number] => [
        q.reduce((s, x, k) => s + x * p0[k]!, 0),
        q.reduce((s, x, k) => s + x * Mp0[k]!, 0),
      ];
      polyline(ctx, vp, orbit((s) => coord(at(s))), pal.c2, 2.2);
      arrow(ctx, vp, [0, 0], coord(pt), pal.c2, 2.5);
    },
    [at, p0, Mp0, pt],
  );

  return (
    <div>
      <div className="viz-grid-3">
        <div className="panel">
          <Canvas draw={drawSphere} aspect={1} onPointer={onPointer} ariaLabel="S² üzerinde birim saf kuaterniyon n seçimi; sürükle" />
          <p className="canvas-caption">
            Sürükle: <Tex tex="n\in S^2" /> (ön yarıküre). Arka yüz için <Tex tex="\theta" /> kaydıracını kullan.
          </p>
        </div>
        <div className="panel">
          <Canvas draw={drawProjection} aspect={1} ariaLabel="Yörüngenin koordinat düzlemine izdüşümü" />
          <p className="canvas-caption">
            <Tex tex="e^{tM}p_0" />’ın <Tex tex={`(${AXIS_NAMES[i1]},${AXIS_NAMES[i2]})`} /> düzlemine izdüşümü:
            genelde elips.
          </p>
        </div>
        <div className="panel">
          <Canvas draw={drawInvariant} aspect={1} ariaLabel="Değişmez düzlemde yörünge: birim çember" />
          <p className="canvas-caption">
            Aynı yörünge <Tex tex="\{p_0,\,Mp_0\}" /> düzleminde: tam bir çember (2B kesit).
          </p>
        </div>
      </div>
      <div className="viz-grid" style={{ marginTop: 16 }}>
        <div className="controls panel">
          <Slider label={<Tex tex="\theta" />} value={theta} min={0} max={Math.PI} onChange={setTheta} />
          <Slider label={<Tex tex="\varphi" />} value={phiN} min={-Math.PI} max={Math.PI} onChange={setPhiN} />
          <div className="row">
            <span style={{ fontSize: 14 }}>
              <Tex tex="p_0" />:
            </span>
            {Object.entries(P0_OPTIONS).map(([k, o]) => (
              <button key={k} className="btn" aria-pressed={p0Key === k} onClick={() => setP0Key(k)}>
                {o.label}
              </button>
            ))}
          </div>
          <div className="row">
            <span style={{ fontSize: 14 }}>İzdüşüm düzlemi:</span>
            <select value={plane} onChange={(e) => setPlane(Number(e.target.value))}>
              {PLANES.map(([x, y], k) => (
                <option key={k} value={k}>
                  ({AXIS_NAMES[x]}, {AXIS_NAMES[y]})
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="readout panel">
          <Tex block tex={`n=${fmt(n[0]!)}\\,i+${fmt(n[1]!)}\\,j+${fmt(n[2]!)}\\,k`} />
          <Tex block tex={`M=n_1L_i+n_2L_j+n_3L_k=${texMatrix(M, 2)}`} />
          <div className={errM2 < 1e-12 ? 'ok' : 'bad'}>
            <Tex tex={`\\max|M^2+I_4|=${fmtErr(errM2)}`} />
          </div>
          <div>
            <Tex tex={`e^{tM}=L_q,\\ q=\\cos t+n\\sin t=${fmt(Math.cos(t))}+(${fmt(Math.sin(t))})\\,n`} />
          </div>
        </div>
      </div>
    </div>
  );
}

function drawSpherePicker(ctx: CanvasRenderingContext2D, vp: Viewport, pal: Palette, n: Vec) {
  const proj = (p: Vec): [number, number] => [dot3(p, RIGHT), dot3(p, UP)];
  const front = (p: Vec) => dot3(p, VIEW) >= 0;
  ctx.save();
  ctx.strokeStyle = pal.axis;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(vp.x(0), vp.y(0), vp.x(1) - vp.x(0), 0, TWO_PI);
  ctx.stroke();
  ctx.restore();

  // Latitude/longitude circles, back half dashed.
  const circles: Array<(s: number) => Vec> = [];
  for (const lat of [-60, -30, 0, 30, 60]) {
    const th = ((90 - lat) * Math.PI) / 180;
    circles.push((s) => sphericalToUnit(th, s));
  }
  for (let k = 0; k < 6; k++) {
    const ph = (k * Math.PI) / 6;
    circles.push((s) => sphericalToUnit(s, ph));
  }
  for (const c of circles) {
    for (const wantFront of [false, true]) {
      const pts: Array<readonly [number, number]> = [];
      for (let k = 0; k <= 120; k++) {
        const p = c((TWO_PI * k) / 120);
        pts.push(front(p) === wantFront ? proj(p) : [NaN, NaN]);
      }
      polyline(ctx, vp, pts, wantFront ? pal.axis : pal.grid, 1, wantFront ? [] : [3, 3]);
    }
  }
  const axes: Array<[Vec, string]> = [
    [[1, 0, 0], 'i'],
    [[0, 1, 0], 'j'],
    [[0, 0, 1], 'k'],
  ];
  for (const [e, name] of axes) {
    const tip = proj(e.map((x) => x * 1.15));
    arrow(ctx, vp, [0, 0], tip, pal.muted, 1.2);
    label(ctx, vp, tip, name, pal.muted, 3, -3);
  }
  const pn = proj(n);
  arrow(ctx, vp, [0, 0], pn, pal.c2, 2.5);
  if (front(n)) dot(ctx, vp, pn, pal.c2, 6);
  else {
    ctx.save();
    ctx.strokeStyle = pal.c2;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(vp.x(pn[0]), vp.y(pn[1]), 6, 0, TWO_PI);
    ctx.stroke();
    ctx.restore();
  }
  label(ctx, vp, pn, 'n', pal.c2);
}
