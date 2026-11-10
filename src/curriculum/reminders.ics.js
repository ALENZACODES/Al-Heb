/**
 * iCalendar (RFC 5545) export and a small parser (Lane 1).
 *  - instants (candle lighting, havdalah): DTSTART in UTC ("...Z"), so every calendar app shows the right moment;
 *  - prayer reminders: floating local time (no zone), so they fire at 07:30 wherever the phone is;
 *  - holidays: all-day events (DTSTART;VALUE=DATE, exclusive DTEND).
 * Every event carries one VALARM (ACTION:DISPLAY) when the item has an alarm. UIDs are deterministic, so importing
 * a newer export normally updates the same events instead of duplicating them (behaviour depends on the app).
 * What is NOT known: how each calendar app treats VALARM on import. The file is verified only by parsing it back
 * (tests/calendar.ics.test.js); it has not been imported into Apple, Google or Outlook calendars here.
 */
import { addDays } from "./calendar.js";

const CRLF = "\r\n";
const enc = new TextEncoder();
const pad = (n, w = 2) => String(n).padStart(w, "0");

/** Escape a TEXT value (RFC 5545 3.3.11). */
export const escapeText = (s) => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
export const unescapeText = (s) => s.replace(/\\n/gi, "\n").replace(/\\([;,\\])/g, "$1");

/** Fold a content line to at most 75 octets per physical line (continuations start with one space), never splitting a character. */
export function foldLine(line) {
  if (enc.encode(line).length <= 75) return line;
  const out = []; let cur = "", curBytes = 0, limit = 75;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    // Never start a continuation line with a combining mark (Hebrew vowel points stay with their letter).
    if (curBytes + b > limit && cur && !/\p{M}/u.test(ch)) { out.push(cur); cur = ""; curBytes = 0; limit = 74; }
    else if (curBytes + b > limit && cur) {
      const m = /(\P{M}\p{M}*)$/u.exec(cur);
      if (m && m[1].length < cur.length) { out.push(cur.slice(0, -m[1].length)); cur = m[1]; curBytes = enc.encode(cur).length; limit = 74; }
    }
    cur += ch; curBytes += b;
  }
  if (cur) out.push(cur);
  return out.join(CRLF + " ");
}

const utcStamp = (d) => `${pad(d.getUTCFullYear(), 4)}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
const dateOnly = (g) => `${pad(g.y, 4)}${pad(g.m)}${pad(g.d)}`;

/** Duration value for TRIGGER, e.g. 30 -> "-PT30M", 90 -> "-PT1H30M", 0 -> "PT0S". */
export function triggerFor(alarmMin) {
  if (alarmMin <= 0) return "PT0S";
  const h = Math.floor(alarmMin / 60), m = alarmMin % 60;
  return "-PT" + (h ? h + "H" : "") + (m ? m + "M" : "");
}

/**
 * @param {object[]} items from buildReminders().items
 * @param {{now?:Date, calName?:string}} [opt] `now` sets DTSTAMP (pass a fixed Date in tests)
 * @returns {string} text/calendar body, CRLF line endings
 */
export function toICS(items, opt = {}) {
  const stamp = utcStamp(opt.now || new Date());
  const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Aleph//Jewish calendar and reminders 1.0//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(opt.calName || "ALEF Jewish calendar")}`];
  for (const it of items) {
    const w = it.when;
    L.push("BEGIN:VEVENT", `UID:${it.uid}@alef.local`, `DTSTAMP:${stamp}`);
    if (w.type === "instant") {
      L.push(`DTSTART:${utcStamp(w.at)}`, `DTEND:${utcStamp(new Date(w.at.getTime() + (it.durationMin || 15) * 60000))}`);
    } else if (w.type === "floating") {
      const start = `${pad(w.y, 4)}${pad(w.m)}${pad(w.d)}T${pad(w.hh)}${pad(w.mm)}00`;
      const e = new Date(Date.UTC(w.y, w.m - 1, w.d, w.hh, w.mm + (it.durationMin || 5)));
      L.push(`DTSTART:${start}`, `DTEND:${pad(e.getUTCFullYear(), 4)}${pad(e.getUTCMonth() + 1)}${pad(e.getUTCDate())}T${pad(e.getUTCHours())}${pad(e.getUTCMinutes())}00`);
    } else {
      L.push(`DTSTART;VALUE=DATE:${dateOnly({ y: w.y, m: w.m, d: w.d })}`, `DTEND;VALUE=DATE:${dateOnly(addDays({ y: w.endY, m: w.endM, d: w.endD }, 1))}`);
    }
    L.push(`SUMMARY:${escapeText(it.title)}`, `DESCRIPTION:${escapeText(it.description)}`, `CATEGORIES:${escapeText("Aleph," + it.kind)}`,
      `TRANSP:${w.type === "instant" ? "OPAQUE" : "TRANSPARENT"}`);
    if (it.alarmMin != null) L.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${escapeText(it.title)}`, `TRIGGER:${triggerFor(it.alarmMin)}`, "END:VALARM");
    L.push("END:VEVENT");
  }
  L.push("END:VCALENDAR");
  return L.map(foldLine).join(CRLF) + CRLF;
}

/** Download helper for browsers (no-op elsewhere). Returns true if a download was started. */
export function downloadICS(text, filename = "alef-calendar.ics", doc = globalThis.document) {
  if (!doc || typeof Blob === "undefined" || !globalThis.URL?.createObjectURL) return false;
  const url = URL.createObjectURL(new Blob([text], { type: "text/calendar;charset=utf-8" }));
  const a = doc.createElement("a");
  a.href = url; a.download = filename; a.style.display = "none";
  (doc.body || doc.documentElement).append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return true;
}

// ---------- parser (for tests and for checking exports) ----------
/**
 * Minimal RFC 5545 reader: unfolds lines, parses `NAME;PARAM=V:value`, nests VEVENT/VALARM. Throws on structural
 * errors (unbalanced BEGIN/END, missing CRLF-free lines etc.).
 * @returns {{props:Record<string,{params:Record<string,string>,value:string}[]>, events:object[]}}
 */
export function parseICS(text) {
  if (!text.includes("\r\n")) throw new Error("ICS must use CRLF line endings");
  const raw = text.split("\r\n");
  if (raw[raw.length - 1] !== "") throw new Error("ICS must end with CRLF");
  raw.pop();
  const lines = [];
  for (const l of raw) {
    if (/^[ \t]/.test(l)) { if (!lines.length) throw new Error("continuation before first line"); lines[lines.length - 1] += l.slice(1); } else lines.push(l);
  }
  const stack = [{ name: "ROOT", props: {}, children: [] }];
  for (const l of lines) {
    const m = /^([A-Za-z0-9-]+)((?:;[^:;=]+=(?:"[^"]*"|[^;:]*))*):(.*)$/.exec(l);
    if (!m) throw new Error("bad content line: " + l);
    const name = m[1].toUpperCase();
    const params = {};
    for (const p of m[2].split(";").filter(Boolean)) { const [k, v] = p.split("="); params[k.toUpperCase()] = v.replace(/^"|"$/g, ""); }
    if (name === "BEGIN") { stack.push({ name: m[3], props: {}, children: [] }); continue; }
    if (name === "END") {
      const top = stack.pop();
      if (top.name !== m[3] || !stack.length) throw new Error(`unbalanced END:${m[3]}`);
      stack[stack.length - 1].children.push(top);
      continue;
    }
    (stack[stack.length - 1].props[name] ||= []).push({ params, value: m[3] });
  }
  if (stack.length !== 1) throw new Error("unclosed BEGIN");
  const cal = stack[0].children.find((c) => c.name === "VCALENDAR");
  if (!cal || stack[0].children.length !== 1) throw new Error("no single VCALENDAR");
  return { props: cal.props, events: cal.children.filter((c) => c.name === "VEVENT").map((e) => ({ props: e.props, alarms: e.children.filter((c) => c.name === "VALARM").map((a) => a.props) })) };
}

/** Parse an ICS DATE-TIME / DATE value to {y,m,d,hh?,mm?,ss?,utc?}. */
export function parseICSDate(value) {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(value);
  if (!m) throw new Error("bad ICS date " + value);
  const r = { y: +m[1], m: +m[2], d: +m[3] };
  if (m[4]) Object.assign(r, { hh: +m[4], mm: +m[5], ss: +m[6], utc: !!m[7] });
  return r;
}
