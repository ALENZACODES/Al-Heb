#!/usr/bin/env node
// Builds everything that comes from the Rimon still catalogue (tools/images/rimon/stills.mjs):
//   docs/images/RIMON-STILLS.md        the catalogue for people: what each still shows, where it appears, how to make it
//   docs/images/rimon-stills.csv       the order sheet: one row per still with the full prompt (read by ingest_queue.mjs)
//   docs/images/rimon-stills.json      the same, for tools and the contact sheet (docs/images/rimon-stills.html)
//   src/shell/rimon-stills.generated.js  trigger -> still numbers, for the app
// and, with --present, data/images/rimon/present.json (which stills exist on disk).
//
//   node tools/images/rimon/build.mjs            write the files above (not present.json)
//   node tools/images/rimon/build.mjs --present  also rescan data/images/rimon and write present.json
//   node tools/images/rimon/build.mjs --check    exit 1 if any written file is out of date (no writes)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { STILLS, TRIGGER_DOCS, GROUPS, PALETTE, REFERENCE, FRAMING_REFERENCE, CHARACTER, STYLE, FRAMING, NEVER, RESPECT, promptFor, pathOf, fileId } from './stills.mjs';
import { ART, ART_SOURCE } from './art-map.mjs';
import { TRIGGERS, QUIET_DAYS, QUIET_ROUTES, STILL_COUNT, STILL_ID, lineFor } from '../../../src/shell/rimon-triggers.js';
import { toCsv } from '../ingest_lib.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, '..', '..', '..');
export const OUT = Object.freeze({
  md: 'docs/images/RIMON-STILLS.md',
  csv: 'docs/images/rimon-stills.csv',
  json: 'docs/images/rimon-stills.json',
  js: 'src/shell/rimon-stills.generated.js',
  present: 'data/images/rimon/present.json',
});
const STILL_FILE = /^rimon-(a?\d{3}[a-z]?)\.webp$/;

/** Every rule the catalogue must keep. Returns a list of problems (empty = fine). */
export function validate(stills = STILLS) {
  const problems = [];
  const nums = stills.map((s) => s.n);
  if (stills.length !== STILL_COUNT) problems.push(`expected ${STILL_COUNT} stills, found ${stills.length}`);
  nums.forEach((n, i) => { if (n !== i + 1) problems.push(`still ${i + 1} is numbered ${n} (numbers run 1..${STILL_COUNT} in order)`); });
  const slugs = new Set();
  for (const s of stills) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s.slug)) problems.push(`#${s.n}: slug "${s.slug}" must be lower-case words joined by hyphens`);
    if (slugs.has(s.slug)) problems.push(`#${s.n}: slug "${s.slug}" is used twice`);
    slugs.add(s.slug);
    if (!TRIGGERS[s.trigger]) problems.push(`#${s.n}: trigger "${s.trigger}" is not in src/shell/rimon-triggers.js`);
    if (!GROUPS.some(([g]) => g === s.group)) problems.push(`#${s.n}: unknown group "${s.group}"`);
    if (!s.pose || s.pose.length < 20) problems.push(`#${s.n}: pose is missing or too short`);
  }
  for (const t of Object.keys(TRIGGERS)) {
    if (!stills.some((s) => s.trigger === t)) problems.push(`trigger "${t}" has no still`);
    if (!TRIGGER_DOCS[t]) problems.push(`trigger "${t}" has no entry in TRIGGER_DOCS`);
  }
  for (const t of Object.keys(TRIGGER_DOCS)) if (!TRIGGERS[t]) problems.push(`TRIGGER_DOCS names "${t}", which is not a trigger`);
  for (const [t, ids] of Object.entries(ART)) {
    if (!TRIGGERS[t]) problems.push(`art-map.mjs names "${t}", which is not a trigger`);
    for (const id of ids) if (!STILL_ID.test(id) || id.startsWith('a')) problems.push(`art-map.mjs ${t}: "${id}" is not a drawn-set id like 023 or 025b`);
  }
  return problems;
}

/** trigger -> [still ids]: the drawn set first (art-map.mjs), then the catalogue's own stills ('a' ids) in order. */
export function stillIds(stills = STILLS, art = ART) {
  const out = {};
  for (const [t, ids] of Object.entries(art)) out[t] = [...ids];
  for (const s of stills) (out[s.trigger] ||= []).push(fileId(s.n));
  return out;
}

const pad3 = (n) => String(n).padStart(3, '0');
/** The short form, for tools that cut long prompts: paste MASTER_PROMPT once, then one of these per picture. */
export const MASTER_PROMPT = [`You will draw stills of Rimon, the pomegranate mascot of the Aleph Hebrew course, from the attached reference (${REFERENCE}). Every still follows these rules; I will then send one line per still.`, `CHARACTER: ${CHARACTER}`, `STYLE: ${STYLE}`, `FRAMING AND OUTPUT: ${FRAMING}`, `NEVER: ${NEVER}`, `For festival, Shabbat and synagogue stills also: ${RESPECT}`].join('\n');
export const shortPrompt = (s) => `Rimon still ${fileId(s.n)}, same rules as before. ${s.pose}${s.props ? ' Props: ' + s.props : ''}${s.respect ? ' Respect rules apply.' : ''}`;
function rowOf(s) {
  const t = TRIGGERS[s.trigger], [screen, when] = TRIGGER_DOCS[s.trigger] || ['', ''], line = lineFor(s.trigger, { n: 'N' });
  return { prompt_short: shortPrompt(s), id: s.n, file_id: fileId(s.n), file: `rimon-${fileId(s.n)}.webp`, path: pathOf(s.n), drawn_set: ART[s.trigger] || [], slug: s.slug, group: s.group, trigger: s.trigger, surface: t.surface, screen, when, line_en: line?.en || '', line_he: line?.he || '', pose: s.pose, props: s.props || '', respect: !!s.respect, prompt: promptFor(s) };
}

function generatedJs(stills) {
  const ids = stillIds(stills);
  const body = Object.entries(ids).map(([t, list]) => `  ${JSON.stringify(t)}: [${list.map((x) => JSON.stringify(x)).join(', ')}],`).join('\n');
  return `// GENERATED by tools/images/rimon/build.mjs from tools/images/rimon/stills.mjs and art-map.mjs - do not edit.\n// Trigger -> Rimon still ids (data/images/rimon/rimon-<id>.webp): drawn pictures first, then catalogue stills (a ids).\n// What makes each trigger fire: src/shell/rimon-triggers.js.\nexport const STILL_IDS = Object.freeze({\n${body}\n});\n`;
}

const SURFACE_WORDS = {
  pose: 'Rimon in the corner (or the Home hero box) shows the still for a moment, then goes back to the animation.',
  page: 'Rimon in the corner wears the still for the whole screen: dressed for that page.',
  hero: 'A large Rimon inside the page, under the heading.',
  swap: 'An existing picture of Rimon in that screen is replaced by the still.',
  toast: 'A small card at the bottom of the screen with the still and one line; it goes away by itself.',
};

function markdown(rows) {
  const esc = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
  const L = [];
  L.push('# Rimon: 200 Stills', '');
  L.push('Rimon is the pomegranate who keeps the learner company, the way the owl does in Duolingo. Besides the twelve animated moves (assets/img/rimon), these 200 still drawings let Rimon do something different in each part of the app: greet, cheer, comfort, celebrate festivals, train in the Brain Lab, read the little books, guard a streak and help when something goes wrong.', '');
  L.push('Built from `tools/images/rimon/stills.mjs` by `node tools/images/rimon/build.mjs`. Do not edit this file by hand.', '');
  L.push('## How a Still Gets Into the App', '');
  L.push('1. Make the picture from its prompt (full prompts: `docs/images/rimon-stills.csv` or `docs/images/rimon-stills.json`; one prompt per row, ready to paste). Attach the reference picture `' + REFERENCE + '` every time, and one cell of ' + FRAMING_REFERENCE + ' when the tool takes a second picture, for size and position.');
  L.push('2. Save it with the still id as its name, for example `rimon-a007.png`, in any drop folder.');
  L.push('3. Run `node tools/images/ingest_queue.mjs <drop folder>`. It checks the picture, makes it a 512 x 512 WebP with a transparent background, strips metadata, saves it as `data/images/rimon/rimon-a007.webp` and updates `data/images/rimon/present.json`.');
  L.push('4. Commit both. The app shows a still only when its number is in `present.json`, so nothing changes on screen until the picture is really there.', '');
  L.push('A contact sheet of all 200 slots, with each prompt and a copy button, is at `docs/images/rimon-stills.html` (run `npm run serve`, then open `/docs/images/rimon-stills.html`). It shows which pictures exist and puts them side by side so off-model drawings stand out.', '');
  L.push('To check the app with the pictures in place, run `node tools/qa/qa-rimon-stills.mjs` (a real browser walks onboarding, Home, Brain Lab, an answer, a badge, page not found, a Torah screen, a phone and reduced motion; see the top of that file). `tools/qa/rimon-placeholders.py` makes numbered stand-in pictures for a dry run before any still is drawn.', '');
  L.push('## Two Sets of Pictures, One Map', '');
  L.push(`The pictures already drawn on ${ART_SOURCE} keep their plain numbers (\`rimon-023.webp\`, \`rimon-025b.webp\`). The 200 stills in this catalogue are the "a" set (\`rimon-a023.webp\`), so neither set can overwrite the other. \`tools/images/rimon/art-map.mjs\` matches drawn pictures to triggers by what they show; for each trigger the app tries those first, then the catalogue still once it exists. The "Drawn now" column lists them. ${Object.keys(ART).length} of ${Object.keys(TRIGGERS).length} triggers already have a drawn picture.`, '');
  L.push('The drawn set has a cream background; the app cuts it out in the browser (src/shell/rimon-stage.js) so Rimon sits cleanly on any page colour. New catalogue stills should have a transparent background.', '');
  L.push('## Rimon, On Model', '');
  L.push(`Reference: \`${REFERENCE}\`. Colours sampled from it: body ${PALETTE.body}, crown ${PALETTE.crown}, leaves ${PALETTE.leaves}, sash ${PALETTE.sash}, cheeks ${PALETTE.cheeks}, eyes and mouth ${PALETTE.face}.`, '');
  L.push('Every prompt carries the same four blocks, word for word, so the 200 pictures stay one character:', '');
  L.push('- **Character.** ' + CHARACTER);
  L.push('- **Style.** ' + STYLE);
  L.push('- **Framing and output.** ' + FRAMING);
  L.push('- **Never.** ' + NEVER, '');
  L.push('Festival, Shabbat and synagogue stills add: ' + RESPECT, '');
  L.push('### Checklist Before a Still Is Saved', '');
  L.push('- Crown: gold, five rounded points, middle one tallest; two olive leaves behind it, one each side.');
  L.push('- Face: two dot eyes (or the expression the row asks for), small maroon mouth, two pink oval cheeks. No nose, no teeth, no eyebrows unless asked.');
  L.push('- Sash: deep blue, tied at the front, knot and two short tails.');
  L.push('- Limbs: thin red arms, mitten hands with four fingers, short red legs, round feet.');
  L.push('- Flat colour, no outlines, no gradients or shine; transparent background; no floor or shadow.');
  L.push('- Same size and place as the others (crown near the top, feet on the same line near the bottom).');
  L.push('- No writing anywhere, in any alphabet. No people. Festival props drawn correctly (the chanukiah has nine candles: eight in a row and one raised).', '');
  L.push('## Where Rimon Steps Aside', '');
  L.push(`- **Days of mourning and remembrance:** ${QUIET_DAYS.join(', ')}. Rimon (the animated companion and every still) stays out of sight all day. To change this, edit QUIET_DAYS in src/shell/rimon-triggers.js.`);
  L.push(`- **Prayer, Torah and service screens:** ${QUIET_ROUTES.map((r) => '#/' + r).join(', ')}. The text has the screen to itself.`);
  L.push('- **Shabbat:** the Shabbat stills never show Rimon lighting, cooking, writing or using a screen; the candles are already lit. Yom Kippur stills have no food or party.');
  L.push('- **Divine name:** no still contains writing, so none can show it. Spoken lines avoid it too.', '');
  L.push('## How Each Still Is Shown', '');
  for (const [k, v] of Object.entries(SURFACE_WORDS)) L.push(`- **${k}:** ${v}`);
  L.push('', 'Only one Rimon is on screen at a time: a large Rimon in the page, a card at the bottom, or a swapped Rimon picture inside the page each send the corner Rimon away until they are gone. A still the learner has already seen once (first answer, milestones) is not shown again, and each daily greeting comes once a day. Hide Rimon hides every still too.');
  L.push('', 'Hebrew in the lines below is pointed and has not yet been checked by a Hebrew teacher.', '');
  for (const [g, title] of GROUPS) {
    const list = rows.filter((r) => r.group === g);
    L.push(`## ${title} (${list.length})`, '');
    L.push('| # | Still | What Rimon does | Screen | Trigger | Shown as | Rimon says | Drawn now |');
    L.push('| --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const r of list) {
      const say = [r.line_he, r.line_en].filter(Boolean).join(' ');
      L.push(`| ${r.file_id} | \`${r.slug}\` | ${esc(r.pose)}${r.props ? ' *Props:* ' + esc(r.props) : ''} | ${esc(r.screen)} | \`${r.trigger}\`: ${esc(r.when)} | ${r.surface} | ${esc(say) || ' '} | ${r.drawn_set.length ? r.drawn_set.join(', ') : ' '} |`);
    }
    L.push('');
  }
  L.push('## Short Prompts', '');
  L.push('Some tools cut long prompts. Paste this master prompt once, then the `prompt_short` column of the order sheet, one row per picture:', '');
  L.push('```', MASTER_PROMPT, '```', '');
  L.push('## Making a Still From a Row', '');
  L.push('The prompt for each row is the four blocks above plus that row\'s pose and props. For example, still a018:', '');
  L.push('```', promptFor(STILLS[17]), '```', '');
  return L.join('\n');
}

/** All generated files (not present.json) as { relativePath: text }. */
export function buildOutputs(stills = STILLS) {
  const rows = stills.map(rowOf);
  const cols = ['path', 'id', 'file_id', 'slug', 'group', 'trigger', 'surface', 'screen', 'when', 'line_en', 'line_he', 'pose', 'props', 'prompt_short', 'prompt'];
  return {
    [OUT.md]: markdown(rows),
    [OUT.csv]: toCsv(cols, rows.map((r) => cols.map((c) => r[c]))),
    [OUT.json]: JSON.stringify({ schema: 'alef-rimon-stills/1', note: 'Generated by tools/images/rimon/build.mjs from tools/images/rimon/stills.mjs. One entry per still: file path, trigger, where it appears, what Rimon says and the full image prompt.', reference: REFERENCE, masterPrompt: MASTER_PROMPT, artSource: ART_SOURCE, art: ART, palette: PALETTE, quietDays: QUIET_DAYS, quietRoutes: QUIET_ROUTES, stills: rows }, null, 1) + '\n',
    [OUT.js]: generatedJs(stills),
  };
}

/** Still numbers whose file exists under root/data/images/rimon, sorted. */
export function scanPresent(root = ROOT) {
  const order = (x) => (x.startsWith('a') ? 1000 : 0) + Number(x.replace(/\D/g, '')) + (/[a-z]$/.test(x) ? 0.5 : 0);
  const dir = path.join(root, 'data/images/rimon');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).map((f) => f.match(STILL_FILE)).filter(Boolean).map((m) => m[1]).sort((a, b) => order(a) - order(b));
}
export const presentText = (ids) => JSON.stringify({ schema: 'alef-rimon-present/1', note: 'Rimon stills that exist in this folder. Written by tools/images/rimon/build.mjs --present and by tools/images/ingest_queue.mjs; the app shows only these.', ids }, null, 1) + '\n';
/** Rewrite present.json from the files on disk. Returns the ids. */
export function writePresent(root = ROOT) {
  const ids = scanPresent(root);
  const file = path.join(root, OUT.present);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, presentText(ids));
  return ids;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const problems = validate();
  if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
  const outs = buildOutputs();
  if (args.includes('--check')) {
    const stale = Object.entries(outs).filter(([rel, text]) => { try { return fs.readFileSync(path.join(ROOT, rel), 'utf8') !== text; } catch { return true; } }).map(([rel]) => rel);
    const want = presentText(scanPresent()); let have = ''; try { have = fs.readFileSync(path.join(ROOT, OUT.present), 'utf8'); } catch { /* missing */ }
    if (want !== have) stale.push(OUT.present);
    if (stale.length) { console.error('out of date (run node tools/images/rimon/build.mjs --present): ' + stale.join(', ')); process.exit(1); }
    console.log(`Rimon catalogue up to date: ${STILLS.length} stills, ${Object.keys(TRIGGERS).length} triggers, ${scanPresent().length} drawn.`);
  } else {
    for (const [rel, text] of Object.entries(outs)) { fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true }); fs.writeFileSync(path.join(ROOT, rel), text); }
    if (args.includes('--present') || !fs.existsSync(path.join(ROOT, OUT.present))) writePresent();
    console.log(`wrote ${Object.keys(outs).join(', ')}${args.includes('--present') ? ', ' + OUT.present : ''}: ${STILLS.length} stills, ${Object.keys(TRIGGERS).length} triggers, ${scanPresent().length} drawn.`);
  }
}
