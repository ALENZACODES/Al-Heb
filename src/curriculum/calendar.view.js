/**
 * Calendar view (Lane 1). mount(root, ctx) -> unmount.
 *
 * Shows: today (Gregorian + Hebrew date, holiday, Torah portion), a morning prayer card at the top and an evening card
 * at the bottom of the day, Shabbat candle lighting and havdalah for the chosen city, a month/year grid with Hebrew
 * dates, holidays and parashot, location + candle/havdalah settings, an in-app reminders list, a .ics export and
 * optional notifications that only work while the app is open.
 *
 * ctx.settings.location (optional) {lat, lon, tz?}, or the shell's settings.lat / settings.lon, is used as a fallback
 * location. The view's own choices are stored under the store key `calendar.prefs` (calendar.locations.js).
 * ctx.now (optional, returns Date) is used by tests. Geolocation is never requested here.
 */
import {
  nextHolidays, candleLighting, havdalah, formatTime, floorToMinute, roundToMinute, isoDate, parseISO, addDays, weekday, saturdayOnOrAfter,
} from "./calendar.js";
import { parshaOnShabbat } from "./calendar.parsha.js";
import { monthGrid, yearGrid, dayDetail, hebrewInfo, WEEKDAYS_EN, MONTHS_EN } from "./calendar.grid.js";
import { prayerCard } from "./calendar.prayer.js";
import {
  LOCATION_PRESETS, LOCATION_GROUPS, HAVDALAH_CHOICES, CAL_PREFS_KEY, normalizePrefs, resolveLocation, findPreset, deviceTimeZone, suggestCandleMinutes,
} from "./calendar.locations.js";
import { buildReminders, upcoming, itemStart, MAX_WINDOW_DAYS } from "./reminders.js";
import { toICS, downloadICS } from "./reminders.ics.js";
import { notificationSupport, requestNotificationPermission, scheduleLocalNotifications } from "./reminders.notify.js";
import { CALENDAR_CSS } from "./calendar.style.js";
import { el, heText, tr, storeGet, storeSet } from "./dom.js";

const finite = (v) => typeof v === "number" && Number.isFinite(v);

function shellLocation(ctx) {
  const s = ctx?.settings;
  const loc = s?.location;
  if (loc && finite(loc.lat) && finite(loc.lon)) return { lat: loc.lat, lon: loc.lon, tz: loc.tz, offsetMinutes: loc.offsetMinutes };
  const lat = s?.lat, lon = s?.lon;
  return finite(lat) && finite(lon) ? { lat, lon } : null;
}

function zonedYMD(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  return { y: get("year"), m: get("month"), d: get("day") };
}

export function mount(root, ctx) {
  let alive = true;
  let prefs = normalizePrefs(null);
  let cursor = null;          // {y, m} month shown in the grid
  let gridMode = "month";     // "month" | "year"
  let selected = null;        // ISO date selected in the grid
  let exportDays = 90;
  let status = "";            // polite status line for export / notifications
  let notifier = { cancel() {} };
  let rearm = null;

  if (typeof document !== "undefined" && document.head && !document.getElementById?.("alef-cal-style")) {
    const st = el("style", { id: "alef-cal-style" }, CALENDAR_CSS);
    document.head.append(st);
  }

  const wrap = el("section", { class: "alef-calendar", "aria-labelledby": "alef-cal-h" });
  const title = el("h1", { id: "alef-cal-h", class: "alef-h", tabindex: "-1" }, tr(ctx, "cal.title", "Calendar"));
  const todayBox = el("div", { class: "alef-cal-today" });
  const gridBox = el("section", { "aria-label": "Calendar grid" });
  const remindBox = el("section", { "aria-labelledby": "alef-rem-h" });
  const settingsBox = el("details", { class: "alef-cal-settings" });
  wrap.append(title, todayBox, gridBox, remindBox, settingsBox);
  root.append(wrap);

  const nowDate = () => (ctx && typeof ctx.now === "function" ? ctx.now() : new Date());
  const loc = () => resolveLocation(prefs, shellLocation(ctx));
  const tzOf = (l) => l?.tz || shellLocation(ctx)?.tz || undefined;
  const today = () => {
    const l = loc(), tz = tzOf(l);
    const now = nowDate();
    const g = tz ? zonedYMD(now, tz) : { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
    const hour = tz ? Number(formatTime(now, tz).slice(0, 2)) : now.getHours();
    return { g, hour, now };
  };
  const israelSched = () => prefs.parshaSchedule === "israel" || (prefs.parshaSchedule === "auto" && !!loc()?.israel);
  const gridOpt = () => ({ mode: prefs.observance, israel: israelSched() });

  async function save() { await storeSet(ctx, CAL_PREFS_KEY, prefs); }
  function setPrefs(patch, { settings = false } = {}) {
    prefs = normalizePrefs({ ...prefs, ...patch });
    save();
    renderMain();
    if (settings) renderSettings();
  }

  // ---------- today ----------
  function cardBlock(slot, g, isNow, headingId) {
    const card = prayerCard(g, slot, { voice: ctx?.settings?.voice });
    const heading = slot === "morning" ? tr(ctx, "cal.morning", "Morning prompt") : tr(ctx, "cal.evening", "Evening prompt");
    return el("section", { class: "alef-prayer" + (isNow ? " now" : ""), "aria-labelledby": headingId, "data-slot": slot },
      el("h2", { id: headingId }, heading),
      el("p", {}, heText(card.he, "alef-he alef-he-large")),
      el("p", {}, card.gloss),
      el("p", { class: "alef-reflect" }, card.text),
      el("p", { class: "alef-cal-draft" }, el("small", {}, `Draft, not reviewed by clergy. Hebrew line from the text registry (${card.registryRef || card.registryId}, status: ${card.registryStatus}).`)));
  }

  function timesBlock(g, l) {
    if (!l) return el("p", { class: "alef-candles" }, tr(ctx, "cal.needLocation", "Set your location in Settings to see candle-lighting times."));
    const tz = tzOf(l);
    const cl = candleLighting(g, { lat: l.lat, lon: l.lon, offsetMinutes: l.candleMinutes });
    const hv = havdalah(saturdayOnOrAfter(g), { lat: l.lat, lon: l.lon }, prefs.havdalah);
    const how = prefs.havdalah.mode === "minutes" ? `${prefs.havdalah.minutes} min after sunset` : `${prefs.havdalah.degrees} degrees below the horizon`;
    return el("div", {},
      cl
        ? el("p", { class: "alef-candles" }, `${isoDate(cl.date)}: ${formatTime(floorToMinute(cl.candles), tz)} ${tz || "UTC"} `,
            el("small", {}, `(candle lighting in ${l.name}; sunset ${formatTime(cl.sunset, tz)}, ${l.candleMinutes} min before; approximate, check with your community)`))
        : el("p", { class: "alef-candles" }, "No sunset on that date at this latitude."),
      hv
        ? el("p", { class: "alef-havdalah" }, `${isoDate(hv.date)}: ${formatTime(roundToMinute(hv.havdalah), tz)} ${tz || "UTC"} `, el("small", {}, `(havdalah, ${how})`))
        : el("p", { class: "alef-havdalah" }, "Havdalah time is not computable at this latitude with the chosen method; choose \"minutes after sunset\"."));
  }

  function renderToday() {
    const { g, hour } = today();
    const l = loc();
    const heb = hebrewInfo(g);
    const det = dayDetail(g, gridOpt());
    const nextSat = saturdayOnOrAfter(g);
    const sp = parshaOnShabbat(nextSat, { israel: israelSched() });
    const hols = nextHolidays(isoDate(g), 3, { mode: prefs.observance });
    const slot = hour >= 16 ? "evening" : "morning";
    todayBox.replaceChildren(...[
      el("p", { class: "alef-hebdate" }, `${det.weekdayName} ${isoDate(g)} · `, `${heb.label}`, " ", heText(`${heb.dayHe} ${heb.monthHe} ${heb.yearHe}`)),
      det.holidays.length ? el("p", { class: "alef-today-holiday" }, det.holidays.map((h) => h.en).join("; ")) : null,
      cardBlock("morning", g, slot === "morning", "alef-prompt-m"),
      el("section", { "aria-labelledby": "alef-shabbat-h" },
        el("h2", { id: "alef-shabbat-h" }, tr(ctx, "cal.candles", "Shabbat candle lighting")),
        el("p", { class: "alef-parsha" }, sp ? ["Torah portion this Shabbat (", isoDate(nextSat), "): ", el("strong", {}, sp.en), " ", heText(sp.he)] : `Shabbat ${isoDate(nextSat)}: no regular Torah portion (festival Shabbat).`),
        timesBlock(g, l)),
      el("section", { "aria-labelledby": "alef-up-h" },
        el("h2", { id: "alef-up-h" }, tr(ctx, "cal.upcoming", "Coming up")),
        el("ul", { class: "alef-holidays" }, ...hols.map((h) =>
          el("li", { "data-holiday": h.id }, el("strong", {}, h.en), " ", heText(h.he), ` ${h.start}${h.end !== h.start ? " to " + h.end : ""}`,
            h.verified === "unverified" ? " (date rule unverified)" : "")))),
      cardBlock("evening", g, slot === "evening", "alef-prompt-e")].filter(Boolean));
  }

  // ---------- grid ----------
  function dayLabel(c) {
    return `${WEEKDAYS_EN[c.weekday]} ${c.g.d} ${MONTHS_EN[c.g.m - 1]} ${c.g.y}, ${c.hebrew.label}` + (c.label ? `, ${c.label}` : "");
  }

  function renderGrid() {
    const { g } = today();
    if (!cursor) cursor = { y: g.y, m: g.m };
    const todayISO = isoDate(g);
    const nav = el("div", { class: "alef-cal-nav", role: "group", "aria-label": "Calendar navigation" },
      el("button", { type: "button", "aria-label": gridMode === "month" ? "Previous month" : "Previous year", onclick: () => step(-1) }, "‹"),
      el("button", { type: "button", onclick: () => { cursor = { y: g.y, m: g.m }; selected = todayISO; renderGrid(); } }, "Today"),
      el("button", { type: "button", "aria-label": gridMode === "month" ? "Next month" : "Next year", onclick: () => step(1) }, "›"),
      el("button", { type: "button", "aria-pressed": String(gridMode === "month"), onclick: () => { gridMode = "month"; renderGrid(); } }, "Month"),
      el("button", { type: "button", "aria-pressed": String(gridMode === "year"), onclick: () => { gridMode = "year"; renderGrid(); } }, "Year"));
    if (gridMode === "year") {
      const yg = yearGrid(cursor.y, gridOpt());
      gridBox.replaceChildren(
        el("h2", {}, `${cursor.y}`), nav,
        el("div", { class: "alef-cal-year" }, ...yg.months.map((mo) =>
          el("div", {}, el("button", { type: "button", class: "alef-cal-btn", onclick: () => { cursor = { y: cursor.y, m: mo.m }; gridMode = "month"; renderGrid(); } }, `${mo.title}`),
            el("table", { class: "alef-cal-mini", role: "presentation" }, el("tbody", {}, ...mo.weeks.map((w) =>
              el("tr", {}, ...w.map((c) => el("td", { class: c.inMonth ? (c.holiday ? "hol" : c.roshChodesh ? "rc" : c.shabbat ? "sat" : "") : "", "aria-hidden": c.inMonth ? null : "true" }, c.inMonth ? String(c.d) : "")))))),
            el("small", { class: "alef-cal-note" }, mo.hebrewRange)))),
        el("p", { class: "alef-cal-note" }, "Shaded days are festivals and observances; underlined days are Rosh Chodesh. Pick a month for details."));
      return;
    }
    const mg = monthGrid(cursor.y, cursor.m, gridOpt());
    const sel = selected && selected.slice(0, 7) === `${cursor.y}-${String(cursor.m).padStart(2, "0")}` ? selected : null;
    const table = el("table", { class: "alef-cal-table" },
      el("caption", {}, `${mg.title} · ${mg.hebrewRange} `, heText(mg.hebrewRangeHe)),
      el("thead", {}, el("tr", {}, ...WEEKDAYS_EN.map((d) => el("th", { scope: "col", abbr: d }, d.slice(0, 3))))),
      el("tbody", {}, ...mg.weeks.map((w) => el("tr", {}, ...w.map((c) => {
        const cls = ["alef-cal-day", c.inMonth ? "" : "out", c.isShabbat ? "shabbat" : "", c.holidays.some((x) => x.kind !== "roshchodesh") ? "holiday" : "", c.iso === todayISO ? "today" : ""].filter(Boolean).join(" ");
        return el("td", {}, el("button", { type: "button", class: cls, "aria-pressed": String(c.iso === sel), "aria-label": dayLabel(c), "data-date": c.iso,
          onclick: () => { selected = c.iso; renderGrid(); } },
        el("span", { class: "g" }, String(c.g.d)),
        el("span", { class: "h", lang: "he", dir: "rtl" }, c.hebrew.day === 1 ? `${c.hebrew.dayHe} ${c.hebrew.monthHe}` : c.hebrew.dayHe),
        el("span", { class: "l" }, c.label)));
      })))));
    gridBox.replaceChildren(el("h2", {}, "Month"), nav, table, sel ? detailPanel(parseISO(sel)) : el("p", { class: "alef-cal-note" }, "Select a day for details."));
  }

  function step(dir) {
    if (gridMode === "year") cursor = { y: cursor.y + dir, m: cursor.m };
    else { let m = cursor.m + dir, y = cursor.y; if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; } cursor = { y, m }; }
    renderGrid();
  }

  function detailPanel(g) {
    const d = dayDetail(g, gridOpt());
    const l = loc();
    const kids = [
      el("h3", {}, `${d.weekdayName} ${d.iso}`),
      el("p", {}, d.hebrew.label, " ", heText(`${d.hebrew.dayHe} ${d.hebrew.monthHe} ${d.hebrew.yearHe}`)),
    ];
    if (d.parsha) kids.push(el("p", {}, "Torah portion: ", el("strong", {}, d.parsha.en), " ", heText(d.parsha.he)));
    else if (weekday(g) === 6) kids.push(el("p", {}, "No regular Torah portion this Shabbat (festival)."));
    for (const h of d.holidays) kids.push(el("p", {}, el("strong", {}, h.en), " ", heText(h.he), h.days > 1 ? ` (day ${h.dayIndex} of ${h.days})` : ""));
    for (const h of d.eveOf) kids.push(el("p", {}, `Begins at sundown this evening: ${h.en}.`));
    if (l && (weekday(g) === 5 || weekday(g) === 6)) {
      const tz = tzOf(l);
      if (weekday(g) === 5) { const c = candleLighting(g, { lat: l.lat, lon: l.lon, offsetMinutes: l.candleMinutes }); if (c) kids.push(el("p", {}, `Candle lighting ${formatTime(floorToMinute(c.candles), tz)} (${l.name}).`)); }
      else { const h = havdalah(g, { lat: l.lat, lon: l.lon }, prefs.havdalah); if (h) kids.push(el("p", {}, `Havdalah ${formatTime(roundToMinute(h.havdalah), tz)} (${l.name}).`)); }
    }
    if (!d.holidays.length && !d.eveOf.length && !d.parsha && weekday(g) !== 6) kids.push(el("p", { class: "alef-cal-note" }, "No festival or observance on this day."));
    return el("div", { class: "alef-cal-detail", role: "region", "aria-live": "polite", "aria-label": "Day details" }, ...kids);
  }

  // ---------- reminders ----------
  function currentItems(days) {
    const { g } = today();
    return buildReminders(prefs, isoDate(g), isoDate(addDays(g, days - 1)), { fallbackLocation: shellLocation(ctx), voice: ctx?.settings?.voice });
  }

  function fmtItem(it, l) {
    const w = it.when;
    if (w.type === "instant") return `${isoDate(parseDate(w.at, tzOf(l)))} ${formatTime(w.at, tzOf(l))}`;
    if (w.type === "floating") return `${w.y}-${String(w.m).padStart(2, "0")}-${String(w.d).padStart(2, "0")} ${String(w.hh).padStart(2, "0")}:${String(w.mm).padStart(2, "0")}`;
    return `${w.y}-${String(w.m).padStart(2, "0")}-${String(w.d).padStart(2, "0")}`;
  }
  const parseDate = (at, tz) => (tz ? zonedYMD(at, tz) : { y: at.getFullYear(), m: at.getMonth() + 1, d: at.getDate() });

  function armNotifications() {
    notifier.cancel();
    if (rearm) { clearInterval(rearm); rearm = null; }
    const sup = notificationSupport();
    if (!prefs.notify || !sup.supported || sup.permission !== "granted") return;
    const go = () => { notifier.cancel(); notifier = scheduleLocalNotifications(currentItems(3).items, { now: nowDate() }); };
    go();
    rearm = setInterval(go, 3600 * 1000);
  }

  function renderReminders() {
    const l = loc();
    const { now } = today();
    const { items, notes } = currentItems(Math.min(MAX_WINDOW_DAYS, 60));
    const next = upcoming(items, new Date(now.getTime() - 60000), 8);
    const sup = notificationSupport();
    remindBox.replaceChildren(
      el("h2", { id: "alef-rem-h" }, "Reminders"),
      el("p", { class: "alef-cal-note" }, "Candle lighting, havdalah, holidays and a short morning and evening prayer moment. Download them as a calendar file and import it into your phone's calendar so they fire even when this app is closed."),
      el("h3", {}, "Next reminders"),
      next.length
        ? el("ul", { class: "alef-cal-list", "aria-label": "Upcoming reminders" }, ...next.map((it) => el("li", { "data-kind": it.kind }, el("strong", {}, fmtItem(it, l)), " ", it.title)))
        : el("p", { class: "alef-cal-note" }, "Nothing scheduled: turn reminder types on in Settings."),
      ...notes.map((n) => el("p", { class: "alef-cal-note", role: "note" }, n)),
      el("div", { class: "alef-cal-form" },
        el("div", { class: "row" },
          el("label", {}, "Days to include",
            el("select", { id: "alef-ics-days", onchange: (e) => { exportDays = Number(e.target.value) || 90; } },
              ...[30, 60, 90, 180, 365].map((n) => el("option", { value: String(n), selected: n === exportDays }, `${n} days`)))),
          el("button", { type: "button", class: "alef-cal-btn primary", id: "alef-ics-btn", onclick: doExport }, "Download calendar file (.ics)"))),
      el("p", { class: "alef-cal-note", role: "status", id: "alef-rem-status" }, status),
      el("h3", {}, "Notifications while the app is open"),
      el("p", { class: "alef-cal-note" }, "Browser notifications can only fire while this app is open on your device. There is no server, so nothing can wake the app when it is closed. Use the calendar file for that."),
      sup.supported
        ? el("div", { class: "row" },
          el("button", { type: "button", class: "alef-cal-btn", id: "alef-notify-btn", "aria-pressed": String(prefs.notify && sup.permission === "granted"), onclick: toggleNotify },
            prefs.notify && sup.permission === "granted" ? "Turn off notifications" : "Turn on notifications"),
          el("span", { class: "alef-cal-note" }, `Permission: ${sup.permission}`))
        : el("p", { class: "alef-cal-note" }, "This browser does not support notifications."));
  }

  function doExport() {
    try {
      const { items, notes } = currentItems(exportDays);
      if (!items.length) { status = "Nothing to export: turn on at least one reminder type in Settings."; renderReminders(); return; }
      const text = toICS(items, { now: nowDate() });
      const started = downloadICS(text, `alef-calendar-${isoDate(today().g)}.ics`);
      status = `${started ? "Downloaded" : "Prepared"} ${items.length} events for ${exportDays} days.` + (notes.length ? ` ${notes[0]}` : "") + " Import the file into your phone's calendar; alarm behaviour depends on the calendar app.";
    } catch (e) { status = `Could not build the file: ${e.message}`; }
    renderReminders();
  }

  async function toggleNotify() {
    const sup = notificationSupport();
    if (prefs.notify && sup.permission === "granted") { prefs = normalizePrefs({ ...prefs, notify: false }); await save(); status = "Notifications turned off."; }
    else {
      const p = await requestNotificationPermission();
      prefs = normalizePrefs({ ...prefs, notify: p === "granted" }); await save();
      status = p === "granted" ? "Notifications on, for as long as this app stays open." : `Notifications not enabled (permission: ${p}).`;
    }
    armNotifications(); renderReminders();
  }

  // ---------- settings ----------
  function renderSettings() {
    const l = loc();
    const n = (k) => (v) => setPrefs({ [k]: v });
    const check = (key, label) => el("label", { class: "check" }, el("input", { type: "checkbox", checked: prefs.remind[key], onchange: (e) => setPrefs({ remind: { ...prefs.remind, [key]: !!e.target.checked } }) }), label);
    const hv = prefs.havdalah.mode === "minutes" ? `min${prefs.havdalah.minutes}` : "tzeit85";
    settingsBox.replaceChildren(
      el("summary", {}, el("strong", {}, "Settings: location, candle lighting, reminders")),
      el("div", { class: "alef-cal-form" },
        el("label", {}, "City",
          el("select", { id: "alef-loc-select", onchange: (e) => {
            const p = findPreset(e.target.value);
            if (p) setPrefs({ locationId: p.id, lat: p.lat, lon: p.lon, tz: p.tz, candleMinutes: p.candleMinutes }, { settings: true });
            else if (e.target.value === "custom") setPrefs({ locationId: "custom", tz: prefs.tz || deviceTimeZone() || null }, { settings: true });
            else setPrefs({ locationId: null, lat: null, lon: null, tz: null }, { settings: true });
          } },
          el("option", { value: "" }, "Choose a city"),
          ...LOCATION_GROUPS.map((gr) => el("optgroup", { label: gr }, ...LOCATION_PRESETS.filter((p) => p.group === gr).map((p) => el("option", { value: p.id, selected: prefs.locationId === p.id }, p.name)))),
          el("option", { value: "custom", selected: prefs.locationId === "custom" }, "Other (enter coordinates)"))),
        el("div", { class: "row" },
          el("label", {}, "Latitude", el("input", { id: "alef-lat", type: "number", step: "0.01", min: "-90", max: "90", value: prefs.lat ?? "", onchange: (e) => { const v = e.target.value === "" ? null : Number(e.target.value); setPrefs({ locationId: "custom", lat: v, candleMinutes: v != null && prefs.lon != null ? suggestCandleMinutes(v, prefs.lon) : prefs.candleMinutes }, { settings: true }); } })),
          el("label", {}, "Longitude (east is positive)", el("input", { id: "alef-lon", type: "number", step: "0.01", min: "-180", max: "180", value: prefs.lon ?? "", onchange: (e) => { const v = e.target.value === "" ? null : Number(e.target.value); setPrefs({ locationId: "custom", lon: v, candleMinutes: v != null && prefs.lat != null ? suggestCandleMinutes(prefs.lat, v) : prefs.candleMinutes }, { settings: true }); } })),
          el("label", {}, "Time zone (IANA name)", el("input", { id: "alef-tz", type: "text", value: prefs.tz || l?.tz || deviceTimeZone() || "", placeholder: "America/Toronto", onchange: (e) => setPrefs({ tz: e.target.value.trim() || null }) }))),
        el("p", { class: "alef-cal-note" }, "Your location stays on this device. The app never asks the browser for your position; pick a city or type coordinates."),
        el("div", { class: "row" },
          el("label", {}, "Candle lighting: minutes before sunset", el("input", { id: "alef-candle-min", type: "number", min: "0", max: "90", step: "1", value: prefs.candleMinutes, onchange: (e) => n("candleMinutes")(Math.round(Number(e.target.value))) })),
          ...[18, 30, 40].map((v) => el("button", { type: "button", class: "alef-cal-btn", "aria-pressed": String(prefs.candleMinutes === v), onclick: () => setPrefs({ candleMinutes: v }, { settings: true }) }, `${v}`))),
        el("p", { class: "alef-cal-note" }, "Default 18; Jerusalem 40; Haifa 30; most other Israeli cities 20. Communities differ: use your own congregation's custom."),
        el("label", {}, "Havdalah (end of Shabbat)",
          el("select", { id: "alef-havdalah", onchange: (e) => { const c = HAVDALAH_CHOICES.find((x) => x.id === e.target.value); if (c) setPrefs({ havdalah: { ...prefs.havdalah, mode: c.mode, degrees: c.degrees ?? prefs.havdalah.degrees, minutes: c.minutes ?? prefs.havdalah.minutes } }); } },
          ...HAVDALAH_CHOICES.map((c) => el("option", { value: c.id, selected: c.id === hv }, c.label)))),
        el("label", {}, "Holiday days",
          el("select", { id: "alef-observance", onchange: (e) => setPrefs({ observance: e.target.value }) },
            el("option", { value: "reform", selected: prefs.observance === "reform" }, "Reform: one festival day, Rosh Hashanah second day optional"),
            el("option", { value: "traditional", selected: prefs.observance === "traditional" }, "Traditional diaspora: two days (Rosh Hashanah, Shavuot), 8 days of Pesach"),
            el("option", { value: "israel", selected: prefs.observance === "israel" }, "Israel: one festival day, two days of Rosh Hashanah"))),
        el("label", {}, "Torah reading schedule",
          el("select", { id: "alef-parsha", onchange: (e) => setPrefs({ parshaSchedule: e.target.value }) },
            el("option", { value: "auto", selected: prefs.parshaSchedule === "auto" }, "Automatic (Israel schedule for Israeli cities)"),
            el("option", { value: "diaspora", selected: prefs.parshaSchedule === "diaspora" }, "Diaspora"),
            el("option", { value: "israel", selected: prefs.parshaSchedule === "israel" }, "Israel"))),
        el("div", { class: "row" },
          el("label", {}, "Morning prayer moment", el("input", { id: "alef-morning-time", type: "time", value: prefs.morningTime, onchange: (e) => setPrefs({ morningTime: e.target.value }) })),
          el("label", {}, "Evening prayer moment", el("input", { id: "alef-evening-time", type: "time", value: prefs.eveningTime, onchange: (e) => setPrefs({ eveningTime: e.target.value }) }))),
        el("fieldset", {}, el("legend", {}, "Reminders to include"),
          check("candles", "Candle lighting (Fridays and festival eves)"), check("havdalah", "Havdalah (Saturday night)"), check("holidays", "Holidays"),
          check("roshChodesh", "Rosh Chodesh"), check("morning", "Morning prayer moment"), check("evening", "Evening prayer moment")),
        el("div", { class: "row" },
          el("label", {}, "Candle-lighting alert (minutes before)", el("input", { id: "alef-candle-alarm", type: "number", min: "0", max: "240", step: "5", value: prefs.candleAlarmMin, onchange: (e) => n("candleAlarmMin")(Math.round(Number(e.target.value))) })))));
  }

  function renderMain() { if (!alive) return; renderToday(); renderGrid(); renderReminders(); armNotifications(); }

  (async () => {
    prefs = normalizePrefs(await storeGet(ctx, CAL_PREFS_KEY, null));
    if (!alive) return;
    if (!loc()) settingsBox.setAttribute("open", "");
    renderMain();
    renderSettings();
  })();

  return () => { alive = false; notifier.cancel(); if (rearm) clearInterval(rearm); wrap.remove(); };
}
