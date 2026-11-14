// /credits and /privacy views on a fake DOM. Checks logic and content against the data/source files, not browser rendering. Not legal advice.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { install, newRoot, all, El } from './wordtrace.fakedom.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const att = JSON.parse(read('data/legal/attributions.json'));
const doc = install();
// The shared fake DOM has no append()/replaceChildren(); add them here (strings become text nodes).
const toNode = (c) => (typeof c === 'string' ? doc.createTextNode(c) : c);
El.prototype.append = function (...k) { for (const c of k) this.appendChild(toNode(c)); };
El.prototype.replaceChildren = function (...k) { for (const c of [...this.childNodes]) this.removeChild(c); this.append(...k); };
const credits = await import('../src/shell/credits.view.js');
const privacy = await import('../src/shell/privacy.view.js');
const ctx = { t: (k) => k, attributions: att };
const text = (n) => n.textContent;

test('credits: every attribution id renders once, in a group section, with licence and status text', async () => {
  const root = newRoot(doc); await credits.mount(root, ctx);
  const rendered = all(root, (e) => e.getAttribute('data-credit-id'));
  assert.deepEqual(rendered.map((e) => e.getAttribute('data-credit-id')).sort(), att.entries.map((e) => e.id).sort());
  for (const e of att.entries) {
    const li = root.querySelector(`#credit-${e.id}`);
    assert.ok(li, e.id);
    assert.ok(text(li).includes(e.name), `${e.id} name`);
    assert.ok(text(li).includes(e.licence), `${e.id} licence`);
    assert.ok(text(li).includes('status:'), `${e.id} status`);
    assert.equal(li.getAttribute('data-status'), e.status);
  }
  assert.ok(all(root, (e) => e.tagName === 'H2').length >= 8);
});

test('credits: unverified rows carry an honest flag; links are https only; not-legal-advice is stated', async () => {
  const root = newRoot(doc); await credits.mount(root, ctx);
  for (const e of att.entries.filter((x) => x.status === 'unverified')) assert.match(text(root.querySelector(`#credit-${e.id}`)), /status: unverified/);
  for (const a of all(root, (n) => n.tagName === 'A' && n.getAttribute('href') && !n.getAttribute('href').startsWith('#'))) assert.match(a.getAttribute('href'), /^https:\/\//);
  assert.match(text(root), /not legal advice/i);
  const verified = att.entries.filter((x) => x.status === 'verified-primary').length;
  assert.ok(text(root).includes(`${verified} verified`));
});

test('credits: hebcal credit line is shown and exported for the calendar screens', async () => {
  const root = newRoot(doc); await credits.mount(root, ctx);
  assert.match(text(root.querySelector('#credit-hebcal-fixtures')), /Hebcal.*CC BY 4\.0/);
  assert.match(credits.hebcalCredit(att.entries), /Hebcal.*CC BY 4\.0/);
  assert.match(credits.hebcalCredit([]), /CC BY 4\.0/);
});

test('credits: loads via ctx.fetch, and shows an alert (not a blank page) if loading fails', async () => {
  const ok = newRoot(doc);
  await credits.mount(ok, { t: (k) => k, fetch: async () => ({ ok: true, json: async () => att }) });
  assert.equal(all(ok, (e) => e.getAttribute('data-credit-id')).length, att.entries.length);
  const bad = newRoot(doc);
  await credits.mount(bad, { t: (k) => k, fetch: async () => ({ ok: false, status: 404 }) });
  assert.ok(bad.querySelector('[role=alert]'));
  assert.equal(all(bad, (e) => e.getAttribute('data-credit-id')).length, 0);
});

test('credits: an entry in an unknown group still renders', async () => {
  const root = newRoot(doc);
  await credits.mount(root, { t: (k) => k, attributions: { entries: [...att.entries, { ...att.entries[0], id: 'zz-new', group: 'newgroup' }] } });
  assert.ok(root.querySelector('#credit-zz-new'));
});

test('about: links to /credits and /privacy and no longer carries its own source list', async () => {
  const about = await import('../src/shell/about.view.js');
  const root = newRoot(doc); about.mount(root, { t: (k) => k });
  const hrefs = all(root, (e) => e.tagName === 'A').map((a) => a.getAttribute('href'));
  assert.ok(hrefs.includes('#/credits') && hrefs.includes('#/privacy'));
  assert.ok(!/Tesseract\.js 7\.0\.0|Heebo/.test(text(root)));
});

test('privacy: renders every flow and every store key, with the not-legal-advice note', () => {
  const root = newRoot(doc); privacy.mount(root, { t: (k) => k });
  for (const f of privacy.FLOWS) assert.ok(root.querySelector(`#flow-${f.id}`), f.id);
  assert.equal(all(root, (e) => e.tagName === 'TR').length, privacy.STORE_KEYS.length + 1);
  assert.match(text(root), /not legal advice/i);
  assert.match(text(root), /Delete all my data/);
});

test('privacy: never claims "nothing leaves your device"; no third-party flow remains', () => {
  const root = newRoot(doc); privacy.mount(root, { t: (k) => k });
  assert.doesNotMatch(text(root), /nothing leaves your device|never leaves your device/i);
  assert.equal(root.querySelector('#flow-dicta'), null); // fix #16: the online vowel service was removed
  assert.equal(root.querySelector('#flow-own-site').getAttribute('data-sends-user-data'), 'false');
  assert.equal(root.querySelector('#flow-local-helper').getAttribute('data-sends-user-data'), 'false');
  assert.equal(root.querySelector('#flow-speech-recognition').getAttribute('data-sends-user-data'), 'true');
});

test('privacy facts match the source: no third-party vowel/vision fetch exists; CSP and push key as stated', () => {
  const web = read('src/photo/engines/web.js'); const idx = read('src/photo/engines/index.js'); const scan = read('src/photo/scan.view.js');
  // fix #16: the adapters are gone — no host, URL, factory or constant for them may remain in the file
  assert.doesNotMatch(web, /nakdan-u2-1a|vision\.googleapis|createVisionOcr|createNakdanVowelizer|NAKDAN_DEFAULT_URL|VISION_URL|nakdanRequest|parseNakdanResponse|visionRequest|visionResponseToBoxes/);
  assert.doesNotMatch(idx.replace(/\/\/.*$/gm, ''), /web\.js|createNakdanVowelizer|createVisionOcr|online/);
  assert.doesNotMatch(scan, /online:|Dicta|Nakdan|nakdan-u2-1a|vision\.googleapis/);
  assert.doesNotMatch(scan, /id: 'photo-online'|onlineBox/);
  assert.match(scan, /No online vowel service in this build/);
  const src = []; const walk = (d) => { for (const n of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) { const p = `${d}/${n.name}`; if (n.isDirectory()) walk(p); else if (n.name.endsWith('.js')) src.push(p); } };
  walk('src');
  // nothing in src/ imports the web adapters any more, and no shipped file names either blocked host
  assert.deepEqual(src.filter((p) => /web\.js['"]/.test(read(p)) && !p.startsWith('src/photo/engines/web')), []);
  for (const p of src) assert.doesNotMatch(read(p).replace(/\/\/.*$/gm, ''), /nakdan-u2-1a|vision\.googleapis|dicta\.org\.il/, p);
  // no analytics/beacons/cookies anywhere in the shipped source
  for (const p of src) assert.doesNotMatch(read(p).replace(/\/\/.*$/gm, ''), /sendBeacon|document\.cookie|gtag\(|analytics\.js|new WebSocket|new XMLHttpRequest/, p);
  const hd = read('_headers');
  assert.match(hd, /connect-src 'self' http:\/\/127\.0\.0\.1:\* http:\/\/localhost:\*/);
  assert.doesNotMatch(hd.split('\n').filter((l) => /Content-Security-Policy:/.test(l)).join(''), /dicta/);
  assert.match(hd, /microphone=\(self\)/); assert.doesNotMatch(hd, /microphone=\(\)/); assert.match(hd, /camera=\(self\)/); assert.match(hd, /payment=\(\)/);
  assert.match(read('src/shell/notify.js'), /VAPID_PUBLIC_KEY = ""/);
  assert.match(read('src/photo/engines/local-server.js'), /\['localhost', '127\.0\.0\.1', '\[::1\]'\]/);
});

test('privacy: every FLOWS file and STORE_KEYS source file exists and the key string appears in it', () => {
  for (const f of privacy.FLOWS) for (const p of f.files) assert.ok(fs.existsSync(path.join(ROOT, p)), p);
  for (const [k, , file] of privacy.STORE_KEYS) { assert.ok(fs.existsSync(path.join(ROOT, file)), file); assert.ok(read(file).includes(k), `${k} not found in ${file}`); }
  assert.equal(new Set(privacy.STORE_KEYS.map((r) => r[0])).size, privacy.STORE_KEYS.length);
});

test('privacy: every store key constant defined in src appears in the table', () => {
  const listed = new Set(privacy.STORE_KEYS.map((r) => r[0]));
  const found = new Set(); const walk = (d) => { for (const n of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) { const p = `${d}/${n.name}`; if (n.isDirectory()) walk(p); else if (n.name.endsWith('.js')) for (const m of read(p).matchAll(/(?:const|let) [A-Z_]*KEY[A-Z_]* = ['"]([^'"]+)['"]/g)) found.add(m[1]); } };
  walk('src');
  found.delete('congregation');
  const missing = [...found].filter((k) => !listed.has(k) && k !== '');
  assert.deepEqual(missing, [], 'store keys missing from the privacy table');
});

test('no assistant or vendor names in the files this lane owns', () => {
  const re = new RegExp(['\\u0063hatgpt','open'+'ai','\\u0063laude','anthro'+'pic','gem'+'ini','mid'+'journey','dall-?e','\\bAI\\b'].join('|'), 'i');
  for (const p of ['src/shell/about.view.js', 'src/shell/credits.view.js', 'src/shell/privacy.view.js', 'data/legal/attributions.json', 'docs/legal/CONTENT-LICENCE-AUDIT.md', 'docs/legal/DECISIONS-FOR-JOHN.md', 'docs/legal/ROUTES.md', 'tests/credits.test.js'])
    assert.doesNotMatch(p === 'tests/credits.test.js' ? '' : read(p), re, p);
});

test('privacy: scroll position is session-only, nothing uses IndexedDB or uploads recordings, mic stays in memory', () => {
  const src = []; const walk = (d) => { for (const n of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) { const p = `${d}/${n.name}`; if (n.isDirectory()) { if (n.name !== 'tools') walk(p); } else if (n.name.endsWith('.js')) src.push(p); } };
  walk('src');
  // one exception, named on the privacy page: the Speaking Studio voice journal keeps takes the learner chose to keep (CODER-100 G10)
  for (const p of src) assert.doesNotMatch(read(p).replace(/\/\/.*$/gm, ''), p === 'src/voice/journal.js' ? /document\.cookie/ : /indexedDB|document\.cookie/, p);
  assert.doesNotMatch(read('src/voice/journal.js').replace(/\/\/.*$/gm, ''), /fetch\(|sendBeacon|XMLHttpRequest|FormData|WebSocket/, 'the journal never sends anything');
  assert.match(read('src/shell/scroll-restore.js'), /g\.sessionStorage/);
  assert.doesNotMatch(read('src/shell/scroll-restore.js').replace(/\/\/.*$/gm, ''), /localStorage/);
  const scrollRow = privacy.STORE_KEYS.find((r) => r[0] === 'alef.scroll.v1');
  assert.match(scrollRow[1], /sessionStorage/);
  // the recorder and the record-and-compare screen never send anything: no network call, form post or beacon in them
  for (const p of ['src/recordcompare/recordcompare.view.js', 'src/recordcompare/model.js']) assert.doesNotMatch(read(p).replace(/\/\/.*$/gm, ''), /sendBeacon|XMLHttpRequest|FormData|WebSocket|localStorage/, p);
  const rec = read('src/speak/recognizer.js'); const body = rec.slice(rec.indexOf('export function createRecorder'), rec.indexOf('export function createSpeaker'));
  assert.doesNotMatch(body, /fetch\(|sendBeacon|XMLHttpRequest|FormData|Storage/);
  assert.match(body, /createObjectURL/); assert.match(body, /revokeObjectURL/);
  const root = newRoot(doc); privacy.mount(root, { t: (k) => k }); const t = text(root);
  assert.match(t, /Record and compare/); assert.match(t, /microphone=\(self\)/); assert.match(t, /sessionStorage/);
  assert.match(t, /IndexedDB .*for one thing only: the Speaking Studio voice journal/); assert.match(t, /Delete all my data removes them/);
});

test('credits: new practice screens carry the Sources line', () => {
  for (const p of ['src/roots/roots.view.js', 'src/genderdrill/genderdrill.view.js', 'src/nikkudfade/nikkudfade.view.js', 'src/recordcompare/recordcompare.view.js']) assert.match(read(p), /sourcesLine\(el\)/, p);
});
