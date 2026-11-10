/**
 * Minute One (#/firstwin): "Build your first Hebrew word".
 * Splash שָׁלוֹם (0–3s) → ≤4 pre-lesson screens that change the next → the WORD BUILDER → finish: gratitude → words LARGE →
 * accuracy/time → Day-1 streak (sole haptic) → share → Zeigarnik → Save (Create profile | Later equal) → personalise.
 *
 * The builder (2026-11-07): a letter tray with the whole alef-bet, opened a few letters at a time (progressive depth: the first
 * screen shows only the letters of three suggested 3-4 letter words; each word built opens more; "All letters" is one tap away).
 * Tap a tile or use the keyboard (Hebrew letter keys, Backspace, Enter); the motor rule (tests/motor.test.js) allows no dragging
 * anywhere in the app. A word is recognised by its letters against
 * data/firstday/buildable-words.json (1,044 words, each with an Israeli clip for both voices on disk). On a match the pointed
 * word, its transliteration and English are shown, the clip plays in the learner's voice through ctx.audio.play (the status line
 * says what played, via playLine), a brief celebration follows (none in calm mode or with reduced motion) and the word counts
 * toward the "words built" tally (store key firstday.builder.v1). Not a word: the nearest real word that starts with the same
 * letters is shown as a hint. No fail hearts. A learner who finished the first run lands straight in the builder.
 */
import { h, heSpan } from '../shell/ui.js';
import { SCENE, picture } from '../img/scenes.js';
import { ensureMotionStyle, startSpeaking } from '../motion/alive.js';
import { ensureStyle as ensureCelebrateStyle } from '../../preview/loops/celebrate.js';
import { quietNow } from '../shell/comfort.js';
import { congregationOf, playLine } from '../pronunciation/forTradition.js';
import {
  STORE_KEY, BUILDER_KEY, WORDS_URL, normalize, finishRecord,
  promiseDateISO, formatPromiseDate, promiseLine,
  ALEF_BET, letterFor, writtenForm, makeIndex, evaluate, suggestions, unlockedLetters, finalsShown,
  normalizeBuilder, recordBuilt, tallyLine, keyAction, FULL_AT,
} from './minuteone.model.js';

const DATA_URL = 'data/firstday/minute-one.json';
const RIMON_SRC = 'assets/games/arcade/cast/rimon-face.png';
const STYLE_HREF = 'assets/css/firstday-builder.css';

function ensureBuilderStyle(doc = globalThis.document) {
  try {
    if (!doc?.head || doc.getElementById?.('alef-firstday-builder-css')) return;
    doc.head.append(h('link', { id: 'alef-firstday-builder-css', rel: 'stylesheet', href: STYLE_HREF }));
  } catch { /* optional */ }
}

export async function mount(root, ctx) {
  const { store, settings } = ctx;
  const t0 = (ctx?.clock?.now ? ctx.clock.now() : Date.now());
  let alive = true;
  let data = null;
  // splash | motive | level | commit | build | celebrate | save
  let phase = 'splash';
  let correct = 0, attempts = 0;
  let rec = normalize(store.get(STORE_KEY));
  let statusMsg = '';
  let motivation = null;
  let level = null;
  let commitment = null;
  let promiseIso = null;
  let celebrateStep = 0; // 0..n for staggered finish beats
  let splashDone = false;

  // builder state
  let index = makeIndex([]);
  let wordsLoaded = false;
  let builder = normalizeBuilder(store.get(BUILDER_KEY));
  let placed = []; // base-form letters, in reading order (first placed = rightmost)
  let built = null; // the word just recognised, or null
  let lastBuilt = null; // for the finish screens
  let firstBuiltId = null;
  let aim = null; // suggested word the learner chose to spell
  let showAll = false;
  let verdict = null; // last evaluate() result
  let finalNote = '';
  const freeMode = () => rec.done || builder.count > 0; // past the first win: the builder is the whole screen

  const shell = h('article', { class: 'card firstwin', id: 'firstwin' });
  // replaceChildren() stringifies a null child as the text "null" (seen on the first question screen); drop empty slots first
  const show = (...kids) => shell.replaceChildren(...kids.filter((k) => k != null && k !== false));
  root.replaceChildren(shell);
  ensureBuilderStyle();

  try {
    const res = await fetch(DATA_URL, { cache: 'no-cache' });
    data = await res.json();
  } catch (e) {
    show(h('p', { role: 'alert' }, 'Minute One could not load. ', h('a', { href: '#/welcome' }, 'Continue to setup')));
    return () => { alive = false; };
  }
  // The word list: loaded alongside, never blocks the splash. Until it arrives the tray says so.
  fetch(WORDS_URL, { cache: 'no-cache' }).then((r) => r.json()).then((j) => {
    if (!alive) return;
    index = makeIndex(j?.words || []);
    wordsLoaded = true;
    if (phase === 'build') render();
  }).catch(() => { if (alive) { wordsLoaded = true; if (phase === 'build') { statusMsg = 'The word list could not load. Reload to build words; nothing was lost.'; render(); } } });

  const nextWord = data.nextWord || { hePointed: 'אִמָּא', heBare: 'אמא', gloss: 'mum / mom', tease: 'Tomorrow: אִמָּא completes the family.' };
  const say = (m) => { statusMsg = m; render(); };
  const nowISO = () => new Date(ctx?.clock?.now ? ctx.clock.now() : Date.now()).toISOString();
  const quiet = () => quietNow(settings);
  const tradition = () => congregationOf(settings);

  /** Sole haptic — timed to streak/reveal only (research: scarcity). */
  const vibrateStreak = () => {
    try {
      if (quiet()) return;
      if (settings?.get?.('haptics') === false) return;
      if (typeof globalThis?.navigator?.vibrate === 'function') {
        globalThis.navigator.vibrate([20, 40, 20, 40, 60]);
      }
    } catch { /* ignore */ }
  };

  const playLetter = (id) => {
    try { const p = ctx?.audio?.play?.('letter', id, { noEcho: true }); if (p && p.catch) p.catch(() => {}); } catch { /* ignore */ }
  };

  const playSplash = () => {
    const a = data.splash?.audio;
    if (!a) return;
    try {
      const p = ctx?.audio?.play?.(a.kind || 'word', a.id, a.text ? { text: a.text } : undefined);
      if (p && p.catch) p.catch(() => {});
    } catch { /* ignore */ }
  };

  /** The word clip in the learner's chosen voice and tradition; the status line names what played. */
  async function sayWord(word, { slow = false } = {}) {
    if (!word) return;
    const live = shell.querySelector('[data-live="word"]') || shell;
    const stop = startSpeaking(ctx, live);
    try {
      const r = await ctx?.audio?.play?.('word', word.clip, { text: word.he, ...(slow ? { rate: 'slow', noEcho: true } : {}) });
      say(playLine(r || { source: 'none', reason: 'no-audio' }, tradition(), slow ? `${word.translit || word.bare} slowly` : word.translit || word.bare));
    } catch {
      say(playLine({ source: 'none', reason: 'unavailable' }, tradition(), word.translit || word.bare));
    } finally { stop(); }
  }

  const advanceFromSplash = () => {
    if (splashDone) return;
    splashDone = true;
    phase = freeMode() ? 'build' : 'motive';
    if (phase === 'build') statusMsg = 'Hebrew reads right to left. Tap letters, or pick a word to spell.';
    render();
  };

  // ---------- builder actions ----------
  const judge = () => { verdict = evaluate(index, placed); return verdict; };

  function placeLetter(he) {
    if (phase !== 'build' || built) return;
    const L = letterFor(he);
    if (!L) return;
    if (placed.length >= 8) { say('Eight letters is the longest word here. Tap ⌫ to take one away.'); return; }
    attempts++;
    placed = [...placed, L.he];
    playLetter(L.id);
    const v = judge();
    const wf = writtenForm(placed);
    finalNote = wf.finalFixed ? `At the end of a word, ${wf.finalFixed} is written ${writtenForm([wf.finalFixed]).text}.` : '';
    if (v.match && !v.extendable) { succeed(v.match); return; }
    if (v.match && v.extendable) { say(`${wf.text} is a word: ${v.match.en}. Tap “Say it”, or keep going toward ${v.hint?.he || ''}.`); return; }
    if (v.deadEnd) {
      const hint = v.hint;
      say(hint
        ? `No word starts like that yet. Nearest: ${hint.he} (${hint.translit}, ${hint.en}) shares the first ${v.stem === 1 ? 'letter' : `${v.stem} letters`}. ⌫ takes the last letter away.`
        : 'No word starts with that letter here. Try another, or pick a word above.');
      return;
    }
    say(placed.length === 1 ? `${wf.text} — a start.` : `${wf.text} … keep going${v.hint ? `: ${v.hint.he} (${v.hint.en}) starts like that` : ''}.`);
  }
  function removeLetter() {
    if (phase !== 'build') return;
    if (built) { built = null; placed = []; say('Cleared. Build another word.'); return; }
    if (!placed.length) return;
    placed = placed.slice(0, -1);
    judge(); finalNote = '';
    say(placed.length ? `${writtenForm(placed).text}` : 'Empty. Tap a letter to start.');
  }
  function clearWord(msg = 'Cleared. Build another word.') {
    built = null; placed = []; aim = null; verdict = null; finalNote = '';
    say(msg);
  }
  function checkWord() {
    if (phase !== 'build' || built) return;
    const v = judge();
    if (v.match) { succeed(v.match); return; }
    if (!placed.length) { say('Tap letters first, right to left.'); return; }
    say(v.hint ? `Not a word yet. Nearest: ${v.hint.he} (${v.hint.translit}, ${v.hint.en}).` : 'Not a word in this list. ⌫ takes the last letter away.');
  }
  function succeed(word) {
    built = word; lastBuilt = word; correct++;
    if (!firstBuiltId) firstBuiltId = word.id;
    const prev = builder.count;
    builder = recordBuilt(builder, word, nowISO());
    try { store.set(BUILDER_KEY, builder); } catch { /* best effort: the word still shows and plays */ }
    aim = null;
    const opened = builder.count > prev && builder.count < FULL_AT ? ' More letters are open.' : builder.count === FULL_AT && prev < FULL_AT ? ' The whole alef-bet is open now.' : '';
    statusMsg = `You built ${word.he} — ${word.translit}, “${word.en}”.${finalNote ? ' ' + finalNote : ''}${opened}`;
    render();
    sayWord(word);
  }
  function pickAim(w) { aim = w; built = null; placed = []; verdict = null; finalNote = ''; say(`Spell ${w.he} (${w.translit}, ${w.en}): right to left, ${[...w.bare].length} letters.`); }

  // keyboard: Hebrew letter keys place letters; Backspace removes; Enter checks; Escape clears
  const onKey = (ev) => {
    if (phase !== 'build' || !alive) return;
    const tgt = ev.target;
    if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable)) return;
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const a = keyAction(ev.key);
    if (!a) return;
    ev.preventDefault();
    if (a.type === 'place') placeLetter(a.he);
    else if (a.type === 'remove') removeLetter();
    else if (a.type === 'check') { if (built) clearWord(); else checkWord(); }
    else if (a.type === 'clear') clearWord();
  };
  globalThis.document?.addEventListener?.('keydown', onKey);

  const finishTry = () => {
    const seconds = ((ctx?.clock?.now ? ctx.clock.now() : Date.now()) - t0) / 1000;
    rec = finishRecord({
      seconds,
      correctBeats: correct,
      totalBeats: Math.max(attempts, data.beats || 7),
      nowISO: nowISO(),
      motivation: motivation?.id,
      level: level?.id,
      minutes: commitment?.minutes,
      promiseDate: promiseIso,
      wordId: firstBuiltId || lastBuilt?.id || 'abba',
    });
    try { store.set(STORE_KEY, rec); } catch { /* ignore */ }
    try {
      store.set('firstwin.streakDay1', {
        v: 1,
        at: nowISO(),
        label: data.streakCopy || 'Day 1 — you showed up. A missed day never shames you.',
      });
      store.set('firstwin.routing', {
        motivation: motivation?.id || null,
        level: level?.id || null,
        minutes: commitment?.minutes || null,
        promiseDate: promiseIso,
      });
    } catch { /* ignore */ }
    try { settings.set({ onboarded: true }); } catch { /* ignore */ }
    phase = 'celebrate';
    celebrateStep = 0;
    render();
    // Stagger finish beats; sole haptic when streak reveals. Calm mode or reduced motion: everything at once.
    const steps = [0, 1, 2, 3, 4, 5];
    if (quiet()) { celebrateStep = 5; render(); return; }
    steps.forEach((s) => {
      setTimeout(() => {
        if (!alive || phase !== 'celebrate') return;
        celebrateStep = s;
        if (s === 3) vibrateStreak();
        render();
      }, s * 700);
    });
  };

  const goSave = () => { phase = 'save'; render(); };
  const chooseLater = () => {
    rec = { ...rec, saved: false };
    try { store.set(STORE_KEY, rec); } catch { /* ignore */ }
    ctx.route('/welcome?personalise=1');
  };
  const chooseProfile = () => {
    rec = { ...rec, saved: true };
    try { store.set(STORE_KEY, rec); } catch { /* ignore */ }
    try { store.set('profile.v1', { v: 1, createdAt: nowISO(), source: 'firstwin' }); } catch { /* ignore */ }
    ctx.route('/welcome?personalise=1');
  };

  function progressDots(activeIdx, total = 4) {
    const dots = [];
    for (let i = 0; i < total; i++) {
      dots.push(h('span', {
        class: i <= activeIdx ? 'fw-dot on' : 'fw-dot',
        'aria-hidden': 'true',
        style: `display:inline-block;width:0.55rem;height:0.55rem;border-radius:50%;margin:0 0.2rem;background:${i <= activeIdx ? 'var(--accent,#1e4634)' : '#cfc4b0'}`,
      }));
    }
    return h('p', { class: 'fw-progress', style: 'text-align:center;margin:0.25rem 0 0.75rem', 'aria-label': `Step ${activeIdx + 1} of ${total}` }, ...dots);
  }

  function renderSplash() {
    const sp = data.splash || {};
    const letters = Array.from(sp.hePointed || 'שָׁלוֹם');
    const anim = !quiet();
    const spans = letters.map((ch, i) => h('span', {
      class: 'fw-splash-ch',
      style: anim ? `display:inline-block;opacity:0;animation:fwSplashIn 0.35s ease forwards;animation-delay:${i * 0.12}s` : 'display:inline-block',
    }, ch));
    show(
      h('style', {}, `@keyframes fwSplashIn{from{opacity:0;transform:translateX(0.4em)}to{opacity:1;transform:none}}`),
      h('h1', { id: 'view-title', class: 'visually-hidden', tabindex: '-1' }, 'Shalom'),
      h('p', {
        class: 'fw-splash he', lang: 'he', dir: 'rtl',
        style: 'font-size:3.2rem;text-align:center;font-weight:700;letter-spacing:0.04em;margin:1.5rem 0 0.5rem',
        'aria-label': 'שָׁלוֹם',
      }, ...spans),
      h('p', { class: 'muted', style: 'text-align:center' }, sp.gloss ? `Shalom — “${sp.gloss}.”` : 'Shalom.'),
      h('p', { style: 'text-align:center' }, sp.line || 'Your first Hebrew word. Tap to hear it.'),
      h('p', { class: 'row', style: 'justify-content:center' },
        // Quiet tap-to-hear: the recorded clip (Ari or Noa), never an error banner when the browser blocks sound before a tap.
        h('button', { type: 'button', class: 'btn secondary fw-hear', id: 'fw-hear-shalom', onclick: () => playSplash() }, '🔊 Hear it'),
        h('button', { type: 'button', class: 'btn', onclick: advanceFromSplash }, freeMode() ? 'Build words' : 'Begin')),
    );
    // Autoplay only after the learner has already tapped in this tab (browsers block sound before that, which used to raise
    // a "No sound" bar on the very first screen). Otherwise the Hear it button above plays it.
    try { if (globalThis.navigator?.userActivation?.hasBeenActive) playSplash(); } catch { /* sound is optional */ }
    const ms = Math.max(1200, sp.assembleMs || 1800);
    // Auto-advance only when the word was heard by itself; otherwise the learner gets time to tap Hear it.
    let heard = false; try { heard = !!globalThis.navigator?.userActivation?.hasBeenActive; } catch { /* ignore */ }
    setTimeout(() => { if (alive && phase === 'splash' && (heard || !globalThis.navigator?.userActivation)) advanceFromSplash(); }, ms + 1200);
  }

  function renderMotive() {
    const cards = (data.motivations || []).map((m) => h('button', {
      type: 'button',
      class: 'btn secondary',
      style: 'display:block;width:100%;text-align:start;margin:0.4rem 0',
      onclick: () => {
        motivation = m;
        phase = 'level';
        say(m.hint || '');
        render();
      },
    }, m.label));
    show(
      progressDots(0),
      h('h1', { id: 'view-title', tabindex: '-1' }, 'What brings you to Hebrew?'),
      h('p', { class: 'muted' }, 'One question. Your answer changes the next screen.'),
      ...cards,
      statusMsg ? h('p', { class: 'muted', role: 'status' }, statusMsg) : null,
    );
  }

  function renderLevel() {
    const cards = (data.levels || []).map((lv) => h('button', {
      type: 'button',
      class: 'btn secondary',
      style: 'display:block;width:100%;text-align:start;margin:0.4rem 0',
      onclick: () => {
        level = lv;
        phase = 'commit';
        render();
      },
    }, lv.label));
    const motiveHint = motivation
      ? h('p', { class: 'muted' }, `Path: ${motivation.label}. `, motivation.hint || '')
      : null;
    show(
      progressDots(1),
      h('h1', { id: 'view-title', tabindex: '-1' }, 'Can you read Hebrew letters?'),
      h('p', { class: 'muted' }, 'Self-selection, not an exam. No placement test to fail on day one.'),
      motiveHint,
      ...cards,
    );
  }

  function renderCommit() {
    const cards = (data.commitments || []).map((c) => {
      const iso = promiseDateISO(c.daysOut || 21);
      const label = formatPromiseDate(iso);
      const line = promiseLine(motivation, c, label);
      const isDefault = !!c.default;
      return h('button', {
        type: 'button',
        class: isDefault ? 'btn' : 'btn secondary',
        style: 'display:block;width:100%;text-align:start;margin:0.4rem 0',
        onclick: () => {
          commitment = c;
          promiseIso = iso;
          phase = 'build';
          say('Hebrew reads right to left. Tap the letters of a word in order, first letter first.');
          render();
        },
      }, h('strong', {}, c.label), h('br'), h('span', { class: 'muted' }, line));
    });
    show(
      progressDots(2),
      h('h1', { id: 'view-title', tabindex: '-1' }, 'How much time a day?'),
      h('p', { class: 'muted' }, 'A real date, not a vague promise.'),
      ...cards,
      progressDots(3),
      h('p', { class: 'muted', style: 'text-align:center' }, 'Next: build אַבָּא — your first real win.'),
    );
  }

  // ---------- the builder ----------
  function rimonNode() {
    const img = h('img', { class: 'fw-rimon', src: RIMON_SRC, alt: 'Rimon the pomegranate, smiling', width: '96', height: '96', loading: 'lazy', decoding: 'async' });
    img.addEventListener('error', () => img.remove());
    return img;
  }

  function tileNode(L, { final = false, needed = false } = {}) {
    const glyph = final ? L.final : L.he;
    const id = final ? L.finalId : L.id;
    const name = final ? `Final ${L.name}` : L.name;
    return h('button', {
      type: 'button', class: `btn secondary fw-tile${needed ? ' is-needed' : ''}`, 'data-id': id, 'data-he': glyph,
      'aria-label': `${name}${needed ? ', in this word' : ''}`,
      onclick: () => placeLetter(glyph),
    }, heSpan(glyph, 'he fw-tile-he'), h('span', { class: 'fw-tile-name', 'aria-hidden': 'true' }, name));
  }

  function renderBuild() {
    const first = !freeMode() && !built;
    const sug = wordsLoaded ? suggestions(index, builder, 3) : [];
    const open = new Set(unlockedLetters(builder, index, sug, showAll));
    const neededSet = aim ? new Set([...aim.bare].map((c) => letterFor(c)?.he)) : new Set();
    const wf = writtenForm(placed);
    const letterTiles = ALEF_BET.filter((L) => open.has(L.he)).map((L) => tileNode(L, { needed: neededSet.has(L.he) }));
    const finals = finalsShown(builder, showAll) ? ALEF_BET.filter((L) => L.final).map((L) => tileNode(L, { final: true })) : [];
    const allOpen = open.size === ALEF_BET.length;

    const slots = h('div', {
      class: `fw-word${built ? ' is-built' : ''}`, dir: 'rtl', lang: 'he', 'data-live': 'word',
      role: 'group', 'aria-label': 'Your word', tabindex: '0',
    },
      built ? heSpan(built.he, 'he fw-word-he') : (placed.length ? heSpan(wf.text, 'he fw-word-he') : h('span', { class: 'fw-word-empty', 'aria-hidden': 'true' }, '· · ·')),
    );
    // aria-live: the built word (letters), read once per change
    const live = h('p', { class: 'visually-hidden', 'aria-live': 'polite', 'aria-atomic': 'true', id: 'fw-word-live' },
      built ? `${built.he}, ${built.translit}, ${built.en}` : (placed.length ? `${wf.text}, ${placed.length} letter${placed.length === 1 ? '' : 's'}` : 'Empty'));

    const sugRow = sug.length && !built ? h('div', { class: 'fw-suggest', role: 'group', 'aria-label': 'Words to try' },
      h('span', { class: 'muted fw-suggest-label' }, first ? 'Start with: ' : 'Try: '),
      ...sug.map((w) => h('button', {
        type: 'button', class: `fw-chip${aim?.id === w.id ? ' is-aim' : ''}`, 'aria-pressed': aim?.id === w.id, onclick: () => pickAim(w),
      }, heSpan(w.he, 'he fw-chip-he'), h('span', { class: 'fw-chip-en' }, `${w.translit} · ${w.en}`)))) : null;

    const controls = h('div', { class: 'row fw-controls', style: 'justify-content:center' },
      h('button', { type: 'button', class: 'btn secondary', onclick: removeLetter, 'aria-label': 'Take the last letter away', disabled: !placed.length && !built }, '⌫ Undo'),
      h('button', { type: 'button', class: 'btn secondary', onclick: () => clearWord(), disabled: !placed.length && !built }, 'Clear'),
      built ? null : h('button', { type: 'button', class: 'btn', id: 'fw-say', onclick: checkWord, disabled: !placed.length }, 'Say it'),
    );

    const success = built ? h('div', { class: 'card fw-success', id: 'fw-success' },
      rimonNode(),
      h('div', { class: 'fw-success-text' },
        h('p', { class: 'fw-success-he he', lang: 'he', dir: 'rtl' }, built.he),
        h('p', { class: 'fw-success-line' }, h('strong', {}, built.translit), ' — ', built.en),
        h('p', { class: 'muted small' }, 'Letters only: ', heSpan(built.bare), '. The marks around the letters are its vowels.')),
      h('div', { class: 'row fw-success-actions' },
        h('button', { type: 'button', class: 'btn', onclick: () => sayWord(built) }, 'Listen'),
        h('button', { type: 'button', class: 'btn secondary', onclick: () => sayWord(built, { slow: true }) }, 'Hear it slowly'),
        h('button', { type: 'button', class: 'btn secondary', id: 'fw-another', onclick: () => clearWord('Build another word.') }, 'Build another'),
        rec.done ? h('a', { class: 'btn secondary', href: '#/learn' }, 'Lessons') : h('button', { type: 'button', class: 'btn secondary', id: 'fw-continue', onclick: finishTry }, 'Continue')),
    ) : null;

    const tray = h('div', { class: 'fw-tray', role: 'group', 'aria-label': 'Letters' },
      h('div', { class: 'fw-tray-row', dir: 'rtl' }, ...letterTiles),
      finals.length ? h('div', { class: 'fw-tray-row fw-tray-finals', dir: 'rtl', role: 'group', 'aria-label': 'Final forms, used at the end of a word' }, ...finals) : null,
      h('p', { class: 'row fw-tray-foot', style: 'justify-content:center' },
        wordsLoaded ? h('span', { class: 'muted small' }, allOpen ? 'All 22 letters are open.' : `${open.size} of 22 letters open — more open as you build.`) : h('span', { class: 'muted small' }, 'Loading the word list…'),
        allOpen && builder.count >= FULL_AT ? null : h('button', { type: 'button', class: 'btn secondary small', 'aria-pressed': showAll, onclick: () => { showAll = !showAll; say(showAll ? 'All letters are open.' : 'Back to the open letters.'); } }, showAll ? 'Fewer letters' : 'All letters')),
    );

    const kids = [
      h('h1', { id: 'view-title', tabindex: '-1' }, first ? 'Build your first Hebrew word' : 'Build Hebrew words'),
      h('p', { class: 'muted' },
        first ? 'Under a minute. No hearts. Hebrew reads right to left: tap the first letter first.' : 'Every word you build is said out loud in your chosen voice. ',
        h('span', { id: 'fw-tally' }, tallyLine(builder)),
        wordsLoaded ? ` ${index.size} words can be built here.` : ''),
      motivation && first ? h('p', { class: 'muted' }, `For: ${motivation.label}`) : null,
      sugRow,
      aim && !built ? h('p', { class: 'fw-aim muted' }, 'Spelling ', heSpan(aim.he), ` — ${aim.translit}, ${aim.en}`) : null,
      slots,
      live,
      controls,
      success,
      h('p', { role: 'status', 'aria-live': 'polite', class: 'muted', id: 'fw-status' }, statusMsg),
      built ? null : tray,
    ].filter(Boolean);
    show(...kids);
  }

  function renderCelebrate() {
    ensureMotionStyle();
    ensureCelebrateStyle(globalThis.document);
    const word = lastBuilt || { he: 'אַבָּא', bare: 'אבא', en: 'dad', translit: 'aba' };
    const kids = [
      h('h1', { id: 'view-title', tabindex: '-1' }, 'You did it'),
      (() => {
        const stills = [SCENE.minuteOne, SCENE.minuteOneVariant, SCENE.minuteOneStill03, SCENE.minuteOneStill04, SCENE.minuteOneStill05, SCENE.minuteOneStill06, SCENE.minuteOneStill07, SCENE.minuteOneStill08, SCENE.minuteOneStill09, SCENE.minuteOneStill11, SCENE.minuteOneStill12]
          .map((id) => picture(h, ctx, 'id', id, { class: 'scene-art', width: 480 }))
          .filter(Boolean);
        if (!stills.length) return null;
        return h('div', { class: 'lp-cele', 'data-motion': 'fade', style: 'display:flex;flex-wrap:wrap;gap:0.75rem;justify-content:center' }, ...stills);
      })(),
    ];
    // Beat 0: gratitude (siyum) before self-congratulation
    if (celebrateStep >= 0) {
      kids.push(h('p', { class: 'muted', style: 'text-align:center;font-style:italic' },
        data.gratitude || 'Thank you for the letters that became a word.'));
    }
    // Beat 1: words learned LARGE first
    if (celebrateStep >= 1) {
      kids.push(
        h('p', { class: 'fw-big he', lang: 'he', dir: 'rtl', style: 'font-size:3rem;text-align:center;font-weight:700' }, word.he),
        h('p', { class: 'he', lang: 'he', dir: 'rtl', style: 'font-size:2rem;text-align:center' }, word.bare),
        h('p', { class: 'muted', style: 'text-align:center' }, `${word.translit} — ${word.en}`),
        h('p', { class: 'muted', style: 'text-align:center;font-size:0.9rem' },
          builder.count > 1 ? `${builder.count} words built. A few minutes ago, these were just shapes.` : 'A few minutes ago, these were just shapes.'),
      );
    }
    // Beat 2: accuracy + time (kind; words already led)
    if (celebrateStep >= 2) {
      kids.push(h('p', { style: 'text-align:center' },
        h('strong', {}, `${rec.accuracy}%`), ` · ${rec.seconds}s`));
    }
    // Beat 3: Day-1 streak — never-shame (sole haptic fires here)
    if (celebrateStep >= 3) {
      kids.push(h('p', { class: 'card', style: 'text-align:center;margin-block:1rem' },
        h('strong', {}, 'Day 1 of your seder is lit'),
        h('br'),
        h('span', { class: 'muted' }, data.streakCopy || 'A missed day never shames you — your place stays held. Come back tomorrow for Day 2.')));
    }
    // Beat 4: shareable card
    if (celebrateStep >= 4) {
      kids.push(h('div', { class: 'card fw-share', id: 'fw-share-card', style: 'text-align:center' },
        h('p', { class: 'he', lang: 'he', dir: 'rtl', style: 'font-size:2.2rem;margin:0' }, word.bare),
        h('p', { class: 'muted' }, data.shareLine || 'My first Hebrew word on Aleph')));
    }
    // Beat 5: siyum open-next / Zeigarnik
    if (celebrateStep >= 5) {
      kids.push(
        h('p', { class: 'card', style: 'text-align:center' },
          h('span', { class: 'muted' }, 'Come back and build more: '),
          h('span', { class: 'he', lang: 'he', dir: 'rtl', style: 'font-size:1.6rem;opacity:0.55' }, nextWord.hePointed || 'אִמָּא'),
          h('br'),
          h('span', { class: 'muted' }, `(${nextWord.gloss || 'mum'}) and ${Math.max(0, index.size - builder.count)} more words are waiting on the tray.`)),
        h('p', { class: 'row', style: 'justify-content:center' },
          h('button', { type: 'button', class: 'btn', onclick: goSave }, 'Continue')),
      );
    }
    kids.push(h('p', { role: 'status', 'aria-live': 'polite', class: 'muted', id: 'fw-status' }, statusMsg));
    show(...kids.filter(Boolean));
  }

  function render() {
    if (!alive) return;
    if (phase === 'splash') { renderSplash(); return; }
    if (phase === 'motive') { renderMotive(); return; }
    if (phase === 'level') { renderLevel(); return; }
    if (phase === 'commit') { renderCommit(); return; }
    if (phase === 'build') { renderBuild(); return; }
    if (phase === 'celebrate') { renderCelebrate(); return; }

    // save — equal weight
    show(
      h('h1', { id: 'view-title', tabindex: '-1' }, data.savePrompt || 'Save your progress'),
      h('p', { class: 'muted' }, 'Same weight either way. You already won.'),
      h('div', { class: 'row', style: 'justify-content:center;gap:1rem' },
        h('button', { type: 'button', class: 'btn', id: 'fw-create-profile', onclick: chooseProfile }, 'Create profile'),
        h('button', { type: 'button', class: 'btn', id: 'fw-later', onclick: chooseLater }, 'Later')),
      h('p', { class: 'muted', style: 'text-align:center' }, 'Create profile opens a local share/backup path. Later keeps progress on this device.'),
      statusMsg ? h('p', { class: 'muted', role: 'status' }, statusMsg) : null,
    );
  }

  // A learner who already finished the first run (or built words before) lands in the builder; ?replay=1 starts over from the splash.
  if (freeMode() && !ctx?.query?.replay) {
    phase = 'build';
    splashDone = true;
    statusMsg = 'Hebrew reads right to left. Tap letters, or pick a word to spell.';
  }
  render();
  return () => { alive = false; globalThis.document?.removeEventListener?.('keydown', onKey); };
}
