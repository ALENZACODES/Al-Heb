// @ts-check
// Data access for the Torah-reading course. Browser: fetch relative to this module. Node: read from disk.
// Hebrew text for prayers comes from the corpus registry (src/corpus/corpus.js); this module only adds the course files.
import { loadCorpus } from '../corpus/corpus.js';
import { wordsOfLine } from './pointing.js';

const BASE = new URL('../../data/torahread/', import.meta.url);

async function readJson(name, base = BASE) {
  const url = new URL(name, base);
  if (typeof process !== 'undefined' && process.versions?.node && url.protocol === 'file:') {
    const fs = await import('node:fs/promises');
    return JSON.parse(await fs.readFile(url, 'utf8'));
  }
  const r = await fetch(url);
  if (!r.ok) throw new Error(`torahread: ${name} -> HTTP ${r.status}`);
  return r.json();
}

/**
 * Load every file of the course plus the corpus.
 * @param {{base?: URL, corpusBase?: URL, corpus?: any}} [opts]
 */
export async function loadTorahRead(opts = {}) {
  const base = opts.base ?? BASE;
  const [ladder, verses, words30, aliyah, trope, corpus] = await Promise.all([
    readJson('ladder.json', base), readJson('verses.json', base), readJson('words30.json', base),
    readJson('aliyah.json', base), readJson('trope.json', base),
    opts.corpus ?? loadCorpus(opts.corpusBase ? { base: opts.corpusBase } : {}),
  ]);
  return buildCourse({ ladder, verses, words30, aliyah, trope, corpus });
}

/**
 * Pure: resolve ladder items to display records.
 * Each item: {key, kind, id, title, ref, he, lines[], english, englishLines[], source, license, attribution, englishSource,
 *             englishLicense, audio:{kind,id}, wordAudioIds[], proofread, hasDivineName}
 */
export function buildCourse({ ladder, verses, words30, aliyah, trope, corpus }) {
  const verseBy = new Map(verses.entries.map((v) => [v.id, v]));
  /** @param {any} rec @param {string} key @param {string} kind */
  const toItem = (rec, key, kind, extra = {}) => {
    const lines = rec.he.split('\n');
    const enLines = String(rec.english ?? '').split('\n');
    return {
      key, kind, id: rec.id, title: rec.title || rec.ref, ref: rec.ref, he: rec.he, lines,
      english: rec.english, englishLines: enLines.length === lines.length ? enLines : [String(rec.english ?? '')],
      source: rec.source, license: rec.license, attribution: rec.attribution, englishSource: rec.englishSource,
      englishLicense: rec.englishLicense, proofread: !!rec.proofread, status: rec.status ?? 'draft',
      wordCount: lines.reduce((n, l) => n + wordsOfLine(l).length, 0), ...extra,
    };
  };
  const groups = ladder.groups.map((g) => ({
    id: g.id, title: g.title, intro: g.intro,
    items: g.items.map((it) => {
      if (it.kind === 'registry') {
        const rec = corpus.getText(it.id);
        if (!rec) throw new Error(`torahread: registry id not found: ${it.id}`);
        return toItem(rec, it.id, 'registry', { audio: { kind: 'prayer', id: rec.id }, wordAudioPrefix: rec.id });
      }
      const v = verseBy.get(it.id);
      if (!v) throw new Error(`torahread: verse not found: ${it.id}`);
      return toItem(v, v.id, 'verse', { title: v.ref, audio: { kind: 'prayer', id: 'torahread-' + v.id }, note: v.note });
    }),
  }));
  const items = groups.flatMap((g) => g.items.map((i) => ({ ...i, group: g.id })));
  return { ladder, groups, items, itemByKey: new Map(items.map((i) => [i.key, i])), verses, words30, aliyah, trope, corpus };
}
