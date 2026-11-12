/**
 * Family letters and verb patterns (#/roots), PREVIEW and DRAFT. Modes: word families, the seven patterns, verb forms, and two drills.
 * Everything shown is copied from data/roots/*.json (built from the vocabulary data). The app does not make up roots, patterns or forms;
 * where the data has none, the page says so. Drill answers are checked against the same data. Store key roots.v1 (drill counts only).
 * No root is confirmed by a Hebrew reader yet (data/roots/verified.json), so the page says "family letters", never "root", for a group.
 * Deep links (lane 3, 12 Nov): ?letters=<family letters> opens that family, ?verb=<id> opens a verb's forms, ?mode=binyanim&b=<key>
 * opens a pattern page. ctx extras for tests: ctx.rootsData = {families, verbs}, ctx.clipLookup.
 */
import { el, heText, storeGet, storeSet } from '../curriculum/dom.js';
import { sourcesLine } from '../shell/sources.js';
import { mixed } from '../hebrewtext/mixed.js';
import { isAudioFree } from '../shell/audiofree.js';
import { loadJson } from '../speak/loader.js';
import { lookupClip, alternateClip, planIsExactFile, clipCaption, unavailableLine, CHECKING } from '../vocab/clips.js';
import { loadFamilies, loadVerbs } from './loader.js';
import { STORE_KEY, binyanName, BINYAN, verbTable, groupFamily, searchFamilies, searchVerbs, coverageText, buildQuiz, gradeAnswer, normalizeProgress, familyBadge } from './model.js';
import { SEVEN, binyanPage, binyanDrill, observationText, NO_SIGN, REVIEW_NOTE } from './binyanim.js';
import { rootsCoverage } from '../lib/counts.js';

export const DRAFT_NOTE = 'Draft and unreviewed: family letters and patterns come from a dictionary-based word list, and no Hebrew teacher has checked them. Some links between words may be loose.';
export const POS_LABEL = { verb: 'Verbs', noun: 'Nouns', adj: 'Adjectives', adv: 'Adverbs', prep: 'Prepositions', num: 'Numbers' };
export const VERB_FORMS_NOTE = 'Each row is a form the word list holds for this verb, copied as it is. Nothing here is made by a pattern rule. A Listen button appears only where the app has a clip of that exact pointed form.';
const MODES = [['families', 'Word families'], ['binyanim', 'Seven patterns'], ['verbs', 'Verb forms'], ['drill', 'Drill'], ['bdrill', 'Pattern drill']];

/** @param {HTMLElement} root @param {any} ctx @returns {() => void} unmount */
export function mount(root, ctx) {
  const wrap = el('section', { class: 'alef-roots', 'aria-labelledby': 'rt-title' });
  const h1 = el('h1', { id: 'rt-title', tabindex: '-1' }, 'Roots and verb families');
  const tabs = el('div', { role: 'group', 'aria-label': 'Mode', class: 'rt-tabs' });
  const body = el('div', { class: 'rt-body' }, el('p', { class: 'muted', role: 'status' }, 'Loading the word families…')); // plan 4.9
  const status = el('p', { role: 'status', 'aria-live': 'polite', class: 'rt-status' });
  wrap.append(h1, el('p', { class: 'rt-draft' }, DRAFT_NOTE), tabs, body, status, el('footer', {}, sourcesLine(el)));
  root.append(wrap);
  const qy = ctx?.query || {};
  let alive = true, fam = null, verbs = null, prog = normalizeProgress(null), q = '', selRoot = null, selVerb = null, quiz = [], qi = 0, picked = null, round = 0;
  let mode = MODES.some(([m]) => m === qy.mode) ? qy.mode : qy.letters ? 'families' : qy.verb ? 'verbs' : qy.b ? 'binyanim' : 'families';
  let selBinyan = SEVEN.includes(qy.b) ? qy.b : null, bquiz = [], bqi = 0, bpicked = null, bround = 0, missingLetters = null;
  const say = (t) => { status.textContent = t; };
  const btn = (label, onclick, extra = {}) => el('button', { class: 'btn', type: 'button', style: 'min-height:44px;min-width:44px', onclick, ...extra }, label);
  const field = (id, label, value, oninput) => {
    const input = el('input', { id, type: 'search', value, autocomplete: 'off', style: 'min-height:44px' });
    input.value = value; input.addEventListener('input', () => oninput(input.value));
    return el('div', {}, el('label', { for: id }, label), input);
  };

  // ---- audio: a clip of the exact pointed form, when the app has one (the Dictionary's lookup and player checks) ----
  let clipLookup = ctx?.clipLookup || null, clipPromise = null;
  const ensureClips = () => {
    if (clipLookup || !ctx?.audio) return Promise.resolve(clipLookup);
    if (!clipPromise) clipPromise = loadJson('data/vocab/clip-lookup.json').then((j) => { clipLookup = j; return j; }).catch(() => { clipPromise = null; return null; });
    return clipPromise;
  };
  const voice = () => { const v = ctx?.settings?.get?.('voice'); return v === 'm' ? 'm' : 'f'; };
  const trad = () => { const c = ctx?.settings?.get?.('congregation'); return ['israeli', 'sephardi', 'ashkenazi'].includes(c) ? c : 'israeli'; };
  let dictAudio = null;
  const loadDictionaryAudio = () => {
    if (!dictAudio) dictAudio = loadJson('data/vocab/audio-dictionary.json').then((list) => { ctx.audio?.extend?.(list); return true; }).catch(() => { dictAudio = null; return false; });
    return dictAudio;
  };
  function listen(he, name) {
    if (isAudioFree(ctx) || !ctx?.audio) return null;
    const cell = el('span', { class: 'rt-audio', 'data-audio-state': 'checking' }, 'Checking audio...');
    ensureClips().then(() => {
      if (!alive) return;
      const v = voice(), t = trad();
      const clip = clipLookup && (lookupClip(clipLookup, he, v, t) || alternateClip(clipLookup, he, v, t));
      if (!clip) { cell.replaceChildren('No clip for this form.'); cell.setAttribute?.('data-audio-state', 'none'); return; }
      const note = el('span', { class: 'muted' }, clipCaption(clip));
      const play = async () => {
        const want = { voice: clip.voice, tradition: clip.tradition, id: clip.id }, opts = { voice: clip.voice, tradition: clip.tradition, allowMismatchedTts: false };
        try {
          if (ctx.audio.ensureManifest) await ctx.audio.ensureManifest();
          let plan = ctx.audio.status?.(clip.kind, clip.id, opts);
          if (plan?.reason === CHECKING && ctx.audio.ensureManifest) { await ctx.audio.ensureManifest(); plan = ctx.audio.status?.(clip.kind, clip.id, opts); }
          if (!planIsExactFile(plan, want) && String(clip.id).startsWith('dict-')) { await loadDictionaryAudio(); plan = ctx.audio.status?.(clip.kind, clip.id, opts); }
          if (!planIsExactFile(plan, want) && typeof globalThis.alefShards?.load === 'function') { try { await globalThis.alefShards.load(); } catch { /* honest line below */ } plan = ctx.audio.status?.(clip.kind, clip.id, opts); }
          if (!planIsExactFile(plan, want)) { note.textContent = unavailableLine(clip.voice, clip.tradition); return; }
          try { ctx.audio.stop?.(); } catch { /* ignore */ }
          const r = await ctx.audio.play(clip.kind, clip.id, { ...opts, rate: 'normal' });
          if (!r || r.source === 'none' || r.fileError) note.textContent = unavailableLine(clip.voice, clip.tradition);
        } catch { note.textContent = unavailableLine(clip.voice, clip.tradition); }
      };
      cell.setAttribute?.('data-audio-state', 'file');
      cell.replaceChildren(btn('Listen', play, { class: 'btn secondary', 'aria-label': `Listen: ${name}`, 'data-audio': `${clip.kind}/${clip.id}` }), ' ', note);
    });
    return cell;
  }

  function renderTabs() {
    tabs.replaceChildren(...MODES.map(([m, label]) => btn(label, () => { mode = m; selRoot = null; selVerb = null; selBinyan = null; missingLetters = null; q = ''; render(); say(`${label} opened.`); }, { class: 'btn secondary', 'aria-pressed': String(mode === m) })));
  }
  /** The verb conjugator (#15c): the forms the data holds, one row each, with a clip where the exact form has one. */
  function table(v) {
    const t = verbTable(v);
    const rows = t.rows.map((r) => el('tr', { 'data-form': r.key }, el('th', { scope: 'row' }, r.label), el('td', {}, heText(r.he)), el('td', {}, listen(r.he, `${r.label}, ${v.translit}`) || '')));
    return el('div', { class: 'rt-verb' },
      el('table', {}, el('caption', {}, ...mixed(`${v.translit}: ${v.en}. Pattern: ${binyanName(t.binyan)}${BINYAN[t.binyan] ? ` (${BINYAN[t.binyan].gist})` : ''}. Family letters: ${t.root || 'not listed in the data'}.`)),
        el('thead', {}, el('tr', {}, el('th', { scope: 'col' }, 'Form'), el('th', { scope: 'col' }, 'Hebrew'), el('th', { scope: 'col' }, 'Sound'))), el('tbody', {}, ...rows)),
      el('p', { class: 'muted' }, VERB_FORMS_NOTE),
      el('ul', {}, ...t.notes.map((n) => el('li', {}, n)), ...(t.missing.length ? [el('li', {}, `Not in the data for this verb: ${t.missing.join(', ')}.`)] : [])),
      t.root ? el('p', {}, el('a', { href: `#/roots?letters=${encodeURIComponent(t.root)}` }, 'Words listed under the same family letters')) : null,
      t.binyan && SEVEN.includes(t.binyan) ? el('p', {}, el('a', { href: `#/roots?mode=binyanim&b=${encodeURIComponent(t.binyan)}` }, `About the ${binyanName(t.binyan)} pattern`)) : null);
  }
  function wordLine(w, loose) {
    return el('li', {}, heText(w.he), ` ${w.translit}: ${w.en}`, loose ? ' (loose match)' : '', w.forms && w.pos === 'verb' ? btn('Verb forms', () => { selVerb = selVerb === w.id ? null : w.id; renderFamilies(); }, { 'aria-expanded': String(selVerb === w.id), 'aria-label': `Verb forms for ${w.translit}` }) : null,
      selVerb === w.id ? table(w) : null);
  }

  function renderFamilies() {
    const nodes = [el('p', { 'data-coverage': '1' }, coverageText(rootsCoverage())), field('rt-q', 'Find family letters (Hebrew) or a word (English or sounds-like)', q, (v) => { q = v; selRoot = null; missingLetters = null; renderList(); })];
    const list = el('div', { class: 'rt-list' }), detail = el('div', { class: 'rt-detail' });
    function renderList() {
      const res = searchFamilies(fam.families, q, 30);
      list.replaceChildren(el('p', {}, q ? `${res.length} word families match.` : 'Largest word families first.'), el('ul', { class: 'rt-roots' }, ...res.map((f) => el('li', {}, btn([heText(f.root), ` (${f.size} words)`], () => { selRoot = f.root; selVerb = null; renderDetail(); say(`Group of ${f.size} words opened.`); }, { 'aria-label': `Family letters ${f.root}, ${f.size} words`, 'aria-pressed': String(selRoot === f.root) })))));
      renderDetail();
    }
    function renderDetail() {
      const f = fam.families.find((x) => x.root === selRoot);
      if (!f) { detail.replaceChildren(...(missingLetters ? [el('p', { role: 'note' }, 'No other word in the word list is listed under the letters ', heText(missingLetters), ', so there is no family to show.')] : [])); return; }
      const loose = (w) => f.ruleChecked && !(f.checkedIds || []).includes(w.id);
      detail.replaceChildren(el('h2', { tabindex: '-1', id: 'rt-family' }, 'Words Listed Under the Letters ', heText(f.root), ` (${f.size} words)`), el('p', { class: 'rt-badge' }, familyBadge(f)),
        ...groupFamily(f).flatMap((g) => (g.byBinyan
          ? [el('h3', {}, `${POS_LABEL.verb}, by Pattern`), ...g.byBinyan.flatMap((b) => [el('h4', {}, b.binyan ? binyanName(b.binyan) : 'Pattern Not Listed'), el('ul', {}, ...b.words.map((w) => wordLine(w, loose(w))))])]
          : [el('h3', {}, POS_LABEL[g.pos] || g.pos), el('ul', {}, ...g.words.map((w) => wordLine(w, loose(w))))])));
    }
    nodes.push(list, detail); body.replaceChildren(...nodes); renderList();
  }

  function renderVerbs() {
    const list = el('div', {}), detail = el('div', {});
    const draw = () => {
      const res = searchVerbs(verbs.verbs, q, 20);
      const v = verbs.verbs.find((x) => x.id === selVerb);
      const shown = v && !res.includes(v) ? [v, ...res] : res;
      list.replaceChildren(el('ul', {}, ...shown.map((x) => el('li', {}, btn(`${x.translit}: ${x.en}`, () => { selVerb = x.id; draw(); say(`${x.translit} opened.`); }, { 'aria-pressed': String(selVerb === x.id), 'aria-label': `Show forms of ${x.translit}, ${x.en}` })))));
      detail.replaceChildren(v ? table(v) : el('p', {}, qy.verb && selVerb === qy.verb ? 'That verb is not on this page.' : 'Pick a verb to see the forms the data has.'));
    };
    body.replaceChildren(el('p', {}, `${rootsCoverage().explorer.toLocaleString('en-US')} of the word list's ${rootsCoverage().verbs.toLocaleString('en-US')} verbs can be opened here.`),
      field('rt-vq', 'Find a verb (English, sounds-like, or Hebrew letters)', q, (x) => { q = x; draw(); }), list, detail); draw();
  }

  /** The seven patterns (#15b): a list, and one page per pattern. */
  function renderBinyanim() {
    const c = rootsCoverage();
    if (!selBinyan) {
      body.replaceChildren(el('h2', {}, 'The Seven Verb Patterns'), el('p', {}, 'Most Hebrew verbs set their family letters into one of seven patterns (binyanim). Each pattern has its own shape and often shifts the meaning in a usual way. Open a pattern to see its signs and verbs from the word list.'),
        el('p', { class: 'muted' }, REVIEW_NOTE),
        el('ul', {}, ...SEVEN.map((b) => el('li', {}, btn(`${binyanName(b)}: ${BINYAN[b].gist} (${(c.byBinyan[b]?.verbs || 0).toLocaleString('en-US')} verbs)`, () => { selBinyan = b; renderBinyanim(); say(`${binyanName(b)} opened.`); }, { 'aria-label': `Open the ${binyanName(b)} pattern` })))),
        btn('Practise: pick the pattern from a form', () => { mode = 'bdrill'; render(); }));
      return;
    }
    const p = binyanPage(selBinyan, verbs.verbs, fam.families, c.byBinyan[selBinyan], c.verbs);
    body.replaceChildren(
      el('h2', { tabindex: '-1', id: 'rt-binyan' }, p.name),
      el('p', {}, `Meaning shift: ${p.gist}.`),
      el('p', {}, ...(p.sign ? mixed(`Pattern sign: ${p.sign}.`) : [NO_SIGN])),
      el('p', { class: 'muted' }, p.countLine),
      el('h3', {}, 'Letters Counted Over the Word List'), el('ul', {}, ...p.observations.map((o) => el('li', {}, ...mixed(observationText(o))))),
      el('h3', {}, 'Example Verbs'), el('ul', {}, ...p.examples.map((v) => el('li', {}, heText(v.he), ` ${v.translit}: ${v.en} `, btn('Verb forms', () => { mode = 'verbs'; selVerb = v.id; q = ''; render(); }, { 'aria-label': `Verb forms for ${v.translit}` })))),
      el('h3', {}, 'Same Family Letters, Another Pattern'),
      p.pairs.length ? el('ul', {}, ...p.pairs.map((x) => el('li', {}, heText(x.here.he), ` ${x.here.translit}: ${x.here.en} (${p.name}), and `, heText(x.other.he), ` ${x.other.translit}: ${x.other.en} (${binyanName(x.other.binyan)}). Both listed under the letters `, heText(x.letters), x.checked ? '.' : ' (a loose group).')))
        : el('p', {}, 'The word list has no pair like this for this pattern.'),
      el('p', { class: 'muted' }, REVIEW_NOTE),
      btn('All seven patterns', () => { selBinyan = null; renderBinyanim(); }), btn('Practise: pick the pattern from a form', () => { mode = 'bdrill'; render(); }));
  }

  function renderDrill() {
    if (!quiz.length) quiz = buildQuiz(fam.families, verbs.verbs, { seed: 1000 + round * 31, count: 8 });
    if (qi >= quiz.length) {
      body.replaceChildren(el('p', {}, `Round done. All-time, both drills: ${prog.right} right of ${prog.asked} asked. Answers are checked against the word list, not by a teacher.`), btn('Another round', () => { round += 1; quiz = []; qi = 0; picked = null; storeSet(ctx, STORE_KEY, { ...prog, round }); renderDrill(); }));
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

  /** Pattern drill (#15b): one form from the data, pick which of the seven patterns it is in. */
  function renderBinyanDrill() {
    if (!bquiz.length) bquiz = binyanDrill(verbs.verbs, { seed: 2000 + bround * 37, count: 8 });
    if (bqi >= bquiz.length) {
      body.replaceChildren(el('p', {}, `Round done. All-time, both drills: ${prog.right} right of ${prog.asked} asked. Answers are checked against the word list, not by a teacher.`), btn('Another round', () => { bround += 1; bquiz = []; bqi = 0; bpicked = null; renderBinyanDrill(); }), btn('The seven patterns', () => { mode = 'binyanim'; selBinyan = null; render(); }));
      return;
    }
    const k = bquiz[bqi], res = bpicked ? gradeAnswer(k, bpicked) : null;
    const opts = k.options.map((o) => btn(o.label, () => {
      const ok = gradeAnswer(k, o.id).correct; bpicked = o.id; prog = { ...prog, asked: prog.asked + 1, right: prog.right + (ok ? 1 : 0) }; storeSet(ctx, STORE_KEY, prog);
      renderBinyanDrill(); say(ok ? 'Right.' : 'Not this one.');
    }, { disabled: !!bpicked, 'aria-pressed': String(bpicked === o.id), class: 'btn secondary' }));
    body.replaceChildren(...[el('p', {}, `Question ${bqi + 1} of ${bquiz.length}`), el('p', { class: 'rt-prompt' }, `Which pattern is this ${k.formLabel} in? `, heText(k.he)), el('div', { role: 'group', 'aria-label': 'Answers' }, ...opts),
      res ? el('p', {}, res.correct ? 'Right. ' : 'Not this one. ', ...mixed(k.explain)) : null,
      res ? btn(bqi + 1 < bquiz.length ? 'Next question' : 'Finish round', () => { bqi += 1; bpicked = null; renderBinyanDrill(); }) : null].filter(Boolean));
  }

  function render() {
    renderTabs();
    if (mode === 'families') renderFamilies(); else if (mode === 'verbs') renderVerbs(); else if (mode === 'binyanim') renderBinyanim(); else if (mode === 'bdrill') renderBinyanDrill(); else renderDrill();
  }

  (async () => {
    try {
      const d = ctx?.rootsData;
      fam = d?.families || (await loadFamilies());
      verbs = d?.verbs || (await loadVerbs());
      prog = normalizeProgress(await storeGet(ctx, STORE_KEY, null)); round = prog.round;
      if (qy.letters) { if (fam.families.some((f) => f.root === qy.letters)) selRoot = qy.letters; else missingLetters = qy.letters; }
      if (qy.verb) selVerb = qy.verb;
      if (alive) render();
    } catch { if (alive) body.replaceChildren(el('p', { role: 'alert' }, 'The word list could not be loaded. If you are offline, open this page once while online, or use "Use Aleph offline" in the More menu to download everything. Nothing was lost.')); }
  })();
  return () => { alive = false; wrap.children = []; if (typeof wrap.remove === 'function') wrap.remove(); else root.replaceChildren?.(); };
}
