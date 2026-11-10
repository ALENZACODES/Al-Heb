#!/usr/bin/env node
// Builds data/talk/terms.json: synagogue and holiday words the translation pack gets wrong, with what it writes instead.
//   node tools/talk/nmt/terms.mjs
// Each seed word is put into three plain carrier sentences and sent through the shipped pack. Whatever the pack writes in the
// word's place, when it is not the wanted word, is recorded as a wrong rendering. On the screen (src/talk/nmt/postedit.js) a wrong
// rendering is replaced only when the source line holds the seed word AND the output holds that exact wrong rendering.
// Words with a second everyday meaning (סדר, הגדה, עלייה, מחזור) are left out on purpose.
import { writeFileSync } from 'node:fs';
import { loadDirection } from './node-runtime.mjs';

// [Hebrew forms as written without points], wanted English. Only words with one everyday meaning.
const HE_EN = [
  [['כיפה', 'כיפות'], 'kippah'], [['קידוש'], 'kiddush'], [['סוכה'], 'sukkah'], [['טלית', 'טליתות'], 'tallit'], [['תפילין'], 'tefillin'],
  [['מזוזה', 'מזוזות'], 'mezuzah'], [['הבדלה'], 'havdalah'], [['חזן'], 'cantor'], [['חזנית'], 'cantor'], [['שופר'], 'shofar'], [['מצה', 'מצות'], 'matzah'],
  [['הפטרה'], 'haftarah'], [['דרשה'], 'sermon'], [['גבאי'], 'gabbai'], [['קדיש'], 'kaddish'], [['לולב'], 'lulav'], [['אתרוג'], 'etrog'],
];
// Left out because the Hebrew spelling has a second everyday meaning the pack may have translated correctly:
// חלה (applies, fell ill), סידור and סידורים (arrangement, errands), סוכות (the festival), מניין (from where), מקווה (hopes), רב (much), שבת (Saturday),
// סדר (order), הגדה (bank, tale), עלייה (rise, attic), מחזור (cycle), חופה (canopy is right), חנוכייה (menorah is right).
// [English forms, lower case], wanted Hebrew
const EN_HE = [
  [['prayer book'], 'סידור'], [['kippah', 'yarmulke'], 'כיפה'], [['challah'], 'חלה'], [['kiddush'], 'קידוש'], [['cantor'], 'חזן'], [['sermon'], 'דרשה'],
  [['tallit'], 'טלית'], [['sukkah'], 'סוכה'], [['mezuzah'], 'מזוזה'], [['shofar'], 'שופר'], [['matzah'], 'מצה'], [['minyan'], 'מניין'], [['havdalah'], 'הבדלה'],
  [['kaddish'], 'קדיש'], [['tefillin'], 'תפילין'], [['haftarah'], 'הפטרה'],
];
const HE_CARRIERS = [[(w) => `איפה ה${w}?`, /^where(?:'s| is| are) (?:the |my )?(.+?)\?$/i], [(w) => `ראיתי את ה${w}.`, /^i (?:saw|have seen|'ve seen) (?:the |a |an )?(.+?)\.$/i], [(w) => `זה ${w}.`, /^(?:it's|it is|this is|that's|that is) (?:a |an |the )?(.+?)\.$/i]];
const EN_CARRIERS = [[(w) => `Where is the ${w}?`, /^(?:איפה|היכן) (?:נמצא |נמצאת )?ה?(.+?)\?$/], [(w) => `I saw the ${w}.`, /^ראיתי את ה?(.+?)\.$/], [(w) => `This is a ${w}.`, /^(?:זה|זאת|זו|זהו|זוהי) (.+?)\.$/]];

const he = await loadDirection('he-en'); const en = await loadDirection('en-he');
const terms = []; const termsEnHe = []; const log = [];
for (const [forms, want] of HE_EN) {
  const wrong = new Set();
  for (const f of forms) for (const [mk, re] of HE_CARRIERS) {
    const out = await he.translate(mk(f), { beams: 2 }); const m = re.exec(out);
    log.push(`${mk(f)} => ${out}`);
    if (!m) continue;
    const got = m[1].trim().replace(/^(?:the|a|an) /i, '');
    const base = want.toLowerCase();
    if (got && !got.toLowerCase().startsWith(base.slice(0, Math.max(4, base.length - 2))) && got.split(' ').length <= 3) wrong.add(got);
  }
  if (wrong.size) terms.push({ he: forms, en: want, wrong: [...wrong].sort((a, b) => b.length - a.length) });
}
for (const [forms, want] of EN_HE) {
  const wrong = new Set();
  for (const f of forms) for (const [mk, re] of EN_CARRIERS) {
    const out = await en.translate(mk(f), { beams: 2 }); const m = re.exec(out);
    log.push(`${mk(f)} => ${out}`);
    if (!m) continue;
    const got = m[1].trim();
    if (got && got !== want && got !== 'ה' + want && got.split(' ').length <= 3) wrong.add(got);
  }
  if (wrong.size) termsEnHe.push({ en: forms, he: want, wrong: [...wrong].sort((a, b) => b.length - a.length) });
}
const file = new URL('../../../data/talk/terms.json', import.meta.url);
writeFileSync(file, JSON.stringify({ schema: 'alef.talk.terms.v1', note: 'Synagogue and holiday words the Talk language pack renders wrongly, found by tools/talk/nmt/terms.mjs. A wrong rendering is replaced only when the source line holds the word and the output holds that exact rendering. Not yet checked by a native speaker.', terms, termsEnHe }, null, 1) + '\n');
if (process.argv.includes('-v')) console.log(log.join('\n'));
console.log(`terms.json: ${terms.length} Hebrew-to-English, ${termsEnHe.length} English-to-Hebrew`);
