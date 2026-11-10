// @ts-check
// Pure helpers for the "Compare traditions" view (compare.view.js) and for tools/pronunciation/build_runtime.mjs.
// No DOM. Every sound in the lookup data is rule-generated from the niqqud text and has not been checked by a
// native speaker (see docs/pronunciation/VARIANTS.md).

export const TRADITIONS = ['israeli', 'sephardi', 'ashkenazi'];
export const TRADITION_LABELS = { israeli: 'Modern Israeli', sephardi: 'Sephardi', ashkenazi: 'Ashkenazi' };
export const STORE_KEY = 'compare.v1';
export const NOTICE = 'See how each tradition says the same word.';

const TAAM = /[֑-ֽ֯׀׃]/g; // accents, meteg, paseq, sof pasuq
/** Lookup key: accents removed, maqaf removed (so a bound prefix such as לְ־ finds its entry לְ), canonical (NFD) mark order. */
export const wordKey = (s) => String(s).replace(TAAM, '').replace(/־/g, '').normalize('NFD');

/** FNV-1a (32-bit) over UTF-16 code units; used to pick the lookup shard. */
export function shardOf(key, n) {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h % n;
}
export const shardFile = (i) => `lookup-${String(i + 1).padStart(2, '0')}.json`;

/**
 * Split typed text into words. Whitespace and maqaf separate words; anything that is not a Hebrew letter or mark is dropped.
 * @returns {{he:string, key:string, sep:string, pointed:boolean}[]}
 */
export function tokenize(text) {
  const out = [];
  const parts = String(text ?? '').split(/(\s+|־)/);
  let sep = '';
  for (const p of parts) {
    if (p === '') continue;
    if (/^\s+$/.test(p)) { sep = ' '; continue; }
    if (p === '־') { sep = '-'; continue; }
    const he = p.replace(/[^֑-ׇא-ת]/g, '').replace(TAAM, '');
    if (!/[א-ת]/.test(he)) continue;
    out.push({ he, key: wordKey(he), sep: out.length ? sep || ' ' : '', pointed: /[ְ-ׇֻ]/.test(he) });
    sep = '';
  }
  return out;
}

/** Lookup entry: [ipaIsraeli, ipaSephardi, ipaAshkenazi, simpleIsraeliSephardi, simpleAshkenazi, codes, stressRuleIds]. */
export function variantsOf(entry) {
  return {
    israeli: { ipa: entry[0], simple: entry[3] },
    sephardi: { ipa: entry[1], simple: entry[3] },
    ashkenazi: { ipa: entry[2], simple: entry[4] },
  };
}
export const codesOf = (entry) => (entry[5] ? String(entry[5]).split(' ') : []);

/** Syllables of one word's IPA with the stressed one marked. */
export function syllablesOf(ipa) {
  const parts = String(ipa).split('.');
  const syl = parts.map((p) => ({ text: p.replace(/ˈ/g, ''), stressed: p.includes('ˈ') }));
  const index = syl.findIndex((s) => s.stressed);
  return { syllables: syl, index, count: syl.length };
}

/**
 * The "what differs and why" sentences. `items` = [{entry}] for the known words, `reasons` = runtime/reasons.json.
 * @returns {{same:boolean, sentences:string[]}}
 */
export function describeDifferences(items, reasons) {
  const sentences = [];
  const codes = [];
  for (const it of items) for (const c of codesOf(it.entry)) if (c !== 'st' && !codes.includes(c)) codes.push(c);
  const order = Object.keys(reasons.codes);
  codes.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  for (const c of codes) sentences.push(reasons.codes[c].text);
  // stress
  const detail = items.map((it) => {
    const v = variantsOf(it.entry);
    const s = TRADITIONS.map((t) => syllablesOf(v[t].ipa));
    return { idx: s.map((x) => x.index), count: s[0].count, rules: String(it.entry[6] ?? '') };
  });
  const differs = detail.some((d) => !(d.idx[0] === d.idx[1] && d.idx[1] === d.idx[2]));
  if (items.length === 1) {
    const d = detail[0];
    const ruleOf = (k) => reasons.stressRules[parseInt(d.rules[k] ?? '0', 36)] ?? 'rule';
    if (differs) {
      sentences.push(`Stress: Israeli and Sephardi stress syllable ${d.idx[0] + 1} of ${d.count} (${ruleOf(0)}); Ashkenazi stresses syllable ${d.idx[2] + 1} (${ruleOf(2)}).`);
    } else if (d.count > 1) {
      sentences.push(`Stress is on syllable ${d.idx[0] + 1} of ${d.count} in all three traditions (${ruleOf(0)}).`);
    }
  } else if (differs) {
    const n = detail.filter((d) => !(d.idx[0] === d.idx[1] && d.idx[1] === d.idx[2])).length;
    sentences.push(`Stress falls on a different syllable in the Ashkenazi reading in ${n} of ${items.length} words (${reasons.stressSummary}).`);
  }
  const anyIpaDiff = items.some((it) => { const v = variantsOf(it.entry); return v.israeli.ipa !== v.sephardi.ipa || v.israeli.ipa !== v.ashkenazi.ipa; });
  return { same: !anyIpaDiff, sentences };
}

const xml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** SSML with IPA phoneme hints for one tradition (same format as data/pronunciation/derived/_ssml-*.json). */
export function ssmlFor(words, tradition) {
  const parts = words.map((w) => (w.entry ? `<phoneme alphabet="ipa" ph="${xml(variantsOf(w.entry)[tradition].ipa.replace(/\./g, ''))}">${xml(w.he)}</phoneme>` : xml(w.he)));
  return `<speak version="1.1" xml:lang="he-IL">${parts.join(' ')}</speak>`;
}

/**
 * What to hand to speech synthesis. Browsers take plain text and have no Sephardi or Ashkenazi Hebrew voice, so:
 *  - israeli: the pointed Hebrew with lang he-IL (or the SSML string when `opts.ssml` is on, for engines that read it);
 *  - sephardi / ashkenazi: the Latin respelling read by an English voice, labelled as an approximation.
 * @param {string} tradition
 * @param {{he:string, entry:any}[]} words known words in order
 * @param {{ssml?:boolean}} [opts]
 */
export function speechPlan(tradition, words, opts = {}) {
  if (!words.length) return null;
  if (tradition === 'israeli') {
    if (opts.ssml) return { kind: 'ssml', lang: 'he-IL', text: ssmlFor(words, tradition), note: 'SSML with IPA hints; only some engines read it' };
    return { kind: 'hebrew', lang: 'he-IL', text: words.map((w) => w.he).join(' '), note: 'a Hebrew voice reading the pointed text' };
  }
  const t = /** @type {'sephardi'|'ashkenazi'} */ (tradition);
  if (opts.ssml) return { kind: 'ssml', lang: 'he-IL', text: ssmlFor(words, t), note: 'SSML with IPA hints; only some engines read it' };
  const text = words.map((w) => variantsOf(w.entry)[t].simple).join(' ');
  return { kind: 'respelling', lang: 'en-US', text, note: 'an English voice reading the respelling; an approximation, not the real sound' };
}

/** Join per-word results into one display string per tradition (ipa words keep their own stress marks). */
export function joinWords(tokens, tradition, field) {
  let out = '';
  for (const t of tokens) { if (!t.entry) continue; out += (out ? (t.sep || ' ') : '') + variantsOf(t.entry)[tradition][field]; }
  return out;
}
