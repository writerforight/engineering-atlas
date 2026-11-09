// The vendored libwebp WASM (browser fallback for Safari / iOS) still loads
// and produces a valid 512x512 WebP within the WhatsApp limit.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { nodeEnv, decodeImage } from '../cli/node-env.mjs';
import { renderSticker } from '../core/pipeline.js';
import { checkEncoded } from '../core/validate.js';

test('vendored WASM WebP encoder makes a valid sticker', async () => {
  const factory = (await import('../web/vendor/webp/webp_enc.js')).default;
  const wasmBinary = await readFile(new URL('../web/vendor/webp/webp_enc.wasm', import.meta.url));
  const mod = await factory({ noInitialRun: true, wasmBinary });
  const image = await decodeImage(await readFile(new URL('./fixtures/face.jpg', import.meta.url)));
  const { canvas } = renderSticker(nodeEnv, image, { shape: 'cutout', outline: { width: 8 } });
  const { data } = canvas.getContext('2d').getImageData(0, 0, 512, 512);
  const out = new Uint8Array(mod.encode(new Uint8ClampedArray(data), 512, 512, {
    quality: 90, target_size: 0, target_PSNR: 0, method: 4, sns_strength: 50, filter_strength: 60,
    filter_sharpness: 0, filter_type: 1, partitions: 0, segments: 4, pass: 1, show_compressed: 0,
    preprocessing: 0, autofilter: 0, partition_limit: 0, alpha_compression: 1, alpha_filtering: 1,
    alpha_quality: 100, lossless: 0, exact: 0, image_hint: 0, emulate_jpeg_size: 0, thread_level: 0,
    low_memory: 0, near_lossless: 100, use_delta_palette: 0, use_sharp_yuv: 0,
  }));
  assert.deepEqual(checkEncoded(out, { type: 'image/webp', width: 512, height: 512, maxBytes: 100 * 1024, name: 'wasm.webp' }), []);
});
