#!/usr/bin/env node
// Build a batch plan for the outside voice service: respelled Sephardi and Ashkenazi words, each in a man slot (m) and a woman slot (f).
//   node tools/tts/voice_plan.mjs [--words N] [--max-clips N] [--batch-size 200] [--traditions sephardi,ashkenazi] [--slots m,f] [--kinds word[,line,prayer]]
//        [--resume --work DIR] [--no-take2] [--rate 30] [--out FILE] [--root REPO] [--include-existing] [--include-optional]
// Makes NO network call. Prints the character budget BEFORE anything is rendered: sum of characters per tradition x voice slot (and for the optional second take
// the consistency judge needs). Order: the priority ranking (tools/audio/priority.mjs) where a word is ranked, then the order of the soundwords list.
// The text to be sent is always the stored respelling (data/tts/soundwords.<tradition>.json "soundtext"), never the pointed Hebrew; it is carried unchanged.
// Letters, vowels and syllables are human-only and are never planned. Entries that already have a clip are skipped unless --include-existing.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from './lib.mjs';
import { loadManifestFull } from '../audio/manifest_io.mjs';
import { HUMAN_ONLY_GROUPS } from '../audio/coverage.mjs';
import { REPO_ROOT, TRADITIONS, SLOTS, SLOT_KEY, DEFAULT_KINDS, defaultWork, workPaths, renderedMap, readJson, nfc, sha256 } from './voice_lib.mjs';

export const PLAN_SCHEMA = 'alef-voice-plan/1';
export const DEFAULT_BATCH_SIZE = 200;
export const DEFAULT_RATE = 30;

export const WARNINGS = Object.freeze([
  'Plan limits: the service counts characters (or credits) per month and limits concurrent requests; the figures above are character counts, not a price. Check your plan for what a character costs on the model used, your monthly allowance and your request limits.',
  'Voices taken from a shared voice library may carry their own commercial-use conditions. Before any clip is used in a product that is sold, check the service terms for your plan AND the terms of each voice you picked. Every clip made here is recorded as "licence not cleared" until you have checked.',
  'Some output formats need a higher plan (the API reference says 44.1 kHz PCM/WAV does). The default format is chosen to avoid that; check your plan before changing it.',
  'The respelling is Latin letters. The model has no Sephardi or Ashkenazi Hebrew mode: whether it reads the respelling as either is unknown until someone listens. Run the 20-word pilot first.',
]);

export function loadSoundwords(root, tradition) {
  const f = path.join(root, 'data', 'tts', `soundwords.${tradition}.json`);
  if (!fs.existsSync(f)) throw new Error(`missing ${f}`);
  const j = readJson(f);
  return { file: `data/tts/soundwords.${tradition}.json`, model: j.model || null, items: j.items || [] };
}

/** id -> rank from tools/audio/priority.mjs (null map if it cannot be read: the list order is then used alone). */
export async function loadRanks(root, kinds) {
  try {
    const p = await import('../audio/priority.mjs');
    const rows = p.compute(p.loadData(root), { kinds: kinds.filter((k) => ['word', 'line', 'prayer'].includes(k)) }).rows;
    const m = new Map(); rows.forEach((r, i) => { if (!m.has(r.id)) m.set(r.id, r.rank ?? i + 1); });
    return m;
  } catch (e) { return { error: e.message, size: 0, get: () => undefined, has: () => false }; }
}

export async function buildVoicePlan(root = REPO_ROOT, o = {}) {
  const traditions = o.traditions || TRADITIONS, slots = o.slots || SLOTS, kinds = o.kinds || DEFAULT_KINDS;
  for (const t of traditions) if (!TRADITIONS.includes(t)) throw new Error(`tradition must be sephardi or ashkenazi (Israeli voices are made elsewhere), not "${t}"`);
  for (const s of slots) if (!SLOTS.includes(s)) throw new Error(`voice slot must be m or f, not "${s}"`);
  for (const k of kinds) if (!['word', 'line', 'prayer'].includes(k)) throw new Error(`kind "${k}" is not synthesised (letters, vowels and syllables are human-only)`);
  const manifest = loadManifestFull(root);
  const byPath = new Map(manifest.map((e) => [e.path, e]));
  const ranks = await loadRanks(root, kinds);
  const sw = Object.fromEntries(traditions.map((t) => [t, loadSoundwords(root, t)]));
  const index = new Map();
  for (const t of traditions) sw[t].items.forEach((it, i) => { if (kinds.includes(it.kind)) index.set(`${it.kind}|${it.id}`, Math.min(index.get(`${it.kind}|${it.id}`) ?? 1e9, i)); });
  const skipped = { notInManifest: 0, humanOnlyGroup: 0, optional: 0, alias: 0, alreadyHasClip: 0, unvoiced: 0, alreadyRendered: 0 };
  const done = o.resumeWork ? renderedMap(o.resumeWork) : new Map();
  const words = [...index.entries()].map(([k, i]) => { const [kind, id] = k.split('|'); return { kind, id, i, rank: ranks.get(id) ?? null }; });
  const kindOrder = (k) => kinds.indexOf(k);
  words.sort((a, b) => kindOrder(a.kind) - kindOrder(b.kind) || (a.rank ?? 1e9) - (b.rank ?? 1e9) || a.i - b.i);
  const items = []; let nWords = 0;
  for (const w of words) {
    if (o.words && nWords >= o.words) break;
    const row = [];
    for (const t of traditions) {
      const it = sw[t].items.find((x) => x.kind === w.kind && x.id === w.id); // lists are small per id; fine for ~4k
      if (!it) continue;
      const speak = nfc(it.soundtext || '').trim();
      if (!speak || it.confidence === 'unvoiced') { skipped.unvoiced++; continue; }
      for (const s of slots) {
        const p = `audio/${s}/${t}/${w.kind}/${w.id}.mp3`; const e = byPath.get(p);
        if (!e) { skipped.notInManifest++; continue; }
        if (HUMAN_ONLY_GROUPS.has(e.group)) { skipped.humanOnlyGroup++; continue; }
        if (e.aliasOf) { skipped.alias++; continue; }
        if (e.optional && !o.includeOptional) { skipped.optional++; continue; }
        if (e.status !== 'missing' && !o.includeExisting) { skipped.alreadyHasClip++; continue; }
        const key = { voice: s, tradition: t, kind: w.kind, id: w.id };
        if (done.has(`${s}/${t}/${w.kind}/${w.id}#t1`)) { skipped.alreadyRendered++; continue; }
        row.push({ voice: s, voice_slot: s, voice_key: SLOT_KEY[s], tradition: t, kind: w.kind, id: w.id, group: e.group || 'other', path: p, he: e.text, speak, chars: [...speak].length,
          respelling_confidence: it.confidence || null, respelling_flags: it.flags || [], respelling_model: sw[t].model, source_file: sw[t].file, rank: w.rank, ...key });
      }
    }
    if (!row.length) continue;
    nWords++; items.push(...row);
  }
  const capped = o.maxClips ? items.slice(0, o.maxClips) : items;
  const bs = o.batchSize || DEFAULT_BATCH_SIZE;
  capped.forEach((it, n) => { it.seq = n + 1; it.batch = Math.floor(n / bs) + 1; });
  const chars = {}; for (const it of capped) { const k = `${it.tradition}/${it.voice}`; chars[k] = (chars[k] || 0) + it.chars; }
  const total = capped.reduce((a, b) => a + b.chars, 0);
  const take2 = o.take2 !== false;
  const rate = o.rate || DEFAULT_RATE;
  const distinctWords = new Set(capped.map((i) => `${i.kind}|${i.id}`)).size;
  return {
    schema: PLAN_SCHEMA,
    note: 'Planning only: no call was made. Every clip made from this plan is status synthetic-unreviewed, made from a respelling, licence not cleared.',
    config: { traditions, slots, kinds, words: o.words || null, maxClips: o.maxClips || null, batchSize: bs, rate, take2, resume: !!o.resumeWork, includeExisting: !!o.includeExisting },
    ranking: ranks && ranks.error ? `priority ranking not available (${ranks.error}); list order used` : `tools/audio/priority.mjs ranked ${ranks.size} word ids; the rest follow in list order`,
    counts: { clips: capped.length, words: distinctWords, batches: Math.ceil(capped.length / bs), skipped },
    characters: { byTraditionVoice: chars, take1Total: total, take2Total: take2 ? total : 0, withTake2: total * (take2 ? 2 : 1), take2Included: take2 },
    requestsPerMinute: rate,
    minutesAtRate: { take1: Math.ceil(capped.length / rate), withTake2: Math.ceil((capped.length * (take2 ? 2 : 1)) / rate), note: 'arithmetic from requests-per-minute, not a measurement; the service may be slower' },
    warnings: WARNINGS,
    items: capped,
  };
}

export function formatEstimate(plan) {
  const L = [];
  L.push(`plan: ${plan.counts.clips} clips for ${plan.counts.words} words, ${plan.counts.batches} batch(es) of ${plan.config.batchSize}`);
  L.push('', 'CHARACTER BUDGET (what would be sent as text; characters, not money):');
  for (const [k, v] of Object.entries(plan.characters.byTraditionVoice)) L.push(`  ${k.padEnd(14)} ${String(v).padStart(9)} characters`);
  L.push(`  ${'take 1 total'.padEnd(14)} ${String(plan.characters.take1Total).padStart(9)} characters`);
  L.push(`  ${'with take 2'.padEnd(14)} ${String(plan.characters.withTake2).padStart(9)} characters ${plan.characters.take2Included ? '(the consistency judge needs a second take of every clip)' : '(second take not counted: --no-take2)'}`);
  L.push(`  at ${plan.requestsPerMinute} requests per minute: about ${plan.minutesAtRate.take1} min for take 1 (${plan.minutesAtRate.withTake2} min with take 2); arithmetic, not a measurement`);
  L.push('  speech-to-text for judge 2 is billed separately if you use the service for it; check your plan', '');
  for (const w of plan.warnings) L.push(`WARNING: ${w}`);
  L.push(`skipped: ${JSON.stringify(plan.counts.skipped)}; ${plan.ranking}`);
  return L.join('\n');
}

export async function main(argv = process.argv.slice(2)) {
  const a = parseArgs(argv, ['resume', 'no-take2', 'include-existing', 'include-optional', 'help']);
  if (a.help) { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//')).map((l) => l.slice(3)).join('\n')); return; }
  const list = (v, d) => (v ? String(v).split(',').map((x) => x.trim()).filter(Boolean) : d);
  const num = (v) => (v != null ? Number(v) : undefined);
  const work = path.resolve(a.work || defaultWork());
  if (a.resume && !fs.existsSync(workPaths(work).log)) console.error(`note: --resume but no render log in ${work}; planning everything`);
  const plan = await buildVoicePlan(a.root ? path.resolve(a.root) : REPO_ROOT, {
    traditions: list(a.traditions, TRADITIONS), slots: list(a.slots, SLOTS), kinds: list(a.kinds, DEFAULT_KINDS), words: num(a.words), maxClips: num(a['max-clips']),
    batchSize: num(a['batch-size']), rate: num(a.rate), take2: !a['no-take2'], resumeWork: a.resume ? work : null, includeExisting: !!a['include-existing'], includeOptional: !!a['include-optional'] });
  const out = path.resolve(a.out || path.join(work, 'plan', 'voice-plan.json'));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(plan, null, 1) + '\n');
  console.log(formatEstimate(plan));
  console.log(`\nwrote ${out}\nnext: node tools/tts/voice_render.mjs --plan "${out}" --max-clips 20 --yes   (after setting the key and filling tools/tts/voices.config.json)`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e.message); process.exit(1); });
