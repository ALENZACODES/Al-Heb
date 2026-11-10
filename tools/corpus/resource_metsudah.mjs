#!/usr/bin/env node
// Re-source corpus records whose pointed Hebrew came from "The Metsudah siddur, 1981" (Sefaria label CC-BY).
//
//   node tools/corpus/resource_metsudah.mjs            # fetch, check, swap, write registry + snapshot + docs/corpus/RESOURCE-METSUDAH.md
//   node tools/corpus/resource_metsudah.mjs --dry-run  # fetch and report only; writes nothing
//   node tools/corpus/resource_metsudah.mjs --revert   # put the Metsudah source back from the snapshot history (no network)
//
// What it does, per record in PLAN:
//   1. Fetches the candidate Sefaria page (version=hebrew|all) and picks the version by exact title + licence label.
//   2. Refuses the whole page when it carries the Metsudah typographic fingerprint (U+0592 sheva-na marker or
//      U+05BA holam haser), because a "Public Domain" page that is byte-for-byte Metsudah typography is not a new source.
//   3. Takes the stated raw lines VERBATIM into data/corpus/source-snapshot.json (the old Metsudah item is kept in
//      `history`), applies the record's transforms with src/corpus/normalize.js applyTransforms, and requires:
//        - identical consonant skeleton to the current text (same words, same spelling),
//        - no hard failure from tools/corpus/verify_texts.mjs checkHebrew,
//        - a vowel on every word and a dot on every shin (a shin without shin/sin dot is ambiguous for a learner).
//      Any failure leaves the record untouched and is listed in the report.
//   4. Rewrites the registry record (he, source, licence, attribution, status, transforms, retrieved, resourced) and
//      writes docs/corpus/RESOURCE-METSUDAH.md with a character-by-character diff of every word that changed.
// Nothing here types or corrects Hebrew: every stored string is a fetched string, or the output of the documented
// normaliser on a fetched string. The tool is idempotent: re-running after src/corpus/tools/build-registry.mjs
// (which does not know about these swaps) re-applies them.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyTransforms, foldedSkeleton, wordsOf } from '../../src/corpus/normalize.js';
import { checkHebrew, HARD } from './verify_texts.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const REG = path.join(ROOT, 'data/corpus/registry.json');
const SNAP = path.join(ROOT, 'data/corpus/source-snapshot.json');
const DOC = path.join(ROOT, 'docs/corpus/RESOURCE-METSUDAH.md');
const TOOL = 'tools/corpus/resource_metsudah.mjs';
const METSUDAH = 'The Metsudah siddur, 1981';

/** Candidate source per record. `lines` are 0-based paragraph indexes on the Sefaria page (flattened). */
export const PLAN = {
  'shema-2': { ref: 'Siddur Sefard, Shabbat Eve Mincha, Mincha', version: 'Torat Emet 357', license: 'Public Domain', lines: [27] },
  'torah-barchu': { ref: 'Siddur Edot HaMizrach, Weekday Shacharit, Torah Reading', version: 'Shaliehsaboo Edition', license: 'CC0', lines: [11, 12], transforms: { dropSmall: true } },
  'torah-bless-2': { ref: 'Siddur Sefard, Shabbat Morning Services, Blessings on Torah Reading', version: 'Torat Emet 357', license: 'Public Domain', lines: [6] },
  'adon-olam-1': { ref: 'Siddur Sefard, Musaf', version: 'Torat Emet 357', license: 'Public Domain', lines: [152], splitAt: ':' },
  'lecha-hashem': { ref: 'Siddur Sefard, Shabbat Morning Services, Shabbat Torah Reading', version: 'Torat Emet 357', license: 'Public Domain', lines: [20], transforms: { dropSmall: true } },
  'vezot-hatorah': { ref: 'Siddur Sefard, Rosh Chodesh, Torah Reading', version: 'Torat Emet 357', license: 'Public Domain', lines: [27] },
  'etz-chaim': { ref: 'Siddur Sefard, Rosh Chodesh, Torah Reading', version: 'Torat Emet 357', license: 'Public Domain', lines: [28], transforms: { clip: { startAt: 'עץ', endAfter: 'ויאדיר' } } },
  'avot-closing': { ref: 'Siddur Sefard, Shabbat Morning Services, Amidah', version: 'Torat Emet 357', license: 'Public Domain', lines: [3] },
  'amidah-yihyu': { ref: 'Siddur Sefard, Various Prayers & Segulot, Prayer of the Shelah', version: 'Torat Emet 357', license: 'Public Domain', lines: [12] },
  'oseh-shalom': { ref: 'Siddur Sefard, Shabbat Eve Mincha, Amidah', version: 'Torat Emet 357', license: 'Public Domain', lines: [73], transforms: { dropParen: true } },
  'kiddush-shabbat-eve': { ref: 'Siddur Sefard, Shabbat Evening Meal, Shabbat Eve Kiddush', version: 'Torat Emet 357', license: 'Public Domain', lines: [7] },
  'hagomel': { ref: 'Siddur Sefard, Shabbat Morning Services, Thanksgiving Blessing', version: 'Torat Emet 357', license: 'Public Domain', lines: [1, 2], transforms: { dropTokens: ['הקהל', 'עונה', 'אמנ', 'ואומרימ'] } },
};

/** Records that stay on the Metsudah text, with what was tried (2026-11-04). */
export const NOT_RESOURCED = {
  'modeh-ani-1': 'Siddur Edot HaMizrach, Preparatory Prayers, Modeh Ani (Shaliehsaboo CC0 and Torat Emet 357 "Public Domain", line 3) has the same words, but prints שֶהֶחֱזַרְתָּ with no shin dot and בְחֶמְלָה without dagesh. A shin with no dot fails the quality gate. Second pass: Daat Siddur Ashkenaz (Public Domain), "Siddur Ashkenaz, Shabbat, Shacharit, Preparatory Prayers, Modeh Ani", has the same words with the same vowels and a shin dot, but the paragraph begins with a stray qamats that sits on no letter (hard failure mark-no-letter). Not replaced: dropping that mark would be editing the source.',
  'vayehi-binsoa': 'The only consonant-identical match (Torat Emet 357, "Siddur Sefard, Shabbat Mincha, Korbanot" line 22) is on a page that carries the Metsudah typographic fingerprint (124 U+0592 sheva-na markers, 24 U+05BA holam haser), so it is the same digitisation under another label. Rejected. Numbers 10:35 and Isaiah 2:3 could come from UXLC, but the closing line "Baruch shenatan" is not biblical, so the record could not be rebuilt from one clean source.',
  'kaddish-1': 'Torat Emet 357 Sefard pages (Kabbalat Shabbat line 41 and others) differ in wording: they add וְיַצְמַח פֻּרְקָנֵהּ וִיקָרֵב מְשִׁיחֵהּ and spell דְּקֻדְשָׁא / וְנֶחֱמָתָא differently; the Edot HaMizrach Kaddish differs more. Not a full match of the Ashkenaz wording. Second pass: Daat Siddur Ashkenaz (Public Domain), "Siddur Ashkenaz, Kaddish, Mourner\'s Kaddish", carries rubrics and non-Hebrew characters (hard failures) and spells דְּקֻדְשָׁא differently. Not an exact match.',
  'brich-shmei': 'Torat Emet 357 "Siddur Sefard, Rosh Chodesh, Torah Reading" line 3 differs in wording (בְּטִיבוּתָא for בְּטִיבוּ, וּמִקַּמָּא for וּמִקַּמֵּי, closing אָמֵן) and vowels (לֹא for לָא, בֶּאֱלָהָא for בֵּאלָהָא, לְטַב for לְטָב). Not a full match. Second pass: Daat Siddur Ashkenaz (Public Domain), "Siddur Ashkenaz, Shabbat, Shacharit, Torah Reading, Removing the Torah from the Ark, Berich Shmei", passes the quality gate but its consonants differ in one word (a doubled yod in בטיבו) and several words are pointed differently (for example וּפוּרְקָן for וּפֻרְקַן). Different text variant, not an exact match.',
  'amidah-elohai-netzor': 'No consonant-identical run on any Torat Emet 357 or Shaliehsaboo page (the Sefard pages spell נְצֹר without vav and continue with different wording).',
  'sim-shalom': 'Torat Emet 357 Sefard Amidah pages have the Sefard wording (adds חַיִּים, יִהְיֶה, לְבָרְכֵנוּ וּלְבָרֵךְ אֶת כָּל, בְּרֹב עֹז וְשָׁלוֹם); Edot HaMizrach differs more. Not a full match. Second pass: Daat Siddur Ashkenaz has Sim shalom only on the Minchah and Shabbat pages (different wording, Shalom rav family).',
  'lecha-dodi-1': 'Torat Emet 357 "Siddur Sefard, Kabbalat Shabbat" lines 16-18 spells הַמְּיֻחָד without vav (consonants differ) and prints ולִתְהִלָּה with no vowel on the vav. Not a full match.',
  'yigdal': 'Edot HaMizrach pages (Shaliehsaboo CC0, Torat Emet 357) have the Sephardi wording (בְּקַדְמוּתוֹ, חָסִיד, יָמִין, and a fourteenth line). No Sefard page has Yigdal in a non-Metsudah version. Not a full match. Second pass: Daat Siddur Ashkenaz (Public Domain), "Siddur Ashkenaz, Shabbat, Shacharit, Preparatory Prayers, Yigdal", has the Ashkenaz wording but many words with no vowels, a shin with no dot and בְּקַדְמוּתו for בְּקַדְמָתוֹ. Fails the quality gate. Candidate not retrievable by tool: Open Siddur Project, "yigdal by daniel ben yehudah, translation by tsvi hirsch filipowski 1862" (https://opensiddur.org/prayers/solilunar/everyday/daytime/baqashot/yigdal-by-daniel-ben-yehudah-translation-by-tsvi-hirsch-filipowski-1862), which states "Shared on: 5 December 2021 under the Creative Commons Zero (CC 0) Universal license a Public Domain dedication" and a pointed Hebrew text from Tefilot Yisrael (1862); the licence line was read through a page-reading tool on 2026-11-04, but the site returns a Cloudflare challenge (HTTP 403) to curl, so the Hebrew could not be fetched verbatim and was not compared or used.',
  'zimun-opening': 'Torat Emet 357 "Siddur Sefard, Birchat HaMazon, Birchat HaMazon" prints the invitation inside a Yiddish rubric ("רַבּוֹתַי. מִיר וֶועלֶן בֶּענְטְשְׁן (או רַבּוֹתַי נְבָרֵךְ)") and a longer response; no clean two-line match.',
};

/** Licence evidence read on 2026-11-04 (see docs/corpus/RESOURCE-METSUDAH.md section 1). */
export const LICENCE_EVIDENCE = {
  metsudahVersionMetadata: { url: 'https://www.sefaria.org/api/v3/texts/Siddur%20Ashkenaz%2C%20Weekday%2C%20Shacharit%2C%20Preparatory%20Prayers%2C%20Modeh%20Ani?version=hebrew%7CThe%20Metsudah%20siddur%2C%201981', fetched: '2026-11-04', says: { license: 'CC-BY', versionSource: 'https://www.nli.org.il/he/books/NNL_ALEPH002211687', versionNotes: '', status: 'locked', digitizedBySefaria: '' } },
  sefariaDeveloperPage: { url: 'https://developers.sefaria.org/docs/usage-of-our-name-and-logo', fetched: '2026-11-04', quotes: ['Each version of a text has its own license.', 'Texts in the public domain can be reused without restriction.', 'Texts with a Creative Commons license may carry requirements to give attribution, share derived work, or limit usage in commercial contexts.', 'Texts with no noted license have not yet had their copyright status verified by Sefaria.'] },
  sefariaHelpPage: { url: 'https://help.sefaria.org/hc/en-us/articles/18490043237148-How-to-Find-and-Understand-Licensing-or-Copyright-Information', fetched: '2026-11-04', quotes: ['Texts in the public domain can be reused without restriction.', 'Texts with a Creative Commons license may carry requirements to give attribution.'] },
  sefariaReuseSheet: { url: 'https://prod.sefaria.org.il/sheets/228381', fetched: '2026-11-04', quotes: ['Texts with a CC BY license must be attributed to the publisher.', 'Sefaria has not verified the copyright status of a text (when no licence or Public Domain notice appears).'] },
  nliMetsudahRecord: { url: 'https://www.nli.org.il/en/books/NNL_ALEPH990003580480205171/NLI', fetched: '2026-11-04', says: 'The Metsudah siddur: a new linear siddur with English translation and anthology of the classic commentaries; Davis, Avrohom Yosef; [Metsudah Publications]; [New York?]; 1983, c1982; "It may be prohibited to copy and use of the item for purposes of reproduction, publication"' },
  toratEmetSite: { url: 'http://www.toratemetfreeware.com/', fetched: '2026-11-04', says: 'Home page footer reads "כל הזכויות שמורות ©" (all rights reserved). No licence text for the siddur data was found on the page; the "Public Domain" label is Sefaria\'s.' },
  sefariaTermsPage: { url: 'https://www.sefaria.org/terms', fetched: '2026-11-04', says: 'Rendered client-side; the fetch returned navigation only, no terms text. Not read.' },
};

const DIFF_CODES = (w) => [...w].map((c) => 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join(' ');
const flat = (t) => (Array.isArray(t) ? t.flatMap(flat) : [t]);
const strip = (w) => w.replace(/׃$/, '');
const splitWords = (s) => s.replace(/־/g, ' ').split(/\s+/).filter(Boolean);

/** Quality gate on display Hebrew. Returns [] when clean, else reasons. */
export function qualityIssues(he) {
  const out = [];
  const { issues } = checkHebrew(he);
  for (const i of issues) if (HARD.has(i.code)) out.push(`hard:${i.code}@${i.at}`);
  for (const w of wordsOf(he)) {
    if (!/[ְ-ׇּ]/.test(w)) out.push(`no-vowel:${w}`);
    const nfd = w.normalize('NFD');
    if (/ש(?![֑-ֽֿ]*[ׁׂ])/u.test(nfd)) out.push(`undotted-shin:${w}`);
  }
  return out;
}

/**
 * Word-by-word diff of two display strings with identical skeletons. Words are counted with maqaf as a separator so
 * the two strings align; a maqaf that one string has and the other lacks is reported as its own `maqaf` entry
 * (punctuationOnly: true) because it changes the reader's word ids even though no letter or vowel changes.
 */
export function wordDiff(oldHe, newHe) {
  const a = splitWords(oldHe), b = splitWords(newHe);
  const d = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] || '', y = b[i] || '';
    if (x !== y) d.push({ i, old: x, new: y, oldCodes: DIFF_CODES(strip(x)), newCodes: DIFF_CODES(strip(y)), punctuationOnly: strip(x) === strip(y) });
  }
  // maqaf joins: walk the whitespace tokens of each string and note where the joins differ
  const joins = (s) => { const out = new Map(); let i = 0; for (const tok of s.split(/\s+/).filter(Boolean)) { const n = tok.split('־').length; if (n > 1) out.set(i, tok); i += n; } return out; };
  const ja = joins(oldHe), jb = joins(newHe);
  for (const i of new Set([...ja.keys(), ...jb.keys()])) {
    if (ja.get(i) === jb.get(i)) continue;
    const x = ja.get(i) || a.slice(i, i + (jb.get(i) || '').split('־').length).join(' ');
    const y = jb.get(i) || b.slice(i, i + (ja.get(i) || '').split('־').length).join(' ');
    d.push({ i, old: x, new: y, oldCodes: DIFF_CODES(strip(x)), newCodes: DIFF_CODES(strip(y)), punctuationOnly: true, maqaf: true });
  }
  return d.sort((p, q) => p.i - q.i);
}

async function fetchPage(ref) {
  const apiUrl = 'https://www.sefaria.org/api/v3/texts/' + encodeURIComponent(ref) + '?version=hebrew%7Call';
  const r = await fetch(apiUrl);
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${apiUrl}`);
  const j = await r.json();
  return { apiUrl, url: 'https://www.sefaria.org/' + encodeURIComponent(ref.replace(/ /g, '_')), versions: j.versions || [], fetchedAt: new Date().toISOString() };
}

export function pickVersion(versions, title, license) {
  return versions.find((v) => (v.versionTitle || '').trim() === title && v.license === license) || null;
}

export function buildRawLines(flatText, plan) {
  const raw = plan.lines.map((i) => String(flatText[i] ?? ''));
  if (plan.splitAt) {
    if (raw.length !== 1) throw new Error('splitAt needs exactly one line');
    const parts = raw[0].split(plan.splitAt).map((p) => p.trim()).filter(Boolean).map((p) => p + plan.splitAt);
    return { rawLines: parts, splitFrom: { lineIndex: plan.lines[0], raw: raw[0], splitAt: plan.splitAt } };
  }
  return { rawLines: raw };
}

function attributionFor(version, license) {
  if (/Shaliehsaboo/.test(version)) return 'Hebrew text: Siddur Edot HaMizrach, "Shaliehsaboo Edition", from Sefaria where it is labelled CC0 (no attribution required; credit given as a courtesy). Label not independently verified. English: original literal gloss.';
  return `Hebrew text: ${version} (toratemetfreeware.com), as digitised on Sefaria where it is labelled ${license}. Label not independently verified; the toratemetfreeware.com home page carries an all-rights-reserved footer (read 2026-11-04). English: original literal gloss.`;
}

/** Apply one plan entry. Returns a result object; mutates reg/snap only when ok and !dryRun. */
export async function resourceOne(id, plan, reg, snap, { dryRun = false, page = null } = {}) {
  const rec = reg.entries.find((e) => e.id === id);
  if (!rec) return { id, ok: false, reason: 'record not in registry' };
  const current = snap.items[rec.snapshotId];
  const previous = current && current.resourced ? current.history?.[0] : current;
  if (!previous || previous.versionTitle !== METSUDAH) return { id, ok: false, reason: 'current snapshot item is not the Metsudah text; nothing to replace' };
  const oldHe = (current.resourced ? previous.metsudahHe : rec.he) || rec.he;
  const pg = page || await fetchPage(plan.ref);
  const v = pickVersion(pg.versions, plan.version, plan.license);
  if (!v) return { id, ok: false, reason: `version "${plan.version}" [${plan.license}] not on page ${plan.ref}` };
  const flatText = flat(v.text);
  const whole = flatText.join('\n');
  const fp = { u0592: (whole.match(/֒/g) || []).length, u05ba: (whole.match(/ֺ/g) || []).length };
  if (fp.u0592 || fp.u05ba) return { id, ok: false, reason: `page carries the Metsudah fingerprint (U+0592 x${fp.u0592}, U+05BA x${fp.u05ba})` };
  const { rawLines, splitFrom } = buildRawLines(flatText, plan);
  if (rawLines.some((l) => !/[א-ת]/.test(l))) return { id, ok: false, reason: 'a selected line has no Hebrew' };
  const transforms = plan.transforms || {};
  let lines;
  try { lines = applyTransforms(rawLines, transforms); } catch (e) { return { id, ok: false, reason: 'transforms failed: ' + e.message }; }
  const he = lines.join('\n');
  const skelOld = splitWords(oldHe).map(foldedSkeleton).join(' ');
  const skelNew = splitWords(he).map(foldedSkeleton).join(' ');
  if (skelOld !== skelNew) return { id, ok: false, reason: 'consonant skeleton differs from the current text', he };
  const q = qualityIssues(he);
  if (q.length) return { id, ok: false, reason: 'quality gate: ' + q.join(', '), he };
  const diff = wordDiff(oldHe, he);
  const result = { id, ok: true, ref: plan.ref, version: plan.version, license: plan.license, lines: plan.lines, he, oldHe, diff, transforms, rawLines, fetchedAt: pg.fetchedAt, apiUrl: pg.apiUrl };
  if (dryRun) return result;
  const date = pg.fetchedAt.slice(0, 10);
  // First swap: park the Metsudah item (and the registry fields it produced) in history. Later runs keep that item as is.
  const metsudahItem = current.resourced ? previous : { ...current, metsudahHe: rec.he, metsudahStatus: rec.status, metsudahTransforms: rec.transforms ?? null, replacedOn: date };
  snap.items[rec.snapshotId] = {
    kind: 'sefaria-siddur', ref: plan.ref, versionTitle: plan.version, license: plan.license, versionSource: v.versionSource || '',
    url: pg.url, apiUrl: pg.apiUrl, lineIndexes: plan.lines, rawLines, fetchedAt: pg.fetchedAt,
    ...(splitFrom ? { splitFrom } : {}),
    resourced: { from: METSUDAH, on: date, by: TOOL, reason: 'Metsudah is a 1981 edition labelled CC-BY by Sefaria; replaced with a version Sefaria labels ' + plan.license + '. Both labels are Sefaria\'s; see docs/corpus/RESOURCE-METSUDAH.md.' },
    licenceEvidence: { sefariaVersionLabel: plan.license, versionSource: v.versionSource || '', read: 'docs/corpus/RESOURCE-METSUDAH.md section 1' },
    history: [metsudahItem],
  };
  rec.he = he; rec.lines = lines.length;
  rec.source = `${plan.version} via Sefaria: ${plan.ref}`;
  rec.sourceUrl = pg.url;
  rec.license = plan.license;
  rec.attribution = attributionFor(plan.version, plan.license);
  rec.status = 'verified';
  rec.verifiedAgainst = `Normalised he equals the programmatic normalisation (src/corpus/normalize.js) of the raw string fetched on ${date} from ${pg.apiUrl}. This is a machine comparison against the cited source, NOT proofreading by a Hebrew educator (see proofread).`;
  rec.retrieved = date;
  rec.transforms = transforms;
  rec.nusach = (/Shaliehsaboo/.test(plan.version) ? 'Edot HaMizrach (Shaliehsaboo edition)' : 'Sefard (Torat Emet 357)') + '; consonants identical to the Ashkenaz (Metsudah) text this record carried before 2026-11-04';
  rec.resourced = { from: METSUDAH, on: date, by: TOOL, wordsChanged: diff.filter((d) => !d.punctuationOnly).length, punctuationChanged: diff.filter((d) => d.punctuationOnly).length, previousStatus: metsudahItem.metsudahStatus };
  return result;
}

export function revertOne(id, reg, snap) {
  const rec = reg.entries.find((e) => e.id === id);
  const item = rec && snap.items[rec.snapshotId];
  if (!item || !item.resourced || !item.history?.[0]) return { id, ok: false, reason: 'not re-sourced' };
  const old = item.history[0];
  const { metsudahHe, metsudahStatus, metsudahTransforms, replacedOn, ...restored } = old;
  snap.items[rec.snapshotId] = restored;
  rec.he = metsudahHe; rec.lines = metsudahHe.split('\n').length;
  rec.source = `${old.versionTitle} via Sefaria: ${old.ref}`; rec.sourceUrl = old.url; rec.license = old.license;
  rec.attribution = 'Hebrew text: The Metsudah siddur (Metsudah Publications, 1981), as digitised on Sefaria where it is labelled CC-BY. Attribute to Metsudah Publications and credit Sefaria as the source. THE LICENCE LABEL IS SEFARIA\'S AND IS NOT INDEPENDENTLY VERIFIED. English: original literal gloss.';
  rec.status = metsudahStatus || 'verified';
  rec.retrieved = (old.fetchedAt || snap.fetchedAt).slice(0, 10);
  rec.verifiedAgainst = `Normalised he equals the programmatic normalisation (src/corpus/normalize.js) of the raw string fetched on ${rec.retrieved} from ${old.apiUrl}. This is a machine comparison against the cited source, NOT proofreading by a Hebrew educator (see proofread).`;
  if (metsudahTransforms?.corrections) rec.verifiedAgainst += ' EXCEPT these exact corrections, made because the source visibly omits a vowel: ' + metsudahTransforms.corrections.map(([a, b]) => `${a} -> ${b}`).join('; ') + '. Status is therefore transcribed-needs-check.';
  rec.nusach = 'Ashkenaz (Metsudah)';
  if (metsudahTransforms) rec.transforms = metsudahTransforms; else delete rec.transforms;
  delete rec.resourced;
  return { id, ok: true };
}

function renderDoc(results, reg, snap, when) {
  const L = [];
  L.push('# Re-sourcing the Metsudah corpus records');
  L.push('');
  L.push(`Written by \`${TOOL}\` on ${when}. Re-run the tool to regenerate; \`--revert\` restores the Metsudah text from the snapshot history. Nothing in this file is legal advice; nothing here has been read by a lawyer or proofread by a Hebrew educator.`);
  L.push('');
  L.push('## 1. What the licence sources actually say (read 2026-11-04)');
  L.push('');
  L.push('| Source | URL | What it says |');
  L.push('|---|---|---|');
  const E = LICENCE_EVIDENCE;
  L.push(`| Sefaria version metadata for "${METSUDAH}" (v3 texts API) | ${E.metsudahVersionMetadata.url} | \`license: "CC-BY"\`, \`versionSource: ${E.metsudahVersionMetadata.says.versionSource}\`, \`versionNotes: ""\`, \`status: "locked"\`, \`digitizedBySefaria: ""\`. No licence text, no statement of who granted CC-BY. |`);
  L.push(`| Sefaria versions index for Siddur Ashkenaz | https://www.sefaria.org/api/texts/versions/Siddur_Ashkenaz | Hebrew versions and labels: "The Metsudah siddur, 1981" CC-BY; "The Metsudah siddur: a new linear siddur ... 1981" CC-BY; "Torat Emet 357" **unknown** (on this index; it is "Public Domain" on Siddur Sefard and Siddur Edot HaMizrach); "Daat Siddur Ashkenaz" Public Domain; "Siddur Veshinantam" unknown; "Wikipedia" unknown. |`);
  L.push(`| Sefaria developer page "Copyright and Data Use" | ${E.sefariaDeveloperPage.url} | ${E.sefariaDeveloperPage.quotes.map((q) => `"${q}"`).join(' ')} |`);
  L.push(`| Sefaria help article on licensing | ${E.sefariaHelpPage.url} | ${E.sefariaHelpPage.quotes.map((q) => `"${q}"`).join(' ')} Does not say who assigns a label or that Sefaria guarantees it. |`);
  L.push(`| Sefaria sheet "Can I reuse a text I found on Sefaria for my project?" | ${E.sefariaReuseSheet.url} | ${E.sefariaReuseSheet.quotes.map((q) => `"${q}"`).join(' ')} |`);
  L.push(`| Sefaria terms of use | ${E.sefariaTermsPage.url} | ${E.sefariaTermsPage.says} |`);
  L.push(`| National Library of Israel record Sefaria links as the Metsudah source | ${E.nliMetsudahRecord.url} | ${E.nliMetsudahRecord.says} |`);
  L.push(`| Torat Emet freeware home page (source named by Sefaria for "Torat Emet 357") | ${E.toratEmetSite.url} | ${E.toratEmetSite.says} |`);
  L.push('');
  L.push('**Reading of the above.** The CC-BY label on the Metsudah text is Sefaria\'s own metadata; no licence text from Metsudah Publications was found, and the NLI catalogue record Sefaria cites carries a copying warning. Sefaria\'s own documentation says CC-BY texts "must be attributed to the publisher" and may carry conditions, and that unlabelled texts are unverified. The replacement labels used below ("Public Domain" for Torat Emet 357, "CC0" for the Shaliehsaboo edition) are **also Sefaria\'s labels and are not independently verified**; the Torat Emet site itself shows an all-rights-reserved footer. What this swap achieves is narrower than "licence-clear": it removes the identifiable 1981 publisher from the chain for 12 records and puts them on the same (unverified) footing as the 21 Torat Emet / Shaliehsaboo records the corpus already used. Open Siddur and Hebrew Wikisource were tried as public-domain alternatives and did not yield usable text (section 4).');
  L.push('');
  L.push('## 2. Records re-sourced');
  L.push('');
  const ok = results.filter((r) => r.ok);
  L.push(`${ok.length} of ${Object.keys(PLAN).length + Object.keys(NOT_RESOURCED).length} Metsudah records now cite another Sefaria version. Status is \`verified\` for each: the stored text equals \`applyTransforms(rawLines, transforms)\` on the fetched lines (checked by \`tests/corpus.hebrew.test.js\` and \`tests/corpus.resource.test.js\`). Every consonant is identical to the Metsudah text; the table lists every word whose marks or punctuation differ.`);
  L.push('');
  L.push('| id | new source (Sefaria page, 0-based paragraph) | version / label | words changed | punctuation only | transforms |');
  L.push('|---|---|---|---|---|---|');
  for (const r of ok) L.push(`| \`${r.id}\` | ${r.ref} [${r.lines.join(', ')}] | ${r.version} / ${r.license} | ${r.diff.filter((d) => !d.punctuationOnly).length} | ${r.diff.filter((d) => d.punctuationOnly).length} | \`${JSON.stringify(r.transforms)}\` |`);
  L.push('');
  L.push('### 2.1 Every difference, character by character (old = Metsudah text, new = replacement)');
  L.push('');
  for (const r of ok) {
    L.push(`#### \`${r.id}\``);
    if (!r.diff.length) { L.push('No difference: the normalised replacement equals the Metsudah text exactly.'); L.push(''); continue; }
    L.push('| word # | old | new | old code points | new code points | kind |');
    L.push('|---|---|---|---|---|---|');
    for (const d of r.diff) L.push(`| ${d.i + 1} | ${d.old} | ${d.new} | ${d.oldCodes} | ${d.newCodes} | ${d.maqaf ? 'maqaf join only (changes the reader word ids after it)' : d.punctuationOnly ? 'sof pasuq only' : describe(d)} |`);
    L.push('');
  }
  L.push('## 3. Records that stay on the Metsudah text');
  L.push('');
  L.push('| id | status | what was tried |');
  L.push('|---|---|---|');
  for (const [id, why] of Object.entries(NOT_RESOURCED)) { const e = reg.entries.find((x) => x.id === id); L.push(`| \`${id}\` | ${e ? e.license + ', ' + e.status : '?'} | ${why} |`); }
  for (const r of results.filter((x) => !x.ok)) L.push(`| \`${r.id}\` | planned but refused this run | ${r.reason} |`);
  L.push('');
  L.push('## 4. Sources tried and not used');
  L.push('');
  L.push('- **Sefaria, same pages (Siddur Ashkenaz)**: every one of the 17 Metsudah pages was re-fetched with `version=hebrew|all`; the only Hebrew version on each is Metsudah (one page also has "Shema with Cantillation", label unknown). Daat Siddur Ashkenaz (label Public Domain) has no version on these Weekday pages (it has parallel Shabbat, Kaddish and Festival pages; see the next bullet) and was already rejected for defective pointing on other prayers.');
  L.push('- **Sefaria, Siddur Sefard and Siddur Edot HaMizrach**: all 343 pages were fetched and searched for consonant-identical runs of each record. Hits are listed above.');
  L.push('- **Sefaria, second pass (2026-11-04)**: every leaf of Siddur Ashkenaz, Siddur Sefard and Siddur Edot HaMizrach (799 leaves; 792 page fetches succeeded, 5 failed to load) was fetched with `version=hebrew|all`, and every version labelled exactly Public Domain or CC0 was searched for each remaining record, by consonant skeleton, line by line and as a best-overlap window. Versions labelled `unknown` (Torat Emet 357 on Siddur Ashkenaz, Wikipedia, Veshinantam, Tanach with Nikkud) were not considered. New result: `hagomel` has a clean exact match on \"Siddur Sefard, Shabbat Morning Services, Thanksgiving Blessing\" (Torat Emet 357 / Public Domain; no fingerprint characters on the page), which earlier passes missed because they searched only for the Korbanot page; it was re-sourced with `dropTokens` for the four rubric words of the response. Nothing else matched exactly; near misses from Daat Siddur Ashkenaz are recorded in section 3. One page, "Siddur Sefard, Shabbat Mincha, Korbanot", is labelled Torat Emet 357 / Public Domain but carries 124 U+0592 sheva-na markers and 24 U+05BA holam haser, the typographic fingerprint of the Metsudah digitisation; it was excluded as not a distinct source. Likewise "Siddur Sefard, Shabbat Day Meal, Zemirot" (26 U+0592).');
  L.push('- **Open Siddur Project** (opensiddur.org): https://opensiddur.org/shared/prayers/solilunar/everyday/kaddish and https://opensiddur.org/tagged/kaddish-yatom returned a Cloudflare JavaScript challenge / HTTP 403 to a plain fetch on 2026-11-04, as did the Yigdal page and its WordPress REST endpoint in the second pass; the Wayback Machine was unreachable through the proxy. One Yigdal page was read through a page-reading tool (licence line only, see the `yigdal` row of section 3); no Hebrew could be fetched verbatim. Not used.');
  L.push('- **Hebrew Wikisource** (he.wikisource.org): the page קדיש יתום was fetched as raw wikitext (`index.php?title=קדיש_יתום&action=raw`). It is a multi-rite template composition (`{{נוסחי תפילה}}`, transcluding `{{:חצי קדיש}}`), names no source edition, carries no public-domain template, and contains at least one defective word (עָלֵינו with no vowel on the vav). The site default licence is CC BY-SA, which this project does not accept (share-alike). The API rate-limited further page fetches (HTTP 429). Not used.');
  L.push('- **tanach.us (UXLC)** was not used for the biblical verses embedded in `vayehi-binsoa`, `lecha-hashem`, `vezot-hatorah`, `etz-chaim` and `amidah-yihyu`: siddur spelling differs from the Leningrad ketiv in several words (for example וְגוֹאֲלִי / וְגֹאֲלִי), so a UXLC text would not be a consonant-identical replacement, and the non-biblical lines in the same records would still need a siddur source.');
  L.push('');
  L.push('## 5. Method');
  L.push('');
  L.push('1. Fetch the candidate page; select the version by exact `versionTitle` and `license`; refuse pages with the Metsudah fingerprint.');
  L.push('2. Copy the chosen paragraphs verbatim into `data/corpus/source-snapshot.json` (`rawLines`; for `adon-olam-1` the single source paragraph is split at its own colons into ten raw lines, recorded in `splitFrom`). The Metsudah item moves to `history[0]` with the text it produced (`metsudahHe`).');
  L.push('3. Normalise with `applyTransforms` (src/corpus/normalize.js), the same pipeline every other record uses. Transforms used: `dropSmall` (rubrics in `<small>`), `dropParen` (Ten-Days-of-Repentance variant), `dropTokens` (the four rubric words before the response of the congregation in `hagomel`; keys are folded skeletons read from the fetched line), `clip` (etz-chaim starts at עץ and ends after ויאדיר on a longer paragraph). No `corrections`: the two records that previously needed a holam added by hand (`vezot-hatorah`, `etz-chaim`) no longer do, which is why their status moves from `transcribed-needs-check` to `verified`.');
  L.push('4. Gate: identical folded consonant skeleton; no hard issue from `checkHebrew`; a vowel on every word; a dot on every shin.');
  L.push('5. `tests/corpus.resource.test.js` checks the licence set, the snapshot evidence and that each re-sourced text replays from its raw lines.');
  L.push('');
  L.push('Known limitation: `src/corpus/tools/build-registry.mjs` does not know about these swaps; if it is re-run it will rebuild the 12 records from the Metsudah history item, and this tool must then be run again (it is idempotent).');
  return L.join('\n') + '\n';
}

function describe(d) {
  const a = [...strip(d.old)], b = [...strip(d.new)];
  const only = (x, y) => x.filter((c) => !y.includes(c));
  const gone = only(a, b), added = only(b, a);
  const name = (c) => ({ 'ּ': 'dagesh/mappiq', 'ַ': 'patach', 'ָ': 'qamats', 'ֹ': 'holam', 'ֶ': 'segol', 'ֵ': 'tsere', 'ִ': 'hiriq', 'ֻ': 'qubuts', 'ְ': 'sheva', 'ׁ': 'shin dot', 'ׂ': 'sin dot' })[c] || DIFF_CODES(c);
  const parts = [];
  if (gone.length) parts.push('old has ' + gone.map(name).join(', '));
  if (added.length) parts.push('new has ' + added.map(name).join(', '));
  return parts.join('; ') || 'marks reordered';
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const reg = JSON.parse(fs.readFileSync(REG, 'utf8'));
  const snap = JSON.parse(fs.readFileSync(SNAP, 'utf8'));
  if (args.includes('--revert')) {
    const out = Object.keys(PLAN).map((id) => revertOne(id, reg, snap));
    fs.writeFileSync(REG, JSON.stringify(reg, null, 1) + '\n');
    fs.writeFileSync(SNAP, JSON.stringify(snap, null, 1) + '\n');
    for (const r of out) console.log(r.id, r.ok ? 'reverted' : 'skipped: ' + r.reason);
    return;
  }
  const results = [];
  const pages = new Map();
  for (const [id, plan] of Object.entries(PLAN)) {
    if (!pages.has(plan.ref)) pages.set(plan.ref, await fetchPage(plan.ref));
    const r = await resourceOne(id, plan, reg, snap, { dryRun, page: pages.get(plan.ref) });
    results.push(r);
    console.log(`${id}: ${r.ok ? 'OK' : 'KEPT'} ${r.ok ? `${r.diff.length} word(s) differ` : r.reason}`);
    if (r.ok) for (const d of r.diff) console.log(`   ${d.old} -> ${d.new}`);
  }
  if (dryRun) return;
  const when = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(REG, JSON.stringify(reg, null, 1) + '\n');
  fs.writeFileSync(SNAP, JSON.stringify(snap, null, 1) + '\n');
  fs.writeFileSync(DOC, renderDoc(results, reg, snap, when));
  console.log(`wrote ${path.relative(ROOT, REG)}, ${path.relative(ROOT, SNAP)}, ${path.relative(ROOT, DOC)}`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main().catch((e) => { console.error(e); process.exit(1); });
