import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const S = await import('../src/speak/score.js');
const M = await import('../src/speak/model.js');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rd = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));

// ---- normalization ---------------------------------------------------------------------------------------------------
test('plainWords: niqqud and cantillation dropped, final letters folded, maqaf and sof pasuq split, divine name folded to its spoken form', () => {
  assert.deepEqual(S.plainWords('שָׁלוֹם'), ['שלומ']);
  assert.deepEqual(S.plainWords('בֹּקֶר־טוֹב!'), ['בקר', 'טוב']);
  assert.deepEqual(S.plainWords('בָּרְכוּ אֶת־יְהוָה הַמְבֹרָךְ׃'), ['ברכו', 'את', 'אדני', 'המברכ']);
  assert.deepEqual(S.plainWords('ה׳ אֶחָד'), ['אדני', 'אחד'], 'he + geresh abbreviation is the divine name');
});
test('joinMarks: a geresh or gershayim between letters stays inside the word (Hebrew or ASCII marks); a trailing geresh does not join', () => {
  assert.deepEqual(S.plainWords('גִ׳ירָפָה'), ['גירפה']);
  assert.deepEqual(S.plainWords("ג'ירפה"), ['גירפה']);
  assert.deepEqual(S.plainWords('צה״ל'), ['צהל']);
  assert.deepEqual(S.plainWords('צה"ל'), ['צהל']);
  assert.equal(S.joinMarks("ה' "), "ה' ");
});
test('pointedWords: the printed words in the same order and count as plainWords, marks kept for display', () => {
  assert.deepEqual(S.pointedWords('בָּרְכוּ אֶת־יְהוָה הַמְבֹרָךְ׃'), ['בָּרְכוּ', 'אֶת', 'יְהוָה', 'הַמְבֹרָךְ']);
  assert.deepEqual(S.pointedWords('צה״ל, גִ׳ירָפָה'), ['צה״ל', 'גִ׳ירָפָה']);
  assert.deepEqual(S.pointedWords(' . '), []);
});
test('pointedWords matches plainWords in count for every Say it item and every prayer line shipped', () => {
  let n = 0;
  const dir = join(root, 'data/speak/sets');
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    for (const it of rd(`data/speak/sets/${f}`).items || []) { if (typeof it.he !== 'string') continue; assert.equal(S.pointedWords(it.he).length, S.plainWords(it.he).length, `${f} ${it.id}`); n++; }
  }
  for (const p of rd('data/speak/prayers.json').prayers) for (const line of p.lines) { assert.equal(S.pointedWords(line).length, S.plainWords(line).length, `${p.id}`); n++; }
  assert.ok(n > 500, `checked ${n}`);
});
test('expandDigits: 0..10 become the number word closest to a printed word; longer numbers stay as written', () => {
  assert.deepEqual(S.expandDigits(['3', 'כוסות'], ['שלוש', 'כוסות']), ['שלוש', 'כוסות']);
  assert.deepEqual(S.expandDigits(['3'], ['שלושה']), ['שלושה']);
  assert.deepEqual(S.expandDigits(['2'], ['שתיימ']), ['שתיים']);
  assert.deepEqual(S.expandDigits(['25'], ['עשרימ']), ['25']);
});

// ---- word alignment --------------------------------------------------------------------------------------------------
test('wordMatch / statusOf: same letters = hit; vav/yod spelling tolerated; one letter off in a long word = near; different = miss', () => {
  assert.equal(S.wordMatch('בקר', 'בוקר'), 1);
  assert.equal(S.wordMatch('שלומ', 'שלומ'), 1);
  assert.equal(S.statusOf(S.wordMatch('המברכ', 'המבורכ')), 'hit');
  assert.equal(S.statusOf(S.wordMatch('תלמידימ', 'תלמידות')), 'near', 'letters only: a wrong ending on a long word is close, not right');
  assert.equal(S.statusOf(S.wordMatch('מחברת', 'מחבר')), 'near');
  assert.equal(S.statusOf(S.wordMatch('כלב', 'חתול')), 'miss');
  assert.equal(S.wordMatch('', 'x'), 0);
});
test('alignPlain: a missing word does not shift the rest; extra heard words are ignored', () => {
  const a = S.alignPlain(['ברכו', 'את', 'אדני', 'המברכ'], ['ברכו', 'את', 'המברכ']);
  assert.deepEqual(a.map((w) => w.status), ['hit', 'hit', 'miss', 'hit']);
  const b = S.alignPlain(['בקר', 'טוב'], ['אה', 'בוקר', 'טוב', 'מאוד']);
  assert.deepEqual(b.map((w) => w.status), ['hit', 'hit']);
  assert.deepEqual(S.alignPlain(['בקר'], []).map((w) => w.status), ['miss']);
});

// ---- score -----------------------------------------------------------------------------------------------------------
test('scoreSpeech: hit = 1, near = 0.5, miss = 0, over the printed words; outcome match / close / miss', () => {
  const full = S.scoreSpeech('בֹּקֶר טוֹב', ['בוקר טוב']);
  assert.equal(full.outcome, 'match'); assert.equal(full.score, 1); assert.equal(full.percent, 100); assert.equal(full.hit, 2);
  assert.deepEqual(full.words.map((w) => w.word), ['בֹּקֶר', 'טוֹב'], 'printed words are shown, not the letters-only form');
  const three = S.scoreSpeech('בָּרְכוּ אֶת יְהוָה הַמְבֹרָךְ', 'ברכו את המברך');
  assert.equal(three.percent, 75); assert.equal(three.outcome, 'close'); assert.deepEqual(three.words.map((w) => w.status), ['hit', 'hit', 'miss', 'hit']);
  assert.equal(three.words[2].word, 'יְהוָה'); assert.equal(three.words[2].plain, 'יהוה');
  const none = S.scoreSpeech('שָׁלוֹם', ['תודה']);
  assert.equal(none.outcome, 'miss'); assert.equal(none.score, 0); assert.equal(none.words[0].heard, null);
  const near = S.scoreSpeech('מַחְבֶּרֶת', ['מחבר']);
  assert.equal(near.words[0].status, 'near'); assert.equal(near.score, 0.5); assert.equal(near.outcome, 'close');
});
test('scoreSpeech: picks the best of several recognizer alternatives and returns the raw text it used', () => {
  const r = S.scoreSpeech('תּוֹדָה רַבָּה', ['תורה רבה', 'תודה רבה', 'תודה']);
  assert.equal(r.outcome, 'match'); assert.equal(r.heard, 'תודה רבה');
});
test('scoreSpeech: recognizer spellings — digits, ASCII geresh, the divine name as heard, punctuation', () => {
  assert.equal(S.scoreSpeech('שָׁלוֹשׁ כּוֹסוֹת', ['3 כוסות']).outcome, 'match');
  assert.equal(S.scoreSpeech('גִ׳ירָפָה', ["ג'ירפה"]).outcome, 'match');
  assert.equal(S.scoreSpeech('בָּרוּךְ אַתָּה יְהוָה', ['ברוך אתה אדוני']).outcome, 'match');
  assert.equal(S.scoreSpeech('מָה שְׁלוֹמְךָ?', ['מה שלומך']).outcome, 'match');
});
test('scoreSpeech: nothing heard scores 0; an empty target scores 0 and is never a match', () => {
  const r = S.scoreSpeech('שָׁלוֹם', []);
  assert.equal(r.score, 0); assert.equal(r.outcome, 'miss'); assert.equal(r.heard, '');
  const e = S.scoreSpeech('', ['שלום']);
  assert.equal(e.total, 0); assert.equal(e.score, 0); assert.equal(e.outcome, 'miss');
  assert.equal(S.scoreLine(e), 'There were no words to score.');
});
test('scoreLine says what the number counts', () => {
  assert.equal(S.scoreLine(S.scoreSpeech('בָּרְכוּ אֶת יְהוָה הַמְבֹרָךְ', 'ברכו את המברך')), 'Score 75%: 3 of 4 words recognized.');
  assert.equal(S.scoreLine(S.scoreSpeech('מַחְבֶּרֶת', 'מחבר')), 'Score 50%: 0 of 1 word recognized, 1 close.');
  assert.match(S.SCORE_MEANS, /not measure your accent/);
});

// ---- availability ----------------------------------------------------------------------------------------------------
test('scoringStatus: unavailable recognizer says so plainly and offers a self-check; never claims a score', () => {
  const ff = S.scoringStatus({ recognition: false, recording: true, secure: true });
  assert.equal(ff.scored, false); assert.equal(ff.reason, 'no-recognizer');
  assert.match(ff.text, /No score in this browser/); assert.match(ff.text, /Firefox/); assert.match(ff.text, /record yourself, play it back next to the model/);
  assert.match(ff.text, /not scored/);
  const bare = S.scoringStatus({ recognition: false, recording: false, secure: true });
  assert.match(bare.text, /say it out loud, listen to the model again/);
  const http = S.scoringStatus({ recognition: false, recording: false, secure: false });
  assert.equal(http.reason, 'insecure'); assert.match(http.text, /secure \(https\)/);
  const ok = S.scoringStatus(M.capabilities({ SpeechRecognition: function R() {}, isSecureContext: true }));
  assert.equal(ok.scored, true);
  assert.equal(S.scoringStatus(M.capabilities({})).scored, false, 'a browser with no SpeechRecognition (Firefox) cannot score');
  assert.equal(S.scoringStatus(undefined).scored, false);
});
test('isFatal: errors that make scoring impossible now, as opposed to a quiet try', () => {
  for (const e of ['unsupported', 'not-allowed', 'language-not-supported', 'service-not-allowed', 'network']) assert.equal(S.isFatal(e), true, e);
  for (const e of ['no-speech', 'timeout', 'aborted']) assert.equal(S.isFatal(e), false, e);
});

// ---- summaries -------------------------------------------------------------------------------------------------------
test('splitSummary / summaryText: scored and self-marked are kept apart; self-marks get no percentage', () => {
  const s = S.splitSummary([{ outcome: 'match', score: 1 }, { outcome: 'close', score: 0.5 }, { outcome: 'said' }, { outcome: 'notyet' }, { outcome: 'skip' }]);
  assert.deepEqual(s, { scored: 2, average: 0.75, matched: 1, close: 1, missed: 0, said: 1, notYet: 1 });
  assert.equal(S.summaryText(s), 'Scored by the recognizer: 2 items, average 75% of words recognized (1 fully, 1 close, 0 missed). Marked by you, not scored: 1 said, 1 not yet.');
  const selfOnly = S.summaryText(S.splitSummary([{ outcome: 'said' }]));
  assert.doesNotMatch(selfOnly, /%/); assert.match(selfOnly, /not scored/);
  const last = S.splitSummary([{ itemId: 'a', outcome: 'miss', score: 0 }, { itemId: 'a', outcome: 'match', score: 1 }], { byItem: true });
  assert.equal(last.scored, 1); assert.equal(last.average, 1);
  assert.equal(S.summaryText(S.splitSummary([])), 'Nothing scored or marked yet.');
  assert.equal(S.summaryText(s, { average: false }), 'Scored by the recognizer: 2 items (1 fully, 1 close, 0 missed). Marked by you, not scored: 1 said, 1 not yet.');
});
