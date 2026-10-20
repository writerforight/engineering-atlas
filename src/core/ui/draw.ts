import { fmtTick, niceTicks, type Viewport } from './plot';
import type { Palette } from './theme';

type Ctx = CanvasRenderingContext2D;

export function drawGridAxes(
  ctx: Ctx,
  vp: Viewport,
  pal: Palette,
  opts: { ticks?: number; labels?: boolean; xLabel?: string; yLabel?: string } = {},
) {
  const { ticks = 5, labels = true } = opts;
  const [x0, x1] = [vp.x.invert(vp.left), vp.x.invert(vp.right)];
  const [y0, y1] = [vp.y.invert(vp.bottom), vp.y.invert(vp.top)];
  const xt = niceTicks(x0, x1, ticks);
  const yt = niceTicks(y0, y1, Math.max(2, Math.round((ticks * (vp.bottom - vp.top)) / (vp.right - vp.left))));
  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = pal.grid;
  ctx.beginPath();
  for (const v of xt) {
    const px = Math.round(vp.x(v)) + 0.5;
    ctx.moveTo(px, vp.top);
    ctx.lineTo(px, vp.bottom);
  }
  for (const v of yt) {
    const py = Math.round(vp.y(v)) + 0.5;
    ctx.moveTo(vp.left, py);
    ctx.lineTo(vp.right, py);
  }
  ctx.stroke();

  ctx.strokeStyle = pal.axis;
  ctx.beginPath();
  if (y0 <= 0 && y1 >= 0) {
    const py = Math.round(vp.y(0)) + 0.5;
    ctx.moveTo(vp.left, py);
    ctx.lineTo(vp.right, py);
  }
  if (x0 <= 0 && x1 >= 0) {
    const px = Math.round(vp.x(0)) + 0.5;
    ctx.moveTo(px, vp.top);
    ctx.lineTo(px, vp.bottom);
  }
  ctx.stroke();

  if (labels) {
    ctx.fillStyle = pal.muted;
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (const v of xt) ctx.fillText(fmtTick(v), vp.x(v), vp.bottom + 4);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (const v of yt) ctx.fillText(fmtTick(v), vp.left - 4, vp.y(v));
    ctx.font = 'italic 12px system-ui, sans-serif';
    if (opts.xLabel) {
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText(opts.xLabel, vp.right, vp.bottom - 3);
    }
    if (opts.yLabel) {
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(opts.yLabel, vp.left + 4, vp.top + 2);
    }
  }
  ctx.restore();
}

/** Polyline through world-space points; NaN/inf points break the line. */
export function polyline(
  ctx: Ctx,
  vp: Viewport,
  pts: ReadonlyArray<readonly [number, number]>,
  color: string,
  width = 2,
  dash: number[] = [],
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.setLineDash(dash);
  ctx.beginPath();
  let pen = false;
  for (const [x, y] of pts) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      pen = false;
      continue;
    }
    // Clamp far-off values so huge numbers don't break canvas rasterization.
    const px = vp.x(x);
    const py = Math.max(-1e4, Math.min(1e4, vp.y(y)));
    if (pen) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
    pen = true;
  }
  ctx.stroke();
  ctx.restore();
}

/** Plot y = f(x) over the current x-range. */
export function plotFn(ctx: Ctx, vp: Viewport, f: (x: number) => number, color: string, width = 2, samples = 400) {
  const a = vp.x.invert(vp.left);
  const b = vp.x.invert(vp.right);
  const pts: Array<[number, number]> = [];
  for (let k = 0; k <= samples; k++) {
    const x = a + ((b - a) * k) / samples;
    pts.push([x, f(x)]);
  }
  polyline(ctx, vp, pts, color, width);
}

export function arrow(
  ctx: Ctx,
  vp: Viewport,
  from: readonly [number, number],
  to: readonly [number, number],
  color: string,
  width = 2,
) {
  const x0 = vp.x(from[0]);
  const y0 = vp.y(from[1]);
  const x1 = vp.x(to[0]);
  const y1 = vp.y(to[1]);
  const ang = Math.atan2(y1 - y0, x1 - x0);
  const len = Math.hypot(x1 - x0, y1 - y0);
  const head = Math.min(10, len * 0.4);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1 - Math.cos(ang) * head * 0.7, y1 - Math.sin(ang) * head * 0.7);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - head * Math.cos(ang - 0.4), y1 - head * Math.sin(ang - 0.4));
  ctx.lineTo(x1 - head * Math.cos(ang + 0.4), y1 - head * Math.sin(ang + 0.4));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function dot(ctx: Ctx, vp: Viewport, p: readonly [number, number], color: string, r = 4) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(vp.x(p[0]), vp.y(p[1]), r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function label(
  ctx: Ctx,
  vp: Viewport,
  p: readonly [number, number],
  text: string,
  color: string,
  dx = 6,
  dy = -6,
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = '12px system-ui, sans-serif';
  ctx.textBaseline = 'bottom';
  ctx.fillText(text, vp.x(p[0]) + dx, vp.y(p[1]) + dy);
  ctx.restore();
}
