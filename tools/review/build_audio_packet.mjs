#!/usr/bin/env node
// Builds the audio listening packet for native-speaker review of the synthetic clips.
//
//   node tools/review/build_audio_packet.mjs                      writes docs/review/audio-packet/listen.html and listen-sheet.csv
//   node tools/review/build_audio_packet.mjs --zip FILE.zip       ALSO writes a send-ready zip: page + sheet + guide + the clips
//   node tools/review/build_audio_packet.mjs --check              exits 1 if the committed page/sheet are not what would be built now
//
// Options: --tradition israeli|sephardi|ashkenazi  --voice m|f  (only that slice; needed when the same ids exist for several traditions or voices)  --root DIR (repo, default this checkout)  --audio DIR (folder holding m/ and f/, default <root>/audio)
//          --out DIR (default <root>/docs/review/audio-packet)  --audio-href PREFIX (how the page reaches the clips;
//          default: the relative path from --out to --audio, so the page works in place inside the repo)
//
// The page is one self-contained HTML file: no network, no libraries, no copy of any mp3. Zero dependencies (Node only).
// In the zip the page looks for the clips in ./audio/ next to it. The mp3s are never copied into docs/.
//
// Which clips: every entry of the audio manifest with status synthetic-unreviewed whose file exists in --audio.
// Building this packet changes no status. Nothing is approved by listening to, sending or returning it; see
// docs/review/audio-packet/REVIEWER-GUIDE.md and tools/review/import_audio_review.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { toCsv } from './lib/csv.mjs';
import {
  collectClips, VERDICTS, ISSUES, ACCENTS, SHEET_COLUMNS,
} from './audio_packet_lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(HERE, '../..');

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const urlPath = (p) => p.split('/').map(encodeURIComponent).join('/');

/** The listening sheet: one row per clip, reviewer columns empty. */
export function buildSheetCsv(clips) {
  return toCsv(SHEET_COLUMNS, clips.map((c) => ({ id: c.id, hebrew: c.hebrew, gloss: c.gloss, tradition: c.tradition, file: c.file, clip_sha256: c.sha256 })));
}

/** Short id of this set of clips, so answers saved in a browser for an older packet are never restored into a newer one. */
export const packetId = (clips) => createHash('sha256').update(clips.map((c) => `${c.id}:${c.sha256}`).join('\n')).digest('hex').slice(0, 12);

// ---- the part of the page script that does not touch the DOM; tests run it on its own in a sandbox ----
const CORE_JS = `
var AlefCore = (function () {
  var COLUMNS = ${JSON.stringify(SHEET_COLUMNS)};
  function csvEscape(v) {
    var s = v == null ? '' : String(v);
    return /[",\\r\\n]/.test(s) || /^\\s|\\s$/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function buildCsv(rows) {
    var lines = [COLUMNS.map(csvEscape).join(',')];
    rows.forEach(function (r) { lines.push(COLUMNS.map(function (c) { return csvEscape(r[c]); }).join(',')); });
    return '\\uFEFF' + lines.join('\\r\\n') + '\\r\\n';
  }
  function progress(rows) {
    var n = 0; rows.forEach(function (r) { if (r.verdict) n++; });
    return { marked: n, total: rows.length };
  }
  return { COLUMNS: COLUMNS, csvEscape: csvEscape, buildCsv: buildCsv, progress: progress };
})();
`;

const PAGE_JS = `
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var PACKET = document.body.getAttribute('data-packet');
  var KEY = 'alef-audio-review/' + PACKET;
  var clips = $$('.clip');
  function store(fn) { try { return fn(window.localStorage); } catch (e) { return null; } }

  function readRow(el) {
    var d = el.dataset, picked = $('input[type=radio]:checked', el);
    var issues = $$('input[name^="i-"]:checked', el).map(function (x) { return x.value; }).join(';');
    return {
      id: d.id, hebrew: d.hebrew, gloss: d.gloss, tradition: d.tradition, file: d.file, clip_sha256: d.sha,
      verdict: picked ? picked.value : '', issues: issues, accent_heard: $('select', el).value,
      note: $('textarea', el).value.replace(/\\s+/g, ' ').trim(),
      reviewer_name: $('#r-name').value.trim(), reviewer_role: $('#r-role').value, review_date: $('#r-date').value
    };
  }
  function allRows() { return clips.map(readRow); }

  function status(msg) { $('#status').textContent = msg; }
  function refresh() {
    var p = AlefCore.progress(allRows());
    status(p.marked + ' of ' + p.total + ' clips marked.');
    clips.forEach(function (el) {
      var done = !!$('input[type=radio]:checked', el);
      el.classList.toggle('done', done);
      el.hidden = $('#only-unmarked').checked && done;
    });
  }
  function save() {
    var snap = { head: { n: $('#r-name').value, r: $('#r-role').value, d: $('#r-date').value }, clips: {} };
    clips.forEach(function (el) {
      var row = readRow(el);
      if (row.verdict || row.issues || row.accent_heard || row.note) snap.clips[row.id] = { v: row.verdict, i: row.issues, a: row.accent_heard, n: $('textarea', el).value };
    });
    store(function (ls) { ls.setItem(KEY, JSON.stringify(snap)); });
  }
  function restore() {
    var raw = store(function (ls) { return ls.getItem(KEY); });
    if (!raw) return false;
    var snap; try { snap = JSON.parse(raw); } catch (e) { return false; }
    $('#r-name').value = snap.head.n || ''; $('#r-role').value = snap.head.r || ''; $('#r-date').value = snap.head.d || '';
    clips.forEach(function (el) {
      var s = snap.clips[el.dataset.id]; if (!s) return;
      if (s.v) { var r = $('input[type=radio][value="' + s.v + '"]', el); if (r) r.checked = true; }
      (s.i || '').split(';').forEach(function (v) { if (v) { var c = $('input[name^="i-"][value="' + v + '"]', el); if (c) c.checked = true; } });
      $('select', el).value = s.a || ''; $('textarea', el).value = s.n || '';
    });
    return true;
  }

  document.addEventListener('change', function () { save(); refresh(); });
  document.addEventListener('input', function (e) { if (e.target.tagName === 'TEXTAREA' || e.target.id === 'r-name') save(); });

  // one clip at a time; a clip that cannot load says so next to its player
  document.addEventListener('play', function (e) {
    $$('audio').forEach(function (a) { if (a !== e.target) a.pause(); });
  }, true);
  document.addEventListener('error', function (e) {
    if (!e.target || e.target.tagName !== 'AUDIO') return;
    var m = $('.audio-error', e.target.closest('.clip'));
    if (m) m.hidden = false;
  }, true);

  $('#only-unmarked').addEventListener('change', refresh);
  $('#export').addEventListener('click', function () {
    var name = $('#r-name').value.trim(), date = $('#r-date').value;
    if (!name || !date) {
      status('Please fill in your name and the date at the top first. They go into the file so the owner knows who listened.');
      $(!name ? '#r-name' : '#r-date').focus();
      return;
    }
    var rows = allRows(), csv = AlefCore.buildCsv(rows), p = AlefCore.progress(rows);
    var box = $('#fallback'); $('#csv-text').value = csv; box.hidden = false;
    try {
      var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' }), a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'alef-audio-review-' + date + '.csv';
      document.body.appendChild(a); a.click(); a.remove();
      status('Saved ' + a.download + ' (' + p.marked + ' of ' + p.total + ' clips marked). Please send that file back. If nothing downloaded, copy the text from the box below.');
    } catch (err) {
      status('Your browser did not start a download. Copy the text from the box below into a plain text file ending in .csv and send that.');
    }
  });
  $('#copy').addEventListener('click', function () {
    var t = $('#csv-text'); t.focus(); t.select();
    try { document.execCommand('copy'); status('Copied.'); } catch (e) { status('Select the text and copy it by hand.'); }
  });
  $('#clear').addEventListener('click', function () {
    if (!window.confirm('Clear every answer on this page and the copy saved in this browser?')) return;
    store(function (ls) { ls.removeItem(KEY); });
    window.location.reload();
  });

  if (!restore()) { $('#r-date').value = new Date().toISOString().slice(0, 10); }
  else status('Your earlier answers on this computer were restored.');
  refresh();
})();
`;

const CSS = `
:root { color-scheme: light dark; --bg:#fff; --fg:#1a1a1a; --mute:#4a4a4a; --line:#8a8a8a; --card:#f6f6f3; --accent:#0b57a4; --ok:#0b6b2e; --warn:#8a3b00; }
@media (prefers-color-scheme: dark) { :root { --bg:#161616; --fg:#f2f2f2; --mute:#c4c4c4; --line:#8c8c8c; --card:#212121; --accent:#8cc2ff; --ok:#7fdc9c; --warn:#ffb27a; } }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--fg); font: 1.05rem/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
main { max-width: 46rem; margin: 0 auto; padding: 1rem 1rem 4rem; }
h1 { font-size: 1.6rem; margin: .5rem 0; } h2 { font-size: 1.1rem; margin: 0 0 .5rem; }
a { color: var(--accent); }
.skip { position: absolute; left: -999px; } .skip:focus { left: 1rem; top: 1rem; background: var(--bg); padding: .5rem; z-index: 5; }
.banner { border: 2px solid var(--warn); border-radius: .5rem; padding: .75rem 1rem; margin: 1rem 0; }
.who, .bar { display: grid; gap: .75rem; margin: 1rem 0; }
.who { grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr)); }
label { display: block; font-weight: 600; } input[type=text], input[type=date], select, textarea { width: 100%; font: inherit; padding: .4rem; border: 2px solid var(--line); border-radius: .35rem; background: var(--bg); color: var(--fg); }
button { font: inherit; padding: .6rem 1rem; border: 2px solid var(--accent); border-radius: .4rem; background: var(--accent); color: var(--bg); cursor: pointer; }
button.quiet { background: transparent; color: var(--accent); }
:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
.clip { background: var(--card); border: 1px solid var(--line); border-radius: .6rem; padding: 1rem; margin: 1rem 0; }
.clip.done { border-left: 8px solid var(--ok); }
.idtag { font: .85rem ui-monospace, monospace; color: var(--mute); margin-inline-start: .5rem; }
.he { font-family: "SBL Hebrew", "Ezra SIL", "Noto Serif Hebrew", "Frank Ruehl CLM", "David", serif; font-size: 2.6rem; line-height: 1.5; margin: .25rem 0; text-align: right; }
.gloss, .trad { margin: .1rem 0; color: var(--mute); }
audio { width: 100%; margin: .6rem 0; }
fieldset { border: 1px solid var(--line); border-radius: .4rem; margin: .5rem 0; padding: .5rem .75rem; }
legend { font-weight: 600; padding: 0 .25rem; }
.opt { display: flex; align-items: flex-start; gap: .5rem; font-weight: 400; margin: .25rem 0; min-height: 2rem; }
.opt input { width: 1.4rem; height: 1.4rem; margin-top: .15rem; flex: none; }
.opt small { display: block; color: var(--mute); }
details summary { cursor: pointer; padding: .4rem 0; font-weight: 600; }
.audio-error { color: var(--warn); font-weight: 600; }
#csv-text { font: .85rem ui-monospace, monospace; min-height: 8rem; direction: ltr; }
[hidden] { display: none !important; }
@media print { .bar, .who button, audio { display: none; } }
`;

/** The listening page. `audioHref` is the folder (relative to the page) that holds m/ and f/. */
export function buildPage(clips, audioHref) {
  const n = clips.length;
  const base = audioHref.replace(/\\/g, '/').replace(/\/+$/, '');
  const card = (c, i) => {
    const src = `${base}/${urlPath(c.rel)}`;
    const name = `Clip ${i + 1} of ${n}`;
    const radios = VERDICTS.map((v) => `<label class="opt"><input type="radio" name="v-${esc(c.id)}" value="${v.value}"><span>${esc(v.label)}<small>${esc(v.hint)}</small></span></label>`).join('');
    const issues = ISSUES.map((x) => `<label class="opt"><input type="checkbox" name="i-${esc(c.id)}" value="${x.value}"><span>${esc(x.label)}</span></label>`).join('');
    const acc = ACCENTS.map((a) => `<option value="${a.value}">${esc(a.label)}</option>`).join('');
    return `<section class="clip" id="c-${esc(c.id)}" aria-labelledby="h-${esc(c.id)}" data-id="${esc(c.id)}" data-hebrew="${esc(c.hebrew)}" data-gloss="${esc(c.gloss)}" data-tradition="${esc(c.tradition)}" data-file="${esc(c.file)}" data-sha="${c.sha256}">
<h2 id="h-${esc(c.id)}">${name} <span class="idtag">(${esc(c.id)})</span></h2>
<p class="he" lang="he" dir="rtl">${esc(c.hebrew)}</p>
${c.gloss ? `<p class="gloss">Meaning: ${esc(c.gloss)}</p>` : '<p class="gloss">Meaning: (none in the repo data)</p>'}
<p class="trad">Labelled for the ${esc(c.tradition)} tradition. Nobody has verified that the voice sounds like it.</p>
<audio controls preload="none" src="${esc(src)}" aria-label="${esc(name)}: audio for ${esc(c.id)}">Your browser cannot play this clip. The file is ${esc(src)}.</audio>
<p class="audio-error" role="alert" hidden>This clip did not load. Keep the audio folder next to this page, in the same place as it was in the zip.</p>
<fieldset><legend>Your verdict for ${esc(name.toLowerCase())}</legend>${radios}</fieldset>
<details><summary>Details for this clip (what was wrong, accent you hear, a note)</summary>
<fieldset><legend>What was wrong (tick any)</legend>${issues}</fieldset>
<label for="a-${esc(c.id)}">Accent you hear (only if you can tell)</label>
<select id="a-${esc(c.id)}">${acc}</select>
<label for="n-${esc(c.id)}">Note (optional; for Reject or Approve with note, say what you heard)</label>
<textarea id="n-${esc(c.id)}" rows="2"></textarea>
</details>
</section>`;
  };
  const roles = ['', 'Native Hebrew speaker', 'Cantor or clergy', 'Hebrew teacher', 'Other'].map((r) => `<option value="${esc(r)}">${r ? esc(r) : 'Choose...'}</option>`).join('');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Listening review: ${n} synthetic Hebrew clips</title>
<style>${CSS}</style>
</head>
<body data-packet="${packetId(clips)}">
<a class="skip" href="#export">Skip to the export button</a>
<main>
<h1>Listening review: ${n} short Hebrew clips</h1>
<div class="banner" role="note"><strong>These clips are a computer-made voice, not a person.</strong> Nobody has approved any of them. Your answers are advice to the owner; a clip is only treated as approved once the owner records it. Read the one-page guide (REVIEWER-GUIDE.md) if you have not.</div>
<p>For each clip: look at the pointed Hebrew, press play, listen as often as you like, then choose one verdict. You may skip clips you cannot judge. This page works without internet; your answers stay on this computer until you export them.</p>
<div class="who">
<div><label for="r-name">Your name</label><input type="text" id="r-name" autocomplete="name"></div>
<div><label for="r-role">Who you are</label><select id="r-role">${roles}</select></div>
<div><label for="r-date">Date</label><input type="date" id="r-date"></div>
</div>
<div class="bar">
<p id="status" role="status" aria-live="polite">0 of ${n} clips marked.</p>
<label class="opt"><input type="checkbox" id="only-unmarked"><span>Show only clips I have not marked yet</span></label>
</div>
${clips.map(card).join('\n')}
<h2>Finished?</h2>
<div class="bar">
<button type="button" id="export">Export my answers (CSV file)</button>
<button type="button" class="quiet" id="clear">Clear all answers</button>
</div>
<div id="fallback" hidden>
<label for="csv-text">If no file was saved, copy this text into a plain text file that ends in .csv</label>
<textarea id="csv-text" readonly></textarea>
<button type="button" class="quiet" id="copy">Select and copy</button>
</div>
</main>
<script id="core">${CORE_JS}</script>
<script id="page">${PAGE_JS}</script>
</body>
</html>
`;
}

// ---- zip writer (stored, no compression: mp3 does not shrink); enough for a send-ready folder ----
const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
export function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

/** files: [{name, data: Buffer}] -> Buffer of a zip archive. Fixed timestamp, so the same input gives the same bytes. */
export function buildZip(files) {
  const DOS_TIME = 0, DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;
  const parts = [], central = [];
  let offset = 0;
  for (const f of files) {
    const name = Buffer.from(f.name, 'utf8'), crc = crc32(f.data);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(0, 8);
    lh.writeUInt16LE(DOS_TIME, 10); lh.writeUInt16LE(DOS_DATE, 12); lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(f.data.length, 18); lh.writeUInt32LE(f.data.length, 22); lh.writeUInt16LE(name.length, 26); lh.writeUInt16LE(0, 28);
    parts.push(lh, name, f.data);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(0, 10);
    ch.writeUInt16LE(DOS_TIME, 12); ch.writeUInt16LE(DOS_DATE, 14); ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(f.data.length, 20); ch.writeUInt32LE(f.data.length, 24); ch.writeUInt16LE(name.length, 28);
    ch.writeUInt32LE(0, 38); ch.writeUInt32LE(offset, 42);
    central.push(ch, name);
    offset += 30 + name.length + f.data.length;
  }
  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, cd, end]);
}

export const ZIP_DIR = 'alef-audio-review';

/** The files of the send-ready zip. The page there reaches the clips at ./audio/. */
export function zipFiles(clips, guideText) {
  const files = [
    { name: `${ZIP_DIR}/START-HERE.txt`, data: Buffer.from('Open listen.html in a web browser (double-click it). Read REVIEWER-GUIDE.md first if you can. Keep the audio folder next to listen.html.\r\nlisten-sheet.csv is the same list for a spreadsheet; you only need one of the two ways to answer.\r\n', 'utf8') },
    { name: `${ZIP_DIR}/REVIEWER-GUIDE.md`, data: Buffer.from(guideText, 'utf8') },
    { name: `${ZIP_DIR}/listen-sheet.csv`, data: Buffer.from(buildSheetCsv(clips), 'utf8') },
    { name: `${ZIP_DIR}/listen.html`, data: Buffer.from(buildPage(clips, 'audio'), 'utf8') },
  ];
  return files;
}

export function main(argv = process.argv.slice(2)) {
  const opt = { root: DEFAULT_ROOT, audio: null, out: null, href: null, zip: null, check: false, tradition: null, voice: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], next = () => { if (i + 1 >= argv.length) throw new Error(`${a} needs a value`); return argv[++i]; };
    if (a === '--root') opt.root = path.resolve(next());
    else if (a === '--audio') opt.audio = path.resolve(next());
    else if (a === '--out') opt.out = path.resolve(next());
    else if (a === '--audio-href') opt.href = next();
    else if (a === '--zip') opt.zip = path.resolve(next());
    else if (a === '--check') opt.check = true;
    else if (a === '--tradition') opt.tradition = next();
    else if (a === '--voice') opt.voice = next();
    else throw new Error(`unknown option ${a}`);
  }
  const audio = opt.audio || path.join(opt.root, 'audio');
  const out = opt.out || path.join(opt.root, 'docs/review/audio-packet');
  const href = opt.href || (path.relative(out, audio).split(path.sep).join('/') || '.');
  const { clips, missing, glossMissing } = collectClips(opt.root, audio, { tradition: opt.tradition, voice: opt.voice });
  if (!clips.length) throw new Error(`no synthetic-unreviewed clips with a file under ${audio}`);
  const page = buildPage(clips, href), sheet = buildSheetCsv(clips);
  const report = [`${clips.length} clips in the packet`];
  if (missing.length) report.push(`${missing.length} manifest entries have no file under ${audio} and were left out: ${missing.join(', ')}`);
  if (glossMissing.length) report.push(`${glossMissing.length} clips have no gloss in the repo data (shown as "none in the repo data"): ${glossMissing.join(', ')}`);

  if (opt.check) {
    // git may store the csv with LF line endings (.gitattributes text=auto), so compare ignoring CR
    const lf = (t) => t.replace(/\r\n/g, '\n');
    const same = (f, want) => fs.existsSync(f) && lf(fs.readFileSync(f, 'utf8')) === lf(want);
    const ok = same(path.join(out, 'listen.html'), page) && same(path.join(out, 'listen-sheet.csv'), sheet);
    console.log(ok ? 'audio packet files are current' : 'audio packet files are OUT OF DATE: run node tools/review/build_audio_packet.mjs');
    return ok ? 0 : 1;
  }
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'listen.html'), page);
  fs.writeFileSync(path.join(out, 'listen-sheet.csv'), sheet);
  report.push(`wrote ${path.join(out, 'listen.html')} (clips at ${href}/) and listen-sheet.csv`);
  if (opt.zip) {
    const guide = path.join(out, 'REVIEWER-GUIDE.md');
    if (!fs.existsSync(guide)) throw new Error(`${guide} not found: the zip carries the guide`);
    const files = zipFiles(clips, fs.readFileSync(guide, 'utf8'));
    for (const c of clips) files.push({ name: `${ZIP_DIR}/audio/${c.rel}`, data: fs.readFileSync(path.join(audio, ...c.rel.split('/'))) });
    fs.mkdirSync(path.dirname(opt.zip), { recursive: true });
    fs.writeFileSync(opt.zip, buildZip(files));
    report.push(`wrote ${opt.zip} (${files.length} files, ${(fs.statSync(opt.zip).size / 1024).toFixed(0)} KiB)`);
  }
  console.log(report.join('\n'));
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { process.exitCode = main(); } catch (e) { console.error(e.message); process.exitCode = 2; }
}
