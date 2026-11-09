// Telegram sticker set via the Bot API. Runs only where the bot token is a
// secret: the CLI (TELEGRAM_BOT_TOKEN) or a server function. This folder is
// never copied to the public web page.
//
// Uses only fetch / FormData / Blob, so Node >= 20, Deno, Bun and Workers all work.

import { TELEGRAM, WHATSAPP } from '../core/limits.js';
import { checkTelegramMeta, checkEncoded, assertOk, ValidationError } from '../core/validate.js';
import { imageInfo } from '../core/image-info.js';
import { parseEmojis } from '../core/exporters.js';

/**
 * @param {{ token: string, userId: number|string, shortName: string, title: string,
 *   stickers: { bytes: Uint8Array, emojis: string[] }[], append?: boolean,
 *   fetchImpl?: typeof fetch, apiBase?: string }} o
 * @returns {Promise<{ name: string, url: string, created: boolean, added: number }>}
 */
export async function publishTelegramPack(o) {
  if (!o.token) throw new ValidationError([{ code: 'tg.token', message: 'TELEGRAM_BOT_TOKEN ortam değişkeni gerekli.' }]);
  if (!/^\d+$/.test(String(o.userId || ''))) {
    throw new ValidationError([{ code: 'tg.user', message: 'Telegram kullanıcı kimliği (sayı) gerekli. Botuna /start yaz, sonra @userinfobot ile kimliğini öğren.' }]);
  }
  const f = o.fetchImpl || globalThis.fetch.bind(globalThis);
  const base = `${(o.apiBase || 'https://api.telegram.org').replace(/\/$/, '')}/bot${o.token}`;

  async function call(method, form) {
    const res = await f(`${base}/${method}`, { method: 'POST', body: form });
    let json;
    try {
      json = await res.json();
    } catch {
      json = { ok: false, description: `HTTP ${res.status}` };
    }
    if (!json.ok) {
      const err = new Error(`Telegram ${method}: ${json.description || 'bilinmeyen hata'}`);
      err.description = json.description || '';
      throw err;
    }
    return json.result;
  }

  const me = await call('getMe', new FormData());
  const name = `${o.shortName}_by_${me.username}`;
  assertOk(
    checkTelegramMeta({
      title: o.title,
      shortName: o.shortName,
      botUsername: me.username,
      count: o.stickers.length,
      emojis: o.stickers[0]?.emojis,
    }),
  );
  assertOk(
    o.stickers.flatMap((s, i) => [
      ...checkTelegramSticker(s.bytes, `${i + 1}. çıkartma`),
      ...(s.emojis?.length >= 1 && s.emojis.length <= TELEGRAM.maxEmojisPerSticker
        ? []
        : [{ code: 'tg.emoji', message: `${i + 1}. çıkartma: 1–${TELEGRAM.maxEmojisPerSticker} emoji gerekir.` }]),
    ]),
  );

  const input = (s, key) => ({
    sticker: `attach://${key}`,
    format: 'static',
    emoji_list: s.emojis.slice(0, TELEGRAM.maxEmojisPerSticker),
  });
  const blob = (s) => new Blob([s.bytes], { type: imageInfo(s.bytes).type });

  let exists = false;
  if (o.append) {
    const fd = new FormData();
    fd.append('name', name);
    try {
      await call('getStickerSet', fd);
      exists = true;
    } catch {
      exists = false;
    }
  }

  let rest = o.stickers;
  let created = false;
  if (!exists) {
    const first = o.stickers.slice(0, TELEGRAM.maxInitialStickers);
    rest = o.stickers.slice(first.length);
    const fd = new FormData();
    fd.append('user_id', String(o.userId));
    fd.append('name', name);
    fd.append('title', o.title);
    fd.append('stickers', JSON.stringify(first.map((s, i) => input(s, `s${i}`))));
    first.forEach((s, i) => fd.append(`s${i}`, blob(s), `s${i}.${extension(s.bytes)}`));
    try {
      await call('createNewStickerSet', fd);
    } catch (e) {
      if (/occupied/i.test(e.description)) {
        throw new Error(`Telegram: "${name}" adı kullanımda. Başka bir set adı seç ya da eklemek için --telegram-append kullan.`);
      }
      throw e;
    }
    created = true;
  }
  for (const s of rest) {
    const fd = new FormData();
    fd.append('user_id', String(o.userId));
    fd.append('name', name);
    fd.append('sticker', JSON.stringify(input(s, 's0')));
    fd.append('s0', blob(s), `s0.${extension(s.bytes)}`);
    await call('addStickerToSet', fd);
  }
  return { name, url: `https://t.me/addstickers/${name}`, created, added: o.stickers.length };
}

const extension = (bytes) => (imageInfo(bytes)?.type === 'image/png' ? 'png' : 'webp');

/** Static Telegram sticker: PNG or WEBP, 512 on one side, <= 512 on the other, <= 512 KB. */
export function checkTelegramSticker(bytes, name) {
  const info = imageInfo(bytes);
  if (!info || (info.type !== 'image/webp' && info.type !== 'image/png')) {
    return [{ code: 'tg.format', message: `${name}: PNG ya da WEBP olmalı.` }];
  }
  return checkEncoded(bytes, { type: info.type, width: 512, height: 512, maxBytes: TELEGRAM.stickerMaxBytes, name });
}

/** Exporter plugin for the CLI (and any server-side runner). */
export const telegramPlugin = {
  id: 'telegram',
  label: 'Telegram seti (Bot API)',
  targets: ['cli', 'server'],
  /** settings: { token, userId, shortName, title, emojis, append, dryRun, fetchImpl, apiBase } */
  async run(ctx, s) {
    const emojis = parseEmojis(s.emojis ?? '😀');
    const title = (s.title || 'Çıkartmalarım').trim();
    assertOk(checkTelegramMeta({ title, shortName: s.shortName, botUsername: '', count: ctx.sources.length, emojis }));
    const stickers = await ctx.stickers();
    // Same WebP as the WhatsApp exporter (<= 100 KB is also <= 512 KB), so
    // both exporters share one encode per sticker.
    const encoded = await Promise.all(stickers.map((st, i) => ctx.webp(st, WHATSAPP.stickerMaxBytes, `telegram-${i + 1}.webp`)));
    const files = encoded.map((e, i) => ({ name: `telegram/${String(i + 1).padStart(2, '0')}.webp`, bytes: e.bytes, type: 'image/webp' }));
    assertOk(files.flatMap((x) => checkTelegramSticker(x.bytes, x.name)));
    if (s.dryRun) {
      return {
        files,
        summary: `Kuru çalıştırma: ${files.length} çıkartma Telegram kurallarına uygun; API çağrılmadı.`,
      };
    }
    const r = await publishTelegramPack({
      token: s.token,
      userId: s.userId,
      shortName: s.shortName,
      title,
      append: s.append,
      fetchImpl: s.fetchImpl,
      apiBase: s.apiBase,
      stickers: encoded.map((e) => ({ bytes: e.bytes, emojis })),
    });
    return {
      files,
      summary: `${r.created ? 'Set oluşturuldu' : 'Sete eklendi'}: ${r.name} (${r.added} çıkartma)`,
      links: [{ href: r.url, label: r.url }],
    };
  },
};
