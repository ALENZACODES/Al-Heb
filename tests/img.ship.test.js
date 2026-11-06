import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createImageResolver } from '../src/img/resolve.js';
import { SCENE, speakSceneId } from '../src/img/scenes.js';
import { ROOT } from '../tools/img/build_index.mjs';

const index = JSON.parse(readFileSync(join(ROOT, 'data/img/index.json'), 'utf8'));
const approvals = JSON.parse(readFileSync(join(ROOT, 'data/images/approvals.json'), 'utf8'));
const R = createImageResolver({ index, approvals });

test('speak scenes pick only the shipped candidates', () => {
  assert.equal(speakSceneId('speak-survival-taxi-1'), 'SPEAK_08_street_taxi');
  assert.equal(speakSceneId('speak-survival-greetings-1'), 'SPEAK_05_table_welcome');
  assert.equal(speakSceneId('speak-religion-prayer-1'), 'SPEAK_04_table_shabbat');
  for (const id of ['SPEAK_01_street_falafel', 'SPEAK_06_sanctuary_quiet', 'SPEAK_12_your_turn']) assert.equal(R.resolve('id', id), null, id);
});

test('letter lessons resolve a meet cartoon, and the screens\' gen art resolves', () => {
  for (const id of ['alef', 'bet', 'gimel', 'shin', 'tsadi-final']) {
    const r = R.resolve('letter', id, { role: 'meet' });
    assert.ok(r, id);
    assert.match(r.id, /_print_meet$/);
    assert.match(r.src, /^assets\/img\/gen\/.+\.webp$/);
  }
  assert.match(R.resolve('letter', 'alef').id, /_print_meet$/);
  for (const id of [SCENE.minuteOne, SCENE.minuteOneVariant, SCENE.minuteOneStill03, SCENE.minuteOneStill04, SCENE.minuteOneStill05, SCENE.minuteOneStill06, SCENE.minuteOneStill07, SCENE.minuteOneStill08, SCENE.minuteOneStill09, SCENE.minuteOneStill11, SCENE.minuteOneStill12, SCENE.letterRush, SCENE.letterRushRound, SCENE.letterRushRound03, SCENE.letterRushRound04, SCENE.letterRushRound05, SCENE.letterRushRound06, SCENE.sofitSniper, SCENE.sofitSniperLevel, SCENE.sofitSniperLevel03, SCENE.sofitSniperLevel04, SCENE.sofitSniperLevel05, SCENE.sofitSniperLevel06, SCENE.niqqudFade, SCENE.niqqudFadeStill, SCENE.niqqudFadeStill03, SCENE.niqqudFadeStill04, SCENE.niqqudFadeStill05, SCENE.traditionDetective, SCENE.traditionDetectiveListen, SCENE.traditionDetectiveCase, SCENE.traditionDetectiveCase04, SCENE.traditionDetectiveCase05, SCENE.traditionDetectiveCase06, SCENE.storyPostcard, SCENE.storySeaside, SCENE.storyEpisode, SCENE.storyEpisode03, SCENE.storyEpisode04, SCENE.storyEpisode05, SCENE.karaokeListen, 'SPEAK_04_table_shabbat', 'SPEAK_05_table_welcome', 'SPEAK_08_street_taxi', 'BG_cafe', 'CHAR_ari_neutral', 'CHAR_ari_celebrate', 'MOUTH_ah', 'CHAR_noa_speak']) {
    const r = R.resolve('id', id);
    assert.ok(r, id);
    assert.equal(r.approved, true);
    assert.match(r.src, /\.webp$/);
  }
  assert.ok(R.resolve('vowel', 'kamatz'));
  assert.equal(R.resolve('letter', 'aleph'), null);
});
