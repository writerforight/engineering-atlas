// Pure core: no canvas needed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createZip, readZip, crc32, utf8 } from '../core/zip.js';
import { imageInfo } from '../core/image-info.js';
import { squaredDistance, removeBackground, outlineAlpha, opaqueBounds } from '../core/mask.js';
import { checkInputFile, checkInputSize, checkWhatsAppMeta, checkTelegramMeta } from '../core/validate.js';
import { normalizeOptions } from '../core/pipeline.js';
import { toBase64, cleanDir } from '../core/github.js';
import { parseEmojis, slugify, runExporters } from '../core/exporters.js';
import { ValidationError } from '../core/validate.js';

test('crc32 matches the reference value', () => {
  assert.equal(crc32(utf8('123456789')), 0xcbf43926);
});

test('zip round trip keeps names, bytes and CRCs', () => {
  const files = [
    { name: 'contents.json', bytes: utf8('{"a":1}') },
    { name: 'çıkartma/01.webp', bytes: new Uint8Array([1, 2, 3, 4, 5]) },
  ];
  const back = readZip(createZip(files));
  assert.deepEqual(back.map((e) => e.name), files.map((f) => f.name));
  back.forEach((e, i) => {
    assert.equal(e.crcOk, true);
    assert.deepEqual([...e.bytes], [...files[i].bytes]);
  });
  assert.throws(() => createZip([files[0], files[0]]), /duplicate/);
});

test('imageInfo reads PNG and WebP headers', () => {
  const png = new Uint8Array(33);
  png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  png.set([0, 0, 2, 0, 0, 0, 0, 96, 8, 6], 16);
  assert.deepEqual(imageInfo(png), { type: 'image/png', width: 512, height: 96, alpha: true, animated: false });

  const vp8x = new Uint8Array(30);
  vp8x.set(utf8('RIFF'), 0);
  vp8x.set(utf8('WEBPVP8X'), 8);
  vp8x[20] = 0x10;
  vp8x.set([0xff, 0x01, 0x00, 0xff, 0x01, 0x00], 24); // 511 + 1
  assert.deepEqual(imageInfo(vp8x), { type: 'image/webp', width: 512, height: 512, alpha: true, animated: false });
  assert.equal(imageInfo(new Uint8Array(40)), null);
});

test('distance transform is exact on a single point', () => {
  const w = 9, h = 7;
  const inside = new Uint8Array(w * h);
  inside[3 * w + 4] = 1;
  const d = squaredDistance(inside, w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) assert.equal(d[y * w + x], (x - 4) ** 2 + (y - 3) ** 2);
});

test('background removal keeps the subject and the outline wraps it', () => {
  const w = 40, h = 40;
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let p = 0; p < w * h; p++) {
    const x = p % w, y = Math.floor(p / w);
    const inCircle = (x - 20) ** 2 + (y - 20) ** 2 < 100;
    rgba.set(inCircle ? [200, 30, 30, 255] : [250, 250, 250, 255], p * 4);
  }
  const share = removeBackground(rgba, w, h, 30);
  assert.ok(share > 0.7 && share < 0.95, `removed ${share}`);
  assert.equal(rgba[3], 0); // corner gone
  assert.equal(rgba[(20 * w + 20) * 4 + 3], 255); // centre kept
  const bb = opaqueBounds(rgba, w, h);
  assert.ok(bb.w >= 18 && bb.w <= 20);
  const ring = outlineAlpha(rgba, w, h, 3);
  assert.equal(ring[20 * w + 20], 255);
  assert.equal(ring[20 * w + 31], 255); // 2 px outside the opaque edge
  assert.equal(ring[0], 0);
});

test('input checks report format, weight and size', () => {
  assert.equal(checkInputFile({ name: 'a.png', type: 'image/png', size: 1000 }).length, 0);
  assert.equal(checkInputFile({ name: 'a.svg', type: 'image/svg+xml', size: 1000 })[0].code, 'input.format');
  assert.equal(checkInputFile({ name: 'a.png', type: 'image/png', size: 30e6 })[0].code, 'input.weight');
  assert.equal(checkInputSize(20, 400)[0].code, 'input.small');
  assert.equal(checkInputSize(9000, 400)[0].code, 'input.large');
});

test('pack metadata checks', () => {
  const ok = { name: 'Paket', publisher: 'Ben', identifier: 'paket', count: 3, emojis: ['😀'] };
  assert.deepEqual(checkWhatsAppMeta(ok), []);
  assert.equal(checkWhatsAppMeta({ ...ok, count: 2 })[0].code, 'wa.count');
  assert.equal(checkWhatsAppMeta({ ...ok, count: 31 })[0].code, 'wa.count');
  assert.equal(checkWhatsAppMeta({ ...ok, emojis: ['1', '2', '3', '4'] })[0].code, 'wa.emoji');
  assert.deepEqual(checkTelegramMeta({ title: 'T', shortName: 'my_pack', botUsername: 'bot', count: 1, emojis: ['😀'] }), []);
  assert.equal(checkTelegramMeta({ title: 'T', shortName: '1pack', botUsername: 'b', count: 1, emojis: ['😀'] })[0].code, 'tg.name');
});

test('options are clamped', () => {
  const o = normalizeOptions({ shape: 'star', margin: 999, outline: { width: -5, color: 'red' }, text: { size: 5 } });
  assert.equal(o.shape, 'rounded');
  assert.equal(o.margin, 96);
  assert.equal(o.outline.width, 0);
  assert.equal(o.outline.color, '#ffffff');
  assert.equal(o.text.size, 16);
});

test('helpers', () => {
  assert.equal(toBase64(utf8('Man')), 'TWFu');
  assert.equal(toBase64(utf8('Ma')), 'TWE=');
  assert.equal(toBase64(utf8('M')), 'TQ==');
  assert.equal(toBase64(utf8('çıkartma')), Buffer.from('çıkartma').toString('base64'));
  assert.equal(cleanDir('/stickers/2026/'), 'stickers/2026');
  assert.throws(() => cleanDir('../etc'), ValidationError);
  assert.deepEqual(parseEmojis('😀 🎉,👍🏽'), ['😀', '🎉', '👍🏽']);
  assert.equal(slugify('Çıkartmalarım 2'), 'cikartmalarim-2');
});

test('runExporters runs plugins in parallel and isolates failures', async () => {
  const order = [];
  const slow = { id: 'slow', label: 'slow', targets: ['web'], run: async () => { order.push('slow:start'); await new Promise((r) => setTimeout(r, 30)); order.push('slow:end'); return { summary: 'ok' }; } };
  const fast = { id: 'fast', label: 'fast', targets: ['web'], run: async () => { order.push('fast:start'); throw new ValidationError([{ code: 'x', message: 'bozuk' }]); } };
  const r = await runExporters([slow, fast], {});
  assert.deepEqual(order.slice(0, 2), ['slow:start', 'fast:start']);
  assert.equal(r[0].ok, true);
  assert.equal(r[1].ok, false);
  assert.equal(r[1].issues[0].message, 'bozuk');
});
