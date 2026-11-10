// Contact sheets: one self-contained HTML grid per block (A..G) so the author can approve / reject ~800 images quickly.
// The page cannot write files; decisions are kept in the browser (localStorage) and exported as JSON, which is applied with
//   node tools/images/ingest.mjs apply-decisions decisions.json
// Everything interpolated into HTML is escaped; data is embedded as JSON with "<" escaped.

import { join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { BLOCKS, loadApprovals, loadManifest, loadProvenance, makePaths, writeTextAtomic } from './ingest_lib.mjs';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const jsonForScript = (o) => JSON.stringify(o).replace(/</g, '\\u003c').replace(/[\u2028\u2029]/g, '');

const CSS = `
body{font:14px/1.4 system-ui,sans-serif;margin:0;background:#f6f1e7;color:#2b2b2b}
header{position:sticky;top:0;z-index:5;background:#1f3a5f;color:#fff;padding:.5rem 1rem;display:flex;gap:1rem;flex-wrap:wrap;align-items:center}
header a,header button,header select{color:#1f3a5f;background:#fff;border:0;border-radius:6px;padding:.3rem .7rem;font:inherit;cursor:pointer;text-decoration:none}
main{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:.8rem;padding:1rem}
.tile{background:#fff;border:3px solid #ccc;border-radius:10px;padding:.5rem;display:flex;flex-direction:column;gap:.35rem}
.tile img{width:100%;aspect-ratio:1/1;object-fit:contain;background:repeating-conic-gradient(#eee 0 25%,#fff 0 50%) 0 0/16px 16px;border-radius:6px}
.tile.approved{border-color:#6b7f3a}.tile.rejected{border-color:#b0373b;opacity:.65}.tile.flag{box-shadow:0 0 0 3px #d9a441}
.tile.missing{border-style:dashed;color:#777}.tile h3{margin:0;font-size:12px;word-break:break-all}
.badge{display:inline-block;background:#d9a441;border-radius:4px;padding:0 .35rem;font-size:11px;margin-right:.2rem}.badge.bad{background:#b0373b;color:#fff}
.note{font-size:12px;background:#fbf3dc;border-radius:6px;padding:.3rem .4rem}.note b{color:#8a1f23}.note ul{margin:.2rem 0 0 1rem;padding:0}
.btns{display:flex;gap:.4rem}.btns button{flex:1;border:1px solid #888;border-radius:6px;background:#fff;padding:.3rem;cursor:pointer;font:inherit}
.btns .ok.on{background:#6b7f3a;color:#fff}.btns .no.on{background:#b0373b;color:#fff}
details{font-size:12px}details p{margin:.3rem 0;white-space:pre-wrap}
textarea{width:100%;height:8rem}.hide{display:none}
`;

const JS = `
const KEY='alef-image-decisions-v1';
let local=JSON.parse(localStorage.getItem(KEY)||'{}');
const stateOf=id=>local[id]??BASE[id]??'unapproved';
function paint(){document.querySelectorAll('.tile[data-id]').forEach(t=>{const s=stateOf(t.dataset.id);t.classList.toggle('approved',s==='approved');t.classList.toggle('rejected',s==='rejected');t.querySelectorAll('.ok').forEach(b=>b.classList.toggle('on',s==='approved'));t.querySelectorAll('.no').forEach(b=>b.classList.toggle('on',s==='rejected'));});
 const n={approved:0,rejected:0};for(const t of document.querySelectorAll('.tile[data-id]')){const s=stateOf(t.dataset.id);if(n[s]!==undefined)n[s]++;}
 document.getElementById('count').textContent='approved '+n.approved+' / rejected '+n.rejected+' (this block)';applyFilter();}
function set(id,s){if(stateOf(id)===s)s='unapproved';local[id]=s;localStorage.setItem(KEY,JSON.stringify(local));paint();}
document.addEventListener('click',e=>{const b=e.target.closest('button[data-act]');if(!b)return;set(b.closest('.tile').dataset.id,b.dataset.act==='ok'?'approved':'rejected');});
function applyFilter(){const f=document.getElementById('filter').value;document.querySelectorAll('.tile[data-id]').forEach(t=>{const s=stateOf(t.dataset.id);const fl=t.classList.contains('flag');const ms=t.classList.contains('missing');
 t.classList.toggle('hide',!(f==='all'||(f==='unapproved'&&!ms&&s==='unapproved')||(f==='flagged'&&fl)||(f==='rejected'&&s==='rejected')||(f==='missing'&&ms)));});}
document.getElementById('filter').onchange=applyFilter;
document.getElementById('export').onclick=()=>{const out={approve:[],reject:[],reset:[]};for(const [id,s] of Object.entries(local)){const base=BASE[id]??'unapproved';if(s===base)continue;if(s==='approved')out.approve.push(id);else if(s==='rejected')out.reject.push(id);else out.reset.push(id);}
 const ta=document.getElementById('out');ta.value=JSON.stringify(out,null,1);ta.classList.remove('hide');ta.select();try{navigator.clipboard.writeText(ta.value).catch(()=>{});}catch(e){}};
paint();
`;

/** Matcher / eye-check notes (data/images/review-notes.json), shown so the reviewer sees the known defects per image. */
function noteBlock(n, rec) {
  if (!n) return '';
  const items = (n.defects ?? []).map((d) => `<li>${esc(d)}</li>`).join('');
  const scene = n.sceneSeen && n.sceneExpected && n.sceneSeen !== n.sceneExpected ? `<div><b>Wrong backdrop:</b> ${esc(n.sceneSeen)} (prompt asked ${esc(n.sceneExpected)})</div>` : '';
  const ocrFlag = rec.flags.includes('contains_text') ? `<div><b>OCR flagged text</b> (the eye check found none; zoom in; Approve is skipped on apply unless you use --force)</div>` : '';
  return `<div class="note"><div>Matcher: ${esc(n.confidence)} confidence${n.matchNote ? ` (${esc(n.matchNote)})` : ''}</div>${scene}${items ? `<ul>${items}</ul>` : '<div>No known defects.</div>'}<div>Text in image: ${esc(n.textInImage ?? 'not checked')}</div>${ocrFlag}</div>`;
}

function tile(row, rec, state, note) {
  if (!rec) return `<div class="tile missing" data-miss="1"><h3>${esc(row.stem)}</h3><div>not generated yet (${row.width}x${row.height})</div><details><summary>prompt</summary><p>${esc(row.prompt)}</p></details></div>`;
  const flags = rec.flags.map((f) => `<span class="badge${['contains_text', 'aspect_mismatch_allowed'].includes(f) ? ' bad' : ''}">${esc(f)}</span>`).join('');
  const hit = rec.ocr?.blobs?.length ? `<div>OCR saw: ${esc(rec.ocr.blobs.map((b) => b.t).join(' | '))}</div>` : '';
  const big = rec.variants[rec.variants.length - 1];
  const small = rec.variants[0];
  const cls = ['tile', state === 'approved' ? 'approved' : state === 'rejected' ? 'rejected' : '', rec.flags.some((f) => ['contains_text', 'possible_text', 'aspect_mismatch_allowed', 'not_transparent', 'low_resolution', 'unexpected_transparency'].includes(f)) ? 'flag' : ''].join(' ');
  return `<div class="${cls}" data-id="${esc(row.stem)}"><a href="../../../assets/img/gen/${esc(big.file)}" target="_blank" rel="noopener"><img loading="lazy" src="../../../assets/img/gen/${esc(small.file)}" alt="${esc(row.stem)}"></a>
<h3>${esc(row.stem)}</h3><div>${rec.width}x${rec.height} (asked ${row.width}x${row.height}) ${flags}</div>${hit}${noteBlock(note, rec)}
<div class="btns"><button class="ok" data-act="ok" title="approve">Approve</button><button class="no" data-act="no" title="reject">Reject</button></div>
<details><summary>prompt #${row.command}</summary><p>${esc(row.prompt)}</p></details></div>`;
}

export function sheetHtml(block, rows, prov, approvals, notes = {}) {
  const base = {};
  const tiles = rows.map((r) => { const st = approvals.approvals[r.stem]?.status ?? 'unapproved'; if (prov.images[r.stem]) base[r.stem] = st; return tile(r, prov.images[r.stem], st, notes[r.stem]); }).join('\n');
  const have = rows.filter((r) => prov.images[r.stem]).length;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Block ${esc(block)} contact sheet</title><style>${CSS}</style></head><body>
<header><a href="index.html">All blocks</a><strong>Block ${esc(block)}: ${have}/${rows.length} images</strong><span id="count"></span>
<label>Show <select id="filter"><option value="all">all</option><option value="unapproved" selected>unapproved</option><option value="flagged">flagged</option><option value="rejected">rejected</option><option value="missing">missing</option></select></label>
<button id="export">Export decisions</button></header>
<main>${tiles}</main><div style="padding:0 1rem 2rem"><p>Export, save the text as <code>decisions.json</code>, then run <code>node tools/images/ingest.mjs apply-decisions decisions.json</code>. Checks are yours: see docs/images/RIGHTS.md (consistency checklist). Decisions are stored only in this browser until applied.</p><textarea id="out" class="hide" readonly></textarea></div>
<script>const BASE=${jsonForScript(base)};${JS}</script></body></html>`;
}

export function writeSheets({ root, paths, blocks }) {
  const p = paths ?? makePaths(root);
  const rows = loadManifest(p.manifest); const prov = loadProvenance(p); const ap = loadApprovals(p);
  const notesPath = join(p.root, 'data/images/review-notes.json');
  const notes = existsSync(notesPath) ? (JSON.parse(readFileSync(notesPath, 'utf8')).notes ?? {}) : {};
  const files = []; const links = [];
  for (const b of blocks ?? BLOCKS) {
    const br = rows.filter((r) => r.block === b);
    if (!br.length) continue;
    const f = join(p.sheets, `block-${b}.html`);
    writeTextAtomic(f, sheetHtml(b, br, prov, ap, notes)); files.push(f);
    const have = br.filter((r) => prov.images[r.stem]).length;
    const ok = br.filter((r) => ap.approvals[r.stem]?.status === 'approved').length;
    links.push(`<li><a href="block-${esc(b)}.html">Block ${esc(b)}</a>: ${have}/${br.length} ingested, ${ok} approved</li>`);
  }
  const idx = join(p.sheets, 'index.html');
  writeTextAtomic(idx, `<!doctype html><meta charset="utf-8"><title>Image contact sheets</title><body style="font:16px system-ui;margin:2rem"><h1>Contact sheets</h1><ul>${links.join('')}</ul><p>State at generation time; regenerate with <code>node tools/images/ingest.mjs sheets</code>.</p>`);
  files.push(idx);
  return { files };
}
