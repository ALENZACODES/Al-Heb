// /accessibility: one plain-language screen for every accessibility setting, a "Start here" picker, and the accessibility statement.
// Model and presets live in a11y.model.js, the statement text in a11y.statement.js. The only thing saved is the settings object.
import { h } from './ui.js';
import { visibleGroups, PRESETS, applyPreset } from './a11y.model.js';
import { STATEMENT } from './a11y.statement.js';

export function mount(root, ctx) {
  const { settings } = ctx;
  const t = (k, fb) => { try { const v = ctx.t?.(k); return v && v !== k ? v : fb; } catch { return fb; } };
  let lastUndo = null;
  const status = h('p', { role: 'status', 'aria-live': 'polite', id: 'a11y-status', class: 'muted' });
  const undoBtn = h('button', { type: 'button', class: 'btn secondary', id: 'a11y-undo', hidden: true, onclick: () => {
    if (!lastUndo) return;
    const rejected = settings.set(lastUndo);
    status.textContent = rejected.length ? `Could not undo: ${rejected.join(', ')}.` : 'Undone. Those settings are back to what they were.';
    lastUndo = null; undoBtn.hidden = true; draw();
  } }, 'Undo');

  const control = (c) => {
    if (c.type === 'bool') {
      return h('div', { class: 'field' },
        h('label', { class: 'opt', for: 'a-' + c.key }, h('input', { type: 'checkbox', id: 'a-' + c.key, 'aria-describedby': 'a-' + c.key + '-help', checked: settings.get(c.key) ? true : null,
          onchange: (e) => { const rej = settings.set({ [c.key]: e.target.checked }); if (rej.length) { status.textContent = `${c.label} could not be saved.`; e.target.checked = !!settings.get(c.key); } else status.textContent = `${c.label}: ${e.target.checked ? 'on' : 'off'}.`; } }), h('span', {}, c.label)),
        h('p', { class: 'muted', id: 'a-' + c.key + '-help' }, c.help));
    }
    const fs = h('fieldset', { class: 'field', 'aria-describedby': 'a-' + c.key + '-help' }, h('legend', {}, c.label));
    for (const [v, label] of Object.entries(c.options || {})) {
      const id = `a-${c.key}-${v}`;
      fs.append(h('label', { class: 'opt', for: id }, h('input', { type: 'radio', name: 'a-' + c.key, id, value: v, checked: settings.get(c.key) === v ? true : null,
        onchange: () => { const rej = settings.set({ [c.key]: v }); status.textContent = rej.length ? `${c.label} could not be saved.` : `${c.label}: ${label}.`; } }), h('span', {}, label)));
    }
    fs.append(h('p', { class: 'muted', id: 'a-' + c.key + '-help' }, c.help));
    return fs;
  };

  const groupsHost = h('div', { class: 'stack', id: 'a11y-groups' });
  function draw() {
    const gs = visibleGroups();
    groupsHost.replaceChildren(...gs.map((g) => h('section', { class: 'card', 'aria-labelledby': 'a-g-' + g.id }, h('h2', { id: 'a-g-' + g.id }, g.label), ...g.controls.map(control))));
  }
  draw();

  const presetBtns = PRESETS.map((p) => h('li', {}, h('button', { type: 'button', class: 'btn secondary', 'data-preset': p.id, onclick: () => {
    const r = applyPreset(p, settings);
    status.textContent = r.message;
    lastUndo = r.changed.length ? r.undo : null; undoBtn.hidden = !lastUndo;
    draw();
  } }, p.label)));

  const sec = (id, title, ...kids) => h('section', { class: 'card', id: 'a11y-' + id, 'aria-labelledby': `a11y-${id}-h` }, h('h2', { id: `a11y-${id}-h` }, title), ...kids);
  root.replaceChildren(h('article', { class: 'stack' },
    h('header', { class: 'card' },
      h('h1', { id: 'view-title', tabindex: '-1' }, t('nav.accessibility', 'Accessibility')),
      h('p', {}, 'Every setting that changes how Aleph looks, sounds or responds is on this page. Changes save at once, stay on this device and are included in your backup.'),
      h('p', {}, h('button', { type: 'button', class: 'btn secondary', id: 'a11y-jump', onclick: () => { const x = root.querySelector('#a11y-statement-h'); x?.setAttribute('tabindex', '-1'); x?.focus?.(); x?.scrollIntoView?.({ block: 'start' }); } }, 'Jump to the accessibility statement'), ' ', h('a', { href: '#/settings' }, 'All other settings'))),
    sec('start', 'Start here',
      h('p', {}, 'Pick the one that sounds closest. It only switches on the matching settings below. Nothing else is asked or saved, and you can change each setting yourself afterwards.'),
      h('ul', { class: 'stack', style: 'list-style:none;padding:0;margin:0' }, ...presetBtns),
      status, h('div', { class: 'row' }, undoBtn)),
    groupsHost,
    sec('statement', 'Accessibility statement',
      h('p', { class: 'draft-flag', role: 'note' }, STATEMENT.status),
      ...STATEMENT.sections.flatMap((s) => [h('h3', {}, s.title), h('ul', {}, ...s.items.map((i) => h('li', {}, i)))]))));
  return () => {};
}
