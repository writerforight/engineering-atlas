// The one pipeline: any decoded image -> 512x512 transparent sticker canvas.
// It only uses the Canvas 2D API through `env`, so the browser (HTMLCanvas)
// and the CLI (@napi-rs/canvas) run exactly this code.
//
// env = {
//   createCanvas(w, h): canvas with getContext('2d'),
//   encode(canvas, mime, quality?): Promise<Uint8Array>  (throws if the mime is unsupported),
//   fontFamily: string,
// }

import { STICKER_SIZE } from './limits.js';
import { removeBackground, borderTransparency, opaqueBounds, outlineAlpha } from './mask.js';
import { checkInputSize, ValidationError } from './validate.js';
import { imageInfo } from './image-info.js';

export const SHAPES = ['square', 'rounded', 'cutout'];
export const TEXT_POSITIONS = ['top', 'center', 'bottom'];

export const DEFAULT_OPTIONS = Object.freeze({
  shape: 'rounded',
  cornerRadius: 0.18, // fraction of the sticker side (rounded shape)
  margin: 16, // WhatsApp asks for ~16 px of breathing room
  tolerance: 30, // 0..100, background removal (cut-out)
  outline: { width: 0, color: '#ffffff' },
  text: { value: '', color: '#ffffff', stroke: '#000000', size: 72, position: 'bottom' },
});

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);

/** Fill defaults and clamp every number into a safe range. */
export function normalizeOptions(o = {}) {
  const d = DEFAULT_OPTIONS;
  const shape = SHAPES.includes(o.shape) ? o.shape : d.shape;
  const outline = { ...d.outline, ...(o.outline || {}) };
  const text = { ...d.text, ...(o.text || {}) };
  return {
    shape,
    cornerRadius: clamp(num(o.cornerRadius, d.cornerRadius), 0, 0.5),
    margin: Math.round(clamp(num(o.margin, d.margin), 0, 96)),
    tolerance: clamp(num(o.tolerance, d.tolerance), 0, 100),
    outline: {
      width: Math.round(clamp(num(outline.width, 0), 0, 40)),
      color: isColor(outline.color) ? outline.color : d.outline.color,
    },
    text: {
      value: String(text.value ?? '').slice(0, 80),
      color: isColor(text.color) ? text.color : d.text.color,
      stroke: isColor(text.stroke) ? text.stroke : d.text.stroke,
      size: Math.round(clamp(num(text.size, d.text.size), 16, 160)),
      position: TEXT_POSITIONS.includes(text.position) ? text.position : d.text.position,
    },
  };
}

function isColor(c) {
  return typeof c === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c);
}

function hexToRgb(hex) {
  let h = hex.slice(1);
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function roundedRectPath(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const sizeOf = (img) => ({
  w: img.naturalWidth || img.videoWidth || img.width,
  h: img.naturalHeight || img.videoHeight || img.height,
});

/**
 * Render one sticker.
 * @param {object} env
 * @param {CanvasImageSource} image decoded image (ImageBitmap, HTMLImageElement, napi Image, canvas)
 * @param {object} options see DEFAULT_OPTIONS
 * @param {string} [name] for error messages
 * @returns {{ canvas: any, notes: string[] }}
 */
export function renderSticker(env, image, options, name = 'görsel') {
  const o = normalizeOptions(options);
  const { w: iw, h: ih } = sizeOf(image);
  const sizeIssues = checkInputSize(iw, ih, name);
  if (sizeIssues.length) throw new ValidationError(sizeIssues);

  const S = STICKER_SIZE;
  const notes = [];
  const inset = o.margin + o.outline.width;
  const box = S - 2 * inset;
  if (box < 64) throw new ValidationError([{ code: 'opt.margin', message: 'Kenar boşluğu + kenarlık çok büyük, görsele yer kalmadı.' }]);

  const layer = env.createCanvas(S, S);
  const lctx = layer.getContext('2d');
  lctx.imageSmoothingEnabled = true;
  lctx.imageSmoothingQuality = 'high';

  if (o.shape === 'cutout') {
    // Work at up to 512 px on the long side; that is all the output needs.
    const scale = Math.min(1, S / Math.max(iw, ih)) || 1;
    const ww = Math.max(1, Math.round(iw * scale));
    const wh = Math.max(1, Math.round(ih * scale));
    const work = env.createCanvas(ww, wh);
    const wctx = work.getContext('2d');
    wctx.imageSmoothingQuality = 'high';
    wctx.drawImage(image, 0, 0, ww, wh);
    const data = wctx.getImageData(0, 0, ww, wh);
    if (borderTransparency(data.data, ww, wh) > 0.05) {
      notes.push('Görselde saydamlık var: mevcut alfa kanalı kullanıldı.');
    } else {
      const share = removeBackground(data.data, ww, wh, o.tolerance);
      notes.push(`Arka plan ayrıldı (%${Math.round(share * 100)}).`);
      wctx.putImageData(data, 0, 0);
    }
    const bb = opaqueBounds(data.data, ww, wh);
    if (!bb || bb.w * bb.h < ww * wh * 0.01) {
      throw new ValidationError([
        { code: 'cutout.empty', message: `${name}: kesip çıkarınca geriye neredeyse bir şey kalmadı. Toleransı düşür ya da başka şekil seç.` },
      ]);
    }
    const k = Math.min(box / bb.w, box / bb.h);
    const dw = bb.w * k;
    const dh = bb.h * k;
    lctx.drawImage(work, bb.x, bb.y, bb.w, bb.h, (S - dw) / 2, (S - dh) / 2, dw, dh);
  } else {
    // Square / rounded: centre-crop to a square ("cover").
    const s = Math.min(iw, ih);
    lctx.save();
    roundedRectPath(lctx, inset, inset, box, box, o.shape === 'rounded' ? o.cornerRadius * box : 0);
    lctx.clip();
    lctx.drawImage(image, (iw - s) / 2, (ih - s) / 2, s, s, inset, inset, box, box);
    lctx.restore();
    if (iw !== ih) notes.push(`Kare olmayan görsel ortadan kırpıldı (${iw}×${ih}).`);
  }

  const out = env.createCanvas(S, S);
  const ctx = out.getContext('2d');

  if (o.outline.width > 0) {
    const src = lctx.getImageData(0, 0, S, S);
    const a = outlineAlpha(src.data, S, S, o.outline.width);
    const [r, g, b] = hexToRgb(o.outline.color);
    const ring = ctx.createImageData(S, S);
    for (let i = 0; i < a.length; i++) {
      ring.data[i * 4] = r;
      ring.data[i * 4 + 1] = g;
      ring.data[i * 4 + 2] = b;
      ring.data[i * 4 + 3] = a[i];
    }
    ctx.putImageData(ring, 0, 0);
  }
  ctx.drawImage(layer, 0, 0);

  if (o.text.value.trim()) drawText(env, ctx, o, inset);

  return { canvas: out, notes };
}

function drawText(env, ctx, o, inset) {
  const S = STICKER_SIZE;
  const maxW = S - 2 * Math.max(o.margin, 8) - 8;
  const family = env.fontFamily || 'sans-serif';
  const text = o.text.value.trim();
  const font = (px) => `bold ${px}px ${family}`;

  // Shrink to fit on one line; below 60 % of the size, try two lines.
  let size = o.text.size;
  let lines = [text];
  const fits = (ls, px) => {
    ctx.font = font(px);
    return ls.every((l) => ctx.measureText(l).width <= maxW);
  };
  while (size > 16 && !fits(lines, size)) {
    size -= 2;
    if (lines.length === 1 && size < o.text.size * 0.6 && text.includes(' ')) {
      lines = splitBalanced(text);
      size = o.text.size;
    }
  }
  ctx.font = font(size);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  const lh = size * 1.1;
  const block = lh * lines.length;
  let y0;
  if (o.text.position === 'top') y0 = inset + lh / 2 + 4;
  else if (o.text.position === 'center') y0 = S / 2 - block / 2 + lh / 2;
  else y0 = S - inset - block + lh / 2 - 4;
  lines.forEach((line, i) => {
    const y = y0 + i * lh;
    ctx.lineWidth = Math.max(3, size * 0.18);
    ctx.strokeStyle = o.text.stroke;
    ctx.strokeText(line, S / 2, y);
    ctx.fillStyle = o.text.color;
    ctx.fillText(line, S / 2, y);
  });
}

function splitBalanced(text) {
  const words = text.split(/\s+/);
  let best = [text];
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ');
    const b = words.slice(i).join(' ');
    const diff = Math.abs(a.length - b.length);
    if (diff < bestDiff) { bestDiff = diff; best = [a, b]; }
  }
  return best;
}

/** Downscale a sticker into a new w x h canvas. */
export function resizeCanvas(env, canvas, w, h) {
  const c = env.createCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  // Two-step downscale keeps small icons from aliasing.
  if (canvas.width / w > 2.5) {
    const mid = resizeCanvas(env, canvas, w * 2, h * 2);
    ctx.drawImage(mid, 0, 0, w, h);
  } else {
    ctx.drawImage(canvas, 0, 0, w, h);
  }
  return c;
}

export const WEBP_QUALITIES = [0.92, 0.85, 0.78, 0.7, 0.62, 0.54, 0.46, 0.38, 0.3, 0.22];

/**
 * Encode as WebP, lowering quality until the file fits in maxBytes.
 * @returns {Promise<{ bytes: Uint8Array, quality: number }>}
 */
export async function encodeWebpUnder(env, canvas, maxBytes, name = 'sticker.webp') {
  let last = null;
  for (const q of WEBP_QUALITIES) {
    const bytes = await env.encode(canvas, 'image/webp', q);
    if (imageInfo(bytes)?.type !== 'image/webp') {
      throw new ValidationError([{ code: 'env.webp', message: 'Bu ortam WebP kodlayamıyor.' }]);
    }
    last = bytes;
    if (bytes.length <= maxBytes) return { bytes, quality: q };
  }
  throw new ValidationError([
    {
      code: 'out.weight',
      message: `${name}: en düşük kalitede bile ${(last.length / 1024).toFixed(1)} KB (sınır ${(maxBytes / 1024).toFixed(0)} KB). Daha sade bir görsel ya da kesip çıkarma dene.`,
      file: name,
    },
  ]);
}
