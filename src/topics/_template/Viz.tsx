import { useCallback, useState } from 'react';
import { Canvas, Slider, drawGridAxes, makeViewport, plotFn, type DrawContext } from '../../core/ui';

export default function Viz() {
  const [k, setK] = useState(1);
  const draw = useCallback(
    ({ ctx, width, height, palette }: DrawContext) => {
      const vp = makeViewport(width, height, { x: [-Math.PI, Math.PI], y: [-1.2, 1.2] });
      drawGridAxes(ctx, vp, palette);
      plotFn(ctx, vp, (x) => Math.sin(k * x), palette.c1);
    },
    [k],
  );
  return (
    <div className="panel">
      <Canvas draw={draw} aspect={0.5} ariaLabel="Örnek grafik" />
      <Slider label="k" value={k} min={0.5} max={4} onChange={setK} />
    </div>
  );
}
