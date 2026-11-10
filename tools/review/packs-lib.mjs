// Reviewer-pack row builders, CSV and HTML writers. Read-only on data/: nothing here edits content.
import fs from 'node:fs';
import path from 'node:path';
import { PACKS, instructionsFor, REVIEWER_TYPES, HOW_TO_MARK, VERDICTS } from './instructions.mjs';
import { VOCAB_QUESTIONS, CORPUS_QUESTIONS, PRON_QUESTIONS, LINT_QUESTIONS, CALENDAR_QUESTIONS } from './questions.mjs';
import { loadVariants, ruleList, sampleFor, TRADITIONS, SAMPLE_PER_TRADITION, SAMPLE_SOURCE_LABEL } from './lib/pronrules.mjs';

export const COLUMNS = ['id', 'hebrew', 'transliteration', 'english', 'tradition', 'where_used', 'verdict', 'correction', 'notes'];
export const TRADS = ['israeli', 'sephardi', 'ashkenazi'];

const rd = (root, rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const has = (root, rel) => fs.existsSync(path.join(root, rel));
const s = (v) => (v == null ? '' : String(v));
const row = (id, hebrew, transliteration, english, tradition, where_used) =>
  ({ id, hebrew: s(hebrew), transliteration: s(transliteration), english: s(english), tradition: s(tradition), where_used: s(where_used), verdict: '', correction: '', notes: '' });

function lineUsage(root) {
  const m = new Map();
  const add = (lines, lid) => { for (const p of lines || []) { if (!m.has(p)) m.set(p, []); if (!m.get(p).includes(lid)) m.get(p).push(lid); } };
  for (const l of rd(root, 'data/curriculum/lessons.json').lessons) add(l.prayerLines, l.id);
  const dir = 'data/curriculum/lessons-intermediate';
  for (const f of fs.readdirSync(path.join(root, dir)).sort()) if (/^I-\d+\.json$/.test(f)) { const l = rd(root, `${dir}/${f}`); add(l.prayerLines, l.id); }
  return m;
}

function packCore(root) {
  const out = [];
  for (const l of rd(root, 'data/curriculum/lessons.json').lessons) {
    if (/^I-\d+$/.test(l.id)) continue; // intermediate lessons live in their own files and pack
    (l.words || []).forEach((w, i) => out.push(row(`core:${l.id}:w${i + 1}`, w.he, w.translit, w.en, 'unspecified', `Lesson ${l.id} (${l.track}, ${l.level}): ${l.title}`)));
  }
  return out;
}

function tr3(p) {
  if (!p) return '';
  const { israeli: i, sephardi: se, ashkenazi: a } = p;
  if (i && i === se) return `israeli=sephardi: ${i}; ashkenazi: ${a || ''}`;
  return `israeli: ${i || ''}; sephardi: ${se || ''}; ashkenazi: ${a || ''}`;
}

function packInter(root) {
  const out = [];
  const dir = 'data/curriculum/lessons-intermediate';
  for (const f of fs.readdirSync(path.join(root, dir)).sort()) {
    if (!/^I-\d+\.json$/.test(f)) continue;
    const l = rd(root, `${dir}/${f}`);
    (l.words || []).forEach((w, i) => out.push(row(`inter:${l.id}:w${i + 1}`, w.he, tr3(w.pronunciation) || w.translit, w.en, 'israeli+sephardi+ashkenazi', `Lesson ${l.id} (unit ${l.unit}): ${l.title}`)));
  }
  return out;
}

const isHidden = (w) => w && w.flags && typeof w.flags === 'object' && w.flags.hidden === true;
const qrow = (kind, id, text, where) => row(`q:${kind}:${id}`, '', '', text, 'question for the reviewer', where);

function packVocab(root) {
  const all = rd(root, 'data/vocab/words.json').words.filter((w) => w.frequencyRank != null);
  // Records the data hides from learners (flags.hidden) are not sent to reviewers: they are never shown.
  const ws = all.filter((w) => !isHidden(w));
  ws.sort((a, b) => a.frequencyRank - b.frequencyRank || (a.id < b.id ? -1 : 1));
  const out = ws.slice(0, 1000).map((w) => {
    const refs = [...(w.lessonRefs || [])];
    if (w.unlockLesson && !refs.includes(w.unlockLesson)) refs.unshift(w.unlockLesson);
    const where = `frequency rank ${w.frequencyRank}; theme ${w.topic}; pack ${w.pack || 'none'}; ${w.pos || 'pos ?'}; lessons: ${refs.join(', ') || 'none'}`;
    return row(`vocab:${w.id}`, w.he, w.translit, w.en, 'israeli', where);
  });
  // Replacement example sentences flagged for native review (flags.needsNativeReview on the example). The sentence is
  // Tatoeba text, unpointed, chosen by an English-gloss match: the question is whether the Hebrew sentence really uses the headword in that sense.
  for (const w of ws) {
    const e = w.example;
    if (!e || !e.flags || e.flags.needsNativeReview !== true) continue;
    out.push(row(`vocab-example:${w.id}`, e.he, '', `Headword ${w.he} (${w.en}). Example translation: ${e.en}`, 'israeli',
      `Example sentence for frequency rank ${w.frequencyRank}, flagged needsNativeReview. Is the sentence natural Hebrew, does it use this headword in this sense, and is it suitable for all ages?${e.note ? ' Note: ' + e.note : ''}`));
  }
  // Hidden records are listed by id only so the exclusion is visible.
  const hidden = all.filter(isHidden).sort((a, b) => a.frequencyRank - b.frequencyRank);
  if (hidden.length) out.push(qrow('vocab', 'hidden-excluded', `${hidden.length} vocabulary records are hidden from learners (flags.hidden) and are not in this pack: ${hidden.map((w) => w.id + ' (rank ' + w.frequencyRank + ')').join(', ')}. No action needed unless you think one should come back.`, 'data/vocab/words.json flags.hidden; docs/sensitivity/OPEN.md'));
  for (const [id, text] of VOCAB_QUESTIONS) out.push(qrow('sens', id, text, 'docs/sensitivity/OPEN.md (sensitive vocabulary senses and examples)'));
  for (const [id, text] of LINT_QUESTIONS) out.push(qrow('lint', id, text, 'docs/review/HEBREW-LINT-BASELINE.md'));
  return out;
}

function packCorpus(root) {
  const out = [];
  const usage = lineUsage(root);
  const meta = has(root, 'data/corpus/prayer-meta.json') ? rd(root, 'data/corpus/prayer-meta.json').entries : {};
  for (const e of rd(root, 'data/corpus/registry.json').entries) {
    const he = s(e.he).split('\n');
    const en = s(e.english).split('\n');
    const split = en.length === he.length;
    const m = meta[e.id] || {};
    const lessons = usage.get(e.id) || [];
    const where = `${e.ref}; ${e.title}; ${(m.service || []).join(', ') || 'not placed in a service'}${lessons.length ? '; lessons: ' + lessons.join(', ') : ''}`;
    he.forEach((line, i) => out.push(row(`corpus:${e.id}:l${i + 1}`, line, '', split ? en[i] : (i === 0 ? `[whole passage] ${s(e.english).replace(/\n/g, ' ')}` : ''), (e.nusach || 'verse text (no nusach)') + (/Metsudah/i.test(s(e.source)) ? ' [licence unverified: Metsudah 1981 source]' : ''), where)));
  }
  if (has(root, 'data/corpus/trope/table.json')) {
    const t = rd(root, 'data/corpus/trope/table.json');
    for (const m of t.prose) out.push(row(`trope:mark:${m.id}`, m.char ? `◌${m.char}` : '', `Ashkenazi: ${m.ashkenazi}; Sephardi: ${m.sephardi}`, `${m.cls}, ${m.placement}; names in Hebrew: ${m.ashkenaziHe} / ${m.sephardiHe}`, 'ashkenazi+sephardi', `Trope table, prose system, ${m.unicodePoint}`));
    for (const f of ['shema', 'priestly-blessing']) {
      const rel = `data/corpus/trope/${f}.json`;
      if (!has(root, rel)) continue;
      const tj = rd(root, rel);
      for (const v of tj.verses) out.push(row(`trope:${f}:${v.chapter}:${v.verse}`, v.raw, '', '', 'cantillation (UXLC)', `${v.ref}; cantillated verse for ${tj.title}`));
    }
  }
  for (const [id, text] of CORPUS_QUESTIONS) out.push(qrow('divine', id, text, 'docs/sensitivity/OPEN.md (divine-name forms awaiting clergy)'));
  return out;
}

// Pronunciation: the rule list, then a stratified sample per tradition (see lib/pronrules.mjs). The remaining
// ~6,600 derived respellings are produced by the same rules and are not sent row by row.
function packPron(root) {
  const out = [];
  const data = loadVariants(root);
  if (!data) return out;
  const samples = Object.fromEntries(TRADITIONS.map((t) => [t, sampleFor(data, t, SAMPLE_PER_TRADITION)]));
  for (const r of ruleList(root, data)) {
    const used = TRADITIONS.filter((t) => r.count[t] > 0);
    const ex = TRADITIONS.map((t) => samples[t].filter((x) => x.rules.includes(r.id)).sort((a, b) => s(a.rec.he).length - s(b.rec.he).length || (a.rec.id < b.rec.id ? -1 : 1))[0]).filter(Boolean);
    const first = ex[0];
    out.push(row(`pronrule:${r.id.replace(/[^A-Za-z0-9:.]+/g, '-').replace(/^-+|-+$/g, '')}`, first ? first.rec.he : '',
      first ? TRADITIONS.map((t) => `${t}: ${first.rec.variants[t]?.simple ?? ''}`).join(' | ') : '',
      `Rule ${r.id} (${r.kind}): ${r.label}. ${r.text} Records using it: ${used.length ? used.map((t) => `${t} ${r.count[t]}`).join(', ') : 'none in the current data'}.`,
      used.join('+') || 'none', `Rule list, docs/pronunciation/VARIANTS.md; rule id ${r.id}`));
  }
  for (const trad of TRADITIONS) for (const x of samples[trad]) {
    const r = x.rec, v = r.variants[trad];
    out.push(row(`pron:${r.source}:${r.id}:${trad}`, r.he, v.simple, r.en, trad, `rules: ${x.rules.join(', ')}; ${SAMPLE_SOURCE_LABEL[r.source] || r.source} ${r.id}${(r.flags || []).length ? `; flags: ${r.flags.join(', ')}` : ''}`));
  }
  for (const [id, text] of PRON_QUESTIONS) out.push(qrow('pron', id, text, 'docs/pronunciation/DOUBLING-POLICY.md'));
  return out;
}

function packSpeak(root) {
  const out = [];
  for (const d of rd(root, 'data/curriculum/dialogues.json').dialogues) {
    for (const l of d.lines) {
      const sp = (d.speakers || []).find((x) => x.id === l.speaker);
      out.push(row(`dlg:${l.id}`, l.he, l.translit, l.en, 'israeli', `Dialogue ${d.id} "${d.title}" (${d.level}, after ${d.unlockAfter}); speaker: ${sp ? sp.name : l.speaker}`));
    }
  }
  const dir = 'data/speak/sets';
  for (const f of fs.readdirSync(path.join(root, dir)).sort()) {
    if (!f.endsWith('.json')) continue;
    const st = rd(root, `${dir}/${f}`);
    for (const it of st.items) out.push(row(`speak:${st.id}:${it.id}`, it.he, it.translit, it.en, 'israeli', `Speaking set ${st.id} "${st.title}" (${st.level}); ${it.kind}`));
  }
  return out;
}

function packFest(root) {
  const out = [];
  for (const p of rd(root, 'data/festivals/vocab.json').packs) {
    for (const w of p.words) {
      out.push(row(`fest:${p.id}:${w.id}`, w.he, w.translit, w.en, 'israeli', `Festival ${p.id}; ${w.pos}`));
      if (w.line) out.push(row(`fest:${p.id}:${w.id}:line`, w.line.he, '', '', 'as in source line', `Festival ${p.id}; reading line for "${w.he}" from ${w.line.source} ${w.line.id}${w.line.title ? ` (${w.line.title})` : ''}`));
    }
  }
  for (const [id, text] of CALENDAR_QUESTIONS) out.push(qrow('cal', id, text, 'docs/review/ENGAGEMENT-CHECK.md; src/morning/plan.js ERAV_LATEST'));
  return out;
}

export function buildPack(root, pack) {
  switch (pack.key) {
    case 'core': return packCore(root);
    case 'inter': return packInter(root);
    case 'vocab': return packVocab(root);
    case 'corpus': return packCorpus(root);
    case 'speak': return packSpeak(root);
    case 'fest': return packFest(root);
    case 'pron-rules': return packPron(root);
    default: throw new Error('unknown pack ' + pack.key);
  }
}

export function buildAll(root) {
  return PACKS.map((p) => ({ ...p, rows: buildPack(root, p) }));
}

// Map id -> {pack, hebrew} over every pack (ids must be globally unique).
export function idIndex(all) {
  const m = new Map();
  for (const p of all) for (const r of p.rows) m.set(r.id, { pack: p.key, hebrew: r.hebrew });
  return m;
}

// ---- CSV ----
export function csvCell(v) {
  const t = s(v);
  return /[",\r\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
}
export function toCsv(rows) {
  const lines = [COLUMNS.join(',')];
  for (const r of rows) lines.push(COLUMNS.map((c) => csvCell(r[c])).join(','));
  return '﻿' + lines.join('\r\n') + '\r\n';
}
export function parseCsv(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const rows = [];
  let cur = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c;
    } else if (c === '"') q = true;
    else if (c === ',') { cur.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; cur.push(f); f = ''; rows.push(cur); cur = []; }
    else f += c;
  }
  if (f !== '' || cur.length) { cur.push(f); rows.push(cur); }
  return rows.filter((r) => r.some((x) => x.trim() !== ''));
}

// ---- HTML ----
export const esc = (v) => s(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const CSS = `
@page{size:A4 landscape;margin:12mm}
*{box-sizing:border-box}
body{font:12pt/1.35 Georgia,"Times New Roman",serif;color:#111;margin:0;padding:8mm}
h1{font-size:20pt;margin:0 0 4px}h2{font-size:14pt;margin:14px 0 4px}
.meta{color:#333;font-size:10pt;margin-bottom:8px}
.box{border:1px solid #444;padding:6px 10px;margin:8px 0;page-break-inside:avoid}
.box ul{margin:2px 0 4px 18px;padding:0}
.warn{border-left:6px solid #a00;background:#fbeaea}
table{border-collapse:collapse;width:100%;table-layout:fixed}
th,td{border:1px solid #555;padding:4px 6px;vertical-align:top;word-wrap:break-word;overflow-wrap:anywhere}
th{background:#e8e8e8;font-size:10pt;text-align:left}
thead{display:table-header-group}
tr{page-break-inside:avoid}
td.id{font:8pt/1.2 monospace;width:13%}
td.he{direction:rtl;text-align:right;font:28pt/1.4 "Ezra SIL","SBL Hebrew","Times New Roman","David",serif;width:17%}
td.tr{font-size:14pt;width:12%}td.en{font-size:13pt;width:13%}td.td{font-size:10pt;width:8%}td.wu{font-size:9pt;width:13%}
td.vd{font-size:12pt;width:7%;white-space:nowrap}td.co{width:10%}td.no{width:7%}
.vd span{display:block}
@media print{body{padding:0}.noprint{display:none}}
`;

function instrHtml(pack) {
  const ins = instructionsFor(pack);
  let h = `<div class="box"><b>How to mark (all reviewers)</b><ul>${HOW_TO_MARK.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
  h += `<h2>What to judge: ${esc(ins.title)}</h2>`;
  for (const t of Object.keys(REVIEWER_TYPES)) {
    const i = ins[t];
    h += `<div class="box"><b>${esc(REVIEWER_TYPES[t])}</b> (${i.role === 'primary' ? 'main reviewer for this pack' : i.role === 'optional' ? 'optional' : 'not needed'})<br>Judge:<ul>${i.judge.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>Do not judge:<ul>${i.skip.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
  }
  return h;
}

export function toHtml(pack, rows) {
  const head = COLUMNS.map((c) => `<th>${esc(c.replace('_', ' '))}</th>`).join('');
  const body = rows.map((r) => `<tr><td class="id">${esc(r.id)}</td><td class="he" dir="rtl" lang="he">${esc(r.hebrew)}</td><td class="tr">${esc(r.transliteration)}</td><td class="en">${esc(r.english)}</td><td class="td">${esc(r.tradition)}</td><td class="wu">${esc(r.where_used)}</td><td class="vd">${VERDICTS.map((v) => `<span>&#9744; ${v}</span>`).join('')}</td><td class="co"></td><td class="no"></td></tr>`).join('\n');
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>${esc(pack.title)} - reviewer pack ${esc(pack.num)}</title>
<meta name="viewport" content="width=device-width,initial-scale=1"><style>${CSS}</style></head><body>
<h1>${esc(pack.title)}</h1>
<div class="meta">Pack ${esc(pack.num)} &middot; ${rows.length} rows &middot; best first reviewer: ${esc(REVIEWER_TYPES[pack.first])} &middot; nothing in this pack has been reviewed by a native speaker or clergy; the app text is a draft.</div>
<div class="box warn">Write corrections in the correction column (or in the matching CSV). Do not rewrite the Hebrew column. The CSV with the same name is where answers are returned.</div>
${instrHtml(pack)}
<h2>Rows</h2>
<table><thead><tr>${head}</tr></thead><tbody>
${body}
</tbody></table>
</body></html>
`;
}

export function instructionsMd(all) {
  const L = ['# Reviewer instructions', '', 'Generated by `node tools/review/build-packs.mjs`. Nothing in the app has been reviewed by a native speaker, teacher or clergy yet (see STATUS.md).', '', '## How to mark', ''];
  for (const x of HOW_TO_MARK) L.push(`- ${x}`);
  L.push('', '## Reviewer types', '');
  for (const [k, v] of Object.entries(REVIEWER_TYPES)) L.push(`- \`${k}\`: ${v}`);
  L.push('', '## Packs', '', '| Pack | Rows | Best first reviewer |', '|---|---|---|');
  for (const p of all) L.push(`| ${p.num} ${p.title} (\`${p.file}.csv\`, \`${p.file}.html\`) | ${p.rows.length} | ${REVIEWER_TYPES[p.first]} |`);
  const seen = new Set();
  for (const p of all) {
    if (seen.has(p.family)) continue;
    seen.add(p.family);
    const ins = instructionsFor(p);
    L.push('', `## ${ins.title}`, '');
    for (const t of Object.keys(REVIEWER_TYPES)) {
      const i = ins[t];
      L.push(`### ${REVIEWER_TYPES[t]} (${i.role})`, '', 'Judge:', ...i.judge.map((x) => `- ${x}`), '', 'Do not judge:', ...i.skip.map((x) => `- ${x}`), '');
    }
  }
  return L.join('\n') + '\n';
}
