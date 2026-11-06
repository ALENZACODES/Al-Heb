import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { stripPoints, filterEntries } from '../src/vocab/model.js';
import { fold, matchBand, rankEntries, isExactBand, BAND } from '../src/vocab/rank.js';
import { transliterate } from '../src/pronunciation/transliterate.js';
import { buildClipLookup, lookupClip, planIsExactFile, CLIP_RATES } from '../src/vocab/clips.js';
import { lookupFromDisk } from '../tools/vocab/build-clip-lookup.mjs';

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

test('Hi: no English gloss is the greeting; היא is the transliteration; letter matches follow', () => {
  const ranked = rankEntries(content, 'Hi', tradOf('sephardi'));
  const exact = ranked.filter((x) => isExactBand(x.band));
  const related = ranked.filter((x) => !isExactBand(x.band));
  assert.deepEqual(show(exact), [[BAND.translit, 38, 'היא', 'she, it']]);
  assert.equal(exact.some((x) => x.band <= BAND.sense), false);
  assert.ok(related.length > 200);
  assert.deepEqual(show(related.slice(0, 6)), [
    [BAND.substring, 3, 'זה', 'this, this one'],
    [BAND.substring, 8, 'אשר', 'that, which, who (relative; formal)'],
    [BAND.substring, 32, 'צריך', 'needing, in need of (something)'],
    [BAND.substring, 34, 'חשב', 'to think'],
    [BAND.substring, 37, 'כאן', 'here, at this place'],
    [BAND.substring, 47, 'דבר', 'thing'],
  ]);
  assert.ok(related.every((x) => x.band > exact[0].band));
  const shalom = content.find((e) => e.lemma === 'שלום' && e.pos === 'noun');
  assert.equal(shalom.gloss, 'peace');
  assert.equal(ranked.some((x) => x.entry.id === shalom.id), false);
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
  assert.ok(fSep && fSep.path.startsWith('audio/f/sephardi/'));
  assert.ok(mAsh && mAsh.path.startsWith('audio/m/ashkenazi/'));
  assert.equal(fSep.tradition, 'sephardi');
  assert.notEqual(fSep.path, mAsh.path);
  assert.ok(existsSync(new URL('../' + fSep.path, import.meta.url)));
  assert.deepEqual(CLIP_RATES, ['normal', 'slow']);
  assert.equal(planIsExactFile({ source: 'file', via: 'exact', url: '/x', voice: 'f', tradition: 'sephardi', id: fSep.id }, { voice: 'f', tradition: 'sephardi', id: fSep.id }), true);
  assert.equal(planIsExactFile({ source: 'file', via: 'equivalent', fileTradition: 'israeli', url: '/x', voice: 'f', tradition: 'sephardi', id: 'other' }, { voice: 'f', tradition: 'sephardi', id: fSep.id }), false);
  assert.equal(planIsExactFile({ source: 'tts-fallback', voice: 'f', tradition: 'sephardi' }, { voice: 'f', tradition: 'sephardi', id: fSep.id }), false);
  const rows = [
    { id: 'a', kind: 'word', voice: 'f', tradition: 'israeli', path: 'a.mp3', status: 'tts', text: 'הִיא' },
    { id: 'b', kind: 'word', voice: 'm', tradition: 'israeli', path: 'b.mp3', status: 'tts', text: 'הִיא' },
  ];
  const small = buildClipLookup(rows, () => true);
  assert.equal(lookupClip(small, 'הִיא', 'f', 'sephardi'), null);
  assert.equal(lookupClip(small, 'הִיא', 'm', 'israeli').id, 'b');
});
