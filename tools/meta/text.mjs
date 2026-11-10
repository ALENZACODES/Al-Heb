// Repo-wide tracked-text scan: AI/tool names in text files (node tools/meta/scan.mjs --text).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { globToRe } from './lib.mjs';

export const TEXT_RE = /\u0063hatgpt|\u0063laude|anthropic|openai|gpt-|dall-?e|midjourney|co-authored/i;
// Skips words that merely contain the letters, e.g. the Hebrew transliteration "dalet" never matches "dall-?e"; "dalleket" is allowlisted.
// Provenance phrases that name AI as the author of content. Case-sensitive on purpose: the Hebrew transliterations
// "ai" / "Adonai" / "Sinai" must never match, so only the upper-case token AI with a word boundary counts.
export const PROVENANCE_RE = /\bAI agent\b|\ban AI\b|\bby AI\b|\bAI-generated\b|\bAI-written\b|\bAI-pointed\b/;
export const textHit = (ln) => TEXT_RE.test(ln) || PROVENANCE_RE.test(ln);

export function loadTextAllowlist(file) {
  if (!file || !fs.existsSync(file)) return { entries: [] };
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  return { entries: (j.entries || []).map((e) => ({ ...e, re: globToRe(e.path) })) };
}

export function scanTrackedText({ cwd = process.cwd(), allowlist } = {}) {
  const allow = loadTextAllowlist(allowlist);
  const files = execFileSync('git', ['ls-files', '-z'], { cwd, maxBuffer: 1 << 28 }).toString().split('\0').filter(Boolean);
  const findings = [], allowed = [], hits = new Set();
  for (const rel of files) {
    const abs = path.join(cwd, rel);
    let buf;
    try { buf = fs.readFileSync(abs); } catch { continue; }
    if (buf.subarray(0, 8000).includes(0)) continue; // binary: covered by the metadata scan
    const e = allow.entries.find((x) => x.re.test(rel));
    const lines = buf.toString('utf8').split('\n');
    let n = 0;
    lines.forEach((ln, i) => { if (textHit(ln)) { n++; if (!e && n <= 3) findings.push({ file: rel, line: i + 1, text: ln.trim().slice(0, 120) }); } });
    if (n) { if (e) { hits.add(e.path); allowed.push({ file: rel, count: n }); } else if (n > 3) findings.push({ file: rel, line: 0, text: `... ${n} matching lines in total` }); }
  }
  const unused = allow.entries.filter((e) => !hits.has(e.path)).map((e) => e.path);
  return { scanned: files.length, findings, allowed, unused };
}

export function formatText(r) {
  const L = r.findings.map((f) => `FINDING ${f.file}${f.line ? ':' + f.line : ''} ${f.text}`);
  if (r.unused.length) L.push('text-allowlist entries that matched nothing: ' + r.unused.join(', '));
  L.push(r.findings.length ? `FAIL: ${r.findings.length} text finding(s); ${r.allowed.length} file(s) allowlisted` : `PASS: no AI/tool names in tracked text; ${r.allowed.length} file(s) allowlisted (${r.scanned} tracked files)`);
  return L.join('\n');
}
