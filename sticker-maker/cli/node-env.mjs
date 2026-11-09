// Node implementation of the pipeline env, on @napi-rs/canvas (Skia).

import { createCanvas, loadImage } from '@napi-rs/canvas';

export const nodeEnv = {
  createCanvas: (w, h) => createCanvas(w, h),
  async encode(canvas, mime, quality) {
    if (mime === 'image/png') return new Uint8Array(await canvas.encode('png'));
    if (mime === 'image/webp') return new Uint8Array(await canvas.encode('webp', Math.round((quality ?? 0.9) * 100)));
    throw new Error(`encode: ${mime} desteklenmiyor`);
  },
  fontFamily: '"DejaVu Sans", "Inter", "Noto Sans", Arial, sans-serif',
};

/** Decode bytes (PNG/JPEG/WebP/GIF/BMP) into a drawable image. */
export async function decodeImage(bytes) {
  return loadImage(Buffer.from(bytes));
}
