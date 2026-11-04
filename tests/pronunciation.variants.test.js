// Rule-generated pronunciation variants: tools/pronunciation/build_variants.mjs -> data/pronunciation/variants/_*.json.
// The output is rule-generated and unverified by a native speaker; these tests check the rules, not the truth.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { memoDisk, PRON_ROOTS } from './helpers/memo.js';
import { join } from 'node:path';
import { buildAll, renderWord, renderText, loadStressData, shardJson, reviewCsv, parseIpaStress, SHARD_SIZE, OUT_DIR, TRADITIONS } from '../tools/pronunciation/build_variants.mjs';

const ctx = { stress: loadStressData() };
const built = memoDisk('pron-buildAll', PRON_ROOTS, () => buildAll());
const word = (he) => renderWord(he, ctx).variants;

test('known examples: shabbat/shabbos, torah/toyreh, bereshit/bereishis', () => {
  const sh = word('שַׁבָּת');
  assert.equal(sh.israeli.simple, 'shabbat'); assert.equal(sh.sephardi.simple, 'shabbat'); assert.equal(sh.ashkenazi.simple, 'shabbos');
  assert.equal(sh.israeli.ipa, 'ʃa.ˈbat'); assert.equal(sh.ashkenazi.ipa, 'ˈʃa.bɔs');
  const to = word('תּוֹרָה');
  assert.equal(to.israeli.simple, 'torah'); assert.equal(to.ashkenazi.simple, 'toyreh');
  assert.equal(to.israeli.ipa, 'to.ˈʁa'); assert.equal(to.sephardi.ipa, 'to.ˈra'); assert.equal(to.ashkenazi.ipa, 'ˈtoj.rə');
  const be = word('בְּרֵאשִׁית');
  assert.equal(be.israeli.simple, 'bereshit'); assert.equal(be.ashkenazi.simple, 'bereishis');
  assert.equal(be.israeli.ipa, 'be.ʁe.ˈʃit'); assert.equal(be.ashkenazi.ipa, 'bə.ˈrej.ʃis');
});

test('rules: kamatz, tav, holam, het/khaf, ayin/alef, resh, shva, dagesh, stress', () => {
  const b = word('בָּרוּךְ');
  assert.equal(b.israeli.ipa, 'ba.ˈʁuχ'); assert.equal(b.sephardi.ipa, 'ba.ˈrux'); assert.equal(b.ashkenazi.ipa, 'ˈbɔ.rux'); // kamatz a/a/ɔ, resh ʁ/r/r, khaf χ/x/x, Ashkenazi penultimate
  const sm = word('שְׁמַע');
  assert.equal(sm.israeli.ipa, 'ʃe.ˈma'); assert.equal(sm.sephardi.ipa, 'ʃe.ˈmaʕ'); assert.equal(sm.ashkenazi.ipa, 'ʃə.ˈma'); // ayin ∅/ʕ/∅, shva na e/e/ə
  const ha = word('הָעוֹלָם');
  assert.equal(ha.israeli.ipa, 'ha.o.ˈlam'); assert.equal(ha.ashkenazi.ipa, 'hɔ.ˈoj.lɔm'); // holam o / oj
  const ch = word('חַיִּים');
  assert.equal(ch.israeli.ipa, 'χa.ˈjim'); assert.equal(ch.sephardi.ipa, 'ħa.ˈjim'); assert.equal(ch.ashkenazi.ipa, 'ˈxa.jim'); // het χ/ħ/x
  assert.equal(word('אֲדֹנָי').sephardi.ipa, 'ʔa.do.ˈnaj'); // alef ʔ in Sephardi, Ashkenazi stress from prayerwords.json (last)
  assert.equal(word('אֲדֹנָי').ashkenazi.ipa, 'a.doj.ˈnɔj');
  assert.equal(word('יְהוָה').israeli.simple, 'adonai'); // divine name read as Adonai
  const k = word('כָּל'); assert.equal(k.israeli.ipa, 'ˈkol'); assert.equal(k.israeli.simple, 'kol'); // kamatz katan list
  assert.equal(word('חָכְמָה').israeli.ipa, 'χoχ.ˈma'); // shva after kamatz katan is silent (not L3 "after a long vowel")
  assert.equal(word('צָהֳרַיִם').israeli.ipa, 'tso.ho.ʁa.ˈjim'); // kamatz before chataf-kamatz is katan
  assert.equal(word('מֶלֶךְ').israeli.ipa, 'ˈme.leχ'); // mil'el from stress.json
  assert.equal(word('סֵפֶר').israeli.stress.syllable, 1); // mil'el from syllabify.js STRESS_EXCEPTIONS
  assert.equal(word('רוּחַ').israeli.ipa, 'ˈʁu.aχ'); // furtive patach, never stressed
  assert.equal(word('שְׁתַּיִם').israeli.ipa, 'ʃta.ˈjim'); // X1: initial shva is silent, merged into the next syllable
  assert.equal(word('מְאוֹד').israeli.ipa, 'me.ˈod'); // vav after a silent alef is a vowel letter
  const p = word('פֶּה'); assert.equal(p.israeli.ipa, 'ˈpe'); const f = word('כֵּף'); assert.equal(f.israeli.ipa, 'ˈkef'); // dagesh in pe/kaf
  assert.equal(word('גּוֹי').ashkenazi.ipa, 'ˈɡoj'); assert.equal(word('גּוֹי').ashkenazi.simple, 'goy');
  assert.equal(word('לְךָ').ashkenazi.simple, 'lekho'); // the 2ms suffix is not reduced
  assert.equal(word('מִצְוָה').ashkenazi.simple, 'mitzveh'); // unstressed final kamatz + he is reduced
});

test('running text: separators kept, maqaf joined, sof pasuq dropped, one stress entry per word', () => {
  const r = renderText('בְּכָל־לְבָבְךָ וּבְכָל־נַפְשְׁךָ׃', ctx);
  assert.equal(r.variants.israeli.simple, 'bekhol-levavekha uvekhol-nafshekha');
  assert.equal(r.variants.israeli.ipa, 'be.ˈχol-le.va.ve.ˈχa u.ve.ˈχol-naf.ʃe.ˈχa');
  assert.equal(r.variants.israeli.stress.length, 4);
  assert.equal(renderText('מַה שְׁלוֹמְךָ?', ctx).variants.israeli.simple, 'mah shelomekha?');
});

test('every record has the three variants with ipa, simple and stress; ids unique; shards <= 2000', () => {
  const ids = new Set();
  for (const rec of built.records) {
    assert.ok(!ids.has(rec.id), 'duplicate id ' + rec.id); ids.add(rec.id);
    assert.deepEqual(Object.keys(rec.variants), TRADITIONS, rec.id);
    for (const t of TRADITIONS) {
      const v = rec.variants[t];
      assert.equal(typeof v.ipa, 'string'); assert.equal(typeof v.simple, 'string'); assert.ok(Array.isArray(v.stress), rec.id);
      if (!rec.flags.includes('unpointed') && !rec.flags.includes('non-hebrew-token')) {
        assert.ok(v.ipa.length > 0 && v.simple.length > 0, `${rec.id} ${t}`);
        assert.ok(v.ipa.includes('ˈ'), `${rec.id} ${t} has a stress mark`);
        for (const s of v.stress) assert.ok(s && s.syllable >= 1 && s.syllable <= s.of && typeof s.rule === 'string', rec.id);
      }
    }
  }
  assert.equal(built.records.length, built.index.counts.records);
  for (const s of built.shards) { assert.ok(s.data.count <= SHARD_SIZE && s.data.count === s.data.records.length, s.file); assert.equal(s.data.proofread, false); assert.match(s.data.status, /not verified by a native speaker/); }
  assert.equal(built.shards.reduce((n, s) => n + s.data.count, 0), built.records.length);
});

test('covers every words.json record and every phrasebook entry and registry line', () => {
  const words = JSON.parse(fs.readFileSync(join(OUT_DIR, '..', '..', 'vocab', 'words.json'), 'utf8')).words;
  const phrasebook = JSON.parse(fs.readFileSync(join(OUT_DIR, '..', '..', 'corpus', 'phrasebook.json'), 'utf8')).entries;
  const registry = JSON.parse(fs.readFileSync(join(OUT_DIR, '..', '..', 'corpus', 'registry.json'), 'utf8')).entries;
  const ids = new Set(built.records.map((r) => r.id));
  for (const w of words) assert.ok(ids.has(w.id), w.id);
  for (const e of phrasebook) assert.ok(ids.has(e.id), e.id);
  for (const e of registry) { const n = e.he.split('\n').length; if (n === 1) assert.ok(ids.has(e.id), e.id); else for (let i = 1; i <= n; i++) assert.ok(ids.has(`${e.id}-l${i}`), `${e.id}-l${i}`); }
  assert.equal(built.records.length, words.length + phrasebook.length + registry.reduce((n, e) => n + e.he.split('\n').length, 0));
});

test('deterministic: a second build and the files on disk are byte-identical to this build', () => {
  const again = buildAll();
  assert.equal(JSON.stringify(again.shards), JSON.stringify(built.shards));
  assert.equal(JSON.stringify(again.index), JSON.stringify(built.index));
  for (const s of built.shards) {
    const onDisk = fs.readFileSync(join(OUT_DIR, s.file), 'utf8');
    assert.equal(onDisk, shardJson(s.data), `${s.file} is stale: run node tools/pronunciation/build_variants.mjs`);
  }
  assert.equal(fs.readFileSync(join(OUT_DIR, '_index.json'), 'utf8'), JSON.stringify(built.index, null, 1) + '\n');
  assert.equal(fs.readFileSync(join(OUT_DIR, '_review.csv'), 'utf8'), reviewCsv(built.review));
});

test('review CSV lists the ambiguous records with a header and one row each', () => {
  const csv = fs.readFileSync(join(OUT_DIR, '_review.csv'), 'utf8').split('\n').filter(Boolean);
  assert.equal(csv[0], 'id,source,he,flags,israeli_simple,ashkenazi_simple,israeli_ipa,note');
  assert.equal(csv.length - 1, built.review.length);
  assert.equal(built.review.length, built.index.counts.review);
  assert.ok(built.review.length > 0);
  for (const f of ['unpointed', 'possible-segolate', 'ipa-differs-from-words.json']) assert.ok(built.review.some((r) => r.flags.includes(f)), f);
});

test('parseIpaStress reads stress position from an existing words.json ipa string', () => {
  assert.deepEqual(parseIpaStress('/(ʔ)aˈni/'), { syllables: 2, fromEnd: -1, cleaned: 'ʔaˈni' });
  assert.deepEqual(parseIpaStress('/ˈba.jit/ [ˈbɐ.(j)it]'), { syllables: 2, fromEnd: -2, cleaned: 'ˈba.jit' });
  assert.equal(parseIpaStress('/ben/'), null);
});
