// Fluency chart for Timed read-aloud (B6): the learner's own timed reads of ONE line, oldest first, as a bar list (words a minute)
// with a table beside it. Reads of different lines are never mixed. Everything except the elapsed time is self-reported.
// One series, so no legend: the heading names it. Bars use the app's own accent token; the numbers sit in text ink beside them.
import { el } from '../curriculum/dom.js';

export const CHART_MAX_READS = 12;
const round = (x) => Math.round(x);
/** Rows for the last `max` reads of one text: {n, at, wpm, cleanWpm, stumbled, words}. reads = timedread.v1 reads for that text. */
export function fluencyRows(reads, max = CHART_MAX_READS) {
  return (reads || []).filter((r) => r && r.ms > 0 && r.words >= 1).slice(-max).map((r, i) => ({
    n: i + 1, at: Number(r.at) || 0, words: r.words, stumbled: r.stumbled,
    wpm: round(r.words / (r.ms / 60000)), cleanWpm: round(Math.max(0, r.words - r.stumbled) / (r.ms / 60000)),
  }));
}
const day = (ms) => { try { return ms ? new Date(ms).toISOString().slice(0, 10) : ''; } catch { return ''; } };
/** Plain change line between the first and last shown read. No verdict. */
export function changeLine(rows) {
  if (rows.length < 2) return 'One read so far. The chart fills in as you read this line again.';
  const a = rows[0], b = rows[rows.length - 1], d = b.wpm - a.wpm;
  return `From read 1 to read ${rows.length}: ${a.wpm} to ${b.wpm} words a minute (${d === 0 ? 'no change' : `${d > 0 ? 'up' : 'down'} ${Math.abs(d)}`}).`;
}

export const CSS = `
.rl-flu { display: grid; gap: .35rem; margin-block: .5rem; }
.rl-flu-row { display: grid; grid-template-columns: 4.5rem 1fr 5.5rem; gap: .5rem; align-items: center; font-variant-numeric: tabular-nums; }
.rl-flu-track { block-size: 14px; background: transparent; border-block-end: 1px solid var(--border); }
.rl-flu-bar { block-size: 12px; background: var(--focus, currentColor); border-radius: 0 4px 4px 0; min-inline-size: 2px; }
.rl-flu-num { font-size: .9rem; }
`;
/** The chart: a bar per read plus a details table (screen readers and print get the table). */
export function fluencyChart(reads) {
  const rows = fluencyRows(reads);
  if (!rows.length) return null;
  const top = Math.max(...rows.map((r) => r.wpm), 1);
  const bars = rows.map((r) => el('div', { class: 'rl-flu-row', title: `Read ${r.n}${day(r.at) ? `, ${day(r.at)}` : ''}: ${r.wpm} words a minute, ${r.stumbled} of ${r.words} words stumbled on` },
    el('span', { class: 'rl-flu-num' }, `Read ${r.n}`),
    el('span', { class: 'rl-flu-track', 'aria-hidden': 'true' }, el('span', { class: 'rl-flu-bar', style: `display:block;inline-size:${Math.max(2, Math.round((100 * r.wpm) / top))}%` })),
    el('span', { class: 'rl-flu-num' }, `${r.wpm} wpm`)));
  const table = el('table', {}, el('caption', {}, 'Your timed reads of this line, oldest first'),
    el('thead', {}, el('tr', {}, ...['Read', 'Date', 'Words a minute', 'Without stumbles', 'Stumbled'].map((h) => el('th', { scope: 'col' }, h)))),
    el('tbody', {}, ...rows.map((r) => el('tr', {}, el('td', {}, String(r.n)), el('td', {}, day(r.at)), el('td', {}, String(r.wpm)), el('td', {}, String(r.cleanWpm)), el('td', {}, `${r.stumbled} of ${r.words}`)))));
  return el('div', { class: 'rl-fluency' },
    el('h3', {}, 'Words a Minute, Read by Read'),
    el('div', { class: 'rl-flu', role: 'img', 'aria-label': `Bar chart of ${rows.length} reads: ${rows.map((r) => r.wpm).join(', ')} words a minute.` }, ...bars),
    el('p', {}, changeLine(rows)),
    el('details', {}, el('summary', {}, 'Show the numbers as a table'), table),
    el('p', { class: 'tdr-note' }, `Shows your last ${CHART_MAX_READS} reads at most. Speed is measured by the app's timer; stumbles are your own marks.`));
}
