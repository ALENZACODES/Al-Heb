#!/usr/bin/env node
// Library articles against the full text of the pages they cite. Needs internet access, so run it on your own computer:
//   node tools/content/check-sources.mjs              (all articles)
//   node tools/content/check-sources.mjs shabbat-at-home
// For each reference it downloads the page, reduces it to plain words and reports:
//   - pages that no longer load (a dead or moved link),
//   - any run of seven or more words the article shares with that page (outside quotation marks).
// A shared run means the wording is too close to the source and must be rewritten. Exit code 1 if anything is found.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const lib = JSON.parse(readFileSync(join(ROOT, 'data/library/articles.json'), 'utf8'));
const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const N = 7;

const words = (s) => String(s).toLowerCase().replace(/[“”"'’]/g, "'").match(/[a-z0-9][a-z0-9'\-]*/g) || [];
const shingles = (s) => { const w = words(s); const out = new Set(); for (let i = 0; i + N <= w.length; i++) out.add(w.slice(i, i + N).join(' ')); return out; };
const pageText = (html) => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&#\d+;|&[a-z]+;/gi, ' ');

let problems = 0;
for (const a of lib.articles) {
  if (only.length && !only.includes(a.id)) continue;
  const body = a.sections.flatMap((s) => s.paras).join(' ').replace(/“[^”]*”|"[^"]*"/g, ' ');
  const mine = shingles(body);
  console.log(`\n${a.id}`);
  for (const r of a.references) {
    let html;
    try {
      const res = await fetch(r.url, { headers: { 'User-Agent': 'Mozilla/5.0 (Aleph source check)' }, redirect: 'follow' });
      if (!res.ok) { console.log(`  DEAD  ${res.status}  ${r.url}`); problems++; continue; }
      html = await res.text();
    } catch (e) { console.log(`  DEAD  ${e.message}  ${r.url}`); problems++; continue; }
    const theirs = shingles(pageText(html));
    const shared = [...mine].filter((s) => theirs.has(s));
    if (shared.length) { problems++; console.log(`  CLOSE ${shared.length} shared run(s) with ${r.publisher}:`); for (const s of shared.slice(0, 5)) console.log(`        "${s}"`); }
    else console.log(`  ok    ${r.publisher}`);
  }
}
console.log(problems ? `\n${problems} problem(s) found.` : '\nNo shared wording and every page loaded.');
process.exit(problems ? 1 : 0);
