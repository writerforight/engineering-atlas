// Web UI: wires the shared core (pipeline, validators, exporter plugins) to
// the page. No framework, no build step; ES modules only.

import { browserEnv, decodeFile, sampleImage } from './browser-env.js';
import { renderSticker, normalizeOptions, encodeWebpUnder, resizeCanvas } from '../core/pipeline.js';
import { createExportContext } from '../core/context.js';
import { runExporters, parseEmojis } from '../core/exporters.js';
import { checkInputFile, ValidationError } from '../core/validate.js';
import { imageInfo } from '../core/image-info.js';
import { WHATSAPP } from '../core/limits.js';
import { whatsappPlugin } from '../core/plugins/whatsapp.js';
import { pngPlugin } from '../core/plugins/png.js';
import { githubPlugin } from '../core/plugins/github.js';
import { telegramRemotePlugin } from './telegram-remote.js';

const $ = (id) => document.getElementById(id);
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
const el = (tag, props = {}, ...children) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') e.className = v;
    else if (k in e) e[k] = v;
    else e.setAttribute(k, v);
  }
  for (const c of children) if (c != null) e.append(c);
  return e;
};
const store = {
  get(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch { /* storage blocked */ } },
};

const state = {
  sources: [], // { id, name, image, bytes?: number, isSample }
  selected: 0,
  previewSeq: 0,
};
let nextId = 1;

// ---------------------------------------------------------------- options

function readOptions() {
  return normalizeOptions({
    shape: document.querySelector('input[name="shape"]:checked').value,
    cornerRadius: $('radius').value,
    tolerance: $('tolerance').value,
    margin: $('margin').value,
    outline: { width: $('outline').value, color: $('outline-color').value },
    text: {
      value: $('text').value,
      color: $('text-color').value,
      stroke: $('text-stroke').value,
      size: $('text-size').value,
      position: $('text-pos').value,
    },
  });
}

function syncOutputs() {
  const o = readOptions();
  $('radius-out').value = `${Math.round(o.cornerRadius * 100)} %`;
  $('tolerance-out').value = String(o.tolerance);
  $('margin-out').value = `${o.margin} px`;
  $('outline-out').value = `${o.outline.width} px`;
  $('text-size-out').value = `${o.text.size} px`;
  $('row-radius').hidden = o.shape !== 'rounded';
  $('row-tolerance').hidden = o.shape !== 'cutout';
  $('cutout-hint').hidden = o.shape !== 'cutout';
}

// ---------------------------------------------------------------- sources

async function addFiles(fileList) {
  const files = [...fileList];
  if (!files.length) return;
  const issues = [];
  const added = [];
  for (const f of files) {
    const head = new Uint8Array(await f.slice(0, 64 * 1024).arrayBuffer());
    const found = checkInputFile({ name: f.name, size: f.size, type: imageInfo(head)?.type || f.type, bytes: head });
    if (found.length) { issues.push(...found); continue; }
    try {
      added.push({ id: nextId++, name: f.name || 'yapistirilan.png', image: await decodeFile(f), bytes: f.size });
    } catch {
      issues.push({ message: `${f.name}: görsel çözülemedi (bozuk dosya ya da desteklenmeyen biçim, ör. HEIC).` });
    }
  }
  if (added.length) {
    state.sources = state.sources.filter((s) => !s.isSample);
    const room = WHATSAPP.maxStickers - state.sources.length;
    if (added.length > room) issues.push({ message: `En fazla ${WHATSAPP.maxStickers} görsel; ${added.length - Math.max(room, 0)} tanesi eklenmedi.` });
    state.sources.push(...added.slice(0, Math.max(room, 0)));
    state.selected = Math.max(0, state.sources.length - Math.min(added.length, Math.max(room, 0)));
  }
  showInputErrors(issues);
  renderSources();
  schedulePreview();
}

function showInputErrors(issues) {
  const old = document.querySelector('#h-upload ~ .errors');
  old?.remove();
  if (!issues.length) return;
  $('sources').before(el('ul', { class: 'errors', role: 'alert' }, ...issues.map((i) => el('li', {}, i.message))));
}

function thumb(image) {
  const c = browserEnv.createCanvas(128, 128);
  const ctx = c.getContext('2d');
  const w = image.width, h = image.height, s = Math.min(w, h);
  ctx.drawImage(image, (w - s) / 2, (h - s) / 2, s, s, 0, 0, 128, 128);
  c.style.width = '100%';
  c.style.height = '100%';
  c.style.display = 'block';
  return c;
}

function renderSources() {
  const ul = $('sources');
  ul.replaceChildren(
    ...state.sources.map((s, i) => {
      const b = el('button', { type: 'button', class: 'thumb', title: s.name, 'aria-pressed': String(i === state.selected), 'aria-label': `${s.name} önizle` }, thumb(s.image));
      b.addEventListener('click', () => { state.selected = i; renderSources(); schedulePreview(); });
      const rm = el('button', { type: 'button', class: 'rm', 'aria-label': `${s.name} kaldır`, title: 'Kaldır' }, '×');
      rm.addEventListener('click', () => {
        state.sources.splice(i, 1);
        state.selected = Math.min(state.selected, Math.max(0, state.sources.length - 1));
        renderSources();
        schedulePreview();
      });
      return el('li', {}, b, rm);
    }),
  );
  $('sample-note').hidden = !state.sources.some((s) => s.isSample);
  updateTelegramCommand();
}

// ---------------------------------------------------------------- preview

let previewQueued = false;
function schedulePreview() {
  syncOutputs();
  if (previewQueued) return;
  previewQueued = true;
  requestAnimationFrame(() => { previewQueued = false; renderPreview(); });
}

let checkTimer = 0;
function renderPreview() {
  const canvas = $('preview');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 512, 512);
  const src = state.sources[state.selected];
  const checks = $('checks');
  const notes = $('notes');
  if (!src) {
    checks.replaceChildren(el('li', { class: 'bad' }, 'Henüz görsel yok. Yukarıdan bir görsel yükle.'));
    notes.replaceChildren();
    return;
  }
  let result;
  try {
    result = renderSticker(browserEnv, src.image, readOptions(), src.name);
  } catch (e) {
    const msgs = e instanceof ValidationError ? e.issues.map((i) => i.message) : [e.message];
    checks.replaceChildren(...msgs.map((m) => el('li', { class: 'bad' }, m)));
    notes.replaceChildren();
    return;
  }
  ctx.drawImage(result.canvas, 0, 0);
  notes.replaceChildren(...result.notes.map((n) => el('li', {}, n)));

  const n = state.sources.length;
  const fill = $('wa-fill').checked;
  const packLine = n >= WHATSAPP.minStickers
    ? el('li', {}, `Paket: ${n} görsel (WhatsApp 3–30 ister)`)
    : el('li', { class: fill ? '' : 'bad' }, fill
      ? `Paket: ${n} görsel, ${WHATSAPP.minStickers - n} varyantla 3'e tamamlanacak`
      : `Paket: ${n} görsel; WhatsApp en az 3 ister`);
  const inputLine = el('li', {}, `Giriş: ${src.name} · ${src.image.width}×${src.image.height}${src.bytes ? ` · ${kb(src.bytes)}` : ''}`);
  const sizeLine = el('li', {}, 'Çıktı: 512×512, saydam arka plan');
  const webpLine = el('li', { class: 'wait' }, 'WhatsApp WebP ≤ 100 KB: ölçülüyor…');
  const trayLine = el('li', { class: 'wait' }, 'Tepsi simgesi 96×96 PNG ≤ 50 KB: ölçülüyor…');
  checks.replaceChildren(inputLine, sizeLine, webpLine, trayLine, packLine);

  // Encoding is the slow part; do it once the controls settle.
  const seq = ++state.previewSeq;
  clearTimeout(checkTimer);
  checkTimer = setTimeout(async () => {
    try {
      const { bytes, quality } = await encodeWebpUnder(browserEnv, result.canvas, WHATSAPP.stickerMaxBytes);
      if (seq !== state.previewSeq) return;
      webpLine.className = '';
      webpLine.textContent = `WhatsApp WebP: ${kb(bytes.length)} ≤ 100 KB (kalite ${quality}, kodlayıcı: ${browserEnv.webpEncoder})`;
    } catch (e) {
      if (seq !== state.previewSeq) return;
      webpLine.className = 'bad';
      webpLine.textContent = e instanceof ValidationError ? e.issues[0].message : e.message;
    }
    try {
      const tray = await browserEnv.encode(resizeCanvas(browserEnv, result.canvas, 96, 96), 'image/png');
      if (seq !== state.previewSeq) return;
      const ok = tray.length <= WHATSAPP.trayMaxBytes;
      trayLine.className = ok ? '' : 'bad';
      trayLine.textContent = `Tepsi simgesi 96×96 PNG: ${kb(tray.length)} ${ok ? '≤' : '>'} 50 KB`;
    } catch (e) {
      trayLine.className = 'bad';
      trayLine.textContent = e.message;
    }
  }, 250);
}

// ---------------------------------------------------------------- export

const PLUGINS = { whatsapp: whatsappPlugin, png: pngPlugin, github: githubPlugin, telegram: telegramRemotePlugin };

function settings() {
  return {
    whatsapp: { name: $('wa-name').value, publisher: $('wa-publisher').value, emojis: $('wa-emoji').value, fill: $('wa-fill').checked },
    github: { token: $('gh-token').value.trim(), repo: $('gh-repo').value.trim(), branch: $('gh-branch').value.trim(), dir: $('gh-dir').value },
    telegram: {
      url: $('tg-url').value.trim(),
      userId: $('tg-user').value.trim(),
      shortName: $('tg-set').value.trim(),
      title: $('wa-name').value.trim(),
      emojis: $('wa-emoji').value,
    },
  };
}

async function saveFile(file) {
  const blob = new Blob([file.bytes], { type: file.type });
  const filename = file.name.split('/').pop();
  // Inside a claude.ai artifact, files go through the viewer's save prompt.
  if (typeof window.claude?.use === 'function') {
    const downloads = await window.claude.use('downloads');
    if (downloads) {
      try {
        await downloads.save({ filename, data: blob });
      } catch (e) {
        if (e?.code !== 'declined') throw new Error(e?.message || 'Dosya kaydedilemedi.');
      }
      return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function resultCard(plugin) {
  const card = el('article', { class: 'result run' }, el('h3', {}, plugin.label, el('span', {}, 'çalışıyor…')));
  return card;
}

function fillCard(card, r) {
  card.className = `result ${r.ok ? 'ok' : 'fail'}`;
  card.replaceChildren(el('h3', {}, r.label, el('span', {}, `${r.ok ? 'tamam' : 'hata'} · ${r.ms} ms`)));
  if (!r.ok) {
    card.append(el('ul', { class: 'err' }, ...r.issues.map((i) => el('li', {}, i.message))));
    return;
  }
  if (r.summary) card.append(el('p', {}, r.summary));
  if (r.files.length) {
    const box = el('div', { class: 'files' });
    for (const f of r.files) {
      const b = el('button', { type: 'button', class: 'ghost' }, `İndir: ${f.name.split('/').pop()} (${kb(f.bytes.length)})`);
      b.addEventListener('click', () => saveFile(f).catch((e) => card.append(el('ul', { class: 'err' }, el('li', {}, e.message)))));
      box.append(b);
    }
    card.append(box);
  }
  for (const l of r.links || []) card.append(el('p', {}, el('a', { href: l.href, target: '_blank', rel: 'noopener' }, l.label)));
  if (r.notes?.length) card.append(el('ul', { class: 'note' }, ...r.notes.map((n) => el('li', {}, n))));
}

async function doExport() {
  const ids = Object.keys(PLUGINS).filter((id) => $(`x-${id}`).checked);
  const results = $('results');
  if (!ids.length) {
    results.replaceChildren(el('ul', { class: 'errors', role: 'alert' }, el('li', {}, 'En az bir dışa aktarma seç.')));
    return;
  }
  if (!state.sources.length) {
    results.replaceChildren(el('ul', { class: 'errors', role: 'alert' }, el('li', {}, 'Önce bir görsel yükle.')));
    return;
  }
  rememberToken();
  const btn = $('export');
  btn.disabled = true;
  const cards = Object.fromEntries(ids.map((id) => [id, resultCard(PLUGINS[id])]));
  results.replaceChildren(...Object.values(cards));
  try {
    const ctx = createExportContext(browserEnv, state.sources.map((s) => ({ name: s.name, image: s.image })), readOptions());
    const out = await runExporters(ids.map((id) => PLUGINS[id]), ctx, settings());
    for (const r of out) fillCard(cards[r.id], r);
    // One file and nothing else to choose: start the save right away.
    const ready = out.filter((r) => r.ok && r.files.length);
    if (ready.length === 1 && ready[0].files.length === 1) saveFile(ready[0].files[0]).catch(() => {});
  } finally {
    btn.disabled = false;
  }
}

// ---------------------------------------------------------------- Telegram / GitHub helpers

function updateTelegramCommand() {
  const s = settings().telegram;
  const names = state.sources.filter((x) => !x.isSample).map((x) => `"${x.name}"`);
  const o = readOptions();
  const parts = [
    'TELEGRAM_BOT_TOKEN=… node sticker-maker/cli/sticker.mjs make',
    names.length ? names.join(' ') : 'gorsel.jpg',
    `--shape ${o.shape}`,
    o.outline.width ? `--outline ${o.outline.width} --outline-color "${o.outline.color}"` : '',
    o.text.value ? `--text "${o.text.value.replace(/"/g, '\\"')}" --text-pos ${o.text.position}` : '',
    '--export whatsapp,telegram',
    `--name "${$('wa-name').value.replace(/"/g, '\\"')}"`,
    `--emoji "${parseEmojis($('wa-emoji').value).join('') || '😀'}"`,
    `--tg-user ${s.userId || '<kimlik>'}`,
    `--tg-set ${s.shortName || '<set_adi>'}`,
  ];
  $('tg-cmd').textContent = parts.filter(Boolean).join(' ');
}

function rememberToken() {
  store.set('sticker-gh-token', $('gh-remember').checked ? $('gh-token').value : null);
}

// ---------------------------------------------------------------- boot

async function boot() {
  // Prefill from the URL so the tool can be linked from any repo:
  //   …/sticker-maker/?repo=user/site&branch=main&dir=assets/stickers&tg=https://fn.example/telegram
  const q = new URLSearchParams(location.search);
  if (q.get('repo')) { $('gh-repo').value = q.get('repo'); $('x-github').checked = true; }
  if (q.get('branch')) $('gh-branch').value = q.get('branch');
  if (q.get('dir')) $('gh-dir').value = q.get('dir');
  if (q.get('tg')) { $('tg-url').value = q.get('tg'); $('x-telegram').checked = true; }
  const saved = store.get('sticker-gh-token');
  if (saved) { $('gh-token').value = saved; $('gh-remember').checked = true; }

  for (const id of ['radius', 'tolerance', 'margin', 'outline', 'outline-color', 'text', 'text-size', 'text-pos', 'text-color', 'text-stroke', 'wa-fill']) {
    $(id).addEventListener('input', () => { schedulePreview(); updateTelegramCommand(); });
  }
  for (const r of document.querySelectorAll('input[name="shape"]')) r.addEventListener('change', () => { schedulePreview(); updateTelegramCommand(); });
  for (const r of document.querySelectorAll('input[name="bg"]')) r.addEventListener('change', () => { $('stage').dataset.bg = r.value; });
  for (const id of ['tg-user', 'tg-set', 'wa-name', 'wa-emoji']) $(id).addEventListener('input', updateTelegramCommand);
  $('gh-remember').addEventListener('change', rememberToken);

  $('file').addEventListener('change', (e) => { addFiles(e.target.files); e.target.value = ''; });
  const drop = $('drop');
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); addFiles(e.dataTransfer.files); });
  window.addEventListener('paste', (e) => {
    const files = [...(e.clipboardData?.files || [])].filter((f) => f.type.startsWith('image/'));
    if (files.length) { e.preventDefault(); addFiles(files); }
  });
  $('export').addEventListener('click', doExport);
  $('tg-copy').addEventListener('click', async () => {
    const text = $('tg-cmd').textContent;
    try {
      await navigator.clipboard.writeText(text);
      $('tg-copy').textContent = 'Kopyalandı';
    } catch {
      getSelection().selectAllChildren($('tg-cmd'));
      $('tg-copy').textContent = 'Seçildi, Ctrl+C';
    }
    setTimeout(() => { $('tg-copy').textContent = 'Kopyala'; }, 1600);
  });

  state.sources = [{ id: nextId++, name: 'ornek.png', image: await sampleImage(), isSample: true }];
  // Open in a working state: the sample as a cut-out with a white outline.
  $('shape-cutout').checked = true;
  $('outline').value = '10';
  $('text').value = 'Merhaba!';
  renderSources();
  schedulePreview();
}

boot();
