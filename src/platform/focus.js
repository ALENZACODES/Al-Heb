// J5 Focus mode: one passage at a time from a little book (its pages), a prayer or text from the reader's registry, or a Torah
// chapter (its verses). Pure loaders over the app's own data; the divine name is shown as ה׳.
import { showName } from '../games/tg-core.js';

async function loadJSON(rel, fetchFn = globalThis.fetch) {
  const url = new URL(rel, import.meta.url);
  if (url.protocol === 'file:') { const { readFile } = await import('node:fs/promises'); return JSON.parse(await readFile(url, 'utf8')); }
  const r = await fetchFn(url); if (!r.ok) throw new Error(`${rel} HTTP ${r.status}`); return r.json();
}

/** "book:book1" | "text:shema-1" | "torah:genesis:1" -> {kind, id, chapter?} or null. */
export function parseSource(src) {
  const m = String(src || '').match(/^(book|text|torah):([a-z0-9-]{1,40})(?::(\d{1,3}))?$/i);
  if (!m) return null;
  if (m[1] === 'torah' && !m[3]) return null;
  return { kind: m[1], id: m[2], chapter: m[3] ? Number(m[3]) : null };
}

/** Passages of a source: {title, passages:[{he, en, label}]}. Throws when the source does not exist. */
export async function loadPassages(src, fetchFn) {
  const s = parseSource(src); if (!s) throw new Error('unknown source');
  if (s.kind === 'book') {
    const b = await loadJSON(`../../data/books/${s.id}.json`, fetchFn);
    return { title: b.titleEn || s.id, he: b.titleHe || '', passages: (b.pages || []).map((p, i) => ({ he: showName(p.he || ''), en: p.en || '', label: `Page ${p.n || i + 1}` })) };
  }
  if (s.kind === 'text') {
    const reg = await loadJSON('../../data/corpus/registry.json', fetchFn);
    const e = (reg.entries || []).find((x) => x.id === s.id); if (!e) throw new Error('unknown text');
    const lines = String(e.he || '').split(/\n+/).filter(Boolean);
    return { title: e.title, he: '', passages: lines.map((he, i) => ({ he: showName(he), en: i === 0 && lines.length === 1 ? (e.english || '') : '', label: lines.length > 1 ? `Line ${i + 1}` : e.ref || '' })) };
  }
  const ch = await loadJSON(`../../data/corpus/torah/${s.id}/${String(s.chapter).padStart(2, '0')}.json`, fetchFn);
  return { title: ch.ref || `${s.id} ${s.chapter}`, he: '', passages: (ch.verses || []).map((v) => ({ he: showName(v.he || ''), en: v.en || '', label: `Verse ${v.n}` })) };
}

export const SIZES = Object.freeze([['M', 2], ['L', 2.8], ['XL', 3.8]]);
/** The chrome focus mode hides (restored on leaving). */
export const FOCUS_CSS = `html[data-focus-mode] .site-header, html[data-focus-mode] .site-nav, html[data-focus-mode] .fine-print, html[data-focus-mode] .companions,
html[data-focus-mode] .rimon-companion, html[data-focus-mode] .sound-bar, html[data-focus-mode] .stat-toast { display: none !important; }
html[data-focus-mode] #main { max-inline-size: 60rem; margin-inline: auto; }
.fx-passage { line-height: 1.7; margin-block: 1.5rem; }`;
