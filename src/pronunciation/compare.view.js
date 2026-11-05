/**
 * Compare traditions (#/compare): type or pick a pointed Hebrew word or phrase and see the Israeli, Sephardi and Ashkenazi
 * readings side by side, stress marked, with a sentence on what differs and why. mount(root, ctx) => unmount, like src/sprint/.
 *
 * Everything shown is rule-generated from the niqqud text (data/pronunciation/runtime/, built by
 * tools/pronunciation/build_runtime.mjs). It has NOT been checked by a native speaker and there are no recordings.
 * Only words in the lookup table (course vocabulary, phrasebook, prayer texts) can be compared; nothing is guessed for other words.
 * Listening: browsers have no Sephardi or Ashkenazi Hebrew voice. Israeli plays the pointed text with a Hebrew voice; the other two
 * play the Latin respelling with an English voice and say so. With no speech synthesis the view is text-only.
 *
 * Store key "compare.v1": { text, recent: [up to 8 texts] }.
 * ctx extras for tests: ctx.compareData {index, shards:{file:json}, reasons, picks}, ctx.speech, ctx.UtteranceCtor, ctx.compareSsml.
 */
import { TRADITIONS, TRADITION_LABELS, STORE_KEY, NOTICE, tokenize, shardOf, shardFile, variantsOf, syllablesOf, describeDifferences, speechPlan, joinWords } from './compare.model.js';
import { speechText } from '../shell/names.js';

const DIR = new URL('../../data/pronunciation/runtime/', import.meta.url);
const CSS = `
.alef-compare{max-inline-size:60rem;margin-inline:auto;overflow-wrap:anywhere}
.alef-compare *{box-sizing:border-box;max-inline-size:100%}
.alef-compare input[type=text],.alef-compare select{inline-size:100%;min-block-size:var(--tap,48px);font:inherit;padding:.4rem .6rem;border:2px solid var(--border,#999);border-radius:8px;background:var(--card,#fff);color:inherit}
.alef-compare label{display:block;font-weight:600;margin-block:.75rem .25rem}
.alef-compare .cmp-input{font-size:1.6rem}
.alef-compare button{min-block-size:var(--tap,48px);min-inline-size:var(--tap,48px);font:inherit;padding:.4rem .9rem;margin-block:.5rem;white-space:normal}
.alef-compare :focus-visible{outline:3px solid currentColor;outline-offset:2px}
.alef-compare .cmp-grid{display:grid;gap:.75rem;grid-template-columns:repeat(auto-fit,minmax(15rem,1fr));margin-block:1rem}
.alef-compare .cmp-card{border:2px solid var(--border,#999);border-radius:10px;padding:.75rem}
.alef-compare .cmp-card h2{font-size:1.1rem;margin:0 0 .4rem}
.alef-compare .cmp-ipa{font-size:1.5rem;direction:ltr;unicode-bidi:isolate}
.alef-compare .cmp-ipa strong{text-decoration:underline;text-underline-offset:.2em}
.alef-compare .cmp-note{font-size:.9rem}
.alef-compare .cmp-flag{border-inline-start:6px solid currentColor;padding-inline-start:.5rem}
`;

/** @param {HTMLElement} root @param {any} ctx @returns {() => void} unmount */
export function mount(root, ctx) {
  const doc = root.ownerDocument || globalThis.document;
  const h = (tag, attrs = {}, ...kids) => {
    const n = doc.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) { if (v == null || v === false) continue; n.setAttribute(k, v === true ? '' : String(v)); }
    for (const kid of kids.flat()) { if (kid == null || kid === false) continue; n.append(typeof kid === 'string' ? doc.createTextNode(kid) : kid); }
    return n;
  };
  const listen = (n, t, f) => n.addEventListener(t, f);
  let alive = true;
  const synth = () => (ctx?.speech !== undefined ? ctx.speech : globalThis.speechSynthesis);
  const UtteranceCtor = () => ctx?.UtteranceCtor || globalThis.SpeechSynthesisUtterance;

  const style = h('style', {}, CSS);
  const title = h('h1', { id: 'view-title', tabindex: '-1' }, 'Compare pronunciations');
  const notice = h('p', { class: 'cmp-flag', role: 'note' }, NOTICE);
  const input = h('input', { type: 'text', id: 'cmp-text', class: 'cmp-input', dir: 'rtl', lang: 'he', autocomplete: 'off', spellcheck: 'false', 'aria-describedby': 'cmp-help' });
  const help = h('p', { id: 'cmp-help', class: 'cmp-note' }, 'Type or paste a Hebrew word or phrase with its vowel points, or pick an example. Only words from the course vocabulary, phrasebook and prayer texts are in the table.');
  const select = h('select', { id: 'cmp-pick' });
  const go = h('button', { type: 'submit', class: 'btn' }, 'Compare');
  const form = h('form', { role: 'search', 'aria-label': 'Compare pronunciations' },
    h('label', { for: 'cmp-text' }, 'Hebrew word or phrase'), input, help,
    h('label', { for: 'cmp-pick' }, 'Or pick an example'), select, go);
  const status = h('div', { role: 'status', 'aria-live': 'polite', class: 'cmp-note' });
  const results = h('div', { class: 'cmp-results' });
  const wrap = h('section', { class: 'alef-compare', 'aria-labelledby': 'view-title' }, title, notice, form, status, results);
  root.append(style, wrap);

  const say = (t) => { status.replaceChildren(doc.createTextNode(t)); };
  let data = null, recent = [], current = null;
  const shardCache = new Map();

  async function getJson(name) {
    const bare = name.replace(/\.json$/, '');
    if (ctx?.compareData && ctx.compareData[bare] !== undefined && bare !== 'shards') return ctx.compareData[bare];
    const res = await globalThis.fetch(new URL(name, DIR));
    if (!res.ok) throw new Error(`${name} ${res.status}`);
    return res.json();
  }
  async function shard(i) {
    const f = shardFile(i);
    if (!shardCache.has(f)) shardCache.set(f, ctx?.compareData?.shards?.[f] ? Promise.resolve(ctx.compareData.shards[f]) : getJson(f));
    return (await shardCache.get(f)).w;
  }
  async function lookup(tokens) {
    for (const t of tokens) {
      const w = await shard(shardOf(t.key, data.index.shards));
      t.entry = w[t.key] ?? null;
    }
    return tokens;
  }

  async function storeLoad() { try { const v = ctx?.store?.get ? await ctx.store.get(STORE_KEY) : null; return v && typeof v === 'object' ? v : {}; } catch { return {}; } }
  async function storeSave(text) {
    try {
      recent = [text, ...recent.filter((x) => x !== text)].slice(0, 8);
      if (ctx?.store?.set) await ctx.store.set(STORE_KEY, { text, recent });
    } catch { /* best effort */ }
  }

  function stressed(ipa) {
    const out = [];
    const words = String(ipa).split(/([ -])/);
    for (const w of words) {
      if (w === ' ' || w === '-' || w === '') { out.push(w); continue; }
      const s = syllablesOf(w);
      s.syllables.forEach((x, i) => { if (i) out.push('.'); out.push(x.stressed ? h('strong', {}, x.text) : x.text); });
    }
    return out;
  }

  function play(trad) {
    const words = current?.known ?? [];
    const plan = speechPlan(trad, words, { ssml: !!ctx?.compareSsml });
    const s = synth(); const U = UtteranceCtor();
    if (!plan || !s || !U) { say('No speech voice is available here, so this is text only.'); return; }
    try {
      if (plan.kind !== 'respelling' && typeof s.getVoices === 'function') {
        const v = s.getVoices();
        if (Array.isArray(v) && v.length && !v.some((x) => /^he/i.test(x.lang || ''))) { say('No Hebrew voice was found on this device, so this is text only.'); return; }
      }
      s.cancel?.();
      const u = new U(speechText(plan.text)); u.lang = plan.lang; u.rate = 0.85;
      s.speak(u);
      say(`Playing ${TRADITION_LABELS[trad]}: ${plan.note}.`);
    } catch { say('The voice could not play this, so it is text only.'); }
  }

  function render(tokens, known, unknown, diff) {
    const cards = TRADITIONS.map((t) => {
      const ipa = joinWords(known, t, 'ipa'); const simple = joinWords(known, t, 'simple');
      const plan = speechPlan(t, known, { ssml: !!ctx?.compareSsml });
      const canSpeak = !!(synth() && UtteranceCtor());
      const btn = h('button', { type: 'button', class: 'btn', 'data-play': t, 'aria-label': `Listen to the ${TRADITION_LABELS[t]} reading (${plan?.kind === 'respelling' ? 'approximation by an English voice' : 'Hebrew voice'})`, disabled: canSpeak ? null : true }, canSpeak ? 'Listen' : 'Listen (no voice here)');
      listen(btn, 'click', () => play(t));
      return h('section', { class: 'cmp-card', 'aria-labelledby': `cmp-h-${t}`, 'data-tradition': t },
        h('h2', { id: `cmp-h-${t}` }, TRADITION_LABELS[t]),
        h('p', { class: 'cmp-ipa', dir: 'ltr', lang: 'und-fonipa' }, stressed(ipa)),
        h('p', {}, h('span', { class: 'cmp-note' }, 'Respelling: '), h('span', { dir: 'ltr' }, simple)),
        btn,
        plan ? h('p', { class: 'cmp-note' }, `Sound: ${plan.note}.`) : null);
    });
    const why = h('section', { 'aria-labelledby': 'cmp-why' },
      h('h2', { id: 'cmp-why' }, 'What differs and why'),
      diff.same && !diff.sentences.length ? h('p', {}, 'By these rules the three readings do not differ for this text.') : h('ul', {}, diff.sentences.map((s) => h('li', {}, s))),
      h('p', { class: 'cmp-note' }, 'The underlined syllable is stressed. These explanations describe the spelling rules used to make the readings; they are rule-generated and unverified.'));
    const miss = unknown.length ? h('p', { role: 'alert', class: 'cmp-flag' }, `Not in the table, so left out: ${unknown.map((t) => t.he).join(', ')}. ${unknown.some((t) => !t.pointed) ? 'Words need vowel points to be compared. ' : ''}This view cannot sound out new words.`) : null;
    results.replaceChildren(...[h('p', { dir: 'rtl', lang: 'he', class: 'cmp-ipa', style: 'direction:rtl' }, known.map((k) => k.he).join(' ')), miss, h('div', { class: 'cmp-grid' }, cards), why].filter(Boolean));
  }

  async function compare(text) {
    const trimmed = String(text ?? '').trim();
    if (!data) return;
    const tokens = tokenize(trimmed);
    if (!tokens.length) { current = null; results.replaceChildren(); say('Type a Hebrew word or phrase with vowel points, or pick an example.'); return; }
    let found;
    try { found = await lookup(tokens); } catch { say('The lookup data could not be loaded. Check your connection and reload; nothing was lost.'); return; }
    if (!alive) return;
    const known = found.filter((t) => t.entry); const unknown = found.filter((t) => !t.entry);
    current = { known };
    if (!known.length) {
      results.replaceChildren();
      say(`Not in the table: ${unknown.map((t) => t.he).join(', ')}. ${unknown.some((t) => !t.pointed) ? 'Words need vowel points to be compared. ' : ''}This view cannot sound out new words.`);
      return;
    }
    render(found, known, unknown, describeDifferences(known.map((k) => ({ entry: k.entry })), data.reasons));
    say(`Showing ${known.length} ${known.length === 1 ? 'word' : 'words'} in three traditions.`);
    await storeSave(trimmed);
  }

  listen(form, 'submit', (e) => { e?.preventDefault?.(); compare(input.value); });
  listen(select, 'change', () => { const v = select.value; if (v) { input.value = v; compare(v); } });

  (async () => {
    say('Loading the table...');
    try {
      const [index, reasons, picks] = await Promise.all([getJson('index.json'), getJson('reasons.json'), getJson('picks.json')]);
      data = { index, reasons, picks: picks.picks };
    } catch {
      if (alive) say('The comparison table could not be loaded. Check your connection and reload; nothing was lost.');
      return;
    }
    if (!alive) return;
    select.replaceChildren(h('option', { value: '' }, 'Choose an example...'), ...data.picks.map((p) => h('option', { value: p.he }, `${p.he}${p.gloss ? ' - ' + p.gloss : ''}`)));
    const saved = await storeLoad();
    recent = Array.isArray(saved.recent) ? saved.recent.slice(0, 8) : [];
    const start = ctx?.query?.text || saved.text || '';
    if (start) { input.value = start; await compare(start); } else say('Type a Hebrew word or phrase with vowel points, or pick an example.');
  })();

  return () => { alive = false; try { synth()?.cancel?.(); } catch { /* ignore */ } wrap.remove?.(); style.remove?.(); };
}
