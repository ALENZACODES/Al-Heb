#!/usr/bin/env node
/**
 * Builds data/curriculum/path.json: the one Curriculum page (#/curriculum) that puts every lesson and every Practical page
 * in an order to follow. Nothing here is written by hand except the five stage headings (the Practical level names already
 * in data/curriculum/practical-pages/outline.json) and which lesson levels sit in which stage.
 *
 *   node tools/curriculum/build_path.mjs            write the file
 *   node tools/curriculum/build_path.mjs --check    exit 1 if the file on disk is out of date
 *
 * Sources (all already in the repo): data/curriculum/lessons-index.json, data/curriculum/belts.json,
 * data/curriculum/practical/index.json and the unit files, data/curriculum/practical-pages/written.json and outline.json,
 * data/curriculum/practical/hidden-items.json. A page whose items are all hidden is left out, as on the Practical screens.
 * Rules checked on every build: each lesson appears once; each Practical unit appears once; a lesson never comes before a
 * lesson it needs (the "prerequisites" in the lesson data).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(ROOT, 'data', 'curriculum', 'path.json');
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));

/**
 * Which reading ranks (Krav Maga style, data/curriculum/belts.json) and which speaking levels sit in which stage. Reading and
 * speaking run side by side; Practical levels L0 to L4 name the stages. Reading ranks are contiguous in course order.
 */
export const STAGES = [
  { id: 's1', practical: 'L0', read: ['P0', 'P1', 'P2', 'P3'], speak: ['A1'] },
  { id: 's2', practical: 'L1', read: ['P4', 'P5', 'G1'], speak: ['A2'] },
  { id: 's3', practical: 'L2', read: ['G2', 'G3', 'G4', 'G5'], speak: ['B1:core'] },
  { id: 's4', practical: 'L3', read: ['E1', 'E2', 'E3'], speak: ['B1:intermediate'] },
  { id: 's5', practical: 'L4', read: ['E4', 'E5'], speak: [] },
];

export async function buildPath() {
  const { applyWritten, writtenByUnit } = await import(pathToFileURL(join(ROOT, 'src/curriculum/practical-written.js')).href);
  const { withHidden, visiblePages } = await import(pathToFileURL(join(ROOT, 'src/curriculum/practical-progress.js')).href);
  const lessons = read('data/curriculum/lessons-index.json').lessons;
  const { resolveRanks } = await import(pathToFileURL(join(ROOT, 'src/curriculum/ranks.js')).href);
  const ranks = resolveRanks(read('data/curriculum/belts.json'), lessons);
  const rankById = new Map(ranks.map((r) => [r.id, r]));
  const rankOf = new Map(ranks.flatMap((r) => r.lessons.map((id) => [id, r])));
  const index = read('data/curriculum/practical/index.json');
  const outline = read('data/curriculum/practical-pages/outline.json');
  const written = read('data/curriculum/practical-pages/written.json');
  const hidden = read('data/curriculum/practical/hidden-items.json');
  const results = withHidden(null, hidden);
  const byUnit = writtenByUnit(written);

  const isIntermediate = (l) => /^I-\d+$/.test(l.id);
  const byId = new Map(lessons.map((l) => [l.id, l]));
  const pick = (track, key) => {
    if (track === 'read') { const r = rankById.get(key); if (!r) throw new Error(`unknown rank ${key}`); return r.lessons.map((id) => byId.get(id)); }
    const [level, part] = key.split(':');
    return lessons.filter((l) => l.track === track && l.level === level && (!part || (part === 'intermediate') === isIntermediate(l)));
  };
  const slim = (l) => ({ id: l.id, title: l.title, min: l.estMinutes || 0, level: l.level, ...(rankOf.has(l.id) ? { rank: rankOf.get(l.id).label } : {}), ...(isIntermediate(l) ? { intermediate: true } : {}) });

  const stages = STAGES.map((s, i) => {
    const units = index.units.filter((u) => u.level === s.practical).map((row) => {
      const unit = applyWritten(read(row.file), written);
      const pages = visiblePages(unit, results).map((p) => ({ id: p.id, title: p.title }));
      const full = (written.completeUnits || []).includes(row.id) && (byUnit.get(row.id) || []).length > 0;
      return { id: row.id, title: unit.title || row.title, pages, ...(full ? {} : { short: true }) };
    });
    return {
      id: s.id, n: i + 1, title: outline.levels[s.practical], practicalLevel: s.practical,
      gates: s.read.map((k) => rankById.get(k)).filter(Boolean).map((r) => ({ rank: r.label, belt: r.beltName, gate: r.gate })),
      read: s.read.flatMap((k) => pick('read', k)).map(slim),
      speak: s.speak.flatMap((k) => pick('israel', k)).map(slim),
      units,
    };
  });

  // Checks: nothing missing, nothing twice, nothing before what it needs.
  const placed = stages.flatMap((s) => [...s.read, ...s.speak].map((l) => l.id));
  const twice = placed.filter((id, i) => placed.indexOf(id) !== i);
  const missing = lessons.filter((l) => !placed.includes(l.id)).map((l) => l.id);
  if (twice.length || missing.length) throw new Error(`lessons placed twice: ${twice.join(' ') || 'none'}; not placed: ${missing.join(' ') || 'none'}`);
  const stageOf = new Map(stages.flatMap((s) => [...s.read, ...s.speak].map((l) => [l.id, s.n])));
  const order = new Map(placed.map((id, i) => [id, i]));
  for (const l of lessons) for (const need of l.prerequisites || []) {
    if (stageOf.get(need) > stageOf.get(l.id) || (stageOf.get(need) === stageOf.get(l.id) && order.get(need) > order.get(l.id))) {
      throw new Error(`${l.id} comes before ${need}, which it needs`);
    }
  }
  const unitIds = stages.flatMap((s) => s.units.map((u) => u.id));
  const lost = index.units.filter((u) => !unitIds.includes(u.id)).map((u) => u.id);
  if (lost.length || new Set(unitIds).size !== unitIds.length) throw new Error(`Practical units not placed once each: ${lost.join(' ')}`);

  const pages = stages.reduce((n, s) => n + s.units.reduce((m, u) => m + u.pages.length, 0), 0);
  return {
    schema: 'alef-curriculum-path/1',
    status: 'draft',
    note: 'Generated by tools/curriculum/build_path.mjs from the lesson list, the belts and ranks and the Practical course. Do not edit by hand. '
      + 'The order is the course authors\' own draft and has not been reviewed by a Hebrew teacher.',
    totals: { stages: stages.length, lessons: placed.length, readLessons: stages.reduce((n, s) => n + s.read.length, 0),
      speakLessons: stages.reduce((n, s) => n + s.speak.length, 0), units: unitIds.length, pages,
      minutes: lessons.reduce((n, l) => n + (l.estMinutes || 0), 0) },
    stages,
  };
}

const isMain = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain) {
  const text = JSON.stringify(await buildPath(), null, 1) + '\n';
  if (process.argv.includes('--check')) {
    let now = '';
    try { now = readFileSync(OUT, 'utf8'); } catch { /* not built yet */ }
    if (now !== text) { console.error('data/curriculum/path.json is out of date: run node tools/curriculum/build_path.mjs'); process.exit(1); }
    console.log('path.json is up to date');
  } else {
    writeFileSync(OUT, text);
    const t = JSON.parse(text).totals;
    console.log(`path.json: ${t.stages} stages, ${t.lessons} lessons (${t.readLessons} reading, ${t.speakLessons} speaking), ${t.units} Practical units, ${t.pages} pages`);
  }
}
