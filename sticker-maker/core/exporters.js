// Exporter plugins. A plugin is a plain object:
//
//   {
//     id: 'whatsapp',
//     label: 'WhatsApp paketi',
//     targets: ['web', 'cli'],          // where it may run
//     async run(ctx, settings) {        // ctx from createExportContext
//       return { files: [{ name, bytes, type }], summary, links?: [{ href, label }], notes?: [] };
//     },
//   }
//
// runExporters starts every selected plugin at the same time on the same
// context and reports each result separately: one failing exporter never
// stops the others.

import { ValidationError } from './validate.js';

/**
 * @param {object[]} plugins
 * @param {object} ctx
 * @param {Record<string, object>} settings per plugin id
 * @param {(id: string, state: 'running' | 'done' | 'failed') => void} [onState]
 */
export async function runExporters(plugins, ctx, settings = {}, onState = () => {}) {
  const started = plugins.map(async (p) => {
    onState(p.id, 'running');
    const t0 = Date.now();
    try {
      const r = await p.run(ctx, settings[p.id] || {});
      onState(p.id, 'done');
      return { id: p.id, label: p.label, ok: true, ms: Date.now() - t0, files: [], notes: [], links: [], ...r };
    } catch (e) {
      onState(p.id, 'failed');
      const issues = e instanceof ValidationError ? e.issues : [{ code: 'error', message: e?.message || String(e) }];
      return { id: p.id, label: p.label, ok: false, ms: Date.now() - t0, files: [], notes: [], links: [], issues };
    }
  });
  return Promise.all(started);
}

/** Plugins allowed in a target, in the given order. */
export function pluginsFor(target, plugins) {
  return plugins.filter((p) => p.targets.includes(target));
}

export const slugify = (s, fallback = 'sticker') =>
  (String(s || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 48)) || fallback;

/** Split an emoji field ("😀 🎉" or "😀🎉") into a list of emoji. */
export function parseEmojis(text) {
  const s = String(text || '').trim();
  if (!s) return [];
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    return [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(s)]
      .map((x) => x.segment)
      .filter((g) => g.trim() && g !== ',');
  }
  return s.split(/[\s,]+/).filter(Boolean);
}
