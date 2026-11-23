import { useCallback, useMemo, useState } from 'react';
import { evalPoly, gramSchmidt, simpson } from '../../core/math';
import {
  Canvas, KeyIdentity, Slider, Takeaway, Tex, arrow, drawGridAxes, label, makeViewport, polyline,
  type CanvasPointer, type DrawContext,
} from '../../core/ui';
import { Choice, MERKE, SERIES, clip, yRange } from './shared';

type Basis = 'mono' | 'leg' | 'fourier';
const DOM = { x: [-0.6, 2.8] as [number, number], y: [-0.6, 2.6] as [number, number] };

interface Family {
  fns: Array<(x: number) => number>;
  names: string[];
  dom: [number, number];
}

function family(basis: Basis, n: number): Family {
  if (basis === 'fourier') {
    const fns: Array<(x: number) => number> = [() => 1];
    const names = ['1'];
    for (let k = 1; fns.length < n; k++) {
      fns.push((x) => Math.cos(k * x));
      names.push(`\\cos ${k === 1 ? '' : k}x`);
      if (fns.length < n) {
        fns.push((x) => Math.sin(k * x));
        names.push(`\\sin ${k === 1 ? '' : k}x`);
      }
    }
    return { fns, names, dom: [-Math.PI, Math.PI] };
  }
  if (basis === 'leg') {
    const P = gramSchmidt(n - 1).map((s) => s.p);
    return { fns: P.map((p) => (x: number) => evalPoly(p, x)), names: P.map((_, k) => `p_{${k}}`), dom: [-1, 1] };
  }
  return {
    fns: Array.from({ length: n }, (_, k) => (x: number) => x ** k),
    names: Array.from({ length: n }, (_, k) => (k === 0 ? '1' : k === 1 ? 'x' : `x^{${k}}`)),
    dom: [-1, 1],
  };
}

export function Ch1Orthogonal() {
  const [ang, setAng] = useState(0.35);
  const [v, setV] = useState<[number, number]>([1.6, 1.9]);
  const [n, setN] = useState(5);
  const [basis, setBasis] = useState<Basis>('mono');
  const [cell, setCell] = useState<[number, number]>([0, 2]);

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

  const onVec = useCallback((p: CanvasPointer) => {
    if (p.type === 'up' || !p.buttons) return;
    const vp = makeViewport(p.width, p.height, DOM, undefined, true);
    setV([vp.x.invert(p.x), vp.y.invert(p.y)]);
  }, []);

  const fam = useMemo(() => family(basis, n), [basis, n]);
  const [a, b] = fam.dom;
  const G = useMemo(
    () => fam.fns.map((f) => fam.fns.map((g) => {
      const s = simpson((x) => f(x) * g(x), a, b, 2000);
      return Math.abs(s) < 1e-10 ? 0 : s;
    })),
    [fam, a, b],
  );
  const offMax = Math.max(0, ...G.flatMap((r, i) => r.filter((_, j) => j !== i).map(Math.abs)));
  const [ci, cj] = [Math.min(cell[0], n - 1), Math.min(cell[1], n - 1)];

  const gramGeom = (width: number, height: number) => {
    const size = Math.min(width, height) - 8;
    return { size, cell: size / n, x0: (width - size) / 2, y0: (height - size) / 2 };
  };
  const drawGram = useCallback(({ ctx, width, height, palette: pal }: DrawContext) => {
    const { cell: cs, x0, y0 } = gramGeom(width, height);
    const max = Math.max(...G.flat().map(Math.abs)) || 1;
    ctx.font = `${Math.max(10, Math.min(14, cs / 4))}px ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    G.forEach((row, i) =>
      row.forEach((g, j) => {
        const r = Math.abs(g) / max;
        ctx.fillStyle = pal.grid;
        ctx.fillRect(x0 + j * cs + 1, y0 + i * cs + 1, cs - 2, cs - 2);
        if (r > 0) {
          ctx.globalAlpha = 0.2 + 0.8 * r;
          ctx.fillStyle = i === j ? pal.c1 : pal.c2;
          ctx.fillRect(x0 + j * cs + 1, y0 + i * cs + 1, cs - 2, cs - 2);
          ctx.globalAlpha = 1;
        }
        if (i === ci && j === cj) {
          ctx.strokeStyle = pal.fg;
          ctx.lineWidth = 2.5;
          ctx.strokeRect(x0 + j * cs + 2, y0 + i * cs + 2, cs - 4, cs - 4);
        }
        ctx.fillStyle = r > 0.55 ? pal.bg : pal.fg;
        if (cs > 34) ctx.fillText(g === 0 ? '0' : g.toFixed(2), x0 + (j + 0.5) * cs, y0 + (i + 0.5) * cs);
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [G, n, ci, cj]);
  const onGram = useCallback((p: CanvasPointer) => {
    if (p.type !== 'down') return;
    const { cell: cs, x0, y0 } = gramGeom(p.width, p.height);
    const j = Math.floor((p.x - x0) / cs), i = Math.floor((p.y - y0) / cs);
    if (i >= 0 && j >= 0 && i < n && j < n) setCell([i, j]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  const fi = fam.fns[ci]!, fj = fam.fns[cj]!;
  const prod = (x: number) => fi(x) * fj(x);
  const drawProd = useCallback(({ ctx, width, height, palette: pal }: DrawContext) => {
    const yr = yRange([fi, fj, prod], a, b, 0.08);
    const vp = makeViewport(width, height, { x: [a, b], y: yr }, { l: 36, r: 10, t: 10, b: 22 });
    drawGridAxes(ctx, vp, pal, { ticks: 6, xLabel: 'x' });
    clip(ctx, vp, () => {
      const y0 = vp.y(0);
      for (let k = 0; k < 300; k++) {
        const x = a + ((b - a) * (k + 0.5)) / 300, y = prod(x);
        ctx.fillStyle = y >= 0 ? pal.c1 : pal.c2;
        ctx.globalAlpha = 0.3;
        const px = vp.x(a + ((b - a) * k) / 300), pw = vp.x(a + ((b - a) * (k + 1)) / 300) - px;
        ctx.fillRect(px, Math.min(y0, vp.y(y)), pw + 0.5, Math.abs(vp.y(y) - y0));
      }
      ctx.globalAlpha = 1;
      const line = (f: (x: number) => number, col: string, w: number, dash: number[] = []) => {
        const pts: Array<[number, number]> = [];
        for (let k = 0; k <= 300; k++) {
          const x = a + ((b - a) * k) / 300;
          pts.push([x, f(x)]);
        }
        polyline(ctx, vp, pts, col, w, dash);
      };
      line(fi, pal[SERIES[2]], 1.5, [5, 4]);
      line(fj, pal[SERIES[3]], 1.5, [5, 4]);
      line(prod, pal.fg, 2.5);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fi, fj, a, b]);

  const sym = basis === 'fourier' ? '[-\\pi,\\pi]' : '[-1,1]';

  return (
    <>
      <KeyIdentity label="Skalarprodukt für Funktionen">
        <Tex block tex="\langle f,g\rangle=\int f(x)\,g(x)\,dx" />
      </KeyIdentity>
      <div className="prose">
        <Tex block tex="v=\sum_k \langle v,e_k\rangle\,e_k\qquad(\text{Vektoren},\ e_k\perp e_j)" />
        <Tex block tex="\langle \cos kx,\sin jx\rangle_{[-\pi,\pi]}=0\qquad(\text{Fourier})" />
        <Tex block tex="\langle \cos kx,\cos jx\rangle_{[-\pi,\pi]}=\langle \sin kx,\sin jx\rangle_{[-\pi,\pi]}=\pi\,\delta_{kj}" />
        <Tex block tex="\langle p_i,p_j\rangle_{[-1,1]}=0\quad(i\ne j)\qquad(\text{Legendre})" />
      </div>
      <div className="viz-grid">
        <div className="panel">
          <Canvas draw={drawVec} aspect={0.8} maxHeight={340} onPointer={onVec} ariaLabel="Orthogonale Projektion" />
          <p className="canvas-caption">Spitze von v ziehen: der grüne Rest steht immer senkrecht auf e.</p>
          <Slider label="Richtung von e" value={ang} min={0} max={Math.PI} step={0.01} onChange={setAng} format={(t) => `${Math.round((t * 180) / Math.PI)}°`} />
        </div>
        <div className="panel">
          <KeyIdentity label="Gram-Matrix (nicht Gram-Schmidt)">
            <Tex block tex={`G_{ij}=\\langle\\phi_i,\\phi_j\\rangle`} />
          </KeyIdentity>
          <Choice
            value={basis}
            onChange={setBasis}
            items={[
              { id: 'mono', label: <>Monome</> },
              { id: 'leg', label: <>Legendre</> },
              { id: 'fourier', label: <>Fourier</> },
            ]}
          />
          <Canvas draw={drawGram} aspect={1} maxHeight={300} onPointer={onGram} ariaLabel="Gram-Matrix, Zelle anklicken" />
          <p className="canvas-caption">
            Zelle anklicken. Blau: Diagonale, orange: außerhalb. Größter Wert außerhalb:{' '}
            <b className={offMax === 0 ? 'ok' : 'bad'}>{offMax === 0 ? '0 → orthogonal' : offMax.toFixed(3)}</b>
          </p>
          <Slider label="Anzahl Funktionen" value={n} min={2} max={8} step={1} onChange={setN} format={(t) => String(t)} />
        </div>
      </div>
      <div className="panel">
        <b>
          Zelle ({ci}, {cj}): <Tex tex={`\\langle ${fam.names[ci]!},\\,${fam.names[cj]!}\\rangle = \\int_{${sym}} (${fam.names[ci]!})\\cdot(${fam.names[cj]!})\\,dx = ${G[ci]![cj]!.toFixed(4)}`} />
        </b>
        <Canvas draw={drawProd} aspect={0.32} maxHeight={240} ariaLabel="Produkt der zwei Funktionen und seine Fläche" />
        <p className="canvas-caption">
          Gestrichelt: φ<sub>i</sub> und φ<sub>j</sub>. Dick: Produkt φ<sub>i</sub>·φ<sub>j</sub>. Blaue Fläche zählt positiv, orange negativ;
          ihre Summe ist der Eintrag G<sub>ij</sub>. Heben sich die Flächen auf, sind die Funktionen orthogonal.
        </p>
      </div>
      <Takeaway label={MERKE}>
        Gram-Matrix diagonal ⇔ Familie orthogonal. Monome: nein. Legendre und Fourier: ja.
      </Takeaway>
    </>
  );
}
