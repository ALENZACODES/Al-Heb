import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import * as K from '../tools/hostkit/check.mjs';

const lessons = K.lessonIds(), corpus = K.corpusIds();
const all = Object.fromEntries(K.KIT_FILES.map((f) => [f, K.readKit(f)]));

test('all five kit files exist', () => {
  for (const f of K.KIT_FILES) assert.ok(existsSync(join(K.ROOT, 'docs/host-kit', f)), f);
});
test('every lesson id mentioned exists in lessons.json', () => {
  for (const [f, t] of Object.entries(all)) for (const id of K.mentionedLessons(t)) assert.ok(lessons.has(id), `${f}: ${id}`);
});
test('facilitator guide uses 5 session plans and real lessons in each', () => {
  const g = all['facilitator-guide.md'];
  const sessions = g.split(/^### Session \d/m).slice(1);
  assert.equal(sessions.length, 5);
  for (const s of sessions) assert.ok(K.mentionedLessons(s).length >= 3);
  assert.match(g, /90 minutes/);
  for (const w of ['Ashkenazi', 'Sephardi', 'Israeli', 'Accessibility', 'Pre/post']) assert.ok(g.includes(w), w);
});
test('10-week table matches the class track data', async () => {
  const { readFileSync } = await import('node:fs');
  const ct = JSON.parse(readFileSync(join(K.ROOT, 'data/curriculum/class-track.json'), 'utf8'));
  const g = all['facilitator-guide.md'];
  for (const w of ct.weeks) {
    const row = g.split('\n').find((l) => l.startsWith(`| ${w.week} |`));
    assert.ok(row, `week ${w.week}`);
    for (const id of w.lessons) assert.ok(row.includes(id), `week ${w.week} ${id}`);
  }
});
test('every corpus id named in the kit exists in the corpus registry', () => {
  const ids = K.mentionedCorpus(all['facilitator-guide.md']);
  for (const id of ['num-12-13', 'shema-1', 'bless-priestly-1', 'zimun-opening']) assert.ok(ids.includes(id), id);
  assert.ok(corpus.has('hamotzi') && all['facilitator-guide.md'].includes('`hamotzi`'));
  for (const id of ids) assert.ok(corpus.has(id), id);
});
test('no external URLs except the noted sources; HTML pages load nothing external', () => {
  for (const [f, t] of Object.entries(all)) {
    for (const h of K.externalHosts(t)) assert.ok(K.ALLOWED_HOSTS.includes(h.replace(/^www\./, '')), `${f}: ${h}`);
    if (f.endsWith('.html')) assert.doesNotMatch(t, /<script|src=|<link|@import|https?:\/\//i, f);
  }
});
test('no email addresses or phone numbers anywhere in the kit', () => {
  for (const [f, t] of Object.entries(all)) { assert.deepEqual(K.emails(t), [], f); assert.deepEqual(K.phones(t), [], f); }
});
test('every file is marked draft and not reviewed by clergy or educators', () => {
  for (const [f, t] of Object.entries(all)) { assert.match(t, /DRAFT/, f); assert.match(t, /[Nn]ot reviewed by clergy or educators/, f); }
});
test('outreach drafts say John edits and sends, nothing is sent automatically; every fact has a source tag', () => {
  const o = all['outreach-drafts.md'];
  assert.match(o, /for John to edit and send/i);
  assert.match(o, /Drafts are never sent automatically/);
  const rows = o.split('\n').filter((l) => /^\| F\d+ /.test(l));
  assert.ok(rows.length >= 10);
  for (const r of rows) assert.match(r, /\[[A-Z]+(-[A-Za-z0-9]+)*[:,\]]/, r);
});
test('partner sheet covers free, offline, no accounts, and both cohort options; printable', () => {
  const p = all['partner-sheet.html'];
  for (const w of ['Free', 'No accounts', 'offline', '5-week', '10-week', 'What a host does']) assert.ok(p.includes(w), w);
  assert.match(p, /@media print/);
  assert.match(p, /<html lang="en"/);
});
test('settings sheet names all three traditions and says audio per tradition is not ready', () => {
  const s = all['settings-sheet.md'];
  for (const w of ['Israeli', 'Sephardi', 'Ashkenazi']) assert.ok(s.includes(w));
  assert.match(s, /not available yet/);
});
test('feedback form has learner and host parts', () => {
  const f = all['feedback-form.html'];
  assert.match(f, /Part A/); assert.match(f, /Part B/); assert.match(f, /@media print/);
});
test('the kit does not copy NJOP or other published course material', () => {
  for (const [f, t] of Object.entries(all)) assert.doesNotMatch(t, /Reishith Binah|Aleph Isn't Tough|Aleph Champ/i, f);
});
