// Optional server function for Telegram, so the web page can create a set
// without ever seeing the bot token. Fetch-style handler: deploy as a
// Cloudflare Worker / Deno Deploy / Vercel Edge function (bundle with this repo).
//
// Secrets / settings (set in the host, never in the page):
//   TELEGRAM_BOT_TOKEN   bot token from @BotFather
//   ALLOWED_ORIGIN       e.g. https://<you>.github.io  (CORS; required)
//   SHARED_KEY           optional; if set, requests must send header X-Sticker-Key
//
// Request (POST, JSON):
//   { userId, shortName, title, emojis: "😀", append?: bool, stickers: ["<base64 webp/png>", ...] }
// The page sends stickers it already rendered and validated; they are checked
// again here (format, 512x512, weight) before any Bot API call.

import { publishTelegramPack } from './telegram.js';
import { parseEmojis } from '../core/exporters.js';
import { ValidationError } from '../core/validate.js';

const MAX_BODY = 8 * 1024 * 1024;

function fromBase64(s) {
  const bin = atob(String(s));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function handleTelegramRequest(request, env, fetchImpl) {
  const origin = request.headers.get('Origin') || '';
  const allowed = env.ALLOWED_ORIGIN && origin === env.ALLOWED_ORIGIN;
  const cors = {
    'Access-Control-Allow-Origin': allowed ? origin : 'null',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Sticker-Key',
    Vary: 'Origin',
  };
  const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  if (request.method === 'OPTIONS') return new Response(null, { status: allowed ? 204 : 403, headers: cors });
  if (request.method !== 'POST') return reply(405, { ok: false, errors: ['POST bekleniyor.'] });
  if (!allowed) return reply(403, { ok: false, errors: ['Bu kaynaktan istek kabul edilmiyor.'] });
  if (env.SHARED_KEY && request.headers.get('X-Sticker-Key') !== env.SHARED_KEY) return reply(401, { ok: false, errors: ['Anahtar hatalı.'] });
  if (Number(request.headers.get('Content-Length') || 0) > MAX_BODY) return reply(413, { ok: false, errors: ['İstek çok büyük.'] });

  let body;
  try {
    body = await request.json();
  } catch {
    return reply(400, { ok: false, errors: ['Geçersiz JSON.'] });
  }
  try {
    const emojis = parseEmojis(body.emojis ?? '😀');
    const r = await publishTelegramPack({
      token: env.TELEGRAM_BOT_TOKEN,
      userId: body.userId,
      shortName: body.shortName,
      title: body.title,
      append: !!body.append,
      stickers: (body.stickers || []).map((b) => ({ bytes: fromBase64(b), emojis })),
      fetchImpl,
      apiBase: env.TELEGRAM_API_BASE,
    });
    return reply(200, { ok: true, ...r });
  } catch (e) {
    const errors = e instanceof ValidationError ? e.issues.map((i) => i.message) : [String(e.message || e)];
    return reply(e instanceof ValidationError ? 422 : 502, { ok: false, errors });
  }
}

export default { fetch: (request, env) => handleTelegramRequest(request, env) };
