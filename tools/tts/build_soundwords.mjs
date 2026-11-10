#!/usr/bin/env node
// Build data/tts/soundwords.<tradition>.json: one respelling record per audio-manifest item (kind + id), per tradition.
//   node tools/tts/build_soundwords.mjs [--lang es|it] [--out data/tts] [--check]
// --check rebuilds in memory and exits 1 when the files on disk differ (staleness test). Deterministic: no timestamps.
// Nothing here has been heard. See docs/tts/SOUNDWORDS.md.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadManifestFull } from '../audio/manifest_io.mjs';
import { soundText, confidenceOf, FLAG_INFO, MODELS, TRADITIONS, DEFAULT_LANG, SOUNDTEXT_VERSION, LANGS } from './soundtext.mjs';
import { REPO_ROOT, parseArgs } from './lib.mjs';

export const STATUS = 'rule-generated respelling; never listened to; no native speaker has approved any item; a workaround, audible only through a real TTS run';
const CONF = ['high', 'medium', 'low', 'unvoiced'];

/** ids (exact, or with a -l<n> / -w<n> suffix) that belong to registry entries whose language is not Hebrew. */
export function aramaicIds(root = REPO_ROOT) {
  const reg = JSON.parse(fs.readFileSync(path.join(root, 'data/corpus/registry.json'), 'utf8'));
  return reg.entries.filter((e) => e.language && e.language !== 'hebrew').map((e) => e.id);
}
const isAramaic = (id, ids) => ids.some((a) => id === a || id.startsWith(a + '-l') || id.startsWith(a + '-w'));

export function buildTradition(manifest, tradition, { lang = DEFAULT_LANG, root = REPO_ROOT } = {}) {
  const arm = aramaicIds(root);
  const seen = new Map();
  for (const e of manifest) {
    if (e.tradition !== tradition) continue;
    const key = `${e.kind}/${e.id}`;
    const have = seen.get(key);
    if (have) { if (!have.voices.includes(e.voice)) have.voices.push(e.voice); continue; }
    seen.set(key, { e, voices: [e.voice] });
  }
  const items = [];
  const summary = { items: 0, byConfidence: Object.fromEntries(CONF.map((c) => [c, 0])), byFlag: {}, byGroup: {} };
  for (const { e, voices } of seen.values()) {
    const r = soundText(e.text, tradition, { lang });
    let flags = r.flags;
    if (r.voiced && isAramaic(e.id, arm)) flags = [...flags, 'aramaic'].sort();
    const confidence = confidenceOf(flags, r.voiced);
    items.push({ id: e.id, kind: e.kind, group: e.group || '', voices: voices.sort().reverse(), he: e.text, soundtext: r.soundtext, confidence, flags });
    summary.items++;
    summary.byConfidence[confidence]++;
    for (const f of flags) summary.byFlag[f] = (summary.byFlag[f] || 0) + 1;
    const g = (summary.byGroup[e.group || 'other'] ||= Object.fromEntries(CONF.map((c) => [c, 0])));
    g[confidence]++;
  }
  summary.byFlag = Object.fromEntries(Object.entries(summary.byFlag).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)));
  const used = Object.keys(summary.byFlag);
  const header = {
    schema: 'alef-tts-soundwords/1',
    version: SOUNDTEXT_VERSION,
    status: STATUS,
    tradition,
    model: MODELS[tradition],
    ttsLanguageToken: lang,
    ttsLanguageTokenNote: 'A parameter to pair with the respelling alphabet, not a claim of quality. Nothing was run through a TTS.',
    format: 'soundtext: words separated by a space, syllables by a hyphen, the stressed syllable carries an acute accent on its vowel; letters are lower case a-z plus the five accented vowels. Empty when confidence is "unvoiced".',
    confidence: { high: 'no flag fired', medium: 'only default-rule flags fired (see flagLegend)', low: 'at least one guess flag fired', unvoiced: 'not respelled (no vowel signs); soundtext is empty' },
    flagLegend: Object.fromEntries(used.map((f) => [f, { hard: !!FLAG_INFO[f]?.hard, reason: FLAG_INFO[f]?.reason || '' }])),
    summary,
  };
  return { header, items };
}

/** Compact, diff-friendly JSON: header pretty-printed, one item per line. */
export function serialize({ header, items }) {
  const h = JSON.stringify(header, null, 1);
  return h.slice(0, -2) + ',\n "items": [\n' + items.map((i) => '  ' + JSON.stringify(i)).join(',\n') + '\n ]\n}\n';
}

export function buildAll({ lang = DEFAULT_LANG, root = REPO_ROOT } = {}) {
  const manifest = loadManifestFull(root);
  return Object.fromEntries(TRADITIONS.map((t) => [t, buildTradition(manifest, t, { lang, root })]));
}

export function main(argv = process.argv.slice(2)) {
  const a = parseArgs(argv, ['check']);
  const lang = a.lang || DEFAULT_LANG;
  if (!LANGS.includes(lang)) { console.error(`unknown --lang ${lang}`); process.exit(2); }
  const out = path.resolve(a.out || path.join(REPO_ROOT, 'data', 'tts'));
  const built = buildAll({ lang });
  let stale = 0;
  fs.mkdirSync(out, { recursive: true });
  for (const [t, b] of Object.entries(built)) {
    const file = path.join(out, `soundwords.${t}.json`);
    const text = serialize(b);
    if (a.check) { if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== text) { stale++; console.error(`stale: ${file}`); } continue; }
    fs.writeFileSync(file, text);
    const s = b.header.summary;
    console.log(`${t}: ${s.items} items ${JSON.stringify(s.byConfidence)} -> ${file}`);
  }
  if (a.check) { if (stale) process.exit(1); console.log('soundwords files are current'); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
