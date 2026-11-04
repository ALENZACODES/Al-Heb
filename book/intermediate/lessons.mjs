// Book chapters "Intermediate: In the synagogue" (read-track lessons) and "Intermediate: In Israel" (israel-track lessons) built from
// data/curriculum/lessons-intermediate/I-*.json. Each lesson is a 2-page spread: page 1 = goals + words with niqqud and pronunciation
// (Israeli | Sephardi | Ashkenazi where the data has all three, Israeli only otherwise), page 2 = six practice items. The answers for every
// lesson are collected in the answer key at the back (answerKeyChapter). Every Hebrew string comes from the lesson files or, for the
// "fade" items, from data/corpus/registry.json. Draft: not reviewed by a Hebrew teacher. Pure functions; no I/O except readJson.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, readJson, registryEntries } from '../content.mjs';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const he = (s, cls = '') => `<span class="he ${cls}" lang="he" dir="rtl">${esc(s)}</span>`;
export const TRACKS = {
  read: { id: 'ch-inter-syn', title: 'Intermediate: In the synagogue', scene: 'BG_synagogue', blurb: 'Twenty lessons on the texts you hear and say in a service: the Shema and its blessings, the Amidah, the Torah service, Kaddish, Kiddush, Havdalah, the festivals and the blessings around a meal.' },
  israel: { id: 'ch-inter-isr', title: 'Intermediate: In Israel', scene: 'BG_telaviv', blurb: 'Thirty lessons for daily life in Israel: transport, shopping, cafes, health, money, work, study and small talk. Modern spoken Hebrew, so only the Israeli pronunciation is given.' }
};
export const TRADITIONS = [['israeli', 'Israeli'], ['sephardi', 'Sephardi'], ['ashkenazi', 'Ashkenazi']];
export const ITEMS_PER_LESSON = 6;
const PRIORITY = ['fade', 'order', 'produce', 'respond', 'recall', 'match', 'gender', 'register'];

export function loadLessons() {
  const dir = join(ROOT, 'data/curriculum/lessons-intermediate');
  let files; try { files = readdirSync(dir).filter((f) => /^I-\d+\.json$/.test(f)).sort(); } catch { return []; }
  return files.map((f) => readJson('data/curriculum/lessons-intermediate/' + f)).filter(Boolean);
}

/** Deterministic shuffle (seeded by a string) that never returns the input order when there are 2+ distinct items. */
export function shuffle(arr, seed) {
  let h = 2166136261; for (const c of String(seed)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  const rnd = () => { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return h / 4294967296; };
  for (let tries = 0; tries < 20; tries++) {
    const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    if (a.some((x, i) => x !== arr[i]) || new Set(arr).size < 2) return a;
  }
  return arr.slice().reverse();
}

let regCache = null;
/** Registry text for an exercise `line` id: `<entry>` or `<entry>-l<n>` (one line of a multi-line entry). Null if unknown. */
export function registryText(line) {
  regCache ??= new Map(registryEntries().map((e) => [e.id, e]));
  if (regCache.has(line)) return regCache.get(line).he;
  const m = String(line).match(/^(.*)-l(\d+)$/); const e = m && regCache.get(m[1]);
  return e ? (e.he.split('\n')[Number(m[2]) - 1] ?? null) : null;
}

function usable(ex) {
  switch (ex.type) {
    case 'fade': return !!registryText(ex.line) && !!ex.en;
    case 'order': return typeof ex.he === 'string' && ex.he.trim().split(/\s+/).length >= 3;
    case 'produce': return Array.isArray(ex.options) && ex.options.length >= 2 && Number.isInteger(ex.answer) && !!ex.options[ex.answer];
    case 'respond': return !!ex.cue && !!ex.answer?.he;
    case 'recall': return !!ex.he && !!ex.en;
    case 'match': return Array.isArray(ex.pairs) && ex.pairs.length >= 3;
    case 'gender': return !!ex.m && !!ex.f;
    case 'register': return !!ex.he && Array.isArray(ex.options) && ex.options.includes(ex.answer);
    default: return false;
  }
}

/** Six practice items for a lesson: one of each type in PRIORITY order, then second picks, all from the lesson's own exercises. */
export function pickItems(lesson) {
  const ok = (lesson.exercises ?? []).filter(usable); const used = new Set(); const out = [];
  for (const round of [0, 1, 2]) for (const t of PRIORITY) {
    if (out.length >= ITEMS_PER_LESSON) break;
    const c = ok.filter((e) => e.type === t && !used.has(e.id))[0];
    if (c && (round === 0 || out.filter((x) => x.type === t).length === round)) { used.add(c.id); out.push(c); }
  }
  return out.slice(0, ITEMS_PER_LESSON).map((ex) => renderItem(ex));
}

/** Item -> { type, prompt (html), answer (html), answerText }. */
export function renderItem(ex) {
  const L = 'abcdefgh';
  if (ex.type === 'recall') return { type: 'recall', id: ex.id, prompt: `Say what it means: ${he(ex.he, 'big')}`, answer: esc(ex.en) };
  if (ex.type === 'produce') return { type: 'produce', id: ex.id, prompt: `How do you say &ldquo;${esc(ex.en)}&rdquo;? <ol class="opts" type="a">${ex.options.map((o) => `<li>${he(o)}</li>`).join('')}</ol>`, answer: `${L[ex.answer]}: ${he(ex.options[ex.answer])}` };
  if (ex.type === 'order') { const tok = ex.he.trim().split(/\s+/); return { type: 'order', id: ex.id, prompt: `Put the words in order (${esc(ex.en)}): <div class="scr">${shuffle(tok, ex.id).map((t) => he(t)).join(' &nbsp; ')}</div>`, answer: he(ex.he) }; }
  if (ex.type === 'respond') return { type: 'respond', id: ex.id, prompt: `Say it in Hebrew: ${esc(ex.cue)}`, answer: `${he(ex.answer.he)} <i>${esc(ex.answer.en ?? '')}</i>` };
  if (ex.type === 'match') {
    const right = shuffle(ex.pairs.map((p, i) => i), ex.id); // right[k] = index of the pair shown at letter k
    const letterOf = Object.fromEntries(right.map((pi, k) => [pi, L[k]]));
    return { type: 'match', id: ex.id, prompt: `Match each Hebrew word to its meaning: <div class="mt"><ol>${ex.pairs.map((p) => `<li>${he(p.he)}</li>`).join('')}</ol><ol type="a">${right.map((pi) => `<li>${esc(ex.pairs[pi].en)}</li>`).join('')}</ol></div>`, answer: ex.pairs.map((p, i) => `${i + 1}-${letterOf[i]}`).join(', ') };
  }
  if (ex.type === 'gender') return { type: 'gender', id: ex.id, prompt: `Say it to a woman (${esc(ex.en)}): ${he(ex.m, 'big')}`, answer: he(ex.f) };
  if (ex.type === 'register') return { type: 'register', id: ex.id, prompt: `Which register is this: ${esc(ex.options.join(' / '))}? ${he(ex.he, 'big')} <i>${esc(ex.en ?? '')}</i>`, answer: esc(ex.answer) };
  if (ex.type === 'fade') return { type: 'fade', id: ex.id, prompt: `Say the line from memory: &ldquo;${esc(ex.en)}&rdquo;`, answer: he(registryText(ex.line)) };
  throw new Error('unsupported exercise type ' + ex.type);
}

const wordRow = (w, cols) => `<tr><td class="he" lang="he" dir="rtl">${esc(w.he)}</td><td>${esc(w.en)}${w.note ? `<span class="nt">${esc(w.note)}</span>` : ''}</td>${cols.map(([k]) => `<td class="pr">${esc(w.pronunciation?.[k] ?? '')}</td>`).join('')}</tr>`;

function lessonPages(l, nth, first, img) {
  const cols = TRADITIONS.filter(([k]) => l.words.every((w) => w.pronunciation?.[k]));
  const items = pickItems(l);
  const goals = (l.goals ?? []).map((g) => `<li>${esc(g)}</li>`).join('');
  const p1 = `<section class="chapter il il-p1${first ? ' il-first' : ''}" id="int-${l.id}"><header class="ilh"><span class="iln">${esc(l.id)}</span><h3>${esc(l.title)}</h3><span class="small">${l.estMinutes ?? ''} min &middot; level ${esc(l.level ?? '')} &middot; draft</span></header>
${goals ? `<div class="goals"><b>You will learn to:</b><ul>${goals}</ul></div>` : ''}
<table class="grid ilw"><thead><tr><th>Hebrew</th><th>Meaning</th>${cols.map(([, n]) => `<th>${n}</th>`).join('')}</tr></thead><tbody>${l.words.map((w) => wordRow(w, cols)).join('')}</tbody></table>
<p class="small">${cols.length === 3 ? 'Three traditions side by side (rule-generated from the pointing, not checked by a native speaker).' : 'Israeli pronunciation only; the Latin spelling is machine output of the project&rsquo;s transliterator, not a native speaker&rsquo;s.'} ${l.note ? esc(l.note) : ''} Practice on the facing page; answers in the answer key at the back.</p></section>`;
  const p2 = `<section class="chapter il il-p2" id="int-${l.id}-p2"><header class="ilh"><span class="iln">${esc(l.id)}</span><h3>Practice: ${esc(l.title)}</h3></header>
<ol class="items">${items.map((it) => `<li class="item it-${it.type}"><span class="ity">${it.type}</span>${it.prompt}<div class="wr"></div></li>`).join('')}</ol></section>`;
  return { html: p1 + p2, items };
}

/** @param {{pages?:Record<string,number>, img?:(stem:string)=>string|null, alt?:Record<string,string>}} ctx */
export function lessonChapters(ctx = {}) {
  const pages = ctx.pages ?? {}; const img = ctx.img ?? (() => null);
  const lessons = loadLessons(); const out = {}; const keyRows = [];
  for (const [track, T] of Object.entries(TRACKS)) {
    const ls = lessons.filter((l) => l.track === track); if (!ls.length) { out[track] = ''; continue; }
    const src = img(T.scene);
    const pic = src ? `<img src="${esc(src)}" alt="${esc(ctx.alt?.[T.scene] ?? '')}" style="width:5in;display:block;margin:0 auto .15in"/>` : `<div class="phimg">Image placeholder: ${esc(T.scene)} (no approved image yet)</div>`;
    const intro = `<section class="chapter il-intro" id="${T.id}"><h2>${esc(T.title)}</h2><p class="draft-flag">DRAFT &mdash; not reviewed by a Hebrew teacher</p>${pic}<p>${esc(T.blurb)} Each lesson is a two-page spread: the words with pointing and pronunciation on the left, six practice items on the right. Cover the answers; check yourself in the answer key at the back of the book. Latin spellings are generated by rule and are not a native speaker&rsquo;s.</p>
<table class="grid ill"><tbody>${ls.map((l) => `<tr><td>${esc(l.id)}</td><td><a href="#int-${l.id}" style="display:contents">${esc(l.title)} <span class="pg">${pages['int-' + l.id] ?? '&middot;&middot;&middot;'}</span></a></td></tr>`).join('')}</tbody></table></section>`;
    let first = true; const body = ls.map((l, i) => { const r = lessonPages(l, i, first, img); first = false; keyRows.push({ track, lesson: l, items: r.items }); return r.html; }).join('');
    out[track] = intro + body;
  }
  return { html: out, keyRows };
}

export function answerKeyChapter(keyRows) {
  if (!keyRows.length) return '';
  return `<section class="chapter" id="ch-int-key"><h2>Answer key: intermediate lessons</h2><p class="draft-flag">DRAFT &mdash; answers come from the lesson files; not reviewed by a Hebrew teacher</p>
<p class="small">Item numbers match the practice page of each lesson. &ldquo;Say it&rdquo; items have one suggested answer; other correct renderings may exist, and the Hebrew is the project&rsquo;s own unreviewed pointing. For match items, numbers are the Hebrew words and letters are the meanings.</p>
<div class="keys">${keyRows.map(({ lesson, items }) => `<div class="kl"><b>${esc(lesson.id)}</b> ${esc(lesson.title.split(':')[0])}<ol>${items.map((it) => `<li><span class="ity">${it.type}</span> ${it.answer}</li>`).join('')}</ol></div>`).join('')}</div></section>`;
}

export const LESSON_CSS = `
.il-intro .phimg,.phimg{border:1pt dashed #B0373B;color:#B0373B;font:8.5pt var(--ui-font);padding:30pt 8pt;text-align:center;margin:6pt 0}
.ill td{font:9pt/1.3 var(--ui-font);padding:1.5pt 4pt}.ill td:first-child{width:36pt;font-weight:bold}
.il{page:main}.il-first{break-before:left}
.ilh{display:flex;align-items:baseline;gap:8pt;border-bottom:1.2pt solid var(--gold,#c9a64b);margin-bottom:6pt}.ilh h3{margin:0;font-size:13pt;flex:1}.iln{font:bold 11pt var(--ui-font);color:#B0373B}
.goals{font:9pt/1.35 var(--ui-font);margin-bottom:6pt}.goals ul{margin:2pt 0 0 14pt;padding:0}
.ilw td,.ilw th{padding:2.2pt 5pt;font:9pt/1.25 var(--ui-font)}.ilw td.he{font-size:16pt;line-height:1.3;white-space:nowrap}.ilw td.pr{font-style:italic}.nt{display:block;font-size:7.5pt;color:#666}
.items{list-style:decimal;margin:0;padding-left:20pt;font:10pt/1.35 var(--ui-font)}.items>li{margin:0 0 11pt;break-inside:avoid;padding-bottom:2pt}.items .he.big{font-size:20pt}.items .he{font-size:15pt}
.ity{display:inline-block;font:7pt var(--ui-font);text-transform:uppercase;letter-spacing:.06em;color:#6B7F3A;border:.6pt solid #6B7F3A;border-radius:3pt;padding:0 3pt;margin-right:5pt}
.wr{border-bottom:.6pt solid #999;height:20pt}.opts{margin:3pt 0 0 18pt;padding:0}.scr{margin:3pt 0;font-size:15pt}.mt{display:flex;gap:40pt;margin-top:3pt}.mt ol{margin:0;padding-left:18pt}
.keys{columns:3;column-gap:12pt;font:8.2pt/1.25 var(--ui-font)}.kl{break-inside:avoid;margin:0 0 7pt}.kl ol{margin:1pt 0 0 14pt;padding:0}.kl .he{font-size:12pt}.keys .ity{font-size:6pt;margin-right:2pt}
`;
