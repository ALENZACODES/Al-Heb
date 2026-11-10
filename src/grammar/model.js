/**
 * Grammar notes model (pure functions, no DOM). Every Hebrew string it returns is sliced out of data/vocab/words.json or
 * data/corpus/registry.json by rule; nothing is typed here. Labels: "rule-based" = derived from a vocabulary field by a rule;
 * "corpus-attested" = the form was found in a registry (prayer or Torah) line, whose id is given.
 */
export const STORE_KEY = 'grammar.v1';
export const TOPIC_IDS = ['article', 'prefixes', 'construct', 'plurals', 'roots', 'openings'];
export const LABELS = { rule: 'rule-based', corpus: 'corpus-attested' };
export const DRAFT_NOTICE = 'Draft, unreviewed: these notes and practice questions were built by a program from the vocabulary list and the prayer library. No Hebrew teacher has checked them yet, so treat them as a study aid, not an authority.';
export const QUESTIONS_PER_TOPIC = 6;
export const EXAMPLES_PER_TOPIC = 6;

// Which prayer/Torah lines hold a construct chain: registry id + token positions (0-based, whitespace tokens) + an English gloss.
export const CONSTRUCT_SPEC = [
  { id: 'shema-2', from: 1, to: 3, gloss: 'name of the glory of his kingship' },
  { id: 'kiddush-veshamru', from: 1, to: 1, gloss: 'children of Israel' },
  { id: 'ashrei-84-5', from: 1, to: 2, gloss: 'dwellers of your house' },
  { id: 'shir-hamaalot', from: 0, to: 1, gloss: 'song of the ascents' },
  { id: 'etz-chaim', from: 0, to: 1, gloss: 'tree of life' },
  { id: 'bless-formula-1', from: 4, to: 5, gloss: 'king of the world' },
  { id: 'kiddush-wine-1', from: 7, to: 8, gloss: 'fruit of the vine' },
  { id: 'havdalah-spices', from: 7, to: 8, gloss: 'kinds of spices' },
  { id: 'havdalah-flame', from: 7, to: 8, gloss: 'lights of the fire' },
  { id: 'lecha-dodi-1', from: 4, to: 5, gloss: 'the presence of the Sabbath' },
];

/** Seeded random numbers (mulberry32) so a practice set is repeatable in tests. */
export function seededRng(seed = 1) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function shuffle(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// ---- Hebrew helpers ----------------------------------------------------------------------------------------------------
const MARKS = /[֑-ׇ]/;
const DAGESH = 'ּ';
const SHEVA = 'ְ', HIRIQ = 'ִ', TSERE = 'ֵ', SEGOL = 'ֶ', PATAH = 'ַ', QAMATS = 'ָ';
/** Pointed text without cantillation, meteg, sof pasuq; NFC. */
export const norm = (s) => String(s || '').normalize('NFC').replace(/[֑-ֽ֯]/g, '').replace(/׃/g, '');
export const skeleton = (s) => String(s || '').replace(/[֑-ׇ]/g, '').replace(/[־׃]/g, '');
/** Letter clusters: a base letter plus its marks. */
export function clusters(s) {
  const out = [];
  for (const ch of norm(s)) {
    if (MARKS.test(ch) && out.length) out[out.length - 1].marks += ch;
    else out.push({ l: ch, marks: '' });
  }
  return out;
}
const hasMark = (c, m) => c.marks.includes(m);
const vowelsOf = (c) => [...c.marks].filter((m) => 'ְֱֲֳִֵֶַָֹֺֻ'.includes(m)).join('');
/** Text of clusters with the dagesh removed from the first one (the dagesh is what ha-, be- etc. leave behind). */
function joinNoFirstDagesh(cs) {
  return cs.map((c, i) => c.l + (i === 0 ? c.marks.replace(DAGESH, '') : c.marks)).join('').normalize('NFC');
}
/** Whitespace tokens of a registry line, then split at maqaf. */
export const lineTokens = (he) => norm(he).split(/\s+/).filter(Boolean);
export const subTokens = (tok) => tok.split('־').filter(Boolean);

/** Short English gloss for a vocab entry: first sense, no parentheses, no leading article. */
export function gloss(w) {
  let g = String(w?.en || '').split(';')[0].replace(/\([^)]*\)/g, '').trim();
  g = g.split(',')[0].trim().replace(/^(a|an|the|to) /i, (m) => (m.toLowerCase() === 'to ' ? 'to ' : '')).toLowerCase();
  return g;
}
const goodGloss = (w) => { const g = gloss(w); return g.length >= 2 && g.length <= 24 && !/[^\x20-\x7e]/.test(g); };

// ---- index of the vocabulary ---------------------------------------------------------------------------------------------
function indexVocab(words) {
  const byId = new Map(), byForm = new Map();
  for (const w of words) {
    if (!w?.he || !w.id) continue;
    byId.set(w.id, w);
    const key = joinNoFirstDagesh(clusters(w.he));
    const list = byForm.get(key) || [];
    list.push(w); byForm.set(key, list);
  }
  const pick = (key, poses) => (byForm.get(key) || []).filter((w) => poses.includes(w.pos) && goodGloss(w)).sort((a, b) => (a.frequencyRank ?? 1e9) - (b.frequencyRank ?? 1e9))[0] || null;
  return { byId, pick };
}

// ---- corpus forms --------------------------------------------------------------------------------------------------------
/** Every sub-token of every registry line: { form, entryId, index }. First sighting of a form wins. */
export function corpusForms(registry) {
  const seen = new Map();
  for (const e of registry) {
    lineTokens(e.he || '').forEach((tok, index) => {
      for (const sub of subTokens(tok)) if (!seen.has(sub)) seen.set(sub, { form: sub, entryId: e.id, index });
    });
  }
  return [...seen.values()];
}

/** ha- + noun. Returns { base:Word, prefixPart, rest, dagesh:boolean } or null. */
export function analyseArticle(form, pick) {
  const cs = clusters(form);
  if (cs.length < 4 || cs[0].l !== 'ה') return null;
  const v = vowelsOf(cs[0]);
  if (![PATAH, QAMATS, SEGOL].includes(v) || cs[0].marks.replace(v, '')) return null;
  const c1 = cs[1], dag = hasMark(c1, DAGESH);
  const gut = 'אער'.includes(c1.l), semi = 'הח'.includes(c1.l);
  const ok = (dag && !gut && !semi) || (!dag && gut && v === QAMATS) || (!dag && semi && v !== QAMATS);
  if (!ok) return null;
  const rest = cs.slice(1);
  const base = pick(joinNoFirstDagesh(rest), ['noun', 'adj']);
  if (!base) return null;
  return { base, rest: joinNoFirstDagesh(rest), dagesh: dag, vowel: v };
}

export const PREFIX_MEANING = { 'ו': 'and', 'ב': 'in / with', 'ל': 'to / for', 'מ': 'from', 'ש': 'that' };
export const PREFIX_NAME = { 'ו': 've-', 'ב': 'be-', 'ל': 'le-', 'מ': 'me-', 'ש': 'she-' };
/** one-letter prefix + listed word. */
export function analysePrefix(form, pick) {
  const cs = clusters(form);
  if (cs.length < 4) return null;
  const c0 = cs[0];
  if (!PREFIX_MEANING[c0.l]) return null;
  const m0 = c0.marks.replace(/[ּׁׂ]/g, '');
  let okVowel = false;
  if ('ובל'.includes(c0.l)) okVowel = m0 === SHEVA;
  else if (c0.l === 'מ') okVowel = m0 === HIRIQ || m0 === TSERE;
  else if (c0.l === 'ש') okVowel = m0 === SEGOL && hasMark(c0, 'ׁ');
  if (!okVowel) return null;
  if (c0.l === 'ו' && hasMark(c0, DAGESH)) return null;
  const rest = cs.slice(1);
  const base = pick(joinNoFirstDagesh(rest), c0.l === 'ש' ? ['noun', 'adj', 'verb'] : ['noun', 'adj']);
  if (!base) return null;
  if (cs.length - 1 < 3 && c0.l !== 'ש') return null;
  return { prefix: c0.l, base, rest: joinNoFirstDagesh(rest) };
}

const byRank = (a, b) => (a.base?.frequencyRank ?? 1e9) - (b.base?.frequencyRank ?? 1e9);
const entryRef = (c) => `reg:${c.entryId}#${c.index}`;

function articleTopic(ctx) {
  const pool = [], used = new Set();
  for (const c of ctx.forms) {
    const a = analyseArticle(c.form, ctx.vocab.pick);
    if (!a || used.has(a.base.id)) continue;
    used.add(a.base.id);
    pool.push({ ...c, a, base: a.base });
  }
  pool.sort(byRank);
  const items = pool.slice(0, 12).map((p) => ({
    id: entryRef(p), he: p.form, wordId: p.base.id, label: LABELS.corpus,
    note: `the ${gloss(p.base)} = ha- + ${p.a.dagesh ? 'doubled first letter (dagesh)' : 'no dagesh: the first letter cannot take one'}; base word ${p.base.he}`,
    baseHe: p.base.he, meaning: `the ${gloss(p.base)}`,
  }));
  return { items, rule: 'ha- + noun' };
}
function prefixTopic(ctx) {
  const by = {};
  for (const c of ctx.forms) {
    const a = analysePrefix(c.form, ctx.vocab.pick);
    if (!a) continue;
    (by[a.prefix] ||= []).push({ ...c, a, base: a.base });
  }
  const seen = new Set(), lists = Object.keys(PREFIX_MEANING).map((k) => (by[k] || []).sort(byRank).filter((p) => { const key = p.form; if (seen.has(key)) return false; seen.add(key); return true; }));
  const items = [];
  for (let r = 0; items.length < 14; r++) {
    let any = false;
    for (const l of lists) if (l[r]) { any = true; const p = l[r]; items.push({ id: entryRef(p), he: p.form, wordId: p.base.id, prefix: p.a.prefix, label: LABELS.corpus, baseHe: p.base.he, meaning: p.a.prefix === 'ש' ? `that ${gloss(p.base)}` : `${PREFIX_MEANING[p.a.prefix].split(' / ')[0]} ${gloss(p.base)}`, note: `${PREFIX_NAME[p.a.prefix]} (${PREFIX_MEANING[p.a.prefix]}) + ${p.base.he} (${gloss(p.base)})` }); }
    if (!any) break;
  }
  // order so the first six cover as many different prefixes as possible
  return { items, rule: 'one-letter prefix + listed word' };
}
function constructTopic(ctx) {
  const items = [];
  for (const s of CONSTRUCT_SPEC) {
    const e = ctx.registry.find((x) => x.id === s.id);
    if (!e) continue;
    const toks = lineTokens(e.he);
    const slice = toks.slice(s.from, s.to + 1);
    if (!slice.length || slice.length !== s.to - s.from + 1) continue;
    items.push({ id: `reg:${s.id}#${s.from}-${s.to}`, he: slice.join(' '), label: LABELS.corpus, meaning: s.gloss, note: `${s.gloss}: two nouns side by side, in the line "${e.title}"`, lineEnglish: e.english });
  }
  return { items, rule: 'noun + noun = X of Y' };
}
export function classifyPlural(w) {
  const pl = norm(w.forms?.plural || '');
  const end = skeleton(pl).slice(-2);
  const kind = end === 'ים' ? 'im' : end === 'ות' ? 'ot' : null;
  return { kind, regular: (w.gender === 'm' && kind === 'im') || (w.gender === 'f' && kind === 'ot') };
}
function pluralPool(words) {
  return words.filter((w) => w.pos === 'noun' && (w.gender === 'm' || w.gender === 'f') && w.number == null && typeof w.forms?.plural === 'string' && w.forms.plural && !/\s/.test(w.he) && !/\s/.test(w.forms.plural) && norm(w.forms.plural) !== norm(w.he) && goodGloss(w) && classifyPlural(w).kind)
    .sort((a, b) => (a.frequencyRank ?? 1e9) - (b.frequencyRank ?? 1e9));
}
export function pluralStats(words) {
  const all = words.filter((w) => w.pos === 'noun' && (w.gender === 'm' || w.gender === 'f') && typeof w.forms?.plural === 'string' && classifyPlural(w).kind);
  const n = (f) => all.filter(f).length;
  return { total: all.length, mIm: n((w) => w.gender === 'm' && classifyPlural(w).kind === 'im'), mOt: n((w) => w.gender === 'm' && classifyPlural(w).kind === 'ot'), fOt: n((w) => w.gender === 'f' && classifyPlural(w).kind === 'ot'), fIm: n((w) => w.gender === 'f' && classifyPlural(w).kind === 'im') };
}
function pluralsTopic(ctx) {
  const pool = pluralPool(ctx.words);
  const pick = (f, n) => pool.filter(f).slice(0, n);
  const reg = (w) => classifyPlural(w).regular;
  const chosen = [...pick((w) => w.gender === 'm' && reg(w), 3), ...pick((w) => w.gender === 'f' && reg(w), 3), ...pick((w) => !reg(w), 2)];
  const rest = pool.filter((w) => !chosen.includes(w)).slice(0, 6);
  const items = [...chosen, ...rest].map((w) => {
    const c = classifyPlural(w);
    return { id: `word:${w.id}`, he: w.forms.plural, wordId: w.id, label: LABELS.rule, singular: w.he, gender: w.gender, meaning: `${gloss(w)}, plural`,
      note: `${w.he} (${w.gender === 'm' ? 'masculine' : 'feminine'}, ${gloss(w)}) -> ${w.forms.plural}: ${c.regular ? 'the usual ending' : 'an exception to the usual ending'}` };
  });
  // examples: interleave so the first six show both genders and at least one exception when one exists
  const order = [...items.filter((i) => i.gender === 'm').slice(0, 2), ...items.filter((i) => i.gender === 'f').slice(0, 2), ...items.filter((i) => /exception/.test(i.note)).slice(0, 2)];
  const first = [...new Set(order)];
  for (const i of items) if (first.length < EXAMPLES_PER_TOPIC && !first.includes(i)) first.push(i);
  return { items: [...first, ...items.filter((i) => !first.includes(i))], rule: 'm + -im, f + -ot', stats: pluralStats(ctx.words) };
}
function subsequence(root, word) {
  const letters = root.split('־').join('').split('־').join('');
  const cs = [...skeleton(word)];
  let j = 0, hit = 0;
  for (const ch of letters) { const k = cs.indexOf(ch, j); if (k >= 0) { hit++; j = k + 1; } }
  return hit;
}
export function rootFamilies(words) {
  const fam = new Map();
  for (const w of words) {
    if (!w.root || typeof w.root !== 'string' || !['verb', 'noun', 'adj'].includes(w.pos) || /\s/.test(w.he) || !goodGloss(w)) continue;
    const letters = w.root.replace(/[־\-\s]/g, '');
    if (letters.length < 2 || subsequence(letters, w.he) < Math.min(2, letters.length)) continue;
    const f = fam.get(w.root) || { root: w.root, words: [] };
    if (!f.words.some((x) => skeleton(x.he) === skeleton(w.he) || gloss(x) === gloss(w))) f.words.push(w);
    fam.set(w.root, f);
  }
  return [...fam.values()].filter((f) => f.words.length >= 3).map((f) => ({ ...f, words: f.words.sort((a, b) => (a.frequencyRank ?? 1e9) - (b.frequencyRank ?? 1e9)), score: Math.min(...f.words.map((w) => w.frequencyRank ?? 1e9)) })).sort((a, b) => a.score - b.score);
}
function rootsTopic(ctx) {
  const fams = rootFamilies(ctx.words).slice(0, 12);
  const items = fams.map((f) => ({ id: `root:${f.root}`, he: f.words.slice(0, 4).map((w) => w.he).join('  '), label: LABELS.rule, root: f.root, wordIds: f.words.slice(0, 4).map((w) => w.id), meaning: f.root,
    note: `root ${f.root}: ${f.words.slice(0, 4).map((w) => `${w.he} (${gloss(w)})`).join(', ')}`, family: f.words }));
  return { items, rule: 'shared root field in the vocabulary list' };
}
const OPEN_N = 3;
export function openingGroups(registry) {
  const seen = new Map();
  for (const e of registry) {
    const toks = lineTokens(e.he || '');
    if (toks.length < 2 || !e.english) continue;
    const key = toks.slice(0, OPEN_N).join(' ');
    const g = seen.get(key) || { key, count: 0, entry: e };
    g.count++; seen.set(key, g);
  }
  return [...seen.values()];
}
function openingsTopic(ctx) {
  const groups = openingGroups(ctx.registry);
  const bless = groups.filter((g) => g.key.startsWith(lineTokens(ctx.registry.find((e) => e.id === 'bless-formula-1')?.he || '')[0] || '\0')).reduce((n, g) => n + g.count, 0);
  const sorted = groups.sort((a, b) => b.count - a.count);
  const items = sorted.map((g) => ({ id: `reg:${g.entry.id}#0-${OPEN_N - 1}`, he: g.key, label: LABELS.corpus, count: g.count, meaning: shortEnglish(g.entry.english), entryId: g.entry.id,
    note: `opens ${g.count} line${g.count === 1 ? '' : 's'} in the library; in "${g.entry.title}": ${shortEnglish(g.entry.english)}` }));
  // examples: the formula first, then the most varied openings
  const firstTok = (i) => i.he.split(' ')[0];
  const out = [], tokSeen = new Set();
  for (const i of items) if (!tokSeen.has(firstTok(i))) { tokSeen.add(firstTok(i)); out.push(i); }
  return { items: [...out, ...items.filter((i) => !out.includes(i))], rule: 'stock opening words', blessingLines: bless };
}
export function shortEnglish(en) {
  const s = String(en || '').split(/[;:]/)[0].trim();
  return s.length > 60 ? s.slice(0, 57).trimEnd() + '...' : s;
}

// ---- topics --------------------------------------------------------------------------------------------------------------
/** @param {{words:any[], registry:any[], notes:any}} data */
export function buildTopics(data) {
  const vocab = indexVocab(data.words || []);
  const ctx = { words: data.words || [], registry: data.registry || [], vocab, forms: corpusForms(data.registry || []) };
  const parts = { article: articleTopic(ctx), prefixes: prefixTopic(ctx), construct: constructTopic(ctx), plurals: pluralsTopic(ctx), roots: rootsTopic(ctx), openings: openingsTopic(ctx) };
  const topics = {};
  for (const id of TOPIC_IDS) {
    const n = data.notes?.topics?.[id] || {};
    const p = parts[id];
    topics[id] = { id, title: n.title || id, summary: n.summary || '', explanation: n.explanation || '', labels: [...new Set(p.items.map((i) => i.label))], rule: p.rule, items: p.items, examples: p.items.slice(0, EXAMPLES_PER_TOPIC), stats: p.stats, blessingLines: p.blessingLines };
  }
  return topics;
}

// ---- practice ------------------------------------------------------------------------------------------------------------
/** @returns {{prompt:string, options:string[], answer:number, explain:string, optionLang:'he'}} */
function mk(prompt, correctHe, wrongHes, explain, rng) {
  const options = shuffle([correctHe, ...wrongHes], rng);
  return { prompt, options, answer: options.indexOf(correctHe), explain };
}
const uniq = (arr) => [...new Set(arr)];
/** Six pick-the-form questions for one topic. Fewer when the data cannot support six (see docs/grammar/GAPS.md). */
export function buildQuestions(topic, rng = Math.random, n = QUESTIONS_PER_TOPIC) {
  const items = topic.items || [];
  const qs = [];
  const others = (it, pool) => shuffle(pool.filter((x) => x !== it && x.he !== it.he && x.meaning !== it.meaning), rng);
  const take = (pool, count) => { const o = []; for (const x of pool) if (o.length < count && !o.some((y) => y.he === x.he)) o.push(x); return o; };
  const order = shuffle(items.slice(0, 12).filter((i) => i.prefix !== '\u05E9'), rng);
  const kindPrompt = {
    article: (it) => `Which form means "${it.meaning}"?`,
    prefixes: (it) => `Which word means "${it.meaning}"?`,
    construct: (it) => `Which chain means "${it.meaning}"?`,
    plurals: (it) => `Pick the plural of ${it.singular} ("${gloss({ en: it.meaning.replace(', plural', '') })}").`,
    roots: null, openings: (it) => `Which opening goes with this English: "${it.meaning}"?`,
  }[topic.id];
  if (topic.id === 'roots') {
    const fams = items.filter((i) => i.family && i.family.length >= 3);
    const pool = fams.flatMap((f) => f.family.slice(0, 4).map((w) => ({ w, f })));
    for (const f of shuffle(fams, rng)) {
      if (qs.length >= n) break;
      const [given, same] = shuffle(f.family.slice(0, 4), rng);
      const wrong = take(shuffle(pool.filter((p) => p.f !== f && !f.family.some((x) => skeleton(x.he) === skeleton(p.w.he))), rng).map((p) => p.w), 3).map((w) => w.he);
      if (!given || !same || wrong.length < 3) continue;
      qs.push(mk(`Which word shares the root ${f.root} with ${given.he} ("${gloss(given)}")?`, same.he, wrong, `${given.he} and ${same.he} are both recorded under the root ${f.root}.`, rng));
    }
    return qs;
  }
  for (const it of order) {
    if (qs.length >= n) break;
    const wrong = take(others(it, items), 3);
    if (wrong.length < 3) continue;
    let pool = wrong;
    if (topic.id === 'plurals') { // keep a mix of endings among the choices
      const ends = uniq([it, ...wrong].map((x) => skeleton(x.he).slice(-2)));
      if (ends.length < 2) { const alt = others(it, items).find((x) => skeleton(x.he).slice(-2) !== skeleton(it.he).slice(-2)); if (alt) pool = [alt, ...wrong.slice(0, 2)]; }
    }
    qs.push(mk(kindPrompt(it), it.he, pool.map((x) => x.he), it.note, rng));
  }
  return qs;
}
