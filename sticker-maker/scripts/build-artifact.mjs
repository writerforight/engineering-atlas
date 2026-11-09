// Build the claude.ai Artifact version of the page into <outDir>:
// the page content without its document skeleton and CSP meta (the Artifact
// host wraps the page and sets its own CSP), the stylesheet inlined, and the
// same web/ and core/ modules next to it.
// Usage: node sticker-maker/scripts/build-artifact.mjs <outDir>

import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';

const here = fileURLToPath(new URL('..', import.meta.url));
const out = resolve(process.argv[2] || join(here, '..', 'dist-artifact'));
let html = await readFile(join(here, 'index.html'), 'utf8');
const css = await readFile(join(here, 'web', 'style.css'), 'utf8');

const head = html.match(/<head>([\s\S]*?)<\/head>/)[1];
const body = html.match(/<body>([\s\S]*?)<\/body>/)[1];
const title = head.match(/<title>[\s\S]*?<\/title>/)[0];
const fit = head.match(/<meta name="claude:viewport-fit-sides"[^>]*>/)[0];
html = `${title}\n${fit}\n<style>\n${css}</style>\n${body.trim()}\n`;

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await writeFile(join(out, 'index.html'), html);
for (const p of ['web', 'core']) await cp(join(here, p), join(out, p), { recursive: true });
console.log(`artifact → ${out}`);
