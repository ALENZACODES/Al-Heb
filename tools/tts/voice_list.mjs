#!/usr/bin/env node
// List the voices available to YOUR account, with the fields that help you pick: name, id, category, labels, languages, preview link, library/sharing hints.
//   node tools/tts/voice_list.mjs [--search TEXT] [--gender female|male] [--json] [--max N] [--mock]
// It never chooses for you and never writes tools/tts/voices.config.json. Listen to the preview links yourself, then copy two ids into that file.
// Needs the key in the environment variable named in tools/tts/voice_service.config.mjs (never printed). --mock reads a recorded-shape fixture instead of calling anything.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from './lib.mjs';
import { SERVICE } from './voice_service.config.mjs';
import { apiKey, serviceBase, requestWithRetry, scrub, REPO_ROOT, readJson } from './voice_lib.mjs';

const FIXTURE = path.join(REPO_ROOT, 'tests', 'fixtures', 'voice', 'voices.list.shape.json');

/** One display row per voice. Missing fields stay empty: nothing is guessed. */
export function describeVoice(v) {
  const l = v.labels || {};
  return {
    name: v.name || '', voice_id: v.voice_id || '', category: v.category || '',
    labels: Object.entries(l).filter(([, x]) => x).map(([k, x]) => `${k}=${x}`).join('; '),
    languages: (v.verified_languages || []).map((x) => x.language).filter(Boolean).join(','),
    preview_url: v.preview_url || '',
    shared_library_voice: !!(v.sharing && (v.sharing.status || v.sharing.category) && !v.is_owner),
    description: v.description || '',
  };
}

export async function fetchVoices({ search, gender, max = 500, fetchImpl, env = process.env, backoffMs = 1000 } = {}) {
  const key = apiKey(env); if (!key) throw new Error(`set the key first: the environment variable ${SERVICE.keyEnv} is empty`);
  const base = serviceBase(env); const out = []; let token = null;
  do {
    const q = new URLSearchParams({ page_size: '100' });
    if (search) q.set('search', search); if (gender) q.set('gender', gender); if (token) q.set('next_page_token', token);
    const { res } = await requestWithRetry(() => [`${base}${SERVICE.paths.voices}?${q}`, { headers: { [SERVICE.keyHeader]: key, accept: 'application/json' } }], { fetchImpl: fetchImpl || globalThis.fetch, backoffMs, env });
    const j = await res.json(); out.push(...(j.voices || [])); token = j.has_more ? j.next_page_token : null;
  } while (token && out.length < max);
  return out.slice(0, max);
}

export async function main(argv = process.argv.slice(2)) {
  const a = parseArgs(argv, ['json', 'mock', 'help']);
  if (a.help) { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//')).map((l) => l.slice(3)).join('\n')); return; }
  const voices = a.mock ? readJson(FIXTURE).voices : await fetchVoices({ search: a.search, gender: a.gender, max: a.max ? Number(a.max) : 500 });
  const rows = voices.map(describeVoice);
  if (a.json) { console.log(JSON.stringify(rows, null, 1)); return; }
  if (a.mock) console.log('(--mock: invented fixture rows, nothing was fetched)\n');
  for (const r of rows) {
    console.log(`${r.name}  [${r.category}]${r.shared_library_voice ? '  (may be a shared-library voice: check its own commercial-use terms)' : ''}`);
    console.log(`  id: ${r.voice_id}`); if (r.labels) console.log(`  labels: ${r.labels}`); if (r.languages) console.log(`  verified languages: ${r.languages}`);
    if (r.description) console.log(`  description: ${r.description}`); console.log(`  preview: ${r.preview_url || '(none)'}`);
  }
  console.log(`\n${rows.length} voice(s). Pick one for tools/tts/voices.config.json "m_pleasant" and one for "f_extra_feminine". Listen to the previews first. Nothing was chosen or written.`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(scrub(e.message)); process.exit(1); });
