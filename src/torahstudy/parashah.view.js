// @ts-check
// This Week's Parashah (#/parashah, E4): opens on the portion for the coming Shabbat, computed by the app's calendar code from the
// date (diaspora or Israel schedule from the calendar settings), lists its aliyot with a link into the Torah reader at each one,
// and keeps a weekly goal with sections the learner marks as read. Marks are self-reported and stay on this device.
import { h, heSpan } from '../shell/ui.js';
import { parshaOnShabbat } from '../curriculum/calendar.parsha.js';
import { saturdayOnOrAfter } from '../curriculum/calendar.js';
import { CAL_PREFS_KEY, normalizePrefs, resolveLocation } from '../curriculum/calendar.locations.js';
import { portionsForCalendarIds } from '../torahreader/model.js';
import { WEEK_KEY, GOALS, sections, weekRecord, toggleRead, setWeekGoal, weekProgress, rangeText, readerLink, isoOf } from './week.js';

export const CALENDAR_NOTE = 'The portion comes from Aleph\'s calendar table, derived from Hebcal\'s published schedule; it is not an independent halachic table. Marks are your own: Aleph does not check your reading.';
const load = async (ctx, rel) => { const r = await (ctx?.fetchFn ?? fetch)(new URL('../../' + rel, import.meta.url)); if (!r || r.ok === false) throw new Error(rel); return r.json(); };

/** The coming Shabbat and its portions (or null portions on a festival Shabbat). Pure apart from the calendar code. */
export function thisWeek(now, israel, index) {
  const sat = saturdayOnOrAfter({ y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() });
  const res = parshaOnShabbat(sat, { israel });
  return { sat, iso: isoOf(sat), res, portions: res ? portionsForCalendarIds(index, res.ids) : [] };
}

export function mount(root, ctx) {
  let alive = true;
  const status = h('p', { role: 'status', 'aria-live': 'polite', class: 'muted' }, 'Loading the Torah index…');
  const body = h('div', {});
  root.replaceChildren(h('article', { class: 'card parashah' }, h('h1', { id: 'view-title', tabindex: '-1' }, 'This Week\'s Parashah'), status, body,
    h('p', { class: 'muted' }, CALENDAR_NOTE), h('p', {}, h('a', { href: '#/torahreader' }, 'Torah reader'), ' · ', h('a', { href: '#/torah-search' }, 'Torah Search'), ' · ', h('a', { href: '#/verse-notebook' }, 'Verse notebook'), ' · ', h('a', { href: '#/word-study' }, 'Word by Word'))));
  (async () => {
    let index;
    try { index = await load(ctx, 'data/corpus/torah/index.json'); } catch { if (alive) status.textContent = 'The Torah index did not load. Check the connection and open this page again.'; return; }
    if (!alive) return;
    let prefs = null; try { prefs = ctx?.store?.get?.(CAL_PREFS_KEY) || null; } catch { prefs = null; }
    const p = normalizePrefs(prefs), loc = resolveLocation(p, null);
    const israel = p.parshaSchedule === 'israel' || (p.parshaSchedule === 'auto' && !!loc?.israel);
    const now = ctx?.now ? ctx.now() : new Date();
    const wk = thisWeek(now, israel, index);
    const bookName = (id) => index.books.find((b) => b.id === id)?.en || id;
    const get = () => { try { return ctx?.store?.get?.(WEEK_KEY) || null; } catch { return null; } };
    const put = (v) => { try { ctx?.store?.set?.(WEEK_KEY, v); return true; } catch { return false; } };
    let rec = weekRecord(get(), wk.iso);
    status.textContent = `Shabbat ${wk.iso}${israel ? ' (Israel schedule)' : ' (schedule outside Israel)'}.`;
    function paint() {
      if (!wk.res || !wk.portions.length) {
        body.replaceChildren(h('p', {}, 'This Shabbat has no regular weekly portion (a festival falls on it). The reader still has every portion: ', h('a', { href: '#/torahreader' }, 'open the Torah reader'), '.'));
        return;
      }
      const secs = sections(wk.portions), prog = weekProgress(rec, secs);
      body.replaceChildren(
        h('h2', {}, wk.portions.map((x) => x.en).join(' – '), ' ', heSpan(wk.res.he)),
        wk.res.double ? h('p', { class: 'muted' }, 'A double portion this week. Each portion\'s own aliyot are listed; synagogues divide a double reading in their own way.') : null,
        ...wk.portions.map((x) => h('p', {}, `${x.en}: ${rangeText(x, bookName)}`)),
        h('p', {}, h('strong', {}, prog.met ? `Goal met: ${prog.text}.` : `${prog.text}.`)),
        h('div', { class: 'row', role: 'group', 'aria-label': 'Weekly goal: sections' }, h('span', {}, 'Goal: '), ...GOALS.filter((n) => n <= secs.length).map((n) => h('button', { type: 'button', class: 'btn secondary', 'aria-pressed': rec.goal === n,
          onclick: () => { rec = setWeekGoal(rec, n); put(rec); paint(); } }, String(n)))),
        h('ol', { class: 'parashah-sections' }, ...secs.map((s) => {
          const done = !!rec.read[s.key];
          return h('li', {}, h('strong', {}, s.n ? `${s.portionEn}, aliyah ${s.n}: ` : `${s.portionEn}: `), rangeText(s, bookName), ' ',
            h('a', { class: 'btn secondary', href: readerLink(s) }, 'Read in the reader'), ' ',
            h('button', { type: 'button', class: 'btn secondary', 'aria-pressed': done, onclick: () => { rec = toggleRead(rec, s.key); put(rec); paint(); } }, done ? 'Marked read ✓' : 'I read this'));
        })));
    }
    paint();
  })();
  return () => { alive = false; };
}
