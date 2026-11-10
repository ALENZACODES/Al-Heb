// Lesson integrity for a rabbi or cantor reading the course (lane C, 2026-11-10).
// Pins the liturgical, Hebrew and gloss fixes of that pass with general rules where a rule exists, and with exact
// checks where the fix is a single known item. See docs/review/LESSON-INTEGRITY-2026-11-10.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const rd = (f) => JSON.parse(fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8'));
const txt = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const main = rd('data/curriculum/lessons.json');
const lessons = main.lessons;
const byId = new Map(lessons.map((l) => [l.id, l]));
const files = lessons.filter((l) => l.id.startsWith('I-')).map((l) => rd(`data/curriculum/lessons-intermediate/${l.id}.json`));
const registry = new Map(rd('data/corpus/registry.json').entries.map((e) => [e.id, e]));
const NFC = (s) => String(s).normalize('NFC');
const ex = (lid, n) => byId.get(lid).exercises.find((e) => e.id === `${lid}-e${String(n).padStart(2, '0')}`);
const word = (lid, he) => byId.get(lid).words.find((w) => w.he === he);

/** Every English string a learner sees in a lesson (titles, goals, word glosses, exercise text). Lesson `note` fields are authoring notes and are not rendered. */
function learnerText(l) {
  const out = [['title', l.title], ...l.goals.map((g) => ['goal', g]), ...l.words.map((w) => [`word ${w.he}`, w.en])];
  for (const e of l.exercises || []) {
    for (const k of ['en', 'cue', 'task']) if (typeof e[k] === 'string') out.push([`${e.id}.${k}`, e[k]]);
    if (e.prompt?.en) out.push([`${e.id}.prompt`, e.prompt.en]);
    if (e.answer?.en) out.push([`${e.id}.answer`, e.answer.en]);
    for (const p of e.pairs || []) out.push([`${e.id}.pair`, p.en]);
    for (const ln of e.lines || []) out.push([`${e.id}.line`, ln.en]);
  }
  return out;
}

test('learner-facing lesson text has no internal project vocabulary (lanes, file names, "the corpus")', () => {
  const BAD = [/\blane \d+\b/i, /\.json\b/i, /\bthe corpus\b/i, /\bregistry\b/i, /\bproposed rate\b/i, /no example word is in this lesson/i, /the app's English line/i];
  const hits = [];
  for (const l of lessons) for (const [where, s] of learnerText(l)) for (const re of BAD) if (re.test(s)) hits.push(`${l.id} ${where}: ${s}`);
  const ct = rd('data/curriculum/class-track.json');
  for (const w of ct.weeks) for (const s of [...w.goals, ...(w.canYou || []), w.culture]) for (const re of BAD) if (re.test(s)) hits.push(`${w.id}: ${s}`);
  assert.deepEqual(hits, []);
});

test('the per-lesson intermediate files say exactly what lessons.json says', () => {
  for (const f of files) assert.deepEqual(f, Object.fromEntries(Object.entries(byId.get(f.id)).filter(([k]) => k in f)), f.id);
});

test('Priestly Blessing said by the leader is answered "Ken yehi ratzon", not Amen', () => {
  const PB = /יְבָרֶכְךָ|יִשָּׂא יְהוָה פָּנָיו|יָאֵר יְהוָה פָּנָיו/;
  let seen = 0;
  for (const l of lessons) for (const e of l.exercises || []) {
    if (e.type !== 'respond' || !/leader/i.test(e.cue) || !(PB.test(e.prompt?.he || '') || /Priestly Blessing/.test(e.cue))) continue;
    seen++;
    assert.equal(e.answer.he, 'כֵּן יְהִי רָצוֹן', `${e.id}: ${e.cue}`);
  }
  assert.ok(seen >= 2, 'the I-10 Priestly Blessing responses are still found');
  assert.match(ex('I-10', 13).cue, /kohanim/, 'the cue says when the answer is Amen instead');
});

test('no exercise teaches an Amen in the middle of a blessing (Birkat Hamazon closes with hazan et hakol)', () => {
  for (const l of lessons) for (const e of l.exercises || []) {
    if (e.type === 'respond' && e.answer?.he === 'אָמֵן') assert.notEqual(NFC(e.prompt?.he || ''), NFC('כִּי לְעוֹלָם חַסְדּוֹ'), e.id);
  }
  assert.match(ex('I-33', 9).cue, /hazan et hakol/);
});

test('zimun: "Rabotai" is glossed "Friends", never "Gentlemen", and the egalitarian wording is named', () => {
  const all = JSON.stringify(main) + JSON.stringify(files) + registry.get('zimun-opening').english;
  assert.doesNotMatch(all, /gentlemen/i);
  assert.match(ex('I-33', 1).cue, /Chaverai nevarech/);
  assert.equal(registry.get('zimun-opening').english.split('\n')[0], 'Friends, let us bless.');
});

test('Shabbat timing: a Friday-night dinner ends with Shabbat shalom; shavua tov is glossed as after Shabbat', () => {
  for (const e of byId.get('I-19').exercises) for (const ln of e.lines || []) assert.notEqual(ln.he.replace(/[!.]/g, ''), 'שָׁבוּעַ טוֹב', `${e.id}: shavua tov on Friday night`);
  assert.match(word('I-19', 'שָׁבוּעַ טוֹב').en, /Shabbat ends/);
});

test('Aleinu, Hagomel and Yom Kippur cues say what a congregation actually does', () => {
  assert.match(ex('I-08', 4).cue, /kor'im umishtachavim umodim/);
  for (const [lid, n] of [['I-10', 8], ['I-34', 2]]) assert.match(ex(lid, n).cue, /to a woman/, `${lid}-e${n}`);
  assert.match(ex('I-28', 9).cue, /ask someone you may have wronged/);
  assert.match(ex('I-32', 8).cue, /On the first night only, a third blessing/);
  assert.match(ex('I-02', 6).en, /God$/, 'ha-El is in the Hebrew, so God is in the English');
});

test('every service order says Baruch shem right after the Shema line', () => {
  const orders = rd('data/service/orders.json').orders;
  for (const [oid, o] of Object.entries(orders)) {
    const ids = o.items.map((i) => i.id);
    const i = ids.indexOf('shema-1');
    if (i >= 0) assert.equal(ids[i + 1], 'shema-2', oid);
  }
});

test('Friday-night Kiddush order is stated correctly (Genesis verses first)', () => {
  const w10 = rd('data/curriculum/class-track.json').weeks.find((w) => w.id === 'w10');
  assert.doesNotMatch(w10.culture, /wine blessing opens/i);
  const fri = rd('data/service/orders.json').orders['friday-night'].items.map((i) => i.id);
  assert.ok(fri.indexOf('kiddush-gen-2-1-3') < fri.indexOf('kiddush-shabbat-eve'));
});

test('siddur texts that quote the Torah carry the Torah pointing for every shared word (vayehi-binsoa, vezot-hatorah)', () => {
  const MARKS = /[֑-ֽ֯׀׃]/g;
  const strip = (s) => NFC(s).replace(MARKS, '');
  const skel = (w) => w.replace(/[ְ-ׇּ]/g, '');
  const verse = (book, ch, v) => rd(`data/corpus/torah/${book}/${String(ch).padStart(2, '0')}.json`).verses.find((x) => x.n === v).he;
  const cases = { 'vayehi-binsoa': [['numbers', 10, 35]], 'vezot-hatorah': [['deuteronomy', 4, 44], ['numbers', 9, 23]] };
  for (const [id, refs] of Object.entries(cases)) {
    const torah = new Map();
    for (const r of refs) for (const w of strip(verse(...r)).split(/[\s־]+/)) { const t = w.replace(/[׃,]/g, ''); if (t) torah.set(skel(t), t); }
    let compared = 0;
    for (const w of strip(registry.get(id).he).split(/[\s־]+/)) {
      const t = w.replace(/[׃,]/g, '');
      if (!t || /^ו?[בלמ]?יהו?ה$|יְהוָה/.test(skel(t)) || !torah.has(skel(t))) continue;
      compared++;
      assert.equal(t, torah.get(skel(t)), `${id}: ${t} vs the Torah's ${torah.get(skel(t))}`);
    }
    assert.ok(compared >= 6, `${id}: compared ${compared} words`);
  }
});

test('Hebrew slips fixed in this pass do not come back', () => {
  const BAD = [
    ['קוֹמָה שְׁנַיִם', 'koma is feminine: shtayim'],
    ['בֵּן כַּמָּה', 'construct ben (segol) for age'],
    ['לַשְּׂדֵה הַתְּעוּפָה', 'construct state takes no article'],
    ['לְהִתְנַסּוֹת', 'trying on clothes is limdod'],
  ];
  const hay = NFC(txt('data/curriculum/lessons.json') + txt('data/curriculum/dialogues.json') + files.map((f) => JSON.stringify(f)).join(''));
  for (const [s, why] of BAD) assert.ok(!hay.includes(NFC(s)), `${s}: ${why}`);
  const d = byId.get('I-42').exercises.find((e) => e.type === 'dialogue');
  assert.ok(d.lines.some((l) => l.he === 'חָמוּד!'), 'one boy: chamud (singular)');
  assert.ok(!NFC(registry.get('vayehi-binsoa').he).includes(NFC('וַיֹאמֶר')), 'vayomer keeps its dagesh');
});

test('glosses: gender of "to you", pause forms, "straight" vs "right", message', () => {
  assert.match(word('r10', 'לָךְ').en, /\(f\.\)/);
  assert.match(word('r14', 'לְךָ').en, /\(m\.\)/);
  assert.match(word('r12', 'אָנִי').en, /verse-end/);
  assert.match(word('r14', 'וְאָנִי').en, /verse-end/);
  for (const l of lessons) for (const w of l.words) {
    if (w.he === 'יָשָׁר') assert.doesNotMatch(w.en, /\bright\b/, `${l.id}: yashar is straight, not right`);
    if (w.he === 'הוֹדָעָה') assert.match(w.en, /message/, l.id);
  }
  assert.equal(word('I-04', 'עָלֵינוּ').en, 'upon us');
  assert.match(registry.get('hanerot-halalu').english, /in order to give thanks to your name/);
});

test('prayer notes name the Reform and Ashkenazi wording a congregant will hear', () => {
  const m = rd('data/corpus/prayer-meta.json').entries;
  assert.match(m['aleinu-1'].denominations.reform.note, /kor'im umishtachavim umodim/);
  assert.match(m['aleinu-1'].denominations.conservative.note, /shehem mishtachavim/);
  for (const id of ['kaddish-1', 'oseh-shalom']) assert.match(m[id].denominations.reform.note, /yoshvei tevel/, id);
  assert.match(m['bless-priestly-1'].denominations.reform.note, /ken yehi ratzon/);
});

test('the intermediate authoring sources carry the same fixes, so a rebuild keeps them', () => {
  const syn = txt('tools/curriculum/intermediate/syn.py'), syn2 = txt('tools/curriculum/intermediate/syn2.py'), isr = txt('tools/curriculum/intermediate/isr.py');
  assert.match(syn, /Ken yehi ratzon/);
  assert.match(syn2, /hazan et hakol/);
  assert.doesNotMatch(syn2, /Gentlemen/);
  for (const t of ['the few lines the corpus holds', 'seder blessings the corpus holds', 'Hallel text is not yet in the corpus', 'Megillah itself is not in the corpus']) assert.ok(!(syn + syn2).includes(t), t);
  assert.ok(!isr.includes('("a", "שָׁבוּעַ טוֹב!", "A good week!"),\n            task="Say the guest\'s goodbye'));
});
