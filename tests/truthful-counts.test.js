// Regression checks for the public count and Shin/Sin copy claims.
// Every number is computed from the shipped data at run time. No snapshot total is written down here.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createImageResolver } from '../src/img/resolve.js';
import { imageInventory, imageCountText, pendingApprovedIds } from '../src/shell/readiness.js';
import { buildPairs, genderedForms, genderInventory, genderCountText } from '../src/curriculum/gender.js';
import { coverageText, EXPLORER_VERB_RULE } from '../src/roots/model.js';
import { inExplorer } from '../tools/roots/build.mjs';
import { saySound } from '../src/pronunciation/forTradition.js';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));

test('image claims separate catalogued, approvals and shown, and shown is approved intersect ingested', () => {
  const index = json('data/img/index.json');
  const approvals = json('data/images/approvals.json');
  const inv = imageInventory(index, approvals);
  const stats = createImageResolver({ index, approvals }).stats();
  assert.equal(inv.catalogued, stats.total);
  assert.equal(inv.ingested, stats.ingested);
  assert.equal(inv.shown, stats.approvedIngested);
  assert.ok(inv.catalogued >= inv.approved && inv.approved >= inv.shown && inv.ingested >= inv.shown);
  const pending = pendingApprovedIds(index, approvals);
  assert.equal(pending.length, inv.pending);
  assert.equal(inv.pending, inv.approved - inv.shown);
  const text = imageCountText(inv, 0);
  assert.match(text, new RegExp(`\\b${inv.shown} shown\\b`));
  assert.match(text, new RegExp(`\\b${inv.approved} approvals\\b`));
  assert.match(text, new RegExp(`\\b${inv.catalogued} catalogued\\b`));
  assert.doesNotMatch(text, /approved by a reviewer and shown/);
  if (inv.pending > 0) assert.match(text, new RegExp(`${inv.pending} approved but not in the app yet`));
  else assert.match(text, /Every approval has a picture file in the app/);
});

test('gender page counts are the built pairs, with paradigms and composed forms labelled apart', () => {
  const file = json('data/curriculum/gender-pairs.json');
  const book = json('data/corpus/phrasebook.json');
  const pairs = buildPairs(file, book);
  const inv = genderInventory(pairs, file.paradigms);
  assert.equal(inv.pairs, pairs.length);
  assert.equal(inv.authored + inv.phrasebook + inv.other, inv.pairs);
  assert.equal(inv.paradigms, file.paradigms.length);
  assert.equal(inv.composedForms, file.paradigms.reduce((n, p) => n + genderedForms(p).length, 0));
  assert.equal(inv.composedForms, inv.paradigms * 4);
  const text = genderCountText(inv);
  assert.match(text, new RegExp(`${inv.pairs} pair cards`));
  assert.match(text, new RegExp(`${inv.authored} written for this page`));
  assert.match(text, new RegExp(`${inv.phrasebook} from the phrasebook`));
  assert.match(text, new RegExp(`${inv.paradigms} paradigms, counted separately`));
  assert.match(text, new RegExp(`${inv.composedForms} composed forms`));
  assert.doesNotMatch(text, /70\s*\+|seventy\s*\+|or more pairs/i);
  for (const f of ['src/curriculum/gender.js', 'src/curriculum/gender.view.js']) assert.doesNotMatch(read(f), /70\s*\+/);
  assert.equal(file.status, 'draft-needs-native-review');
  assert.ok(pairs.filter((p) => p.source === 'phrasebook').every((p) => p.audio.f == null));
});

test('roots coverage names the word list and the explorer list, and the exclusion is the build rule', () => {
  const words = json('data/vocab/words.json').words;
  const fam = json('data/roots/families.json');
  const verbs = json('data/roots/verbs.json');
  const ok = words.filter((w) => w.kind === 'word' && !(w.flags && w.flags.hidden));
  const groups = new Map();
  for (const w of ok) if (w.root) { if (!groups.has(w.root)) groups.set(w.root, []); groups.get(w.root).push(w); }
  const inFam = new Set();
  for (const [, rows] of groups) if (rows.length >= 2) for (const w of rows) inFam.add(w.id);
  const verbsAll = ok.filter((w) => w.pos === 'verb');
  const included = verbsAll.filter((w) => inExplorer(w, inFam.has(w.id)));
  assert.equal(included.length, verbs.verbs.length);
  assert.equal(verbsAll.length, fam.coverage.verbs);
  const text = coverageText(fam.coverage, verbs.verbs);
  const withRoot = verbs.verbs.filter((v) => v.root).length;
  assert.match(text, new RegExp(`${fam.coverage.verbsWithRoot} of ${fam.coverage.verbs} verbs in the word list`));
  assert.match(text, new RegExp(`${withRoot} of ${verbs.verbs.length} verbs you can open here`));
  assert.match(text, new RegExp(`${verbsAll.length - included.length} word-list verbs are not in this explorer`));
  assert.ok(text.includes(EXPLORER_VERB_RULE));
  assert.ok(fam.note.includes(EXPLORER_VERB_RULE) && verbs.note.includes(EXPLORER_VERB_RULE));
  assert.doesNotMatch(text, /70\s*\+/);
});

test('shin/sin beginner lines name both letters and both dots, and stay native-review-needed', () => {
  const consonants = json('data/pronunciation/consonants.json');
  const shin = consonants.letters.shin;
  assert.equal(consonants.sayNeedsNativeReview, true);
  assert.match(shin.notes, /native-review-needed/);
  assert.match(shin.notes, /not a native-verified correction/);
  const old = /Shin says SH, like shh; left dot/;
  for (const t of ['israeli', 'sephardi', 'ashkenazi']) {
    const say = saySound(shin, t);
    assert.equal(say, shin.say[t]);
    assert.match(say, /Shin says sh with the right dot/);
    assert.match(say, /Sin says s with the left dot/);
    assert.doesNotMatch(say, old);
    assert.doesNotMatch(say, /\bverified\b/i);
    assert.doesNotMatch(say.replace(/Sin says s with the left dot/, ''), /left dot/);
    const en = shin.english[t];
    assert.match(en, /right dot \(shin\)/);
    assert.match(en, /left dot \(sin\)/);
  }
  assert.match(shin.english.american_synagogue, /left dot \(sin\)/);
  const chain = json('data/letters/memory-chain.json').letters.find((l) => l.id === 'shin');
  for (const t of ['israeli', 'sephardi', 'ashkenazi']) assert.ok(chain.sound.perTradition[t].includes(shin.english[t]), t);
});
