// @ts-check
// The learner's own certificate of lessons completed (lane 4, 12 Nov; points plan #3, audit C-06). Pure: no DOM.
//
// What it certifies, exactly: the lessons this device marked complete under Aleph's pass rule (at least 70% of the lesson's
// quick check right on the first try, src/curriculum/passmark.js), with the first-try score of the passing check and the
// dates, all read from the learner's own records ("curriculum.progress" and "lesson.checks.v1").
// What it cannot prove: there is no server and no signature, so nothing shows the record was not edited. The checking link
// carries the record itself; the page that opens it recomputes every pass from the numbers with this copy's pass rule.
import { passed, passMark, PASS_SHARE } from '../curriculum/passmark.js';
import { pack, unpack } from './transfer.js';

export const RECORD_KIND = 'alef-lesson-record';
export const RECORD_V = 1;
export const MAX_NAME = 80;
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const int = (v) => (Number.isInteger(v) && v >= 0 ? v : null);
const time = (v) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.round(v) : null);
export const cleanName = (s) => String(s ?? '').replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);

/**
 * Build the record from this device's stored values.
 * @param {{progress?:any, checks?:any, name?:string, now?:number}} src
 * @returns {{kind:string, v:number, name:string, issuedAt:number, share:number, lessons:Array<[string, number|null, number|null, number|null, number|null]>}}
 *   lessons rows: [lessonId, completedAt, right, of, passAt] (right/of/passAt null when no score was kept)
 */
export function buildRecord({ progress, checks, name = '', now = Date.now() } = {}) {
  const done = isObj(progress) && isObj(progress.completed) ? progress.completed : {};
  const ch = isObj(checks) ? checks : {};
  const rows = [];
  for (const [id, at] of Object.entries(done)) {
    if (!at) continue;
    const p = isObj(ch[id]) && isObj(ch[id].pass) ? ch[id].pass : null;
    const ok = p && int(p.right) != null && int(p.of) != null && int(p.of) > 0;
    rows.push([id, time(at), ok ? p.right : null, ok ? p.of : null, ok ? time(p.at) : null]);
  }
  rows.sort((a, b) => (a[1] ?? 0) - (b[1] ?? 0) || String(a[0]).localeCompare(String(b[0])));
  return { kind: RECORD_KIND, v: RECORD_V, name: cleanName(name), issuedAt: Math.round(now), share: PASS_SHARE, lessons: rows };
}

/** Read a record from untrusted input (a link). Returns null when it is not one. */
export function readRecord(raw) {
  if (!isObj(raw) || raw.kind !== RECORD_KIND || raw.v !== RECORD_V || !Array.isArray(raw.lessons)) return null;
  const lessons = [];
  for (const r of raw.lessons.slice(0, 2000)) {
    if (!Array.isArray(r) || typeof r[0] !== 'string' || !/^[A-Za-z0-9_.:-]{1,40}$/.test(r[0])) continue;
    lessons.push([r[0], time(r[1]), int(r[2]), int(r[3]), time(r[4])]);
  }
  return { kind: RECORD_KIND, v: RECORD_V, name: cleanName(raw.name), issuedAt: time(raw.issuedAt) ?? 0, share: typeof raw.share === 'number' ? raw.share : PASS_SHARE, lessons };
}

/**
 * Recompute everything a reader needs from the record's numbers, with THIS copy's pass rule.
 * @param {ReturnType<typeof buildRecord>} rec @param {Record<string,{title?:string}>} [titles] lesson id -> summary
 */
export function evaluate(rec, titles = {}) {
  const rows = rec.lessons.map(([id, completedAt, right, of, passAt]) => {
    const scored = right != null && of != null && of > 0;
    const known = !!titles[id];
    const status = !known ? 'unknown-lesson' : !scored ? 'unscored' : right > of ? 'impossible' : passed(right, of) ? 'meets' : 'below';
    return { id, title: titles[id]?.title || id, completedAt, right, of, passAt, need: scored ? passMark(of) : null, pct: scored ? Math.round((100 * Math.min(right, of)) / of) : null, status };
  });
  const scored = rows.filter((r) => r.status === 'meets');
  const right = scored.reduce((s, r) => s + r.right, 0), of = scored.reduce((s, r) => s + r.of, 0);
  return {
    rows,
    meets: scored.length,
    unscored: rows.filter((r) => r.status === 'unscored').length,
    problems: rows.filter((r) => r.status === 'below' || r.status === 'impossible' || r.status === 'unknown-lesson').length,
    firstTryPct: of ? Math.round((100 * right) / of) : null, right, of,
    ruleChanged: Math.abs(rec.share - PASS_SHARE) > 1e-9,
  };
}

/** Date as "12 November 2026" (UTC, so the same link reads the same everywhere). */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export function dateText(ms) {
  if (!ms) return 'date not kept';
  const d = new Date(ms); return Number.isNaN(d.getTime()) ? 'date not kept' : `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** The record as a link code, and back. */
export async function recordCode(rec) { return (await pack(rec)).code; }
export async function recordFromCode(code) { return readRecord(await unpack(code)); }
export function recordLink(base, code) { return `${String(base).split('#')[0]}#/certificate?r=${code}`; }

/** Fixed wording, kept here so tests can check it for overclaims. */
export const COPY = Object.freeze({
  title: 'Certificate of Lessons Completed',
  what: (n) => `This lists the Aleph lessons ${n || 'the learner'} completed under Aleph's pass rule: ${Math.round(PASS_SHARE * 100)}% of the lesson's quick check, rounded to the nearest whole question, right on the first try (for example 2 of 3, or 7 of 10). For each lesson it shows the first-try score of the check that passed and the date. Everything comes from the learner's own records on their own device.`,
  limits: 'What this cannot prove: Aleph has no server and no signature, so nothing here can show that the record was not edited before it was shared. A teacher can check the rule and each lesson’s result; this is not a proctored assessment. The pass rule is Aleph’s own, and the questions and the mark have not been reviewed by a qualified Hebrew teacher.',
  unscored: 'Score not kept: this lesson was completed before Aleph kept check scores, or by a screen that does not keep one. It is listed but not counted.',
  link: 'The link below carries this record. Whoever opens it sees the same lessons, and the page works out every pass again from the numbers, using the pass rule in the copy of Aleph they open.',
  checking: 'You opened a link to a learner’s record. This page has worked out every pass again from the numbers in the link, using this copy of Aleph’s pass rule.',
});
