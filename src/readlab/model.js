// Reading Tools (#/readlab): pure logic. No DOM, no network, no clock (callers pass `now`).
// One store key, readlab.v1. Everything a learner "reads" here is self-reported: the app never hears the learner.
//   B1  vowel-mark level per section (stories, prayers, Torah) and the fade challenge (marks drop away halfway through a text)
//   B9  three versions of one text (all marks, some marks, none), each opened by reading the one before without help
//   B10 reading progress by text type, from records other screens already keep
// The "some marks" pattern is the one the Torah reading course already uses (src/torahread/pointing.js shownWord): a design
// choice of this app, kept simple and predictable, not a published method. Marks are only ever removed, never added.
import { shownWord } from '../torahread/pointing.js';
import { stripPoints } from '../nikkudfade/model.js';
import { showName } from '../games/tg-core.js';
import { lineWords } from './words.js';

export const STORE_KEY = 'readlab.v1';
export const DRAFT_NOTE = 'Draft: no Hebrew teacher has checked this practice. You say how your reading went; the app does not hear you.';

// ---------- B1: vowel-mark levels ----------
/** Four levels, from all marks to none. `mode` is the Torah course's shownWord mode. */
export const FADE_LEVELS = Object.freeze([
  { level: 0, id: 'all', name: 'All marks', help: 'Every word has its vowel marks.', mode: { level: 1 } },
  { level: 1, id: 'most', name: 'Most marks', help: 'Every third word has no vowel marks.', mode: { level: 2, stage: 1 } },
  { level: 2, id: 'few', name: 'Few marks', help: 'Only every third word keeps its vowel marks.', mode: { level: 2, stage: 2 } },
  { level: 3, id: 'none', name: 'No marks', help: 'No vowel marks at all, the way Israel prints Hebrew.', mode: { level: 3 } },
]);
/** Text sections. Each keeps its own level. */
export const SECTIONS = Object.freeze([
  { id: 'stories', name: 'Stories', help: 'The little books.' },
  { id: 'prayers', name: 'Prayers', help: 'Prayer-book lines.' },
  { id: 'torah', name: 'Torah', help: 'Torah verses.' },
]);
const SECTION_IDS = SECTIONS.map((s) => s.id);
export const clampFade = (n) => (Number.isInteger(n) && n >= 0 && n <= 3 ? n : 0);

/**
 * How one line looks at a level: words in order, each {text, pointed, key, index}. The four-letter name is shown as ה׳ first,
 * so it is never shown spelled out at any level.
 */
export function fadeLine(line, level) {
  const lv = FADE_LEVELS[clampFade(level)];
  return lineWords(showName(String(line ?? ''))).map((w) => {
    const keep = shownWord(w.text, w.index, lv.mode).pointed;
    return { ...w, pointed: keep, shown: keep ? w.text : stripPoints(w.text), full: w.text };
  });
}

// ---------- store ----------
const num = (x) => (Number.isFinite(x) && x >= 0 ? Math.floor(x) : 0);
export const defaultState = () => ({ v: 1, fade: { stories: 0, prayers: 0, torah: 0 }, texts: {}, challenges: [], drills: {} });
/** Anything read back from storage -> a valid state (never throws). */
export function normalizeState(raw) {
  const s = defaultState();
  if (!raw || typeof raw !== 'object') return s;
  for (const id of SECTION_IDS) s.fade[id] = clampFade(raw.fade?.[id]);
  for (const [id, t] of Object.entries(raw.texts && typeof raw.texts === 'object' ? raw.texts : {}).slice(0, 2000)) {
    if (!t || typeof t !== 'object') continue;
    const v = Array.isArray(t.versions) ? t.versions : [];
    s.texts[id] = { versions: [0, 1, 2].map((i) => ({ done: v[i]?.done === true, at: num(v[i]?.at), tries: num(v[i]?.tries) })), reads: num(t.reads) };
  }
  s.challenges = (Array.isArray(raw.challenges) ? raw.challenges : []).filter((c) => c && typeof c.textId === 'string' && num(c.faded) >= 1)
    .map((c) => ({ textId: c.textId, section: SECTION_IDS.includes(c.section) ? c.section : 'stories', at: num(c.at), pointed: num(c.pointed), faded: num(c.faded),
      stumbledPointed: Math.min(num(c.stumbledPointed), num(c.pointed)), stumbledFaded: Math.min(num(c.stumbledFaded), num(c.faded)) })).slice(-200);
  for (const [k, d] of Object.entries(raw.drills && typeof raw.drills === 'object' ? raw.drills : {}).slice(0, 50)) {
    if (!d || typeof d !== 'object') continue;
    const by = {};
    for (const [r, x] of Object.entries(d.by && typeof d.by === 'object' ? d.by : {}).slice(0, 100)) by[r] = { seen: num(x?.seen), right: Math.min(num(x?.right), num(x?.seen)) };
    s.drills[k] = { sets: num(d.sets), seen: num(d.seen), right: Math.min(num(d.right), num(d.seen)), best: num(d.best), by };
  }
  return s;
}
export const setFade = (state, section, level) => (SECTION_IDS.includes(section) ? { ...state, fade: { ...state.fade, [section]: clampFade(level) } } : state);

// ---------- B1: the fade challenge ----------
export const CHALLENGE_MIN_WORDS = 6;
/** Marks on the first half of the words (rounded up), none after. */
export function challengeWords(words) {
  const cut = Math.ceil(words.length / 2);
  return words.map((w, i) => (i < cut ? { ...w, pointed: true, shown: w.full ?? w.text, faded: false } : { ...w, pointed: false, shown: stripPoints(w.full ?? w.text), faded: true }));
}
/** A challenge result from the words the learner marked as stumbled on. {error} when the text is too short. */
export function challengeResult(words, stumbled, { textId, section, at = 0 } = {}) {
  if (!textId) return { error: 'no text chosen' };
  if (words.length < CHALLENGE_MIN_WORDS) return { error: `the text needs at least ${CHALLENGE_MIN_WORDS} words` };
  const cw = challengeWords(words);
  const marked = new Set((stumbled || []).filter((n) => Number.isInteger(n) && n >= 0 && n < cw.length));
  const pointed = cw.filter((w) => !w.faded).length, faded = cw.length - pointed;
  const stumbledFaded = cw.filter((w, i) => w.faded && marked.has(i)).length;
  return { result: { textId, section: SECTION_IDS.includes(section) ? section : 'stories', at, pointed, faded, stumbledPointed: marked.size - stumbledFaded, stumbledFaded } };
}
/** Share of the unmarked half read without a stumble, 0..100 (self-reported). */
export const challengeScore = (r) => (r && r.faded ? Math.round((100 * (r.faded - r.stumbledFaded)) / r.faded) : 0);
export const addChallenge = (state, r) => ({ ...state, challenges: [...state.challenges, r].slice(-200) });
export const challengesFor = (state, textId) => state.challenges.filter((c) => c.textId === textId);

// ---------- B9: three versions ----------
export const VERSIONS = Object.freeze([
  { n: 0, name: 'Version 1: All Marks', level: 0 },
  { n: 1, name: 'Version 2: Some Marks', level: 1 },
  { n: 2, name: 'Version 3: No Marks', level: 3 },
]);
const textRec = (state, id) => state.texts[id] || { versions: [0, 1, 2].map(() => ({ done: false, at: 0, tries: 0 })), reads: 0 };
/** Version n is open when n is 0 or the version before it was read without help. */
export const versionOpen = (state, id, n) => n === 0 || textRec(state, id).versions[n - 1]?.done === true;
export const versionDone = (state, id, n) => textRec(state, id).versions[n]?.done === true;
/** Record a read of version n. unaided = "I read it all" with no word opened for help. A locked version records nothing. */
export function recordVersion(state, id, n, unaided, now = 0) {
  if (!VERSIONS[n] || !versionOpen(state, id, n)) return { state, opened: null };
  const t = textRec(state, id);
  const versions = t.versions.map((v, i) => (i === n ? { done: v.done || unaided, at: v.done ? v.at : unaided ? now : 0, tries: v.tries + 1 } : v));
  const next = { ...state, texts: { ...state.texts, [id]: { versions, reads: t.reads + 1 } } };
  const opened = unaided && !t.versions[n].done && n < 2 ? n + 1 : null;
  return { state: next, opened };
}

// ---------- drills (B4, B5, G7): set counts ----------
/** Record one finished set of a drill: per-item results [{rule, right}]. */
export function recordSet(state, drill, results) {
  const d = state.drills[drill] || { sets: 0, seen: 0, right: 0, best: 0, by: {} };
  const by = { ...d.by };
  for (const r of results) { const k = String(r.rule || 'all'); const b = by[k] || { seen: 0, right: 0 }; by[k] = { seen: b.seen + 1, right: b.right + (r.right ? 1 : 0) }; }
  const right = results.filter((r) => r.right).length;
  return { ...state, drills: { ...state.drills, [drill]: { sets: d.sets + 1, seen: d.seen + results.length, right: d.right + right, best: Math.max(d.best, right), by } } };
}

// ---------- B10: reading progress by text type ----------
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const entryOf = (lineId) => String(lineId || '').split('#')[0];
/**
 * Four rows (prayers, Torah, stories, everyday), each counted only from records the app already keeps on this device:
 *   prayers and Torah: the registry lines of that category (data/corpus/registry.json). "Practised" = any of: a Fade-out
 *     recall card, a Shabbat Companion mark, a Reading Without Vowels read, a timed read, a Torah-course step (Torah only),
 *     or a read on these tools. "Read without marks" = finished at the last Reading Without Vowels stage, or version 3 here.
 *   stories: the little books. "Practised" = opened in the reader; "finished" = the reader's own finished record.
 *   everyday: the modern texts shelf (signs, menus, messages). "Practised" = read once; "read without help" = read with nothing revealed.
 * @param {{entries:any[], books:any[], modern:{id:string}[]}} data
 * @param {Record<string, any>} rec raw store values by key
 */
export function progressByType(data, rec) {
  const cards = obj(rec['srs.cards']), comp = obj(obj(rec['service.companion']).practised), bridge = obj(rec['bridge.v1']), mine = normalizeState(rec[STORE_KEY]);
  const btexts = obj(bridge.texts), bmodern = obj(bridge.modern), torahLadder = obj(obj(rec['torahread.v1']).ladder);
  const timed = new Set((Array.isArray(obj(rec['timedread.v1']).reads) ? rec['timedread.v1'].reads : []).map((r) => entryOf(r?.textId)));
  const regRow = (cat, label) => {
    const ids = (data.entries || []).filter((e) => e && e.category === cat).map((e) => e.id);
    const why = { fade: 0, companion: 0, bridge: 0, timed: 0, course: 0, tools: 0 };
    let practised = 0, unmarked = 0;
    for (const id of ids) {
      const hits = { fade: !!cards[`line:${id}`], companion: !!comp[id], bridge: num(obj(btexts[`line:${id}`]).tries) > 0, timed: timed.has(id), course: cat === 'torah' && Object.keys(obj(torahLadder[id])).length > 0, tools: (mine.texts[`line:${id}`]?.reads || 0) > 0 };
      for (const k of Object.keys(hits)) if (hits[k]) why[k] += 1;
      if (Object.values(hits).some(Boolean)) practised += 1;
      if (obj(btexts[`line:${id}`]).done === true || mine.texts[`line:${id}`]?.versions?.[2]?.done) unmarked += 1;
    }
    return { id: cat === 'siddur' ? 'prayers' : 'torah', label, total: ids.length, practised, second: unmarked, secondLabel: 'read without vowel marks', why };
  };
  const books = data.books || [];
  const places = obj(rec['books.v1']), fin = obj(rec['books.finished.v1']);
  const opened = books.filter((b) => places[b.id] && typeof places[b.id] === 'object').length;
  const finished = books.filter((b) => Number.isFinite(fin[b.id]) || Number.isFinite(obj(places[b.id]).finishedAt)).length;
  const modern = data.modern || [];
  const mRead = modern.filter((m) => num(obj(bmodern[m.id]).seen) > 0).length, mClean = modern.filter((m) => num(obj(bmodern[m.id]).firstTry) > 0).length;
  return [
    regRow('siddur', 'Prayers'),
    regRow('torah', 'Torah'),
    { id: 'stories', label: 'Stories', total: books.length, practised: opened, second: finished, secondLabel: 'finished', why: {} },
    { id: 'everyday', label: 'Everyday', total: modern.length, practised: mRead, second: mClean, secondLabel: 'read without help', why: {} },
  ];
}
export const WHY_LABEL = Object.freeze({ fade: 'Fade-out recall', companion: 'Shabbat Companion', bridge: 'Reading Without Vowels', timed: 'Timed read-aloud', course: 'Torah reading course', tools: 'these Reading Tools' });
