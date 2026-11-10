import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { stripPoints, filterEntries } from '../src/vocab/model.js';
import { fold, matchBand, rankEntries, isExactBand, BAND } from '../src/vocab/rank.js';
import { transliterate } from '../src/pronunciation/transliterate.js';
import { buildClipLookup, lookupClip, alternateClip, planIsExactFile, CLIP_RATES, PLAYBACK_DEPENDENCY } from '../src/vocab/clips.js';
import { lookupFromDisk } from '../tools/vocab/build-clip-lookup.mjs';
import { aliasHits, GREETING_ALIAS } from '../src/vocab/aliases.js';
import { applyRanked } from '../src/vocab/vocab.view.js';
import { createAudio } from '../src/audio/player.js';

const words = JSON.parse(readFileSync(new URL('../data/vocab/vocab5000.json', import.meta.url), 'utf8')).entries;
const content = words.filter((e) => !e.isForm);
const cache = new Map();
function tradOf(tradition) {
  return (e) => {
    const key = tradition + '|' + (e.pointed || '');
    if (cache.has(key)) return cache.get(key);
    let v = '';
    try { if (e.pointed) v = transliterate(e.pointed, { scheme: 'siddur', tradition }); } catch { v = ''; }
    cache.set(key, v);
    return v;
  };
}
const show = (rows) => rows.map((x) => [x.band, x.entry.rank, x.entry.lemma, x.entry.gloss]);

test('fold matches stripPoints, and punctuation is not a regular expression', () => {
  assert.equal(fold('שָׁלוֹם'), stripPoints('שָׁלוֹם').toLowerCase());
  assert.equal(fold('  HI! '), 'hi');
  assert.equal(fold('...'), '');
  assert.equal(fold('(hello)'), 'hello');
  assert.equal(matchBand({ gloss: 'this' }, '.*'), null);
  assert.equal(matchBand({ gloss: 'this' }, '(hi)'), BAND.substring);
});

test('Hi and hello lead with the phrasebook greeting; she and peace stay glosses; short queries hide letter matches', () => {
  const book = JSON.parse(readFileSync(new URL('../' + GREETING_ALIAS.provenance.file, import.meta.url), 'utf8'));
  const line = book.entries.find((e) => e.id === GREETING_ALIAS.provenance.id);
  const hiLine = book.entries.find((e) => e.id === GREETING_ALIAS.provenance.hiLine);
  assert.equal(line.he, GREETING_ALIAS.provenance.he);
  assert.equal(line.en, GREETING_ALIAS.provenance.en);
  assert.equal(hiLine.he, GREETING_ALIAS.provenance.hiHe);
  assert.equal(hiLine.en, GREETING_ALIAS.provenance.hiEn);
  const shalom = content.find((e) => e.id === GREETING_ALIAS.targetId);
  assert.equal(shalom.gloss, 'peace');
  assert.equal(shalom.pointed, line.he);
  for (const q of ['hi', 'hello', '  HI! ']) {
    const hits = aliasHits(content, q, fold);
    assert.deepEqual(hits.map((x) => x.entry.id), [shalom.id]);
    const shown = applyRanked(words, { query: q }, tradOf('sephardi'));
    assert.equal(shown[0].entry.id, shalom.id);
    assert.equal(shown[0].band, BAND.alias);
    assert.equal(shown[0].entry.gloss, 'peace');
    assert.equal(shown.some((x) => x.band >= BAND.prefix), false);
  }
  const hiShown = applyRanked(words, { query: 'hi' }, tradOf('sephardi'));
  const tl = hiShown.find((x) => x.band === BAND.translit);
  assert.equal(tl.entry.lemma, 'היא');
  assert.equal(tl.entry.gloss, 'she, it');
  assert.ok(hiShown.indexOf(hiShown[0]) < hiShown.indexOf(tl));
  const broad = applyRanked(words, { query: 'hi', broad: true }, tradOf('sephardi'));
  assert.ok(broad.some((x) => x.entry.lemma === 'זה' && x.band === BAND.substring));
  const peace = applyRanked(words, { query: 'peace' }, tradOf('sephardi'));
  assert.equal(peace[0].entry.id, shalom.id);
  assert.equal(peace[0].band, BAND.gloss);
  assert.equal(peace[0].alias, undefined);
  const she = applyRanked(words, { query: 'she' }, tradOf('sephardi'));
  assert.equal(she[0].entry.lemma, 'היא');
  assert.ok(she[0].band <= BAND.sense);
  assert.equal(she.some((x) => x.entry.id === shalom.id), false);
  assert.equal(she.some((x) => x.band >= BAND.prefix), false);
  const pointed = applyRanked(words, { query: 'שָׁלוֹם' }, tradOf('sephardi'));
  const bare = applyRanked(words, { query: 'שלום' }, tradOf('sephardi'));
  assert.equal(pointed[0].entry.id, shalom.id);
  assert.equal(pointed[0].band, BAND.hebrew);
  assert.equal(bare[0].entry.id, shalom.id);
  assert.equal(bare[0].band, BAND.hebrew);
  assert.equal(applyRanked(words, { query: '' }, tradOf('sephardi')).filter((x) => x.band === BAND.alias).length, 0);
});

test('hello is not an exact 5,000-list gloss; shalom and sholom follow the tradition spelling', () => {
  const sep = rankEntries(content, 'hello', tradOf('sephardi'));
  assert.equal(sep.filter((x) => isExactBand(x.band)).length, 0);
  const shalom = content.find((e) => e.lemma === 'שלום' && e.pos === 'noun');
  const bySep = rankEntries(content, 'shalom', tradOf('sephardi'));
  assert.equal(bySep[0].entry.id, shalom.id);
  assert.equal(bySep[0].band, BAND.translit);
  const byAsh = rankEntries(content, 'sholom', tradOf('ashkenazi'));
  assert.equal(byAsh[0].entry.id, shalom.id);
  assert.equal(byAsh[0].band, BAND.translit);
  assert.equal(rankEntries(content, 'shalom', tradOf('ashkenazi')).some((x) => x.entry.id === shalom.id && isExactBand(x.band)), false);
});

test('a later sense ranks before a longer gloss that only starts the same way', () => {
  const ranked = rankEntries(content, 'to happen', tradOf('sephardi'));
  const hit = ranked.find((x) => x.entry.lemma === 'היה' && x.entry.pos === 'verb');
  assert.equal(hit.band, BAND.sense);
  assert.equal(hit.entry.gloss, 'to be; to happen');
  const later = ranked.find((x) => /to be late/.test(x.entry.gloss));
  if (later) assert.ok(hit.band < later.band);
  const be = rankEntries(content, 'to be', tradOf('sephardi'));
  assert.equal(be[0].entry.lemma, 'היה');
  assert.equal(be[0].band, BAND.firstSense);
  const late = be.find((x) => x.entry.gloss === 'to be late');
  assert.ok(late);
  assert.equal(late.band, BAND.prefix);
  assert.ok(be.indexOf(be[0]) < be.indexOf(late));
});

test('Hebrew points, a one-letter query, an empty query, and a known multi-sense gloss', () => {
  const es = [
    { lemma: 'שלום', pointed: 'שָׁלוֹם', gloss: 'peace; hello', pos: 'noun', topic: 'Society', rank: 2, id: 'a' },
    { lemma: 'בוקר', pointed: 'בֹּקֶר', gloss: 'morning', pos: 'noun', topic: 'Time', rank: 3, id: 'b' },
    { lemma: 'עכשיו', pointed: null, gloss: 'now', pos: 'adv', topic: 'Time', rank: 4, id: 'c' },
    { lemma: 'ב', pointed: 'בְּ', gloss: 'in, at', pos: 'prep', topic: 'Time', rank: 1, id: 'd' },
  ];
  assert.deepEqual(filterEntries(es, { query: 'שלום' }).map((e) => e.lemma), ['שלום']);
  assert.deepEqual(filterEntries(es, { query: 'שָׁלוֹם' }).map((e) => e.lemma), ['שלום']);
  assert.deepEqual(filterEntries(es, { query: 'בֹּקֶר' }).map((e) => e.lemma), ['בוקר']);
  assert.deepEqual(filterEntries(es, { query: 'HELLO' }).map((e) => e.lemma), ['שלום']);
  assert.deepEqual(filterEntries(es, { query: '  hi! ' }).map((e) => e.id), []);
  assert.deepEqual(filterEntries(es, { topic: 'Time' }).map((e) => e.lemma), ['בוקר', 'עכשיו', 'ב']);
  assert.deepEqual(filterEntries(es, { topic: 'Time', query: 'now' }).map((e) => e.lemma), ['עכשיו']);
  assert.equal(filterEntries(es, { query: 'zzz' }).length, 0);
  assert.equal(filterEntries(es, { query: '...' }).length, 0);
  assert.equal(filterEntries(es, { query: '' }).length, 4);
  assert.equal(filterEntries(es, { query: '   ' }).length, 4);
  const bet = rankEntries(content, 'ב', tradOf('sephardi'));
  assert.ok(bet.length < 20, 'a one-letter Hebrew query is not every word that contains that letter');
  assert.ok(bet.every((x) => isExactBand(x.band)));
  const good = rankEntries(content, 'good', tradOf('sephardi'));
  assert.equal(good[0].entry.lemma, 'טוב');
  assert.equal(good[0].entry.gloss, 'good, fair, fine');
  assert.equal(good[0].band, BAND.firstSense);
  const buried = good.find((x) => x.entry.gloss === 'to bring good news');
  assert.ok(buried.band > good[0].band);
});

test('clip lookup plays one real id for the selected voice and tradition', () => {
  const built = lookupFromDisk();
  const onDisk = JSON.parse(readFileSync(new URL('../data/vocab/clip-lookup.json', import.meta.url), 'utf8'));
  assert.equal(JSON.stringify(built), JSON.stringify(onDisk));
  const shalom = content.find((e) => e.lemma === 'שלום' && e.pos === 'noun');
  const fSep = lookupClip(onDisk, shalom.pointed, 'f', 'sephardi');
  const mAsh = lookupClip(onDisk, shalom.pointed, 'm', 'ashkenazi');
  // the Sephardi and Ashkenazi settings play the Israeli file unless their own slot is an admitted accent clip (owner decisions
  // 2026-11-07; the old paid-cloud respelled files are retired); the clip keeps its real tradition and remembers the setting
  assert.ok(fSep && fSep.path.startsWith('audio/f/israeli/'));
  assert.equal(fSep.tradition, 'israeli'); assert.equal(fSep.setting, 'sephardi');
  assert.ok(mAsh && mAsh.path.startsWith('audio/m/israeli/'));
  assert.equal(mAsh.tradition, 'israeli'); assert.equal(mAsh.setting, 'ashkenazi');
  assert.notEqual(fSep.path, mAsh.path);
  assert.match(onDisk.rule, /otherwise the Israeli slot/);
  assert.ok(existsSync(new URL('../' + fSep.path, import.meta.url)));
  assert.deepEqual(CLIP_RATES, ['normal', 'slow']);
  assert.equal(planIsExactFile({ source: 'file', via: 'exact', url: '/x', voice: 'f', tradition: 'sephardi', id: fSep.id }, { voice: 'f', tradition: 'sephardi', id: fSep.id }), true);
  assert.equal(planIsExactFile({ source: 'file', via: 'equivalent', fileTradition: 'israeli', url: '/x', voice: 'f', tradition: 'sephardi', id: 'other' }, { voice: 'f', tradition: 'sephardi', id: fSep.id }), false);
  assert.equal(planIsExactFile({ source: 'tts-fallback', voice: 'f', tradition: 'sephardi' }, { voice: 'f', tradition: 'sephardi', id: fSep.id }), false);
  assert.equal(PLAYBACK_DEPENDENCY.appliedByThisTree, true);
  assert.equal(PLAYBACK_DEPENDENCY.slowMeans, 0.7);
  assert.equal(PLAYBACK_DEPENDENCY.contractCommit, '8f37d4ba');
  const rows = [
    { id: 'a', kind: 'word', voice: 'f', tradition: 'israeli', path: 'a.mp3', status: 'tts', text: 'הִיא' },
    { id: 'b', kind: 'word', voice: 'm', tradition: 'israeli', path: 'b.mp3', status: 'tts', text: 'הִיא' },
  ];
  const small = buildClipLookup(rows, () => true);
  assert.equal(lookupClip(small, 'הִיא', 'f', 'sephardi').id, 'a', 'the Sephardi setting gets the Israeli slot');
  assert.equal(lookupClip(small, 'הִיא', 'f', 'ashkenazi').id, 'a', 'the Ashkenazi setting gets the Israeli slot too');
  assert.equal(lookupClip(small, 'הִיא', 'm', 'israeli').id, 'b');
  // an admitted accent clip (an Israeli voice reading the respelling) is the setting's own slot; an old respelled one is not
  const withOwn = buildClipLookup([...rows,
    { id: 'c', kind: 'word', voice: 'f', tradition: 'ashkenazi', path: 'c.mp3', status: 'synthetic-unreviewed', source: 'tts-respelled-israeli-voice', text: 'הִיא' },
    { id: 'd', kind: 'word', voice: 'f', tradition: 'sephardi', path: 'd.mp3', status: 'tts', source: 'paid-cloud', text: 'הִיא' }], () => true);
  const own = lookupClip(withOwn, 'הִיא', 'f', 'ashkenazi');
  assert.equal(own.id, 'c'); assert.equal(own.tradition, 'ashkenazi'); assert.equal(own.setting, 'ashkenazi');
  assert.equal(lookupClip(withOwn, 'הִיא', 'f', 'sephardi').id, 'a', 'the retired Sephardi slot is passed over');
  assert.equal(alternateClip(withOwn, 'הִיא', 'm', 'ashkenazi').id, 'c', 'the other voice\'s admitted own clip is offered first');
  assert.equal(alternateClip(withOwn, 'הִיא', 'm', 'sephardi').id, 'a', 'never the retired Sephardi slot');
});

test('the screen list is 5000 minus hidden rows and word forms, with nothing padded back', async () => {
  const { loadTier, TIER_BANDS, isHiddenRecord } = await import('../src/vocab/loader.js');
  const hidden = words.filter(isHiddenRecord);
  const forms = words.filter((e) => e.isForm && !isHiddenRecord(e));
  assert.equal(words.length, 5000);
  assert.equal(new Set(words.map((e) => e.rank)).size, 5000);
  assert.equal(new Set(words.map((e) => e.id)).size, 5000);
  assert.deepEqual(hidden.map((e) => [e.rank, e.id, e.lemma]), [
    [43, 'vedf291d8', 'יא'],
    [169, 'v96491b44', 'לעזאזל'],
    [1160, 'v86404c39', 'מזדין'],
    [3834, 'v73a6f0a9', 'זין'],
  ]);
  assert.equal(forms.length, 4);
  let loaded = 0;
  for (const t of TIER_BANDS) loaded += (await loadTier(t)).length;
  assert.equal(loaded, 5000 - hidden.length);
  assert.equal(loaded - forms.length, 4992);
});

test('the player honours options.rate: slow is 0.7× on the element (the vocab speed buttons are live)', async () => {
  const made = [];
  class A {
    constructor(url) { this.url = url; this.playbackRate = 1; made.push(this); }
    play() { queueMicrotask(() => this.onended?.()); return Promise.resolve(); }
  }
  const audio = createAudio({
    settings: { voice: 'f', congregation: 'sephardi' },
    manifest: [{ kind: 'word', id: 'i-10-w12', voice: 'f', tradition: 'israeli', status: 'tts', path: 'audio/f/israeli/word/i-10-w12.mp3', text: 'שָׁלוֹם' }],
    AudioCtor: A,
    speech: null,
    UtteranceCtor: null,
  });
  const result = await audio.play('word', 'i-10-w12', { voice: 'f', tradition: 'sephardi', rate: 'slow' });
  assert.equal(result.source, 'file');
  assert.equal(result.id, 'i-10-w12');
  assert.equal(result.fileTradition, 'israeli'); // the Sephardi setting plays the Israeli file
  assert.equal(made.length, 1);
  assert.equal(made[0].playbackRate, PLAYBACK_DEPENDENCY.slowMeans);
  assert.equal(result.rate, 0.7);
  assert.equal(PLAYBACK_DEPENDENCY.appliedByThisTree, true);
});
