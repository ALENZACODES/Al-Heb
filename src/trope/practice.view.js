/**
 * Trope families and per-aliyah practice (lane 6, points plan #13). DRAFT, unreviewed.
 *   #/trope/families         the trope families as lessons (the table's strength groups, then the joining marks)
 *   #/trope/families/<id>    one family: each sign, its name, and example words from real verses
 *   #/trope/aliyah           pick a portion and an aliyah, then step phrase by phrase (phrases end at the stopping marks)
 * No melody is played or made: the app has no melody recordings, and every sign says so. The verse button plays the app's
 * existing verse recording. The four-letter name is shown as ה׳ and never voiced. ctx extras for tests: ctx.tropeLoad(rel), ctx.now().
 */
import { el, heText, storeGet, storeSet } from '../curriculum/dom.js';
import { loadJSON } from '../curriculum/data.js';
import { systemFor } from './model.js';
import { TROPE_NOTE, NO_MELODY, PRACTICE_KEY, families, signName, signHe, rowsById, collectExamples, allChapters, versesInRange, practiceUnits, phraseSteps, normalisePractice } from './families.js';
import { showName } from '../games/tg-core.js';
import { speechText } from '../shell/names.js';
import { TABLE_FILE, TORAH_INDEX_FILE, torahChapterFile } from '../torahreader/loader.js';
import { portionsForCalendarIds, torahVerseId } from '../torahreader/model.js';
import { parshaOnShabbat } from '../curriculum/calendar.parsha.js';
import { saturdayOnOrAfter } from '../curriculum/calendar.js';
import { CAL_PREFS_KEY, normalizePrefs } from '../curriculum/calendar.locations.js';
import { playLine } from '../pronunciation/forTradition.js';
import { isAudioFree } from '../shell/audiofree.js';

export const PLACEMENT_TEXT = { impositive: 'Written on the stressed syllable.', postpositive: 'Written on the last letter of the word.', prepositive: 'Written on the first letter of the word.' };
const FIRST_CHAPTERS = 3; // Genesis 1 to 3 give examples of most signs; the rest are searched on request.

/** @param {HTMLElement} root @param {any} ctx */
export function mount(root, ctx) {
  const q = ctx?.query || {};
  const load = typeof ctx?.tropeLoad === 'function' ? ctx.tropeLoad : loadJSON;
  const wrap = el('section', { class: 'alef-trope alef-trope-practice', 'aria-labelledby': 'view-title' });
  const h1 = el('h1', { id: 'view-title', tabindex: '-1' }, q.sec === 'aliyah' ? 'Trope Practice by Aliyah' : 'Trope Families');
  const body = el('div', {});
  const status = el('p', { role: 'status', 'aria-live': 'polite' });
  wrap.append(h1, el('p', { class: 'draft-flag', role: 'note' }, TROPE_NOTE), body, status,
    el('footer', {}, el('p', {}, 'Hebrew text with cantillation: Unicode/XML Leningrad Codex (UXLC), Tanach.us Inc., copy without restriction.')));
  root.append(wrap);
  let alive = true, table = null, index = null, system = 'sephardi';
  const say = (t) => { status.textContent = t; };
  const set = (...n) => body.replaceChildren(...n.flat().filter(Boolean));
  const btn = (label, onclick, extra = {}) => el('button', { type: 'button', class: 'btn', onclick, ...extra }, label);
  const chapterCache = new Map();
  const chapter = (book, n) => { const k = `${book}-${n}`; if (!chapterCache.has(k)) chapterCache.set(k, load(torahChapterFile(book, n))); return chapterCache.get(k); };
  const nameOf = (row) => signName(row, system);
  const glyph = (row) => heText('◌' + row.char, 'alef-he tp-glyph');

  // ---------- families ----------
  function list() {
    const fams = families(table);
    set(el('p', {}, 'Each lesson is one group of signs from the app’s trope table, with words from real verses. The stopping marks are grouped by strength; the joining marks lead into them.'),
      el('ol', {}, ...fams.map((f) => el('li', {}, el('a', { href: `#/trope/families/${f.id}` }, f.title), ` (${f.signs.length} signs): ${f.help}`))),
      el('p', {}, el('a', { class: 'btn secondary', href: '#/trope/aliyah' }, 'Practice an aliyah phrase by phrase'), ' ', el('a', { class: 'btn secondary', href: '#/trope' }, 'Name the mark quiz')),
      el('p', { class: 'muted' }, `Names: ${system === 'ashkenazi' ? 'Ashkenazi' : 'Sephardi/Mizrahi'}, from your pronunciation setting.`));
  }

  async function family(id) {
    const fam = families(table).find((f) => f.id === id);
    if (!fam) { set(el('p', { role: 'alert' }, 'There is no such lesson.'), el('a', { href: '#/trope/families' }, 'All trope families')); return; }
    const order = allChapters(index);
    let cursor = 0;
    const found = new Map(), boxes = new Map();
    const scan = async (n, wanted, max = 3) => {
      const chs = [];
      for (let i = 0; i < n && cursor < order.length; i++, cursor++) chs.push(await chapter(order[cursor].book, order[cursor].chapter));
      collectExamples(chs.map((c) => ({ ...c, ref: c.ref || `${c.book} ${c.chapter}` })), table, wanted, max, found);
    };
    const ids = fam.signs.map((s) => s.id);
    await scan(FIRST_CHAPTERS, ids);
    if (!alive) return;
    const signBox = (row) => {
      const ex = found.get(row.id) || [];
      const other = system === 'ashkenazi' ? row.sephardi : row.ashkenazi;
      const searched = cursor >= order.length ? 'the whole Torah' : `${cursor} of ${order.length} chapters`;
      const box = el('li', { class: 'card tp-sign', 'data-sign': row.id },
        el('h3', {}, glyph(row), ' ', nameOf(row), signHe(row, system) ? [' ', heText(signHe(row, system))] : null),
        other && other !== nameOf(row) ? el('p', { class: 'muted' }, `Also called ${other}.`) : null,
        el('p', {}, PLACEMENT_TEXT[row.placement] || '', row.note ? ` Note from the table: ${row.note}.` : ''),
        el('p', { class: 'tp-melody' }, `Melody: ${NO_MELODY}.`),
        ex.length ? el('ul', { class: 'tp-examples' }, ...ex.map((e) => el('li', {}, heText(showName(e.text), 'alef-he tp-word'), ` ${e.ref}`)))
          : el('p', { class: 'muted' }, `No example yet in ${searched}.`),
        ex.length < 3 && cursor < order.length ? btn('Find more examples', async () => {
          say(`Searching for ${nameOf(row)}...`);
          while ((found.get(row.id) || []).length < 3 && cursor < order.length && alive) await scan(10, [row.id]);
          if (!alive) return;
          const n = (found.get(row.id) || []).length;
          say(n ? `Found ${n} example${n === 1 ? '' : 's'} of ${nameOf(row)}.` : `${nameOf(row)} does not occur in the Torah text as the app’s table encodes it.`);
          const old = boxes.get(row.id), fresh = signBox(row); old.replaceWith(fresh);
        }, { class: 'btn secondary' }) : null);
      boxes.set(row.id, box);
      return box;
    };
    set(el('p', {}, el('a', { href: '#/trope/families' }, 'All trope families')), el('h2', {}, fam.title), el('p', {}, fam.help),
      el('ol', { class: 'tp-signs' }, ...fam.signs.map(signBox)),
      el('p', { class: 'muted' }, 'Examples are the first words found in reading order, starting at Genesis 1. Words with the four-letter name are skipped.'));
  }

  // ---------- per-aliyah practice ----------
  async function aliyah() {
    const portions = index?.parshiyot || [];
    if (!portions.length) { set(el('p', { role: 'alert' }, 'The portion list could not be loaded.')); return; }
    let saved = normalisePractice(await storeGet(ctx, PRACTICE_KEY, null));
    let week = null;
    try {
      const now = typeof ctx?.now === 'function' ? ctx.now() : new Date();
      const prefs = normalizePrefs(await storeGet(ctx, CAL_PREFS_KEY, null));
      const res = parshaOnShabbat(saturdayOnOrAfter({ y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() }), { israel: prefs.parshaSchedule === 'israel' });
      week = res ? portionsForCalendarIds(index, res.ids)[0] || null : null;
    } catch { week = null; }
    let portion = portions.find((p) => p.id === saved.parsha) || week || portions[0];
    let units = practiceUnits(index, portion);
    let unit = units.find((u) => u.id === saved.unit) || units[0];
    let steps = [], step = 0, texts = new Map();
    const keep = () => storeSet(ctx, PRACTICE_KEY, { v: 1, parsha: portion.id, unit: unit.id, step });

    async function loadUnit(startAt = 0) {
      set(el('p', {}, 'Loading the verses...'));
      const verses = versesInRange(index, unit.from, unit.to);
      const need = [...new Set(verses.map((v) => `${v.book}|${v.chapter}`))];
      const chs = await Promise.all(need.map((k) => { const [b, c] = k.split('|'); return chapter(b, Number(c)); }));
      if (!alive) return;
      texts = new Map();
      chs.forEach((c, i) => { const [b, n] = need[i].split('|'); for (const v of c.verses || []) texts.set(`${b}|${n}|${v.n}`, { trope: v.heTrope, he: v.he, ref: `${c.ref}:${v.n}` }); });
      steps = phraseSteps(verses, (b, c, v) => texts.get(`${b}|${c}|${v}`)?.trope, table);
      step = Math.max(0, Math.min(steps.length - 1, startAt));
      draw();
    }
    const byId = rowsById(table);
    function picker() {
      const sel = el('select', { id: 'tp-parsha', onchange: (e) => { portion = portions.find((p) => p.id === e.target.value) || portion; units = practiceUnits(index, portion); unit = units[0]; keep(); loadUnit(0); } },
        ...(index.books || []).map((b) => el('optgroup', { label: b.en }, ...portions.filter((p) => p.book === b.id).map((p) => el('option', { value: p.id, selected: p.id === portion.id ? '' : null }, `${p.en}${week && p.id === week.id ? ' (this week)' : ''}`)))));
      const usel = el('select', { id: 'tp-unit', onchange: (e) => { unit = units.find((u) => u.id === e.target.value) || unit; keep(); loadUnit(0); } },
        ...units.map((u) => el('option', { value: u.id, selected: u.id === unit.id ? '' : null }, `${u.label}: ${u.from.chapter}:${u.from.verse} to ${u.to.chapter}:${u.to.verse}`)));
      return el('div', { class: 'tp-pick' }, el('label', { for: 'tp-parsha' }, 'Portion'), sel, el('label', { for: 'tp-unit' }, portion.aliyot?.length ? 'Aliyah' : 'Chapter'), usel,
        week ? el('p', { class: 'muted' }, `This week’s portion: ${week.en}.`) : null);
    }
    async function listen(s) {
      const t = texts.get(`${s.book}|${s.chapter}|${s.verse}`);
      if (!ctx?.audio?.play) { say(`No audio for ${t.ref}: this build has no audio player.`); return; }
      try { try { ctx.audio.stop?.(); } catch { /* ignore */ } const r = await ctx.audio.play('line', torahVerseId(s.book, s.chapter, s.verse), { text: speechText(t.he), tradition: 'israeli' }); if (alive) say(playLine(r, 'israeli', `${t.ref} (the spoken verse recording, not a chant)`)); }
      catch (e) { say(`Audio error for ${t.ref}: ${e?.message || e}`); }
    }
    function draw() {
      if (!steps.length) { set(picker(), el('p', { role: 'alert' }, 'No verses found for this choice.')); return; }
      const s = steps[step], t = texts.get(`${s.book}|${s.chapter}|${s.verse}`);
      const words = s.tokens.map((tk) => el('li', { class: 'tp-tok' }, heText(showName(tk.text.replace(/׃/g, '')), 'alef-he tp-word'),
        el('span', { class: 'muted tp-marks' }, tk.marks.length ? tk.marks.map((id) => nameOf(byId.get(id))).join(', ') : 'no named mark')));
      set(picker(),
        el('h2', {}, `${t.ref}, phrase ${s.n + 1} of ${s.of}`),
        el('p', { class: 'muted' }, `Step ${step + 1} of ${steps.length} in ${unit.label.toLowerCase()} of ${portion.en}. Phrases end at the stopping marks.`),
        el('ol', { class: 'tp-phrase', dir: 'rtl', lang: 'he' }, ...words),
        el('p', { class: 'tp-melody' }, `Melody for this phrase: ${NO_MELODY}.`),
        el('div', { class: 'row' },
          btn('Previous phrase', () => { step -= 1; keep(); draw(); }, { disabled: step <= 0 ? '' : null, class: 'btn secondary', id: 'tp-prev' }),
          btn('Next phrase', () => { step += 1; keep(); draw(); }, { disabled: step >= steps.length - 1 ? '' : null, id: 'tp-next' }),
          isAudioFree(ctx) ? null : btn('Listen to the whole verse', () => listen(s), { class: 'btn secondary', id: 'tp-listen' })),
        el('details', {}, el('summary', {}, 'The whole verse'), el('p', {}, heText(showName(t.trope), 'alef-he'))),
        el('p', { class: 'muted' }, 'Sign names come from the app’s table. A mark the table does not list is shown as "no named mark".'));
    }
    await loadUnit(saved.parsha === portion.id && saved.unit === unit.id ? saved.step : 0);
  }

  (async () => {
    try {
      [table, index] = await Promise.all([load(TABLE_FILE), load(TORAH_INDEX_FILE)]);
      system = systemFor(ctx?.settings?.get?.('congregation'));
      if (!alive) return;
      if (q.sec === 'aliyah') await aliyah();
      else if (q.id) await family(String(q.id));
      else list();
    } catch { if (alive) set(el('p', { role: 'alert' }, 'The trope data could not be loaded. Check your connection and reload; nothing was lost.')); }
  })();
  return () => { alive = false; wrap.remove?.(); };
}
