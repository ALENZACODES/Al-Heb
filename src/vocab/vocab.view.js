/**
 * Vocabulary screen (#/vocab): browse the 5,000-word list by tier / topic / search, and review words with the app's SRS.
 * Data is loaded lazily, one tier file at a time (data/vocab/packs/vocab5k-tier-<n>.json, see loader.js).
 * Review cards live in store key "srs.vocab" (ids "vocab:<id>") so they never appear in the lesson review queue.
 * The list is a machine-built DRAFT: no Hebrew educator has proofread it, and the screen says so.
 */
import { el, heText, tr, storeGet, storeSet } from '../curriculum/dom.js';
import { review, due, MS_DAY } from '../curriculum/srs.js';
import { transliterate } from '../pronunciation/transliterate.js';
import { loadTier, TIER_BANDS } from './loader.js';
import { TIER_LABEL, POS_LABEL, VOCAB_CARDS_KEY, filterEntries, stripPoints, addCards, cardId, CARD_PREFIX } from './model.js';
import { isFunction } from './vocab.js';

const PAGE = 40;          // cards rendered per page
const ADD_LIMIT = 100;    // words added to reviews per click
const SESSION = 20;       // cards per review session
const RATINGS = [[1, 'Again', 'forgot it'], [2, 'Hard', 'got it with effort'], [3, 'Good', 'got it'], [4, 'Easy', 'no effort']];
const hasTag = (e, t) => Array.isArray(e.tags) && e.tags.includes(t);
/** Tag filter options: value -> label. 'function' is the closed-class group. */
export const TAG_FILTERS = [['', 'All kinds of words'], ['prayer', 'Prayer'], ['jewish-life', 'Jewish life'], ['function', 'Function words'], ['biblical', 'Biblical'], ['colloquial', 'Colloquial']];
export const FN_TOPIC = '__function';
/** Words that "Add to reviews" in bulk skips: forms of another word and rare senses. A single card's own button still adds them. */
export const skippedInBulk = (e) => !!e.isForm || hasTag(e, 'rare-sense');
/** Browse filter beyond model.filterEntries: tag, word forms, and topic (function words have no real topic; they form their own group). */
export function applyFilters(entries, { tag = '', topic = '', showForms = false, query = '' } = {}) {
  let out = entries;
  if (!showForms) out = out.filter((e) => !e.isForm);
  if (tag) out = out.filter((e) => hasTag(e, tag));
  if (topic === FN_TOPIC) out = out.filter(isFunction);
  else if (topic) out = out.filter((e) => !isFunction(e) && e.topic === topic);
  return filterEntries(out, { query });
}
const TRAD = { israeli: 'Israeli', sephardi: 'Sephardi', ashkenazi: 'Ashkenazi' };

export const ATTRIBUTION = 'Word ranking derived from the OpenSubtitles-based FrequencyWords lists by Hermit Dave (CC BY-SA 4.0); lemmas, glosses and vocalisation derived from Wiktionary contributors (CC BY-SA 4.0), via Wiktextract/kaikki.org. Changes were made (filtering, re-ranking, topic assignment, gloss shortening). This vocabulary data is shared under CC BY-SA 4.0.';
export const DRAFT_NOTICE = 'Draft: not proofread. This list was built by a program from Wiktionary and subtitle frequencies. No Hebrew teacher has checked it, so expect wrong glosses, odd word choices and some spelling or vowel-point differences.';

const CSS = `
.alef-vocab .vc-controls{display:grid;gap:.75rem;grid-template-columns:repeat(auto-fit,minmax(11rem,1fr));margin-block:1rem}
.alef-vocab label{display:block;font-weight:600;margin-block-end:.25rem}
.alef-vocab select,.alef-vocab input[type=search]{width:100%;min-block-size:var(--tap,48px);font:inherit;padding:.4rem .6rem;border:2px solid var(--border,#999);border-radius:8px;background:var(--card,#fff);color:inherit}
.alef-vocab .vc-list{list-style:none;margin:0;padding:0;display:grid;gap:.75rem}
.alef-vocab .vc-card{display:grid;gap:.25rem}
.alef-vocab .vc-card p{margin:0}
.alef-vocab .vc-card .btn{padding:.3rem .8rem;font-size:.95rem}
.alef-vocab .vc-he{font-size:2rem;line-height:1.3}
.alef-vocab .vc-big{font-size:3.5rem;line-height:1.3;text-align:center}
.alef-vocab .vc-meta{color:var(--muted,#555);font-size:.9rem}
.alef-vocab button.btn{min-inline-size:var(--tap,48px)}
.alef-vocab .vc-modes{display:flex;gap:.5rem;flex-wrap:wrap}
.alef-vocab .vc-modes [aria-pressed=true]{background:var(--accent);color:var(--accent-fg)}
.alef-vocab .vc-modes [aria-pressed=false]{background:transparent;color:var(--accent)}
.alef-vocab .vc-rate{display:grid;grid-template-columns:repeat(auto-fit,minmax(6rem,1fr));gap:.5rem}
.alef-vocab .vc-check{display:flex;align-items:center;gap:.5rem;min-block-size:var(--tap,48px)}
.alef-vocab .vc-check input{inline-size:1.5rem;block-size:1.5rem}
.alef-vocab .vc-check label{margin:0;font-weight:600}
.alef-vocab .vc-badge{display:inline-block;border:1px solid currentColor;border-radius:6px;padding:0 .4rem;font-size:.85rem;font-weight:700}
.alef-vocab .vc-forms{display:flex;flex-wrap:wrap;gap:.25rem .75rem;align-items:baseline}
.alef-vocab .vc-forms span[lang=he]{font-size:1.2rem}
.alef-vocab footer{margin-block-start:1.5rem;font-size:.85rem;color:var(--muted,#555)}
`;
function injectStyle() {
  try {
    if (!document.head || document.getElementById?.('alef-vocab-style')) return;
    const s = document.createElement('style'); s.id = 'alef-vocab-style'; s.textContent = CSS; document.head.append(s);
  } catch { /* styling is optional */ }
}
const focusNode = (n) => { try { n?.focus?.({ preventScroll: false }); } catch { /* ignore */ } };

/** Transliteration for an entry in the learner's tradition; '' when the word has no vowel points. */
export function translitFor(e, tradition) {
  if (!e.pointed) return '';
  try { return transliterate(e.pointed, { scheme: 'siddur', tradition: TRAD[tradition] ? tradition : 'sephardi' }); } catch { return ''; }
}

/** @param {HTMLElement} root @param {any} ctx */
export function mount(root, ctx) {
  injectStyle();
  let alive = true;
  const load = ctx?.vocabLoader?.loadTier || loadTier;
  const tradition = () => { const c = ctx?.settings?.get?.('congregation'); return TRAD[c] ? c : 'sephardi'; };

  const wrap = el('section', { class: 'alef-vocab', 'aria-labelledby': 'view-title' });
  const h1 = el('h1', { id: 'view-title', tabindex: '-1' }, tr(ctx, 'nav.vocab', 'Vocabulary'));
  const notice = el('p', { class: 'draft-flag', role: 'note' }, DRAFT_NOTICE);
  const audioNote = el('p', { class: 'muted', role: 'status', 'aria-live': 'polite' }, '');
  const body = el('div', { class: 'vc-body' });
  const footer = el('footer', {}, el('p', { class: 'vc-attrib' }, ATTRIBUTION), el('p', {},
    el('a', { href: 'https://creativecommons.org/licenses/by-sa/4.0/', rel: 'license noopener' }, 'CC BY-SA 4.0'), ' · ',
    el('a', { href: 'https://github.com/hermitdave/FrequencyWords', rel: 'noopener' }, 'FrequencyWords'), ' · ',
    el('a', { href: 'https://www.wiktionary.org/', rel: 'noopener' }, 'Wiktionary'), ' · ',
    el('a', { href: 'https://kaikki.org/', rel: 'noopener' }, 'kaikki.org')));
  const modeBrowse = el('button', { type: 'button', class: 'btn', 'aria-pressed': 'true', onclick: () => setMode('browse') }, 'Browse');
  const modeReview = el('button', { type: 'button', class: 'btn', 'aria-pressed': 'false', onclick: () => setMode('review') }, 'Review');
  const modes = el('div', { class: 'vc-modes', role: 'group', 'aria-label': 'Vocabulary mode' }, modeBrowse, modeReview);
  wrap.append(h1, notice, modes, audioNote, body, footer);
  root.append(wrap);

  /** @type {Record<string, any>} */
  let cards = {};
  const vocabCards = () => Object.values(cards).filter((c) => c && String(c.id).startsWith(CARD_PREFIX));
  const dueNow = () => due(vocabCards(), Date.now());
  const refreshModeLabel = () => { const n = dueNow().length; modeReview.textContent = n ? `Review (${n} due)` : 'Review'; };
  async function loadCards() { const c = await storeGet(ctx, VOCAB_CARDS_KEY, {}); cards = Array.isArray(c) ? Object.fromEntries(c.filter((x) => x?.id).map((x) => [x.id, x])) : (c || {}); refreshModeLabel(); }
  async function saveCards(next) { cards = next; await storeSet(ctx, VOCAB_CARDS_KEY, next); refreshModeLabel(); }

  // ---- audio: a recording if the manifest has one for this id, else the browser's Hebrew voice, labelled as such
  async function playWord(e) {
    audioNote.textContent = '';
    try { ctx?.audio?.stop?.(); } catch { /* ignore */ }
    try {
      if (ctx?.audio?.has?.('word', e.id)) {
        const r = await ctx.audio.play('word', e.id);
        if (r?.source === 'file') { audioNote.textContent = r.entryStatus === 'tts' ? 'Playing a pre-rendered computer-voice file, not a human recording.' : 'Playing a recording.'; return; }
      }
    } catch { /* fall through to the browser voice */ }
    const g = globalThis;
    const text = String(e.pointed || e.lemma).replace(/־/g, ' ');
    if (!g.speechSynthesis || !g.SpeechSynthesisUtterance) { audioNote.textContent = 'No sound: this browser has no speech synthesis, and there is no recording of this word.'; return; }
    const voices = typeof g.speechSynthesis.getVoices === 'function' ? g.speechSynthesis.getVoices() : [];
    if (voices?.length && !voices.some((v) => /^he([-_]|$)/i.test(v.lang || ''))) { audioNote.textContent = 'No sound: your device has no Hebrew voice installed, and there is no recording of this word.'; return; }
    try {
      const u = new g.SpeechSynthesisUtterance(text); u.lang = 'he-IL';
      const rate = ctx?.settings?.get?.('ttsRate'); if (typeof rate === 'number') u.rate = rate;
      g.speechSynthesis.cancel?.(); g.speechSynthesis.speak(u);
      const t = tradition();
      audioNote.textContent = `Computer voice: your browser's text-to-speech, not a recording. It reads Israeli pronunciation${t !== 'israeli' ? `, not ${TRAD[t]}` : ''}, and may ignore the vowel points.`;
    } catch { audioNote.textContent = 'No sound: the browser voice failed.'; }
  }
  function listenButton(e) {
    const rec = !!ctx?.audio?.has?.('word', e.id);
    return el('button', { type: 'button', class: 'btn secondary', 'aria-label': `Listen to ${e.gloss}${rec ? '' : ' (computer voice)'}`, onclick: () => playWord(e) },
      el('span', { 'aria-hidden': 'true' }, '▶'), ' ', rec ? 'Listen' : 'Listen (computer voice)');
  }
  const heWord = (e, cls) => e.pointed ? heText(e.pointed, cls) : heText(e.lemma, cls);
  const translitLine = (e) => {
    const tl = translitFor(e, tradition());
    return el('p', { class: 'vc-meta' }, `Transliteration (${TRAD[tradition()]}, approximate): `, tl ? el('i', {}, tl) : '(not available: this word has no vowel points yet)');
  };
  const known = new Map(); // id -> entry, for every tier loaded so far (cross-references)
  const label = (e) => `${e.pointed || e.lemma} (${e.gloss})`;
  const metaLine = (e) => {
    const kind = isFunction(e) ? `function word${e.fn ? ` (${e.fn})` : ''}` : e.topic;
    const extra = [];
    if (hasTag(e, 'prayer')) extra.push('prayer');
    if (hasTag(e, 'jewish-life')) extra.push('Jewish life');
    if (hasTag(e, 'biblical')) extra.push('biblical');
    if (hasTag(e, 'colloquial')) extra.push('colloquial');
    return el('p', { class: 'vc-meta' }, `${POS_LABEL[e.pos] || e.pos} · ${kind} · rank ${e.rank}${extra.length ? ' · ' + extra.join(', ') : ''}`,
      hasTag(e, 'needs-check') ? ' ' : null, hasTag(e, 'needs-check') ? el('span', { class: 'vc-badge' }, 'needs check') : null);
  };
  /** Notes under a card: form-of link, word forms, rare sense / homograph hints, same-spelling cross-references. */
  const noteLines = (e) => {
    const out = [];
    if (e.isForm) {
      const base = known.get(e.formOf);
      out.push(el('p', { class: 'vc-meta' }, 'This is a form of another word: ',
        base ? el('button', { type: 'button', class: 'btn secondary', 'aria-label': `Show the main word ${base.gloss}`, onclick: () => showWord(base) }, label(base)) : '(open "All 5,000 words" to see it).'));
    }
    if (Array.isArray(e.forms) && e.forms.length) {
      out.push(el('div', { class: 'vc-meta' }, el('span', {}, 'Forms (from Wiktionary, may be incomplete): '),
        el('span', { class: 'vc-forms' }, ...e.forms.filter((f, i, a) => a.findIndex((g) => g.pointed === f.pointed && g.label === f.label) === i).map((f) => el('span', {}, heText(f.pointed || f.he, ''), ` ${f.label}`)))));
    }
    if (hasTag(e, 'rare-sense')) out.push(el('p', { class: 'vc-meta' }, 'Rare sense: this spelling is mostly used for a different, more common word.'));
    else if (hasTag(e, 'homograph')) out.push(el('p', { class: 'vc-meta' }, 'Homograph: shares its spelling with another word; the frequency rank belongs to the spelling, not to this word alone.'));
    if (Array.isArray(e.sameSpelling) && e.sameSpelling.length) {
      const seen = e.sameSpelling.map((id) => known.get(id)).filter(Boolean);
      const missing = e.sameSpelling.length - seen.length;
      out.push(el('p', { class: 'vc-meta' }, 'Also spelled the same: ', seen.map(label).join('; '),
        missing ? `${seen.length ? '; ' : ''}${missing} more in other tiers (choose "All 5,000 words")` : '', '.'));
    }
    return out;
  };
  const showWord = (w) => { sel.tier = 'all'; sel.topic = ''; sel.tag = ''; sel.showForms = true; sel.query = stripPoints(w.lemma); setMode('browse'); };

  // ---- browse
  const sel = { tier: '500', topic: '', tag: '', showForms: false, query: '' };
  let gen = 0;
  async function entriesFor(tierSel) {
    const tiers = tierSel === 'all' ? TIER_BANDS : [Number(tierSel)];
    const es = (await Promise.all(tiers.map((t) => load(t)))).flat();
    for (const e of es) known.set(e.id, e);
    return es;
  }
  function renderBrowse() {
    const my = ++gen;
    const tierSel = el('select', { id: 'vc-tier' }, el('option', { value: 'all' }, 'All 5,000 words'), ...TIER_BANDS.map((t) => el('option', { value: String(t) }, TIER_LABEL[t])));
    tierSel.value = sel.tier;
    const topicSel = el('select', { id: 'vc-topic' }, el('option', { value: '' }, 'All topics'));
    const tagSel = el('select', { id: 'vc-tag' }, ...TAG_FILTERS.map(([v, l]) => el('option', { value: v }, l)));
    tagSel.value = sel.tag;
    const formsBox = el('input', { id: 'vc-forms', type: 'checkbox' });
    if (sel.showForms) formsBox.setAttribute('checked', '');
    formsBox.checked = sel.showForms;
    const heading = el('h2', { class: 'vc-group' });
    const search = el('input', { id: 'vc-search', type: 'search', dir: 'auto', autocomplete: 'off', placeholder: 'שלום or hello' });
    search.value = sel.query;
    const status = el('p', { role: 'status', 'aria-live': 'polite', class: 'muted' }, 'Loading words…');
    const addRow = el('div', { class: 'row' });
    const list = el('ul', { class: 'vc-list', 'aria-label': 'Words' });
    const moreRow = el('div', { class: 'row' });
    body.replaceChildren(
      el('div', { class: 'vc-controls' },
        el('div', {}, el('label', { for: 'vc-tier' }, 'Tier'), tierSel),
        el('div', {}, el('label', { for: 'vc-topic' }, 'Topic'), topicSel),
        el('div', {}, el('label', { for: 'vc-tag' }, 'Kind of word'), tagSel),
        el('div', {}, el('label', { for: 'vc-search' }, 'Search (Hebrew with or without vowel points, or English)'), search)),
      el('div', { class: 'vc-check' }, formsBox, el('label', { for: 'vc-forms' }, 'Show word forms (spellings that are only a form of another word)')),
      status, addRow, heading, list, moreRow);
    let all = [], matches = [], shown = 0;

    const fillTopics = () => {
      const topics = [...new Set(all.filter((e) => !isFunction(e)).map((e) => e.topic))].sort();
      topicSel.replaceChildren(el('option', { value: '' }, 'All topics'), ...topics.map((tp) => el('option', { value: tp }, tp)), el('option', { value: FN_TOPIC }, 'Function words (no topic)'));
      if (!topics.includes(sel.topic) && sel.topic !== FN_TOPIC) sel.topic = '';
      topicSel.value = sel.topic;
    };
    const cardItem = (e) => {
      const inRev = !!cards[cardId(e)];
      const add = el('button', { type: 'button', class: 'btn secondary', 'aria-label': inRev ? `${e.gloss}: already in reviews` : `Add ${e.gloss} to reviews`, ...(inRev ? { disabled: true } : {}),
        onclick: async () => { const r = addCards(cards, [e], Date.now()); await saveCards(r.cards); add.setAttribute('disabled', ''); add.textContent = 'In reviews'; add.setAttribute('aria-label', `${e.gloss}: already in reviews`); updateAdd(); } }, inRev ? 'In reviews' : 'Add to reviews');
      return el('li', { class: 'card vc-card', 'data-id': e.id },
        heWord(e, 'vc-he'), el('p', { tabindex: '-1', class: 'vc-gloss' }, e.gloss), metaLine(e), ...noteLines(e), translitLine(e),
        el('div', { class: 'row' }, listenButton(e), add));
    };
    const updateAdd = () => {
      const eligible = matches.filter((e) => !skippedInBulk(e));
      const skipped = matches.length - eligible.length;
      const fresh = eligible.filter((e) => !cards[cardId(e)]).length;
      if (!matches.length) { addRow.replaceChildren(); return; }
      const what = sel.topic || (sel.tier === 'all' ? 'all tiers' : TIER_LABEL[sel.tier]);
      addRow.replaceChildren(...[
        fresh ? el('button', { type: 'button', class: 'btn', id: 'vc-add-all', onclick: async () => {
          const r = addCards(cards, eligible, Date.now(), ADD_LIMIT); await saveCards(r.cards);
          renderRows(true); updateAdd();
          status.textContent = `Added ${r.added} word${r.added === 1 ? '' : 's'} to your reviews${fresh > r.added ? `; ${fresh - r.added} more can be added with another click` : ''}.`; } }, `Add ${Math.min(fresh, ADD_LIMIT)} of these ${eligible.length} words to reviews`)
          : el('p', { class: 'muted' }, 'All of these words are already in your reviews.'),
        el('span', { class: 'muted' }, `(${what}${sel.query ? ', matching your search' : ''})`),
        skipped ? el('p', { class: 'muted' }, `${skipped} word form${skipped === 1 ? '' : 's'} and rare-sense word${skipped === 1 ? '' : 's'} in this list are skipped here; use a card's own button to add one.`) : null].filter(Boolean));
    };
    const renderRows = (keep) => {
      const n = keep ? Math.max(shown, PAGE) : PAGE;
      shown = Math.min(n, matches.length);
      heading.textContent = sel.topic === FN_TOPIC || sel.tag === 'function' ? 'Function words (closed class; topic does not apply)' : '';
      list.replaceChildren(...matches.slice(0, shown).map(cardItem));
      status.textContent = matches.length ? `Showing ${shown} of ${matches.length} word${matches.length === 1 ? '' : 's'}.` : 'No words match. Try fewer letters, or another tier or topic.';
      moreRow.replaceChildren(...(shown < matches.length ? [el('button', { type: 'button', class: 'btn secondary', id: 'vc-more', onclick: () => {
        const from = shown; shown = Math.min(shown + PAGE, matches.length);
        list.append(...matches.slice(from, shown).map(cardItem));
        status.textContent = `Showing ${shown} of ${matches.length} words.`;
        if (shown >= matches.length) moreRow.replaceChildren();
        focusNode(list.children?.[from]?.querySelector?.('.vc-gloss'));
      } }, `Show ${Math.min(PAGE, matches.length - shown)} more`)] : []));
    };
    const refilter = () => { matches = applyFilters(all, sel); renderRows(false); updateAdd(); };
    const reload = async () => {
      const id = ++gen; status.textContent = 'Loading words…'; list.replaceChildren(); moreRow.replaceChildren(); addRow.replaceChildren();
      try { all = await entriesFor(sel.tier); } catch (err) {
        if (!alive || id !== gen) return;
        status.textContent = ''; list.replaceChildren(); addRow.replaceChildren(el('p', { role: 'alert' }, `Could not load the word list (${err?.message || err}). Check your connection, then try again.`), el('button', { type: 'button', class: 'btn', onclick: reload }, 'Try again')); return;
      }
      if (!alive || id !== gen) return;
      fillTopics(); refilter();
    };
    tagSel.addEventListener('change', () => { sel.tag = tagSel.value; refilter(); });
    formsBox.addEventListener('change', () => { sel.showForms = !!formsBox.checked; refilter(); });
    tierSel.addEventListener('change', () => { sel.tier = tierSel.value; sel.topic = ''; reload(); });
    topicSel.addEventListener('change', () => { sel.topic = topicSel.value; refilter(); });
    search.addEventListener('input', () => { sel.query = search.value; refilter(); });
    gen = my; reload();
  }

  // ---- review
  let rv = null;
  async function renderReview() {
    const my = ++gen;
    body.replaceChildren(el('p', { role: 'status' }, 'Loading your review words…'));
    await loadCards();
    const total = vocabCards();
    if (!total.length) {
      body.replaceChildren(el('div', { class: 'card' }, el('h2', {}, 'No words in your reviews yet'),
        el('p', {}, 'Open Browse, pick a tier or topic, and choose "Add ... to reviews". Words you add come back here on a spaced schedule.'),
        el('button', { type: 'button', class: 'btn', onclick: () => setMode('browse') }, 'Browse words')));
      return;
    }
    const queueCards = dueNow().slice(0, SESSION);
    const byTier = {};
    try { for (const t of new Set(queueCards.map((c) => c.tier))) for (const e of await load(t)) { byTier[e.id] = e; known.set(e.id, e); } }
    catch (err) { if (!alive || my !== gen) return; body.replaceChildren(el('p', { role: 'alert' }, `Could not load the word list (${err?.message || err}).`), el('button', { type: 'button', class: 'btn', onclick: renderReview }, 'Try again')); return; }
    if (!alive || my !== gen) return;
    const queue = queueCards.map((c) => c.id).filter((id) => byTier[id.slice(CARD_PREFIX.length)]);
    rv = { queue, pos: 0, revealed: false, stats: { 1: 0, 2: 0, 3: 0, 4: 0 }, byTier, requeued: new Set() };
    showCard();
  }
  function summary() {
    const s = rv.stats, n = s[1] + s[2] + s[3] + s[4], left = dueNow().length;
    const future = vocabCards().filter((c) => c.due > Date.now()).sort((a, b) => a.due - b.due)[0];
    body.replaceChildren(el('div', { class: 'card' }, el('h2', { tabindex: '-1', id: 'vc-done' }, n ? 'Session done' : 'Nothing due'),
      n ? el('p', {}, `${n} word${n === 1 ? '' : 's'} reviewed: ${s[1]} again, ${s[2]} hard, ${s[3]} good, ${s[4]} easy.`) : el('p', {}, 'No vocabulary reviews are due right now.'),
      el('p', { class: 'muted' }, left ? `${left} still due.` : (future ? `Next one is due in about ${Math.max(1, Math.round((future.due - Date.now()) / MS_DAY))} day(s) (or minutes, for words rated Again).` : 'All caught up.')),
      el('div', { class: 'row' }, left ? el('button', { type: 'button', class: 'btn', onclick: renderReview }, 'Keep reviewing') : null,
        el('button', { type: 'button', class: 'btn secondary', onclick: () => setMode('browse') }, 'Browse words'))));
    focusNode(body.querySelector?.('#vc-done'));
  }
  function showCard() {
    if (rv.pos >= rv.queue.length) { summary(); return; }
    const id = rv.queue[rv.pos], e = rv.byTier[id.slice(CARD_PREFIX.length)];
    rv.revealed = false; rv.current = e;
    const prompt = el('div', { class: 'card vc-card', tabindex: '-1', id: 'vc-q', role: 'group', 'aria-label': `Word ${rv.pos + 1} of ${rv.queue.length}` },
      el('p', { class: 'vc-meta' }, `Word ${rv.pos + 1} of ${rv.queue.length}. Say what it means, then check.`), heWord(e, 'vc-big'));
    const reveal = el('button', { type: 'button', class: 'btn', id: 'vc-show', onclick: () => showAnswer(prompt, reveal) }, 'Show answer');
    body.replaceChildren(prompt, el('div', { class: 'row' }, reveal));
    focusNode(prompt);
  }
  function showAnswer(prompt, reveal) {
    const e = rv.current; rv.revealed = true;
    reveal.remove?.();
    const answer = el('div', { class: 'vc-answer', 'aria-live': 'polite' }, el('p', { class: 'vc-gloss', tabindex: '-1', id: 'vc-a' }, e.gloss), metaLine(e), ...noteLines(e), translitLine(e), el('div', { class: 'row' }, listenButton(e)));
    const rate = el('div', { class: 'vc-rate', role: 'group', 'aria-label': 'How well did you remember it?' },
      ...RATINGS.map(([r, name, hint]) => el('button', { type: 'button', class: 'btn' + (r === 3 ? '' : ' secondary'), 'data-rating': String(r), 'aria-label': `${name} (${r}): ${hint}`, onclick: () => rate_(r) }, `${name} (${r})`)));
    prompt.append(answer); body.append(rate);
    focusNode(answer.querySelector?.('#vc-a') || answer);
  }
  async function rate_(rating) {
    if (!rv?.revealed) return;
    rv.revealed = false;
    const id = rv.queue[rv.pos];
    await loadCards();
    const card = cards[id];
    if (card) await saveCards({ ...cards, [id]: review(card, rating, Date.now()) });
    rv.stats[rating]++;
    if (rating === 1 && !rv.requeued.has(id)) { rv.requeued.add(id); rv.queue.push(id); } // see it once more this session
    rv.pos++;
    if (!alive) return;
    showCard();
  }
  const onKey = (ev) => {
    if (mode !== 'review' || !rv?.revealed) return;
    const t = ev.target?.tagName; if (t === 'INPUT' || t === 'SELECT' || t === 'TEXTAREA') return;
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (['1', '2', '3', '4'].includes(ev.key)) { ev.preventDefault?.(); rate_(Number(ev.key)); }
  };
  wrap.addEventListener('keydown', onKey);

  let mode = 'browse';
  function setMode(m) {
    mode = m;
    modeBrowse.setAttribute('aria-pressed', String(m === 'browse')); modeReview.setAttribute('aria-pressed', String(m === 'review'));
    audioNote.textContent = '';
    if (m === 'browse') { loadCards().then(() => { if (alive && mode === 'browse') renderBrowse(); }); } else renderReview();
  }
  loadCards().then(() => { if (!alive) return; setMode(ctx?.query?.review === '1' || ctx?.query?.mode === 'review' ? 'review' : 'browse'); });

  return () => { alive = false; gen++; try { ctx?.audio?.stop?.(); } catch { /* ignore */ } try { globalThis.speechSynthesis?.cancel?.(); } catch { /* ignore */ } wrap.remove?.(); };
}
