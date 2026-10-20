import { useCallback, useMemo, useRef, useState } from 'react';
import {
  expSkew,
  expm,
  identity,
  matPow,
  maxAbsDiff,
  mul,
  mulVec,
  powerSemiAxes,
  sampleSphere,
  scale,
  skewDim,
  skewFromVector,
  skewNormalForm,
  skewPairs,
  transpose,
  type Vec,
} from '../../core/math';
import {
  Canvas,
  Slider,
  Tabs,
  Tex,
  arrow,
  fmt,
  fmtErr,
  label,
  makeViewport,
  polyline,
  prefersReducedMotion,
  texMatrix,
  useAnimatedTime,
  type CanvasPointer,
  type DrawContext,
  type Palette,
  type Viewport,
} from '../../core/ui';

type Mode = 'power' | 'exp';
type Frame = 'schur' | 'coords';
type P3 = readonly [number, number, number];

const TWO_PI = 2 * Math.PI;
const DIMS = [2, 3, 4, 5, 6] as const;
const CLOUD_SIZE = 1400;
const CIRCLE_SAMPLES = 160;
const SUB = '₀₁₂₃₄₅₆₇₈₉';
const sub1 = (k: number) => String(k).replace(/\d/g, (d) => SUB[Number(d)]!);

const DEFAULTS: Record<number, number[]> = {
  2: [1.2],
  3: [0.5, -0.8, 1.1],
  4: [1.3, 0.2, -0.4, 0.5, 0.3, 0.7],
  5: [0.3, -1.1, 0.4, 0.9, 0.2, -0.5, 0.8, 0.1, -0.7, 0.6],
  6: [0.9, -0.3, 0.5, 0.2, -0.6, 0.4, 1.1, -0.2, 0.3, 0.7, -0.5, 0.1, 0.6, 0.2, -0.8],
};

const toText = (v: number[]) => v.map((x) => String(x));
const parse = (s: string) => {
  const x = Number(s.replace(',', '.'));
  return Number.isFinite(x) ? x : 0;
};

function componentLabel(n: number, k: number): string {
  if (n === 3) return `ω${sub1(k + 1)}`;
  const [i, j] = skewPairs(n)[k]!;
  return `v${sub1(i + 1)}${sub1(j + 1)}`;
}

/** Names of the normal-form basis columns: q₁, p₁, q₂, p₂, …, then kernel vectors. */
function schurNames(planes: number, n: number): string[] {
  const out: string[] = [];
  for (let j = 1; j <= planes; j++) out.push(`q${sub1(j)}`, `p${sub1(j)}`);
  for (let j = 1; out.length < n; j++) out.push(n - 2 * planes === 1 ? 'n' : `n${sub1(j)}`);
  return out;
}

const dotv = (a: Vec, b: Vec) => a.reduce((s, x, i) => s + x * b[i]!, 0);

function project(c: P3, yaw: number, pitch: number): P3 {
  const x1 = Math.cos(yaw) * c[0] - Math.sin(yaw) * c[1];
  const y1 = Math.sin(yaw) * c[0] + Math.cos(yaw) * c[1];
  // pitch = 0 looks straight down the third axis; pitch = π/2 looks from the side.
  return [x1, y1 * Math.cos(pitch) + c[2] * Math.sin(pitch), c[2] * Math.cos(pitch) - y1 * Math.sin(pitch)];
}

function squareViewport(width: number, height: number, R: number): Viewport {
  return makeViewport(width, height, { x: [-R, R], y: [-R, R] }, { l: 10, r: 10, t: 10, b: 10 }, true);
}

export default function Viz() {
  const [n, setN] = useState(3);
  const [texts, setTexts] = useState<string[]>(() => toText(DEFAULTS[3]!));
  const [mode, setMode] = useState<Mode>('power');
  const [k, setK] = useState(1);
  const [normalize, setNormalize] = useState(true);
  const [frame, setFrame] = useState<Frame>('schur');
  const [axes, setAxes] = useState<[number, number, number]>([0, 1, 2]);
  const [cam, setCam] = useState({ yaw: -0.55, pitch: 1.05 });
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  const [t, setT] = useAnimatedTime(mode === 'exp' && playing, 0.6, TWO_PI);
  const drag = useRef<{ x: number; y: number } | null>(null);

  const v = useMemo(() => texts.map(parse), [texts]);
  const K = useMemo(() => skewFromVector(v, n), [v, n]);
  const nf = useMemo(() => skewNormalForm(K), [K]);
  const cloud = useMemo(() => sampleSphere(n, CLOUD_SIZE, 11), [n]);

  const A = useMemo(() => (mode === 'power' ? matPow(K, k) : expSkew(nf, t)), [mode, K, k, nf, t]);
  const semi = mode === 'power' ? powerSemiAxes(nf, k) : new Array<number>(n).fill(1);
  const sMax = semi[0] ?? 0;
  const sf = mode === 'power' && normalize && sMax > 0 ? 1 / sMax : 1;

  const names = schurNames(nf.lambdas.length, n);
  const frameIdx: number[] = n === 2 ? [0, 1] : frame === 'schur' ? [0, 1, 2] : axes;
  const frameNames = frameIdx.map((i) => (frame === 'schur' ? names[i]! : `e${sub1(i + 1)}`));
  const frameVecs = useMemo(
    () =>
      (n === 2 ? [0, 1] : frame === 'schur' ? [0, 1, 2] : axes).map((i) =>
        frame === 'schur' ? nf.Q.map((row) => row[i]!) : identity(n)[i]!,
      ),
    [n, frame, axes, nf],
  );

  const image = useMemo(() => cloud.map((x) => mulVec(A, x).map((y) => y * sf)), [cloud, A, sf]);
  // Images of the three unit circles spanned by pairs of frame vectors.
  const circles = useMemo(() => {
    const pairs: Array<[number, number]> = n === 2 ? [[0, 1]] : [[0, 1], [0, 2], [1, 2]];
    return pairs.map(([a, b]) =>
      Array.from({ length: CIRCLE_SAMPLES + 1 }, (_, s) => {
        const th = (TWO_PI * s) / CIRCLE_SAMPLES;
        const x = frameVecs[a]!.map((u, i) => Math.cos(th) * u + Math.sin(th) * frameVecs[b]![i]!);
        return mulVec(A, x).map((y) => y * sf);
      }),
    );
  }, [A, sf, n, frameVecs]);

  const yaw = n === 2 ? 0 : cam.yaw;
  const pitch = n === 2 ? 0 : cam.pitch;
  const R = 1.18 * Math.max(1, sMax * sf);

  const draw = useCallback(
    ({ ctx, width, height, palette: pal }: DrawContext) => {
      const vp = squareViewport(width, height, R);
      const toFrame = (y: Vec): P3 => [dotv(frameVecs[0]!, y), dotv(frameVecs[1]!, y), frameVecs[2] ? dotv(frameVecs[2], y) : 0];
      const P = (y: Vec) => project(toFrame(y), yaw, pitch);
      drawGhostSphere(ctx, vp, pal, n === 2);

      // Frame axes (length 1 = radius of the original sphere).
      frameVecs.forEach((_, i) => {
        const e: P3 = [i === 0 ? 1 : 0, i === 1 ? 1 : 0, i === 2 ? 1 : 0];
        const tip = project(e, yaw, pitch);
        arrow(ctx, vp, [0, 0], [tip[0], tip[1]], pal.axis, 1.2);
        label(ctx, vp, [tip[0], tip[1]], frameNames[i]!, pal.muted, 3, -3);
      });

      // Point cloud, back to front, alpha by depth.
      const pts = image.map(P).sort((a, b) => a[2] - b[2]);
      const dmax = Math.max(1e-9, ...pts.map((p) => Math.abs(p[2])));
      ctx.save();
      ctx.fillStyle = pal.c1;
      for (const [x, y, d] of pts) {
        ctx.globalAlpha = n === 2 ? 0.6 : 0.3 + 0.45 * ((d / dmax + 1) / 2);
        ctx.beginPath();
        ctx.arc(vp.x(x), vp.y(y), 1.7, 0, TWO_PI);
        ctx.fill();
      }
      ctx.restore();

      const colors = [pal.c2, pal.c3, pal.c4];
      circles.forEach((c, i) => {
        polyline(ctx, vp, c.map((y) => {
          const p = P(y);
          return [p[0], p[1]] as const;
        }), colors[i]!, 2);
      });
    },
    [R, image, circles, yaw, pitch, n, frameVecs, frameNames],
  );

  const onPointer = useCallback(
    (p: CanvasPointer) => {
      if (n === 2) return;
      if (p.type === 'down') drag.current = { x: p.x, y: p.y };
      else if (p.type === 'up') drag.current = null;
      else if (drag.current && p.buttons) {
        const dx = p.x - drag.current.x;
        const dy = p.y - drag.current.y;
        drag.current = { x: p.x, y: p.y };
        setCam((c) => ({ yaw: c.yaw + dx * 0.01, pitch: Math.max(-1.55, Math.min(1.55, c.pitch - dy * 0.01)) }));
      }
    },
    [n],
  );

  const changeN = (m: number) => {
    setN(m);
    setTexts(toText(DEFAULTS[m]!));
    setAxes([0, 1, Math.min(2, m - 1)]);
  };
  const preset = (make: () => number[]) => setTexts(toText(make()));
  const m = skewDim(n);
  const pairIndex = (i: number, j: number) => skewPairs(n).findIndex(([a, b]) => a === i && b === j);

  // ---- checks shown in the readout ----
  const skewErr = maxAbsDiff(transpose(K), scale(K, -1));
  const tangentErr = cloud.slice(0, 200).reduce((s, x) => Math.max(s, Math.abs(dotv(x, mulVec(K, x)))), 0);
  const parityErr = maxAbsDiff(transpose(A), scale(A, (-1) ** k));
  const r2 = n === 3 ? v.reduce((s, x) => s + x * x, 0) : 0;
  const chErr = n === 3 ? maxAbsDiff(matPow(K, 3), scale(K, -r2)) : 0;
  const orthErr = maxAbsDiff(mul(transpose(A), A), identity(n));
  const expErr = mode === 'exp' ? maxAbsDiff(A, expm(K, t)) : 0;
  const lam = nf.lambdas;
  const flat = lam.length > 1 && lam[0]! > 0 ? (lam[lam.length - 1]! / lam[0]!) ** k : 1;
  const eigTex = [...lam.map((l) => `\\pm ${fmt(l)}\\,i`), ...(nf.nullity ? [`0${nf.nullity > 1 ? `\\ (\\times${nf.nullity})` : ''}`] : [])].join(',\\ ');

  return (
    <div>
      <div className="panel controls" style={{ marginBottom: 16 }}>
        <div className="row">
          <span style={{ fontSize: 14 }}>Boyut n:</span>
          {DIMS.map((d) => (
            <button key={d} className="btn" aria-pressed={n === d} onClick={() => changeN(d)}>
              {d}
            </button>
          ))}
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>
            → {m} bileşenli vektör {n === 3 ? '(3B’de vektör = eksen)' : `(her koordinat düzlemi için bir sayı)`}
          </span>
        </div>
        <div className="vec-inputs">
          {texts.map((s, i) => (
            <label key={`${n}-${i}`} className="vec-input">
              <span>{componentLabel(n, i)}</span>
              <input
                type="text"
                inputMode="decimal"
                value={s}
                onChange={(e) => setTexts((old) => old.map((x, j) => (j === i ? e.target.value : x)))}
              />
            </label>
          ))}
        </div>
        <div className="row">
          <button className="btn" onClick={() => preset(() => DEFAULTS[n]!)}>
            Varsayılan
          </button>
          <button
            className="btn"
            onClick={() => preset(() => Array.from({ length: m }, () => Math.round((Math.random() * 3 - 1.5) * 10) / 10))}
          >
            Rastgele
          </button>
          <button className="btn" onClick={() => preset(() => Array.from({ length: m }, (_, i) => (i === (n === 3 ? 2 : 0) ? 1 : 0)))}>
            Tek düzlem
          </button>
          {n % 2 === 0 && n > 2 && (
            <button
              className="btn"
              onClick={() =>
                preset(() => {
                  const out = new Array<number>(m).fill(0);
                  for (let i = 0; i + 1 < n; i += 2) out[pairIndex(i, i + 1)] = 1;
                  return out;
                })
              }
            >
              Eşit hızlar (J ⊕ J …)
            </button>
          )}
        </div>
        <div className="readout">
          {n === 3 && (
            <Tex
              block
              tex={`\\omega=\\begin{bmatrix}${v.map((x) => fmt(x, 2)).join('\\\\')}\\end{bmatrix}\\;\\longmapsto\\;[\\omega]_\\times=\\begin{bmatrix}0&-\\omega_3&\\omega_2\\\\ \\omega_3&0&-\\omega_1\\\\ -\\omega_2&\\omega_1&0\\end{bmatrix}=${texMatrix(K, 2)}`}
            />
          )}
          {n !== 3 && (
            <Tex block tex={`K=\\sum_{i<j} v_{ij}\\,(e_je_i^{\\mathsf T}-e_ie_j^{\\mathsf T})=${texMatrix(K, 2)}`} />
          )}
          <div>
            Özdeğerler: <Tex tex={eigTex} />
          </div>
          <div className="ok">
            <Tex tex={`\\max|K^{\\mathsf T}+K|=${fmtErr(skewErr)}`} /> ·{' '}
            <Tex tex={`\\max_{|x|=1}|x\\cdot Kx|=${fmtErr(tangentErr)}`} /> (<Tex tex="Kx\perp x" />)
          </div>
        </div>
      </div>

      <Tabs<Mode>
        value={mode}
        onChange={setMode}
        items={[
          { id: 'power', label: 'Kuvvetler Kᵏ' },
          { id: 'exp', label: 'Üstel eᵗᴷ (dönme)' },
        ]}
      />

      <div className="viz-grid">
        <div className="panel">
          <Canvas
            draw={draw}
            aspect={1}
            maxHeight={560}
            onPointer={n === 2 ? undefined : onPointer}
            ariaLabel="Birim kürenin seçilen matris altındaki görüntüsü; döndürmek için sürükle"
          />
          <div className="legend" style={{ marginTop: 8 }}>
            <span>
              <i style={{ background: 'var(--c1)' }} />
              {mode === 'power' ? <Tex tex={`K^{${k}}x`} /> : <Tex tex="e^{tK}x" />}, <Tex tex="|x|=1" /> (rastgele noktalar)
            </span>
            {(n === 2 ? [[0, 1]] : [[0, 1], [0, 2], [1, 2]]).map(([a, b], i) => (
              <span key={i}>
                <i style={{ background: `var(--c${i + 2})` }} />({frameNames[a!]}, {frameNames[b!]}) çemberinin görüntüsü
              </span>
            ))}
          </div>
          <p className="canvas-caption">
            {n === 2 ? (
              'Düzlemde K = λJ: birim çember çember kalır, yarıçapı λᵏ olur ve her kuvvette 90° döner.'
            ) : (
              <>
                Sürükleyerek döndür. Gri çember orijinal birim kürenin sınırı.{' '}
                {n > 3 && (
                  <>
                    {n} boyutlu görüntü 3 boyuta izdüşürülüyor; izdüşüm yüzeyi değil içini de doldurur, bu yüzden
                    noktalar bir “top” gibi görünür.
                  </>
                )}
              </>
            )}
          </p>
        </div>
        <div className="controls panel">
          {mode === 'power' ? (
            <>
              <Slider label={<Tex tex="k" />} value={k} min={0} max={8} step={1} onChange={setK} format={(x) => String(x)} />
              <label className="row" style={{ fontSize: 14 }}>
                <input type="checkbox" checked={normalize} onChange={(e) => setNormalize(e.target.checked)} />
                En büyük yarı ekseni 1’e ölçekle (<Tex tex="K^k/\lambda_1^k" />)
              </label>
            </>
          ) : (
            <div className="row">
              <button className="btn" aria-pressed={playing} onClick={() => setPlaying((p) => !p)}>
                {playing ? '❚❚ Durdur' : '▶ Oynat'}
              </button>
              <div style={{ flex: '1 1 200px' }}>
                <Slider
                  label={<Tex tex="t" />}
                  value={t}
                  min={0}
                  max={TWO_PI}
                  step={0.005}
                  onChange={(x) => {
                    setPlaying(false);
                    setT(x);
                  }}
                />
              </div>
            </div>
          )}
          {n > 2 && (
            <div className="row">
              <span style={{ fontSize: 14 }}>Bakış çerçevesi:</span>
              <button className="btn" aria-pressed={frame === 'schur'} onClick={() => setFrame('schur')}>
                Değişmez düzlemler
              </button>
              <button className="btn" aria-pressed={frame === 'coords'} onClick={() => setFrame('coords')}>
                Koordinat eksenleri
              </button>
              {frame === 'coords' &&
                [0, 1, 2].map((slot) => (
                  <select
                    key={slot}
                    value={axes[slot]}
                    aria-label={`${slot + 1}. eksen`}
                    onChange={(e) =>
                      setAxes((a) => a.map((x, i) => (i === slot ? Number(e.target.value) : x)) as [number, number, number])
                    }
                  >
                    {Array.from({ length: n }, (_, i) => (
                      <option key={i} value={i}>
                        e{sub1(i + 1)}
                      </option>
                    ))}
                  </select>
                ))}
            </div>
          )}
          <div className="readout">
            {mode === 'power' ? (
              <>
                <Tex block tex={`K^{${k}}=${texMatrix(A, 2)}`} />
                <div>
                  Yarı eksenler (<Tex tex={`K^{${k}}`} />’nin tekil değerleri):{' '}
                  <Tex tex={semi.map((s) => fmt(s, 3)).join(',\\ ')} />
                </div>
                {lam.length > 1 && (
                  <div>
                    Basıklık <Tex tex={`(\\lambda_{${lam.length}}/\\lambda_1)^{${k}}=${fmt(flat, 4)}`} />
                    {flat < 0.05 && <span className="ok"> · küre baskın düzleme ezilmiş</span>}
                  </div>
                )}
                <div className={parityErr < 1e-9 * Math.max(1, sMax) ? 'ok' : 'bad'}>
                  {k % 2 === 0 ? 'Çift kuvvet: simetrik' : 'Tek kuvvet: ters simetrik'},{' '}
                  <Tex tex={`\\max|(K^{${k}})^{\\mathsf T}-(-1)^{${k}}K^{${k}}|=${fmtErr(parityErr)}`} />
                </div>
                {n === 3 && (
                  <div className="ok">
                    <Tex tex={`\\max|K^3+|\\omega|^2K|=${fmtErr(chErr)},\\ |\\omega|=${fmt(Math.sqrt(r2))}`} />
                  </div>
                )}
              </>
            ) : (
              <>
                <Tex block tex={`e^{tK}=${texMatrix(A, 2)}`} />
                <div>
                  Düzlem açıları <Tex tex={lam.map((l, j) => `\\lambda_{${j + 1}}t=${fmt((l * t) % TWO_PI, 2)}`).join(',\\ ') || '-'} />
                </div>
                <div className="ok">
                  <Tex tex={`\\max|(e^{tK})^{\\mathsf T}e^{tK}-I|=${fmtErr(orthErr)}`} /> · normal form ile{' '}
                  <Tex tex="\exp" /> farkı <Tex tex={fmtErr(expErr)} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <h3 style={{ fontSize: '1rem', margin: '20px 0 8px' }}>Değişmez düzlemler tek tek</h3>
      <div className="viz-grid-3">
        {lam.map((l, j) => (
          <PlanePanel key={j} j={j} lambda={l} mode={mode} k={k} t={t} sf={sf} />
        ))}
        {nf.nullity > 0 && (
          <div className="panel prose" style={{ fontSize: 14 }}>
            <b>Çekirdek</b> (<Tex tex={`\\dim\\ker K=${nf.nullity}`} />
            {n % 2 === 1 && ', n tek olduğu için en az 1'}): bu yönlerde <Tex tex="Kx=0" />.{' '}
            {mode === 'power'
              ? 'k ≥ 1 için her kuvvet bu yönü sıfıra ezer; görüntü bir boyut kaybeder.'
              : 'eᵗᴷ bu yönleri hiç kıpırdatmaz: dönme ekseni.'}
            {n === 3 && (
              <>
                {' '}
                3B’de çekirdek <Tex tex="\omega" /> doğrusudur.
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function drawGhostSphere(ctx: CanvasRenderingContext2D, vp: Viewport, pal: Palette, flat: boolean) {
  ctx.save();
  ctx.strokeStyle = pal.axis;
  ctx.setLineDash(flat ? [] : [4, 4]);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(vp.x(0), vp.y(0), vp.x(1) - vp.x(0), 0, TWO_PI);
  ctx.stroke();
  ctx.restore();
}

interface PlaneProps {
  j: number;
  lambda: number;
  mode: Mode;
  k: number;
  t: number;
  sf: number;
}

/** One invariant plane span(q_j, p_j): K acts there as λJ, so K^k = λ^k J^k and e^{tK} = rotation by λt. */
function PlanePanel({ j, lambda, mode, k, t, sf }: PlaneProps) {
  const r = mode === 'power' ? lambda ** k * sf : 1;
  const ang = mode === 'power' ? (k * Math.PI) / 2 : lambda * t;
  const Rv = 1.25 * Math.max(1, r);
  const draw = useCallback(
    ({ ctx, width, height, palette: pal }: DrawContext) => {
      const vp = squareViewport(width, height, Rv);
      drawGhostSphere(ctx, vp, pal, true);
      const circ = Array.from({ length: 121 }, (_, s) => {
        const th = (TWO_PI * s) / 120;
        return [r * Math.cos(th), r * Math.sin(th)] as const;
      });
      polyline(ctx, vp, circ, pal.c1, 2);
      arrow(ctx, vp, [0, 0], [1, 0], pal.axis, 1.2);
      label(ctx, vp, [1, 0], `q${sub1(j + 1)}`, pal.muted, 4, 16);
      const tip = [r * Math.cos(ang), r * Math.sin(ang)] as const;
      const tip2 = [-r * Math.sin(ang), r * Math.cos(ang)] as const;
      arrow(ctx, vp, [0, 0], tip, pal.c2, 2.4);
      arrow(ctx, vp, [0, 0], tip2, pal.c3, 1.8);
      const op = mode === 'power' ? 'Kᵏ' : 'eᵗᴷ';
      // Skip the labels once the image circle is too small for them to stay apart.
      if (r > 0.2 * Rv) {
        label(ctx, vp, tip, `${op}q${sub1(j + 1)}`, pal.c2);
        label(ctx, vp, tip2, `${op}p${sub1(j + 1)}`, pal.c3);
      }
    },
    [Rv, r, ang, j, mode],
  );
  return (
    <div className="panel">
      <Canvas draw={draw} aspect={1} maxHeight={300} ariaLabel={`${j + 1}. değişmez düzlemde birim çemberin görüntüsü`} />
      <p className="canvas-caption">
        Düzlem {j + 1}: <Tex tex={`\\lambda_{${j + 1}}=${fmt(lambda)}`} />.{' '}
        {mode === 'power' ? (
          <>
            <Tex tex={`K^{${k}}`} /> burada yarıçapı <Tex tex={`\\lambda^{${k}}=${fmt(lambda ** k)}`} /> yapar ve{' '}
            <Tex tex={`${k}\\cdot 90^\\circ`} /> döndürür.
          </>
        ) : (
          <>
            Açı <Tex tex={`\\lambda t=${fmt(((lambda * t) % TWO_PI) * (180 / Math.PI), 0)}^\\circ`} />, yarıçap 1.
          </>
        )}
      </p>
    </div>
  );
}
