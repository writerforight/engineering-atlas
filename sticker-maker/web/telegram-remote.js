// Web-side Telegram exporter: sends the already-validated WebP stickers to
// the user's own server function (server/telegram-function.js), which holds
// the bot token. The page itself never sees a token.

import { WHATSAPP } from '../core/limits.js';
import { toBase64 } from '../core/github.js';
import { ValidationError } from '../core/validate.js';

export const telegramRemotePlugin = {
  id: 'telegram',
  label: 'Telegram seti (sunucu fonksiyonu)',
  targets: ['web'],
  /** settings: { url, userId, shortName, title, emojis, key? } */
  async run(ctx, s) {
    const issues = [];
    if (!/^https:\/\//.test(s.url || '')) {
      issues.push({ code: 'tg.url', message: 'Sunucu fonksiyonu adresi yok. Telegram için ya komut satırını kullan (komut yukarıda) ya da server/telegram-function.js dosyasını yayınlayıp adresini gir.' });
    }
    if (!/^\d+$/.test(s.userId || '')) issues.push({ code: 'tg.user', message: 'Telegram kullanıcı kimliği (sayı) gerekli.' });
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(s.shortName || '')) issues.push({ code: 'tg.name', message: 'Set kısa adı harfle başlamalı; harf, rakam ve _ içerebilir.' });
    if (issues.length) throw new ValidationError(issues);

    const stickers = await ctx.stickers();
    const encoded = await Promise.all(stickers.map((st, i) => ctx.webp(st, WHATSAPP.stickerMaxBytes, `telegram-${i + 1}.webp`)));
    const res = await fetch(s.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(s.key ? { 'X-Sticker-Key': s.key } : {}) },
      body: JSON.stringify({
        userId: s.userId,
        shortName: s.shortName,
        title: s.title,
        emojis: s.emojis,
        stickers: encoded.map((e) => toBase64(e.bytes)),
      }),
    });
    let json = {};
    try {
      json = await res.json();
    } catch {
      /* not JSON */
    }
    if (!res.ok || !json.ok) {
      throw new ValidationError((json.errors || [`Sunucu fonksiyonu HTTP ${res.status} döndü.`]).map((m) => ({ code: 'tg.remote', message: m })));
    }
    return { files: [], summary: `Set hazır: ${json.name} (${json.added} çıkartma)`, links: [{ href: json.url, label: json.url }] };
  },
};
