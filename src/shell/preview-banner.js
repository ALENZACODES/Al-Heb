// Preview banner: a small note at the top of every page whose route tier is 'preview' (router.js `tier`, docs/v0/SCOPE.md).
// Mounted by app.js show() after the view has rendered; v0 pages get nothing. Pure DOM via ui.js h(), so tests/v0.test.js can run it
// against the fake DOM. Idempotent: a second call on the same root replaces the earlier banner instead of stacking two.
import { t } from './i18n.js';
import { h } from './ui.js';
import './nav.strings.js';

export const BANNER_SELECTOR = '.preview-banner';
/** @param {any} route a ROUTES entry (or null) @returns {boolean} */
export const needsBanner = (route) => !!route && route.tier !== 'v0';

/**
 * Add (or refresh) the banner on `root` when `route` is a preview route; remove any stale banner otherwise.
 * @param {HTMLElement} root the view container (#main) @param {any} route @returns {HTMLElement|null} the banner element, or null
 */
export function mountPreviewBanner(root, route) {
  if (!root) return null;
  const stale = root.queryAll ? root.queryAll(BANNER_SELECTOR) : [...root.querySelectorAll(BANNER_SELECTOR)];
  for (const old of stale) { if (typeof old.remove === 'function') old.remove(); else if (Array.isArray(root.children)) root.children = root.children.filter((c) => c !== old); }
  if (!needsBanner(route)) return null;
  const el = h('p', { class: 'preview-banner muted', 'data-tier': 'preview', role: 'note' },
    h('strong', {}, t('nav.preview.banner')), h('span', { class: 'visually-hidden' }, ' ' + t('nav.preview.banner.more')));
  root.prepend(el);
  return el;
}
