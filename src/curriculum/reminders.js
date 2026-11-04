/**
 * Reminder items (Lane 1): pure functions that turn calendar data + preferences into a list of reminders for a date
 * window. The same list feeds (a) the in-app reminders list, (b) the .ics export (reminders.ics.js) and (c) optional
 * local notifications while the app is open (reminders.notify.js).
 *
 * Item shape:
 *   { uid, kind, title, description, when, durationMin, alarmMin }
 *   when = { type: "instant", at: Date }                 candle lighting / havdalah (absolute time, UTC instant)
 *        | { type: "floating", y, m, d, hh, mm }          morning / evening prayer (wall-clock time on the device)
 *        | { type: "allday", y, m, d, endY, endM, endD }  holidays, Rosh Chodesh (end is the LAST day, inclusive)
 *   alarmMin = minutes before `when` for the reminder (null = no alarm).
 *
 * Nothing here runs in the background. A phone calendar fires the alarms only after the user imports the .ics file.
 */
import {
  toRD, fromRD, isoDate, parseISO, weekday, addDays, sunset, havdalah, floorToMinute, roundToMinute,
  holidaysBetween, formatTime, toHebrew, HEBREW_MONTH_NAMES,
} from "./calendar.js";
import { parshaOnShabbat } from "./calendar.parsha.js";
import { prayerCard } from "./calendar.prayer.js";
import { resolveLocation } from "./calendar.locations.js";

export const MAX_WINDOW_DAYS = 400;
const NOT_AUTHORITY = "Calculated times, approximate; check with your community.";

const israelSchedule = (prefs, loc) => prefs.parshaSchedule === "israel" || (prefs.parshaSchedule === "auto" && !!loc?.israel);

/**
 * @param {ReturnType<import("./calendar.locations.js").normalizePrefs>} prefs
 * @param {string} fromISO inclusive
 * @param {string} toISO inclusive
 * @param {{fallbackLocation?:{lat:number,lon:number,tz?:string}, voice?:"m"|"f"}} [opt]
 * @returns {{items:object[], notes:string[]}}
 */
export function buildReminders(prefs, fromISO, toISO, opt = {}) {
  const loc = resolveLocation(prefs, opt.fallbackLocation);
  const notes = [];
  const from = parseISO(fromISO), to = parseISO(toISO);
  const days = toRD(to) - toRD(from) + 1;
  if (!(days >= 1)) return { items: [], notes: ["Empty date range."] };
  if (days > MAX_WINDOW_DAYS) throw new RangeError(`window too long (${days} days, max ${MAX_WINDOW_DAYS})`);
  const items = [];
  const il = israelSchedule(prefs, loc);
  const needsLoc = prefs.remind.candles || prefs.remind.havdalah;
  if (needsLoc && !loc) notes.push("No location set: candle-lighting and havdalah reminders were skipped.");

  const hols = holidaysBetween(isoDate(addDays(from, -1)), isoDate(addDays(to, 1)), { mode: prefs.observance, roshChodesh: prefs.remind.roshChodesh });
  const eveNames = new Map(); // ISO date -> [names] for yom tov eves (major festivals only)
  for (const h of hols) if (h.kind === "major") (eveNames.get(h.eve) || eveNames.set(h.eve, []).get(h.eve)).push(h.en);

  for (let rd = toRD(from); rd <= toRD(to); rd++) {
    const g = fromRD(rd), iso = isoDate(g), dow = weekday(g);

    if (loc && prefs.remind.candles) {
      const eveHols = eveNames.get(iso) || [];
      if (dow === 5 || eveHols.length) {
        const ss = sunset(g, loc.lat, loc.lon);
        if (ss) {
          const at = floorToMinute(new Date(ss.getTime() - loc.candleMinutes * 60000));
          const parsha = dow === 5 ? parshaOnShabbat(addDays(g, 1), { israel: il }) : null;
          const what = [dow === 5 ? "Shabbat" : null, ...eveHols].filter(Boolean).join(" and ");
          items.push({
            uid: `alef-candles-${iso}`, kind: "candles",
            title: `Candle lighting (${what})`,
            description: `Candle lighting ${formatTime(at, loc.tz)} in ${loc.name}; ${loc.candleMinutes} minutes before sunset (${formatTime(ss, loc.tz)}).` +
              (parsha ? ` Torah portion: ${parsha.en} (${parsha.he}).` : "") + ` ${NOT_AUTHORITY}`,
            when: { type: "instant", at }, durationMin: 15, alarmMin: prefs.candleAlarmMin,
          });
        } else notes.push(`No sunset on ${iso} at this latitude.`);
      }
    }

    if (loc && prefs.remind.havdalah && dow === 6) {
      const hv = havdalah(g, { lat: loc.lat, lon: loc.lon }, prefs.havdalah);
      if (hv && isoDate(hv.date) === iso) {
        const at = roundToMinute(hv.havdalah);
        const how = prefs.havdalah.mode === "minutes" ? `${prefs.havdalah.minutes} minutes after sunset` : `sun ${prefs.havdalah.degrees} degrees below the horizon`;
        items.push({
          uid: `alef-havdalah-${iso}`, kind: "havdalah", title: "Havdalah (Shabbat ends)",
          description: `Shabbat ends ${formatTime(at, loc.tz)} in ${loc.name} (${how}). ${NOT_AUTHORITY}`,
          when: { type: "instant", at }, durationMin: 15, alarmMin: prefs.havdalahAlarmMin,
        });
      } else if (!hv) notes.push(`Havdalah time not computable on ${iso} at this latitude with the chosen method; choose "minutes after sunset".`);
    }

    if (prefs.remind.morning || prefs.remind.evening) {
      for (const slot of ["morning", "evening"]) {
        if (!prefs.remind[slot]) continue;
        const card = prayerCard(g, slot, { voice: opt.voice });
        const [hh, mm] = (slot === "morning" ? prefs.morningTime : prefs.eveningTime).split(":").map(Number);
        items.push({
          uid: `alef-${slot}-${iso}`, kind: slot, title: slot === "morning" ? "Morning prayer moment" : "Evening prayer moment",
          description: `${card.he}\n${card.gloss}\n\n${card.text}\n\n(Draft, not clergy reviewed.)`,
          when: { type: "floating", y: g.y, m: g.m, d: g.d, hh, mm }, durationMin: 5, alarmMin: 0,
        });
      }
    }
  }

  if (prefs.remind.holidays) {
    for (const h of hols) {
      if (h.end < fromISO || h.start > toISO) continue;
      if (h.kind === "roshchodesh" && !prefs.remind.roshChodesh) continue;
      const s = parseISO(h.start), e = parseISO(h.end);
      const hs = toHebrew(s);
      items.push({
        uid: `alef-${h.kind === "roshchodesh" ? "rc" : "holiday"}-${h.id}-${h.start}`, kind: h.kind === "roshchodesh" ? "roshchodesh" : "holiday",
        title: h.en,
        description: `${h.en} (${h.he}), ${h.start}${h.end !== h.start ? " to " + h.end : ""}; begins at sundown on ${h.eve}. Hebrew date of the first day: ${hs.day} ${HEBREW_MONTH_NAMES[hs.month].en} ${hs.year}.` +
          (h.optionalExtraDays ? " Some congregations also observe a second day." : "") + (h.note ? ` ${h.note}` : ""),
        when: { type: "allday", y: s.y, m: s.m, d: s.d, endY: e.y, endM: e.m, endD: e.d },
        durationMin: null, alarmMin: 15 * 60, // 09:00 on the day before: "begins this evening"
      });
    }
  }
  return { items: items.sort(compareItems), notes: [...new Set(notes)] };
}

/** Absolute Date at which an item starts (floating = device-local wall clock; all-day = device-local midnight). */
export function itemStart(it) {
  const w = it.when;
  if (w.type === "instant") return w.at;
  if (w.type === "floating") return new Date(w.y, w.m - 1, w.d, w.hh, w.mm, 0, 0);
  return new Date(w.y, w.m - 1, w.d, 0, 0, 0, 0);
}
export const alarmTime = (it) => (it.alarmMin == null ? null : new Date(itemStart(it).getTime() - it.alarmMin * 60000));
export const compareItems = (a, b) => itemStart(a) - itemStart(b) || a.uid.localeCompare(b.uid);

/** Next `count` items whose start is at/after `now`. */
export function upcoming(items, now, count = 8) {
  return items.filter((it) => itemStart(it) >= now).sort(compareItems).slice(0, count);
}
