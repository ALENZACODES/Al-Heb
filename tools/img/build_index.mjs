// Builds data/img/index.json: one compact index of every image id in every manifest.
//   node tools/img/build_index.mjs           write data/img/index.json
//   node tools/img/build_index.mjs --check   exit 1 if the file on disk differs from a fresh build
// Sources: data/images/manifest.csv, block-j.csv, inter-pending.csv, generated-manifest.json (altText),
// and the variants actually present in assets/img/gen/ (<stem>.<edge>.webp).
// Format (v1): { v, p:[alt prefixes], a:[aspects], g:{ "<kind>:<id>[:<variant>]": [idPrefix, [row, ...]] }, w:{ "<word id>": row }, x?:{ "<v id>": "<h id>" } }
//   x = word-id aliases (dictionary list id -> the older id its picture is keyed on); see wordAliases(). On disk x lives in
//   data/img/word-aliases.json ({ v, x }), which src/img/resolve.js merges back in; data/img/index.json carries the rest.
//   row = [idSuffix, aspectIdx, prefixIdx (1-based into p, 0 = none), altRest, big?]   (w rows carry the whole image id as idSuffix)
//   alt = p[prefixIdx-1] + altRest + (that prefix ends with a quote ? '".' : '').  big = the large webp edge (the 800 edge is implied); an array when the set differs.
//   No big = no file in assets/img/gen yet.
// Approval is NOT in the index (it changes on its own): src/img/resolve.js reads data/images/approvals.json.
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const INDEX_PATH = 'data/img/index.json';
// Size cap on the serialized index (loaded lazily by src/img/resolve.js, not on first paint). Raised from 150 KB to 256 KB on
// Nov 4, 2026 when the 1000 Run 3 ids (data/images/run3.csv, carried in via the altText map) joined the index: alt text is the bulk.
export const MAX_BYTES = 256 * 1024;
// The word-id aliases (x) are written to their own file, downloaded with the dictionary (on demand), not installed up front.
export const ALIASES_PATH = 'data/img/word-aliases.json';

/** Minimal RFC-4180 CSV parser (quoted fields, doubled quotes, newlines inside quotes). */
export function parseCsv(text) {
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); f = ''; if (row.length > 1 || row[0] !== '') rows.push(row); row = []; }
    else f += c;
  }
  if (f !== '' || row.length) { row.push(f); rows.push(row); }
  const head = rows.shift() || [];
  return rows.map((r) => Object.fromEntries(head.map((k, i) => [k, r[i] ?? ''])));
}

const gcd = (a, b) => (b ? gcd(b, a % b) : a);
export const aspectOf = (w, h) => { w = +w; h = +h; if (!(w > 0 && h > 0)) return '1:1'; const g = gcd(w, h); return `${w / g}:${h / g}`; };
const hy = (s) => String(s).replace(/_/g, '-');
const stemOf = (f) => String(f).replace(/\.(png|webp|jpg|svg)$/i, '');

/** Group key + display order for one image. Returns {key, rank}. */
export function groupOf({ stem, set = '', kind = '', key = '' }) {
  let m;
  if (kind === 'letter-alt') return { key: `letter:${hy(key)}:alt` };
  if (kind === 'vowel-alt') return { key: `vowel:${hy(String(key).replace(/^vowel_\d+_/, ''))}:alt` };
  if (kind === 'lesson-scene') return { key: `lesson:${key}` };
  if (kind === 'festival-scene') return { key: `festival:${String(set).replace(/^j_festival_/, '')}` };
  if (kind.startsWith('word-') || kind === 'srs-card') return { key: `word:${key}` };
  if ((m = /^L\d\d_([a-z_]+?)_(print|cursive)_.+$/.exec(stem))) return { key: `letter:${hy(m[1])}:${m[2]}`, rank: /_meet$/.test(stem) ? -1 : /_mnemonic$/.test(stem) ? 0 : 1 };
  if ((m = /^L\d\d_([a-z_]+?)_quirky$/.exec(stem))) return { key: `letter:${hy(m[1])}:quirky` };
  if ((m = /^V\d\d_([a-z_]+?)_(keyword|ari|noa|position|card)$/.exec(stem))) return { key: `vowel:${hy(m[1])}`, rank: m[2] === 'keyword' ? 0 : 1 };
  if ((m = /^VOC_([a-z_]+)_\d+$/.exec(stem))) return { key: `theme:${hy(m[1])}` };
  if ((m = /^(I-\d+)-img\d+$/.exec(stem))) return { key: `lesson:${m[1]}` };
  return { key: `asset:${hy(set || stem.replace(/_?\d+$/, ''))}` };
}

function synthAlt(stem, set) {
  let m;
  if ((m = /^VOC_([a-z_]+)_(\d+)$/.exec(stem))) return `Picture ${+m[2]} for the vocabulary theme ${m[1].replace(/_/g, ' ')}.`;
  if ((m = /^V\d\d_(.+)_(keyword|ari|noa|position|card)$/.exec(stem))) return `Memory picture for the Hebrew vowel ${m[1].replace(/_/g, ' ')} (${m[2]}).`;
  if ((m = /^ICON_(.+)$/.exec(stem))) return `Icon: ${m[1].replace(/_/g, ' ')}.`;
  if ((m = /^BADGE_(\d+)$/.exec(stem))) return `Achievement badge ${+m[1]}.`;
  if ((m = /^PRAY_(.+)_(\d+)$/.exec(stem))) return `Illustration ${+m[2]} for the ${m[1].replace(/_/g, ' ')} page.`;
  if ((m = /^BRAND_(.+)$/.exec(stem))) return `Aleph brand artwork: ${m[1].replace(/_/g, ' ')}.`;
  return `Illustration: ${stem.replace(/_/g, ' ')}${set ? ` (${set.replace(/_/g, ' ')})` : ''}.`;
}

function readCsv(root, rel) { const p = join(root, rel); return existsSync(p) ? parseCsv(readFileSync(p, 'utf8')) : []; }
function readJson(root, rel, d) { const p = join(root, rel); return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : d; }

/** Everything the index is built from, as plain data (tests inject their own via buildIndexFrom). */
export function loadSources(root = ROOT) {
  const gen = readJson(root, 'data/images/generated-manifest.json', {});
  const dir = join(root, 'assets/img', gen.dir || 'gen');
  const edges = {};
  if (existsSync(dir)) for (const f of readdirSync(dir)) { const m = /^(.+)\.(\d+)\.webp$/.exec(f); if (m) (edges[m[1]] ??= []).push(+m[2]); }
  return {
    manifest: readCsv(root, 'data/images/manifest.csv'),
    blockJ: readCsv(root, 'data/images/block-j.csv'),
    inter: readCsv(root, 'data/images/inter-pending.csv'),
    altText: gen.altText || {}, edges,
    dict: (readJson(root, 'data/vocab/words.json', {}).words || []).map((w) => ({ id: w.id, he: w.he, en: w.en })),
    list: (readJson(root, 'data/vocab/vocab5000.json', {}).entries || []).map((e) => ({ id: e.id, pointed: e.pointed, lemma: e.lemma, gloss: e.gloss })),
  };
}

const pointedKey = (s) => String(s || '').replace(/[\u05BE\s־-]/g, '').normalize('NFC');
const isVerb = (s) => /^\s*to\s/i.test(String(s || ''));
const words = (s) => new Set(String(s || '').toLowerCase().split(/[^a-z]+/).filter((t) => t.length > 2));

/**
 * Word-id aliases (index field x): the dictionary list (data/vocab/vocab5000.json, ids v…) and the older word file
 * (data/vocab/words.json, ids h…, which Block J pictures are keyed on) name the same word with different ids. For every
 * list entry whose word has a picture row under an h id, x maps the v id to that h id when the pointed spelling is the
 * same AND the meanings agree: both glosses are verbs ("to …") or both are not, and they share an English word (so the
 * homographs if / island, fish / to fish, cow / to bear fruit stay apart). Same letters with other
 * pointing is NOT enough (milk / to milk, smoke / to smoke), so those stay unlinked. Only unique matches are kept; a v
 * id that already has its own picture row is never aliased.
 */
export function wordAliases(dict, list, pictured) {
  const hs = dict.filter((d) => pictured.has(d.id));
  const byPointed = new Map();
  for (const d of hs) { const k = pointedKey(d.he); if (!byPointed.has(k)) byPointed.set(k, []); byPointed.get(k).push(d); }
  const x = {};
  for (const e of list) {
    if (!e.id || pictured.has(e.id)) continue;
    const gl = words(e.gloss);
    const verb = isVerb(e.gloss);
    const share = (d) => isVerb(d.en) === verb && [...words(d.en)].some((t) => gl.has(t));
    const c = (byPointed.get(pointedKey(e.pointed)) || []).filter(share);
    if (c.length === 1) x[e.id] = c[0].id;
  }
  return Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : 1)));
}

export function buildIndexFrom({ manifest = [], blockJ = [], inter = [], altText = {}, edges = {}, dict = [], list = [] }) {
  const recs = new Map();
  const put = (stem, r) => { if (stem && !recs.has(stem)) recs.set(stem, r); };
  for (const r of manifest) put(stemOf(r.file), { set: r.set, w: r.width, h: r.height });
  for (const r of inter) put(stemOf(r.file), { set: r.set, w: r.width, h: r.height });
  // Block J rows win over their copy in manifest.csv (append_manifest_rows.mjs adds them there when their pictures come back,
  // without kind and key), so a returned word picture stays linked to its word. delete + set keeps them in their old place.
  for (const r of blockJ) { if (!r.id) continue; recs.delete(r.id); recs.set(r.id, { set: r.set, kind: r.kind, key: r.key, w: r.width, h: r.height, alt: r.alt }); }
  for (const id of Object.keys(altText)) put(id, { set: '' });
  // Game backdrops can be shipped and approved outside the intake manifest.
  // Keep those files discoverable after rebuilding the index; the resolver
  // still requires their existing approval before displaying them.
  for (const id of Object.keys(edges).filter((id) => id.startsWith('GAME_'))) put(id, { set: '' });
  // Approved opposite-pair gap artwork was added outside the original intake CSV.
  for (const id of Object.keys(edges).filter((id) => /^OPP_gap_(white_black|expensive_cheap|strong_weak|happy_sad|near_far)$/.test(id))) put(id, { set: 'Opposites gap', alt: 'Opposites: ' + id.slice(8).replaceAll('_', ' and ') + '.' });
  // Reviewed meet cartoons are runtime letter artwork added after the intake CSV.
  for (const id of Object.keys(edges).filter((id) => /^L\d\d_[a-z_]+_print_meet$/.test(id))) put(id, { set: '', alt: 'Meet the Hebrew letter ' + id.replace(/^L\d\d_/, '').replace(/_print_meet$/, '').replaceAll('_', ' ') + ': illustrated letter character.' });
  for (const id of ['SPEAK_04_table_shabbat', 'SPEAK_05_table_welcome', 'SPEAK_08_street_taxi', 'OPP_expensive_cheap', 'OPP_near_far']) if (edges[id]?.length) put(id, { set: '' });
  const groups = new Map(); let order = 0;
  for (const [stem, r] of recs) {
    const g = groupOf({ stem, set: r.set, kind: r.kind, key: r.key });
    if (!groups.has(g.key)) groups.set(g.key, []);
    groups.get(g.key).push({ stem, r, rank: g.rank ?? 1, order: order++ });
  }
  const alts = new Map(); // first pass: choose alt text + prefix
  const split = (t) => { const i = t.indexOf('"'); const j = t.indexOf(': '); const k = i >= 0 && (j < 0 || i < j) ? i + 1 : j >= 0 ? j + 2 : 0; return [t.slice(0, k), t.slice(k)]; };
  const altFor = (stem, r) => altText[stem] || r.alt || synthAlt(stem, r.set);
  const count = {};
  for (const [stem, r] of recs) { const a = altFor(stem, r); alts.set(stem, a); const p = split(a)[0]; if (p) count[p] = (count[p] || 0) + 1; }
  const prefixes = Object.keys(count).filter((p) => count[p] >= 3 && p.length >= 12).sort();
  const hasTail = (p, a) => p.endsWith('"') && a.endsWith('".');
  const aspects = [];
  const aIdx = (s) => { let i = aspects.indexOf(s); if (i < 0) { aspects.push(s); i = aspects.length - 1; } return i; };
  const g = {}, w = {};
  const mkRow = (stem, suffix, r) => {
    const a = alts.get(stem); const [p] = split(a); let pi = prefixes.indexOf(p);
    if (pi >= 0 && p.endsWith('"') && !a.endsWith('".')) pi = -1;
    const rest = pi < 0 ? a : a.slice(p.length, hasTail(p, a) ? -2 : undefined);
    const row = [suffix, aIdx(aspectOf(r.w, r.h)), pi + 1, rest];
    const ed = edges[stem];
    if (ed?.length) { const s = [...ed].sort((x, y) => x - y); row.push(s.length === 2 && s[0] === 800 ? s[1] : s.length === 1 && s[0] === 800 ? 800 : s); }
    return row;
  };
  for (const key of [...groups.keys()].sort()) {
    const list = groups.get(key).sort((a, b) => a.rank - b.rank || a.order - b.order);
    let pre = list[0].stem;
    for (const e of list) { let i = 0; while (i < pre.length && i < e.stem.length && pre[i] === e.stem[i]) i++; pre = pre.slice(0, i); }
    if (key.startsWith('word:') && list.length === 1) { w[key.slice(5)] = mkRow(list[0].stem, list[0].stem, list[0].r); continue; }
    g[key] = [pre, list.map(({ stem, r }) => mkRow(stem, stem.slice(pre.length), r))];
  }
  const pictured = new Set([...Object.keys(w), ...Object.keys(g).filter((k) => k.startsWith('word:')).map((k) => k.slice(5))]);
  const x = wordAliases(dict, list, pictured);
  return { v: 1, p: prefixes, a: aspects, g, w, ...(Object.keys(x).length ? { x } : {}) };
}

export const serialize = (idx) => JSON.stringify(idx) + '\n';
/** The two files on disk: the index without x, and the aliases file. */
export function splitIndex(idx) { const { x = {}, ...index } = idx; return { index, aliases: { v: 1, x } }; }
export function buildIndex(root = ROOT) { return buildIndexFrom(loadSources(root)); }

if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  const { index, aliases } = splitIndex(buildIndex());
  const out = serialize(index), outX = serialize(aliases);
  const file = join(ROOT, INDEX_PATH), fileX = join(ROOT, ALIASES_PATH);
  if (out.length > MAX_BYTES) { console.error(`index is ${out.length} bytes, over the ${MAX_BYTES} limit`); process.exit(1); }
  if (process.argv.includes('--check')) {
    const cur = existsSync(file) ? readFileSync(file, 'utf8') : '';
    const curX = existsSync(fileX) ? readFileSync(fileX, 'utf8') : '';
    if (cur !== out || curX !== outX) { console.error(`${INDEX_PATH} or ${ALIASES_PATH} is out of date: run node tools/img/build_index.mjs`); process.exit(1); }
    console.log(`${INDEX_PATH} is in sync (${out.length} bytes); ${ALIASES_PATH} too (${Object.keys(aliases.x).length} aliases)`);
  } else {
    mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, out); writeFileSync(fileX, outX);
    const ix = JSON.parse(out); const n = Object.values(ix.g).reduce((s, x) => s + x[1].length, 0) + Object.keys(ix.w).length;
    console.log(`wrote ${INDEX_PATH}: ${n} images, ${Object.keys(ix.g).length + Object.keys(ix.w).length} groups, ${out.length} bytes; ${ALIASES_PATH}: ${Object.keys(aliases.x).length} word aliases`);
  }
}
