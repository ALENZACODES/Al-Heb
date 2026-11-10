/**
 * Location presets and candle-lighting / havdalah settings (Lane 1).
 * Data: data/calendar/locations.json (hand-entered approximate city-centre coordinates; see its `note`).
 * No geolocation is requested here. Settings screen (lane 8) may store settings.lat/lon; the calendar view reads
 * those as a fallback and keeps its own choices under the store key CAL_PREFS_KEY.
 */
import { loadJSON } from "./data.js";
import { DEFAULT_CANDLE_OFFSET_MIN, JERUSALEM_CANDLE_OFFSET_MIN, DEFAULT_HAVDALAH } from "./calendar.js";

const data = await loadJSON("data/calendar/locations.json");
export const LOCATION_PRESETS = data.presets;
export const HAVDALAH_CHOICES = data.havdalahChoices;
export const LOCATION_GROUPS = [...new Set(data.presets.map((p) => p.group))];

export const findPreset = (id) => data.presets.find((p) => p.id === id) || null;

/** Haifa and Zikhron Ya'akov use 30, Jerusalem 40 (Hebcal's published defaults), else 18. */
export function suggestCandleMinutes(lat, lon) {
  const near = (la, lo) => Math.abs(lat - la) < 0.15 && Math.abs(lon - lo) < 0.15;
  if (near(31.78, 35.22)) return JERUSALEM_CANDLE_OFFSET_MIN;
  if (near(32.79, 34.99) || near(32.57, 34.95)) return 30;
  const p = data.presets.find((q) => q.israel && near(q.lat, q.lon));
  return p ? p.candleMinutes : DEFAULT_CANDLE_OFFSET_MIN;
}

/** Device time zone from Intl (undefined if unavailable). */
export function deviceTimeZone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined; } catch { return undefined; }
}

/** Rough "is this point in Israel" test (bounding box) used only to pick the Israeli Torah-reading schedule for manual coordinates. */
export const looksLikeIsrael = (lat, lon) => lat >= 29.4 && lat <= 33.4 && lon >= 34.2 && lon <= 35.95;

export const CAL_PREFS_KEY = "calendar.prefs";

export const DEFAULT_PREFS = Object.freeze({
  v: 1,
  locationId: null,      // preset id, or "custom"
  lat: null, lon: null, tz: null,
  candleMinutes: DEFAULT_CANDLE_OFFSET_MIN,
  havdalah: { ...DEFAULT_HAVDALAH },
  observance: "reform",  // reform | traditional | israel (holiday day-counts)
  parshaSchedule: "auto", // auto (Israel for Israeli locations) | diaspora | israel
  remind: { candles: true, havdalah: true, holidays: true, roshChodesh: false, morning: true, evening: true },
  morningTime: "06:00", eveningTime: "22:00",
  candleAlarmMin: 30, havdalahAlarmMin: 0,
  notify: false,
});

const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const hhmm = (v, d) => (typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : d);

/** Validate/merge stored preferences with defaults; unknown keys are dropped; never throws. */
export function normalizePrefs(raw) {
  const r = raw && typeof raw === "object" ? raw : {};
  const d = DEFAULT_PREFS;
  const lat = num(r.lat), lon = num(r.lon);
  const okLat = lat != null && lat >= -90 && lat <= 90, okLon = lon != null && lon >= -180 && lon <= 180;
  const okPos = okLat && okLon;
  const preset = typeof r.locationId === "string" ? findPreset(r.locationId) : null;
  const h = r.havdalah && typeof r.havdalah === "object" ? r.havdalah : {};
  const mins = (v, lo, hi, dflt) => (Number.isInteger(v) && v >= lo && v <= hi ? v : dflt);
  const rem = r.remind && typeof r.remind === "object" ? r.remind : {};
  const bool = (k) => (typeof rem[k] === "boolean" ? rem[k] : d.remind[k]);
  return {
    v: 1,
    locationId: preset ? preset.id : okPos || r.locationId === "custom" ? "custom" : null,
    // a half-entered pair is kept (so typing latitude then longitude works); resolveLocation needs both
    lat: preset ? preset.lat : okLat ? lat : null,
    lon: preset ? preset.lon : okLon ? lon : null,
    tz: typeof r.tz === "string" && r.tz ? r.tz : preset ? preset.tz : null,
    candleMinutes: mins(r.candleMinutes, 0, 90, preset ? preset.candleMinutes : d.candleMinutes),
    havdalah: {
      mode: h.mode === "minutes" ? "minutes" : "tzeit",
      degrees: typeof h.degrees === "number" && h.degrees >= 3 && h.degrees <= 12 ? h.degrees : d.havdalah.degrees,
      minutes: mins(h.minutes, 20, 120, d.havdalah.minutes),
    },
    observance: ["reform", "traditional", "israel"].includes(r.observance) ? r.observance : d.observance,
    parshaSchedule: ["auto", "diaspora", "israel"].includes(r.parshaSchedule) ? r.parshaSchedule : d.parshaSchedule,
    remind: { candles: bool("candles"), havdalah: bool("havdalah"), holidays: bool("holidays"), roshChodesh: bool("roshChodesh"), morning: bool("morning"), evening: bool("evening") },
    morningTime: hhmm(r.morningTime, d.morningTime), eveningTime: hhmm(r.eveningTime, d.eveningTime),
    candleAlarmMin: mins(r.candleAlarmMin, 0, 240, d.candleAlarmMin), havdalahAlarmMin: mins(r.havdalahAlarmMin, 0, 240, d.havdalahAlarmMin),
    notify: r.notify === true,
  };
}

/**
 * Resolve the location in effect. `fallback` is {lat, lon} from the shell settings (may be null).
 * @returns {{lat:number, lon:number, tz:string, candleMinutes:number, israel:boolean, name:string}|null}
 */
export function resolveLocation(prefs, fallback) {
  let lat = prefs.lat, lon = prefs.lon, name = prefs.locationId && prefs.locationId !== "custom" ? findPreset(prefs.locationId)?.name : "Custom location";
  if (lat == null || lon == null) {
    if (fallback && num(fallback.lat) != null && num(fallback.lon) != null) { lat = fallback.lat; lon = fallback.lon; name = "Location from Settings"; } else return null;
  }
  const preset = prefs.locationId ? findPreset(prefs.locationId) : null;
  return {
    lat, lon, name: name || "Custom location",
    tz: prefs.tz || fallback?.tz || deviceTimeZone() || "UTC",
    candleMinutes: prefs.candleMinutes,
    israel: preset ? preset.israel : looksLikeIsrael(lat, lon),
  };
}
