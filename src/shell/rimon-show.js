// showRimon(situation): the one shared hook for putting a Rimon still on screen.
// The Rimon lane (feature/rimon-stills-2026-11-10) owns the stills and the placement map
// (docs/images/rimon-placements.md); this file only gives every screen the same fail-safe call.
// Rules: never throws, never shows a broken image, does nothing when no still loads, and has no
// entrance motion under prefers-reduced-motion or calm mode. Stills load on demand (never precached).
export const RIMON_DIR = 'data/images/rimon/';
/** Situation -> preferred still ids (first that loads wins). Mirrors the lane's placement map. */
export const SITUATIONS = Object.freeze({
  home: ['057', '056', '002', '006'],
  welcome: ['002', '001', '191', '006'],
  onboarding: ['004', '006', '009', '010', '016', '017', '018', '019'],
  'welcome-back': ['020', '191', '001'],
  'lesson-start': ['017', '018', '046', '055'],
  correct: ['023', '024', '026', '027', '030', '031', '035', '039', '022', '013'],
  wrong: ['041', '042', '043', '048', '044', '045'],
  hint: ['047', '052', '053', '046'],
  streak: ['057', '058', '059', '061', '069'],
  'streak-risk': ['062', '063', '064', '195'],
  comeback: ['068', '055'],
  'lesson-complete': ['071', '073', '074', '075', '083', '084', '027'],
  'next-lesson': ['078', '004', '019'],
  idle: ['086', '087', '089', '098', '100'],
  loading: ['043', '148', '018'],
  empty: ['114', '103', '049'],
  error: ['101', '108', '112', '047'],
  offline: ['105', '106', '107'],
  shabbat: ['116', '117', '064', '196'],
  'brain-lab': ['146', '147', '160'],
  library: ['161', '170', '173'],
  award: ['176', '178', '180', '184', '187'],
  reminder: ['191', '192', '194', '197', '199', '200'],
});
/** Situations that never get an entrance burst (rest days and quiet moments). */
export const QUIET_SITUATIONS = new Set(['shabbat', 'idle']);
const providers = [];
const rotation = new Map();

/** The Rimon lane can register a provider: (situation, opts) => string[] of URLs, or null to use the default map. */
export function registerRimonProvider(fn) {
  if (typeof fn === 'function') providers.push(fn);
  return () => { const i = providers.indexOf(fn); if (i >= 0) providers.splice(i, 1); };
}

/** Pure: candidate URLs for a situation, rotated so the same still does not repeat back to back. */
export function rimonCandidates(situation, { rotate = true } = {}) {
  try {
    const staged = globalThis.alefRimonStage?.urlsForSituation?.(situation);
    // An array, even an empty one, is a real answer: quiet days and Hide Rimon must not fall back to the default map.
    if (Array.isArray(staged)) return staged.filter((u) => typeof u === 'string');
  } catch { /* fall through */ }
  for (const p of providers) {
    try { const r = p(situation); if (Array.isArray(r) && r.length) return r.filter((u) => typeof u === 'string'); } catch { /* fall through */ }
  }
  const ids = SITUATIONS[situation];
  if (!ids) return [];
  let start = 0;
  if (rotate) { start = rotation.get(situation) || 0; rotation.set(situation, (start + 1) % ids.length); }
  const ordered = [...ids.slice(start), ...ids.slice(0, start)];
  return ordered.map((id) => `${RIMON_DIR}rimon-${id}.webp`);
}

const reduced = (win) => { try { return !!win?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches; } catch { return false; } };

/**
 * Put Rimon on screen for a situation.
 * opts.host: element to append into (default: a floating spot on <body>, removed after opts.ms).
 * opts.size: 'big' (default) | 'huge' | 'small'. opts.ms: auto-hide for the floating spot (default 1600, 0 keeps it).
 * Returns the <img> element, or null when nothing can be shown. Never throws.
 */
export function showRimon(situation, opts = {}) {
  try {
    const doc = opts.doc || globalThis.document;
    const win = opts.win || globalThis;
    if (!doc?.createElement || !doc.body) return null;
    if (opts.settings?.get?.('rimonOff') === true) return null;
    try {
      const store = opts.store || opts.settings?.store || globalThis.alef?.store;
      if (store?.get?.('rimon.dismissed', false) === true) return null;
    } catch { /* keep going */ }
    const urls = rimonCandidates(situation);
    if (!urls.length) return null;
    const calm = opts.settings?.get?.('calmMode') === true;
    const img = doc.createElement('img');
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    img.decoding = 'async';
    img.className = `alef-rimon alef-rimon-${opts.size || 'big'}`;
    img.dataset.situation = situation;
    if (!reduced(win) && !calm && !QUIET_SITUATIONS.has(situation)) img.classList.add('alef-rimon-burst');
    let i = 0;
    const floating = !opts.host;
    const holder = floating ? doc.createElement('div') : null;
    const remove = () => { try { (holder || img).remove(); } catch { /* gone */ } };
    img.hidden = true;
    img.addEventListener('load', () => { img.hidden = false; });
    img.addEventListener('error', () => { i += 1; if (i < urls.length) img.src = urls[i]; else remove(); });
    img.src = urls[0];
    if (floating) {
      holder.className = 'alef-rimon-spot';
      holder.dataset.situation = situation;
      holder.append(img);
      doc.querySelector?.('.alef-rimon-spot')?.remove?.();
      doc.body.append(holder);
      const ms = opts.ms ?? 1600;
      if (ms > 0) win.setTimeout?.(remove, ms);
    } else {
      opts.host.append(img);
    }
    return img;
  } catch { return null; }
}

/** A slot for a screen: an empty, styled container that fills itself if a still loads. */
export function rimonSlot(situation, opts = {}) {
  try {
    const doc = opts.doc || globalThis.document;
    if (!doc?.createElement) return null;
    const slot = doc.createElement('div');
    slot.className = `alef-rimon-slot alef-rimon-slot-${opts.size || 'big'}`;
    slot.dataset.rimonSlot = situation;
    showRimon(situation, { ...opts, host: slot, doc });
    return slot;
  } catch { return null; }
}
