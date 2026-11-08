/**
 * Calendar day markers: one small inline SVG shape plus a text label per kind, so a day's meaning never rests on colour
 * alone (dark mode, colour-blind learners and screen readers all get the same information).
 *
 * Day kinds: festival (major), festival-minor, fast, remembrance (the modern Israeli days), roshchodesh, shabbat,
 * candles (candle lighting this evening), havdalah (Shabbat ends), done (the learner's study goal was met that day).
 * Reminder kinds (list and settings only): morning, evening, reminder-set.
 *
 * Optional artwork, the set Lane 2 ordered in docs/images/CALENDAR-ART.md: assets/img/calendar/header.png (1600x600) and
 * assets/img/calendar/markers/<name>.png (256x256) with the names in ART_NAME. A file replaces the SVG only when it exists;
 * it is probed once per browser session and never assumed (missing art degrades to the SVG and the label).
 *
 * `markersFor` is pure (no DOM) so the view and the day-page model agree on which days are important.
 */

/** Display order and labels. */
export const MARKER_KINDS = Object.freeze([
  { kind: "festival", label: "Festival" },
  { kind: "festival-minor", label: "Minor festival" },
  { kind: "fast", label: "Fast day" },
  { kind: "remembrance", label: "Remembrance day" },
  { kind: "roshchodesh", label: "Rosh Chodesh" },
  { kind: "shabbat", label: "Shabbat" },
  { kind: "candles", label: "Candle lighting" },
  { kind: "havdalah", label: "Havdalah" },
  { kind: "done", label: "Studied" },
]);
/** Markers that appear only in the reminders list and the settings form, never on a day. */
export const REMINDER_KINDS = Object.freeze([
  { kind: "morning", label: "Morning prayer" },
  { kind: "evening", label: "Evening prayer" },
  { kind: "reminder-set", label: "Reminder on" },
]);
const ALL = [...MARKER_KINDS, ...REMINDER_KINDS];
export const MARKER_LABEL = Object.freeze(Object.fromEntries(ALL.map((m) => [m.kind, m.label])));
const ORDER = Object.fromEntries(MARKER_KINDS.map((m, i) => [m.kind, i]));
/** marker kind -> file name under assets/img/calendar/markers/ (docs/images/CALENDAR-ART.md). */
export const ART_NAME = Object.freeze({
  festival: "festival", "festival-minor": "festival-minor", fast: "fast", remembrance: "remembrance", roshchodesh: "rosh-chodesh",
  shabbat: "shabbat", candles: "candles", havdalah: "havdalah", done: "lesson-done", morning: "morning", evening: "evening", "reminder-set": "reminder-set",
});
/** calendar.js holiday kind -> marker kind */
const KIND_OF_HOLIDAY = { major: "festival", minor: "festival-minor", fast: "fast", modern: "remembrance", roshchodesh: "roshchodesh" };

/**
 * Which markers a day gets.
 * @param {{holidays?:{kind:string}[], isShabbat?:boolean, isFriday?:boolean, eveOfYomTov?:boolean, done?:boolean}} d
 *   holidays = calendar.js occurrences touching the day (kind: major | minor | modern | fast | roshchodesh);
 *   eveOfYomTov = the next day is a Yom Tov day (candles are lit this evening)
 * @returns {{kind:string,label:string}[]} in display order, no duplicates
 */
export function markersFor(d = {}) {
  const set = new Set();
  for (const h of d.holidays || []) set.add(KIND_OF_HOLIDAY[h.kind] || "festival");
  if (d.isShabbat) { set.add("shabbat"); set.add("havdalah"); }
  if (d.isFriday || d.eveOfYomTov) set.add("candles");
  if (d.done) set.add("done");
  return [...set].sort((a, b) => ORDER[a] - ORDER[b]).map((kind) => ({ kind, label: MARKER_LABEL[kind] }));
}

/** A day with any marker other than "done" opens a day page. */
export const isImportant = (markers) => markers.some((m) => m.kind !== "done");

// ---------- SVG shapes (viewBox 0 0 24 24, currentColor) ----------
const SHAPES = {
  // two candles with flames
  candles: [["path", { d: "M8 10h3v10H8zM13 10h3v10h-3z" }], ["path", { d: "M9.5 3c-1.5 2.2-2 3.3-2 4.3a2 2 0 0 0 4 0c0-1-.5-2.1-2-4.3zM14.5 3c-1.5 2.2-2 3.3-2 4.3a2 2 0 0 0 4 0c0-1-.5-2.1-2-4.3z" }], ["path", { d: "M5 21h14v1.5H5z" }]],
  // braided havdalah candle with a flame and a star
  havdalah: [["path", { d: "M10.5 9h3v12h-3z" }], ["path", { d: "M12 2.5c-1.7 2.4-2.3 3.7-2.3 4.8a2.3 2.3 0 0 0 4.6 0c0-1.1-.6-2.4-2.3-4.8z" }], ["path", { d: "M18.5 11l.9 1.9 2.1.3-1.5 1.5.4 2.1-1.9-1-1.9 1 .4-2.1-1.5-1.5 2.1-.3z" }], ["path", { d: "M10.5 12.5h3M10.5 15.5h3M10.5 18.5h3", stroke: "var(--card, #fff)", "stroke-width": "1", fill: "none" }]],
  // six-pointed star
  festival: [["path", { d: "M12 2l2.9 5H9.1L12 2zM12 22l-2.9-5h5.8L12 22zM3 7h18l-9 15.5L3 7zm3.5 2L12 18.5 17.5 9h-11z", "fill-rule": "evenodd" }]],
  // an empty bowl: a fast day
  fast: [["path", { d: "M3 10h18c0 5-4 9-9 9s-9-4-9-9zm2.2 2c.8 3 3.5 5 6.8 5s6-2 6.8-5H5.2z", "fill-rule": "evenodd" }], ["path", { d: "M6 4.5l12 0v1.6H6z" }]],
  // crescent moon: the new month
  roshchodesh: [["path", { d: "M14.5 2.5a9.5 9.5 0 1 0 7 15.9A8 8 0 0 1 14.5 2.5z" }]],
  // kiddush cup
  shabbat: [["path", { d: "M6 3h12v5a6 6 0 0 1-5 5.9V18h4v2H7v-2h4v-4.1A6 6 0 0 1 6 8V3zm2 2v3a4 4 0 0 0 8 0V5H8z", "fill-rule": "evenodd" }]],
  // four-point sparkle: a minor festival
  "festival-minor": [["path", { d: "M12 2c.6 4.5 2.5 7.4 7 8-4.5.6-6.4 3.5-7 8-.6-4.5-2.5-7.4-7-8 4.5-.6 6.4-3.5 7-8z" }], ["path", { d: "M19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2-2.2-.8 2.2-.8z" }]],
  // a single memorial candle in a glass
  remembrance: [["path", { d: "M7 9h10v12H7z M9 11v8h6v-8H9z", "fill-rule": "evenodd" }], ["path", { d: "M12 2c-1.4 2-1.9 3.1-1.9 4a1.9 1.9 0 0 0 3.8 0c0-.9-.5-2-1.9-4z" }], ["path", { d: "M11 8h2v3h-2z" }]],
  // sun over the horizon
  morning: [["path", { d: "M12 7a5 5 0 0 1 5 5h-10a5 5 0 0 1 5-5z" }], ["path", { d: "M3 13h18v2H3zM11 2h2v3h-2zM4.2 5.6l1.4-1.4 2.1 2.1-1.4 1.4zM16.3 6.3l2.1-2.1 1.4 1.4-2.1 2.1z" }], ["path", { d: "M6 17h12v1.5H6zM8 20h8v1.5H8z" }]],
  // moon and one star over the horizon
  evening: [["path", { d: "M9 3a7 7 0 1 0 6.5 9.7A6 6 0 0 1 9 3z" }], ["path", { d: "M18 4l.7 1.8 1.8.7-1.8.7L18 9l-.7-1.8-1.8-.7 1.8-.7z" }], ["path", { d: "M3 18h18v1.5H3zM6 21h12v1.5H6z" }]],
  // bell: a reminder that is switched on
  "reminder-set": [["path", { d: "M12 2a1.5 1.5 0 0 1 1.5 1.5V4.3A6 6 0 0 1 18 10v4l2 3H4l2-3v-4a6 6 0 0 1 4.5-5.7V3.5A1.5 1.5 0 0 1 12 2zm0 6a4 4 0 0 0-4 4v4.6L7.4 17h9.2L16 16.6V12a4 4 0 0 0-4-4z", "fill-rule": "evenodd" }], ["path", { d: "M9.5 19h5a2.5 2.5 0 0 1-5 0z" }]],
  // check in a circle
  done: [["path", { d: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16zm4.2 4.6l1.4 1.4L11 16.6l-4.3-4.3 1.4-1.4 2.9 2.9z", "fill-rule": "evenodd" }]],
};

const SVG_NS = "http://www.w3.org/2000/svg";
function svgNode(tag, attrs) {
  const n = typeof document.createElementNS === "function" ? document.createElementNS(SVG_NS, tag) : document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
}

/** Inline SVG for a marker kind (decorative; the label carries the meaning). */
export function markerSvg(kind) {
  const svg = svgNode("svg", { viewBox: "0 0 24 24", width: "16", height: "16", "aria-hidden": "true", focusable: "false", class: "alef-mk-svg" });
  for (const [tag, attrs] of SHAPES[kind] || SHAPES.festival) svg.append(svgNode(tag, { fill: "currentColor", ...attrs }));
  return svg;
}

// ---------- optional artwork, probed once per browser session ----------
export const ART_BASE = "assets/img/calendar";
export const MARKER_ART_BASE = `${ART_BASE}/markers`;
/** Served path of a marker's optional picture. */
export const markerArtPath = (kind) => `${MARKER_ART_BASE}/${ART_NAME[kind] || kind}.png`;
const SESSION_KEY = "alef:calendar.art";
/** @type {Map<string, Promise<boolean>>} */
const probes = new Map();
const sessionRead = () => { try { return JSON.parse(globalThis.sessionStorage?.getItem(SESSION_KEY) || "{}") || {}; } catch { return {}; } };
const sessionWrite = (k, v) => { try { const o = sessionRead(); o[k] = v; globalThis.sessionStorage?.setItem(SESSION_KEY, JSON.stringify(o)); } catch { /* private mode: probe again next time */ } };
/**
 * True when `${base}/${name}.png` loads in this browser. A missing file is remembered for the browser session (sessionStorage)
 * so the calendar asks the server about each slot once, not on every navigation. Never true outside a browser.
 */
export function artAvailable(name, base = ART_BASE) {
  const key = `${base}/${name}`;
  if (probes.has(key)) return probes.get(key);
  const known = sessionRead()[key];
  const p = typeof known === "boolean" ? Promise.resolve(known) : new Promise((resolve) => {
    if (typeof Image !== "function") return resolve(false);
    try {
      const im = new Image();
      im.onload = () => { const ok = im.naturalWidth > 0; sessionWrite(key, ok); resolve(ok); };
      im.onerror = () => { sessionWrite(key, false); resolve(false); };
      im.src = `${key}.png`;
    } catch { resolve(false); }
  });
  probes.set(key, p);
  return p;
}
/** Test hook: forget probe results. */
export function resetArtProbes() { probes.clear(); try { globalThis.sessionStorage?.removeItem(SESSION_KEY); } catch { /* ignore */ } }

/**
 * A marker chip: shape + label. `compact` hides the label text visually in tight grid cells (it stays for screen readers;
 * the cell's own text names the day as well). When the marker art exists the PNG is shown instead of the SVG.
 * @param {{kind:string,label:string}} m
 */
export function markerChip(m, { compact = false, el } = {}) {
  const make = el || ((tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) if (v != null && v !== false) { if (k === "class") n.className = v; else n.setAttribute(k, v); }
    for (const c of kids) if (c != null) n.append(c);
    return n;
  });
  const chip = make("span", { class: `alef-mk alef-mk-${m.kind}` + (compact ? " compact" : ""), "data-marker": m.kind });
  chip.append(markerSvg(m.kind), make("span", { class: compact ? "alef-mk-t visually-hidden" : "alef-mk-t" }, m.label));
  artAvailable(ART_NAME[m.kind] || m.kind, MARKER_ART_BASE).then((ok) => {
    if (!ok) return;
    const img = make("img", { class: "alef-mk-img", alt: "", src: markerArtPath(m.kind), width: "16", height: "16", loading: "lazy", decoding: "async" });
    img.addEventListener("error", () => img.remove());
    chip.classList.add("has-art");
    chip.prepend(img);
  }).catch(() => {});
  return chip;
}
