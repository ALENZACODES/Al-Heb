#!/usr/bin/env node
// C9 grammar spotlights: which grammar note each lesson meets, from the existing grammar data only.
// For every lesson, the grammar topics (src/grammar/model.js buildTopics, built from data/vocab/words.json, data/corpus/registry.json
// and data/grammar/notes.json) whose example forms appear in the lesson's own words or prayer lines. The topic with the most such
// forms is the lesson's spotlight (a grammar topic before the prayer-openings note). Each topic gets a seeded three-question drill (buildQuestions). Nothing is written by hand.
// Usage: node tools/grammar/build-spotlights.mjs [--check]
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildTopics, buildQuestions, seededRng, TOPIC_IDS } from '../../src/grammar/model.js';
import { loadGrammarData } from '../../src/grammar/loader.js';

const OUT = fileURLToPath(new URL('../../data/grammar/spotlights.json', import.meta.url));
const lessons = JSON.parse(readFileSync(new URL('../../data/curriculum/lessons.json', import.meta.url), 'utf8')).lessons;
const sk = (s) => String(s || '').replace(/[֑-ׇ]/g, '').replace(/[־׃]/g, '');

export async function build() {
  const data = await loadGrammarData();
  const topics = buildTopics(data), reg = new Map(data.registry.map((e) => [e.id, e]));
  const lineOf = (item) => (/^reg:([^#]+)#/.exec(item.id || '') || [])[1] || item.entryId || null;
  const out = { schema: 'alef-grammar-spotlights/1', status: 'draft-unreviewed', generatedBy: 'tools/grammar/build-spotlights.mjs',
    note: 'Generated from the grammar notes data (rule-based or corpus-attested forms, see src/grammar/model.js). Not reviewed by a Hebrew teacher.',
    topics: {}, lessons: {} };
  for (const id of TOPIC_IDS) {
    const t = topics[id];
    out.topics[id] = { title: t.title, summary: t.summary, drill: buildQuestions(t, seededRng(1000 + TOPIC_IDS.indexOf(id)), 3) };
  }
  for (const l of lessons) {
    const forms = new Set([...(l.words || []).map((w) => sk(w.he)), ...(l.prayerLines || []).flatMap((p) => sk(reg.get(p)?.he || '').split(/\s+/))]);
    let best = null;
    for (const id of TOPIC_IDS) {
      const hits = topics[id].items.filter((i) => forms.has(sk(i.he)) || (lineOf(i) && (l.prayerLines || []).includes(lineOf(i))));
      // a grammar topic beats "how prayers open" (openings) whenever both meet the lesson; otherwise the most forms wins
      const rank = (x) => (x.id === 'openings' ? 0 : 1000) + x.hits.length;
      if (hits.length && out.topics[id].drill.length && (!best || rank({ id, hits }) > rank(best))) best = { id, hits };
    }
    if (best) out.lessons[l.id] = { topic: best.id, examples: best.hits.slice(0, 3).map((i) => ({ he: i.he, meaning: i.meaning, note: i.note, label: i.label })) };
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const text = JSON.stringify(await build(), null, 1) + '\n';
  if (process.argv.includes('--check')) { let cur = ''; try { cur = readFileSync(OUT, 'utf8'); } catch { /* missing */ } if (cur !== text) { console.error('data/grammar/spotlights.json is stale: run node tools/grammar/build-spotlights.mjs'); process.exit(1); } console.log('spotlights up to date'); }
  else { writeFileSync(OUT, text); const d = JSON.parse(text); console.log(`data/grammar/spotlights.json: ${Object.keys(d.lessons).length} lessons with a spotlight, ${text.length} bytes`); }
}
