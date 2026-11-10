// Memory-chain retrieval practice (src/letters/memory.js): question builders, distractor safety over all 27 forms x 3 traditions,
// card ids and registration, spacing of look-alikes, feedback tone. Reads data/letters/memory-chain.json from disk (skips if absent).
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { loadContent } from '../src/curriculum/content.js';
import { soundsClash } from '../src/curriculum/exercises.session.js';
import { buildQueue, parseCardId } from '../src/curriculum/progress.js';
import { newCard } from '../src/curriculum/srs.js';
import {
  indexChain, buildMemoryQuestion, auditMemoryQuestion, memoryFeedback, memCardId, parseMemCardId, memoryCardsFor, ensureMemoryCards,
  spreadConfusables, minConfusableDistance, mergeMemoryIntoQueue, partnersOf, wordAnchor, canAsk, maskLeak, MEM_TYPES, MEM_DELAY_DAYS,
} from '../src/letters/memory.js';

const TRADS = ['israeli', 'sephardi', 'ashkenazi'], SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];
const HAVE = existsSync(new URL('../data/letters/memory-chain.json', import.meta.url));
const c = await loadContent();
const chain = HAVE ? indexChain(JSON.parse(readFileSync(new URL('../data/letters/memory-chain.json', import.meta.url), 'utf8'))) : new Map();
const envFor = (tradition, known) => ({ chain, letters: c.letters, consonants: c.consonants, confusables: c.confusables, tradition, known });
const T = { skip: !HAVE && 'data/letters/memory-chain.json not present' };

test('card ids: mem:<letterId>:<type> round-trips and parseCardId knows it', T, () => {
  assert.equal(memCardId('bet', 'pic'), 'mem:bet:pic');
  assert.deepEqual(parseMemCardId('mem:kaf-final:word'), { kind: 'mem', key: 'mem:kaf-final:word', letterId: 'kaf-final', type: 'word' });
  assert.equal(parseCardId('mem:dalet:recall').kind, 'mem');
  assert.equal(parseMemCardId('mem:bet:nope'), null);
  assert.equal(parseCardId('letter:bet').kind, 'letter'); // old ids unchanged
});

test('the chain covers all 27 letter forms and every type is askable for each', T, () => {
  assert.equal(c.letters.size, 27);
  for (const id of c.letters.keys()) for (const type of MEM_TYPES) assert.ok(canAsk(type, chain.get(id), c.letters, id), `${id} ${type}`);
});

test('27 forms x 3 traditions x 4 types x seeds: every question passes the ambiguity audit', T, () => {
  let n = 0, distractors = 0;
  for (const tr of TRADS) for (const id of c.letters.keys()) for (const type of MEM_TYPES) for (const seed of SEEDS) {
    const q = buildMemoryQuestion(type, id, envFor(tr), { seed });
    assert.ok(q, `${tr} ${id} ${type} seed ${seed}: no question`);
    assert.deepEqual(auditMemoryQuestion(q, envFor(tr)), [], `${tr} ${q.id} seed ${seed}`);
    if (type !== 'recall') { assert.ok(q.options.length >= 3, `${q.id}: ${q.options.length} options`); distractors += q.options.length - 1; }
    n++;
  }
  assert.equal(n, 3 * 27 * 4 * SEEDS.length);
  assert.ok(distractors > 3000, `only ${distractors} distractors checked`);
});

test('sound-based questions: no option shares a sound with the answer (independent re-check, and the known bug pairs never meet)', T, () => {
  const BAD = [['bet', 'vav'], ['shin', 'samekh'], ['alef', 'ayin'], ['alef', 'he'], ['kaf', 'qof'], ['mem', 'mem-final'], ['kaf', 'kaf-final'], ['samekh', 'tav']];
  for (const tr of TRADS) for (const type of ['hook', 'word']) for (const id of c.letters.keys()) for (const seed of SEEDS) {
    const q = buildMemoryQuestion(type, id, envFor(tr), { seed });
    for (const o of q.options) if (o.id !== id) assert.ok(!soundsClash(c.consonants.get(id), c.consonants.get(o.id), tr), `${tr} ${type} ${id} vs ${o.id}`);
    const ids = new Set(q.options.map((o) => o.id));
    // a pair that makes one sound must never meet when one of the two is the answer (two wrong options sharing a sound is harmless)
    for (const [a, b] of BAD) if ((id === a || id === b) && (tr === 'ashkenazi' || !(a === 'samekh' && b === 'tav'))) assert.ok(!(ids.has(a) && ids.has(b)), `${tr} ${type} ${q.id}: ${a} and ${b} together`);
  }
});

test('picture questions never offer the answer in a second form, and include a look-alike partner when the letter has one', T, () => {
  for (const tr of TRADS) for (const id of c.letters.keys()) for (const seed of SEEDS) {
    const q = buildMemoryQuestion('pic', id, envFor(tr), { seed });
    const root = (x) => c.letters.get(x).finalOf || x;
    assert.equal(q.options.filter((o) => root(o.id) === root(id)).length, 1, `${id}`);
    const partners = [...partnersOf(c.confusables, id)].filter((p) => root(p) !== root(id));
    if (partners.length) assert.ok(q.options.some((o) => partners.includes(o.id)), `${tr} ${id} seed ${seed}: no look-alike among ${q.options.map((o) => o.id)}`);
  }
});

test('look-alike partners that make a different sound appear in the sound questions too (dalet/resh, bet/kaf, vav/zayin)', T, () => {
  const seen = (type, id, other) => TRADS.some((tr) => SEEDS.some((s) => buildMemoryQuestion(type, id, envFor(tr), { seed: s }).options.some((o) => o.id === other)));
  for (const [a, b] of [['dalet', 'resh'], ['bet', 'kaf'], ['vav', 'zayin'], ['gimel', 'nun'], ['tsadi', 'ayin']]) {
    assert.ok(seen('hook', a, b), `hook ${a} never shows ${b}`); assert.ok(seen('hook', b, a), `hook ${b} never shows ${a}`);
  }
});

test('word questions: first letter (last letter for the five final forms), each option with its own sound in the tradition', T, () => {
  for (const id of c.letters.keys()) {
    const q = buildMemoryQuestion('word', id, envFor('ashkenazi'), { seed: 1 }), fin = /-final$/.test(id);
    assert.equal(q.position, fin ? 'last' : 'first');
    assert.equal(wordAnchor(q.promptHe, id).position, fin ? 'last' : 'first');
    assert.match(q.prompt, fin ? /end with/ : /start with/);
    assert.ok(q.options.every((o) => o.sub), `${id}: every option shows a sound`);
    if (!fin) assert.ok(q.options.every((o) => !/-final$/.test(o.id)), `${id}: a final form offered for a first letter`);
  }
  // the sound follows the setting: Ashkenazi tav at the start of a word has the dagesh sound; its option text comes from consonants.json
  const tavA = buildMemoryQuestion('word', 'tav', envFor('ashkenazi'), { seed: 1 }).options.find((o) => o.id === 'tav').sub;
  assert.match(tavA, /^t\b/);
});

test('cues never name the letter: picture description and hook cue are masked, and masking works', T, () => {
  assert.equal(maskLeak('Bet becomes a bungalow', { name: 'Bet', he: 'ב' }), '___ becomes a bungalow');
  assert.equal(maskLeak('Final kaf becomes a king', { name: 'Final Kaf' }, { name: 'Final Kaf' }), '___ becomes a king');
  for (const id of c.letters.keys()) {
    const L = c.letters.get(id), e = chain.get(id);
    const toks = [...new Set([L.name, e.name].flatMap((n) => n.split(/[\s/]+/)).filter((w) => w.length >= 2 && !/^final$/i.test(w)))];
    const q = buildMemoryQuestion('pic', id, envFor('sephardi'), { seed: 1 }), h = buildMemoryQuestion('hook', id, envFor('sephardi'), { seed: 1 });
    for (const text of [q.picture.alt, q.picture.idea, h.cue]) for (const w of toks) assert.ok(!new RegExp(`(^|[^\\p{L}])${w}(?![\\p{L}])`, 'iu').test(text), `${id}: "${text}" names ${w}`);
    for (const text of [q.picture.alt, h.cue]) assert.ok(!text.includes(L.he), `${id}: glyph in cue`);
  }
});

test('hook cue says where in the hook word the sound is; the tradition line is carried only where the chain says it differs', T, () => {
  assert.match(buildMemoryQuestion('hook', 'bet', envFor('sephardi')).cue, /^the sound at the start of "ball"$/);
  assert.match(buildMemoryQuestion('hook', 'kaf-final', envFor('sephardi')).cue, /at the end of "loch"/);
  assert.deepEqual(buildMemoryQuestion('hook', 'bet', envFor('ashkenazi')).soundNotes.length, 1);
  assert.equal(buildMemoryQuestion('hook', 'chet', envFor('sephardi')).soundNotes.length, 2);
  assert.match(buildMemoryQuestion('hook', 'chet', envFor('sephardi')).soundNotes[1], /^Differs/);
  assert.equal(buildMemoryQuestion('hook', 'chet', envFor('israeli')).soundNotes.length, 1);
});

test('a missing piece means no card: nothing is invented', T, () => {
  const bare = new Map([['bet', { id: 'bet', picture: {}, sound: {}, word: {} }], ['dalet', { id: 'dalet', picture: { alt: 'a door' }, sound: { hook: 'door' }, word: { he: 'שלום' } }]]);
  for (const type of MEM_TYPES) assert.equal(buildMemoryQuestion(type, 'bet', { ...envFor('sephardi'), chain: bare }), null);
  assert.ok(buildMemoryQuestion('pic', 'dalet', { ...envFor('sephardi'), chain: bare }));
  assert.equal(buildMemoryQuestion('word', 'dalet', { ...envFor('sephardi'), chain: bare }), null, 'word does not start with dalet');
  assert.equal(buildMemoryQuestion('pic', 'zzz', envFor('sephardi')), null);
  assert.equal(wordAnchor('שָׂרָה', 'shin'), null, 'a sin is not the shin card');
  assert.equal(new Map().size, indexChain(null).size);
});

test('wrong answers get the story and the tip, in calm words; right answers get a short confirmation', T, () => {
  const shame = /\b(wrong|incorrect|fail|failed|mistake|stupid|bad|no!)\b/i;
  for (const tr of TRADS) for (const id of c.letters.keys()) for (const type of ['pic', 'hook', 'word']) {
    const q = buildMemoryQuestion(type, id, envFor(tr), { seed: 3 });
    const miss = memoryFeedback(q, false), hit = memoryFeedback(q, true);
    assert.ok(miss.story && miss.tip, `${q.id}: story and tip after a miss`);
    assert.ok(miss.lead.includes(c.letters.get(id).name), `${q.id}: names the answer`);
    for (const t of [miss.lead, miss.story, miss.tip, hit.lead]) assert.ok(!shame.test(t), `${q.id}: "${t}"`);
    assert.equal(hit.lead, 'Right.');
  }
});

test('registration: cards per letter, staggered first due dates, idempotent, existing cards untouched', T, () => {
  const ds = memoryCardsFor(['bet', 'kaf'], chain, c.letters);
  assert.deepEqual(ds.map((d) => d.id), ['pic', 'hook', 'word', 'recall'].flatMap((t) => []).concat(['bet', 'kaf'].flatMap((l) => MEM_TYPES.map((t) => `mem:${l}:${t}`))));
  const now = Date.UTC(2026, 10, 4), day = 86400000;
  const a = ensureMemoryCards({ 'letter:bet': newCard({ id: 'letter:bet', now }) }, ds, now);
  assert.equal(a.added, 8);
  for (const t of MEM_TYPES) assert.equal(a.cards[`mem:bet:${t}`].due, now + MEM_DELAY_DAYS[t] * day);
  assert.equal(a.cards['letter:bet'].reps, 0);
  assert.equal(ensureMemoryCards(a.cards, ds, now + day).added, 0);
  assert.deepEqual(memoryCardsFor(['bet'], new Map(), c.letters), []);
});

test('spacing: look-alikes are kept apart in the order, yet each question offers them as choices', T, () => {
  const letters = ['bet', 'kaf', 'pe', 'dalet', 'resh', 'kaf-final', 'vav', 'zayin', 'nun-final', 'he', 'chet', 'tav', 'gimel', 'nun'];
  const ids = letters.flatMap((l) => ['pic', 'hook'].map((t) => memCardId(l, t)));
  const partners = (l) => partnersOf(c.confusables, l);
  const before = minConfusableDistance(ids, partners), out = spreadConfusables(ids, partners, { gap: 3 });
  assert.deepEqual([...out].sort(), [...ids].sort(), 'a permutation');
  assert.ok(before <= 1, `the fixture order starts with neighbours (min distance ${before})`);
  assert.ok(minConfusableDistance(out, partners) >= 3, `min distance ${minConfusableDistance(out, partners)}`);
  assert.deepEqual(spreadConfusables(ids, partners, { gap: 3 }), out, 'deterministic');
});

test('queue: memory cards are merged among the others, spread apart, and a lesson filter keeps its letters\' memory cards', T, () => {
  const now = Date.UTC(2026, 10, 10), mk = (id) => ({ ...newCard({ id, now: now - 1000 }) });
  const mem = ['bet', 'kaf', 'pe'].map((l) => `mem:${l}:pic`), other = ['letter:alef', 'letter:gimel', 'vowel:patach', 'letter:he', 'letter:chet', 'letter:lamed'];
  const cards = Object.fromEntries([...mem, ...other].map((id) => [id, mk(id)]));
  const q = buildQueue(cards, now, { confusables: c.confusables, limit: 20 }).map((x) => x.id);
  assert.deepEqual([...q].sort(), [...mem, ...other].sort());
  const mi = q.map((id, i) => (id.startsWith('mem:') ? i : -1)).filter((i) => i >= 0);
  assert.ok(mi.every((i, k) => k === 0 || i - mi[k - 1] >= 3), `memory cards bunched: ${q}`);
  const lesson = { id: 'zz', letters: ['bet'], vowels: [], words: [] };
  assert.deepEqual(buildQueue(cards, now, { lessonId: 'zz', lessons: [lesson], confusables: c.confusables }).map((x) => x.id), ['mem:bet:pic']);
  assert.deepEqual(mergeMemoryIntoQueue(['a', 'b'], [], () => []), ['a', 'b']);
  assert.deepEqual(mergeMemoryIntoQueue([], ['mem:bet:pic'], () => []), ['mem:bet:pic']);
});
