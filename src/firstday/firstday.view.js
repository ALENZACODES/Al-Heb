/**
 * First 10 minutes (#/firstday): DRAFT, unreviewed. Learn 5 letters and 2 vowels, then read 3 real Hebrew words.
 * Audio: ctx.audio.play(kind, id) via model.playHook; words use ids firstday-* that are registered with ctx.audio.extend
 * (no recordings exist, so the Israeli speech fallback is used where the browser has it; the screen says when it cannot play).
 * Ladder (#/firstday/ladder is optional, see docs/firstday/ROUTES.md): pointed to unpointed practice, 20 steps.
 * ctx extras for tests: ctx.firstdayData {first10, ladder}, ctx.rng.
 */
import { el, heText, storeGet, storeSet } from '../curriculum/dom.js';
import { loadFirst10, loadLadder } from './loader.js';
import { DRAFT_NOTICE, PROGRESS_KEY, emptyProgress, advance, markRead, wordById, buildCheck, gradeCheck, audioEntries, playHook, totalMinutes } from './model.js';

/** @param {HTMLElement} root @param {any} ctx @returns {() => void} unmount */
export function mount(root, ctx) {
  const rng = ctx?.rng || Math.random;
  const wrap = el('section', { class: 'alef-firstday', 'aria-labelledby': 'view-title' });
  const h1 = el('h1', { id: 'view-title', tabindex: '-1' }, 'Your first 10 minutes');
  const body = el('div', { class: 'fd-body' });
  const status = el('div', { role: 'status', 'aria-live': 'polite' });
  wrap.append(h1, el('p', { class: 'fd-draft' }, DRAFT_NOTICE), body, status);
  root.append(wrap);
  let alive = true, data = null, progress = emptyProgress(), check = null, picked = null;
  const say = (t) => { status.textContent = t; };
  const listen = (hook) => el('button', { class: 'btn', type: 'button', onclick: async () => {
    const r = await playHook(ctx?.audio, hook);
    say(r.source === 'none' ? 'Sound is not available on this device yet.' : r.source === 'tts-fallback' ? 'Played with the device voice, not a recording.' : 'Playing.');
  } }, 'Hear it');
  const save = () => storeSet(ctx, PROGRESS_KEY, progress);
  const next = () => { progress = advance(progress, data); check = null; picked = null; save(); render(); focus(); };
  const focus = () => { try { h1.focus(); } catch { /* ignore */ } };

  function render() {
    const s = data.steps[progress.step];
    const nodes = [el('p', {}, `Step ${progress.step + 1} of ${data.steps.length}. Budget about ${Math.round(totalMinutes(data))} minutes (a design target, not measured).`), el('h2', {}, s.title)];
    if (s.body) nodes.push(el('p', {}, s.body));
    if (s.kind === 'letter') for (const id of s.items) { const l = data.letters.find((x) => x.id === id); nodes.push(el('p', {}, heText(l.he, 'alef-he fd-big'), ` ${l.sound} `, listen(l.audio))); }
    if (s.kind === 'vowel') for (const id of s.items) { const v = data.vowels.find((x) => x.id === id); nodes.push(el('p', {}, heText(v.example, 'alef-he fd-big'), ` ${v.sound}. ${v.note}`)); }
    if (s.kind === 'read') {
      const w = wordById(data, s.word);
      nodes.push(el('p', {}, heText(w.he, 'alef-he fd-big')), el('p', {}, 'Say it aloud, then check.'), listen(w.audio),
        el('button', { class: 'btn', type: 'button', onclick: () => { progress = markRead(progress, w.id); save(); say(`${w.sound}: ${w.gloss}. Source: ${w.source}.`); } }, 'Check my reading'));
      if (!w.fromBlessing) nodes.push(el('p', {}, 'This word is not from the Priestly Blessing.'));
    }
    if (s.kind === 'check') {
      check = check || buildCheck(data, 'shalom', rng);
      nodes.push(...check.options.map((o) => el('button', { class: 'btn', type: 'button', lang: 'he', dir: 'rtl', onclick: () => { picked = gradeCheck(check, o.id); progress = { ...progress, checkCorrect: picked.correct }; save(); say(picked.correct ? 'Yes, that one is shalom.' : 'Not quite. Shalom is the long word with the dot-vav. Try again, nothing is lost.'); } }, o.he)));
    }
    if (s.kind === 'done') nodes.push(el('p', {}, data.honestyNote));
    if (s.kind !== 'done') nodes.push(el('button', { class: 'btn', type: 'button', onclick: next }, 'Next'));
    body.replaceChildren(...nodes);
  }

  (async () => {
    try {
      const d = ctx?.firstdayData;
      const [first10, ladder] = d ? [d.first10, d.ladder] : await Promise.all([loadFirst10(), loadLadder()]);
      data = first10;
      try { ctx?.audio?.extend?.(audioEntries(first10, ladder)); } catch { /* optional */ }
      const saved = await storeGet(ctx, PROGRESS_KEY, null);
      if (saved && Number.isInteger(saved.step) && saved.step < data.steps.length) progress = { ...emptyProgress(), ...saved };
      if (alive) render();
    } catch { if (alive) body.replaceChildren(el('p', { role: 'alert' }, 'The lesson could not be loaded. Reload; nothing was lost.')); }
  })();
  return () => { alive = false; wrap.remove(); };
}
