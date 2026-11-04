// The "More" menu: every available v0 page, grouped by the five sections, each with a one-line description (the route's existing title),
// then one collapsed "Preview" group (li.nav-group[data-section=preview]) listing every available preview page by section with a
// one-line note per section. Markup: ul#nav-more > li.nav-group > details > summary + ul > li > a. The current page's section starts
// open; others are collapsed. The Preview group starts open only when the current page is a preview page.
import { t, tHe } from './i18n.js';
import { h, heSpan } from './ui.js';
import './nav.strings.js';
import { menuSections, previewGroups, labelKey, description, sectionOf, tierOf } from './nav-model.js';

/** @param {HTMLElement} listEl @param {{routes:any[], available:Set<string>, current:string|null}} o */
export function renderMenu(listEl, { routes, available, current }) {
  const curRoute = current ? routes.find((r) => r.name === current) : null;
  const curIsPreview = !!curRoute && tierOf(curRoute) === 'preview';
  const cur = current && !curIsPreview ? sectionOf(current) : null;
  const rowsOf = (items) => items.map((r) => {
    const label = t(labelKey(r)), he2 = tHe(labelKey(r)), desc = description(r, label);
    return h('li', {}, h('a', { class: 'menu-link', href: '#' + r.pattern, 'aria-current': r.name === current ? 'page' : null },
      h('span', { class: 'menu-label' }, label, he2 ? ' ' : null, he2 ? heSpan(he2, 'he nav-he') : null),
      desc ? h('span', { class: 'menu-desc' }, desc) : null));
  });
  const groups = menuSections(routes, available).map(({ section, items }) => {
    const he = section.heKey ? tHe(section.heKey) : '';
    return h('li', { class: 'nav-group', 'data-section': section.id },
      h('details', { open: section.id === cur ? true : null },
        h('summary', {}, h('span', { class: 'menu-sec' }, t(section.labelKey), he ? ' ' : null, he ? heSpan(he, 'he nav-he') : null),
          h('span', { class: 'menu-count' }, `(${items.length})`), h('span', { class: 'menu-sec-desc' }, t(section.descKey))),
        h('ul', { class: 'menu-list', 'aria-label': t(section.labelKey) }, ...rowsOf(items))));
  });
  const prev = previewGroups(routes, available);
  const previewCount = prev.reduce((n, g) => n + g.items.length, 0);
  if (previewCount) {
    groups.push(h('li', { class: 'nav-group nav-group-preview', 'data-section': 'preview', 'data-tier': 'preview' },
      h('details', { open: curIsPreview ? true : null },
        h('summary', {}, h('span', { class: 'menu-sec' }, t('nav.preview.title')),
          h('span', { class: 'menu-count' }, `(${previewCount})`), h('span', { class: 'menu-sec-desc' }, t('nav.preview.desc'))),
        ...prev.map(({ section, noteKey, items }) => h('section', { class: 'menu-preview-sec', 'aria-label': t('nav.preview.section', { s: t(section.labelKey) }) },
          h('p', { class: 'menu-desc menu-preview-note' }, h('strong', {}, t(section.labelKey)), ' - ', t(noteKey)),
          h('ul', { class: 'menu-list', 'aria-label': t('nav.preview.section', { s: t(section.labelKey) }) }, ...rowsOf(items)))))));
  }
  listEl.replaceChildren(...groups);
  return groups.length;
}
