// Lesson-finished celebration. Calm by design: a short plain card, announced politely, no sound by default, no flashing.
// Motion: at most one slow opacity fade (0.6 s, played once), and none at all when calm mode is on or the system asks for
// reduced motion. The plan is pure so it can be tested; the node builder takes the app's `h` helper.
export const FADE_MS = 600;

export const CSS = `
.lp-cele { border: 2px solid var(--accent); border-radius: var(--radius, 12px); padding: .75rem 1rem; margin-block: 1rem; }
.lp-cele h3 { margin-block: 0 .25rem; font-size: 1.1rem; }
.lp-cele p { margin-block: .25rem; }
.lp-cele[data-motion="fade"] { animation: lp-fade ${FADE_MS}ms ease-out 1; }
@keyframes lp-fade { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .lp-cele { animation: none !important; } }
[data-calm] .lp-cele { animation: none !important; }
`;

/**
 * @param {{quiet:boolean, before:number, after:number, goal:number, soundOn?:boolean, rhythmLine?:string|null}} o
 *  quiet = calm mode or reduced motion (see src/shell/comfort.js quietNow)
 */
export function celebrationPlan({ quiet, before, after, goal, soundOn = false, rhythmLine = null }) {
  const gain = Math.max(0, after - before), crossed = before < goal && after >= goal;
  const lines = [];
  if (gain > 0) lines.push(`That added ${gain} ${gain === 1 ? 'point' : 'points'}: ${after} of ${goal} today.`);
  else lines.push(`You have ${after} of ${goal} points today.`);
  if (crossed) lines.push("Today's goal is reached. That is a good place to stop, or keep going if you like.");
  if (rhythmLine) lines.push(rhythmLine);
  return {
    headline: crossed ? "Daily goal reached" : 'Lesson finished',
    lines,
    motion: quiet ? 'none' : 'fade',
    sound: !quiet && soundOn === true ? 'done' : null,
    announce: [crossed ? 'Daily goal reached.' : 'Lesson finished.', ...lines].join(' '),
  };
}

/** The card. role=status makes a screen reader read it once, politely. Focus is not moved. */
export function celebrationNode(h, plan) {
  return h('section', { class: 'lp-cele', role: 'status', 'aria-live': 'polite', 'data-motion': plan.motion },
    h('h3', {}, plan.headline), ...plan.lines.map((l) => h('p', {}, l)));
}

/** Insert the stylesheet once. @param {Document} doc */
export function ensureStyle(doc) {
  if (!doc || !doc.head || (doc.getElementById && doc.getElementById('lp-style'))) return;
  const s = doc.createElement('style'); s.setAttribute('id', 'lp-style'); s.textContent = CSS; doc.head.append(s);
}
