// J6 Keyboard Shortcuts (#/shortcuts): the shortcuts listed in src/platform/shortcuts.js, each checked against its code by a test.
import { h } from '../shell/ui.js';
import { SHORTCUTS } from './shortcuts.js';
import { shortcutsOn } from '../shell/motor.js';

export function mount(root, ctx) {
  const on = shortcutsOn(ctx);
  root.append(h('section', { class: 'card', 'aria-labelledby': 'view-title' },
    h('h1', { id: 'view-title', tabindex: '-1' }, 'Keyboard Shortcuts'),
    h('p', {}, `Single-key shortcuts are ${on ? 'on' : 'off'} on this device. Turn them ${on ? 'off' : 'on'} in `, h('a', { href: '#/settings' }, 'Settings'), ' (Single-key shortcuts). Rows marked "always" work either way. Keys typed into a text field are never taken as shortcuts.'),
    h('div', { role: 'region', 'aria-label': 'Shortcuts table, scrolls sideways on narrow screens', tabindex: '0', style: 'overflow-x:auto;max-width:100%' },
      h('table', {}, h('caption', {}, 'Where, which keys, and what they do'),
        h('thead', {}, h('tr', {}, ...['Where', 'Keys', 'What it does', 'Setting'].map((x) => h('th', { scope: 'col' }, x)))),
        h('tbody', {}, ...SHORTCUTS.map((s) => h('tr', {}, h('th', { scope: 'row' }, s.where), h('td', {}, h('kbd', {}, s.keys)), h('td', {}, s.does), h('td', {}, s.always ? 'always' : on ? 'on' : 'off'))))))));
  return () => {};
}
