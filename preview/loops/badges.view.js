// Badges on /daily and after a finished lesson: the shelf (earned, and "next" described gently), the tier, and a calm card for
// a newly earned badge. Everything is local. The catalogue is a small JSON file read once from this site's own files, the first
// time it is needed; nothing is sent anywhere, nothing plays on its own, and a badge never costs, expires or ranks anyone.
import { load, save, withBadges, clean } from './store.js';
import { refresh, buildModel } from './sync.js';
import { unitFor, evaluate, factsFrom, shelf, shelfText, badgePlan, tierFor, shownTier, lifetimePoints } from './badges.js';
import { artFor } from './badges.art.js';
import { dayKey } from '../../src/curriculum/streak.js';

export const MAX_CARDS = 3;
export const CSS = `
.lp .bd-tier progress { inline-size: 100%; max-inline-size: 18rem; block-size: .8rem; }
.lp .bd-list { list-style: none; padding: 0; display: grid; gap: .75rem; }
.lp .bd-item { display: flex; gap: .75rem; align-items: flex-start; }
.lp .bd-item p { margin: 0 0 .25rem; }
.lp .bd-art { flex: none; display: block; }
.lp .bd-item[data-level="0"] .bd-name { font-weight: normal; }
.lp .bd-name { font-weight: 600; }
.lp textarea { inline-size: 100%; box-sizing: border-box; font: inherit; color: inherit; background: var(--card); border: 1px solid var(--border); border-radius: 6px; padding: .4rem; }
.lp-cele .bd-new { display: flex; gap: .75rem; align-items: flex-start; margin-block: .5rem; }
`;

/** The catalogue: given by the page (tests), or read once from this folder. Resolves to null if it cannot be read; the page then says so. */
export async function loadCatalog(ctx) {
  if (ctx && ctx.badgeCatalog) return ctx.badgeCatalog;
  try {
    const get = (ctx && ctx.fetch) || globalThis.fetch;
    const res = await get(new URL('./badges.catalog.json', import.meta.url));
    return res && res.ok ? await res.json() : null;
  } catch { return null; }
}

/**
 * Evaluate, write the record if badges or counts changed, and say what is new. Never throws.
 * @returns {{catalog, badges, facts, points, shelf, unseen:Array<{id,level}>, tierUp, model}|null}
 */
export function settle(store, catalog, now, { offline = false, snapNow = null } = {}) {
  try {
    if (!catalog || !Array.isArray(catalog.badges)) return null;
    const today = dayKey(now);
    const { rec: synced, snap } = refresh(store);
    let rec = synced;
    if (offline && !rec.badges.offlineDays.includes(today)) rec = withBadges(rec, { ...rec.badges, offlineDays: [...rec.badges.offlineDays, today] });
    const model = buildModel(rec, snapNow || snap, now);
    const facts = factsFrom({ snap: snapNow || snap, rec, rhythm: model.rhythm });
    const res = evaluate({ catalog, facts, rec, today });
    const seen = new Set(res.badges.announced);
    const unseen = [];
    for (const [id, lv] of Object.entries(res.badges.earned)) for (const n of [1, 2, 3]) if (lv[n] && !seen.has(`${id}:${n}`)) unseen.push({ id, level: n });
    const shown = unseen.slice(0, MAX_CARDS);
    const announced = [...res.badges.announced, ...unseen.map((u) => `${u.id}:${u.level}`)];
    const next = withBadges(rec, { ...res.badges, announced });
    if (JSON.stringify(next.badges) !== JSON.stringify(load(store).badges)) save(store, next);
    const points = lifetimePoints(next.days, next.badges.base);
    return { catalog, badges: clean(next).badges, facts, points, shelf: shelf(catalog, next.badges, facts), unseen: shown, unseenMore: Math.max(0, unseen.length - shown.length), tierUp: res.tierUp, model };
  } catch { return null; }
}

const mk = (h, html) => { const s = h('span', {}); s.innerHTML = html; return s; };

/** The calm card for new badges. role=status so a screen reader reads it once, politely. Focus is not moved. */
export function newBadgeNode(h, s, { quiet = false, soundOn = false } = {}) {
  const plan = badgePlan({ newly: s.unseen, catalog: s.catalog, quiet, soundOn, tierUp: s.tierUp });
  if (!plan.items.length && !plan.tierLine) return { node: null, plan };
  const by = new Map(s.catalog.badges.map((b) => [b.id, b]));
  const node = h('section', { class: 'lp-cele', role: 'status', 'aria-live': 'polite', 'data-motion': plan.motion, 'data-badges': 'new' },
    h('h3', {}, plan.items.length === 1 ? 'New badge' : plan.items.length ? 'New badges' : 'New tier'),
    ...plan.items.map((i) => h('div', { class: 'bd-new' }, mk(h, artFor(by.get(i.id), i.level, { uid: `bd-new-${i.id}-${i.level}`, levelNames: s.catalog.levelNames, size: 64 })),
      h('div', {}, h('p', { class: 'bd-name' }, `${i.name}: ${i.levelName} (${i.threshold})`), h('p', {}, i.text)))),
    s.unseenMore ? h('p', {}, `${s.unseenMore} more ${s.unseenMore === 1 ? 'badge is' : 'badges are'} on your shelf below.`) : null,
    plan.tierLine ? h('p', {}, plan.tierLine) : null);
  return { node, plan };
}

/** The Badges section: tier, shelf by family, and a plain-text summary to copy. */
export function shelfNode(h, s, { onCopy } = {}) {
  const cat = s.catalog, t = shownTier(cat, s.points, s.badges.tier), nx = t.next;
  const tierBlock = h('div', { class: 'bd-tier' },
    h('p', { id: 'bd-tier-line', style: 'font-weight:600;margin:0' }, `Tier: ${t.tier.name}`),
    h('p', { style: 'margin:.25rem 0' }, `${t.tier.line} You have ${s.points} lifetime points.${nx ? ` The next tier, ${nx.name}, starts at ${nx.min}.` : ' This is the highest tier.'}`),
    nx ? h('progress', { max: String(nx.min - t.tier.min), value: String(Math.min(nx.min - t.tier.min, Math.max(0, s.points - t.tier.min))), 'aria-label': `Progress from ${t.tier.name} to ${nx.name}: ${Math.max(0, s.points - t.tier.min)} of ${nx.min - t.tier.min} points` }) : null);
  const fams = cat.families.map((f) => {
    const rows = s.shelf.filter((r) => r.family === f.id && (!r.hidden || r.level > 0));
    if (!rows.length) return null;
    const by = new Map(cat.badges.map((b) => [b.id, b]));
    return h('div', { 'data-family': f.id }, h('h3', {}, f.name), h('ul', { class: 'bd-list' }, ...rows.map((r) => h('li', { class: 'bd-item', 'data-badge': r.id, 'data-level': String(r.level) },
      mk(h, artFor(by.get(r.id), r.level, { uid: `bd-${r.id}`, levelNames: cat.levelNames })),
      h('div', {}, h('p', { class: 'bd-name' }, r.level ? `${r.name}: ${r.levelName} (${r.threshold})` : r.name),
        r.level ? h('p', {}, `${r.earnText} Earned ${r.since}.`) : null,
        r.next ? h('p', { class: 'muted' }, r.level ? r.next.text : `Next: ${r.next.levelName} at ${r.next.threshold} ${unitFor(r.next.threshold, by.get(r.id).unit)}. You are at ${r.next.have}.`) : h('p', { class: 'muted' }, 'All three levels earned.'))))));
  }).filter(Boolean);
  const text = shelfText(cat, s.badges, s.points);
  return h('section', { class: 'card', 'aria-labelledby': 'lp-h-badges', id: 'lp-badges' }, h('h2', { id: 'lp-h-badges' }, 'Badges'),
    h('p', {}, 'Badges are earned, never lost, never bought and never compared with anyone. Each has three levels: First, Steady and Deep. The frame shape and the dots show the level, and the words say it too.'),
    tierBlock, ...fams,
    h('p', { class: 'muted' }, 'A few quiet badges are not listed until you earn them. Tiers and thresholds are early guesses and have not been tried with learners.'),
    h('details', {}, h('summary', {}, 'Share my badges as text'),
      h('p', {}, 'A plain-text summary you can copy. Nothing is uploaded.'),
      h('textarea', { id: 'bd-text', readonly: '', rows: String(Math.min(14, text.split('\n').length + 1)), 'aria-label': 'Badge summary text' }, text),
      h('button', { type: 'button', class: 'btn secondary', id: 'bd-copy', onclick: () => onCopy && onCopy(text) }, 'Copy as text')));
}

/** Copy text with the clipboard if the browser offers it. Resolves to true or false. */
export async function copyText(text, nav = globalThis.navigator) {
  try { if (nav && nav.clipboard && nav.clipboard.writeText) { await nav.clipboard.writeText(text); return true; } } catch { /* fall through */ }
  return false;
}
