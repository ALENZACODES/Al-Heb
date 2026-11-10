/**
 * Roots and verb families (#/roots), PREVIEW and DRAFT. Three modes: root families, verb forms, drill.
 * Everything shown is copied from data/roots/*.json (built from the vocabulary data). The app does not make up roots, patterns or forms;
 * where the data has none, the page says so. Drill answers are checked against the same data. Store key roots.v1 (drill counts only).
 * ctx extras for tests: ctx.rootsData = {families, verbs}.
 */
import { el, heText, storeGet, storeSet } from '../curriculum/dom.js';
import { sourcesLine } from '../shell/sources.js';
import { mixed } from '../hebrewtext/mixed.js';
import { loadFamilies, loadVerbs } from './loader.js';
import { STORE_KEY, binyanName, BINYAN, verbTable, groupFamily, searchFamilies, searchVerbs, coverageText, buildQuiz, gradeAnswer, normalizeProgress, familyBadge } from './model.js';

export const DRAFT_NOTE = 'Draft and unreviewed: roots and patterns come from a dictionary-based word list, and no Hebrew teacher has checked them. Some links between words may be loose.';
export const POS_LABEL = { verb: 'Verbs', noun: 'Nouns', adj: 'Adjectives', adv: 'Adverbs', prep: 'Prepositions', num: 'Numbers' };
const MODES = [['families', 'Root families'], ['verbs', 'Verb forms'], ['drill', 'Drill']];

/** @param {HTMLElement} root @param {any} ctx @returns {() => void} unmount */
export function mount(root, ctx) {
  const wrap = el('section', { class: 'alef-roots', 'aria-labelledby': 'rt-title' });
  const h1 = el('h1', { id: 'rt-title', tabindex: '-1' }, 'Roots and verb families');
  const tabs = el('div', { role: 'group', 'aria-label': 'Mode', class: 'rt-tabs' });
  const body = el('div', { class: 'rt-body' });
  const status = el('p', { role: 'status', 'aria-live': 'polite', class: 'rt-status' });
  wrap.append(h1, el('p', { class: 'rt-draft' }, DRAFT_NOTE), tabs, body, status, el('footer', {}, sourcesLine(el)));
  root.append(wrap);
  let alive = true, fam = null, verbs = null, mode = 'families', prog = normalizeProgress(null), q = '', selRoot = null, selVerb = null, quiz = [], qi = 0, picked = null, round = 0;
  const say = (t) => { status.textContent = t; };
  const btn = (label, onclick, extra = {}) => el('button', { class: 'btn', type: 'button', style: 'min-height:44px;min-width:44px', onclick, ...extra }, label);
  const field = (id, label, value, oninput) => {
    const input = el('input', { id, type: 'search', value, autocomplete: 'off', style: 'min-height:44px' });
    input.value = value; input.addEventListener('input', () => oninput(input.value));
    return el('div', {}, el('label', { for: id }, label), input);
  };

  function renderTabs() {
    tabs.replaceChildren(...MODES.map(([m, label]) => btn(label, () => { mode = m; selRoot = null; selVerb = null; q = ''; render(); say(`${label} opened.`); }, { class: 'btn secondary', 'aria-pressed': String(mode === m) })));
  }
  function table(v) {
    const t = verbTable(v);
    const rows = t.rows.map((r) => el('tr', {}, el('th', { scope: 'row' }, r.label), el('td', {}, heText(r.he))));
    return el('div', { class: 'rt-verb' },
      el('table', {}, el('caption', {}, ...mixed(`${v.translit}: ${v.en}. Pattern: ${binyanName(t.binyan)}${BINYAN[t.binyan] ? ` (${BINYAN[t.binyan].gist})` : ''}. Root: ${t.root || 'not listed in the data'}.`)),
        el('thead', {}, el('tr', {}, el('th', { scope: 'col' }, 'Form'), el('th', { scope: 'col' }, 'Hebrew'))), el('tbody', {}, ...rows)),
      el('ul', {}, ...t.notes.map((n) => el('li', {}, n)), ...(t.missing.length ? [el('li', {}, `Not in the data for this verb: ${t.missing.join(', ')}.`)] : [])));
  }
  function wordLine(w, loose) {
    return el('li', {}, heText(w.he), ` ${w.translit}: ${w.en}`, loose ? ' (loose match)' : '', w.binyan ? ` (${binyanName(w.binyan)})` : '', w.forms ? btn('Verb forms', () => { selVerb = selVerb === w.id ? null : w.id; render(); }, { 'aria-expanded': String(selVerb === w.id), 'aria-label': `Verb forms for ${w.translit}` }) : null,
      selVerb === w.id ? table(w) : null);
  }

  function renderFamilies() {
    const nodes = [el('p', { 'data-coverage': '1' }, coverageText(fam.coverage, verbs && verbs.verbs)), field('rt-q', 'Find a root (Hebrew letters) or a word (English or sounds-like)', q, (v) => { q = v; selRoot = null; renderList(); })];
    const list = el('div', { class: 'rt-list' }), detail = el('div', { class: 'rt-detail' });
    function renderList() {
      const res = searchFamilies(fam.families, q, 30);
      list.replaceChildren(el('p', {}, q ? `${res.length} root families match.` : 'Largest root families first.'), el('ul', { class: 'rt-roots' }, ...res.map((f) => el('li', {}, btn([heText(f.root), ` (${f.size} words)`], () => { selRoot = f.root; renderDetail(); say(`Group of ${f.size} words opened.`); }, { 'aria-label': `Root ${f.root}, ${f.size} words`, 'aria-pressed': String(selRoot === f.root) })))));
      renderDetail();
    }
    function renderDetail() {
      const f = fam.families.find((x) => x.root === selRoot);
      if (!f) { detail.replaceChildren(); return; }
      detail.replaceChildren(el('h2', {}, 'Words listed under the letters ', heText(f.root), ` (${f.size} words)`), el('p', { class: 'rt-badge' }, familyBadge(f)), ...groupFamily(f).flatMap((g) => [el('h3', {}, POS_LABEL[g.pos] || g.pos), el('ul', {}, ...g.words.map((w) => wordLine(w, f.ruleChecked && !(f.checkedIds || []).includes(w.id))))]));
    }
    nodes.push(list, detail); body.replaceChildren(...nodes); renderList();
  }

  function renderVerbs() {
    const list = el('div', {}), detail = el('div', {});
    const draw = () => {
      const res = searchVerbs(verbs.verbs, q, 20);
      list.replaceChildren(el('ul', {}, ...res.map((v) => el('li', {}, btn(`${v.translit}: ${v.en}`, () => { selVerb = v.id; draw(); say(`${v.translit} opened.`); }, { 'aria-pressed': String(selVerb === v.id), 'aria-label': `Show forms of ${v.translit}, ${v.en}` })))));
      const v = verbs.verbs.find((x) => x.id === selVerb);
      detail.replaceChildren(v ? table(v) : el('p', {}, 'Pick a verb to see the forms the data has.'));
    };
    body.replaceChildren(field('rt-vq', 'Find a verb (English, sounds-like, or Hebrew letters)', q, (v) => { q = v; draw(); }), list, detail); draw();
  }

  function renderDrill() {
    if (!quiz.length) quiz = buildQuiz(fam.families, verbs.verbs, { seed: 1000 + round * 31, count: 8 });
    if (qi >= quiz.length) {
      body.replaceChildren(el('p', {}, `Round done. All-time: ${prog.right} right of ${prog.asked} asked. Answers are checked against the word list, not by a teacher.`), btn('Another round', () => { round += 1; quiz = []; qi = 0; picked = null; storeSet(ctx, STORE_KEY, { ...prog, round }); renderDrill(); }));
      return;
    }
    const k = quiz[qi], res = picked ? gradeAnswer(k, picked) : null;
    const opts = k.options.map((o) => btn(o.he ? [heText(o.he), `  ${o.label}`] : o.label, () => choose(o.id), { disabled: !!picked, 'aria-pressed': String(picked === o.id), class: 'btn secondary', 'aria-label': `${o.he ? o.he + ' ' : ''}${o.label}` }));
    body.replaceChildren(...[el('p', {}, `Question ${qi + 1} of ${quiz.length}`), el('p', { class: 'rt-prompt' }, ...mixed(k.prompt), k.verb ? [' ', heText(k.verb.he)] : null), el('div', { role: 'group', 'aria-label': 'Answers' }, ...opts),
      res ? el('p', {}, res.correct ? 'Right. ' : 'Not this one. ', ...mixed(k.explain)) : null, res ? btn(qi + 1 < quiz.length ? 'Next question' : 'Finish round', () => { qi += 1; picked = null; renderDrill(); }) : null].filter(Boolean));
  }
  function choose(id) {
    const k = quiz[qi], ok = gradeAnswer(k, id).correct;
    picked = id; prog = { ...prog, asked: prog.asked + 1, right: prog.right + (ok ? 1 : 0) }; storeSet(ctx, STORE_KEY, prog);
    renderDrill(); say(ok ? 'Right.' : 'Not this one.');
  }

  function render() {
    renderTabs();
    if (mode === 'families') renderFamilies(); else if (mode === 'verbs') renderVerbs(); else renderDrill();
  }

  (async () => {
    try {
      const d = ctx?.rootsData;
      fam = d?.families || (await loadFamilies());
      verbs = d?.verbs || (await loadVerbs());
      prog = normalizeProgress(await storeGet(ctx, STORE_KEY, null)); round = prog.round;
      if (alive) render();
    } catch { if (alive) body.replaceChildren(el('p', { role: 'alert' }, 'The word list could not be loaded. If you are offline, open this page once while online, or use "Use ALEF offline" in the More menu to download everything. Nothing was lost.')); }
  })();
  return () => { alive = false; wrap.children = []; if (typeof wrap.remove === 'function') wrap.remove(); else root.replaceChildren?.(); };
}
