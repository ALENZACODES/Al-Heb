// @ts-check
// S5 learning timeline, S6 "My Hebrew" profile, S7 interest paths, S10 reading shelf. Pure: callers pass stored data and `now`.
// Every number here is counted from what is on this device. Nothing is estimated and nothing is sent anywhere.
import { dayKey } from '../progress/model.js';

export const VISITS_KEY = 'collection.visits.v1';   // {days:{'2026-11-12':[{n,t,h,at}]}, reading:{key:{title,href,at}}, notes:{day:text}}
export const PATHS_KEY = 'paths.v1';                // {picked:[interest ids], done:{'interest:route': ms}}
export const MAX = Object.freeze({ perDay: 40, days: 400, reading: 60, note: 2000 });

const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const str = (v, max) => (typeof v === 'string' ? v : '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
const safeHref = (v) => (typeof v === 'string' && /^#\/[^\s"'<>]*$/.test(v) ? v.slice(0, 300) : '');

// ---------------------------------------------------------------- what counts as reading (S10)
const READING = [
  [/^book$/, 'Little Books'], [/^(torahread|torahreadsec|torahreader|parashah)$/, 'Torah'], [/^(service|shabbat|prayer-practice|morning)$/, 'Services and Prayers'],
  [/^libraryarticle$/, 'Library'], [/^(focus|bridge-text|bridge-sec|read|scaffold)$/, 'Reading Practice'],
];
/** The shelf group of a route, or null when the route is not a text to read. */
export const readingGroup = (name) => { const hit = READING.find(([re]) => re.test(String(name))); return hit ? hit[1] : null; };
/** What kind of saved thing a page is, from its route (S3 heart on any page). */
export function kindOfRoute(route) {
  const n = String(obj(route).name || ''), m = String(obj(route).module || '');
  if (/\/games\/|\/lab\//.test(m) || /^(games|game-library|lab)$/.test(n)) return 'game';
  if (/^(book|books|book-card)$/.test(n)) return 'book';
  if (/^(songs|listen-shelf|karaoke|karaokebeat)$/.test(n)) return 'song';
  if (/^(service|shabbat|prayer-practice|morning)$/.test(n)) return 'prayer';
  if (/^(torahread|torahreadsec|torahreader|parashah|verse-notebook|torah-search)$/.test(n)) return 'verse';
  return 'page';
}

// ---------------------------------------------------------------- the visit log (feeds the timeline and the reading shelf)
export function cleanVisits(v) {
  const o = obj(v); const days = {};
  for (const [d, list] of Object.entries(obj(o.days)).filter(([d]) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort().slice(-MAX.days)) {
    const rows = (Array.isArray(list) ? list : []).map((r) => ({ n: str(obj(r).n, 60), t: str(obj(r).t, 120), h: safeHref(obj(r).h), at: Number(obj(r).at) || 0 })).filter((r) => r.n && r.t && r.h);
    if (rows.length) days[d] = rows.slice(-MAX.perDay);
  }
  const reading = {};
  for (const [k, r] of Object.entries(obj(o.reading))) { const href = safeHref(obj(r).href), title = str(obj(r).title, 120); if (href && title) reading[str(k, 300)] = { title, href, group: str(obj(r).group, 40), at: Number(obj(r).at) || 0 }; }
  const notes = {};
  for (const [d, t] of Object.entries(obj(o.notes))) if (/^\d{4}-\d{2}-\d{2}$/.test(d) && str(t, MAX.note)) notes[d] = String(t).slice(0, MAX.note);
  return { version: 1, days, reading, notes };
}
/**
 * Record that a page was opened. The same page twice in a row on one day is written once. A text also updates the reading shelf:
 * one entry per text (the link with its place in it), newest first, the oldest dropped past the limit.
 * @param {any} v @param {{name:string, title:string, hash:string}} page
 */
export function addVisit(v, page, now = Date.now()) {
  const c = cleanVisits(v); const href = safeHref(page.hash), title = str(page.title, 120), name = str(page.name, 60);
  if (!href || !title || !name) return c;
  const d = dayKey(now); const list = c.days[d] || []; const last = list[list.length - 1];
  if (!(last && last.h === href)) c.days[d] = [...list, { n: name, t: title, h: href, at: Number(now) || 0 }].slice(-MAX.perDay);
  const group = readingGroup(name);
  if (group) {
    const key = href.split('?')[0];
    c.reading[key] = { title, href, group, at: Number(now) || 0 };
    const keep = Object.entries(c.reading).sort((a, b) => b[1].at - a[1].at).slice(0, MAX.reading);
    c.reading = Object.fromEntries(keep);
  }
  const keys = Object.keys(c.days).sort(); for (const k of keys.slice(0, Math.max(0, keys.length - MAX.days))) delete c.days[k];
  return c;
}
export function setDayNote(v, day, text) {
  const c = cleanVisits(v); const t = String(text ?? '').slice(0, MAX.note).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(day))) return c;
  if (t) c.notes[day] = t; else delete c.notes[day];
  return c;
}

// ---------------------------------------------------------------- S10 reading shelf
/**
 * Everything in progress, newest first. Little books come from the book reader's own record (books.v1: last page, finished or
 * not); other texts from the visit log. A finished book is listed under "finished", not "in progress".
 * @param {any} visits @param {any} books books.v1 @param {{id:string,title:string,pages?:number}[]} [bookList] titles and page counts when known
 */
export function readingShelf(visits, books, bookList = []) {
  const c = cleanVisits(visits); const info = new Map((bookList || []).map((b) => [String(b.id), b]));
  const inProgress = [], finished = [];
  for (const [id, e] of Object.entries(obj(books))) {
    const o = obj(e); const b = info.get(id); const title = b?.title || c.reading[`#/book/${id}`]?.title || `Little book ${id}`;
    const page = Number.isFinite(Number(o.lastPage)) ? Number(o.lastPage) + 1 : null; const at = c.reading[`#/book/${id}`]?.at || Number(o.reachedEndAt) || 0;
    const row = { key: `book:${id}`, group: 'Little Books', title, href: `#/book/${id}`, at, place: page ? `page ${page}${b?.pages ? ` of ${b.pages}` : ''}` : '' };
    if (o.finishedAt) finished.push({ ...row, at: Number(o.finishedAt) || at, place: 'finished' }); else if (page) inProgress.push(row);
  }
  for (const [key, r] of Object.entries(c.reading)) {
    if (/^#\/book\/[^/]+$/.test(key)) { const id = key.slice(7); if (!obj(books)[id]) inProgress.push({ key: `book:${id}`, group: 'Little Books', title: r.title, href: r.href, at: r.at, place: '' }); continue; }
    inProgress.push({ key, group: r.group || 'Reading', title: r.title, href: r.href, at: r.at, place: '' });
  }
  const byNew = (a, b) => b.at - a.at || a.title.localeCompare(b.title);
  return { inProgress: inProgress.sort(byNew), finished: finished.sort(byNew) };
}

// ---------------------------------------------------------------- S5 timeline
const DAY = 86400000;
const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;
/**
 * The diary: one entry per day that has anything, newest first. Sources: lessons finished, checkpoints, little books finished,
 * review answers (from each card's own log), things saved to My Collection, pages opened (from the day this diary began),
 * and the learner's own note for the day.
 * @param {{completed?:Record<string,any>, checkpoints?:Record<string,any>, books?:any, decks?:Record<string, any>, collection?:{items:any[]}, visits?:any, lessonTitle?:(id:string)=>string}} d
 * @returns {{day:string, lines:string[], pages:{t:string,h:string}[], note:string}[]}
 */
export function timeline(d) {
  const days = new Map();
  const at = (day) => { if (!days.has(day)) days.set(day, { day, lessons: [], checkpoints: 0, books: 0, reviews: 0, saved: 0, pages: [], note: '' }); return days.get(day); };
  const ms = (t) => { const n = typeof t === 'number' ? t : Date.parse(String(t)); return Number.isFinite(n) && n > 0 ? n : null; };
  for (const [id, t] of Object.entries(obj(d.completed))) { const n = ms(t); if (n) at(dayKey(n)).lessons.push(d.lessonTitle ? d.lessonTitle(id) : id); }
  for (const c of Object.values(obj(d.checkpoints))) { const n = ms(obj(c).at); if (n) at(dayKey(n)).checkpoints++; }
  for (const b of Object.values(obj(d.books))) { const n = ms(obj(b).finishedAt); if (n) at(dayKey(n)).books++; }
  for (const deck of Object.values(obj(d.decks))) for (const card of Array.isArray(deck) ? deck : Object.values(obj(deck))) {
    for (const x of Array.isArray(obj(card).log) ? card.log : []) { if (Number.isFinite(x) && x % 10 >= 1 && x % 10 <= 4) at(new Date(Math.floor(x / 10) * DAY).toISOString().slice(0, 10)).reviews++; }
  }
  for (const i of Array.isArray(obj(d.collection).items) ? d.collection.items : []) { const n = ms(i.savedAt); if (n) at(dayKey(n)).saved++; }
  const v = cleanVisits(d.visits);
  for (const [day, list] of Object.entries(v.days)) { const seen = new Set(); for (const r of list) { if (seen.has(r.h)) continue; seen.add(r.h); at(day).pages.push({ t: r.t, h: r.h }); } }
  for (const [day, text] of Object.entries(v.notes)) at(day).note = text;
  return [...days.values()].sort((a, b) => b.day.localeCompare(a.day)).map((e) => ({ day: e.day, note: e.note, pages: e.pages,
    lines: [e.lessons.length ? `Finished ${plural(e.lessons.length, 'lesson')}: ${e.lessons.slice(0, 6).join('; ')}${e.lessons.length > 6 ? '; and more' : ''}` : '',
      e.checkpoints ? `Took ${plural(e.checkpoints, 'checkpoint')}` : '', e.books ? `Finished ${plural(e.books, 'little book')}` : '', e.reviews ? `Answered ${plural(e.reviews, 'review card')}` : '',
      e.saved ? `Saved ${plural(e.saved, 'thing')} to My Collection` : ''].filter(Boolean) }));
}
export const firstDay = (entries) => (entries.length ? entries[entries.length - 1].day : null);

// ---------------------------------------------------------------- S6 "My Hebrew" profile
/** Aleph's own plain rule for the level line, stated on the page: it follows the share of reading-track lessons finished. */
export const LEVELS = Object.freeze([[0, 'Just starting'], [0.01, 'Beginner'], [0.25, 'Building'], [0.6, 'Reading with help'], [0.9, 'Reading on your own']]);
export const levelOf = (share) => LEVELS.filter(([min]) => share >= min).pop()[1];
/**
 * @param {{lessons:{read:{done:number,total:number}, israel:{done:number,total:number}}, lettersKnown:number, lettersTotal:number, cards:{new:number,learning:number,mature:number,total:number},
 *   vocabStarted:number, booksFinished:number, booksStarted:number, streak:{count:number,best:number}, weak:{label:string,detail:string,href:string}[], collection:{items:any[]}, visits:any, daysActive:number}} p
 */
export function profile(p) {
  const share = (x) => (x && x.total ? x.done / x.total : 0);
  const areas = [
    { id: 'reading', label: 'Reading lessons', have: p.lessons.read.done, of: p.lessons.read.total, href: '#/learn' },
    { id: 'israel', label: 'Hebrew for Israel lessons', have: p.lessons.israel.done, of: p.lessons.israel.total, href: '#/israel-units' },
    { id: 'letters', label: 'Letters', have: p.lettersKnown, of: p.lettersTotal, href: '#/letters' },
    { id: 'review', label: 'Review cards that now last three weeks or more', have: p.cards.mature, of: p.cards.total - p.cards.new, href: '#/learn?review=1' },
  ].filter((a) => a.of > 0).map((a) => ({ ...a, share: a.have / a.of }));
  const started = areas.filter((a) => a.have > 0);
  const strongest = started.length ? [...started].sort((a, b) => b.share - a.share)[0] : null;
  const weakest = areas.length > 1 ? [...areas].sort((a, b) => a.share - b.share)[0] : null;
  const v = cleanVisits(p.visits); const opened = new Map();
  for (const list of Object.values(v.days)) for (const r of list) { const k = r.h.split('?')[0]; const e = opened.get(k) || { title: r.t, href: k, n: 0 }; e.n++; opened.set(k, e); }
  const skip = /^#\/(home|collection|timeline|my-hebrew|paths|shelf|settings|search|progress|welcome)?$/;
  const favorite = [...opened.values()].filter((e) => !skip.test(e.href) && e.n >= 2).sort((a, b) => b.n - a.n || a.title.localeCompare(b.title)).slice(0, 5);
  const items = Array.isArray(obj(p.collection).items) ? p.collection.items : [];
  return {
    level: levelOf(share(p.lessons.read)), levelShare: share(p.lessons.read), areas, strongest, weakest: weakest && strongest && weakest.id === strongest.id ? null : weakest,
    wordsKnown: p.cards.mature, wordsLearning: p.cards.learning, vocabStarted: p.vocabStarted, booksFinished: p.booksFinished, booksStarted: p.booksStarted,
    streak: p.streak.count, bestStreak: p.streak.best, daysActive: p.daysActive, weak: (p.weak || []).slice(0, 4),
    favorite, hearts: items.filter((i) => i.fav).slice(0, 5).map((i) => ({ title: i.title, href: i.href })), saved: items.length,
  };
}

// ---------------------------------------------------------------- S7 interest paths
// Each path is an ordered walk through pages the app already has, named by route. A step whose page is not in this build is left out.
export const INTERESTS = Object.freeze([
  { id: 'cooking', label: 'Cooking and Food', steps: ['g2-popup', 'g4-cafe', 'g4-falafel', 'g4-menu', 'g4-shuk', 'g5-harvest', 'g5-table', 'g5-plate'] },
  { id: 'travel', label: 'Travel in Israel', steps: ['phrases', 'dialogues', 'israel', 'israelunits', 'practical', 'g4-signs', 'g4-busboard', 'g4-grid', 'g4-emergency', 'camera', 'talk'] },
  { id: 'prayer', label: 'Prayer', steps: ['morning', 'service', 'prayer-practice', 'shabbat', 'listen-shelf', 'g5-bless', 'g5-mend', 'festivals', 'traditions'] },
  { id: 'torah', label: 'Torah', steps: ['parashah', 'torahread', 'torahreader', 'trope', 'trope-families', 'tg-torahwords', 'tg-parashah', 'torah-search', 'verse-notebook', 'ask'] },
  { id: 'music', label: 'Music', steps: ['songs', 'listen-shelf', 'listen', 'g1-rhythm', 'karaokebeat', 'rhymelab', 'trope'] },
]);
export function cleanPaths(v) {
  const o = obj(v); const ids = new Set(INTERESTS.map((i) => i.id));
  const done = {}; for (const [k, t] of Object.entries(obj(o.done))) if (/^[a-z]+:[a-z0-9-]+$/.test(k) && Number(t) > 0) done[k] = Number(t);
  return { version: 1, picked: (Array.isArray(o.picked) ? o.picked : []).filter((x, i, a) => ids.has(x) && a.indexOf(x) === i), done };
}
export const pickInterest = (v, id, on) => { const c = cleanPaths(v); return { ...c, picked: on ? [...new Set([...c.picked, id])].filter((x) => INTERESTS.some((i) => i.id === x)) : c.picked.filter((x) => x !== id) }; };
export const markStep = (v, interest, route, on, now = Date.now()) => { const c = cleanPaths(v); const k = `${interest}:${route}`; const done = { ...c.done }; if (on) done[k] = Number(now) || 1; else delete done[k]; return { ...c, done }; };
/**
 * The chosen paths with each step's state. A step counts as done when the learner ticked it or has opened its page
 * (from the visit log). `routes` is the app's route table; steps without a page here are dropped.
 * @param {any} v @param {{name:string, pattern:string, title:string}[]} routes @param {any} visits
 */
export function pathsFor(v, routes, visits) {
  const c = cleanPaths(v); const byName = new Map((routes || []).map((r) => [r.name, r]));
  const opened = new Set(); for (const list of Object.values(cleanVisits(visits).days)) for (const r of list) opened.add(r.n);
  return INTERESTS.map((i) => {
    const steps = i.steps.filter((n) => byName.has(n) && !byName.get(n).pattern.includes(':')).map((n) => ({ route: n, title: byName.get(n).title, href: '#' + byName.get(n).pattern, ticked: !!c.done[`${i.id}:${n}`], opened: opened.has(n) }))
      .map((s) => ({ ...s, done: s.ticked || s.opened }));
    const next = steps.find((s) => !s.done) || null;
    return { id: i.id, label: i.label, picked: c.picked.includes(i.id), steps, done: steps.filter((s) => s.done).length, total: steps.length, next };
  });
}
