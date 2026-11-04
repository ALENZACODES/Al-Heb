// @ts-check
// Pure helpers for the Traditions screen (no DOM). Reads data/traditions/*.json plus, read-only,
// data/pronunciation/*, data/corpus/registry.json and src/pronunciation/transliterate.js.
//
// Three settings are compared: 'israeli', 'sephardi' (the app's name for "American synagogue, Sephardi
// values", per docs/CONTRACT.md) and 'ashkenazi'. The transliteration engine writes israeli and sephardi
// with identical Latin letters, so a respelling alone cannot show the American-synagogue habits; the
// screen says so instead of pretending otherwise.

import { transliterate } from '../pronunciation/transliterate.js';

export const TRADITIONS = ['israeli', 'sephardi', 'ashkenazi'];

/** Short labels for the three settings. 'sephardi' is the American-synagogue setting. */
export const SETTING_LABELS = {
  israeli: 'Modern Israeli',
  sephardi: 'American synagogue (Sephardi values)',
  ashkenazi: 'Ashkenazi',
};

/** Column key in data/traditions/sounds.json for each setting. */
export const COLUMN_FOR = { israeli: 'israeli', sephardi: 'american', ashkenazi: 'ashkenazi' };

export const CONFIDENCE_LABELS = { high: 'High confidence', medium: 'Medium confidence', low: 'Low confidence' };

export const DRAFT_NOTICE = 'Draft, unreviewed. This screen was drafted from a handful of public references (listed under "Sources"). No native speaker, cantor or linguist has checked it, and there is no recorded audio for it yet. Communities differ; treat it as a map, not a ruling.';

const isLetter = (c) => c >= 'א' && c <= 'ת';
const isMark = (c) => (c >= '\u0591' && c <= '\u05C7') && c !== '\u05BE' && c !== '\u05C0' && c !== '\u05C3';

/** Split pointed Hebrew into letter clusters {ch, marks}. Non-Hebrew characters are skipped. */
export function clusters(he) {
  const out = [];
  for (const c of String(he)) {
    if (isLetter(c)) out.push({ ch: c, marks: '' });
    else if (isMark(c) && out.length) out[out.length - 1].marks += c;
  }
  return out;
}

/** @param {string} he @returns {string[]} the non-empty lines of a registry text */
export function textLines(he) {
  return String(he).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

/** Whitespace tokens that contain at least one Hebrew letter. */
export function wordsOf(line) {
  return String(line).split(/\s+/).filter((w) => /[א-ת]/.test(w));
}

/** Latin respelling of a whole text, one string per line. */
export function respellLines(he, tradition) {
  if (!TRADITIONS.includes(tradition)) throw new RangeError(`unknown tradition: ${tradition}`);
  return textLines(he).map((l) => transliterate(l, { tradition }));
}

/**
 * Word by word comparison. Each row has the pointed word and its respelling in all three settings.
 * `differs` is true when the Israeli and Ashkenazi respellings are not identical; 'sephardi' is always
 * identical to 'israeli' in this engine (kept as its own field so the screen can say so).
 */
export function compareWords(he) {
  const rows = [];
  for (const line of textLines(he)) {
    const words = wordsOf(line);
    const per = Object.fromEntries(TRADITIONS.map((t) => [t, transliterate(line, { tradition: t }).split(/\s+/).filter(Boolean)]));
    const aligned = TRADITIONS.every((t) => per[t].length === words.length);
    words.forEach((w, i) => {
      const r = aligned
        ? { israeli: per.israeli[i], sephardi: per.sephardi[i], ashkenazi: per.ashkenazi[i] }
        : Object.fromEntries(TRADITIONS.map((t) => [t, transliterate(w, { tradition: t })]));
      rows.push({ he: w, ...r, differs: r.israeli !== r.ashkenazi });
    });
  }
  return rows;
}

/** Which sound rows (ids from sounds.json) apply to letters/marks in this text. 'stress' applies to any text. */
const DETECTORS = {
  'tav-no-dagesh': (cs) => cs.some((c) => c.ch === 'ת' && !c.marks.includes('\u05BC')),
  kamatz: (cs) => cs.some((c) => c.marks.includes('\u05B8')),
  'patach-kamatz': (cs) => cs.some((c) => c.marks.includes('\u05B8')) && cs.some((c) => c.marks.includes('\u05B7')),
  cholam: (cs) => cs.some((c) => c.marks.includes('\u05B9') || c.marks.includes('\u05BA')),
  tsere: (cs) => cs.some((c) => c.marks.includes('\u05B5')),
  shva: (cs) => cs.some((c) => c.marks.includes('\u05B0')),
  ayin: (cs) => cs.some((c) => c.ch === 'ע'),
  chet: (cs) => cs.some((c) => c.ch === 'ח' || ((c.ch === 'כ' || c.ch === 'ך') && !c.marks.includes('\u05BC'))),
  qof: (cs) => cs.some((c) => c.ch === 'ק'),
  resh: (cs) => cs.some((c) => c.ch === 'ר'),
  stress: (cs) => cs.length > 1,
};

export const DETECTOR_IDS = Object.keys(DETECTORS);

/** @param {string} he @returns {string[]} ids of sound rows that occur in the text */
export function soundsIn(he) {
  const cs = clusters(he);
  return DETECTOR_IDS.filter((id) => DETECTORS[id](cs));
}

/** Sounds where Ashkenazi reading differs from the Israeli/Sephardi values, restricted to what occurs in the text. */
export const ASHKENAZI_SWITCH_IDS = ['tav-no-dagesh', 'kamatz', 'patach-kamatz', 'tsere', 'stress'];
export function switchesIn(he) {
  const here = new Set(soundsIn(he));
  return ASHKENAZI_SWITCH_IDS.filter((id) => here.has(id));
}

/** IPA for a setting from the read-only pronunciation data, or '' when none is claimed. American synagogue has no IPA. */
export function ipaFor(sound, tradition, pron) {
  if (!sound.link || tradition === 'sephardi' || !pron) return '';
  const { kind, id, variant } = sound.link;
  let rec;
  if (kind === 'consonant') rec = pron.consonants?.letters?.[id];
  else if (kind === 'niqqud') rec = pron.niqqud?.records?.find((r) => r.id === id);
  if (!rec) return '';
  if (variant) {
    const v = rec.variants?.find((x) => x.condition === variant);
    if (v?.ipa?.[tradition]) return v.ipa[tradition];
  }
  return rec.ipa?.[tradition] ?? '';
}

/** Keep only the ids of the 70 registry entries that have Hebrew text. */
export function registryEntries(registry) {
  return (registry?.entries ?? []).filter((e) => typeof e.he === 'string' && e.he.length > 0);
}

// ---------------------------------------------------------------- audio

/**
 * What `ctx.audio` can honestly play for a registry entry in one setting.
 *   status 'file'     a real clip exists for exactly this setting
 *   status 'stand-in' only an equivalence-rule clip from another setting exists (it is NOT this setting)
 *   status 'none'     nothing to play (the Web Speech fallback is deliberately not offered here: it only
 *                     reads Israeli Hebrew and cannot demonstrate a difference)
 * Single-line texts use kind 'line'; multi-line texts use the whole-text 'prayer' clip, or all '<id>-l<n>' lines.
 */
export function clipPlan(ctx, entry, tradition) {
  const audio = ctx?.audio;
  const none = { status: 'none', items: [] };
  if (!audio || typeof audio.has !== 'function') return none;
  const nLines = textLines(entry.he).length;
  const candidates = [];
  if (nLines <= 1) candidates.push([{ kind: 'line', id: entry.id }]);
  else {
    candidates.push([{ kind: 'prayer', id: entry.id }]);
    candidates.push(Array.from({ length: nLines }, (_, i) => ({ kind: 'line', id: `${entry.id}-l${i + 1}` })));
  }
  const info = (it) => {
    const o = { tradition };
    try {
      if (typeof audio.status === 'function') {
        const s = audio.status(it.kind, it.id, o);
        if (s?.source !== 'file') return 'none';
        return s.via === 'equivalent' || (s.fileTradition && s.fileTradition !== tradition) ? 'stand-in' : 'file';
      }
      return audio.has(it.kind, it.id, o) ? 'file' : 'none';
    } catch { return 'none'; }
  };
  for (const items of candidates) {
    const states = items.map(info);
    if (states.every((s) => s !== 'none')) {
      return { status: states.every((s) => s === 'file') ? 'file' : 'stand-in', items: items.map((it) => ({ ...it, tradition })) };
    }
  }
  return none;
}

// ---------------------------------------------------------------- drills

/** Prayer-word diff tags (prayerwords.json) that stand for a real sound difference, mapped to sound-row ids. */
export const REAL_DIFF_TAGS = { kamatz: 'kamatz', tav: 'tav-no-dagesh', stress: 'stress', cholam: 'cholam', tzere: 'tsere', ayin: 'ayin', 'kamatz-yod': null };

/** A seeded-free shuffle helper: rng is a function returning [0,1). */
export function pick(list, rng = Math.random) {
  return list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
}
export function shuffle(list, rng = Math.random) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/**
 * Reading-only drill items ("which one is the Ashkenazi reading?"). Used when no audio exists.
 * Prayer words use the hand-written respellings (they show stress); registry lines use the engine.
 * Only items with a REAL sound difference are included (the hand-written respellings sometimes differ
 * in spelling style only, e.g. 'e-lo-HAY-nu' versus 'eh-loh-HAY-noo').
 */
export function textDrillItems(prayerwords, registry) {
  const items = [];
  for (const w of prayerwords?.words ?? []) {
    const real = (w.diffs ?? []).filter((d) => d in REAL_DIFF_TAGS);
    if (!real.length) continue;
    items.push({
      id: `word:${w.id}`, he: w.he, gloss: w.gloss,
      israeli: w.israeli.say, ashkenazi: w.ashkenazi.say,
      why: real.map((d) => REAL_DIFF_TAGS[d]).filter(Boolean),
      source: 'prayerwords',
    });
  }
  for (const e of registryEntries(registry)) {
    const first = textLines(e.he)[0];
    if (wordsOf(first).length > 8) continue; // keep the drill short on a phone
    const a = transliterate(first, { tradition: 'israeli' });
    const b = transliterate(first, { tradition: 'ashkenazi' });
    if (a === b) continue;
    items.push({ id: `line:${e.id}`, he: first, gloss: e.title, israeli: a, ashkenazi: b, why: switchesIn(first), source: 'registry' });
  }
  return items;
}

/** One reading question: two options in random order, one is Ashkenazi. */
export function makeTextQuestion(item, rng = Math.random) {
  const opts = shuffle([
    { tradition: 'israeli', text: item.israeli },
    { tradition: 'ashkenazi', text: item.ashkenazi },
  ], rng).map((o, i) => ({ ...o, label: i === 0 ? 'A' : 'B' }));
  return { item, options: opts, answer: opts.find((o) => o.tradition === 'ashkenazi')?.label };
}

/**
 * Listening drill pool: registry entries that have a REAL clip (not a stand-in) in at least two settings.
 * Returns [{entry, plans:{tradition: plan}, traditions:[...]}].
 */
export function audioDrillPool(ctx, registry) {
  const pool = [];
  for (const entry of registryEntries(registry)) {
    const plans = {};
    for (const t of TRADITIONS) {
      const p = clipPlan(ctx, entry, t);
      if (p.status === 'file') plans[t] = p;
    }
    const traditions = Object.keys(plans);
    if (traditions.length >= 2) pool.push({ entry, plans, traditions });
  }
  return pool;
}

/** One listening question: two settings of the same text, played as clip A and clip B; ask which is `ask`. */
export function makeAudioQuestion(poolItem, rng = Math.random) {
  const [t1, t2] = shuffle(poolItem.traditions, rng).slice(0, 2);
  const ask = rng() < 0.5 ? t1 : t2;
  const clips = shuffle([t1, t2], rng).map((t, i) => ({ tradition: t, label: i === 0 ? 'A' : 'B', plan: poolItem.plans[t] }));
  return { entry: poolItem.entry, clips, ask, answer: clips.find((c) => c.tradition === ask)?.label };
}

// ---------------------------------------------------------------- data loading

const DATA_FILES = {
  sounds: 'data/traditions/sounds.json',
  sources: 'data/traditions/sources.json',
  guide: 'data/traditions/guide.json',
  registry: 'data/corpus/registry.json',
  prayerwords: 'data/pronunciation/prayerwords.json',
  consonants: 'data/pronunciation/consonants.json',
  niqqud: 'data/pronunciation/niqqud.json',
};

/**
 * Load every JSON file the screen needs. `ctx.traditionsData` (tests) may supply any of them.
 * @param {any} ctx @param {typeof fetch} [fetchImpl]
 */
export async function loadTraditionsData(ctx = {}, fetchImpl = globalThis.fetch) {
  const injected = ctx.traditionsData ?? {};
  const out = {};
  await Promise.all(Object.entries(DATA_FILES).map(async ([k, p]) => {
    if (injected[k]) { out[k] = injected[k]; return; }
    const res = await fetchImpl(new URL(`../../${p}`, import.meta.url));
    if (!res.ok) throw new Error(`could not load ${p} (${res.status})`);
    out[k] = await res.json();
  }));
  return out;
}

/** Index sources by id; throws if a sound/guide row cites an unknown source (used by the tests). */
export function sourceIndex(sources) {
  return new Map((sources?.sources ?? []).map((s) => [s.id, s]));
}
