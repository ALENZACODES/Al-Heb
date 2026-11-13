// @ts-check
// Vowel marks on this device: the small pieces of screen other views use. Loaded lazily; nothing here is in the first install.
//   packRows(...)     one row per pack: what it does, its size before anything is fetched, a button, progress, a way to remove it.
//   marksControl(...) an "Add Vowel Marks" button that appears only when a pack is on the device and the text has bare words.
//   builtLine(...)    vowel marks made ahead of time for one of the app's own lines.
// Nothing is fetched until the learner presses a button. There is no timer and no background fetch.
import { h } from '../shell/ui.js';
import { canRunPacks, wantsMarks, addMarks, builtUnits, packInfo, getPack, dropPack, hasPack, megabytes, errorCode, PACK_NAMES, SOURCE_NOTE } from './service.js';
import { congregationOf } from '../pronunciation/forTradition.js';
import { PACKS_TITLE, PACKS_LEAD, PACK_LABEL, PACK_ABOUT, PACKS_NONE, PACK_NOT_YET, PACK_FAILED, PACK_REMOVED, PACK_BLOCKED, MARKS_BUTTON, MARKS_BUSY, MARKS_NOTE, MARKS_FAILED, NAME_NOTE, SOUNDS_LABEL, SOUNDS_LIKE_LABEL } from './copy.js';

/**
 * @param {{onChange?:()=>void, heading?:'h2'|'h3'}} [o]
 * @returns {HTMLElement}
 */
export function packRows(o = {}) {
  const note = h('p', { class: 'muted', role: 'status', 'aria-live': 'polite' });
  const box = h('section', { class: 'marks-packs', 'aria-label': PACKS_TITLE }, h(o.heading || 'h2', {}, PACKS_TITLE), h('p', {}, PACKS_LEAD));
  if (!canRunPacks()) { box.append(h('p', { class: 'muted' }, PACKS_NONE)); return box; }
  const list = h('div', { class: 'marks-pack-list' });
  box.append(list, note);
  for (const name of PACK_NAMES) {
    const size = h('span', { class: 'muted' }, '');
    const text = h('p', {}, h('strong', {}, PACK_LABEL[name]), `: ${PACK_ABOUT[name]} `, size);
    const bar = /** @type {HTMLProgressElement} */ (h('progress', { max: 100, value: 0, hidden: true, 'aria-label': `${PACK_LABEL[name]} pack download` }));
    /** @type {AbortController|null} */ let stop = null;
    const get = /** @type {HTMLButtonElement} */ (h('button', { type: 'button', class: 'btn secondary', 'data-marks-pack': name, hidden: true, onclick: () => onGet() }, `Get ${PACK_LABEL[name]}`));
    const drop = /** @type {HTMLButtonElement} */ (h('button', { type: 'button', class: 'btn secondary', hidden: true, onclick: () => onRemove() }, `Remove ${PACK_LABEL[name]} From This Device`));
    const paint = async () => {
      let st;
      try { st = await packInfo(name); } catch { size.textContent = PACK_NOT_YET; get.hidden = true; drop.hidden = !(await hasPack(name)); return; }
      const mb = megabytes(st.total);
      get.hidden = st.ready; drop.hidden = st.have === 0;
      if (st.ready) size.textContent = `${mb} MB, on this device.`;
      else if (st.have) { size.textContent = `${mb} MB, ${megabytes(st.have)} MB of it on this device.`; get.textContent = `Carry On Getting ${PACK_LABEL[name]} (${megabytes(st.missing)} MB Left)`; }
      else { size.textContent = `${mb} MB.`; get.textContent = `Get ${PACK_LABEL[name]} (${mb} MB)`; }
    };
    const onGet = async () => {
      if (stop) { stop.abort(); return; }
      note.textContent = '';
      stop = new AbortController(); const mine = stop;
      bar.hidden = false; bar.value = 0; get.textContent = 'Stop';
      try {
        await getPack(name, { signal: mine.signal, onProgress: (have, total) => { bar.value = Math.round((have / Math.max(total, 1)) * 100); } });
        note.textContent = `${PACK_LABEL[name]} is on this device.`;
      } catch (e) { note.textContent = mine.signal.aborted ? '' : (PACK_BLOCKED[errorCode(e)] || PACK_FAILED); }
      stop = null; bar.hidden = true;
      await paint(); o.onChange?.();
    };
    const onRemove = async () => { stop?.abort(); await dropPack(name); note.textContent = PACK_REMOVED; await paint(); o.onChange?.(); };
    list.append(h('div', { class: 'marks-pack-row' }, text, bar, h('div', { class: 'row' }, get, drop)));
    paint();
  }
  return box;
}

/**
 * A button that adds vowel marks to the text `getText()` returns and hands the result to `show`.
 * It stays hidden until a pack is on this device and the text has at least one bare Hebrew word.
 * @param {{getText:()=>string, show:(r:{text:string, name:boolean, phonemes:string|null, soundsLike:string|null, marked:boolean})=>void, settings?:any}} o
 * @returns {{el:HTMLElement, refresh:()=>Promise<void>}}
 */
export function marksControl(o) {
  const btn = /** @type {HTMLButtonElement} */ (h('button', { type: 'button', class: 'btn secondary marks-add', hidden: true, onclick: () => onAdd() }, MARKS_BUTTON));
  const note = h('p', { class: 'muted marks-note', role: 'status', 'aria-live': 'polite' });
  const el = h('div', { class: 'marks-control' }, btn, note);
  const refresh = async () => {
    note.textContent = '';
    let have = false;
    if (canRunPacks()) { try { have = (await hasPack('nikud')) || (await hasPack('phonemes')); } catch { have = false; } }
    btn.hidden = !(have && wantsMarks(o.getText()));
  };
  const onAdd = async () => {
    const text = o.getText();
    if (!wantsMarks(text)) return;
    btn.disabled = true; note.textContent = MARKS_BUSY;
    try {
      const r = await addMarks(text, { tradition: congregationOf(o.settings) });
      o.show(r);
      note.textContent = [r.name ? NAME_NOTE : '', r.marked ? MARKS_NOTE : (r.name ? '' : MARKS_FAILED)].filter(Boolean).join(' ');
      btn.hidden = r.marked;
    } catch { note.textContent = MARKS_FAILED; }
    btn.disabled = false;
  };
  return { el, refresh };
}

/** The sound lines of a result as ready-made paragraphs (none for a text that holds the divine Name). */
export function soundLines(r) {
  if (!r || r.name || !r.phonemes) return [];
  const out = [h('p', { class: 'marks-sounds' }, h('strong', {}, SOUNDS_LABEL), h('span', { lang: 'he-fonipa' }, r.phonemes))];
  if (r.soundsLike) out.push(h('p', { class: 'marks-sounds' }, h('strong', {}, SOUNDS_LIKE_LABEL), r.soundsLike));
  return out;
}

/** Vowel marks made ahead of time for one of the app's own lines (a small file per unit, fetched on first use), or null. */
export const builtLine = (unit, text) => builtUnits().line(unit, text);

/** What to show under a line whose marks came from a built file: a plain note when nobody has checked them, and the sound line. */
export function builtLines(hit) {
  if (!hit) return [];
  const out = [];
  if (SOURCE_NOTE[hit.s]) out.push(h('p', { class: 'muted marks-note' }, SOURCE_NOTE[hit.s]));
  if (hit.ph) out.push(h('p', { class: 'marks-sounds' }, h('strong', {}, SOUNDS_LABEL), h('span', { lang: 'he-fonipa' }, hit.ph)));
  return out;
}
