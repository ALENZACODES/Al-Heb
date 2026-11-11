#!/usr/bin/env node
/**
 * The media hosts: audio folders that are also served from the alef-packs and alef-audio repositories (GitHub Pages).
 * tools/deploy/media-hosts.json says which folder lives on which host; this tool keeps the three repositories in step.
 *
 *   node tools/deploy/media-hosts.mjs --write                       rewrite media-hosts.js (what sw.js reads) from the JSON
 *                                                                   and the clips as they stand here now
 *   node tools/deploy/media-hosts.mjs --check                       say which folders changed here since the last sync;
 *                                                                   exit 1 if media-hosts.js is out of date (run --write)
 *   node tools/deploy/media-hosts.mjs --sync <packs dir> <audio dir>  copy changed clips into the two clones (in the order of
 *                                                                   "hosts"), check they now match, record the folder state
 *   node tools/deploy/media-hosts.mjs --verify-live [n]             download n clips per folder (default 12) from each host
 *                                                                   as the live site would and compare them with this repo
 *
 * A folder's state is the list of its files with git's own content ids, so two repositories hold the same bytes exactly when
 * their states match; nothing is hashed twice. --sync does not commit or push: do that in each clone, then commit the JSON here.
 *
 * A clip must never come from a host that holds an older take of it. So the state is kept per sub-folder (word/, line/, ...),
 * and media-hosts.js sends a sub-folder to its host only while the clips here are exactly the ones the host was synced to.
 * Re-record a clip here and its sub-folder is served by this site again from the next --write, with no need to touch the
 * other two repositories; the next --sync moves it back to the host. tests/media-hosts.test.js fails until --write is run.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const JSON_PATH = join(ROOT, 'tools', 'deploy', 'media-hosts.json');
const JS_PATH = join(ROOT, 'media-hosts.js');

export const readConfig = () => JSON.parse(readFileSync(JSON_PATH, 'utf8'));

/** Only the clips themselves live on the media hosts; the small .meta.json notes beside them stay in this repository. */
const CLIP = /\.(mp3|m4a|ogg|wav)$/i;
/** path -> git content id for every clip under `prefix` at HEAD of the repository at `dir`. */
export function tree(dir, prefix, ref = 'HEAD') {
  const out = execFileSync('git', ['-C', dir, 'ls-tree', '-r', '-z', ref, '--', prefix], { encoding: 'utf8', maxBuffer: 1 << 28 });
  const map = new Map();
  for (const line of out.split('\0')) { if (!line) continue; const [meta, path] = line.split('\t'); if (CLIP.test(path)) map.set(path, meta.split(' ')[2]); }
  return map;
}
export function digest(map) {
  const h = createHash('sha256');
  for (const p of [...map.keys()].sort()) h.update(`${p} ${map.get(p)}\n`);
  return `${map.size} files ${h.digest('hex').slice(0, 20)}`;
}

/**
 * path -> git content id for every clip under `prefix` as the files stand now in the checkout at `dir`: the last commit, plus
 * every clip that is changed, added or deleted and not committed yet. So the table can be rewritten before the commit is made.
 */
export function workTree(dir, prefix) {
  const map = tree(dir, prefix);
  const out = execFileSync('git', ['-C', dir, 'status', '--porcelain', '-z', '--untracked-files=all', '--', prefix], { encoding: 'utf8', maxBuffer: 1 << 28 });
  const fields = out.split('\0');
  const touched = new Set();
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i];
    if (f.length < 4) continue;
    touched.add(f.slice(3));
    if (/[RC]/.test(f.slice(0, 2))) touched.add(fields[++i]); // a rename or copy names the old path next
  }
  const live = [];
  for (const p of touched) { if (!p || !CLIP.test(p) || !p.startsWith(prefix)) continue; if (existsSync(join(dir, p))) live.push(p); else map.delete(p); }
  if (live.length) {
    const ids = execFileSync('git', ['-C', dir, 'hash-object', '--stdin-paths'], { input: live.join('\n') + '\n', encoding: 'utf8', cwd: dir, maxBuffer: 1 << 28 }).split('\n').filter(Boolean);
    live.forEach((p, i) => map.set(p, ids[i]));
  }
  return map;
}

/** The sub-folder a clip belongs to ('audio/f/israeli/word/x.mp3' -> 'audio/f/israeli/word/'); a clip directly in the folder belongs to the folder. */
export const partOf = (path, prefix) => { const rest = path.slice(prefix.length); const i = rest.indexOf('/'); return i < 0 ? prefix : prefix + rest.slice(0, i + 1); };

/** { sub-folder: state } for one hosted folder, from a path -> id map of its clips. */
export function partStates(map, prefix) {
  const parts = new Map();
  for (const [p, id] of map) { const k = partOf(p, prefix); if (!parts.has(k)) parts.set(k, new Map()); parts.get(k).set(p, id); }
  return Object.fromEntries([...parts.keys()].sort().map((k) => [k, digest(parts.get(k))]));
}

/** { sub-folder: state } for every hosted folder, as the clips stand now in the checkout at `dir`. */
export function stateNow(cfg, dir = ROOT, read = workTree) {
  return Object.assign({}, ...cfg.hosts.flatMap((h) => h.prefixes.map((prefix) => partStates(read(dir, prefix), prefix))));
}

/**
 * The folder-to-host table. A sub-folder goes to its host only while its clips here (`now`) are the ones the host was last
 * synced to (cfg.trees). One that has changed here since, or is new, is left out: this site serves it until the next sync.
 * A hosted folder whose sub-folders are all in step is a single row.
 */
export function rows(cfg, now) {
  if (cfg.enabled === false) return [];
  const out = [];
  for (const h of cfg.hosts) for (const prefix of h.prefixes) {
    const all = [...new Set([...Object.keys(cfg.trees), ...Object.keys(now)].filter((k) => k.startsWith(prefix)))].sort();
    const inStep = all.filter((k) => cfg.trees[k] && cfg.trees[k] === now[k]);
    if (inStep.length && inStep.length === all.length) out.push([prefix, h.host]);
    else for (const k of inStep) if (k !== prefix) out.push([k, h.host]); // loose clips of a split folder stay with this site
  }
  return out;
}

/** What --check says: the sub-folders that are not on their host right now, and why. */
export function drift(cfg, now) {
  const out = [];
  for (const h of cfg.hosts) for (const prefix of h.prefixes) {
    for (const k of [...new Set([...Object.keys(cfg.trees), ...Object.keys(now)].filter((x) => x.startsWith(prefix)))].sort()) {
      if (cfg.trees[k] && cfg.trees[k] === now[k]) continue;
      out.push({ folder: k, repo: h.repo, why: !cfg.trees[k] ? 'new here, never synced' : !now[k] ? 'no longer here' : `changed here since the last sync (synced ${cfg.trees[k]}, now ${now[k]})` });
    }
  }
  return out;
}

/** The classic script sw.js imports: the folder-to-host table (for the clips as they stand, `now`) and the one function that maps a clip address to its host address. */
export function scriptText(cfg, now) {
  const table = rows(cfg, now);
  return `// Generated by tools/deploy/media-hosts.mjs from tools/deploy/media-hosts.json. Do not edit by hand.
// Audio folders that are also served from the media repositories. sw.js asks the host first and falls back to this site.
// Only folders whose clips here are the ones the host holds are listed; a folder re-recorded since is served by this site.
self.ALEF_MEDIA_HOSTS = ${JSON.stringify(table)};
/** The media-host address of a clip of this site, or null when its folder is not hosted (or the address is not this site's). */
self.alefMediaUrl = function (url, scope) {
  try {
    var base = new URL(scope);
    var u = new URL(url, base);
    if (u.origin !== base.origin || u.pathname.indexOf(base.pathname) !== 0) return null;
    var rel = u.pathname.slice(base.pathname.length);
    for (var i = 0; i < self.ALEF_MEDIA_HOSTS.length; i++) {
      if (rel.indexOf(self.ALEF_MEDIA_HOSTS[i][0]) === 0) return self.ALEF_MEDIA_HOSTS[i][1] + rel + u.search;
    }
  } catch (e) { /* not an address: no host */ }
  return null;
};
`;
}

function sha(buf) { return createHash('sha256').update(buf).digest('hex'); }

async function verifyLive(cfg, n) {
  let bad = 0, ok = 0;
  const repoOf = Object.fromEntries(cfg.hosts.map((h) => [h.host, h.repo]));
  for (const [prefix, host] of rows(cfg, stateNow(cfg))) {
    const h = { host, repo: repoOf[host] };
    const files = [...workTree(ROOT, prefix).keys()];
    const step = Math.max(1, Math.floor(files.length / n));
    const pick = files.filter((_, i) => i % step === 0).slice(0, n);
    let good = 0;
    for (const p of pick) {
      try {
        const res = await fetch(h.host + p, { headers: { Origin: 'https://alef-review.onrender.com' } });
        const body = Buffer.from(await res.arrayBuffer());
        const same = res.status === 200 && sha(body) === sha(readFileSync(join(ROOT, p))) && res.headers.get('access-control-allow-origin') === '*';
        if (same) good++; else { bad++; console.log(`  differs: ${h.host}${p} (HTTP ${res.status})`); }
      } catch (e) { bad++; console.log(`  failed: ${h.host}${p} (${e.message})`); }
    }
    ok += good;
    console.log(`${h.repo} ${prefix}: ${good} of ${pick.length} sampled clips identical and readable from the site (${files.length} clips in the folder)`);
  }
  console.log(`${ok} identical, ${bad} not`);
  return bad;
}

function sync(cfg, dirs) {
  const trees = {};
  cfg.hosts.forEach((h, i) => {
    const dir = dirs[i];
    if (!dir || !existsSync(join(dir, '.git'))) throw new Error(`no clone given for ${h.repo}`);
    for (const prefix of h.prefixes) {
      // both sides as their files stand, so clips copied by an earlier run that is not committed yet count as there
      const here = workTree(ROOT, prefix);
      let copied = 0, removed = 0;
      const there = workTree(dir, prefix);
      for (const [p, id] of here) if (there.get(p) !== id) { mkdirSync(dirname(join(dir, p)), { recursive: true }); copyFileSync(join(ROOT, p), join(dir, p)); copied++; }
      for (const p of there.keys()) if (!here.has(p)) { rmSync(join(dir, p), { force: true }); removed++; }
      const after = partStates(workTree(dir, prefix), prefix), mine = partStates(here, prefix);
      for (const k of Object.keys(mine)) if (after[k] !== mine[k]) throw new Error(`${h.repo} ${k} does not match this repository after the copy`);
      for (const k of Object.keys(after)) if (!mine[k]) throw new Error(`${h.repo} ${k} is not in this repository`);
      Object.assign(trees, mine);
      console.log(`${h.repo} ${prefix}: ${copied} copied, ${removed} removed, ${here.size} files in ${Object.keys(mine).length} folders`);
    }
  });
  return trees;
}

const count = (n) => `${n} ${n === 1 ? 'folder' : 'folders'}`;
const isMain = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain) {
  const cfg = readConfig();
  const arg = process.argv.slice(2);
  if (arg[0] === '--write') {
    const now = stateNow(cfg);
    writeFileSync(JS_PATH, scriptText(cfg, now));
    const off = drift(cfg, now);
    for (const d of off) console.log(`  ${d.folder}: ${d.why}; served by this site until the next sync`);
    console.log(`media-hosts.js written: ${rows(cfg, now).length} table rows, ${count(off.length)} served by this site until the next sync`);
  }
  else if (arg[0] === '--check') {
    const now = stateNow(cfg);
    const off = drift(cfg, now);
    for (const d of off) console.log(`${d.folder}: ${d.why}; served by this site until the next sync (${d.repo})`);
    const stale = readFileSync(JS_PATH, 'utf8') !== scriptText(cfg, now);
    if (stale) console.log('media-hosts.js is out of date: run node tools/deploy/media-hosts.mjs --write');
    console.log(stale ? 'media hosts are NOT in step' : off.length ? `media-hosts.js is right; ${count(off.length)} ${off.length === 1 ? 'waits' : 'wait'} for a sync` : 'media hosts are in step with this repository');
    process.exit(stale ? 1 : 0);
  } else if (arg[0] === '--sync') {
    cfg.trees = sync(cfg, arg.slice(1));
    writeFileSync(JSON_PATH, JSON.stringify(cfg, null, 1) + '\n'); writeFileSync(JS_PATH, scriptText(cfg, stateNow(cfg)));
    console.log('recorded. Commit and push each clone, then commit tools/deploy/media-hosts.json and media-hosts.js here.');
  } else if (arg[0] === '--verify-live') { process.exit((await verifyLive(cfg, Number(arg[1]) || 12)) ? 1 : 0); }
  else { console.log('usage: --write | --check | --sync <packs dir> <audio dir> | --verify-live [n]'); process.exit(2); }
}
