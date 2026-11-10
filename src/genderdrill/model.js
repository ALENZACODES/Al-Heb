// Gender as a mechanic: the learner states their own gender, and drills are generated so that "I" forms follow it. Pure logic.
// Sources: data/gender/templates.json (built from the vocabulary data: person-noun pairs, pronouns, nouns whose ending lies about gender)
// and, optionally, the repo's authored speaker/addressee paradigms (data/curriculum/gender-pairs.json). Adjective and verb agreement come
// only from those authored paradigms: the vocabulary data has no feminine adjectives and one present form per verb.
// Rule: no silent default. Without a stored choice speaker is null and no drill is built. Speaker 'f' never receives a masculine
// first-person form as a prompt, option or main answer (the other form appears only as a tap-to-reveal contrast on a study card).
import { rng, shuffled } from '../curriculum/spotit.js';
import { composeParadigm } from '../curriculum/gender.js';

export const STORE_KEY = 'gender.v1';
export const SPEAKERS = ['m', 'f', 'both'];
export const SPEAKER_LABEL = { m: 'a man', f: 'a woman', both: 'show me both forms' };
const LEGACY_KEY = 'curriculum.gender'; // { iAm } written by the existing gender pair cards when the learner taps a choice
export const LEGACY_STORE_KEY = LEGACY_KEY;

export const emptyPrefs = () => ({ v: 1, speaker: null, asked: 0, right: 0 });
/** raw = stored gender.v1; legacy = stored curriculum.gender (an explicit earlier choice, used only when gender.v1 has none). */
export function normalizePrefs(raw, legacy) {
  const p = emptyPrefs();
  const n = (x) => (Number.isFinite(x) && x >= 0 ? Math.floor(x) : 0);
  if (raw && typeof raw === 'object') { if (SPEAKERS.includes(raw.speaker)) p.speaker = raw.speaker; p.asked = n(raw.asked); p.right = Math.min(n(raw.right), p.asked); }
  if (!p.speaker && legacy && (legacy.iAm === 'm' || legacy.iAm === 'f')) p.speaker = legacy.iAm;
  return p;
}
export const setSpeaker = (p, s) => (SPEAKERS.includes(s) ? { ...p, speaker: s } : p);

/** "a (male) student" -> "student"; "child, a kid" -> "child". */
export const plainGloss = (en) => String(en || '').replace(/\((male|female)\)\s*/gi, '').replace(/^(a|an|the)\s+/i, '').split(/[,;(]/)[0].trim();

const GENDER_OF = { atah: 'm', hu: 'm', at: 'f', hi: 'f' };
const PRON_EN = { atah: 'you (to a man)', at: 'you (to a woman)', hu: 'he', hi: 'she' };

function selfItem(d, pair, speaker, i) {
  const ani = d.pronouns.ani, g = plainGloss(pair.en);
  const form = (s) => ({ form: s, he: `${ani.he} ${pair[s].he}`, ...(s === 'm' ? { translit: `${ani.translit} ${pair.m.translit}` } : {}) });
  if (speaker === 'both') return { id: `self-${i}`, type: 'self-both', prompt: `"I am a ${g}." Both forms:`, forms: { m: form('m'), f: form('f') }, nounId: pair.id };
  return { id: `self-${i}`, type: 'self', prompt: `Say: "I am a ${g}." (you are ${SPEAKER_LABEL[speaker]})`, main: form(speaker), other: form(speaker === 'm' ? 'f' : 'm'), nounId: pair.id };
}
function agreeItem(d, pair, key, i) {
  const pr = d.pronouns[key], g = plainGloss(pair.en);
  const opts = [{ id: 'm', he: pair.m.he }, { id: 'f', he: pair.f.he }];
  return { id: `agree-${i}`, type: 'agree', prompt: `${PRON_EN[key]}: ${pr.he} ___  ("${g}"). Which form agrees?`, pronoun: { he: pr.he, translit: pr.translit }, options: opts, answer: GENDER_OF[key], explain: `${pr.he} takes the ${GENDER_OF[key] === 'm' ? 'masculine' : 'feminine'} form ${pair[GENDER_OF[key]].he}.`, nounId: pair.id };
}
const KIND_TEXT = { 'feminine-without-feminine-ending': 'The ending does not say feminine, but the dictionary data lists it as feminine.', 'masculine-with-feminine-ending': 'It ends like a feminine word, but the dictionary data lists it as masculine.' };
function irregularItem(it, i) {
  return { id: `irr-${i}`, type: 'irregular', prompt: `Is ${it.he} (${it.translit}: ${plainGloss(it.en)}) masculine or feminine?`, word: { he: it.he, translit: it.translit }, options: [{ id: 'm', label: 'Masculine' }, { id: 'f', label: 'Feminine' }], answer: it.gender, explain: `${KIND_TEXT[it.kind]} Dictionary tags can miss words used in both genders.`, nounId: it.id };
}
function paradigmItem(par, speaker, rand, i) {
  const hasSp = par.parts.some((p) => p.by === 'speaker'), hasAd = par.parts.some((p) => p.by === 'addressee');
  const form = (s, a) => { const c = composeParadigm(par, s, a); return { he: c.he, translit: c.translit }; };
  if (hasSp && speaker === 'both') return { id: `par-${i}`, type: 'self-both', prompt: `"${par.en}" Both forms:`, forms: { m: { form: 'm', ...form('m', 'm') }, f: { form: 'f', ...form('f', 'f') } }, paradigmId: par.id };
  if (hasSp && !hasAd) return { id: `par-${i}`, type: 'self', prompt: `Say: "${par.en}" (you are ${SPEAKER_LABEL[speaker]})`, main: { form: speaker, ...form(speaker, speaker) }, other: { form: speaker === 'm' ? 'f' : 'm', ...form(speaker === 'm' ? 'f' : 'm', speaker === 'm' ? 'f' : 'm') }, paradigmId: par.id };
  if (hasAd) {
    const sp = hasSp ? speaker : 'm'; // fixed to the learner's own gender; a paradigm with no speaker part does not depend on it
    const to = rand() < 0.5 ? 'm' : 'f';
    const a = form(sp, 'm'), b = form(sp, 'f');
    return { id: `par-${i}`, type: 'listener', prompt: `Say: "${par.en}" to ${to === 'm' ? 'a man' : 'a woman'}.`, options: [{ id: 'm', he: a.he, translit: a.translit }, { id: 'f', he: b.he, translit: b.translit }], answer: to, explain: `To ${to === 'm' ? 'a man' : 'a woman'}: ${(to === 'm' ? a : b).he}.`, paradigmId: par.id };
  }
  return null;
}

/**
 * Build a drill. speaker must be 'm' | 'f' | 'both'; null returns {needsChoice:true, items:[]} (no silent default).
 * paradigms = data/curriculum/gender-pairs.json .paradigms (optional).
 */
export function buildDrill(data, speaker, { seed = 1, count = 8, paradigms = [] } = {}) {
  if (!SPEAKERS.includes(speaker)) return { needsChoice: true, items: [] };
  const rand = rng(seed), pairs = shuffled(data.pairs, rand), pars = shuffled(paradigms.filter((p) => p.parts && p.parts.some((x) => x.by)), rand), irr = shuffled(data.irregular.slice(0, 60), rand);
  const keys = shuffled(Object.keys(GENDER_OF), rand);
  const items = []; let a = 0, b = 0, c = 0, d = 0;
  for (let n = 0; items.length < count && n < count * 4; n++) {
    const k = n % 4; let it = null;
    if (k === 0 && a < pairs.length) it = selfItem(data, pairs[a], speaker, a++);
    else if (k === 1 && b < pairs.length) { it = agreeItem(data, pairs[(b + 7) % pairs.length], keys[b % keys.length], b); b++; }
    else if (k === 2 && c < pars.length) it = paradigmItem(pars[c], speaker, rand, c++);
    else if (k === 3 && d < irr.length) it = irregularItem(irr[d], d++);
    if (it) items.push(it);
  }
  return { needsChoice: false, speaker, items };
}
/** Choice items are checked against the data; self items are self-reported. */
export const isChoice = (it) => it.type === 'agree' || it.type === 'irregular' || it.type === 'listener';
export const grade = (it, id) => ({ correct: isChoice(it) && id === it.answer, answer: it.answer });

/** Every first-person form an item puts on screen as a prompt, option or main answer (used by tests for the no-masculine-default rule). */
export function firstPersonForms(it) {
  if (it.type === 'self') return [it.main];
  if (it.type === 'self-both') return [it.forms.m, it.forms.f];
  return [];
}
