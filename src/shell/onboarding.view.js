// First-run setup: voice, pronunciation tradition, goal. Everything is stored in settings and can be changed later.
import { h, heSpan } from './ui.js';
import { requestPersistence } from './backup.js';

// "American synagogue" is a label for the Sephardi-values default (CONTRACT: American-synagogue default = sephardi values).
const CONG = [
  ['israeli', 'Israeli', 'Modern Israeli pronunciation, as spoken in Israel.'],
  ['sephardi', 'Sephardi', 'Sephardi vowel values.'],
  ['ashkenazi', 'Ashkenazi', 'Ashkenazi vowel values (for example kamatz as "aw").'],
  ['american', 'American synagogue', 'Most American synagogues use Sephardi/Israeli vowel values. This choice is stored as Sephardi.'],
];
const GOALS = [['read', 'Read in synagogue', 'Siddur and Torah reading, with the prayers as the goal.'], ['israel', 'Get around in Israel', 'Everyday spoken Hebrew.'], ['both', 'Both', 'Start with reading; the Israel track is one tap away.']];

export function mount(root, ctx) {
  const { settings } = ctx;
  const sel = { voice: settings.get('voice'), cong: settings.get('congregation'), goal: settings.get('goal') };
  const group = (name, legend, intro, options, current, onPick) => {
    const fs = h('fieldset', { class: 'field' }, h('legend', {}, legend), intro ? h('p', { class: 'muted' }, intro) : null);
    for (const [value, label, desc] of options) {
      const id = `ob-${name}-${value}`;
      fs.append(h('label', { class: 'opt opt-block', for: id },
        h('input', { type: 'radio', name, id, value, checked: current === value ? true : null, onchange: () => onPick(value) }),
        h('span', {}, h('strong', {}, label), desc ? h('span', { class: 'muted block' }, desc) : null)));
    }
    return fs;
  };
  const finish = (skip) => {
    const patch = { onboarded: true };
    if (!skip) Object.assign(patch, { voice: sel.voice, congregation: sel.cong, goal: sel.goal, israelTrack: sel.goal !== 'read' });
    settings.set(patch);
    if (!skip) requestPersistence(); // best effort, after a user gesture; a refusal is fine (Settings explains and offers a backup)
    ctx.route(skip ? '/' : '/learn');
  };
  root.replaceChildren(h('article', { class: 'card onboarding' },
    h('h1', { id: 'view-title', tabindex: '-1' }, ctx.t('welcome.title'), ' ', heSpan('אלף')),
    h('p', {}, 'Three quick choices. You can change all of them later in Settings.'),
    h('form', { onsubmit: (e) => { e.preventDefault(); finish(false); } },
      group('voice', 'Which narrator voice do you prefer?',
        'Honest note: ALEF has no recorded voices yet. "Ari" (man) and "Noa" (woman) are the planned narrators and for now this is only a saved preference. Today\'s sound comes from your browser\'s built-in Hebrew voice, if your device has one, and its gender and accent are chosen by your device.',
        [['m', 'Man (Ari)', ''], ['f', 'Woman (Noa)', '']], sel.voice, (v) => { sel.voice = v; }),
      group('cong', 'Which pronunciation does your congregation use?', 'This controls prayer pronunciation and which vowel values are shown.',
        CONG.map(([v, l, d]) => [v, l, d]), sel.cong === 'sephardi' ? 'american' : sel.cong, (v) => { sel.cong = v === 'american' ? 'sephardi' : v; }),
      group('goal', 'What is your goal?', '', GOALS, sel.goal, (v) => { sel.goal = v; }),
      h('div', { class: 'row' },
        h('button', { type: 'submit', class: 'btn' }, 'Start learning'),
        h('button', { type: 'button', class: 'btn secondary', onclick: () => finish(true) }, 'Skip for now'))),
    h('p', { class: 'muted' }, 'Your choices are saved only on this device. ', h('a', { href: '#/how' }, 'How this works and what is still draft'), '.')));
  return () => {};
}
