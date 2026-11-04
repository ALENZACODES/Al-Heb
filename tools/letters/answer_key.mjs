#!/usr/bin/env node
// Teacher answer key, A4 + US Letter: the expected answers for the printable sets, all derived from the same models the sheets use (so the key
// cannot drift from the sheets): First 10 minutes (word check + the 20-step ladder with pointed forms), the 27 letter forms (name, sound,
// gematria), the cursive word lists, the niqqud example words (6 per sign), and the Priestly Blessing/Shema pronunciations in all three
// traditions. Transliterations are machine-made (src/pronunciation/transliterate.js) and glosses come from the course data: DRAFT.
// Usage: node tools/letters/answer_key.mjs [--html-only]   Output: docs/workbook/alef-answer-key-<a4|letter>.pdf (+ html/)
import { fileURLToPath } from 'node:url';
import { readJson, esc, baseCss, wrapHtml, buildEditions, buildFirstDayModel, letterLabel } from './firstday_pages.mjs';
import { PAPERS } from './workbook.mjs';
import { buildCursiveModel } from './cursive_words.mjs';
import { buildNiqqudModel } from './niqqud_workbook.mjs';
import { buildReadAloudModel, TRADITIONS } from './readaloud_sheets.mjs';
import { transliterate } from '../../src/pronunciation/transliterate.js';

export const KEY_DRAFT = 'TEACHER COPY, DRAFT: answers derived from course data, not reviewed by a Hebrew teacher; transliteration machine-made; not tested with learners.';
const tr = (he) => transliterate(he, { scheme: 'siddur', tradition: 'israeli' });
const he = (s) => `<span class="he print">${esc(s)}</span>`;

/** Pure model: every table of the key as plain rows. */
export function buildKeyModel() {
  const fd = buildFirstDayModel();
  const letters = readJson('data/letters/letters.json');
  return {
    firstday: { words: fd.words.map((w) => ({ he: w.he, bare: w.bare, sound: w.sound, gloss: w.gloss })), checkAnswer: fd.words[0], ladder: fd.stages.flatMap((s) => s.steps.map((x) => ({ n: x.n, stage: s.label, shown: x.shown, word: x.word, say: tr(x.word), gloss: x.gloss, hint: x.hintAvailable }))) },
    letters: letters.map((l, i) => ({ n: i + 1, id: l.id, name: letterLabel(l), he: l.he, gematria: l.gematria, ipa: l.sound.ipa, sound: l.sound.en })),
    cursive: buildCursiveModel().map((b) => ({ n: b.number, name: b.name, glyph: b.glyph, words: b.words.map((w) => ({ he: w.he, bare: w.bare, translit: w.translit, en: w.en })) })),
    niqqud: buildNiqqudModel().sections.map((s) => ({ id: s.id, name: s.name, shape: s.shape, sound: s.sound, words: s.words.map((w) => ({ he: w.he, translit: w.translit, en: w.en })) })),
    blessing: buildReadAloudModel().groups.filter((g) => ['shema', 'priestly'].includes(g.key)).flatMap((g) => g.phrases)
  };
}

/** @param {'a4'|'letter'} paperId */
export function buildKeyHtml(paperId) {
  const paper = PAPERS[paperId]; const k = buildKeyModel();
  const css = baseCss(paper) + `table.t{border-collapse:collapse;width:100%;font-size:8.6pt;margin:1mm 0 2mm}.t td,.t th{border-bottom:.2mm solid #999;padding:.7mm 1.5mm;text-align:left;vertical-align:top}.t .he{font-size:14pt;line-height:1.2}h2{margin:2mm 0 1mm}.cols{columns:2;column-gap:6mm}.cols h3{break-after:avoid}.cols table{break-inside:avoid}`;
  const pages = [];
  pages.push({ kind: 'front', title: 'Teacher answer key', fields: false, body: `<h1>Teacher answer key</h1><p>Expected answers for the ALEF printable sets: First 10 minutes, the cursive words workbook, the vowel signs (niqqud) workbook and the read-aloud sheets. The vocabulary flashcards carry their own answers on the card.</p>
<div class="notice"><b>${esc(KEY_DRAFT)}</b> Pronunciation shown is Modern Israeli unless a column says otherwise. Where a learner reads a word differently, check the community's custom before marking it wrong.</div>
<h2>First 10 minutes: the three words</h2><table class="t"><thead><tr><th>Word</th><th>Unpointed</th><th>Sound</th><th>Meaning</th></tr></thead><tbody>${k.firstday.words.map((w) => `<tr><td class="he print">${esc(w.he)}</td><td class="he print">${esc(w.bare)}</td><td>${esc(w.sound)}</td><td>${esc(w.gloss)}</td></tr>`).join('')}</tbody></table>
<p><b>Check question &ldquo;Which one says shalom?&rdquo;:</b> ${he(k.firstday.checkAnswer.he)} (${esc(k.firstday.checkAnswer.sound)}). The other two are ${k.firstday.words.slice(1).map((w) => he(w.he) + ' ' + esc(w.gloss)).join(' and ')}.</p>
<p class="small">The ladder pass rule is a target, not a measured result. A word read after the hint is not counted as read unpointed.</p>` });
  pages.push({ kind: 'ladder', title: 'Ladder answers', fields: false, body: `<h2>The 20-step ladder</h2><table class="t"><thead><tr><th>#</th><th>Stage</th><th>Shown</th><th>With points</th><th>Sounds like</th><th>Meaning</th></tr></thead><tbody>${k.firstday.ladder.map((x) => `<tr><td>${x.n}</td><td>${esc(x.stage)}</td><td class="he print">${esc(x.shown)}</td><td class="he print">${esc(x.word)}</td><td>${esc(x.say)}</td><td>${esc(x.gloss)}</td></tr>`).join('')}</tbody></table>` });
  pages.push({ kind: 'letters', title: 'Letter forms', fields: false, body: `<h2>The 27 letter forms</h2><table class="t"><thead><tr><th>#</th><th>Letter</th><th>Name</th><th>Sound</th><th>IPA</th><th>Gematria</th></tr></thead><tbody>${k.letters.map((l) => `<tr><td>${l.n}</td><td class="he print">${esc(l.he)}</td><td>${esc(l.name)}</td><td>${esc(l.sound)}</td><td>/${esc(l.ipa)}/</td><td>${l.gematria}${l.n > 22 ? '*' : ''}</td></tr>`).join('')}</tbody></table><p class="small">* 500-900 for the five final forms is a widely used convention.</p>` });
  const per = 9; for (let i = 0; i < k.cursive.length; i += per) pages.push({ kind: 'cursive', title: `Cursive words ${i + 1}-${Math.min(i + per, k.cursive.length)}`, fields: false, body: `<h2>Cursive words workbook: the words, pointed and unpointed</h2><div class="cols">${k.cursive.slice(i, i + per).map((b) => `<h3>${b.n}. ${esc(b.name)} ${he(b.glyph)}</h3><table class="t"><tbody>${b.words.map((w) => `<tr><td class="he print">${esc(w.he)}</td><td class="he cursive">${esc(w.bare)}</td><td>${esc(w.translit)}</td><td>${esc(w.en)}</td></tr>`).join('') || '<tr><td>(no word in the data)</td></tr>'}</tbody></table>`).join('')}</div>` });
  const nper = 4; for (let i = 0; i < k.niqqud.length; i += nper) pages.push({ kind: 'niqqud', title: `Niqqud words ${i + 1}-${Math.min(i + nper, k.niqqud.length)}`, fields: false, body: `<h2>Vowel signs workbook: example words</h2>${k.niqqud.slice(i, i + nper).map((s) => `<h3>${esc(s.name)} ${he(s.shape)} &middot; ${esc(s.sound)}</h3><table class="t"><tbody>${s.words.map((w, j) => `<tr><td>${j + 1}</td><td class="he print">${esc(w.he)}</td><td>${esc(w.translit)}</td><td>${esc(w.en)}</td></tr>`).join('')}</tbody></table>`).join('')}` });
  pages.push({ kind: 'readaloud', title: 'Read-aloud: Shema and Priestly Blessing', fields: false, body: `<h2>Shema and Priestly Blessing: expected pronunciation</h2><table class="t"><thead><tr><th>Phrase</th>${TRADITIONS.map(([, l]) => `<th>${l}</th>`).join('')}</tr></thead><tbody>${k.blessing.map((p) => `<tr><td class="he print">${esc(p.he)}</td>${TRADITIONS.map(([t]) => `<td>${esc(p.say[t])}</td>`).join('')}</tr>`).join('')}</tbody></table><p class="small">The divine name is read &ldquo;Adonai&rdquo; (Israeli, Sephardi) or &ldquo;Adonoy&rdquo; (Ashkenazi). The other read-aloud texts have their boxes printed on the sheets.</p>` });
  const html = wrapHtml({ title: `ALEF teacher answer key (${paper.label})`, css, pages, set: 'Answer key', draft: KEY_DRAFT });
  return { html, pages: pages.map((p) => p.kind), pageCount: pages.length, model: k };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await buildEditions({ builder: buildKeyHtml, name: 'alef-answer-key', kind: 'answer-key', label: 'Teacher answer key', htmlOnly: process.argv.includes('--html-only') });
}
