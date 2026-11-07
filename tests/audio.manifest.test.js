import { test } from 'node:test';
import { loadManifestFull } from '../tools/audio/manifest_io.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseCsv } from '../tools/record-kit/lib.mjs';
import { buildEntries } from '../tools/audio/build_manifest.mjs';
import { LETTERS, FINAL_LETTERS, VOWELS } from '../tools/audio/hebrew_data.mjs';

const manifest = loadManifestFull();

test('committed manifest has contract fields, valid paths, hebrew code points', () => {
  assert.ok(Array.isArray(manifest) && manifest.length > 1000);
  const seen = new Set();
  for (const e of manifest) {
    assert.ok(['m', 'f'].includes(e.voice));
    assert.ok(['israeli', 'sephardi', 'ashkenazi'].includes(e.tradition));
    assert.ok(['letter', 'vowel', 'syllable', 'word', 'line', 'prayer'].includes(e.kind));
    assert.equal(e.path, `audio/${e.voice}/${e.tradition}/${e.kind}/${e.id}.mp3`);
    assert.match(e.id, /^[a-z0-9][a-z0-9._-]*$/);
    assert.match(e.text, /[֐-׿]/);
    assert.ok(['missing', 'tts', 'synthetic-unreviewed', 'recorded'].includes(e.status));
    assert.ok(typeof e.source === 'string');
    assert.ok(!seen.has(e.path), `dup ${e.path}`); seen.add(e.path);
  }
});

test('covers 31 letter forms (27 + 4 variants), 15 vowels, 22x5 syllable grid for both voices and all traditions', () => {
  const count = (kind, voice, trad) => manifest.filter((e) => e.kind === kind && e.voice === voice && e.tradition === trad);
  for (const v of ['m', 'f']) for (const t of ['israeli', 'sephardi', 'ashkenazi']) {
    const names = count('letter', v, t).filter((e) => !e.id.endsWith('-sound'));
    assert.equal(names.length, LETTERS.length + FINAL_LETTERS.length + 4);
    assert.equal(names.length, 31, '27 letters + vet, khaf, fe, sin');
    assert.equal(count('letter', v, t).filter((e) => e.id.endsWith('-sound')).length, 26, '22 sounds + 4 variant sounds');
    assert.equal(count('vowel', v, t).length, VOWELS.length);
    assert.equal(count('vowel', v, t).length, 15);
    assert.equal(count('syllable', v, t).length, 110);
  }
});

test('only ingested synthetic clips exist: every non-missing entry is synthetic-unreviewed, has its file, and none is recorded', () => {
  for (const e of manifest) {
    if (e.status === 'missing') { assert.equal(e.source, 'none', e.path); assert.equal(fs.existsSync(new URL('../' + e.path, import.meta.url)), false, e.path); continue; }
    assert.equal(e.status, 'synthetic-unreviewed', e.path);
    assert.equal(e.source, 'outside-synthetic', e.path);
    assert.equal(e.synth && e.synth.reviewed, false, e.path);
    assert.equal(fs.existsSync(new URL('../' + e.path, import.meta.url)), true, e.path);
  }
  assert.equal(manifest.filter((e) => e.status === 'recorded').length, 0, 'no human recording exists');
});

test('syllable text is a letter + vowel mark; bet/kaf/pe carry dagesh, shin carries shin dot', () => {
  const t = (id) => manifest.find((e) => e.id === id && e.voice === 'm' && e.tradition === 'israeli').text;
  assert.deepEqual([...t('bet-a')].map((c) => c.codePointAt(0).toString(16)).sort(), ['5b7', '5bc', '5d1']);
  assert.ok(t('shin-o').includes('ׁ'));
  assert.equal([...t('alef-u')].length, 2);
  assert.equal(manifest.find((e) => e.id === 'bet-a' && e.tradition === 'israeli' && e.voice === 'f').ipa, 'ba');
  assert.equal(manifest.find((e) => e.id === 'bet-a' && e.tradition === 'ashkenazi' && e.voice === 'f').ipa, undefined);
});

function tmpRoot(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'alefm-'));
  for (const [rel, content] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), content); }
  return root;
}

test('status becomes recorded/tts only when a file exists; meta sidecar sets provenance', () => {
  const root = tmpRoot({
    'audio/m/israeli/letter/bet.mp3': 'x',
    'audio/f/israeli/letter/bet.mp3': 'x',
    'audio/f/israeli/letter/bet.mp3.meta.json': JSON.stringify({ status: 'tts', source: 'tts:azure' }),
  });
  const { entries } = buildEntries({ root });
  const get = (v) => entries.find((e) => e.path === `audio/${v}/israeli/letter/bet.mp3`);
  assert.equal(get('m').status, 'recorded'); assert.match(get('m').source, /unverified/);
  assert.equal(get('f').status, 'tts'); assert.equal(get('f').source, 'tts:azure');
  assert.equal(entries.filter((e) => e.status !== 'missing').length, 2);
});

test('reads other lanes when present: corpus, curriculum, niqqud; skips bad ids; applies equivalence rules', () => {
  const root = tmpRoot({
    'data/corpus/registry.json': JSON.stringify([
      { id: 'Num-6:24', he: 'יְבָרֶכְךָ יְהוָה וְיִשְׁמְרֶךָ', type: 'prayer' },
      { id: 'shalom', he: 'שָׁלוֹם' },
      { id: 'noheb', he: 'abc' },
    ]),
    'data/curriculum/lessons.json': JSON.stringify([{ id: 'l1', words: [{ id: 'todah', he: 'תּוֹדָה' }, 'shalom'], prayerLines: [] }]),
    'data/pronunciation/niqqud.json': JSON.stringify([{ id: 'kamatz', ipa: { israeli: 'a', ashkenazi: 'ɔ' } }]),
    'data/audio/equivalence.json': JSON.stringify({ rules: [{ from: 'sephardi', to: 'israeli', kinds: ['word'], ids: ['shalom'] }] }),
  });
  const { entries, warnings } = buildEntries({ root });
  const f = (p) => entries.find((e) => e.path === p);
  assert.equal(f('audio/m/israeli/prayer/num-6-24.mp3').kind, 'prayer');
  assert.ok(f('audio/f/ashkenazi/word/shalom.mp3'));
  assert.ok(f('audio/m/israeli/word/todah.mp3'));
  assert.equal(f('audio/m/ashkenazi/vowel/kamatz.mp3').ipa, 'ɔ');
  assert.deepEqual(f('audio/m/sephardi/word/shalom.mp3').equivalentTo, ['israeli']);
  assert.equal(f('audio/m/israeli/word/shalom.mp3').equivalentTo, undefined);
  assert.ok(warnings.some((w) => w.includes('noheb')));
});

test('size budget: core manifest, the kind-word shard and every word shard stay under 2 MiB; shards hold only reader word clips and are current', () => {
  const MiB = 1048576;
  const core = JSON.parse(fs.readFileSync(new URL('../data/audio/manifest.json', import.meta.url), 'utf8'));
  assert.ok(fs.statSync(new URL('../data/audio/manifest.json', import.meta.url)).size < 2 * MiB, 'core manifest < 2 MiB');
  assert.ok(core.every((e) => !['prayer-word', 'vocab-word', 'vocab-alias', 'vocab-extra'].includes(e.group)), 'core has no reader or donor-script word clips');
  assert.ok(core.every((e) => e.kind !== 'word'), 'core has no kind=word entries: they live in manifest-kind-word.json');
  const wordShard = JSON.parse(fs.readFileSync(new URL('../data/audio/manifest-kind-word.json', import.meta.url), 'utf8'));
  assert.ok(fs.statSync(new URL('../data/audio/manifest-kind-word.json', import.meta.url)).size < 2 * MiB, 'kind-word shard < 2 MiB');
  assert.ok(wordShard.length > 1000 && wordShard.every((e) => e.kind === 'word'), 'kind-word shard holds only kind=word entries');
  for (const t of ['israeli', 'sephardi', 'ashkenazi']) {
    const f = new URL(`../data/audio/manifest-words-${t}.json`, import.meta.url);
    assert.ok(fs.statSync(f).size < 2 * MiB, `${t} shard < 2 MiB`);
    const sh = JSON.parse(fs.readFileSync(f, 'utf8'));
    assert.ok(sh.length > 1000 && sh.every((e) => ['prayer-word', 'vocab-word', 'vocab-alias', 'vocab-extra'].includes(e.group) && e.tradition === t));
  }
  assert.equal(manifest.length, core.length + wordShard.length + 3 * JSON.parse(fs.readFileSync(new URL('../data/audio/manifest-words-israeli.json', import.meta.url), 'utf8')).length);
});

test('every id in every donor recording script resolves to a missing manifest entry with the right kind/voice/tradition path', () => {
  const idx = new Map(manifest.map((e) => [e.path, e]));
  const ids = {};
  for (const t of ['israeli', 'sephardi', 'ashkenazi']) {
    const rows = parseCsv(fs.readFileSync(new URL(`../docs/voices/recording-script-${t}.csv`, import.meta.url), 'utf8'));
    assert.equal(rows.length, 1000, t);
    ids[t] = rows.map((r) => r.id);
    for (const r of rows) for (const v of ['m', 'f']) {
      const e = idx.get(`audio/${v}/${t}/word/${r.id}.mp3`);
      assert.ok(e, `${t}/${v}/${r.id} missing from manifest`);
      assert.deepEqual([e.kind, e.voice, e.tradition], ['word', v, t]); assert.ok(['missing', 'synthetic-unreviewed'].includes(e.status));
    }
  }
  assert.deepEqual(ids.israeli, ids.sephardi); assert.deepEqual(ids.israeli, ids.ashkenazi);
  assert.ok(manifest.some((e) => e.id === 'ha3cf2c46'));
});

test('every vocab-word manifest entry (donor-script words) appears in its tradition script; script words are not in core', () => {
  const inScript = {};
  for (const t of ['israeli', 'sephardi', 'ashkenazi']) inScript[t] = new Set(parseCsv(fs.readFileSync(new URL(`../docs/voices/recording-script-${t}.csv`, import.meta.url), 'utf8')).map((r) => r.id));
  const vw = manifest.filter((e) => e.group === 'vocab-word');
  assert.equal(vw.length, 6000);
  for (const e of vw) assert.ok(inScript[e.tradition].has(e.id), `${e.path} not in script`);
});

test('sin letter name follows canonical mark order (vowel before sin dot)', () => {
  const sin = manifest.find((e) => e.id === 'sin' && e.kind === 'letter');
  assert.equal(sin.text, sin.text.normalize('NFC'));
  assert.equal(sin.text, '\u05E9\u05B4\u05C2\u05D9\u05DF');
});

test('vocab ids: every mapped or Listen-pool vocab id has a word entry for every voice and tradition; aliases point at a lesson word', async () => {
  const words = JSON.parse(fs.readFileSync(new URL('../data/vocab/words.json', import.meta.url), 'utf8')).words;
  const cfg = JSON.parse(fs.readFileSync(new URL('../data/listen/config.json', import.meta.url), 'utf8'));
  const { buildPool } = await import('../src/listen/model.js');
  const map = JSON.parse(fs.readFileSync(new URL('../data/curriculum/word-vocab-map.json', import.meta.url), 'utf8')).map;
  const have = new Set(manifest.filter((e) => e.kind === 'word').map((e) => `${e.voice}|${e.tradition}|${e.id}`));
  const ids = new Set([...Object.values(map), ...buildPool(words, cfg).map((w) => w.id)]);
  for (const id of ids) for (const t of ['israeli', 'sephardi', 'ashkenazi']) for (const v of ['m', 'f']) assert.ok(have.has(`${v}|${t}|${id}`), `${v}/${t}/${id}`);
  assert.ok(manifest.filter((x) => x.group === 'vocab-alias').every((e) => /^word\/[a-z0-9._-]+-w\d+$/.test(e.aliasOf)));
  assert.ok(manifest.filter((x) => x.group === 'vocab-alias' || x.group === 'vocab-extra').every((e) => e.status === 'missing' || e.status === 'recorded' || e.status === 'tts'));
});
