#!/usr/bin/env node
// THREE SEPARATE MACHINE JUDGES for the clipped words. Each writes its own verdict per clip, with the measured values, to <work>/judges/<judge>.jsonl.
//   node tools/tts/voice_judge.mjs --judge j1|j2|j3|all [--work DIR] [--limit N] [--force] [--mock] [--yes]
//        [--recogniser service|command|mock] [--min-similarity 0.7] [--config tools/tts/voices.config.json]
//   J1 structural/acoustic (local, ffmpeg): duration plausible for the word length, silence ratio, longest gap, clipping (on the raw file), loudness, sample rate,
//      channels, metadata, and energy at the tail (a clip cut off mid-sound still has energy at its end).
//   J2 recognition: speech-to-text of the clip (the service's own endpoint, or a local command set in voices.config.json "recogniser"), Hebrew, compared with the
//      expected Hebrew after normalisation (niqqud, punctuation and spaces removed, final letters folded), by edit-distance similarity with a stated threshold.
//   J3 consistency: compares take 1 with a second take rendered with a different seed (voice_render.mjs --take 2, then voice_clip.mjs --take 2): duration ratio,
//      transcript similarity between the takes, long-term spectral similarity, and an outlier check against the same word in the other voice slot.
// Overall: "unanimous-machine-pass" only if all three pass. Anything not measured is not a pass.
//
// WHAT THESE JUDGES CANNOT PROVE (also in the hand-off README): they test whether a model trained mostly on Israeli Hebrew can understand the RESPELLING and
// whether the file is technically sound. They do NOT test that the accent is Ashkenazi or Sephardi, that the vowels or stress are right, that the word is the
// right word in a learner's ear, or that the voice is pleasant or suitable. Only a native listener can judge those. The thresholds below are starting points,
// not calibrated on real speech; look at the numbers from your 20-word pilot before trusting them.
// --yes is required when judge 2 or 3 would call the service's speech-to-text (that is a billed call on most plans; check your plan).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from './lib.mjs';
import { checkMp3, integratedLufs } from './post.mjs';
import { SERVICE, STT_DEFAULTS } from './voice_service.config.mjs';
import {
  VOICE_CONFIG_PATH, apiKey, serviceBase, scrub, workPaths, defaultWork, appendJsonl, readJsonl, sha256, takeKey, loadVoiceConfig, haveFfmpeg, decodeMono, readWav, frameDb,
  dominantHz, spokenLetters, similarity, skeleton, normHebrew, levenshtein, mockHz, Limiter, requestWithRetry,
} from './voice_lib.mjs';

export const JUDGES = Object.freeze({ j1: 'j1-structural', j2: 'j2-recognition', j3: 'j3-consistency' });
export const J1 = Object.freeze({ minSecBase: 0.1, minSecPerLetter: 0.04, maxSecBase: 1.5, maxSecPerLetter: 0.6, silenceDb: -50, maxSilenceRatio: 0.5, maxInnerGapS: 0.7,
  maxClipPct: 0.1, lufsTarget: -16, lufsTol: 3, tailDbBelowPeak: 30, rate: 44100 });
export const J2 = Object.freeze({ minSimilarity: 0.7 });
export const J3 = Object.freeze({ durRatio: [0.7, 1.43], spectralMin: 0.85, takeTextMin: 0.7, otherVoiceRatio: [0.4, 2.5] });

const BANDS = (() => { const e = []; for (let i = 0; i <= 24; i++) e.push(100 * (7500 / 100) ** (i / 24)); return e; })();

// ---------- J1 ----------
export function judgeJ1(rec, { work, th = J1 } = {}) {
  const P = workPaths(work); const reasons = [], warnings = []; const m = {};
  const clip = P.clip(1, rec); const raw = P.raw(1, rec, rec.file_ext || 'wav');
  if (!fs.existsSync(clip)) return mk('fail', ['clip file missing (run voice_clip.mjs)'], [], m, th);
  const c = checkMp3(clip);
  if (!c.info) return mk('fail', c.problems, [], m, th);
  for (const p of c.problems) reasons.push(`delivery: ${p}`);
  if (!c.problems.length) { m.sample_rate = th.rate; m.channels = 1; } // checkMp3 fails anything that is not mono 44100 Hz mp3 without metadata
  m.duration_s = round(c.info.duration, 3); m.mp3_bytes = fs.statSync(clip).size;
  const n = spokenLetters(rec.text_sent); m.letters = n;
  const lo = th.minSecBase + th.minSecPerLetter * n, hi = th.maxSecBase + th.maxSecPerLetter * n; m.duration_expected_s = [round(lo, 2), round(hi, 2)];
  if (m.duration_s < lo) reasons.push(`too short for ${n} letters: ${m.duration_s} s < ${round(lo, 2)} s`);
  if (m.duration_s > hi) reasons.push(`too long for ${n} letters: ${m.duration_s} s > ${round(hi, 2)} s`);
  const s = haveFfmpeg() ? decodeMono(clip, 16000) : null;
  if (!s) { reasons.push('clip could not be decoded (ffmpeg missing or file unreadable): silence, tail and loudness not measured'); }
  else {
    const fr = frameDb(s, 16000, 20); const loud = fr.filter((d) => d > th.silenceDb);
    m.silence_ratio = round(1 - loud.length / Math.max(1, fr.length), 3);
    if (!loud.length) reasons.push('the clip is silent');
    if (m.silence_ratio > th.maxSilenceRatio) reasons.push(`silence ratio ${m.silence_ratio} > ${th.maxSilenceRatio}`);
    const first = fr.findIndex((d) => d > th.silenceDb); let last = -1; fr.forEach((d, i) => { if (d > th.silenceDb) last = i; });
    let run = 0, best = 0; if (first >= 0) for (let i = first; i <= last; i++) { if (fr[i] <= th.silenceDb) { run++; best = Math.max(best, run); } else run = 0; }
    m.longest_inner_gap_s = round(best * 0.02, 2); if (m.longest_inner_gap_s > th.maxInnerGapS) reasons.push(`a gap of ${m.longest_inner_gap_s} s inside the clip`);
    const peak = Math.max(...fr.filter(Number.isFinite), -120); const tail = Math.max(fr[fr.length - 1] ?? -120, fr[fr.length - 2] ?? -120);
    m.peak_frame_db = round(peak, 1); m.tail_db = Number.isFinite(tail) ? round(tail, 1) : -120; m.tail_below_peak_db = round(peak - m.tail_db, 1);
    if (loud.length && m.tail_below_peak_db < th.tailDbBelowPeak) reasons.push(`energy at the very end (only ${m.tail_below_peak_db} dB below the loudest frame, need ${th.tailDbBelowPeak}): the clip may be cut off`);
  }
  const lu = haveFfmpeg() ? integratedLufs(clip) : null; m.lufs = lu;
  if (lu === null) warnings.push('loudness not measurable (clip too short for the meter, or no ffmpeg)');
  else if (Math.abs(lu - th.lufsTarget) > th.lufsTol) reasons.push(`loudness ${lu} LUFS, target ${th.lufsTarget} +-${th.lufsTol}`);
  // clipping on the raw render (the delivery file is normalised to a true-peak limit, so it cannot show clipping that already happened)
  let rs = null; if (fs.existsSync(raw)) { const w = readWav(fs.readFileSync(raw)); rs = w ? w.samples : (haveFfmpeg() ? decodeMono(raw, 24000) : null); m.raw_sample_rate = w ? w.rate : null; }
  if (!rs) reasons.push('raw render unreadable: clipping not measured');
  else { let k = 0; for (let i = 0; i < rs.length; i++) if (Math.abs(rs[i]) >= 32700) k++; m.clipped_pct = round((100 * k) / Math.max(1, rs.length), 3); if (m.clipped_pct > th.maxClipPct) reasons.push(`${m.clipped_pct}% of raw samples at full scale`); }
  return mk(reasons.length ? 'fail' : 'pass', reasons, warnings, m, th);
}

// ---------- recognisers ----------
/** {mode, id, transcribe(file, rec) -> Promise<string>}. The recogniser id goes into every verdict so a later run with another one is not mixed up. */
export function makeRecogniser({ cfg, mode, env = process.env, fetchImpl = globalThis.fetch, limiter = new Limiter(60), items = [], backoffMs = 1000 }) {
  const rc = (cfg && cfg.recogniser) || { mode: 'service' }; const md = mode || rc.mode || 'service';
  if (md === 'mock') {
    const table = new Map(items.map((r) => [mockHz(r.id, r.tradition), r.he]));
    return { mode: md, id: 'mock-tone-reader', async transcribe(file) {
      const s = decodeMono(file, 16000); const hz = s ? dominantHz(s, 16000) : 0; if (!hz) return '';
      let bestHe = ''; let bd = 4; for (const [f, he] of table) if (Math.abs(f - hz) < bd) { bd = Math.abs(f - hz); bestHe = he; } return normHebrew(bestHe);
    } };
  }
  if (md === 'command') {
    const cmd = rc.command; if (!Array.isArray(cmd) || !cmd.length) throw new Error('voices.config.json "recogniser": {"mode":"command","command":["program","arg","{file}"]} needs a command array');
    return { mode: md, id: `command:${path.basename(String(cmd[0]))}`, async transcribe(file) {
      const args = cmd.slice(1).map((x) => String(x).replace('{file}', file).replace('{lang}', rc.language || 'he'));
      const r = spawnSync(String(cmd[0]), args, { encoding: 'utf8', timeout: 180000, maxBuffer: 1 << 24 });
      if (r.error || r.status !== 0) throw new Error(`recogniser command failed: ${scrub((r.error && r.error.message) || r.stderr || `exit ${r.status}`).slice(0, 200)}`);
      return String(r.stdout || '').trim();
    } };
  }
  if (md !== 'service') throw new Error(`unknown recogniser mode "${md}" (service, command or mock)`);
  const key = apiKey(env); if (!key) throw new Error(`set the key first: the environment variable ${SERVICE.keyEnv} is empty`);
  const base = serviceBase(env); const model = rc.model_id || STT_DEFAULTS.modelId; const lang = rc.language || STT_DEFAULTS.languageCode;
  return { mode: md, id: `service:${model}:${lang}`, async transcribe(file) {
    const bytes = fs.readFileSync(file);
    const { res } = await requestWithRetry(() => {
      const f = new FormData(); f.set('model_id', model); f.set('language_code', lang); f.set('tag_audio_events', 'false'); f.set('timestamps_granularity', 'none');
      f.set('file', new Blob([bytes], { type: 'audio/mpeg' }), 'clip.mp3');
      return [`${base}${SERVICE.paths.stt}`, { method: 'POST', headers: { [SERVICE.keyHeader]: key }, body: f }];
    }, { limiter, fetchImpl, backoffMs, env });
    const j = await res.json(); return String(j.text ?? '');
  } };
}

/** Transcript with a cache keyed by clip hash + recogniser id, so no clip is sent twice (delete judges/transcripts.jsonl to transcribe again; --force only recomputes verdicts). */
async function transcriptOf(P, rec, take, recogniser) {
  const file = P.clip(take, rec); if (!fs.existsSync(file)) return { error: `take ${take} clip missing` };
  const h = sha256(fs.readFileSync(file)); const ck = `${h}|${recogniser.id}`;
  { const hit = readJsonl(P.transcripts).reverse().find((r) => r.cache === ck); if (hit) return { text: hit.text, cached: true, sha: h }; }
  try { const text = await recogniser.transcribe(file, rec); appendJsonl(P.transcripts, { cache: ck, ts: new Date().toISOString(), take, id: rec.id, tradition: rec.tradition, voice: rec.voice, recogniser: recogniser.id, text }); return { text, cached: false, sha: h }; }
  catch (e) { return { error: scrub(e.message, process.env) }; }
}

// ---------- J2 ----------
export async function judgeJ2(rec, { work, recogniser, th = J2, force = false } = {}) {
  const P = workPaths(work); const m = { recogniser: recogniser.id };
  const t = await transcriptOf(P, rec, 1, recogniser);
  if (t.error) return mk('fail', [`not recognised: ${t.error}`], [], m, th);
  m.expected = normHebrew(rec.he); m.heard = normHebrew(t.text); m.heard_raw = String(t.text).slice(0, 200); m.cached = !!t.cached;
  m.similarity = round(similarity(rec.he, t.text), 3); m.skeleton_similarity = round(similarityOf(skeleton(rec.he), skeleton(t.text)), 3);
  const reasons = [];
  if (!m.heard) reasons.push('nothing was recognised');
  else if (m.similarity < th.minSimilarity) reasons.push(`heard "${m.heard}" for "${m.expected}": similarity ${m.similarity} < ${th.minSimilarity}`);
  return mk(reasons.length ? 'fail' : 'pass', reasons, [], m, th);
}
const similarityOf = (a, b) => (a && b ? 1 - levenshtein(a, b) / Math.max([...a].length, [...b].length) : 0);

// ---------- J3 ----------
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const a = i + k, b = i + k + len / 2; const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr; re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti; const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr; } }
  }
}
/** Long-term average log band energies (24 log-spaced bands, 100 Hz to 7.5 kHz) over the frames that are not silence. */
export function bandProfile(samples, rate = 16000) {
  const N = 512, H = 256, win = Float64Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1)));
  const acc = new Float64Array(24); let frames = 0;
  for (let s = 0; s + N <= samples.length; s += H) {
    let e = 0; for (let i = 0; i < N; i++) e += samples[s + i] * samples[s + i]; if (dbfsRms(e / N) < -45) continue;
    const re = new Float64Array(N), im = new Float64Array(N); for (let i = 0; i < N; i++) re[i] = (samples[s + i] / 32768) * win[i];
    fft(re, im); frames++;
    for (let b = 0; b < 24; b++) { let p = 0; const lo = Math.floor((BANDS[b] * N) / rate), hi = Math.max(lo + 1, Math.floor((BANDS[b + 1] * N) / rate)); for (let k = lo; k < hi && k < N / 2; k++) p += re[k] * re[k] + im[k] * im[k]; acc[b] += p; }
  }
  return frames ? Array.from(acc, (v) => Math.log10(v / frames + 1e-12)) : null;
}
const dbfsRms = (ms) => (ms > 0 ? 10 * Math.log10(ms / (32768 * 32768)) : -200);
export function pearson(a, b) {
  const n = a.length; const ma = a.reduce((x, y) => x + y, 0) / n, mb = b.reduce((x, y) => x + y, 0) / n; let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; }
  return saa && sbb ? sab / Math.sqrt(saa * sbb) : 0;
}

export async function judgeJ3(rec, { work, recogniser, th = J3, durations, force = false } = {}) {
  const P = workPaths(work); const reasons = [], warnings = []; const m = { recogniser: recogniser.id };
  const c1 = P.clip(1, rec), c2 = P.clip(2, rec);
  if (!fs.existsSync(c2)) return mk('fail', ['no second take for this clip (run voice_render.mjs --take 2 and voice_clip.mjs --take 2): consistency not measured'], [], m, th);
  if (!fs.existsSync(c1)) return mk('fail', ['take 1 clip missing'], [], m, th);
  const d1 = checkMp3(c1).info, d2 = checkMp3(c2).info; if (!d1 || !d2) return mk('fail', ['a take could not be probed'], [], m, th);
  m.duration_take1_s = round(d1.duration, 3); m.duration_take2_s = round(d2.duration, 3); m.duration_ratio = round(d2.duration / d1.duration, 3);
  if (m.duration_ratio < th.durRatio[0] || m.duration_ratio > th.durRatio[1]) reasons.push(`take lengths differ: ratio ${m.duration_ratio} outside ${th.durRatio.join(' to ')}`);
  const [t1, t2] = [await transcriptOf(P, rec, 1, recogniser), await transcriptOf(P, rec, 2, recogniser)];
  if (t1.error || t2.error) reasons.push(`take transcripts unavailable: ${t1.error || t2.error}`);
  else { m.transcript_take1 = normHebrew(t1.text); m.transcript_take2 = normHebrew(t2.text); m.transcript_similarity = round(similarity(t1.text, t2.text), 3);
    if (m.transcript_similarity < th.takeTextMin) reasons.push(`the two takes were heard as different words (similarity ${m.transcript_similarity} < ${th.takeTextMin})`); }
  const a = haveFfmpeg() ? decodeMono(c1, 16000) : null, b = haveFfmpeg() ? decodeMono(c2, 16000) : null;
  const pa = a && bandProfile(a), pb = b && bandProfile(b);
  if (!pa || !pb) reasons.push('spectral similarity not measured (a take could not be decoded)'); else { m.spectral_similarity = round(pearson(pa, pb), 3); if (m.spectral_similarity < th.spectralMin) reasons.push(`spectral similarity ${m.spectral_similarity} < ${th.spectralMin}`); }
  const other = durations && durations.get(`${rec.tradition}/${rec.kind}/${rec.id}/${rec.voice === 'm' ? 'f' : 'm'}`);
  if (other) { m.other_voice_duration_s = other; m.duration_vs_other_voice = round(d1.duration / other, 3);
    if (m.duration_vs_other_voice < th.otherVoiceRatio[0] || m.duration_vs_other_voice > th.otherVoiceRatio[1]) reasons.push(`outlier against the other voice slot: length ratio ${m.duration_vs_other_voice} outside ${th.otherVoiceRatio.join(' to ')}`); }
  else warnings.push('the same word in the other voice slot is not clipped yet: no cross-voice check');
  return mk(reasons.length ? 'fail' : 'pass', reasons, warnings, m, th);
}

// ---------- plumbing ----------
const round = (x, d) => (Number.isFinite(x) ? Math.round(x * 10 ** d) / 10 ** d : x);
const mk = (verdict, reasons, warnings, measured, thresholds) => ({ verdict, reasons, warnings, measured, thresholds });
const thHash = (th) => sha256(Buffer.from(JSON.stringify(th))).slice(0, 12);

/** Take-1 rendered records (last per key), in log order. */
export function renderedTake1(work) {
  const m = new Map(); for (const r of readJsonl(workPaths(work).log)) if (r.event === 'rendered' && r.take === 1) m.set(takeKey(r, 1), r);
  return [...m.values()];
}
/** Latest verdict per key for one judge. */
export function loadVerdicts(work, judge) {
  const m = new Map(); for (const r of readJsonl(workPaths(work).judge(judge))) if (r.event === 'verdict') m.set(`${r.voice}/${r.tradition}/${r.kind}/${r.id}`, r); return m;
}

export async function runJudges({ work, which = ['j1', 'j2', 'j3'], limit = 0, force = false, recogniser = null, thresholds = {}, log = console.log } = {}) {
  const P = workPaths(work); const recs = renderedTake1(work).slice(0, limit || undefined);
  const durations = new Map(); for (const r of recs) { const f = P.clip(1, r); if (fs.existsSync(f)) { const i = checkMp3(f).info; if (i) durations.set(`${r.tradition}/${r.kind}/${r.id}/${r.voice}`, i.duration); } }
  const out = {};
  for (const j of which) {
    const name = JUDGES[j]; const th = { j1: { ...J1, ...(thresholds.j1 || {}) }, j2: { ...J2, ...(thresholds.j2 || {}) }, j3: { ...J3, ...(thresholds.j3 || {}) } }[j];
    const prev = loadVerdicts(work, j); const tally = { pass: 0, fail: 0, reused: 0 };
    for (const r of recs) {
      const clipF = P.clip(1, r); const mp3 = fs.existsSync(clipF) ? sha256(fs.readFileSync(clipF)) : null; const t2f = P.clip(2, r); const t2 = j === 'j3' && fs.existsSync(t2f) ? sha256(fs.readFileSync(t2f)) : null;
      const k = `${r.voice}/${r.tradition}/${r.kind}/${r.id}`; const old = prev.get(k); const sig = `${thHash(th)}|${recogniser ? recogniser.id : ''}|${t2 || ''}`;
      if (!force && old && old.mp3_sha256 === mp3 && old.sig === sig) { tally[old.verdict]++; tally.reused++; continue; }
      let v;
      if (j === 'j1') v = judgeJ1(r, { work, th });
      else if (j === 'j2') v = await judgeJ2(r, { work, recogniser, th, force });
      else v = await judgeJ3(r, { work, recogniser, th, durations, force });
      appendJsonl(P.judge(j), { event: 'verdict', judge: name, ts: new Date().toISOString(), id: r.id, kind: r.kind, tradition: r.tradition, voice: r.voice, mock: !!r.mock, mp3_sha256: mp3, sig, ...v });
      tally[v.verdict]++;
    }
    out[j] = tally; log(`${name}: ${tally.pass} pass, ${tally.fail} fail${tally.reused ? ` (${tally.reused} unchanged since last run)` : ''} -> ${P.judge(j)}`);
  }
  return out;
}

export async function main(argv = process.argv.slice(2)) {
  const a = parseArgs(argv, ['force', 'mock', 'yes', 'help']);
  if (a.help) { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//')).map((l) => l.slice(3)).join('\n')); return; }
  const work = path.resolve(a.work || defaultWork());
  const which = !a.judge || a.judge === 'all' ? ['j1', 'j2', 'j3'] : String(a.judge).split(',').map((x) => x.trim());
  for (const j of which) if (!JUDGES[j]) throw new Error(`unknown judge "${j}" (j1, j2, j3 or all)`);
  const cfg = loadVoiceConfig(path.resolve(a.config || VOICE_CONFIG_PATH), { allowMissing: true });
  let recogniser = null;
  if (which.includes('j2') || which.includes('j3')) {
    const mode = a.mock ? 'mock' : a.recogniser || cfg.recogniser.mode || 'service';
    if (mode === 'service' && !a.yes) { console.error('Judge 2 and 3 would send every clip to the service\'s speech-to-text (a billed call on most plans; check your plan). Re-run with --yes, or use --recogniser command with a local recogniser set in voices.config.json.'); process.exitCode = 3; return; }
    recogniser = makeRecogniser({ cfg, mode, items: renderedTake1(work) });
  }
  const th = a['min-similarity'] ? { j2: { minSimilarity: Number(a['min-similarity']) } } : {};
  const r = await runJudges({ work, which, limit: a.limit ? Number(a.limit) : 0, force: !!a.force, recogniser, thresholds: th });
  console.log('Judges test technical soundness and whether a recogniser understood the respelling. They cannot tell whether the accent is Ashkenazi or Sephardi, whether vowels and stress are right, or whether the voice suits. Only a native listener can.');
  if (Object.values(r).some((t) => t.fail)) process.exitCode = 1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(scrub(e.message)); process.exit(1); });
