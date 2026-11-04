// @ts-check
// Traditions explorer (route /traditions). mount(root, ctx) -> unmount.
//
// Five sections behind a button row: Compare (one prayer line or word in the app's three settings, with
// respellings from src/pronunciation/transliterate.js), Sounds (per-sound table, every row with sources and a
// confidence label), Which should I learn? (guide for an English-speaking learner), Hear the difference (drill)
// and Sources. Everything is a draft: nothing here was reviewed by a native speaker and no audio exists yet.
//
// ctx used: settings.congregation (read; written through settings.set only when the learner presses a
// "use this setting" button), audio.has/status/play/playSequence (only called for ids that exist), t(key),
// query.tab ('compare'|'sounds'|'guide'|'hear'|'sources'), query.text (registry id), store (optional, best effort).
// ctx.traditionsData may inject the JSON files (tests).

import {
  TRADITIONS, SETTING_LABELS, COLUMN_FOR, CONFIDENCE_LABELS, DRAFT_NOTICE,
  textLines, respellLines, compareWords, soundsIn, switchesIn, ipaFor, registryEntries,
  clipPlan, textDrillItems, makeTextQuestion, audioDrillPool, makeAudioQuestion, loadTraditionsData, sourceIndex, pick,
} from './model.js';

export const TABS = [
  { id: 'compare', label: 'Compare', key: 'trad.tab.compare' },
  { id: 'sounds', label: 'Sounds', key: 'trad.tab.sounds' },
  { id: 'guide', label: 'Which should I learn?', key: 'trad.tab.guide' },
  { id: 'hear', label: 'Hear the difference', key: 'trad.tab.hear' },
  { id: 'sources', label: 'Sources', key: 'trad.tab.sources' },
];

const CSS = `
.alef-trad{font:16px/1.5 var(--font-ui,system-ui,sans-serif);max-width:60rem;margin:0 auto;padding:1rem;color:var(--fg,inherit)}
.alef-trad,.alef-trad *{box-sizing:border-box}
.alef-trad h2{margin:.2em 0 .4em}
.alef-trad h3{margin:1.1em 0 .4em;font-size:1.1rem}
.alef-trad h4{margin:0 0 .3rem;font-size:1rem}
.alef-trad .draft-flag{background:var(--warn-bg,#fff3cd);color:var(--warn-fg,#4d3b00);padding:.5rem .75rem;border-radius:8px;border-inline-start:4px solid var(--focus,#1a5fb4);font-weight:600}
.alef-trad .tabs{display:flex;flex-wrap:wrap;gap:.4rem;margin:.8rem 0}
.alef-trad button{font:inherit;cursor:pointer;border:1px solid var(--border,#666);border-radius:8px;background:var(--card,#f4f4f4);color:inherit;padding:.3rem .8rem;min-height:2.75rem;min-width:2.75rem}
.alef-trad button[aria-pressed=true]{background:var(--accent,#1a5fb4);color:var(--accent-fg,#fff);border-color:var(--accent,#1a5fb4)}
.alef-trad button:disabled{opacity:.6;cursor:not-allowed}
.alef-trad :is(button,select,input,a,summary,[tabindex]):focus-visible{outline:3px solid var(--focus,#1a5fb4);outline-offset:2px}
.alef-trad select{font:inherit;max-width:100%;min-height:2.75rem;padding:.3rem;width:100%}
.alef-trad .he{font-family:var(--font-he,serif);direction:rtl;unicode-bidi:isolate}
.alef-trad .he-big{font-size:2rem;line-height:1.5;margin:.3rem 0}
.alef-trad .he-lines{display:block}
.alef-trad .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(15rem,100%),1fr));gap:.7rem;margin:.6rem 0}
.alef-trad .card{border:1px solid var(--border,#888);border-radius:10px;padding:.6rem .8rem;background:var(--card,transparent)}
.alef-trad .card.mine{border-width:2px;border-color:var(--accent,#1a5fb4)}
.alef-trad .say{font-weight:600;overflow-wrap:anywhere}
.alef-trad .muted{color:var(--muted,#555)}
.alef-trad .badge{display:inline-block;font-size:.8rem;border:1px solid currentColor;border-radius:4px;padding:0 .35rem;margin-inline-end:.35rem;white-space:nowrap}
.alef-trad .chips{display:flex;flex-wrap:wrap;gap:.4rem;padding:0;margin:.4rem 0;list-style:none}
.alef-trad .word-list{list-style:none;padding:0;margin:.4rem 0}
.alef-trad .word-list li{border-block-end:1px solid var(--border,#888);padding:.4rem 0;display:block}
.alef-trad .word-list li>.he{display:block;text-align:start}
.alef-trad .word-list .he{font-size:1.5rem}
.alef-trad .word-list dl{margin:0;display:grid;grid-template-columns:auto 1fr;gap:0 .6rem}
.alef-trad .word-list dt{color:var(--muted,#555)}
.alef-trad .word-list dd{margin:0;overflow-wrap:anywhere}
.alef-trad .diff{font-weight:700}
.alef-trad table{border-collapse:collapse;width:100%}
.alef-trad th,.alef-trad td{border-block-end:1px solid var(--border,#888);padding:.4rem .5rem;text-align:start;vertical-align:top}
.alef-trad thead th{position:sticky;inset-block-start:0;background:var(--bg,#fff)}
.alef-trad tr.focus-row{outline:3px solid var(--focus,#1a5fb4);outline-offset:-3px}
.alef-trad .table-wrap{max-width:100%}
.alef-trad .ipa{font-family:"Noto Sans","DejaVu Sans",sans-serif;font-size:.9em;color:var(--muted,#555);display:block}
.alef-trad fieldset{min-width:0;border:1px solid var(--border,#888);border-radius:8px;padding:.5rem .8rem;margin:.6rem 0}
.alef-trad fieldset label{display:flex;gap:.5rem;align-items:flex-start;min-height:2.75rem;padding:.2rem 0}
.alef-trad .q-options{display:flex;flex-wrap:wrap;gap:.5rem;margin:.5rem 0}
.alef-trad [role=status]{min-height:1.5em;font-weight:600}
.alef-trad .visually-hidden{position:absolute!important;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
@media (max-width:44rem){
  .alef-trad table.sounds-table,.alef-trad table.sounds-table tbody,.alef-trad table.sounds-table tr,.alef-trad table.sounds-table th,.alef-trad table.sounds-table td{display:block}
  .alef-trad table.sounds-table thead{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
  .alef-trad table.sounds-table tr{border:1px solid var(--border,#888);border-radius:10px;margin:.7rem 0;padding:.3rem .6rem}
  .alef-trad table.sounds-table th[scope=row]{border:0;padding-inline:0}
  .alef-trad table.sounds-table td{border:0;border-block-start:1px dashed var(--border,#888);padding-inline:0}
  .alef-trad table.sounds-table td::before{content:attr(data-label);display:block;font-weight:700;font-size:.85rem;color:var(--muted,#555)}
}
@media (prefers-reduced-motion:no-preference){.alef-trad .card{transition:border-color .2s}}
`;

/**
 * @param {HTMLElement} root
 * @param {any} ctx
 * @returns {() => void}
 */
export function mount(root, ctx = {}) {
  const doc = root.ownerDocument;
  let alive = true;
  /** @type {Array<() => void>} */ const cleanups = [];
  /** @type {Array<() => void>} */ const sectionCleanups = [];
  let uid = 0;
  const nextId = (p) => `${p}-${++uid}-${Math.random().toString(36).slice(2, 6)}`;

  const tr = (key, fallback) => {
    const v = typeof ctx.t === 'function' ? ctx.t(key) : undefined;
    return v && v !== key ? v : fallback;
  };
  const h = (tag, attrs = {}, ...kids) => {
    const el = doc.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === false || v == null) continue;
      el.setAttribute(k, v === true ? '' : String(v));
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      el.append(typeof kid === 'string' ? doc.createTextNode(kid) : kid);
    }
    return el;
  };
  const he = (text, cls = 'he') => h('span', { class: cls, dir: 'rtl', lang: 'he' }, text);
  /** addEventListener with cleanup bound to the current section (re-render) or the whole view. */
  const on = (el, type, fn, perSection = true) => {
    el.addEventListener(type, fn);
    (perSection ? sectionCleanups : cleanups).push(() => el.removeEventListener(type, fn));
  };
  const clearSection = () => { for (const c of sectionCleanups.splice(0)) { try { c(); } catch { /* ignore */ } } };

  const currentSetting = () => (TRADITIONS.includes(ctx.settings?.congregation) ? ctx.settings.congregation : 'israeli');
  const setSetting = (t) => {
    if (!ctx.settings) return false;
    try {
      if (typeof ctx.settings.set === 'function') ctx.settings.set('congregation', t);
      else ctx.settings.congregation = t;
      return true;
    } catch { return false; }
  };

  root.replaceChildren();
  const wrap = h('section', { class: 'alef-trad', 'aria-labelledby': 'alef-trad-title' });
  root.append(h('style', {}, CSS), wrap);
  const title = h('h2', { id: 'alef-trad-title' }, tr('trad.title', 'Traditions'));
  const status = h('p', { role: 'status', 'aria-live': 'polite' });
  wrap.append(title, h('p', { class: 'draft-flag', role: 'note' }, tr('trad.draft', DRAFT_NOTICE)), h('p', { role: 'status', 'aria-live': 'polite' }, tr('trad.loading', 'Loading...')));

  /** @type {any} */ let data = null;
  let tab = TABS.some((t) => t.id === ctx.query?.tab) ? ctx.query.tab : 'compare';
  let selected = '';
  let showAllWords = false;
  let focusSound = '';
  let guideChoice = '';
  /** @type {any} */ let drill = { mode: '', q: null, answered: null, right: 0, total: 0 };

  const tabBar = h('div', { class: 'tabs', role: 'group', 'aria-label': tr('trad.sections', 'Sections') });
  const body = h('div', { class: 'tab-body' });
  /** @type {Record<string, any>} */ const tabButtons = {};

  const go = (id, extra = {}) => {
    if (!TABS.some((t) => t.id === id)) return;
    tab = id;
    if (extra.sound) focusSound = extra.sound;
    for (const t of TABS) tabButtons[t.id]?.setAttribute('aria-pressed', String(t.id === tab));
    render();
    if (extra.sound) {
      const row = body.querySelector?.(`[data-sound="${extra.sound}"]`);
      try { row?.scrollIntoView?.({ block: 'center' }); } catch { /* ignore */ }
    }
  };

  const render = () => {
    clearSection();
    body.replaceChildren();
    status.replaceChildren();
    if (!data) return;
    ({ compare: renderCompare, sounds: renderSounds, guide: renderGuide, hear: renderHear, sources: renderSources })[tab]();
  };

  // ------------------------------------------------------------ shared bits

  const srcLinks = (ids) => {
    const idx = sourceIndex(data.sources);
    return h('span', { class: 'src' }, ids.map((id, i) => {
      const s = idx.get(id);
      if (!s) return null;
      const label = s.title.replace(/ \(.*$/, '');
      const link = s.url && /^https?:/.test(s.url)
        ? h('a', { href: s.url, target: '_blank', rel: 'noopener noreferrer' }, label, h('span', { class: 'visually-hidden' }, ' (opens in a new tab)'))
        : h('span', {}, label);
      return h('span', {}, i ? '; ' : '', link, s.open ? '' : ' (not open-licensed)');
    }));
  };

  const confidenceBadge = (c) => h('span', { class: 'badge' }, CONFIDENCE_LABELS[c] ?? c);

  /** Audio line for one setting of a registry entry: Play button, stand-in note, or the honest "no audio yet". */
  const audioControl = (entry, tradition) => {
    const plan = clipPlan(ctx, entry, tradition);
    if (plan.status === 'none') return h('p', { class: 'muted' }, tr('trad.noAudio', 'No audio yet for this setting.'));
    const label = SETTING_LABELS[tradition];
    const btn = h('button', { type: 'button', 'aria-label': `Play ${entry.title ?? entry.id}, ${label}` }, tr('trad.play', 'Play'));
    on(btn, 'click', async () => {
      status.replaceChildren('Playing...');
      let res;
      try {
        res = plan.items.length === 1 ? await ctx.audio.play(plan.items[0].kind, plan.items[0].id, { tradition }) : (await ctx.audio.playSequence(plan.items))?.[0];
      } catch { res = null; }
      if (!alive) return;
      status.replaceChildren(res && res.source === 'file' ? '' : 'Could not play that clip.');
    });
    return h('p', {}, btn, plan.status === 'stand-in' ? h('small', { class: 'muted' }, ' ', tr('trad.standIn', 'Heard through an approved stand-in recording from another setting, not recorded in this one.')) : null);
  };

  // ------------------------------------------------------------ Compare

  const options = () => {
    const words = data.prayerwords?.words ?? [];
    const entries = registryEntries(data.registry);
    return { words, entries };
  };

  const renderCompare = () => {
    const { words, entries } = options();
    if (!selected) {
      const wanted = ctx.query?.text && entries.some((e) => e.id === ctx.query.text) ? `text:${ctx.query.text}` : '';
      selected = wanted || (entries.some((e) => e.id === 'bless-priestly-1') ? 'text:bless-priestly-1' : entries[0] ? `text:${entries[0].id}` : words[0] ? `word:${words[0].id}` : '');
    }
    const sid = nextId('trad-pick');
    const sel = h('select', { id: sid });
    sel.append(
      h('optgroup', { label: `Key prayer words (${words.length})` }, words.map((w) => h('option', { value: `word:${w.id}`, ...(selected === `word:${w.id}` ? { selected: true } : {}) }, `${w.id} - ${w.gloss}`))),
      h('optgroup', { label: `Prayer and Torah texts (${entries.length})` }, entries.map((e) => h('option', { value: `text:${e.id}`, ...(selected === `text:${e.id}` ? { selected: true } : {}) }, `${e.title} (${e.ref})`))),
    );
    sel.value = selected;
    on(sel, 'change', () => { selected = sel.value; showAllWords = false; render(); try { sel.focus?.(); } catch { /* ignore */ } });
    body.append(h('p', {}, h('label', { for: sid }, tr('trad.pick', 'Choose a prayer line or word')), sel));

    if (selected.startsWith('word:')) return renderWord(words.find((w) => `word:${w.id}` === selected));
    const entry = entries.find((e) => `text:${e.id}` === selected);
    if (entry) renderText(entry);
  };

  const settingCard = (t, content) => h('section', { class: `card${currentSetting() === t ? ' mine' : ''}`, 'aria-label': SETTING_LABELS[t] },
    h('h4', {}, SETTING_LABELS[t], currentSetting() === t ? h('span', { class: 'badge', style: 'margin-inline-start:.4rem' }, tr('trad.yours', 'your setting')) : null),
    content);

  const americanNote = () => h('p', { class: 'muted' },
    tr('trad.sameLetters', 'Same letters as Israeli: the respelling engine writes both the same. The difference is in how English speakers say it. '),
    (data.prayerwords?.americanHabits ?? []).join(' '));

  const alsoNote = () => {
    const b = h('button', { type: 'button' }, tr('trad.seeSounds', 'See the sound table'));
    on(b, 'click', () => go('sounds'));
    return h('p', { class: 'muted' }, h('strong', {}, tr('trad.also', 'Also exists: ')),
      'Yemenite and other Mizrahi or Sephardi readings (for example a throaty het and ayin). ALEF has no respelling or audio for them. ', b);
  };

  const soundChips = (he) => {
    const ids = he ? switchesIn(he) : [];
    if (!ids.length) return null;
    const rows = new Map(data.sounds.sounds.map((s) => [s.id, s]));
    return h('div', {}, h('h3', {}, tr('trad.switches', 'Sounds that change the Ashkenazi reading of this text')),
      h('ul', { class: 'chips' }, ids.map((id) => {
        const b = h('button', { type: 'button', 'aria-label': `Open sound table row: ${rows.get(id)?.label ?? id}` }, rows.get(id)?.label ?? id);
        on(b, 'click', () => go('sounds', { sound: id }));
        return h('li', {}, b);
      })));
  };

  const renderText = (entry) => {
    const lines = textLines(entry.he);
    body.append(
      h('h3', {}, `${entry.title} `, h('span', { class: 'muted' }, `(${entry.ref})`)),
      h('p', { class: 'he-big', dir: 'rtl', lang: 'he' }, lines.map((l, i) => h('span', { class: 'he-lines', dir: 'rtl', lang: 'he' }, l))),
      entry.english ? h('p', { class: 'muted' }, entry.english, entry.englishSource ? ` (${entry.englishSource})` : '') : null,
    );
    const resp = Object.fromEntries(TRADITIONS.map((t) => [t, respellLines(entry.he, t)]));
    const lineBlock = (t) => h('p', { class: 'say', lang: 'en' }, resp[t].map((l, i) => h('span', { style: 'display:block' }, l)));
    body.append(h('div', { class: 'cards' },
      settingCard('israeli', [lineBlock('israeli'), audioControl(entry, 'israeli')]),
      settingCard('sephardi', [lineBlock('sephardi'), americanNote(), audioControl(entry, 'sephardi')]),
      settingCard('ashkenazi', [lineBlock('ashkenazi'), audioControl(entry, 'ashkenazi')]),
    ));
    body.append(h('p', { class: 'muted' }, tr('trad.respellNote', 'Respellings are the app\'s own approximations (siddur style, no stress marks), not recordings and not a standard.')));
    body.append(alsoNote());
    const chips = soundChips(entry.he);
    if (chips) body.append(chips);

    const rows = compareWords(entry.he);
    const diff = rows.filter((r) => r.differs);
    const shown = showAllWords ? rows : diff;
    const cid = nextId('trad-all');
    const check = h('input', { type: 'checkbox', id: cid });
    check.checked = showAllWords;
    on(check, 'change', () => { showAllWords = !!check.checked; render(); });
    body.append(h('h3', {}, tr('trad.wordByWord', 'Word by word')),
      h('p', {}, `${diff.length} of ${rows.length} words are written differently in the Ashkenazi reading.`),
      h('p', {}, h('label', { for: cid }, check, ' ', tr('trad.showAll', 'Show all words'))),
      h('ul', { class: 'word-list' }, shown.map((r) => h('li', {},
        he(r.he),
        h('dl', {},
          h('dt', {}, 'Israeli'), h('dd', {}, r.israeli),
          h('dt', {}, 'American synagogue'), h('dd', {}, r.sephardi),
          h('dt', {}, 'Ashkenazi'), h('dd', { class: r.differs ? 'diff' : '' }, r.ashkenazi, r.differs ? h('span', { class: 'visually-hidden' }, ' (differs)') : '')))))
    );
    if (!shown.length) body.append(h('p', {}, 'No word in this text changes in the Ashkenazi respelling.'));
  };

  const renderWord = (w) => {
    if (!w) return;
    const row = { he: w.he };
    body.append(
      h('h3', {}, w.id, ' ', h('span', { class: 'muted' }, `- ${w.gloss}`)),
      h('p', { class: 'he-big', dir: 'rtl', lang: 'he' }, w.he));
    const stressNote = (s) => (s ? h('small', { class: 'muted' }, ` stress: ${s}`) : null);
    const engine = (t) => h('p', { class: 'muted', lang: 'en' }, `Engine respelling: ${respellLines(w.he, t)[0]}`);
    const entryLike = { id: w.id, title: w.id, he: w.he };
    body.append(h('div', { class: 'cards' },
      settingCard('israeli', [h('p', { class: 'say', lang: 'en' }, w.israeli.say, stressNote(w.israeli.stress)), engine('israeli'), audioControl(entryLike, 'israeli')]),
      settingCard('sephardi', [h('p', { class: 'say', lang: 'en' }, w.american.say, stressNote(w.american.stress)), engine('sephardi'), americanNote(), audioControl(entryLike, 'sephardi')]),
      settingCard('ashkenazi', [h('p', { class: 'say', lang: 'en' }, w.ashkenazi.say, stressNote(w.ashkenazi.stress)), engine('ashkenazi'), audioControl(entryLike, 'ashkenazi')]),
    ));
    body.append(h('p', { class: 'muted' }, 'Capitals mark the stressed syllable. These hand-written respellings come from data/pronunciation/prayerwords.json and are unreviewed.'), alsoNote());
    const chips = soundChips(row.he);
    if (chips) body.append(chips);
  };

  // ------------------------------------------------------------ Sounds

  const renderSounds = () => {
    const sounds = data.sounds;
    body.append(
      h('h3', {}, tr('trad.soundsTitle', 'Sound by sound')),
      h('p', {}, 'Three settings the app uses, plus other communities for reference. Each row says how sure we are and where the claim comes from.'),
      h('ul', {}, Object.entries(sounds.settings).map(([k, v]) => h('li', {}, h('strong', {}, k === 'american' ? 'American synagogue: ' : k === 'israeli' ? 'Israeli: ' : 'Ashkenazi: '), v))),
      h('details', {}, h('summary', {}, 'What the confidence labels mean'),
        h('ul', {}, Object.entries(sounds.confidence).map(([k, v]) => h('li', {}, h('strong', {}, `${CONFIDENCE_LABELS[k]}: `), v)))));

    const th = (t, scope = 'col') => h('th', { scope, role: scope === 'row' ? 'rowheader' : 'columnheader' }, t);
    const cols = [['Sound'], ['Modern Israeli'], ['American synagogue'], ['Ashkenazi'], ['Also exists (reference only)'], ['How sure, and why']];
    const trs = sounds.sounds.map((s) => {
      const ipaI = ipaFor(s, 'israeli', data), ipaA = ipaFor(s, 'ashkenazi', data);
      const row = h('tr', { role: 'row', 'data-sound': s.id, ...(focusSound === s.id ? { class: 'focus-row' } : {}) },
        h('th', { scope: 'row', role: 'rowheader' }, s.label, h('span', { class: 'muted', style: 'display:block' }, he(s.he), ' ', s.gloss)),
        h('td', { role: 'cell', 'data-label': cols[1][0] }, s.israeli, ipaI ? h('span', { class: 'ipa', dir: 'ltr', lang: 'und-fonipa' }, ipaI) : null),
        h('td', { role: 'cell', 'data-label': cols[2][0] }, s.american),
        h('td', { role: 'cell', 'data-label': cols[3][0] }, s.ashkenazi, ipaA ? h('span', { class: 'ipa', dir: 'ltr', lang: 'und-fonipa' }, ipaA) : null),
        h('td', { role: 'cell', 'data-label': cols[4][0] }, s.other.length ? h('ul', {}, s.other.map((o) => h('li', {}, h('strong', {}, `${o.who}: `), o.say))) : 'none listed'),
        h('td', { role: 'cell', 'data-label': cols[5][0] }, confidenceBadge(s.confidence), h('div', {}, srcLinks(s.sources)),
          s.americanBasis ? h('small', { class: 'muted', style: 'display:block' }, `American column: ${s.americanBasis}`) : null,
          s.note ? h('small', { class: 'muted', style: 'display:block' }, s.note) : null));
      return row;
    });
    body.append(h('div', { class: 'table-wrap' }, h('table', { class: 'sounds-table', role: 'table', 'aria-label': 'Sounds compared across settings' },
      h('thead', {}, h('tr', { role: 'row' }, cols.map((c) => th(c[0])))), h('tbody', {}, trs))));

    body.append(h('h3', {}, tr('trad.alsoTitle', 'Also exists')),
      h('p', {}, 'These readings are real but ALEF does not teach or play them. Listed so nobody assumes the three settings are the whole picture.'),
      sounds.alsoExists.map((a) => h('div', { class: 'card' },
        h('h4', {}, a.who, ' ', confidenceBadge(a.confidence)),
        h('ul', {}, a.claims.map((c) => h('li', {}, c))),
        h('p', { class: 'muted' }, a.note, ' ', srcLinks(a.sources)))));
  };

  // ------------------------------------------------------------ Guide

  const renderGuide = () => {
    const g = data.guide;
    body.append(
      h('h3', {}, tr('trad.guideTitle', 'Which should I learn?')),
      h('p', {}, 'There is no single right answer. It depends on where you will use Hebrew, and even inside one synagogue people differ. Pick the situation closest to yours.'),
      h('ul', {}, g.universalAdvice.map((a) => h('li', {}, a))),
      h('details', {}, h('summary', {}, 'What the evidence is, and how weak it is'), h('p', {}, g.evidenceNote)));
    const legend = h('legend', {}, 'Where will you use Hebrew most?');
    const result = h('div', { 'aria-live': 'polite' });
    const fs = h('fieldset', {}, legend);
    const name = nextId('trad-sit');
    const showResult = () => {
      result.replaceChildren();
      const s = g.situations.find((x) => x.id === guideChoice);
      if (!s) return;
      const mine = s.tradition && currentSetting() === s.tradition;
      result.append(h('div', { class: 'card' },
        h('h4', {}, s.title, ' ', confidenceBadge(s.confidence)),
        h('p', {}, h('strong', {}, 'Suggested starting point: '), s.tradition ? SETTING_LABELS[s.tradition] : 'whatever your community uses'),
        h('p', {}, s.summary),
        h('ul', {}, s.caveats.map((c) => h('li', {}, c))),
        h('p', {}, h('strong', {}, 'Ask first: '), s.askFirst),
        h('p', { class: 'muted' }, 'Sources: ', srcLinks(s.sources)),
        s.tradition && ctx.settings ? (() => {
          const b = h('button', { type: 'button', ...(mine ? { disabled: true } : {}) }, mine ? `Already using ${SETTING_LABELS[s.tradition]}` : `Switch the app to ${SETTING_LABELS[s.tradition]}`);
          on(b, 'click', () => { const ok = setSetting(s.tradition); status.replaceChildren(ok ? `Reading setting is now ${SETTING_LABELS[s.tradition]}.` : 'Could not change the setting here; use Settings.'); showResult(); });
          return b;
        })() : null));
    };
    for (const s of g.situations) {
      const inp = h('input', { type: 'radio', name, value: s.id });
      inp.checked = s.id === guideChoice;
      on(inp, 'change', () => { if (inp.checked) { guideChoice = s.id; showResult(); } });
      fs.append(h('label', {}, inp, h('span', {}, s.title)));
    }
    body.append(fs, result);
    showResult();
  };

  // ------------------------------------------------------------ Hear the difference

  const ensureDrill = () => {
    if (drill.mode) return;
    drill.pool = audioDrillPool(ctx, data.registry);
    drill.items = textDrillItems(data.prayerwords, data.registry);
    drill.mode = drill.pool.length ? 'listen' : 'read';
  };

  const nextQuestion = () => {
    drill.answered = null;
    if (drill.mode === 'listen' && drill.pool.length) drill.q = makeAudioQuestion(pick(drill.pool));
    else if (drill.items.length) drill.q = makeTextQuestion(pick(drill.items));
    else drill.q = null;
  };

  const renderHear = () => {
    ensureDrill();
    if (!drill.q) nextQuestion();
    body.append(h('h3', {}, tr('trad.hearTitle', 'Hear the difference')));
    if (!drill.pool.length) {
      body.append(h('p', { class: 'draft-flag', role: 'note' }, tr('trad.hearNoAudio',
        'No audio yet. None of the Israeli, American-synagogue or Ashkenazi recordings for this app exist, so there is nothing to listen to. Below is a reading drill instead: you compare written respellings, which trains the eye, not the ear.')));
    } else {
      const modeBar = h('div', { class: 'tabs', role: 'group', 'aria-label': 'Drill type' });
      for (const [m, label] of [['listen', 'Listening'], ['read', 'Reading only']]) {
        const b = h('button', { type: 'button', 'aria-pressed': String(drill.mode === m) }, label);
        on(b, 'click', () => { drill.mode = m; drill.q = null; render(); });
        modeBar.append(b);
      }
      body.append(modeBar);
    }
    const q = drill.q;
    if (!q) { body.append(h('p', {}, 'No drill items are available.')); return; }

    if (drill.mode === 'listen') {
      body.append(h('p', {}, `Same text, two settings: ${q.entry.title}. Which clip is the ${SETTING_LABELS[q.ask]} reading?`), h('p', { class: 'he-big', dir: 'rtl', lang: 'he' }, textLines(q.entry.he).map((l) => h('span', { class: 'he-lines', dir: 'rtl', lang: 'he' }, l))));
      const playRow = h('div', { class: 'q-options' });
      for (const c of q.clips) {
        const b = h('button', { type: 'button', 'aria-label': `Play clip ${c.label}` }, `Play clip ${c.label}`);
        on(b, 'click', async () => { try { await ctx.audio.playSequence(c.plan.items); } catch { status.replaceChildren('Could not play that clip.'); } });
        playRow.append(b);
      }
      body.append(playRow);
    } else {
      body.append(h('p', {}, 'Reading drill (no sound). Which respelling is the Ashkenazi reading?'),
        h('p', { class: 'he-big', dir: 'rtl', lang: 'he' }, q.item.he), q.item.gloss ? h('p', { class: 'muted' }, q.item.gloss) : null,
        h('ul', { class: 'word-list', style: 'list-style:none;padding:0' }, q.options.map((o) => h('li', { style: 'display:block' }, h('strong', {}, `${o.label}: `), h('span', { lang: 'en', class: 'say' }, o.text)))));
    }

    const opts = h('div', { class: 'q-options', role: 'group', 'aria-label': 'Your answer' });
    for (const label of ['A', 'B']) {
      const b = h('button', { type: 'button', ...(drill.answered ? { disabled: true } : {}) }, drill.mode === 'listen' ? `Clip ${label}` : `Option ${label}`);
      on(b, 'click', () => {
        if (drill.answered) return;
        drill.answered = label; drill.total += 1;
        const right = label === q.answer; if (right) drill.right += 1;
        render();
      });
      opts.append(b);
    }
    body.append(opts);
    if (drill.answered) {
      const right = drill.answered === q.answer;
      const why = drill.mode === 'read' ? q.item.why : [];
      const rows = new Map(data.sounds.sounds.map((s) => [s.id, s]));
      body.append(h('div', { class: 'card', role: 'status' },
        h('p', {}, h('strong', {}, right ? 'Right. ' : 'Not quite. '), `The ${drill.mode === 'listen' ? SETTING_LABELS[q.ask] : 'Ashkenazi'} reading was ${q.answer}.`),
        why.length ? h('ul', {}, why.map((id) => h('li', {}, h('strong', {}, `${rows.get(id)?.label ?? id}: `), `Ashkenazi - ${rows.get(id)?.ashkenazi ?? ''}; Israeli - ${rows.get(id)?.israeli ?? ''}`))) : null));
      const next = h('button', { type: 'button' }, 'Next');
      on(next, 'click', () => { drill.q = null; nextQuestion(); render(); });
      body.append(next);
    }
    body.append(h('p', { class: 'muted' }, `This session: ${drill.right} right of ${drill.total}.`));
  };

  // ------------------------------------------------------------ Sources

  const renderSources = () => {
    body.append(h('h3', {}, tr('trad.sourcesTitle', 'Sources')), h('p', {}, data.sources.licenceNote),
      h('ul', {}, data.sources.sources.filter((s) => s.id !== 'own').map((s) => h('li', {},
        s.url && /^https?:/.test(s.url) ? h('a', { href: s.url, target: '_blank', rel: 'noopener noreferrer' }, s.title, h('span', { class: 'visually-hidden' }, ' (opens in a new tab)')) : h('strong', {}, s.title),
        h('div', { class: 'muted' }, `${s.licence}. Read ${s.fetched}; ${s.coverage}.`),
        h('div', {}, s.supports)))));
  };

  // ------------------------------------------------------------ start

  loadTraditionsData(ctx).then((d) => {
    if (!alive) return;
    data = d;
    wrap.replaceChildren(title, h('p', { class: 'draft-flag', role: 'note' }, tr('trad.draft', DRAFT_NOTICE)), tabBar, status, body);
    for (const t of TABS) {
      const b = h('button', { type: 'button', 'aria-pressed': String(t.id === tab) }, tr(t.key, t.label));
      tabButtons[t.id] = b;
      on(b, 'click', () => go(t.id), false);
      tabBar.append(b);
    }
    render();
  }).catch((err) => {
    if (!alive) return;
    wrap.replaceChildren(title, h('p', { role: 'alert' }, `Could not load the traditions data: ${err.message}`));
  });

  return () => {
    alive = false;
    clearSection();
    for (const c of cleanups.splice(0)) { try { c(); } catch { /* ignore */ } }
    root.replaceChildren();
  };
}
