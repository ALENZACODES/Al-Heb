// Common phrases and sentences. Hebrew, English, and transliteration come from existing
// records (phrasebook, or a gender-paradigm composed by the curriculum helper). This module
// does not copy that text into a second file and does not invent spellings.
// A clip is attached only when the catalogue entry's text, tradition, and voice match.
// equivalentTo, another tradition, another voice, and a near-match text are never used.
// Slow is a separate slot. A normal clip is never stored as slow.
import { loadJSON } from '../curriculum/data.js';
import { genderedForms } from '../curriculum/gender.js';
import { statusLabel, noOwnFile } from '../shell/audio-labels.js';

export const TRADITIONS = ['israeli', 'sephardi', 'ashkenazi'];
export const VOICES = ['m', 'f'];
export const SPEEDS = ['normal', 'slow'];
export const TRAD_LABEL = { israeli: 'Israeli', sephardi: 'Sephardi', ashkenazi: 'Ashkenazi' };
export const VOICE_LABEL = { m: 'man', f: 'woman' };

const HEBREW = /[֐-׿]/;
const NIQQUD = /[\u0591-\u05C7]/;

/** Playback contract: ctx.audio.play(kind, id, { voice, tradition, rate }).
 *  The shared player in this checkout (src/audio/player.js) satisfies that
 *  call and reports via:'exact' for the exact file; playPhraseClip's
 *  sameSlot guard below stays as the enforcement that nothing else is ever
 *  passed off as the chosen slot. Landed Nov 7 2026: the earlier gate (the
 *  contract's home branch was never merged) left every phrase on this page
 *  silent even though its clips were already in the catalogue — usability
 *  review U-02 / journey J5. */
export const PLAYBACK_CONTRACT_LANDED = true;

export const nfc = (s) => String(s ?? '').normalize('NFC');

/** Pointed Hebrew: at least one Hebrew letter and one niqqud / cantillation mark. */
export function hasPointedHebrew(he) {
  return typeof he === 'string' && HEBREW.test(he) && NIQQUD.test(he);
}

/** Catalogue speed. There is no speed field today; only an id or path that says slow counts. */
export function clipSpeed(entry) {
  const named = entry && (entry.speed || entry.rate);
  if (named === 'slow' || named === 'normal') return named;
  const id = String(entry?.id || '');
  const file = String(entry?.path || '');
  if (/(?:^|[-_/])slow(?:$|[-_.])/i.test(id) || /\/slow\//i.test(file)) return 'slow';
  return 'normal';
}

export function indexManifest(manifest) {
  const byText = new Map();
  for (const e of manifest || []) {
    if (!e || noOwnFile(e) || typeof e.text !== 'string') continue;
    const key = nfc(e.text);
    let bucket = byText.get(key);
    if (!bucket) { bucket = []; byText.set(key, bucket); }
    bucket.push(e);
  }
  return byText;
}

function asIndex(manifestOrIndex) {
  return manifestOrIndex instanceof Map ? manifestOrIndex : indexManifest(manifestOrIndex);
}

/**
 * The catalogue row for this form's own id, or null.
 * Another row with the same spelling (a lesson word, a prayer word) is not this phrase.
 */
export function pickClip(he, manifestOrIndex, { tradition, voice, speed, exactId } = {}) {
  if (!exactId) return null;
  if (!TRADITIONS.includes(tradition) || !VOICES.includes(voice) || !SPEEDS.includes(speed)) return null;
  const key = nfc(he);
  if (!hasPointedHebrew(key)) return null;
  const hits = [];
  for (const e of asIndex(manifestOrIndex).get(key) || []) {
    if (!e || noOwnFile(e) || !e.status) continue;
    if (e.id !== exactId) continue;
    if (e.tradition !== tradition || e.voice !== voice) continue;
    if (nfc(e.text) !== key) continue;
    if (!hasPointedHebrew(e.text)) continue;
    if (clipSpeed(e) !== speed) continue;
    if (e.lang && !/^(he|heb|hebrew|he-il)$/i.test(String(e.lang))) continue;
    hits.push(e);
  }
  if (!hits.length) return null;
  hits.sort((a, b) => String(a.path).localeCompare(String(b.path)));
  const e = hits[0];
  return {
    path: e.path,
    voice: e.voice,
    tradition: e.tradition,
    kind: e.kind,
    id: e.id,
    text: e.text,
    status: e.status,
    source: e.source || '',
    group: e.group || '',
    speed,
  };
}

function slotsFor(he, index, exactId) {
  const audio = {};
  for (const tradition of TRADITIONS) {
    audio[tradition] = {};
    for (const voice of VOICES) {
      audio[tradition][voice] = {
        normal: pickClip(he, index, { tradition, voice, speed: 'normal', exactId }),
        slow: pickClip(he, index, { tradition, voice, speed: 'slow', exactId }),
      };
    }
  }
  return audio;
}

function translitOf(v) {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t || null;
}

function categoryLabel(batch, id) {
  const row = (batch.categories || []).find((c) => c.id === id);
  if (!row) throw new Error(`unknown phrase category ${id}`);
  return row.label;
}

/** The phrasebook note names who is addressed, not who narrates. */
function noteAddresses(note) {
  return /to a man/i.test(note || '') && /to a woman/i.test(note || '');
}

function fromPhrasebook(ref, entry, batch, index) {
  if (!entry) throw new Error(`phrasebook id not found: ${ref.sourceId}`);
  if (typeof entry.en !== 'string' || !entry.en.trim()) throw new Error(`phrasebook ${ref.sourceId} has no English`);
  if (typeof entry.review !== 'string' || !entry.review.trim()) throw new Error(`phrasebook ${ref.sourceId} has no review status`);
  const notes = typeof entry.notes === 'string' ? entry.notes.trim() : '';
  const addressed = noteAddresses(notes);
  const gendered = !!(entry.gendered && entry.forms?.m?.he && entry.forms?.f?.he);
  const forms = gendered
    ? ['m', 'f'].map((g) => ({
      key: g,
      gender: g,
      speaker: null,
      addressee: addressed ? g : null,
      he: entry.forms[g].he,
      translit: translitOf(entry.forms[g].translit),
      audio: slotsFor(entry.forms[g].he, index, `${ref.sourceId}-${g}`),
    }))
    : [{
      key: 'same',
      gender: null,
      speaker: null,
      addressee: addressed ? 'm' : null,
      he: entry.he,
      translit: translitOf(entry.translit),
      audio: slotsFor(entry.he, index, ref.sourceId),
    }];
  return {
    id: ref.id,
    category: ref.category,
    categoryLabel: categoryLabel(batch, ref.category),
    source: { kind: 'phrasebook', id: ref.sourceId },
    sourceSituation: entry.situation || null,
    en: entry.en.trim(),
    review: entry.review,
    notes,
    forms,
  };
}

function fromParadigm(ref, par, fileStatus, batch, index) {
  if (!par) throw new Error(`gender paradigm not found: ${ref.sourceId}`);
  if (typeof par.en !== 'string' || !par.en.trim()) throw new Error(`paradigm ${ref.sourceId} has no English`);
  if (typeof fileStatus !== 'string' || !fileStatus.trim()) throw new Error('gender-pairs file has no status');
  const forms = genderedForms(par).map((g) => ({
    key: `${g.speaker}${g.addressee}`,
    gender: g.speaker,
    speaker: g.speaker,
    addressee: g.addressee,
    he: g.he,
    translit: translitOf(g.translit),
    audio: slotsFor(g.he, index, `${ref.sourceId}-${g.speaker}${g.addressee}`), // D-07: word/gpar-NN-<speaker><addressee>
  }));
  return {
    id: ref.id,
    category: ref.category,
    categoryLabel: categoryLabel(batch, ref.category),
    source: { kind: 'gender-paradigm', id: ref.sourceId },
    sourceSituation: null,
    en: par.en.trim(),
    review: fileStatus,
    notes: '',
    forms,
  };
}

/** @param {{batch:any, phrasebook:any, genderFile:any, manifest:any[]}} src */
export function buildPhrases({ batch, phrasebook, genderFile, manifest }) {
  if (!batch || batch.schema !== 'alef-phrases/1') throw new Error('phrase batch schema');
  const index = indexManifest(manifest);
  const byPb = new Map((phrasebook?.entries || []).map((e) => [e.id, e]));
  const byPar = new Map((genderFile?.paradigms || []).map((p) => [p.id, p]));
  const seen = new Set();
  return (batch.entries || []).map((ref) => {
    if (!ref || seen.has(ref.id)) throw new Error(`bad or duplicate phrase id ${ref && ref.id}`);
    seen.add(ref.id);
    if (ref.source === 'phrasebook') return fromPhrasebook(ref, byPb.get(ref.sourceId), batch, index);
    if (ref.source === 'gender-paradigm') return fromParadigm(ref, byPar.get(ref.sourceId), genderFile?.status, batch, index);
    throw new Error(`unknown phrase source ${ref.source}`);
  });
}

/** The form a narrator of `voice` would use: speaker/gender match, or the single shared form. */
export function formServes(form, voice) {
  if (form.speaker) return form.speaker === voice;
  if (form.gender) return form.gender === voice;
  return true;
}

/** Clip for the coverage cell (tradition × narrator), or null. */
export function cellClip(phrase, tradition, voice, speed = 'normal') {
  for (const form of phrase.forms) {
    if (!formServes(form, voice)) continue;
    const clip = form.audio?.[tradition]?.[voice]?.[speed];
    if (clip) return clip;
  }
  return null;
}

export function formLabel(form) {
  const who = (g) => (g === 'f' ? 'a woman' : 'a man');
  if (form.speaker && form.addressee) return `Said by ${who(form.speaker)} to ${who(form.addressee)}`;
  if (form.addressee) return `Said to ${who(form.addressee)}`;
  if (form.gender === 'm') return 'Masculine form';
  if (form.gender === 'f') return 'Feminine form';
  return '';
}

/** The feminine spelling named in a phrasebook note, or null. Not a stored form. */
export function womanNoteSpelling(note) {
  const m = /to a woman:\s*([^.]*)/i.exec(note || '');
  if (!m) return null;
  const s = m[1].trim().replace(/[.\s]+$/, '');
  return s || null;
}

function spellingTokens(s) {
  return String(s || '').trim().split(/\s+/).filter(Boolean);
}

/**
 * Learner notices taken from the phrasebook note and the stored forms.
 * They do not add a feminine line, and they do not treat the note as a checked correction.
 */
export function addressNotices(phrase) {
  const note = (phrase?.notes || '').trim();
  if (!note || !/to a man/i.test(note)) return [];
  const spelling = womanNoteSpelling(note);
  const storedF = (phrase.forms || []).find((f) => f.key === 'f');
  if (!storedF) {
    if (!spelling) return [];
    return [{
      id: 'masculine-addressee',
      text: `This stored line addresses a man. The phrasebook note says: "${note}" No complete pointed feminine line is stored, so that note is not a form to practice. Choosing a man or a woman as narrator does not change who is addressed. A native speaker has not checked this phrase.`,
    }];
  }
  if (!spelling) return [];
  const stored = spellingTokens(storedF.translit);
  const named = spellingTokens(spelling);
  const matches = named.length > 0 && named.every((t) => stored.includes(t));
  if (matches) return [];
  return [{
    id: 'spelling-inconsistency',
    text: `The phrasebook note and the stored feminine spelling do not match. Note: "${note}" Stored feminine spelling: "${storedF.translit || ''}". The note is not a verified correction. The line shown is the stored form. A native speaker has not checked this phrase.`,
  }];
}

/** Learner-facing line. Uses the shared status label for Israeli tts. Never calls a clip reviewed unless its status already says so. */
export function audioHonesty(clip) {
  if (!clip) return 'No audio yet';
  const speed = clip.speed === 'slow' ? 'Slow' : 'Normal';
  const who = VOICE_LABEL[clip.voice] || clip.voice;
  const trad = TRAD_LABEL[clip.tradition] || clip.tradition;
  let kind;
  if (clip.status === 'recorded') kind = statusLabel('recorded');
  else if (clip.status === 'tts' && clip.tradition === 'israeli') kind = statusLabel('tts');
  else if (clip.status === 'tts') kind = 'Israeli voice.';
  else if (clip.status === 'synthetic-unreviewed' || clip.status === 'synthetic-reviewed') kind = statusLabel(clip.status, clip.tradition, clip.source);
  else kind = 'No audio yet';
  const reviewed = clip.status === 'recorded' || clip.status === 'synthetic-reviewed' ? '' : ' Not reviewed.';
  return `${speed} clip: ${kind} Voice: ${who}. Style: ${trad}.${reviewed}`;
}

export function contentHonesty(review) {
  if (review === 'recorded' || review === 'synthetic-reviewed' || review === 'human-reviewed' || review === 'native-reviewed') {
    return 'Marked reviewed in the source file.';
  }
  return 'A native speaker has not checked this phrase.';
}

/** The call the shared contract expects: ctx.audio.play(kind, id, { voice, tradition, rate }). */
export function playbackCall(request) {
  if (!request || !request.kind || !request.id) return null;
  if (!VOICES.includes(request.voice) || !TRADITIONS.includes(request.tradition)) return null;
  const rate = request.rate === 'slow' ? 'slow' : 'normal';
  return { kind: request.kind, id: request.id, options: { voice: request.voice, tradition: request.tradition, rate } };
}

function sameSlot(result, options) {
  if (!result || result.source !== 'file' || result.fileError) return false;
  if (result.via && result.via !== 'exact') return false;
  if (result.viaId) return false;
  if (result.voice && result.voice !== options.voice) return false;
  const tradition = result.fileTradition || result.tradition;
  if (tradition && tradition !== options.tradition) return false;
  if (result.rate && result.rate !== options.rate && result.rate !== (options.rate === 'slow' ? 0.7 : 1)) return false;
  return true;
}

/**
 * Thin adapter for the playback contract (landed: PLAYBACK_CONTRACT_LANDED).
 * A result that is not the exact requested file — a device voice, another
 * tradition, or another voice — comes back as unavailable here; the view
 * may still OFFER those as their own honestly labelled buttons, playing
 * each slot's own catalogue row, never passing one off as another.
 */
export async function playPhraseClip(ctx, request, { contractLanded = PLAYBACK_CONTRACT_LANDED } = {}) {
  const call = playbackCall(request);
  if (!call) return { source: 'none', reason: 'no-exact-clip', unavailable: true, call: null };
  if (!contractLanded) return { source: 'none', reason: 'playback-contract-not-landed', unavailable: true, call };
  if (typeof ctx?.audio?.play !== 'function') return { source: 'none', reason: 'no-player', unavailable: true, call };
  const result = await ctx.audio.play(call.kind, call.id, call.options);
  if (!sameSlot(result, call.options)) return { source: 'none', reason: 'not-exact', unavailable: true, call, result };
  return { ...result, call };
}

export function auditPhrase(phrase) {
  const errors = [];
  if (!phrase.en || !String(phrase.en).trim()) errors.push(`${phrase.id}: English missing`);
  if (!phrase.review || !String(phrase.review).trim()) errors.push(`${phrase.id}: review missing`);
  if (/human-reviewed|native-reviewed|synthetic-reviewed/.test(phrase.review)) errors.push(`${phrase.id}: review upgraded (${phrase.review})`);
  if (!phrase.forms?.length) errors.push(`${phrase.id}: no forms`);
  for (const form of phrase.forms || []) {
    if (!hasPointedHebrew(form.he)) errors.push(`${phrase.id}: pointed Hebrew missing`);
    if (form.translit != null && !String(form.translit).trim()) errors.push(`${phrase.id}: empty transliteration`);
    if (form.gender != null && !VOICES.includes(form.gender)) errors.push(`${phrase.id}: bad gender ${form.gender}`);
    if (form.speaker != null && !VOICES.includes(form.speaker)) errors.push(`${phrase.id}: bad speaker`);
    if (form.addressee != null && !VOICES.includes(form.addressee)) errors.push(`${phrase.id}: bad addressee`);
    for (const tradition of TRADITIONS) {
      if (!form.audio?.[tradition]) errors.push(`${phrase.id}: missing tradition ${tradition}`);
      for (const voice of VOICES) {
        const slot = form.audio?.[tradition]?.[voice];
        if (!slot || !('normal' in slot) || !('slow' in slot)) { errors.push(`${phrase.id}: missing slot ${tradition}/${voice}`); continue; }
        for (const speed of SPEEDS) {
          const clip = slot[speed];
          if (!clip) continue;
          if (clip.tradition !== tradition) errors.push(`${phrase.id}: tradition cross ${clip.path}`);
          if (clip.voice !== voice) errors.push(`${phrase.id}: gender cross ${clip.path}`);
          const slowName = clipSpeed({ id: clip.id, path: clip.path }) === 'slow';
          if (clip.speed !== speed || (speed === 'slow') !== slowName) errors.push(`${phrase.id}: speed cross ${clip.path}`);
          if (nfc(clip.text) !== nfc(form.he)) errors.push(`${phrase.id}: text cross ${clip.path}`);
          if (!hasPointedHebrew(clip.text)) errors.push(`${phrase.id}: clip is not pointed Hebrew ${clip.path}`);
          if (clip.equivalentTo) errors.push(`${phrase.id}: equivalent fallback ${clip.path}`);
          if (!clip.path || !clip.kind || !clip.id) errors.push(`${phrase.id}: incomplete clip`);
        }
      }
    }
  }
  return errors;
}

const VOICE_HEAD = { m: 'Man', f: 'Woman' };

/** Markdown coverage table. Denominator is the phrase count. A cell counts a phrase when the form for that gender has an exact clip in that tradition and voice. */
export function coverageMarkdown(phrases) {
  const n = phrases.length;
  const lines = [];
  lines.push('# Phrase batch 1 audio coverage');
  lines.push('');
  lines.push('Denominator: **' + n + '** phrases in this batch. This is a first set from records already in Aleph. It is not every Hebrew phrase.');
  lines.push('');
  lines.push('A numerator counts a phrase when the grammatical form for that gender (or the one shared form) has a catalogue row with that form’s own id, the same pointed text, that tradition, and that narrator voice. A different id, even with the same spelling, is not counted. A separate slow recording is not counted as the normal clip.');
  lines.push('');
  lines.push('| Tradition | Narrator | Normal clip | Slow clip | No normal clip |');
  lines.push('| --- | --- | ---: | ---: | ---: |');
  for (const tradition of TRADITIONS) {
    for (const voice of VOICES) {
      let normal = 0;
      let slow = 0;
      for (const phrase of phrases) {
        if (cellClip(phrase, tradition, voice, 'normal')) normal += 1;
        if (cellClip(phrase, tradition, voice, 'slow')) slow += 1;
      }
      lines.push(`| ${TRAD_LABEL[tradition]} | ${VOICE_HEAD[voice]} | ${normal} | ${slow} | ${n - normal} |`);
    }
  }
  const none = phrases.filter((p) => !TRADITIONS.some((t) => VOICES.some((v) => cellClip(p, t, v, 'normal'))));
  lines.push('');
  lines.push(`Phrases with no exact normal clip in any tradition or voice: **${none.length}** of ${n}.`);
  if (none.length) lines.push(none.map((p) => `- ${p.id}: ${p.en} (${p.review})`).join('\n'));
  lines.push('');
  lines.push('Separate slow files: **0**. That count is files only. It is not a claim that a shared 0.7× control could not play a normal file more slowly. This page plays a listed normal clip when you tap Listen; it never plays the normal file more slowly in place of a slow recording. A normal file is not entered in the slow column.');
  lines.push('');
  lines.push('Review status is copied from the source (`native-speaker-needed: …` on phrasebook lines, `draft-needs-native-review` on the role-play line). No line is marked human-reviewed or native-reviewed. Israeli clips that match are synthetic text-to-speech files (catalogue status `tts`). They are not native human recordings.');
  lines.push('');
  lines.push('Playback: this page plays through the shared player (src/audio/player.js), asking for the exact catalogue row of the chosen style and voice; a result that is not that exact file is refused, and nothing else is played in its place. Where the chosen style and voice have no row, the page offers another slot\'s own row as its own button, labelled with its real voice and style. Where no row exists at all, it offers the device voice, labelled as a device voice (Israeli-style only).');
  lines.push('');
  lines.push('D-07 (audit): the gender pairs, the six role-play paradigms and the seven Israel dialogues have Israeli clips in both voices (synthetic, not reviewed by a native speaker). This batch does not copy those screens. The role-play line "Can I help you?" plays its own clip for each of the four speaker and addressee pairs. Dialogue lines stay on the dialogues page.');
  lines.push('');
  return lines.join('\n');
}

async function loadManifestFile(rel) {
  try { return await loadJSON(rel); } catch { return null; }
}

/** Core catalogue plus the kind-word shard and the per-tradition word shards. A shard that fails to load is skipped, which can only hide a clip (shown as "No audio yet"), never substitute one. */
export async function loadAudioManifest() {
  const core = await loadJSON('data/audio/manifest.json');
  const words = await loadManifestFile('data/audio/manifest-kind-word.json');
  const parts = [core, ...(Array.isArray(words) ? [words] : [])];
  for (const t of TRADITIONS) {
    const shard = await loadManifestFile(`data/audio/manifest-words-${t}.json`);
    if (Array.isArray(shard)) parts.push(shard);
  }
  return parts.flat();
}

export async function loadPhraseScreen() {
  const [batch, phrasebook, genderFile, manifest] = await Promise.all([
    loadJSON('data/phrases/batch1.json'),
    loadJSON('data/corpus/phrasebook.json'),
    loadJSON('data/curriculum/gender-pairs.json'),
    loadAudioManifest(),
  ]);
  return { batch, phrases: buildPhrases({ batch, phrasebook, genderFile, manifest }) };
}
