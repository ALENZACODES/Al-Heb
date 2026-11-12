/**
 * Reading Tools (#/readlab), DRAFT and unreviewed. Lazy route; code and data are fetched on first open.
 *   #/readlab                         the hub
 *   #/readlab/texts                   choose a story, prayer line or Torah verse;  ?sec=stories|prayers|torah&id=<book id or line id>
 *        in a text: vowel-mark slider kept per section (B1), tap any word for the Word Spotlight (B2, B3), family letters (B7),
 *        verb-pattern colours with a key (B8), the Fade Challenge (B1) and Three Versions with progressive unlock (B9)
 *   #/readlab/shva                    Sh'va Detective (B4)
 *   #/readlab/forms                   Final Forms and Dagesh (B5)
 *   #/readlab/stress                  Stress Drill (G7)
 *   #/readlab/progress                Reading by Text Type (B10)
 * Self-reported: the learner says how a read went; nothing is machine-graded except drill answers, which are checked against data.
 * Store key readlab.v1. ctx extras for tests: ctx.readlabLoad(rel) replaces the JSON loader.
 */
import { el, heText, storeGet, storeSet, CARDS_KEY } from '../curriculum/dom.js';
import { loadJSON } from '../curriculum/data.js';
import { isAudioFree } from '../shell/audiofree.js';
import { shelfOrder } from '../books/order.js';
import { modernShelf } from '../bridge/model.js';
import { BOOKS } from '../lib/counts.js';
import { STORE_KEY, DRAFT_NOTE, FADE_LEVELS, SECTIONS, normalizeState, setFade, fadeLine, challengeWords, challengeResult, challengeScore, addChallenge, challengesFor,
  CHALLENGE_MIN_WORDS, VERSIONS, versionOpen, versionDone, recordVersion, recordSet, progressByType, WHY_LABEL } from './model.js';
import { familyMatch, letterPieces, patternOf, PATTERN_KEY, hasDivineName, wordKey } from './words.js';
import { openSpotlight, wordButton, listenInto } from './spotlight.js';
import { wordPool, shvaItems, shvaSet, shvaDisplay, SHVA_DRILL_RULES, SHVA_NOT_COVERED, SHVA_ANSWERS, formCards, formItems, formSet, formTiles, blanked,
  stressItems, stressSet, STRESS_SOURCE_TEXT, SET_SIZE, shuffle, rng } from './drills.js';

export const TITLE = 'Reading Tools';
export const FILES = Object.freeze({
  books: 'data/books/index.json', registry: 'data/corpus/registry.json', tags: 'data/readlab/word-tags.json', stress: 'data/readlab/stress-words.json',
  g1: 'data/games/g1/words.json', readingSet: 'data/nikkudfade/reading-set.json', letters: 'data/letters/letters.json',
  signs: 'data/camera/sign-glossary.json', scenarios: 'data/israel/scenarios.json',
});
export const bookFile = (id) => `data/books/${id}.json`;
export const TOOLS = Object.freeze([
  { id: 'texts', name: 'Read With Tools', help: 'Stories, prayers and Torah verses with a vowel-mark slider, the Word Spotlight, family letters, verb-pattern colours, the Fade Challenge and Three Versions.' },
  { id: 'shva', name: 'Sh\'va Detective', help: 'Said or silent? Twenty words a set, with the rule for each answer.' },
  { id: 'forms', name: 'Final Forms and Dagesh', help: 'See, hear, pick and type the five final letters and the dot in bet, kaf and pe.' },
  { id: 'stress', name: 'Stress Drill', help: 'Tap the stressed syllable, then hear the word.' },
  { id: 'progress', name: 'Reading by Text Type', help: 'Prayers, Torah, stories and everyday texts, each counted on its own.' },
]);

export const CSS = `
.rl { display: grid; gap: .9rem; } .rl * { min-inline-size: 0; overflow-wrap: anywhere; }
.rl .btn { min-block-size: var(--tap, 44px); min-inline-size: 44px; }
.rl-row { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; }
.rl-text { display: flex; flex-wrap: wrap; gap: .3rem .5rem; direction: rtl; font-size: 1.7rem; line-height: 2; unicode-bidi: isolate; }
.rl-w { font: inherit; color: inherit; background: transparent; border: 1px solid transparent; border-radius: 8px; padding: 0 .25rem; min-block-size: 44px; cursor: pointer; }
.rl-w:hover, .rl-w:focus-visible { border-color: var(--border); }
.rl-w[aria-pressed="true"] { border: 2px dashed var(--focus, currentColor); text-decoration: underline wavy; }
.rl-fam { background: transparent; color: inherit; text-decoration: underline; text-decoration-thickness: 3px; text-underline-offset: 6px; font-weight: 700; }
.rl-pat { border-block-end-width: 4px; border-block-end-style: solid; }
.rl-tag { font-size: .7rem; margin-inline-start: .15rem; font-family: system-ui, sans-serif; }
.rl-b1 { border-block-end-color: #2a6fdb; } .rl-b2 { border-block-end-color: #b8860b; } .rl-b3 { border-block-end-color: #2e8b57; } .rl-b4 { border-block-end-color: #8e44ad; }
.rl-b5 { border-block-end-color: #c0392b; } .rl-b6 { border-block-end-color: #6d4c41; } .rl-b7 { border-block-end-color: #00838f; }
.rl-b4, .rl-b6 { border-block-end-style: dashed; }
.rl-key { display: flex; flex-wrap: wrap; gap: .4rem 1rem; list-style: none; padding: 0; }
.rl-key li { padding-block-end: 2px; }
.rl-spot { border: 1px solid var(--border); border-radius: var(--radius, 10px); padding: .75rem 1rem; background: var(--card); }
.rl-spot-head { display: flex; justify-content: space-between; align-items: center; gap: .5rem; }
.rl-huge { font-size: 4rem; line-height: 1.6; }
.rl-big { font-size: 3rem; line-height: 1.6; }
.rl-clusters { display: flex; flex-wrap: wrap; gap: .75rem; list-style: none; padding: 0; }
.rl-cluster { display: grid; justify-items: center; gap: .2rem; max-inline-size: 11rem; text-align: center; }
.rl-cl-name { font-size: .85rem; }
.rl-syl { display: flex; flex-wrap: wrap; gap: .5rem; }
.rl-chip { font-size: 1.6rem; }
.rl-mark { text-decoration: underline; text-decoration-thickness: 3px; text-underline-offset: 8px; color: var(--focus, currentColor); }
.rl-q { font-size: 2.6rem; line-height: 1.8; direction: rtl; unicode-bidi: isolate; }
.rl-locked { opacity: .65; }
.rl table { border-collapse: collapse; inline-size: 100%; } .rl th, .rl td { text-align: start; padding: .3rem .4rem; border-block-end: 1px solid var(--border); }
.rl input[type=range] { inline-size: min(100%, 22rem); min-block-size: 44px; }
`;
function ensureCss() { if (typeof document !== 'undefined' && document.head && !document.getElementById?.('alef-readlab-style')) document.head.append(el('style', { id: 'alef-readlab-style' }, CSS)); }

/** @param {HTMLElement} root @param {any} ctx @returns {() => void} */
export function mount(root, ctx) {
  ensureCss();
  const q = ctx?.query || {};
  const tool = TOOLS.some((t) => t.id === q.tool) ? q.tool : '';
  const load = typeof ctx?.readlabLoad === 'function' ? ctx.readlabLoad : loadJSON;
  const wrap = el('section', { class: 'rl alef-readlab', 'aria-labelledby': 'view-title' });
  const h1 = el('h1', { id: 'view-title', tabindex: '-1' }, tool ? TOOLS.find((t) => t.id === tool).name : TITLE);
  const body = el('div', { class: 'rl-body' });
  const status = el('p', { role: 'status', 'aria-live': 'polite', class: 'rl-status' });
  wrap.append(h1, el('p', { class: 'draft-flag', role: 'note' }, DRAFT_NOTE), body, status);
  root.append(wrap);
  let alive = true, st = normalizeState(null);
  const say = (t) => { status.textContent = t; };
  const save = () => storeSet(ctx, STORE_KEY, st);
  const set = (...n) => body.replaceChildren(...n.flat().filter(Boolean));
  const btn = (label, onclick, extra = {}) => el('button', { type: 'button', class: 'btn', onclick, ...extra }, label);
  const sbtn = (label, onclick, extra = {}) => btn(label, onclick, { class: 'btn secondary', ...extra });
  const back = (href, label) => el('p', {}, el('a', { href }, label));
  const toHub = () => back('#/readlab', `All ${TITLE}`);
  const failed = () => set(toHub(), el('p', { role: 'alert' }, 'This practice could not be loaded. If you are offline, open it once while online. Nothing was lost.'));
  let tagsP = null;
  const tags = () => (tagsP ||= Promise.resolve(load(FILES.tags)).catch(() => { tagsP = null; return null; }));

  // ---------- hub ----------
  function hub() {
    set(el('p', {}, 'Tools for reading real Hebrew text. Every tool works on text the app already has; nothing here is new Hebrew.'),
      el('ul', { class: 'rl-tools' }, ...TOOLS.map((t) => el('li', {}, el('a', { href: `#/readlab/${t.id}` }, t.name), `: ${t.help}`))),
      el('p', { class: 'muted' }, 'Related: ', el('a', { href: '#/nikkud-fade' }, 'Vowel marks, fading out'), ', ', el('a', { href: '#/bridge' }, 'Reading Without Vowels'), ', ', el('a', { href: '#/timedread' }, 'Timed read-aloud'), ', ', el('a', { href: '#/syllablechips' }, 'Syllable chips'), '.'));
  }

  // ---------- texts ----------
  async function sources() {
    const [shelf, reg] = await Promise.all([load(FILES.books), load(FILES.registry)]);
    const entries = (reg?.entries || []).filter((e) => e && e.id && e.he);
    return {
      stories: shelfOrder(shelf?.books || []).map((b) => ({ id: b.id, textId: `book:${b.id}`, title: `${b.titleTranslit}: ${b.titleEn}`, level: b.level })),
      prayers: entries.filter((e) => e.category === 'siddur').map((e) => ({ id: e.id, textId: `line:${e.id}`, title: e.title || e.id, entry: e })),
      torah: entries.filter((e) => e.category === 'torah').map((e) => ({ id: e.id, textId: `line:${e.id}`, title: `${e.title || e.id}${e.ref ? ` (${e.ref})` : ''}`, entry: e })),
    };
  }
  async function textList(sec) {
    const src = await sources();
    if (!alive) return;
    const cur = SECTIONS.find((s) => s.id === sec) || SECTIONS[0];
    set(toHub(), el('h2', {}, 'Choose a Text'),
      el('div', { class: 'rl-row', role: 'group', 'aria-label': 'Section' }, ...SECTIONS.map((s) => el('a', { class: 'btn secondary', href: `#/readlab/texts?sec=${s.id}`, 'aria-current': s.id === cur.id ? 'page' : null }, s.name))),
      el('p', {}, `${cur.help} Vowel marks for ${cur.name.toLowerCase()}: ${FADE_LEVELS[st.fade[cur.id]].name}.`),
      el('ol', { class: 'rl-list' }, ...src[cur.id].map((t) => el('li', {}, el('a', { href: `#/readlab/texts?sec=${cur.id}&id=${encodeURIComponent(t.id)}` }, t.title),
        st.texts[t.textId] ? el('span', { class: 'muted' }, ` (${VERSIONS.filter((v) => versionDone(st, t.textId, v.n)).length} of ${VERSIONS.length} versions read)`) : null))));
  }
  async function linesOf(sec, id) {
    if (sec === 'stories') {
      const b = await Promise.resolve(load(bookFile(id))).catch(() => null);
      if (!b || !Array.isArray(b.pages)) return null;
      return { title: b.titleEn, sub: b.titleTranslit, textId: `book:${b.id || id}`, lines: b.pages.filter((p) => p && p.he).map((p) => ({ he: p.he, en: p.en || '', translit: p.translit || '' })) };
    }
    const src = await sources();
    const t = src[sec]?.find((x) => x.id === id);
    if (!t) return null;
    return { title: t.title, sub: t.entry.ref || '', textId: t.textId, lines: String(t.entry.he).split('\n').map((x) => x.trim()).filter(Boolean).map((he, i, all) => ({ he, en: all.length === 1 ? t.entry.english || '' : '' })), english: t.entry.english || '' };
  }

  async function textPage(sec, id) {
    const text = await linesOf(sec, id);
    if (!alive) return;
    if (!text) { set(back(`#/readlab/texts?sec=${sec}`, 'All texts'), el('p', { role: 'alert' }, 'That text could not be found.')); return; }
    let mode = 'read', showFam = false, showPat = false, tagData = null, version = null, help = new Set(), vAnswered = false;
    let ch = { phase: 'intro', marked: new Set(), last: null };
    const spot = el('div', { class: 'rl-spot-host' });
    const sectionName = (SECTIONS.find((s) => s.id === sec) || SECTIONS[0]).name;
    const allWords = () => text.lines.flatMap((ln) => fadeLine(ln.he, 0));
    const tap = (w) => { openSpotlight(spot, ctx, w.full ?? w.text, { say, onClose: () => say('Spotlight closed.') }); say('Word Spotlight opened below the text.'); };
    const ensureTags = async () => { if (!tagData) tagData = await tags(); return tagData; };
    const decorate = (w) => {
      const tag = tagData?.tags?.[w.key] || null;
      const hits = showFam && tag?.f ? familyMatch(w.key, tag.f) : null;
      const pattern = showPat && tag?.b ? patternOf(tag.b) : null;
      // family letters are marked on the word as shown; marks and letters line up because only marks are ever removed
      return { pieces: hits ? letterPieces(w.shown, hits) : null, pattern, label: [pattern ? `verb pattern ${tag.b}` : '', hits ? `family letters ${tag.f}` : ''].filter(Boolean).join(', ') };
    };
    const counts = () => {
      const ws = allWords(), t = tagData?.tags || {};
      return { words: ws.length, fam: ws.filter((w) => t[w.key]?.f).length, pat: ws.filter((w) => t[w.key]?.b).length };
    };
    const linesView = (lineWordsFn, wordOpts = {}) => el('div', { class: 'rl-lines' }, ...text.lines.map((ln, li) => el('div', { class: 'rl-line' },
      el('p', { class: 'rl-text', lang: 'he', dir: 'rtl' }, ...lineWordsFn(ln, li).map((w) => { const d = decorate(w); return wordButton(w, wordOpts.onTap || tap, { ...d, label: d.label ? `${w.shown}: ${d.label}` : '' }); })),
      ln.en ? el('details', { class: 'rl-en' }, el('summary', {}, 'English'), el('p', {}, ln.en)) : null)));

    function header() {
      return [back(`#/readlab/texts?sec=${sec}`, `All ${sectionName.toLowerCase()}`), el('h2', {}, text.title), text.sub ? el('p', { class: 'muted' }, text.sub) : null,
        el('div', { class: 'rl-row', role: 'group', 'aria-label': 'Practice mode' }, ...[['read', 'Read'], ['challenge', 'Fade Challenge'], ['versions', 'Three Versions']]
          .map(([m, label]) => sbtn(label, () => { mode = m; spot.replaceChildren(); draw(); say(`${label} opened.`); }, { 'aria-pressed': String(mode === m) })))];
    }
    function tools() {
      const c = counts();
      const famBtn = sbtn(showFam ? 'Family letters: on' : 'Family letters: off', async () => { showFam = !showFam; await ensureTags(); if (alive) { draw(); say(showFam ? 'Family letters are underlined where the word list gives them.' : 'Family letters hidden.'); } }, { 'aria-pressed': String(showFam) });
      const patBtn = sbtn(showPat ? 'Verb patterns: on' : 'Verb patterns: off', async () => { showPat = !showPat; await ensureTags(); if (alive) { draw(); say(showPat ? 'Verbs the word list gives a pattern for are coloured.' : 'Verb pattern colours hidden.'); } }, { 'aria-pressed': String(showPat) });
      return [el('div', { class: 'rl-row' }, famBtn, patBtn),
        (showFam || showPat) && tagData ? el('p', { class: 'muted' }, `Found in the word list by exact spelling: ${showFam ? `${c.fam} of ${c.words} words have family letters` : ''}${showFam && showPat ? '; ' : ''}${showPat ? `${c.pat} of ${c.words} words are verb forms with a pattern` : ''}. Words with a prefix or another form are not matched, so they stay plain.`) : null,
        (showFam || showPat) && !tagData ? el('p', { role: 'alert' }, 'The word list could not be loaded.') : null,
        showPat && tagData ? el('div', {}, el('p', {}, 'Verb pattern key (each verb also shows its two-letter tag):'), el('ul', { class: 'rl-key' }, ...PATTERN_KEY.map((p) => el('li', { class: `rl-pat ${p.cls}` }, `${p.tag}: ${p.b}`)))) : null];
    }

    function drawRead() {
      const lv = st.fade[sec] ?? 0;
      const slider = el('input', { type: 'range', min: '0', max: '3', step: '1', value: String(lv), id: 'rl-fade', 'aria-valuetext': FADE_LEVELS[lv].name });
      slider.addEventListener('input', (e) => { const n = Number(e?.target?.value); st = setFade(st, sec, n); save(); draw(); say(`${sectionName}: ${FADE_LEVELS[st.fade[sec]].name}. ${FADE_LEVELS[st.fade[sec]].help}`); });
      return [el('label', { for: 'rl-fade' }, `Vowel marks for all ${sectionName.toLowerCase()}: ${FADE_LEVELS[lv].name}`), slider,
        el('p', { class: 'muted' }, `${FADE_LEVELS[lv].help} Your choice is kept for every text in ${sectionName.toLowerCase()}; the other sections keep their own.`),
        ...tools(),
        el('p', {}, 'Tap any word to open it in the Word Spotlight.'),
        linesView((ln) => fadeLine(ln.he, lv)),
        btn('I read this text', async () => { const t = st.texts[text.textId] || { versions: [0, 1, 2].map(() => ({ done: false, at: 0, tries: 0 })), reads: 0 }; st = { ...st, texts: { ...st.texts, [text.textId]: { ...t, reads: t.reads + 1 } } }; await save(); say('Saved: one read of this text.'); }, { id: 'rl-read' })];
    }

    function drawChallenge() {
      const words = allWords();
      if (words.length < CHALLENGE_MIN_WORDS) return [el('p', {}, `The Fade Challenge needs a text of at least ${CHALLENGE_MIN_WORDS} words. This one has ${words.length}.`)];
      const cw = challengeWords(words);
      const hist = challengesFor(st, text.textId);
      const histLine = hist.length ? el('p', { class: 'muted' }, `Your challenges on this text: ${hist.map((h) => `${challengeScore(h)}%`).join(', ')} of the unmarked half read without a stumble (self-reported).`) : null;
      const lineOf = () => el('p', { class: 'rl-text', lang: 'he', dir: 'rtl' }, ...cw.map((w, i) => {
        if (ch.phase !== 'mark') return el('span', { class: 'rl-w', 'data-word': String(i) }, w.shown);
        const b = el('button', { type: 'button', class: 'rl-w', 'aria-pressed': String(ch.marked.has(i)), 'data-word': String(i), 'aria-label': `Word ${i + 1} of ${cw.length}. Press if you stumbled on it.` }, w.shown);
        b.addEventListener('click', () => { ch.marked.has(i) ? ch.marked.delete(i) : ch.marked.add(i); b.setAttribute('aria-pressed', String(ch.marked.has(i))); say(`${ch.marked.size} words marked.`); });
        return b;
      }));
      if (ch.phase === 'intro') return [el('p', {}, `The text starts with all its vowel marks. Halfway through (after word ${Math.ceil(words.length / 2)}) the marks stop. Read it aloud to the end, then mark the words you stumbled on.`), histLine, btn('Start the challenge', () => { ch = { phase: 'reading', marked: new Set(), last: null }; draw(); say('Read the text aloud.'); }, { id: 'rl-ch-start' })];
      if (ch.phase === 'reading') return [lineOf(), btn('I finished reading', () => { ch.phase = 'mark'; draw(); say('Now tap every word you stumbled on.'); }, { id: 'rl-ch-done' })];
      if (ch.phase === 'mark') return [el('p', {}, 'Tap every word you stumbled on, skipped or had to sound out again. Be honest; nobody else sees this.'), lineOf(),
        el('div', { class: 'rl-row' }, btn('Save', saveChallenge, { id: 'rl-ch-save' }), sbtn('I read it all', () => { ch.marked.clear(); saveChallenge(); }, { id: 'rl-ch-all' }))];
      const r = ch.last;
      return [el('p', { id: 'rl-ch-result' }, `Saved. Without vowel marks you read ${r.faded - r.stumbledFaded} of ${r.faded} words without a stumble (${challengeScore(r)}%). With marks: ${r.pointed - r.stumbledPointed} of ${r.pointed}. Self-reported, not heard by the app.`), histLine,
        sbtn('Try again', () => { ch = { phase: 'intro', marked: new Set(), last: null }; draw(); })];
    }
    async function saveChallenge() {
      const out = challengeResult(allWords(), [...ch.marked], { textId: text.textId, section: sec, at: Date.now() });
      if (out.error) { say(`Not saved: ${out.error}.`); return; }
      st = addChallenge(st, out.result); ch = { phase: 'done', marked: new Set(), last: out.result }; await save(); if (alive) { draw(); say('Challenge saved on this device.'); }
    }

    function drawVersions() {
      if (version == null) version = VERSIONS.map((v) => v.n).find((n) => versionOpen(st, text.textId, n) && !versionDone(st, text.textId, n)) ?? 2;
      const v = VERSIONS[version];
      const tabs = el('div', { class: 'rl-row', role: 'group', 'aria-label': 'Version' }, ...VERSIONS.map((x) => {
        const open = versionOpen(st, text.textId, x.n), done = versionDone(st, text.textId, x.n);
        return sbtn(`${x.name}${done ? ' (read)' : open ? '' : ' (locked)'}`, () => { if (!open) { say(`${x.name} opens when you read the version before it without help.`); return; } version = x.n; help = new Set(); vAnswered = false; draw(); }, { 'aria-pressed': String(version === x.n), 'aria-disabled': open ? null : 'true', class: `btn secondary${open ? '' : ' rl-locked'}` });
      }));
      const onTap = (w) => { if (vAnswered) return tap(w); const k = `${w.line}|${w.index}`; if (!help.has(k)) { help.add(k); draw(); say('Vowel marks shown on that word. This read now counts as read with help.'); } else tap(w); };
      const words = (ln, li) => fadeLine(ln.he, v.level).map((w) => { const k = `${li}|${w.index}`; return help.has(k) ? { ...w, line: li, shown: w.full, pointed: true } : { ...w, line: li }; });
      return [el('p', {}, 'Read the same text three ways: all vowel marks, some marks, then none. Each version opens when you read the one before it without help.'), tabs,
        el('p', { class: 'muted' }, `${v.name}. ${FADE_LEVELS[v.level].help}${version > 0 ? ' Tap a word to see its marks; that makes this read a read with help. Tap it again for the Word Spotlight.' : ' Tap a word for the Word Spotlight.'}`),
        ...tools(), linesView(words, { onTap }),
        vAnswered ? null : el('div', { class: 'rl-row' }, btn('I read it all', () => finishVersion(true), { id: 'rl-v-read' }), sbtn('I needed help', () => finishVersion(false), { id: 'rl-v-help' }), el('span', { class: 'muted' }, 'Self-graded: the app cannot hear you.'))];
    }
    async function finishVersion(said) {
      if (vAnswered) return; vAnswered = true;
      const unaided = said && help.size === 0;
      const r = recordVersion(st, text.textId, version, unaided, Date.now());
      st = r.state; await save();
      if (!alive) return;
      draw();
      say(r.opened != null ? `Saved. ${VERSIONS[r.opened].name} is now open.` : unaided && version === 2 ? 'Saved. You have read all three versions of this text.' : unaided ? 'Saved as read without help.' : `Saved as read with help${help.size ? `: you opened marks on ${help.size} word${help.size === 1 ? '' : 's'}` : ''}. Read it again without help to open the next version.`);
    }

    function draw() {
      const parts = mode === 'challenge' ? drawChallenge() : mode === 'versions' ? drawVersions() : drawRead();
      set(...header(), ...parts, spot);
    }
    draw();
  }

  // ---------- B4: sh'va detective ----------
  async function shva() {
    const [g1, rs, reg] = await Promise.all([load(FILES.g1), load(FILES.readingSet), load(FILES.registry)]);
    if (!alive) return;
    const regWords = [];
    for (const e of reg?.entries || []) for (const w of String(e.he).split(/\s+/)) if (!/־/.test(w)) { const k = wordKey(w); if (k && !hasDivineName(w)) regWords.push({ id: e.id, he: k, en: `a word from ${e.title || e.id}` }); }
    const items = shvaItems(wordPool(g1, rs, { words: regWords }));
    let round = 1, qs = [], i = 0, picked = null, results = [];
    const rulesList = el('ul', {}, ...SHVA_DRILL_RULES.map((r) => el('li', {}, el('strong', {}, `${r.id}. `), r.text, el('span', { class: 'muted' }, ` (${r.source})`))));
    function intro() {
      const d = st.drills.shva;
      set(toHub(), el('h2', {}, 'The Rules'), el('p', {}, 'The sh\'va (two dots under a letter) is either said, as a quick e (sh\'va na), or silent (sh\'va nach). The app decides with these rules, which are the ones it uses everywhere:'),
        rulesList,
        el('details', {}, el('summary', {}, 'What this drill does not cover'), el('p', {}, 'These rules are not built into the app yet, so no question depends on them. Some words they affect may still be asked, with the answer the rules above give:'),
          el('ul', {}, ...SHVA_NOT_COVERED.map((r) => el('li', {}, `${r.id}. ${r.text}`)))),
        el('p', { class: 'muted' }, 'These are the careful-reading rules used for prayer. Everyday Israeli speech often drops a said sh\'va. No teacher has checked every word.'),
        d ? el('p', {}, `Your sets so far: ${d.sets}. Best: ${d.best} of ${SET_SIZE}.`) : null,
        items.length ? btn(`Start a set of ${Math.min(SET_SIZE, items.length)}`, start, { id: 'rl-start' }) : el('p', { role: 'alert' }, 'No words are available for this drill.'));
    }
    function start() { qs = shvaSet(items, { size: SET_SIZE, seed: round * 7919 + (st.drills.shva?.seen || 0) }); i = 0; picked = null; results = []; ask(); }
    function ask() {
      if (i >= qs.length) return done();
      const it = qs[i];
      const word = el('p', { class: 'rl-q', lang: 'he', dir: 'rtl' }, ...shvaDisplay(it).map((c) => (c.mark ? el('span', { class: 'rl-mark' }, c.text) : c.text)));
      const opts = SHVA_ANSWERS.map((a) => sbtn(a.label, () => answer(a.id), { 'data-answer': a.id, disabled: picked ? true : null }));
      set(toHub(), el('p', {}, `Word ${i + 1} of ${qs.length}. Is the sh'va under the underlined letter said or silent?`), word,
        el('p', { class: 'muted' }, it.translit ? `${it.translit}: ${it.en}` : it.en),
        el('div', { class: 'rl-row', role: 'group', 'aria-label': 'Said or silent' }, ...opts),
        picked ? el('p', { id: 'rl-why' }, `${picked === it.answer ? 'Right.' : `Not this time: it is ${it.answer === 'na' ? 'said' : 'silent'}.`} Rule ${it.rule}: ${it.ruleText}`) : null,
        picked ? btn(i + 1 < qs.length ? 'Next word' : 'Finish the set', () => { i += 1; picked = null; ask(); }, { id: 'rl-next' }) : null);
    }
    function answer(a) { if (picked) return; picked = a; results.push({ rule: qs[i].rule, right: a === qs[i].answer }); ask(); say(a === qs[i].answer ? 'Right.' : 'Not this time.'); }
    async function done() {
      st = recordSet(st, 'shva', results); await save();
      if (!alive) return;
      const by = {};
      for (const r of results) { by[r.rule] ||= { n: 0, ok: 0 }; by[r.rule].n += 1; by[r.rule].ok += r.right ? 1 : 0; }
      set(toHub(), el('h2', {}, 'Set Done'), el('p', { id: 'rl-score' }, `${results.filter((r) => r.right).length} of ${results.length} right. Checked against the app's rules.`),
        el('ul', {}, ...Object.entries(by).map(([k, v]) => el('li', {}, `Rule ${k}: ${v.ok} of ${v.n}`))),
        btn('Another set', () => { round += 1; start(); }, { id: 'rl-again' }), sbtn('Read the rules again', intro));
    }
    intro();
  }

  // ---------- B5: final forms and dagesh ----------
  async function forms() {
    const [g1, rs, letters] = await Promise.all([load(FILES.g1), load(FILES.readingSet), load(FILES.letters)]);
    if (!alive) return;
    const cards = formCards(letters), pool = wordPool(g1, rs), items = formItems(pool, cards), tiles = formTiles(cards);
    const dTiles = cards.dagesh.flatMap((c) => [c.withDot, c.without]);
    let kind = q.kind === 'dagesh' ? 'dagesh' : 'final', round = 1, qs = [], i = 0, picked = null, results = [];
    const hear = (id, name) => {
      if (isAudioFree(ctx) || !ctx?.audio) return null;
      return sbtn(`Hear ${name}`, async () => {
        try { if (ctx.audio.ensureManifest) await ctx.audio.ensureManifest(); if (!ctx.audio.has?.('letter', id)) { say(`No clip for ${name} yet.`); return; } const r = await ctx.audio.play('letter', id); say(r?.source === 'file' ? `Played ${name}.` : `${name} could not play.`); } catch { say(`${name} could not play.`); }
      }, { 'data-letter': id });
    };
    function see() {
      const tabs = el('div', { class: 'rl-row', role: 'group', 'aria-label': 'Topic' }, sbtn('Final Forms', () => { kind = 'final'; see(); }, { 'aria-pressed': String(kind === 'final') }), sbtn('Dagesh', () => { kind = 'dagesh'; see(); }, { 'aria-pressed': String(kind === 'dagesh') }));
      const list = kind === 'final'
        ? cards.finals.map((c) => el('li', { class: 'rl-card' }, heText(c.base.he, 'alef-he rl-big'), ' ', heText(c.final.he, 'alef-he rl-big'), el('p', {}, `${c.base.name} and ${c.final.name}: ${c.final.sound?.en || ''}`), el('div', { class: 'rl-row' }, hear(c.base.id, c.base.name), hear(c.final.id, c.final.name))))
        : cards.dagesh.map((c) => el('li', { class: 'rl-card' }, heText(c.withDot, 'alef-he rl-big'), ' ', heText(c.without, 'alef-he rl-big'), el('p', {}, `${c.letter.name}: ${c.letter.sound?.en || ''}`), el('div', { class: 'rl-row' }, hear(c.clips[0], `${c.letter.name} with the dot`), hear(c.clips[1], `${c.letter.name} without the dot`))));
      const d = st.drills[`forms-${kind}`];
      set(toHub(), tabs, el('h2', {}, kind === 'final' ? 'See and Hear: Final Forms' : 'See and Hear: Dagesh'),
        el('p', {}, kind === 'final' ? 'Five letters change shape at the end of a word. The sound stays the same.' : 'In bet, kaf and pe a dot inside the letter (a dagesh) changes the sound.'),
        el('ul', { class: 'rl-cards' }, ...list), el('p', { class: 'muted' }, 'Sounds from the app\'s letter list (Israeli reading).'),
        d ? el('p', {}, `Your sets so far: ${d.sets}. Best: ${d.best} of ${SET_SIZE}.`) : null,
        btn(`Practise: pick it, then type it (${SET_SIZE})`, start, { id: 'rl-start' }));
    }
    function start() { qs = formSet(items, kind, { size: SET_SIZE, seed: round * 104729 + (st.drills[`forms-${kind}`]?.seen || 0) }); i = 0; picked = null; results = []; ask(); }
    function ask() {
      if (i >= qs.length) return done();
      const it = qs[i], half = Math.ceil(qs.length / 2), typing = i >= half;
      const answer = kind === 'final' ? it.answer : (it.answer === 'dot' ? cards.dagesh.find((c) => c.id === it.letterId).withDot : cards.dagesh.find((c) => c.id === it.letterId).without);
      let shown, opts, prompt;
      if (kind === 'final') {
        shown = blanked(it).map((c) => (c.gap ? el('span', { class: 'rl-mark' }, '_') : c.text));
        const c = it.card;
        opts = typing ? tiles : shuffle([c.base.he, c.final.he], rng(i + round));
        prompt = typing ? 'Type it: tap the letter that fills the gap.' : 'Pick it: which form fills the gap?';
      } else {
        // pick it: the asked letter is shown without its dot and the sound is the clue; type it: the letter is a gap
        shown = blanked(it).map((c, k) => (c.gap ? el('span', { class: 'rl-mark' }, typing ? '_' : stripDot(clusterAt(it.he, k))) : c.text));
        const c = cards.dagesh.find((x) => x.id === it.letterId);
        opts = typing ? dTiles : [c.withDot, c.without];
        prompt = typing ? 'Type it: tap the letter as the word spells it.' : `Pick it: does the underlined ${c.letter.name} have the dot? Say the word, then choose.`;
      }
      set(toHub(), el('p', {}, `${i + 1} of ${qs.length}. ${prompt}`), el('p', { class: 'rl-q', lang: 'he', dir: 'rtl' }, ...shown),
        el('p', { class: 'muted' }, `${it.translit ? `Sounds like: ${it.translit}. ` : ''}Meaning: ${it.en}.`),
        el('div', { class: 'rl-row', role: 'group', 'aria-label': 'Letters' }, ...opts.map((o) => sbtn(o, () => pick(o, answer), { class: 'btn secondary alef-he rl-chip', lang: 'he', dir: 'rtl', 'data-tile': o, disabled: picked ? true : null }))),
        picked ? el('p', { id: 'rl-why' }, picked === answer ? 'Right: that is how the word is spelled.' : 'Not this time: the word is spelled ', picked === answer ? null : heText(answer), picked === answer ? null : '.') : null,
        picked ? el('p', {}, 'The word: ', heText(it.he, 'alef-he rl-big')) : null,
        picked ? btn(i + 1 < qs.length ? 'Next' : 'Finish the set', () => { i += 1; picked = null; ask(); }, { id: 'rl-next' }) : null);
    }
    function pick(o, answer) { if (picked) return; picked = o; results.push({ rule: i >= Math.ceil(qs.length / 2) ? 'type' : 'pick', right: o === answer }); ask(); say(o === answer ? 'Right.' : 'Not this time.'); }
    async function done() {
      st = recordSet(st, `forms-${kind}`, results); await save();
      if (!alive) return;
      const n = (r) => results.filter((x) => x.rule === r);
      set(toHub(), el('h2', {}, 'Set Done'), el('p', { id: 'rl-score' }, `${results.filter((r) => r.right).length} of ${results.length} right: pick it ${n('pick').filter((x) => x.right).length} of ${n('pick').length}, type it ${n('type').filter((x) => x.right).length} of ${n('type').length}. Checked against the word list's spelling.`),
        btn('Another set', () => { round += 1; start(); }, { id: 'rl-again' }), sbtn('Back to see and hear', see));
    }
    see();
  }

  // ---------- G7: stress ----------
  async function stress() {
    const [file, g1] = await Promise.all([load(FILES.stress), load(FILES.g1)]);
    if (!alive) return;
    let computed = false, round = 1, qs = [], i = 0, picked = null, results = [];
    const all = () => stressItems(file, { pool: wordPool(g1), computed });
    function intro() {
      const a = all();
      set(toHub(), el('p', {}, 'Each word is split into syllables. Tap the syllable you think is stressed (said strongest), then hear the word.'),
        el('p', {}, STRESS_SOURCE_TEXT.ipa),
        sbtn(computed ? 'Computed stress words: included' : 'Computed stress words: left out', () => { computed = !computed; intro(); }, { 'aria-pressed': String(computed) }),
        el('p', { class: 'muted' }, `${a.filter((x) => x.source === 'ipa').length} words have stress from the dictionary${computed ? `, ${a.filter((x) => x.source === 'computed').length} more use the app's computed stress and are labelled "computed"` : ''}. The syllable split is the app's own (draft). Lines are not drilled yet: stress data exists for single words only.`),
        st.drills.stress ? el('p', {}, `Your sets so far: ${st.drills.stress.sets}. Best: ${st.drills.stress.best} of 10.`) : null,
        btn('Start a set of 10', start, { id: 'rl-start' }));
    }
    function start() { qs = stressSet(all(), { size: 10, seed: round * 31337 + (st.drills.stress?.seen || 0), source: computed ? 'any' : 'ipa' }); i = 0; picked = null; results = []; ask(); }
    function ask() {
      if (i >= qs.length) return done();
      const it = qs[i];
      const chips = it.syllables.map((s, k) => sbtn(picked == null ? s : `${s}${k === it.stress ? ' ●' : ''}`, () => pick(k), { class: 'btn secondary alef-he rl-chip', lang: 'he', 'data-syl': String(k), 'aria-label': `Syllable ${k + 1} of ${it.syllables.length}${picked != null && k === it.stress ? ', stressed' : ''}`, disabled: picked != null ? true : null }));
      const audio = el('div', {});
      set(toHub(), el('p', {}, `Word ${i + 1} of ${qs.length}: ${it.en}. Which syllable is stressed?`), el('p', { class: 'rl-q', lang: 'he', dir: 'rtl' }, heText(it.he)),
        el('div', { class: 'rl-syl', dir: 'rtl', role: 'group', 'aria-label': 'Syllables' }, ...chips),
        picked != null ? el('p', { id: 'rl-why' }, `${picked === it.stress ? 'Right.' : `Not this time: syllable ${it.stress + 1} (counting from the right) is stressed.`} ${it.translit ? `Sounds like: ${it.translit}.` : ''}`) : null,
        picked != null ? el('p', { class: 'muted', 'data-source': it.source }, it.source === 'computed' ? `Computed. ${STRESS_SOURCE_TEXT.computed}` : `${STRESS_SOURCE_TEXT.ipa}${it.ipa ? ` Pronunciation key: ${it.ipa}.` : ''}`) : null,
        picked != null ? el('h3', {}, 'Now Hear It') : null, picked != null ? audio : null,
        picked != null ? btn(i + 1 < qs.length ? 'Next word' : 'Finish the set', () => { i += 1; picked = null; ask(); }, { id: 'rl-next' }) : null);
      if (picked != null) listenInto(audio, { ...ctx, readlabLoad: load }, it.he, { say, alive: () => alive });
    }
    function pick(k) { if (picked != null) return; picked = k; results.push({ rule: qs[i].source, right: k === qs[i].stress }); ask(); say(k === qs[i].stress ? 'Right.' : 'Not this time.'); }
    async function done() {
      st = recordSet(st, 'stress', results); await save();
      if (!alive) return;
      set(toHub(), el('h2', {}, 'Set Done'), el('p', { id: 'rl-score' }, `${results.filter((r) => r.right).length} of ${results.length} right.`), btn('Another set', () => { round += 1; start(); }, { id: 'rl-again' }), sbtn('Back', intro));
    }
    intro();
  }

  // ---------- B10: reading by text type ----------
  async function progress() {
    const keys = ['srs.cards', 'service.companion', 'bridge.v1', 'timedread.v1', 'torahread.v1', 'books.v1', 'books.finished.v1', STORE_KEY];
    const [shelf, reg, signs, scenarios, ...vals] = await Promise.all([load(FILES.books), load(FILES.registry), Promise.resolve(load(FILES.signs)).catch(() => null), Promise.resolve(load(FILES.scenarios)).catch(() => null), ...keys.map((k) => storeGet(ctx, k, null))]);
    if (!alive) return;
    const rec = Object.fromEntries(keys.map((k, n) => [k, vals[n]]));
    const rows = progressByType({ entries: reg?.entries || [], books: shelf?.books || [], modern: modernShelf({ signs, scenarios }) }, rec);
    const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : 'none yet');
    set(toHub(), el('p', {}, 'Four numbers instead of one: each kind of text is counted on its own, from what you have already done in the app on this device.'),
      el('table', {}, el('caption', {}, 'Reading by text type'),
        el('thead', {}, el('tr', {}, ...['Text type', 'Practised', 'Second measure', 'Texts in the app'].map((h) => el('th', { scope: 'col' }, h)))),
        el('tbody', {}, ...rows.map((r) => el('tr', { 'data-type': r.id }, el('th', { scope: 'row' }, r.label), el('td', {}, `${r.practised} (${pct(r.practised, r.total)})`), el('td', {}, `${r.second} ${r.secondLabel}`), el('td', {}, String(r.total)))))),
      el('h2', {}, 'What Counts'),
      el('ul', {},
        el('li', {}, 'Prayers and Torah: the prayer-book lines and Torah verses the app holds. Practised means any of: Fade-out recall, the Shabbat Companion, Reading Without Vowels, Timed read-aloud, the Torah reading course (Torah only), or these Reading Tools. Read without vowel marks means the last stage of Reading Without Vowels, or Version 3 here.'),
        el('li', {}, `Stories: the ${BOOKS} little books. Practised means opened in the reader; finished means the reader recorded the book as finished.`),
        el('li', {}, 'Everyday: the signs, menus and messages on the Modern texts shelf of Reading Without Vowels. Practised means read once; read without help means read with nothing revealed.')),
      ...rows.filter((r) => Object.values(r.why).some(Boolean)).map((r) => el('p', { class: 'muted' }, `${r.label}, where your practice was found: ${Object.entries(r.why).filter(([, n]) => n).map(([k, n]) => `${WHY_LABEL[k]} ${n}`).join(', ')}.`)),
      el('p', { class: 'muted' }, 'These counts show what you did, not how well you read: the app cannot hear you.'));
  }

  (async () => {
    try {
      st = normalizeState(await storeGet(ctx, STORE_KEY, null));
      if (!alive) return;
      if (!tool) hub();
      else if (tool === 'texts') { const sec = SECTIONS.some((s) => s.id === q.sec) ? q.sec : 'stories'; if (q.id) await textPage(sec, String(q.id)); else await textList(sec); }
      else if (tool === 'shva') await shva();
      else if (tool === 'forms') await forms();
      else if (tool === 'stress') await stress();
      else if (tool === 'progress') await progress();
    } catch { if (alive) failed(); }
  })();
  return () => { alive = false; try { ctx?.audio?.stop?.(); } catch { /* ignore */ } wrap.remove?.(); };
}

const clusterAt = (he, k) => { const out = []; for (const ch of String(he)) { if (/[א-ת]/.test(ch)) out.push(ch); else if (out.length) out[out.length - 1] += ch; } return out[k] || '_'; };
const stripDot = (s) => String(s).replace(/ּ/g, '');
