// @ts-check
// Prayer reader + survival phrasebook view (lane 5).
//   export mount(root, ctx) -> unmount
// ctx: {settings, audio, params?, t?}. Everything but `root` is optional; missing pieces degrade gracefully:
//   - no ctx.audio                -> play buttons say audio is unavailable
//   - no pronunciation/transliterate.js -> transliteration falls back to a notice
// Plain DOM, RTL Hebrew (lang="he" dir="rtl"), keyboard and screen-reader friendly.
import { loadCorpus, letterInventory } from './corpus.js';
import { versionLabel } from '../shell/names.js';
import { silentReadingNode } from '../shell/silent-reading.js';
import { isAudioFree } from '../shell/audiofree.js';
import { uiEnglish } from '../shell/names.js';
import { speechText } from '../shell/names.js';
import { largePositionsIn } from '../torahreader/model.js';
import { LETTER_ID, isHebrewLetter, FINAL_OF } from './normalize.js';
import { clipPhonetic, englishSay } from '../shell/clip-labels.js';
import { playbackSpeedControl } from '../curriculum/audio-ui.js';

const LETTER_NAME = {
  alef: 'Alef', bet: 'Bet', gimel: 'Gimel', dalet: 'Dalet', he: 'He', vav: 'Vav', zayin: 'Zayin', chet: 'Chet', tet: 'Tet',
  yod: 'Yod', kaf: 'Kaf', lamed: 'Lamed', mem: 'Mem', nun: 'Nun', samekh: 'Samekh', ayin: 'Ayin', pe: 'Pe', tsadi: 'Tsadi',
  qof: 'Qof', resh: 'Resh', shin: 'Shin', tav: 'Tav',
  'kaf-final': 'Final Kaf', 'mem-final': 'Final Mem', 'nun-final': 'Final Nun', 'pe-final': 'Final Pe', 'tsadi-final': 'Final Tsadi',
};
const LETTER_CHAR = Object.fromEntries(Object.entries(LETTER_ID).map(([c, id]) => [id, c]));

/** Composite passages shown first. Everything else in the registry is a single-record passage. */
const COMPOSITES = [
  { id: 'priestly-blessing', title: 'The Priestly Blessing (Birkat Kohanim)', ref: 'Numbers 6:24-26', parts: ['bless-priestly-1', 'bless-priestly-2', 'bless-priestly-3'] },
];

const CSS = `
.crp{max-inline-size:60rem;margin-inline:auto}
.crp h1{margin-block:.2em .4em}
.crp-tabs{display:flex;gap:.5rem;margin-block:.5rem 1rem;flex-wrap:wrap}
.crp-tab,.crp-chip,.crp-play,.crp-ltr{font:inherit;min-block-size:var(--tap,48px);padding:.4rem .9rem;border-radius:999px;border:2px solid var(--accent,#1f3a5f);background:transparent;color:var(--accent,#1f3a5f);cursor:pointer}
.crp-tab[aria-selected="true"],.crp-chip[aria-pressed="true"],.crp-ltr[aria-pressed="true"]{background:var(--accent,#1f3a5f);color:var(--accent-fg,#fffaf0);font-weight:700}
.crp-ctl{border:1px solid var(--border,#d9cdb3);border-radius:8px;padding:0 .7rem;margin-block:.4rem}
.crp-ctl>summary{cursor:pointer;font-weight:700;min-block-size:max(44px,var(--tap,48px));display:flex;align-items:center}
.crp-ctl>summary:focus-visible{outline:3px solid var(--focus,#b45309);outline-offset:2px}
.crp-bar{display:flex;gap:.75rem;flex-wrap:wrap;align-items:center;margin-block:.5rem}
.crp-bar label{display:inline-flex;gap:.4rem;align-items:center}
.crp select,.crp input[type=search]{font:inherit;min-block-size:var(--tap,48px);padding:.3rem .6rem;border-radius:8px;border:2px solid var(--border,#d9cdb3);background:var(--card,#fffaf0);color:inherit}
.crp-line{display:flex;flex-wrap:wrap;gap:.9rem 1.1rem;justify-content:flex-start;direction:rtl;margin-block:1rem}
.crp-cell{display:inline-flex;flex-direction:column;align-items:center;gap:.15rem;text-align:center}
.crp-w{font-family:var(--font-he,serif);font-size:2.2rem;line-height:1.7;padding:.1rem .5rem;border:2px solid transparent;border-radius:10px;background:transparent;color:inherit;cursor:pointer;direction:rtl}
.crp-w:hover,.crp-w:focus-visible{border-color:var(--accent,#1f3a5f)}
.crp-w:focus-visible,.crp-tab:focus-visible,.crp-chip:focus-visible,.crp-play:focus-visible,.crp-ltr:focus-visible{outline:3px solid var(--focus,#b45309);outline-offset:2px}
.crp-w[data-playing="true"]{background:var(--warn-bg,#fff1c2)}
.crp-l.crp-hl{background:var(--warn-bg,#fff1c2);color:var(--warn-fg,#5b4200);text-decoration:underline;text-decoration-thickness:.12em;text-underline-offset:.18em;border-radius:4px;box-shadow:0 0 0 2px var(--focus,#b45309)}
.crp-lg{font-size:1.6em;line-height:1}
.crp-lgnote{font-size:.9rem;margin:.25rem 0}
.crp-tr{font-size:.95rem;color:var(--muted,#5a6275);direction:ltr}
.crp-gl{font-size:.85rem;color:var(--muted,#5a6275);direction:ltr;max-inline-size:9rem}
.crp-en{margin-block:.2rem 1rem;font-style:italic;direction:ltr}
.crp-letters{display:flex;gap:.4rem;flex-wrap:wrap;margin-block:.5rem}
.crp-ltr{display:inline-flex;gap:.35rem;align-items:baseline;padding:.25rem .7rem}
.crp-ltr .he{font-size:1.5rem}
.crp-ltr small{opacity:.8}
.crp-foot{margin-block:1.5rem 0;font-size:.9rem;color:var(--muted,#5a6275);border-block-start:1px solid var(--border,#d9cdb3);padding-block-start:.75rem}
.crp-foot p{margin:.3em 0}
.crp-warn{background:var(--warn-bg,#fff1c2);color:var(--warn-fg,#5b4200);padding:.4rem .7rem;border-radius:8px}
.crp-card{border:1px solid var(--border,#d9cdb3);background:var(--card,#fffaf0);border-radius:12px;padding:.7rem 1rem;margin-block:.6rem;display:grid;grid-template-columns:1fr auto;gap:.2rem .8rem;align-items:center}
.crp-card .crp-he{font-family:var(--font-he,serif);font-size:1.8rem;direction:rtl;text-align:start;grid-column:1}
.crp-card .meta{grid-column:1;direction:ltr}
.crp-badge{display:inline-block;font-size:.75rem;border:1px solid currentColor;border-radius:999px;padding:0 .5rem;margin-inline-start:.4rem}
.crp-card .crp-play{grid-column:2;grid-row:1}
.crp-status{min-block-size:1.4em;margin-block:.4rem;font-size:.95rem}
.crp-sec{border:1px solid var(--border,#d9cdb3);background:var(--card,#fffaf0);border-radius:12px;padding:.7rem 1rem;margin-block:.6rem}
.crp-sec h3{margin-block:.1em .3em}
.crp-sec p{margin:.3em 0}
.crp-sec .he{font-family:var(--font-he,serif);font-size:1.4rem}
.crp-lnk{font:inherit;min-block-size:var(--tap,48px);padding:.3rem .8rem;margin:.2rem .3rem .2rem 0;border-radius:999px;border:2px solid var(--accent,#1f3a5f);background:transparent;color:var(--accent,#1f3a5f);cursor:pointer;text-align:start;max-inline-size:100%}
.crp-lnk:focus-visible{outline:3px solid var(--focus,#b45309);outline-offset:2px}
.crp-meta{border:1px solid var(--border,#d9cdb3);border-radius:12px;padding:.5rem 1rem;margin-block:.6rem}
.crp-meta dt{font-weight:700;margin-block-start:.4em}
.crp-meta dd{margin:0}
.crp-sr{position:absolute;inline-size:1px;block-size:1px;overflow:hidden;clip:rect(0 0 0 0)}
`;

function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : String(v));
  }
  for (const k of kids) if (k != null) e.append(k);
  return e;
}
const heEl = (tag, text, cls = '') => el(tag, { lang: 'he', dir: 'rtl', class: cls }, text);

/** Split a word into letter clusters: [{text, letterId|null}] (non-letters such as maqaf attach as plain text). */
export function clusters(word) {
  const out = [];
  for (const ch of word) {
    if (isHebrewLetter(ch)) out.push({ text: ch, id: LETTER_ID[ch] });
    else if (out.length) out[out.length - 1].text += ch;
    else out.push({ text: ch, id: null });
  }
  return out;
}


/** Read the congregation setting from either settings shape. */
function congregationOf(settings) {
  return (settings && (settings.congregation ?? (typeof settings.get === 'function' ? settings.get('congregation') : undefined))) || 'sephardi';
}

export async function mount(root, ctx = /** @type {any} */ ({})) {
  const style = el('style', { id: 'crp-style' }); style.textContent = CSS;
  const wrap = el('section', { class: 'crp', 'aria-labelledby': 'view-title' });
  root.replaceChildren(style, wrap);
  wrap.append(el('h1', { id: 'view-title', tabindex: '-1' }, 'Read'), el('p', { role: 'status' }, 'Loading texts...'));

  let corpus;
  try { corpus = await loadCorpus(); }
  catch (err) {
    wrap.replaceChildren(el('h1', { id: 'view-title', tabindex: '-1' }, 'Read'), el('p', { class: 'crp-warn', role: 'alert' }, 'The text corpus could not be loaded. Check your connection, then reload the page.'));
    return () => {};
  }

  // optional transliteration engine (lane 3)
  /** @type {null | ((t:string, o:any)=>string)} */
  let translitFn = null;
  try { const m = await import('../pronunciation/transliterate.js'); if (typeof m.transliterate === 'function') translitFn = m.transliterate; } catch { /* absent: graceful fallback */ }

  const passages = [
    ...COMPOSITES.map((c) => ({ ...c, records: c.parts.map((p) => corpus.getText(p)).filter(Boolean) })),
    ...corpus.allTexts().filter((t) => !COMPOSITES.some((c) => c.parts.includes(t.id))).map((t) => ({ id: t.id, title: t.title, ref: t.ref, records: [t] })),
  ];
  // a part id (e.g. bless-priestly-1) opens the composite passage that contains it
  if (ctx.params?.textId && !passages.some((p) => p.id === ctx.params.textId)) {
    const comp = COMPOSITES.find((c) => c.parts.includes(ctx.params.textId));
    if (comp) ctx = { ...ctx, params: { ...ctx.params, textId: comp.id } };
  }
  if (ctx.params?.textId && !passages.some((p) => p.id === ctx.params.textId)) {
    wrap.replaceChildren(
      el('h1', { id: 'view-title', tabindex: '-1' }, 'Text not found'),
      el('p', {}, `There is no text called "${ctx.params.textId}". `, el('a', { class: 'btn', href: '#/read' }, 'Back to all texts')));
    return () => {};
  }
  const state = {
    tab: 'read',
    passageId: passages.some((p) => p.id === ctx.params?.textId) ? ctx.params.textId : passages[0].id,
    translit: true, english: true, ctlOpen: false,
    letters: /** @type {Set<string>} */ (new Set()),
    situation: corpus.situations()[0], register: 'all', gender: 'm', query: '',
  };
  let playGen = 0;   // latest single playback request
  let seq = 0;       // cancels a running 'Play all' sequence
  const unsubs = [];
  if (ctx.settings && typeof ctx.settings.subscribe === 'function') unsubs.push(ctx.settings.subscribe((_all, changed) => { if (changed.includes('congregation')) render(); }));

  const live = el('div', { class: 'crp-sr', role: 'status', 'aria-live': 'polite' });
  const status = el('p', { class: 'crp-status', role: 'status', 'aria-live': 'polite' });
  const say = (msg) => { status.textContent = msg; live.textContent = ''; setTimeout(() => { live.textContent = msg; }, 20); };

  async function playItem(kind, id, text, label, keepSeq = false) {
    if (!keepSeq) seq++;
    const gen = ++playGen;
    if (!ctx.audio || typeof ctx.audio.play !== 'function') { say('Audio is not available in this build.'); return; }
    try {
      const r = await ctx.audio.play(kind, id, { text });
      if (gen !== playGen) return;
      if (r && (r.source === 'none' || r.played === false || r.ok === false)) say(`No audio for ${label} (${r.reason || r.error || 'unavailable'}).`);
      else if (r && r.source === 'tts-fallback') say(`Playing ${label} with the browser voice (not a recorded voice).`);
      else say(`Played ${label}.`);
    } catch (e) { say(`Audio error: ${e?.message || e}`); }
  }

  function transliterateWord(word) {
    const trad = congregationOf(ctx.settings);
    try { return clipPhonetic(word, trad) || (translitFn ? translitFn(word, { scheme: 'siddur', tradition: trad }) : null); } catch { return null; }
  }

  // ---------- reader ----------
  function renderReader(host) {
    const p = passages.find((x) => x.id === state.passageId) || passages[0];
    const allHe = p.records.map((r) => r.he).join('\n');
    const inv = letterInventory(allHe);
    const trad = congregationOf(ctx.settings);

    const picker = el('select', { id: 'crp-pick', 'aria-label': 'Choose a text', onchange: (e) => { state.passageId = e.target.value; state.letters.clear(); render(); } },
      ...passages.map((x) => el('option', { value: x.id, selected: x.id === p.id ? '' : null }, `${x.title} (${x.ref})`)));
    const bar = el('div', { class: 'crp-bar' },
      el('label', { for: 'crp-pick' }, 'Text'), picker,
      el('label', {}, el('input', { type: 'checkbox', checked: state.translit ? '' : null, onchange: (e) => { state.translit = e.target.checked; render(); } }), `Transliteration (${trad})`),
      el('label', {}, el('input', { type: 'checkbox', checked: state.english ? '' : null, onchange: (e) => { state.english = e.target.checked; render(); } }), 'English'),
      el('button', { type: 'button', class: 'crp-play', onclick: () => playAll(p) }, 'Play all'));
    // Secondary controls (text picker, show/hide switches, Play all, letter highlights) sit in a closed details so the text is on the first screen of a phone.
    const ctl = el('details', { class: 'crp-ctl', open: state.ctlOpen ? '' : null, ontoggle: (e) => { state.ctlOpen = !!(e?.target?.open); } },
      el('summary', {}, 'Change text, show or hide, highlight letters'));
    host.append(el('h2', { id: 'crp-h' }, p.title), el('p', {}, el('strong', {}, p.ref), p.records.some((r) => r.language === 'aramaic') ? el('span', { class: 'crp-badge' }, 'Aramaic, not Hebrew') : null), ctl);
    ctl.append(bar);

    if (state.translit && !translitFn) ctl.append(el('p', { class: 'crp-warn' }, 'Transliteration needs src/pronunciation/transliterate.js, which is not available here.'));
    if (state.translit && translitFn) ctl.append(el('p', { class: 'crp-translit-note', role: 'note' }, 'Transliteration is a draft made by spelling rules, not checked by a native speaker. Sephardi is a Moroccan-adjacent reading, not a copy of Israeli. Stress is not marked, and some silent or vocal shvas may be wrong.'));
    if (!isAudioFree(ctx)) ctl.append(playbackSpeedControl(ctx, el));

    // letter highlight control
    const lettersBox = el('div', { class: 'crp-letters', role: 'group', 'aria-label': 'Highlight a letter: choose a letter name to mark every occurrence' });
    for (const id of inv.distinctLetterIds) {
      const n = inv.letters[id];
      lettersBox.append(el('button', { type: 'button', class: 'crp-ltr', 'aria-pressed': state.letters.has(id) ? 'true' : 'false', 'data-letter': id, title: `${n} time${n === 1 ? '' : 's'}`, onclick: () => toggleLetter(id, n) },
        heEl('span', LETTER_CHAR[id], 'he'), el('span', {}, LETTER_NAME[id]), el('small', {}, String(n))));
    }
    ctl.append(el('p', {}, el('strong', {}, 'Find the letters: '), 'tap a letter name to highlight it everywhere in the text.'), lettersBox,
      el('button', { type: 'button', class: 'crp-chip', onclick: () => { state.letters.clear(); applyHighlights(); syncLetterButtons(); say('Highlights cleared.'); } }, 'Clear highlights'));

    // text, line by line
    const textBox = el('div', { id: 'crp-text' });
    p.records.forEach((rec) => {
      const lines = rec.he.split('\n');
      const enLines = uiEnglish(ctx, String(rec.english)).split('\n');
      let wi = 0;
      const recWords = lines.flatMap((l) => l.split(/\s+/).filter((w) => /[א-ת]/.test(w)));
      const large = Array.isArray(rec.largeLetters) && rec.largeLetters.length ? largePositionsIn(recWords, rec.largeLetters) : [];
      lines.forEach((line, li) => {
        const words = line.split(/\s+/).filter((w) => /[א-ת]/.test(w));
        const row = el('div', { class: 'crp-line', dir: 'rtl', role: 'group', 'aria-label': `${rec.ref}${lines.length > 1 ? ' line ' + (li + 1) : ''}` });
        words.forEach((w) => {
          wi += 1;
          const idx = wi;
          const btn = el('button', { type: 'button', class: 'crp-w', lang: 'he', dir: 'rtl', 'aria-label': `${clusters(w).map((c) => c.text).join('')}: play word ${idx}`,
            onclick: (e) => playWord(e.currentTarget, rec, idx, w) });
          const bigLn = new Set(large.filter((l) => l.wi === idx - 1).map((l) => l.ln));
          let ln = -1;
          for (const c of clusters(w)) { if (c.id) ln++; btn.append(el('span', { class: 'crp-l' + (c.id && bigLn.has(ln) ? ' crp-lg' : ''), 'data-lid': c.id || '' }, c.text)); }
          const cell = el('span', { class: 'crp-cell' }, btn);
          if (state.translit) {
            const tr = transliterateWord(w);
            if (tr) cell.append(el('span', { class: 'crp-tr' }, tr), el('span', { class: 'crp-say', lang: 'en' }, ` Say it: ${englishSay(tr)}`));
          }
          if (state.english && rec.wordGlosses && rec.wordGlosses[idx - 1] && lines.length === 1) cell.append(el('span', { class: 'crp-gl' }, rec.wordGlosses[idx - 1]));
          row.append(cell);
        });
        const lineBtn = el('button', { type: 'button', class: 'crp-play', onclick: () => playLine(rec, li, line) }, `Play ${lines.length > 1 ? 'line ' + (li + 1) : 'line'}`);
        textBox.append(row, el('div', { class: 'crp-bar' }, lineBtn));
        if (state.english) textBox.append(el('p', { class: 'crp-en', lang: 'en' }, enLines.length === lines.length ? enLines[li] : (li === 0 ? enLines.join('\n') : '')));
      });
    });
    for (const rec of p.records) if (Array.isArray(rec.largeLetters) && rec.largeLetters.length) textBox.append(el('p', { class: 'crp-lgnote' }, `${p.records.length > 1 ? rec.ref + ': ' : ''}Written large in the source text: `, ...rec.largeLetters.flatMap((c, i) => [i ? ', ' : '', heEl('span', c, 'he')]), '.'));
    for (const rec of p.records) if (rec.variants?.f) textBox.append(el('p', {}, el('strong', {}, 'Women say: '), heEl('span', rec.variants.f.he, 'he'), el('span', { class: 'crp-badge' }, 'derived, needs check')));
    host.append(textBox, status);
    for (const rec of p.records) { const mb = metaBlock(rec); if (mb) host.append(el('h3', {}, p.records.length > 1 ? `About: ${rec.title}` : 'About this prayer'), mb); }

    // footer
    const foot = el('div', { class: 'crp-foot' });
    for (const r of p.records) {
      foot.append(el('p', {}, el('strong', {}, r.ref + ': '), `source ${r.source}; licence ${r.license}.`),
        el('p', {}, r.attribution),
        el('p', {}, `English: ${r.englishSource}.`, r.status === 'verified' && r.proofread === false ? ' Text matches its cited source but has NOT been proofread by a Hebrew educator.' : ' Text still needs checking against its source.'),
        ...(r.notes ? [el('p', {}, r.notes)] : []));
    }
    foot.append(el('p', {}, 'Transliteration and audio are learning aids; recorded voices are not yet available, so playback may use the browser voice.'));
    host.append(foot);
    applyHighlights();
  }

  function toggleLetter(id, n) {
    if (state.letters.has(id)) state.letters.delete(id); else state.letters.add(id);
    applyHighlights(); syncLetterButtons();
    say(state.letters.has(id) ? `${LETTER_NAME[id]} highlighted, ${n} occurrence${n === 1 ? '' : 's'}.` : `${LETTER_NAME[id]} highlight removed.`);
  }
  function syncLetterButtons() {
    wrap.querySelectorAll('.crp-ltr').forEach((b) => b.setAttribute('aria-pressed', state.letters.has(b.getAttribute('data-letter')) ? 'true' : 'false'));
  }
  function applyHighlights() {
    wrap.querySelectorAll('.crp-l').forEach((s) => {
      const id = s.getAttribute('data-lid');
      s.classList.toggle('crp-hl', !!id && state.letters.has(id));
    });
  }

  async function playWord(btn, rec, idx, word) {
    btn.setAttribute('data-playing', 'true');
    const spoken = speechText(word);
    await playItem('word', `${rec.id}-w${idx}`, spoken, `word ${idx}`);
    btn.removeAttribute('data-playing');
  }
  async function playLine(rec, li, line, keepSeq = false) {
    const lines = rec.he.split('\n');
    const text = speechText(line);
    await playItem('line', lines.length === 1 ? rec.id : `${rec.id}-l${li + 1}`, text, `${rec.ref}${lines.length > 1 ? ' line ' + (li + 1) : ''}`, keepSeq);
  }
  async function playAll(p) {
    const mine = ++seq;
    for (const rec of p.records) {
      const lines = rec.he.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (mine !== seq) return;
        await playLine(rec, i, lines[i], true);
      }
    }
  }

  // ---------- Torah-service guide ----------
  const passageOf = (id) => { const t = corpus.getText(id); return t ? (passages.find((p) => p.records.some((r) => r.id === t.id)) ?? null) : null; };
  function openPrayer(id) {
    const p = passageOf(id); if (!p) return;
    state.passageId = p.id; state.letters.clear(); state.tab = 'read'; render();
    wrap.querySelector('#crp-h')?.scrollIntoView?.();
  }
  function prayerLink(pr) {
    const t = corpus.getText(pr.id);
    return el('button', { type: 'button', class: 'crp-lnk', 'data-prayer': pr.id, onclick: () => openPrayer(pr.id) },
      el('strong', {}, t ? t.title : pr.id), pr.role ? ` (${pr.role})` : '');
  }
  function renderGuide(host) {
    const g = corpus.guide();
    host.append(el('h2', { id: 'crp-h' }, g.title), el('p', {}, g.subtitle),
      el('p', { class: 'crp-warn' }, (String(g.note).match(/^.*?NOT been reviewed[^.]*\./) || [String(g.note)])[0] + ' Orders and customs differ between Orthodox, Conservative, Reform, Sephardi and Mizrahi communities.'), el('p', {}, g.approximateLength), el('p', {}, g.scrollNote));
    const ol = el('ol', { class: 'crp-guide', 'aria-label': 'Order of the Shabbat morning service' });
    for (const s of g.sections.slice().sort((a, b) => a.order - b.order)) {
      const li = el('li', { id: `crp-sec-${s.id}`, class: 'crp-sec' },
        el('h3', {}, s.title, ' ', s.hebrewName ? heEl('span', s.hebrewName, 'he') : null),
        el('p', {}, s.whatHappens), el('p', {}, el('strong', {}, 'Your part: '), s.yourPart));
      if (s.prayers?.length) li.append(el('div', { role: 'group', 'aria-label': `Prayers in ${s.title}` }, ...s.prayers.map(prayerLink)));
      const gapNames = (s.gaps || []).map((id) => corpus.gap(id)?.name).filter(Boolean);
      if (gapNames.length) li.append(el('p', { class: 'crp-gl' }, 'Not in this app yet: ' + gapNames.join('; ') + '.'));
      if (s.howCongregationsDiffer) li.append(el('p', { class: 'crp-gl' }, 'Customs differ: ' + s.howCongregationsDiffer));
      ol.append(li);
    }
    host.append(ol);
    if (g.otherOccasions?.length) {
      host.append(el('h3', {}, 'Other occasions'));
      for (const o of g.otherOccasions) host.append(el('div', { class: 'crp-sec' }, el('h4', {}, o.title),
        el('div', { role: 'group', 'aria-label': o.title }, ...o.prayers.map((id) => prayerLink({ id })))));
    }
  }

  // per-prayer metadata (where it falls in the service, who says it, how movements differ)
  function metaBlock(rec) {
    const m = corpus.prayerMeta(rec.id); if (!m) return null;
    const dl = el('dl', { class: 'crp-meta' });
    const add = (k, v) => { if (v && v !== 'unknown') dl.append(el('dt', {}, k), el('dd', {}, v)); };
    add('In plain English', m.whatItSays); add('Where in the service', m.whereInService); add('How it is said', [m.delivery, m.leaderOrCongregation].filter((x) => x && x !== 'unknown').join('; '));
    const d = m.denominations || {};
    const dn = ['orthodox', 'conservative', 'reform'].filter((k) => d[k] && d[k].use !== 'unknown').map((k) => `${k[0].toUpperCase() + k.slice(1)}: ${d[k].use}${d[k].note ? ' - ' + d[k].note : ''}`);
    add('Movements', dn.join(' | '));
    const vl = versionLabel(m); if (vl.oneVersion) dl.append(el('dt', {}, 'Version'), el('dd', { class: 'crp-version' }, vl.text));
    add('Note', m.note);
    dl.append(el('dt', {}, 'Review'), el('dd', {}, m.clergyReviewed ? 'Reviewed by clergy.' : 'Written by the model; not reviewed by a rabbi, cantor or educator.'));
    return dl;
  }

  // ---------- phrasebook ----------
  function renderPhrasebook(host) {
    const sits = corpus.situations();
    const bar = el('div', { class: 'crp-bar' },
      el('label', { for: 'crp-sit' }, 'Situation'),
      el('select', { id: 'crp-sit', onchange: (e) => { state.situation = e.target.value; state.query = ''; render(); } },
        ...sits.map((s) => el('option', { value: s, selected: s === state.situation ? '' : null }, s))),
      el('label', { for: 'crp-reg' }, 'Register'),
      el('select', { id: 'crp-reg', onchange: (e) => { state.register = e.target.value; render(); } },
        ...['all', 'neutral', 'formal', 'slang'].map((r) => el('option', { value: r, selected: r === state.register ? '' : null }, r))),
      el('label', { for: 'crp-gen' }, 'Speaking to / as'),
      el('select', { id: 'crp-gen', onchange: (e) => { state.gender = e.target.value; render(); } },
        el('option', { value: 'm', selected: state.gender === 'm' ? '' : null }, 'masculine forms'), el('option', { value: 'f', selected: state.gender === 'f' ? '' : null }, 'feminine forms')),
      el('label', {}, el('input', { type: 'checkbox', checked: state.translit ? '' : null, onchange: (e) => { state.translit = e.target.checked; render(); } }), 'Transliteration'),
      el('label', { for: 'crp-q', class: 'crp-sr' }, 'Search phrases'),
      el('input', { id: 'crp-q', type: 'search', placeholder: 'Search (English, Hebrew, transliteration)', value: state.query, oninput: (e) => { state.query = e.target.value; clearTimeout(qT); qT = setTimeout(() => { render(); const q = wrap.querySelector('#crp-q'); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }, 250); } }));
    host.append(el('h2', {}, 'Survival phrasebook'),
      el('p', { class: 'crp-warn' }, 'Written for this app and not yet reviewed by a native speaker. Slang and register labels especially need review. Where masculine and feminine forms differ, switch the forms above.'), bar);
    let list = state.query.trim() ? corpus.search(state.query).filter((r) => r.type === 'phrase').map((r) => r.item) : corpus.bySituation(state.situation);
    if (state.register !== 'all') list = list.filter((p) => p.register === state.register);
    host.append(el('p', { 'aria-live': 'polite' }, `${list.length} phrase${list.length === 1 ? '' : 's'}`));
    for (const p of list) {
      const f = p.forms ? p.forms[state.gender] : null;
      const he = f ? f.he : p.he; const tr = f ? f.translit : p.translit;
      const card = el('div', { class: 'crp-card' },
        heEl('div', he, 'crp-he'),
        el('div', { class: 'meta' }, el('div', {}, el('strong', {}, p.en), el('span', { class: 'crp-badge' }, p.register), p.register === 'slang' ? el('span', { class: 'crp-badge' }, 'native review needed') : null),
          state.translit ? el('div', { class: 'crp-tr' }, tr) : null,
          p.notes ? el('div', { class: 'crp-gl' }, p.notes) : null),
        isAudioFree(ctx) ? null : el('button', { type: 'button', class: 'crp-play', 'aria-label': `Play: ${p.en}`, onclick: () => playItem(/\s/.test(he) ? 'line' : 'word', p.gendered ? `${p.id}-${state.gender}` : p.id, he, p.en) }, 'Play'));
      host.append(card);
    }
    host.append(status);
  }
  let qT = 0;

  // ---------- shell ----------
  function render() {
    const keepFocus = document.activeElement?.id;
    const host = el('div');
    const tabs = el('div', { class: 'crp-tabs', role: 'tablist', 'aria-label': 'Reader sections' },
      ...[['read', 'Prayers and Torah'], ...(corpus.guide() ? [['guide', 'Torah service guide']] : []), ['phrasebook', 'Phrasebook']].map(([k, label]) =>
        el('button', { type: 'button', role: 'tab', class: 'crp-tab', id: `crp-tab-${k}`, 'aria-selected': state.tab === k ? 'true' : 'false', 'aria-controls': 'crp-panel', tabindex: state.tab === k ? '0' : '-1',
          onclick: () => { state.tab = k; render(); },
          onkeydown: (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const ks = [...tabs.querySelectorAll('[role=tab]')].map((b) => b.id.slice(8)); const d = e.key === 'ArrowRight' ? 1 : -1; state.tab = ks[(ks.indexOf(state.tab) + d + ks.length) % ks.length]; render(); wrap.querySelector(`#crp-tab-${state.tab}`)?.focus(); } } }, label)));
    const panel = el('div', { id: 'crp-panel', role: 'tabpanel', 'aria-labelledby': `crp-tab-${state.tab}` });
    if (state.tab === 'read') renderReader(panel); else if (state.tab === 'guide') renderGuide(panel); else renderPhrasebook(panel);
    wrap.replaceChildren(el('h1', { id: 'view-title', tabindex: '-1' }, 'Read'), silentReadingNode(el, ctx), tabs, panel, live);
    if (keepFocus) wrap.querySelector('#' + CSS_escape(keepFocus))?.focus();
  }
  const CSS_escape = (s) => (globalThis.CSS?.escape ? globalThis.CSS.escape(s) : s.replace(/[^\w-]/g, '\\$&'));
  render();

  return () => {
    playGen++; seq++;
    clearTimeout(qT);
    for (const u of unsubs) { try { u(); } catch { /* ignore */ } }
    try { ctx.audio?.stop?.(); } catch { /* ignore */ }
    root.replaceChildren();
  };
}
