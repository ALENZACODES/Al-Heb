#!/usr/bin/env node
// Lists manifest rows whose Hebrew text would trip a synthetic voice, and what the cleaner would change before sending it.
//   node tools/audio/text_audit.mjs [--tradition israeli] [--voice m] [--kinds prayer,line]  (read-only; prints a report)
// Checks (tools/audio/tts/google.mjs): unpointed Hebrew, Latin letters mixed into Hebrew, and marks the cleaner strips
// (sof pasuq, maqaf, cantillation, meteg, paseq, trailing full stop or colon).
import { loadManifestFull } from './manifest_io.mjs';
import { cleanHebrewForTts, textWarnings } from './tts/google.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export function audit(manifest, { tradition = 'israeli', voice = 'm', kinds } = {}) {
  const rows = manifest.filter((e) => e.tradition === tradition && e.voice === voice && !e.aliasOf && (!kinds || kinds.includes(e.kind)));
  const warned = []; const cleaned = []; const marks = {};
  for (const e of rows) {
    const w = textWarnings(e.text);
    if (w.length) warned.push({ id: e.id, kind: e.kind, warnings: w, text: e.text });
    const c = cleanHebrewForTts(e.text);
    if (c !== String(e.text || '').trim()) {
      cleaned.push({ id: e.id, kind: e.kind, from: e.text, to: c });
      for (const [name, re] of Object.entries({ 'sof pasuq': /׃/, maqaf: /־/, cantillation: /[֑-֮]/, meteg: /ֽ/, paseq: /׀/, 'trailing stop/colon': /[.:;·]\s*$/ })) if (re.test(e.text || '')) marks[name] = (marks[name] || 0) + 1;
    }
  }
  return { rows: rows.length, warned, cleaned, marks };
}

function main(argv = process.argv.slice(2)) {
  const a = {}; for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) a[argv[i].slice(2)] = argv[++i];
  const r = audit(loadManifestFull(ROOT), { tradition: a.tradition || 'israeli', voice: a.voice || 'm', kinds: a.kinds ? a.kinds.split(',') : undefined });
  console.log(`${r.rows} rows (${a.tradition || 'israeli'}, voice ${a.voice || 'm'}, one voice counted; the other voice has the same texts)`);
  console.log(`${r.cleaned.length} rows change when cleaned: ${JSON.stringify(r.marks)}`);
  console.log(`${r.warned.length} rows with warnings (left as they are; fix the source text or pass --allow-warnings to the renderer):`);
  const byKind = {}; for (const w of r.warned) byKind[w.kind] = (byKind[w.kind] || 0) + 1; console.log('  by kind:', JSON.stringify(byKind));
  for (const w of r.warned.slice(0, 40)) console.log(`  ${w.kind}/${w.id}: ${w.warnings.join('; ')}\n     ${w.text}`);
  if (r.warned.length > 40) console.log(`  ... ${r.warned.length - 40} more`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
