// @ts-check
/**
 * Trope Melody (#/trope/melody, idea M2): hear a draft melody for each cantillation mark, or for a whole verse, as plain tones made
 * on this device from the marks in the text. One tradition (Ashkenazi Torah reading). The draft label stays on screen until a
 * cantor has checked every pattern in data/trope-trainer/melody-ashkenazi.json. No words are sung, so the Name is never voiced;
 * it is shown as ה׳. Query: ?book=genesis&chapter=1&verse=1. ctx extras for tests: ctx.chantLoad(rel), ctx.chantPlay(schedule, opts).
 */
import { el, heText } from '../curriculum/dom.js';
import { loadJSON } from '../curriculum/data.js';
import { showName } from '../games/tg-core.js';
import { uiEnglish } from '../shell/names.js';
import { isAudioFree, AUDIO_FREE_NOTE } from '../shell/audiofree.js';
import { TABLE_FILE, TORAH_INDEX_FILE, torahChapterFile } from '../torahreader/loader.js';
import { MELODY_FILE, TONES_NOTE, ONE_TRADITION_NOTE, TEMPOS, validateMelody, draftLabel, legendRows, scheduleVerse, scheduleMark } from './melody.js';
import { play, canPlay } from './synth.js';

const CSS = `
.alef-chant{max-inline-size:40rem;margin-inline:auto;overflow-wrap:anywhere}
.alef-chant *{box-sizing:border-box;max-inline-size:100%}
.alef-chant .ch-draft{border:2px solid #b8962e;border-radius:10px;padding:.5rem .75rem;font-weight:700;margin-block:.5rem}
.alef-chant .ch-verse{font-size:2rem;line-height:2;text-align:center;margin-block:.5rem}
.alef-chant .ch-w{padding:0 .15em;border-radius:6px}
.alef-chant .ch-w[data-on="1"]{background:#b8962e;color:#16301c}
.alef-chant .ch-row{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;margin-block:.5rem}
.alef-chant button.btn,.alef-chant select,.alef-chant input{min-block-size:var(--tap,48px);font:inherit}
.alef-chant input[type=number]{inline-size:5rem}
.alef-chant ul.ch-marks{list-style:none;margin:0;padding:0;display:grid;gap:.5rem}
.alef-chant ul.ch-marks li{border:1px solid var(--border,#999);border-radius:10px;padding:.5rem .75rem}
.alef-chant .ch-glyph{font-size:1.6rem;margin-inline-end:.4rem}
.alef-chant .muted,.alef-chant details{font-size:.9rem;color:var(--muted,#555)}
.alef-chant details.ch-src{font-size:.75rem;opacity:.7}
`;
function injectStyle() {
  try { if (!document.head || document.getElementById?.('alef-chant-style')) return; const s = document.createElement('style'); s.id = 'alef-chant-style'; s.textContent = CSS; document.head.append(s); } catch { /* optional */ }
}

/** @param {HTMLElement} root @param {any} ctx @returns {() => void} unmount */
export function mount(root, ctx) {
  injectStyle();
  const load = typeof ctx?.chantLoad === 'function' ? ctx.chantLoad : loadJSON;
  const start = typeof ctx?.chantPlay === 'function' ? ctx.chantPlay : play;
  const q = ctx?.query || {};
  const wrap = el('section', { class: 'alef-chant', 'aria-labelledby': 'view-title' });
  const h1 = el('h1', { id: 'view-title', tabindex: '-1' }, 'Trope Melody');
  const draft = el('p', { class: 'ch-draft', role: 'note', id: 'ch-draft' }, '');
  const body = el('div', {});
  const status = el('p', { role: 'status', 'aria-live': 'polite' });
  wrap.append(h1, draft, body, status);
  root.append(wrap);

  let alive = true, table = null, index = null, melody = null, current = null, tempo = 1;
  let where = { book: String(q.book || 'genesis'), chapter: Number(q.chapter) || 1, verse: Number(q.verse) || 1 };
  const say = (t) => { status.textContent = t; };
  const stop = () => { try { current?.stop(); } catch { /* ignore */ } current = null; };
  const quiet = isAudioFree(ctx);
  const able = !quiet && (typeof ctx?.chantPlay === 'function' || canPlay());

  function run(schedule, label, onWord) {
    stop();
    const p = start(schedule, { onWord });
    current = p;
    say(`Playing ${label}.`);
    p.done.then((how) => { if (alive && current === p) { current = null; say(how === 'ended' ? `Finished ${label}.` : 'Stopped.'); } });
  }

  function marksSection() {
    const rows = legendRows(table, melody);
    return el('section', { 'aria-labelledby': 'ch-h-marks' },
      el('h2', { id: 'ch-h-marks' }, 'Hear One Mark'),
      el('p', { class: 'muted' }, 'Each mark has its own short motif. Some joining marks change with the stop they lead into; the button plays the usual form.'),
      el('ul', { class: 'ch-marks' }, ...rows.map(({ id, row, pattern }) => el('li', { 'data-mark': id },
        heText('◌' + row.char, 'alef-he ch-glyph'), el('strong', {}, row.ashkenazi), row.ashkenaziHe ? [' ', heText(row.ashkenaziHe)] : null,
        el('div', { class: 'muted' }, pattern.note || ''),
        able ? el('div', { class: 'ch-row' }, el('button', { type: 'button', class: 'btn secondary', 'data-hear': id, onclick: () => run(scheduleMark(melody, id, { tempo }), `the draft motif for ${row.ashkenazi}`, null) }, `Hear ${row.ashkenazi}`)) : null))));
  }

  async function verseSection() {
    const book = (index.books || []).find((b) => b.id === where.book) || index.books[0];
    const chapter = Math.min(Math.max(1, where.chapter), book.chapterVerses.length);
    const verse = Math.min(Math.max(1, where.verse), book.chapterVerses[chapter - 1]);
    where = { book: book.id, chapter, verse };
    const sec = el('section', { 'aria-labelledby': 'ch-h-verse' }, el('h2', { id: 'ch-h-verse' }, 'Hear a Verse'));
    let ch;
    try { ch = await load(torahChapterFile(book.id, chapter)); } catch { sec.append(el('p', { role: 'alert' }, 'This chapter did not load. Check the connection and try again.')); return sec; }
    const v = (ch.verses || []).find((x) => x.n === verse);
    if (!v) { sec.append(el('p', { role: 'alert' }, 'That verse is not in the text.')); return sec; }
    const sched = scheduleVerse(v.heTrope, table, melody, { tempo });
    const spans = sched.tokens.map((tk, i) => el('span', { class: 'ch-w', 'data-w': String(i) }, showName(tk.text.replace(/׃/g, ''))));
    const line = el('p', { class: 'alef-he ch-verse', dir: 'rtl', lang: 'he' }, ...spans.flatMap((s, i) => (i ? [' ', s] : [s])));
    const onWord = (i) => { spans.forEach((s, k) => { s.setAttribute('data-on', k === i ? '1' : '0'); }); };
    const ref = `${book.en} ${chapter}:${verse}`;
    const bookSel = el('select', { id: 'ch-book', 'aria-label': 'Book' }, ...(index.books || []).map((b) => el('option', { value: b.id, selected: b.id === book.id }, b.en)));
    bookSel.value = book.id;
    const chIn = el('input', { type: 'number', id: 'ch-chapter', min: '1', max: String(book.chapterVerses.length), value: String(chapter), 'aria-label': 'Chapter' });
    const vIn = el('input', { type: 'number', id: 'ch-verse', min: '1', max: String(book.chapterVerses[chapter - 1]), value: String(verse), 'aria-label': 'Verse' });
    const go = (w) => { stop(); where = w; paint(); };
    const read = (n, fallback) => { const x = Number(n.value ?? n.getAttribute?.('value')); return Number.isFinite(x) && x >= 1 ? Math.floor(x) : fallback; };
    sec.append(
      el('p', {}, el('strong', {}, ref), v.en ? ` ${uiEnglish(ctx, v.en)}` : ''),
      line,
      able ? el('div', { class: 'ch-row' },
        el('button', { type: 'button', class: 'btn', id: 'ch-play', onclick: () => run(scheduleVerse(v.heTrope, table, melody, { tempo }), `the draft melody for ${ref}`, onWord) }, 'Play the Draft Melody'),
        el('button', { type: 'button', class: 'btn secondary', id: 'ch-stop', onclick: () => { stop(); onWord(-1); say('Stopped.'); } }, 'Stop'),
        ...TEMPOS.map((t) => el('button', { type: 'button', class: 'btn secondary', 'aria-pressed': String(t.tempo === tempo), 'data-tempo': t.id, onclick: () => { tempo = t.tempo; stop(); paint(); } }, t.label))) : null,
      el('div', { class: 'ch-row' }, bookSel, chIn, vIn,
        el('button', { type: 'button', class: 'btn secondary', id: 'ch-go', onclick: () => go({ book: bookSel.value || book.id, chapter: read(chIn, chapter), verse: read(vIn, verse) }) }, 'Show This Verse'),
        el('button', { type: 'button', class: 'btn secondary', id: 'ch-next', onclick: () => go(verse < book.chapterVerses[chapter - 1] ? { book: book.id, chapter, verse: verse + 1 } : { book: book.id, chapter: chapter < book.chapterVerses.length ? chapter + 1 : 1, verse: 1 }) }, 'Next Verse')),
      el('p', { class: 'muted' }, el('a', { href: `#/torahreader?book=${book.id}&chapter=${chapter}&verse=${verse}` }, 'Open this verse in the Torah reader'), ' · ', el('a', { href: '#/trope' }, 'Name the Mark quiz'), ' · ', el('a', { href: '#/trope/families' }, 'Trope Families')));
    return sec;
  }

  async function paint() {
    const v = await verseSection();
    if (!alive) return;
    body.replaceChildren(
      el('p', {}, TONES_NOTE), el('p', {}, ONE_TRADITION_NOTE),
      quiet ? el('p', { role: 'note' }, AUDIO_FREE_NOTE) : able ? null : el('p', { role: 'note' }, 'This browser cannot make tones, so the buttons are left out. The marks and their descriptions are below.'),
      v, marksSection(),
      el('details', { class: 'ch-src' }, el('summary', {}, 'About This Melody'), el('p', {}, melody.provenance || ''),
        el('ul', {}, ...[...new Set(Object.values(melody.patterns).map((p) => p.source))].map((s) => el('li', {}, s)))));
  }

  (async () => {
    body.replaceChildren(el('p', {}, 'Loading the marks...'));
    try {
      [table, index, melody] = await Promise.all([load(TABLE_FILE), load(TORAH_INDEX_FILE), load(MELODY_FILE)]);
      const errs = validateMelody(melody, table);
      if (errs.length) throw new Error(errs[0]);
    } catch {
      if (alive) body.replaceChildren(el('p', { role: 'alert' }, 'The melody data could not be loaded. Check your connection and reload; nothing was lost.'));
      return;
    }
    if (!alive) return;
    draft.textContent = draftLabel(melody);
    await paint();
  })();
  return () => { alive = false; stop(); };
}
