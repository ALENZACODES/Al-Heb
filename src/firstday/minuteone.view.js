/**
 * Minute One (#/firstwin) — t1039u LOCK.
 * Build אַבָּא from א+ב+א, niqqud on then fade, then finish order:
 * haptic → large Hebrew → accuracy+time → Day-1 streak → share card → Save (Create profile | Later equal) → personalise.
 * No fail hearts. Joyful register only. ALEF colors; no cast/voice changes.
 */
import { h, heSpan } from '../shell/ui.js';
import { STORE_KEY, normalize, place, isComplete, finishRecord } from './minuteone.model.js';

const DATA_URL = 'data/firstday/minute-one.json';

export async function mount(root, ctx) {
  const { store, settings } = ctx;
  const t0 = (ctx?.clock?.now ? ctx.clock.now() : Date.now());
  let alive = true;
  let data = null;
  let placed = [];
  let phase = 'build'; // build | fade | say | celebrate | save
  let correct = 0, attempts = 0;
  let fadeOn = false;
  let rec = normalize(store.get(STORE_KEY));
  let statusMsg = '';

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
  const say = (m) => { statusMsg = m; render(); };
  const nowISO = () => new Date(ctx?.clock?.now ? ctx.clock.now() : Date.now()).toISOString();

  const vibrateWin = () => {
    // t1039u finish step 1: one celebration pulse at peak win (skip calm / reduced-motion).
    try {
      if (ctx?.settings?.get?.('calmMode') === true) return;
      if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return;
      if (typeof globalThis?.navigator?.vibrate === 'function') {
        globalThis.navigator.vibrate([20, 40, 20, 40, 60]);
      }
    } catch { /* ignore */ }
  };

  const playLetter = (id) => {
    try { ctx?.audio?.play?.('letter', id); } catch { /* ignore */ }
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
      setTimeout(() => { if (alive) { fadeOn = true; say('Points fading — you can still read אבא.'); phase = 'say'; render(); } }, 900);
    }
    render();
  };

  const finishTry = () => {
    const seconds = ((ctx?.clock?.now ? ctx.clock.now() : Date.now()) - t0) / 1000;
    rec = finishRecord({ seconds, correctBeats: correct, totalBeats: Math.max(attempts, data.beats || 7), nowISO: nowISO() });
    try { store.set(STORE_KEY, rec); } catch { /* ignore */ }
    // Day-1 streak: mark engaged lightly via existing progress if present
    try {
      const st = store.get('streak') || store.get('curriculum.streak');
      // Best-effort: set a local firstwin flag streak consumers can read; full streak engine stays untouched if shape unknown
      store.set('firstwin.streakDay1', { v: 1, at: nowISO(), label: 'Day 1 — you showed up.' });
    } catch { /* ignore */ }
    try { settings.set({ onboarded: true }); } catch { /* ignore */ }
    phase = 'celebrate';
    vibrateWin();
    render();
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
    // Local profile: mark saved, then personalise (tradition/goal). Share/backup remains in Settings.
    try { store.set('profile.v1', { v: 1, createdAt: nowISO(), source: 'firstwin' }); } catch { /* ignore */ }
    ctx.route('/welcome?personalise=1');
  };

  function render() {
    if (!alive) return;
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
        h('p', { class: 'muted' }, 'Under a minute. No hearts. Wrong tiles just ask you to try again.'),
        h('p', { class: 'fw-target he', lang: 'he', dir: 'rtl', style: 'font-size:2.6rem;text-align:center;margin:0.5rem 0' }, shown),
        h('p', { class: 'fw-slots', dir: 'rtl', lang: 'he', style: 'display:flex;gap:0.5rem;justify-content:center;font-size:2rem' }, ...slots),
        h('div', { class: 'row fw-tray', style: 'justify-content:center' }, ...tray),
        status,
      ];
      if (phase === 'say') {
        kids.push(
          h('p', {}, h('button', { type: 'button', class: 'btn secondary', onclick: () => { try { ctx?.audio?.play?.(word.audio.kind, word.audio.id); } catch {} say('Playing.'); } }, 'Hear'),
            ' ',
            h('button', { type: 'button', class: 'btn', onclick: finishTry }, 'I said it — continue'),
            ' ',
            h('button', { type: 'button', class: 'btn secondary', onclick: finishTry }, 'Heard only — continue')),
        );
      }
      shell.replaceChildren(...kids);
      return;
    }

    if (phase === 'celebrate') {
      shell.replaceChildren(
        h('h1', { id: 'view-title', tabindex: '-1' }, 'You did it'),
        h('p', { class: 'fw-big he', lang: 'he', dir: 'rtl', style: 'font-size:3rem;text-align:center;font-weight:700' }, word.hePointed),
        h('p', { class: 'he', lang: 'he', dir: 'rtl', style: 'font-size:2rem;text-align:center' }, word.heBare),
        h('p', { class: 'muted', style: 'text-align:center' }, word.gloss),
        h('p', { style: 'text-align:center' }, h('strong', {}, `${rec.accuracy}%`), ` · ${rec.seconds}s`),
        h('p', { class: 'card', style: 'text-align:center;margin-block:1rem' }, h('strong', {}, 'Day 1 — you showed up.')),
        h('div', { class: 'card fw-share', id: 'fw-share-card', style: 'text-align:center' },
          h('p', { class: 'he', lang: 'he', dir: 'rtl', style: 'font-size:2.2rem;margin:0' }, word.heBare),
          h('p', { class: 'muted' }, data.shareLine || 'My first Hebrew word on ALEF')),
        h('p', { class: 'row', style: 'justify-content:center' },
          h('button', { type: 'button', class: 'btn', onclick: goSave }, 'Continue')),
        status,
      );
      return;
    }

    // save — equal weight
    shell.replaceChildren(
      h('h1', { id: 'view-title', tabindex: '-1' }, data.savePrompt || 'Save your progress'),
      h('p', { class: 'muted' }, 'Same weight either way. You already won.'),
      h('div', { class: 'row', style: 'justify-content:center;gap:1rem' },
        h('button', { type: 'button', class: 'btn', id: 'fw-create-profile', onclick: chooseProfile }, 'Create profile'),
        h('button', { type: 'button', class: 'btn', id: 'fw-later', onclick: chooseLater }, 'Later')),
      h('p', { class: 'muted', style: 'text-align:center' }, 'Create profile opens a local share/backup path. Later keeps progress on this device.'),
      status,
    );
  }

  if (rec.done && !ctx?.query?.replay) {
    phase = 'celebrate';
  }
  say('Hebrew reads right to left. Tap the letters in order.');
  render();
  return () => { alive = false; };
}
