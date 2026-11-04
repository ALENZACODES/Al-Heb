// HTML rendering of reviewer packets (large Hebrew, tick boxes, optional stroke diagrams).

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const lines = (s) => esc(s).replace(/\n/g, '<br>');
const heHtml = (s) => `<span lang="he" dir="rtl">${lines(s)}</span>`;

export const AREA_HELP = {
  'opening-prayer': 'English prayer written for the book. Please read each stanza and say whether it is acceptable, wrong, or needs rewording. The Hebrew words shown are the author\'s own pointing.',
  'prayers': 'Read each Hebrew text ALOUD while comparing with a printed siddur or Tanakh in the nusach named under it. Then tick ok / fix / unsure. Cards titled "meta:" are notes about where and how a prayer is used (clergy).',
  'prayer-prompts': 'Short one-line prompts shown to the learner each day. Check the Hebrew (and the feminine variant where shown) and the English gloss.',
  'prayer-guide': 'Prose guide to a Shabbat-morning service. Check order, description and the claims about each stream of Judaism.',
  'lessons': 'Each row is a lesson title/goals line or one lesson word. Read the word aloud: pointing, gloss, naturalness. The transliteration is produced by the app and is only a check on the pointing.',
  'dialogues': 'Each row is one spoken line. The speaker is in square brackets: check gender agreement for THAT speaker.',
  'gender-pairs': 'Two lines per row: masculine form first, feminine second.',
  'loanwords': 'Is each word in ordinary Israeli use with this meaning? Pointing and gloss.',
  'hints': 'Short English hints shown to learners after a mistake. Check the claims about Hebrew.',
  'phrasebook': 'Everyday phrases for travellers. Check pointing, naturalness, register, and gender where it applies.',
  'letter-strokes': 'Grey = letter outline. Coloured line = pen path; numbered dot = where each stroke starts; arrow = direction. Is the shape, stroke count, order and direction what Israeli schools teach?',
  'mnemonics': 'Memory hooks for each letter. The Hebrew shown is the example word. Check its pointing and meaning, and the claim about what the letter name means.',
  'pron-soundgap': 'Pronunciation lab. Rows with two Hebrew lines are word pairs that differ in one sound.',
  'pron-prayerwords': 'Three English respellings of the same word. CAPITALS mark the stressed syllable.',
  'pron-vowels': 'Vowel/consonant data, plene-vs-defective spelling pairs, stress exceptions and mouth hints.',
  'calendar': 'Holiday and month names shown in the calendar view.',
  'vocab-top1000': 'The 1000 most frequent words. Read each word aloud: is the POINTING right and is the English gloss right for modern Israeli Hebrew?',
  'vocab-rest': 'Ranks 1001 to 5000. Sheet only (no PDF) because it is phase two.',
};

const CSS = `
@page { size: Letter; margin: 0.6in 0.6in 0.7in 0.6in; }
* { box-sizing: border-box; }
html { font-family: "Helvetica Neue", Arial, sans-serif; color: #111; }
body { margin: 0; font-size: 10.5pt; line-height: 1.35; }
h1 { font-size: 18pt; margin: 0 0 4pt; }
.meta { color: #444; font-size: 9.5pt; margin-bottom: 8pt; }
.howto { border: 1px solid #999; padding: 6pt 9pt; margin: 8pt 0 12pt; font-size: 10pt; background: #f6f6f6; }
.howto ul { margin: 3pt 0 0 14pt; padding: 0; }
[lang="he"] { font-family: "Frank Ruhl Libre", "Noto Serif Hebrew", "David", "Times New Roman", serif; }
.card { border: 1.2px solid #333; border-radius: 4pt; padding: 8pt 10pt 8pt; margin: 0 0 11pt; break-inside: avoid; page-break-inside: avoid; }
.card header { display: flex; justify-content: space-between; font-size: 8.5pt; color: #555; margin-bottom: 3pt; gap: 8pt; }
.card .id { font-family: "DejaVu Sans Mono", monospace; font-weight: bold; color: #000; }
.card .flags { text-align: right; }
.card .he { font-size: 27pt; line-height: 1.75; margin: 2pt 0 2pt; text-align: right; }
.card .tr { font-style: italic; color: #333; margin-bottom: 3pt; }
.card .en { margin-bottom: 4pt; }
.card .chk { font-size: 9pt; color: #333; border-top: 1px dotted #999; padding-top: 3pt; margin-top: 3pt; }
.card .mark, .mark { font-size: 11pt; margin-top: 6pt; }
.card .corr { border-bottom: 1px solid #333; height: 22pt; margin-top: 2pt; }
.card .corr span { font-size: 8pt; color: #666; }
.card svg { width: 2.3in; height: 2.3in; float: left; margin: 2pt 10pt 4pt 0; background: #fff; border: 1px solid #ccc; }
.card .strokebox { overflow: hidden; }
.card .strokebox .he { font-size: 64pt; line-height: 1.2; text-align: left; }
.card.long .he { font-size: 21pt; line-height: 1.7; }
.cb { display: inline-block; width: 11pt; height: 11pt; border: 1.3px solid #000; vertical-align: -1.5pt; margin: 0 3pt 0 9pt; }
table { width: 100%; border-collapse: collapse; }
thead { display: table-header-group; }
th { text-align: left; font-size: 8.5pt; border-bottom: 1.5px solid #000; padding: 2pt 4pt; }
td { vertical-align: top; border-bottom: 1px solid #bbb; padding: 4pt 4pt; }
tr { break-inside: avoid; page-break-inside: avoid; }
td.n { width: 0.85in; font-size: 8pt; color: #666; white-space: nowrap; }
td.he { width: 2.1in; font-size: 23pt; line-height: 1.6; text-align: right; padding-right: 10pt; }
td.tr { width: 1.35in; font-style: italic; font-size: 10pt; color: #333; }
td.en { font-size: 10pt; }
td.mk { width: 1.55in; font-size: 9pt; white-space: nowrap; }
td.mk .cb { margin: 0 2pt 0 4pt; }
.idc { display: block; font-family: "DejaVu Sans Mono", monospace; font-size: 6.5pt; color: #777; white-space: nowrap; }
.small { font-size: 8.5pt; color: #555; }
`;

function fontFace(fontHref) {
  if (!fontHref) return '';
  return `@font-face { font-family: "Frank Ruhl Libre"; src: url("${fontHref}"); font-weight: 300 900; }`;
}

function cardHtml(it, long) {
  const flagTxt = [...new Set(it.flags.map((f) => f.split(':')[0]))].slice(0, 4).join(', ');
  return `<section class="card${long ? ' long' : ''}">
<header><span class="id">${esc(it.id)}</span><span class="flags">P${it.priority} &middot; flagged: ${esc(flagTxt)}</span></header>
${it.svg ? `<div class="strokebox">${it.svg}<div>` : ''}
${it.he ? `<div class="he">${heHtml(it.he)}</div>` : ''}
${it.translit ? `<div class="tr">${lines(it.translit)}</div>` : ''}
${it.en ? `<div class="en">${lines(it.en)}</div>` : ''}
${it.svg ? '</div></div>' : ''}
<div class="chk"><b>Check:</b> ${esc(it.check)}</div>
<div class="mark"><span class="cb"></span>ok <span class="cb"></span>fix <span class="cb"></span>unsure</div>
<div class="corr"><span>Correction / notes:</span></div>
</section>`;
}

function rowHtml(it, n) {
  return `<tr><td class="n">${n}<span class="idc">${esc(it.id.replace(/^[^:]+:/, ''))}</span></td>
<td class="he">${it.he ? heHtml(it.he) : ''}</td><td class="tr">${lines(it.translit)}</td><td class="en">${lines(it.en)}</td>
<td class="mk"><span class="cb"></span>ok<span class="cb"></span>fix<span class="cb"></span>?</td></tr>`;
}

/** Full HTML document for one area. */
export function renderArea(area, items, opts = {}) {
  const hours = opts.hours != null ? `${opts.hours.toFixed(1)} h estimated` : '';
  const long = items.some((i) => (i.he || '').length > 160);
  const body = area.layout === 'cards'
    ? items.map((it) => cardHtml(it, long && (it.he || '').length > 160)).join('\n')
    : `<table><thead><tr><th>#</th><th style="text-align:right;padding-right:10pt">Hebrew</th><th>Transliteration</th><th>English / notes</th><th>Status</th></tr></thead><tbody>
${items.map((it, i) => rowHtml(it, i + 1)).join('\n')}</tbody></table>`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${esc(area.title)}</title>
<style>${fontFace(opts.fontHref)}${CSS}</style></head><body>
<h1>${esc(String(area.n).padStart(2, '0'))}. ${esc(area.title)}</h1>
<div class="meta">Priority ${area.priority} &middot; ${items.length} item${items.length === 1 ? '' : 's'} &middot; ${esc(hours)} &middot; suggested reviewer: ${esc(area.reviewer)}</div>
<div class="howto"><b>How to use this printout.</b> ${esc(AREA_HELP[area.slug] || '')}
<ul><li>Read the Hebrew aloud. Tick <b>ok</b> only if you would put your name to it; <b>fix</b> if you can give the right text; <b>unsure</b> if you cannot tell.</li>
<li>The record of your answers is the matching <b>CSV sheet</b> (same ids), not this page. Use this page for reading and for notes on paper.</li>
<li>Items are in the order of the sheet. Please do not guess: "unsure" is a useful answer.</li></ul></div>
${body}
</body></html>`;
}

export function renderIndex(manifest) {
  const rows = manifest.areas.map((a) => `<tr><td>${a.n}</td><td>P${a.priority}</td><td><b>${esc(a.title)}</b><br><span class="small">${esc(a.reviewer)}</span></td><td style="text-align:right">${a.items}</td><td style="text-align:right">${a.hours.toFixed(1)}</td><td>${[a.files.csv && `<a href="${a.files.csv}">sheet (CSV)</a>`, a.files.html && `<a href="${a.files.html}">printable HTML</a>`, a.files.pdf && `<a href="${a.files.pdf}">PDF</a>`].filter(Boolean).join(' &middot; ')}</td></tr>`).join('\n');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>ALEF reviewer packets</title><style>${CSS} body{margin:24px;max-width:1000px} td,th{font-size:10pt}</style></head><body>
<h1>ALEF reviewer packets</h1>
<div class="meta">Generated ${esc(manifest.generated)} &middot; ${manifest.totalItems} items &middot; about ${manifest.totalHours.toFixed(1)} hours in total (phase one, priority 1-6: ${manifest.phaseOneHours.toFixed(1)} h). See docs/review/README.md for how to hand these out.</div>
<table><thead><tr><th>#</th><th>Pri</th><th>Area / suggested reviewer</th><th>Items</th><th>Est. hours</th><th>Files</th></tr></thead><tbody>${rows}</tbody></table>
</body></html>`;
}
