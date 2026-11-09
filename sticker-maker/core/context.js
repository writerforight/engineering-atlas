// One export run = one context. Every exporter asks the context for stickers
// and encodings; the context renders and encodes each thing once and shares it,
// so exporters running in parallel never repeat the pipeline.

import { renderSticker, normalizeOptions, resizeCanvas, encodeWebpUnder, SHAPES } from './pipeline.js';

/**
 * @param {object} env see pipeline.js
 * @param {{ name: string, image: any }[]} sources decoded images
 * @param {object} options pipeline options shared by all sources
 */
export function createExportContext(env, sources, options) {
  const base = normalizeOptions(options);
  const renders = new Map();
  const encodes = new Map();

  const memo = (map, key, make) => {
    if (!map.has(key)) map.set(key, make());
    return map.get(key);
  };

  function render(i, opts, variant = false) {
    const o = normalizeOptions(opts);
    const id = `${i}:${JSON.stringify(o)}`;
    return memo(renders, id, async () => {
      const { canvas, notes } = renderSticker(env, sources[i].image, o, sources[i].name);
      return { id, sourceIndex: i, name: sources[i].name, canvas, notes, options: o, variant };
    });
  }

  /** The user's stickers: one per source, with the chosen options. */
  function stickers() {
    return Promise.all(sources.map((_, i) => render(i, base)));
  }

  /**
   * At least `min` stickers: the user's, then variants of them (other shapes,
   * then an outline toggle) until the count is reached. A variant that cannot
   * be made (e.g. cut-out on a busy background) is skipped.
   */
  async function stickersWithFill(min, max = Infinity) {
    const list = await stickers();
    if (list.length >= min) return list.slice(0, max);
    const others = SHAPES.filter((s) => s !== base.shape);
    const candidates = [
      ...others.map((shape) => ({ ...base, shape })),
      { ...base, outline: { ...base.outline, width: base.outline.width ? 0 : 10 } },
      ...others.map((shape) => ({ ...base, shape, outline: { ...base.outline, width: base.outline.width ? 0 : 10 } })),
    ];
    for (const c of candidates) {
      for (let i = 0; i < sources.length && list.length < min; i++) {
        try {
          list.push(await render(i, c, true));
        } catch {
          /* skip this variant */
        }
      }
      if (list.length >= min) break;
    }
    return list;
  }

  const png = (sticker) => memo(encodes, `png:${sticker.id}`, () => env.encode(sticker.canvas, 'image/png'));
  const webp = (sticker, maxBytes, fileName) =>
    memo(encodes, `webp:${maxBytes}:${sticker.id}`, () => encodeWebpUnder(env, sticker.canvas, maxBytes, fileName));
  const iconPng = (sticker, side) =>
    memo(encodes, `icon:${side}:${sticker.id}`, () => env.encode(resizeCanvas(env, sticker.canvas, side, side), 'image/png'));

  return { env, sources, options: base, render, stickers, stickersWithFill, png, webp, iconPng };
}
