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
import { loadAll, loadJson } from './loader.js';
import { uiEnglish } from '../shell/names.js';
import { playLine } from '../pronunciation/forTradition.js';
import {
  STORE_KEY, PASSAGE_IDS, SPEEDS, DEFAULT_STATE, normaliseState, speedMs, flatten, display, plainOf, spokenText, audioIndex,
  tropeById, tropeName, legend, markGlyph, stepIndex,
} from './model.js';

export const NOTICE = 'Draft, not checked by a cantor, rabbi or Hebrew teacher. The Hebrew and the cantillation marks come from the Leningrad Codex (UXLC, tanach.us); a program read the marks, and this screen shows which mark sits on which word and what kind of mark it is. It does not teach melodies and plays no chanting.';
export const LEGEND_NOTICE = 'Reference only, not a chanting teacher. This page names the marks and says whether each one pauses or joins. It does not describe or play any melody, because melodies are passed on by ear and differ between communities, and nobody qualified has reviewed this table. To learn to chant, work with a cantor or teacher from your own community.';
export const PACE_NOTE = 'The highlight moves at the pace you pick. It is not synchronised with any audio or chanting.';
const TRAD = { israeli: 1, sephardi: 1, ashkenazi: 1 };
const PASSAGE_LABEL = { 'priestly-blessing': 'Priestly Blessing (Numbers 6:22-27)', shema: 'Shema and V’ahavta (Deuteronomy 6:4-9)' };
const CLS_LABEL = { disjunctive: 'pauses (disjunctive)', conjunctive: 'joins to the next word (conjunctive)', 'secondary-stress': 'stress mark (not a trope)', separator: 'separator (not a melody)', 'verse-end': 'verse end (punctuation)' };

const CSS = `
.alef-trd{max-inline-size:44rem;margin-inline:auto;overflow-wrap:anywhere}
.alef-trd *{box-sizing:border-box}
.alef-trd .trd-notice{border-inline-start:6px solid currentColor;padding-inline-start:.6rem;margin-block:.75rem}
.alef-trd .trd-bar{display:flex;flex-wrap:wrap;gap:.5rem;margin-block:.75rem}
.alef-trd button{min-block-size:var(--tap,48px);min-inline-size:var(--tap,48px);padding:.4rem .8rem;font:inherit;border:2px solid var(--border,#767676);border-radius:8px;background:var(--card,#fff);color:inherit;cursor:pointer}
.alef-trd button[aria-pressed="true"]{border-width:3px;font-weight:700;text-decoration:underline}
.alef-trd button:focus-visible{outline:3px solid currentColor;outline-offset:2px}
.alef-trd .trd-verse{margin-block:1rem;padding:.5rem;border:1px solid var(--border,#bbb);border-radius:8px}
.alef-trd .trd-vlabel{font-size:.9rem;font-weight:700;margin:0 0 .25rem}
.alef-trd .trd-line{direction:rtl;font-size:2rem;line-height:2.2;margin:.25rem 0;display:flex;flex-wrap:wrap;gap:.25rem .5rem}
.alef-trd .trd-w{font-size:inherit;line-height:1.6;min-inline-size:var(--tap,48px)}
.alef-trd .trd-w.trd-cur{border-width:4px;border-style:double;background:var(--hl,#ffe9a8);color:var(--hl-ink,#000)}
.alef-trd .trd-w.trd-sel{border-style:dashed}
.alef-trd .trd-stop{font-size:2rem;line-height:1.6}
.alef-trd .trd-en{margin:.25rem 0;font-style:italic}
.alef-trd .trd-detail{border:2px solid currentColor;border-radius:8px;padding:.6rem;margin-block:1rem}
.alef-trd .trd-big{font-size:2.4rem;direction:rtl}
.alef-trd table{border-collapse:collapse;inline-size:100%}
.alef-trd th,.alef-trd td{border:1px solid var(--border,#999);padding:.3rem .4rem;text-align:start;vertical-align:top}
.alef-trd .trd-glyph{font-size:2rem;direction:rtl}
.alef-trd footer{margin-block-start:1.5rem;font-size:.85rem}
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
  wrap.append(h1, el('p', { class: 'trd-notice' }, NOTICE), body, status, footer);
  root.append(wrap);

  let alive = true, data = null, state = { ...DEFAULT_STATE }, error = null;
  let items = [], idx = null, btns = new Map(), cur = null, sel = null, timer = null, legendOnlyHere = false;
  const say = (t) => { status.textContent = t; };
  const save = () => storeSet(ctx, STORE_KEY, state);
  const passage = () => data.passages[state.passage];

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
  async function playAudio(kind, id, text, label) {
    if (!ctx?.audio || typeof ctx.audio.play !== 'function') { say(`No audio for ${label}: this build has no audio player.`); return; }
    try {
      try { ctx.audio.stop?.(); } catch { /* ignore */ }
      const r = await ctx.audio.play(kind, id, { text });
      if (!alive) return;
      say(playLine(r, tradition(), label));
    } catch (e) { say(`Audio error for ${label}: ${e?.message || e}`); }
  }

  // ---------- rendering ----------
  function setState(patch) { state = { ...state, ...patch }; save(); }
  const toggle = (label, key, onText, offText) => el('button', {
    type: 'button', class: 'trd-toggle', 'data-toggle': key, 'aria-pressed': state[key] ? 'true' : 'false',
    onclick: () => { setState({ [key]: !state[key] }); say(state[key] ? onText : offText); render(); focusSel(`[data-toggle="${key}"]`); },
  }, label);
  function focusSel(sel) { try { wrap.querySelector(sel)?.focus?.(); } catch { /* ignore */ } }

  function tabs() {
    const bar = el('div', { class: 'trd-bar', role: 'group', 'aria-label': 'Choose a passage or the legend' });
    for (const id of PASSAGE_IDS) {
      bar.append(el('button', {
        type: 'button', class: 'trd-tab', 'data-passage': id, 'aria-pressed': state.view === 'reader' && state.passage === id ? 'true' : 'false',
        onclick: () => { stopTimer(); cur = null; sel = null; setState({ passage: id, view: 'reader' }); render(); focusSel(`[data-passage="${id}"]`); },
      }, PASSAGE_LABEL[id]));
    }
    bar.append(el('button', {
      type: 'button', class: 'trd-tab', 'data-view': 'legend', 'aria-pressed': state.view === 'legend' ? 'true' : 'false',
      onclick: () => { stopTimer(); setState({ view: 'legend' }); render(); focusSel('[data-view="legend"]'); },
    }, 'Trope legend'));
    return bar;
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
    const speeds = el('div', { class: 'trd-bar', role: 'group', 'aria-label': 'Pace for Read with me' });
    for (const s of SPEEDS) {
      speeds.append(el('button', {
        type: 'button', class: 'trd-speed', 'data-speed': s.id, 'aria-pressed': state.speed === s.id ? 'true' : 'false',
        onclick: () => { setState({ speed: s.id }); if (timer != null) { startRun(); } else say(`Pace set to ${s.id}, about ${(s.ms / 1000).toFixed(1)} seconds a word.`); render(); focusSel(`[data-speed="${s.id}"]`); },
      }, `${s.label} (${(s.ms / 1000).toFixed(1)} s)`));
    }
    runBtn = el('button', { type: 'button', class: 'trd-run', 'aria-pressed': 'false', onclick: () => (timer != null ? pauseRun() : startRun()) }, 'Read with me');
    const stepBar = el('div', { class: 'trd-bar', role: 'group', 'aria-label': 'Read with me controls' },
      el('button', { type: 'button', class: 'trd-prev', onclick: () => manualStep(-1) }, 'Previous word'),
      runBtn,
      el('button', { type: 'button', class: 'trd-next', onclick: () => manualStep(1) }, 'Next word'));

    const detail = el('div', { class: 'trd-detail', id: 'trd-detail', role: 'region', 'aria-label': 'Selected word', 'aria-live': 'polite' },
      el('p', {}, 'Tap or press a word to see it with its vowel points and mark, its transliteration (', trad, ' tradition) and to hear it.'));

    const verses = el('div', { class: 'trd-verses' });
    p.verses.forEach((v, vi) => {
      const unit = p.readingUnits.find((u) => u.id === v.unit);
      const label = el('p', { class: 'trd-vlabel' }, `${v.ref}${unit && /narrative/.test(unit.label) ? ' (narrative, not part of the blessing)' : ''}`);
      const line = el('p', { class: 'trd-line', dir: 'rtl', lang: 'he', role: 'group', 'aria-label': `${v.ref}, Hebrew` });
      for (const it of items.filter((x) => x.verseIndex === vi)) {
        const tr = translit(plainOf(it));
        const b = el('button', {
          type: 'button', class: 'trd-w' + (cur === it.n ? ' trd-cur' : '') + (sel === it.n ? ' trd-sel' : ''), lang: 'he', dir: 'rtl',
          'data-n': it.n, tabindex: (cur ?? sel ?? 0) === it.n ? '0' : '-1',
          'aria-label': `${tr}, word ${it.n + 1} of ${items.length}`, 'aria-current': cur === it.n ? 'true' : 'false',
          onclick: () => select(it.n),
          onkeydown: (e) => onKey(e, it.n),
        }, display(it, opts));
        btns.set(it.n, b);
        line.append(b);
      }
      line.append(el('span', { class: 'trd-stop', 'aria-hidden': 'true' }, '׃'));
      const lineId = idx.lines.get(v.verse);
      const hear = el('button', { type: 'button', class: 'trd-hearline', onclick: () => playAudio('line', lineId || `torahreader-${p.id}-${v.verse}`, spokenText(v.he), `${v.ref}`) }, `Hear ${v.ref}`);
      verses.append(el('div', { class: 'trd-verse', 'data-verse': v.verse }, label, line,
        v.english ? el('p', { class: 'trd-en' }, uiEnglish(ctx, v.english)) : null, hear));
    });

    function select(n) {
      sel = n;
      const it = items[n];
      for (const [k, b] of btns) { b.className = b.className.replace(' trd-sel', '') + (k === n ? ' trd-sel' : ''); b.setAttribute('tabindex', k === n ? '0' : '-1'); }
      const row = tropeRow(it);
      const marks = it.words.flatMap((w) => w.marks).filter((m, i, a) => a.indexOf(m) === i);
      const wid = idx.words.get(`${it.verse.verse}:${it.token.t}`);
      detail.replaceChildren(...[
        el('p', { class: 'trd-big', dir: 'rtl', lang: 'he' }, display(it, { showTrope: true, showNiqqud: true })),
        el('p', { class: 'trd-translit' }, el('strong', {}, 'Say it (' + trad + ' tradition): '), translit(plainOf(it)) || 'no transliteration'),
        it.token.gloss ? el('p', { class: 'trd-gloss' }, el('strong', {}, 'Literal gloss: '), it.token.gloss) : el('p', { class: 'trd-gloss' }, 'No literal gloss is stored for this word.'),
        row ? el('p', { class: 'trd-trope' }, el('strong', {}, 'Mark: '), `${tropeName(row, trad)} (${trad === 'ashkenazi' ? 'Ashkenazi' : 'Sephardi'} name), ${CLS_LABEL[row.cls] || row.cls}.`)
          : el('p', { class: 'trd-trope' }, el('strong', {}, 'Mark: '), 'none of its own.'),
        marks.length > 1 ? el('p', { class: 'trd-marks' }, 'All marks on this word: ' + marks.join(', ') + '.') : null,
        el('button', { type: 'button', class: 'trd-hear', onclick: () => playAudio('word', wid || `torahreader-${p.id}-${it.verse.verse}-${it.token.t + 1}`, spokenText(plainOf(it)), 'this word') }, 'Hear it')].filter(Boolean));
      say(`Selected word ${n + 1}: ${translit(plainOf(it))}`);
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

    return [switches, speeds, stepBar, el('p', { class: 'trd-pace' }, PACE_NOTE), verses, detail];
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
      out.push(table);
    }
    out.push(el('p', {}, 'The poetic-book marks (Psalms, Proverbs, Job) are not used in these two passages and are not listed here.'));
    return out;
  }

  function render() {
    if (!alive) return;
    if (error) { body.replaceChildren(el('p', { class: 'trd-error', role: 'alert' }, `The reader data could not be loaded (${error}). Check your connection and reload.`)); return; }
    if (!data) { body.replaceChildren(el('p', {}, 'Loading…')); return; }
    stopTimerIfLegend();
    body.replaceChildren(tabs(), ...(state.view === 'legend' ? renderLegend() : renderReader()));
    if (state.view === 'reader') refreshRun();
    const p = state.view === 'reader' ? passage() : null;
    footer.replaceChildren(el('p', {}, p ? p.attribution : 'Mark names: a project table built from common Ashkenazi and Sephardi lists; no cantor has reviewed it. Mark positions: Unicode/XML Leningrad Codex (Tanach.us, copy without restriction).'),
      el('p', {}, 'English: JPS 1917 (public domain; the label comes from Sefaria and was not independently checked). Literal glosses are original to this course.'));
  }
  function stopTimerIfLegend() { if (state.view === 'legend') stopTimer(); }

  const onVis = () => { if (document.hidden && timer != null) pauseRun(); };
  try { document.addEventListener?.('visibilitychange', onVis); } catch { /* optional */ }

  const ready = (async () => {
    try { state = normaliseState(await storeGet(ctx, STORE_KEY, null)); } catch { state = { ...DEFAULT_STATE }; }
    try { data = await loadAll(ctx?.loadJson || loadJson); } catch (e) { error = e?.message || String(e); }
    render();
    try { h1.focus?.(); } catch { /* ignore */ }
  })();

  const unmount = () => {
    alive = false; stopTimer();
    try { document.removeEventListener?.('visibilitychange', onVis); } catch { /* ignore */ }
    try { ctx?.audio?.stop?.(); } catch { /* ignore */ }
    try { wrap.remove?.(); } catch { /* ignore */ }
  };
  unmount.ready = ready;
  return unmount;
}
