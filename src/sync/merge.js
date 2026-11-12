// @ts-check
// Merge one learner's progress from another of their own devices into this one (points plan #3 and #18, audit C-06).
// There is no server and no account: progress travels only as a file, a link or a QR code that the learner moves
// themselves, and importing it MERGES. It never overwrites and never deletes. Pure functions, no DOM, no store.
//
// Rules (each one is tested in tests/sync.merge.test.js, including two devices with interleaved progress):
//  - review cards (srs.cards, srs.vocab, srs.practical, wordtrace.cards): per card, the side with the later review keeps its
//    scheduling state; the graded days are united; firstReview is the earlier one; due is the later one; reps and lapses
//    never go down.
//  - lessons completed (curriculum.progress, practical.progress and any { completed: { id: time } }): union, earliest time.
//  - lesson check results (lesson.checks.v1): attempts united by time; the earliest pass is kept.
//  - streak: done and rest days united; the chain is recounted from the united days; best never goes down.
//  - XP (retention.v1 xp.days): union by day, the larger figure for each day; the total moves by what this device gains.
//  - gems (retention.v1 gems.ledger): the ledger is united entry by entry; the balance moves by the entries this device
//    had not seen, so merging the same file twice changes nothing.
//  - settings and other preferences: this device's choices stay; a choice only the other device has is copied.
//  - anything else: objects are united key by key; numbers keep the larger value; lists are united without duplicates;
//    other values on this device stay as they are.
// Keys that describe this device rather than the learner (install prompt, scroll position, notices already seen) never move.

/** Keys that stay on the device they were written on. */
export const DEVICE_KEYS = Object.freeze([
  '__meta', 'install.v1', 'alef.scroll.v1', 'alef.storage-notice.v1', 'alef:voiceHelpDismissed', 'notify.asked', 'notify.log',
  'rimon.seen.v1', 'backup.reminder.v1', 'lesson.resume.v1', 'retention.v1.corrupt',
]);
/** Keys whose values are this device's preferences: this device wins every conflict. */
const PREFERENCE_KEY = /^(settings|notify\.prefs|calendar\.prefs|israel\.prefs|service\.prefs|onboarding\.v1\.dailyGoal)$|\.prefs$/;
const CARD_KEYS = new Set(['srs.cards', 'srs.vocab', 'srs.practical', 'wordtrace.cards']);
export const CHECKS_KEY = 'lesson.checks.v1';

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const ISO = /^\d{4}-\d\d-\d\d$/;
const isISO = (s) => typeof s === 'string' && ISO.test(s);
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
/** Stable JSON (keys sorted) for comparing values. */
export function stable(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v === undefined ? null : v);
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  return '{' + Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
}
const same = (a, b) => stable(a) === stable(b);
/** Union of two lists, this device's order first, no duplicates (by value). */
function unionList(a, b) {
  const seen = new Set(), out = [];
  for (const x of [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])]) { const k = stable(x); if (!seen.has(k)) { seen.add(k); out.push(x); } }
  return out;
}
const isoUnion = (a, b, cap) => [...new Set([...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])].filter(isISO))].sort().slice(-cap);

// ---------- generic ----------
/** Merge two values with no special rule. `prefer` = 'local' keeps this device's scalar on a conflict. */
export function mergeGeneric(local, other, prefer = 'max') {
  if (local === undefined) return other;
  if (other === undefined) return local;
  if (Array.isArray(local) && Array.isArray(other)) return prefer === 'local' ? local : unionList(local, other);
  if (isObj(local) && isObj(other)) {
    const out = { ...local };
    for (const k of Object.keys(other)) out[k] = k in local ? mergeGeneric(local[k], other[k], prefer) : other[k];
    return out;
  }
  if (prefer !== 'local' && num(local) != null && num(other) != null) return Math.max(local, other);
  return local;
}

// ---------- review cards ----------
const reviewedAt = (c) => (num(c?.lastReview) ?? -Infinity);
/** One card seen on both devices. */
export function mergeCard(a, b) {
  if (!isObj(a)) return b; if (!isObj(b)) return a;
  const later = reviewedAt(b) > reviewedAt(a) || (reviewedAt(b) === reviewedAt(a) && (num(b.reps) ?? 0) > (num(a.reps) ?? 0)) ? b : a;
  const out = { ...mergeGeneric(a, b, 'local'), ...later };
  const days = [...new Set([...(Array.isArray(a.days) ? a.days : []), ...(Array.isArray(b.days) ? b.days : [])].filter(isISO))].sort();
  if (days.length || 'days' in a || 'days' in b) out.days = days.slice(-8); // the review history keeps the 8 newest days, as srs.review does
  const firsts = [num(a.firstReview), num(b.firstReview)].filter((x) => x != null);
  if (firsts.length) out.firstReview = Math.min(...firsts); else if ('firstReview' in a || 'firstReview' in b) out.firstReview = null;
  const dues = [num(a.due), num(b.due)].filter((x) => x != null);
  if (dues.length) out.due = Math.max(...dues);
  for (const k of ['reps', 'lapses']) { const v = [num(a[k]), num(b[k])].filter((x) => x != null); if (v.length) out[k] = Math.max(...v); }
  return out;
}
/** A card collection: a map { id: card } or (older srs.vocab) a list of cards. The result keeps this device's shape. */
export function mergeCards(local, other) {
  const toMap = (v) => (Array.isArray(v) ? Object.fromEntries(v.filter((c) => isObj(c) && c.id != null).map((c) => [c.id, c])) : isObj(v) ? v : {});
  const a = toMap(local), b = toMap(other), out = { ...a };
  for (const [id, card] of Object.entries(b)) out[id] = id in a ? mergeCard(a[id], card) : card;
  return Array.isArray(local) ? Object.values(out) : out;
}

// ---------- lessons completed ----------
export function mergeCompleted(local, other) {
  const a = isObj(local) ? local : {}, b = isObj(other) ? other : {};
  const out = mergeGeneric(a, b, 'local');
  const ca = isObj(a.completed) ? a.completed : {}, cb = isObj(b.completed) ? b.completed : {};
  const completed = { ...ca };
  for (const [id, t] of Object.entries(cb)) {
    if (!(id in completed) || !completed[id]) { completed[id] = t; continue; }
    const x = num(completed[id]), y = num(t);
    if (x != null && y != null) completed[id] = Math.min(x, y); else if (x == null && y != null) completed[id] = y;
  }
  out.completed = completed;
  return out;
}

// ---------- lesson check results ----------
export function mergeChecks(local, other) {
  const a = isObj(local) ? local : {}, b = isObj(other) ? other : {}, out = { ...a };
  for (const [id, r] of Object.entries(b)) {
    if (!isObj(r)) continue;
    const l = isObj(a[id]) ? a[id] : null;
    if (!l) { out[id] = r; continue; }
    const tries = unionList(l.tries, r.tries).filter((t) => isObj(t) && num(t.at) != null).sort((x, y) => x.at - y.at).slice(-10);
    const passes = [l.pass, r.pass].filter((p) => isObj(p) && num(p.at) != null).sort((x, y) => x.at - y.at);
    out[id] = { ...l, tries, pass: passes[0] || null };
  }
  return out;
}

// ---------- streak ----------
const dayNum = (key) => { const [y, m, d] = key.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 86400000); };
const keyOf = (n) => new Date(n * 86400000).toISOString().slice(0, 10);
export function mergeStreak(local, other) {
  if (!isObj(local)) return other; if (!isObj(other)) return local;
  const out = { ...mergeGeneric(local, other, 'local') };
  const done = isoUnion(local.doneDates, other.doneDates, 30), frozen = isoUnion(local.frozenDates, other.frozenDates, 60);
  if ('doneDates' in local || 'doneDates' in other) out.doneDates = done;
  if ('frozenDates' in local || 'frozenDates' in other) out.frozenDates = frozen;
  const lasts = [local.last, other.last].filter(isISO).sort();
  const last = lasts[lasts.length - 1] || null;
  out.last = last;
  if (last) {
    // Walk back from the newest done day over the united done and rest days; where a device's own chain ends on the day
    // reached, that device's count covers the days before it (its list keeps only 30 days).
    const counted = new Set([...done, ...(last ? [last] : [])]), rest = new Set(frozen);
    const ends = new Map(); for (const r of [local, other]) if (isISO(r.last) && num(r.count) != null) ends.set(r.last, Math.max(ends.get(r.last) || 0, r.count));
    let n = 0, best = 0;
    for (let d = dayNum(last); d > dayNum(last) - 400; d--) {
      const k = keyOf(d);
      if (ends.has(k)) best = Math.max(best, n + ends.get(k));
      if (counted.has(k)) n++; else if (!rest.has(k)) break;
    }
    const sameDay = [local, other].filter((r) => r.last === last).map((r) => num(r.count) ?? 0);
    out.count = Math.max(n, best, ...sameDay);
  } else out.count = Math.max(num(local.count) ?? 0, num(other.count) ?? 0);
  out.best = Math.max(num(local.best) ?? 0, num(other.best) ?? 0, out.count);
  if (isISO(local.todayDate) || isISO(other.todayDate)) {
    const ta = isISO(local.todayDate) ? local.todayDate : '', tb = isISO(other.todayDate) ? other.todayDate : '';
    out.todayDate = ta >= tb ? ta : tb;
    out.todaySeconds = Math.max(...[local, other].filter((r) => r.todayDate === out.todayDate).map((r) => num(r.todaySeconds) ?? 0));
    const act = [local, other].filter((r) => r.todayDate === out.todayDate && num(r.activeSeconds) !== null && num(r.activeSeconds) !== undefined).map((r) => num(r.activeSeconds));
    if (act.length) out.activeSeconds = Math.max(...act); // I6: measured minutes
  }
  return out;
}

// ---------- XP and gems (retention.v1) ----------
const ledgerId = (e) => `${e.at}|${e.d}|${e.why}`;
export function mergeRetention(local, other) {
  if (!isObj(local)) return other; if (!isObj(other)) return local;
  const out = { ...local }; // this device keeps its install id, hearts, league, reminders and goal
  // XP: union by day, the larger figure per day; the total moves by what this device gains.
  const xa = isObj(local.xp) ? local.xp : {}, xb = isObj(other.xp) ? other.xp : {};
  const da = isObj(xa.days) ? xa.days : {}, db = isObj(xb.days) ? xb.days : {};
  const daysA = Object.keys(da).filter(isISO).sort();
  const floor = daysA.length >= 120 ? daysA[0] : ''; // a full window may have dropped older days: do not count those again
  const days = { ...da }; let gain = 0;
  for (const [k, v] of Object.entries(db)) {
    if (!isISO(k) || num(v) == null) continue;
    const mine = num(days[k]) ?? 0;
    if (v > mine) { if (k >= floor) gain += v - mine; days[k] = v; }
  }
  const keep = Object.keys(days).sort().slice(-120); const capped = {}; for (const k of keep) capped[k] = days[k];
  out.xp = { ...xa, days: capped, total: (num(xa.total) ?? 0) + gain, recentIds: unionList(xa.recentIds, xb.recentIds).slice(-300) };
  // Gems: the ledger is united entry by entry; the balance moves by the entries this device had not seen.
  const ga = isObj(local.gems) ? local.gems : {}, gb = isObj(other.gems) ? other.gems : {};
  const la = (Array.isArray(ga.ledger) ? ga.ledger : []).filter((e) => isObj(e) && num(e.d) != null), lb = (Array.isArray(gb.ledger) ? gb.ledger : []).filter((e) => isObj(e) && num(e.d) != null);
  // entries are matched as a multiset: two identical entries on the other device and one here means one is new
  const have = new Map(); for (const e of la) have.set(ledgerId(e), (have.get(ledgerId(e)) || 0) + 1);
  const oldest = la.length >= 100 ? Math.min(...la.map((e) => num(e.at) ?? 0)) : -Infinity; // a full ledger dropped older entries: do not count those again
  let delta = 0; const fresh = [];
  for (const e of lb) { const n = have.get(ledgerId(e)) || 0; if (n > 0) { have.set(ledgerId(e), n - 1); continue; } fresh.push(e); if ((num(e.at) ?? 0) >= oldest) delta += e.d; }
  const ledger = [...la, ...fresh].sort((x, y) => (num(x.at) ?? 0) - (num(y.at) ?? 0)).slice(-100);
  const goalDays = [ga.goalPaidDay, gb.goalPaidDay].filter(isISO).sort();
  out.gems = { ...ga, ledger, balance: Math.max(0, (num(ga.balance) ?? 0) + delta), paidMilestones: unionList(ga.paidMilestones, gb.paidMilestones), goalPaidDay: goalDays[goalDays.length - 1] || null };
  out.lessonsFinished = Math.max(num(local.lessonsFinished) ?? 0, num(other.lessonsFinished) ?? 0);
  if (isObj(local.freezes) || isObj(other.freezes)) {
    const fa = isObj(local.freezes) ? local.freezes : {}, fb = isObj(other.freezes) ? other.freezes : {};
    out.freezes = { ...fa, used: isoUnion(fa.used, fb.used, 60) };
  }
  out.travelCovered = isoUnion(local.travelCovered, other.travelCovered, 30);
  const ses = unionList(local.sessions, other.sessions).filter((s) => isObj(s) && num(s.s) != null).sort((x, y) => x.s - y.s).slice(-60);
  if (ses.length || 'sessions' in local) out.sessions = ses;
  return out;
}

/** The rule used for one key (for tests and for the preview). */
export function ruleFor(key) {
  if (DEVICE_KEYS.includes(key)) return 'device';
  if (CARD_KEYS.has(key)) return 'cards';
  if (key === 'curriculum.progress' || key === 'practical.progress') return 'completed';
  if (key === CHECKS_KEY) return 'checks';
  if (key === 'streak') return 'streak';
  if (key === 'retention.v1') return 'retention';
  if (PREFERENCE_KEY.test(key)) return 'preference';
  return 'generic';
}
/** Merge one key's value. */
export function mergeValue(key, local, other) {
  if (local === undefined) return other;
  if (other === undefined) return local;
  switch (ruleFor(key)) {
    case 'device': return local;
    case 'cards': return mergeCards(local, other);
    case 'completed': return isObj(local) && isObj(other) ? mergeCompleted(local, other) : local;
    case 'checks': return mergeChecks(local, other);
    case 'streak': return mergeStreak(local, other);
    case 'retention': return mergeRetention(local, other);
    case 'preference': return mergeGeneric(local, other, 'local');
    default: return mergeGeneric(local, other, 'max');
  }
}

/**
 * Merge every key of `other` into `local` (both are { key: value } maps, as in a backup file's data block).
 * @returns {{data:Record<string,any>, changed:string[], added:string[], kept:string[], skipped:string[]}}
 *   `data` holds only the keys whose value changes on this device (write those and nothing else).
 */
export function mergeAll(local, other) {
  const data = {}, changed = [], added = [], kept = [], skipped = [];
  for (const key of Object.keys(other || {}).sort()) {
    if (ruleFor(key) === 'device' || key === '__proto__' || key === 'constructor' || key === 'prototype') { skipped.push(key); continue; }
    const mine = local ? local[key] : undefined;
    const next = mergeValue(key, mine, other[key]);
    if (mine === undefined) { data[key] = next; added.push(key); }
    else if (!same(mine, next)) { data[key] = next; changed.push(key); }
    else kept.push(key);
  }
  return { data, changed, added, kept, skipped };
}

/** What a merge adds, in learner terms (counts only; nothing is ever removed). */
export function summarize(local, merged) {
  const l = local || {}, m = { ...l, ...merged };
  const count = (v) => (Array.isArray(v) ? v.length : isObj(v) ? Object.keys(v).length : 0);
  const lessons = (v) => count(isObj(v) ? v.completed : null);
  const gems = (v) => num(isObj(v) && isObj(v.gems) ? v.gems.balance : null) ?? 0;
  const xp = (v) => num(isObj(v) && isObj(v.xp) ? v.xp.total : null) ?? 0;
  return {
    lessons: lessons(m['curriculum.progress']) - lessons(l['curriculum.progress']),
    cards: count(m['srs.cards']) + count(m['srs.vocab']) - count(l['srs.cards']) - count(l['srs.vocab']),
    xp: xp(m['retention.v1']) - xp(l['retention.v1']),
    gems: gems(m['retention.v1']) - gems(l['retention.v1']),
    streak: num(isObj(m.streak) ? m.streak.count : null) ?? 0,
  };
}
