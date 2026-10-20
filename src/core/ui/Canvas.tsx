import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { readPalette, useTheme, type Palette } from './theme';

export interface DrawContext {
  ctx: CanvasRenderingContext2D;
  /** Size in CSS pixels. */
  width: number;
  height: number;
  palette: Palette;
}

export interface CanvasPointer {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'down' | 'move' | 'up';
  buttons: number;
}

interface Props {
  draw: (d: DrawContext) => void;
  /** Height / width ratio. */
  aspect?: number;
  /** Optional cap on CSS height in px. */
  maxHeight?: number;
  onPointer?: (p: CanvasPointer) => void;
  ariaLabel: string;
}

/**
 * Responsive, HiDPI-aware canvas. Redraws on every render, on resize and on
 * theme change; `draw` receives CSS-pixel coordinates.
 */
export function Canvas({ draw, aspect = 0.75, maxHeight, onPointer, ariaLabel }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);
  const { resolved } = useTheme();

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.floor(entry.contentRect.width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const height = Math.round(Math.min(width * aspect, maxHeight ?? Infinity));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width === 0) return;
    const dpr = window.devicePixelRatio || 1;
    const pw = Math.round(width * dpr);
    const ph = Math.round(height * dpr);
    if (canvas.width !== pw) canvas.width = pw;
    if (canvas.height !== ph) canvas.height = ph;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const palette = readPalette(canvas);
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, width, height);
    draw({ ctx, width, height, palette });
  });
  // `resolved` is read so a theme switch re-renders and therefore redraws.
  void resolved;

  const handle = (type: CanvasPointer['type']) => (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!onPointer) return;
    const r = e.currentTarget.getBoundingClientRect();
    if (type === 'down') e.currentTarget.setPointerCapture(e.pointerId);
    onPointer({ x: e.clientX - r.left, y: e.clientY - r.top, width: r.width, height: r.height, type, buttons: e.buttons });
  };

  return (
    <div ref={wrapRef} className="canvas-wrap" style={{ height: height || undefined }}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={ariaLabel}
        onPointerDown={handle('down')}
        onPointerMove={handle('move')}
        onPointerUp={handle('up')}
        style={{ touchAction: onPointer ? 'none' : 'auto' }}
      />
    </div>
  );
}
