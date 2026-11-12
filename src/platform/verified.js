// H9 Badges that mean something: lesson badges count ONLY verified completions, meaning lessons whose passing first-try score
// was kept (lesson.checks.v1) and still meets the pass rule (src/curriculum/passmark.js), recomputed by the certificate code
// (src/sync/certificate.js evaluate). Lessons marked complete without a kept passing score (finished before scores were kept,
// or by an older rule) are listed as the "unverified era" and never count. Pure: no DOM, no store.
import { buildRecord, evaluate } from '../sync/certificate.js';

/** [id, verified lessons needed, name]. Track badges use the lesson index's track ("read" / "israel"). */
export const COUNT_BADGES = Object.freeze([[1, 'First Verified Lesson'], [5, 'Five Verified Lessons'], [10, 'Ten Verified Lessons'], [25, 'Twenty-Five Verified Lessons'], [50, 'Fifty Verified Lessons']]);
export const TRACK_BADGES = Object.freeze([['read', 'Reading Path Complete'], ['israel', 'Israel Path Complete']]);

/**
 * @param {{progress:any, checks:any, lessons:{id:string, track:string, title?:string}[]}} src
 * @returns {{verified:{id:string,title:string,right:number,of:number,passAt:number|null}[], unverified:{id:string,title:string,completedAt:number|null}[],
 *   list:{id:string, name:string, earned:boolean, need:string, have:number, of:number}[]}}
 */
export function lessonBadges({ progress, checks, lessons = [] }) {
  const titles = Object.fromEntries(lessons.map((l) => [l.id, { title: l.title }]));
  const ev = evaluate(buildRecord({ progress, checks }), titles);
  const verified = ev.rows.filter((r) => r.status === 'meets').map((r) => ({ id: r.id, title: r.title, right: r.right, of: r.of, passAt: r.passAt }));
  const unverified = ev.rows.filter((r) => r.status === 'unscored').map((r) => ({ id: r.id, title: r.title, completedAt: r.completedAt }));
  const ok = new Set(verified.map((v) => v.id));
  const list = COUNT_BADGES.map(([n, name]) => ({ id: `verified-${n}`, name, earned: ok.size >= n, have: Math.min(ok.size, n), of: n, need: `${n} lesson${n === 1 ? '' : 's'} passed with the first-try score kept` }));
  for (const [track, name] of TRACK_BADGES) {
    const ids = lessons.filter((l) => l.track === track).map((l) => l.id);
    if (!ids.length) continue;
    const have = ids.filter((id) => ok.has(id)).length;
    list.push({ id: `track-${track}`, name, earned: have === ids.length, have, of: ids.length, need: `all ${ids.length} lessons of this path passed with the first-try score kept` });
  }
  return { verified, unverified, list };
}
