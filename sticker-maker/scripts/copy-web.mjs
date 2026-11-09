// Copy the static web app into the site build: dist/sticker-maker/.
// Only the public files go: index.html, web/, core/ (never cli/, server/, test/).
// Usage: node sticker-maker/scripts/copy-web.mjs [targetDir]

import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';

const here = fileURLToPath(new URL('..', import.meta.url));
const target = resolve(process.argv[2] || join(here, '..', 'dist', 'sticker-maker'));
await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
for (const p of ['index.html', 'web', 'core']) await cp(join(here, p), join(target, p), { recursive: true });
console.log(`sticker-maker → ${target}`);
