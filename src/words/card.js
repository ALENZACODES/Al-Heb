// @ts-check
// The word card: what a learner sees after tapping a Hebrew word. Lazy (src/words/ is fetched on first use).
// cardModel() is pure; renderCard() builds the DOM with the caller's element helper. `m` is the word-notes module
// (src/words/morph.js morph()).

export const NOT_FOUND = 'There are no notes for this word yet.';
export const PACK_HINT = 'The Word helper language pack can look up any Hebrew word on this device. You can add it on the Language Packs page.';
export const PACK_NOTE = 'Worked out on this device by the Word helper language pack, not from a checked list. Check it before you rely on it.';
export const UNIT_NOTE = 'These notes were put together from the word list and the lesson text. A teacher has not checked them yet.';

/**
 * @param {any} m  the word-notes module
 * @param {{word:string, around?:string, unit?:any, joint?:any, roots?:any, packOffered?:boolean}} q
 *   unit: the lesson's word notes (m.loadUnit); joint: the word as read by the pack, when there is one
 * @returns {null | {word:string, found:boolean, source:'lesson'|'pack'|null, lines:{id:string,label:string,text:string,he?:string}[], note:string, packLink:boolean}}
 *   null for the divine Name and for a single letter: neither gets a card
 */
export function cardModel(m, q) {
  const word = String(q.word || '').trim();
  if (!word || m.isNameWord(word) || !m.isWord(word)) return null;
  const hit = m.findInUnit(q.unit, word, q.around || '');
  if (hit) return { word, found: true, source: 'lesson', lines: m.describe(hit.a, hit.entry), note: UNIT_NOTE, packLink: false };
  const read = q.joint ? m.fromJoint(q.joint, q.roots) : null;
  if (read) {
    // a word read by the pack has no word-list entry, but its dictionary form may have family letters in the app's list
    const partial = read.entry && read.entry.partial ? read.entry : null;
    const extra = partial && partial.root ? m.describe({}, { he: '', en: '', pos: '', root: partial.root, binyan: partial.binyan, rootChecked: partial.rootChecked }).filter((l) => l.id === 'root' || l.id === 'pattern') : [];
    return { word, found: true, source: 'pack', lines: m.describe(read.a, partial ? null : read.entry).concat(extra), note: PACK_NOTE, packLink: false };
  }
  return { word, found: false, source: null, lines: [], note: q.packOffered ? `${NOT_FOUND} ${PACK_HINT}` : NOT_FOUND, packLink: !!q.packOffered };
}

/**
 * @param {(tag:string, attrs?:any, ...kids:any[]) => HTMLElement} h
 * @param {NonNullable<ReturnType<typeof cardModel>>} model
 * @param {{onClose:() => void}} o
 */
export function renderCard(h, model, o) {
  const id = `wc-${Math.random().toString(36).slice(2, 8)}`;
  const rows = model.lines.map((l) => h('div', { class: 'alef-wc-row' },
    h('dt', {}, l.label),
    h('dd', {}, l.he ? h('span', { class: 'alef-he alef-wc-he', lang: 'he', dir: 'rtl' }, l.he) : null, l.he ? ' ' : null, h('span', {}, l.text))));
  const close = h('button', { type: 'button', class: 'btn secondary alef-wc-close', 'aria-label': 'Close the word notes', onclick: o.onClose }, 'Close');
  const card = h('div', { class: 'card alef-wordcard', role: 'group', tabindex: '-1', 'aria-labelledby': `${id}-t`, 'data-source': model.source || 'none' },
    h('p', { class: 'alef-wc-title', id: `${id}-t` }, h('strong', {}, 'Word notes: '), h('span', { class: 'alef-he alef-word', lang: 'he', dir: 'rtl' }, model.word)),
    rows.length ? h('dl', { class: 'alef-wc-lines' }, ...rows) : null,
    h('p', { class: 'muted small alef-wc-note' }, model.note, model.packLink ? ' ' : null, model.packLink ? h('a', { href: '#/packs' }, 'Language Packs') : null),
    close);
  card.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); o.onClose(); } });
  return card;
}
