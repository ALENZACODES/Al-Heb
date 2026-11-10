// Helpers for the reviewer-packet tests: builds a small FAKE repo in a temp dir (never touches the real data).
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';

export async function writeJson(root, rel, obj, indent) {
  const p = join(root, rel);
  await mkdir(dirname(p), { recursive: true });
  await writeFile(p, typeof obj === 'string' ? obj : JSON.stringify(obj, null, indent));
}

export async function makeFakeRepo() {
  const root = await mkdtemp(join(tmpdir(), 'alef-review-'));
  // registry: pretty, 1-space indent, trailing newline (like the real file)
  await writeJson(root, 'data/corpus/registry.json', {
    schema: 'x', entries: [
      { id: 'shema-1', ref: 'Deut 6:4', title: 'Shema', category: 'torah', he: 'שְׁמַע יִשְׂרָאֵל', english: 'Hear, O Israel', source: 'Test siddur', status: 'verified', proofread: false, typedFromMemory: false },
      { id: 'done-1', title: 'Done', category: 'siddur', he: 'אָמֵן', english: 'Amen', source: 'Test', status: 'verified', proofread: true, typedFromMemory: false },
      { id: 'yigdal', title: 'Yigdal', category: 'siddur', he: 'יִגְדַּל אֱלֹהִים חַי', english: 'Magnified be the living God', source: 'Test', status: 'transcribed-needs-check', proofread: false, typedFromMemory: false },
    ],
  }, 1);
  await writeJson(root, 'data/corpus/prayer-meta.json', { schema: 'm', entries: { 'shema-1': { whatItSays: 'Hear', whereInService: 'Shacharit', delivery: 'recited', denominations: { orthodox: { use: 'as-written', note: '' } }, clergyReviewed: false } } }, 1);
  // dialogues: 2-space indent with parent flag -> container roll-up
  await writeJson(root, 'data/curriculum/dialogues.json', {
    version: 1, status: 'draft-needs-native-review', proofread: false, needsNativeReview: true,
    dialogues: [{ id: 'd-one', title: 'One', level: 'A1', topic: 't', proofread: false, speakers: [{ id: 'a', name: 'Waiter' }, { id: 'b', name: 'Dana' }],
      lines: [{ id: 'd-one-l1', speaker: 'a', he: 'שָׁלוֹם', translit: 'shalom', en: 'Hello' }, { id: 'd-one-l2', speaker: 'b', he: 'תּוֹדָה', translit: 'toda', en: 'Thanks' }] }],
  }, 2);
  // lessons: file-level draft status, compact one-line records (no record flag): flips must INSERT a key
  await writeJson(root, 'data/curriculum/lessons.json',
    '{"version":1,"status":"draft-needs-native-review","lessons":[\n{"id":"r01","track":"read","level":"white","title":"Shin and Bet","letters":["shin"],"vowels":[],"words":[{"he":"שָׁב","en":"he returned","translit":null}],"prayerLines":[],"goals":["g"]}\n]}');
  // vocab: canonical file (one entry per line) + tier pack copy (single line)
  const e = (id, rank, he, gloss) => ({ id, rank, lemma: he.replace(/[֑-ׇ]/g, ''), pointed: he, pos: 'noun', gloss, proofread: false });
  const v = [e('va', 1, 'אֵת', 'object marker'), e('vb', 2, 'שָׁלוֹם', 'peace'), e('vc', 1500, 'בַּיִת', 'house')];
  await writeJson(root, 'data/vocab/vocab5000.json', '{\n"schema":"s","entries":[\n' + v.map((x) => JSON.stringify(x)).join(',\n') + '\n]}\n');
  await writeJson(root, 'data/vocab/packs/vocab5k-tier-500.json', JSON.stringify({ schema: 't', tier: 500, entries: v.slice(0, 2) }) + '\n');
  await writeJson(root, 'data/vocab/packs/vocab5k-tier-2000.json', JSON.stringify({ schema: 't', tier: 2000, entries: v.slice(2) }) + '\n');
  // letters: strokes with a tiny outline
  const rec = { strokes: [{ path: 'M0 0', median: [[100, 100], [200, 200], [300, 300]] }], strokeWidth: 80, validated: false, needsNativeReview: true, quality: 'draft', outline: 'M100 100 300 100 300 300 100 300Z' };
  await writeJson(root, 'data/letters/letters.json', [{ id: 'alef', name: 'Alef', nameHe: 'אָלֶף', he: 'א', print: rec, cursive: { ...rec, needsNativeReview: false, validated: true, quality: 'ok' } }], 1);
  // data/israel is read by the generic extractor (nested he/translit/en objects, file-level flags)
  await writeJson(root, 'data/israel/fillers.json', {
    version: 1, status: 'draft-needs-native-review', proofread: false, needsNativeReview: true, note: 'n',
    fillers: [
      { id: 'fl-yalla', he: 'יַאלְלָה', translit: 'yaLA', en: 'come on', register: 'casual', example: { he: 'יַאלְלָה, נֵלֵךְ', translit: 'yaLA, neLECH', en: "Let's go." }, proofread: false, needsNativeReview: true },
      { id: 'fl-done', he: 'סַבָּבָה', translit: 'sababa', en: 'cool', proofread: true },
    ],
  }, 1);
  // a flagged file that no dedicated extractor knows: must land in the catch-all area
  await writeJson(root, 'data/zzz/extra.json', { items: [{ id: 'x1', he: 'שָׁלוֹם', en: 'peace', needsNativeReview: true }] }, 1);
  await mkdir(join(root, 'book'), { recursive: true });
  await writeFile(join(root, 'book/opening-prayer.txt'), '*Hineni* — here I am.\nLine two.\n\nSecond stanza with *tikkun*.\n');
  await mkdir(join(root, 'docs'), { recursive: true });
  await writeFile(join(root, 'docs/NOTE.md'), 'This page is DRAFT and not yet proofread.\n');
  return root;
}

import { AREAS } from '../tools/review/config.mjs';
/** file name of an area's sheet, e.g. sheetName('prayers') -> '02-prayers.csv' */
export const sheetName = (slug, ext = 'csv') => `${String(AREAS.find((a) => a.slug === slug).n).padStart(2, '0')}-${slug}.${ext}`;
export const cleanup = (root) => rm(root, { recursive: true, force: true });
export const sha = async (root, rel) => createHash('sha256').update(await readFile(join(root, rel))).digest('hex');
export async function snapshot(root, rels) { const o = {}; for (const r of rels) o[r] = await sha(root, r); return o; }
export const DATA_FILES = ['data/corpus/registry.json', 'data/corpus/prayer-meta.json', 'data/curriculum/dialogues.json', 'data/curriculum/lessons.json', 'data/vocab/vocab5000.json', 'data/vocab/packs/vocab5k-tier-500.json', 'data/vocab/packs/vocab5k-tier-2000.json', 'data/letters/letters.json', 'data/israel/fillers.json', 'data/zzz/extra.json'];
