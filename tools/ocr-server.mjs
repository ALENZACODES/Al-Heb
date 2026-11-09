#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
// Optional LOCAL helper server for the photo feature (dev / self-hosted use; NOT part of the static app and not needed for in-browser OCR).
//   GET  /health                 -> {ok, tesseract, argos}
//   POST /translate  {text}      -> {text, engine}          he -> en with Argos Translate (MIT; ~132 MB model, Python + ctranslate2)
//   POST /ocr  (raw image body)  -> {boxes:[{text,x,y,w,h,conf}], engine}   Tesseract CLI, `heb`, psm 6
// Binds to 127.0.0.1 only. CORS allows http(s)://localhost and 127.0.0.1 origins only. No auth: do not expose it on a network.
// Env: PORT (8787), ARGOS_PYTHON (python with argostranslate; default python3), TESSDATA_PREFIX (optional).
// Argos is the only way this repo currently gets he->en translation; it is NOT browser-feasible (132 MB model) so a server/device is required.
import { createServer } from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ORIGIN_OK = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const MAX_BODY = 20 * 1024 * 1024;

function parseTsv(tsv) {
  const out = [];
  for (const row of tsv.split('\n').slice(1)) {
    const c = row.split('\t'); if (c.length < 12 || c[0] !== '5') continue;
    const text = c.slice(11).join('\t').trim(); if (!text) continue;
    out.push({ text, x: +c[6], y: +c[7], w: +c[8], h: +c[9], conf: +c[10] });
  }
  return out;
}
const readBody = (req) => new Promise((res, rej) => {
  const chunks = []; let n = 0;
  req.on('data', (d) => { n += d.length; if (n > MAX_BODY) { rej(Object.assign(new Error('body too large'), { code: 413 })); req.destroy(); } else chunks.push(d); });
  req.on('end', () => res(Buffer.concat(chunks))); req.on('error', rej);
});

export function createOcrServer({ argosPython = process.env.ARGOS_PYTHON || 'python3', tesseract = 'tesseract' } = {}) {
  let worker = null; let pending = new Map(); let nextId = 1; let workerState = 'idle'; let buf = '';
  function startWorker() {
    if (worker) return;
    workerState = 'starting';
    worker = spawn(argosPython, ['-W', 'ignore', join(here, 'ocr-bench', 'argos-worker.py')], { stdio: ['pipe', 'pipe', 'pipe'] });
    worker.on('error', () => { workerState = 'unavailable'; worker = null; for (const p of pending.values()) p.rej(new Error('argos worker failed to start')); pending.clear(); });
    worker.on('exit', () => { if (workerState !== 'unavailable') workerState = 'idle'; worker = null; for (const p of pending.values()) p.rej(new Error('argos worker exited')); pending.clear(); });
    worker.stderr.on('data', () => {});
    worker.stdout.on('data', (d) => {
      buf += d; let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i); buf = buf.slice(i + 1);
        let m; try { m = JSON.parse(line); } catch { continue; }
        if (m.ready) { workerState = 'ready'; continue; }
        const p = pending.get(m.id); if (!p) continue; pending.delete(m.id);
        m.error ? p.rej(new Error(m.error)) : p.res(m.text);
      }
    });
  }
  const translate = (text) => new Promise((res, rej) => {
    startWorker(); if (!worker) return rej(new Error('argos unavailable'));
    const id = nextId++; pending.set(id, { res, rej });
    worker.stdin.write(JSON.stringify({ id, text }) + '\n');
    setTimeout(() => { if (pending.delete(id)) rej(new Error('translate timeout')); }, 60000);
  });
  const hasTesseract = () => spawnSync(tesseract, ['--version'], { encoding: 'utf8' }).status === 0;

  const server = createServer(async (req, res) => {
    const origin = req.headers.origin;
    const cors = origin && ORIGIN_OK.test(origin) ? { 'access-control-allow-origin': origin, vary: 'origin', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'GET,POST,OPTIONS' } : {};
    const send = (code, obj) => { res.writeHead(code, { 'content-type': 'application/json', ...cors }); res.end(JSON.stringify(obj)); };
    if (origin && !ORIGIN_OK.test(origin)) return send(403, { error: 'origin not allowed' });
    if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
    try {
      const path = new URL(req.url, 'http://x').pathname;
      if (req.method === 'GET' && path === '/health') return send(200, { ok: true, tesseract: hasTesseract(), argos: workerState });
      if (req.method === 'POST' && path === '/translate') {
        const { text } = JSON.parse((await readBody(req)).toString('utf8') || '{}');
        if (typeof text !== 'string' || !text.trim() || text.length > 2000) return send(400, { error: 'text (1-2000 chars) required' });
        try { return send(200, { text: await translate(text), engine: 'argos-translate he-en 1.5 (local, machine translation)' }); }
        catch (e) { return send(503, { error: `translation unavailable: ${e.message}` }); }
      }
      if (req.method === 'POST' && path === '/ocr') {
        const body = await readBody(req); if (!body.length) return send(400, { error: 'image bytes required' });
        const dir = mkdtempSync(join(tmpdir(), 'alef-ocr-')); const f = join(dir, 'in.img');
        try {
          writeFileSync(f, body);
          const r = spawnSync(tesseract, [f, 'stdout', '-l', 'heb', '--psm', '6', '-c', 'tessedit_create_tsv=1'], { encoding: 'utf8', maxBuffer: 1 << 26 });
          if (r.status !== 0) return send(503, { error: `tesseract failed: ${String(r.stderr).slice(0, 200)}` });
          return send(200, { boxes: parseTsv(r.stdout), engine: 'tesseract-cli heb psm6' });
        } finally { rmSync(dir, { recursive: true, force: true }); }
      }
      return send(404, { error: 'not found' });
    } catch (e) { return send(e.code === 413 ? 413 : 500, { error: String(e.message || e) }); }
  });
  server.stopWorker = () => { if (worker) worker.kill(); };
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 8787);
  const s = createOcrServer();
  s.listen(port, '127.0.0.1', () => console.log(`Aleph local OCR/translate helper on http://127.0.0.1:${port}/ (health: /health)`));
  process.on('SIGINT', () => { s.stopWorker(); process.exit(0); });
}
