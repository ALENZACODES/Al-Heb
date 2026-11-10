// Pronunciation rules and a stratified sample of the rule-generated respellings (data/pronunciation/variants).
// The respellings are derived output (6,630 records x 3 traditions). They are NOT sent to reviewers row by row:
// a reviewer judges the RULES, then a sample that exercises every rule. Read-only; nothing here writes to data/.
//
// Rule ids on a sample row come from three places:
//   sign:<name>   which written signs the Hebrew contains (detected from the characters, see SIGN_RULES). This is a
//                 stratification label, not a trace of the generator: a row tagged sign:tzere contains a tzere, and
//                 the reviewer judges the whole respelling anyway.
//   stress:<rule> the `rule` text the generator stored on the stressed syllable of that tradition.
//   flag:<flag>   a flag the generator stored on the record.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const TRADITIONS = ['israeli', 'sephardi', 'ashkenazi'];
export const SAMPLE_PER_TRADITION = 200;
export const MIN_PER_RULE = 2;

const rdJson = (root, rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const DIR = 'data/pronunciation/variants';

export function loadVariants(root) {
  if (!fs.existsSync(path.join(root, DIR, '_index.json'))) return null;
  const idx = rdJson(root, `${DIR}/_index.json`);
  const records = [];
  for (const sh of idx.shards) rdJson(root, `${DIR}/${sh.file}`).records.forEach((r, i) => records.push({ ...r, _file: `${DIR}/${sh.file}`, _i: i }));
  return { idx, records };
}

// ---- sign rules: id, doc label (the "Sign" cell of docs/pronunciation/VARIANTS.md), detector over clusters
const M = (re) => (c) => re.test(c.marks);
const L = (letters, extra = () => true) => (c) => letters.includes(c.letter) && extra(c);
export const SIGN_RULES = [
  { id: 'kamatz', doc: 'kamatz (gadol)', test: M(/ָ/) },
  { id: 'kamatz-katan', doc: 'kamatz katan', test: M(/ׇ/) },
  { id: 'patach', doc: 'patach, chataf-patach', test: M(/[ֲַ]/) },
  { id: 'tzere', doc: 'tzere', test: M(/ֵ/) },
  { id: 'segol', doc: 'segol, chataf-segol', test: M(/[ֱֶ]/) },
  { id: 'chirik', doc: 'chirik', test: M(/ִ/) },
  { id: 'cholam', doc: 'cholam (chaser and malei)', test: (c) => /[ֹֺ]/.test(c.marks) },
  { id: 'kubutz-shuruk', doc: 'kubutz, shuruk', test: (c) => /ֻ/.test(c.marks) || (c.letter === 'ו' && /ּ/.test(c.marks) && !/[ְ-ֻ]/.test(c.marks.replace(/ּ/g, ''))) },
  { id: 'chataf-kamatz', doc: 'chataf-kamatz', test: M(/ֳ/) },
  { id: 'shva', doc: ['shva na', 'shva nach'], test: M(/ְ/) },
  { id: 'dagesh-bkp', doc: 'dagesh in bet / kaf / pe', test: L('בכךפף', (c) => /ּ/.test(c.marks)) },
  { id: 'tav-no-dagesh', doc: 'tav without dagesh', test: L('ת', (c) => !/ּ/.test(c.marks)) },
  { id: 'chet', doc: 'chet', test: L('ח') },
  { id: 'khaf', doc: 'khaf', test: L('כך', (c) => !/ּ/.test(c.marks)) },
  { id: 'ayin', doc: 'ayin', test: L('ע') },
  { id: 'alef', doc: 'alef', test: L('א') },
  { id: 'resh', doc: 'resh', test: L('ר') },
  { id: 'he', doc: 'he', test: L('ה') },
  { id: 'vav', doc: 'vav', test: L('ו') },
  { id: 'shin-undotted', doc: 'shin without a dot', test: L('ש', (c) => !/[ׁׂ]/.test(c.marks)) },
];
const WORD_RULES = [
  { id: 'furtive-patach', doc: 'furtive patach', test: (cl) => { const l = cl[cl.length - 1]; return !!l && 'חעה'.includes(l.letter) && /ַ/.test(l.marks) && cl.length > 1; } },
];

function clusters(word) {
  const out = [];
  const re = /([א-ת])([֑-ׇ]*)/g;
  let m;
  while ((m = re.exec(word))) out.push({ letter: m[1], marks: m[2] });
  return out;
}

/** Sign-rule ids found in a record's Hebrew (any word of it). */
export function signRules(he) {
  const found = new Set();
  for (const w of String(he || '').split(/[\s־-]+/)) {
    const cl = clusters(w);
    for (const c of cl) for (const r of SIGN_RULES) if (r.test(c)) found.add(r.id);
    for (const r of WORD_RULES) if (r.test(cl)) found.add(r.id);
  }
  return [...found];
}

export function rulesOfRecord(rec, trad) {
  const set = new Set(signRules(rec.he).map((x) => `sign:${x}`));
  for (const s of (rec.variants?.[trad]?.stress || [])) if (s && s.rule) set.add(`stress:${s.rule}`);
  for (const f of rec.flags || []) set.add(`flag:${f}`);
  return [...set];
}

// ---- rule list, with the project's own description of each rule (docs/pronunciation/VARIANTS.md)
function parseDoc(root) {
  const f = path.join(root, 'docs/pronunciation/VARIANTS.md');
  const out = { sign: new Map(), flag: new Map() };
  if (!fs.existsSync(f)) return out;
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  let sect = '';
  for (const ln of lines) {
    if (/^## /.test(ln)) sect = ln;
    if (!ln.startsWith('|')) continue;
    const cells = ln.split('|').slice(1, -1).map((x) => x.trim());
    if (/^## Rules, by tradition/.test(sect) && cells.length === 5 && !/^-+$/.test(cells[0]) && cells[0] !== 'Sign') out.sign.set(cells[0].toLowerCase(), { israeli: cells[1], sephardi: cells[2], ashkenazi: cells[3], source: cells[4] });
    if (/^## Flags/.test(sect) && cells.length === 3) { const k = cells[0].replace(/`/g, ''); if (k !== 'Flag' && !/^-+$/.test(k)) out.flag.set(k, cells[2]); }
  }
  return out;
}

/**
 * The rule list: one entry per rule id that occurs in the data or is named in the rules doc.
 * { id, kind, label, text, count: {tradition: n}, docRow }
 */
export function ruleList(root, data) {
  const doc = parseDoc(root);
  const rules = new Map();
  const ensure = (id, kind, label) => { if (!rules.has(id)) rules.set(id, { id, kind, label, text: '', count: { israeli: 0, sephardi: 0, ashkenazi: 0 }, docRow: false }); return rules.get(id); };
  const docText = (name) => {
    const d = doc.sign.get(name.toLowerCase()) || [...doc.sign].find(([k]) => k.startsWith(name.toLowerCase()))?.[1];
    return d ? `${name}: Israeli ${d.israeli}; Sephardi ${d.sephardi}; Ashkenazi ${d.ashkenazi}. Source and notes: ${d.source}` : '';
  };
  for (const r of [...SIGN_RULES, ...WORD_RULES]) {
    const names = [].concat(r.doc);
    const e = ensure(`sign:${r.id}`, 'sign', names.join(' / '));
    const texts = names.map(docText).filter(Boolean);
    if (texts.length) { e.docRow = true; e.text = texts.join('\n'); }
  }
  for (const rec of data.records) for (const t of TRADITIONS) for (const id of rulesOfRecord(rec, t)) {
    const [kind, ...rest] = id.split(':');
    const e = ensure(id, kind, rest.join(':'));
    e.count[t]++;
    if (kind === 'flag' && !e.text) e.text = doc.flag.get(rest.join(':')) || docText(rest.join(':').replace(/-/g, ' ')) || 'Informational flag (not in the review CSV).';
    if (kind === 'stress' && !e.text) e.text = 'Stress rule recorded by the generator on the stressed syllable of this tradition.';
  }
  const order = { sign: 0, stress: 1, flag: 2 };
  return [...rules.values()].sort((a, b) => order[a.kind] - order[b.kind] || (a.id < b.id ? -1 : 1));
}

// ---- deterministic stratified sample
const h = (s) => crypto.createHash('sha1').update(s).digest('hex');

/**
 * ~n records for one tradition such that every rule that occurs for that tradition appears on at least
 * MIN_PER_RULE rows (or on every row it has, if fewer). Rare rules are served first; the rest is filled
 * proportionally by record source. Returns [{ rec, rules }]. Deterministic: ties are broken by a hash of the id.
 */
export function sampleFor(data, trad, n = SAMPLE_PER_TRADITION) {
  const withRules = data.records.filter((r) => r.variants?.[trad]).map((rec) => ({ rec, rules: rulesOfRecord(rec, trad) }));
  const byRule = new Map();
  for (const x of withRules) for (const id of x.rules) { if (!byRule.has(id)) byRule.set(id, []); byRule.get(id).push(x); }
  const chosen = new Map();
  const need = new Map([...byRule.keys()].map((id) => [id, Math.min(MIN_PER_RULE, byRule.get(id).length)]));
  const cnt = new Map();
  const have = (id) => cnt.get(id) || 0;
  const take = (x) => { chosen.set(x.rec.id, x); for (const id of x.rules) cnt.set(id, have(id) + 1); };
  const order = [...byRule.entries()].sort((a, b) => a[1].length - b[1].length || (a[0] < b[0] ? -1 : 1));
  for (const [id, list] of order) {
    while (have(id) < need.get(id)) {
      const cand = list.filter((x) => !chosen.has(x.rec.id));
      if (!cand.length) break;
      // prefer the candidate that also serves the most still-short rules, then a short Hebrew string, then hash
      const score = (x) => x.rules.filter((r) => have(r) < need.get(r)).length;
      cand.sort((a, b) => score(b) - score(a) || String(a.rec.he).length - String(b.rec.he).length || (h(a.rec.id) < h(b.rec.id) ? -1 : 1));
      take(cand[0]);
    }
  }
  // fill to n proportionally by record source (vocab word / phrase, phrasebook, corpus line)
  const stratum = (x) => `${x.rec.source}/${x.rec.kind}`;
  const strata = new Map();
  for (const x of withRules) { const k = stratum(x); if (!strata.has(k)) strata.set(k, []); strata.get(k).push(x); }
  const total = withRules.length;
  for (const [k, list] of strata) {
    const want = Math.max(1, Math.round((n * list.length) / total));
    const have0 = [...chosen.values()].filter((x) => stratum(x) === k).length;
    const cand = list.filter((x) => !chosen.has(x.rec.id)).sort((a, b) => (h(a.rec.id) < h(b.rec.id) ? -1 : 1));
    for (let i = 0; have0 + i < want && i < cand.length && chosen.size < n; i++) take(cand[i]);
  }
  return [...chosen.values()].sort((a, b) => (a.rec.id < b.rec.id ? -1 : 1));
}

export function coverage(data, trad, sample) {
  const all = new Set(), got = new Set();
  for (const r of data.records) if (r.variants?.[trad]) for (const id of rulesOfRecord(r, trad)) all.add(id);
  for (const x of sample) for (const id of x.rules) got.add(id);
  return { rules: all.size, covered: [...all].filter((id) => got.has(id)).length, missing: [...all].filter((id) => !got.has(id)) };
}

export const SAMPLE_SOURCE_LABEL = { phrasebook: 'Phrasebook', corpus: 'Prayer/Torah corpus', vocab: 'Vocabulary' };
