#!/usr/bin/env node
// Sticker maker CLI: same pipeline and exporters as the web page, plus the
// Telegram exporter (bot token only ever read from the environment).

import { parseArgs } from 'node:util';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { nodeEnv, decodeImage } from './node-env.mjs';
import { createExportContext } from '../core/context.js';
import { runExporters } from '../core/exporters.js';
import { checkInputFile, checkWhatsAppZip, checkEncoded, ValidationError } from '../core/validate.js';
import { imageInfo } from '../core/image-info.js';
import { WHATSAPP } from '../core/limits.js';
import { whatsappPlugin } from '../core/plugins/whatsapp.js';
import { pngPlugin } from '../core/plugins/png.js';
import { githubPlugin } from '../core/plugins/github.js';
import { telegramPlugin, checkTelegramSticker } from '../server/telegram.js';

const PLUGINS = { whatsapp: whatsappPlugin, png: pngPlugin, telegram: telegramPlugin, github: githubPlugin };

const HELP = `sticker — görselden çıkartma üretir (WhatsApp ZIP, Telegram seti, PNG, GitHub)

Kullanım:
  sticker make <görsel...> [seçenekler]
  sticker check <dosya.zip|.webp|.png...>

Şekil ve stil:
  --shape square|rounded|cutout   (varsayılan rounded)
  --radius <0..0.5>               köşe yuvarlaklığı, kenarın oranı (0.18)
  --tolerance <0..100>            kesip çıkarmada arka plan toleransı (30)
  --margin <px>                   kenar boşluğu (16)
  --outline <px>  --outline-color <#hex>
  --text "yazı"  --text-color <#hex>  --text-stroke <#hex>
  --text-size <px>  --text-pos top|center|bottom

Dışa aktarma (paralel çalışır):
  --export whatsapp,png,telegram,github   (varsayılan whatsapp,png)
  --out <klasör>                  (varsayılan ./sticker-out)
  --name "Paket adı"  --publisher "Yayıncı"  --emoji "😀"
  --no-fill                       WhatsApp için 3'e tamamlamak üzere varyant ekleme

Telegram (token yalnız ortam değişkeninden: TELEGRAM_BOT_TOKEN):
  --tg-user <sayısal id>  --tg-set <kısa_ad>  --tg-title "Başlık"
  --tg-append                     set varsa ona ekle
  --tg-dry-run                    API çağırmadan doğrula

GitHub (token: GITHUB_TOKEN):
  --repo kullanıcı/depo  --branch <dal>  --dir stickers
`;

function fail(msg) {
  console.error(msg);
  process.exitCode = 1;
}

async function loadSources(paths) {
  const sources = [];
  const issues = [];
  for (const p of paths) {
    const bytes = new Uint8Array(await readFile(p));
    const name = basename(p);
    const found = checkInputFile({ name, size: bytes.length, bytes, type: imageInfo(bytes)?.type });
    if (found.length) { issues.push(...found); continue; }
    try {
      sources.push({ name, image: await decodeImage(bytes) });
    } catch (e) {
      issues.push({ code: 'input.decode', message: `${name}: görsel çözülemedi (${e.message}).` });
    }
  }
  if (issues.length) throw new ValidationError(issues);
  return sources;
}

async function make(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      shape: { type: 'string', default: 'rounded' },
      radius: { type: 'string' },
      tolerance: { type: 'string' },
      margin: { type: 'string' },
      outline: { type: 'string', default: '0' },
      'outline-color': { type: 'string', default: '#ffffff' },
      text: { type: 'string', default: '' },
      'text-color': { type: 'string' },
      'text-stroke': { type: 'string' },
      'text-size': { type: 'string' },
      'text-pos': { type: 'string' },
      export: { type: 'string', default: 'whatsapp,png' },
      out: { type: 'string', default: 'sticker-out' },
      name: { type: 'string', default: 'Çıkartmalarım' },
      publisher: { type: 'string', default: 'sticker-maker' },
      emoji: { type: 'string', default: '😀' },
      'no-fill': { type: 'boolean', default: false },
      'tg-user': { type: 'string', default: process.env.TELEGRAM_USER_ID || '' },
      'tg-set': { type: 'string' },
      'tg-title': { type: 'string' },
      'tg-append': { type: 'boolean', default: false },
      'tg-dry-run': { type: 'boolean', default: false },
      repo: { type: 'string' },
      branch: { type: 'string' },
      dir: { type: 'string', default: 'stickers' },
    },
  });
  if (!positionals.length) return fail('En az bir görsel ver. `sticker --help`');

  const ids = values.export.split(',').map((s) => s.trim()).filter(Boolean);
  const unknown = ids.filter((id) => !PLUGINS[id]);
  if (unknown.length) return fail(`Bilinmeyen dışa aktarıcı: ${unknown.join(', ')} (seçenekler: ${Object.keys(PLUGINS).join(', ')})`);

  const options = {
    shape: values.shape,
    cornerRadius: values.radius,
    tolerance: values.tolerance,
    margin: values.margin,
    outline: { width: values.outline, color: values['outline-color'] },
    text: {
      value: values.text,
      color: values['text-color'],
      stroke: values['text-stroke'],
      size: values['text-size'],
      position: values['text-pos'],
    },
  };
  if (!['square', 'rounded', 'cutout'].includes(values.shape)) return fail('--shape square, rounded ya da cutout olmalı.');

  const sources = await loadSources(positionals);
  const ctx = createExportContext(nodeEnv, sources, options);
  const settings = {
    whatsapp: { name: values.name, publisher: values.publisher, emojis: values.emoji, fill: !values['no-fill'] },
    png: {},
    telegram: {
      token: process.env.TELEGRAM_BOT_TOKEN,
      apiBase: process.env.TELEGRAM_API_BASE,
      userId: values['tg-user'],
      shortName: values['tg-set'] || values.name.normalize('NFKD').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/^(\d)/, 's$1') || 'stickers',
      title: values['tg-title'] || values.name,
      emojis: values.emoji,
      append: values['tg-append'],
      dryRun: values['tg-dry-run'],
    },
    github: {
      token: process.env.GITHUB_TOKEN,
      apiBase: process.env.GITHUB_API_BASE,
      repo: values.repo,
      branch: values.branch,
      dir: values.dir,
    },
  };

  const outDir = resolve(values.out);
  const t0 = Date.now();
  const results = await runExporters(ids.map((id) => PLUGINS[id]), ctx, settings, (id, state) => {
    if (state === 'running') console.log(`… ${PLUGINS[id].label}`);
  });

  for (const r of results) {
    console.log(`\n${r.ok ? '✔' : '✘'} ${r.label} (${r.ms} ms)`);
    if (!r.ok) {
      for (const i of r.issues) console.log(`   hata: ${i.message}`);
      process.exitCode = 1;
      continue;
    }
    console.log(`   ${r.summary}`);
    for (const n of r.notes || []) console.log(`   not: ${n}`);
    for (const f of r.files) {
      const target = join(outDir, f.name);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, f.bytes);
      console.log(`   → ${target} (${(f.bytes.length / 1024).toFixed(1)} KB)`);
    }
    for (const l of r.links || []) console.log(`   ↗ ${l.href}`);
  }
  console.log(`\nToplam ${Date.now() - t0} ms.`);
}

async function check(paths) {
  if (!paths.length) return fail('Kontrol edilecek dosya ver.');
  for (const p of paths) {
    const bytes = new Uint8Array(await readFile(p));
    let issues;
    let label;
    if (p.endsWith('.zip') || p.endsWith('.wastickers')) {
      const r = checkWhatsAppZip(bytes);
      issues = r.issues;
      label = r.pack ? `WhatsApp paketi "${r.pack.name}", ${r.pack.stickers.length} çıkartma` : 'WhatsApp paketi';
    } else {
      const info = imageInfo(bytes);
      label = info ? `${info.type} ${info.width}×${info.height}, ${(bytes.length / 1024).toFixed(1)} KB` : 'bilinmeyen biçim';
      issues =
        info?.type === 'image/webp'
          ? [
              ...checkEncoded(bytes, { type: 'image/webp', width: 512, height: 512, maxBytes: WHATSAPP.stickerMaxBytes, name: 'WhatsApp' }),
              ...checkTelegramSticker(bytes, 'Telegram'),
            ]
          : info?.type === 'image/png'
            ? checkTelegramSticker(bytes, 'Telegram / PNG')
            : [{ message: 'PNG, WebP ya da ZIP bekleniyor.' }];
    }
    console.log(`${issues.length ? '✘' : '✔'} ${p}: ${label}`);
    for (const i of issues) console.log(`   ${i.message}`);
    if (issues.length) process.exitCode = 1;
  }
}

const [cmd, ...rest] = process.argv.slice(2);
try {
  if (!cmd || cmd === '--help' || cmd === '-h' || cmd === 'help') console.log(HELP);
  else if (cmd === 'make') await make(rest);
  else if (cmd === 'check') await check(rest);
  else fail(`Bilinmeyen komut: ${cmd}\n\n${HELP}`);
} catch (e) {
  if (e instanceof ValidationError) for (const i of e.issues) console.error(`hata: ${i.message}`);
  else console.error(`hata: ${e.message}`);
  process.exitCode = 1;
}
