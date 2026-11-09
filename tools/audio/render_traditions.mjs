#!/usr/bin/env node
// One command for the Sephardi and Ashkenazi recordings: renders every missing clip for both traditions and both voices
// (Ari and Noa reading the tradition's respelling, see docs/audio/ACCENT-VOICES-2026-11-08.md), then refreshes every file
// the app and its checks read, so the push goes through CI.
//
//   set GOOGLE_TTS_API_KEY=...
//   node tools/audio/render_traditions.mjs                    dry run: counts and cost per tradition
//   node tools/audio/render_traditions.mjs --execute --limit 10   try 10 clips per tradition first, then listen
//   node tools/audio/render_traditions.mjs --execute          record everything that is missing
// Then: git add -A && git commit -m "Sephardi and Ashkenazi recordings" && git push, and deploy on Render.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const argv = process.argv.slice(2);
const execute = argv.includes('--execute');
const li = argv.indexOf('--limit');
const limit = li >= 0 ? ['--limit', argv[li + 1]] : [];
const KINDS = 'letter,vowel,syllable,word,line,prayer';

function run(script, args, label) {
  console.log(`\n== ${label}`);
  const r = spawnSync(process.execPath, [path.join(ROOT, script), ...args], { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) { console.log(`!! ${label} did not finish (exit ${r.status}).`); return false; }
  return true;
}

// Reads GOOGLE_TTS_API_KEY from a .env file in the repo root (gitignored) if it isn't already set.
import { readFileSync as __rf, existsSync as __ex } from 'node:fs';
{ const envPath = new URL('../../.env', import.meta.url);
  if (!process.env.GOOGLE_TTS_API_KEY && __ex(envPath)) {
    for (const line of __rf(envPath, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*GOOGLE_TTS_API_KEY\s*=\s*"?([^"\s]+)"?\s*$/);
      if (m) process.env.GOOGLE_TTS_API_KEY = m[1];
    }
  }
}
if (execute && !process.env.GOOGLE_TTS_API_KEY) { console.error('GOOGLE_TTS_API_KEY is not set.'); process.exit(1); }
for (const tradition of ['sephardi', 'ashkenazi']) {
  run('tools/audio/render_tts.mjs', ['--provider', 'google', '--voice', 'both', '--tradition', tradition, '--kinds', KINDS, ...limit, ...(execute ? ['--execute'] : [])], `${tradition}: ${execute ? 'recording' : 'dry run'}`);
}
if (!execute) { console.log('\nDry run only. Add --execute to record.'); process.exit(0); }

// Refresh everything generated from the manifests (order matters: summary first, the service-worker list last).
const steps = [
  ['tools/audio/summary.mjs', [], 'audio summary'],
  ['tools/audio/coverage.mjs', [], 'voice coverage page'],
  ['tools/audio/priority.mjs', [], 'recording priority list'],
  ['tools/audio/recording_script.mjs', [], 'recording scripts'],
  ['tools/audio/session_kit.mjs', [], 'session kit'],
  ['tools/audio/build-builder-data.mjs', [], 'word-builder data'],
  ['tools/tts/build_soundwords.mjs', [], 'sound words'],
  ['tools/record-kit/build.mjs', [], 'record kit'],
  ['tools/vocab/build-clip-lookup.mjs', [], 'dictionary clip lookup'],
  ['tools/docs/index.mjs', [], 'docs index'],
  ['tools/build-precache.mjs', [], 'offline file list'],
];
const failed = steps.filter(([s, a, l]) => !run(s, a, l)).map(([, , l]) => l);
console.log(failed.length ? `\nDone, but these did not finish: ${failed.join(', ')}. Run them by hand or ask for help before pushing.` : '\nDone. Now: npm test (optional), then git add -A, git commit, git push, and deploy on Render.');
