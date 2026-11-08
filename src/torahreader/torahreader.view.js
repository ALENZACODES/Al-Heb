/**
 * Torah reader (route in docs/corpus/READER-ROUTE.md): Numbers 6:22-27 (the Priestly Blessing is 6:24-26) and Deuteronomy 6:4-9
 * (Shema and V'ahavta), word by word, with vowel points and cantillation marks that can each be shown or hidden.
 *   tap a word      -> transliteration in the learner's tradition, the mark's name and class, a literal gloss where one exists, "Hear it"
 *   Read with me    -> a highlight that steps through the words at a chosen pace. It is a pacing aid. It is NOT synchronised with any
 *                      audio and the screen says so.
 *   Trope legend    -> a reference table of the marks (names in both naming systems, class, level, where they occur here).
 *                      It is a reference, not a chanting teacher: no melodies, no recordings of chanting.
 * Data: data/corpus/reader/*.json, data/corpus/trope/*.json (built by tools/corpus/trope.mjs from UXLC). Nothing is reviewed by a cantor.
 * Store: key torahreader.v1 { v, passage, view, showTrope, showNiqqud, speed }. Audio: ctx.audio.play('word'|'line', id, {text}).
 * ctx extras for tests: ctx.clock {setInterval, clearInterval}, ctx.loadJson(rel) (replaces the loader).
 * The returned unmount function carries .ready (a promise that settles when data is loaded and the first render is done).
 */
import { el, storeGet, storeSet } from '../curriculum/dom.js';
import { transliterate } from '../pronunciation/transliterate.js';
import { loadAll, loadJson, loadTorahIndex, loadTorahChapter, loadTorahManifest } from './loader.js';
import { uiEnglish } from '../shell/names.js';
import { calmOn } from '../shell/comfort.js';
import { createFingerGuide, FINGER_CSS } from './finger-follow.js';
import { playLine, LABELS as TRAD_LABELS } from '../pronunciation/forTradition.js';
import { parshaOnShabbat } from '../curriculum/calendar.parsha.js';
import { saturdayOnOrAfter } from '../curriculum/calendar.js';
import { CAL_PREFS_KEY, normalizePrefs, resolveLocation } from '../curriculum/calendar.locations.js';
import {
  STORE_KEY, PASSAGE_IDS, SPEEDS, DEFAULT_STATE, normaliseState, speedMs, flatten, plainOf, spokenText, audioIndex,
  tropeById, tropeName, legend, markGlyph, stepIndex, largePositions, displayParts, SIZES, sizeScale, stripNiqqud,
  SCREENS, TORAH_BOOKS, torahBook, adjacentChapter, portionsForCalendarIds, portionChapter, portionChapters,
  chapterPosition, torahVerseId, torahChapterId, torahChapterKind,
} from './model.js';

export const NOTICE = 'Draft, not checked by a cantor, rabbi or Hebrew teacher. The Hebrew and the cantillation marks come from the Leningrad Codex (UXLC, tanach.us); a program read the marks, and this screen shows which mark sits on which word and what kind of mark it is. It does not teach melodies and plays no chanting.';
export const LEGEND_NOTICE = 'This page names the marks and says whether each one pauses or joins. It does not describe or play any melody, because melodies are passed on by ear and differ between communities, and nobody qualified has reviewed this table. To learn to chant, work with a cantor or teacher from your own community.';
export const CALM_NOTE = 'Calm mode is on, so the highlight does not move on its own and there is no timer. Use Next word and Previous word to step through the passage one word at a time.';
export const PACE_NOTE = 'The highlight moves at the pace you pick. It is not synchronised with any audio or chanting.';
export const TORAH_TEXT_LABEL = 'About this text. Hebrew: the Leningrad Codex in the Unicode/XML edition (UXLC, tanach.us), shown with vowel points; the cantillation marks can be shown or hidden. English: the JPS 1917 translation — public domain, and a translation from 1917: its English is older than a modern version\'s ("thee/thou" appear in prayer passages), and it is the newest complete English translation whose licence allows it to be included here. References follow the Hebrew chapter and verse numbering.';
export const TORAH_AUDIO_LABEL = 'About the audio. A synthetic voice (Israeli) reads the pointed Hebrew aloud. It is a reading, not a chant: the cantillation marks are not sung, and this is not a recording of a teacher or cantor.';
export const TORAH_EN_AUDIO_LABEL = 'Hear the English. A synthetic voice reads the JPS 1917 translation aloud, chapter by chapter. It is a reading, not a chant, and not a recording of a teacher. The translation is from 1917 — its English is older than a modern version\'s — and it is read exactly as printed.';
export const TORAH_READING_LABEL = 'Read in Israeli Hebrew.';
export const TRANSLIT_LABEL = 'Transliteration computed from the vowel points — a reading aid, not a checked transcription.';
export const DRAFT_LABEL = 'Draft, not checked by a rabbi or Hebrew teacher.';
const TRAD = { israeli: 1, sephardi: 1, ashkenazi: 1 };
const PASSAGE_LABEL = { 'priestly-blessing': 'Priestly Blessing (Numbers 6:22-27)', shema: 'Shema and V’ahavta (Deuteronomy 6:4-9)' };
const PASSAGE_SHORT = { 'priestly-blessing': 'Priestly Blessing', shema: 'Shema and V’ahavta' };
const CLS_LABEL = { disjunctive: 'pauses (disjunctive)', conjunctive: 'joins to the next word (conjunctive)', 'secondary-stress': 'stress mark (not a trope)', separator: 'separator (not a melody)', 'verse-end': 'verse end (punctuation)' };

const CSS = FINGER_CSS + `
.alef-trd{max-inline-size:44rem;margin-inline:auto;overflow-wrap:anywhere}
.alef-trd *{box-sizing:border-box}
.alef-trd .trd-notice{border-inline-start:6px solid currentColor;padding-inline-start:.6rem;margin-block:.75rem}
.alef-trd .trd-bar{display:flex;flex-wrap:wrap;gap:.5rem;margin-block:.75rem}
.alef-trd .trd-top{margin-block:.25rem .5rem}
.alef-trd .trd-top .trd-tab{flex:1 1 9rem;min-inline-size:0}
.alef-trd h1{font-size:1.4rem;line-height:1.25;margin-block:.4rem}
.alef-trd button{min-block-size:max(44px,var(--tap,48px));min-inline-size:max(44px,var(--tap,48px));padding:.4rem .8rem;font:inherit;border:2px solid var(--border,#767676);border-radius:8px;background:var(--card,#fff);color:inherit;cursor:pointer}
.alef-trd button[aria-pressed="true"]{border-width:3px;font-weight:700;text-decoration:underline}
.alef-trd button:focus-visible{outline:3px solid currentColor;outline-offset:2px}
.alef-trd .trd-verse{margin-block:.55rem;padding:.4rem .5rem;border:1px solid var(--border,#bbb);border-radius:8px}
.alef-trd .trd-vlabel{font-size:.9rem;font-weight:700;margin:0 0 .15rem}
.alef-trd .trd-line{direction:rtl;font-size:calc(1.5rem * var(--trd-scale,1));line-height:1.8;margin:.15rem 0;display:flex;flex-wrap:wrap;gap:.2rem .4rem}
.alef-trd .trd-w{white-space:nowrap;font-size:inherit;line-height:1.6;min-inline-size:max(44px,var(--tap,48px));padding:.1rem .4rem}
.alef-trd .trd-w.trd-cur{border-width:4px;border-style:double;background:var(--hl,#ffe9a8);color:var(--hl-ink,#000)}
.alef-trd .trd-w.trd-sel{border-style:dashed}
.alef-trd .trd-stop{font-size:calc(1.5rem * var(--trd-scale,1));line-height:1.6}
.alef-trd .trd-en{margin:.15rem 0;font-style:italic}
.alef-trd .trd-say{margin:.3rem 0 .1rem;font-size:1.1rem;font-weight:600;letter-spacing:.01em}
.alef-trd .trd-say-k{font-style:normal;font-weight:600;font-size:.8rem;text-transform:uppercase;letter-spacing:.06em;opacity:.65;margin-inline-end:.3em}
.alef-trd .trd-en-only{font-size:1.35rem;line-height:1.5;margin:.3rem 0 .5rem}
.alef-trd .trd-praylang{align-items:center;margin-block:.4rem .8rem}
.alef-trd .trd-praylang-k{font-weight:700}
.alef-trd .trd-detail{border:2px solid currentColor;border-radius:8px;padding:.6rem;margin-block:1rem}
.alef-trd .trd-big{font-size:calc(1.9rem * var(--trd-scale,1));direction:rtl}
.alef-trd .trd-lg{font-size:1.6em;line-height:1}
.alef-trd .trd-lgnote{font-size:.9rem;margin:.25rem 0}
.alef-trd table{border-collapse:collapse;inline-size:100%}
.alef-trd th,.alef-trd td{border:1px solid var(--border,#999);padding:.3rem .4rem;text-align:start;vertical-align:top}
.alef-trd .trd-scroll{overflow-x:auto;max-inline-size:100%;margin-block:.5rem}
.alef-trd .trd-scroll table{inline-size:100%;min-inline-size:36rem}
.alef-trd .trd-glyph{font-size:calc(1.5rem * var(--trd-scale,1));direction:rtl}
.alef-trd .trd-ctl{margin-block:.5rem;border:1px solid var(--border,#bbb);border-radius:8px;padding:0 .6rem}
.alef-trd .trd-ctl>summary,.alef-trd .trd-notice-d>summary{cursor:pointer;min-block-size:max(44px,var(--tap,48px));display:flex;align-items:center;font-weight:700}
.alef-trd summary:focus-visible{outline:3px solid currentColor;outline-offset:2px}
.alef-trd .trd-notice-d{border-inline-start:6px solid currentColor;padding-inline-start:.6rem;margin-block:.25rem}
.alef-trd .trd-notice-d p{margin-block:.25rem}
.alef-trd footer{margin-block-start:1.5rem;font-size:.85rem}
.alef-trd .trd-cards{display:grid;gap:.6rem;margin-block:.6rem}
@media(min-width:720px){.alef-trd .trd-cards{grid-template-columns:1fr 1fr}}
.alef-trd .trd-card{border:1px solid var(--border,#bbb);border-radius:8px;padding:.6rem;text-align:start;inline-size:100%}
.alef-trd .trd-card h2,.alef-trd .trd-card h3{margin-block:.1rem .3rem;font-size:1.05rem}
.alef-trd .trd-row{display:grid;gap:.15rem .9rem;margin-block:.55rem;padding:.45rem .5rem;border:1px solid var(--border,#bbb);border-radius:8px}
@media(min-width:720px){.alef-trd .trd-row{grid-template-columns:1fr 1fr}.alef-trd .trd-row .trd-cell-en{grid-column:1;grid-row:1}.alef-trd .trd-row .trd-cell-he{grid-column:2;grid-row:1}}
.alef-trd .trd-row.trd-playing{border-inline-start:6px solid var(--accent,#1e4634);background:var(--hl,#ffe9a8)}
.alef-trd .trd-row.trd-target{outline:3px solid var(--accent,#1e4634);outline-offset:2px}
.alef-trd .trd-hebrew{direction:rtl;font-size:calc(1.5rem * var(--trd-scale,1));line-height:1.8;margin:.1rem 0}
.alef-trd .trd-vnum{font-weight:700;font-size:.9rem}
.alef-trd .trd-break,.alef-trd .trd-aliyah{font-weight:700;margin-block:.4rem;border-block:1px dashed var(--border,#999);padding-block:.2rem}
.alef-trd .trd-labels{border-block-start:2px solid var(--border,#999);margin-block-start:1.2rem;padding-block-start:.6rem;font-size:.92rem}
.alef-trd .trd-chapters{display:flex;flex-wrap:wrap;gap:.3rem;margin-block:.4rem}
.alef-trd .trd-chapters button{min-inline-size:0;padding:.2rem .55rem}
`;
function injectStyle() {
  try { if (!document.head || document.getElementById?.('alef-trd-style')) return; const s = document.createElement('style'); s.id = 'alef-trd-style'; s.textContent = CSS; document.head.append(s); } catch { /* optional */ }
}

/** @param {HTMLElement} root @param {any} ctx @returns {(() => void) & {ready: Promise<void>}} */
export function mount(root, ctx) {
  injectStyle();
  const clock = ctx?.clock || { setInterval: (f, ms) => globalThis.setInterval(f, ms), clearInterval: (h) => globalThis.clearInterval(h) };
  const tradition = () => { const c = ctx?.settings?.get ? ctx.settings.get('congregation') : ctx?.settings?.congregation; return TRAD[c] ? c : 'sephardi'; };
  const translit = (he) => { try { return transliterate(he, { scheme: 'siddur', tradition: tradition() }); } catch { return ''; } };

  const wrap = el('section', { class: 'alef-trd', 'aria-labelledby': 'view-title' });
  const h1 = el('h1', { id: 'view-title', tabindex: '-1' }, 'Torah reader: Priestly Blessing and Shema');
  const body = el('div', { class: 'trd-body' });
  const status = el('div', { class: 'trd-status', role: 'status', 'aria-live': 'polite' });
  const footer = el('footer', {});
  wrap.append(h1, el('details', { class: 'trd-notice-d' }, el('summary', {}, 'Draft, not checked by a cantor or teacher'), el('p', { class: 'trd-notice' }, NOTICE)), body, status, footer);
  root.append(wrap);

  let alive = true, data = null, state = { ...DEFAULT_STATE }, error = null;
  let items = [], idx = null, btns = new Map(), cur = null, sel = null, timer = null, legendOnlyHere = false, ctlOpen = false;
  // Full-Torah state: the grid index, the audio manifest shard, the open chapter file, the
  // calendar's portion for this week, and the chapter-playback clock (highlight from durMs).
  const load = ctx?.loadJson || loadJson;
  let torah = null, torahManifest = [], chapterData = null, chapterKey = '', weekPortion = undefined, calendarPrefsRaw = null;
  let chapterPlay = null, targetVerse = null;
  const chapterRows = new Map(), shownTranslit = new Set();
  const fingerGuide = createFingerGuide({ clock, calm: () => calmOn(ctx), announce: (text) => say(text), redraw: () => render() });
  const say = (t) => { status.textContent = t; };
  const save = () => storeSet(ctx, STORE_KEY, state);
  const passage = () => data.passages[state.passage];
  const voiceOf = () => { try { const v = ctx?.settings?.get ? ctx.settings.get('voice') : ctx?.settings?.voice; return v === 'f' ? 'f' : 'm'; } catch { return 'm'; } };
  const manifestHas = (kind, id) => torahManifest.some((e) => e && e.kind === kind && e.id === id && e.voice === voiceOf() && e.status && e.status !== 'missing');
  async function ensureChapter() {
    const key = `${state.book}/${state.chapter}`;
    if (chapterKey === key) return;
    chapterKey = key; chapterData = null;
    try { chapterData = await loadTorahChapter(state.book, state.chapter, load); } catch { chapterData = null; }
  }
  function shellLocation() {
    try {
      const s = ctx?.settings; const loc = s?.location;
      if (loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lon)) return { lat: loc.lat, lon: loc.lon, tz: loc.tz };
      if (s && Number.isFinite(s.lat) && Number.isFinite(s.lon)) return { lat: s.lat, lon: s.lon };
    } catch { /* no location */ }
    return null;
  }
  function computeWeek() {
    if (!torah) { weekPortion = null; return; }
    try {
      const now = ctx?.now ? ctx.now() : new Date();
      const sat = saturdayOnOrAfter({ y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() });
      const prefs = normalizePrefs(calendarPrefsRaw);
      const loc = resolveLocation(prefs, shellLocation());
      const israel = prefs.parshaSchedule === 'israel' || (prefs.parshaSchedule === 'auto' && !!loc?.israel);
      const res = parshaOnShabbat(sat, { israel });
      weekPortion = res ? { res, portions: portionsForCalendarIds(torah, res.ids) } : null;
    } catch { weekPortion = null; }
  }

  // ---------- read with me ----------
  const stopTimer = () => { if (timer != null) { clock.clearInterval(timer); timer = null; } };
  function highlight(n, { announce = true } = {}) {
    const prev = btns.get(cur);
    if (prev) { prev.className = prev.className.replace(' trd-cur', ''); prev.setAttribute('aria-current', 'false'); }
    cur = n;
    const b = btns.get(n);
    if (!b) return;
    b.className += ' trd-cur'; b.setAttribute('aria-current', 'true');
    try { b.scrollIntoView?.({ block: 'nearest' }); } catch { /* optional */ }
    if (announce) say(`Word ${n + 1} of ${items.length}: ${translit(plainOf(items[n]))}`);
    refreshRun();
  }
  function tickOnce() {
    const next = stepIndex(cur, items.length, 1);
    if (next == null) { stopTimer(); say(`Reached the end of the passage after ${items.length} words. ${PACE_NOTE}`); refreshRun(); return; }
    highlight(next);
  }
  function startRun() {
    stopTimer();
    if (calmOn(ctx)) { say(CALM_NOTE); return; } // calm mode: no timers. The button is not drawn then; this guards any other caller.
    if (cur == null || cur >= items.length - 1) highlight(0);
    timer = clock.setInterval(tickOnce, speedMs(state.speed));
    say(`Reading with you at ${state.speed} pace, from word ${(cur ?? 0) + 1}. ${PACE_NOTE}`);
    refreshRun();
  }
  function pauseRun() { stopTimer(); say(`Paused at word ${(cur ?? 0) + 1} of ${items.length}.`); refreshRun(); }
  function manualStep(dir) {
    stopTimer();
    const next = stepIndex(cur, items.length, dir);
    if (next == null) { say(dir > 0 ? 'This is the last word.' : 'This is the first word.'); refreshRun(); return; }
    highlight(next);
  }
  let runBtn = null;
  function refreshRun() {
    if (!runBtn) return;
    const running = timer != null;
    runBtn.textContent = running ? 'Pause' : (cur != null && cur > 0 && cur < items.length - 1 ? 'Resume reading with me' : 'Read with me');
    runBtn.setAttribute('aria-pressed', running ? 'true' : 'false');
  }

  // ---------- audio ----------
  async function playAudio(kind, id, text, label, opts = {}) {
    if (!ctx?.audio || typeof ctx.audio.play !== 'function') { say(`No audio for ${label}: this build has no audio player.`); return; }
    try {
      try { ctx.audio.stop?.(); } catch { /* ignore */ }
      const r = await ctx.audio.play(kind, id, { text, ...opts });
      if (!alive) return;
      say(playLine(r, tradition(), label));
    } catch (e) { say(`Audio error for ${label}: ${e?.message || e}`); }
  }

  // ---------- full-Torah chapter audio ----------
  function stopChapterAudio() {
    if (chapterPlay) { try { clock.clearInterval(chapterPlay.timer); } catch { /* ignore */ } chapterPlay = null; }
    for (const row of chapterRows.values()) { row.className = row.className.replace(' trd-playing', ''); row.setAttribute('aria-current', 'false'); }
  }
  function markPlaying(verseN) {
    for (const [n, row] of chapterRows) {
      const on = n === verseN;
      row.className = row.className.replace(' trd-playing', '') + (on ? ' trd-playing' : '');
      row.setAttribute('aria-current', on ? 'true' : 'false');
      if (on) {
        const reduced = calmOn(ctx) || (() => { try { return !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches; } catch { return false; } })();
        try { row.scrollIntoView?.({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' }); } catch { /* optional */ }
      }
    }
  }
  async function playChapter(lang) {
    if (!chapterData || !ctx?.audio || typeof ctx.audio.play !== 'function') { say('No audio for this chapter: this build has no audio player.'); return; }
    stopTimer(); stopChapterAudio();
    const kind = torahChapterKind(lang), id = torahChapterId(state.book, state.chapter, lang);
    const text = lang === 'en' ? chapterData.verses.map((v) => v.en).join(' ') : spokenText(chapterData.verses.map((v) => v.he).join(' '));
    // Chapter-only recordings have a measured total duration but no verse timestamps.
    // Play those normally without inventing word/verse timing or highlights.
    if (chapterPosition(chapterData.verses, lang, voiceOf(), 0)) {
      const started = Date.now();
      const timer = clock.setInterval(() => {
        const p = chapterPosition(chapterData.verses, lang, voiceOf(), Date.now() - started);
        if (p) markPlaying(p.verse);
        if (p?.ended) stopChapterAudio();
      }, 250);
      chapterPlay = { lang, timer };
      markPlaying(chapterData.verses[0].n);
    }
    try {
      const r = await ctx.audio.play(kind, id, { text, tradition: lang === 'en' ? 'english' : 'israeli' });
      if (!alive) return;
      stopChapterAudio();
      say(playLine(r, tradition(), `${chapterData.ref} read aloud`));
    } catch (e) { stopChapterAudio(); say(`Audio error for ${chapterData.ref}: ${e?.message || e}`); }
  }
  async function playTorahVerse(v) {
    stopChapterAudio();
    await playAudio('line', torahVerseId(state.book, state.chapter, v.n), spokenText(v.he), `${chapterData.ref}:${v.n} in Hebrew (synthetic voice)`, { tradition: 'israeli' });
  }

  /** English prayer read aloud by the device's own English voice (no recorded English clip exists for these lines). */
  function speakEnglish(text, label) {
    try {
      const sp = globalThis.speechSynthesis, U = globalThis.SpeechSynthesisUtterance;
      if (!sp || typeof U !== 'function') { say(`Your browser has no voice to read ${label} aloud.`); return; }
      try { ctx?.audio?.stop?.(); } catch { /* ignore */ }
      sp.cancel(); const u = new U(text); u.lang = 'en-US'; sp.speak(u);
      say(`Reading ${label} in English (your device's voice).`);
    } catch { say(`Could not read ${label} aloud.`); }
  }

  // ---------- rendering ----------
  function setState(patch) {
    state = { ...state, ...patch };
    if (patch.screen) state.view = patch.screen === 'legend' ? 'legend' : 'reader'; // keep the legacy field in step
    save();
  }
  const toggle = (label, key, onText, offText) => el('button', {
    type: 'button', class: 'trd-toggle', 'data-toggle': key, 'aria-pressed': state[key] ? 'true' : 'false',
    onclick: () => { if (key === 'showPronunciation') shownTranslit.clear(); setState({ [key]: !state[key] }); say(state[key] ? onText : offText); render(); focusSel(`[data-toggle="${key}"]`); },
  }, label);
  function focusSel(sel) { try { wrap.querySelector(sel)?.focus?.(); } catch { /* ignore */ } }

  function tabs(withLegend = true) {
    const bar = el('div', { class: 'trd-bar trd-top', role: 'group', 'aria-label': 'Torah home, a study passage or the legend' });
    bar.append(el('button', {
      type: 'button', class: 'trd-tab', 'data-screen': 'home', 'aria-pressed': state.screen === 'home' ? 'true' : 'false',
      onclick: () => { stopTimer(); stopChapterAudio(); setState({ screen: 'home' }); render(); focusSel('[data-screen="home"]'); },
    }, 'Torah home'));
    for (const id of PASSAGE_IDS) {
      bar.append(el('button', {
        type: 'button', class: 'trd-tab', 'data-passage': id, 'aria-label': PASSAGE_LABEL[id], 'aria-pressed': state.screen === 'study' && state.passage === id ? 'true' : 'false',
        onclick: () => { stopTimer(); stopChapterAudio(); cur = null; sel = null; setState({ passage: id, view: 'reader', screen: 'study' }); render(); focusSel(`[data-passage="${id}"]`); },
      }, PASSAGE_SHORT[id]));
    }
    if (withLegend) bar.append(legendBtn());
    return bar;
  }
  function legendBtn() {
    return (el('button', {
      type: 'button', class: 'trd-tab', 'data-view': 'legend', 'aria-pressed': state.screen === 'legend' ? 'true' : 'false',
      onclick: () => { stopTimer(); stopChapterAudio(); setState({ view: 'legend', screen: 'legend' }); render(); focusSel('[data-view="legend"]'); },
    }, 'Trope legend'));
  }

  function renderReader() {
    const p = passage();
    items = flatten(p); idx = audioIndex(p); btns = new Map();
    if (cur != null && cur >= items.length) cur = null;
    const trad = tradition();
    const opts = { showTrope: state.showTrope, showNiqqud: state.showNiqqud };

    const switches = el('div', { class: 'trd-bar', role: 'group', 'aria-label': 'Show or hide' },
      toggle('Cantillation marks', 'showTrope', 'Cantillation marks shown.', 'Cantillation marks hidden.'),
      toggle('Vowel points', 'showNiqqud', 'Vowel points shown.', 'Vowel points hidden. Tap a word to see it pointed.'));
    const calm = calmOn(ctx); // calm mode: no pace choice, no timer; the learner steps the highlight by hand
    const speeds = el('div', { class: 'trd-bar', role: 'group', 'aria-label': 'Pace for Read with me' });
    for (const s of (calm ? [] : SPEEDS)) {
      speeds.append(el('button', {
        type: 'button', class: 'trd-speed', 'data-speed': s.id, 'aria-pressed': state.speed === s.id ? 'true' : 'false',
        onclick: () => { setState({ speed: s.id }); if (timer != null) { startRun(); } else say(`Pace set to ${s.id}, about ${(s.ms / 1000).toFixed(1)} seconds a word.`); render(); focusSel(`[data-speed="${s.id}"]`); },
      }, `${s.label} (${(s.ms / 1000).toFixed(1)} s)`));
    }
    const sizes = el('div', { class: 'trd-bar', role: 'group', 'aria-label': 'Hebrew text size' });
    for (const z of SIZES) {
      sizes.append(el('button', {
        type: 'button', class: 'trd-size', 'data-size': z.id, 'aria-pressed': state.size === z.id ? 'true' : 'false',
        onclick: () => { setState({ size: z.id }); say(`Hebrew text size: ${z.label.toLowerCase()}.`); render(); focusSel(`[data-size="${z.id}"]`); },
      }, `Text: ${z.label}`));
    }
    runBtn = calm ? null : el('button', { type: 'button', class: 'trd-run', 'aria-pressed': 'false', onclick: () => (timer != null ? pauseRun() : startRun()) }, 'Read with me');
    const stepBar = el('div', { class: 'trd-bar', role: 'group', 'aria-label': calm ? 'Step through the words' : 'Read with me controls' },
      el('button', { type: 'button', class: 'trd-prev', onclick: () => manualStep(-1) }, 'Previous word'),
      runBtn,
      el('button', { type: 'button', class: 'trd-next', onclick: () => manualStep(1) }, 'Next word'));

    // The detail box sits directly under the verse of the selected word, so on a phone it is on screen when a word is tapped.
    const detail = el('div', { class: 'trd-detail', id: 'trd-detail', role: 'region', 'aria-label': 'Selected word', 'aria-live': 'polite' });
    const slots = new Map();

    const verses = el('div', { class: 'trd-verses' });
    p.verses.forEach((v, vi) => {
      const unit = p.readingUnits.find((u) => u.id === v.unit);
      const label = el('p', { class: 'trd-vlabel' }, `${v.ref}${unit && /narrative/.test(unit.label) ? ' (narrative, not part of the blessing)' : ''}`);
      const line = el('p', { class: 'trd-line', dir: 'rtl', lang: 'he', role: 'group', 'aria-label': `${v.ref}, Hebrew` });
      const large = largePositions(v);
      for (const it of items.filter((x) => x.verseIndex === vi)) {
        const tr = translit(plainOf(it));
        const parts = displayParts(it, opts, large);
        const shown = parts.map((x) => x.t).join(''); // WCAG 2.5.3: the visible text leads the accessible name
        const b = el('button', {
          type: 'button', class: 'trd-w' + (cur === it.n ? ' trd-cur' : '') + (sel === it.n ? ' trd-sel' : ''), lang: 'he', dir: 'rtl',
          'data-n': it.n, tabindex: (cur ?? sel ?? 0) === it.n ? '0' : '-1',
          'aria-label': `${shown}, ${tr}, word ${it.n + 1} of ${items.length}`, 'aria-current': cur === it.n ? 'true' : 'false',
          onclick: () => select(it.n),
          onkeydown: (e) => onKey(e, it.n),
        }, ...parts.map((x) => (x.big ? el('span', { class: 'trd-lg' }, x.t) : x.t)));
        btns.set(it.n, b);
        line.append(b);
      }
      line.append(el('span', { class: 'trd-stop', 'aria-hidden': 'true' }, '׃'));
      const lineId = idx.lines.get(v.verse);
      const hear = el('button', { type: 'button', class: 'trd-hearline', onclick: () => playAudio('line', lineId || `torahreader-${p.id}-${v.verse}`, spokenText(v.he), `${v.ref}`) }, `Hear ${v.ref}`);
      const slot = el('div', { class: 'trd-slot' }); slots.set(vi, slot);
      const lgNote = large.length ? el('p', { class: 'trd-lgnote' }, 'Written large in the source text: ', ...(v.largeLetters || []).flatMap((c, i) => [i ? ', ' : '', el('span', { lang: 'he', dir: 'rtl' }, c)]), '.') : null;
      const enText = v.english ? uiEnglish(ctx, v.english) : '';
      if (state.prayLang === 'en') {
        verses.append(el('div', { class: 'trd-verse trd-verse-en', 'data-verse': v.verse }, label,
          el('p', { class: 'trd-en-only', lang: 'en' }, enText),
          el('button', { type: 'button', class: 'trd-hearline', onclick: () => speakEnglish(enText, v.ref) }, `Hear ${v.ref} in English`)));
        return;
      }
      verses.append(el('div', { class: 'trd-verse', 'data-verse': v.verse }, label, line, lgNote,
        el('p', { class: 'trd-say', lang: 'en' }, el('span', { class: 'trd-say-k' }, 'Say it: '), translit(v.he)),
        enText ? el('p', { class: 'trd-en' }, el('span', { class: 'trd-say-k' }, 'It means: '), enText) : null, slot, hear));
    });
    const langBar = el('div', { class: 'trd-bar trd-praylang', role: 'group', 'aria-label': 'Pray in' },
      el('span', { class: 'trd-praylang-k' }, 'Pray in:'),
      el('button', { type: 'button', 'data-praylang': 'he', 'aria-pressed': state.prayLang !== 'en' ? 'true' : 'false', onclick: () => { setState({ prayLang: 'he' }); render(); } }, 'Hebrew'),
      el('button', { type: 'button', 'data-praylang': 'en', 'aria-pressed': state.prayLang === 'en' ? 'true' : 'false', onclick: () => { stopTimer(); setState({ prayLang: 'en' }); render(); } }, 'English'));

    function select(n) { showDetail(n); say(`Selected word ${n + 1}: ${translit(plainOf(items[n]))}`); }
    function showDetail(n) {
      sel = n;
      const it = items[n];
      for (const [k, sl] of slots) if (k !== it.verseIndex) sl.replaceChildren();
      slots.get(it.verseIndex).replaceChildren(detail);
      for (const [k, b] of btns) { b.className = b.className.replace(' trd-sel', '') + (k === n ? ' trd-sel' : ''); b.setAttribute('tabindex', k === n ? '0' : '-1'); }
      const row = tropeRow(it);
      const marks = it.words.flatMap((w) => w.marks).filter((m, i, a) => a.indexOf(m) === i);
      const wid = idx.words.get(`${it.verse.verse}:${it.token.t}`);
      detail.replaceChildren(...[
        el('p', { class: 'trd-big', dir: 'rtl', lang: 'he' }, ...displayParts(it, { showTrope: true, showNiqqud: true }, largePositions(it.verse)).map((x) => (x.big ? el('span', { class: 'trd-lg' }, x.t) : x.t))),
        el('p', { class: 'trd-translit' }, el('strong', {}, 'Say it (' + trad + ' tradition): '), translit(plainOf(it)) || 'no transliteration'),
        el('p', { class: 'trd-translit-note' }, `Respelling follows your ${TRAD_LABELS[trad]} setting. It is rule-generated, not checked by a native speaker, and does not mark which syllable is stressed.${trad === 'ashkenazi' ? '' : ' The Israeli and Sephardi settings give the same letters here.'}`),
        it.token.gloss ? el('p', { class: 'trd-gloss' }, el('strong', {}, 'Literal gloss: '), it.token.gloss) : el('p', { class: 'trd-gloss' }, 'No literal gloss is stored for this word.'),
        row ? el('p', { class: 'trd-trope' }, el('strong', {}, 'Mark: '), `${tropeName(row, trad)} (${trad === 'ashkenazi' ? 'Ashkenazi' : 'Sephardi'} name), ${CLS_LABEL[row.cls] || row.cls}.`)
          : el('p', { class: 'trd-trope' }, el('strong', {}, 'Mark: '), 'none of its own.'),
        marks.length > 1 ? el('p', { class: 'trd-marks' }, 'All marks on this word: ' + marks.join(', ') + '.') : null,
        el('button', { type: 'button', class: 'trd-hear', onclick: () => playAudio('word', wid || `torahreader-${p.id}-${it.verse.verse}-${it.token.t + 1}`, spokenText(plainOf(it)), 'this word') }, 'Hear it')].filter(Boolean));
    }
    function tropeRow(it) {
      const t = it.token.trope; const m = tropeById(data.table);
      if (!t) return null;
      return m.get(t) || null;
    }
    function onKey(e, n) {
      // Hebrew reads right to left: ArrowLeft goes to the NEXT word, ArrowRight to the previous one.
      const k = e?.key; let to = null;
      if (k === 'ArrowLeft') to = n + 1; else if (k === 'ArrowRight') to = n - 1;
      else if (k === 'Home') to = 0; else if (k === 'End') to = items.length - 1;
      if (to == null || to < 0 || to >= items.length) return;
      e.preventDefault?.();
      for (const [kk, b] of btns) b.setAttribute('tabindex', kk === to ? '0' : '-1');
      btns.get(to)?.focus?.();
    }

    if (sel != null && sel < items.length) showDetail(sel);
    // Secondary controls sit in a closed details so the first verse is on the first screen of a phone.
    const ctl = el('details', { class: 'trd-ctl', open: ctlOpen ? '' : null, ontoggle: (e) => { ctlOpen = !!(e?.target?.open); } },
      el('summary', {}, calm ? 'Marks, text size, step through words, legend' : 'Marks, text size, Read with me, legend'),
      el('p', { class: 'trd-hint' }, 'Tap or press a word to see it with its vowel points and mark, its transliteration (', trad, ' tradition) and to hear it. The details open under that verse.'),
      switches, sizes, calm ? null : speeds, stepBar, el('p', { class: 'trd-pace' }, calm ? CALM_NOTE : PACE_NOTE), legendBtn());
    return [langBar, ctl, verses];
  }

  // ---------- full Torah: home + chapter ----------
  const bookName = (id) => (TORAH_BOOKS.find((b) => b.id === id) || {}).en || id;
  const rangeLabel = (p) => `${bookName(p.from.book)} ${p.from.chapter}:${p.from.verse} – ${bookName(p.to.book)} ${p.to.chapter}:${p.to.verse}`;
  async function goChapter(book, chapter, portionId = null) {
    stopTimer(); stopChapterAudio(); targetVerse = null; shownTranslit.clear();
    setState({ screen: 'chapter', book, chapter, portionId });
    await ensureChapter();
    if (alive) render();
  }
  function openPortion(p) { const secs = portionChapters(torah, p); if (secs.length) goChapter(secs[0].book, secs[0].chapter, p.id); }
  function fallbackLine(lang) {
    const kind = lang === 'en' ? 'line-en' : 'line';
    const prefix = lang === 'en' ? `torah-en-${state.book}-` : `torah-${state.book}-`;
    const entries = torahManifest.filter((e) => e && e.kind === kind && typeof e.id === 'string' && e.id.startsWith(prefix));
    if (!entries.length) return null;
    const total = new Set(entries.map((e) => e.id)).size;
    const fb = new Set(entries.filter((e) => e.engine === 'wavenet-fallback').map((e) => e.id));
    if (!fb.size || fb.size / total <= 0.05) return null;
    return `Most of this book is read in the high-grade voice; ${fb.size} verses use the standard voice.`;
  }
  function labelBlock() {
    const kids = [
      el('p', { class: 'trd-label-text' }, TORAH_TEXT_LABEL),
      el('p', { class: 'trd-label-audio' }, TORAH_AUDIO_LABEL),
      el('p', { class: 'trd-label-en-audio' }, TORAH_EN_AUDIO_LABEL),
      el('p', { class: 'trd-label-reading' }, TORAH_READING_LABEL),
      el('p', { class: 'trd-label-draft' }, DRAFT_LABEL),
    ];
    for (const lang of ['he', 'en']) { const line = fallbackLine(lang); if (line) kids.push(el('p', { class: 'trd-label-fallback' }, line)); }
    if (chapterData?.attribution) kids.push(el('p', { class: 'trd-label-attrib' }, chapterData.attribution));
    return el('div', { class: 'trd-labels' }, ...kids);
  }

  function renderHome() {
    const out = [el('p', { class: 'trd-home-intro' }, 'The whole Torah, Hebrew and English side by side. Genesis is here first; the other four books follow on the same pages.')];
    if (!torah) { out.push(el('p', { class: 'trd-error', role: 'alert' }, 'The Torah text could not be loaded. Check your connection and reload.')); return out; }
    const bookRow = torah.books.find((b) => b.id === state.book);
    if (bookRow && (bookRow.chaptersAvailable || 0) >= state.chapter) {
      out.push(el('div', { class: 'trd-card trd-continue' }, el('h2', {}, 'Continue reading'),
        el('p', {}, `${bookRow.en} ${state.chapter}`),
        el('button', { type: 'button', class: 'trd-open-chapter', 'data-continue': '1', onclick: () => goChapter(state.book, state.chapter) }, `Continue: ${bookRow.en} ${state.chapter}`)));
    }
    const week = el('div', { class: 'trd-card trd-week' }, el('h2', {}, "This week's parasha"));
    if (weekPortion && weekPortion.portions.length) {
      for (const p of weekPortion.portions) {
        week.append(el('p', { class: 'trd-week-line' }, `Read this week's portion: ${p.en} — ${rangeLabel(p)}`),
          el('button', { type: 'button', class: 'trd-week-open', 'data-portion-open': p.id, onclick: () => openPortion(p) }, `Read ${p.en}`));
      }
    } else {
      week.append(el('p', { class: 'trd-week-none' }, 'No regular portion this Shabbat'),
        el('p', {}, 'On a festival Shabbat there is no regular weekly portion. The books below are always there.'));
    }
    out.push(week);
    out.push(el('h2', {}, 'The five books'));
    const cards = el('div', { class: 'trd-cards' });
    for (const b of torah.books) {
      const avail = b.chaptersAvailable || 0;
      cards.append(el('div', { class: 'trd-card trd-book', 'data-book': b.id },
        el('h3', {}, `${b.en} `, el('span', { lang: 'he', dir: 'rtl' }, b.he)),
        el('p', {}, `${b.chapters} chapters · ${b.verses} verses`),
        avail > 0
          ? el('button', { type: 'button', class: 'trd-book-open', 'data-book-open': b.id, onclick: () => goChapter(b.id, 1) }, `Read ${b.en}`)
          : el('p', { class: 'trd-soon' }, 'Coming soon — its chapters are being prepared.')));
    }
    out.push(cards);
    out.push(el('h2', {}, 'The 54 portions'));
    const plist = el('div', { class: 'trd-cards' });
    for (const p of torah.parshiyot) {
      const secs = portionChapters(torah, p);
      plist.append(el('div', { class: 'trd-card trd-portion', 'data-portion': p.id },
        el('h3', {}, `${p.num}. ${p.en} `, el('span', { lang: 'he', dir: 'rtl' }, p.he)),
        el('p', {}, rangeLabel(p)),
        secs.length
          ? el('button', { type: 'button', class: 'trd-portion-open', 'data-portion-open': p.id, onclick: () => openPortion(p) }, `Read ${p.en}`)
          : el('p', { class: 'trd-soon' }, 'Coming soon.')));
    }
    out.push(plist);
    out.push(el('h2', {}, 'Study in depth'),
      el('p', {}, 'Two passages are also here word by word, with the marks named and a literal gloss where one exists.'),
      el('div', { class: 'trd-bar', role: 'group', 'aria-label': 'Study a passage in depth' },
        ...PASSAGE_IDS.map((id) => el('button', { type: 'button', 'data-study': id, onclick: () => { stopChapterAudio(); setState({ passage: id, view: 'reader', screen: 'study' }); render(); } }, PASSAGE_LABEL[id]))));
    out.push(labelBlock());
    return out;
  }

  function studyTargetFor(book, chapter, verse) {
    if (book === 'numbers' && chapter === 6 && verse >= 22 && verse <= 27) return 'priestly-blessing';
    if (book === 'deuteronomy' && chapter === 6 && verse >= 4 && verse <= 9) return 'shema';
    return null;
  }
  function verseRow(v) {
    const base = state.showTrope ? v.heTrope : v.he;
    const heShown = state.showNiqqud ? base : stripNiqqud(base);
    const study = studyTargetFor(state.book, state.chapter, v.n);
    const row = el('div', { class: 'trd-row' + (targetVerse === v.n ? ' trd-target' : ''), 'data-torah-verse': String(v.n), 'aria-current': targetVerse === v.n ? 'true' : 'false' },
      el('div', { class: 'trd-cell-he' },
        el('p', { class: 'trd-vlabel' }, el('span', { class: 'trd-vnum' }, `${state.chapter}:${v.n}`)),
        el('p', { class: 'trd-hebrew' + (fingerGuide.enabled() ? ' trd-finger-on' : ''), lang: 'he', dir: 'rtl' }, ...fingerGuide.text(heShown, v.n)),
        manifestHas('line', torahVerseId(state.book, state.chapter, v.n))
          ? el('button', { type: 'button', class: 'trd-hear-verse', 'aria-label': `Hear ${chapterData.ref}:${v.n} in Hebrew (synthetic voice)`, onclick: () => playTorahVerse(v) }, 'Hear')
          : null,
        el('button', { type: 'button', class: 'trd-sounds', 'data-translit': String(v.n), 'aria-pressed': (state.showPronunciation !== shownTranslit.has(v.n)) ? 'true' : 'false',
          onclick: () => { if (shownTranslit.has(v.n)) shownTranslit.delete(v.n); else shownTranslit.add(v.n); render(); } }, 'Sounds'),
        (state.showPronunciation !== shownTranslit.has(v.n)) ? el('p', { class: 'trd-translit', lang: 'en', dir: 'ltr', 'data-pronunciation-verse': String(v.n) }, translit(v.he), el('span', { class: 'trd-translit-note' }, ` ${TRANSLIT_LABEL}`)) : null,
        study ? el('button', { type: 'button', class: 'trd-study-link', onclick: () => { setState({ passage: study, view: 'reader', screen: 'study' }); render(); } }, 'Study this passage in depth') : null),
      state.showEnglish ? el('div', { class: 'trd-cell-en' }, el('p', { class: 'trd-en' }, v.en)) : null);
    chapterRows.set(v.n, row);
    return row;
  }
  function chapterAudioBar(inPortion) {
    if (inPortion || !chapterData) return [];
    const ready = {};
    for (const lang of ['he', 'en']) ready[lang] = manifestHas(torahChapterKind(lang), torahChapterId(state.book, state.chapter, lang));
    if (!ready.he && !ready.en) return [];
    const lang = state.audioLang;
    return [el('div', { class: 'trd-bar trd-audiobar', role: 'group', 'aria-label': 'Chapter audio' },
      el('button', { type: 'button', 'data-audiolang': 'he', 'aria-pressed': lang === 'he' ? 'true' : 'false', onclick: () => { setState({ audioLang: 'he' }); render(); } }, 'Hebrew'),
      el('button', { type: 'button', 'data-audiolang': 'en', 'aria-pressed': lang === 'en' ? 'true' : 'false', onclick: () => { setState({ audioLang: 'en' }); render(); } }, 'English'),
      ready[lang]
        ? el('button', { type: 'button', class: 'trd-play-chapter', 'aria-label': `Play ${chapterData.ref} read aloud in ${lang === 'en' ? 'English' : 'Hebrew'} (synthetic voice)`, onclick: () => playChapter(lang) }, `Play ${chapterData.ref} read aloud`)
        : el('span', { class: 'trd-audio-wait' }, lang === 'en' ? 'English audio is not ready for this chapter yet.' : 'Hebrew audio is not ready for this chapter yet.'),
      el('button', { type: 'button', class: 'trd-stop-chapter', onclick: () => { stopChapterAudio(); try { ctx?.audio?.stop?.(); } catch { /* ignore */ } say('Chapter audio stopped.'); } }, 'Stop'))];
  }
  function renderChapter() {
    fingerGuide.begin(`${state.book}/${state.chapter}/${state.portionId || ''}`);
    if (!torah) return [el('p', { class: 'trd-error', role: 'alert' }, 'The Torah text could not be loaded. Check your connection and reload.')];
    if (!chapterData) return [el('p', { class: 'trd-error', role: 'alert' }, 'This chapter could not be loaded. Check your connection and reload.')];
    const bookRow = torah.books.find((b) => b.id === state.book) || torahBook(state.book);
    const portion = state.portionId ? torah.parshiyot.find((p) => p.id === state.portionId) : null;
    const sec = portion ? portionChapter(torah, portion, state.book, state.chapter) : null;
    const out = [];
    chapterRows.clear();
    out.push(el('h2', { class: 'trd-ch-title' }, `${bookRow.en} ${state.chapter} `, el('span', { lang: 'he', dir: 'rtl' }, chapterData.bookHe || bookRow.he)));
    const parshaNames = (chapterData.parshaIds || []).map((id) => torah.parshiyot.find((p) => p.id === id)?.en).filter(Boolean);
    if (parshaNames.length) out.push(el('p', { class: 'trd-ch-parsha' }, `In the weekly portion${parshaNames.length > 1 ? 's' : ''}: ${parshaNames.join(', ')}.`));
    if (portion && sec) {
      out.push(el('div', { class: 'trd-card trd-portion-banner' },
        el('p', {}, `Reading ${portion.en}: ${rangeLabel(portion)}. This chapter shows verses ${sec.fromVerse}–${sec.toVerse} of it.`),
        el('button', { type: 'button', class: 'trd-portion-exit', onclick: () => { setState({ portionId: null }); render(); } }, 'Read the whole chapter')));
    }
    const seq = portion ? portionChapters(torah, portion) : null;
    let prev = null, next = null;
    if (seq) { const i = seq.findIndex((s) => s.book === state.book && s.chapter === state.chapter); prev = i > 0 ? seq[i - 1] : null; next = i >= 0 && i < seq.length - 1 ? seq[i + 1] : null; }
    else { prev = adjacentChapter(torah, state.book, state.chapter, -1); next = adjacentChapter(torah, state.book, state.chapter, 1); }
    out.push(el('div', { class: 'trd-bar', role: 'group', 'aria-label': 'Chapter navigation' },
      prev ? el('button', { type: 'button', class: 'trd-prev-ch', onclick: () => goChapter(prev.book, prev.chapter, portion ? portion.id : null) }, `Previous: ${bookName(prev.book)} ${prev.chapter}`) : null,
      next ? el('button', { type: 'button', class: 'trd-next-ch', onclick: () => goChapter(next.book, next.chapter, portion ? portion.id : null) }, `Next: ${bookName(next.book)} ${next.chapter}`) : null,
      el('button', { type: 'button', class: 'trd-home-btn', onclick: () => { stopChapterAudio(); setState({ screen: 'home' }); render(); } }, 'Torah home')));
    if (!portion) {
      out.push(el('details', { class: 'trd-ctl' }, el('summary', {}, `Jump to a chapter of ${bookRow.en}`),
        el('div', { class: 'trd-chapters' }, ...Array.from({ length: bookRow.chaptersAvailable || 0 }, (_, i) => el('button', { type: 'button', 'data-chapter-link': String(i + 1), 'aria-pressed': state.chapter === i + 1 ? 'true' : 'false', onclick: () => goChapter(state.book, i + 1) }, String(i + 1))))));
    }
    out.push(el('div', { class: 'trd-bar', role: 'group', 'aria-label': 'Reading controls' },
      toggle('Cantillation marks', 'showTrope', 'Cantillation marks shown.', 'Cantillation marks hidden.'),
      toggle('Vowel points', 'showNiqqud', 'Vowel points shown.', 'Vowel points hidden.'),
      toggle('English', 'showEnglish', 'English shown.', 'English hidden.'),
      toggle('Pronunciation guide', 'showPronunciation', 'Pronunciation guide shown.', 'Pronunciation guide hidden.')));
    if (state.showPronunciation) out.push(el('p', { class: 'trd-hint' }, 'Reading the English letters: a as in father; e as in bed; i as in machine; o as in go (without the final glide); u as in flute. Sh as in ship; ch and kh are the throat sound in Bach; tz as in cats. This generated guide does not mark syllable stress and still needs pronunciation review.'));
    out.push(...chapterAudioBar(!!sec));
    out.push(fingerGuide.controls());
    const versesBox = el('div', { class: 'trd-chapter-verses' });
    const shown = chapterData.verses.filter((v) => !sec || (v.n >= sec.fromVerse && v.n <= sec.toVerse));
    let firstShown = true;
    for (const v of shown) {
      const aliyah = sec?.aliyot.find((a) => a.verse === v.n);
      if (aliyah) versesBox.append(el('p', { class: 'trd-aliyah', 'data-aliyah': String(aliyah.n) }, `Aliyah ${aliyah.n}`));
      if (v.breakBefore && !firstShown) versesBox.append(el('p', { class: 'trd-break', 'aria-label': v.breakBefore === 'open' ? 'Open section break (petucha)' : 'Closed section break (setuma)' }, v.breakBefore === 'open' ? 'פ' : 'ס'));
      firstShown = false;
      versesBox.append(verseRow(v));
    }
    fingerGuide.bind(versesBox);
    out.push(versesBox);
    out.push(labelBlock());
    return out;
  }

  function renderLegend() {
    const { groups, counts } = legend(data.table, data.tropes);
    const only = el('button', {
      type: 'button', class: 'trd-only', 'aria-pressed': legendOnlyHere ? 'true' : 'false',
      onclick: () => { legendOnlyHere = !legendOnlyHere; render(); focusSel('.trd-only'); },
    }, 'Only marks that occur in these two passages');
    const out = [el('p', { class: 'trd-legend-notice' }, el('strong', {}, 'Reference, not a chanting teacher. '), LEGEND_NOTICE),
      el('p', {}, 'Two naming systems are common: Ashkenazi and Sephardi. Both are shown. Levels group the pausing marks by strength (1 strongest) in a common teaching scheme; the numbers are not part of the text.'), only];
    for (const g of groups) {
      const rows = g.rows.filter((r) => !legendOnlyHere || r.occurs > 0);
      if (!rows.length) continue;
      const table = el('table', { class: 'trd-table', 'data-group': g.id },
        el('caption', {}, g.title),
        el('thead', {}, el('tr', {}, ...['Mark', 'Ashkenazi name', 'Sephardi name', 'Class and level', 'Placement', 'Times in these passages'].map((h) => el('th', { scope: 'col' }, h)))),
        el('tbody', {}, ...rows.map((r) => el('tr', { 'data-id': r.id },
          el('th', { scope: 'row' }, el('span', { class: 'trd-glyph', lang: 'he', dir: 'rtl', 'aria-hidden': 'true' }, markGlyph(r)), el('span', {}, ` ${r.unicodePoint}`)),
          el('td', {}, r.ashkenazi, ' ', el('span', { lang: 'he', dir: 'rtl' }, r.ashkenaziHe)),
          el('td', {}, r.sephardi, ' ', el('span', { lang: 'he', dir: 'rtl' }, r.sephardiHe)),
          el('td', {}, CLS_LABEL[r.cls] || r.cls, r.level ? `, level ${r.level}` : '', r.note ? `. ${r.note}.` : ''),
          el('td', {}, r.placement),
          el('td', {}, String(counts[r.id] || 0))))));
      // The table is wider than a phone screen: it scrolls sideways inside its own box (focusable, so a keyboard can scroll it).
      out.push(el('div', { class: 'trd-scroll', tabindex: '0', role: 'region', 'aria-label': `${g.title}: table, scrolls sideways` }, table));
    }
    out.push(el('p', {}, 'The poetic-book marks (Psalms, Proverbs, Job) are not used in these two passages and are not listed here.'));
    return out;
  }

  function render() {
    if (!alive) return;
    if (error) { body.replaceChildren(el('p', { class: 'trd-error', role: 'alert' }, 'The reader data could not be loaded. Check your connection and reload.')); return; }
    if (!data) { body.replaceChildren(el('p', {}, 'Loading…')); return; }
    if (state.screen !== 'study') stopTimer();
    if (state.screen !== 'chapter') { stopChapterAudio(); fingerGuide.pause(); }
    wrap.setAttribute('style', `--trd-scale:${sizeScale(state.size)}`);
    const screen = state.screen;
    h1.textContent = screen === 'home' ? 'Torah reader'
      : screen === 'chapter' ? `${bookName(state.book)} ${state.chapter}`
        : 'Torah reader: Priestly Blessing and Shema';
    if (screen === 'legend') body.replaceChildren(tabs(true), ...renderLegend());
    else if (screen === 'home') body.replaceChildren(tabs(true), ...renderHome());
    else if (screen === 'chapter') {
      body.replaceChildren(tabs(true), ...renderChapter());
      if (targetVerse != null) { try { chapterRows.get(targetVerse)?.scrollIntoView?.({ block: 'nearest' }); } catch { /* optional */ } }
    } else body.replaceChildren(tabs(true), ...renderReader());
    if (screen === 'study') refreshRun();
    if (screen === 'study' || screen === 'legend') {
      const p = screen === 'study' ? passage() : null;
      footer.replaceChildren(el('p', {}, p ? p.attribution : 'Mark names: a project table built from common Ashkenazi and Sephardi lists; no cantor has reviewed it. Mark positions: Unicode/XML Leningrad Codex (Tanach.us, copy without restriction).'),
        el('p', {}, 'English: JPS 1917 (public domain; the label comes from Sefaria and was not independently checked). Literal glosses are original to this course.'));
    } else footer.replaceChildren();
  }

  const onVis = () => { if (document.hidden) { fingerGuide.pause(); if (timer != null) pauseRun(); } };
  try { document.addEventListener?.('visibilitychange', onVis); } catch { /* optional */ }

  const ready = (async () => {
    try { state = normaliseState(await storeGet(ctx, STORE_KEY, null)); } catch { state = { ...DEFAULT_STATE }; }
    // Deep links (ctx.query, from the router): a study passage, a screen, or a chapter of the full Torah.
    const q = ctx?.query || {};
    if (PASSAGE_IDS.includes(q.passage)) { state.passage = q.passage; state.screen = 'study'; state.view = 'reader'; }
    if (SCREENS.includes(q.screen)) state.screen = q.screen;
    const qb = torahBook(q.book);
    if (qb) {
      state.book = qb.id; state.screen = 'chapter'; state.portionId = null;
      const ch = Number(q.chapter);
      if (Number.isInteger(ch) && ch >= 1 && ch <= qb.chapters) state.chapter = ch;
    } else if (q.chapter != null && state.screen === 'chapter') {
      const ch = Number(q.chapter); const b = torahBook(state.book);
      if (b && Number.isInteger(ch) && ch >= 1 && ch <= b.chapters) state.chapter = ch;
    }
    if (q.verse != null) { const vn = Number(q.verse); if (Number.isInteger(vn) && vn >= 1) targetVerse = vn; }
    try { data = await loadAll(load); } catch (e) { error = e?.message || String(e); }
    if (!error) {
      try { torah = await loadTorahIndex(load); } catch { torah = null; }
      torahManifest = await loadTorahManifest(load);
      try { calendarPrefsRaw = await storeGet(ctx, CAL_PREFS_KEY, null); } catch { calendarPrefsRaw = null; }
      computeWeek();
      if (state.screen === 'chapter') await ensureChapter();
    }
    render();
    try { h1.focus?.(); } catch { /* ignore */ }
  })();

  const unmount = () => {
    alive = false; stopTimer(); stopChapterAudio(); fingerGuide.dispose();
    try { document.removeEventListener?.('visibilitychange', onVis); } catch { /* ignore */ }
    try { ctx?.audio?.stop?.(); } catch { /* ignore */ }
    try { wrap.remove?.(); } catch { /* ignore */ }
  };
  unmount.ready = ready;
  return unmount;
}
