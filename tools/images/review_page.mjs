#!/usr/bin/env node
// Local review page: one self-contained HTML file (data/images/review/index.html, git-ignored) listing every ingested image
// with its flags (OCR text hit, aspect substituted, wrong backdrop, weak text hit) and Approve / Reject / Redo buttons.
// It runs from file://, keeps your clicks in this browser, and downloads:
//   approvals.json  the full state in the schema of data/images/approvals.json (copy it over that file only if you want to replace it)
//   decisions.json  only your changes, {"approve":[],"reject":[],"reset":[]}: the form `ingest.mjs apply-decisions` reads (this is the supported route;
//                   it also refreshes provenance and generated-manifest.json). Add --force when you approved images that carry a text flag.
//   redo-ids.txt    the ids you marked Redo (also recorded in approvals.json as rejected with note "redo")
// Nothing is approved unless you press a button; a text-flagged image asks for a second confirmation.
//   node tools/images/review_page.mjs                  write the page
//   node tools/images/review_page.mjs --folder DIR     also show returned block J / intermediate images in DIR that are not ingested yet (view only, no buttons:
//                                                      they can be approved after `ingest.mjs ingest DIR`)
// Ingested block J images appear like any other image; their alt text comes from the `alt` column of data/images/block-j.csv.
// Keys: j / k or arrows = next / previous, a = approve, x = reject, d = redo, u = clear, Enter = enlarge, f = cycle filter, e = export panel, ? = help.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BLOCKING_FLAGS, loadApprovals, loadProvenance, makePaths, writeTextAtomic } from './ingest_lib.mjs';
import { collectFlagged, FLAG_LABEL } from './build_redo.mjs';
import { loadBlockJ, blockJAlt } from './block_j_rows.mjs';
import { loadSlots } from './build_inter.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const OUT = join(ROOT, 'data/images/review/index.html');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const jsonForScript = (o) => JSON.stringify(o).replace(/</g, '\\u003c').replace(/[\u2028\u2029]/g, '');

// ---- pure state logic; the page embeds these functions' source, so the browser and the tests run the same code ----
/** Effective state of one image: a local change wins, else the stored approval ('redo' = rejected with note "redo"), else unapproved. */
export function stateOf(base, changes, id) {
  if (changes && Object.prototype.hasOwnProperty.call(changes, id)) return changes[id];
  const e = base.approvals && base.approvals[id];
  if (!e) return 'unapproved';
  return e.status === 'approved' ? 'approved' : e.note === 'redo' ? 'redo' : 'rejected';
}
/** Full approvals.json (same schema as data/images/approvals.json). Untouched entries are kept byte-for-byte; `blocking` maps id -> blocking flags. */
export function approvalsFromState(base, changes, blocking, now) {
  const approvals = {};
  for (const id of Object.keys(base.approvals || {})) approvals[id] = base.approvals[id];
  for (const id of Object.keys(changes || {})) {
    const s = changes[id];
    if (stateOf(base, null, id) === s) { continue; }
    if (s === 'unapproved') delete approvals[id];
    else if (s === 'approved') { const b = (blocking && blocking[id]) || []; approvals[id] = { status: 'approved', at: now, ...(b.length ? { forcedDespite: b } : {}) }; }
    else if (s === 'redo') approvals[id] = { status: 'rejected', at: now, note: 'redo' };
    else approvals[id] = { status: 'rejected', at: now };
  }
  return { version: 1, note: base.note, approvals: Object.fromEntries(Object.entries(approvals).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) };
}
/** Changes only, in the shape `ingest.mjs apply-decisions` reads. Redo counts as reject. */
export function decisionsFromState(base, changes) {
  const out = { approve: [], reject: [], reset: [] };
  for (const id of Object.keys(changes || {}).sort()) {
    const s = changes[id], was = stateOf(base, null, id);
    if (s === was) continue;
    if (s === 'approved') out.approve.push(id);
    else if (s === 'unapproved') out.reset.push(id);
    else if (was !== 'rejected' && was !== 'redo') out.reject.push(id);
    else if (was === 'redo' && s === 'rejected' || was === 'rejected' && s === 'redo') continue;
  }
  return out;
}
export function redoIds(base, changes, ids) { return ids.filter((id) => stateOf(base, changes, id) === 'redo').sort(); }

/** One record per ingested image for the page. */
export function collectEntries(root = ROOT, { folder = null, out = OUT } = {}) {
  const p = makePaths(root);
  const prov = loadProvenance(p), ap = loadApprovals(p);
  const reasons = new Map(collectFlagged(root).items.map((r) => [r.id, r]));
  const alt = existsSync(p.generated) ? (JSON.parse(readFileSync(p.generated, 'utf8')).altText ?? {}) : {};
  const notesPath = join(root, 'data/images/review-notes.json');
  const notes = existsSync(notesPath) ? (JSON.parse(readFileSync(notesPath, 'utf8')).notes ?? {}) : {};
  const jAlt = new Map(loadBlockJ(join(root, 'data/images/block-j.csv')).map((r) => [r.id, blockJAlt(r)]));
  const entries = Object.values(prov.images).sort((a, b) => a.command - b.command || a.id.localeCompare(b.id)).map((r) => {
    const f = reasons.get(r.id);
    const small = r.variants[0], big = r.variants[r.variants.length - 1];
    return {
      id: r.id, cmd: r.command, small: small.file, big: big.file, w: r.width, h: r.height, ew: r.expected?.w ?? r.width, eh: r.expected?.h ?? r.height,
      flags: r.flags ?? [], reasons: f ? f.reasons : [], seen: f?.sceneSeen ?? null, asked: f?.sceneExpected ?? null,
      redo: f ? `${f.redoFile} #${f.redoItem}` : null, ocr: (r.ocr?.blobs ?? []).map((b) => b.t),
      blocking: (r.flags ?? []).filter((x) => BLOCKING_FLAGS.includes(x)), alt: alt[r.id] ?? jAlt.get(r.id) ?? '', note: (notes[r.id]?.defects ?? []).join('; '),
      prompt: r.prompt.replace(/^STYLE GUIDE v1:.*?upper left\.\s*/, ''),
    };
  });
  const previews = folder ? previewEntries(folder, out, new Set(entries.map((e) => e.id)), jAlt, root) : [];
  return { entries, previews, base: ap };
}

/** Files in `folder` named like a block J row or an intermediate slot that are not ingested yet: shown view-only. */
export function previewEntries(folder, out, ingested, jAlt, root = ROOT) {
  const slotAlt = new Map(loadSlots(join(root, 'data/curriculum/intermediate-image-slots.json')).map((s) => [s.id, `Illustration: ${s.scene}`]));
  const dir = resolve(folder);
  const res = [];
  for (const f of readdirSync(dir).sort()) {
    const m = /^(.+)\.(png|webp|jpe?g)$/i.exec(f);
    if (!m || ingested.has(m[1])) continue;
    const alt = jAlt.get(m[1]) ?? slotAlt.get(m[1]);
    if (alt === undefined) continue;
    const rel = relative(dirname(out), join(dir, f)).split('\\').join('/');
    res.push({ id: m[1], rel, alt });
  }
  return res;
}

const CSS = `
:root{color-scheme:light}body{font:15px/1.4 system-ui,sans-serif;margin:0;background:#f6f1e7;color:#2b2b2b}
header{position:sticky;top:0;z-index:5;background:#1f3a5f;color:#fff;padding:.5rem 1rem;display:flex;gap:.8rem;flex-wrap:wrap;align-items:center}
header button,header select{font:inherit;border:0;border-radius:6px;padding:.35rem .7rem;background:#fff;color:#1f3a5f;cursor:pointer}
main{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:.8rem;padding:1rem}
.tile{background:#fff;border:4px solid #ccc;border-radius:10px;padding:.5rem;display:flex;flex-direction:column;gap:.3rem;scroll-margin-top:70px}
.tile.prev{border-style:dotted}.tile.cur{outline:4px solid #1f3a5f}.tile.approved{border-color:#6b7f3a}.tile.rejected{border-color:#b0373b}.tile.redo{border-color:#d9a441;border-style:dashed}
.tile img{width:100%;aspect-ratio:3/2;object-fit:contain;background:#eee;border-radius:6px;cursor:zoom-in}
.tile h3{margin:0;font-size:13px;word-break:break-all}.b{display:inline-block;border-radius:4px;padding:0 .4rem;font-size:12px;margin:0 .2rem .2rem 0;background:#ddd}
.b.t{background:#b0373b;color:#fff}.b.a{background:#d9a441}.b.w{background:#1f3a5f;color:#fff}.b.s{background:#eee}
.st{font-weight:700;font-size:13px}.btns{display:flex;gap:.3rem}.btns button{flex:1;border:1px solid #888;border-radius:6px;background:#fff;padding:.35rem;font:inherit;cursor:pointer}
.btns button:focus-visible,header button:focus-visible{outline:3px solid #d9a441}.btns .on.ok{background:#6b7f3a;color:#fff}.btns .on.no{background:#b0373b;color:#fff}.btns .on.rd{background:#d9a441}
.small{font-size:12px}details{font-size:12px}.hide{display:none}
#ov{position:fixed;inset:0;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;z-index:9}#ov img{max-width:96vw;max-height:92vh}
#panel,#help{position:fixed;right:1rem;top:4rem;z-index:8;background:#fff;border:2px solid #1f3a5f;border-radius:10px;padding:1rem;max-width:30rem;box-shadow:0 4px 20px #0005}
#panel button{margin:.2rem .2rem .2rem 0;font:inherit;padding:.4rem .7rem}
`;

// The page script. State/logic functions are injected from this module (see FUNCS) so tests exercise the same code.
const JS = `
const KEY='alef-review-v1';let changes=JSON.parse(localStorage.getItem(KEY)||'{}');
const tiles=[...document.querySelectorAll('.tile:not(.prev)')];let cur=0;
const FILTERS=['unapproved','flagged','text','aspect','backdrop','redo','approved','rejected','all'];
function eff(id){return stateOf(BASE,changes,id);}
function paint(){let n={approved:0,rejected:0,redo:0,unapproved:0};
 tiles.forEach(t=>{const id=t.dataset.id,s=eff(id);n[s]++;t.classList.remove('approved','rejected','redo');if(s!=='unapproved')t.classList.add(s);
  t.querySelector('.st').textContent=s==='unapproved'?'not decided':s==='redo'?'REDO (rejected)':s;
  t.querySelector('.ok').classList.toggle('on',s==='approved');t.querySelector('.no').classList.toggle('on',s==='rejected');t.querySelector('.rd').classList.toggle('on',s==='redo');
  t.querySelectorAll('button[data-act]').forEach(b=>b.setAttribute('aria-pressed',b.classList.contains('on')));});
 document.getElementById('count').textContent='approved '+n.approved+' | rejected '+n.rejected+' | redo '+n.redo+' | undecided '+n.unapproved;filter();}
function filter(){const f=document.getElementById('filter').value;let first=null;
 tiles.forEach(t=>{const id=t.dataset.id,s=eff(id),r=(t.dataset.reasons||'').split(' ');
  const show=f==='all'||(f==='unapproved'&&s==='unapproved')||(f==='flagged'&&t.dataset.reasons)||(f==='text'&&r.includes('text'))||(f==='aspect'&&r.includes('aspect'))||(f==='backdrop'&&r.includes('backdrop'))||f===s;
  t.classList.toggle('hide',!show);if(show&&!first)first=t;});
 const vis=tiles.filter(t=>!t.classList.contains('hide'));if(vis.length&&!vis.includes(tiles[cur]))select(tiles.indexOf(vis[0]));document.getElementById('shown').textContent=vis.length+' shown';}
function select(i){tiles[cur]&&tiles[cur].classList.remove('cur');cur=i;const t=tiles[cur];if(!t)return;t.classList.add('cur');t.scrollIntoView({block:'nearest'});}
function move(d){let i=cur;for(let k=0;k<tiles.length;k++){i=(i+d+tiles.length)%tiles.length;if(!tiles[i].classList.contains('hide')){select(i);return;}}}
function setState(id,s){if(s==='approved'){const b=BLOCK[id]||[];if(b.length&&eff(id)!=='approved'&&!confirm(id+' was flagged '+b.join(', ')+' by the text check. Approve only if you zoomed in and there is no text. Approve anyway?'))return;}
 if(eff(id)===s)s='unapproved';changes[id]=s;if(stateOf(BASE,null,id)===s)delete changes[id];localStorage.setItem(KEY,JSON.stringify(changes));paint();}
function act(k){const t=tiles[cur];if(!t||t.classList.contains('hide'))return;setState(t.dataset.id,{ok:'approved',no:'rejected',rd:'redo',cl:'unapproved'}[k]);}
document.addEventListener('click',e=>{const b=e.target.closest('button[data-act]');if(b){const t=b.closest('.tile');select(tiles.indexOf(t));act(b.dataset.act);return;}
 const im=e.target.closest('.tile img');if(im)zoom(im.closest('.tile'));if(e.target.id==='ov')closeZoom();});
function zoom(t){const o=document.getElementById('ov');o.innerHTML='<img alt="">';o.firstChild.src=t.dataset.big;o.firstChild.alt=t.dataset.alt;o.classList.remove('hide');}
function closeZoom(){document.getElementById('ov').classList.add('hide');}
function dl(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.appendChild(a);a.click();a.remove();}
function exportPanel(){document.getElementById('panel').classList.toggle('hide');}
document.getElementById('dl-app').onclick=()=>dl('approvals.json',JSON.stringify(approvalsFromState(BASE,changes,BLOCK,new Date().toISOString()),null,1)+'\\n','application/json');
document.getElementById('dl-dec').onclick=()=>dl('decisions.json',JSON.stringify(decisionsFromState(BASE,changes),null,1)+'\\n','application/json');
document.getElementById('dl-redo').onclick=()=>dl('redo-ids.txt',redoIds(BASE,changes,IDS).join('\\n')+'\\n','text/plain');
document.getElementById('reset-local').onclick=()=>{if(confirm('Forget all clicks made in this browser?')){changes={};localStorage.removeItem(KEY);paint();}};
document.getElementById('filter').onchange=filter;
document.addEventListener('keydown',e=>{if((e.target.matches&&e.target.matches('select,input,textarea'))||e.ctrlKey||e.metaKey||e.altKey)return;const k=e.key;
 if(k==='Escape'){closeZoom();document.getElementById('help').classList.add('hide');document.getElementById('panel').classList.add('hide');return;}
 if(!document.getElementById('ov').classList.contains('hide')&&k!=='Enter')return;
 if(k==='j'||k==='ArrowRight'||k==='ArrowDown'){e.preventDefault();move(1);}else if(k==='k'||k==='ArrowLeft'||k==='ArrowUp'){e.preventDefault();move(-1);}
 else if(k==='a')act('ok');else if(k==='x')act('no');else if(k==='d')act('rd');else if(k==='u')act('cl');
 else if(k==='Enter'||k===' '){e.preventDefault();const o=document.getElementById('ov');if(o.classList.contains('hide'))zoom(tiles[cur]);else closeZoom();}
 else if(k==='f'){const s=document.getElementById('filter');s.value=FILTERS[(FILTERS.indexOf(s.value)+1)%FILTERS.length];filter();}
 else if(k==='e')exportPanel();else if(k==='?')document.getElementById('help').classList.toggle('hide');});
paint();select(tiles.findIndex(t=>!t.classList.contains('hide')));
`;
const FUNCS = [stateOf, approvalsFromState, decisionsFromState, redoIds].map((f) => f.toString()).join('\n');

function tile(e, i) {
  const lab = (r) => esc(FLAG_LABEL[r] ?? r);
  const badges = [
    ...e.reasons.map((r) => `<span class="b ${r === 'text' ? 't' : r === 'aspect' ? 'a' : 'w'}">${lab(r)}</span>`),
    ...(e.flags.includes('possible_text') ? ['<span class="b a">weak text hit</span>'] : []),
  ].join('');
  const seen = e.seen && e.asked && e.seen !== e.asked ? `<div class="small">backdrop seen ${esc(e.seen)}, asked ${esc(e.asked)}</div>` : '';
  const ocr = e.ocr.length ? `<div class="small">OCR saw: ${esc(e.ocr.join(' | '))}</div>` : '';
  const size = `${e.w}x${e.h}${e.w !== e.ew || e.h !== e.eh ? ` (asked ${e.ew}x${e.eh})` : ''}`;
  return `<div class="tile" data-id="${esc(e.id)}" data-reasons="${esc([...e.reasons, ...(e.flags.includes('possible_text') ? ['weak'] : [])].join(' '))}" data-big="../../../assets/img/gen/${esc(e.big)}" data-alt="${esc(e.alt || e.id)}">
<img loading="lazy" src="../../../assets/img/gen/${esc(e.small)}" alt="${esc(e.alt || e.id)}">
<h3>${esc(e.id)}</h3><div>${badges || '<span class="b s">no flags</span>'}</div><div class="small">${esc(size)} | command ${e.cmd}${e.redo ? ` | in ${esc(e.redo)}` : ''}</div>${seen}${ocr}
<div class="st" aria-live="polite"></div>
<div class="btns"><button class="ok" data-act="ok" aria-label="Approve ${esc(e.id)}" aria-pressed="false">Approve (a)</button><button class="no" data-act="no" aria-label="Reject ${esc(e.id)}" aria-pressed="false">Reject (x)</button><button class="rd" data-act="rd" aria-label="Redo ${esc(e.id)}" aria-pressed="false">Redo (d)</button></div>
<details><summary>prompt and notes</summary><p class="small">${esc(e.prompt)}</p>${e.note ? `<p class="small">Matcher notes: ${esc(e.note)}</p>` : ''}</details></div>`;
}

function previewTile(e) {
  return `<div class="tile prev" data-id="${esc(e.id)}" data-reasons="" data-big="${esc(e.rel)}" data-alt="${esc(e.alt)}"><img loading="lazy" src="${esc(e.rel)}" alt="${esc(e.alt)}"><h3>${esc(e.id)}</h3><div><span class="b s">not ingested yet</span></div><div class="small">${esc(e.alt)}</div><div class="small">View only. Ingest the folder, then approve it here.</div></div>`;
}

export function pageHtml({ entries, base, previews = [] }) {
  const block = Object.fromEntries(entries.filter((e) => e.blocking.length).map((e) => [e.id, e.blocking]));
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Image review</title><style>${CSS}</style></head><body>
<header><strong>Image review</strong><span id="count" role="status"></span><span id="shown"></span>
<label>Show <select id="filter"><option value="unapproved">undecided</option><option value="flagged">any flag</option><option value="text">text hit</option><option value="aspect">aspect substituted</option><option value="backdrop">wrong backdrop</option><option value="redo">redo</option><option value="approved">approved</option><option value="rejected">rejected</option><option value="all">all</option></select></label>
<button id="export-btn" onclick="exportPanel()">Export (e)</button><button onclick="document.getElementById('help').classList.toggle('hide')">Keys (?)</button></header>
<div id="help" class="hide" role="dialog" aria-label="Keyboard help"><b>Keys</b><br>j / k or arrow keys: next / previous image<br>a approve, x reject, d redo, u clear<br>Enter or space: enlarge (again to close)<br>f: next filter, e: export, Esc: close<br>Approving an image the text check flagged asks you to confirm.</div>
<div id="panel" class="hide" role="dialog" aria-label="Export"><b>Export</b><p class="small">Your clicks live only in this browser until you export. Preferred route: download <code>decisions.json</code>, then run <code>node tools/images/ingest.mjs apply-decisions decisions.json --force</code> (the flag only matters for images you approved despite a text flag). <code>approvals.json</code> is the full state in the repository schema.</p>
<button id="dl-dec">Download decisions.json</button><button id="dl-app">Download approvals.json</button><button id="dl-redo">Download redo-ids.txt</button><button id="reset-local">Forget local clicks</button></div>
<main>${entries.map(tile).join('\n')}${previews.map(previewTile).join('\n')}</main><div id="ov" class="hide" role="dialog" aria-label="Enlarged image"></div>
<script>const BASE=${jsonForScript(base)};const BLOCK=${jsonForScript(block)};const IDS=${jsonForScript(entries.map((e) => e.id))};
${FUNCS}
${JS}</script></body></html>`;
}

export function writePage(root = ROOT, out = OUT, opts = {}) {
  const data = collectEntries(root, { ...opts, out });
  writeTextAtomic(out, pageHtml(data));
  return { out, count: data.entries.length, previews: data.previews.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2); const fi = a.indexOf('--folder');
  const r = writePage(ROOT, OUT, { folder: fi >= 0 ? a[fi + 1] : null });
  console.log(`${r.count} images${r.previews ? ` + ${r.previews} not ingested yet (view only)` : ''} -> ${r.out}`);
}
