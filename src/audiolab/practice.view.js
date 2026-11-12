// @ts-check
// Listening Practice (#/listen-practice), audio lane 12 Nov. Three tabs, all built from clips and text the app already has:
//   Line Tools  (A2, A5, A7) one prayer or Torah line: play it at 1×, 0.8×, 0.7× or 0.6× (pitch kept), step through it word by word from
//               its word clips, hear it in Israeli, Sephardi and Ashkenazi with each button labelled from the clip list, and see how many
//               of its words have audio. No syllable split exists for these lines, so step mode says so and goes word by word.
//   Fill The Gap (A3) the line is played from its word clips, one after another, with a pause where one word is missing; pick the
//               missing word from four.
//   Dictation   (A4) hear a word or a short line, type it in Hebrew (on-screen Hebrew keyboard included); the letters are checked by
//               machine against the known text (vowel points are not needed).
// Query: ?tab=line|gap|dictation&line=<registry id>. Tests inject ctx.practiceData {registry, drills, keyboard}.
import { el, heText } from '../curriculum/dom.js';
import { playWithState } from '../shell/audio-access.js';
import { displayHebrew, speechText, uiEnglish } from '../shell/names.js';
import { checkAnswer, screenRows, stripPoints } from '../typing/typing.js';
import { lineWords, wordIds, gapQuestion, dictationItems, makeRng, isNameish, NO_SYLLABLES, syllableSplit } from './core.js';
import { ensureStyle, audioReady, readinessNote, traditionCompare, speedChooser } from './ui.js';
import { isAudioFree } from '../shell/audiofree.js';

const TABS = [['line', 'Line Tools'], ['gap', 'Fill The Gap'], ['dictation', 'Dictation']];
const fetchJson = async (ctx, url) => { const r = await (ctx?.fetchFn ?? fetch)(url); if (!r || r.ok === false) throw new Error(url); return r.json(); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
/** One-line texts of the corpus (the reader's word clips are <id>-w<n>). */
export const singleLines = (registry) => (registry?.entries || []).filter((e) => e && e.id && e.he && !String(e.he).includes('\n') && e.language !== 'english');

/** @param {HTMLElement} root @param {any} ctx */
export function mount(root, ctx) {
  ensureStyle(globalThis.document);
  const q = ctx?.query || {};
  let tab = TABS.some(([id]) => id === q.tab) ? q.tab : 'line';
  let alive = true, gen = 0;
  const rng = ctx?.rng || makeRng();
  const data = { registry: null, drills: null, keyboard: null };
  const h1 = el('h1', { id: 'view-title', tabindex: '-1' }, 'Listening Practice');
  const tabsRow = el('div', { class: 'al-row', role: 'group', 'aria-label': 'Practice type' });
  const body = el('div', { class: 'al-tools', id: 'lp-body' });
  const live = el('p', { class: 'muted', role: 'status', 'aria-live': 'polite', id: 'lp-status' });
  const say = (t) => { live.textContent = t; };
  root.append(el('section', { class: 'al-practice' }, h1,
    el('p', { class: 'muted' }, 'Practice with the app\'s own clips. Sound pairs (bet or vet, shin or sin) are under ', el('a', { href: '#/speak?tab=drills' }, 'Say It: drills'), '.'),
    tabsRow, body, live));
  const stopAll = () => { gen++; try { ctx?.audio?.stop?.(); } catch { /* nothing playing */ } };
  const drawTabs = () => {
    tabsRow.replaceChildren(...TABS.map(([id, label]) => el('button', { type: 'button', class: 'btn secondary', 'data-tab': id, 'aria-pressed': String(id === tab), onclick: () => { stopAll(); tab = id; drawTabs(); show(); } }, label)));
  };

  async function need(which) {
    if (which === 'registry' && !data.registry) data.registry = ctx?.practiceData?.registry || await fetchJson(ctx, 'data/corpus/registry.json');
    if (which === 'drills' && !data.drills) data.drills = ctx?.practiceData?.drills || await fetchJson(ctx, 'data/typing/drills.json');
    if (which === 'keyboard' && !data.keyboard) data.keyboard = ctx?.practiceData?.keyboard || await fetchJson(ctx, 'data/letters/keyboard-si1452.json');
  }
  async function show() {
    body.replaceChildren(el('p', { class: 'muted' }, 'Loading…'));
    try {
      if (tab === 'line') { await need('registry'); if (alive) lineTab(); }
      else if (tab === 'gap') { await need('registry'); if (alive) await gapTab(); }
      else { await need('drills'); await need('keyboard'); if (alive) await dictationTab(); }
    } catch { if (alive) body.replaceChildren(el('p', { role: 'alert' }, 'This practice could not load. Check your connection and try again.')); }
  }

  // ---------- Line Tools ----------
  let lineId = typeof q.line === 'string' ? q.line : '';
  function lineTab() {
    const lines = singleLines(data.registry);
    const line = lines.find((l) => l.id === lineId) || lines[0];
    if (!line) { body.replaceChildren(el('p', {}, 'No lines are available.')); return; }
    lineId = line.id;
    const pick = el('select', { id: 'lp-line', 'aria-label': 'Choose a line', onchange: (e) => { stopAll(); lineId = e.target.value; lineTab(); } },
      ...lines.map((l) => el('option', { value: l.id, selected: l.id === line.id ? true : null }, l.title || l.ref || l.id)));
    const words = lineWords(line.he), ids = wordIds(line.id, words.length);
    const spans = words.map((w) => el('span', { class: 'al-word', 'data-on': '0' }, displayHebrew(w, 'abbrev')));
    const text = el('p', { class: 'al-gapline', dir: 'rtl', lang: 'he' }, ...spans.flatMap((s, i) => (i ? [' ', s] : [s])));
    const lineBtn = el('button', { type: 'button', class: 'btn alef-play', id: 'lp-play-line', onclick: () => playWithState(ctx, lineBtn, 'line', line.id, { text: speechText(line.he), label: line.title || 'the line' }) },
      el('span', { 'aria-hidden': 'true', 'data-glyph': '' }, '▶'), ' Play the line');
    // step mode: one word per press, from the word clips
    let step = -1;
    const stepLabel = el('span', {}, ' Step: first word');
    const stepNote = el('p', { class: 'muted', id: 'lp-step-note' }, syllableSplit(line) ? '' : NO_SYLLABLES);
    const light = (i) => spans.forEach((s, k) => s.setAttribute('data-on', k === i ? '1' : '0'));
    const stepBtn = el('button', { type: 'button', class: 'btn secondary', id: 'lp-step', onclick: async () => {
      step = (step + 1) % words.length; light(step);
      stepLabel.textContent = step === words.length - 1 ? ' Start again' : ' Next word';
      const w = words[step];
      const r = await playWithState(ctx, stepBtn, 'word', ids[step], { text: speechText(w), label: `word ${step + 1} of ${words.length}` });
      say(r && r.source === 'none' ? `Word ${step + 1}: audio coming.` : `Word ${step + 1} of ${words.length}.`);
    } }, el('span', { 'aria-hidden': 'true', 'data-glyph': '' }, '▶'), stepLabel);
    body.replaceChildren(
      el('label', { for: 'lp-line' }, 'Line: '), pick,
      text,
      readinessNote(ctx, ids.map((id, i) => ({ kind: 'word', id, text: speechText(words[i]) })), 'words', { words: true }),
      el('p', { class: 'muted' }, line.english ? uiEnglish(ctx, String(line.english)) : ''),
      el('div', { class: 'al-row' }, lineBtn),
      speedChooser(ctx),
      el('h2', {}, 'Step Through It'),
      el('div', { class: 'al-row' }, stepBtn), stepNote,
      traditionCompare(ctx, { kind: 'line', id: line.id, text: speechText(line.he), title: 'Hear This Line In Each Tradition' }),
    );
  }

  // ---------- Fill The Gap ----------
  let gapRight = 0, gapTried = 0;
  async function gapTab() {
    body.replaceChildren(el('p', { class: 'muted' }, 'Checking which lines have word clips…'));
    await audioReady(ctx, { words: true });
    if (!alive || tab !== 'gap') return;
    const lines = singleLines(data.registry);
    const pool = lines.flatMap((l) => lineWords(l.he)).filter((w) => !isNameish(w));
    const has = (id) => { try { return !!ctx?.audio?.has?.('word', id); } catch { return false; } };
    let qn = null, line = null;
    for (let tries = 0; tries < 60 && !qn; tries++) { line = lines[Math.floor(rng() * lines.length)]; qn = gapQuestion(line, has, pool, rng); }
    if (!qn || !line) { body.replaceChildren(el('p', { id: 'lp-gap-none' }, 'No line has a clip for every word on this device yet, so this drill cannot run. Audio coming.')); return; }
    const cur = qn;
    const shownLine = el('p', { class: 'al-gapline', dir: 'rtl', lang: 'he', id: 'lp-gap-line' },
      ...cur.words.flatMap((w, i) => [i ? ' ' : '', i === cur.gap ? el('span', { class: 'al-gap', 'aria-label': 'missing word' }, '…') : displayHebrew(w, 'abbrev')]));
    const playGap = el('button', { type: 'button', class: 'btn', id: 'lp-gap-play', onclick: async () => {
      const mine = ++gen;
      playGap.setAttribute('data-playing', '1');
      for (let i = 0; i < cur.words.length && mine === gen; i++) {
        if (i === cur.gap) { await wait(800); continue; }
        await ctx.audio.play('word', cur.ids[i], { text: speechText(cur.words[i]), label: 'the line with a gap' });
        if (mine === gen) await wait(120);
      }
      playGap.removeAttribute('data-playing');
    } }, '▶ Play the line with a gap');
    const out = el('div', { role: 'status', 'aria-live': 'polite', id: 'lp-gap-out' });
    const opts = el('div', { class: 'al-opts', role: 'group', 'aria-label': 'Which word is missing?' });
    let done = false;
    for (const o of cur.options) {
      const b = el('button', { type: 'button', class: 'btn secondary', lang: 'he', dir: 'rtl', 'data-correct': o === cur.answer ? '1' : '0', onclick: () => {
        if (done) return; done = true; gapTried++;
        const right = o === cur.answer; if (right) gapRight++;
        for (const x of opts.querySelectorAll('button')) x.setAttribute('disabled', '');
        const whole = el('button', { type: 'button', class: 'btn secondary alef-play', id: 'lp-gap-whole', onclick: () => playWithState(ctx, whole, 'line', line.id, { text: speechText(line.he), label: 'the whole line' }) },
          el('span', { 'aria-hidden': 'true', 'data-glyph': '' }, '▶'), ' Hear the whole line');
        out.replaceChildren(el('p', {}, el('strong', {}, right ? 'Right.' : 'Not this time.'), ' The missing word was ', heText(displayHebrew(cur.answer, 'abbrev')), '.'),
          el('p', { class: 'muted' }, `${gapRight} of ${gapTried} right this visit.`),
          el('div', { class: 'al-row' }, whole, el('button', { type: 'button', class: 'btn', id: 'lp-gap-next', onclick: () => { stopAll(); gapTab(); } }, 'Next line')));
      } }, displayHebrew(o, 'abbrev'));
      opts.append(b);
    }
    body.replaceChildren(
      el('p', {}, el('strong', {}, line.title || line.ref || '')),
      shownLine, el('div', { class: 'al-row' }, playGap), speedChooser(ctx),
      el('h2', {}, 'Which Word Is Missing?'), opts, out,
      el('p', { class: 'muted al-est' }, 'The line is played from its word clips, one after another, with a pause where the missing word goes. It is not the recording of the whole line, which you can hear after you answer.'));
  }

  // ---------- Dictation ----------
  let dictKind = 'words', dictRight = 0, dictTried = 0;
  async function dictationTab() {
    body.replaceChildren(el('p', { class: 'muted' }, 'Checking which words have clips…'));
    await audioReady(ctx, { words: true });
    if (!alive || tab !== 'dictation') return;
    const kindOf = dictKind === 'lines' ? 'line' : 'word';
    const has = (it) => { try { return !!ctx?.audio?.has?.(kindOf, it.id); } catch { return false; } };
    const items = dictationItems(data.drills, dictKind).filter(has);
    const chooser = el('div', { class: 'al-row', role: 'group', 'aria-label': 'Words or lines' },
      ...[['words', 'Words'], ['lines', 'Short lines']].map(([k, label]) => el('button', { type: 'button', class: 'btn secondary', 'data-kind': k, 'aria-pressed': String(k === dictKind), onclick: () => { stopAll(); dictKind = k; dictationTab(); } }, label)));
    if (!items.length) { body.replaceChildren(chooser, el('p', { id: 'lp-dict-none' }, 'None of these has a clip on this device yet, so dictation cannot run here. Audio coming.')); return; }
    const it = items[Math.floor(rng() * items.length)];
    const input = el('input', { type: 'text', id: 'lp-dict-input', dir: 'rtl', lang: 'he', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': 'Type what you hear, in Hebrew letters' });
    const type = (ch) => { input.value = (input.value || '') + ch; input.focus?.(); };
    const kb = el('div', { class: 'al-kb', role: 'group', 'aria-label': 'Hebrew keyboard' },
      ...screenRows(data.keyboard).map((row) => el('div', { class: 'al-kb-row' }, ...row.map((k) => el('button', { type: 'button', class: 'btn secondary', lang: 'he', 'aria-label': `${k.name} ${k.char}`, onclick: () => type(k.char) }, k.char)))),
      el('div', { class: 'al-kb-row' },
        el('button', { type: 'button', class: 'btn secondary', 'aria-label': 'Space', onclick: () => type(' ') }, 'Space'),
        el('button', { type: 'button', class: 'btn secondary', 'aria-label': 'Delete the last letter', onclick: () => { input.value = [...String(input.value || '')].slice(0, -1).join(''); } }, '⌫')));
    const listen = el('button', { type: 'button', class: 'btn alef-play', id: 'lp-dict-listen', onclick: () => playWithState(ctx, listen, kindOf, it.id, { text: speechText(it.pointed), label: 'the dictation' }) },
      el('span', { 'aria-hidden': 'true', 'data-glyph': '' }, '▶'), ' Listen');
    const out = el('div', { role: 'status', 'aria-live': 'polite', id: 'lp-dict-out' });
    const check = el('button', { type: 'button', class: 'btn', id: 'lp-dict-check', onclick: () => {
      const r = checkAnswer(input.value, it.he);
      if (r.empty) { out.replaceChildren(el('p', {}, 'Type what you hear first.')); return; }
      if (r.latin) { out.replaceChildren(el('p', {}, 'Use Hebrew letters: the keyboard below types them.')); return; }
      dictTried++; if (r.ok) dictRight++;
      check.setAttribute('disabled', '');
      out.replaceChildren(...[
        el('p', {}, el('strong', {}, r.ok ? 'Right: every letter matches.' : r.finalFormOnly ? 'Nearly: only a final letter form differs.' : `Not this time: ${Math.round(r.accuracy * 100)}% of the letters match.`)),
        el('p', {}, 'The answer: ', heText(displayHebrew(it.pointed, 'abbrev')), it.en ? ` (${it.en})` : ''),
        r.ok ? null : el('p', {}, 'You typed: ', heText(r.typed || '')),
        el('p', { class: 'muted' }, `${dictRight} of ${dictTried} right this visit.`),
        el('div', { class: 'al-row' }, el('button', { type: 'button', class: 'btn', id: 'lp-dict-next', onclick: () => { stopAll(); dictationTab(); } }, 'Next'))].filter(Boolean));
    } }, 'Check');
    body.replaceChildren(chooser,
      el('p', {}, `Hear the ${kindOf}, then type it in Hebrew letters. Vowel points are not needed.`),
      el('div', { class: 'al-row' }, listen), speedChooser(ctx),
      el('label', { for: 'lp-dict-input' }, 'Your answer'), input, kb,
      el('div', { class: 'al-row' }, check), out,
      el('p', { class: 'muted al-est' }, `Checked by machine: your letters are compared with the known text (${stripPoints(it.pointed).length} characters). It checks spelling from sound only; it is not a grade.`));
  }

  if (isAudioFree(ctx)) { // "I do not use audio": these drills are heard, so say so and point to the written practice
    body.replaceChildren(el('p', { id: 'lp-audio-free' }, 'Listening Practice is for sound, and "I do not use audio" is on. Practise the same skills in writing with ', el('a', { href: '#/typing' }, 'Typing practice'), ' and ', el('a', { href: '#/bridge' }, 'Reading Without Vowels'), '.'));
    return () => { alive = false; };
  }
  drawTabs();
  show();
  return () => { alive = false; stopAll(); };
}
