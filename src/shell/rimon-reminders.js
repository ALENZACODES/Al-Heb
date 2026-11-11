// Rimon's reminder voice: the copy library, the picker, and the rules that keep reminders kind.
// Pure (no DOM, no timers): src/shell/notify.js schedules, this decides WHAT to say and WHETHER to say it.
// Rules (owner brief, Nov 10 2026):
//  - opt-in only; permission is asked after the first lesson win, never on first load (src/shell/reminder-ask.js)
//  - never from Friday afternoon to Saturday night, never on major chagim (yom tov); with a city the exact
//    candle-lighting/havdalah window from notify.js is used, without one a wide, safe window
//  - quiet hours (default 22:00-07:00), at most one a day and a weekly cap, slower after a long break, silent after 45 days
//  - Rimon is gender-neutral: no he/she for Rimon, no gendered address to the learner, Hebrew lines are nouns/greetings only
import { holidaysBetween, isoDate, weekday } from "../curriculum/calendar.js";

export const REMINDER_LOG_KEY = "notify.log";
export const DEFAULT_RULES = Object.freeze({ quietFrom: 22, quietTo: 7, perWeek: 5, silentAfterDays: 45 });

/** The library. Every line: id, kind, title, body. {n} = streak days. Hebrew stays to greetings and nouns (gender-neutral). */
export const LINES = Object.freeze([
  // daily nudges
  { id: "d01", kind: "daily", title: "Rimon here 👋", body: "Five minutes of Hebrew? I already warmed up the letters." },
  { id: "d02", kind: "daily", title: "Knock knock 🍎", body: "Who's there? Bet. Bet who? Bet you can do one lesson today." },
  { id: "d03", kind: "daily", title: "Tiny lesson, big glow", body: "One short lesson and today counts. I'll hold the door." },
  { id: "d04", kind: "daily", title: "Your seeds are ready 🌱", body: "613 seeds in a pomegranate, they say. Let's plant one Hebrew word today." },
  { id: "d05", kind: "daily", title: "Rimon is doing stretches", body: "Right to left, right to left. Join me for a quick lesson?" },
  { id: "d06", kind: "daily", title: "שָׁלוֹם! Shalom!", body: "The letters asked about you. I said you'd drop by. Don't make me a liar." },
  { id: "d07", kind: "daily", title: "A two-minute plan", body: "Open the app. Tap one answer. Feel brilliant. That's the whole plan." },
  { id: "d08", kind: "daily", title: "Hebrew o'clock ⏰", body: "It's that time again. Your next lesson is already open." },
  { id: "d09", kind: "daily", title: "Psst. Rimon again.", body: "I polished the vowels. They're very shiny. Come see." },
  { id: "d10", kind: "daily", title: "Quick one?", body: "A lesson takes less time than choosing a show to watch. I checked." },
  { id: "d11", kind: "daily", title: "בְּהַצְלָחָה! Good luck!", body: "Today's word is waiting. I believe in you more than I believe in seedless pomegranates." },
  { id: "d12", kind: "daily", title: "Letters miss you", body: "Shin is pacing. Bet is pretending not to care. Pop in and say hi." },
  { id: "d13", kind: "daily", title: "Rimon's daily ping", body: "Small steps every day beat a marathon once a month. Today's step is ready." },
  { id: "d14", kind: "daily", title: "Your Hebrew called", body: "It said 'more practice, please'. I'm only passing on the message." },
  { id: "d15", kind: "daily", title: "Fresh lesson, just picked 🍎", body: "Still crunchy. Best enjoyed today." },
  { id: "d16", kind: "daily", title: "Five minutes, that's it", body: "No hearts to lose, no timer chasing you. Just you, me and a few letters." },
  { id: "d17", kind: "daily", title: "בֹּקֶר טוֹב! Good morning!", body: "Coffee, then a quick Hebrew lesson? Or Hebrew first. I don't judge." },
  { id: "d18", kind: "daily", title: "עֶרֶב טוֹב! Good evening!", body: "Wind down with one short lesson. Your brain will thank you in Hebrew." },
  { id: "d19", kind: "daily", title: "Rimon rolled over to say hi 🍎", body: "Round fruit, round number: one lesson today. Easy." },
  { id: "d20", kind: "daily", title: "A word a day", body: "Today's word is short, friendly and ready to meet you." },
  // streak at risk
  { id: "s01", kind: "streak-risk", title: "🔥 {n} days and counting…", body: "Today isn't in yet. One quick lesson keeps the flame lit." },
  { id: "s02", kind: "streak-risk", title: "Your {n}-day streak is looking at me", body: "Nervously. Five minutes would really calm it down." },
  { id: "s03", kind: "streak-risk", title: "Flame check 🔥", body: "{n} days strong. Let's not let a busy day blow it out." },
  { id: "s04", kind: "streak-risk", title: "Rimon is guarding your streak", body: "I can only hold it until midnight. Your turn after that." },
  { id: "s05", kind: "streak-risk", title: "{n} days! Don't stop now", body: "One lesson. That's the whole job tonight." },
  { id: "s06", kind: "streak-risk", title: "Still time today ⏳", body: "Your {n}-day streak needs just one short lesson. I'll keep it quick." },
  { id: "s07", kind: "streak-risk", title: "Psst, streak alert", body: "{n} days in a row is impressive. {n} plus one is more impressive." },
  { id: "s08", kind: "streak-risk", title: "Keep the glow going", body: "A missed day never erases what you learned. But a lit streak feels great. One lesson?" },
  // comeback after 1, 3, 7 days
  { id: "c101", kind: "comeback-1", title: "Missed you yesterday!", body: "No guilt, just Hebrew. Today is a great day to start a new streak." },
  { id: "c102", kind: "comeback-1", title: "Rimon saved your seat", body: "Everything you learned is still here. Pick up right where you left off." },
  { id: "c103", kind: "comeback-1", title: "Yesterday happens", body: "Today is a fresh page, and it reads right to left." },
  { id: "c104", kind: "comeback-1", title: "Back in a minute?", body: "One quick lesson and you're back on track. I made it easy." },
  { id: "c301", kind: "comeback-3", title: "Three days! Rimon checked twice", body: "The letters are fine. I'm fine. We'd all be finer with a quick lesson." },
  { id: "c302", kind: "comeback-3", title: "Your Hebrew is still in there", body: "It just needs a nudge. Five easy minutes, no catching up needed." },
  { id: "c303", kind: "comeback-3", title: "Plot twist: you come back today", body: "Best twist of the week. Your next lesson is ready." },
  { id: "c304", kind: "comeback-3", title: "Rimon misses the high-fives ✋", body: "Come back for one lesson. I'll do the cheering." },
  { id: "c701", kind: "comeback-7", title: "It's been a week 🍎", body: "No lecture. Your progress is safe. Want a gentle restart?" },
  { id: "c702", kind: "comeback-7", title: "Rimon kept the lights on", body: "Every lesson you finished is still here. One small step back in?" },
  { id: "c703", kind: "comeback-7", title: "Starting again is still learning", body: "A short review is waiting, nothing scary. I'll go slowly." },
  { id: "c704", kind: "comeback-7", title: "Last nudge for a while", body: "I'll stop pinging so often. When you're ready, I'll be right here, a little round and very patient." },
  // after Shabbat / chag (sent only once the rest window has ended)
  { id: "r01", kind: "after-rest", title: "שָׁבוּעַ טוֹב! Shavua tov!", body: "A good week starts with a good word. Mine is ready when you are." },
  { id: "r02", kind: "after-rest", title: "Shavua tov from Rimon", body: "Rested? Me too. Let's ease in with one short lesson." },
  { id: "r03", kind: "after-rest", title: "Welcome back after the chag", body: "Hope it was beautiful. Your lessons waited patiently." },
  // holiday greetings (only on days that are not yom tov)
  { id: "h-hanukkah-1", kind: "holiday", holiday: "hanukkah", title: "חֲנֻכָּה שְׂמֵחָה! Happy Chanukah!", body: "Light one more candle and learn one more word. Tonight's word: נֵר, candle." },
  { id: "h-hanukkah-2", kind: "holiday", holiday: "hanukkah", title: "Chanukah, night by night 🕎", body: "Eight nights, eight words? I'm in if you are." },
  { id: "h-purim-1", kind: "holiday", holiday: "purim", title: "Purim sameach! 🎭", body: "I'm in costume. I'm dressed as a pomegranate. It's a great costume." },
  { id: "h-purim-2", kind: "holiday", holiday: "purim", title: "Hamantaschen break?", body: "Grab one, then grab the word מְגִלָּה, scroll." },
  { id: "h-tubishvat-1", kind: "holiday", holiday: "tu-bishvat", title: "Happy Tu BiShvat 🌳", body: "New Year for trees, and a big day for pomegranates. Celebrate with a tree word: עֵץ." },
  { id: "h-yomhaatzmaut-1", kind: "holiday", holiday: "yom-haatzmaut", title: "Happy Yom HaAtzmaut 🇮🇱", body: "Practice the Hebrew they speak in Israel today. Start with: חַג שָׂמֵחַ." },
  { id: "h-erev-shabbat-1", kind: "holiday", holiday: "erev-shabbat", title: "Shabbat is coming", body: "One quick lesson this morning, then I'll go quiet until Shabbat is over. שַׁבָּת שָׁלוֹם." },
  { id: "h-erev-chag-1", kind: "holiday", holiday: "erev-chag", title: "חַג שָׂמֵחַ! Chag sameach!", body: "I'll be quiet for the chag. One short lesson before, if there's time." },
  // milestones
  { id: "m003", kind: "milestone", at: 3, title: "3 days in a row! 🔥", body: "That's a habit starting. Rimon is doing a tiny dance." },
  { id: "m007", kind: "milestone", at: 7, title: "One whole week! 🎉", body: "Seven days of Hebrew. Rimon is doing a much bigger dance." },
  { id: "m014", kind: "milestone", at: 14, title: "Two weeks strong 💪", body: "Fourteen days. Your Hebrew is officially a regular." },
  { id: "m030", kind: "milestone", at: 30, title: "30 days! כָּל הַכָּבוֹד!", body: "A month of Hebrew. I'm telling every fruit in the bowl." },
  { id: "m050", kind: "milestone", at: 50, title: "50 days 🍎🍎🍎", body: "Fifty! At this point you might know more Hebrew than me. Let's keep it that way." },
  { id: "m100", kind: "milestone", at: 100, title: "100 days. One hundred!", body: "That's commitment. Rimon has run out of dances and is making up new ones." },
  { id: "m180", kind: "milestone", at: 180, title: "Half a year of Hebrew", body: "Six months, day after day. Enjoy a lesson as your victory lap." },
  { id: "m365", kind: "milestone", at: 365, title: "A full year! 🎂", body: "365 days of Hebrew. מַזָּל טוֹב! I'm speechless. In two languages." },
  // first-week welcome
  { id: "w01", kind: "welcome", title: "Day 2 is the big one", body: "Yesterday you met your first letter. Today you meet its friends." },
  { id: "w02", kind: "welcome", title: "Rimon remembers you!", body: "Your first word is still glowing. Come build the next one." },
  { id: "w03", kind: "welcome", title: "Back for more? Love that.", body: "Day 3 is where the habit sticks. One quick lesson." },
]);

const local = (d) => ({ y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() });
const MAJOR = new Set(["rosh-hashanah", "yom-kippur", "sukkot", "shemini-atzeret", "simchat-torah", "pesach", "shavuot"]);

/** Major chag ids that touch a local date (traditional mode, so second days count: the safe side). */
export function chagOn(date) {
  try {
    const iso = isoDate(local(date));
    return holidaysBetween(iso, iso, { mode: "traditional" }).filter((h) => h.kind === "major" && MAJOR.has(h.id)).map((h) => h.id);
  } catch { return []; }
}
/** Days of mourning and remembrance: no cheeky nudges at all (Yom HaShoah, Yom HaZikaron, Tisha B'Av). */
export const SOLEMN = new Set(["yom-hashoah", "yom-hazikaron", "tisha-bav"]);
export function solemnOn(date) {
  try { const iso = isoDate(local(date)); return holidaysBetween(iso, iso, { mode: "traditional" }).some((h) => SOLEMN.has(h.id)); } catch { return false; }
}
function chagTomorrow(date) { const t = new Date(date.getTime()); t.setDate(t.getDate() + 1); return chagOn(t).length > 0; }

/**
 * Rest-window check WITHOUT a city (the notify.js window is used when a city is set): quiet from Friday 12:00 through
 * Saturday 23:59 local, on any major chag day, and from 12:00 on the eve of one. Wide on purpose: never nag on Shabbat or yom tov.
 */
export function isRestTime(date) {
  const dow = weekday(local(date));
  const h = date.getHours();
  if (dow === 6) return true;
  if (dow === 5 && h >= 12) return true;
  if (chagOn(date).length) return true;
  if (solemnOn(date)) return true;
  if (h >= 12 && chagTomorrow(date)) return true;
  return false;
}
/** Night quiet hours (default 22:00 to 07:00, wraps midnight). */
export function inQuietHours(date, rules = DEFAULT_RULES) {
  const h = date.getHours(), from = rules.quietFrom ?? 22, to = rules.quietTo ?? 7;
  return from === to ? false : from > to ? h >= from || h < to : h >= from && h < to;
}
/** Frequency cap from the send log (array of ISO timestamps). daysAway slows things down after a long break. */
export function underCap(log, now, { perWeek = DEFAULT_RULES.perWeek, daysAway = 0, silentAfterDays = DEFAULT_RULES.silentAfterDays } = {}) {
  const ts = (Array.isArray(log) ? log : []).map((s) => Date.parse(s)).filter(Number.isFinite).sort((a, b) => b - a);
  if (daysAway >= silentAfterDays) return false;
  const day = 864e5, t = now.getTime();
  const last = ts[0];
  if (last != null && local(new Date(last)).d === local(now).d && t - last < day) return false; // one a day
  if (ts.filter((x) => t - x < 7 * day).length >= perWeek) return false;
  if (daysAway >= 14 && last != null && t - last < 7 * day) return false; // long break: at most weekly
  if (daysAway >= 7 && last != null && t - last < 3 * day) return false;  // a week away: every 3 days
  return true;
}

/** Which kind of line fits today. */
export function kindFor({ streak = {}, daysAway = 0, holiday = null, afterRest = false, daysSinceStart = 99 } = {}) {
  const n = streak.count || 0;
  if (n > 0 && streak.activeToday && LINES.some((l) => l.kind === "milestone" && l.at === n)) return "milestone";
  if (holiday) return "holiday";
  if (afterRest) return "after-rest";
  if (daysAway >= 7) return "comeback-7";
  if (daysAway >= 3) return "comeback-3";
  if (daysAway >= 1 && !(n > 0)) return "comeback-1";
  if (n >= 2 && !streak.activeToday) return "streak-risk";
  if (daysSinceStart <= 3) return "welcome";
  return "daily";
}

/** Pure: pick a line, avoiding the last few ids sent. Returns {id, kind, title, body} with {n} filled in. */
export function pickLine(state = {}, { recent = [], rand = Math.random } = {}) {
  const kind = kindFor(state);
  const n = state.streak?.count || 0;
  let pool = LINES.filter((l) => l.kind === kind && (kind !== "holiday" || l.holiday === state.holiday) && (kind !== "milestone" || l.at === n));
  if (!pool.length) pool = LINES.filter((l) => l.kind === "daily");
  const fresh = pool.filter((l) => !recent.includes(l.id));
  const list = fresh.length ? fresh : pool;
  const line = list[Math.floor(rand() * list.length) % list.length];
  const fill = (s) => s.replaceAll("{n}", String(n));
  return { id: line.id, kind, title: fill(line.title), body: fill(line.body) };
}

/** Minor holidays that get a greeting (never yom tov). */
export function greetingHoliday(date) {
  try {
    const iso = isoDate(local(date));
    const ids = holidaysBetween(iso, iso, { mode: "traditional" }).map((h) => h.id);
    for (const id of ["hanukkah", "purim", "tu-bishvat", "yom-haatzmaut"]) if (ids.includes(id)) return id;
    if (weekday(local(date)) === 5 && date.getHours() < 12) return "erev-shabbat";
    if (date.getHours() < 12 && chagTomorrow(date)) return "erev-chag";
  } catch { /* calendar optional */ }
  return null;
}

/**
 * Decide at fire time: null = stay quiet. state: {streak, daysAway, daysSinceStart, log, recent, rules, restQuiet(date)?}
 * restQuiet is the city-exact window from notify.js when the learner set a city; the wide window is always applied too.
 */
export function composeReminder(now, state = {}) {
  const rules = { ...DEFAULT_RULES, ...(state.rules || {}) };
  if (isRestTime(now)) return null;
  try { if (typeof state.restQuiet === "function" && state.restQuiet(now)) return null; } catch { return null; }
  if (inQuietHours(now, rules)) return null;
  if (!underCap(state.log, now, { perWeek: rules.perWeek, daysAway: state.daysAway || 0, silentAfterDays: rules.silentAfterDays })) return null;
  if (state.streak?.activeToday && !(LINES.some((l) => l.kind === "milestone" && l.at === state.streak.count))) return null; // already studied today
  const yesterday = new Date(now.getTime() - 864e5);
  const afterRest = weekday(local(now)) === 0 || (chagOn(yesterday).length > 0 && !chagOn(now).length);
  return pickLine({ ...state, holiday: greetingHoliday(now), afterRest }, { recent: state.recent || [] });
}
