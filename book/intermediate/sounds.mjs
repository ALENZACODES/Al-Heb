// Reference chapter "Sounds of three traditions": a summary of docs/pronunciation/VARIANTS.md (the rules table, stress notes, checked examples
// and what is not done), read at build time so the chapter cannot drift from the document. Examples are looked up in the rule-generated
// shards of data/pronunciation/variants when present. Draft: rule-generated, no native-speaker review, no recordings.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, readJson } from '../content.mjs';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const SOUNDS_ID = 'ch-sounds';
const plain = (s) => s.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').replace(/`([^`]+)`/g, '$1').replace(/\s+/g, ' ').trim();
/** First sentence/clause of a note, cut near `max` characters at a word boundary. */
export function summarize(s, max = 110) {
  const t = plain(s); const m = t.match(/^(.{20,}?[.;])(\s|$)/); const first = m ? m[1].replace(/[.;]$/, '') : t;
  if (first.length <= max) return first;
  const cut = first.slice(0, max); return cut.replace(/\s+\S*$/, '') + '…';
}
const he = (s) => `<span class="he" lang="he" dir="rtl">${esc(s)}</span>`;

/** Parse the markdown doc: rules table rows, stress bullets, not-done bullets, status line. */
export function parseVariantsDoc(md) {
  const lines = md.split('\n');
  const status = plain((md.match(/\*\*Status:([^]*?)\*\*/) ?? [])[1] ?? '');
  const tableStart = lines.findIndex((l) => /^\| Sign \|/.test(l));
  const rules = [];
  for (let i = tableStart + 2; i < lines.length && lines[i].startsWith('|'); i++) {
    const c = lines[i].split(/ \| /).map((x) => x.replace(/^\|\s*|\s*\|$/g, '').trim());
    if (c.length >= 5) rules.push({ sign: plain(c[0]), israeli: plain(c[1]), sephardi: plain(c[2]), ashkenazi: plain(c[3]), note: summarize(c.slice(4).join(' | ').replace(/^[`\w.-]+\.json(,? ?[`\w.-]+\.json)*[`;,.\s]*/, '')) });
  }
  const section = (h) => { const s = lines.findIndex((l) => l.startsWith(h)); if (s < 0) return []; const out = []; for (let i = s + 1; i < lines.length && !/^#{2,3} /.test(lines[i]); i++) out.push(lines[i]); return out; };
  const bullets = (ls) => { const out = []; for (const l of ls) { if (/^- /.test(l)) out.push(l.slice(2)); else if (/^\s+\S/.test(l) && out.length) out[out.length - 1] += ' ' + l.trim(); } return out; };
  const stress = bullets(section('### Stress')).map((b) => ({ lead: plain((b.match(/^\*\*([^*]+)\*\*/) ?? [])[1] ?? '').replace(/:$/, ''), text: summarize(b.replace(/^\*\*[^*]+\*\*:?\s*/, ''), 190) }));
  const notDone = bullets(section('## Not done')).map((b) => summarize(b, 150));
  return { status, rules, stress, notDone };
}

function findExamples() {
  const want = ['שַׁבָּת', 'תּוֹרָה', 'בְּרֵאשִׁית']; const out = [];
  for (const f of ['_vocab-1', '_vocab-2', '_vocab-3', '_vocab-4', '_corpus-1']) {
    const p = `data/pronunciation/variants/${f}.json`; if (!existsSync(join(ROOT, p))) continue;
    for (const r of readJson(p).records) if (want.includes(r.he) && !out.some((o) => o.he === r.he)) out.push({ he: r.he, en: r.en, v: r.variants });
    if (out.length === want.length) break;
  }
  return want.map((w) => out.find((o) => o.he === w)).filter(Boolean);
}

export function soundsChapter() {
  const p = join(ROOT, 'docs/pronunciation/VARIANTS.md'); if (!existsSync(p)) return { html: '', model: null };
  const d = parseVariantsDoc(readFileSync(p, 'utf8')); const ex = findExamples();
  const html = `<section class="chapter" id="${SOUNDS_ID}"><h2>Sounds of three traditions</h2><p class="draft-flag">DRAFT &mdash; rule-generated; no native speaker has checked it</p>
<p>The same page of Hebrew is read aloud in three main ways. <b>Israeli</b> is the speech of Israel today. <b>Sephardi</b> is the liturgical reading of Spanish-Portuguese and Mizrahi communities. <b>Ashkenazi</b> is the older Central and Eastern European liturgical reading. They share the letters and the vowel signs; they differ in a handful of sounds and in where the stress falls. This chapter summarises the rules the course uses to show all three side by side (full text: docs/pronunciation/VARIANTS.md). ${esc(d.status)}</p>
<h3>The rules at a glance</h3>
<table class="grid snd"><thead><tr><th>Sign</th><th>Israeli</th><th>Sephardi</th><th>Ashkenazi</th><th>Note</th></tr></thead><tbody>${d.rules.map((r) => `<tr><td><b>${esc(r.sign)}</b></td><td>${esc(r.israeli)}</td><td>${esc(r.sephardi)}</td><td>${esc(r.ashkenazi)}</td><td class="small">${esc(r.note)}</td></tr>`).join('')}</tbody></table>
<p class="small">Values are IPA symbols, broadly: &#659; is the French or Israeli r, &#967; the ch of Bach, &#295; a throaty h, &#661; a throaty ayin, &#660; a glottal stop, &#596; the vowel of &ldquo;saw&rdquo;, &#601; a very short e; &empty; means silent.</p>
<h3>Stress</h3><ul class="snd-list">${d.stress.map((s) => `<li><b>${esc(s.lead)}.</b> ${esc(s.text)}</li>`).join('')}</ul>
${ex.length ? `<h3>Three words, three readings</h3><table class="grid snd"><thead><tr><th>Hebrew</th><th>Meaning</th><th>Israeli</th><th>Sephardi</th><th>Ashkenazi</th></tr></thead><tbody>${ex.map((e) => `<tr><td>${he(e.he)}</td><td>${esc(e.en ?? '')}</td>${['israeli', 'sephardi', 'ashkenazi'].map((t) => `<td>${esc(e.v[t].simple)}<div class="small">${esc(e.v[t].ipa)}</div></td>`).join('')}</tr>`).join('')}</tbody></table>` : ''}
<h3>What is not done yet</h3><ul class="snd-list">${d.notDone.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></section>`;
  return { html, model: d };
}

export const SOUNDS_CSS = `.snd td,.snd th{font:8.4pt/1.25 var(--ui-font);padding:2pt 4pt}.snd .he{font-size:14pt}.snd-list{font:9pt/1.35 var(--ui-font);margin:2pt 0 6pt 14pt;padding:0}`;
