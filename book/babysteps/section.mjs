// Book chapter "The baby steps: lessons 1 to 10": the v0 learn path (docs/v0/SCOPE.md: welcome -> first day -> lessons r01 to r10) in
// the order the app teaches it, taken from data/curriculum/lessons.json (r01..r10) and data/firstday/onramp.json. Per lesson: goals, new
// letters, vowel signs, practice words, and a per-tradition note (Israeli / Sephardi / Ashkenazi) built ONLY from the pronunciation data
// (data/pronunciation/consonants.json, niqqud.json) and src/pronunciation/transliterate.js. Pure: data in, HTML string out.
import { readJson, registryEntries } from '../content.mjs';
import { transliterate } from '../../src/pronunciation/transliterate.js';
import { resolveRanks, rankByLesson } from '../../src/curriculum/ranks.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const he = (s, cls = '') => `<span class="he ${cls}" lang="he" dir="rtl">${s}</span>`;
export const BABY_ID = 'ch-babysteps';
export const BABY_TITLE = 'The baby steps: lessons 1 to 10';
export const BABY_LESSONS = ['r01', 'r02', 'r03', 'r04', 'r05', 'r06', 'r07', 'r08', 'r09', 'r10'];
const TRADS = [['israeli', 'Israeli'], ['sephardi', 'Sephardi'], ['ashkenazi', 'Ashkenazi']];
const tr = (w, tradition) => transliterate(w, { scheme: 'siddur', tradition });

/** Pure model (also used by tests). Returns null when the curriculum file is absent. */
export function babyStepsModel() {
  const lessons = readJson('data/curriculum/lessons.json')?.lessons;
  if (!lessons) return null;
  const letters = readJson('data/pronunciation/consonants.json')?.letters ?? {};
  const vowels = Object.fromEntries((readJson('data/pronunciation/niqqud.json')?.records ?? []).map((r) => [r.id, r]));
  const onramp = readJson('data/firstday/onramp.json');
  const reg = Object.fromEntries(registryEntries().map((e) => [e.id, e]));
  const beltsFile = readJson('data/curriculum/belts.json');
  const rankOf = beltsFile?.ranks ? rankByLesson(resolveRanks(beltsFile, lessons)) : new Map();
  const out = BABY_LESSONS.map((id) => lessons.find((l) => l.id === id)).filter(Boolean).map((l) => {
    const diffs = [];
    for (const id2 of l.letters ?? []) {
      const c = letters[id2]; if (!c?.english) continue;
      const vals = TRADS.map(([t]) => c.english[t]);
      if (new Set(vals).size > 1) diffs.push({ kind: 'letter', name: c.name, he: c.he, byTrad: Object.fromEntries(TRADS.map(([t], i) => [t, vals[i]])), verified: c.verified !== false });
    }
    for (const id2 of l.vowels ?? []) {
      const v = vowels[id2]; if (!v?.english) continue;
      const vals = TRADS.map(([t]) => v.english[t]);
      if (new Set(vals).size > 1) diffs.push({ kind: 'vowel', name: v.name, he: v.shape, byTrad: Object.fromEntries(TRADS.map(([t], i) => [t, vals[i]])), verified: v.verified?.english !== false });
    }
    const words = (l.words ?? []).filter((w) => w.he).map((w) => ({ he: w.he, en: w.en, byTrad: Object.fromEntries(TRADS.map(([t]) => [t, tr(w.he, t)])) }));
    const prayer = (l.prayerLines ?? []).map((pid) => reg[pid]).filter((e) => e?.he);
    const letterRecs = (l.letters ?? []).map((id2) => ({ id: id2, name: letters[id2]?.name ?? id2, he: letters[id2]?.he ?? '' }));
    const vowelRecs = (l.vowels ?? []).map((id2) => vowels[id2]).filter(Boolean);
    return { ...l, rank: rankOf.get(l.id)?.label ?? null, diffs, words, prayer, letterRecs, vowelRecs };
  });
  return { lessons: out, onramp };
}

/** @param {Record<string,number>} pages anchor -> printed page */
export function babyStepsChapter(pages = {}) {
  const m = babyStepsModel(); if (!m) return '';
  const pg = (id) => (pages['letter-' + id] ? ` <span class="small">(p. ${pages['letter-' + id]})</span>` : '');
  const steps = (m.onramp?.steps ?? []).map((s, i) => `<tr><td>${i + 1}</td><td><b>${esc(s.title)}</b>${s.he ? ' ' + he(esc(s.he)) : ''}</td><td>${s.minutes} min</td></tr>`).join('');
  const lesson = (l, i) => {
    const letters = l.letterRecs.map((L) => `<span class="card2" style="display:inline-block;margin:2pt 4pt 2pt 0">${he(esc(L.he), '')} <b>${esc(L.name)}</b>${pg(L.id)}</span>`).join('');
    const vows = l.vowelRecs.map((v) => `<span class="card2" style="display:inline-block;margin:2pt 4pt 2pt 0">${he(esc(v.shape))} <b>${esc(v.name)}</b></span>`).join('');
    const words = l.words.map((w) => `<tr><td class="he" lang="he" dir="rtl">${esc(w.he)}</td><td>${esc(w.en)}</td><td>${esc(w.byTrad.israeli)}</td><td>${esc(w.byTrad.sephardi)}</td><td>${esc(w.byTrad.ashkenazi)}</td></tr>`).join('');
    const wordsSame = l.words.length && l.words.every((w) => w.byTrad.israeli === w.byTrad.ashkenazi);
    const notes = l.diffs.length
      ? `<ul>${l.diffs.map((d) => `<li>${d.he ? he(esc(d.he)) + ' ' : ''}<b>${esc(d.name)}</b>: ${TRADS.map(([t, label]) => `<i>${label}</i> ${esc(d.byTrad[t])}`).join('; ')}${d.verified ? '' : ' (not source-verified)'}</li>`).join('')}</ul>`
      : '<p class="small">No difference between the three traditions in the signs this lesson introduces.</p>';
    const prayer = l.prayer.length ? `<p class="small">Listen and spot the letters you know (Numbers 6:24&ndash;26; text status in the prayer chapter):</p>${l.prayer.map((e) => `<div class="he pheb" lang="he" dir="rtl">${esc(e.he)}</div>`).join('')}` : '';
    return `<div class="babystep"><h3>Lesson ${i + 1} (${l.id}): ${esc(l.title)} <span class="small">${l.estMinutes} min &middot; ${esc(l.rank ?? `${l.level} belt`)}</span></h3>
<ul>${(l.goals ?? []).map((g) => `<li>${esc(g)}</li>`).join('')}</ul>
${letters || vows ? `<p><b>New:</b> ${letters}${vows}</p>` : '<p class="small">No new letters or signs: this lesson is practice.</p>'}
${words ? `<table class="grid"><thead><tr><th>Word</th><th>Meaning</th><th>Israeli</th><th>Sephardi</th><th>Ashkenazi</th></tr></thead><tbody>${words}</tbody></table>${wordsSame ? '<p class="small">These words read alike in all three traditions in the siddur spelling used here.</p>' : ''}` : ''}
${prayer}<div class="card2"><b>Where traditions differ here.</b>${notes}</div></div>`;
  };
  return `<section class="chapter" id="${BABY_ID}"><h2>${BABY_TITLE}</h2>
<p class="draft-flag">DRAFT &mdash; not reviewed by a Hebrew teacher; not tested with learners</p>
<p>The app&rsquo;s first release (v0) teaches in baby steps: a one-time setup (it asks whether you can already read the letters; choosing a pronunciation style is optional and can be changed later in Settings), your first ten minutes on five tiny wins, then lessons 1 to 10 in order, reviewing as you go. The first release is small on purpose: pages outside it stay in the app, but sit under a collapsed &ldquo;Preview (unreviewed, work in progress)&rdquo; group in the More menu. This chapter is that path on paper, in the same order. Letters and signs are not shown in alphabet order here; the reference chapters later in the book are. Each lesson gives its new letters and signs, a few words, and a note on where the Israeli, Sephardi and Ashkenazi ways of reading part. Pick one tradition now and stay with it until the path feels easy.</p>
<h3>Lesson 1 is five small steps</h3>
<table class="grid"><thead><tr><th>#</th><th>Step</th><th>Time</th></tr></thead><tbody>${steps}</tbody></table>
<p class="small">Minutes are a design budget, not a measurement.</p>
${m.lessons.map(lesson).join('')}
<p class="small">Pronunciation values come from data/pronunciation/consonants.json and niqqud.json; transliteration is generated by the project&rsquo;s siddur-style rules (the Israeli and Sephardi columns come out identical because the spelling does not show their pharyngeal and shva differences). Several values are marked in the data as not yet verified by a native speaker. Lessons r11 onward are covered by the reference chapters of this book; the app&rsquo;s first release centres on lessons 1 to 10.</p></section>`;
}
