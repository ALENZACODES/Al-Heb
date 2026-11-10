// Ask the Torah, in the browser: map a learner's question to the closest vetted question in data/ask/bank.json, or to nothing.
// No server and no model. Keyword search (BM25) over the bank questions with English stemming, a small synonym table, Hebrew with
// the vowel marks and one- or two-letter prefixes stripped, and typo repair against the bank's own words. When the best match does
// not cover enough of the question, the answer is "no vetted answer yet": a verse is never guessed. Pure; used by src/ask/ask.view.js
// and by tools/ask-torah/eval/eval_static_match.mjs.

const STOP = new Set(('a an the of in on at to for from by with about and or but is are was were be been being do does did done have has had ' +
  'it its this that these those there here what which who whom whose where when why how whats wheres whos hows can could should would will ' +
  'shall may might must i me my we us our you your he him his she her they them their please tell say says said mention mentioned mentions talk ' +
  'talks talking about like just really even any some anything something thing things r u ur pls plz also as so if then than not no yes ' +
  'know want wanna gonna mean means meaning deal ok okay sorry meant actually right tho though kinda sort stuff bit lot ' +
  'someone something anyone everyone guess think thought wonder wondering exactly basically literally ever even still yet ' +
  'according book books chumash pentateuch five bible scripture scriptures verse verses passage text written writes write wrote ' +
  'torah tanakh').split(/\s+/));
// Spellings learners use, folded to the bank's word (kept small and checked against the bank by the eval).
export const SYNONYMS = Object.freeze({
  sabbath: 'shabbat', shabbos: 'shabbat', shabat: 'shabbat', shabbes: 'shabbat',
  shma: 'shema', sh_ma: 'shema',
  chanukah: 'hanukkah', hanukah: 'hanukkah', chanuka: 'hanukkah', hannukah: 'hanukkah', chanukkah: 'hanukkah',
  kashrut: 'kosher', kashrus: 'kosher', casherut: 'kosher', kashrut_: 'kosher', kasher: 'kosher', treif: 'kosher', treyf: 'kosher',
  pesach: 'passover', pesah: 'passover', sukkos: 'sukkot', succot: 'sukkot', shavuos: 'shavuot', yom_kippur: 'kippur',
  moses: 'moses', moshe: 'moses', avraham: 'abraham', yitzchak: 'isaac', yaakov: 'jacob', yakov: 'jacob', yosef: 'joseph', miryam: 'miriam',
  aharon: 'aaron', sarah: 'sarah', sara: 'sarah', rivka: 'rebekah', rebecca: 'rebekah', rachel: 'rachel', leah: 'leah',
  god: 'god', gd: 'god', hashem: 'god', lord: 'god', commandments: 'commandment', mitzvot: 'commandment', mitzvah: 'commandment', mitzvos: 'commandment',
  tefillin: 'tefillin', phylacteries: 'tefillin', tzitzit: 'fringe', tzitzis: 'fringe', mezuza: 'mezuzah',
});
const NIQQUD = /[֑-ׇ]/g;
const HE_PREFIX = /^[והבלמשכ]{1,2}(?=[א-ת]{3,})/;

function stem(w) {
  if (w.length > 5 && w.endsWith('ing')) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith('ed')) w = w.slice(0, -2);
  else if (w.length > 4 && w.endsWith('ies')) w = w.slice(0, -3) + 'y';
  else if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);
  return w;
}

/** Words of a question: English stemmed and folded through SYNONYMS, Hebrew without vowel marks plus its unprefixed form. */
export function tokens(text) {
  const t = String(text || '').toLowerCase().replace(NIQQUD, '').replace(/[־]/g, ' ').replace(/['’`]s\b/g, '').replace(/[^a-z0-9א-ת]+/g, ' ');
  const out = [];
  for (const raw of t.split(' ')) {
    if (!raw) continue;
    if (/[א-ת]/.test(raw)) { out.push(raw); const bare = raw.replace(HE_PREFIX, ''); if (bare !== raw) out.push(bare); continue; }
    if (STOP.has(raw) || raw.length < 2 || /^\d+$/.test(raw)) continue;
    const syn = SYNONYMS[raw];
    out.push(syn || stem(raw));
  }
  return out;
}

function edits(a, b, max) { // Damerau-Levenshtein with an early stop
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let best = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      if (d[i][j] < best) best = d[i][j];
    }
    if (best > max) return max + 1;
  }
  return d[a.length][b.length];
}

const BOOKS = [['genesis', /\b(genesis|gen|bereshit|bereishit|b'reshit)\b/], ['exodus', /\b(exodus|exod|ex|shemot|shmot)\b/],
  ['leviticus', /\b(leviticus|lev|vayikra)\b/], ['numbers', /\b(numbers|num|bamidbar|bemidbar)\b/], ['deuteronomy', /\b(deuteronomy|deut|dt|devarim)\b/]];
/** "Genesis 1:1", "gen 1 1", "Exodus chapter 20 verse 2" -> "genesis.1.1"; null when the question names no single verse. */
export function parseRef(text) {
  const t = String(text || '').toLowerCase();
  for (const [id, re] of BOOKS) {
    const m = re.exec(t); if (!m) continue;
    const rest = t.slice(m.index + m[0].length, m.index + m[0].length + 40);
    const r = /^\s*(?:chapter\s*)?(\d{1,3})\s*(?::|\.|,|\s+verse\s*|\s+v\.?\s*|\s+)(\d{1,3})\b/.exec(rest);
    if (r) return `${id}.${Number(r[1])}.${Number(r[2])}`;
  }
  return null;
}

/** Build the search index once per page from bank.questions ([[question, answerId], ...]). */
export function buildIndex(questions) {
  const docs = [], df = new Map(), byLen = new Map();
  let total = 0;
  for (const [q, a] of questions) {
    const tf = new Map();
    for (const w of tokens(q)) tf.set(w, (tf.get(w) || 0) + 1);
    let len = 0; for (const n of tf.values()) len += n;
    total += len;
    docs.push({ q, a, tf, len, ref: parseRef(q) });
    for (const w of tf.keys()) df.set(w, (df.get(w) || 0) + 1);
  }
  for (const w of df.keys()) { if (/[א-ת]/.test(w) || w.length < 4) continue; const k = w.length; if (!byLen.has(k)) byLen.set(k, []); byLen.get(k).push(w); }
  const post = new Map();
  docs.forEach((d, i) => { for (const w of d.tf.keys()) { if (!post.has(w)) post.set(w, []); post.get(w).push(i); } });
  const N = docs.length;
  const idf = (w) => { const n = df.get(w) || 0; return Math.log(1 + (N - n + 0.5) / (n + 0.5)); };
  const byRef = new Map(); docs.forEach((d, i) => { if (d.ref) { if (!byRef.has(d.ref)) byRef.set(d.ref, []); byRef.get(d.ref).push(i); } });
  return { docs, df, post, idf, avg: total / Math.max(1, N), byLen, byRef, N, exact: new Map(questions.map(([q, a]) => [q.toLowerCase().replace(/\s+/g, ' ').trim(), a])) };
}

/** A word not in the bank, mended to the closest bank word (1 edit up to 6 letters, 2 above), preferring the commoner word. */
function mend(ix, w) {
  if (ix.df.has(w) || w.length < 4 || /[א-ת0-9]/.test(w)) return ix.df.has(w) ? w : null;
  const max = w.length > 6 ? 2 : 1;
  let best = null, bestD = max + 1, bestDf = 0;
  for (let L = w.length - max; L <= w.length + max; L++) {
    for (const v of ix.byLen.get(L) || []) {
      const e = edits(w, v, max);
      const n = ix.df.get(v);
      if (e < bestD || (e === bestD && n > bestDf)) { best = v; bestD = e; bestDf = n; }
    }
  }
  return bestD <= max ? best : null;
}

export const MIN_COVER = 0.6;

/**
 * Closest vetted question, or null. Returns { answerId, question, cover, score } where cover is the share of the question's
 * weight (IDF) that the match contains; below MIN_COVER the result is null and the page says it has no vetted answer yet.
 * @param {ReturnType<typeof buildIndex>} ix @param {string} text
 */
export function match(ix, text, { minCover = MIN_COVER, skip = null } = {}) {
  const key = String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (!skip && ix.exact.has(key)) return { answerId: ix.exact.get(key), question: text, cover: 1, score: Infinity, exact: true };
  // A named verse is matched only to questions about that same verse; with none in the bank the caller shows the verse itself.
  const ref = parseRef(text);
  if (ref) {
    const cands = (ix.byRef.get(ref) || []).filter((i) => !(skip && skip(i)));
    if (!cands.length) return { verseId: ref, cover: 1, score: 0 };
    const qt0 = new Set(tokens(text));
    let bi = cands[0], bs = -1;
    for (const i of cands) { let s2 = 0; for (const w of ix.docs[i].tf.keys()) if (qt0.has(w)) s2 += ix.idf(w); if (s2 > bs) { bs = s2; bi = i; } }
    return { answerId: ix.docs[bi].a, question: ix.docs[bi].q, cover: 1, score: bs, index: bi };
  }
  const raw = tokens(text);
  if (!raw.length) return null;
  const qt = []; let weight = 0;
  const maxIdf = Math.log(1 + (ix.N + 0.5) / 0.5);
  for (const w of new Set(raw)) {
    const m = mend(ix, w);
    if (m) { qt.push(m); weight += ix.idf(m); } else weight += maxIdf * 0.6; // an unknown word still counts against the match
  }
  if (!qt.length) return null;
  const k1 = 1.2, b = 0.5, scores = new Map();
  for (const w of new Set(qt)) {
    const iw = ix.idf(w);
    for (const i of ix.post.get(w) || []) {
      if (skip && skip(i)) continue;
      const d = ix.docs[i], f = d.tf.get(w);
      scores.set(i, (scores.get(i) || 0) + iw * (f * (k1 + 1)) / (f + k1 * (1 - b + b * d.len / ix.avg)));
    }
  }
  let bestI = -1, best = -1, bestCover = 0;
  for (const [i, s] of scores) {
    const d = ix.docs[i];
    let have = 0; for (const w of new Set(qt)) if (d.tf.has(w)) have += ix.idf(w);
    const cover = have / weight;
    // the doc's own extra words dilute it a little, so "Shabbat" prefers "Where is Shabbat in the Torah?" over a long question that only mentions it
    let extra = 0; for (const w of d.tf.keys()) if (!qt.includes(w)) extra += ix.idf(w);
    const rank = s + 2 * cover - 0.05 * extra;
    if (rank > best) { best = rank; bestI = i; bestCover = cover; }
  }
  if (bestI < 0 || bestCover < minCover) return null;
  const d = ix.docs[bestI];
  return { answerId: d.a, question: d.q, cover: bestCover, score: best, index: bestI };
}

/** Which answer shard holds an answer id (must match tools/ask-torah/build_static.py). */
export const shardOf = (answerId, shards = 32) => parseInt(String(answerId), 16) % shards;

// ---------- topics and rewrites (data/ask/topics.json, exported from tools/ask-torah: knowledge/*.json and ask_torah/rewrite.py) ----------

/** The pipeline's typo and phrase rewrites, applied before matching (same order: phrases, then whole-word typos). */
export function rewrite(text, rw) {
  let q = String(text || '');
  for (const [src, repl] of rw?.phrases || []) { try { q = q.replace(new RegExp(src, 'gi'), repl); } catch { /* a pattern this browser cannot read is skipped */ } }
  q = q.replace(/[A-Za-z']+/g, (w) => rw?.typos?.[w.toLowerCase()] || w);
  if (/\bmourn|\bgriev/i.test(q)) q = q.replace(/\bmorning\b/gi, '').replace(/\s+/g, ' ').trim();
  return q;
}

const FOLLOWUP = /^(so |ok |okay |ya |yeah |and |then |wait |but |what about|how about|can i |so is |so then|sorry )/i;
/** A short follow-up is read together with the learner's last two questions (as the pipeline does). */
export function withHistory(text, history = [], rw) {
  const q = String(text || '').trim();
  const hist = (history || []).map((x) => String(x || '').trim()).filter(Boolean);
  if (!hist.length) return rewrite(q, rw);
  const short = q.split(/\s+/).length <= 12 || FOLLOWUP.test(q) || (q.endsWith('?') && q.length < 80);
  if (!short) return rewrite(q, rw);
  const prior = rewrite(hist.slice(-2).join(' '), rw);
  let joined = prior + ' ' + q;
  if (/\b(adam|eve)\b/i.test(prior) && /\b(kids?|children|sons?|daughters?)\b/i.test(q)) joined += ' Cain Abel';
  if (/\b(shabbat|sabbath)\b/i.test(prior) && /\b(cook|cooking|fire|drive|driving)\b/i.test(q)) joined += ' kindle fire seethe sabbath';
  if (/\b(tefillin|frontlets)\b/i.test(prior) && /\b(boxes|box|straps?)\b/i.test(q)) joined += ' tefillin frontlets';
  if (/\bwomen\b/i.test(prior) && /\b(lead|woman who|name one)\b/i.test(q)) joined += ' Miriam prophetess';
  return rewrite(joined, rw);
}

const plain = (t) => ' ' + String(t || '').toLowerCase().replace(NIQQUD, '').replace(/[\u05BE]/g, ' ').replace(/[^a-z0-9\u05D0-\u05EA]+/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
/** Topic index: every term as plain text, longest first, so "tree of knowledge" wins over "knowledge". */
export function buildTopics(topics) {
  const terms = [];
  for (const t of topics || []) for (const term of t.terms || []) { const p = plain(term).trim(); if (p.length >= 3) terms.push({ p: ' ' + p + ' ', len: p.length, a: t.a, id: t.id, kind: t.kind }); }
  terms.sort((x, y) => y.len - x.len);
  return terms;
}
/** The topic a question is about, or null. A quoted phrase is a quote lookup, never a topic. */
export function topicOf(topicIx, text) {
  if (/[“”"«»]/.test(String(text || ''))) return null;
  const q = plain(text);
  for (const t of topicIx) if (q.includes(t.p)) return t;
  return null;
}

/**
 * The whole lookup the page uses: rewrites and history first, then a named verse, an exact bank question, a topic, and last the
 * keyword match. Returns { answerId, question?, topic?, verseId?, cover } or null (no vetted answer yet).
 */
export function lookup(c, text, history = []) {
  // The question on its own first: "weather in Tel Aviv" after a question about Adam is about the weather, not Adam. Only a question
  // that finds nothing alone is read together with the earlier ones (with the pipeline's follow-up hints, e.g. kids -> Cain and Abel).
  const alone = lookupOne(c, text, rewrite(text, c.rw));
  if (alone || !(history || []).length) return alone;
  // ...and only when it reads like a follow-up ("what about their kids", "so is it..."), never a new subject such as the weather.
  if (!(FOLLOWUP.test(String(text).trim()) || /\b(it|its|they|them|their|he|him|his|she|her|that|this|those|there|then)\b/i.test(String(text)))) return null;
  return lookupOne(c, text, withHistory(text, history, c.rw), true);
}
function lookupOne({ ix, topicIx }, text, q, followUp = false) {
  const ref = parseRef(q);
  if (ref) return match(ix, q);
  const key = String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (ix.exact.has(key)) return { answerId: ix.exact.get(key), question: text, cover: 1, exact: true };
  // A topic the pipeline knows comes before the keyword match (a quoted phrase never counts as a topic, see topicOf).
  const t0 = !followUp && topicOf(topicIx, q);
  if (t0) return { answerId: t0.a, topic: t0.id, cover: 1 };
  // The keyword match needs two words of substance: one word ("kids") is too little to choose a verse by.
  const best = new Set(tokens(q)).size >= 2 ? match(ix, q) : null;
  if (best && best.cover >= 0.95) return best; // the bank has this question almost word for word
  // In a follow-up the newest words decide the topic: "their kids" after Adam and Eve is Cain and Abel, not Adam again.
  const t = (followUp && topicOf(topicIx, rewrite(text, null) + ' ' + q.split(' ').slice(-4).join(' '))) || topicOf(topicIx, q);
  if (t) return { answerId: t.a, topic: t.id, cover: 1 };
  return best;
}
