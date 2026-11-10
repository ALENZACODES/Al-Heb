// After the first real win, and only once the opening minute is over, ask about sound effects.
import { h } from '../shell/ui.js';
import { mediaPolicy } from './policy.js';

export function mountMediaPrompt(parent, settings) {
  if (!parent) return () => {};
  let node = null;
  const draw = () => {
    const ask = mediaPolicy.shouldAsk() && settings?.get?.('soundEffects') !== true && !mediaPolicy.snapshot().routeSacred;
    if (!ask) { node?.remove(); node = null; return; }
    if (node) return;
    node = h('aside', { id: 'media-prompt', role: 'dialog', 'aria-label': 'Sound effects' },
      h('p', {}, 'You finished one. Sound effects stay off unless you want them. They never play over speech or prayer.'),
      h('p', {}, h('button', { type: 'button', class: 'btn', onclick: () => {
        try { settings?.set?.({ soundEffects: true }); } catch { /* ignore */ }
        mediaPolicy.markAsked();
      } }, 'Turn on sound effects'),
      ' ',
      h('button', { type: 'button', class: 'btn secondary', onclick: () => mediaPolicy.markAsked() }, 'Keep them off')));
    parent.append(node);
  };
  return mediaPolicy.subscribe(draw);
}
