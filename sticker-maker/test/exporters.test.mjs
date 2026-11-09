// Full pipeline + exporters on the Node canvas, with mocked Telegram / GitHub.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { nodeEnv, decodeImage } from '../cli/node-env.mjs';
import { createExportContext } from '../core/context.js';
import { runExporters } from '../core/exporters.js';
import { renderSticker } from '../core/pipeline.js';
import { checkWhatsAppZip } from '../core/validate.js';
import { readZip } from '../core/zip.js';
import { imageInfo } from '../core/image-info.js';
import { whatsappPlugin } from '../core/plugins/whatsapp.js';
import { pngPlugin } from '../core/plugins/png.js';
import { githubPlugin } from '../core/plugins/github.js';
import { telegramPlugin } from '../server/telegram.js';
import { handleTelegramRequest } from '../server/telegram-function.js';

const fixture = new URL('./fixtures/face.jpg', import.meta.url);
const load = async () => [{ name: 'face.jpg', image: await decodeImage(await readFile(fixture)) }];

test('every shape renders a 512x512 transparent sticker', async () => {
  const [src] = await load();
  for (const shape of ['square', 'rounded', 'cutout']) {
    const { canvas } = renderSticker(nodeEnv, src.image, { shape, outline: { width: 8 }, text: { value: 'Merhaba dünya, nasılsın?' } });
    assert.equal(canvas.width, 512);
    assert.equal(canvas.height, 512);
    const px = canvas.getContext('2d').getImageData(0, 0, 512, 512).data;
    assert.equal(px[3], 0, `${shape}: corner must be transparent`);
    assert.equal(px[(256 * 512 + 256) * 4 + 3], 255, `${shape}: centre must be opaque`);
  }
});

test('one image -> valid WhatsApp ZIP (3 stickers, tray, metadata) + PNG + Telegram, in parallel', async () => {
  const ctx = createExportContext(nodeEnv, await load(), { shape: 'cutout', outline: { width: 10 } });
  const calls = [];
  const fakeTelegram = async (url, init) => {
    const method = url.split('/').pop();
    calls.push({ url, method, form: init.body });
    if (method === 'getMe') return Response.json({ ok: true, result: { username: 'demo_bot' } });
    return Response.json({ ok: true, result: true });
  };
  const results = await runExporters([whatsappPlugin, pngPlugin, telegramPlugin], ctx, {
    whatsapp: { name: 'Test Paketi', publisher: 'Ben', emojis: '😀 🎉' },
    telegram: { token: '123:abc', userId: '42', shortName: 'test_pack', title: 'Test', emojis: '😀', fetchImpl: fakeTelegram },
  });
  for (const r of results) assert.equal(r.ok, true, `${r.id}: ${JSON.stringify(r.issues)}`);

  const zip = results[0].files[0].bytes;
  const { issues, pack } = checkWhatsAppZip(zip);
  assert.deepEqual(issues, []);
  assert.equal(pack.stickers.length, 3);
  assert.deepEqual(pack.stickers[0].emojis, ['😀', '🎉']);
  assert.deepEqual(readZip(zip).map((e) => e.name), ['contents.json', 'title.txt', 'author.txt', 'tray.png', '01.webp', '02.webp', '03.webp']);

  assert.equal(imageInfo(results[1].files[0].bytes).width, 512);

  const create = calls.find((c) => c.method === 'createNewStickerSet');
  assert.ok(create, 'createNewStickerSet called');
  assert.match(create.url, /\/bot123:abc\/createNewStickerSet$/);
  assert.equal(create.form.get('name'), 'test_pack_by_demo_bot');
  assert.equal(create.form.get('user_id'), '42');
  const stickers = JSON.parse(create.form.get('stickers'));
  assert.deepEqual(stickers, [{ sticker: 'attach://s0', format: 'static', emoji_list: ['😀'] }]);
  const file = create.form.get('s0');
  assert.equal(imageInfo(new Uint8Array(await file.arrayBuffer())).type, 'image/webp');
  assert.deepEqual(results[2].links, [{ href: 'https://t.me/addstickers/test_pack_by_demo_bot', label: 'https://t.me/addstickers/test_pack_by_demo_bot' }]);

  // The pipeline ran once per sticker and Telegram reused WhatsApp's WebP.
  const tgBytes = new Uint8Array(await file.arrayBuffer());
  assert.deepEqual(tgBytes, readZip(zip).find((e) => e.name === '01.webp').bytes);
});

test('WhatsApp without fill reports the 3-sticker rule', async () => {
  const ctx = createExportContext(nodeEnv, await load(), {});
  const [r] = await runExporters([whatsappPlugin], ctx, { whatsapp: { name: 'X', publisher: 'Y', fill: false } });
  assert.equal(r.ok, false);
  assert.equal(r.issues[0].code, 'wa.count');
});

test('Telegram reports a missing token before any network call', async () => {
  const ctx = createExportContext(nodeEnv, await load(), {});
  let called = false;
  const [r] = await runExporters([telegramPlugin], ctx, {
    telegram: { userId: '1', shortName: 'abc', fetchImpl: async () => { called = true; } },
  });
  assert.equal(r.ok, false);
  assert.equal(r.issues[0].code, 'tg.token');
  assert.equal(called, false);
});

test('GitHub plugin commits all PNGs in one commit under stickers/', async () => {
  const ctx = createExportContext(nodeEnv, await load(), {});
  const log = [];
  const fake = async (url, init) => {
    const path = url.replace('https://api.github.com/repos/me/site', '');
    log.push(`${init.method} ${path}`);
    const body = init.body ? JSON.parse(init.body) : null;
    const reply = (j) => new Response(JSON.stringify(j), { status: 200 });
    if (path === '') return reply({ default_branch: 'main' });
    if (path === '/git/ref/heads/main') return reply({ object: { sha: 'head' } });
    if (path === '/git/commits/head') return reply({ tree: { sha: 'tree0' } });
    if (path === '/git/blobs') return reply({ sha: `blob-${body.content.length}` });
    if (path === '/git/trees') { log.push(body.tree.map((t) => t.path).join(',')); return reply({ sha: 'tree1' }); }
    if (path === '/git/commits') return reply({ sha: 'c1', html_url: 'https://github.com/me/site/commit/c1' });
    if (path === '/git/refs/heads/main') return reply({});
    return new Response('{}', { status: 404 });
  };
  const [r] = await runExporters([githubPlugin], ctx, {
    github: { token: 't', repo: 'me/site', fetchImpl: fake, now: new Date('2026-11-09T10:20:30Z') },
  });
  assert.equal(r.ok, true, JSON.stringify(r.issues));
  assert.ok(log.includes('stickers/face-20261109-102030.png'), log.join('\n'));
  assert.equal(log.at(-1), 'PATCH /git/refs/heads/main');
  assert.equal(r.links[0].href, 'https://github.com/me/site/commit/c1');
});

test('Telegram server function checks origin and forwards valid stickers', async () => {
  const ctx = createExportContext(nodeEnv, await load(), {});
  const [s] = await ctx.stickers();
  const { bytes } = await ctx.webp(s, 100 * 1024);
  const env = { TELEGRAM_BOT_TOKEN: '1:x', ALLOWED_ORIGIN: 'https://me.github.io' };
  const fake = async (url) =>
    Response.json(url.endsWith('getMe') ? { ok: true, result: { username: 'b_bot' } } : { ok: true, result: true });
  const req = (origin, body) =>
    new Request('https://fn.example/telegram', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const good = { userId: 7, shortName: 'pk', title: 'P', stickers: [Buffer.from(bytes).toString('base64')] };

  assert.equal((await handleTelegramRequest(req('https://evil.example', good), env, fake)).status, 403);
  const ok = await handleTelegramRequest(req('https://me.github.io', good), env, fake);
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).url, 'https://t.me/addstickers/pk_by_b_bot');
  const bad = await handleTelegramRequest(req('https://me.github.io', { ...good, stickers: ['AAAA'] }), env, fake);
  assert.equal(bad.status, 422);
});

test('CLI: one image -> WhatsApp ZIP + Telegram files, then `check` passes', async () => {
  const run = promisify(execFile);
  const out = await mkdtemp(join(tmpdir(), 'sticker-'));
  const cli = new URL('../cli/sticker.mjs', import.meta.url).pathname;
  await run(process.execPath, [cli, 'make', fixture.pathname, '--shape', 'cutout', '--outline', '8', '--text', 'Selam',
    '--export', 'whatsapp,png,telegram', '--tg-dry-run', '--name', 'CLI Paketi', '--out', out]);
  const files = await readdir(out);
  assert.ok(files.includes('cli-paketi.zip'), files.join(','));
  assert.ok(files.includes('face.png'));
  const { stdout } = await run(process.execPath, [cli, 'check', join(out, 'cli-paketi.zip'), join(out, 'telegram', '01.webp')]);
  assert.match(stdout, /✔ .*cli-paketi\.zip: WhatsApp paketi "CLI Paketi", 3 çıkartma/);
  assert.match(stdout, /✔ .*01\.webp: image\/webp 512×512/);
});
