#!/usr/bin/env node
// Writes docs/curriculum/SYLLABUS.md from data/curriculum/lessons.json and data/curriculum/belts.json. `--check` writes nothing and exits 1 when the file is stale.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { toMarkdown } from '../../src/coursemap/model.js';

const rel = (p) => new URL('../../' + p, import.meta.url);
const lessons = JSON.parse(readFileSync(rel('data/curriculum/lessons.json'), 'utf8')).lessons;
const belts = JSON.parse(readFileSync(rel('data/curriculum/belts.json'), 'utf8'));
const md = toMarkdown(lessons, belts) + '\n', target = rel('docs/curriculum/SYLLABUS.md');
if (process.argv.includes('--check')) {
  const cur = existsSync(target) ? readFileSync(target, 'utf8') : '';
  if (cur !== md) { console.error('docs/curriculum/SYLLABUS.md is out of date: run node tools/syllabus/build.mjs'); process.exit(1); }
  console.log('docs/curriculum/SYLLABUS.md is current'); process.exit(0);
}
writeFileSync(target, md); console.log(`wrote docs/curriculum/SYLLABUS.md (${lessons.length} lessons, ${md.split('\n').length} lines)`);
