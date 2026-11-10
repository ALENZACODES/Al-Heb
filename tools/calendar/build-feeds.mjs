// Builds the calendar subscription feeds under data/calendar/feeds/.
//   node tools/calendar/build-feeds.mjs            (APP_URL defaults to the review site)
// The holiday feeds run to END and the Torah feed to TORAH_END, so re-run this before those dates
// and push: subscribed calendars pick up the new file on their own.
import fs from 'node:fs';
import { buildReminders } from '../../src/curriculum/reminders.js';
import { normalizePrefs } from '../../src/curriculum/calendar.locations.js';
import { toICS } from '../../src/curriculum/reminders.ics.js';
import { MORNING_TIMES, BEDTIME_TIMES, OBSERVANCES, prayerReminderICS, torahDailyICS, prayerFeedPath, holidayFeedPath, torahFeedPath } from '../../src/curriculum/calendar.quickadd.js';

const root = new URL('../../', import.meta.url);
const APP_URL = process.env.APP_URL || 'https://alef-review.onrender.com/';
const START = process.env.FEED_START || '2026-09-01';
const END = process.env.FEED_END || '2028-12-31';
const STAMP = new Date(process.env.FEED_STAMP || '2026-11-08T00:00:00Z'); // fixed, so re-runs only change files when content changes
const write = (rel, text) => { fs.mkdirSync(new URL(rel.replace(/[^/]+$/, ''), root), { recursive: true }); fs.writeFileSync(new URL(rel, root), text); return text.length; };
const files = [];

const start = new Date(`${START}T12:00:00`);
for (const t of MORNING_TIMES) files.push([prayerFeedPath('morning', t), write(prayerFeedPath('morning', t), prayerReminderICS('morning', t, { appUrl: APP_URL, now: STAMP, start }))]);
for (const t of BEDTIME_TIMES) files.push([prayerFeedPath('bedtime', t), write(prayerFeedPath('bedtime', t), prayerReminderICS('bedtime', t, { appUrl: APP_URL, now: STAMP, start }))]);

const NAMES = { reform: 'Aleph Jewish Holidays (Reform)', traditional: 'Aleph Jewish Holidays (Traditional)', israel: 'Aleph Jewish Holidays (Israel)' };
for (const obs of OBSERVANCES) {
  const prefs = normalizePrefs({ observance: obs, remind: { candles: false, havdalah: false, holidays: true, roshChodesh: true, morning: false, evening: false } });
  const items = []; const seen = new Set();
  let a = new Date(`${START}T12:00:00Z`);
  const end = new Date(`${END}T12:00:00Z`);
  while (a <= end) {
    const b = new Date(Math.min(end.getTime(), a.getTime() + 364 * 86400000));
    const iso = (d) => d.toISOString().slice(0, 10);
    for (const it of buildReminders(prefs, iso(a), iso(b)).items) if (!seen.has(it.uid)) { seen.add(it.uid); items.push(it); }
    a = new Date(b.getTime() + 86400000);
  }
  const text = toICS(items, { now: STAMP, calName: NAMES[obs] }).replace('PRODID:-//Aleph//Jewish calendar and reminders 1.0//EN', 'PRODID:-//Aleph//Hebrew calendar 1.0//EN\r\nREFRESH-INTERVAL;VALUE=DURATION:P1D\r\nX-PUBLISHED-TTL:P1D').replace(/@alef\.local/g, '@aleph');
  files.push([holidayFeedPath(obs), write(holidayFeedPath(obs), text), items.length]);
}

const quotes = JSON.parse(fs.readFileSync(new URL('data/torah-quotes.json', root))).quotes;
const TORAH_START = new Date(`${process.env.TORAH_START || '2026-11-01'}T12:00:00`), TORAH_END = process.env.TORAH_END || '2027-12-31';
const days = Math.round((new Date(`${TORAH_END}T12:00:00`) - TORAH_START) / 86400000) + 1;
files.push([torahFeedPath(), write(torahFeedPath(), torahDailyICS(quotes, TORAH_START, days, { appUrl: APP_URL, now: STAMP })), days]);
for (const f of files) console.log(f.join('\t'));
