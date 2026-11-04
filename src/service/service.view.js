// ALEF Service screen: (1) Siddur Coverage % per service, (2) Follow the service, page-turn cards.
// mount(root, ctx) -> unmount. ctx: { store, settings?, audio?, query? }. Offline; reads only repo data files.
import { h, heSpan } from '../shell/ui.js';
import { loadCorpus } from '../corpus/corpus.js';
import { loadProgressData } from '../progress/data.js';
import { readSnapshot, readableNow } from '../progress/model.js';
import {
  loadServiceData, coverage, coverageSentence, buildCards, clipFor, ORDER_IDS, FOLLOW_IDS, TRADITIONS, TRADITION_LABELS,
  MARKER_LABELS, VARIES, DRAFT_NOTICE, COPYRIGHT_NOTICE, COVERAGE_NOTE,
} from './model.js';

const PREFS = 'service.prefs';
const CSS = `
.sv { display: grid; gap: var(--gap, 1rem); max-inline-size: 100%; overflow-wrap: anywhere; }
.sv h2 { margin-block: 0 .5rem; font-size: 1.2rem; }
.sv h3 { margin-block: .5rem .25rem; font-size: 1.05rem; }
.sv .sv-row { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; }
.sv .btn { min-block-size: var(--tap, 48px); }
.sv .btn[aria-pressed=true] { background: var(--accent); color: var(--accent-fg); }
.sv progress { inline-size: 100%; block-size: .9rem; accent-color: var(--accent); }
.sv .sv-big { font-size: 1.6rem; font-weight: 700; margin: 0; }
.sv .sv-he { display: block; font-size: 1.7rem; line-height: 1.7; unicode-bidi: isolate; text-align: start; }
.sv .sv-tr { font-style: italic; margin: .15rem 0 .5rem; }
.sv .sv-mark { display: inline-block; font-weight: 700; padding: 0 .6rem; border: 2px solid var(--border); border-radius: 6px; margin-inline-end: .4rem; }
.sv .small { font-size: .9rem; }
.sv ul { margin: 0; padding-inline-start: 1.25rem; }
.sv summary { min-block-size: var(--tap, 48px); display: flex; align-items: center; cursor: pointer; font-weight: 600; }
.sv select { min-block-size: var(--tap, 48px); max-inline-size: 100%; }
.sv .sv-card:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
`;

export async function mount(root, ctx) {
  let alive = true;
  const { store } = ctx;
  const style = h('style', {}); style.textContent = CSS;
  const main = h('div', { class: 'sv' });
  root.replaceChildren(style, h('h1', { id: 'view-title', tabindex: '-1' }, 'Follow the service'), h('p', { class: 'muted sv-loading', role: 'status' }, 'Loading...'), main);
  const loading = root.querySelector('.sv-loading');

  let S, P;
  try { [S, P] = await Promise.all([loadServiceData({ loadCorpus }), loadProgressData()]); }
  catch {
    if (alive) loading.textContent = 'The service screen could not load its data files. Your learning is not affected.';
    return () => { alive = false; };
  }
  if (!alive) return () => {};
  root.replaceChildren(style, h('h1', { id: 'view-title', tabindex: '-1' }, 'Follow the service'), main);

  const saved = (() => { try { return store.get(PREFS, {}) || {}; } catch { return {}; } })();
  const congregation = ctx.settings?.get?.('congregation');
  const st = {
    mode: 'coverage', order: FOLLOW_IDS.includes(saved.order) ? saved.order : 'shabbat-morning', i: 0,
    tradition: TRADITIONS.includes(saved.tradition) ? saved.tradition : TRADITIONS.includes(congregation) ? congregation : 'sephardi',
    showTr: saved.showTr !== false,
  };
  const save = () => { try { store.set(PREFS, { order: st.order, tradition: st.tradition, showTr: st.showTr }); } catch { /* ignore */ } };
  const live = h('p', { class: 'muted small', role: 'status', 'aria-live': 'polite' });

  const read = readableNow(readSnapshot(store), P);

  const notices = () => h('div', {},
    h('p', { class: 'draft-flag', role: 'note' }, DRAFT_NOTICE),
    h('p', { class: 'small muted' }, COPYRIGHT_NOTICE));

  function tabs() {
    const b = (mode, label) => h('button', { type: 'button', class: 'btn secondary', 'data-mode': mode, 'aria-pressed': st.mode === mode ? 'true' : 'false', onclick: () => { st.mode = mode; render(mode === 'coverage' ? 'sv-tab-coverage' : 'sv-tab-follow'); } }, label);
    const t1 = b('coverage', 'Siddur coverage'), t2 = b('follow', 'Follow the service');
    t1.id = 'sv-tab-coverage'; t2.id = 'sv-tab-follow';
    return h('div', { class: 'sv-row', role: 'group', 'aria-label': 'Screen mode' }, t1, t2);
  }

  function coverageView() {
    const sections = ORDER_IDS.map((oid) => {
      const o = S.orders.orders[oid], c = coverage(o, read.lines, read.known);
      const missingGaps = o.gaps.map((g) => S.corpus.gap(g)?.title).filter(Boolean);
      return h('section', { class: 'card', 'aria-labelledby': `sv-h-${oid}`, 'data-order': oid },
        h('h2', { id: `sv-h-${oid}` }, o.title),
        h('p', { class: 'sv-big', 'data-pct': String(c.pct) }, `${c.pct}% decodable`),
        h('progress', { max: '100', value: String(c.pct), 'aria-label': `${o.title}: share of lines decodable` }),
        h('p', {}, coverageSentence(o.title, c)),
        h('p', { class: 'small' }, `Words: ${c.wordsFull} of ${c.words} different words in these lines are decodable (${c.wordsPct}%). Whole texts: ${c.textsFull} of ${c.texts}.`),
        c.almost ? h('p', { class: 'small' }, `${c.almost} more ${c.almost === 1 ? 'line is' : 'lines are'} exactly one sign away.`) : null,
        h('p', { class: 'small muted' }, `The percentage covers only the texts ALEF holds. ${c.gaps} typical ${c.gaps === 1 ? 'part is' : 'parts are'} not in ALEF yet, so it does not cover the whole service.`),
        h('details', {}, h('summary', {}, 'Text by text'),
          h('ul', {}, ...c.perItem.map((p) => h('li', {}, `${p.moment}: ${p.decodable ? 'decodable' : `${p.full} of ${p.lines} ${p.lines === 1 ? 'line' : 'lines'} decodable`}`)))),
        missingGaps.length ? h('details', {}, h('summary', {}, 'Not in ALEF yet'), h('ul', {}, ...missingGaps.map((g) => h('li', {}, g)))) : null,
        o.follow ? h('button', { type: 'button', class: 'btn secondary', 'data-follow': oid, onclick: () => { st.mode = 'follow'; st.order = oid; st.i = 0; save(); render('sv-card'); } }, `Follow ${o.short.toLowerCase()} service`) : null);
    });
    return [h('p', { class: 'small' }, COVERAGE_NOTE), ...sections];
  }

  function followView() {
    const cards = buildCards(S.orders, st.order, S.byId, st.tradition);
    st.i = Math.max(0, Math.min(st.i, cards.length - 1));
    const c = cards[st.i];
    const go = (d) => { st.i = Math.max(0, Math.min(cards.length - 1, st.i + d)); render('sv-card'); live.textContent = `Moment ${st.i + 1} of ${cards.length}: ${cards[st.i].moment}.`; };

    const orderBtns = FOLLOW_IDS.map((oid) => h('button', { type: 'button', class: 'btn secondary', 'data-order': oid, 'aria-pressed': st.order === oid ? 'true' : 'false', onclick: () => { st.order = oid; st.i = 0; save(); render('sv-card'); } }, S.orders.orders[oid].short));
    const sel = h('select', { id: 'sv-tradition', onchange: (e) => { st.tradition = e.target.value; save(); render('sv-tradition'); } },
      ...TRADITIONS.map((t) => h('option', { value: t, selected: t === st.tradition ? true : null }, TRADITION_LABELS[t])));
    const toggle = h('button', { type: 'button', class: 'btn secondary', id: 'sv-toggle-tr', 'aria-pressed': st.showTr ? 'false' : 'true', onclick: () => { st.showTr = !st.showTr; save(); render('sv-toggle-tr'); } }, st.showTr ? 'Hide transliteration' : 'Show transliteration');

    const clip = clipFor(ctx.audio, c, st.tradition);
    const marks = c.markerKnown
      ? h('div', { class: 'sv-marks' }, ...c.markers.map((m) => h('p', { class: 'small' }, h('span', { class: 'sv-mark', 'data-kind': m.kind }, MARKER_LABELS[m.kind]), `Torah service guide: "${m.quote}"`)))
      : h('p', { class: 'small muted sv-varies' }, VARIES);

    const card = h('section', { class: 'card sv-card', id: 'sv-card', tabindex: '0', 'aria-labelledby': 'sv-card-h',
      onkeydown: (e) => { if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault?.(); go(1); } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault?.(); go(-1); } } },
      h('p', { class: 'small muted' }, `Moment ${c.n} of ${c.of}`),
      h('h2', { id: 'sv-card-h' }, c.moment),
      h('p', { class: 'small muted' }, `${c.title} (${c.ref})`),
      ...c.he.map((line, k) => h('div', { class: 'sv-line' },
        heSpan(line, 'sv-he'),
        st.showTr && c.tr[k] ? h('p', { class: 'sv-tr', lang: 'en' }, c.tr[k]) : null)),
      h('p', { class: 'sv-en' }, c.en.join(' ')),
      c.englishSource ? h('p', { class: 'small muted' }, `English: ${c.englishSource}`) : null,
      marks,
      clip ? h('button', { type: 'button', class: 'btn secondary', id: 'sv-play', onclick: () => { Promise.resolve(ctx.audio.play(clip.kind, clip.id, { tradition: st.tradition })).catch(() => {}); } }, 'Play') : null);

    const nav = h('div', { class: 'sv-row' },
      h('button', { type: 'button', class: 'btn secondary', id: 'sv-prev', disabled: st.i === 0 ? true : null, onclick: () => go(-1) }, 'Previous'),
      h('button', { type: 'button', class: 'btn', id: 'sv-next', disabled: st.i === cards.length - 1 ? true : null, onclick: () => go(1) }, 'Next'));
    return [
      h('div', { class: 'sv-row', role: 'group', 'aria-label': 'Service' }, ...orderBtns),
      h('div', { class: 'sv-row' }, h('label', { for: 'sv-tradition' }, 'Pronunciation '), sel, toggle),
      card, nav, live,
      h('p', { class: 'small muted' }, 'Transliteration is an approximation of the selected tradition, not a recording. Arrow keys also turn cards when the card is focused.'),
    ];
  }

  function render(focusId) {
    main.replaceChildren(tabs(), notices(), ...(st.mode === 'coverage' ? coverageView() : followView()));
    if (focusId) main.querySelector('#' + focusId)?.focus?.();
  }
  render();
  return () => { alive = false; };
}
