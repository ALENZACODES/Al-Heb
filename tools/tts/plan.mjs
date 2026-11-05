#!/usr/bin/env node
// Build the TTS render plan from the audio manifest.
//   node tools/tts/plan.mjs [--root <repo>] [--out tools/tts/plan.json] [--donor-dir tools/tts/donor-export] [--limit N] [--voice m|f] [--include-optional]
//                           [--tradition israeli|sephardi|ashkenazi|all|a,b] [--confidence high|all] [--lang-tokens sephardi=es,ashkenazi=es]
// Each plan item says: clip id (kind + id), tradition, voice m|f, the text to speak, and the language token to give the model.
//   Israeli: speaks the pointed Hebrew with language 'he' (source 'tts-hebrew').
//   Sephardi / Ashkenazi: speaks a "sound word" (a respelling in Latin letters from tools/tts/soundtext.mjs, soundText(pointedHebrew, tradition))
//   with the configured language token (default 'es', the slot soundtext.mjs is written for; untested, see docs/tts/README.md) (source 'tts-respelled').
// Default --tradition is israeli (the old behaviour): the respelled traditions are opt-in, because nobody has listened to them.
// Default --confidence is all; high-confidence items sort first inside each tradition, and --confidence high keeps only those.
// Letters, vowels and syllables (HUMAN_ONLY_GROUPS in tools/audio/coverage.mjs) are never synthesised in any tradition. Everything not planned is
// 'human-only' and is exported in the donor-sheet CSV format of docs/voices/recording/recordings_needed.csv.
// Entries that already have a file (status recorded or tts) are never planned: nothing here can overwrite a human recording.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadManifestFull } from '../audio/manifest_io.mjs';
import { HUMAN_ONLY_GROUPS } from '../audio/coverage.mjs';
import { generate, CORE_PRAYER_RE, CSV_HEADER } from '../audio/recording_needs.mjs';
import { REPO_ROOT, TTS_DIR, stripNiqqud, hasNiqqud, csvCell, parseArgs } from './lib.mjs';

export const TIERS = { 1: 'core prayer line', 2: 'deck-order word (first 1000)', 3: 'frequency-listed word or line', 4: 'other' };

/** unpointed text -> best (lowest) rank from data/vocab/deck-order.json (position 1..N) and data/vocab/frequency.json (corpusRank). */
export function loadRanks(root) {
  const deck = new Map(), freq = new Map();
  const rd = (rel) => { const p = path.join(root, rel); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null; };
  const d = rd('data/vocab/deck-order.json');
  for (const e of (d && d.entries) || []) { const k = stripNiqqud(e.he); if (k && (!deck.has(k) || e.pos < deck.get(k))) deck.set(k, e.pos); }
  const f = rd('data/vocab/frequency.json');
  for (const e of (f && f.entries) || []) { const k = stripNiqqud(e.he); if (k && e.total > 0 && (!freq.has(k) || e.corpusRank < freq.get(k))) freq.set(k, e.corpusRank); }
  return { deck, freq };
}

export const TRADITION_ORDER = ['israeli', 'sephardi', 'ashkenazi'];
export const CONFIDENCE_ORDER = { high: 0, medium: 1, low: 2 };
// 'es' is the language slot tools/tts/soundtext.mjs is written for (it also offers 'it'). Which slot sounds right is untested.
export const DEFAULT_LANG_TOKENS = Object.freeze({ sephardi: 'es', ashkenazi: 'es' });

export function route(e) {
  if (HUMAN_ONLY_GROUPS.has(e.group)) return { route: 'human-only', why: `group ${e.group}: isolated letters, vowels and syllables need a human` };
  if (e.tradition !== 'israeli') return { route: 'respelled', why: '' };
  return { route: 'tts', why: '' };
}

/** 'israeli' | 'sephardi,ashkenazi' | 'all' -> array of traditions (throws on an unknown name). */
export function parseTraditions(v) {
  if (v == null || v === '') return ['israeli'];
  const list = String(v) === 'all' ? TRADITION_ORDER : String(v).split(',').map((x) => x.trim()).filter(Boolean);
  for (const t of list) if (!TRADITION_ORDER.includes(t)) throw new Error(`unknown tradition "${t}" (use israeli, sephardi, ashkenazi or all)`);
  return TRADITION_ORDER.filter((t) => list.includes(t));
}

/** 'sephardi=es,ashkenazi=it' -> {sephardi:'es', ashkenazi:'it'} merged over the defaults. Tokens are two-letter codes; the renderer checks them against the installed model. */
export function parseLangTokens(v, allowed = null) {
  const out = { ...DEFAULT_LANG_TOKENS };
  for (const part of String(v || '').split(',').map((x) => x.trim()).filter(Boolean)) {
    const [t, tok] = part.split('=');
    if (!['sephardi', 'ashkenazi'].includes(t) || !/^[a-z]{2}$/.test(tok || '')) throw new Error(`bad --lang-tokens entry "${part}" (use sephardi=es,ashkenazi=es)`);
    if (allowed && !allowed.includes(tok)) throw new Error(`--lang-tokens ${part}: the respelling engine only writes for ${allowed.join(', ')}`);
    out[t] = tok;
  }
  return out;
}

/**
 * Normalise what soundText(pointedHebrew, tradition, {lang}) returns into {text, confidence, flags, model}. tools/tts/soundtext.mjs returns
 * {soundtext, confidence: high|medium|low|unvoiced, flags, model, voiced}; read defensively (also a plain string, or text | sound | soundWord | respelling,
 * or a 0..1 number). 'unvoiced', an empty result or one holding Hebrew letters means "no sound word". Anything unrecognised is 'low'.
 */
export function normaliseSound(r) {
  if (r == null) return null;
  const o = typeof r === 'string' ? { text: r } : r;
  const text = String(o.soundtext ?? o.text ?? o.sound ?? o.soundWord ?? o.respelling ?? '').trim();
  if (!text || /[א-ת]/.test(text) || o.voiced === false || o.confidence === 'unvoiced') return null;
  let confidence = 'low';
  const c = o.confidence;
  if (typeof c === 'string' && c.toLowerCase() in CONFIDENCE_ORDER) confidence = c.toLowerCase();
  else if (typeof c === 'number') confidence = c >= 0.8 ? 'high' : c >= 0.5 ? 'medium' : 'low';
  return { text, confidence, flags: Array.isArray(o.flags) ? o.flags.map(String) : [], model: typeof o.model === 'string' ? o.model : null };
}

/** Israeli confidence is about the INPUT only: pointed text is 'high', unpointed 'low'. It says nothing about how the speech will sound. */
export const israeliConfidence = (text) => (hasNiqqud(text) ? 'high' : 'low');

export function priorityOf(e, ranks) {
  const u = stripNiqqud(e.text);
  if (e.group === 'prayer-line' && CORE_PRAYER_RE.test(e.id)) return { tier: 1, rank: 0 };
  if (ranks.deck.has(u)) return { tier: 2, rank: ranks.deck.get(u) };
  if (ranks.freq.has(u)) return { tier: 3, rank: ranks.freq.get(u) };
  return { tier: 4, rank: 1e9 };
}

export function buildPlan(root = REPO_ROOT, { includeOptional = false, voice, limit, traditions = ['israeli'], confidence = 'all', soundText = null, langTokens = DEFAULT_LANG_TOKENS, soundtextVersion = null } = {}) {
  if (!['high', 'all'].includes(confidence)) throw new Error(`--confidence must be high or all, not "${confidence}"`);
  const manifest = loadManifestFull(root);
  const ranks = loadRanks(root);
  const items = [], human = [], skipped = { alreadyHave: 0, alias: 0, optional: 0, otherTradition: 0, noSoundWord: 0, lowConfidence: 0 };
  for (const e of manifest) {
    if (e.aliasOf) { skipped.alias++; continue; }
    if (e.optional && !includeOptional) { skipped.optional++; continue; }
    const r = route(e);
    const wanted = traditions.includes(e.tradition);
    // Not synthesised (or not asked for here): stays on the donor list, exactly as before this plan could respell.
    if (r.route === 'human-only') { human.push({ ...e, why: r.why }); continue; }
    if (r.route === 'respelled' && !wanted) { human.push({ ...e, why: `${e.tradition} pronunciation: not in --tradition, or no sound word` }); skipped.otherTradition++; continue; }
    if (e.status !== 'missing') { skipped.alreadyHave++; continue; }
    if (voice && e.voice !== voice) continue;
    if (!wanted) { skipped.otherTradition++; continue; }
    const p = priorityOf(e, ranks);
    const base = { voice: e.voice, tradition: e.tradition, kind: e.kind, id: e.id, group: e.group || 'other', path: e.path, text: e.text, text_unpointed: stripNiqqud(e.text), route: 'tts', tier: p.tier, rank: p.rank === 1e9 ? null : p.rank };
    let item;
    if (r.route === 'tts') {
      item = { ...base, source: 'tts-hebrew', speak: e.text, language: 'he', sound_word: null, sound_model: null, confidence: israeliConfidence(e.text), flags: [] };
    } else {
      const s = typeof soundText === 'function' ? normaliseSound(soundText(e.text, e.tradition, { lang: langTokens[e.tradition] || DEFAULT_LANG_TOKENS[e.tradition] })) : null;
      if (!s) { human.push({ ...e, why: `${e.tradition} pronunciation: no sound word available` }); skipped.noSoundWord++; continue; }
      item = { ...base, source: 'tts-respelled', speak: s.text, language: langTokens[e.tradition] || DEFAULT_LANG_TOKENS[e.tradition], sound_word: s.text, sound_model: s.model, confidence: s.confidence, flags: s.flags };
    }
    if (confidence === 'high' && item.confidence !== 'high') { skipped.lowConfidence++; continue; }
    items.push(item);
  }
  const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  items.sort((a, b) => TRADITION_ORDER.indexOf(a.tradition) - TRADITION_ORDER.indexOf(b.tradition) || CONFIDENCE_ORDER[a.confidence] - CONFIDENCE_ORDER[b.confidence]
    || a.tier - b.tier || (a.rank ?? 1e9) - (b.rank ?? 1e9) || cmp(a.voice, b.voice) || cmp(a.id, b.id));
  const out = limit ? items.slice(0, Number(limit)) : items;
  out.forEach((it, i) => { it.order = i + 1; });
  const byTier = {}, byTradition = {}, byConfidence = {};
  for (const it of out) { byTier[it.tier] = (byTier[it.tier] || 0) + 1; byTradition[it.tradition] = (byTradition[it.tradition] || 0) + 1; byConfidence[it.confidence] = (byConfidence[it.confidence] || 0) + 1; }
  const humanByTradition = {}; for (const h of human) humanByTradition[h.tradition] = (humanByTradition[h.tradition] || 0) + 1;
  return {
    schema: 'alef-tts-plan/2',
    note: 'Every clip written from this plan is synthetic (status "synthetic-unreviewed"), never "recorded". Israeli items speak pointed Hebrew (tts-hebrew); Sephardi/Ashkenazi items speak a Latin-letter respelling (tts-respelled) whose sound quality is unknown. Letters, vowels and syllables are human-only in every tradition and are NOT in items.',
    config: { traditions, confidence, langTokens, soundtextVersion, voice: voice || null, includeOptional },
    tiers: TIERS,
    counts: { items: out.length, byTier, byTradition, byConfidence, humanOnly: human.length, humanOnlyByTradition: humanByTradition, skipped },
    items: out,
  };
}

/** Donor-sheet CSV rows (same columns as docs/voices/recording/recordings_needed.csv) for everything TTS must not do. */
export function donorExport(root = REPO_ROOT) {
  const g = generate(root);
  const mine = g.rows.filter((r) => {
    const m = r; // rows carry kind=group; re-derive route from tradition + group
    return m.tradition !== 'israeli' || HUMAN_ONLY_GROUPS.has(m.kind);
  });
  const by = {};
  for (const r of mine) (by[`${r.tradition}-${r.voice}`] ||= []).push(r);
  const files = {};
  for (const [k, rows] of Object.entries(by)) files[`human-only-${k}.csv`] = [CSV_HEADER.join(','), ...rows.map((r) => CSV_HEADER.map((h) => csvCell(r[h])).join(','))].join('\n') + '\n';
  return files;
}

/** The respelling engine is another module; load it only when a respelled tradition is asked for. null if it is not there. */
export async function loadSoundText() {
  try { const m = await import('./soundtext.mjs'); return typeof m.soundText === 'function' ? { fn: m.soundText, langs: m.LANGS || null, version: m.SOUNDTEXT_VERSION ?? null } : null; } catch { return null; }
}

export async function main(argv = process.argv.slice(2)) {
  const a = parseArgs(argv, ['include-optional']);
  const root = a.root ? path.resolve(a.root) : REPO_ROOT;
  const traditions = parseTraditions(a.tradition);
  const st = traditions.some((t) => t !== 'israeli') ? await loadSoundText() : null;
  const soundText = st ? st.fn : null;
  if (traditions.some((t) => t !== 'israeli') && !st) console.warn('warning: tools/tts/soundtext.mjs not found or has no soundText export: Sephardi/Ashkenazi items cannot be planned');
  const plan = buildPlan(root, { includeOptional: !!a['include-optional'], voice: a.voice, limit: a.limit, traditions, confidence: a.confidence || 'all', soundText, langTokens: parseLangTokens(a['lang-tokens'], st && st.langs), soundtextVersion: st ? st.version : null });
  const out = path.resolve(a.out || path.join(TTS_DIR, 'plan.json'));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(plan, null, 1) + '\n');
  const dd = path.resolve(a['donor-dir'] || path.join(TTS_DIR, 'donor-export'));
  const files = donorExport(root);
  fs.mkdirSync(dd, { recursive: true });
  for (const [f, c] of Object.entries(files)) fs.writeFileSync(path.join(dd, f), c);
  console.log(`plan: ${plan.counts.items} TTS clips -> ${out}`);
  console.log(`traditions: ${JSON.stringify(plan.counts.byTradition)}; confidence: ${JSON.stringify(plan.counts.byConfidence)}; skipped: ${JSON.stringify(plan.counts.skipped)}`);
  console.log(`tiers: ${JSON.stringify(plan.counts.byTier)}; human-only entries: ${plan.counts.humanOnly} ${JSON.stringify(plan.counts.humanOnlyByTradition)}`);
  console.log(`donor export: ${Object.keys(files).length} CSV files in ${dd}`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e.message); process.exit(1); });
