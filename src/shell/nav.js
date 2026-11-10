// Bottom/top navigation bar: up to four section tabs plus the existing More button = 5 controls at most. Only sections with a v0 page
// get a tab (router.js `tier`, docs/v0/SCOPE.md), so the v0 bar is Learn, Progress and More; preview pages live in the More sheet.
// The DOM shell (ul#nav, button#more-btn, ul#nav-more) lives in index.html; open/close of the sheet stays in app.js (setMore/wireChrome).
// The current page is marked with aria-current="page" on the tab whose own page it is, or aria-current="true" on the tab of the section
// it belongs to. A page under More marks the More button with data-current (a button cannot carry aria-current="page").
import { t, tHe } from './i18n.js';
import { h, heSpan } from './ui.js';
import './nav.strings.js';
import { tabs, currentState, tierOf } from './nav-model.js';
import { renderMenu } from './menu.js';

/** @param {string|null} current route name @param {{routes:any[], available:Set<string>}} o */
export function renderNav(current, { routes, available }) {
  const nav = document.getElementById('nav'), more = document.getElementById('nav-more'), btn = document.getElementById('more-btn');
  const list = tabs(routes, available);
  const st = currentState(current, list, tierOf(routes.find((r) => r.name === current)));
  nav.replaceChildren(...list.map(({ section, route }) => {
    const he = section.heKey ? tHe(section.heKey) : '';
    return h('li', {}, h('a', { href: '#' + route.pattern, 'data-section': section.id, 'aria-current': st.tab === section.id ? st.level : null },
      h('span', { class: `nav-ico nav-ico-${section.id}`, 'aria-hidden': 'true' }), // drawn in CSS (assets/css/polish.css), so the tab reads the same with icons off
      h('span', { class: 'nav-label' }, t(section.labelKey)), he ? heSpan(he, 'he nav-he') : null));
  }));
  const n = renderMenu(more, { routes, available, current });
  btn.hidden = n === 0;
  btn.toggleAttribute('data-current', st.more);
}
