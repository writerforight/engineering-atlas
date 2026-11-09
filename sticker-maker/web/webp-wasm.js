// WebP fallback for browsers whose canvas cannot encode WebP (Safari and
// every browser on iOS). libwebp as WebAssembly, served from this site,
// loaded only on first use.

// libwebp WebPConfig defaults (same as @jsquash/webp meta.js).
const OPTIONS = {
  quality: 75, target_size: 0, target_PSNR: 0, method: 4, sns_strength: 50,
  filter_strength: 60, filter_sharpness: 0, filter_type: 1, partitions: 0,
  segments: 4, pass: 1, show_compressed: 0, preprocessing: 0, autofilter: 0,
  partition_limit: 0, alpha_compression: 1, alpha_filtering: 1, alpha_quality: 100,
  lossless: 0, exact: 0, image_hint: 0, emulate_jpeg_size: 0, thread_level: 0,
  low_memory: 0, near_lossless: 100, use_delta_palette: 0, use_sharp_yuv: 0,
};

let encoder = null;

function load() {
  encoder ??= import('./vendor/webp/webp_enc.js')
    .then((m) => m.default({ noInitialRun: true }))
    .catch((e) => {
      encoder = null; // allow a retry after a network hiccup
      throw new Error(`WebP kodlayıcısı yüklenemedi (${e?.message || e}).`);
    });
  return encoder;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {number} quality 0..1
 * @returns {Promise<Uint8Array>}
 */
export async function encodeWebpWasm(canvas, quality = 0.9) {
  const mod = await load();
  const { data, width, height } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
  const out = mod.encode(data, width, height, { ...OPTIONS, quality: Math.round(quality * 100) });
  if (!out) throw new Error('WebP kodlanamadı.');
  return new Uint8Array(out); // copy out of the module's memory
}
