// Book chapter "Your first 10 minutes": the 5 letters, 2 vowel signs and 3 words of data/firstday/first10.json, plus the 20-step
// pointed -> unpointed ladder (data/firstday/ladder.json) as a 4-stage table. Pure: data in, HTML string out. Hooked into book/build.mjs
// (import + one chapter insert + one contents line + one index line). Draft notice on the page; every Hebrew string comes from the data files.
import { readJson } from '../content.mjs';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const he = (s, cls = '') => `<span class="he ${cls}" lang="he" dir="rtl">${s}</span>`;
export const FIRSTDAY_ID = 'ch-firstday';
export const FIRSTDAY_TITLE = 'Your first 10 minutes';
const STAGE = { pointed: 'Fully pointed', 'first-letter-pointed': 'First letter pointed', 'unpointed-with-hint': 'Unpointed, with a hint', unpointed: 'Unpointed, no hint' };

/** Pure model used by the chapter and the tests. Returns null when the data files are absent. */
export function firstDayModel() {
  const f = readJson('data/firstday/first10.json'); const ladder = readJson('data/firstday/ladder.json');
  if (!f || !ladder) return null;
  const letters = readJson('data/letters/letters.json') ?? [];
  const byId = Object.fromEntries(letters.map((l) => [l.id, l]));
  const name = (id) => byId[id]?.name ?? id;
  const stages = ladder.stages.map((id, i) => ({ id, n: i + 1, label: STAGE[id] ?? id, steps: ladder.steps.filter((s) => s.stage === id) }));
  return { ...f, name, stages, ladderNote: ladder.reviewNote, passRule: ladder.passRule, minutes: f.steps.reduce((a, s) => a + s.minutes, 0) };
}

/** @param {Record<string,number>} pages anchor -> printed page (for the cross-reference to the letter pages) */
export function firstDayChapter(pages = {}) {
  const m = firstDayModel(); if (!m) return '';
  const pg = (id) => (pages['letter-' + id] ? ` (p. ${pages['letter-' + id]})` : '');
  const letters = m.letters.map((L) => `<div class="card2"><span class="he" style="font-size:26pt">${esc(L.he)}${L.finalForm ? ' ' + esc(L.finalForm) : ''}</span><br/><b>${esc(m.name(L.id))}</b>${pg(L.id)}: ${esc(L.sound)}${L.finalForm ? ' (second shape: at the end of a word)' : ''}</div>`).join('');
  const vowels = m.vowels.map((v) => `<div class="card2"><span class="he" style="font-size:26pt">${esc(v.example)}</span><br/><b>${esc(v.sound)}</b> (${esc(v.id)}): ${esc(v.note)}</div>`).join('');
  const words = m.words.map((w) => `<div class="wcell"><span class="he" lang="he" dir="rtl">${esc(w.he)}</span><b>${esc(w.sound)}</b><span>${esc(w.gloss)}; unpointed ${he(esc(w.bare))}</span></div>`).join('');
  const plan = m.steps.map((s) => `<tr><td>${s.minutes}</td><td><b>${esc(s.title)}</b>${s.body ? `. ${esc(s.body)}` : ''}</td></tr>`).join('');
  const ladder = m.stages.map((st) => `<tr><th colspan="3">Stage ${st.n}: ${esc(st.label)}</th></tr>${st.steps.map((s) => `<tr><td>${s.n}</td><td class="he" lang="he" dir="rtl">${esc(s.shown)}</td><td>${esc(s.gloss)}${s.shown !== s.word ? ` <span class="small">(with points: ${he(esc(s.word))})</span>` : ''}</td></tr>`).join('')}`).join('');
  return `<section class="chapter" id="${FIRSTDAY_ID}"><h2>${FIRSTDAY_TITLE}</h2>
<p class="draft-flag">DRAFT &mdash; not reviewed by a Hebrew teacher; not tested with learners</p>
<p><b>Goal:</b> ${esc(m.goal)} Hebrew reads from right to left: start at the right edge of every word.</p>
<table class="grid"><thead><tr><th>Min</th><th>Step</th></tr></thead><tbody>${plan}</tbody></table>
<h3>Five letters</h3><div class="two">${letters}</div>
<h3>Two vowel signs</h3><div class="two">${vowels}</div>
<h3>Three words</h3><div class="wgrid">${words}</div>
<p class="small">${esc(m.honestyNote)}</p>
<h3>From pointed to unpointed: a 20-step ladder</h3>
<p class="small">Read each word aloud. The vowel signs are removed stage by stage, as in everyday Israeli print. ${esc(m.passRule)} ${esc(m.ladderNote)}</p>
<table class="grid"><tbody>${ladder}</tbody></table>
<p class="small">Printable tracing pages for these letters and words: docs/workbook/alef-firstday-a4.pdf and alef-firstday-letter.pdf (tools/letters/firstday_pages.mjs).</p></section>`;
}
