/**
 * Theme packs (#/vocab-themes): browse the 40 theme packs built by tools/vocab/theme_packs.mjs (data/vocab/themes/),
 * open one as a word list with audio and the verbatim corpus example line when the word has one, and send the pack to the
 * review deck. Words are a machine-built DRAFT (nobody has proofread them); example lines are copied from the project's own
 * texts, never composed, and the sense of the word in the line was NOT checked (the screen says so).
 *
 * Review deck = the existing vocab SRS cards (store key "srs.vocab", src/vocab/model.js addCards, scheduler src/curriculum/srs.js).
 * Those cards are keyed by the 5,000-word list ids, so each pack word is matched to its 5,000-list entry by pointed form + part of
 * speech; words that are not in that list cannot be reviewed on the Vocabulary screen yet and are reported as skipped, not added.
 * Own store key: "vocab.themes.v1" = { v:1, last: packId|null, sent: { [packId]: { at, added, existing, skipped } } }.
 * ctx extras for tests: ctx.themesData { index, packs: {id: pack}, entries }, ctx.now().
 */
import { el, heText, storeGet, storeSet } from '../curriculum/dom.js';
import { loadJson, loadAllVocab } from '../sprint/loader.js';
import { visibleRecords } from './loader.js';
import { addCards, VOCAB_CARDS_KEY, POS_LABEL } from './model.js';
import { DRAFT_NOTICE } from './vocab.view.js';
import { audioButton } from '../shell/audio-access.js';
import { uiEnglish } from '../shell/names.js';
import { sourcesLine, exampleCredit } from '../shell/sources.js';

export const STORE_KEY = 'vocab.themes.v1';
export const SENSE_NOTE = 'Example lines are copied from Aleph\'s own texts (prayers, phrasebook, lessons). Whether the word means the same thing in the line was not checked.';
const CSS = `
.alef-themes{max-inline-size:40rem;margin-inline:auto;overflow-wrap:anywhere}
.alef-themes *{box-sizing:border-box;max-inline-size:100%}
.alef-themes ul.th-list{list-style:none;margin:0;padding:0;display:grid;gap:.5rem}
.alef-themes button.btn{min-block-size:var(--tap,48px);white-space:normal;text-align:start}
.alef-themes .th-card{inline-size:100%}
.alef-themes .th-word{border:2px solid var(--border,#999);border-radius:8px;padding:.6rem .75rem}
.alef-themes .th-he{font-size:2rem;line-height:1.4}
.alef-themes .th-ex{margin-block:.4rem;padding-inline-start:.6rem;border-inline-start:4px solid var(--border,#999)}
.alef-themes .th-muted,.alef-themes footer{font-size:.85rem;color:var(--muted,#555)}
.alef-themes :focus-visible{outline:3px solid currentColor;outline-offset:2px}
`;
function injectStyle() {
  try { if (!document.head || document.getElementById?.('alef-themes-style')) return; const s = document.createElement('style'); s.id = 'alef-themes-style'; s.textContent = CSS; document.head.append(s); } catch { /* optional */ }
}
const focusNode = (n) => { try { n?.focus?.(); } catch { /* ignore */ } };
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const SOURCE_LABEL = { corpus: 'Aleph text library', service: 'service order', curriculum: 'lesson text' };

/** Pointed form + POS key used to match a pack word to its entry in the 5,000-word list. */
export const bridgeKey = (he, pos) => `${String(he ?? '').normalize('NFC')}|${pos}`;

/** Cards for the pack words that exist in the 5,000-word list. Pure. Returns {cards, added, existing, skipped}. */
export function sendPack(cards, packWords, vocabEntries, now) {
  const byKey = new Map();
  for (const e of vocabEntries) { const k = bridgeKey(e.pointed || e.lemma, e.pos); if (!byKey.has(k)) byKey.set(k, e); }
  const matched = []; let skipped = 0; let existing = 0;
  for (const w of packWords) {
    const e = byKey.get(bridgeKey(w.he, w.pos));
    if (!e) { skipped++; continue; }
    if (cards[`vocab:${e.id}`]) { existing++; continue; }
    matched.push(e);
  }
  const r = addCards(cards, matched, now);
  return { cards: r.cards, added: r.added, existing, skipped };
}

/** @param {HTMLElement} root @param {any} ctx @returns {() => void} unmount */
export function mount(root, ctx) {
  injectStyle();
  const now = () => (typeof ctx?.now === 'function' ? ctx.now() : Date.now());
  const wrap = el('section', { class: 'alef-themes', 'aria-labelledby': 'view-title' });
  const h1 = el('h1', { id: 'view-title', tabindex: '-1' }, 'Theme packs');
  const notice = el('p', { class: 'th-muted draft-flag' }, DRAFT_NOTICE);
  const body = el('div', { class: 'th-body' }, el('p', { class: 'muted', role: 'status' }, 'Loading the theme packs…')); // plan 4.9: a loading line, not an empty shell
  const status = el('div', { class: 'th-status', role: 'status', 'aria-live': 'polite' });
  const footer = el('footer', {}, sourcesLine(el, { examples: true }));
  wrap.append(h1, notice, body, status, footer);
  root.append(wrap);

  let alive = true; let data = null; let state = { v: 1, last: null, sent: {} }; let current = null; let vocab = null;
  const say = (t) => { status.textContent = t; };
  const setBody = (...n) => { body.replaceChildren(...n.filter(Boolean)); };
  const save = () => storeSet(ctx, STORE_KEY, state);

  const loadIndex = async () => ctx?.themesData?.index || loadJson('data/vocab/themes/index.json');
  const loadPack = async (id) => {
    const pack = ctx?.themesData?.packs?.[id] || await loadJson(`data/vocab/themes/${id}.json`);
    return pack && Array.isArray(pack.words) ? { ...pack, words: visibleRecords(pack.words) } : pack; // flags.hidden records never render
  };
  const loadVocab = async () => { if (!vocab) vocab = ctx?.themesData?.entries || await loadAllVocab(); return vocab; };

  function showList() {
    current = null;
    h1.textContent = 'Theme packs';
    const items = data.themes.map((t) => {
      const sent = state.sent[t.id];
      return el('li', {}, el('button', { type: 'button', class: 'btn secondary th-card', 'data-pack': t.id, onclick: () => openPack(t.id) },
        el('strong', {}, t.title), ' ', el('span', { class: 'th-muted' }, `${plural(t.size, 'word', 'words')}, ${t.withExample} with an example line${sent ? ', sent to your review deck' : ''}`)));
    });
    setBody(el('p', {}, `${data.count} packs of up to ${data.themeSize} words, grouped by topic and ordered by how often the word appears in Aleph's own texts. Choose one to open it.`), el('ul', { class: 'th-list', 'aria-label': 'Theme packs' }, ...items));
    say('');
    state.last = null; save();
    focusNode(h1);
  }

  function wordItem(w) {
    // the shared button (src/shell/audio-access.js): a recording when the list has one, else the device voice reading this word's
    // pointed text (Israeli only, labelled), else "No audio yet". The button carries its own status line.
    const listen = audioButton(el, ctx, { kind: 'word', id: w.id, text: String(w.he || '').replace(/־/g, ' '), label: 'Listen', name: w.en });
    const ex = w.example ? el('blockquote', { class: 'th-ex' },
      heText(w.example.he), w.example.en ? el('div', {}, uiEnglish(ctx, w.example.en)) : null,
      el('div', { class: 'th-muted' }, `From the ${SOURCE_LABEL[w.example.source?.channel] || 'Aleph texts'} (${w.example.source?.ref ?? ''}). ${SENSE_NOTE}`), exampleCredit(el, w.example)) : el('p', { class: 'th-muted' }, 'No example line: this word does not appear in a full line of Aleph\'s texts.');
    const flags = w.flags?.includes('exampleSpellingShared') ? el('p', { class: 'th-muted' }, 'The spelling is shared with another word, so the line may show that other word.') : null;
    return el('li', { class: 'th-word', 'data-id': w.id },
      ctx.img?.(el, { kind: 'word', id: w.id, class: 'th-pic', width: 400 }),
      el('div', { class: 'th-he' }, heText(w.he)),
      el('div', {}, [w.translit, `${uiEnglish(ctx, w.en)}`, POS_LABEL[w.pos] || w.pos].filter(Boolean).join(' · ')),
      listen, ex, flags);
  }

  async function sendToDeck(pack, btn) {
    btn.setAttribute('aria-disabled', 'true');
    try {
      const entries = await loadVocab();
      const cards0 = await storeGet(ctx, VOCAB_CARDS_KEY, {});
      const cards = Array.isArray(cards0) ? Object.fromEntries(cards0.filter((x) => x?.id).map((x) => [x.id, x])) : (cards0 || {});
      const r = sendPack(cards, pack.words, entries, now());
      if (r.added) await storeSet(ctx, VOCAB_CARDS_KEY, r.cards);
      state.sent[pack.id] = { at: now(), added: r.added, existing: r.existing, skipped: r.skipped }; await save();
      say(`${plural(r.added, 'card', 'cards')} added to your review deck. ${r.existing} already there. ${r.skipped} not in the 5,000-word review list, so not added.`);
    } catch { say('Could not add the cards. Nothing was changed.'); }
    btn.removeAttribute('aria-disabled');
    if (alive) focusNode(btn);
  }

  async function openPack(id) {
    say('Loading…');
    let pack;
    try { pack = await loadPack(id); } catch { say('Could not load this pack.'); return; }
    if (!alive) return;
    current = pack;
    h1.textContent = pack.title;
    state.last = id; save();
    const back = el('button', { type: 'button', class: 'btn secondary', onclick: showList }, 'All packs');
    const send = el('button', { type: 'button', class: 'btn', 'data-action': 'send', onclick: (ev) => { if (send.getAttribute('aria-disabled') === 'true') return; sendToDeck(pack, send); } }, 'Send to my review deck');
    const withEx = pack.words.filter((w) => w.example).length;
    setBody(back, el('p', {}, `${plural(pack.words.length, 'word', 'words')}, most common first. ${withEx} have an example line.`), send,
      el('ul', { class: 'th-list', 'aria-label': pack.title }, ...pack.words.map(wordItem)));
    say('');
    focusNode(h1);
  }

  const onKey = (ev) => { if (ev.key === 'Escape' && current && !ev.ctrlKey && !ev.metaKey && !ev.altKey) { ev.preventDefault?.(); showList(); } };
  wrap.addEventListener('keydown', onKey);

  (async () => {
    try {
      const saved = await storeGet(ctx, STORE_KEY, null);
      if (saved && saved.v === 1 && typeof saved.sent === 'object') state = { v: 1, last: saved.last ?? null, sent: saved.sent || {} };
      data = await loadIndex();
    } catch { if (alive) { setBody(el('p', {}, 'The theme packs could not be loaded.')); say('Could not load the theme packs.'); } return; }
    if (!alive) return;
    const want = ctx?.query?.pack || null;
    if (want && data.themes.some((t) => t.id === want)) await openPack(want); else showList();
  })();

  return () => { alive = false; try { ctx?.audio?.stop?.(); } catch { /* ignore */ } wrap.remove?.(); };
}
