// Ari and Noa, the two teachers, appear on every screen (owner's order, 2026-11-07):
// the artwork was made to be seen, not filed. A slim band under the nav carries both
// portraits, posed for the kind of page — teaching (speak), listening and reading
// (listen), prayer, Torah and festival pages (synagogue), Israel-life pages (telaviv),
// progress and celebration pages (celebrate), and a plain hello (neutral) everywhere
// else. The learner's chosen voice leads the pair. If the image resolver has not
// loaded yet, the band shows the names and fills in when the resolver arrives.
import { h } from './ui.js';
import { img } from '../img/resolve.js';

const SYNAGOGUE = new Set(['torahread', 'torahreadsec', 'torahreader', 'service', 'traditions', 'traditions-guide', 'traditions-hear', 'morning', 'trope', 'listen-shelf', 'festivals', 'festival']);
const LISTEN = new Set(['listen', 'read', 'text', 'books', 'book', 'timedread', 'compare', 'record-compare', 'tradition-quiz', 'classtrack', 'classtrackweek', 'classtrackmode']);
const CELEBRATE = new Set(['progress', 'awards', 'games', 'share', 'classsummary']);
const TELAVIV = new Set(['israel', 'israelsec', 'dialogues', 'dialogue', 'phrases', 'phrase']);
const SPEAK = new Set(['learn', 'letters', 'letter', 'atlas', 'firstday', 'firstday-ladder', 'placement', 'checkpoint', 'ladder', 'fade', 'fadeline', 'loanwords', 'loanword', 'spotit', 'wordtrace', 'typing', 'speak', 'sprint', 'sounds', 'vowelboard', 'niqquddial', 'dottile', 'syllablechips', 'soundgap', 'rules', 'rules-page', 'read-my-way', 'scaffold', 'gender', 'roles', 'gender-drill', 'vocab', 'vocab-themes', 'roots', 'nikkud-fade', 'grammar', 'grammartopic', 'intermediate', 'intermediatelesson', 'scan']);

/** Which portrait pose fits a route: 'synagogue' | 'listen' | 'celebrate' | 'telaviv' | 'speak' | 'neutral'. */
export function poseForRoute(name) {
  if (SYNAGOGUE.has(name)) return 'synagogue';
  if (LISTEN.has(name)) return 'listen';
  if (CELEBRATE.has(name)) return 'celebrate';
  if (TELAVIV.has(name)) return 'telaviv';
  if (SPEAK.has(name)) return 'speak';
  return 'neutral';
}

/** The learner's chosen voice leads; Noa (the default voice) leads otherwise. */
export function teacherOrder(voice) {
  return voice === 'm' ? ['ari', 'noa'] : ['noa', 'ari'];
}

const NAMES = { noa: 'Noa', ari: 'Ari' };

/** Fill the #alef-companions band for a route. Safe before the resolver loads (names only). */
export function updateCompanions(routeName, { R = null, voice = 'f' } = {}) {
  const slot = document.getElementById('alef-companions');
  if (!slot) return;
  // The band's shape is set inline as well as in app.css: a learner whose
  // cached stylesheet predates the band rules must still get the slim strip,
  // never full-size portraits stacked down the page.
  slot.style.display = 'flex';
  slot.style.alignItems = 'center';
  slot.style.gap = '0.55rem';
  slot.style.padding = '0.5rem 1rem 0';
  slot.style.background = '#F6F1E7';
  const pose = poseForRoute(routeName);
  const order = teacherOrder(voice);
  const kids = [];
  for (const who of order) {
    const pic = R ? img(h, { R, kind: 'id', id: `CHAR_${who}_${pose}`, decorative: true, width: 300, class: 'comp-pic' }) : null;
    if (pic) {
      pic.style.width = '3rem';
      pic.style.height = '3rem';
      pic.style.objectFit = 'cover';
      pic.style.borderRadius = '50%';
      pic.style.flex = '0 0 auto';
      kids.push(pic);
    }
  }
  const names = h('span', { class: 'comp-names' }, `${order.map((w) => NAMES[w]).join(' and ')} — your teachers`);
  names.style.color = '#1F3A5F';
  kids.push(names);
  slot.replaceChildren(...kids);
}
