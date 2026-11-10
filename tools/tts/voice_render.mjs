#!/usr/bin/env node
// Render planned items with the outside voice service (text-to-speech REST endpoint), one request per item, fixed settings.
//   node tools/tts/voice_render.mjs --plan FILE [--work DIR] [--take 1|2] [--max-clips N] [--batch N] [--tradition t] [--slot m|f] [--resume] [--force]
//        [--rate PER_MINUTE] [--concurrency 1] [--max-chars N] [--max-attempts 6] [--config tools/tts/voices.config.json] [--yes] [--dry-run] [--mock]
// - Voice ids come from tools/tts/voices.config.json (m_pleasant, f_extra_feminine). Placeholders are refused. Nothing here picks a voice.
// - The text sent is the plan's respelled text ("speak"), unchanged. The pointed Hebrew and the item id are kept in the render log only.
// - Settings are fixed for a take: same model, same voice settings, same seed on every call. Take 2 differs only in the seed (it feeds the consistency judge).
// - Prints the character estimate for THIS run before the first call, and sends nothing unless you pass --yes (or --mock / --dry-run).
// - 429 and 5xx: retried with exponential backoff and jitter; Retry-After is honoured. 401/402/403/404 stop the whole run (key, quota, plan or voice-id problem).
// - Each file is written to a .part name and renamed; a JSONL log line is appended only after the rename. Ctrl-C (or SIGTERM) finishes the request in flight,
//   then stops; run it again with --resume to continue. A lock file stops two runs on one work folder.
// - --mock makes tones locally (no network, no key) so the whole pipeline can be tested. Mock output is marked in every log line and is never a voice.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from './lib.mjs';
import { SERVICE, RENDER_DEFAULTS } from './voice_service.config.mjs';
import {
  STATUS, LICENCE, SOURCE, VOICE_CONFIG_PATH, apiKey, serviceBase, scrub, writeAtomic, appendJsonl, readJson, readJsonl, workPaths, defaultWork, takeKey, sha256,
  loadVoiceConfig, isPlaceholder, audioFromResponse, mockWav, readWav, Limiter, requestWithRetry, FatalServiceError, ItemError,
} from './voice_lib.mjs';

const pidAlive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
function takeLock(lockFile) {
  fs.mkdirSync(path.dirname(lockFile), { recursive: true });
  if (fs.existsSync(lockFile)) {
    let pid = NaN; try { pid = Number(fs.readFileSync(lockFile, 'utf8').trim()); } catch { /* */ }
    if (pid && pidAlive(pid) && pid !== process.pid) throw new Error(`another render (process ${pid}) is using ${path.dirname(lockFile)}; wait for it or stop it first`);
  }
  fs.writeFileSync(lockFile, String(process.pid));
  return () => { try { fs.rmSync(lockFile, { force: true }); } catch { /* */ } };
}

/** Which plan items this run would send, in order. */
export function selectItems(plan, work, o = {}) {
  const take = o.take || 1; const P = workPaths(work);
  const logged = new Map();
  for (const r of readJsonl(P.log)) if (r.event === 'rendered') logged.set(takeKey(r, r.take), r);
  let items = plan.items.filter((it) => (!o.tradition || it.tradition === o.tradition) && (!o.slot || it.voice === o.slot) && (!o.batch || it.batch === Number(o.batch)));
  let existing = 0;
  items = items.filter((it) => {
    const rec = logged.get(takeKey(it, take)); const f = P.raw(take, it, rec ? rec.file_ext : 'wav');
    const done = rec && fs.existsSync(f) && sha256(fs.readFileSync(f)) === rec.audio_sha256;
    if (done && !o.force) { existing++; return false; }
    return true;
  });
  return { items: o.maxClips ? items.slice(0, Number(o.maxClips)) : items, alreadyDone: existing };
}

export const charsOf = (items) => items.reduce((a, b) => a + [...b.speak].length, 0);

/**
 * Render items. Returns {rendered, failed, stopped, stopReason}. `o.fetchImpl` and `o.mock` are for tests.
 */
export async function renderItems(items, o) {
  const { work, take, cfg, mock = false } = o; const P = workPaths(work);
  const seed = cfg.seeds[take];
  const settings = cfg.settings;
  const format = cfg.outputFormat;
  const key = mock ? null : apiKey(o.env || process.env);
  const base = mock ? null : serviceBase(o.env || process.env);
  const limiter = new Limiter(o.rate ?? cfg.rate ?? 30);
  const state = { rendered: 0, failed: 0, stopped: false, stopReason: null, consecutiveFailures: 0, chars: 0 };
  let next = 0;
  const maxFail = o.maxConsecutiveFailures ?? 5;
  const base0 = { status: STATUS, licence: LICENCE, source: SOURCE, owner_licence_note: cfg.licenceNote || '' };
  appendJsonl(P.log, { event: 'run-start', ts: new Date().toISOString(), take, mock, items: items.length, model_id: cfg.modelId, output_format: format, seed, voice_settings: settings, language_code: cfg.languageCode, requests_per_minute: o.rate ?? cfg.rate ?? 30, ...base0 });
  const worker = async () => {
    while (!state.stopped && !(o.shouldStop && o.shouldStop())) {
      const it = items[next++]; if (!it) return;
      if (o.maxChars && state.chars + [...it.speak].length > o.maxChars) { state.stopped = true; state.stopReason = `character cap ${o.maxChars} reached`; return; }
      const voice = cfg.voices[it.voice]; const t0 = Date.now();
      try {
        let audio, attempts = 1, waitedMs = 0, requestId = null;
        if (mock) {
          audio = { ext: 'wav', data: mockWav({ id: it.id, tradition: it.tradition, speak: it.speak, voice: it.voice, seed, truncate: !!(o.mockTruncate && o.mockTruncate(it)) }) };
        } else {
          const body = { text: it.speak, model_id: cfg.modelId, voice_settings: settings, seed, apply_text_normalization: RENDER_DEFAULTS.applyTextNormalization };
          if (cfg.languageCode) body.language_code = cfg.languageCode;
          const url = `${base}${SERVICE.paths.tts.replace('{voice_id}', encodeURIComponent(voice.voiceId))}?output_format=${encodeURIComponent(format)}`;
          const r = await requestWithRetry(() => [url, { method: 'POST', headers: { [SERVICE.keyHeader]: key, 'content-type': 'application/json', accept: '*/*' }, body: JSON.stringify(body) }],
            { limiter, env: o.env || process.env, fetchImpl: o.fetchImpl || globalThis.fetch, backoffMs: o.backoffMs ?? 1000, maxAttempts: o.maxAttempts ?? 6, shouldStop: () => false,
              onRetry: (e) => appendJsonl(P.log, { event: 'retry', ts: new Date().toISOString(), take, id: it.id, tradition: it.tradition, voice: it.voice, attempt: e.attempt, http_status: e.status, wait_ms: e.wait }) });
          const bytes = Buffer.from(await r.res.arrayBuffer());
          if (bytes.length < 200) throw new ItemError(`the service returned only ${bytes.length} bytes of audio`, 200);
          audio = audioFromResponse(bytes, format); attempts = r.attempts; waitedMs = r.waitedMs;
          for (const h of SERVICE.requestIdHeaders) { const v = r.res.headers.get(h); if (v) { requestId = v; break; } }
        }
        const file = P.raw(take, it, audio.ext);
        writeAtomic(file, audio.data);
        const w = audio.ext === 'wav' ? readWav(audio.data) : null;
        appendJsonl(P.log, { event: 'rendered', ts: new Date().toISOString(), take, mock, ...pick(it), text_sent: it.speak, text_sha256: sha256(Buffer.from(it.speak.normalize('NFC'))), chars: [...it.speak].length,
          voice_id: mock ? 'mock' : voice.voiceId, voice_key: it.voice_key, model_id: mock ? 'mock' : cfg.modelId, language_code: cfg.languageCode, output_format: mock ? 'mock-wav' : format, seed, voice_settings: settings,
          file_ext: audio.ext, bytes: audio.data.length, audio_sha256: sha256(audio.data), sample_rate: w ? w.rate : null, request_id: requestId, attempts, waited_ms: waitedMs, ms: Date.now() - t0, ...base0 });
        state.rendered++; state.chars += [...it.speak].length; state.consecutiveFailures = 0;
      } catch (e) {
        const msg = scrub(e.message, o.env || process.env);
        appendJsonl(P.log, { event: 'item-error', ts: new Date().toISOString(), take, ...pick(it), http_status: e.status ?? null, fatal: !!e.fatal, error: msg });
        state.failed++; state.consecutiveFailures++;
        if (e.fatal) { state.stopped = true; state.stopReason = `${msg} (stopped: this is a key, quota, plan or voice-id problem, not a one-off)`; }
        else if (state.consecutiveFailures >= maxFail) { state.stopped = true; state.stopReason = `${maxFail} failures in a row; last: ${msg}`; }
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, o.concurrency || 1) }, worker));
  const interrupted = !!(o.shouldStop && o.shouldStop());
  appendJsonl(P.log, { event: 'run-stop', ts: new Date().toISOString(), take, rendered: state.rendered, failed: state.failed, interrupted, reason: state.stopReason });
  return { rendered: state.rendered, failed: state.failed, stopped: state.stopped || interrupted, stopReason: state.stopReason || (interrupted ? 'stopped by you' : null), chars: state.chars };
}
const pick = (it) => ({ id: it.id, kind: it.kind, tradition: it.tradition, voice: it.voice, voice_slot: it.voice, he: it.he, group: it.group, path: it.path, rank: it.rank ?? null,
  respelling_confidence: it.respelling_confidence ?? null, respelling_model: it.respelling_model ?? null, source_file: it.source_file ?? null });

export async function main(argv = process.argv.slice(2)) {
  const a = parseArgs(argv, ['resume', 'force', 'yes', 'dry-run', 'mock', 'help']);
  if (a.help || !a.plan) { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//')).map((l) => l.slice(3)).join('\n')); process.exitCode = a.help ? 0 : 2; return; }
  const plan = readJson(path.resolve(a.plan));
  if (plan.schema !== 'alef-voice-plan/1') throw new Error('not a voice plan (build one with tools/tts/voice_plan.mjs)');
  const work = path.resolve(a.work || defaultWork()); const take = Number(a.take || 1);
  if (![1, 2].includes(take)) throw new Error('--take must be 1 or 2');
  const mock = !!a.mock;
  const P = workPaths(work);
  const cfg = loadVoiceConfig(path.resolve(a.config || VOICE_CONFIG_PATH), { allowMissing: mock });
  const sel = selectItems(plan, work, { take, maxClips: a['max-clips'], batch: a.batch, tradition: a.tradition, slot: a.slot, force: !!a.force });
  const anyRaw = fs.existsSync(path.join(work, 'raw', `take${take}`));
  if (anyRaw && !a.resume && !a.force && sel.alreadyDone) throw new Error(`${sel.alreadyDone} item(s) are already rendered in ${work}; pass --resume to continue after them, or --force to render them again`);
  const chars = charsOf(sel.items);
  console.log(`${mock ? 'MOCK RUN (no network, no key; tones, not voices)\n' : ''}take ${take}: ${sel.items.length} clip(s) to render now, ${sel.alreadyDone} already done; ${chars} characters will be sent${a['max-chars'] ? ` (cap ${a['max-chars']})` : ''}.`);
  console.log('  (characters, not money; check your plan for what they cost, for your allowance and for request limits. Voices from a shared library may carry commercial-use conditions you must check.)');
  const byKey = {}; for (const it of sel.items) byKey[`${it.tradition}/${it.voice}`] = (byKey[`${it.tradition}/${it.voice}`] || 0) + [...it.speak].length;
  for (const [k, v] of Object.entries(byKey)) console.log(`  ${k}: ${v}`);
  if (!sel.items.length) { console.log('nothing to do'); return; }
  if (a['dry-run']) { console.log('--dry-run: nothing was sent'); return; }
  if (!mock) {
    if (!apiKey()) throw new Error(`set the key first: the environment variable ${SERVICE.keyEnv} is empty`);
    for (const slot of new Set(sel.items.map((i) => i.voice))) if (isPlaceholder(cfg.voices[slot].voiceId)) throw new Error(`tools/tts/voices.config.json: "${cfg.voices[slot].key}" still holds a placeholder. Run voice_list.mjs, listen to the previews, and paste the id you chose.`);
    if (cfg.voices.m.voiceId === cfg.voices.f.voiceId) throw new Error('the man and woman slots hold the same voice id; pick two different voices');
    if (!a.yes) { console.log('\nNothing sent. Re-run with --yes to start sending these requests.'); process.exitCode = 3; return; }
  }
  let stop = false; const onSig = () => { if (stop) process.exit(130); stop = true; console.error('\nstopping after the request in flight (press again to quit now); run again with --resume to continue'); };
  process.on('SIGINT', onSig); process.on('SIGTERM', onSig);
  const unlock = takeLock(P.lock);
  try {
    for (const f of walk(path.join(work, 'raw'))) if (f.endsWith('.part')) fs.rmSync(f, { force: true });
    const r = await renderItems(sel.items, { work, take, cfg, mock, rate: a.rate ? Number(a.rate) : undefined, concurrency: Number(a.concurrency || 1), maxChars: a['max-chars'] ? Number(a['max-chars']) : 0,
      maxAttempts: Number(a['max-attempts'] || 6), shouldStop: () => stop });
    console.log(`rendered ${r.rendered}, failed ${r.failed}${r.stopped ? `; STOPPED: ${r.stopReason}` : ''}. log: ${P.log}`);
    if (r.failed || r.stopped) process.exitCode = r.stopped && stop ? 130 : 1;
  } finally { unlock(); }
}
function* walk(d) { if (!fs.existsSync(d)) return; for (const n of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, n.name); if (n.isDirectory()) yield* walk(p); else yield p; } }
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(scrub(e.message)); process.exit(1); });
