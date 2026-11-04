#!/usr/bin/env node
// Builds every print variant (all UNTESTED with the printers' previewers; see docs/book/PRINT.md):
//   KDP interior, no bleed        alef-book-8.5x11-print.pdf
//   KDP interior, with bleed      alef-book-8.5x11-print-bleed.pdf          (page = trim + 0.125in width, trim + 0.25in height; bleed on top/bottom/outer)
//   RTL-bound (mirrored spreads)  alef-book-8.5x11-print-bleed-rtlspreads.pdf  + REVERSED copy for IngramSpark/Lulu: ...-REVERSED-ingram-lulu.pdf
// usage: node book/make_print.mjs [--trim 8.5x11] [--host HOST]
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { ROOT } from './content.mjs';
import { main, parseArgs, pdfName } from './build.mjs';

const extra = process.argv.slice(2);
const base = ['--pdf', '--print', ...extra];
const variants = [[], ['--bleed'], ['--bleed', '--binding', 'rtl']];
for (const v of variants) await main([...base, ...v]);
const rtl = parseArgs([...base, '--bleed', '--binding', 'rtl']);
const src = join(ROOT, rtl.out, pdfName(rtl));
const dst = src.replace(/\.pdf$/, '-REVERSED-ingram-lulu.pdf').replace('-rtlspreads', '');
const r = spawnSync('python3', [join(ROOT, 'book/pdf_tools.py'), 'reverse', src, dst], { stdio: 'inherit' });
if (r.status !== 0) process.exit(1);
console.log('reversed ->', dst);

// Cut-out mnemonic flashcards (US Letter + A4): separate printable sheets, not part of the KDP interior.
const { main: flashcards } = await import('./flashcards.mjs');
await flashcards([]);
