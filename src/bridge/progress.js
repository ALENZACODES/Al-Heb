// Reading ladder progression (#/bridge): which stage the learner is on, what opens the next one, and the record that shows it.
// Pure logic: no DOM, no network. Built on the per-text levels the bridge already keeps (store key bridge.v1, src/bridge/model.js).
//
// The rule, in one line: read five different texts at a stage without help and the next stage opens.
//   - "Without help" is the bridge's own rule: nothing revealed, and "I read it all" chosen, at the text's saved stage.
//   - A text counts for a stage once its own level has moved past that stage (or, at the last stage, once it is done).
//   - Nothing is ever taken back: a stage that was passed stays passed, with the day it happened, even if a text later slips a stage.
//   - A text whose own level is already at a stage can always be read there, whatever the learner's overall stage.
// Stages 0 to 3 are Fade-out recall (src/curriculum/fade.js). They are shown with their own counts and hold nothing back here.
// Everything is self-graded: the app does not hear the learner. The copy says so wherever a count is shown.
import { BRIDGE_STAGES, FIRST_BRIDGE, LAST_BRIDGE, stageOf } from './model.js';

/** Different texts to read without help at a stage before the next stage opens. */
export const READS_TO_PASS = 5;
export const SELF_GRADED = 'These counts are your own marks: the app does not hear you read.';

const texts = (state) => Object.entries(state?.texts && typeof state.texts === 'object' ? state.texts : {});
/** Ids of the texts that have been read without help at `level` (their own level has moved past it, or they are done). */
export function textsPast(state, level) {
  return texts(state).filter(([, t]) => t && (t.done === true || (Number.isInteger(t.level) && t.level > level))).map(([id]) => id).sort();
}
const stamp = (state, level) => { const v = state?.stages?.[level]; return Number.isFinite(v) && v > 0 ? v : 0; };

/**
 * The learner's place on the three reading stages.
 * @returns {{current:number, complete:boolean, completeAt:number,
 *   stages:{level:number, name:string, help:string, reads:number, need:number, passed:boolean, passedAt:number, open:boolean, texts:string[]}[]}}
 *   current: the stage being worked on (the last stage once all are passed).
 */
export function ladderProgress(state) {
  const stages = [];
  let open = true;
  for (const s of BRIDGE_STAGES) {
    const ids = textsPast(state, s.level);
    const passed = stamp(state, s.level) > 0 || ids.length >= READS_TO_PASS;
    stages.push({ level: s.level, name: s.name, help: s.help, reads: Math.min(ids.length, READS_TO_PASS), need: READS_TO_PASS, passed, passedAt: stamp(state, s.level), open, texts: ids });
    open = open && passed;
  }
  const firstOpen = stages.find((s) => !s.passed);
  const complete = !firstOpen;
  return { current: firstOpen ? firstOpen.level : LAST_BRIDGE, complete, completeAt: complete ? stamp(state, LAST_BRIDGE) : 0, stages };
}

/**
 * Writes down the day a stage was first passed. Call after every saved read.
 * @returns {{state:any, opened:number[]}} opened: the stages passed by this very read (so the screen can say so once)
 */
export function stampStages(state, now = 0) {
  const stages = { ...(state?.stages && typeof state.stages === 'object' ? state.stages : {}) };
  const opened = [];
  let chain = true;
  for (const s of BRIDGE_STAGES) {
    const had = Number.isFinite(stages[s.level]) && stages[s.level] > 0;
    const met = textsPast(state, s.level).length >= READS_TO_PASS;
    // a stage is only stamped once every stage before it has been passed: the ladder is climbed in order
    if (!had && met && chain) { stages[s.level] = Math.max(1, Math.floor(now)); opened.push(s.level); }
    chain = chain && (had || (met && opened.includes(s.level)));
  }
  return { state: opened.length ? { ...state, stages } : state, opened };
}

/** May this text be read at `level`? The overall stage decides, and a text's own saved level is never locked. */
export function stageOpen(state, level, textId) {
  if (level <= FIRST_BRIDGE) return true;
  const own = state?.texts?.[textId];
  if (own && Number.isInteger(own.level) && own.level >= level) return true;
  return ladderProgress(state).stages.find((s) => s.level === level)?.open === true;
}

/** Why a stage is closed, in plain words ('' when it is open). */
export function lockedReason(state, level, textId) {
  if (stageOpen(state, level, textId)) return '';
  const before = ladderProgress(state).stages.find((s) => !s.passed && s.level < level);
  const b = before || { level: level - 1, reads: 0, need: READS_TO_PASS };
  const left = b.need - b.reads;
  return `Opens after ${left} more text${left === 1 ? '' : 's'} read without help at stage ${b.level}, ${stageOf(b.level).name}.`;
}

/** One short line for any reading screen. */
export function chipText(state) {
  const p = ladderProgress(state);
  if (p.complete) return 'Reading ladder: all three reading stages done. You read without vowel marks and without transliteration.';
  const s = p.stages.find((x) => x.level === p.current);
  return `Reading ladder: stage ${s.level} of ${LAST_BRIDGE}, ${s.name}. ${s.reads} of ${s.need} texts read without help.`;
}

const day = (ms) => { try { return new Date(ms).toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' }); } catch { return ''; } };

/**
 * The record of what was done: one entry per passed stage, with the day and the texts that count.
 * @param {any} state @param {(id:string)=>string} [nameOf] a title for a text id
 */
export function proof(state, nameOf = (id) => id) {
  return ladderProgress(state).stages.filter((s) => s.passed).map((s) => ({
    level: s.level, name: s.name, on: s.passedAt ? day(s.passedAt) : '',
    line: `Stage ${s.level}, ${s.name}: ${s.texts.length} text${s.texts.length === 1 ? '' : 's'} read without help${s.passedAt ? `. Passed on ${day(s.passedAt)}` : ''}.`,
    texts: s.texts.map(nameOf),
  }));
}

/** Fade-out recall stages 0 to 3: how many lines have reached each (from the review cards). Shown for the whole picture; they gate nothing. */
export function recallCounts(cards) {
  const out = [0, 0, 0, 0];
  for (const [key, c] of Object.entries(cards && typeof cards === 'object' ? cards : {})) {
    if (!key.startsWith('line:') || !c || !Number.isInteger(c.fadeLevel)) continue;
    for (let l = 0; l <= Math.min(3, c.fadeLevel); l++) out[l]++;
  }
  return out;
}
