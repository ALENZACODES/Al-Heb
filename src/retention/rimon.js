// @ts-check
// showRimon(situation): the one way retention code asks Rimon to react. It sends the app's existing "alef:rimon" event
// (src/shell/rimon.js listens on document) using only the twelve actions already drawn in assets/img/rimon/.
// No new art. Rimon is "Rimon" or "they" in every line of copy.
export const DRAWN_ACTIONS = Object.freeze(['blink', 'wave', 'wink', 'bounce', 'laugh', 'highfive', 'nervous', 'sad', 'thinking', 'point', 'stretch', 'yawn']);
export const SITUATIONS = Object.freeze({
  lesson_complete: { action: (d) => (d.accuracy >= 0.8 ? 'highfive' : 'bounce') },
  xp_payout: { action: 'bounce' },
  daily_goal: { action: 'laugh', line: 'goal' },
  streak_extended: { action: 'stretch' },
  streak_milestone: { action: 'stretch', confetti: true },
  streak_at_risk: { action: 'nervous' },
  streak_broken: { action: 'sad', then: 'point' },
  streak_repaired: { action: 'highfive' },
  freeze_used: { action: 'wink' },
  freeze_bought: { action: 'wink' },
  heart_lost: { action: 'nervous' },
  heart_last: { action: 'thinking' },
  hearts_empty: { action: 'sad', then: 'point' },
  heart_back: { action: 'bounce', line: 'heartBack' },
  hearts_refilled: { action: 'highfive' },
  league_up: { action: 'highfive', line: 'moveUp', confetti: true },
  league_stay: { action: 'wave' },
  league_down: { action: 'thinking' },
  welcome_back: { action: 'wave', then: 'laugh', line: 'welcomeBack' },
  notify_optin: { action: 'point' },
  shabbat: { action: 'wave', line: 'shabbat' },
  chag: { action: 'wave', line: 'chag' },
  shavua_tov: { action: 'wave', line: 'shavuaTov' },
});
export const THEN_MS = 1500;
let thenTimer = null;
/**
 * @param {string} situation a key of SITUATIONS @param {object} [data] extra detail (e.g. {accuracy})
 * @param {Document} [doc] @param {{setTimeout?:Function, clearTimeout?:Function}} [timers]
 * @returns {boolean} true when the event was sent
 */
export function showRimon(situation, data = {}, doc = globalThis.document, timers = globalThis) {
  const s = Object.prototype.hasOwnProperty.call(SITUATIONS, situation) ? SITUATIONS[situation] : null;
  if (!s || !doc || typeof doc.dispatchEvent !== 'function' || typeof CustomEvent !== 'function') return false;
  const action = typeof s.action === 'function' ? s.action(data) : s.action;
  if (thenTimer !== null) { try { (timers.clearTimeout || clearTimeout)(thenTimer); } catch { /* ignore */ } thenTimer = null; }
  const send = (a) => doc.dispatchEvent(new CustomEvent('alef:rimon', { bubbles: true, detail: { ...data, action: a, situation, line: s.line || null, retention: true } }));
  send(action);
  if (s.then) thenTimer = (timers.setTimeout || setTimeout)(() => { thenTimer = null; try { send(s.then); } catch { /* Rimon is optional */ } }, THEN_MS);
  if (s.confetti) { try { doc.dispatchEvent(new CustomEvent('alef:celebrate', { bubbles: true, detail: { kind: situation } })); } catch { /* optional */ } }
  return true;
}
try { if (globalThis.ALEF && typeof globalThis.ALEF === 'object') globalThis.ALEF.showRimon = showRimon; } catch { /* no global to extend */ }
