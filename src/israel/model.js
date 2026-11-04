/**
 * "Sound like a local" model (Israel track). Pure functions: no DOM.
 * Data: data/israel/*.json  (draft, written by an AI agent, NOT reviewed by a native speaker; no audio exists).
 */
import { loadJSON } from "../curriculum/data.js";
import { newCard, review, due } from "../curriculum/srs.js";

export const FILES = {
  ladder: "data/israel/register-ladder.json",
  fillers: "data/israel/fillers.json",
  giveaways: "data/israel/giveaways.json",
  scenarios: "data/israel/scenarios.json",
  etiquette: "data/israel/etiquette.json",
};
export const CARDS_KEY = "israel.cards";   // own store key: { [cardId]: srs card }. Not shared with the lane 1 queue (see docs/israel/README.md).
export const STATS_KEY = "israel.stats";   // { sessions:[{at,right,total}], giveaways:{[id]:{right,total}} }
export const REGISTERS = ["formal", "neutral", "casual", "slang"];
export const CONFIDENCE = ["high", "medium", "low"];
export const GENDER_KINDS = ["none", "speaker", "addressee"];
export const ROLES = ["natural", "stiff", "off"];

export const HE_RE = /[֐-׿]/;
export const NIQQUD_RE = /[ְ-ׇ]/;
export const hasHebrew = (s) => HE_RE.test(String(s ?? ""));
export const isPointed = (s) => NIQQUD_RE.test(String(s ?? ""));

export async function loadIsrael() {
  const [ladder, fillers, giveaways, scenarios, etiquette] = await Promise.all(Object.values(FILES).map((f) => loadJSON(f)));
  return { ladder, fillers, giveaways, scenarios, etiquette };
}

/** Audio ids for a line. The audio lane has no recordings for these: they are used only to ask the player honestly. */
export const lineAudioId = (itemId, side = "") => `il-${itemId}${side ? "-" + side : ""}`;

/**
 * Honest audio status for an item. Never claims sound that is not there.
 * @returns {{available:boolean, label:string}}
 */
export function audioHook(ctx, id, voice = "m") {
  const a = ctx?.audio;
  try {
    if (a && typeof a.status === "function") {
      const s = a.status("line", id, { voice });
      if (s && s.source === "file") return { available: true, label: "Recorded or rendered file." };
    } else if (a && typeof a.has === "function" && a.has("line", id, { voice })) {
      return { available: true, label: "Audio file." };
    }
  } catch { /* fall through */ }
  return { available: false, label: "No audio yet." };
}

/** The form of a line/option for the learner's gender. `which` is "m" or "f". Lines with no gender return themselves. */
export function formFor(lineOrOption, which = "m") {
  const f = lineOrOption?.forms;
  if (!f) return { he: lineOrOption.he, translit: lineOrOption.translit };
  return f[which === "f" ? "f" : "m"];
}

/** Every Hebrew+translit line in the data, with a stable id, for the audio lane's recording script. */
export function audioNeeds(data) {
  const out = [];
  for (const p of data.ladder.pairs) for (const side of ["textbook", "everyday"]) {
    const l = p[side];
    for (const w of l.forms ? ["m", "f"] : ["n"]) out.push({ id: lineAudioId(p.id, side + (w === "n" ? "" : "-" + w)), he: w === "n" ? l.he : l.forms[w].he, translit: w === "n" ? l.translit : l.forms[w].translit });
  }
  for (const f of data.fillers.fillers) out.push({ id: lineAudioId(f.id), he: f.he, translit: f.translit });
  for (const s of data.scenarios.scenarios) s.options.forEach((o, i) => { for (const w of o.forms ? ["m", "f"] : ["n"]) out.push({ id: lineAudioId(s.id, `o${i}` + (w === "n" ? "" : "-" + w)), he: w === "n" ? o.he : o.forms[w].he, translit: w === "n" ? o.translit : o.forms[w].translit }); });
  return out;
}

// ---------------------------------------------------------------- validation (used by tests and by the view's data check)
function req(p, obj, keys, where) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v === undefined || v === null || (typeof v === "string" && !v.trim())) p.push(`${where}: missing or empty "${k}"`);
  }
}
function checkLine(p, l, where, { allowSilent = false } = {}) {
  if (allowSilent && l?.silent) { req(p, l, ["en"], where); return; }
  req(p, l, ["he", "translit", "en"], where);
  if (l?.he && !hasHebrew(l.he)) p.push(`${where}: he has no Hebrew letters`);
  if (l?.he && !isPointed(l.he)) p.push(`${where}: he is not pointed`);
}
function checkGendered(p, l, where) {
  if (!GENDER_KINDS.includes(l.gender)) { p.push(`${where}: bad gender "${l.gender}"`); return; }
  if (l.gender === "none") { if (l.forms) p.push(`${where}: gender none but forms present`); return; }
  if (!l.forms?.m || !l.forms?.f) { p.push(`${where}: gendered but forms.m/forms.f missing`); return; }
  if (l.forms.m.he !== l.he || l.forms.m.translit !== l.translit) p.push(`${where}: top-level he/translit must equal forms.m`);
  for (const w of ["m", "f"]) { req(p, l.forms[w], ["he", "translit"], `${where}.forms.${w}`); if (l.forms[w].he && !isPointed(l.forms[w].he)) p.push(`${where}.forms.${w}: not pointed`); }
  if (l.forms.m.he === l.forms.f.he) p.push(`${where}: m and f forms are identical (should not be marked gendered)`);
}
function checkFlags(p, o, where) {
  if (o.proofread !== false) p.push(`${where}: proofread must be false`);
  if (o.needsNativeReview !== true) p.push(`${where}: needsNativeReview must be true`);
  if (!CONFIDENCE.includes(o.confidence)) p.push(`${where}: bad confidence "${o.confidence}"`);
  if (o.confidence !== "high") req(p, o, ["confidenceReason"], where + " (non-high confidence needs confidenceReason)");
}
function ids(p, arr, name) {
  const seen = new Set();
  for (const x of arr) { if (seen.has(x.id)) p.push(`${name}: duplicate id ${x.id}`); seen.add(x.id); }
}

/** @returns {string[]} problems (empty = valid) */
export function validate(data) {
  const p = [];
  for (const [k, d] of Object.entries(data)) {
    if (d.proofread !== false) p.push(`${k}: file proofread must be false`);
    if (d.needsNativeReview !== true) p.push(`${k}: file needsNativeReview must be true`);
    req(p, d, ["status", "note"], k);
  }
  ids(p, data.ladder.pairs, "ladder"); ids(p, data.fillers.fillers, "fillers"); ids(p, data.giveaways.items, "giveaways");
  ids(p, data.scenarios.scenarios, "scenarios"); ids(p, data.etiquette.cards, "etiquette");
  const all = [...data.ladder.pairs, ...data.fillers.fillers, ...data.giveaways.items, ...data.scenarios.scenarios, ...data.etiquette.cards].map((x) => x.id);
  if (new Set(all).size !== all.length) p.push("ids are not unique across files");

  for (const x of data.ladder.pairs) {
    const w = x.id;
    req(p, x, ["id", "category", "situation", "genderNote", "note"], w); checkFlags(p, x, w);
    if (!data.ladder.categories.includes(x.category)) p.push(`${w}: category not in categories`);
    for (const side of ["textbook", "everyday"]) {
      const l = x[side]; checkLine(p, l, `${w}.${side}`); req(p, l, ["register"], `${w}.${side}`); checkGendered(p, l, `${w}.${side}`);
      if (!REGISTERS.includes(l.register)) p.push(`${w}.${side}: bad register ${l.register}`);
    }
    if (x.textbook.he === x.everyday.he) p.push(`${w}: textbook and everyday are identical`);
    const anyGendered = x.textbook.gender !== "none" || x.everyday.gender !== "none";
    if (anyGendered && /^No gender-marked/.test(x.genderNote)) p.push(`${w}: gendered line but genderNote says none`);
    if (!anyGendered && !/^No gender-marked/.test(x.genderNote)) p.push(`${w}: no gendered line but genderNote describes one`);
  }
  for (const x of data.fillers.fillers) {
    const w = x.id; req(p, x, ["he", "translit", "en", "register", "usage", "genderNote", "note"], w); checkFlags(p, x, w);
    if (!isPointed(x.he)) p.push(`${w}: he not pointed`);
    checkLine(p, x.example, w + ".example");
    if (!REGISTERS.includes(x.register)) p.push(`${w}: bad register`);
  }
  for (const x of data.giveaways.items) {
    const w = x.id; req(p, x, ["category", "title", "why", "fix", "say"], w); checkFlags(p, x, w);
    for (const s of ["wrong", "right"]) { req(p, x[s], ["he", "translit"], `${w}.${s}`); if (!hasHebrew(x[s].he)) p.push(`${w}.${s}: no Hebrew`); }
    if (!["none", "noun", "speaker", "addressee"].includes(x.genderFocus)) p.push(`${w}: bad genderFocus`);
    const d = x.drill; req(p, d, ["prompt", "answer", "explain"], w + ".drill");
    if (!d?.options || d.options.length !== 3) p.push(`${w}: drill needs exactly 3 options`);
    else {
      if (!d.options.some((o) => o.id === d.answer)) p.push(`${w}: drill answer not among options`);
      if (new Set(d.options.map((o) => o.id)).size !== 3) p.push(`${w}: duplicate option ids`);
      for (const o of d.options) { req(p, o, ["id", "text"], w + ".drill.option"); if (hasHebrew(o.text) && !o.translit) p.push(`${w}: Hebrew option without translit`); }
    }
  }
  if (data.giveaways.items.length < 15) p.push("giveaways: fewer than 15");
  for (const x of data.scenarios.scenarios) {
    const w = x.id; req(p, x, ["title", "place", "situation", "note"], w); checkFlags(p, x, w);
    checkLine(p, x.other, w + ".other", { allowSilent: true });
    if (!["none", "m", "f"].includes(x.otherGender)) p.push(`${w}: bad otherGender`);
    if (x.options.length !== 3) p.push(`${w}: needs exactly 3 options`);
    const roles = x.options.map((o) => o.role).sort().join();
    if (roles !== [...ROLES].sort().join()) p.push(`${w}: options must be one natural, one stiff, one off (got ${roles})`);
    x.options.forEach((o, i) => { checkLine(p, o, `${w}.o${i}`); req(p, o, ["explain"], `${w}.o${i}`); checkGendered(p, o, `${w}.o${i}`); });
    const texts = x.options.map((o) => o.he); if (new Set(texts).size !== 3) p.push(`${w}: options are not distinct`);
  }
  for (const x of data.etiquette.cards) {
    const w = x.id; req(p, x, ["title", "body"], w); checkFlags(p, x, w);
    if (!Array.isArray(x.tags) || !x.tags.length) p.push(`${w}: tags`);
    if (x.regionClaim) { if (x.confidence === "high") p.push(`${w}: regional claim cannot be high confidence`); if (!/commonly|report|generally|often/i.test(x.body)) p.push(`${w}: regional claim must be phrased as commonly heard/reported`); }
  }
  return p;
}

// ---------------------------------------------------------------- Say it trainer
/** Small deterministic PRNG (mulberry32). */
export function rng(seed) {
  let a = (Number(seed) || 1) >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function shuffled(arr, seed) {
  const r = rng(seed), a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
/**
 * Choose scenarios: overdue SRS cards first, then unseen, then the rest; the picked set is shuffled.
 * @param {object[]} scenarios @param {{seed?:number,count?:number,cards?:object,now?:number}} o
 */
export function pickScenarios(scenarios, { seed = 1, count = 8, cards = {}, now = Date.now() } = {}) {
  const idOf = (s) => cardId("scenario", s.id);
  const dueSet = new Set(due(Object.values(cards), now).map((c) => c.id));
  const dueS = scenarios.filter((s) => dueSet.has(idOf(s)));
  const unseen = scenarios.filter((s) => !cards[idOf(s)]);
  const rest = scenarios.filter((s) => !dueS.includes(s) && !unseen.includes(s));
  return shuffled([...shuffled(dueS, seed), ...shuffled(unseen, seed + 1), ...shuffled(rest, seed + 2)].slice(0, count), seed + 3);
}
/** Options in a seeded order so the natural answer is not always in the same place. */
export const orderedOptions = (scenario, seed = 1) => shuffled(scenario.options.map((o, index) => ({ ...o, index })), seed + hash(scenario.id));
function hash(s) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }

/** @returns {{correct:boolean, natural:object, picked:object}} */
export function gradePick(scenario, pickedIndex) {
  const picked = scenario.options[pickedIndex];
  return { correct: picked?.role === "natural", natural: scenario.options.find((o) => o.role === "natural"), picked };
}
/** results: [{id, picked:"natural"|"stiff"|"off"}] -> score summary. */
export function scoreSession(results) {
  const total = results.length, right = results.filter((r) => r.picked === "natural").length;
  const byRole = { natural: 0, stiff: 0, off: 0 };
  for (const r of results) if (r.picked in byRole) byRole[r.picked]++;
  const pct = total ? Math.round((right / total) * 100) : 0;
  const message = !total ? "" : byRole.stiff > byRole.off ? "Most of your misses were stiff but correct: try shorter, everyday forms." : byRole.off > 0 ? "Some replies were the wrong register for the situation: check who you are talking to." : "All natural. Remember this is a draft with no native review.";
  return { total, right, pct, byRole, message };
}

// ---------------------------------------------------------------- SRS hook (own key; scheduler is lane 1's srs.js)
export const cardId = (kind, id) => `israel:${kind}:${id}`;
/** Add cards (kind "phrase") for ids not yet present. Returns a new map. */
export function ensureCards(cards, kind, idList, now = Date.now()) {
  const next = { ...cards };
  for (const id of idList) { const cid = cardId(kind, id); if (!next[cid]) next[cid] = newCard({ id: cid, kind: "phrase", now }); }
  return next;
}
/** A natural pick is "Good" (3); a stiff pick is "Hard"-ish "Again"? Stiff = 2 (Hard), off = 1 (Again). */
export const ratingFor = (picked) => (picked === "natural" ? 3 : picked === "stiff" ? 2 : 1);
export function applyResults(cards, kind, results, now = Date.now()) {
  let next = ensureCards(cards, kind, results.map((r) => r.id), now);
  for (const r of results) { const cid = cardId(kind, r.id); next = { ...next, [cid]: review(next[cid], ratingFor(r.picked), now) }; }
  return next;
}
export const dueCount = (cards, now = Date.now()) => due(Object.values(cards || {}), now).length;
