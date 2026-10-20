import { useCallback, useRef, useState } from 'react';
import {
  cross3,
  expm,
  identity,
  maxAbsDiff,
  mul,
  mulVec,
  norm3,
  rodrigues,
  scale,
  skew3,
  skewPower,
  transpose,
  type Vec,
} from '../../core/math';
import {
  Canvas,
  Slider,
  Tex,
  arrow,
  camera,
  depth,
  dot,
  fmt,
  fmtErr,
  label,
  makeViewport,
  polyline,
  prefersReducedMotion,
  project,
  texMatrix,
  useAnimatedTime,
  type CanvasPointer,
  type DrawContext,
} from '../../core/ui';

const TWO_PI = 2 * Math.PI;

const W_PRESETS: Array<{ label: string; w: Vec }> = [
  { label: 'z ekseni (0,0,1)', w: [0, 0, 1] },
  { label: 'x ekseni (1,0,0)', w: [1, 0, 0] },
  { label: '(1,1,1)', w: [1, 1, 1] },
  { label: '(0.5,−1,2)', w: [0.5, -1, 2] },
];

function VecInput({ name, value, onChange }: { name: string; value: Vec; onChange: (v: Vec) => void }) {
  return (
    <div className="row" style={{ gap: 6 }}>
      <Tex tex={`${name}=`} />
      {['x', 'y', 'z'].map((c, i) => (
        <label key={c} style={{ display: 'grid', fontSize: 12, color: 'var(--muted)' }}>
          {`${name === '\\omega' ? 'ω' : name}_${c}`}
          <input
            type="number"
            step={0.1}
            value={Number.isFinite(value[i]) ? value[i] : 0}
            onChange={(e) => {
              const x = e.target.value === '' ? 0 : Number(e.target.value);
              if (Number.isFinite(x)) onChange(value.map((old, j) => (j === i ? x : old)));
            }}
            style={{
              width: 72,
              font: 'inherit',
              fontSize: 15,
              padding: '4px 6px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg-elev)',
              color: 'var(--fg)',
            }}
          />
        </label>
      ))}
    </div>
  );
}

export default function Viz() {
  const [w, setW] = useState<Vec>([0.5, -1, 2]);
  const [v, setV] = useState<Vec>([1.5, 0, 0.5]);
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  // Phase in [0, 2pi): the rotation angle theta = t|w|.
  const [theta, setTheta] = useAnimatedTime(playing, 0.8, TWO_PI);
  const [power, setPower] = useState(1);
  const [showVel, setShowVel] = useState(true);
  const [showCent, setShowCent] = useState(true);
  const [view, setView] = useState({ az: 0.7, el: 0.45 });
  const drag = useRef<{ x: number; y: number; az: number; el: number } | null>(null);

  const n = norm3(w);
  const t = n > 0 ? theta / n : 0;
  const K = skew3(w);
  const R = rodrigues(w, t);
  const Rv = mulVec(R, v);
  const errExp = maxAbsDiff(R, expm(K, t));
  const errOrth = maxAbsDiff(mul(transpose(R), R), identity(3));
  const K3err = maxAbsDiff(skewPower(w, 3), scale(K, -n * n));
  const vel = cross3(w, Rv);
  const cent = cross3(w, vel);

  const draw = useCallback(
    ({ ctx, width, height, palette: pal }: DrawContext) => {
      const cam = camera(view.az, view.el);
      const Rmax = Math.max(1.5, norm3(v), n) * 1.25;
      const vp = makeViewport(width, height, { x: [-Rmax, Rmax], y: [-Rmax, Rmax] }, { l: 8, r: 8, t: 8, b: 8 }, true);
      const P = (p: Vec) => project(cam, p);

      // Floor grid in the xy-plane.
      const g = Math.ceil(Rmax);
      for (let k = -g; k <= g; k++) {
        polyline(ctx, vp, [P([k, -g, 0]), P([k, g, 0])], pal.grid, 1);
        polyline(ctx, vp, [P([-g, k, 0]), P([g, k, 0])], pal.grid, 1);
      }
      const axes: Array<[Vec, string]> = [
        [[1, 0, 0], 'x'],
        [[0, 1, 0], 'y'],
        [[0, 0, 1], 'z'],
      ];
      for (const [e, name] of axes) {
        const tip = e.map((c) => c * Rmax * 0.85);
        arrow(ctx, vp, [0, 0], P(tip), pal.axis, 1.2);
        label(ctx, vp, P(tip), name, pal.muted, 4, -2);
      }

      // Axis of rotation: the whole line through w (dashed) plus the w arrow.
      if (n > 0) {
        const u = w.map((c) => (c / n) * Rmax);
        polyline(ctx, vp, [P(u.map((c) => -c)), P(u)], pal.c2, 1, [4, 4]);
        arrow(ctx, vp, [0, 0], P(w), pal.c2, 2.5);
        label(ctx, vp, P(w), 'ω', pal.c2);
      }

      // Orbit of v: a circle around the axis, front half solid, back half faint.
      const orbit: Vec[] = [];
      for (let k = 0; k <= 180; k++) orbit.push(mulVec(rodrigues(w, n > 0 ? (TWO_PI * k) / 180 / n : 0), v));
      const center = n > 0 ? w.map((c) => (c * (w[0]! * v[0]! + w[1]! * v[1]! + w[2]! * v[2]!)) / (n * n)) : [0, 0, 0];
      const front = orbit.map((p) => (depth(cam, p) >= depth(cam, center) ? P(p) : ([NaN, NaN] as [number, number])));
      const back = orbit.map((p) => (depth(cam, p) < depth(cam, center) ? P(p) : ([NaN, NaN] as [number, number])));
      polyline(ctx, vp, back, pal.c1, 1.2, [3, 4]);
      polyline(ctx, vp, front, pal.c1, 2);
      polyline(ctx, vp, [P(center), P(Rv)], pal.muted, 1, [2, 3]);
      dot(ctx, vp, P(center), pal.muted, 3);

      arrow(ctx, vp, [0, 0], P(v), pal.axis, 1.5);
      label(ctx, vp, P(v), 'v', pal.muted);
      arrow(ctx, vp, [0, 0], P(Rv), pal.c1, 2.8);
      label(ctx, vp, P(Rv), 'Rv', pal.c1);

      // Velocity w x Rv (tangent) and w x (w x Rv) (toward the axis), drawn from the tip.
      const s = 1 / Math.max(1, n);
      if (showVel) {
        const tip = Rv.map((c, i) => c + vel[i]! * s);
        arrow(ctx, vp, P(Rv), P(tip), pal.c3, 2);
        label(ctx, vp, P(tip), 'ω×v', pal.c3);
      }
      if (showCent) {
        const tip = Rv.map((c, i) => c + cent[i]! * s * s);
        arrow(ctx, vp, P(Rv), P(tip), pal.c4, 2);
        label(ctx, vp, P(tip), 'ω×(ω×v)', pal.c4, 6, 14);
      }
    },
    [view, w, v, n, Rv, vel, cent, showVel, showCent],
  );

  const onPointer = useCallback(
    (p: CanvasPointer) => {
      if (p.type === 'down') drag.current = { x: p.x, y: p.y, az: view.az, el: view.el };
      else if (p.type === 'up') drag.current = null;
      else if (drag.current && p.buttons) {
        const d = drag.current;
        setView({
          az: d.az - (p.x - d.x) * 0.01,
          el: Math.max(-1.45, Math.min(1.45, d.el + (p.y - d.y) * 0.01)),
        });
      }
    },
    [view],
  );

  const powerTex = (k: number) => {
    if (k === 0) return 'I';
    const half = Math.floor((k - 1) / 2);
    const coef = (-1) ** half * n ** (2 * half);
    const base = k % 2 === 1 ? '[\\omega]_\\times' : '[\\omega]_\\times^2';
    return half === 0 ? base : `${fmt(coef, 3)}\\,${base}`;
  };

  return (
    <div className="controls">
      <div className="panel controls">
        <div className="row" style={{ gap: 18, alignItems: 'end' }}>
          <VecInput name="\omega" value={w} onChange={setW} />
          <VecInput name="v" value={v} onChange={setV} />
        </div>
        <div className="row">
          {W_PRESETS.map((p) => (
            <button key={p.label} className="btn" onClick={() => setW(p.w)}>
              ω = {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="viz-grid">
        <div className="panel">
          <Canvas draw={draw} aspect={0.85} maxHeight={620} onPointer={onPointer} ariaLabel="3B görünüm: ω ekseni etrafında dönen vektör; sürükleyerek kamerayı döndür" />
          <div className="legend" style={{ marginTop: 8 }}>
            <span>
              <i style={{ background: 'var(--c2)' }} />ω (eksen)
            </span>
            <span>
              <i style={{ background: 'var(--c1)' }} />
              <Tex tex="Rv=e^{t[\omega]_\times}v" /> ve yörüngesi
            </span>
            {showVel && (
              <span>
                <i style={{ background: 'var(--c3)' }} />
                <Tex tex="[\omega]_\times v=\omega\times v" /> (hız)
              </span>
            )}
            {showCent && (
              <span>
                <i style={{ background: 'var(--c4)' }} />
                <Tex tex="[\omega]_\times^2 v" /> (eksene doğru)
              </span>
            )}
          </div>
          <p className="canvas-caption">Sürükle: kamerayı döndür. Yörünge, ω’ya dik düzlemde bir çemberdir.</p>
        </div>
        <div className="panel controls">
          <div className="row">
            <button className="btn" aria-pressed={playing} onClick={() => setPlaying((x) => !x)}>
              {playing ? '❚❚ Durdur' : '▶ Oynat'}
            </button>
          </div>
          <Slider
            label={
              <>
                açı <Tex tex="\theta=t\,|\omega|" />
              </>
            }
            value={theta}
            min={0}
            max={TWO_PI}
            step={0.005}
            onChange={(x) => {
              setPlaying(false);
              setTheta(x);
            }}
            format={(x) => `${Math.round((x * 180) / Math.PI)}°`}
          />
          <label className="row" style={{ fontSize: 14 }}>
            <input type="checkbox" checked={showVel} onChange={(e) => setShowVel(e.target.checked)} />
            <Tex tex="\omega\times v" /> göster
          </label>
          <label className="row" style={{ fontSize: 14 }}>
            <input type="checkbox" checked={showCent} onChange={(e) => setShowCent(e.target.checked)} />
            <Tex tex="\omega\times(\omega\times v)" /> göster
          </label>
          <div className="readout">
            <Tex block tex={`[\\omega]_\\times=${texMatrix(K)},\\quad |\\omega|=${fmt(n)}`} />
            <Slider label={<>kuvvet <Tex tex="k" /></>} value={power} min={0} max={6} step={1} onChange={setPower} format={(x) => String(x)} />
            <Tex block tex={`[\\omega]_\\times^{${power}}=${texMatrix(skewPower(w, power))}`} />
            <Tex block tex={`[\\omega]_\\times^{${power}}=${powerTex(power)}`} />
            <div className={K3err < 1e-9 * Math.max(1, n ** 3) ? 'ok' : 'bad'}>
              <Tex tex={`\\max\\big|[\\omega]_\\times^3+|\\omega|^2[\\omega]_\\times\\big|=${fmtErr(K3err)}`} />
            </div>
            <Tex
              block
              tex={`R=e^{t[\\omega]_\\times}=I+${fmt(Math.sin(theta))}\\,\\hat K+${fmt(1 - Math.cos(theta))}\\,\\hat K^2`}
            />
            <Tex
              block
              tex={`R=${texMatrix(R)}`}
            />
            <div style={{ fontSize: 13 }}>
              <Tex tex="\hat K=[\omega/|\omega|]_\times" /> · <Tex tex={`t=${fmt(t)}`} />
            </div>
            <div>
              Rodrigues − sayısal exp: <span className="ok"><Tex tex={fmtErr(errExp)} /></span> ·{' '}
              <Tex tex="\max|R^{\mathsf T}R-I|" />: <span className="ok"><Tex tex={fmtErr(errOrth)} /></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
