// Shared helpers for the outside-voice pipeline (voice_plan, voice_list, voice_render, voice_clip, voice_judge, voice_handoff).
// Zero dependencies (Node 18+; Node 20+ recommended). Works on Windows (PowerShell) and Linux: paths are built with node:path, ffmpeg is called without a shell.
// The key is read from the environment variable named in voice_service.config.mjs and is never logged, written or put in an error message (scrub()).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { REPO_ROOT, stripNiqqud } from './lib.mjs';
import { SERVICE, RENDER_DEFAULTS } from './voice_service.config.mjs';

export { REPO_ROOT, stripNiqqud };
export const STATUS = 'synthetic-unreviewed';
export const LICENCE = 'licence not cleared';
export const SOURCE = 'tts-respelled-voice-service';
export const TRADITIONS = ['sephardi', 'ashkenazi'];
export const SLOTS = ['m', 'f'];
export const SLOT_KEY = Object.freeze({ m: 'm_pleasant', f: 'f_extra_feminine' });
export const DEFAULT_KINDS = ['word'];
export const VOICE_CONFIG_PATH = path.join(REPO_ROOT, 'tools', 'tts', 'voices.config.json');

export const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
export const sha256File = (f) => sha256(fs.readFileSync(f));
export const nfc = (s) => String(s ?? '').normalize('NFC');
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const defaultWork = () => process.env.ALEF_VOICE_WORK || path.join(os.homedir(), 'alef-voice-work');
export const keyOf = (c) => `${c.voice}/${c.tradition}/${c.kind}/${c.id}`;
export const takeKey = (c, take) => `${keyOf(c)}#t${take}`;

/** Letters that count toward the length of a respelled word (a-z and the accented vowels; hyphens, spaces and accents on nothing else do not). */
export const spokenLetters = (s) => (String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').match(/[a-z]/gi) || []).length;

// ---------- the key ----------
export function apiKey(env = process.env) {
  const k = env[SERVICE.keyEnv];
  return typeof k === 'string' && k.trim() ? k.trim() : null;
}
/** Remove the key (and the usual header form of it) from any text that may be printed or logged. */
export function scrub(text, env = process.env) {
  let s = String(text ?? '');
  const k = apiKey(env);
  if (k && k.length >= 4) s = s.split(k).join('[key removed]');
  return s;
}
export function serviceBase(env = process.env) {
  const o = env[SERVICE.baseUrlOverrideEnv];
  if (!o) return SERVICE.baseUrl;
  let u; try { u = new URL(o); } catch { throw new Error(`${SERVICE.baseUrlOverrideEnv} is not a URL`); }
  const loop = ['localhost', '127.0.0.1', '[::1]', '::1'].includes(u.hostname);
  if (!(u.protocol === 'https:' || (u.protocol === 'http:' && loop))) throw new Error(`${SERVICE.baseUrlOverrideEnv} must be https (or http on this computer only): the key is sent there`);
  return o.replace(/\/+$/, '');
}

// ---------- files ----------
export function writeAtomic(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.part`;
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, file);
}
export function appendJsonl(file, obj) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, JSON.stringify(obj) + '\n');
}
/** Torn last lines (a crash mid-write) are ignored. */
export function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  const out = [];
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) { if (!line.trim()) continue; try { out.push(JSON.parse(line)); } catch { /* torn line */ } }
  return out;
}
export const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
export const sleepRand = (ms) => ms * (0.75 + Math.random() * 0.5);

export function workPaths(work) {
  return {
    work,
    log: path.join(work, 'render-log.jsonl'),
    clipLog: path.join(work, 'clip-log.jsonl'),
    lock: path.join(work, '.render.lock'),
    raw: (take, it, ext = 'wav') => path.join(work, 'raw', `take${take}`, it.voice, it.tradition, it.kind, `${it.id}.${ext}`),
    clip: (take, it) => path.join(work, 'clips', `take${take}`, 'audio', it.voice, it.tradition, it.kind, `${it.id}.mp3`),
    judge: (name) => path.join(work, 'judges', `${name}.jsonl`),
    transcripts: path.join(work, 'judges', 'transcripts.jsonl'),
  };
}

/** render-log.jsonl -> Map "key#tN" -> last 'rendered' record. */
export function renderedMap(work) {
  const m = new Map();
  for (const r of readJsonl(workPaths(work).log)) if (r.event === 'rendered') m.set(takeKey(r, r.take), r);
  return m;
}

// ---------- the voices config ----------
export const PLACEHOLDER_RE = /^(PASTE|YOUR|CHANGE|TODO|<)|HERE|^$/i;
export function loadVoiceConfig(file = VOICE_CONFIG_PATH, { allowMissing = false } = {}) {
  if (!fs.existsSync(file) && !allowMissing) throw new Error(`voices config not found: ${file}. Copy tools/tts/voices.config.json from the repo and fill in your two voice ids (see docs/tts/VOICE-SERVICE-RUNBOOK.md).`);
  const j = fs.existsSync(file) ? readJson(file) : {};
  const voices = {};
  for (const slot of SLOTS) {
    const k = SLOT_KEY[slot]; const v = j[k] || {};
    voices[slot] = { slot, key: k, voiceId: String(v.voice_id || ''), name: v.name || '', libraryVoice: !!v.library_voice, note: v.note || '' };
  }
  return { raw: j, voices, settings: { ...RENDER_DEFAULTS.voiceSettings, ...(j.settings || {}) }, modelId: j.model_id || RENDER_DEFAULTS.modelId,
    languageCode: j.language_code ?? RENDER_DEFAULTS.languageCode, outputFormat: j.output_format || RENDER_DEFAULTS.outputFormat,
    seeds: { 1: j.seed_take1 ?? RENDER_DEFAULTS.seedTake1, 2: j.seed_take2 ?? RENDER_DEFAULTS.seedTake2 },
    recogniser: j.recogniser || { mode: 'service' }, licenceNote: String(j.licence_note || ''), rate: j.requests_per_minute ?? null };
}
export const isPlaceholder = (id) => PLACEHOLDER_RE.test(String(id || '').trim());

// ---------- WAV ----------
export function wavFromPcm(pcm, rate = 24000, channels = 1) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0, 'latin1'); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8, 'latin1'); h.write('fmt ', 12, 'latin1');
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(channels, 22); h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * channels * 2, 28);
  h.writeUInt16LE(channels * 2, 32); h.writeUInt16LE(16, 34); h.write('data', 36, 'latin1'); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}
/** Pure-JS WAV reader (16-bit PCM). Returns {rate, channels, samples: Int16Array (first channel)} or null. */
export function readWav(buf) {
  if (buf.length < 44 || buf.toString('latin1', 0, 4) !== 'RIFF' || buf.toString('latin1', 8, 12) !== 'WAVE') return null;
  let p = 12, fmt = null, data = null;
  while (p + 8 <= buf.length) {
    const id = buf.toString('latin1', p, p + 4); let len = buf.readUInt32LE(p + 4); const body = p + 8;
    if (id === 'data') { if (body + len > buf.length) len = buf.length - body; data = buf.subarray(body, body + len); }
    if (id === 'fmt ') fmt = { tag: buf.readUInt16LE(body), channels: buf.readUInt16LE(body + 2), rate: buf.readUInt32LE(body + 4), bits: buf.readUInt16LE(body + 14) };
    p = body + len + (len & 1);
  }
  if (!fmt || !data || fmt.tag !== 1 || fmt.bits !== 16) return null;
  const n = Math.floor(data.length / (2 * fmt.channels)); const s = new Int16Array(n);
  for (let i = 0; i < n; i++) s[i] = data.readInt16LE(i * fmt.channels * 2);
  return { rate: fmt.rate, channels: fmt.channels, samples: s };
}

/** What the service returns -> a file body plus its extension. pcm_* is wrapped into WAV; wav_* and mp3_* pass through. */
export function audioFromResponse(bytes, outputFormat) {
  const f = String(outputFormat);
  const rate = Number((/_(\d+)(?:_|$)/.exec(f) || [])[1]) || 24000;
  if (f.startsWith('pcm_')) return { ext: 'wav', data: wavFromPcm(bytes, rate) };
  if (f.startsWith('wav_')) return { ext: 'wav', data: bytes };
  if (f.startsWith('mp3_')) return { ext: 'mp3', data: bytes };
  throw new Error(`output format "${f}" is not supported here (use pcm_*, wav_* or mp3_*)`);
}

// ---------- mock voice ----------
const h32 = (s) => parseInt(sha256(Buffer.from(String(s))).slice(0, 8), 16);
/** Mock "voice": a tone whose pitch encodes the word (so the mock recogniser can read it back); the woman's tone has the same pitch (only the text matters). Says nothing about any real voice. */
export const mockHz = (id, tradition) => 250 + (h32(`${tradition}|${id}`) % 250) * 8;
export function mockWav({ id, tradition, speak, voice = 'm', seed = 1, rate = 24000, lead = 0.12, tail = 0.25, truncate = false }) {
  const n = Math.max(2, spokenLetters(speak));
  const jitter = 1 + (((h32(`${id}|${seed}`) % 7) - 3) / 100); // +-3 percent between seeds
  const body = (0.25 + 0.07 * n) * jitter;
  const hz = mockHz(id, tradition);
  const total = Math.round((lead + body + (truncate ? 0 : tail)) * rate); const a = Math.round(lead * rate); const b = Math.round((lead + body) * rate);
  const pcm = Buffer.alloc(total * 2);
  for (let i = 0; i < total; i++) {
    let v = 0;
    if (i >= a && i < b) { const t = (i - a) / (b - a); const env = truncate ? 1 : Math.min(1, t * 20, (1 - t) * 20); v = Math.sin((2 * Math.PI * hz * i) / rate + (voice === 'f' ? 0.7 : 0)) * 0.45 * env * 32767; }
    pcm.writeInt16LE(Math.round(v), i * 2);
  }
  return wavFromPcm(pcm, rate);
}

// ---------- ffmpeg ----------
export const FF = () => process.env.FFMPEG || 'ffmpeg';
export const FP = () => process.env.FFPROBE || 'ffprobe';
export function haveFfmpeg() {
  const ok = (c) => { try { return spawnSync(c, ['-version'], { encoding: 'utf8' }).status === 0; } catch { return false; } };
  return ok(FF()) && ok(FP());
}
/** Decode any audio file to mono 16-bit samples at `rate`. Returns Int16Array or null. */
export function decodeMono(file, rate = 16000) {
  const r = spawnSync(FF(), ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(rate), '-f', 's16le', '-'], { maxBuffer: 1 << 28 });
  if (r.status !== 0 || !r.stdout || !r.stdout.length) return null;
  const b = r.stdout; const n = Math.floor(b.length / 2); const s = new Int16Array(n);
  for (let i = 0; i < n; i++) s[i] = b.readInt16LE(i * 2);
  return s;
}

// ---------- audio measures (pure) ----------
export const dbfs = (x) => (x > 0 ? 20 * Math.log10(x / 32768) : -Infinity);
/** RMS (dBFS) of each frame of `frameMs`. */
export function frameDb(samples, rate, frameMs = 20) {
  const f = Math.max(1, Math.round((rate * frameMs) / 1000)); const out = [];
  for (let i = 0; i + f <= samples.length; i += f) { let s = 0; for (let k = 0; k < f; k++) s += samples[i + k] * samples[i + k]; out.push(dbfs(Math.sqrt(s / f))); }
  return out;
}
/** Zero-crossing frequency of the loud part of the signal (used only by the mock recogniser). */
export function dominantHz(samples, rate) {
  let first = -1, last = -1;
  for (let i = 0; i < samples.length; i++) if (Math.abs(samples[i]) > 3000) { if (first < 0) first = i; last = i; }
  if (first < 0 || last - first < rate * 0.05) return 0;
  let z = 0; for (let i = first + 1; i <= last; i++) if ((samples[i - 1] < 0) !== (samples[i] < 0)) z++;
  return (z / 2) / ((last - first) / rate);
}

// ---------- Hebrew comparison ----------
const FINALS = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
/** Compare form: no niqqud or cantillation, no punctuation, final letters folded, no spaces. */
export const normHebrew = (s) => stripNiqqud(nfc(s)).replace(/[ךםןףץ]/g, (c) => FINALS[c]).replace(/\s+/g, '');
export const skeleton = (s) => normHebrew(s).replace(/[וי]/g, '');
export function levenshtein(a, b) {
  const A = [...a], B = [...b]; let prev = Array.from({ length: B.length + 1 }, (_, i) => i);
  for (let i = 1; i <= A.length; i++) { const cur = [i]; for (let j = 1; j <= B.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (A[i - 1] === B[j - 1] ? 0 : 1)); prev = cur; }
  return prev[B.length];
}
/** 1 - edit distance / longer length, on the compare forms. Two empty strings are 0 (nothing was said). */
export function similarity(expected, heard) {
  const a = normHebrew(expected), b = normHebrew(heard);
  if (!a || !b) return 0;
  return 1 - levenshtein(a, b) / Math.max([...a].length, [...b].length);
}

// ---------- HTTP with retries ----------
export class FatalServiceError extends Error { constructor(msg, status) { super(msg); this.status = status; this.fatal = true; } }
export class ItemError extends Error { constructor(msg, status) { super(msg); this.status = status; } }

/** Rate limiter: at most one request START per `intervalMs`, shared by all workers. slow() widens the spacing after a 429. */
export class Limiter {
  constructor(perMinute = 30) { this.interval = perMinute > 0 ? 60000 / perMinute : 0; this.next = 0; }
  async wait() { const now = Date.now(); const at = Math.max(now, this.next); this.next = at + this.interval; if (at > now) await sleep(at - now); }
  slow(factor = 1.5) { this.interval = Math.min(Math.max(this.interval * factor, 500), 30000); }
}

/**
 * One request with retries. `build()` returns [url, fetchInit] (called per attempt so a body can be rebuilt). Retries network errors, 408, 429 and 5xx with
 * exponential backoff and jitter, and waits at least the Retry-After seconds on a 429. 401/402/403/404 are fatal for the whole run; other 4xx fail the item.
 * Returns {res, attempts, waitedMs}. The key and any URL are scrubbed from error messages.
 */
export async function requestWithRetry(build, { maxAttempts = 6, backoffMs = 1000, maxBackoffMs = 60000, limiter = null, onRetry = null, shouldStop = () => false, fetchImpl = globalThis.fetch, env = process.env } = {}) {
  let waited = 0;
  for (let attempt = 1; ; attempt++) {
    if (shouldStop()) throw new ItemError('stopped before sending', 0);
    if (limiter) await limiter.wait();
    let res = null, netErr = null;
    try { const [url, init] = build(); res = await fetchImpl(url, init); } catch (e) { netErr = scrub(`${e && e.cause && e.cause.code ? e.cause.code + ' ' : ''}${e && e.message}`, env); }
    if (res && res.ok) return { res, attempts: attempt, waitedMs: waited };
    const status = res ? res.status : 0;
    let detail = netErr || '';
    if (res) { try { detail = scrub((await res.text()).slice(0, 300), env); } catch { detail = ''; } }
    if (res && [401, 402, 403, 404].includes(status)) throw new FatalServiceError(`HTTP ${status}: ${detail}`, status);
    const retryable = !res || status === 408 || status === 429 || status >= 500;
    if (!retryable) throw new ItemError(`HTTP ${status}: ${detail}`, status);
    if (attempt >= maxAttempts) throw new ItemError(`gave up after ${attempt} attempts (${status ? 'HTTP ' + status : 'network'}: ${detail})`, status);
    let wait = Math.min(maxBackoffMs, backoffMs * 2 ** (attempt - 1));
    if (status === 429) {
      const ra = Number(res.headers.get('retry-after'));
      if (Number.isFinite(ra) && ra >= 0) wait = Math.max(wait, ra * 1000);
      if (limiter) limiter.slow();
    }
    wait = Math.round(sleepRand(wait));
    if (onRetry) onRetry({ attempt, status, wait });
    waited += wait; await sleep(wait);
  }
}
