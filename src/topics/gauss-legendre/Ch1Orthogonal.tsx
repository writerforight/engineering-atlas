import { useCallback, useMemo, useState } from 'react';
import { gramSchmidt, inner, type Poly } from '../../core/math';
import {
  Canvas, KeyIdentity, Slider, Takeaway, Tex, arrow, drawGridAxes, label, makeViewport, polyline,
  type CanvasPointer, type DrawContext,
} from '../../core/ui';
import { Choice, MERKE } from './shared';

type Basis = 'mono' | 'leg';
const DOM = { x: [-0.6, 2.8] as [number, number], y: [-0.6, 2.6] as [number, number] };

export function Ch1Orthogonal() {
  const [ang, setAng] = useState(0.35);
  const [v, setV] = useState<[number, number]>([1.6, 1.9]);
  const [n, setN] = useState(5);
  const [basis, setBasis] = useState<Basis>('mono');

  const e: [number, number] = [Math.cos(ang), Math.sin(ang)];
  const c = v[0] * e[0] + v[1] * e[1];
  const proj: [number, number] = [c * e[0], c * e[1]];

  const drawVec = useCallback(({ ctx, width, height, palette: pal }: DrawContext) => {
    const vp = makeViewport(width, height, DOM, undefined, true);
    drawGridAxes(ctx, vp, pal, { labels: false });
    polyline(ctx, vp, [[-3 * e[0], -3 * e[1]], [4 * e[0], 4 * e[1]]], pal.grid, 1.5, [4, 4]);
    arrow(ctx, vp, [0, 0], v, pal.fg, 2);
    label(ctx, vp, v, 'v', pal.fg);
    arrow(ctx, vp, [0, 0], proj, pal.c2, 3);
    label(ctx, vp, proj, '⟨v,e⟩ e', pal.c2, 6, 16);
    arrow(ctx, vp, proj, v, pal.c3, 2.5);
    label(ctx, vp, [(proj[0] + v[0]) / 2, (proj[1] + v[1]) / 2], 'v − ⟨v,e⟩e', pal.c3, 8, 0);
    arrow(ctx, vp, [0, 0], e, pal.c1, 3);
    label(ctx, vp, e, 'e', pal.c1, -14, -4);
  }, [e, v, proj]);

  const onPointer = useCallback((p: CanvasPointer) => {
    if (p.type === 'up' || !p.buttons) return;
    const vp = makeViewport(p.width, p.height, DOM, undefined, true);
    setV([vp.x.invert(p.x), vp.y.invert(p.y)]);
  }, []);

  const polys: Poly[] = useMemo(() => {
    if (basis === 'leg') return gramSchmidt(n - 1).map((s) => s.p);
    return Array.from({ length: n }, (_, k) => Array.from({ length: k + 1 }, (_, i) => (i === k ? 1 : 0)));
  }, [basis, n]);
  const G = useMemo(() => polys.map((p) => polys.map((q) => inner(p, q))), [polys]);
  const offMax = Math.max(0, ...G.flatMap((r, i) => r.filter((_, j) => j !== i).map(Math.abs)));

  const drawGram = useCallback(({ ctx, width, height, palette: pal }: DrawContext) => {
    const size = Math.min(width, height) - 8;
    const cell = size / n;
    const x0 = (width - size) / 2, y0 = (height - size) / 2;
    const max = Math.max(...G.flat().map(Math.abs)) || 1;
    ctx.font = `${Math.max(10, Math.min(14, cell / 4))}px ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    G.forEach((row, i) =>
      row.forEach((g, j) => {
        const a = Math.abs(g) / max;
        ctx.fillStyle = pal.grid;
        ctx.fillRect(x0 + j * cell + 1, y0 + i * cell + 1, cell - 2, cell - 2);
        if (a > 1e-12) {
          ctx.globalAlpha = 0.2 + 0.8 * a;
          ctx.fillStyle = i === j ? pal.c1 : pal.c2;
          ctx.fillRect(x0 + j * cell + 1, y0 + i * cell + 1, cell - 2, cell - 2);
          ctx.globalAlpha = 1;
        }
        ctx.fillStyle = a > 0.55 ? pal.bg : pal.fg;
        if (cell > 34) ctx.fillText(Math.abs(g) < 1e-12 ? '0' : g.toFixed(2), x0 + (j + 0.5) * cell, y0 + (i + 0.5) * cell);
      }),
    );
  }, [G, n]);

  return (
    <>
      <KeyIdentity label="Skalarprodukt für Funktionen">
        <Tex block tex="\langle f,g\rangle=\int_{-1}^{1} f(x)\,g(x)\,dx" />
      </KeyIdentity>
      <div className="prose">
        <Tex block tex="v=\sum_k \langle v,e_k\rangle\,e_k \qquad\text{(Vektoren, } e_k \perp e_j)" />
        <Tex block tex="\langle \sin kx,\sin jx\rangle_{[-\pi,\pi]}=0\quad(k\ne j)\qquad\text{(Fourier)}" />
        <Tex block tex="\langle p_i,p_j\rangle_{[-1,1]}=0\quad(i\ne j)\qquad\text{(Legendre)}" />
      </div>
      <div className="viz-grid">
        <div className="panel">
          <Canvas draw={drawVec} aspect={0.8} maxHeight={360} onPointer={onPointer} ariaLabel="Orthogonale Projektion" />
          <p className="canvas-caption">Spitze von v ziehen: der grüne Rest steht immer senkrecht auf e.</p>
          <Slider label="Richtung von e" value={ang} min={0} max={Math.PI} step={0.01} onChange={setAng} format={(t) => `${Math.round((t * 180) / Math.PI)}°`} />
        </div>
        <div className="panel">
          <Choice value={basis} onChange={setBasis} items={[{ id: 'mono', label: <>Monome 1, x, x², …</> }, { id: 'leg', label: <>Legendre p₀, p₁, …</> }]} />
          <Canvas draw={drawGram} aspect={1} maxHeight={320} ariaLabel="Gram-Matrix" />
          <p className="canvas-caption">
            Gram-Matrix <Tex tex="G_{ij}=\langle\phi_i,\phi_j\rangle" />: blau Diagonale, orange außerhalb. Größter Wert außerhalb:{' '}
            <b className={offMax < 1e-12 ? 'ok' : 'bad'}>{offMax < 1e-12 ? '0' : offMax.toFixed(3)}</b>
          </p>
          <Slider label="Anzahl Funktionen" value={n} min={2} max={8} step={1} onChange={setN} format={(t) => String(t)} />
        </div>
      </div>
      <Takeaway label={MERKE}>
        Monome sind nicht orthogonal (<Tex tex="\langle 1,x^2\rangle=\tfrac23" />). Für Legendre-Polynome ist die Gram-Matrix diagonal, genau
        wie bei Fourier.
      </Takeaway>
    </>
  );
}
