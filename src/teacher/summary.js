// @ts-check
// Aleph teacher share (DRAFT): build, encode, parse and validate a small learner progress summary.
// Pure: no DOM, no fetch, no clock (callers pass `now`). Weak-spot logic is src/progress/model.js weakSpots, not duplicated.
import { readSnapshot, knowledge, weakSpots, dayKey } from '../progress/model.js';
import { currentWeekIndex } from '../classtrack/model.js';

export const SCHEMA = 'alef-progress-share/1';
export const CODE_PREFIX = 'ALEF-SHARE-1.';
export const MAX_SUMMARY_BYTES = 8 * 1024;      // one summary
export const MAX_TOTAL_BYTES = 256 * 1024;      // everything a teacher pastes or loads at once
export const MAX_LEARNERS = 60;
export const MAX_NAME = 60;
export const DRAFT_NOTE = 'Draft: not reviewed by an educator. Counts come from this device only and are a rough guide, not a grade.';

const ID = /^[a-z0-9][a-z0-9:_|-]{0,47}$/;
const LESSON = /^[a-z]{1,3}\d{1,3}$/;
const KINDS = ['pair', 'letter', 'vowel', 'practice', 'words'];
const HTMLISH = /<\s*[a-z!/?]|&lt;|&#x?\d+;|javascript:/i;

/** Remove anything that could look like markup from a typed name/note. */
export function cleanText(v, max = MAX_NAME) {
  return String(v ?? '').replace(/[<>&"'`\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

/**
 * Build a summary from a store (sync get) and the loaded data.
 * @param {{get:Function}} store
 * @param {{lessons:Array<{id:string,track:string}>, weeks:Array<{lessons:string[]}>}} d
 * @param {{now?:number, name?:string, timed?:Array<{id:string,wpm:number,words:number}>, max?:number}} [o]
 */
export function buildSummary(store, d, o = {}) {
  const s = readSnapshot(store), now = o.now ?? Date.now();
  const k = knowledge(s, d.lessons);
  const cur = currentWeekIndex(d.weeks, s.completed);
  const weak = weakSpots(s, { max: o.max ?? 12 }).map((r) => (r.kind === 'practice' ? { kind: r.kind, ids: r.ids.slice(0, 2), n: Math.round(r.score), src: r.key.slice(5) } : { kind: r.kind, ids: r.ids.slice(0, 2), n: Math.round(r.score) }));
  const out = {
    schema: SCHEMA, date: dayKey(now),
    lessons: Object.keys(s.completed).filter((i) => LESSON.test(i)).sort(),
    letters: [...k.letters].sort(), signs: [...k.signs].sort(),
    week: cur === -1 ? d.weeks.length : cur + 1, weekDone: cur === -1,
    weak,
  };
  const name = cleanText(o.name); if (name) out.name = name;
  const timed = (o.timed || []).filter((t) => t && ID.test(String(t.id)) && t.wpm > 0 && t.words > 0).slice(0, 10).map((t) => ({ id: t.id, wpm: Math.round(t.wpm), words: Math.round(t.words) }));
  if (timed.length) out.timed = timed;
  return out;
}

const b64 = (str) => { const b = new TextEncoder().encode(str); let t = ''; for (const x of b) t += String.fromCharCode(x); return btoa(t).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64 = (c) => { const t = atob(c.replace(/-/g, '+').replace(/_/g, '/')); return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(t, (ch) => ch.charCodeAt(0))); };

/** Compact copyable code. */
export function toCode(summary) { return CODE_PREFIX + b64(JSON.stringify(summary)); }
/** Readable JSON for the file download. */
export function toJson(summary) { return JSON.stringify(summary, null, 1) + '\n'; }

/** Plain-language description of what the export contains (shown before the learner shares). */
export function describe(summary) {
  const bits = [`${summary.lessons.length} completed lesson id${summary.lessons.length === 1 ? '' : 's'}`, `${summary.letters.length} letters and ${summary.signs.length} vowel signs you practised`,
    `${summary.weak.length} weak spot${summary.weak.length === 1 ? '' : 's'} (letter pairs and signs you miss)`, `your class-track week (${summary.week})`, `today's date (${summary.date})`];
  if (summary.timed) bits.push(`${summary.timed.length} timed read result${summary.timed.length === 1 ? '' : 's'}`);
  bits.push(summary.name ? `the name you typed: ${summary.name}` : 'no name or email');
  return bits;
}

const isInt = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
const idList = (a, max, re = ID) => Array.isArray(a) && a.length <= max && a.every((x) => typeof x === 'string' && re.test(x));

/**
 * Parse and validate one pasted/loaded summary (code or JSON). Never throws.
 * Rejects: oversize, HTML-looking text, wrong schema, bad types, unknown fields.
 * @returns {{ok:true, summary:any}|{ok:false, error:string}}
 */
export function parseSummary(text) {
  if (typeof text !== 'string') return { ok: false, error: 'Not text.' };
  let t = text.trim();
  if (!t) return { ok: false, error: 'Empty.' };
  if (t.length > MAX_SUMMARY_BYTES * 2) return { ok: false, error: 'Too large to be a progress summary.' };
  if (HTMLISH.test(t)) return { ok: false, error: 'Looks like HTML, not an ALEF summary. Rejected.' };
  let json = t;
  if (t.startsWith(CODE_PREFIX)) {
    const body = t.slice(CODE_PREFIX.length).replace(/\s+/g, '');
    if (!/^[A-Za-z0-9_-]+$/.test(body)) return { ok: false, error: 'Code has characters that do not belong.' };
    try { json = unb64(body); } catch { return { ok: false, error: 'Code could not be decoded.' }; }
    if (HTMLISH.test(json)) return { ok: false, error: 'Looks like HTML, not an ALEF summary. Rejected.' };
  }
  if (json.length > MAX_SUMMARY_BYTES) return { ok: false, error: 'Too large to be a progress summary.' };
  let v;
  try { v = JSON.parse(json); } catch { return { ok: false, error: 'Not valid JSON or an ALEF code.' }; }
  return validateSummary(v);
}

/** @returns {{ok:true, summary:any}|{ok:false, error:string}} */
export function validateSummary(v) {
  const bad = (error) => ({ ok: false, error });
  if (!v || typeof v !== 'object' || Array.isArray(v)) return bad('Not a summary object.');
  if (v.schema !== SCHEMA) return bad(`Unsupported version (expected ${SCHEMA}).`);
  const allowed = new Set(['schema', 'date', 'name', 'lessons', 'letters', 'signs', 'week', 'weekDone', 'weak', 'timed']);
  for (const k of Object.keys(v)) if (!allowed.has(k)) return bad(`Unknown field "${cleanText(k, 20)}".`);
  if (typeof v.date !== 'string' || !/^\d{4}-\d\d-\d\d$/.test(v.date)) return bad('Bad date.');
  if (!idList(v.lessons, 200, LESSON)) return bad('Bad lessons list.');
  if (!idList(v.letters, 40) || !idList(v.signs, 40)) return bad('Bad letters or signs list.');
  if (!isInt(v.week, 1, 10) || typeof v.weekDone !== 'boolean') return bad('Bad class-track week.');
  if (!Array.isArray(v.weak) || v.weak.length > 20) return bad('Bad weak-spot list.');
  const weak = [];
  for (const w of v.weak) {
    if (!w || typeof w !== 'object' || !KINDS.includes(w.kind) || !idList(w.ids, 2) || !isInt(w.n, 0, 100000) || (w.src !== undefined && (typeof w.src !== 'string' || !ID.test(w.src)))) return bad('Bad weak-spot entry.');
    weak.push(w.src ? { kind: w.kind, ids: [...w.ids], n: w.n, src: w.src } : { kind: w.kind, ids: [...w.ids], n: w.n });
  }
  let timed;
  if (v.timed !== undefined) {
    if (!Array.isArray(v.timed) || v.timed.length > 10 || !v.timed.every((t) => t && typeof t.id === 'string' && ID.test(t.id) && isInt(t.wpm, 1, 400) && isInt(t.words, 1, 5000))) return bad('Bad timed-read list.');
    timed = v.timed.map((t) => ({ id: t.id, wpm: t.wpm, words: t.words }));
  }
  if (v.name !== undefined && (typeof v.name !== 'string' || v.name.length > MAX_NAME || cleanText(v.name) !== v.name)) return bad('Bad name.');
  const summary = { schema: SCHEMA, date: v.date, lessons: [...v.lessons], letters: [...v.letters], signs: [...v.signs], week: v.week, weekDone: v.weekDone, weak };
  if (v.name) summary.name = v.name;
  if (timed) summary.timed = timed;
  return { ok: true, summary };
}

/**
 * Split pasted text or loaded file texts into summaries. Codes are one per line; a JSON file is one summary
 * (or an array of them). Enforces total size and learner limits.
 * @param {string[]} texts @returns {{summaries:any[], errors:string[]}}
 */
export function parseMany(texts) {
  const errors = [], summaries = [];
  let total = 0;
  const take = (chunk, label) => {
    if (summaries.length >= MAX_LEARNERS) { if (!errors.includes(`Only the first ${MAX_LEARNERS} learners are used.`)) errors.push(`Only the first ${MAX_LEARNERS} learners are used.`); return; }
    const r = parseSummary(chunk);
    if (r.ok) summaries.push(r.summary); else errors.push(`${label}: ${r.error}`);
  };
  texts.forEach((txt, ti) => {
    const s = String(txt ?? '');
    total += s.length;
    if (total > MAX_TOTAL_BYTES) { if (!errors.some((e) => /Too much/.test(e))) errors.push('Too much text at once (limit 256 KB). The rest was ignored.'); return; }
    const t = s.trim(); if (!t) return;
    if (t.startsWith('[')) {
      if (HTMLISH.test(t)) { errors.push(`Item ${ti + 1}: Looks like HTML. Rejected.`); return; }
      let arr; try { arr = JSON.parse(t); } catch { errors.push(`Item ${ti + 1}: Not valid JSON.`); return; }
      if (!Array.isArray(arr)) { errors.push(`Item ${ti + 1}: Not a list.`); return; }
      arr.slice(0, MAX_LEARNERS).forEach((x, i) => { const r = validateSummary(x); if (r.ok) summaries.push(r.summary); else errors.push(`Item ${ti + 1}.${i + 1}: ${r.error}`); });
    } else if (t.startsWith('{')) take(t, `Item ${ti + 1}`);
    else t.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).forEach((l, i) => take(l, `Line ${i + 1}`));
  });
  return { summaries: summaries.slice(0, MAX_LEARNERS), errors };
}
