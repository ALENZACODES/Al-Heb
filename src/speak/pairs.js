// Minimal-pair listening drills (pure; used by build.mjs at build time and by the view at run time).
// Contrasts: bet/vet, het/khaf, kamatz (a) vs kamatz katan / cholam (o), shin/sin. Every item is an existing word from
// data/vocab/words.json (a machine-built draft); the answer is read off its niqqud, so a wrong vowel point in the source
// makes a wrong answer here. True minimal pairs (two list words differing only in the contrast) are kept when found;
// the rest are "which sound did you hear at the marked letter" items.
import { normalizeHe } from './model.js';

const DAGESH = 'ּ', SHIN_DOT = 'ׁ', SIN_DOT = 'ׂ', KAMATZ = 'ָ', KAMATZ_KATAN = 'ׇ', CHOLAM = /[ֹֺ]/;
const isLetter = (c) => c >= 'א' && c <= 'ת';

/** Split pointed Hebrew into [{letter, marks}] clusters (NFD so dots and vowels are separate code points). */
export function clusters(he) {
  const out = [];
  for (const ch of String(he ?? '').normalize('NFD')) {
    if (isLetter(ch)) out.push({ letter: ch, marks: '' });
    else if (out.length && ch >= '֑' && ch <= 'ׇ') out[out.length - 1].marks += ch;
    else if (ch === ' ' || ch === '־') out.push({ letter: ' ', marks: '' });
  }
  return out;
}

export const CONTRASTS = [
  { id: 'bet-vet', title: 'Bet or vet (b / v)', letters: 'ב', sounds: [{ id: 'b', label: 'b as in "boy" (with the dot)' }, { id: 'v', label: 'v as in "vine" (no dot)' }],
    prompt: 'Which sound is the marked letter?', byEar: true,
    note: 'The same letter: with a dagesh dot it is b, without it is v. Real in every tradition, so a browser voice can carry it.' },
  { id: 'het-khaf', title: 'Het or khaf', letters: 'חכך', sounds: [{ id: 'het', label: 'het (ח)' }, { id: 'khaf', label: 'khaf (כ, ך)' }],
    prompt: 'Which letter spells this sound?', byEar: false,
    note: 'In Israeli Hebrew, and in the browser voice, het and khaf sound the same (a throaty kh), so this is a spelling check, not a listening one. Mizrahi, Yemenite and some Sephardi speakers pronounce het deeper in the throat; only a recording in such a voice would make it a true listening drill.' },
  { id: 'kamatz', title: 'Kamatz: a or o', letters: '', sounds: [{ id: 'a', label: 'a as in "father" (kamatz)' }, { id: 'o', label: 'o as in "more" (kamatz katan or cholam)' }],
    prompt: 'Is the vowel after the marked letter a or o?', byEar: true,
    note: 'Kamatz is usually a, but kamatz katan is o and looks the same in print. Ashkenazi reading says o for every kamatz. The browser voice may read a kamatz katan as a: only a recorded clip can be trusted for those words.' },
  { id: 'shin-sin', title: 'Shin or sin (sh / s)', letters: 'ש', sounds: [{ id: 'sh', label: 'sh as in "ship" (dot on the right)' }, { id: 's', label: 's as in "sun" (dot on the left)' }],
    prompt: 'Which sound is the marked letter?', byEar: true,
    note: 'Same letter, two sounds, told apart by which side the dot sits on. Real in every tradition.' },
];
export const contrastById = (id) => CONTRASTS.find((c) => c.id === id) || null;

/** Positions (cluster index) where a contrast occurs in a pointed word, each with the sound id it carries. Unmarked letters give no position. */
export function contrastSlots(he, contrastId) {
  const cl = clusters(he), out = [];
  cl.forEach((c, i) => {
    if (contrastId === 'bet-vet' && c.letter === 'ב') out.push({ i, sound: c.marks.includes(DAGESH) ? 'b' : 'v' });
    else if (contrastId === 'het-khaf') { if (c.letter === 'ח') out.push({ i, sound: 'het' }); else if ((c.letter === 'כ' || c.letter === 'ך') && !c.marks.includes(DAGESH)) out.push({ i, sound: 'khaf' }); }
    else if (contrastId === 'shin-sin' && c.letter === 'ש') { if (c.marks.includes(SHIN_DOT)) out.push({ i, sound: 'sh' }); else if (c.marks.includes(SIN_DOT)) out.push({ i, sound: 's' }); }
    else if (contrastId === 'kamatz') { // cholam on a vav (cholam male) is excluded: the vav itself shows the o in unpointed text
      if (c.marks.includes(KAMATZ_KATAN) || (CHOLAM.test(c.marks) && c.letter !== 'ו')) out.push({ i, sound: 'o' }); else if (c.marks.includes(KAMATZ)) out.push({ i, sound: 'a', vav: c.letter === 'ו' || undefined }); else if (CHOLAM.test(c.marks)) out.push({ i, sound: 'o', vav: true }); }
  });
  return out;
}

/** Letters of a word with the contrast letter marked: [{text, mark}] segments (unpointed, so the point does not give the answer away). */
export function markedLetters(he, slot, { hide = false } = {}) {
  const cl = clusters(he), segs = [];
  cl.forEach((c, i) => { const mark = i === slot; const ch = mark && hide ? '?' : c.letter; const last = segs[segs.length - 1]; if (last && last.mark === mark) last.text += ch; else segs.push({ text: ch, mark }); });
  return segs;
}

/** Skeleton with the contrast neutralised: equal skeletons = candidate minimal pair. */
function skeleton(he, contrastId) {
  return clusters(he).map((c) => {
    let { letter, marks } = c;
    if (contrastId === 'bet-vet' && letter === 'ב') marks = marks.replace(DAGESH, '');
    else if (contrastId === 'shin-sin' && letter === 'ש') marks = marks.replace(SHIN_DOT, '').replace(SIN_DOT, '');
    else if (contrastId === 'het-khaf' && (letter === 'ח' || ((letter === 'כ' || letter === 'ך') && !marks.includes(DAGESH)))) letter = 'X';
    else if (contrastId === 'kamatz') marks = marks.replace(/[ָׇֹֺ]/g, 'Q');
    return letter + marks;
  }).join('');
}
const firstWord = (en) => String(en || '').toLowerCase().replace(/[^a-z ]/g, '').trim().split(/\s+/)[0] || '';
const rank = (w) => w.frequencyRank ?? w.modernRank ?? 1e9;

/**
 * Build the drill data from the word list. perContrast caps the single-word items per contrast (most frequent first).
 * Returns {schema, note, contrasts, items:[{id, contrast, type:'sound'|'pair', he, en, translit, answer, slot, marked, audioId, pair?}]}.
 */
export function buildPairs(words, manifestTexts = new Map(), { perContrast = 24 } = {}) {
  const single = words.filter((w) => w.kind === 'word' && typeof w.he === 'string' && w.he.trim() && !/[\s־]/.test(w.he.trim()) && w.en && w.translit);
  const items = [], usedIds = new Set();
  const audio = (he) => manifestTexts.get(he.normalize('NFC')) || null;
  for (const c of CONTRASTS) {
    // true pairs
    const groups = new Map();
    for (const w of single) { const slots = contrastSlots(w.he, c.id); if (slots.length !== 1 || slots[0].vav) continue; const k = skeleton(w.he, c.id); (groups.get(k) || groups.set(k, []).get(k)).push(w); }
    let pairs = 0;
    for (const g of groups.values()) {
      if (g.length < 2) continue;
      const bySound = new Map();
      for (const w of g) { const s = contrastSlots(w.he, c.id)[0].sound; if (!bySound.has(s) || rank(w) < rank(bySound.get(s))) bySound.set(s, w); }
      if (bySound.size < 2) continue;
      const [a, b] = [...bySound.values()];
      if (firstWord(a.en) === firstWord(b.en)) continue; // the same word pointed two ways in the draft list, not a pair
      const pid = `pair-${c.id}-${a.id}-${b.id}`;
      for (const [w, other] of [[a, b], [b, a]]) {
        const slot = contrastSlots(w.he, c.id)[0];
        items.push({ id: `${c.id}:${w.id}`, contrast: c.id, type: 'pair', he: w.he, en: w.en, translit: w.translit, answer: slot.sound, slot: slot.i, marked: markedLetters(w.he, slot.i, { hide: !c.byEar }), audioId: audio(w.he), pair: pid, other: { id: `${c.id}:${other.id}`, he: other.he, en: other.en, translit: other.translit, answer: contrastSlots(other.he, c.id)[0].sound } });
        usedIds.add(w.id);
      }
      pairs++;
    }
    // single-word "which sound" items: most frequent first, both sounds represented about equally
    const cands = single.filter((w) => !usedIds.has(w.id)).map((w) => ({ w, slots: contrastSlots(w.he, c.id) })).filter((x) => x.slots.length === 1 && !x.slots[0].vav).sort((x, y) => rank(x.w) - rank(y.w));
    const per = Math.ceil(perContrast / c.sounds.length);
    for (const s of c.sounds) {
      let n = 0;
      for (const { w, slots } of cands) {
        if (n >= per) break;
        if (slots[0].sound !== s.id) continue;
        items.push({ id: `${c.id}:${w.id}`, contrast: c.id, type: 'sound', he: w.he, en: w.en, translit: w.translit, answer: s.id, slot: slots[0].i, marked: markedLetters(w.he, slots[0].i, { hide: !c.byEar }), audioId: audio(w.he) });
        usedIds.add(w.id); n++;
      }
    }
  }
  return { schema: 'alef-speak-pairs/1', note: 'Draft built by src/speak/build.mjs from data/vocab/words.json (machine-built, not native-reviewed). Answers come from the source niqqud; a wrong point there makes a wrong answer here. No recorded clips exist yet; the browser voice is the only sound.', contrasts: CONTRASTS.map(({ letters, ...c }) => c), items };
}

/** Shuffle with an injected rng. */
export function shuffle(a, rng = Math.random) { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; }

/** A drill round: up to n items of one contrast, true pairs first (one item per pair), then single-word items, shuffled. */
export function drillQueue(items, contrastId, rng = Math.random, n = 10) {
  const mine = items.filter((it) => it.contrast === contrastId);
  const seenPair = new Set();
  const pairs = shuffle(mine.filter((it) => it.type === 'pair'), rng).filter((it) => { if (seenPair.has(it.pair)) return false; seenPair.add(it.pair); return true; });
  const singles = shuffle(mine.filter((it) => it.type === 'sound'), rng);
  return shuffle(pairs.concat(singles).slice(0, n), rng);
}

/**
 * One question. type 'pair': the learner hears one of the two words (chosen by rng) and picks which word; options are the two
 * pointed words. type 'sound': hears the word and picks the sound at the marked letter. Returns {item, play:{he, audioId}, options:[{id,label,he?}], answer, prompt}.
 */
export function drillQuestion(item, rng = Math.random) {
  const c = contrastById(item.contrast);
  if (item.type === 'pair') {
    const playOther = rng() < 0.5;
    const played = playOther ? { he: item.other.he, en: item.other.en, translit: item.other.translit, answer: item.other.answer, id: item.other.id } : { he: item.he, en: item.en, translit: item.translit, answer: item.answer, id: item.id };
    const opts = shuffle([{ id: item.id, he: item.he, label: item.en }, { id: item.other.id, he: item.other.he, label: item.other.en }], rng);
    return { item, kind: 'pair', play: { he: played.he, audioId: playOther ? null : item.audioId }, options: opts, answer: played.id, prompt: 'Which word did you hear?', played };
  }
  return { item, kind: 'sound', play: { he: item.he, audioId: item.audioId }, options: c.sounds.map((s) => ({ id: s.id, label: s.label })), answer: item.answer, prompt: c.prompt, played: { he: item.he, en: item.en, translit: item.translit, answer: item.answer, id: item.id } };
}
