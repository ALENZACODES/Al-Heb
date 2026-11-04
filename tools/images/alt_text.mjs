#!/usr/bin/env node
// Alt text for every ingested generated image, derived from the prompt snapshot in data/images/provenance.json
// (plus the letter / vocabulary data in spec.mjs for context), written as the `altText` map (id -> text) of
// data/images/generated-manifest.json. Every other field of the manifest is left as ingest.mjs wrote it.
// The text describes what the prompt asked for, so an image flagged for a wrong backdrop (docs/images/REDO-LIST.md) is
// described as intended until it is redone.
//   node tools/images/alt_text.mjs          write the map (idempotent)
//   node tools/images/alt_text.mjs --print  print id and text, write nothing
// Re-run after `node tools/images/ingest.mjs manifest`, which rebuilds the file without this map.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LETTERS } from './spec.mjs';
import { readJson, writeJsonAtomic } from './ingest_lib.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const MANIFEST = join(ROOT, 'data/images/generated-manifest.json');
export const PROVENANCE = join(ROOT, 'data/images/provenance.json');
export const MAX_LEN = 200;

const STYLE_END = 'consistent 3/4 top-down light from upper left.';
const SCENE = {
  BG_jerusalem: 'a Jerusalem stone courtyard at golden hour',
  BG_market: 'a Carmel Market fruit stall',
  BG_telaviv: 'the Tel Aviv beachfront boulevard',
  BG_cafe: 'an Israeli cafe terrace',
  BG_shabbat: 'a Shabbat table before the meal',
  BG_synagogue: 'a synagogue interior facing the ark',
};
const MOUTH = { ah: "'ah' (open)", ee: "'ee' (lips spread)", eh: "'eh' (half open)", oh: "'oh' (rounded)", oo: "'oo' (rounded tight)", closed: 'closed lips, no vowel' };
const CHAR_NAME = { ari: 'Ari', noa: 'Noa' };

/** The prompt minus the style guide and the trailing no-text sentence. */
export function bareprompt(prompt) {
  let p = String(prompt ?? '');
  const i = p.indexOf(STYLE_END);
  if (i >= 0) p = p.slice(i + STYLE_END.length);
  p = p.replace(/CHARACTER SHEET [AB] '(?:Ari|Noa)':[^.]*(?:default|confident)\.\s*/g, '');
  p = p.replace(/\s*No text, letters or numerals anywhere in the image\.?\s*$/, '').trim();
  return p;
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const period = (s) => (/[.!?]$/.test(s) ? s : `${s}.`);
const clean = (s) => period(cap(s.replace(/\s+/g, ' ').trim()));

function letterOf(id) {
  const m = /^L(\d\d)_([a-z_]+?)_(print|cursive)_([a-z0-9]+)$/.exec(id);
  if (!m) return null;
  const L = LETTERS.find((l) => l.nn === m[1]);
  return L ? { L, script: m[3], slot: m[4] } : null;
}
/** Vocabulary entry (english, transliteration) for a word of a letter, matched on the prompt's wording. */
function vocabOf(L, word) {
  const w = word.trim().toLowerCase();
  return L.vocab.find(([en]) => en.toLowerCase() === w) ?? null;
}
/** "sun and calendar day (today)" + "hayom" -> "sun and calendar day, today (Hebrew: hayom)". */
const wordWithHebrew = (L, word) => {
  const v = vocabOf(L, word);
  const m = /^(.*?)\s*\((.+)\)\s*$/.exec(word.trim());
  const base = m ? `${m[1]}, ${m[2]}` : word.trim();
  return v ? `${base} (Hebrew: ${v[1]})` : base;
};

/** Alt text for one image. Returns a plain sentence or two, under MAX_LEN characters. */
export function altTextFor(id, prompt) {
  const p = bareprompt(prompt);
  const let_ = letterOf(id);
  let out = null;
  if (let_) {
    const { L, script, slot } = let_;
    const letter = `the Hebrew letter ${L.title}${script === 'cursive' ? ' (cursive)' : ''}`;
    let m;
    if ((m = /^the keyword object: (.+?), drawn so its outline echoes/.exec(p))) out = `${m[1]}, drawn so its outline echoes the shape of ${letter}: ${L.shape}`;
    else if ((m = /^(Ari|Noa) pointing at the keyword object: (.+?), drawn so/.exec(p))) out = `${m[1]} points at ${m[2].toLowerCase()}, the memory picture for ${letter}`;
    else if (/^The attached object as a bold solid charcoal/.test(p)) out = `Solid charcoal silhouette of ${L.keyword.toLowerCase()}, the memory picture for ${letter}`;
    else if ((m = /^One clean centred image of: (.+)$/.exec(p))) out = `${wordWithHebrew(L, m[1].replace(/\.$/, ''))}, a vocabulary picture for ${letter}`;
    else if ((m = /^(.+?) placed naturally in the attached background scene \((BG_[a-z]+)\)/.exec(p))) out = `${wordWithHebrew(L, m[1])} in ${SCENE[m[2]] ?? 'a background scene'}, a vocabulary scene for ${letter}`;
    else if (slot === 'quirky' || /quirky/i.test(p)) out = `Playful memory picture for ${letter}: ${p}`;
  } else {
    let m;
    if ((m = /^Wide \d+x\d+ background scene with no people: (.+)$/.exec(p))) out = `Background scene with no people: ${m[1].replace(/\.$/, '')}`;
    else if ((m = /^(CHAR|TEST)_/.exec(id))) {
      const who = CHAR_NAME[id.split('_')[1]] ?? 'Narrator';
      if (/4-panel/.test(p)) out = `Four-panel character sheet of ${who}: front, three-quarter and side views, and a waist-up explaining pose`;
      else if ((m = /^Head-and-shoulders portrait, (.+?)\. Match/.exec(p))) out = `${who}, head-and-shoulders portrait, ${m[1].replace(/^'([^']+)'/, '"$1"')}`;
      else if ((m = /^(.+?)\. Match the attached character sheet exactly\.?$/.exec(p))) out = `${who} ${m[1]}`;
      else if ((m = /^(Noa handing Ari .+?) at the cafe background \(attached\)/.exec(p))) out = `${m[1]} on a cafe terrace`;
    } else if (/^FRAME_/.test(id)) {
      out = /split into two blank squares/.test(p)
        ? 'Empty flashcard frame: a cream card with a thin gold border, two blank squares side by side above and a blank caption strip below'
        : 'Empty flashcard frame: a cream card with a thin gold border, a large blank square above and a blank caption strip below';
    } else if ((m = /^MOUTH_(\w+)$/.exec(id))) out = `Close-up mouth shape for the vowel sound ${MOUTH[m[1]] ?? m[1]}`;
    else if (/^STYLE_/.test(id)) out = `Style sample: ${p.charAt(0).toLowerCase()}${p.slice(1).replace(/\.$/, '')}`;
  }
  if (!out) out = p.replace(/\(attached\)|the attached /g, '').trim() || id.replace(/_/g, ' ');
  out = clean(out);
  if (out.length > MAX_LEN) out = `${out.slice(0, MAX_LEN - 1).replace(/[,;:\s]+\S*$/, '')}.`;
  return out;
}

/** altText map for every image in a provenance object (id -> text), ids sorted. */
export function buildAltText(prov) {
  const out = {};
  for (const id of Object.keys(prov.images).sort()) out[id] = altTextFor(id, prov.images[id].prompt);
  return out;
}

/** Writes the map into the manifest, keeping every other field. Returns the count. */
export function writeAltText({ manifest = MANIFEST, provenance = PROVENANCE } = {}) {
  const prov = readJson(provenance, null);
  if (!prov?.images) throw new Error(`no provenance at ${provenance}`);
  const man = readJson(manifest, null);
  if (!man?.images) throw new Error(`no manifest at ${manifest}`);
  const altText = buildAltText(prov);
  const { altText: _old, ...rest } = man;
  writeJsonAtomic(manifest, { ...rest, altText });
  return Object.keys(altText).length;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--print')) {
    const prov = JSON.parse(readFileSync(PROVENANCE, 'utf8'));
    for (const [id, t] of Object.entries(buildAltText(prov))) console.log(`${id}\t${t}`);
  } else {
    console.log(`altText written for ${writeAltText()} image(s) -> ${MANIFEST}`);
  }
}
