import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as L from "../src/curriculum/calendar.locations.js";
import * as C from "../src/curriculum/calendar.js";

const raw = JSON.parse(fs.readFileSync(new URL("../data/calendar/locations.json", import.meta.url)));

test("locations.json: schema, unique ids, valid ranges and IANA zones, Israel flags", () => {
  assert.equal(raw.schema, "alef-locations-1");
  const ids = new Set();
  for (const p of raw.presets) {
    assert.ok(!ids.has(p.id), `duplicate ${p.id}`); ids.add(p.id);
    assert.match(p.id, /^[a-z0-9-]+$/);
    assert.ok(p.name && p.group);
    assert.ok(p.lat >= -90 && p.lat <= 90 && p.lon >= -180 && p.lon <= 180);
    assert.ok(Number.isInteger(p.candleMinutes) && p.candleMinutes >= 0 && p.candleMinutes <= 90);
    assert.doesNotThrow(() => new Intl.DateTimeFormat("en", { timeZone: p.tz }), `bad tz ${p.tz}`);
    assert.equal(p.israel, p.group === "Israel");
    assert.equal(L.looksLikeIsrael(p.lat, p.lon), p.israel, p.id);
    if (p.israel) assert.equal(p.tz, "Asia/Jerusalem");
  }
  const groups = new Set(raw.presets.map((p) => p.group));
  assert.ok(groups.has("United States") && groups.has("Israel"));
  assert.ok(raw.presets.filter((p) => p.group === "United States").length >= 30);
  assert.ok(raw.presets.filter((p) => p.group === "Israel").length >= 10);
});

test("candle minutes: 18 default, Jerusalem 40, Haifa and Zikhron 30, other Israeli cities 20", () => {
  const m = (id) => L.findPreset(id).candleMinutes;
  assert.equal(m("new-york"), 18); assert.equal(m("toronto"), 18);
  assert.equal(m("jerusalem"), 40); assert.equal(m("haifa"), 30); assert.equal(m("zikhron-yaakov"), 30); assert.equal(m("tel-aviv"), 20);
  assert.equal(L.suggestCandleMinutes(31.78, 35.22), 40);
  assert.equal(L.suggestCandleMinutes(32.8, 35.0), 30);
  assert.equal(L.suggestCandleMinutes(43.65, -79.38), 18);
  assert.equal(C.DEFAULT_CANDLE_OFFSET_MIN, 18);
  assert.equal(C.JERUSALEM_CANDLE_OFFSET_MIN, 40);
});

test("havdalah choices are well-formed and produce different times", () => {
  assert.ok(L.HAVDALAH_CHOICES.length >= 3);
  const g = { y: 2026, m: 11, d: 7 }, pos = { lat: 43.65, lon: -79.38 };
  const t = L.HAVDALAH_CHOICES.map((c) => C.havdalah(g, pos, c).havdalah.getTime());
  assert.equal(new Set(t).size, t.length);
  assert.ok(t.every((x) => x > C.sunset(g, 43.65, -79.38).getTime()));
});

test("normalizePrefs: defaults, preset adoption, garbage in -> safe out", () => {
  const d = L.normalizePrefs(undefined);
  assert.equal(d.locationId, null); assert.equal(d.candleMinutes, 18); assert.equal(d.havdalah.mode, "tzeit");
  assert.equal(d.remind.morning, true); assert.equal(d.remind.roshChodesh, false); assert.equal(d.notify, false);
  const j = L.normalizePrefs({ locationId: "jerusalem" });
  assert.equal(j.candleMinutes, 40); assert.equal(j.tz, "Asia/Jerusalem"); assert.equal(j.lat, 31.78);
  const custom = L.normalizePrefs({ lat: 10, lon: 20, candleMinutes: 25 });
  assert.equal(custom.locationId, "custom"); assert.equal(custom.candleMinutes, 25);
  const bad = L.normalizePrefs({ lat: 999, lon: "x", candleMinutes: -4, havdalah: { mode: "evil", minutes: 1 }, observance: "x", morningTime: "25:99", remind: { candles: "yes" }, notify: "true" });
  assert.equal(bad.lat, null); assert.equal(bad.locationId, null);
  const half = L.normalizePrefs({ locationId: "custom", lat: 43.7 });
  assert.deepEqual([half.locationId, half.lat, half.lon], ["custom", 43.7, null]);
  assert.equal(L.resolveLocation(half, null), null); // needs both to compute anything assert.equal(bad.candleMinutes, 18);
  assert.equal(bad.havdalah.mode, "tzeit"); assert.equal(bad.havdalah.minutes, 50); assert.equal(bad.observance, "reform");
  assert.equal(bad.morningTime, "07:30"); assert.equal(bad.remind.candles, true); assert.equal(bad.notify, false);
  assert.deepEqual(L.normalizePrefs(L.normalizePrefs({ locationId: "toronto", havdalah: { mode: "minutes", minutes: 72 } })), L.normalizePrefs({ locationId: "toronto", havdalah: { mode: "minutes", minutes: 72 } }));
});

test("resolveLocation: preset, custom, shell fallback, none", () => {
  assert.equal(L.resolveLocation(L.normalizePrefs(null), null), null);
  const t = L.resolveLocation(L.normalizePrefs({ locationId: "toronto" }), null);
  assert.equal(t.name, "Toronto, ON"); assert.equal(t.tz, "America/Toronto"); assert.equal(t.israel, false);
  const f = L.resolveLocation(L.normalizePrefs(null), { lat: 32.0, lon: 34.8, tz: "Asia/Jerusalem" });
  assert.equal(f.israel, true); assert.equal(f.tz, "Asia/Jerusalem");
  const c = L.resolveLocation(L.normalizePrefs({ lat: 43.7, lon: -79.4, tz: "America/Toronto", candleMinutes: 20 }), null);
  assert.equal(c.candleMinutes, 20); assert.equal(c.name, "Custom location");
});
