// @ts-check
// Sound-gap lab: contrasts English speakers merge, with mouth cues, word pairs, and an American-synagogue
// versus Israeli versus Ashkenazi table for ten prayer words (lane 3).
//
//   mount(root, ctx) -> unmount
//
// Same ctx contract as sounds.view.js. Extra assumptions:
//   - ctx.soundgapData (optional) = { soundgap, prayerwords } parsed JSON, used by tests; otherwise fetched.
//   - Play buttons are the shared audio button: a file button when a clip exists, a labelled device-voice button when only a he-IL voice does, otherwise a one-line No audio yet. No recordings for these ids exist
//     yet, so today the view shows a "no audio yet" note instead of a button that would do nothing.
//   - The data is flagged proofread:false; the view shows that badge.

import { normalizeTradition, TRADITION_LABELS, TRADITIONS } from './sounds.model.js';
import { setCongregation } from './forTradition.js';
import { audioButton as sharedAudioButton } from '../shell/audio-access.js';

/** @param {typeof fetch} [fetchImpl] */
export async function loadSoundgapData(fetchImpl = globalThis.fetch) {
  const get = async (f) => {
    const res = await fetchImpl(new URL(`../../data/pronunciation/${f}.json`, import.meta.url));
    if (!res.ok) throw new Error(`could not load ${f}.json (${res.status})`);
    return res.json();
  };
  const [soundgap, prayerwords] = await Promise.all([get('soundgap'), get('prayerwords')]);
  return { soundgap, prayerwords };
}

/** Audio ids this view would ask for: soundgap-<gapId>-<n>-a / -b and prayer-<wordId>-<voice-tradition>. */
export const pairAudioId = (gapId, index, side) => `soundgap-${gapId}-${index}-${side}`;

/** Which tradition key of a gap record to show: the American-synagogue note for sephardi. */
export function gapNoteFor(gap, tradition) {
  const t = normalizeTradition(tradition);
  const base = gap.tradition[t];
  const am = t === 'sephardi' ? gap.tradition.american_synagogue : null;
  return { text: base.text, merged: base.merged, americanText: am ? am.text : '' };
}

/** Is a pair audibly different in this tradition? Homophones and minimal pairs both use heardIn. */
export function pairHeardIn(pair, tradition) {
  return pair.heardIn.includes(normalizeTradition(tradition));
}

const CSS = `
.alef-soundgap{font:16px/1.5 system-ui,sans-serif;max-width:60rem;margin:0 auto;padding:1rem}
.alef-soundgap h2,.alef-soundgap h3{margin:1.2em 0 .4em}
.alef-soundgap,.alef-soundgap *{box-sizing:border-box}
.alef-soundgap fieldset{min-width:0;border:1px solid var(--border,#888);border-radius:8px;padding:.5rem 1rem}
.alef-soundgap fieldset label{margin-inline-end:1.2rem;white-space:nowrap}
.alef-soundgap details{border:1px solid var(--border,#888)6;border-radius:8px;padding:.4rem .8rem;margin:.4rem 0}
.alef-soundgap .table-wrap{overflow-x:auto;max-width:100%}
.alef-soundgap table{border-collapse:collapse;min-width:30rem;width:100%}
.alef-soundgap th,.alef-soundgap td{border-bottom:1px solid var(--border,#888)6;padding:.3rem .5rem;text-align:start;vertical-align:top}
.alef-soundgap .he{font-size:1.5rem;unicode-bidi:isolate}
.alef-soundgap .badge{font-size:.8rem;border:1px solid currentColor;border-radius:4px;padding:0 .3rem;margin-inline-start:.4rem}
.alef-soundgap button{font:inherit;cursor:pointer}
.alef-soundgap button:focus-visible{outline:3px solid var(--focus,#1a5fb4);outline-offset:2px}
`;

/**
 * @param {HTMLElement} root
 * @param {any} ctx
 * @returns {() => void}
 */
export function mount(root, ctx = {}) {
  const doc = root.ownerDocument;
  let alive = true;
  /** @type {Array<() => void>} */
  const cleanups = [];
  /** @type {Array<() => void>} */
  const tradListeners = [];
  let tradition = normalizeTradition(ctx.settings?.congregation);
  const tr = (key, fallback) => {
    const v = typeof ctx.t === 'function' ? ctx.t(key) : undefined;
    return v && v !== key ? v : fallback;
  };
  const h = (tag, attrs = {}, ...kids) => {
    const el = doc.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === false || v == null) continue;
      el.setAttribute(k, v === true ? '' : String(v));
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      el.append(typeof kid === 'string' ? doc.createTextNode(kid) : kid);
    }
    return el;
  };
  const he = (text, cls = 'he') => h('span', { class: cls, dir: 'rtl', lang: 'he' }, text);

  root.replaceChildren();
  const wrap = h('section', { class: 'alef-soundgap', 'aria-labelledby': 'alef-soundgap-title' });
  root.append(h('style', {}, CSS), wrap);
  wrap.append(h('h2', { id: 'alef-soundgap-title' }, tr('soundgap.title', 'Sound-gap lab')), h('p', { role: 'status' }, tr('soundgap.loading', 'Loading...')));

  const setTradition = (t, fromSettings = false) => {
    const next = normalizeTradition(t);
    if (next === tradition && !fromSettings) return;
    tradition = next;
    if (!fromSettings && ctx.settings) {
      try {
        setCongregation(ctx.settings, next);
      } catch { /* keep local state */ }
    }
    for (const fn of tradListeners) fn();
  };
  const s = ctx.settings;
  if (s) {
    const cb = () => { if (alive && normalizeTradition(s.congregation) !== tradition) setTradition(s.congregation, true); };
    if (typeof s.subscribe === 'function') { const u = s.subscribe(cb); if (typeof u === 'function') cleanups.push(u); }
    else if (typeof s.onChange === 'function') { const u = s.onChange(cb); if (typeof u === 'function') cleanups.push(u); }
    else if (typeof s.addEventListener === 'function') { s.addEventListener('change', cb); cleanups.push(() => s.removeEventListener?.('change', cb)); }
  }

  const hOn = (tag, attrs = {}, ...kids) => {
    const { onclick, ...rest } = attrs; const el = h(tag, rest, ...kids);
    if (typeof onclick === 'function') { el.addEventListener('click', onclick); cleanups.push(() => el.removeEventListener('click', onclick)); }
    return el;
  };
  // Shared audio button (src/shell/audio-access.js): file, device voice (Israeli-style only), or one line "No audio yet".
  const audioButton = (label, id, text) => sharedAudioButton(hOn, ctx, { kind: 'word', id, label: 'Play', name: label, text });

  const build = ({ soundgap, prayerwords }) => {
    wrap.replaceChildren(h('h2', { id: 'alef-soundgap-title' }, tr('soundgap.title', 'Sound-gap lab')));
    if (soundgap.proofread === false) wrap.append(h('p', {}, h('span', { class: 'badge' }, 'not proofread'), ' ', 'Written from general phonology and our research notes; no native speaker has checked it yet.'));

    const name = `alef-gap-${Math.random().toString(36).slice(2, 8)}`;
    const radios = TRADITIONS.map((t) => {
      const input = h('input', { type: 'radio', name, value: t });
      input.checked = t === tradition;
      const onChange = () => setTradition(t);
      input.addEventListener('change', onChange);
      cleanups.push(() => input.removeEventListener('change', onChange));
      return { t, input, label: h('label', {}, input, ' ', TRADITION_LABELS[t]) };
    });
    wrap.append(h('fieldset', {}, h('legend', {}, tr('soundgap.tradition', 'Pronunciation tradition')), radios.map((r) => r.label)));
    tradListeners.push(() => { for (const r of radios) r.input.checked = r.t === tradition; });

    soundgap.gaps.forEach((gap) => {
      const noteEl = h('p', { 'aria-live': 'polite' });
      const pbody = h('tbody', {});
      const refresh = () => {
        const n = gapNoteFor(gap, tradition);
        noteEl.replaceChildren(h('strong', {}, 'In this tradition: '), n.text, ...(n.americanText ? [' ', h('em', {}, 'In an American synagogue: '), n.americanText] : []));
        pbody.replaceChildren();
        gap.pairs.forEach((p, i) => {
          const heard = pairHeardIn(p, tradition);
          let verdict;
          if (p.kind === 'tradition') verdict = heard ? 'differs here' : 'base form';
          else if (p.kind === 'homophone') verdict = heard ? 'different only if the old distinction is kept' : 'said the same here';
          else if (p.kind === 'alternation') verdict = 'same root, letter changes sound';
          else verdict = 'different sounds';
          pbody.append(h('tr', {},
            h('td', {}, he(p.a.he), ' ', p.a.translit, ' (', p.a.gloss, ') ', audioButton(`${p.a.translit}`, pairAudioId(gap.id, i, 'a'), p.a.he)),
            h('td', {}, he(p.b.he), ' ', p.b.translit, ' (', p.b.gloss, ') ', audioButton(`${p.b.translit}`, pairAudioId(gap.id, i, 'b'), p.b.he)),
            h('td', {}, verdict, p.note ? h('small', {}, ' - ', p.note) : '')));
        });
      };
      tradListeners.push(refresh);
      refresh();
      wrap.append(h('details', {},
        h('summary', {}, gap.title),
        h('p', {}, h('strong', {}, 'English-speaker trap: '), gap.englishTrap),
        noteEl,
        gap.mouth.map((m) => h('div', {}, h('h4', {}, m.for), h('ol', {}, m.steps.map((st) => h('li', {}, st))))),
        h('div', { class: 'table-wrap', tabindex: '0', role: 'region', 'aria-label': 'Word pairs (scrolls sideways)' }, h('table', {}, h('thead', {}, h('tr', {}, ['Word A', 'Word B', 'Contrast'].map((x) => h('th', { scope: 'col' }, x)))), pbody)),
        gap.needsNativeSpeaker?.length ? h('p', {}, h('small', {}, 'Needs a native speaker: ', gap.needsNativeSpeaker.join('; '), '.')) : ''));
    });

    // prayer words
    wrap.append(h('h3', {}, 'Ten prayer words: Israeli, American synagogue, Ashkenazi'), h('p', {}, prayerwords.description));
    wrap.append(h('ul', {}, prayerwords.americanHabits.map((x) => h('li', {}, x))));
    const rows = prayerwords.words.map((w) => h('tr', {},
      h('td', {}, he(w.he), ' ', w.gloss),
      h('td', {}, w.israeli.say), h('td', {}, w.american.say), h('td', {}, w.ashkenazi.say)));
    wrap.append(h('div', { class: 'table-wrap', tabindex: '0', role: 'region', 'aria-label': 'Prayer words (scrolls sideways)' }, h('table', {}, h('thead', {}, h('tr', {}, ['Word', 'Israeli', 'American synagogue', 'Ashkenazi'].map((x) => h('th', { scope: 'col' }, x)))), h('tbody', {}, rows))),
      h('p', {}, h('small', {}, 'Capitals mark the stressed syllable. These respellings are approximations, not recordings.')));
  };

  const dataPromise = ctx.soundgapData ? Promise.resolve(ctx.soundgapData) : loadSoundgapData();
  dataPromise.then((d) => { if (alive) build(d); }).catch((err) => {
    if (!alive) return;
    wrap.replaceChildren(h('h2', {}, tr('soundgap.title', 'Sound-gap lab')), h('p', { role: 'alert' }, 'Could not load the sound-gap data. Check your connection, then try again.'));
  });

  return () => {
    alive = false;
    for (const fn of cleanups.splice(0)) { try { fn(); } catch { /* ignore */ } }
    tradListeners.length = 0;
    root.replaceChildren();
  };
}
