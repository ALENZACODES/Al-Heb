// Which production clip a vocabulary card may play.
// The shared player is not modified and is not copied from another branch.
// Playback calls are ctx.audio.play(kind, id, { voice, tradition, rate }) with the
// manifest id for this pointed word, the learner's voice, and the learner's tradition.
// rate is 'normal' or 'slow'. The shared player maps slow to 0.7× and the sound bar
// says "Playing" only after a playing event. That behavior is the unmerged contract
// in PR #20, commit 8f37d4ba, file docs/audio/PLAYBACK-CONTRACT.md, on
// the games-enrich-2026-11-06 branch. This screen does not set playbackRate itself.
import { fileLabel, traditionCaption } from '../shell/audio-labels.js';
import { playbackTradition, isAccentClip, isPlayableOwnClip } from '../audio/player.js';
import { t } from '../shell/i18n.js';

export const VOICES = Object.freeze(['m', 'f']);
export const TRADITIONS = Object.freeze(['israeli', 'sephardi', 'ashkenazi']);
/** Values this screen passes as options.rate. */
export const CLIP_RATES = Object.freeze(['normal', 'slow']);
/**
 * The player contract (commit 8f37d4ba, docs/audio/PLAYBACK-CONTRACT.md; dropped by the Nov 6 branch
 * consolidation and restored on main 2026-11-07) maps slow to 0.7× and says "Playing" only after a
 * playing event. The player in this tree reads options.rate and settings.clipRate.
 */
export const PLAYBACK_DEPENDENCY = Object.freeze({
  contractCommit: '8f37d4ba',
  contractFile: 'docs/audio/PLAYBACK-CONTRACT.md',
  branch: 'main',
  slowMeans: 0.7,
  appliedByThisTree: true,
});
export const SPEED_BUTTONS = Object.freeze([['normal', 'Normal'], ['slow', 'Slow']]);

const VOICE_KEY = { m: 'settings.voice.m', f: 'settings.voice.f' };
const TRAD_NAME = { israeli: 'Israeli', sephardi: 'Sephardi', ashkenazi: 'Ashkenazi' };

/** Pointed text used as the clip key. Vowel points stay. Cantillation and verse marks do not. */
export function clipKey(s) {
  return String(s ?? '').normalize('NFC').replace(/[\u0591-\u05AF\u05BD\u05C0\u05C3]/g, '').replace(/\s+/g, ' ').trim();
}

function clipRank(e) {
  return (e.kind === 'word' ? 0 : e.kind === 'line' ? 1 : 2);
}

/**
 * One clip per pointed text, voice and tradition.
 * Anchor mnemonic ids are skipped. A missing status or a missing file is skipped.
 * When several lesson clips share the text, the word clip with the lowest id wins.
 * @param {Array<any>} rows manifest rows
 * @param {(path:string)=>boolean} [fileExists]
 */
export function buildClipLookup(rows, fileExists = () => true) {
  /** @type {Map<string, Map<string, any>>} */
  const byText = new Map();
  for (const e of rows || []) {
    if (e.kind !== 'word' && e.kind !== 'line') continue;
    if (!VOICES.includes(e.voice) || !TRADITIONS.includes(e.tradition)) continue;
    if (!e.path || e.status === 'missing') continue;
    if (String(e.id).startsWith('anchor-')) continue;
    if (!fileExists(e.path)) continue;
    const text = clipKey(e.text);
    if (!text) continue;
    const slot = `${e.voice}|${e.tradition}`;
    if (!byText.has(text)) byText.set(text, new Map());
    const cur = byText.get(text).get(slot);
    const next = { id: e.id, kind: e.kind, path: e.path, status: e.status, source: e.source || '', voice: e.voice, tradition: e.tradition };
    if (!cur || clipRank(next) < clipRank(cur) || (clipRank(next) === clipRank(cur) && next.id < cur.id)) byText.get(text).set(slot, next);
  }
  const clips = {};
  for (const text of [...byText.keys()].sort()) {
    clips[text] = {};
    for (const slot of [...byText.get(text).keys()].sort()) clips[text][slot] = byText.get(text).get(slot);
  }
  return {
    schema: 'alef-vocab-clip-lookup/1',
    rule: 'Same pointed text, same voice, file present, status not missing. The slot is the tradition whose file the setting plays (src/audio/player.js): the setting\'s own slot when that file is present (including the existing paid-cloud bank clips), otherwise the Israeli slot; the clip is captioned with its real tradition. Anchor ids skipped. Lowest word id wins.',
    clips,
  };
}

/** @param {{clips:Record<string,Record<string,any>>}|null} lookup @param {string} text @param {string} voice @param {string} tradition */
export function lookupClip(lookup, text, voice, tradition) {
  if (!lookup || !VOICES.includes(voice) || !TRADITIONS.includes(tradition)) return null;
  const row = lookup.clips?.[clipKey(text)];
  const own = row?.[`${voice}|${tradition}`] || null;
  const clip = row?.[`${voice}|${playbackTradition(tradition, own)}`] || null;
  // `setting` is the learner's tradition; `tradition` stays the FILE's. The caption names both when they differ.
  return clip ? { ...clip, setting: tradition } : null;
}

/**
 * The dictionary ladder (usability review U-02 / journey J13): when the
 * learner's own voice/tradition slot is empty, another slot's clip for the
 * same text — same tradition in the other voice first, then Israeli (the
 * library's home tradition), then the remaining traditions. The clip is
 * always labelled with its REAL voice and tradition by the caller; nothing
 * here substitutes one tradition for another silently.
 */
export function alternateClip(lookup, text, voice, tradition) {
  if (!lookup || !VOICES.includes(voice) || !TRADITIONS.includes(tradition)) return null;
  const row = lookup.clips?.[clipKey(text)];
  if (!row) return null;
  const other = voice === 'm' ? 'f' : 'm';
  const played = playbackTradition(tradition, row[`${voice}|${tradition}`]);
  // Slots whose files a setting plays: the other voice's own present clip of this setting first, then Israeli, then another
  // tradition's present clips.
  const live = (slot) => row[slot] && (slot.endsWith('|israeli') || isPlayableOwnClip(row[slot]) || isAccentClip(row[slot]));
  const order = [`${other}|${tradition}`, `${voice}|israeli`, `${other}|israeli`,
    ...TRADITIONS.filter((t) => t !== tradition && t !== 'israeli').flatMap((t) => [`${voice}|${t}`, `${other}|${t}`])]
    .filter((slot) => slot !== `${voice}|${played}` && live(slot));
  for (const slot of order) if (row[slot]) return { ...row[slot], setting: tradition };
  return null;
}

export function voiceLabel(voice) {
  return VOICE_KEY[voice] ? t(VOICE_KEY[voice]) : '';
}
export function traditionLabel(tradition) {
  return TRAD_NAME[tradition] || '';
}

/**
 * Honest line for a file we are willing to play.
 * Status "tts" in the shared label table always says "Israeli only". That sentence
 * is used for Israeli files. A Sephardi or Ashkenazi file does not reuse it.
 */
export function clipCaption(clip) {
  if (!clip) return '';
  const trad = clip.setting && clip.setting !== clip.tradition ? traditionCaption(clip.setting, clip.tradition) : traditionLabel(clip.tradition);
  const who = [trad, voiceLabel(clip.voice)].filter(Boolean).join(', ');
  if (clip.status === 'tts' && clip.tradition !== 'israeli') {
    return `${who}.`;
  }
  const shared = fileLabel(clip.status, clip.tradition, clip.source);
  return who ? `${shared} (${who}).` : shared;
}

export function unavailableLine(voice, tradition) {
  const who = [voiceLabel(voice), traditionLabel(tradition)].filter(Boolean).join(', ');
  if (!who) return 'No clip for this voice and tradition.';
  return `No clip for ${who}.`;
}

/**
 * The player's plan may be used only when it is the file for this voice and tradition.
 * An equivalent tradition, a linked other tradition, or a device voice is refused.
 * @param {any} plan audio.status() result
 * @param {{voice:string,tradition:string,id:string}} want
 */
export function planIsExactFile(plan, want) {
  if (!plan || plan.source !== 'file') return false;
  if (plan.via === 'equivalent') return false;
  if (plan.fileTradition && plan.fileTradition !== want.tradition) return false;
  if (plan.voice && plan.voice !== want.voice) return false;
  if (plan.tradition && plan.tradition !== want.tradition) return false;
  if (want.id && plan.id && plan.id !== want.id && plan.viaId && plan.viaId !== want.id) return false;
  if (!plan.url && !plan.path) return false;
  return true;
}

export const CHECKING = 'checking audio...';
