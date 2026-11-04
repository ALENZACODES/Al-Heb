// @ts-check
// Vowel chart, tradition switcher, "it's easy" summary and drills (lane 3).
//
//   mount(root, ctx) -> unmount
//
// ctx (provided by lane 8's shell): { settings, store, audio, route, t }.
// What this view assumes about ctx (flagged for lane 8 to confirm):
//   - ctx.settings.congregation is readable; it is written with settings.set('congregation', v)
//     if that function exists, otherwise by assignment. Changes made elsewhere are picked up if the
//     settings object offers subscribe(fn) | onChange(fn) | addEventListener('change', fn).
//   - ctx.audio.play(kind, id) is called as play('vowel', id) when a sign is tapped.
//   - ctx.t(key) is optional; when it returns the key itself the English fallback is used.
//   - ctx.pronunciationData (optional) can supply the parsed JSON files (used by tests);
//     otherwise they are fetched relative to this module.

import { TRADITIONS, TRADITION_LABELS, normalizeTradition, describeSign, soundChangingLetters, pairFormFor } from './sounds.model.js';

const FILES = ['niqqud', 'consonants', 'drills', 'easy'];

/** Fetch the four data files. @param {typeof fetch} [fetchImpl] */
export async function loadPronunciationData(fetchImpl = globalThis.fetch) {
  const out = {};
  await Promise.all(FILES.map(async (f) => {
    const res = await fetchImpl(new URL(`../../data/pronunciation/${f}.json`, import.meta.url));
    if (!res.ok) throw new Error(`could not load ${f}.json (${res.status})`);
    out[f] = await res.json();
  }));
  return /** @type {{niqqud:any, consonants:any, drills:any, easy:any}} */ (out);
}

const CSS = `
.alef-sounds{font:16px/1.5 system-ui,sans-serif;max-width:60rem;margin:0 auto;padding:1rem}
.alef-sounds h2,.alef-sounds h3{margin:1.2em 0 .4em}
.alef-sounds fieldset{border:1px solid var(--border,#888);border-radius:8px;padding:.5rem 1rem}
.alef-sounds fieldset label{margin-inline-end:1.2rem;white-space:nowrap}
.alef-sounds .vowel-grid{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(15rem,1fr));gap:.75rem}
.alef-sounds .vowel-grid>li{border:1px solid var(--border,#888);border-radius:8px;padding:.6rem}
.alef-sounds .sign{all:unset;cursor:pointer;display:flex;align-items:center;gap:.7rem;border-radius:6px;padding:.2rem .4rem}
.alef-sounds .sign:focus-visible{outline:3px solid var(--focus,#1a5fb4);outline-offset:2px}
.alef-sounds .sign:hover{background:rgba(128,128,128,.15)}
.alef-sounds .he{font-size:2.2rem;line-height:1.2;unicode-bidi:isolate}
.alef-sounds .he-small{font-size:1.3rem;unicode-bidi:isolate}
.alef-sounds .ipa{font-family:"Noto Sans","DejaVu Sans",sans-serif}
.alef-sounds .badge{font-size:.8rem;border:1px solid currentColor;border-radius:4px;padding:0 .3rem;margin-inline-start:.4rem}
.alef-sounds table{border-collapse:collapse;width:100%}
.alef-sounds th,.alef-sounds td{border-bottom:1px solid var(--border,#888)6;padding:.3rem .5rem;text-align:start;vertical-align:top}
.alef-sounds .current{font-weight:600}
.alef-sounds details{border:1px solid var(--border,#888)6;border-radius:8px;padding:.4rem .8rem;margin:.4rem 0}
`;

/**
 * Mount the sounds view. Returns an unmount function synchronously; data is loaded asynchronously.
 * @param {HTMLElement} root
 * @param {any} ctx
 * @returns {() => void}
 */
export function mount(root, ctx = {}) {
  const doc = root.ownerDocument;
  let alive = true;
  /** @type {Array<() => void>} */
  const cleanups = [];
  let tradition = normalizeTradition(ctx.settings?.congregation);

  const tr = (key, fallback) => {
    const v = typeof ctx.t === 'function' ? ctx.t(key) : undefined;
    return v && v !== key ? v : fallback;
  };

  /** tiny element builder */
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
  /** Hebrew text: always rtl + lang=he. */
  const he = (text, cls = 'he') => h('span', { class: cls, dir: 'rtl', lang: 'he' }, text);
  const ipaEl = (text) => h('span', { class: 'ipa', dir: 'ltr', lang: 'und-fonipa' }, text);
  const link = (src) => h('a', { href: src.url, rel: 'noopener noreferrer', target: '_blank' }, src.label);

  root.replaceChildren();
  const style = h('style', {}, CSS);
  const wrap = h('section', { class: 'alef-sounds', 'aria-labelledby': 'alef-sounds-title' });
  root.append(style, wrap);
  wrap.append(h('h2', { id: 'alef-sounds-title' }, tr('sounds.title', 'Vowels and sounds')), h('p', { role: 'status' }, tr('sounds.loading', 'Loading...')));

  /** @type {Array<() => void>} */
  const tradListeners = []; // functions that refresh tradition-dependent text

  const setTradition = (t, fromSettings = false) => {
    const next = normalizeTradition(t);
    if (next === tradition && !fromSettings) return;
    tradition = next;
    if (!fromSettings && ctx.settings) {
      try {
        if (typeof ctx.settings.set === 'function') ctx.settings.set('congregation', next);
        else ctx.settings.congregation = next;
      } catch { /* settings store unavailable: keep local state */ }
    }
    for (const fn of tradListeners) fn();
  };

  // follow external changes of the congregation setting
  const s = ctx.settings;
  if (s) {
    const cb = () => { if (alive && normalizeTradition(s.congregation) !== tradition) setTradition(s.congregation, true); };
    if (typeof s.subscribe === 'function') { const u = s.subscribe(cb); if (typeof u === 'function') cleanups.push(u); }
    else if (typeof s.onChange === 'function') { const u = s.onChange(cb); if (typeof u === 'function') cleanups.push(u); }
    else if (typeof s.addEventListener === 'function') { s.addEventListener('change', cb); cleanups.push(() => s.removeEventListener?.('change', cb)); }
  }

  const build = (data) => {
    wrap.replaceChildren(h('h2', { id: 'alef-sounds-title' }, tr('sounds.title', 'Vowels and sounds')));

    // --- tradition switcher
    const name = `alef-trad-${Math.random().toString(36).slice(2, 8)}`;
    const radios = TRADITIONS.map((t) => {
      const input = h('input', { type: 'radio', name, value: t });
      input.checked = t === tradition;
      const onChange = () => setTradition(t);
      input.addEventListener('change', onChange);
      cleanups.push(() => input.removeEventListener('change', onChange));
      return { t, input, label: h('label', {}, input, ' ', TRADITION_LABELS[t]) };
    });
    const live = h('p', { 'aria-live': 'polite', class: 'trad-note' });
    wrap.append(h('fieldset', {}, h('legend', {}, tr('sounds.tradition', 'Pronunciation tradition')), radios.map((r) => r.label)), live);
    const NOTES = {
      israeli: 'Modern Israeli: five pure vowels, tav is always t, stress usually on the last syllable.',
      sephardi: 'Sephardi values, as used in most American synagogues: kamatz = a, cholam = o, tav = t, on an American English base.',
      ashkenazi: 'Ashkenazi: kamatz = o, tzere = ei, tav without dagesh = s, stress on the second-to-last syllable (older or Orthodox usage).',
    };
    tradListeners.push(() => {
      for (const r of radios) r.input.checked = r.t === tradition;
      live.textContent = NOTES[tradition];
    });
    live.textContent = NOTES[tradition];

    // --- vowel chart
    wrap.append(h('h3', {}, tr('sounds.chart', 'Vowel chart')), h('p', {}, tr('sounds.chart.hint', 'Tap a sign to hear it. The sounds below follow the tradition you picked.')));
    const grid = h('ul', { class: 'vowel-grid' });
    for (const rec of data.niqqud.records) {
      const info = h('p', {});
      const extra = h('p', {});
      const refresh = () => {
        const d = describeSign(rec, tradition);
        info.replaceChildren(ipaEl(d.ipa), ' ', d.english ? `(${d.english})` : '');
        extra.replaceChildren(d.americanSynagogue ? `In an American synagogue: ${d.americanSynagogue}.` : '');
      };
      tradListeners.push(refresh);
      refresh();
      const btn = h('button', { type: 'button', class: 'sign', 'aria-label': `${rec.name}: ${tr('sounds.play', 'play sound')}` }, he(rec.shape), h('span', {}, rec.name));
      const onClick = () => { try { ctx.audio?.play?.('vowel', rec.id); } catch { /* audio is best effort */ } };
      btn.addEventListener('click', onClick);
      cleanups.push(() => btn.removeEventListener('click', onClick));
      const li = h('li', {}, btn, info, extra, h('p', {}, h('small', {}, rec.position, ' - e.g. '), he(rec.example.he, 'he-small'), h('small', {}, ` ${rec.example.gloss}`)));
      if (rec.variants?.length) {
        const vlist = h('ul', {});
        for (const v of rec.variants) {
          const vi = h('span', {});
          const vr = () => {
            const d = describeSign(v, tradition, rec);
            vi.replaceChildren(' ', d.inherited ? '' : [ipaEl(d.ipa), ' '], d.inherited ? '' : `(${d.english}) `, v.note ?? '', v.verified === false ? h('span', { class: 'badge' }, 'unverified') : '');
          };
          tradListeners.push(vr);
          vr();
          vlist.append(h('li', {}, he(v.shape, 'he-small'), vi));
        }
        li.append(h('details', {}, h('summary', {}, 'Variants'), vlist));
      }
      grid.append(li);
    }
    wrap.append(grid);

    // --- consonants that change sound
    const tbody = h('tbody', {});
    const crow = () => {
      tbody.replaceChildren();
      for (const l of soundChangingLetters(data.consonants, tradition)) {
        tbody.append(h('tr', {}, h('td', {}, he(l.he, 'he-small'), ' ', l.name), h('td', {}, ipaEl(l.ipa)), h('td', {}, l.english)));
      }
    };
    tradListeners.push(crow);
    crow();
    wrap.append(h('h3', {}, 'Letters whose sound depends on a dot or the tradition'), h('table', {}, h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Letter'), h('th', { scope: 'col' }, 'IPA'), h('th', { scope: 'col' }, 'Sounds like'))), tbody));

    // --- it's easy
    wrap.append(h('h3', {}, "Why this is easier than it looks"));
    const facts = h('ul', {});
    for (const f of data.easy.facts) facts.append(h('li', {}, f.text, ' ', h('small', {}, '(', link(f.source), ')'), f.note ? h('small', {}, ` ${f.note}`) : ''));
    wrap.append(facts);

    // --- drills
    wrap.append(h('h3', {}, tr('sounds.drills', 'Sound like a local: drills')));
    const dl = h('ol', {});
    for (const d of data.drills.drills) {
      const det = h('details', {}, h('summary', {}, d.title, d.verified === false ? h('span', { class: 'badge' }, 'unverified') : ''),
        h('p', {}, h('strong', {}, 'Outsider marker: '), d.marker),
        h('p', {}, h('strong', {}, 'Listen for: '), d.listenFor),
        h('p', {}, h('strong', {}, 'Try this: '), d.tryThis),
        d.unverifiedReason ? h('p', {}, h('em', {}, d.unverifiedReason)) : '',
        h('ul', {}, d.examples.map((e) => h('li', {}, he(e.he, 'he-small'), ` ${e.translit} - ${e.gloss}`))),
        d.sources.length ? h('p', {}, h('small', {}, 'Sources: '), d.sources.map((x, i) => [i ? ', ' : '', link(x)])) : '');
      for (const x of d.unverifiedExtras ?? []) {
        det.append(h('p', {}, h('span', { class: 'badge' }, 'unverified'), ' ', x.text), h('ul', {}, x.examples.map((e) => h('li', {}, he(e.he, 'he-small'), ` ${e.translit} - ${e.gloss}`))));
      }
      dl.append(h('li', {}, det));
    }
    wrap.append(dl);

    // --- switch cards + pairs
    wrap.append(h('h3', {}, 'Switching between Ashkenazi and Sephardi: five changes'));
    const cards = h('ol', {});
    for (const c of data.drills.switchCards) cards.append(h('li', {}, h('strong', {}, c.title), ': ', c.rule));
    wrap.append(cards, h('p', {}, data.drills.switchConsistency.text));
    const pbody = h('tbody', {});
    const prow = () => {
      pbody.replaceChildren();
      for (const p of data.drills.pairs) {
        const mine = pairFormFor(p, tradition);
        pbody.append(h('tr', {}, h('td', {}, he(p.he, 'he-small')), h('td', { class: mine === p.israeli ? 'current' : '' }, p.israeli), h('td', { class: mine === p.ashkenazi ? 'current' : '' }, p.ashkenazi), h('td', {}, p.gloss)));
      }
    };
    tradListeners.push(prow);
    prow();
    wrap.append(h('h3', {}, 'Same word, two traditions'), h('table', {}, h('thead', {}, h('tr', {}, ['Hebrew', 'Israeli / Sephardi', 'Ashkenazi', 'Meaning'].map((x) => h('th', { scope: 'col' }, x)))), pbody));
  };

  const dataPromise = ctx.pronunciationData ? Promise.resolve(ctx.pronunciationData) : loadPronunciationData();
  dataPromise.then((data) => { if (alive) build(data); }).catch((err) => {
    if (!alive) return;
    wrap.replaceChildren(h('h2', {}, tr('sounds.title', 'Vowels and sounds')), h('p', { role: 'alert' }, `Could not load pronunciation data: ${err.message}`));
  });

  return () => {
    alive = false;
    for (const fn of cleanups.splice(0)) { try { fn(); } catch { /* ignore */ } }
    tradListeners.length = 0;
    root.replaceChildren();
  };
}
