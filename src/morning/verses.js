/**
 * Morning card content (DRAFT). Deterministic by local date: index = dayOfYear % entries.length, same verse all day,
 * no server, nothing stored about the user. Data file: data/morning-verses.json = [{ id, hebrew, english_jps1917, source_ref }].
 */
export const VERSES_URL = "data/morning-verses.json";
export const MODEH_ANI_ID = "modeh-ani-1";

/** 1-based day of the year for a local date (Jan 1 = 1). Uses UTC arithmetic on the civil date, so DST cannot shift it. */
export function dayOfYear(now) {
  const d = new Date(now);
  return Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 1)) / 86400000) + 1;
}
/** Entry for the local date of `now`. Throws on an empty list (callers show the card without a verse instead). */
export function verseFor(entries, now) {
  if (!Array.isArray(entries) || !entries.length) throw new RangeError("no morning verses");
  return entries[dayOfYear(now) % entries.length];
}
/** Validate the data file shape; returns a list of problems (empty = ok). */
export function checkVerses(entries) {
  const bad = [];
  if (!Array.isArray(entries)) return ["not an array"];
  const ids = new Set(), he = new Set();
  entries.forEach((e, i) => {
    const keys = Object.keys(e || {}).sort().join(",");
    if (keys !== "english_jps1917,hebrew,id,source_ref") bad.push(`#${i}: unexpected keys ${keys}`);
    if (!e || typeof e.source_ref !== "string" || !e.source_ref.trim()) bad.push(`#${i}: empty source_ref`);
    if (!e || typeof e.hebrew !== "string" || !/[ְ-ׇ]/.test(e.hebrew)) bad.push(`#${i}: hebrew not pointed`);
    if (!e || typeof e.english_jps1917 !== "string" || !e.english_jps1917.trim()) bad.push(`#${i}: empty english`);
    if (ids.has(e?.id)) bad.push(`#${i}: duplicate id`); ids.add(e?.id);
    if (he.has(e?.hebrew)) bad.push(`#${i}: duplicate hebrew`); he.add(e?.hebrew);
  });
  return bad;
}
/** Modeh Ani text for a voice: women say modah (derived form in the registry, marked needs-check there). */
export function modehAniFor(registryEntries, voice) {
  const r = (registryEntries || []).find((e) => e.id === MODEH_ANI_ID);
  if (!r) return null;
  const f = voice === "f" && r.variants && r.variants.f ? r.variants.f : null;
  return { id: r.id, he: f ? f.he : r.he, english: r.english, needsCheck: !!(f && f.status !== "verified"), source: r.source };
}
/** Audio button only when a real clip exists (player.status().source === "file"); never a placeholder or TTS button. */
export function modehAniClip(audio, kind = "line") {
  try { const p = audio && typeof audio.status === "function" ? audio.status(kind, MODEH_ANI_ID) : null; return p && p.source === "file" ? p : null; } catch { return null; }
}
