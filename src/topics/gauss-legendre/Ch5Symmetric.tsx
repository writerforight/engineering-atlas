import { useCallback, useMemo, useState } from 'react';
import { gaussLegendre, monicValues, recurrenceT, scalingD } from '../../core/math';
import {
  Canvas, KeyIdentity, MatrixView, Slider, Takeaway, Tex, dot, fmt, label, makeViewport, polyline,
  type DrawContext, type MatrixCell,
} from '../../core/ui';
import { Choice, MERKE, pow10 } from './shared';

export function Ch5Symmetric() {
  const [N, setN] = useState(4);
  const [which, setWhich] = useState<'T' | 'J'>('T');
  const t = which === 'J' ? 1 : 0;
  const T = useMemo(() => recurrenceT(N), [N]);
  const d = useMemo(() => scalingD(N), [N]);
  const lam = useMemo(() => gaussLegendre(N).x, [N]);
  const dt = d.map((v) => v ** t);
  /** Shown matrix: T, or J = D T D⁻¹. */
  const M = T.map((r, i) => r.map((v, j) => (dt[i]! * v) / dt[j]!));
  const asym = Math.max(...M.flatMap((r, i) => r.map((v, j) => Math.abs(v - M[j]![i]!))));
  const residual = Math.max(
    ...lam.map((l) => {
      const p = monicValues(N - 1, l).map((v, k) => dt[k]! * v);
      return Math.max(...M.map((r, i) => Math.abs(r.reduce((s, v, j) => s + v * p[j]!, 0) - l * p[i]!))) / Math.max(...p.map(Math.abs));
    }),
  );

  const cells: MatrixCell[][] = M.map((r, i) =>
    r.map((v, j) => ({ v: Math.abs(v) < 1e-14 ? '0' : fmt(v, 4), role: j === i ? 'diag' : j === i + 1 ? 'up' : j === i - 1 ? 'low' : 'zero' })),
  );

  const draw = useCallback(({ ctx, width, height, palette: pal }: DrawContext) => {
    const vp = makeViewport(width, height, { x: [-1.08, 1.08], y: [-1, 1] }, { l: 12, r: 12, t: 8, b: 8 });
    polyline(ctx, vp, [[-1, 0], [1, 0]], pal.axis, 2);
    for (const e of [-1, 0, 1]) {
      polyline(ctx, vp, [[e, -0.15], [e, 0.15]], pal.axis, 1.5);
      label(ctx, vp, [e, -0.2], String(e), pal.muted, -4, 18);
    }
    lam.forEach((l, i) => {
      dot(ctx, vp, [l, 0], pal.c1, 8);
      label(ctx, vp, [l, 0], `λ${i + 1}`, pal.c1, -8, -12);
    });
  }, [lam]);

  return (
    <>
      <KeyIdentity label="Ähnlichkeitstransformation">
        <Tex block tex="J=D\,T\,D^{-1},\qquad D=\operatorname{diag}\!\big(1/\|p_k\|\big)" />
        <Tex block tex="J_{k,k+1}=J_{k+1,k}=\sqrt{b_k}=\beta_k=\big(4-k^{-2}\big)^{-1/2}" />
        <Tex block tex="T=V\Lambda V^{-1}\;\Longrightarrow\;J=(DV)\,\Lambda\,(DV)^{-1}" />
      </KeyIdentity>
      <div className="viz-grid">
        <div className="panel">
          <MatrixView cells={cells} label={which === 'T' ? <>T (vorher)</> : <>J = D T D<sup>−1</sup> (nachher)</>} />
          <Choice
            value={which}
            onChange={setWhich}
            items={[{ id: 'T', label: <>vorher: T</> }, { id: 'J', label: <>nachher: J = D T D<sup>−1</sup></> }]}
          />
          <Slider label="N" value={N} min={2} max={6} step={1} onChange={setN} format={(s) => String(s)} />
          <Canvas draw={draw} aspect={0.16} maxHeight={90} ariaLabel="Eigenwerte auf der Zahlengerade" />
          <p className="canvas-caption">Eigenwerte: für T und J dieselben.</p>
        </div>
        <div className="panel readout">
          <span>
            Asymmetrie max |{which} − {which}ᵀ| = <b className={asym < 1e-12 ? 'ok' : 'bad'}>{asym < 1e-12 ? '0 (symmetrisch)' : fmt(asym, 4)}</b>
          </span>
          <span>
            Eigenwert-Probe max ‖{which}·v − λ·v‖, v = {which === 'T' ? 'p(λ)' : 'D·p(λ)'} = <b className="ok">{pow10(residual)}</b>
          </span>
          <span>Eigenwerte: {lam.map((l) => l.toFixed(4)).join(', ')}</span>
          <span style={{ color: 'var(--muted)' }}>Eigenvektor: p(λ) bei T, D·p(λ) bei J — λ bleibt gleich.</span>
        </div>
      </div>
      <Takeaway label={MERKE}>
        Eigenwerte bleiben, Eigenvektoren werden zu <Tex tex="D\,\mathbf p(\lambda)" />. <Tex tex="J" /> ist symmetrisch: reelle Eigenwerte,
        stabil mit <code>eigh</code>.
      </Takeaway>
    </>
  );
}
