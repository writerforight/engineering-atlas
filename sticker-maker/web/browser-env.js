// Browser implementation of the pipeline env (HTMLCanvasElement).

import { encodeWebpWasm } from './webp-wasm.js';

function canvasEncode(canvas, mime, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('Görsel kodlanamadı.'));
        // Safari silently returns PNG when asked for WebP.
        if (blob.type !== mime) return resolve(null);
        blob.arrayBuffer().then((b) => resolve(new Uint8Array(b)), reject);
      },
      mime,
      quality,
    );
  });
}

// null = not probed yet. `?webp=wasm` forces the fallback (for testing).
let nativeWebp = new URLSearchParams(globalThis.location?.search || '').get('webp') === 'wasm' ? false : null;

export const browserEnv = {
  createCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  },
  async encode(canvas, mime, quality) {
    if (mime === 'image/webp' && nativeWebp === false) return encodeWebpWasm(canvas, quality);
    const bytes = await canvasEncode(canvas, mime, quality);
    if (bytes) {
      if (mime === 'image/webp') nativeWebp = true;
      return bytes;
    }
    if (mime === 'image/webp') {
      nativeWebp = false;
      return encodeWebpWasm(canvas, quality);
    }
    throw new Error(`Bu tarayıcı ${mime} üretemiyor.`);
  },
  get webpEncoder() {
    return nativeWebp === false ? 'wasm' : 'tarayıcı';
  },
  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

/** Decode a File / Blob into an ImageBitmap (EXIF orientation applied). */
export async function decodeFile(blob) {
  try {
    return await createImageBitmap(blob, { imageOrientation: 'from-image' });
  } catch {
    // Older engines: fall back to <img>.
    const url = URL.createObjectURL(blob);
    try {
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

/** A sample "photo" (flat background + subject) drawn in code, so the page opens working. */
export async function sampleImage() {
  const c = browserEnv.createCanvas(900, 700);
  const x = c.getContext('2d');
  x.fillStyle = '#e9f0f7';
  x.fillRect(0, 0, 900, 700);
  const g = x.createRadialGradient(410, 300, 40, 450, 350, 260);
  g.addColorStop(0, '#ffe066');
  g.addColorStop(1, '#f59f00');
  x.fillStyle = g;
  x.beginPath();
  x.ellipse(450, 360, 250, 235, 0, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = '#212529';
  x.beginPath();
  x.ellipse(370, 310, 26, 34, 0, 0, Math.PI * 2);
  x.ellipse(530, 310, 26, 34, 0, 0, Math.PI * 2);
  x.fill();
  x.lineWidth = 20;
  x.lineCap = 'round';
  x.strokeStyle = '#212529';
  x.beginPath();
  x.arc(450, 380, 115, 0.18 * Math.PI, 0.82 * Math.PI);
  x.stroke();
  x.fillStyle = 'rgba(255,135,135,0.55)';
  x.beginPath();
  x.ellipse(320, 400, 38, 22, 0, 0, Math.PI * 2);
  x.ellipse(580, 400, 38, 22, 0, 0, Math.PI * 2);
  x.fill();
  return c;
}
