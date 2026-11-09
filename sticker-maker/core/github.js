// Commit files into a GitHub repo through the REST API: all files in a single
// commit (Git Data API), with a Contents API fallback for an empty repo.
// Works in the browser (user's own token, sent only to api.github.com) and in
// Node (GITHUB_TOKEN). Nothing here stores the token.

import { ValidationError } from './validate.js';

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Portable base64 for Uint8Array (no Buffer, no btoa string limits). */
export function toBase64(bytes) {
  let out = '';
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + B64[n & 63];
  }
  const rest = bytes.length - i;
  if (rest === 1) {
    const n = bytes[i] << 16;
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + '==';
  } else if (rest === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + '=';
  }
  return out;
}

export const REPO_PATTERN = /^[A-Za-z0-9-]{1,39}\/[A-Za-z0-9._-]{1,100}$/;

export function cleanDir(dir) {
  const parts = String(dir ?? 'stickers')
    .split('/')
    .map((p) => p.trim())
    .filter((p) => p && p !== '.');
  if (parts.some((p) => p === '..' || !/^[A-Za-z0-9._ -]+$/.test(p))) {
    throw new ValidationError([{ code: 'gh.dir', message: 'Klasör adı yalnız harf, rakam, boşluk ve . _ - içerebilir.' }]);
  }
  return parts.join('/');
}

export function checkGitHubSettings({ token, repo }) {
  const issues = [];
  if (!token) issues.push({ code: 'gh.token', message: 'GitHub token gerekli (yalnız bu depoda "Contents: Read and write" izinli ince ayarlı token).' });
  if (!REPO_PATTERN.test(repo || '')) issues.push({ code: 'gh.repo', message: 'Depo "kullanıcı/depo" biçiminde olmalı.' });
  return issues;
}

/**
 * @param {{ token: string, repo: string, branch?: string, dir?: string,
 *   files: { name: string, bytes: Uint8Array }[], message?: string,
 *   fetchImpl?: typeof fetch, apiBase?: string }} opts
 * @returns {Promise<{ commitUrl: string, branch: string, paths: string[] }>}
 */
export async function commitFiles(opts) {
  const issues = checkGitHubSettings(opts);
  if (!opts.files?.length) issues.push({ code: 'gh.files', message: 'Kaydedilecek dosya yok.' });
  if (issues.length) throw new ValidationError(issues);

  const f = opts.fetchImpl || globalThis.fetch.bind(globalThis);
  const api = (opts.apiBase || 'https://api.github.com').replace(/\/$/, '');
  const dir = cleanDir(opts.dir);
  const message = opts.message || `Add ${opts.files.length} sticker(s)`;
  const headers = {
    Authorization: `Bearer ${opts.token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };

  async function call(method, path, body) {
    let res;
    try {
      res = await f(`${api}/repos/${opts.repo}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new Error('GitHub API\'ye ulaşılamadı: ağ yok ya da bu sayfanın barındırıldığı yer api.github.com bağlantısına izin vermiyor (GitHub Pages sürümünü ya da komut satırını kullan).');
    }
    let json = null;
    try {
      json = await res.json();
    } catch {
      /* empty body */
    }
    if (!res.ok) {
      const err = new Error(explain(res.status, json?.message));
      err.status = res.status;
      throw err;
    }
    return json;
  }

  const repoInfo = await call('GET', '');
  const branch = opts.branch || repoInfo.default_branch || 'main';
  const paths = opts.files.map((x) => (dir ? `${dir}/${x.name}` : x.name));

  let headSha;
  try {
    headSha = (await call('GET', `/git/ref/heads/${encodeURIComponent(branch)}`)).object.sha;
  } catch (e) {
    if (e.status !== 409) throw e;
    // Empty repository: the Contents API can
    // create the first commit; it takes one file per commit.
    let last;
    for (let i = 0; i < opts.files.length; i++) {
      last = await call('PUT', `/contents/${paths[i].split('/').map(encodeURIComponent).join('/')}`, {
        message,
        content: toBase64(opts.files[i].bytes),
        branch,
      });
    }
    return { commitUrl: last.commit.html_url, branch, paths };
  }

  const baseTree = (await call('GET', `/git/commits/${headSha}`)).tree.sha;
  const blobs = await Promise.all(
    opts.files.map((x) => call('POST', '/git/blobs', { content: toBase64(x.bytes), encoding: 'base64' })),
  );
  const tree = await call('POST', '/git/trees', {
    base_tree: baseTree,
    tree: blobs.map((b, i) => ({ path: paths[i], mode: '100644', type: 'blob', sha: b.sha })),
  });
  const commit = await call('POST', '/git/commits', { message, tree: tree.sha, parents: [headSha] });
  await call('PATCH', `/git/refs/heads/${encodeURIComponent(branch)}`, { sha: commit.sha });
  return { commitUrl: commit.html_url || `https://github.com/${opts.repo}/commit/${commit.sha}`, branch, paths };
}

function explain(status, msg) {
  const tail = msg ? ` (${msg})` : '';
  if (status === 401) return `GitHub: token geçersiz ya da süresi dolmuş${tail}.`;
  if (status === 403) return `GitHub: bu token bu depoya yazamıyor; "Contents: Read and write" izni gerekli${tail}.`;
  if (status === 404) return `GitHub: depo ya da dal bulunamadı, ya da token bu depoyu göremiyor${tail}.`;
  if (status === 409) return `GitHub: depo boş ya da çakışma var${tail}.`;
  if (status === 422) return `GitHub: istek reddedildi${tail}.`;
  return `GitHub: HTTP ${status}${tail}.`;
}
