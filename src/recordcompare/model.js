// Record-and-compare speaking practice: pure logic. UNSCORED by design: the app records nothing to disk, judges no sound and gives no
// accuracy number. The learner records the two words of a minimal pair, listens back, and says whether THEY could hear a difference.
// Pairs come from data/speak/minimal-pairs.json (rule-generated from the vocabulary data, unreviewed). A pair is offered only when that
// file marks it audible in the learner's reading tradition. Store key recordcompare.v1 keeps counts of self-reports only (no audio).
import { rng, shuffled } from '../curriculum/spotit.js';

export const STORE_KEY = 'recordcompare.v1';
export const RECORD_MS = 4000;
export const ANSWERS = ['yes', 'unsure', 'no'];
export const ANSWER_LABEL = { yes: 'Yes, I could hear a difference', unsure: 'Not sure', no: 'No, they sounded the same' };
export const HONESTY = 'Practice only. Aleph does not judge your pronunciation and gives no score: you listen to yourself and decide. The model voice is your device\'s speech voice, not a recording of a person, and it can be wrong.';
export const PRIVACY = 'Your recordings stay in this page\'s memory. They are not saved, not uploaded by Aleph, and are dropped when you press Next or leave the page. Your browser asks for microphone permission.';

export const pairKey = (p) => `${p.a.id}|${p.b.id}`;

/** Pairs offered for a tradition: audible in that tradition only. `contrast` ('all' or an id) filters. */
export function listPairs(data, tradition, contrast = 'all') {
  const i = (data?.traditions || []).indexOf(tradition);
  if (i < 0) return [];
  const out = [];
  for (const c of data.contrasts || []) {
    if (contrast !== 'all' && c.id !== contrast) continue;
    for (const p of c.pairs || []) {
      if (!p.audible || p.audible[i] !== true) continue;
      out.push({ key: pairKey(p), contrastId: c.id, contrastTitle: c.title, feature: c.feature, heard: c.heard?.[tradition] || '',
        a: { id: p.a.id, he: p.a.he, en: p.a.en, respelling: p.a.simple?.[i] || '', ipa: p.a.ipa?.[i] || '' }, b: { id: p.b.id, he: p.b.he, en: p.b.en, respelling: p.b.simple?.[i] || '', ipa: p.b.ipa?.[i] || '' } });
    }
  }
  return out;
}
/** Contrasts that have at least one pair in the tradition, with counts. */
export function contrastsFor(data, tradition) {
  return (data?.contrasts || []).map((c) => ({ id: c.id, title: c.title, count: listPairs(data, tradition, c.id).length })).filter((c) => c.count > 0);
}

export const emptyState = () => ({ v: 1, pairs: {}, answers: { yes: 0, unsure: 0, no: 0 } });
export function normalizeState(raw) {
  const s = emptyState(); if (!raw || typeof raw !== 'object') return s;
  const n = (x) => (Number.isFinite(x) && x >= 0 ? Math.floor(x) : 0);
  for (const [k, v] of Object.entries(raw.pairs && typeof raw.pairs === 'object' ? raw.pairs : {}).slice(0, 2000)) if (v && typeof v === 'object') s.pairs[k] = { tries: n(v.tries), last: ANSWERS.includes(v.last) ? v.last : null };
  for (const a of ANSWERS) s.answers[a] = n(raw.answers?.[a]);
  return s;
}
export function recordAnswer(state, key, answer) {
  if (!ANSWERS.includes(answer)) return state;
  const p = state.pairs[key] || { tries: 0, last: null };
  return { ...state, pairs: { ...state.pairs, [key]: { tries: p.tries + 1, last: answer } }, answers: { ...state.answers, [answer]: state.answers[answer] + 1 } };
}
/** Least-practised pairs first (ties shuffled by seed). */
export function pickPairs(list, state, { size = 6, seed = 1 } = {}) {
  const r = rng(seed);
  return list.map((p) => ({ p, k: (state.pairs[p.key]?.tries || 0) + r() * 0.5 })).sort((a, b) => a.k - b.k).slice(0, size).map((x) => x.p);
}
/** Plain sentence about the learner's own reports. Never a percentage of "correct". */
export function summaryText(state) {
  const t = state.answers.yes + state.answers.unsure + state.answers.no;
  if (!t) return 'No practice recorded yet.';
  return `You have compared ${t} pair${t === 1 ? '' : 's'}: you reported hearing a difference ${state.answers.yes} time${state.answers.yes === 1 ? '' : 's'}, not sure ${state.answers.unsure}, no difference ${state.answers.no}. These are your own reports, not a measurement.`;
}
const ERRORS = {
  unsupported: 'This browser cannot record from the microphone here. You can still listen to the model voice for each word.',
  'not-allowed': 'The microphone was blocked. Allow it in the browser settings for this site, then try again.',
  'audio-capture': 'No microphone was found.',
  'start-failed': 'Recording did not start. Try again.', 'stop-failed': 'Recording did not stop cleanly. Try again.', 'no-data': 'Nothing was recorded. Try again.',
  'not-recording': 'Nothing is recording.',
};
export const describeError = (code) => ERRORS[code] || 'The recording did not work. Try again.';

// ---------- G4 blind check (CODER-100): play one of the learner's own two takes at random; they say which word it was ----------
// A self-check of their own production: if they cannot tell their A from their B blind, the two words may have sounded alike.
// Aleph hears nothing; only counts are kept (BLIND_KEY), never audio.
export const BLIND_KEY = 'recordcompare.blind.v1';
export const BLIND_NOTE = 'Blind check: one of your two recordings plays, chosen at random, and you say which word it was. It is a self-check of your own takes; Aleph does not listen to them.';
/** Which take to play: 'a' or 'b' from a random number in [0, 1). */
export const blindPick = (r) => (r < 0.5 ? 'a' : 'b');
/** The plain result of one blind check. */
export function blindVerdict(which, picked) {
  const W = which.toUpperCase(), P = picked.toUpperCase();
  return which === picked
    ? { told: true, text: `It was ${W}. You said ${P}: you told your two words apart this time.` }
    : { told: false, text: `It was ${W}. You said ${P}: your two words may have sounded alike. Listen to the model again and record both once more.` };
}
export function normalizeBlind(raw) {
  const n = (x) => (Number.isFinite(x) && x >= 0 ? Math.floor(x) : 0);
  const t = n(raw?.tries), told = Math.min(n(raw?.told), t);
  return { v: 1, tries: t, told };
}
export const addBlind = (state, told) => { const s = normalizeBlind(state); return { v: 1, tries: s.tries + 1, told: s.told + (told ? 1 : 0) }; };
export const blindSummary = (state) => { const s = normalizeBlind(state); return s.tries ? `Blind checks so far: you told your words apart ${s.told} of ${s.tries} times (your own check, not a measurement).` : ''; };
