// @ts-check
// Letter check for the tracing screens. Fetched the first time a tracing screen opens (never part of the first install).
// When the learner has the letter-check pack on this device, a drawing is read as a whole and the learner is told which
// letter it looks like and one thing to fix. It is a hint only: it never changes a score, and when it is not sure it says nothing.
// The pack is fetched only when the learner asks for it, and its size is shown first.
import * as pack from './pack.js';
import { HANDWRITING } from './tools.js';

let apiPromise = null;      // the loaded checker, shared by every screen
const FAMILY = ['yod', 'vav', 'nun-final'];

/** Load the checker if the pack is on this device; resolves to null when it is not. Never starts a download. */
export async function loadChecker(env = {}) {
  if (apiPromise) return apiPromise;
  const p = (async () => {
    const list = await pack.loadList(env);
    if (!(await pack.state(list, env)).ready) return null;
    const mod = await (env.importer || ((u) => import(u)))(HANDWRITING + 'index.js');
    const model = await pack.readFile(list, mod.MODEL_FILE, env);
    const manifest = JSON.parse(new TextDecoder().decode(await pack.readFile(list, mod.MODEL_INFO, env)));
    return mod.load({ model, manifest });
  })();
  apiPromise = p;
  const api = await p.catch(() => null);
  if (!api) apiPromise = null;
  return api;
}
export function forgetChecker() { apiPromise = null; }

/** Heights of the three long-and-thin letters' own models, so a drawing's height can tell them apart. */
export function familyHeights(letters, script) {
  const out = {};
  for (const id of FAMILY) {
    const L = (letters || []).find((l) => l.id === id); const strokes = L && L[script] && L[script].strokes;
    if (!strokes || !strokes.length) continue;
    let y0 = Infinity, y1 = -Infinity;
    for (const s of strokes) for (const p of s.median) { if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
    out[id] = y1 - y0;
  }
  return out;
}

/**
 * What to add to the feedback line, or '' for nothing. `done` is true when the tracer has just accepted the whole letter.
 * @param {any} api @param {{strokes:number[][][], letter:any, script:'print'|'cursive', letters:any[], done?:boolean}} o
 */
export async function hintFor(api, { strokes, letter, script, letters, done = false }) {
  const drawn = (strokes || []).filter((s) => s && s.length >= 2);
  if (!api || !drawn.length || !letter) return '';
  const block = letter[script] || {};
  const r = await api.checkStrokes(drawn, { targetId: letter.id, script, strokeWidth: block.strokeWidth || (script === 'print' ? 85 : 55), heights: familyHeights(letters, script) });
  if (r.verdict === 'looks-like' || r.verdict === 'close') return r.text;
  if (r.verdict === 'not-a-letter' && !done) return r.text;
  return '';
}

/**
 * Add the letter-check row to a tracing screen.
 * @param {{host: HTMLElement, h: Function, t?: Function, letters: any[], env?: object}} o
 * @returns {{check: (o: {strokes:number[][][], letter:any, script:'print'|'cursive', fb:HTMLElement, done?:boolean}) => Promise<void>, ready: Promise<void>}}
 */
export function attach({ host, h, t = (k, f) => f, letters, env = {} }) {
  const row = h('div', { class: 'handcheck muted', 'data-handcheck': 'row' });
  host.appendChild(row);
  let api = null; let list = null;
  const show = (...kids) => row.replaceChildren(...kids);
  const showReady = () => show(
    h('span', {}, t('hand.on', 'Letter check is on. ')),
    h('button', { type: 'button', 'data-act': 'hand-remove', onclick: async () => { await pack.remove(env); forgetChecker(); api = null; await offer(); } }, t('hand.remove', 'Remove it from this device')));
  const offer = async () => {
    if (!list) { show(); return; }
    const mb = pack.megabytes(pack.totalBytes(list));
    const status = h('span', { role: 'status', 'aria-live': 'polite' });
    const btn = h('button', { type: 'button', 'data-act': 'hand-get', onclick: async () => {
      btn.setAttribute('disabled', '');
      try {
        await pack.download(list, { ...env, onProgress: (have, total) => { status.textContent = ' ' + Math.round((have / total) * 100) + '%'; } });
        api = await loadChecker(env);
        if (api) showReady(); else { status.textContent = ' ' + t('hand.failed', 'That did not work. Please try again.'); btn.removeAttribute('disabled'); }
      } catch { status.textContent = ' ' + t('hand.failed', 'That did not work. Please try again.'); btn.removeAttribute('disabled'); }
    } }, t('hand.get', 'Get the letter check') + ` (${mb} MB)`);
    show(h('details', {},
      h('summary', {}, t('hand.title', 'Letter check')),
      h('p', {}, t('hand.what', 'After you draw a letter, this tells you which letter it looks like and one thing to fix. It is kept on this device and works with no connection.')),
      h('p', {}, btn, status)));
  };
  const ready = (async () => {
    try { list = await pack.loadList(env); } catch { show(); return; }
    api = await loadChecker(env);
    if (api) showReady(); else await offer();
  })();
  return {
    ready,
    async check({ strokes, letter, script, fb, done = false }) {
      if (!api || !fb) return;
      const before = fb.textContent;
      let text = ''; try { text = await hintFor(api, { strokes, letter, script, letters, done }); } catch { text = ''; }
      if (text && fb.textContent === before) fb.textContent = before + ' ' + text;       // the learner has not moved on in the meantime
    },
  };
}
