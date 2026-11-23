import { useCallback, useMemo, useState } from 'react';
import { gaussLegendre, legendreB, monicValues, texNum } from '../../core/math';
import {
  Canvas, KeyIdentity, MatrixView, Slider, Takeaway, Tex, dot, drawGridAxes, fmt, makeViewport, plotFn, polyline,
  type CanvasPointer, type DrawContext, type MatrixCell,
} from '../../core/ui';
import { MERKE, clip, pow10 } from './shared';

export function Ch4Matrix() {
  const [N, setN] = useState(3);
  const [x, setX] = useState(0.5);
  const roots = useMemo(() => gaussLegendre(N).x, [N]);
  const v = monicValues(N, x);
  const pN = v[N]!;
  const onRoot = Math.abs(pN) < 1e-9;
  const yLim = useMemo(() => Math.max(0.3, ...Array.from({ length: 101 }, (_, i) => Math.abs(monicValues(N, -1 + i / 50)[N]!))) * 1.15, [N]);

  const view = useCallback((w: number, h: number) => makeViewport(w, h, { x: [-1.05, 1.05], y: [-yLim, yLim] }, { l: 44, r: 10, t: 12, b: 24 }), [yLim]);
  const draw = useCallback(({ ctx, width, height, palette: pal }: DrawContext) => {
    const vp = view(width, height);
    drawGridAxes(ctx, vp, pal, { ticks: 8, xLabel: 'x', yLabel: `p${N}(x)` });
    clip(ctx, vp, () => {
      plotFn(ctx, vp, (t) => monicValues(N, t)[N]!, pal.c4, 2.5);
      roots.forEach((r) => dot(ctx, vp, [r, 0], pal.c3, 6));
      polyline(ctx, vp, [[x, 0], [x, pN]], pal.c2, 2, [4, 3]);
      dot(ctx, vp, [x, pN], pal.c2, 7);
    });
  }, [N, roots, x, pN, view]);
  const onPointer = useCallback((p: CanvasPointer) => {
    if (p.type === 'up' || !p.buttons) return;
    const t = view(p.width, p.height).x.invert(p.x);
    const near = roots.find((r) => Math.abs(r - t) < 0.03);
    setX(Math.max(-1, Math.min(1, near ?? t)));
  }, [roots, view]);

  /** [T | e_N] with roles; the last column is the extra p_N column. */
  const cells: MatrixCell[][] = Array.from({ length: N }, (_, k) =>
    Array.from({ length: N + 1 }, (_, j): MatrixCell => {
      if (j === N) return { v: k === N - 1 ? '1' : '0', role: k === N - 1 ? 'extra' : 'zero' };
      if (j === k + 1) return { v: '1', role: 'up' };
      if (j === k - 1) return { v: <Tex tex={texNum(legendreB(k))} />, role: 'low' };
      if (j === k) return { v: '0', role: 'diag' };
      return { v: '0', role: 'zero' };
    }),
  );
  const pCells: MatrixCell[][] = [
    ...v.slice(0, N).map((t, k): MatrixCell[] => [{ v: <>p<sub>{k}</sub>: {fmt(t, 3)}</> }]),
    [{ v: <>p<sub>{N}</sub>: {fmt(pN, 3)}</>, role: 'extra' }],
  ];
  const rowNote = (k: number) => (
    <Tex tex={`x\\,p_{${k}} = ${k >= 1 ? `${texNum(legendreB(k))}\\,p_{${k - 1}} + ` : ''}p_{${k + 1}}${k + 1 === N ? '\\quad\\leftarrow\\ p_N\\text{ fehlt im Vektor}' : ''}`} />
  );

  return (
    <>
      <KeyIdentity label="Rekursion für n = 0 … N−1 untereinander">
        <Tex block tex={`x\\,\\mathbf p(x) = T\\,\\mathbf p(x) + p_{${N}}(x)\\,e_{${N}},\\qquad \\mathbf p=(p_0,\\dots,p_{${N - 1}})^\\top`} />
      </KeyIdentity>
      <div className="panel">
        <div className="row" style={{ alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 20 }}>x ·</span>
          <MatrixView cells={v.slice(0, N).map((t): MatrixCell[] => [{ v: fmt(t, 3) }])} label="p(x)" />
          <span style={{ fontSize: 20 }}>=</span>
          <MatrixView
            cells={cells}
            extraFrom={N}
            extraGone={onRoot}
            rowNote={rowNote}
            label={<>[ T | e<sub>N</sub> ] — Zeile antippen</>}
          />
          <MatrixView cells={pCells} label="(p, p_N)" />
        </div>
      </div>
      <div className="viz-grid">
        <div className="panel">
          <Canvas draw={draw} aspect={0.5} maxHeight={300} onPointer={onPointer} ariaLabel="p_N und gewähltes x" />
          <p className="canvas-caption">Im Graphen ziehen; nahe einer Nullstelle (grün) rastet x ein.</p>
          <Slider label="N (Matrixgröße)" value={N} min={2} max={7} step={1} onChange={(t) => { setN(t); setX(0.5); }} format={(t) => String(t)} />
          <Slider label="x" value={x} min={-1} max={1} step={0.001} onChange={setX} format={(t) => t.toFixed(3)} />
          <div className="row">
            {roots.map((r, i) => (
              <button key={i} className="btn" aria-pressed={Math.abs(r - x) < 1e-12} onClick={() => setX(r)}>
                x<sub>{i + 1}</sub> = {r.toFixed(4)}
              </button>
            ))}
          </div>
        </div>
        <div className="panel readout">
          <b>Letzte Zeile</b>
          <Tex block tex={`x\\,p_{${N - 1}} - (T\\mathbf p)_{${N - 1}} = p_{${N}}(x)`} />
          <span style={{ fontSize: 22 }}>
            p<sub>{N}</sub>(x) = <b className={onRoot ? 'ok' : 'bad'}>{onRoot ? '0' : pow10(pN, 3)}</b>
          </span>
        </div>
      </div>
      <KeyIdentity label={onRoot ? 'Trick: x ist Nullstelle — die Extraspalte verschwindet' : 'Trick: x auf eine Nullstelle von p_N setzen'}>
        <Tex block tex={`p_{${N}}(x_i)=0\\quad\\Longrightarrow\\quad T\\,\\mathbf p(x_i)=x_i\\,\\mathbf p(x_i)`} />
      </KeyIdentity>
      <Takeaway label={MERKE}>
        Nullstellen von <Tex tex={`p_{${N}}`} /> = Eigenwerte der <Tex tex={`${N}\\times${N}`} />-Matrix <Tex tex="T" />.
      </Takeaway>
    </>
  );
}
