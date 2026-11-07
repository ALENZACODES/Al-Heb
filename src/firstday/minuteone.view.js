/**
 * Minute One (#/firstwin) — t1040u Best App Starts fold.
 * Splash שָׁלוֹם (0–3s) → ≤4 pre-lesson screens that change the next → build אַבָּא →
 * finish: gratitude → words LARGE → accuracy/time → Day-1 streak (sole haptic) →
 * share → Zeigarnik אמא → Save (Create profile | Later equal) → personalise.
 * No fail hearts. Joyful register only for drills. ALEF cream/navy; no cast/voice changes.
 */
import { h, heSpan } from '../shell/ui.js';
import { SCENE, letterMeet, picture } from '../img/scenes.js';
import { ensureMotionStyle, startSpeaking } from '../motion/alive.js';
import { ensureStyle as ensureCelebrateStyle } from '../../preview/loops/celebrate.js';
import {
  STORE_KEY, normalize, place, isComplete, finishRecord,
  promiseDateISO, formatPromiseDate, promiseLine,
} from './minuteone.model.js';

const DATA_URL = 'data/firstday/minute-one.json';

export async function mount(root, ctx) {
  const { store, settings } = ctx;
  const t0 = (ctx?.clock?.now ? ctx.clock.now() : Date.now());
  let alive = true;
  let data = null;
  let placed = [];
  // splash | motive | level | commit | build | fade | say | celebrate | save
  let phase = 'splash';
  let correct = 0, attempts = 0;
  let fadeOn = false;
  let rec = normalize(store.get(STORE_KEY));
  let statusMsg = '';
  let motivation = null;
  let level = null;
  let commitment = null;
  let promiseIso = null;
  let celebrateStep = 0; // 0..n for staggered finish beats
  let splashDone = false;

  const shell = h('article', { class: 'card firstwin', id: 'firstwin' });
  root.replaceChildren(shell);

  try {
    const res = await fetch(DATA_URL, { cache: 'no-cache' });
    data = await res.json();
  } catch (e) {
    shell.replaceChildren(h('p', { role: 'alert' }, 'Minute One could not load. ', h('a', { href: '#/welcome' }, 'Continue to setup')));
    return () => { alive = false; };
  }

  const word = data.word;
  const nextWord = data.nextWord || { hePointed: 'אִמָּא', heBare: 'אמא', gloss: 'mum / mom', tease: 'Tomorrow: אִמָּא completes the family.' };
  const say = (m) => { statusMsg = m; render(); };
  const nowISO = () => new Date(ctx?.clock?.now ? ctx.clock.now() : Date.now()).toISOString();

  /** Sole haptic — timed to streak/reveal only (research: scarcity). */
  const vibrateStreak = () => {
    try {
      if (ctx?.settings?.get?.('calmMode') === true) return;
      if (settings?.get?.('haptics') === false) return;
      if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return;
      if (typeof globalThis?.navigator?.vibrate === 'function') {
        globalThis.navigator.vibrate([20, 40, 20, 40, 60]);
      }
    } catch { /* ignore */ }
  };

  const playLetter = (id) => {
    try { ctx?.audio?.play?.('letter', id); } catch { /* ignore */ }
  };

  const playSplash = () => {
    const a = data.splash?.audio;
    if (!a) return;
    try {
      const p = ctx?.audio?.play?.(a.kind || 'word', a.id, a.text ? { text: a.text } : undefined);
      if (p && p.catch) p.catch(() => {});
    } catch { /* ignore */ }
  };

  const advanceFromSplash = () => {
    if (splashDone) return;
    splashDone = true;
    phase = 'motive';
    render();
  };

  const onTray = (trayId) => {
    if (phase !== 'build') return;
    attempts++;
    const r = place(placed, word.letters, trayId);
    if (!r.ok) {
      say('Not that one — try another tile.');
      return;
    }
    placed = r.placed;
    correct++;
    playLetter(trayId);
    say(placed.length === word.letters.length ? 'Built. Vowels are on.' : `Nice — ${placed.length} of ${word.letters.length}`);
    if (isComplete(placed, word.letters)) {
      phase = 'fade';
      setTimeout(() => {
        if (alive) {
          fadeOn = true;
          say(data.niqqudNote || 'Points fading — you can still read אבא.');
          phase = 'say';
          render();
        }
      }, 900);
    }
    render();
  };

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
    // Stagger finish beats; sole haptic when streak reveals
    const steps = [0, 1, 2, 3, 4, 5];
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
    // Assemble RTL: show letters appearing from right (index 0 = rightmost in RTL visual for Hebrew string)
    const spans = letters.map((ch, i) => h('span', {
      class: 'fw-splash-ch',
      style: `display:inline-block;opacity:0;animation:fwSplashIn 0.35s ease forwards;animation-delay:${i * 0.12}s`,
    }, ch));
    shell.replaceChildren(
      h('style', {}, `@keyframes fwSplashIn{from{opacity:0;transform:translateX(0.4em)}to{opacity:1;transform:none}}`),
      h('h1', { id: 'view-title', class: 'visually-hidden', tabindex: '-1' }, 'Shalom'),
      h('p', {
        class: 'fw-splash he', lang: 'he', dir: 'rtl',
        style: 'font-size:3.2rem;text-align:center;font-weight:700;letter-spacing:0.04em;margin:1.5rem 0 0.5rem',
        'aria-label': 'שָׁלוֹם',
      }, ...spans),
      h('p', { class: 'muted', style: 'text-align:center' }, sp.gloss ? `Shalom — “${sp.gloss}.”` : 'Shalom.'),
      h('p', { style: 'text-align:center' }, sp.line || 'You just read your first Hebrew word.'),
      h('p', { class: 'row', style: 'justify-content:center' },
        h('button', { type: 'button', class: 'btn', onclick: advanceFromSplash }, 'Begin')),
    );
    playSplash();
    const ms = Math.max(1200, sp.assembleMs || 1800);
    setTimeout(() => { if (alive && phase === 'splash') advanceFromSplash(); }, ms + 1200);
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
    shell.replaceChildren(
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
    shell.replaceChildren(
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
          say('Hebrew reads right to left. Tap the letters in order.');
          render();
        },
      }, h('strong', {}, c.label), h('br'), h('span', { class: 'muted' }, line));
    });
    shell.replaceChildren(
      progressDots(2),
      h('h1', { id: 'view-title', tabindex: '-1' }, 'How much time a day?'),
      h('p', { class: 'muted' }, 'A real date, not a vague promise.'),
      ...cards,
      progressDots(3),
      h('p', { class: 'muted', style: 'text-align:center' }, 'Next: build אַבָּא — your first real win.'),
    );
  }

  function renderCelebrate() {
    ensureMotionStyle();
    ensureCelebrateStyle(globalThis.document);
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
        h('p', { class: 'fw-big he', lang: 'he', dir: 'rtl', style: 'font-size:3rem;text-align:center;font-weight:700' }, word.hePointed),
        h('p', { class: 'he', lang: 'he', dir: 'rtl', style: 'font-size:2rem;text-align:center' }, word.heBare),
        h('p', { class: 'muted', style: 'text-align:center' }, word.gloss),
        h('p', { class: 'muted', style: 'text-align:center;font-size:0.9rem' },
          'Four minutes ago, these were just shapes.'),
      );
    }
    // Beat 2: accuracy + time (kind; words already led)
    if (celebrateStep >= 2) {
      kids.push(h('p', { style: 'text-align:center' },
        h('strong', {}, `${rec.accuracy}%`), ` · ${rec.seconds}s`));
    }
    // Beat 3: Day-1 streak — Finch never-shame (sole haptic fires here)
    if (celebrateStep >= 3) {
      kids.push(h('p', { class: 'card', style: 'text-align:center;margin-block:1rem' },
        h('strong', {}, 'Day 1 of your seder is lit'),
        h('br'),
        h('span', { class: 'muted' }, data.streakCopy || 'A missed day never shames you — your place stays held. Come back tomorrow for Day 2.')));
    }
    // Beat 4: shareable card
    if (celebrateStep >= 4) {
      kids.push(h('div', { class: 'card fw-share', id: 'fw-share-card', style: 'text-align:center' },
        h('p', { class: 'he', lang: 'he', dir: 'rtl', style: 'font-size:2.2rem;margin:0' }, word.heBare),
        h('p', { class: 'muted' }, data.shareLine || 'My first Hebrew word on ALEF')));
    }
    // Beat 5: siyum open-next / Zeigarnik אמא
    if (celebrateStep >= 5) {
      kids.push(
        h('p', { class: 'card', style: 'text-align:center' },
          h('span', { class: 'muted' }, nextWord.tease || 'Tomorrow: '),
          h('span', { class: 'he', lang: 'he', dir: 'rtl', style: 'font-size:1.6rem;opacity:0.55' }, nextWord.hePointed || 'אִמָּא'),
          h('br'),
          h('span', { class: 'muted' }, `(${nextWord.gloss || 'mum'}) — opened in the same breath.`)),
        h('p', { class: 'row', style: 'justify-content:center' },
          h('button', { type: 'button', class: 'btn', onclick: goSave }, 'Continue')),
      );
    }
    kids.push(h('p', { role: 'status', 'aria-live': 'polite', class: 'muted', id: 'fw-status' }, statusMsg));
    shell.replaceChildren(...kids.filter(Boolean));
  }

  function render() {
    if (!alive) return;
    if (phase === 'splash') { renderSplash(); return; }
    if (phase === 'motive') { renderMotive(); return; }
    if (phase === 'level') { renderLevel(); return; }
    if (phase === 'commit') { renderCommit(); return; }

    const status = h('p', { role: 'status', 'aria-live': 'polite', class: 'muted', id: 'fw-status' }, statusMsg);
    if (phase === 'build' || phase === 'fade' || phase === 'say') {
      const shown = fadeOn ? word.heBare : word.hePointed;
      const slots = word.glyphs.map((g, i) => {
        const filled = placed[i];
        const he = filled === 'alef' ? 'א' : filled === 'bet' ? 'ב' : '·';
        return h('span', { class: 'fw-slot', 'aria-label': filled ? g : `slot ${i + 1}` }, he);
      });
      const tray = data.tray.map((tile) => h('button', {
        type: 'button', class: 'btn secondary fw-tile', 'data-id': tile.id,
        onclick: () => onTray(tile.id),
      }, heSpan(tile.he), ' ', h('span', { class: 'muted' }, tile.name)));
      const kids = [
        h('h1', { id: 'view-title', tabindex: '-1' }, 'Build your first Hebrew word'),
        h('div', { class: 'row', 'data-live': 'letter', style: 'justify-content:center' },
          letterMeet(h, ctx, 'alef', { width: 220 }),
          letterMeet(h, ctx, 'bet', { width: 220 })),
        phase === 'fade' ? picture(h, ctx, 'id', SCENE.niqqudFade, { width: 640, class: 'scene-art' }) : null,
        phase === 'fade' ? picture(h, ctx, 'id', SCENE.niqqudFadeStill, { width: 640, class: 'scene-art' }) : null,
        phase === 'fade' ? picture(h, ctx, 'id', SCENE.niqqudFadeStill03, { width: 640, class: 'scene-art' }) : null,
        phase === 'fade' ? picture(h, ctx, 'id', SCENE.niqqudFadeStill04, { width: 640, class: 'scene-art' }) : null,
        phase === 'fade' ? picture(h, ctx, 'id', SCENE.niqqudFadeStill05, { width: 640, class: 'scene-art' }) : null,
        h('p', { class: 'muted' }, 'Under a minute. No hearts. Wrong tiles just ask you to try again.'),
        motivation ? h('p', { class: 'muted' }, `For: ${motivation.label}`) : null,
        h('p', { class: 'fw-target he', lang: 'he', dir: 'rtl', style: 'font-size:2.6rem;text-align:center;margin:0.5rem 0' }, shown),
        h('p', { class: 'fw-slots', dir: 'rtl', lang: 'he', style: 'display:flex;gap:0.5rem;justify-content:center;font-size:2rem' }, ...slots),
        h('div', { class: 'row fw-tray', style: 'justify-content:center' }, ...tray),
        status,
      ].filter(Boolean);
      if (phase === 'say') {
        kids.push(
          h('p', {}, h('button', { type: 'button', class: 'btn secondary', onclick: async (ev) => {
            const stop = startSpeaking(ctx, ev?.currentTarget?.closest?.('[data-live]') || shell);
            try { await ctx?.audio?.play?.(word.audio.kind, word.audio.id); say('Playing.'); } catch { say('Playing.'); } finally { stop(); }
          } }, 'Hear'),
            ' ',
            h('button', { type: 'button', class: 'btn', onclick: finishTry }, 'I said it — continue'),
            ' ',
            h('button', { type: 'button', class: 'btn secondary', onclick: finishTry }, 'Heard only — continue')),
        );
      }
      shell.replaceChildren(...kids);
      return;
    }

    if (phase === 'celebrate') { renderCelebrate(); return; }

    // save — equal weight
    shell.replaceChildren(
      h('h1', { id: 'view-title', tabindex: '-1' }, data.savePrompt || 'Save your progress'),
      h('p', { class: 'muted' }, 'Same weight either way. You already won.'),
      h('div', { class: 'row', style: 'justify-content:center;gap:1rem' },
        h('button', { type: 'button', class: 'btn', id: 'fw-create-profile', onclick: chooseProfile }, 'Create profile'),
        h('button', { type: 'button', class: 'btn', id: 'fw-later', onclick: chooseLater }, 'Later')),
      h('p', { class: 'muted', style: 'text-align:center' }, 'Create profile opens a local share/backup path. Later keeps progress on this device.'),
      statusMsg ? h('p', { class: 'muted', role: 'status' }, statusMsg) : null,
    );
  }

  if (rec.done && !ctx?.query?.replay) {
    phase = 'celebrate';
    celebrateStep = 5;
  }
  render();
  return () => { alive = false; };
}
