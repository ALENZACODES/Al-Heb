// Session media rules from the 2026-11-06 advisory.
// Learner and production voice are not gated here. SFX and music are.
import { SACRED_ROUTES } from '../listen/catalog.js';

export const QUIET_MS = 60_000;
const WIN_NAMES = new Set(['success', 'streak', 'collect', 'catch']);

export function feedbackName(name) {
  if (name === 'success') return 'success';
  if (name === 'miss' || name === 'error' || name === 'error_soft') return 'miss';
  if (name === 'streak') return 'streak';
  return null;
}

export function createMediaPolicy({ now = () => Date.now() } = {}) {
  const start = now();
  let won = false;
  let asked = false;
  let speech = 0;
  let cantorial = false;
  let routeSacred = false;
  let musicChosen = false; // the learner pressed Play music: no first-minute wait for them
  const subs = new Set();
  const emit = () => { for (const fn of subs) { try { fn(snapshot()); } catch { /* ignore */ } } };
  function quiet() { return now() - start < QUIET_MS; }
  function snapshot() {
    return { quiet: quiet(), won, asked, speech: speech > 0, cantorial, routeSacred };
  }
  return {
    snapshot,
    subscribe(fn) { subs.add(fn); fn(snapshot()); return () => subs.delete(fn); },
    quiet,
    allowsSfx() { return won && !quiet() && speech === 0 && !cantorial && !routeSacred; },
    allowsMusic() { return (musicChosen || !quiet()) && speech === 0 && !cantorial && !routeSacred; },
    feedbackName,
    observe(name) { if (!won && WIN_NAMES.has(name)) { won = true; emit(); } },
    setSpeech(on) { speech = on ? speech + 1 : Math.max(0, speech - 1); emit(); },
    clearSpeech() { speech = 0; emit(); },
    setCantorial(on) { cantorial = !!on; emit(); },
    setRoute(name) { routeSacred = SACRED_ROUTES.has(name || ''); emit(); },
    shouldAsk() { return won && !quiet() && !asked; },
    markAsked() { asked = true; emit(); },
    chooseMusic() { if (!musicChosen) { musicChosen = true; emit(); } },
  };
}

export const mediaPolicy = createMediaPolicy();
