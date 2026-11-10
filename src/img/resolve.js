// @ts-check
// Image resolver. Pure, no DOM, no fetch at import time. Works in the browser, Node and a service worker.
//
//   const R = createImageResolver({ index, approvals, showUnapproved: () => settings.get('showUnapprovedImages') === true });
//   R.resolve('letter', 'alef')                       // {src, alt, approved, aspect, width, height, id} or null
//   R.resolve('word', 'h1a2b3c4d')                    // vocabulary word id -> its own picture, or a reviewed cue (data/images/word-cues.json)
//   R.resolve('theme', 'greetings', { slot: 3 })      // third picture of the "greetings" theme pack
//   R.resolve('lesson', 'I-07')  R.resolve('festival', 'purim')  R.resolve('vowel', 'kamatz')  R.resolve('id', 'BG_cafe')
//
// Rules: an image is returned only if (a) it is in the index, (b) its file exists (it has been ingested into assets/img/gen),
// and (c) it is approved in data/images/approvals.json, unless showUnapproved is on (then approved:false is reported).
// Otherwise the result is null and the caller renders NOTHING (no placeholder box, no empty frame).
//
// Index and approval formats: tools/img/build_index.mjs and tools/images/ingest.mjs.

/** @typedef {{id:string, src:string, alt:string, approved:boolean, aspect:string, width:number, height:number}} ImgResult */

export const KINDS = Object.freeze(['letter', 'vowel', 'word', 'theme', 'lesson', 'festival', 'asset', 'id']);
const norm = (s) => String(s ?? '').trim().replace(/_/g, '-');
const longEdge = 800;

/** @param {any} row @param {string[]} prefixes @param {string[]} aspects @param {string} idPrefix */
function expandRow(row, prefixes, aspects, idPrefix) {
  const [suffix, ai, pi, rest, big] = row;
  const p = pi > 0 ? prefixes[pi - 1] : '';
  const alt = p + rest + (pi > 0 && p.endsWith('"') ? '".' : '');
  const edges = big == null ? [] : Array.isArray(big) ? big : big === 800 ? [800] : [800, big];
  return { id: idPrefix + suffix, alt, aspect: aspects[ai] || '1:1', edges };
}

/** Variant code -> candidates, for the kinds that have several (letter:<id>:print|cursive|quirky|alt, vowel:<id>:alt). */
function keysFor(kind, id, o) {
  if (kind === 'letter') return o.variant ? [`letter:${id}:${o.variant}`] : [`letter:${id}:${o.script === 'cursive' ? 'cursive' : 'print'}`, `letter:${id}:quirky`, `letter:${id}:alt`];
  if (kind === 'vowel') return o.variant ? [`vowel:${id}:${o.variant}`] : [`vowel:${id}`, `vowel:${id}:alt`];
  return [`${kind}:${id}`];
}

/**
 * @param {{ index: any, approvals?: any, showUnapproved?: boolean | (() => boolean), base?: string, dir?: string }} opts
 *   index: parsed data/img/index.json. approvals: parsed data/images/approvals.json ({approvals:{id:{status}}}) or the inner map.
 *   wordCues: data/images/word-cues.json, or its `cues` map (word id -> {asset, alt}). Used only when that word has no approved picture of its own.
 *   showUnapproved: boolean or getter (settings.showUnapprovedImages). base: URL prefix of assets/img (default 'assets/img').
 */
function cueMap(raw) {
  const cues = raw?.cues ?? raw ?? {};
  return cues && typeof cues === 'object' && !Array.isArray(cues) ? cues : {};
}
export function createImageResolver(opts) {
  let index = opts.index || { p: [], a: [], g: {}, w: {} };
  let approvals = opts.approvals?.approvals ?? opts.approvals ?? {};
  let wordCues = cueMap(opts.wordCues);
  const base = (opts.base ?? 'assets/img').replace(/\/$/, '');
  const dir = (opts.dir ?? 'gen').replace(/^\/|\/$/g, '');
  const show = () => (typeof opts.showUnapproved === 'function' ? !!opts.showUnapproved() : !!opts.showUnapproved);
  /** @type {Map<string, any>} */ let byId = new Map();
  const rebuild = () => {
    byId = new Map();
    for (const [, [pre, rows]] of Object.entries(index.g || {})) for (const r of rows) { const e = expandRow(r, index.p || [], index.a || [], pre); byId.set(e.id, e); }
    for (const r of Object.values(index.w || {})) { const e = expandRow(r, index.p || [], index.a || [], ''); byId.set(e.id, e); }
  };
  rebuild();

  const candidates = (kind, id, o) => {
    if (kind === 'id') { const e = byId.get(String(id)); return e ? [e] : []; }
    const nid = kind === 'word' ? String(id) : norm(id);
    const out = [];
    for (const k of keysFor(kind, nid, o)) {
      if (kind === 'word' && index.w?.[nid]) out.push(expandRow(index.w[nid], index.p, index.a, ''));
      const g = index.g?.[k];
      if (g) for (const r of g[1]) out.push(expandRow(r, index.p || [], index.a || [], g[0]));
    }
    return out;
  };
  const pickSrc = (stem, edges, width) => {
    const w = width ?? longEdge; const f = [...edges].sort((a, b) => a - b);
    return `${base}/${dir}/${stem}.${(f.find((e) => e >= w) ?? f[f.length - 1])}.webp`;
  };
  const isApproved = (id) => approvals[id]?.status === 'approved';
  const pack = (e, o, alt) => {
    const approved = isApproved(e.id);
    if (!approved && !show()) return null;
    const [w, h] = e.aspect.split(':').map(Number);
    const width = Math.round(Math.min(o.width ?? longEdge, Math.max(...e.edges)));
    const wide = w >= h;
    const W = wide ? width : Math.round(width * w / h), H = wide ? Math.round(width * h / w) : width;
    return { id: e.id, src: pickSrc(e.id, e.edges, o.width), alt: alt || e.alt, approved, aspect: e.aspect, width: W, height: H };
  };

  /**
   * @param {string} kind one of KINDS
   * @param {string} id letter id ('alef', 'kaf-final'), vowel id ('kamatz'), vocab word id, theme key ('greetings'), lesson id ('I-07'), festival slug ('purim'), asset set, or an image id with kind 'id'
   * @param {{ slot?: number, role?: string, script?: 'print'|'cursive', variant?: string, width?: number }} [o]
   *   slot: 1-based position in the candidate list (theme packs: picture N). role: pick one image by its id suffix (e.g. 'mnemonic', 'ari'). width: wanted long edge in px.
   * @returns {ImgResult|null}
   */
  function resolve(kind, id, o = {}) {
    if (!id) return null;
    let list = candidates(kind, id, o);
    if (o.role) list = list.filter((e) => e.id.endsWith(`_${o.role}`) || e.id.endsWith(`-${o.role}`));
    if (o.slot != null) {
      const n = +o.slot;
      if (kind === 'theme') list = list.filter((e) => +(/(\d+)$/.exec(e.id)?.[1] ?? NaN) === n); // VOC_<theme>_<NN>
      else list = list[n - 1] ? [list[n - 1]] : [];
    }
    for (const e of list) {
      if (!e.edges.length) continue;                       // not ingested yet: nothing to show
      const hit = pack(e, o);
      if (hit) return hit;
    }
    // Reviewed cue: a different approved asset checked against this word. Unapproved and held ids stay null.
    if (kind === 'word') {
      const cue = wordCues[String(id)];
      const e = cue?.asset ? byId.get(cue.asset) : null;
      if (e?.edges.length && isApproved(e.id)) return pack(e, o, cue.alt);
    }
    return null;
  }

  return {
    resolve,
    /** True when resolve() would return an image. */
    has: (kind, id, o) => resolve(kind, id, o) != null,
    setApprovals(a) { approvals = a?.approvals ?? a ?? {}; },
    setWordCues(c) { wordCues = cueMap(c); },
    setIndex(ix) { index = ix; rebuild(); },
    /** Number of images per state, for diagnostics: {total, ingested, approvedIngested}. */
    stats() { let ing = 0, ok = 0; for (const e of byId.values()) if (e.edges.length) { ing++; if (isApproved(e.id)) ok++; } return { total: byId.size, ingested: ing, approvedIngested: ok }; },
  };
}

/**
 * Load approvals (tiny) and build a resolver. `fetchJson(url)` returns parsed JSON (the app passes (u) => fetch(u).then(r => r.json())).
 * The 235 KB index is fetched only when it can change what a view shows: at least one image is approved, or "show images that have not
 * passed review" is on (now, or when it is switched on later: the index is then loaded and views show pictures from their next render).
 * With nothing approved and that setting off, every resolve() is null whatever the index says, so the fetch is skipped.
 * Any failure yields a resolver that returns null for everything (views then render no image).
 */
export async function loadImageResolver(fetchJson, { settings, base = 'assets/img', indexUrl = 'data/img/index.json', approvalsUrl = 'data/images/approvals.json', cuesUrl = 'data/images/word-cues.json' } = {}) {
  const approvals = await Promise.resolve().then(() => fetchJson(approvalsUrl)).catch(() => ({}));
  const showAll = () => settings?.get?.('showUnapprovedImages') === true;
  const R = createImageResolver({ approvals, base, showUnapproved: showAll });
  let loading = null;
  const ensureIndex = () => (loading ||= Promise.all([
    Promise.resolve().then(() => fetchJson(indexUrl)),
    Promise.resolve().then(() => fetchJson(cuesUrl)).catch(() => ({})),
  ]).then(([ix, cues]) => { if (ix) R.setIndex(ix); if (cues) R.setWordCues(cues); }).catch(() => { loading = null; }));
  const anyApproved = Object.values(approvals?.approvals ?? approvals ?? {}).some((a) => a && a.status === 'approved');
  if (anyApproved || showAll()) await ensureIndex();
  try { settings?.subscribe?.((all, changed) => { if (Array.isArray(changed) && changed.includes('showUnapprovedImages') && showAll()) ensureIndex(); }); } catch { /* no live settings */ }
  return Object.assign(R, { ensureIndex });
}

/**
 * Lazy <img> for a resolved image, or null (so `h('div', {}, img(h, spec))` renders nothing when there is no approved picture).
 * width/height attributes come from the aspect ratio so the page does not shift when the file arrives.
 * @param {(tag:string, attrs?:any, ...kids:any[]) => any} h  the shell's h() (src/shell/ui.js)
 * @param {{ R: ReturnType<typeof createImageResolver>, kind: string, id: string, class?: string, slot?: number, role?: string, script?: string, variant?: string, width?: number, sizes?: string, decorative?: boolean }} spec
 */
export function img(h, spec) {
  const r = spec.R?.resolve(spec.kind, spec.id, spec);
  if (!r) return null;
  return h('img', {
    class: spec.class ? `alef-img ${spec.class}` : 'alef-img',
    src: r.src, width: r.width, height: r.height, loading: 'lazy', decoding: 'async',
    alt: spec.decorative ? '' : r.alt, sizes: spec.sizes, 'data-img-id': r.id, ...(r.approved ? {} : { 'data-unapproved': '' }),
    // No inline max-width: the stylesheet's .alef-img rule carries max-width:100%,
    // and the per-class caps (.at-pic, .vc-pic, .pl-pic, ...) are declared after it
    // so they can win. An inline max-width here would silently override them all.
    style: `aspect-ratio:${r.width}/${r.height};height:auto`,
  });
}
