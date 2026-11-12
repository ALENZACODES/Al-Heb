// I10 / J10: writes data/platform/changelog.json from the git history (commit date, short hash and the commit subject's first
// sentence), so About and #/whats-new show what changed from real data, never hand-written notes.
// Run: node tools/release/changelog.mjs [--max 40]   (npm run release runs it). Not run by build-precache, so CI's
// "precache manifest is current" check stays reproducible.
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { RULES } from '../text-gate/learner-text.mjs';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
export const OUT = 'data/platform/changelog.json';
const SEP = '\u001f';

/** First sentence of a subject, cut at a word boundary to at most `max` characters. */
export function summary(subject, max = 180) {
  let s = String(subject || '').trim().replace(/\s+/g, ' ');
  const m = s.match(/^(.+?[.;])\s/); if (m && m[1].length >= 30) s = m[1].replace(/;$/, '.');
  if (s.length > max) s = s.slice(0, s.lastIndexOf(' ', max - 1)).replace(/[,:;(]+$/, '') + '…';
  return s;
}
/** An entry the learner-text gate would flag (it quotes raw text such as a glued "hislang" defect it fixed) is left out. */
export const flagged = (text) => ['nullish', 'template', 'raw-key', 'glued-register'].some((r) => RULES[r](text));
/** Parse `git log` lines "hash<US>date<US>subject" into entries, skipping merges and empty subjects. */
export function parseLog(text) {
  return String(text).split('\n').filter(Boolean).map((l) => l.split(SEP)).filter(([h, d, s]) => h && d && s && !/^Merge /.test(s))
    .map(([hash, date, s]) => ({ date, hash, text: summary(s) }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const i = process.argv.indexOf('--max'); const max = i > 0 ? +process.argv[i + 1] : 40;
  const log = execFileSync('git', ['log', '--no-merges', `-n${max}`, `--format=%h${SEP}%ad${SEP}%s`, '--date=short'], { cwd: root, encoding: 'utf8' });
  const all = parseLog(log), entries = all.filter((e) => !flagged(e.text));
  mkdirSync(join(root, 'data/platform'), { recursive: true });
  writeFileSync(join(root, OUT), JSON.stringify({ generatedFrom: 'git log (commit subjects, first sentence)', leftOut: all.length - entries.length, entries }, null, 1) + '\n');
  console.log(`${OUT}: ${entries.length} entries (${all.length - entries.length} left out by the learner-text gate), newest ${entries[0]?.date || 'none'}`);
}
