// "Save to repo": commit the PNG stickers into <dir>/ (default stickers/) of
// any repo the token can write to, in one commit.

import { PNG_EXPORT } from '../limits.js';
import { checkEncoded, assertOk } from '../validate.js';
import { commitFiles, checkGitHubSettings } from '../github.js';
import { pngFileNames } from './png.js';

export const githubPlugin = {
  id: 'github',
  label: 'GitHub deposuna kaydet',
  targets: ['web', 'cli'],
  /** settings: { token, repo, branch?, dir?, fetchImpl?, apiBase?, now? } */
  async run(ctx, settings) {
    assertOk(checkGitHubSettings(settings));
    const stickers = await ctx.stickers();
    const stamp = (settings.now || new Date()).toISOString().replace(/[-:]/g, '').replace(/\..*/, '').replace('T', '-');
    const names = pngFileNames(stickers).map((n) => n.replace(/\.png$/, `-${stamp}.png`));
    const files = await Promise.all(stickers.map(async (s, i) => ({ name: names[i], bytes: await ctx.png(s) })));
    assertOk(files.flatMap((f) => checkEncoded(f.bytes, { type: 'image/png', width: PNG_EXPORT.side, height: PNG_EXPORT.side, maxBytes: 50 * 1024 * 1024, name: f.name })));
    const r = await commitFiles({ ...settings, files, message: `Add ${files.length} sticker(s) from sticker-maker` });
    return {
      files: [],
      summary: `${r.paths.length} dosya ${settings.repo}@${r.branch} içine işlendi: ${r.paths.join(', ')}`,
      links: [{ href: r.commitUrl, label: 'Commit\'i aç' }],
    };
  },
};
