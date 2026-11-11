// @ts-check
// Written descriptions of how Hebrew sounds are made, for learners who cannot or do not use audio (and for anyone who reads before they listen).
// Every sentence comes from files that already exist in data/pronunciation (consonants.json "say" and "english", niqqud.json "english",
// soundgap.json "mouth" steps). Nothing is invented here. Where the data has no mouth description for a letter, the result says so.
// DRAFT: nobody who speaks Hebrew has checked the wording, and words cannot replace hearing a sound. See SOUND_TEXT_NOTE.
import { SOUND_TEXT_NOTE } from '../shell/audiofree.js';
export { SOUND_TEXT_NOTE };

const TRADS = ['israeli', 'sephardi', 'ashkenazi'];
const tradKey = (t) => (TRADS.includes(t) ? t : 'sephardi');

/**
 * @typedef {{id:string, name:string, he:string, summary:string, english:string, mouth:{for:string, steps:string[]}[], hasMouthSteps:boolean, changes:boolean, note:string}} LetterSoundText
 * @param {string} letterId  a key of consonants.json letters (e.g. "chet")
 * @param {{consonants?:any, soundgap?:any}} data  parsed data/pronunciation/consonants.json and soundgap.json
 * @param {string} [tradition] 'israeli' | 'sephardi' | 'ashkenazi'
 * @returns {LetterSoundText|null}
 */
export function letterSoundText(letterId, data, tradition) {
  const rec = data?.consonants?.letters?.[letterId];
  if (!rec) return null;
  const t = tradKey(tradition);
  const mouth = [];
  for (const g of data?.soundgap?.gaps || []) {
    if (!Array.isArray(g.letters) || !g.letters.includes(letterId)) continue;
    for (const m of g.mouth || []) if (m && Array.isArray(m.steps) && m.steps.length) mouth.push({ for: String(m.for || g.title || ''), steps: m.steps.map(String) });
  }
  return {
    id: letterId, name: rec.name, he: rec.he,
    summary: String(rec.say?.[t] || ''),
    english: String(rec.english?.[t] || rec.english?.american_synagogue || ''),
    mouth, hasMouthSteps: mouth.length > 0, changes: !!rec.changesSound,
    note: mouth.length ? '' : 'Aleph has no step-by-step mouth description for this letter yet. The line above is the closest English comparison in its notes.',
  };
}

/**
 * @param {string} vowelId  a niqqud.json record id (e.g. "kamatz")
 * @param {{niqqud?:any}} data
 * @param {string} [tradition]
 */
export function vowelSoundText(vowelId, data, tradition) {
  const rec = (data?.niqqud?.records || []).find((r) => r.id === vowelId);
  if (!rec) return null;
  const t = tradKey(tradition);
  return {
    id: vowelId, name: rec.name, shape: rec.shape,
    english: String(rec.english?.[t] || rec.english?.american_synagogue || ''),
    position: String(rec.position || ''),
    mouth: [], hasMouthSteps: false,
    note: 'Aleph has no mouth-position description for vowels yet. The line above compares the vowel with an English word, and the position says where the mark is written.',
  };
}

/** Plain text of a description (for tests, copy buttons and screen-reader summaries). @param {LetterSoundText|null} d */
export function describeAsText(d) {
  if (!d) return '';
  const out = [`${d.name}: ${d.summary || d.english}`.trim()];
  if (d.english && d.summary && d.english !== d.summary) out.push(`Closest English: ${d.english}.`);
  for (const m of d.mouth || []) out.push(`${m.for}: ${m.steps.join(' ')}`);
  if (d.note) out.push(d.note);
  return out.join(' ');
}

/**
 * A closed "How this sound is made, in words" block. `h` is a DOM element factory with the shape h(tag, attrs, ...kids).
 * @param {Function} h @param {LetterSoundText|ReturnType<typeof vowelSoundText>|null} d
 */
export function soundTextNode(h, d) {
  if (!d) return null;
  const rows = [];
  if ('summary' in d && d.summary) rows.push(h('p', {}, d.summary));
  if (d.english) rows.push(h('p', { class: 'muted' }, 'Closest English: ' + d.english));
  if ('position' in d && d.position) rows.push(h('p', { class: 'muted' }, 'Where it is written: ' + d.position));
  for (const m of d.mouth || []) rows.push(h('div', { class: 'soundtext-mouth' }, h('p', {}, h('strong', {}, m.for)), h('ol', {}, ...m.steps.map((s) => h('li', {}, s)))));
  if (d.note) rows.push(h('p', { class: 'muted' }, d.note));
  rows.push(h('p', { class: 'muted draft-flag' }, SOUND_TEXT_NOTE));
  return h('details', { class: 'soundtext', 'data-soundtext': d.id }, h('summary', {}, `How ${d.name} is said, in words`), ...rows);
}

/** Loads the three data files. Browser: fetch next to this module. Node (tests): read from disk. Never throws; missing parts are left out. */
export async function loadSoundTextData() {
  const get = async (rel) => {
    const url = new URL('../../data/pronunciation/' + rel, import.meta.url);
    try {
      if (url.protocol === 'file:') { const [{ readFile }, { fileURLToPath }] = await Promise.all([import('node:fs/promises'), import('node:url')]); return JSON.parse(await readFile(fileURLToPath(url), 'utf8')); }
      const r = await fetch(url); return r.ok ? await r.json() : null;
    } catch { return null; }
  };
  const [consonants, niqqud, soundgap] = await Promise.all([get('consonants.json'), get('niqqud.json'), get('soundgap.json')]);
  return { consonants, niqqud, soundgap };
}
