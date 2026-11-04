// @ts-check
// Small DOM + audio + storage helpers shared by the Torah-reading views. Plain DOM, no dependencies.
import { spokenForm, hasDivineName } from './pointing.js';

export function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : String(v));
  }
  for (const k of kids) if (k != null) e.append(k);
  return e;
}
export const heEl = (tag, text, cls = '', attrs = {}) => el(tag, { lang: 'he', dir: 'rtl', class: cls, ...attrs }, text);

export const DRAFT_NOTICE = 'Draft. Not reviewed by a rabbi, cantor or Hebrew teacher. Texts are checked against their sources by a program, not proofread by a person.';

export const CSS = `
.trd{max-inline-size:60rem;margin-inline:auto}
.trd h1{margin-block:.2em .3em}
.trd h2{margin-block:.9em .3em}
.trd-draft{background:var(--warn-bg,#fff1c2);color:var(--warn-fg,#5b4200);padding:.5rem .8rem;border-radius:8px;margin-block:.5rem;font-size:.95rem}
.trd-tabs{display:flex;gap:.4rem;flex-wrap:wrap;margin-block:.6rem 1rem}
.trd-tab,.trd-btn,.trd-w,.trd-rate{font:inherit;min-block-size:var(--tap,48px);padding:.35rem .9rem;border-radius:999px;border:2px solid var(--accent,#1f3a5f);background:transparent;color:var(--accent,#1f3a5f);cursor:pointer}
.trd-tab[aria-pressed="true"],.trd-btn[aria-pressed="true"],.trd-rate[aria-pressed="true"]{background:var(--accent,#1f3a5f);color:var(--accent-fg,#fffaf0);font-weight:700}
.trd-tab:focus-visible,.trd-btn:focus-visible,.trd-w:focus-visible,.trd-rate:focus-visible,.trd select:focus-visible,.trd summary:focus-visible{outline:3px solid var(--focus,#b45309);outline-offset:2px}
.trd select{font:inherit;min-block-size:var(--tap,48px);max-inline-size:100%;padding:.3rem .6rem;border-radius:8px;border:2px solid var(--border,#d9cdb3);background:var(--card,#fffaf0);color:inherit}
.trd-levels{display:grid;grid-template-columns:1fr 1fr;gap:.4rem;margin-block:.6rem}
.trd-levels .trd-btn{border-radius:12px;text-align:start}
.trd-card{border:1px solid var(--border,#d9cdb3);background:var(--card,#fffaf0);border-radius:12px;padding:.7rem 1rem;margin-block:.6rem}
.trd-card h3{margin-block:.1em .3em}
.trd-line{display:flex;flex-wrap:wrap;gap:.5rem .7rem;direction:rtl;margin-block:.8rem;align-items:flex-start}
.trd-cell{display:inline-flex;flex-direction:column;align-items:center;gap:.1rem}
.trd-w{font-family:var(--font-he,serif);font-size:2rem;line-height:1.6;padding:.05rem .5rem;border-radius:10px;border-color:transparent;color:inherit;direction:rtl}
.trd-w:hover{border-color:var(--accent,#1f3a5f)}
.trd-w[aria-pressed="true"]{background:var(--warn-bg,#fff1c2);color:var(--warn-fg,#5b4200);border-color:var(--focus,#b45309)}
.trd-tr{font-size:.85rem;color:var(--muted,#5a6275);direction:ltr}
.trd-he{font-family:var(--font-he,serif);font-size:1.8rem;line-height:1.7;direction:rtl}
.trd-muted{color:var(--muted,#5a6275);font-size:.92rem}
.trd-badge{display:inline-block;font-size:.78rem;border:1px solid currentColor;border-radius:999px;padding:0 .5rem;margin-inline-start:.4rem}
.trd-status{min-block-size:1.4em;margin-block:.4rem;font-size:.95rem}
.trd-answer{border-inline-start:4px solid var(--accent,#1f3a5f);padding:.3rem .8rem;margin-block:.6rem}
.trd-en{font-style:italic;direction:ltr}
.trd-row{display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;margin-block:.5rem}
.trd ul,.trd ol{padding-inline-start:1.3rem}
.trd li{margin-block:.25rem}
.trd-big{font-family:var(--font-he,serif);font-size:2.4rem;line-height:1.5;direction:rtl}
.trd-sr{position:absolute;inline-size:1px;block-size:1px;overflow:hidden;clip:rect(0 0 0 0)}
.trd details{margin-block:.5rem}
.trd summary{cursor:pointer;min-block-size:var(--tap,48px);display:flex;align-items:center}
.trd-foot{margin-block:1.5rem 0;font-size:.9rem;color:var(--muted,#5a6275);border-block-start:1px solid var(--border,#d9cdb3);padding-block-start:.75rem}
.trd-unk{font-style:italic}
`;

/** congregation setting from either settings shape */
export function congregationOf(settings) {
  const v = settings && (settings.congregation ?? (typeof settings.get === 'function' ? settings.get('congregation') : undefined));
  return ['israeli', 'sephardi', 'ashkenazi'].includes(v) ? v : 'sephardi';
}

export const TRAD_LABEL = { israeli: 'Israeli', sephardi: 'Sephardi', ashkenazi: 'Ashkenazi' };

/**
 * Transliteration helper: loaded lazily from lane 3; the divine name is replaced by Adonai first.
 * Returns a function (pointedHebrew) -> string|null.
 */
export async function loadTranslit(settings) {
  let fn = null;
  try { const m = await import('../pronunciation/transliterate.js'); if (typeof m.transliterate === 'function') fn = m.transliterate; } catch { /* absent */ }
  return (he) => {
    if (!fn) return null;
    try { return fn(spokenForm(he), { scheme: 'siddur', tradition: congregationOf(settings) }); } catch { return null; }
  };
}
export { hasDivineName };

/** Plain-language result of ctx.audio.play(): honest about what (if anything) was heard. */
export function describeAudio(r, label) {
  if (!r) return `No audio yet for ${label}.`;
  if (r.source === 'file') return `Playing ${r.entryStatus === 'tts' ? 'a pre-rendered synthetic voice file' : 'a recorded audio file'} for ${label}.`;
  if (r.source === 'tts-fallback' || r.played === true) return `Played ${label} with your browser's text-to-speech voice. It is a computer voice, not a person, and it reads Israeli pronunciation.`;
  const why = {
    'unknown-item': 'no audio entry exists for it',
    'no-hebrew-browser-voice': 'your browser has no Hebrew voice',
    'tts-pronunciation-mismatch': 'the browser voice only reads Israeli pronunciation and you chose another tradition',
    'no-speech-synthesis': 'this browser has no speech synthesis',
  }[r.reason] || r.reason || r.error || 'unavailable';
  return `No audio yet for ${label}: ${why}.`;
}

/** Play through ctx.audio and write an honest line into `statusEl`. Never throws. */
export async function playHook(ctx, statusEl, kind, id, text, label) {
  const set = (m) => { statusEl.textContent = m; };
  if (!ctx || !ctx.audio || typeof ctx.audio.play !== 'function') { set(`No audio yet for ${label}: this build has no audio player.`); return null; }
  try {
    const r = await ctx.audio.play(kind, id, { text });
    set(describeAudio(r, label));
    return r;
  } catch (e) { set(`Audio error for ${label}: ${e?.message || e}`); return null; }
}

/** Progress in ctx.store under one key (store may be absent in tests). */
const KEY = 'torahread.v1';
export function loadProgress(ctx) {
  try { const v = ctx?.store?.get?.(KEY, null); if (v && typeof v === 'object') return { ladder: v.ladder || {}, aliyah: v.aliyah || {}, words: v.words || {} }; } catch { /* ignore */ }
  return { ladder: {}, aliyah: {}, words: {} };
}
export function saveProgress(ctx, p) { try { ctx?.store?.set?.(KEY, p); } catch { /* ignore */ } }
