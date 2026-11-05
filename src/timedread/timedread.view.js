// @ts-check
// Timed Read-Aloud (#/timedread): read a pointed line aloud while a timer runs, then say honestly which words tripped you.
// Self-assessed. The app keeps only the elapsed time. No speech recognition is used, no audio is recorded or sent.
// mount(root, ctx) -> unmount. ctx: { store, now?():number (ms clock, default performance.now), query?, settings? }
import { el, heText } from '../curriculum/dom.js';
import { loadProgressData } from '../progress/data.js';
import { readSnapshot, readableNow } from '../progress/model.js';
import { HONEST_NOTE, countWords, wordList, makeRead, rangeFor, describeRange, trickyWords, accuracy, wpm, seconds, speechSupport } from './model.js';
import { loadState, saveRead, clearReads } from './store.js';
import { isAudioFree } from '../shell/audiofree.js';
import { calmOn } from '../shell/comfort.js';

export const CSS = `
.tdr { display: grid; gap: 1rem; } .tdr * { min-inline-size: 0; overflow-wrap: anywhere; }
.tdr section { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: .75rem 1rem; }
.tdr h2 { font-size: 1.15rem; margin-block: 0 .5rem; }
.tdr select, .tdr .btn { min-block-size: var(--tap, 48px); font: inherit; max-inline-size: 100%; }
.tdr select { inline-size: 100%; }
.tdr-line { font-size: 1.9rem; line-height: 1.9; display: flex; flex-wrap: wrap; gap: .25rem .6rem; unicode-bidi: isolate; }
.tdr-w { font: inherit; background: transparent; color: inherit; border: 2px solid var(--border); border-radius: 8px; min-inline-size: var(--tap, 48px); min-block-size: var(--tap, 48px); padding: 0 .4rem; cursor: pointer; }
.tdr-w[aria-pressed="true"] { border-color: var(--focus, currentColor); border-style: dashed; background: var(--card); text-decoration: underline wavy; }
.tdr-plain { font-size: 1.9rem; line-height: 1.9; unicode-bidi: isolate; }
.tdr-clock { font-size: 2.2rem; font-weight: 700; font-variant-numeric: tabular-nums; }
.tdr-row { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; }
.tdr-note { font-size: .9rem; } .tdr-exp { font-size: .85rem; font-style: italic; }
.tdr table { border-collapse: collapse; inline-size: 100%; } .tdr th, .tdr td { text-align: start; padding: .25rem .4rem; border-bottom: 1px solid var(--border); }
`;
function ensureCss() { if (typeof document !== 'undefined' && document.head && !document.getElementById?.('alef-tdr-style')) document.head.append(el('style', { id: 'alef-tdr-style' }, CSS)); }

const clock = (ms) => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const pct = (x) => `${Math.round(x * 100)}%`;
const f1 = (x) => String(Math.round(x));

export async function mount(root, ctx = /** @type {any} */ ({})) {
  let alive = true, timer = null;
  const store = ctx.store;
  const nowMs = typeof ctx.now === 'function' ? ctx.now : () => (globalThis.performance?.now?.() ?? Date.now());
  const wall = () => Date.now();
  ensureCss();
  const title = el('h1', { id: 'view-title', tabindex: '-1' }, 'Timed read-aloud');
  const status = el('p', { class: 'tdr-note', role: 'status', 'aria-live': 'polite' });
  const body = el('div', { class: 'tdr' });
  root.replaceChildren(title, status, body);
  status.textContent = 'Loading lines you can read now...';

  let d;
  try { d = await loadProgressData(); } catch { d = null; }
  if (!alive) return () => {};
  if (!d) { status.textContent = 'The reading data could not load. Nothing was lost; try again later.'; return () => { alive = false; }; }
  const read = readableNow(readSnapshot(store), d);
  /** Lines the learner can fully decode, plus whole texts made only of such lines. */
  const lines = read.linesFull.map((l) => ({ id: l.id, label: `${l.title}${l.n > 1 || read.linesFull.filter((x) => x.entryId === l.entryId).length > 1 ? `, line ${l.n}` : ''}`, he: l.he }));
  const whole = d.registry.filter((e) => read.entriesFull.includes(e.id) && String(e.he).includes('\n')).map((e) => ({ id: e.id, label: `${e.title ?? e.id} (whole text)`, he: String(e.he).split('\n').map((x) => x.trim()).filter(Boolean).join(' ') }));
  const items = [...lines, ...whole].map((i) => ({ ...i, words: countWords(i.he) }));
  status.textContent = '';

  /** @type {{phase:'pick'|'ready'|'running'|'mark'|'done', item:any, startedAt:number, ms:number, marked:Set<number>, lastRead:any}} */
  const S = { phase: 'pick', item: items.find((i) => i.id === ctx.query?.line) || null, startedAt: 0, ms: 0, marked: new Set(), lastRead: null };
  if (S.item) S.phase = 'ready';
  const say = (m) => { status.textContent = m; };
  const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
  const focusTitle = () => title.focus?.();

  function pickSection() {
    if (!items.length) return el('section', {}, el('h2', {}, 'Choose a line'), el('p', {}, 'No line is fully readable for you yet. Keep going with the lessons; this check unlocks when you can decode at least one whole line.'), el('a', { class: 'btn', href: '#/learn' }, 'Back to lessons'));
    const sel = el('select', { id: 'tdr-pick' }, el('option', { value: '' }, 'Choose a line...'), ...items.map((i) => el('option', { value: i.id, selected: S.item?.id === i.id ? '' : null }, `${i.label} - ${i.words} words`)));
    sel.addEventListener('change', () => { S.item = items.find((i) => i.id === sel.value) || null; S.phase = S.item ? 'ready' : 'pick'; render(); });
    return el('section', {}, el('h2', {}, 'Choose a line'), el('label', { for: 'tdr-pick' }, 'Only lines you can fully decode are listed. Short lines give a rough speed; longer ones are steadier.'), sel);
  }

  function rangeSection(item) {
    const st = loadState(store);
    const r = rangeFor(st, item.id, 5);
    if (!r) return el('section', {}, el('h2', {}, 'Your reads of this line'), el('p', {}, 'No reads yet. Your first one sets a starting point, not a grade.'));
    const hard = trickyWords(st, item.id, 3), words = wordList(item.he);
    return el('section', { 'aria-labelledby': 'tdr-rng' },
      el('h2', { id: 'tdr-rng' }, 'Your reads of this line'),
      el('p', { class: 'tdr-range' }, describeRange(r)),
      el('p', {}, `Seconds: ${r.seconds.min === r.seconds.max ? r.seconds.min : `${r.seconds.min} to ${r.seconds.max}`}. Words a minute (counting words you stumbled on): ${f1(r.wpm.min)} to ${f1(r.wpm.max)}.`),
      hard.length ? el('p', {}, 'Words that tripped you most: ', ...hard.flatMap((h, i) => [i ? ', ' : '', heText(words[h.idx] ?? '', 'tdr-hard'), ` (${h.count}x)`])) : null,
      el('p', { class: 'tdr-note' }, 'Different lines have different difficulty, so reads of different lines are never mixed.'));
  }

  function mainSection() {
    const it = S.item;
    if (!it) return null;
    if (S.phase === 'ready') {
      return el('section', { 'aria-labelledby': 'tdr-ln' }, el('h2', { id: 'tdr-ln', tabindex: '-1' }, it.label),
        el('p', { class: 'tdr-plain', lang: 'he', dir: 'rtl' }, it.he),
        el('p', {}, `${it.words} words. ${isAudioFree(ctx) ? 'Read it once through in the way you normally read (aloud, or not), then press Stop.' : 'Read it once through in your normal voice, aloud, then press Stop.'} Press Start when you are ready; there is no pass or fail.`),
        el('div', { class: 'tdr-row' }, el('button', { type: 'button', class: 'btn', id: 'tdr-start', onclick: start }, 'Start timer')));
    }
    if (S.phase === 'running') {
      return el('section', { 'aria-labelledby': 'tdr-ln' }, el('h2', { id: 'tdr-ln', tabindex: '-1' }, 'Reading...'),
        el('p', { class: 'tdr-plain', lang: 'he', dir: 'rtl' }, it.he),
        el('p', { class: 'tdr-clock', 'aria-hidden': 'true', id: 'tdr-clock', hidden: calmOn(ctx) ? '' : null }, '0:00'),
        el('div', { class: 'tdr-row' }, el('button', { type: 'button', class: 'btn', id: 'tdr-stop', onclick: stopRead }, 'Stop - I finished'), el('button', { type: 'button', class: 'btn', id: 'tdr-cancel', onclick: cancel }, 'Cancel, do not save')));
    }
    if (S.phase === 'mark') {
      const ws = wordList(it.he);
      const wbtns = ws.map((w, i) => {
        const b = el('button', { type: 'button', class: 'tdr-w', lang: 'he', dir: 'rtl', 'aria-pressed': S.marked.has(i) ? 'true' : 'false', 'aria-label': `Word ${i + 1} of ${ws.length}: ${w}. Press if you stumbled or skipped it.` }, w);
        b.addEventListener('click', () => { S.marked.has(i) ? S.marked.delete(i) : S.marked.add(i); b.setAttribute('aria-pressed', S.marked.has(i) ? 'true' : 'false'); count.textContent = countText(); });
        return b;
      });
      const countText = () => `${S.marked.size} of ${ws.length} words marked as stumbled or skipped.`;
      const count = el('p', { id: 'tdr-count', role: 'status', 'aria-live': 'polite' }, countText());
      return el('section', { 'aria-labelledby': 'tdr-ln' }, el('h2', { id: 'tdr-ln', tabindex: '-1' }, `Done in ${(S.ms / 1000).toFixed(1)} seconds`),
        el('p', {}, 'Be honest with yourself, nobody else sees this. Tap every word you stumbled on, skipped or had to sound out again. Tap again to undo.'),
        el('div', { class: 'tdr-line', lang: 'he', dir: 'rtl' }, ...wbtns), count,
        el('div', { class: 'tdr-row' },
          el('button', { type: 'button', class: 'btn', id: 'tdr-all', onclick: () => { S.marked.clear(); save(); } }, 'I read it all'),
          el('button', { type: 'button', class: 'btn', id: 'tdr-save', onclick: save }, 'Save with my marked words'),
          el('button', { type: 'button', class: 'btn', id: 'tdr-discard', onclick: cancel }, 'Do not save')));
    }
    if (S.phase === 'done' && S.lastRead) {
      const r = S.lastRead;
      return el('section', { 'aria-labelledby': 'tdr-ln' }, el('h2', { id: 'tdr-ln', tabindex: '-1' }, 'Saved'),
        el('p', {}, `${seconds(r)} seconds, ${f1(wpm(r))} words a minute, ${r.stumbled} of ${r.words} words stumbled on (${pct(accuracy(r))} without a stumble). Self-reported.`),
        el('div', { class: 'tdr-row' }, el('button', { type: 'button', class: 'btn', id: 'tdr-again', onclick: () => { S.phase = 'ready'; render(); } }, 'Read this line again'), el('button', { type: 'button', class: 'btn', id: 'tdr-other', onclick: () => { S.item = null; S.phase = 'pick'; render(); } }, 'Choose another line')));
    }
    return null;
  }

  function start() {
    S.startedAt = nowMs(); S.phase = 'running'; S.marked = new Set(); render();
    const c = body.querySelector?.('#tdr-clock');
    if (!calmOn(ctx)) { timer = setInterval(() => { if (c) c.textContent = clock(nowMs() - S.startedAt); }, 250); timer.unref?.(); } // calm mode: the time is still measured, but no running clock is shown
    say(isAudioFree(ctx) ? 'Timer started. Read the line, then press Stop.' : 'Timer started. Read aloud, then press Stop.');
    body.querySelector?.('#tdr-stop')?.focus?.();
  }
  function stopRead() { stop(); S.ms = nowMs() - S.startedAt; S.phase = 'mark'; render(); say(`Stopped at ${(S.ms / 1000).toFixed(1)} seconds. Now mark any words you stumbled on.`); body.querySelector?.('#tdr-all')?.focus?.(); }
  function cancel() { stop(); S.phase = S.item ? 'ready' : 'pick'; render(); say('Not saved.'); }
  function save() {
    const out = makeRead({ textId: S.item.id, lineId: S.item.id, he: S.item.he, ms: S.ms, stumbled: [...S.marked], at: wall() });
    if (out.error) { S.phase = 'ready'; render(); say(`Not saved: ${out.error}.`); return; }
    try { saveRead(store, out.read); } catch { S.phase = 'ready'; render(); say('Not saved: the device would not store it.'); return; }
    S.lastRead = out.read; S.phase = 'done'; render(); say('Saved on this device.');
    body.querySelector?.('#tdr-ln')?.focus?.();
  }

  function render() {
    const sp = speechSupport(globalThis);
    const total = loadState(store).reads.length;
    const kids = [
      el('section', {}, el('p', { class: 'tdr-note' }, HONEST_NOTE), el('p', { class: 'tdr-note' }, 'There is no ranking and no single fluency score. Speed varies with the day, the line and your voice; ranges are more honest than one number.')),
      S.phase === 'pick' || !S.item ? pickSection() : null,
      mainSection(),
      S.item && (S.phase === 'ready' || S.phase === 'done') ? rangeSection(S.item) : null,
      el('section', {}, el('h2', {}, 'About speech recognition'), el('p', { class: 'tdr-note', id: 'tdr-asr' }, sp.note), el('p', { class: 'tdr-exp' }, 'An automatic word check could be added as an experiment, off by default. It is not part of this version.')),
      total ? el('section', {}, el('h2', {}, 'Your data'), el('p', { class: 'tdr-note' }, `${total} timed read${total === 1 ? '' : 's'} stored on this device only, in your normal backup.`), el('button', { type: 'button', class: 'btn', id: 'tdr-clear', onclick: () => { if (typeof globalThis.confirm !== 'function' || globalThis.confirm('Delete all your timed reads from this device?')) { clearReads(store); render(); say('Timed reads deleted.'); } } }, 'Delete my timed reads')) : null,
    ];
    body.replaceChildren(...kids.filter(Boolean));
  }
  render();
  return () => { alive = false; stop(); };
}
