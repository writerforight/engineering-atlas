// Plain PNG: one 512x512 transparent PNG per input image.

import { PNG_EXPORT } from '../limits.js';
import { checkEncoded, assertOk } from '../validate.js';
import { slugify } from '../exporters.js';

export function pngFileNames(stickers) {
  const used = new Set();
  return stickers.map((s, i) => {
    let base = slugify(String(s.name).replace(/\.[^.]+$/, ''), `sticker-${i + 1}`);
    while (used.has(base)) base += `-${i + 1}`;
    used.add(base);
    return `${base}.png`;
  });
}

export const pngPlugin = {
  id: 'png',
  label: 'PNG indir',
  targets: ['web', 'cli'],
  async run(ctx) {
    const stickers = await ctx.stickers();
    const names = pngFileNames(stickers);
    const bytes = await Promise.all(stickers.map((s) => ctx.png(s)));
    assertOk(
      bytes.flatMap((b, i) =>
        checkEncoded(b, { type: 'image/png', width: PNG_EXPORT.side, height: PNG_EXPORT.side, maxBytes: Infinity, name: names[i] }),
      ),
    );
    return {
      files: bytes.map((b, i) => ({ name: names[i], bytes: b, type: 'image/png' })),
      summary: `${bytes.length} PNG · ${bytes.map((b) => `${(b.length / 1024).toFixed(0)} KB`).join(', ')}`,
      notes: [...new Set(stickers.flatMap((s) => s.notes))],
    };
  },
};
