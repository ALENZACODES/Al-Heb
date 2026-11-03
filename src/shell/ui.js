// Tiny DOM helpers + fallback cards.
/** @param {string} tag @param {Record<string,any>} [attrs] @param {...(Node|string|null|undefined)} kids */
export function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (k === 'text') e.textContent = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids) if (k != null) e.append(k);
  return e;
}
/** Hebrew text span: always lang=he dir=rtl. @param {string} text @param {string} [cls] */
export function heSpan(text, cls = 'he') { return h('span', { lang: 'he', dir: 'rtl', class: cls }, text); }

/** Card shown when a lane module is missing or throws. */
export function unavailableCard(root, { title, t, module, error, kind = 'unavailable' }) {
  const body = kind === 'error' ? t('error.body') : t('unavailable.body');
  root.replaceChildren(h('section', { class: 'card notice', 'aria-labelledby': 'view-title' },
    h('h1', { id: 'view-title', tabindex: '-1' }, `${title}: ${kind === 'error' ? t('error.title') : t('unavailable.title')}`),
    h('p', {}, body),
    h('p', {}, h('a', { class: 'btn', href: '#/' }, t('nav.home'))),
    h('details', {}, h('summary', {}, 'Technical detail'),
      h('p', { class: 'mono' }, `module: ${module}`), error ? h('p', { class: 'mono' }, String(error)) : null)));
}
