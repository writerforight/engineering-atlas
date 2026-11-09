// WhatsApp exporter: 3-30 WebP stickers (512x512, <= 100 KB), a 96x96 PNG tray
// icon (<= 50 KB) and metadata, packed into one ZIP.
//
// ZIP layout (works with the official sample app's contents.json and with
// ".wastickers" importers, which read title.txt / author.txt):
//   contents.json  title.txt  author.txt  tray.png  01.webp  02.webp ...

import { WHATSAPP } from '../limits.js';
import { checkWhatsAppMeta, checkEncoded, checkWhatsAppZip, assertOk } from '../validate.js';
import { createZip, utf8 } from '../zip.js';
import { slugify, parseEmojis } from '../exporters.js';

export const whatsappPlugin = {
  id: 'whatsapp',
  label: 'WhatsApp paketi (ZIP)',
  targets: ['web', 'cli'],

  /**
   * settings: { name, publisher, identifier?, emojis?: string, fill?: boolean }
   */
  async run(ctx, settings) {
    const name = (settings.name || 'Çıkartmalarım').trim();
    const publisher = (settings.publisher || 'sticker-maker').trim();
    const identifier = settings.identifier || slugify(name, 'pack');
    const emojis = parseEmojis(settings.emojis ?? '😀');
    const fill = settings.fill !== false;

    // Cheap checks first, before any rendering or encoding.
    const planned = fill ? Math.max(ctx.sources.length, WHATSAPP.minStickers) : ctx.sources.length;
    assertOk(checkWhatsAppMeta({ name, publisher, identifier, count: Math.min(planned, WHATSAPP.maxStickers), emojis }));
    if (ctx.sources.length > WHATSAPP.maxStickers) {
      assertOk([{ code: 'wa.count', message: `WhatsApp paketi en fazla ${WHATSAPP.maxStickers} çıkartma alır, ${ctx.sources.length} görsel var.` }]);
    }

    const stickers = fill
      ? await ctx.stickersWithFill(WHATSAPP.minStickers, WHATSAPP.maxStickers)
      : await ctx.stickers();
    assertOk(checkWhatsAppMeta({ name, publisher, identifier, count: stickers.length, emojis }));

    const names = stickers.map((_, i) => `${String(i + 1).padStart(2, '0')}.webp`);
    const encoded = await Promise.all(stickers.map((s, i) => ctx.webp(s, WHATSAPP.stickerMaxBytes, names[i])));
    const tray = await ctx.iconPng(stickers[0], WHATSAPP.traySide);

    const issues = [
      ...encoded.flatMap((e, i) =>
        checkEncoded(e.bytes, { type: 'image/webp', width: 512, height: 512, maxBytes: WHATSAPP.stickerMaxBytes, name: names[i] }),
      ),
      ...checkEncoded(tray, { type: 'image/png', width: WHATSAPP.traySide, height: WHATSAPP.traySide, maxBytes: WHATSAPP.trayMaxBytes, name: 'tray.png' }),
    ];
    assertOk(issues);

    const contents = {
      android_play_store_link: '',
      ios_app_store_link: '',
      sticker_packs: [
        {
          identifier,
          name,
          publisher,
          tray_image_file: 'tray.png',
          image_data_version: '1',
          avoid_cache: false,
          animated_sticker_pack: false,
          publisher_email: '',
          publisher_website: '',
          privacy_policy_website: '',
          license_agreement_website: '',
          stickers: names.map((image_file) => ({ image_file, emojis: emojis.slice(0, WHATSAPP.maxEmojisPerSticker) })),
        },
      ],
    };

    const zip = createZip([
      { name: 'contents.json', bytes: utf8(JSON.stringify(contents, null, 2)) },
      { name: 'title.txt', bytes: utf8(name) },
      { name: 'author.txt', bytes: utf8(publisher) },
      { name: 'tray.png', bytes: tray },
      ...encoded.map((e, i) => ({ name: names[i], bytes: e.bytes })),
    ]);

    // Validate the finished archive exactly as a consumer would read it.
    assertOk(checkWhatsAppZip(zip).issues);

    const variants = stickers.filter((s) => s.variant).length;
    const notes = [...new Set(stickers.flatMap((s) => s.notes))];
    if (variants) notes.unshift(`En az ${WHATSAPP.minStickers} çıkartma gerektiği için ${variants} varyant (başka şekil / kenarlık) eklendi.`);
    const sizes = encoded.map((e) => e.bytes.length);
    return {
      files: [{ name: `${identifier}.zip`, bytes: zip, type: 'application/zip' }],
      summary: `${stickers.length} çıkartma · en büyük WebP ${(Math.max(...sizes) / 1024).toFixed(1)} KB · tepsi ${(tray.length / 1024).toFixed(1)} KB · ZIP ${(zip.length / 1024).toFixed(1)} KB`,
      notes,
      previews: stickers.map((s, i) => ({ name: names[i], canvas: s.canvas })),
    };
  },
};
