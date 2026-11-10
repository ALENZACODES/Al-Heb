import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../src/shell/rimon-reminders.js';
import { shouldAsk, hourFor } from '../src/shell/reminder-ask.js';

const at = (y, m, d, h = 19, min = 0) => new Date(y, m - 1, d, h, min);

test('library: 60+ lines, every kind covered, unique ids', () => {
  assert.ok(R.LINES.length >= 60, `${R.LINES.length} lines`);
  const ids = new Set(R.LINES.map((l) => l.id)); assert.equal(ids.size, R.LINES.length);
  for (const k of ['daily', 'streak-risk', 'comeback-1', 'comeback-3', 'comeback-7', 'after-rest', 'holiday', 'milestone', 'welcome']) assert.ok(R.LINES.some((l) => l.kind === k), k);
});
test('copy rules: Rimon is gender-neutral, no AI mentions, no divine names, short enough for a notification', () => {
  for (const l of R.LINES) {
    const s = `${l.title} ${l.body}`;
    assert.doesNotMatch(s, /\b(he|she|him|her|his|hers|himself|herself)\b/i, l.id);
    assert.doesNotMatch(s, /\bA\.?I\.?\b|artificial intelligence|chatbot|\bGPT\b/i, l.id);
    assert.doesNotMatch(s, /\bG-?o-?d\b|\bLord\b|Hashem|יהוה|אֱלֹהִים|אלוהים/i, l.id);
    assert.ok(l.title.length <= 60 && l.body.length <= 160, `${l.id} length`);
  }
});
test('Hebrew in reminders is greetings and nouns only (gender-neutral list)', () => {
  const allowed = new Set(['שָׁלוֹם', 'בְּהַצְלָחָה', 'בֹּקֶר', 'טוֹב', 'עֶרֶב', 'שָׁבוּעַ', 'חֲנֻכָּה', 'שְׂמֵחָה', 'נֵר', 'מְגִלָּה', 'עֵץ', 'חַג', 'שָׂמֵחַ', 'שַׁבָּת', 'כָּל', 'הַכָּבוֹד', 'מַזָּל']);
  for (const l of R.LINES) for (const w of `${l.title} ${l.body}`.match(/[\u0590-\u05FF]+/g) || []) assert.ok(allowed.has(w), `${l.id}: ${w}`);
});
test('never on Shabbat: Friday afternoon through Saturday night is quiet without a city', () => {
  assert.equal(R.isRestTime(at(2026, 11, 13, 9)), false, 'Friday morning is fine');
  assert.equal(R.isRestTime(at(2026, 11, 13, 13)), true, 'Friday afternoon');
  assert.equal(R.isRestTime(at(2026, 11, 14, 12)), true, 'Saturday');
  assert.equal(R.isRestTime(at(2026, 11, 14, 23, 30)), true, 'Saturday night');
  assert.equal(R.isRestTime(at(2026, 11, 15, 10)), false, 'Sunday');
  assert.equal(R.composeReminder(at(2026, 11, 14, 19), {}), null);
});
test('never on major chagim, nor from noon on the eve', () => {
  assert.deepEqual(R.chagOn(at(2026, 9, 21)), ['yom-kippur']);
  assert.equal(R.composeReminder(at(2026, 9, 21, 19), {}), null, 'Yom Kippur (Monday)');
  assert.equal(R.composeReminder(at(2026, 9, 20, 15), {}), null, 'erev Yom Kippur afternoon');
  assert.equal(R.composeReminder(at(2027, 6, 11, 19), {}), null, 'Shavuot 2027 (Friday) and Shabbat');
  assert.notEqual(R.composeReminder(at(2026, 9, 23, 19), {}), null, 'a plain Wednesday after');
});
test('quiet hours and the city-exact rest window', () => {
  assert.equal(R.inQuietHours(at(2026, 11, 10, 23)), true);
  assert.equal(R.inQuietHours(at(2026, 11, 10, 6)), true);
  assert.equal(R.inQuietHours(at(2026, 11, 10, 7)), false);
  assert.equal(R.composeReminder(at(2026, 11, 10, 23), {}), null);
  assert.equal(R.composeReminder(at(2026, 11, 10, 19), { restQuiet: () => true }), null);
  assert.equal(R.composeReminder(at(2026, 11, 10, 6), { rules: { quietFrom: 0, quietTo: 0 } }) !== null, true, 'quiet hours can be switched off');
});
test('frequency cap: one a day, five a week, slower after a break, silent after 45 days', () => {
  const now = at(2026, 11, 10, 19);
  assert.equal(R.underCap([at(2026, 11, 10, 9).toISOString()], now), false, 'already sent today');
  assert.equal(R.underCap([1, 2, 3, 4, 5].map((d) => at(2026, 11, 10 - d, 19).toISOString()), now), false, 'five this week');
  assert.equal(R.underCap([at(2026, 11, 9, 19).toISOString()], now), true);
  assert.equal(R.underCap([at(2026, 11, 8, 19).toISOString()], now, { daysAway: 8 }), false, 'a week away: every 3 days');
  assert.equal(R.underCap([at(2026, 11, 5, 19).toISOString()], now, { daysAway: 20 }), false, 'long break: weekly');
  assert.equal(R.underCap([], now, { daysAway: 45 }), false, 'stops after 45 days');
});
test('the right kind of line for the moment, with the streak filled in', () => {
  const now = at(2026, 11, 10, 19); // Tuesday
  assert.equal(R.composeReminder(now, { streak: { count: 4, activeToday: false } }).kind, 'streak-risk');
  for (const l of R.LINES.filter((x) => x.kind === 'streak-risk')) assert.match(l.title + ' ' + l.body, /\{n\}|lesson|streak|flame/i, l.id);
  assert.equal(R.composeReminder(now, { streak: { count: 3, activeToday: false } }).body.includes('{n}'), false);
  assert.equal(R.composeReminder(now, { daysAway: 1 }).kind, 'comeback-1');
  assert.equal(R.composeReminder(now, { daysAway: 3 }).kind, 'comeback-3');
  assert.equal(R.composeReminder(now, { daysAway: 7 }).kind, 'comeback-7');
  assert.equal(R.composeReminder(now, { streak: { count: 7, activeToday: true } }).kind, 'milestone');
  assert.equal(R.composeReminder(now, { streak: { count: 5, activeToday: true } }), null, 'already studied today: no nudge');
  assert.equal(R.composeReminder(at(2026, 11, 15, 10), {}).kind, 'after-rest', 'Sunday: shavua tov');
  assert.equal(R.composeReminder(at(2026, 12, 7, 19), {}).kind, 'holiday', 'Chanukah 2026');
});
test('no repeats while fresh lines remain', () => {
  const seen = []; for (let i = 0; i < 10; i++) { const l = R.pickLine({}, { recent: seen, rand: () => 0 }); assert.ok(!seen.includes(l.id)); seen.push(l.id); }
});
test('the opt-in card: only after a win, only once, only where it can work', () => {
  assert.equal(shouldAsk({ supported: false, permission: 'default' }), false);
  assert.equal(shouldAsk({ supported: true, permission: 'default' }), true);
  assert.equal(shouldAsk({ supported: true, permission: 'default', asked: { answer: 'no' } }), false);
  assert.equal(shouldAsk({ supported: true, permission: 'denied' }), false);
  assert.equal(shouldAsk({ supported: true, permission: 'default', prefs: { enabled: true } }), false);
  assert.equal(hourFor(at(2026, 11, 10, 23)), 20); assert.equal(hourFor(at(2026, 11, 10, 5)), 8);
});
test('quiet on days of mourning and remembrance', () => {
  const C = R; // Tisha B'Av 2027 falls on Thursday 12 Aug (9 Av 5787)
  const day = [...Array(20).keys()].map((i) => at(2027, 8, 1 + i, 15)).find((d) => C.solemnOn(d));
  assert.ok(day, 'calendar knows Tisha BAv'); assert.equal(C.composeReminder(day, {}), null);
});
