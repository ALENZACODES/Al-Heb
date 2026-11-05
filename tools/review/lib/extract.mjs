// Extractors: turn the repo's data files into reviewer items.
// An item = one row in a reviewer sheet. Items also carry `flip` (how to mark it reviewed) and `fields`
// (where a corrected text would be written), which apply_review.mjs uses. Nothing here writes to data.

import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { AREAS, VOCAB_TOP, LITURGY_ADDITIONS, claimFor } from '../config.mjs';
import { HOOK_QUESTIONS, LETTER_GENERAL_QUESTIONS, CHAIN_GENERAL_QUESTIONS } from '../questions.mjs';
import { loadVariants, ruleList, sampleFor, TRADITIONS, SAMPLE_PER_TRADITION } from './pronrules.mjs';

// ------------------------------------------------------------------ flag detection
const DRAFT_RE = /draft|needs[- ]?(native|check|review|verif|clergy)|transcribed-needs-check|native-speaker-needed|unreviewed|not (yet )?(been )?(proofread|reviewed|checked|validated)/i;

/** Reasons (strings) why this object's OWN keys say it is not reviewed. */
export function ownFlags(o) {
  if (!o || typeof o !== 'object' || Array.isArray(o)) return [];
  const f = [];
  if (o.proofread === false) f.push('proofread:false');
  if (o.needsNativeReview === true) f.push('needsNativeReview');
  if (o.needsNativeSpeaker === true) f.push('needsNativeSpeaker');
  if (o.typedFromMemory === true) f.push('typedFromMemory');
  if (o.needsVerification === true) f.push('needsVerification');
  if (o.draft === true) f.push('draft');
  if (o.validated === false) f.push('validated:false');
  if (o.clergyReviewed === false) f.push('clergyReviewed:false');
  for (const k of ['status', 'quality', 'review']) {
    if (typeof o[k] === 'string' && DRAFT_RE.test(o[k])) f.push(`${k}:${o[k].slice(0, 40)}`);
  }
  if (o.verified === false) f.push('verified:false');
  else if (o.verified && typeof o.verified === 'object' && Object.values(o.verified).some((v) => v === false)) f.push('verified:partly-false');
  return f;
}
const isReviewedTrue = (o) => o && (o.proofread === true || o.clergyReviewed === true);

export const countWords = (s) => (String(s || '').trim().split(/\s+/).filter(Boolean).length);
const first = (...v) => v.find((x) => x != null && x !== '');
const str = (v) => (v == null ? '' : String(v));

// ------------------------------------------------------------------ context
export async function makeCtx(root) {
  const cache = new Map();
  let translit = null;
  try {
    const m = await import(pathToFileURL(join(root, 'src/pronunciation/transliterate.js')).href);
    translit = (s, o) => { try { return m.transliterate(s, o); } catch { return ''; } };
  } catch { translit = null; }
  return {
    root,
    async json(rel) {
      if (cache.has(rel)) return cache.get(rel);
      let v = null;
      try { v = JSON.parse(await readFile(join(root, rel), 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw new Error(`${rel}: ${e.message}`); }
      cache.set(rel, v);
      return v;
    },
    async text(rel) { try { return await readFile(join(root, rel), 'utf8'); } catch { return null; } },
    async exists(rel) { try { await stat(join(root, rel)); return true; } catch { return false; } },
    /** automatic transliteration through the app's own function (labelled as auto in the sheet) */
    tr(he, opts) { return translit && he ? translit(he, opts) : ''; },
    hasTranslit: !!translit,
  };
}

function mk(area, local, o) {
  const a = AREAS.find((x) => x.slug === area);
  return {
    id: `${area}:${local}`, area, priority: a.priority,
    he: '', translit: '', en: '', check: '', source: '', flags: [], words: 0,
    flip: null, fields: {}, defaultField: 'he', rollup: null, extra: [], svg: null,
    ...o,
  };
}
const tgt = (file, path) => ({ file, path });
const fieldOf = (file, path, current) => ({ targets: [tgt(file, path)], current });

// ------------------------------------------------------------------ opening prayer
async function openingPrayer(ctx) {
  const txt = await ctx.text('book/opening-prayer.txt');
  if (txt == null) return [];
  const stanzas = txt.trim().split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
  const hebrewTerms = [
    ['Hineni', 'הִנֵּנִי', 'hineni', 'here I am'],
    ['or', 'אוֹר', 'or', 'light'],
    ['tikkun', 'תִּקּוּן', 'tikkun', 'repair (as in tikkun olam)'],
    ['Baruch ha-ba', 'בָּרוּךְ הַבָּא', 'baruch haba', 'blessed is the one who arrives (welcome)'],
  ];
  const out = [];
  stanzas.forEach((s, i) => {
    const en = s.replace(/\*/g, '');
    const terms = hebrewTerms.filter(([k]) => new RegExp(`\\b${k.replace('-', '[- ]')}\\b`, i === 0 ? 'i' : '').test(s));
    out.push(mk('opening-prayer', `stanza-${i + 1}`, {
      he: terms.map((t) => t[1]).join('   '),
      translit: terms.map((t) => t[2]).join('   '),
      en,
      check: `Stanza ${i + 1} of ${stanzas.length}. Original English text (not traditional liturgy), marked DRAFT pending clergy/educator review. Is the tone and theology acceptable for a beginners' book? Any phrase that would offend or mislead? ${terms.length ? 'Check the Hebrew terms shown (they are the author\'s pointing): ' + terms.map((t) => `${t[0]} = ${t[1]}`).join('; ') + '.' : 'No Hebrew terms in this stanza.'}`,
      flags: ['draft: pending clergy review (README, docs/book/INDESIGN-HANDOFF.md)'],
      source: 'book/opening-prayer.txt', words: countWords(s) / 2,
    }));
  });
  return out;
}

// ------------------------------------------------------------------ prayers (registry + meta)
async function prayers(ctx) {
  const F = 'data/corpus/registry.json';
  const reg = await ctx.json(F);
  const meta = (await ctx.json('data/corpus/prayer-meta.json')) || {};
  if (!reg || !Array.isArray(reg.entries)) return [];
  const add = new Set(LITURGY_ADDITIONS);
  const items = [];
  reg.entries.forEach((e, i) => {
    const fl = ownFlags(e);
    if (!fl.length) return;
    const isAdd = add.has(e.id);
    const needsCheck = e.status === 'transcribed-needs-check';
    const verse = e.category === 'torah';
    items.push(mk('prayers', e.id, {
      he: e.he, translit: ctx.tr(e.he), en: first(e.english, ''),
      check: `Read the pointed Hebrew ALOUD against a printed ${verse ? 'Tanakh (cantillation marks are removed here)' : 'siddur'}. Check every vowel, dagesh and shva, divine names, word breaks, missing or extra words, and whether the wording is what congregations actually say. Source/nusach: ${first(e.source, 'unknown')}. ${needsCheck ? 'FLAGGED transcribed-needs-check: typed from a source that could not be machine-verified; read this one most carefully. ' : 'Machine-checked against its cited source only, never read by a person. '}${isAdd ? 'One of the 43 liturgy records added in one batch; its Hebrew has not been read by anyone. ' : ''}English is the cited translation (${first(e.englishSource, 'none')}); check only that it matches.`,
      flags: fl, source: `${F}#entries[${i}] (${e.title}${e.ref ? ', ' + e.ref : ''})`,
      words: countWords(e.he), sortKey: needsCheck ? 0 : 1,
      flip: { kind: 'proofread', target: tgt(F, ['entries', i]) },
      fields: {
        he: fieldOf(F, ['entries', i, 'he'], e.he),
        en: fieldOf(F, ['entries', i, 'english'], e.english),
      },
    }));
  });
  items.sort((a, b) => a.sortKey - b.sortKey);
  // clergy notes (prayer-meta)
  const M = 'data/corpus/prayer-meta.json';
  const byId = new Map(reg.entries.map((e) => [e.id, e]));
  for (const [id, m] of Object.entries(meta.entries || {})) {
    if (m.clergyReviewed !== false) continue;
    const e = byId.get(id) || {};
    const d = m.denominations || {};
    const den = ['orthodox', 'conservative', 'reform'].map((k) => `${k}: ${d[k]?.use || 'unknown'}${d[k]?.note ? ' (' + d[k].note + ')' : ''}`).join(' | ');
    const heWords = str(e.he).split(/\s+/).slice(0, 7).join(' ');
    items.push(mk('prayers', `meta:${id}`, {
      he: heWords ? heWords + ' ...' : '', translit: '',
      en: `${e.title || id}. What it says: ${m.whatItSays || ''} | Where: ${m.whereInService || ''} | Delivery: ${m.delivery || ''} | Led by: ${m.leaderOrCongregation || ''} | Occasions: ${(m.occasions || []).join(', ')} | ${den}`,
      check: 'CLERGY NOTE CHECK (not the Hebrew text). Are "where in the service", delivery (sung / chanted / recited), who says it, the occasions, and the use in each denomination correct? Fill any "unknown". Hebrew shown only to identify the prayer.',
      flags: ['clergyReviewed:false'], source: `${M}#entries.${id}`, words: 0,
      flip: { kind: 'clergy', target: tgt(M, ['entries', id]) },
    }));
  }
  return items;
}

// ------------------------------------------------------------------ daily prompts
async function prayerPrompts(ctx) {
  const F = 'data/curriculum/prompts.json';
  const j = await ctx.json(F);
  if (!j) return [];
  const items = [];
  const rec = (arr, pathBase, label) => arr.forEach((p, i) => {
    const fl = ownFlags(p);
    if (!fl.length && !(j.status && DRAFT_RE.test(j.status))) return;
    const path = [...pathBase, i];
    const f = {};
    f.he = fieldOf(F, [...path, 'he'], p.he);
    f.en = fieldOf(F, [...path, 'en'], p.en);
    if (p.heFemale) f.heFemale = fieldOf(F, [...path, 'heFemale'], p.heFemale);
    items.push(mk('prayer-prompts', p.id, {
      he: p.he + (p.heFemale ? `\n${p.heFemale}` : ''), translit: ctx.tr(p.he), en: p.en,
      check: `${label}. Read ALOUD against a printed text. File status says: "${(j.status || '').slice(0, 90)}". Source claimed: ${p.source || 'none'}. ${p.heFemale ? 'Second Hebrew line is the feminine-speaker variant (heFemale): check gender forms too (correct it with a "heFemale:" prefix). ' : ''}Is the English gloss fair and not misleading?`,
      flags: fl.length ? fl : ['file-level: ' + (j.status || '').slice(0, 50)], source: `${F}#${path.join('.')}`, words: countWords(p.he) * (p.heFemale ? 2 : 1),
      flip: { kind: 'proofread', target: tgt(F, path) }, fields: f,
    }));
  });
  for (const k of ['morning', 'evening', 'shabbatEve']) if (Array.isArray(j[k])) rec(j[k], [k], `Daily prompt (${k})`);
  for (const [hk, arr] of Object.entries(j.holidays || {})) if (Array.isArray(arr)) rec(arr, ['holidays', hk], `Holiday prompt (${hk})`);
  return items;
}

// ------------------------------------------------------------------ torah service guide
async function prayerGuide(ctx) {
  const F = 'data/corpus/torah-service-guide.json';
  const j = await ctx.json(F);
  if (!j) return [];
  const fileFlag = DRAFT_RE.test(j.note || '') ? ['file-level note: "NOT been reviewed by a rabbi, cantor or Hebrew educator"'] : [];
  if (!fileFlag.length) return [];
  const items = [];
  const one = (s, path, label) => {
    const en = [s.whatHappens && `What happens: ${s.whatHappens}`, s.yourPart && `Your part: ${s.yourPart}`, s.howCongregationsDiffer && `How congregations differ: ${s.howCongregationsDiffer}`, s.note && `Note: ${s.note}`].filter(Boolean).join('\n');
    items.push(mk('prayer-guide', s.id, {
      he: s.hebrewName || '', translit: s.hebrewName ? ctx.tr(s.hebrewName) : '', en,
      check: `${label}: ${s.title || s.id}. Clergy: are the order, the description of what happens and who says what correct for a typical Shabbat-morning service? Are the claims about Orthodox / Conservative / Reform / Sephardi practice fair? Is the Hebrew name right?`,
      flags: fileFlag, source: `${F}#${path.join('.')}`, words: 0,
      flip: { kind: 'proofread', target: tgt(F, path) },
      fields: s.hebrewName ? { he: fieldOf(F, [...path, 'hebrewName'], s.hebrewName) } : {},
    }));
  };
  (j.sections || []).forEach((s, i) => one(s, ['sections', i], `Service section ${s.order ?? i + 1}`));
  (j.otherOccasions || []).forEach((s, i) => one(s, ['otherOccasions', i], 'Other occasion'));
  return items;
}

// ------------------------------------------------------------------ curriculum
async function lessons(ctx) {
  const F = 'data/curriculum/lessons.json';
  const j = await ctx.json(F);
  if (!j || !Array.isArray(j.lessons)) return [];
  const fileFlag = ownFlags(j);
  const items = [];
  j.lessons.forEach((l, i) => {
    const fl = [...ownFlags(l), ...(isReviewedTrue(l) ? [] : fileFlag)];
    if (!fl.length || isReviewedTrue(l)) return;
    items.push(mk('lessons', l.id, {
      en: `${l.title}${l.goals?.length ? ' | goals: ' + l.goals.join('; ') : ''}`,
      check: `Lesson ${l.id} (${l.track}, ${l.level}). Is the title/goal wording accurate Hebrew-teaching language? Do the listed words really suit what this lesson teaches (letters: ${(l.letters || []).join(', ') || '-'}; vowels: ${(l.vowels || []).join(', ') || '-'})? Word rows follow.${l.prayerLines?.length ? ' Prayer lines used: ' + l.prayerLines.join(', ') + ' (checked in the prayers packet).' : ''}`,
      flags: fl, source: `${F}#lessons[${i}]`, words: 0,
      flip: { kind: 'proofread', target: tgt(F, ['lessons', i]) }, fields: { en: fieldOf(F, ['lessons', i, 'title'], l.title) },
    }));
    (l.words || []).forEach((w, k) => {
      if (isReviewedTrue(w)) return;
      items.push(mk('lessons', `${l.id}:w${k + 1}`, {
        he: w.he, translit: first(w.translit, ctx.tr(w.he)), en: w.en,
        check: `Lesson ${l.id} word ${k + 1}. Pointing (every vowel and dagesh), spelling, the English gloss, and whether Israelis really say it this way. ${w.translit ? '' : 'Transliteration is auto-generated by the app, not hand-written: check it matches how it is said.'}`,
        flags: [...ownFlags(w), ...fileFlag], source: `${F}#lessons[${i}].words[${k}]`, words: 0,
        flip: { kind: 'proofread', target: tgt(F, ['lessons', i, 'words', k]) },
        fields: { he: fieldOf(F, ['lessons', i, 'words', k, 'he'], w.he), en: fieldOf(F, ['lessons', i, 'words', k, 'en'], w.en) },
      }));
    });
  });
  return items;
}

async function dialogues(ctx) {
  const F = 'data/curriculum/dialogues.json';
  const j = await ctx.json(F);
  if (!j || !Array.isArray(j.dialogues)) return [];
  const fileFlag = ownFlags(j);
  const items = [];
  j.dialogues.forEach((d, i) => {
    const sp = Object.fromEntries((d.speakers || []).map((s) => [s.id, s.name]));
    const children = [];
    (d.lines || []).forEach((ln, k) => {
      if (isReviewedTrue(ln)) return;
      const fl = [...ownFlags(ln), ...ownFlags(d), ...fileFlag];
      const it = mk('dialogues', ln.id, {
        he: ln.he, translit: first(ln.translit, ctx.tr(ln.he)), en: `[${sp[ln.speaker] || ln.speaker}] ${ln.en}`,
        check: `${d.title} (${d.level}, ${d.topic}) line ${k + 1}/${d.lines.length}. Speaker: ${sp[ln.speaker] || ln.speaker}. Check pointing, grammar, GENDER AGREEMENT for this speaker, naturalness (would an Israeli say it?), and the transliteration (hand-written Israeli-style spelling).`,
        flags: fl, source: `${F}#dialogues[${i}].lines[${k}]`, words: 0,
        flip: { kind: 'proofread', target: tgt(F, ['dialogues', i, 'lines', k]) },
        fields: { he: fieldOf(F, ['dialogues', i, 'lines', k, 'he'], ln.he), translit: fieldOf(F, ['dialogues', i, 'lines', k, 'translit'], ln.translit), en: fieldOf(F, ['dialogues', i, 'lines', k, 'en'], ln.en) },
      });
      children.push(it.id);
      items.push(it);
    });
    if (children.length && d.proofread === false) {
      const last = items[items.length - 1];
      last.rollup = { parent: tgt(F, ['dialogues', i]), children, label: `dialogue ${d.id}` };
    }
  });
  return items;
}

async function genderPairs(ctx) {
  const F = 'data/curriculum/gender-pairs.json';
  const j = await ctx.json(F);
  if (!j) return [];
  const fileFlag = ownFlags(j);
  if (!fileFlag.length) return [];
  const items = [];
  (j.pairs || []).forEach((p, i) => {
    if (isReviewedTrue(p)) return;
    const m = p.forms?.m || {}, f = p.forms?.f || {};
    items.push(mk('gender-pairs', p.id, {
      he: `${m.he || ''}\n${f.he || ''}`, translit: `${first(m.translit, ctx.tr(m.he))}\n${first(f.translit, ctx.tr(f.he))}`,
      en: `${p.en} (m on first line, f on second)`,
      check: `Pair ${p.id}, ${p.grammarTag}, speaker/listener: ${p.who}. Check both pointed forms for gender agreement and pointing, the transliteration, and that the English matches both. Correct a form with an "m:" or "f:" prefix.`,
      flags: fileFlag, source: `${F}#pairs[${i}]`, words: 0, defaultField: null,
      flip: { kind: 'proofread', target: tgt(F, ['pairs', i]) },
      fields: { m: fieldOf(F, ['pairs', i, 'forms', 'm', 'he'], m.he), f: fieldOf(F, ['pairs', i, 'forms', 'f', 'he'], f.he) },
    }));
  });
  (j.paradigms || []).forEach((p, i) => {
    if (isReviewedTrue(p)) return;
    const line = (g) => (p.parts || []).map((x) => (x.fixed ? x.fixed.he : (x[g]?.he ?? ''))).join(' ');
    const lineT = (g) => (p.parts || []).map((x) => (x.fixed ? x.fixed.translit : (x[g]?.translit ?? ''))).join(' ');
    items.push(mk('gender-pairs', p.id, {
      he: `${line('m')}\n${line('f')}`, translit: `${lineT('m')}\n${lineT('f')}`, en: `${p.en} (${p.tag || ''}; m first, f second)`,
      check: `Paradigm ${p.id}: one sentence frame with the changing part by gender. Check the assembled masculine and feminine sentences (pointing, agreement, transliteration). No corrected-text field is written back for paradigms: describe fixes in notes.`,
      flags: fileFlag, source: `${F}#paradigms[${i}]`, words: 0, defaultField: null,
      flip: { kind: 'proofread', target: tgt(F, ['paradigms', i]) },
    }));
  });
  return items;
}

async function loanwords(ctx) {
  const F = 'data/curriculum/loanwords.json';
  const j = await ctx.json(F);
  if (!j || !Array.isArray(j.groups)) return [];
  const fileFlag = ownFlags(j);
  const items = [];
  j.groups.forEach((g, gi) => {
    const children = [];
    (g.words || []).forEach((w, k) => {
      if (isReviewedTrue(w)) return;
      const fl = [...ownFlags(w), ...ownFlags(g), ...fileFlag];
      if (!fl.length) return;
      const it = mk('loanwords', w.id, {
        he: w.he, translit: first(w.translit, ctx.tr(w.he)), en: w.gloss,
        check: `${g.title}. Is this word in ordinary Israeli use with this meaning? Pointing, spelling (unpointed form shown in source: ${w.plain}), gloss, transliteration.`,
        flags: fl, source: `${F}#groups[${gi}].words[${k}]`, words: 0,
        flip: { kind: 'proofread', target: tgt(F, ['groups', gi, 'words', k]) },
        fields: { he: fieldOf(F, ['groups', gi, 'words', k, 'he'], w.he), translit: fieldOf(F, ['groups', gi, 'words', k, 'translit'], w.translit), en: fieldOf(F, ['groups', gi, 'words', k, 'gloss'], w.gloss) },
      });
      children.push(it.id); items.push(it);
    });
    if (children.length && g.proofread === false) items[items.length - 1].rollup = { parent: tgt(F, ['groups', gi]), children, label: `loanword group ${g.id}` };
  });
  return items;
}

async function hints(ctx) {
  const F = 'data/curriculum/hints.json';
  const j = await ctx.json(F);
  if (!j || !Array.isArray(j.kinds) || !ownFlags(j).length) return [];
  return j.kinds.map((k, i) => mk('hints', k.errorKind, {
    he: '', en: `Hint: ${k.hint}\nExample: ${k.example}`,
    check: `Learner-facing English about Hebrew (error kind: ${k.errorKind}). Is the linguistic claim correct (letter names, vowel names, "tzere = ay", right-to-left)? Is it under 140 characters? Would it help or confuse an English reader?`,
    flags: ownFlags(j), source: `${F}#kinds[${i}]`, words: 0,
    flip: { kind: 'proofread', target: tgt(F, ['kinds', i]) },
    fields: { en: fieldOf(F, ['kinds', i, 'hint'], k.hint) },
  }));
}

async function phrasebook(ctx) {
  const F = 'data/corpus/phrasebook.json';
  const j = await ctx.json(F);
  if (!j || !Array.isArray(j.entries)) return [];
  const items = [];
  j.entries.forEach((e, i) => {
    const fl = ownFlags(e);
    if (!fl.length) return;
    items.push(mk('phrasebook', e.id, {
      he: e.he, translit: first(e.translit, ctx.tr(e.he)), en: e.en,
      check: `Situation: ${e.situation}; register: ${e.register}. Pointing, natural everyday Israeli wording, register (${e.register}) and gender if it applies, transliteration. ${e.notes ? 'Existing note: ' + e.notes : ''}`,
      flags: fl, source: `${F}#entries[${i}]`, words: 0,
      flip: { kind: 'proofread', target: tgt(F, ['entries', i]) },
      fields: { he: fieldOf(F, ['entries', i, 'he'], e.he), translit: fieldOf(F, ['entries', i, 'translit'], e.translit), en: fieldOf(F, ['entries', i, 'en'], e.en) },
    }));
  });
  return items;
}

// ------------------------------------------------------------------ letters
function strokeSvg(rec, label) {
  if (!rec || !Array.isArray(rec.strokes) || !rec.outline) return null;
  const pts = rec.strokes.flatMap((s) => s.median || []);
  const nums = (rec.outline.match(/-?\d+(\.\d+)?/g) || []).map(Number);
  const xs = [], ys = [];
  for (let i = 0; i + 1 < nums.length; i += 2) { xs.push(nums[i]); ys.push(nums[i + 1]); }
  pts.forEach(([x, y]) => { xs.push(x); ys.push(y); });
  if (!xs.length) return null;
  const pad = 60;
  const x0 = Math.min(...xs) - pad, y0 = Math.min(...ys) - pad, w = Math.max(...xs) - Math.min(...xs) + 2 * pad, h = Math.max(...ys) - Math.min(...ys) + 2 * pad;
  const cols = ['#c0392b', '#1f77b4', '#2e8b57', '#8e44ad', '#d35400', '#16a085'];
  const arrow = (a, b, c) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, s = 34;
    return `<polygon points="${b[0]},${b[1]} ${b[0] - ux * s - uy * s * 0.6},${b[1] - uy * s + ux * s * 0.6} ${b[0] - ux * s + uy * s * 0.6},${b[1] - uy * s - ux * s * 0.6}" fill="${c}"/>`;
  };
  let g = `<path d="${rec.outline}" fill="#e6e6e6" stroke="#bbb" stroke-width="4"/>`;
  rec.strokes.forEach((s, i) => {
    const m = s.median || [];
    if (m.length < 2) return;
    const c = cols[i % cols.length];
    g += `<polyline points="${m.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${c}" stroke-width="${Math.max(16, w / 45)}" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>`;
    g += arrow(m[Math.max(0, m.length - 6)], m[m.length - 1], c);
    g += `<circle cx="${m[0][0]}" cy="${m[0][1]}" r="${Math.max(30, w / 17)}" fill="${c}"/><text x="${m[0][0]}" y="${m[0][1]}" font-size="${Math.max(38, w / 13)}" font-family="sans-serif" font-weight="bold" fill="#fff" text-anchor="middle" dominant-baseline="central">${i + 1}</text>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${w} ${h}" role="img" aria-label="${label}">${g}</svg>`;
}

async function parseReviewList(ctx) {
  const t = await ctx.text('docs/letters/REVIEW-LIST.md');
  const out = {};
  if (!t) return out;
  for (const line of t.split('\n')) {
    const m = line.match(/^\|\s*-\s*\[\s*\]\s*\|\s*-\s*\[\s*\]\s*\|\s*`([^`]+)`\s*\|\s*(.*?)\s*\|\s*$/);
    if (!m) continue;
    const d = m[2];
    const pm = d.match(/^P:\s*(.*?)\s*C:\s*(.*)$/);
    out[m[1]] = pm ? { print: pm[1], cursive: pm[2] } : { print: d, cursive: d };
  }
  return out;
}

async function letterStrokes(ctx) {
  const F = 'data/letters/letters.json';
  const L = await ctx.json(F);
  if (!Array.isArray(L)) return [];
  const doubts = await parseReviewList(ctx);
  const items = [];
  L.forEach((l, i) => {
    for (const script of ['print', 'cursive']) {
      const r = l[script];
      const fl = ownFlags(r);
      if (!fl.length) continue;
      const n = (r.strokes || []).length;
      const d = doubts[l.id]?.[script];
      const sc = script === 'print' ? 'PRINT (block)' : 'CURSIVE (ktav yad)';
      items.push(mk('letter-strokes', `${l.id}:${script}`, {
        he: l.he, translit: `${l.name} (${l.nameHe})`,
        en: `${l.name}, ${sc}: ${n} stroke${n === 1 ? '' : 's'}. Numbered dot = where each stroke starts; arrow = direction.`,
        check: `Does the SHAPE match Israeli school ${script} handwriting? Is the stroke COUNT, ORDER and DIRECTION what Israeli schools teach? (Diagram: grey = letter outline, coloured = pen path.) ${d ? 'Build agent\'s own doubt: ' + d : ''} Basis: ${(r.strokeBasis || '').slice(0, 160)}.`,
        flags: fl, source: `${F}#[${i}].${script}`, words: 0, svg: strokeSvg(r, `${l.name} ${script}`),
        flip: { kind: 'strokes', target: tgt(F, [i, script]) },
      }));
    }
  });
  return items;
}

async function mnemonics(ctx) {
  const F = 'data/letters/mnemonics.json';
  const j = await ctx.json(F);
  const items = [];
  await memoryChain(ctx, items);
  if (!j || !j.letters) return items;
  const mf = ownFlags(j.meta || {});
  if (!mf.length) return items;
  const rec = (arr, key) => arr.forEach((m, i) => {
    if (isReviewedTrue(m)) return;
    items.push(mk('mnemonics', m.id, {
      he: m.word, translit: first(m.wordSound, ctx.tr(m.word)), en: `${m.wordMeaning}\nName/shape claim: ${m.reason}\nStory: ${m.story}`,
      check: `Letter "${m.name}". (1) Pointing, spelling and meaning of the example word. (2) The claim about the letter NAME's meaning/origin: is it accurate and suitably hedged? (3) English story is only a memory hook; flag anything wrong about Hebrew sounds. Sound given: ${m.sound}.${HOOK_QUESTIONS[m.id] ? '\nQUESTION FOR THE REVIEWER: ' + HOOK_QUESTIONS[m.id] : ''}`,
      flags: mf, source: `${F}#${key}[${i}]`, words: 0,
      flip: { kind: 'proofread', target: tgt(F, [key, i]) },
      fields: { he: fieldOf(F, [key, i, 'word'], m.word), translit: fieldOf(F, [key, i, 'wordSound'], m.wordSound), en: fieldOf(F, [key, i, 'wordMeaning'], m.wordMeaning) },
    }));
  });
  rec(j.letters, 'letters');
  if (Array.isArray(j.variants)) rec(j.variants, 'variants');
  for (const [id, text] of LETTER_GENERAL_QUESTIONS) items.push(mk('mnemonics', id, {
    check: `QUESTION FOR THE REVIEWER (report-only, nothing to flip): ${text}`, flags: ['question from docs/review/LETTERS-CONTENT-CHECK.md (report-only)'], source: 'docs/review/LETTERS-CONTENT-CHECK.md', words: 0,
  }));
  return items;
}

// Report-only rows for data/letters/memory-chain.json (picture, hook, word chains). Nothing here flips a flag.
async function memoryChain(ctx, items) {
  const F = 'data/letters/memory-chain.json';
  const c = await ctx.json(F);
  if (!c || !Array.isArray(c.letters)) return;
  const cf = ownFlags(c.meta || {});
  if (!cf.length) return;
  c.letters.forEach((l, i) => {
    const trad = ['israeli', 'sephardi', 'ashkenazi'].map((t) => `${t}: ${l.sound.perTradition[t]}`).join('\n');
    items.push(mk('mnemonics', `chain:${l.id}`, {
      he: l.word.he, translit: l.word.translit,
      en: `${l.word.gloss} (vocabulary rank ${l.word.rank})\nPicture: ${l.picture.idea}\nHook: ${l.sound.hook} (${l.sound.hookPosition}). ${l.sound.line}\nStory: ${l.story}\nTip: ${l.tip}\n${trad}`,
      check: `Memory chain for "${l.name}". (1) Pointing and meaning of the word (it must ${l.word.position === 'final' ? 'END' : 'START'} with the letter). (2) Does the picture suit the letter shape and is it fine for adults and children? (3) Does the story or the sound line say anything untrue about this letter in any of the three traditions? Points noted: ${(l.risk || []).join(' ') || 'none'}`,
      flags: cf, source: `${F}#letters[${i}]`, words: 0,
    }));
  });
  for (const [id, text] of CHAIN_GENERAL_QUESTIONS) items.push(mk('mnemonics', id, {
    check: `QUESTION FOR THE REVIEWER (report-only, nothing to flip): ${text}`, flags: ['question about data/letters/memory-chain.json (report-only)'], source: F, words: 0,
  }));
}

// ------------------------------------------------------------------ pronunciation
async function soundgap(ctx) {
  const F = 'data/pronunciation/soundgap.json';
  const j = await ctx.json(F);
  if (!j || !Array.isArray(j.gaps)) return [];
  const fileFlag = ownFlags(j);
  const items = [];
  j.gaps.forEach((g, i) => {
    const fl = [...ownFlags(g), ...fileFlag];
    if (!fl.length || isReviewedTrue(g)) return;
    const trad = Object.entries(g.tradition || {}).map(([k, v]) => `${k}: ${v.text}`).join('\n');
    const mouth = (g.mouth || []).map((m) => `${m.for}: ${(m.steps || []).join(' ')}`).join('\n');
    items.push(mk('pron-soundgap', g.id, {
      he: '', translit: (g.letters || []).join(', '), en: `${g.title}\nTrap: ${g.englishTrap}\n${trad}\nMouth cues:\n${mouth}`,
      check: 'Phonetics text, not Hebrew spelling. Are the claims about each tradition (Israeli / Sephardi / Ashkenazi / American synagogue) correct? Are the mouth instructions accurate and safe to follow? Pair rows follow.',
      flags: fl, source: `${F}#gaps[${i}]`, words: 0, flip: { kind: 'proofread', target: tgt(F, ['gaps', i]) },
    }));
    (g.pairs || []).forEach((p, k) => {
      if (isReviewedTrue(p)) return;
      items.push(mk('pron-soundgap', `${g.id}:p${k + 1}`, {
        he: `${p.a.he}\n${p.b.he}`, translit: `${first(p.a.translit, ctx.tr(p.a.he))}\n${first(p.b.translit, ctx.tr(p.b.he))}`, en: `${p.a.gloss} / ${p.b.gloss}`,
        check: `Pair type "${p.kind}"; claimed israeliSame=${p.israeliSame}; heard in: ${(p.heardIn || []).join(', ')}. Are both words real, pointed correctly and glossed correctly? Is the claim about whether they sound the same correct?`,
        flags: fl, source: `${F}#gaps[${i}].pairs[${k}]`, words: 0, flip: { kind: 'proofread', target: tgt(F, ['gaps', i, 'pairs', k]) },
        fields: { a: fieldOf(F, ['gaps', i, 'pairs', k, 'a', 'he'], p.a.he), b: fieldOf(F, ['gaps', i, 'pairs', k, 'b', 'he'], p.b.he) }, defaultField: null,
      }));
    });
  });
  return items;
}

async function prayerWords(ctx) {
  const F = 'data/pronunciation/prayerwords.json';
  const j = await ctx.json(F);
  if (!j || !Array.isArray(j.words)) return [];
  const fileFlag = ownFlags(j);
  return j.words.filter((w) => !isReviewedTrue(w) && (fileFlag.length || ownFlags(w).length)).map((w) => mk('pron-prayerwords', w.id, {
    he: w.he, translit: first(w.israeli?.say, ''),
    en: `${w.gloss}\nIsraeli: ${w.israeli?.say} (stress ${w.israeli?.stress})\nAmerican synagogue: ${w.american?.say} (stress ${w.american?.stress})\nTraditional Ashkenazi: ${w.ashkenazi?.say} (stress ${w.ashkenazi?.stress})`,
    check: `Read the word ALOUD in each accent. Are the three English respellings (capitals = stressed syllable) what a speaker of that accent would say? Is the stress right? Differences claimed: ${(w.diffs || []).join(', ')}. Ashkenazi line needs someone trained in traditional Ashkenazi reading.`,
    flags: fileFlag, source: `${F}#words.${w.id}`, words: 0,
    flip: { kind: 'proofread', target: tgt(F, ['words', j.words.indexOf(w)]) },
    fields: { he: fieldOf(F, ['words', j.words.indexOf(w), 'he'], w.he) },
  }));
}

async function pronVowels(ctx) {
  const items = [];
  // niqqud records: english respellings and examples flagged unverified
  let F = 'data/pronunciation/niqqud.json';
  let j = await ctx.json(F);
  (j?.records || []).forEach((r, i) => {
    const fl = ownFlags(r);
    if (!fl.length) return;
    items.push(mk('pron-vowels', `niqqud:${r.id}`, {
      he: `${r.shape || ''}   ${r.example?.he || ''}`, translit: r.name, en: `${r.example?.gloss || ''}\nIsraeli: ${r.english?.israeli}\nAshkenazi: ${r.english?.ashkenazi}\nSephardi: ${r.english?.sephardi}\nAmerican synagogue: ${r.english?.american_synagogue}\nNote: ${r.notes || ''}`,
      check: `Vowel/mark "${r.name}" (${r.nameHe}). Verified flags: ${JSON.stringify(r.verified)}. Check the English sound descriptions per tradition and the example word (pointing, gloss).`,
      flags: fl, source: `${F}#records[${i}]`, words: 0, flip: { kind: 'proofread', target: tgt(F, ['records', i]) },
      fields: { he: fieldOf(F, ['records', i, 'example', 'he'], r.example?.he) },
    }));
  });
  F = 'data/pronunciation/consonants.json';
  j = await ctx.json(F);
  Object.entries(j?.letters || {}).forEach(([k, r]) => {
    const fl = ownFlags(r);
    if (!fl.length) return;
    items.push(mk('pron-vowels', `consonant:${r.id}`, {
      he: r.he, translit: r.name, en: `Israeli: ${r.english?.israeli}\nAshkenazi: ${r.english?.ashkenazi}\nSephardi: ${r.english?.sephardi}\nAmerican synagogue: ${r.english?.american_synagogue}\n${r.notes || ''}`,
      check: 'Consonant record flagged verified:false (standard value, not in the fetched side-by-side table). Are the sound descriptions for each tradition correct?',
      flags: fl, source: `${F}#letters.${k}`, words: 0, flip: { kind: 'proofread', target: tgt(F, ['letters', k]) },
    }));
  });
  F = 'data/pronunciation/dial-words.json';
  j = await ctx.json(F);
  const ff = ownFlags(j || {});
  (j?.words || []).forEach((w, i) => {
    if (!ff.length && !ownFlags(w).length) return;
    items.push(mk('pron-vowels', `dial:${w.id}`, {
      he: `${w.full}\n${w.unpointed}`, translit: ctx.tr(w.full), en: `${w.gloss}${w.plene ? '\nplene note: ' + w.plene.note : ''}`,
      check: 'Niqqud dial word: first line = siddur-style pointed, second = everyday unpointed spelling. Are both right (everyday spelling per the Academy rules), and is the gloss right?',
      flags: ff, source: `${F}#words[${i}]`, words: 0, flip: { kind: 'proofread', target: tgt(F, ['words', i]) },
      fields: { full: fieldOf(F, ['words', i, 'full'], w.full), unpointed: fieldOf(F, ['words', i, 'unpointed'], w.unpointed) }, defaultField: 'full',
    }));
  });
  F = 'data/pronunciation/plene.json';
  j = await ctx.json(F);
  const pf = ownFlags(j || {});
  if (pf.length) {
    for (const [fam, v] of Object.entries(j.families || {})) {
      if (v.pair) items.push(mk('pron-vowels', `plene:${fam}`, {
        he: `${v.pair.defective}\n${v.pair.plene}`, translit: ctx.tr(v.pair.plene), en: `${v.pair.gloss} (first line defective, second plene)\n${v.pair.note}`,
        check: `Plene vs defective spelling for the "${fam}" vowel family. Are both spellings real and correctly pointed, and is the note right?`,
        flags: pf, source: `${F}#families.${fam}.pair`, words: 0, flip: { kind: 'proofread', target: tgt(F, ['families', fam, 'pair']) },
        fields: { defective: fieldOf(F, ['families', fam, 'pair', 'defective'], v.pair.defective), plene: fieldOf(F, ['families', fam, 'pair', 'plene'], v.pair.plene) }, defaultField: 'plene',
      }));
      (v.finalVowelLetter || []).forEach((w, k) => items.push(mk('pron-vowels', `plene:${fam}:final${k + 1}`, {
        he: w.he, translit: ctx.tr(w.he), en: `${w.gloss}\n${w.note}`, check: 'Word with a final vowel letter. Pointing, gloss and the note about the final letter.',
        flags: pf, source: `${F}#families.${fam}.finalVowelLetter[${k}]`, words: 0, flip: { kind: 'proofread', target: tgt(F, ['families', fam, 'finalVowelLetter', k]) },
        fields: { he: fieldOf(F, ['families', fam, 'finalVowelLetter', k, 'he'], w.he) },
      })));
    }
    (j.finalHe || []).forEach?.((w, k) => items.push(mk('pron-vowels', `plene:finalhe:${k + 1}`, {
      he: w.he || '', translit: ctx.tr(w.he), en: `${w.gloss || ''} ${w.note || ''}`, check: 'Final-he example. Pointing, gloss, note.',
      flags: pf, source: `${F}#finalHe[${k}]`, words: 0, flip: { kind: 'proofread', target: tgt(F, ['finalHe', k]) },
    })));
  }
  F = 'data/pronunciation/stress.json';
  j = await ctx.json(F);
  const sf = ownFlags(j || {});
  (j?.exceptions || []).forEach((e, i) => {
    if (!sf.length) return;
    items.push(mk('pron-vowels', `stress:${i + 1}`, {
      he: e.he, translit: ctx.tr(e.he), en: `stress on syllable ${e.fromEnd} from the end (${e.kind}): ${e.note}`,
      check: 'Stress exception. Is the word pointed correctly and is the stress where the data says (milel = second-to-last)?',
      flags: sf, source: `${F}#exceptions[${i}]`, words: 0, flip: { kind: 'proofread', target: tgt(F, ['exceptions', i]) },
      fields: { he: fieldOf(F, ['exceptions', i, 'he'], e.he) },
    }));
  });
  F = 'data/pronunciation/dot-pairs.json';
  j = await ctx.json(F);
  const df = ownFlags(j || {});
  (j?.pairs || []).forEach((p, i) => {
    if (!df.length) return;
    items.push(mk('pron-vowels', `dotpair:${p.id}`, {
      he: '', translit: p.letterId, en: `with: ${p.hints?.with}\nwithout: ${p.hints?.without}`,
      check: 'Mouth hints for the dot-toggle tile (English text). Are the articulation descriptions correct and understandable?',
      flags: df, source: `${F}#pairs[${i}]`, words: 0, flip: { kind: 'proofread', target: tgt(F, ['pairs', i]) },
    }));
  });
  return items;
}

// ------------------------------------------------------------------ pronunciation traditions (guide + sounds)
async function pronTraditions(ctx) {
  const items = [];
  let F = 'data/traditions/guide.json';
  let j = await ctx.json(F);
  if (j && ownFlags(j).length) {
    const ff = ownFlags(j);
    (j.universalAdvice || []).forEach((t, i) => items.push(mk('pron-traditions', `guide:advice${i + 1}`, {
      en: t, check: 'Advice shown to learners choosing a pronunciation tradition. Is it fair and accurate? (English text; the file is marked draft.)',
      flags: ff, source: `${F}#universalAdvice[${i}]`, words: 0,
    })));
    (j.situations || []).forEach((s, i) => items.push(mk('pron-traditions', `guide:${s.id}`, {
      en: `${s.title} (suggested setting: ${s.tradition}; confidence ${s.confidence})\n${s.summary}\nCaveats: ${(s.caveats || []).join(' ')}\nAsk first: ${s.askFirst}`,
      check: 'Does this description of what congregations of this kind usually do match your experience? Anything unfair to a stream or community? (Evidence behind it is thin; the guide says so.)',
      flags: ff, source: `${F}#situations[${i}]`, words: 0,
      flip: { kind: 'proofread', target: tgt(F, ['situations', i]) },
    })));
  }
  F = 'data/traditions/sounds.json';
  j = await ctx.json(F);
  if (j && ownFlags(j).length) {
    const ff = ownFlags(j);
    (j.sounds || []).forEach((s, i) => items.push(mk('pron-traditions', `sound:${s.id}`, {
      he: s.he || '', translit: ctx.tr(s.he), en: `${s.label} (${s.gloss})\nIsraeli: ${s.israeli}\nAmerican synagogue: ${s.american}\nAshkenazi: ${s.ashkenazi}\nOther communities: ${(s.other || []).map((o) => `${o.who}: ${o.say}`).join('; ')}`,
      check: `Per-sound comparison across settings (confidence claimed: ${s.confidence}). Read the example word aloud in each setting: are the cells right? Are the "other communities" claims right?`,
      flags: ff, source: `${F}#sounds[${i}]`, words: 0,
      flip: { kind: 'proofread', target: tgt(F, ['sounds', i]) },
      fields: s.he ? { he: fieldOf(F, ['sounds', i, 'he'], s.he) } : {},
    })));
    (j.alsoExists || []).forEach((s, i) => items.push(mk('pron-traditions', `also:${s.id}`, {
      en: `${s.who}\n${(s.claims || []).join('\n')}\n${s.note || ''}`,
      check: 'Claims about another community\'s pronunciation (from one Wikipedia article). Are they accurate and respectfully put?',
      flags: ff, source: `${F}#alsoExists[${i}]`, words: 0,
      flip: { kind: 'proofread', target: tgt(F, ['alsoExists', i]) },
    })));
  }
  return items;
}

// ------------------------------------------------------------------ calendar (texts live in src/curriculum/calendar.js)
async function calendar(ctx) {
  const rel = 'src/curriculum/calendar.js';
  if (!(await ctx.exists(rel))) return [];
  let m;
  try { m = await import(pathToFileURL(join(ctx.root, rel)).href); } catch { return []; }
  const items = [];
  const flag = ['src/curriculum/calendar.js header: Hebrew names are drafts, no native review recorded (report-only: no data flag to flip)'];
  (m.HOLIDAY_DEFS || []).forEach((h) => items.push(mk('calendar', `holiday:${h.id}`, {
    he: h.he, translit: ctx.tr(h.he), en: `${h.en} (${h.month} ${h.day}, ${h.days} day${h.days > 1 ? 's' : ''}, ${h.kind}). ${h.note || ''}`,
    check: `Holiday name: pointing and spelling, English name. Calendar convention verified level in code: "${h.verified}" ${h.verified !== 'source' ? '(inferred/recalled, not from a fetched source)' : ''}. Is the Reform-oriented one-day convention note fair? Date: ${h.month} ${h.day}.`,
    flags: flag.concat(h.verified !== 'source' ? [`verified:${h.verified}`] : []), source: `${rel}#HOLIDAY_DEFS.${h.id}`, words: 0,
  })));
  const PF = 'data/calendar/parsha.json';
  const pj = await ctx.json(PF);
  Object.entries(pj?.names || {}).forEach(([k, v]) => items.push(mk('calendar', `parsha:${k}`, {
    he: v.he, translit: '', en: v.en,
    check: 'Weekly Torah portion name (unpointed, derived from Hebcal output). Spelling (including maqaf in double names), and the standard English spelling.',
    flags: ['data/calendar/parsha.json: derived from Hebcal output, no native review recorded (report-only)'], source: `${PF}#names.${k}`, words: 0,
  })));
  Object.entries(m.HEBREW_MONTH_NAMES || {}).forEach(([k, v]) => items.push(mk('calendar', `month:${k}`, {
    he: v.he, translit: ctx.tr(v.he), en: v.en, check: 'Month name: pointing, spelling, and the standard English spelling.',
    flags: flag, source: `${rel}#HEBREW_MONTH_NAMES.${k}`, words: 0,
  })));
  return items;
}

// ------------------------------------------------------------------ torah reading ladder
async function torahread(ctx) {
  const items = [];
  let F = 'data/torahread/verses.json';
  let j = await ctx.json(F);
  if (j && Array.isArray(j.entries)) {
    const ff = DRAFT_RE.test(j.note || '') ? ['file note: "NOT proofread by a Hebrew educator"'] : [];
    j.entries.forEach((e, i) => {
      const fl = [...ownFlags(e), ...ff];
      if (!fl.length || isReviewedTrue(e)) return;
      items.push(mk('torahread', `verse:${e.id}`, {
        he: e.he, translit: ctx.tr(e.he), en: `${e.ref}: ${e.english}`,
        check: `Torah verse (${e.ref}) from UXLC with cantillation removed. Read ALOUD against a printed Tanakh: vowels, dagesh, word breaks. English is JPS 1917; check only that it matches.`,
        flags: fl, source: `${F}#entries[${i}]`, words: countWords(e.he),
        flip: { kind: 'proofread', target: tgt(F, ['entries', i]) },
        fields: { he: fieldOf(F, ['entries', i, 'he'], e.he), en: fieldOf(F, ['entries', i, 'english'], e.english) },
      }));
    });
  }
  F = 'data/torahread/words30.json';
  j = await ctx.json(F);
  if (j && Array.isArray(j.words)) {
    const ff = ownFlags(j);
    j.words.forEach((w, i) => {
      const fl = [...ownFlags(w), ...ff];
      if (!fl.length || isReviewedTrue(w)) return;
      const others = (w.others || []).map((o) => `${o.he}${o.gloss ? ' = ' + o.gloss : ''}`).join('; ');
      items.push(mk('torahread', `word:${w.rank}`, {
        he: w.pointed, translit: ctx.tr(w.pointed), en: `${w.gloss}${others ? '\nOther pointings of ' + w.unpointed + ': ' + others : ''}`,
        check: `Torah word #${w.rank} (unpointed ${w.unpointed}, ${w.count} occurrences). Is the commonest pointing the one shown, is the gloss right, and are the other pointings real?`,
        flags: fl, source: `${F}#words[${i}]`, words: 0,
        flip: { kind: 'proofread', target: tgt(F, ['words', i]) },
        fields: { he: fieldOf(F, ['words', i, 'pointed'], w.pointed), en: fieldOf(F, ['words', i, 'gloss'], w.gloss) },
      }));
    });
  }
  return items;
}

// ------------------------------------------------------------------ vocabulary
async function vocab(ctx, slug) {
  const F = 'data/vocab/vocab5000.json';
  const j = await ctx.json(F);
  if (!j || !Array.isArray(j.entries)) return [];
  // locate the same ids in the tier packs so a fix/flip reaches every copy
  const copies = new Map();
  let packFiles = [];
  try { packFiles = (await readdir(join(ctx.root, 'data/vocab/packs'))).filter((f) => /^vocab5k-tier-\d+\.json$/.test(f)).sort(); } catch { /* none */ }
  for (const pf of packFiles) {
    const rel = `data/vocab/packs/${pf}`;
    const p = await ctx.json(rel);
    (p?.entries || []).forEach((e, i) => { if (!copies.has(e.id)) copies.set(e.id, []); copies.get(e.id).push({ file: rel, path: ['entries', i] }); });
  }
  const items = [];
  j.entries.forEach((e, i) => {
    const fl = ownFlags(e);
    if (!fl.length) return;
    if (e.flags && e.flags.hidden === true) return; // hidden from learners: never shown, so not sent to a reviewer
    const top = e.rank <= VOCAB_TOP;
    if ((slug === 'vocab-top1000') !== top) return;
    const all = [{ file: F, path: ['entries', i] }, ...(copies.get(e.id) || [])];
    const heWord = first(e.pointed, e.lemma);
    const forms = (e.forms || []).slice(0, 3).map((f) => f.pointed || f.he).join(', ');
    items.push(mk(slug, e.id, {
      he: heWord, translit: e.pointed ? ctx.tr(e.pointed) : '', en: e.gloss,
      check: `Rank ${e.rank}, ${e.pos}. ${e.pointed ? 'Pointing of the lemma' : 'NO pointing in data (needsPointing): add the pointing'}; gloss accurate for modern Israeli use; part of speech. Pointing source: ${e.pointedSource || 'unknown'}.${e.forms?.length ? ` Also ${e.forms.length} listed forms (e.g. ${forms}) with unreviewed pointing.` : ''}`,
      flags: fl, source: `${F}#entries[${i}] (rank ${e.rank})`, words: 0, rank: e.rank,
      flip: { kind: 'proofread', targets: all },
      fields: {
        he: { targets: all.map((t) => ({ file: t.file, path: [...t.path, 'pointed'] })), current: e.pointed },
        en: { targets: all.map((t) => ({ file: t.file, path: [...t.path, 'gloss'] })), current: e.gloss },
      },
      vocabId: e.id, lemma: e.lemma,
    }));
  });
  items.sort((a, b) => a.rank - b.rank);
  return items;
}

// ------------------------------------------------------------------ generic extractor (israel-everyday + catch-all)
const SKIP_KEYS = new Set(['id', 'tags', 'confidence', 'proofread', 'needsNativeReview', 'needsNativeSpeaker', 'status', 'version', 'regionClaim', 'typedFromMemory', 'draft', 'schemaVersion', 'schema', 'category', 'sources', 'rank', 'order', 'reviewedBy', 'reviewedOn']);
const HARD = /^(proofread:false|needsNativeReview|needsNativeSpeaker|typedFromMemory|needsVerification|draft$|validated:false|clergyReviewed:false)/;
const hardFlags = (o) => ownFlags(o).filter((x) => HARD.test(x));

/** Describe one record: Hebrew lines (labelled), matching transliteration, and the remaining English text. */
function describeRecord(rec) {
  const he = [], tr = [], en = [], fields = {};
  const heNodes = [];
  (function walk(o, path) {
    if (o && typeof o === 'object' && !Array.isArray(o) && typeof o.he === 'string') heNodes.push(path);
    if (Array.isArray(o)) o.forEach((x, i) => walk(x, [...path, i]));
    else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) if (v && typeof v === 'object') walk(v, [...path, k]);
  })(rec, []);
  const get = (path) => path.reduce((a, k) => a?.[k], rec);
  const used = new Set();
  for (const p of heNodes) {
    const node = get(p);
    const label = p.length ? `${p.join('.')}: ` : '';
    he.push(`${label}${node.he}`);
    tr.push(node.translit ? `${label}${node.translit}` : '');
    if (node.en) en.push(`${label}${node.en}`);
    used.add(node);
    const dotted = (k) => [...p, k].join('.');
    fields[dotted('he')] = { rel: [...p, 'he'], current: node.he };
    if (node.translit != null) fields[dotted('translit')] = { rel: [...p, 'translit'], current: node.translit };
  }
  const textual = (o, path) => {
    if (typeof o === 'string') return;
    if (Array.isArray(o)) { o.forEach((x, i) => { if (typeof x === 'string') en.push(`${path.join('.')}[${i}]: ${x}`); else textual(x, [...path, i]); }); return; }
    if (!o || typeof o !== 'object') return;
    for (const [k, v] of Object.entries(o)) {
      if (SKIP_KEYS.has(k) || k === 'he' || k === 'translit' || (k === 'title' && path.length === 0)) continue;
      if (typeof v === 'string' && !(used.has(o) && k === 'en')) en.push(`${[...path, k].join('.')}: ${v}`);
      else if (v && typeof v === 'object') textual(v, [...path, k]);
    }
  };
  textual(rec, []);
  const cleanEn = en.map((l) => l.replace(/^en: /, ''));
  return { he: he.join('\n'), translit: tr.some(Boolean) ? tr.join('\n') : '', en: cleanEn.join('\n'), fields };
}

/** Walk a parsed file; yield { rec, path } for each record-level unit that should be reviewed. */
function* flaggedUnits(node, path, inheritedFlags, depth = 0) {
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      const x = node[i];
      if (x && typeof x === 'object' && !Array.isArray(x)) {
        const own = hardFlags(x);
        if (isReviewedTrue(x)) continue;
        if (own.length || (inheritedFlags.length && typeof x.id === 'string')) { yield { rec: x, path: [...path, i], flags: own.length ? own : inheritedFlags }; continue; }
      }
      if (x && typeof x === 'object') yield* flaggedUnits(x, [...path, i], inheritedFlags, depth + 1);
    }
  } else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) if (v && typeof v === 'object') yield* flaggedUnits(v, [...path, k], inheritedFlags, depth + 1);
  }
}

async function genericFile(ctx, slug, F, covered = null) {
  const j = await ctx.json(F);
  if (!j) return [];
  const inherited = Array.isArray(j) ? [] : hardFlags(j);
  const items = [];
  const usedLocal = new Set();
  for (const u of flaggedUnits(j, [], inherited)) {
    const d = describeRecord(u.rec);
    let local = `${F.replace(/^data\//, '').replace(/\.json$/, '')}:${u.rec.id || u.path.join('.')}`;
    // the same id can legitimately appear in two arrays of one file (units[] and lessons[]): keep ids unique by path
    if (usedLocal.has(local)) local += `@${u.path.join('.')}`;
    usedLocal.add(local);
    const fieldEntries = Object.entries(d.fields);
    const only = fieldEntries.length === 1 ? fieldEntries[0][0] : null;
    items.push(mk(slug, local, {
      he: d.he, translit: d.translit, en: `${u.rec.title ? u.rec.title + '\n' : ''}${d.en}`.trim(),
      check: `Record ${u.rec.id || u.path.join('.')} in ${F}. File note: "${String(j.note || j.description || j.status || '').slice(0, 140)}". Check every Hebrew line: pointing, spelling, gender agreement, whether Israelis would really say it, the transliteration (capitals = stress) and that the English matches.`,
      flags: u.flags, source: `${F}#${u.path.join('.')}`, words: 0, defaultField: only,
      flip: { kind: 'proofread', target: tgt(F, u.path) },
      fields: Object.fromEntries(fieldEntries.map(([k, v]) => [k, fieldOf(F, [...u.path, ...v.rel], v.current)])),
    }));
  }
  return items;
}

async function israelEveryday(ctx) {
  const items = [];
  let files = [];
  try { files = (await readdir(join(ctx.root, 'data/israel'))).filter((f) => f.endsWith('.json')).sort(); } catch { return []; }
  for (const f of files) items.push(...(await genericFile(ctx, 'israel-everyday', `data/israel/${f}`)));
  return items;
}


// ------------------------------------------------------------------ intermediate lessons, first day, speak, pronunciation rules
/** Exercises of lessons I-01..I-50 as registered in lessons.json (the app reads that file). Titles and words are in `lessons`. */
async function intermediate(ctx) {
  const F = 'data/curriculum/lessons.json';
  const j = await ctx.json(F);
  if (!j || !Array.isArray(j.lessons)) return [];
  const fileFlag = hardFlags(j);
  const items = [];
  j.lessons.forEach((l, i) => {
    if (!/^I-\d+$/.test(l.id)) return;
    const fl = [...hardFlags(l), ...(isReviewedTrue(l) ? [] : fileFlag)];
    if (!fl.length || isReviewedTrue(l)) return;
    (l.exercises || []).forEach((e, k) => {
      if (isReviewedTrue(e)) return;
      const d = describeRecord(e);
      const only = Object.keys(d.fields).length === 1 ? Object.keys(d.fields)[0] : null;
      items.push(mk('intermediate', e.id || `${l.id}-x${k + 1}`, {
        he: d.he, translit: d.translit, en: d.en, words: countWords(d.he),
        check: `Exercise ${k + 1} of ${l.id} (unit ${l.unit}: ${l.title}). Pointing and spelling of every Hebrew line; the English matches it; the exercise type (${e.type || '?'}) makes sense for it. For prayer units compare with a printed siddur or chumash of the nusach in the lesson; the English cue and hint wording is original text, judge whether it is accurate.`,
        flags: fl, source: `${F}#lessons[${i}].exercises[${k}]`, defaultField: only,
        flip: { kind: 'proofread', target: tgt(F, ['lessons', i, 'exercises', k]) },
        fields: Object.fromEntries(Object.entries(d.fields).map(([f, v]) => [f, fieldOf(F, ['lessons', i, 'exercises', k, ...v.rel], v.current)])),
      }));
    });
  });
  return items;
}

async function firstday(ctx) {
  const items = [];
  for (const f of ['first10', 'onramp']) items.push(...(await genericFile(ctx, 'firstday', `data/firstday/${f}.json`)));
  const F = 'data/firstday/ladder.json';
  const j = await ctx.json(F);
  if (j && Array.isArray(j.steps)) {
    const fileFlag = hardFlags(j);
    j.steps.forEach((st, i) => {
      if (isReviewedTrue(st)) return;
      const fl = [...hardFlags(st), ...fileFlag];
      if (!fl.length) return;
      items.push(mk('firstday', `firstday/ladder:step${st.n ?? i + 1}`, {
        he: st.shown && st.shown !== st.word ? `${st.word}\nshown: ${st.shown}` : st.word, translit: '', en: `${st.gloss}\nstage: ${st.stage}; unpointed form: ${st.bare}`,
        check: `Reading ladder step ${st.n ?? i + 1} (${st.stage}). Pointing of the full word; the shown form matches what the stage promises (pointed / first letter pointed / unpointed with hint / unpointed); the unpointed form is how Israelis write it; the gloss.`,
        flags: fl, source: `${F}#steps.${i}`,
        flip: { kind: 'proofread', target: tgt(F, ['steps', i]) },
        fields: { he: fieldOf(F, ['steps', i, 'word'], st.word), en: fieldOf(F, ['steps', i, 'gloss'], st.gloss) }, defaultField: 'he',
      }));
    });
  }
  return items;
}

async function speak(ctx) {
  const items = [];
  for (const f of ['minimal-pairs', 'prayers']) items.push(...(await genericFile(ctx, 'speak', `data/speak/${f}.json`)));
  return items;
}

const slugId = (s) => String(s).replace(/[^A-Za-z0-9:.]+/g, '-').replace(/^-+|-+$/g, '');
const DERIVED_FLAG = ['derived: rule-generated respelling, no data flag to flip (report-only; fixes go in the rules or the generator)'];

/** Rule list + stratified ~200-row sample per tradition + the learner-facing rule pages. Replaces row-by-row review of data/pronunciation/variants. */
async function pronRules(ctx) {
  const items = [];
  const data = loadVariants(ctx.root);
  if (data) {
    const samples = Object.fromEntries(TRADITIONS.map((t) => [t, sampleFor(data, t, SAMPLE_PER_TRADITION)]));
    const rules = ruleList(ctx.root, data);
    for (const r of rules) {
      const ex = [];
      for (const t of TRADITIONS) { const hit = samples[t].filter((x) => x.rules.includes(r.id)).sort((a, b) => String(a.rec.he).length - String(b.rec.he).length || (a.rec.id < b.rec.id ? -1 : 1))[0]; if (hit && !ex.some((e) => e.rec.id === hit.rec.id)) ex.push({ ...hit, t }); }
      const used = TRADITIONS.filter((t) => r.count[t] > 0);
      items.push(mk('pron-rules', `rule:${slugId(r.id)}`, {
        he: ex.map((e) => e.rec.he).join('\n'),
        translit: ex.slice(0, 2).map((e) => TRADITIONS.map((t) => `${t}: ${e.rec.variants[t]?.simple ?? ''}`).join(' | ')).join('\n'),
        en: `Rule ${r.id} (${r.kind}): ${r.label}\n${r.text}\nRecords using it: ${used.length ? used.map((t) => `${t} ${r.count[t]}`).join(', ') : 'none in the current data'}.`,
        check: `Rule ${r.id}. Is this the right rule for the tradition(s) named, in how its sound is spelled and where the stress falls? Say which tradition or community you judge by. If the rule is wrong, say what you would say instead; the example words are only illustrations.`,
        flags: DERIVED_FLAG, source: 'docs/pronunciation/VARIANTS.md', secs: 120, words: 0,
      }));
    }
    for (const t of TRADITIONS) for (const x of samples[t]) {
      const v = x.rec.variants[t];
      const st = (v.stress || []).filter(Boolean).map((s) => `stressed syllable ${s.syllable} of ${s.of} (${s.rule})`).join('; ');
      items.push(mk('pron-rules', `s:${t}:${x.rec.id}`, {
        he: x.rec.he, translit: `${t}: ${v.simple}${v.ipa ? `  /${v.ipa}/` : ''}`, en: String(x.rec.en || ''),
        check: `RULES ON THIS ROW: ${x.rules.join(', ')} (flag: rules are record-level and may concern another tradition). Tradition: ${t}. Does the respelling follow from the pointing by the rules of this tradition (vowels, consonants, stress)? ${st ? 'Stress: ' + st + '. ' : ''}Judge how it sounds, not the spelling system.`,
        flags: DERIVED_FLAG, source: `${x.rec._file}#records.${x.rec._i}`, secs: 30, words: 0,
      }));
    }
  }
  items.push(...(await genericFile(ctx, 'pron-rules', 'data/pronunciation/runtime/rules.json')));
  return items;
}

// ------------------------------------------------------------------ driver
const EXTRACTORS = {
  'opening-prayer': openingPrayer, prayers, 'prayer-prompts': prayerPrompts, 'prayer-guide': prayerGuide,
  'israel-everyday': israelEveryday, lessons, dialogues, 'gender-pairs': genderPairs, loanwords, hints, phrasebook,
  'letter-strokes': letterStrokes, mnemonics, 'pron-soundgap': soundgap, 'pron-prayerwords': prayerWords,
  'pron-vowels': pronVowels, 'pron-traditions': pronTraditions, calendar, torahread, intermediate, firstday, speak, 'pron-rules': pronRules,
  'vocab-top1000': (c) => vocab(c, 'vocab-top1000'), 'vocab-rest': (c) => vocab(c, 'vocab-rest'),
};

/** Data files that some extracted item names (as its source or as a flip/fix target). */
export function coveredFiles(byArea) {
  const covered = new Set();
  for (const it of Object.values(byArea).flat()) {
    covered.add(it.source.split('#')[0].split(' ')[0]);
    for (const t of [it.flip?.target, ...(it.flip?.targets || []), ...Object.values(it.fields || {}).flatMap((f) => f.targets || [])].filter(Boolean)) covered.add(t.file);
  }
  return covered;
}

/** Extract all areas. Returns { items, byArea }. Throws on duplicate ids. */
export async function extractAll(root, only) {
  const ctx = await makeCtx(root);
  const byArea = {};
  const seen = new Set();
  for (const a of AREAS) {
    if (a.slug === 'other-flagged' || (only && !only.includes(a.slug))) continue;
    const list = await EXTRACTORS[a.slug](ctx);
    for (const it of list) {
      if (seen.has(it.id)) throw new Error(`duplicate item id ${it.id}`);
      seen.add(it.id);
    }
    byArea[a.slug] = list;
  }
  // catch-all: any data file with flagged records that no dedicated area claimed is picked up generically,
  // so newly added data is never silently skipped.
  if (!only || only.includes('other-flagged')) {
    const covered = coveredFiles(byArea);
    const audit = await auditScan(root);
    const extra = [];
    for (const d of audit.data) if (!covered.has(d.file) && !claimFor(d.file)) extra.push(...(await genericFile(ctx, 'other-flagged', d.file)));
    for (const it of extra) { if (seen.has(it.id)) throw new Error(`duplicate item id ${it.id}`); seen.add(it.id); }
    byArea['other-flagged'] = extra;
  }
  return { ctx, byArea, items: Object.values(byArea).flat() };
}

// ------------------------------------------------------------------ audit scan of data/** and docs/**
const SKIP_DIRS = new Set(['node_modules', '.git', 'out', '_benchmark', 'images']);
async function* walk(dir) {
  let ents = [];
  try { ents = await readdir(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) yield* walk(join(dir, e.name)); }
    else yield join(dir, e.name);
  }
}

function countFlagged(node, acc) {
  if (Array.isArray(node)) { for (const x of node) countFlagged(x, acc); return; }
  if (!node || typeof node !== 'object') return;
  const f = ownFlags(node);
  const hard = f.filter((x) => /^(proofread:false|needsNativeReview|needsNativeSpeaker|typedFromMemory|needsVerification|draft$|validated:false|clergyReviewed:false)/.test(x));
  if (hard.length) for (const h of hard) acc[h.split(':')[0]] = (acc[h.split(':')[0]] || 0) + 1;
  for (const v of Object.values(node)) if (v && typeof v === 'object') countFlagged(v, acc);
}

/** Count flagged records per data file and textual markers per docs file (audit; independent of extractors). */
export async function auditScan(root) {
  const data = [], docs = [];
  for await (const f of walk(join(root, 'data'))) {
    if (!f.endsWith('.json')) continue;
    const rel = relative(root, f).split(sep).join('/');
    if (/data\/(audio|photo|images)\//.test(rel)) continue;
    let st; try { st = await stat(f); } catch { continue; }
    if (st.size > 12_000_000) continue; // words.json (7 MB) is fine; skip anything bigger
    let j; try { j = JSON.parse(await readFile(f, 'utf8')); } catch { continue; }
    const acc = {};
    countFlagged(j, acc);
    if (Object.keys(acc).length) data.push({ file: rel, flags: acc, total: Object.values(acc).reduce((a, b) => a + b, 0) });
  }
  const MARK = /proofread\s*[:=]\s*false|needsNativeReview|typedFromMemory|needsVerification|\bDRAFT\b|not (yet )?proofread|not been reviewed|unreviewed|pending (clergy|native)/gi;
  for await (const f of walk(join(root, 'docs'))) {
    if (!/\.(md|html|txt)$/.test(f)) continue;
    const rel = relative(root, f).split(sep).join('/');
    if (rel.startsWith('docs/review/')) continue;
    const t = await readFile(f, 'utf8');
    const m = t.match(MARK);
    if (m) docs.push({ file: rel, markers: m.length });
  }
  return { data, docs };
}
