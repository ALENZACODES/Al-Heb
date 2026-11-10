// The 3D Studio games speak their Hebrew: the family words carry the same recordings as Letter Pattern, the number birds carry
// their number words, and a syllable recording is only offered to a learner whose tradition says its consonant the Israeli way.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { familyClipRows, syllableTraditions } from '../src/lab/lab.core.js';
import { DRILLS } from '../src/lab/lab.games.js';
import { migrationPuzzle, vowelSignsFor } from '../src/lab/lab.studio.js';

const json = (p) => JSON.parse(readFileSync(p, 'utf8'));
const W = json('data/lab/words.json');
const extended = [];
const env = {
  ctx: {
    fetchFn: async (u) => ({ ok: true, json: async () => JSON.parse(readFileSync(fileURLToPath(u), 'utf8')) }),
    audio: { extend: (rows) => extended.push(...rows) },
  },
};

test('familyClipRows: word, line and dictionary rows; dictionary files are handed over for both voices', () => {
  const he = new Map([['a', 'אָב'], ['c', 'גַּן']]);
  const { clips, extra } = familyClipRows([['a', 'w', 'h1'], ['b', 'l', 'line-1'], ['c', 'd', 'v9'], ['', 'w', 'x'], null], he);
  assert.deepEqual(clips.get('a'), { kind: 'word', id: 'h1' });
  assert.deepEqual(clips.get('b'), { kind: 'line', id: 'line-1' });
  assert.deepEqual(clips.get('c'), { kind: 'word', id: 'dict-v9' });
  assert.equal(clips.size, 3);
  assert.deepEqual(extra.map((r) => `${r.voice} ${r.path} ${r.text}`), ['m audio/m/israeli/dictionary/dict-v9.mp3 גַּן', 'f audio/f/israeli/dictionary/dict-v9.mp3 גַּן']);
});

test('syllableTraditions follows the consonant tables: Chet, Resh and plain Kaf only Israeli; plain Tav not Ashkenazi; Bet with its dot everyone', () => {
  const c = W.cards;
  assert.deepEqual(syllableTraditions('חַ', c), ['israeli']);
  assert.deepEqual(syllableTraditions('רִ', c), ['israeli']);
  assert.deepEqual(syllableTraditions('כַ', c), ['israeli']);
  assert.deepEqual(syllableTraditions('תֹ', c), ['israeli', 'sephardi']);
  assert.deepEqual(syllableTraditions('בַּ', c), ['israeli', 'sephardi', 'ashkenazi']);
  assert.deepEqual(syllableTraditions('בוּ', c), ['israeli', 'sephardi', 'ashkenazi'], 'the shuruk vav is the vowel');
  assert.deepEqual(syllableTraditions('?', c), ['israeli'], 'unknown: only the tradition of the recording');
});

test('studio word games load the family words with their recordings, and every dictionary file they name is on disk', async () => {
  for (const id of ['wordburst', 'pathword']) {
    const words = await DRILLS[id].load(env);
    const voiced = words.filter((w) => w.clip);
    assert.ok(voiced.length > 500, `${id}: ${voiced.length} of ${words.length} words have a recording`);
  }
  const fams = await DRILLS.rootforge.load(env);
  assert.ok(fams.flatMap((f) => f.words).filter((w) => w.clip).length > 300);
  assert.ok(extended.length > 0);
  for (const r of extended) assert.ok(existsSync(r.path), r.path);
});

test('studio syllables carry the traditions that may hear them; number birds carry their number word', async () => {
  const syl = await DRILLS.speedmatch.load(env);
  assert.ok(syl.length > 50 && syl.every((s) => Array.isArray(s.says) && s.says[0] === 'israeli'));
  assert.ok(syl.some((s) => s.says.length === 3) && syl.some((s) => s.says.length === 1));
  const nums = await DRILLS.migration.load(env);
  for (let lv = 1; lv <= 10; lv += 3) {
    const pz = migrationPuzzle(nums, lv, () => 0.37);
    assert.ok(pz.birds.every((b) => b.clip === null || (b.clip.kind === 'word' && typeof b.clip.id === 'string')));
    assert.ok(pz.birds.some((b) => b.clip), `level ${lv}`);
  }
});

test('Vowel Storm names kamatz and tzere beside "a" and "e" only where they say it (not Ashkenazi)', () => {
  assert.match(vowelSignsFor('a', 'israeli'), /קָמַץ/); assert.match(vowelSignsFor('e', 'sephardi'), /צֵירֵי/);
  assert.doesNotMatch(vowelSignsFor('a', 'ashkenazi'), /קָמַץ/); assert.doesNotMatch(vowelSignsFor('e', 'ashkenazi'), /צֵירֵי/);
  assert.equal(vowelSignsFor('i', 'ashkenazi'), vowelSignsFor('i', 'israeli'));
});
