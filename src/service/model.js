// @ts-check
// Aleph "Service": Siddur Coverage % and Follow-the-service cards. Pure functions plus one loader; no DOM.
// Decoding is NOT re-implemented: coverage consumes the graded lines from src/progress (readableNow -> gradeLines).
// "Decodable" means every letter and vowel sign in the line has been taught. It does not mean fluent or fast.
import { loadJSON } from '../curriculum/data.js';
import { gradeWords } from '../progress/decode.js';
import { transliterate } from '../pronunciation/transliterate.js';

export const ORDER_IDS = ['friday-night', 'shabbat-morning', 'weekday-morning'];
export const FOLLOW_IDS = ['friday-night', 'shabbat-morning'];
export const TRADITIONS = ['israeli', 'sephardi', 'ashkenazi'];
export const TRADITION_LABELS = { israeli: 'Modern Israeli', sephardi: 'American synagogue (Sephardi values)', ashkenazi: 'Ashkenazi' };
export const MARKER_LABELS = { stand: 'Stand', sit: 'Sit', sing: 'Sing', silent: 'Silent' };
export const VARIES = 'Stand, sit, sing or silent: varies by congregation';

export const DRAFT_NOTICE = 'Every congregation runs the service a little differently. Use this as a guide and follow your own prayer book in the room.';
export const COPYRIGHT_NOTICE = 'No prayerbook text, layout or page numbers are used here. Published siddurim such as Mishkan T\'filah are copyrighted; this screen follows none of them.';
export const COVERAGE_NOTE = 'A line is ready to read when you have learned every letter and vowel sign in it.';

/** Load orders, the corpus guide/registry and gap ids. @param {{loadCorpus:Function}} corpusApi */
export async function loadServiceData(corpusApi) {
  const [orders, corpus] = await Promise.all([loadJSON('data/service/orders.json'), corpusApi.loadCorpus()]);
  const registry = corpus.allTexts();
  return { orders, registry, byId: new Map(registry.map((e) => [e.id, e])), guide: corpus.guide?.() ?? null, hasGap: (id) => !!corpus.gap?.(id), corpus };
}

/** Problems with the orders file against the real corpus; [] when sound. */
export function validateOrders(orders, byId, guide, hasGap) {
  const bad = [];
  const secs = new Map((guide?.sections ?? []).map((s) => [s.id, s]));
  for (const [oid, o] of Object.entries(orders.orders)) {
    for (const it of o.items) {
      if (!byId.has(it.id)) bad.push(`${oid}: unknown registry id ${it.id}`);
      if (it.anchor && !secs.has(it.anchor) && !(guide?.otherOccasions ?? []).some((x) => x.id === it.anchor)) bad.push(`${oid}: unknown anchor ${it.anchor}`);
    }
    for (const g of o.gaps) if (!hasGap(g)) bad.push(`${oid}: unknown gap ${g}`);
    const ids = o.items.map((i) => i.id);
    if (new Set(ids).size !== ids.length) bad.push(`${oid}: duplicate item`);
  }
  for (const [oid, per] of Object.entries(orders.markers ?? {})) for (const [id, ms] of Object.entries(per)) for (const m of ms) {
    const sec = secs.get(m.section);
    const item = orders.orders[oid]?.items.find((i) => i.id === id);
    if (!item) { bad.push(`marker ${oid}/${id}: not an item`); continue; }
    if (!sec) { bad.push(`marker ${oid}/${id}: unknown section ${m.section}`); continue; }
    if (!MARKER_LABELS[m.kind]) bad.push(`marker ${oid}/${id}: bad kind ${m.kind}`);
    const text = m.field === 'yourPart' ? sec.yourPart : sec.prayers.filter((p) => p.id === id).map((p) => p.role).join(' | ');
    if (!String(text).includes(m.quote)) bad.push(`marker ${oid}/${id}: quote not in guide: ${m.quote}`);
  }
  return bad;
}

/**
 * Siddur coverage for one order. `gradedLines` comes from src/progress/model.js readableNow(...).lines (decode.gradeLines).
 * Headline counts only lines Aleph holds; gaps are reported separately so nothing is overclaimed.
 * @param {any} order @param {Array<any>} gradedLines @param {Set<string>} known
 */
export function coverage(order, gradedLines, known) {
  const ids = new Set(order.items.map((i) => i.id));
  const lines = gradedLines.filter((l) => ids.has(l.entryId));
  const full = lines.filter((l) => l.status === 'full').length;
  const almost = lines.filter((l) => l.status === 'almost').length;
  const words = gradeWords(lines, known);
  const perItem = order.items.map((it) => {
    const ls = lines.filter((l) => l.entryId === it.id);
    return { id: it.id, moment: it.moment, lines: ls.length, full: ls.filter((l) => l.status === 'full').length, decodable: ls.length > 0 && ls.every((l) => l.status === 'full') };
  });
  const pct = (a, b) => (b ? Math.floor((a / b) * 100) : 0); // rounded DOWN: never claim more than is true
  return {
    lines: lines.length, full, almost, pct: pct(full, lines.length),
    words: words.total, wordsFull: words.full.length, wordsPct: pct(words.full.length, words.total),
    texts: order.items.length, textsFull: perItem.filter((p) => p.decodable).length,
    gaps: order.gaps.length, perItem,
  };
}

/** Plain-language sentence for a coverage result. */
export function coverageSentence(title, c) {
  return `${c.full} of the ${c.lines} lines ALEF holds for ${title.toLowerCase()} use only letters and signs you have learned (${c.pct}% ready to read).`;
}

/** Markers for a card: only those in data (each quoted from the guide). */
export function markersFor(orders, orderId, id) { return (orders.markers?.[orderId]?.[id] ?? []).map((m) => ({ kind: m.kind, quote: m.quote })); }

/**
 * Follow-the-service cards, in order. Transliteration for the chosen tradition; English from the registry.
 * @param {any} orders @param {string} orderId @param {Map<string,any>} byId @param {string} tradition
 */
export function buildCards(orders, orderId, byId, tradition) {
  const o = orders.orders[orderId];
  const t = TRADITIONS.includes(tradition) ? tradition : 'sephardi';
  return o.items.map((it, i) => {
    const e = byId.get(it.id);
    const lines = String(e.he).split('\n').map((x) => x.trim()).filter(Boolean);
    const en = String(e.english ?? '').split('\n').map((x) => x.trim()).filter(Boolean);
    let tr; try { tr = lines.map((l) => transliterate(l, { scheme: 'siddur', tradition: t })); } catch { tr = lines.map(() => ''); }
    const markers = markersFor(orders, orderId, it.id);
    return {
      n: i + 1, of: o.items.length, id: it.id, moment: it.moment, title: e.title, ref: e.ref,
      he: lines, tr, en, englishSource: e.englishSource === 'original-gloss' ? "ALEF's own plain gloss (project-owned, not reviewed)" : (e.englishSource ?? null), language: e.language,
      markers, markerKnown: markers.length > 0,
    };
  });
}

/** Does a real audio clip exist for this card (not a speech-synthesis fallback)? Returns {kind,id} to play or null. */
export function clipFor(audio, card, tradition) {
  if (!audio || typeof audio.status !== 'function') return null;
  const tries = card.he.length > 1 ? [['prayer', card.id]] : [['line', card.id], ['prayer', card.id]];
  for (const [kind, id] of tries) {
    try { const p = audio.status(kind, id, { tradition }); if (p && p.source === 'file') return { kind, id }; } catch { /* no clip */ }
  }
  return null;
}
