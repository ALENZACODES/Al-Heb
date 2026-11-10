// Tiny DOM helpers + fallback cards.
/** @param {string} tag @param {Record<string,any>} [attrs] @param {...(Node|string|null|undefined)} kids */
export function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (typeof v === 'boolean' && k.startsWith('aria-')) { e.setAttribute(k, String(v)); continue; } // aria-pressed={true} must be "true", not ""
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
  const k = kind === 'error' || kind === 'offline' ? kind : 'unavailable'; // 'offline': the screen's files are not on this device yet
  const body = t(`${k}.body`);
  root.replaceChildren(h('section', { class: 'card alef-unavailable', 'aria-labelledby': 'view-title' },
    h('h1', { id: 'view-title', tabindex: '-1' }, `${title}: ${t(`${k}.title`)}`),
    h('p', {}, body),
    h('p', {}, h('a', { class: 'btn', href: '#/' }, t('nav.home'))),
    h('details', {}, h('summary', {}, 'Technical detail'),
      h('p', { class: 'mono' }, `module: ${module}`), error ? h('p', { class: 'mono' }, String(error)) : null)));
}

export { audioAccess, audioButton, deviceVoiceState, DEVICE_LABEL, NO_AUDIO } from './audio-access.js';

// Gold coin icons, lazy (assets/img/ is never precached); decorative. coin(): blank coin, the letter is live text.
export const medal = (g, id, z = 48, b = `assets/img/icons/ICON_${g}_${id}`) => h('img', { class: 'alef-medal', src: b + '.112.webp', srcset: [112, 160, 224, 320].map((w) => `${b}.${w}.webp ${w}w`).join(), sizes: z + 'px', width: z, height: z, alt: '', loading: 'lazy', decoding: 'async', onerror: (e) => e.target.remove() });
export const coin = (t, z = 56) => h('span', { class: 'alef-coin' + (t.replace(/[\u0591-\u05C7]/g, '').length > 2 ? ' is-long' : ''), style: `--z:${z}px`, 'aria-hidden': 'true' }, heSpan(t));
