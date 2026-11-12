/**
 * C10 benchmark map (pure). The brief asks for the 28 "IJL Graduate Benchmark" skills. That list is NOT in this repository
 * (docs/research/ijl-sarah-levine.md and docs/curriculum/class-track/SOURCES.md say IJL could not be identified), so no skill is
 * invented here. The page uses the benchmark list the repo does have: the rank goals in data/curriculum/belts.json (one "Goal of
 * the rank" sentence per rank, P0 to E5, each tied to a run of reading-path lessons), and says so on the page.
 *
 * State per benchmark, from this device's records only:
 *   proven       every lesson of the rank has a passed check on record (lesson.checks.v1 pass)
 *   done-before  every lesson is marked done, but at least one was done before checks were recorded (no pass on record)
 *   started      some lessons done
 *   open         none yet
 */
import { resolveRanks } from '../curriculum/ranks.js';

export const SOURCE_NOTE = 'The 28-skill IJL Graduate Benchmark list is not in this app, so it is not shown and no skill is made up. This map uses the benchmark list the app has: the goal of each rank (belt) of the reading path, from the course data. Each goal is the course authors\' own wording and has not been reviewed by a teacher.';

/** @returns {{id,label,gate,lessons:string[],done:number,proven:number,state:'proven'|'done-before'|'started'|'open'}[]} */
export function benchmarkMap(beltsFile, lessons, completed = {}, checks = {}) {
  return resolveRanks(beltsFile, lessons).map((r) => {
    const ids = r.lessons || [];
    const done = ids.filter((id) => completed?.[id]).length;
    const proven = ids.filter((id) => checks?.[id]?.pass).length;
    const state = ids.length && proven === ids.length ? 'proven' : ids.length && done === ids.length ? 'done-before' : done > 0 ? 'started' : 'open';
    return { id: r.id, label: `${r.beltName} belt · ${r.id}`, gate: r.gate || '', lessons: ids, range: r.range || '', done, proven, state };
  });
}
export const STATE_TEXT = { proven: 'Proven: every lesson passed its check', 'done-before': 'Done, but some lessons were finished before checks were recorded (not proven by a check)', started: 'Started', open: 'Not started' };
export function summary(map) {
  const n = (s) => map.filter((b) => b.state === s).length;
  return `${n('proven')} of ${map.length} proven, ${n('done-before')} done without a recorded check, ${n('started')} started, ${n('open')} not started.`;
}
