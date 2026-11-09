// Checks run before (input) and after (output bytes) every export.
// Messages are user-facing, so they are Turkish; codes are stable English ids.

import { imageInfo } from './image-info.js';
import { INPUT, WHATSAPP, TELEGRAM } from './limits.js';
import { readZip } from './zip.js';

export class ValidationError extends Error {
  /** @param {Issue[]} issues */
  constructor(issues) {
    super(issues.map((i) => i.message).join('\n'));
    this.name = 'ValidationError';
    this.issues = issues;
  }
}

/** @typedef {{ code: string, message: string, file?: string }} Issue */

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
const issue = (code, message, file) => (file ? { code, message: `${file}: ${message}`, file } : { code, message });

/** Throw if any issue is present. */
export function assertOk(issues) {
  if (issues.length) throw new ValidationError(issues);
}

/**
 * Input file, before decoding. `bytes` is optional (browser has File.type).
 * @param {{ name?: string, type?: string, size: number, bytes?: Uint8Array }} file
 */
export function checkInputFile(file) {
  const out = [];
  const name = file.name || 'görsel';
  const sniffed = file.bytes ? imageInfo(file.bytes) : null;
  const type = sniffed?.type || file.type || '';
  if (!INPUT.types.includes(type)) {
    out.push(issue('input.format', `desteklenmeyen biçim (${type || 'bilinmiyor'}). PNG, JPEG, WebP, GIF veya BMP yükle.`, name));
  }
  if (file.size > INPUT.maxBytes) {
    out.push(issue('input.weight', `dosya çok büyük: ${kb(file.size)} (sınır ${kb(INPUT.maxBytes)}).`, name));
  }
  if (file.size === 0) out.push(issue('input.empty', 'dosya boş.', name));
  return out;
}

/** Decoded input dimensions. */
export function checkInputSize(width, height, name = 'görsel') {
  const out = [];
  if (!(width > 0 && height > 0)) out.push(issue('input.decode', 'görsel çözülemedi.', name));
  else {
    if (Math.min(width, height) < INPUT.minSide) {
      out.push(issue('input.small', `çok küçük: ${width}×${height} (en kısa kenar en az ${INPUT.minSide} px).`, name));
    }
    if (Math.max(width, height) > INPUT.maxSide) {
      out.push(issue('input.large', `çok büyük: ${width}×${height} (en uzun kenar en fazla ${INPUT.maxSide} px).`, name));
    }
  }
  return out;
}

/** Exact format, dimensions and weight of an encoded file. */
export function checkEncoded(bytes, { type, width, height, maxBytes, name, allowAnimated = false }) {
  const out = [];
  const info = imageInfo(bytes);
  if (!info) return [issue('out.format', `okunamayan dosya (beklenen ${type}).`, name)];
  if (info.type !== type) out.push(issue('out.format', `biçim ${info.type}, beklenen ${type}.`, name));
  if (info.width !== width || info.height !== height) {
    out.push(issue('out.size', `boyut ${info.width}×${info.height}, beklenen ${width}×${height}.`, name));
  }
  if (bytes.length > maxBytes) out.push(issue('out.weight', `dosya ${kb(bytes.length)}, sınır ${kb(maxBytes)}.`, name));
  if (!allowAnimated && info.animated) out.push(issue('out.animated', 'hareketli olmamalı.', name));
  return out;
}

const emojiCount = (list) => (Array.isArray(list) ? list.length : 0);

/**
 * WhatsApp pack metadata + count, before encoding.
 * @param {{ name: string, publisher: string, identifier: string, count: number, emojis: string[] }} meta
 */
export function checkWhatsAppMeta(meta) {
  const out = [];
  const name = (meta.name || '').trim();
  const publisher = (meta.publisher || '').trim();
  if (!name) out.push(issue('wa.name', 'Paket adı boş olamaz.'));
  if (name.length > WHATSAPP.maxNameLength) out.push(issue('wa.name', `Paket adı en fazla ${WHATSAPP.maxNameLength} karakter.`));
  if (!publisher) out.push(issue('wa.publisher', 'Yayıncı adı boş olamaz.'));
  if (publisher.length > WHATSAPP.maxPublisherLength) out.push(issue('wa.publisher', `Yayıncı adı en fazla ${WHATSAPP.maxPublisherLength} karakter.`));
  if (!WHATSAPP.identifierPattern.test(meta.identifier || '')) {
    out.push(issue('wa.identifier', 'Paket kimliği yalnız harf, rakam, _ . - içerebilir.'));
  }
  if (meta.count < WHATSAPP.minStickers || meta.count > WHATSAPP.maxStickers) {
    out.push(issue('wa.count', `WhatsApp paketi ${WHATSAPP.minStickers}–${WHATSAPP.maxStickers} çıkartma ister, şu an ${meta.count}.`));
  }
  const n = emojiCount(meta.emojis);
  if (n > WHATSAPP.maxEmojisPerSticker) out.push(issue('wa.emoji', `Çıkartma başına en fazla ${WHATSAPP.maxEmojisPerSticker} emoji.`));
  return out;
}

/** Telegram set metadata, before any network call. */
export function checkTelegramMeta({ title, shortName, botUsername, count, emojis }) {
  const out = [];
  if (!title || title.length > TELEGRAM.maxTitleLength) out.push(issue('tg.title', `Başlık 1–${TELEGRAM.maxTitleLength} karakter olmalı.`));
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(shortName || '') || /__/.test(shortName)) {
    out.push(issue('tg.name', 'Set adı harfle başlamalı; yalnız harf, rakam ve tek _ içerebilir.'));
  }
  const full = botUsername ? `${shortName}_by_${botUsername}` : shortName;
  if ((full || '').length > TELEGRAM.maxNameLength) out.push(issue('tg.name', `Tam set adı (${full}) en fazla ${TELEGRAM.maxNameLength} karakter.`));
  if (count < 1 || count > TELEGRAM.maxStickers) out.push(issue('tg.count', `Telegram seti 1–${TELEGRAM.maxStickers} çıkartma alır, şu an ${count}.`));
  const n = emojiCount(emojis);
  if (n < 1 || n > TELEGRAM.maxEmojisPerSticker) out.push(issue('tg.emoji', `Çıkartma başına 1–${TELEGRAM.maxEmojisPerSticker} emoji gerekir.`));
  return out;
}

/**
 * Validate a finished WhatsApp ZIP end to end: entries, CRCs, contents.json,
 * tray icon and every sticker's format, size and weight.
 * @returns {{ issues: Issue[], pack: any }}
 */
export function checkWhatsAppZip(zipBytes) {
  const out = [];
  let entries;
  try {
    entries = readZip(zipBytes);
  } catch (e) {
    return { issues: [issue('zip.read', `ZIP okunamadı: ${e.message}`)], pack: null };
  }
  const byName = new Map(entries.map((e) => [e.name, e]));
  for (const e of entries) {
    if (e.crcOk === false) out.push(issue('zip.crc', 'CRC uyuşmuyor.', e.name));
    if (e.bytes === null) out.push(issue('zip.method', 'sıkıştırılmış giriş okunamadı.', e.name));
  }
  const contents = byName.get('contents.json');
  if (!contents?.bytes) return { issues: [...out, issue('zip.contents', 'contents.json yok.')], pack: null };
  let json;
  try {
    json = JSON.parse(new TextDecoder().decode(contents.bytes));
  } catch {
    return { issues: [...out, issue('zip.contents', 'contents.json geçerli JSON değil.')], pack: null };
  }
  const pack = json?.sticker_packs?.[0];
  if (!pack) return { issues: [...out, issue('zip.contents', 'sticker_packs boş.')], pack: null };

  out.push(
    ...checkWhatsAppMeta({
      name: pack.name,
      publisher: pack.publisher,
      identifier: pack.identifier,
      count: pack.stickers?.length ?? 0,
      emojis: [],
    }),
  );

  const tray = byName.get(pack.tray_image_file);
  if (!tray?.bytes) out.push(issue('wa.tray', `tepsi simgesi ${pack.tray_image_file} ZIP'te yok.`));
  else {
    out.push(
      ...checkEncoded(tray.bytes, {
        type: 'image/png',
        width: WHATSAPP.traySide,
        height: WHATSAPP.traySide,
        maxBytes: WHATSAPP.trayMaxBytes,
        name: pack.tray_image_file,
      }),
    );
  }

  for (const s of pack.stickers ?? []) {
    const e = byName.get(s.image_file);
    if (!e?.bytes) { out.push(issue('wa.sticker', 'ZIP\'te yok.', s.image_file)); continue; }
    out.push(
      ...checkEncoded(e.bytes, {
        type: 'image/webp',
        width: WHATSAPP.stickerSide,
        height: WHATSAPP.stickerSide,
        maxBytes: WHATSAPP.stickerMaxBytes,
        name: s.image_file,
      }),
    );
    if ((s.emojis?.length ?? 0) > WHATSAPP.maxEmojisPerSticker) out.push(issue('wa.emoji', 'en fazla 3 emoji.', s.image_file));
  }
  return { issues: out, pack };
}
