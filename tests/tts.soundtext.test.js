// Tests for the sound-word respelling engine (tools/tts/soundtext.mjs) and the generated data/tts/soundwords.*.json.
//
// What these tests are and are not:
//  - The regression rows come from stored data (data/pronunciation/runtime/rules.json, lookup-*.json, prayerwords.json,
//    docs/pronunciation/VARIANTS.md "Known examples"). The stored IPA rows were produced by the same rule engine the
//    respelling reuses, so the IPA-row tests check the RESPELLING layer (alphabet, hyphens, stress accent, flags),
//    not the linguistics. prayerwords.json is hand-written and independent: it is compared on stress and syllable count only.
//  - Nothing here says how any TTS voice reads the output. Nobody has listened to any item.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { soundText, confidenceOf, FLAG_INFO, MODELS, TRADITIONS, flatten } from '../tools/tts/soundtext.mjs';
import { buildAll, serialize } from '../tools/tts/build_soundwords.mjs';
import { loadManifestFull } from '../tools/audio/manifest_io.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rd = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const T_INDEX = { israeli: 0, sephardi: 1, ashkenazi: 2 };

/** Independent oracle: stored IPA string -> expected respelling (language 'es' or 'it'). Written separately from the engine. */
function oracle(ipa, lang) {
  const throat = lang === 'es' ? 'j' : 'kh';
  const SYM = { a: 'a', e: 'e', i: 'i', o: 'o', u: 'u', 'ɔ': 'o', 'ə': 'e', ej: 'ei', oj: 'oi', b: 'b', v: 'v', d: 'd', h: 'h', z: 'z', t: 't', k: 'k', l: 'l', m: 'm', n: 'n', s: 's', p: 'p', f: 'f', ts: 'ts', r: 'r', 'ʁ': 'r', 'ʃ': 'sh', 'ɡ': 'g', 'χ': throat, x: throat, 'ħ': throat, 'ʔ': '', 'ʕ': '' };
  const isV = (s) => /^(ej|oj|[aeiouɔə])$/.test(s);
  const pieces = ipa.split('.').map((p) => ({ st: p.startsWith('ˈ'), toks: [...p.replace(/ˈ/g, '').matchAll(/ts|ej|oj|./gu)].map((m) => m[0]) }));
  const merged = [];
  for (const p of pieces) {
    if (!p.toks.length) { if (p.st && merged.length) merged.at(-1).st = true; continue; }
    if (!p.toks.some(isV) && merged.length) { merged.at(-1).toks.push(...p.toks); merged.at(-1).st ||= p.st; continue; }
    merged.push(p);
  }
  while (merged.length > 1 && !merged[0].toks.some(isV)) { const a = merged.shift(); merged[0].toks = [...a.toks, ...merged[0].toks]; merged[0].st ||= a.st; }
  let si = merged.findIndex((p) => p.st); if (si < 0) si = merged.length - 1;
  return merged.map((p, k) => {
    let out = ''; let vowelSeen = false; let accented = false;
    p.toks.forEach((tk, j) => {
      if (tk === 'j') { out += vowelSeen ? 'i' : 'y'; return; }
      let g = SYM[tk];
      if (g === undefined) throw new Error('oracle: unknown symbol ' + tk);
      if (tk === 'ɡ' && ['e', 'i', 'ə', 'ej'].includes(p.toks[j + 1])) g = lang === 'es' ? 'gu' : 'gh';
      if (isV(tk)) { vowelSeen = true; if (k === si && !accented) { g = 'áéíóú'['aeiou'.indexOf(g[0])] + g.slice(1); accented = true; } }
      out += g;
    });
    return out;
  }).join('-');
}

// ---------------------------------------------------------------------------------------------------------------
// 1. Source-backed regression rows
// ---------------------------------------------------------------------------------------------------------------
const rules = rd('data/pronunciation/runtime/rules.json');
const RULE_ROWS = rules.pages.flatMap((pg) => (pg.examples || []).map((ex, i) => ({ source: `data/pronunciation/runtime/rules.json#${pg.id}[${i}]`, he: ex.he, ipa: ex.ipa })));

const lookupWords = {};
for (const f of fs.readdirSync(path.join(ROOT, 'data/pronunciation/runtime')).filter((x) => /^lookup-\d+\.json$/.test(x)).sort()) Object.assign(lookupWords, rd(`data/pronunciation/runtime/${f}`).w);
const LOOKUP_KEYS = Object.keys(lookupWords).sort();
const LOOKUP_ROWS = LOOKUP_KEYS.filter((_, i) => i % 120 === 0).map((he) => ({ source: `data/pronunciation/runtime/lookup-*.json["${he}"]`, he, ipa: lookupWords[he].slice(0, 3) }));

test('there are at least 40 source-backed regression rows', () => {
  const distinct = new Set([...RULE_ROWS, ...LOOKUP_ROWS].map((r) => r.he));
  assert.ok(RULE_ROWS.length >= 40, `rules.json rows: ${RULE_ROWS.length}`);
  assert.ok(distinct.size >= 40, `distinct rows: ${distinct.size}`);
  assert.ok(LOOKUP_ROWS.length >= 40, `lookup rows: ${LOOKUP_ROWS.length}`);
});

for (const row of [...RULE_ROWS, ...LOOKUP_ROWS]) {
  test(`stored IPA row -> respelling, ${row.he} (${row.source})`, () => {
    for (const t of TRADITIONS) {
      const ipa = row.ipa[T_INDEX[t]];
      for (const lang of ['es', 'it']) {
        const got = soundText(row.he, t, { lang });
        if (!got.voiced) { assert.fail(`${row.he} ${t}: unexpectedly unvoiced (${got.flags})`); }
        assert.equal(got.soundtext, oracle(ipa, lang), `${row.he} ${t} ${lang} from stored IPA ${ipa}`);
      }
    }
  });
}

// docs/pronunciation/VARIANTS.md "Known examples checked by the test": shabbat, torah, bereshit with their IPA.
const DOC_EXAMPLES = [
  { he: 'שַׁבָּת', ipa: { israeli: 'ʃa.ˈbat', ashkenazi: 'ˈʃa.bɔs' }, want: { israeli: 'sha-bát', ashkenazi: 'shá-bos' } },
  { he: 'תּוֹרָה', ipa: { israeli: 'to.ˈʁa', ashkenazi: 'ˈtoj.rə' }, want: { israeli: 'to-rá', ashkenazi: 'tói-re' } },
  { he: 'בְּרֵאשִׁית', ipa: { israeli: 'be.ʁe.ˈʃit', ashkenazi: 'bə.ˈrej.ʃis' }, want: { israeli: 'be-re-shít', ashkenazi: 'be-réi-shis' } },
];
for (const ex of DOC_EXAMPLES) {
  test(`VARIANTS.md known example ${ex.he}: exact strings`, () => {
    for (const t of ['israeli', 'ashkenazi']) {
      assert.equal(oracle(ex.ipa[t], 'es'), ex.want[t], 'the expected string follows from the IPA printed in docs/pronunciation/VARIANTS.md');
      assert.equal(soundText(ex.he, t).soundtext, ex.want[t]);
    }
  });
}

// prayerwords.json is hand-written (independent of the engine). Compare stress position and syllable count only.
const prayer = rd('data/pronunciation/prayerwords.json');
const STRESS_IDX = (kind, n) => ({ last: n - 1, 'second-to-last': n - 2, first: 0 })[kind];
// Known vowel disagreements (stress and syllable count agree) are asserted in the last test of this section, so a fix is noticed.
for (const w of prayer.words) {
  for (const t of ['israeli', 'ashkenazi']) {
    test(`prayerwords.json ${w.id} ${t}: stress position and syllable count`, () => {
      const r = soundText(w.he, t);
      assert.ok(r.voiced);
      const sy = r.words[0].syllables;
      const row = w[t];
      assert.equal(r.words[0].stressIndex, STRESS_IDX(row.stress, sy.length), `${w.he} ${t}: row stress ${row.stress}, got ${sy.join('-')}`);
      const rowSyl = row.say.split(/\s|\//)[0].replace(/\(.*$/, '').split('-').length;
      assert.equal(sy.length, rowSyl, `${w.he} ${t}: syllable count vs "${row.say}"`);
    });
  }
}
test('prayerwords.json vowel disagreements are still real (two Ashkenazi words; remove when data or rules change)', () => {
  assert.equal(soundText('אַתָּה', 'ashkenazi').soundtext, 'á-te');
  assert.match(prayer.words.find((w) => w.id === 'atah').ashkenazi.say, /toh/i);
  assert.equal(soundText('שָׁלוֹם', 'ashkenazi').soundtext, 'shó-loim');
  assert.match(prayer.words.find((w) => w.id === 'shalom').ashkenazi.say, /SHO-lom/);
});

// ---------------------------------------------------------------------------------------------------------------
// 2. Behaviour
// ---------------------------------------------------------------------------------------------------------------
test('traditions, models and arguments', () => {
  assert.deepEqual(TRADITIONS, ['israeli', 'sephardi', 'ashkenazi']);
  assert.deepEqual(Object.keys(MODELS).sort(), [...TRADITIONS].sort());
  assert.throws(() => soundText('שָׁלוֹם', 'yemenite'), RangeError);
  assert.throws(() => soundText('שָׁלוֹם', 'israeli', { lang: 'fr' }), RangeError);
});

test('words without niqqud are refused, not guessed (unvoiced)', () => {
  for (const he of ['שלום', 'א', 'בּ', 'שׁ', 'שָׁלוֹם שבת']) {
    for (const t of TRADITIONS) {
      const r = soundText(he, t);
      assert.equal(r.voiced, false, he);
      assert.equal(r.soundtext, '');
      assert.equal(r.confidence, 'unvoiced');
      assert.ok(r.flags.includes('unpointed'));
    }
  }
});

test('language slot parameter changes only the throat sound and soft g', () => {
  assert.equal(soundText('בָּרוּךְ', 'israeli', { lang: 'es' }).soundtext, 'ba-rúj');
  assert.equal(soundText('בָּרוּךְ', 'israeli', { lang: 'it' }).soundtext, 'ba-rúkh');
  assert.equal(soundText('גִּימֶל', 'israeli', { lang: 'es' }).soundtext, 'gui-mél');
  assert.equal(soundText('גִּימֶל', 'israeli', { lang: 'it' }).soundtext, 'ghi-mél');
});

test('Ashkenazi model option: lithuanian changes cholam only', () => {
  const p = soundText('תּוֹרָה', 'ashkenazi', { ashkModel: 'polish' }).soundtext;
  const l = soundText('תּוֹרָה', 'ashkenazi', { ashkModel: 'lithuanian' }).soundtext;
  assert.equal(p, 'tói-re');
  assert.equal(l, 'téi-re');
  assert.equal(soundText('שַׁבָּת', 'ashkenazi', { ashkModel: 'lithuanian' }).soundtext, 'shá-bos');
});

test('tradition differences that the stored data states', () => {
  assert.equal(soundText('בָּרוּךְ', 'israeli').soundtext, 'ba-rúj'); // kamatz a, final stress
  assert.equal(soundText('בָּרוּךְ', 'ashkenazi').soundtext, 'bó-ruj'); // kamatz o, penultimate stress (prayerwords.json BO-rukh)
  assert.equal(soundText('שַׁבָּת', 'ashkenazi').soundtext, 'shá-bos'); // tav without dagesh = s
  // consonants.json tav notes: "Yit-gadal vs Yis-gadal"; a tav with dagesh stays t in every tradition
  assert.match(soundText('יִתְגַּדַּל', 'israeli').soundtext, /^yit-/);
  assert.match(soundText('יִתְגַּדַּל', 'ashkenazi').soundtext, /^yis-/);
  assert.match(soundText('תּוֹרָה', 'ashkenazi').soundtext, /^t/);
});

test('Sephardi equals Israeli in this alphabet; pharyngeals are flagged, not written', () => {
  for (const he of ['עַל', 'חַי', 'שָׁלוֹם', 'בָּרוּךְ']) {
    const i = soundText(he, 'israeli'); const s = soundText(he, 'sephardi');
    assert.equal(s.soundtext, i.soundtext, he);
  }
  assert.ok(soundText('עַל', 'sephardi').flags.includes('pharyngeal-merged'));
  assert.ok(soundText('חַי', 'sephardi').flags.includes('pharyngeal-merged'));
  assert.ok(!soundText('עַל', 'israeli').flags.includes('pharyngeal-merged'));
  assert.equal(soundText('עַל', 'sephardi').confidence, 'medium');
  assert.equal(soundText('עַל', 'israeli').confidence, 'high');
});

test('confidence: high only with no flag; hard flags give low; soft flags give medium', () => {
  assert.equal(confidenceOf([], true), 'high');
  assert.equal(confidenceOf(['final-stress-assumed'], true), 'medium');
  assert.equal(confidenceOf(['final-stress-assumed', 'shva-heuristic-L3'], true), 'low');
  assert.equal(confidenceOf(['unpointed'], false), 'unvoiced');
  const r = soundText('שָׁלוֹם', 'israeli'); // stress from the short prayerwords list: flagged
  assert.equal(r.confidence, 'medium');
  assert.ok(r.flags.includes('stress-from-small-list'));
  const mono = soundText('עַל', 'israeli');
  assert.equal(mono.confidence, 'high');
  assert.deepEqual(mono.flags, []);
  const unknown = soundText('הִנֵּה', 'israeli'); // multi-syllable, not on any stress list
  assert.ok(unknown.flags.includes('final-stress-assumed'));
  assert.ok(soundText('בְּרֵאשִׁית', 'israeli').flags.includes('mobile-shva'));
  assert.ok(soundText('הִנֵּה', 'ashkenazi').flags.includes('ashk-penultimate-default'));
});

test('phrases: punctuation kept, template ellipsis flagged, maqaf chain marks only the last part', () => {
  const q = soundText('כַּמָּה זֶה עוֹלֶה?', 'israeli');
  assert.ok(q.soundtext.endsWith('?'));
  assert.ok(soundText('אֲנִי מִ...', 'israeli').flags.includes('template-ellipsis'));
  const m = soundText('בְּ־תוֹךְ', 'israeli');
  assert.ok(m.flags.includes('maqaf-compound'));
  assert.equal((m.soundtext.match(/[áéíóú]/g) || []).length, 1);
});

test('options: accents and hyphens can be dropped; flatten agrees', () => {
  const full = soundText('שָׁלוֹם', 'israeli').soundtext;
  assert.equal(soundText('שָׁלוֹם', 'israeli', { accents: false, hyphens: false }).soundtext, flatten(full));
  assert.equal(flatten(full), 'shalom');
});

// ---------------------------------------------------------------------------------------------------------------
// 3. Property tests over every manifest item
// ---------------------------------------------------------------------------------------------------------------
const manifest = loadManifestFull(ROOT);
const HAS_VOWEL_SIGN = /[ְ-ׇ]/;
const HEBREW = /[֐-׿]/;
const ALLOWED = /^[a-záéíóú .,?!-]+$/;

for (const t of TRADITIONS) {
  test(`properties over the whole manifest, ${t}`, () => {
    const seen = new Set();
    let voiced = 0; let unvoiced = 0;
    for (const e of manifest) {
      if (e.tradition !== t) continue;
      const key = `${e.kind}/${e.id}`;
      if (seen.has(key)) continue; // the m and f voices share one text
      seen.add(key);
      const r = soundText(e.text, t);
      assert.deepEqual(r.flags.filter((f) => !FLAG_INFO[f]), [], `${key}: unknown flag`);
      if (!r.voiced) {
        unvoiced++;
        assert.equal(r.soundtext, '', key);
        assert.equal(r.confidence, 'unvoiced', key);
        continue;
      }
      voiced++;
      assert.ok(r.soundtext.length > 0, `${key}: empty output`);
      assert.ok(!HEBREW.test(r.soundtext), `${key}: Hebrew left in ${r.soundtext}`);
      assert.match(r.soundtext, ALLOWED, `${key}: character class ${r.soundtext}`);
      const toks = r.soundtext.split(' ');
      const total = (r.soundtext.match(/[áéíóú]/g) || []).length;
      if (!r.flags.includes('maqaf-compound')) {
        for (const tok of toks) assert.equal((tok.match(/[áéíóú]/g) || []).length, 1, `${key}: stress mark not exactly once in "${tok}" of "${r.soundtext}"`);
      } else assert.ok(total >= 1 && total <= toks.length, `${key}: ${r.soundtext}`);
      // idempotent: same call again, and the NFD form of the same text
      assert.deepEqual(soundText(e.text, t), r, `${key}: second call differs`);
      assert.equal(soundText(e.text.normalize('NFD'), t).soundtext, r.soundtext, `${key}: NFD input differs`);
      // confidence is a function of the flags
      assert.equal(r.confidence, confidenceOf(r.flags, true), key);
      if (r.confidence === 'high') assert.deepEqual(r.flags, [], key);
      if (r.confidence === 'low') assert.ok(r.flags.some((f) => FLAG_INFO[f].hard), key);
      // no vowel signs anywhere in the text => refused
      assert.ok(HAS_VOWEL_SIGN.test(e.text), `${key}: voiced without any vowel sign`);
    }
    assert.ok(voiced > 3000, `voiced ${voiced}`);
    assert.ok(unvoiced >= 30, `unvoiced ${unvoiced}`);
  });
}

test('items without any vowel sign are all unvoiced (Israeli manifest)', () => {
  for (const e of manifest) {
    if (e.tradition !== 'israeli' || e.voice !== 'm') continue;
    if (!HAS_VOWEL_SIGN.test(e.text)) assert.equal(soundText(e.text, 'israeli').voiced, false, e.id);
  }
});

// ---------------------------------------------------------------------------------------------------------------
// 4. Generated files
// ---------------------------------------------------------------------------------------------------------------
test('data/tts/soundwords.*.json: complete, current and honestly summarised', () => {
  const built = buildAll();
  for (const t of TRADITIONS) {
    const file = path.join(ROOT, 'data', 'tts', `soundwords.${t}.json`);
    assert.ok(fs.existsSync(file), `${file} missing: run node tools/tts/build_soundwords.mjs`);
    const onDisk = fs.readFileSync(file, 'utf8');
    assert.equal(onDisk, serialize(built[t]), `${t}: stale, run node tools/tts/build_soundwords.mjs`);
    const d = JSON.parse(onDisk);
    // every manifest item of this tradition is present with its exact Hebrew text
    const want = new Map();
    for (const e of manifest) if (e.tradition === t) want.set(`${e.kind}/${e.id}`, e.text);
    const got = new Map(d.items.map((i) => [`${i.kind}/${i.id}`, i]));
    assert.equal(got.size, want.size);
    for (const [k, he] of want) assert.equal(got.get(k)?.he, he, k);
    // required fields
    for (const i of d.items) {
      assert.deepEqual(Object.keys(i).filter((k) => ['id', 'he', 'soundtext', 'confidence', 'flags'].includes(k)).sort(), ['confidence', 'flags', 'he', 'id', 'soundtext']);
      assert.ok(Array.isArray(i.flags));
    }
    // summary equals a recount
    const recount = { high: 0, medium: 0, low: 0, unvoiced: 0 };
    for (const i of d.items) recount[i.confidence]++;
    assert.deepEqual(d.summary.byConfidence, recount);
    assert.equal(d.summary.items, d.items.length);
    assert.equal(d.ttsLanguageToken, 'es');
    assert.equal(d.model, MODELS[t]);
    assert.match(d.status, /never listened to/);
    // every flag used has a legend entry
    for (const i of d.items) for (const f of i.flags) assert.ok(d.flagLegend[f], `${t}: ${f} not in legend`);
  }
});

test('ids in the generated files that are Aramaic carry the aramaic flag and are never high', () => {
  for (const t of TRADITIONS) {
    const d = rd(`data/tts/soundwords.${t}.json`);
    const kaddish = d.items.filter((i) => /^kaddish-1(-|$)/.test(i.id) && i.confidence !== 'unvoiced');
    assert.ok(kaddish.length > 5);
    for (const i of kaddish) { assert.ok(i.flags.includes('aramaic'), i.id); assert.equal(i.confidence, 'low', i.id); }
  }
});
