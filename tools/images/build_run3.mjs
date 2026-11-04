#!/usr/bin/env node
// Builds data/images/run3.csv (one row per expected Run 3 image, 100 commands x 10 = 1000 rows) by parsing John's third
// command sheet, kept in this folder as tools/images/run3-source.md (commands 150-249, blocks I..R). File names come from the
// commands themselves (TROPE_<name>_mnemonic, CRAFT_bimah_01 ... FINALE_set_10), so the returned images are matched by name
// (tools/images/match_run3.mjs). Nothing here talks to any generator: it only turns the sheet into rows.
//   node tools/images/build_run3.mjs            write data/images/run3.csv
//   node tools/images/build_run3.mjs --check    build in memory and print the per-command counts, write nothing
// Columns: id (file stem), file, block, command, set, slot, kind, key, aspect, width, height, status, alt, prompt.
// key links a row to an app entity where that is derivable without guessing: trope rows -> data/corpus/trope/table.json ids;
// prayer / blessing heroes -> data/corpus/registry.json ids; festival scenes -> data/festivals/links.json ids; single-object rows ->
// data/vocab/words.json ids by exact English-gloss match, only when exactly one noun carries that gloss. Everything else stays empty.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv, toCsv } from './ingest_lib.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const SOURCE = join(ROOT, 'tools/images/run3-source.md');
export const OUT = join(ROOT, 'data/images/run3.csv');
export const HEAD = ['id', 'file', 'block', 'command', 'set', 'slot', 'kind', 'key', 'aspect', 'width', 'height', 'status', 'alt', 'prompt'];
export const FIRST = 150, LAST = 249, PER_COMMAND = 10;
export const MAX_ALT = 200;
export const SIZES = { '1:1': [1024, 1024], '1792x1024': [1792, 1024] };

// ---------- how each command is read ----------
/** Blocks whose every image is wide (the block header says 1792x1024), plus single commands that say so. */
const WIDE_BLOCKS = new Set(['J', 'M', 'N', 'P', 'Q']);
const WIDE_COMMANDS = new Set([155, 158, 241, 245, 246, 247, 249]);
/** Command -> slots that are wide although the block is square (175: "Six wide scenes + four object images"). */
const WIDE_SLOTS = { 175: [1, 2, 3, 4, 5, 6] };
/** An item that says it is one wide picture ("one wide image of a lane", "(one wide image)", "shown as one wide image"). */
const WIDE_ITEM = /\b(?:one|single) wide (?:image|scene|panel)\b|1792/i;

/** Command -> kind (what the app will do with the picture). Slot parity decides mnemonic/card for 150-152. */
const KINDS = [
  [[150, 152], 'mnemonic'], [[153, 153], 'hand'], [[154, 154], 'object'], [[155, 156], 'scene'], [[157, 157], 'object'],
  [[158, 158], 'scene'], [[159, 159], 'ui'], [[160, 169], 'panel'], [[170, 171], 'count'], [[172, 172], 'object'],
  [[173, 173], 'clock'], [[174, 176], 'scene'], [[177, 178], 'pair'], [[179, 179], 'object'], [[180, 187], 'action'],
  [[188, 188], 'portrait'], [[189, 189], 'action'], [[190, 199], 'hero'], [[200, 209], 'place'], [[210, 219], 'grammar'],
  [[220, 229], 'strip'], [[230, 239], 'context'], [[240, 240], 'mascot'], [[241, 241], 'card'], [[242, 242], 'streak'],
  [[243, 243], 'state'], [[244, 244], 'badge'], [[245, 245], 'share'], [[246, 247], 'header'], [[248, 248], 'game'], [[249, 249], 'panorama'],
];
export function kindOf(command, slot) {
  if (command >= 150 && command <= 152) return slot % 2 ? 'mnemonic' : 'card';
  const k = KINDS.find(([[a, b]]) => command >= a && command <= b);
  return k ? k[1] : 'image';
}

/** Trope names as written in commands 150-152 -> ids in data/corpus/trope/table.json (names that the table spells differently). */
const TROPE_ALIAS = { tifcha: 'tipcha', mahapakh: 'mahpach', karneypara: 'karnei-parah', sofpasuk: 'sof-pasuk' };
/** Hand-derived links for hero / festival rows: "command:slot" -> id. Only ids whose text or festival page exists in the app. */
export const KEYS = {
  '190:1': 'avot-1', '191:10': 'sim-shalom', '192:1': 'modeh-ani-1', '192:4': 'torah-bless-1', '193:1': 'birkat-hamazon-1',
  '193:3': 'kiddush-wine-1', '194:1': 'shema-1', '194:5': 'mi-sheberach-opening', '196:9': 'ashrei-145-1-3', '197:1': 'shehecheyanu',
  '199:2': 'havdalah-flame', '199:3': 'havdalah-spices', '199:4': 'havdalah-opening', '199:5': 'havdalah-flame',
  '175:1': 'rosh-hashanah', '175:3': 'hanukkah', '175:5': 'tu-bishvat', '175:6': 'purim', '175:9': 'pesach', '176:1': 'shavuot',
  '176:4': 'tisha-bav', '176:6': 'rosh-hashanah', '176:8': 'sukkot', '235:7': 'purim', '235:8': 'hanukkah', '235:9': 'pesach',
  '239:4': 'vayehi-binsoa', '239:6': 'lecha-hashem', '244:7': 'havdalah-spices',
};
/** Counting commands: the item names its counted object right after the number ("Eleven lemons", "three rows of ten dates",
 *  "one hundred pomegranate seeds"); that noun, singular, is looked up as an English gloss. Other commands get no vocab key:
 *  picking the head noun of a scene sentence by rule linked the wrong word too often (silver for a crown, bank for a piggy-bank). */
const VOCAB_COMMANDS = new Set([170, 171]);
const COUNTED = /\b(?:eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|ten|hundred)\s+(?:pomegranate\s+)?([a-z]+)/i;

// ---------- source parsing ----------
/** Commands of the sheet: { command, block, title, body } in order. */
export function parseSource(text = readFileSync(SOURCE, 'utf8')) {
  const out = [];
  let block = '';
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    const b = /^## Block ([A-Z]) /.exec(line);
    if (b) { block = b[1]; continue; }
    const m = /^(\d{3})\. \*\*(.+?)\*\* (.+)$/.exec(line);
    if (m) out.push({ command: Number(m[1]), block, title: m[2].replace(/\.$/, ''), body: m[3] });
  }
  return out;
}

/** "Numbers 11-20 (NUM_teens)" -> { set: "Numbers 11-20", prefix: "NUM_teens" }; prefix also read from "Files X_01 ... _10". */
export function namesOf(cmd) {
  let prefix = null;
  const t = /^(.*?)\s*\(([A-Z]+_[A-Za-z0-9_]+)\)\s*$/.exec(cmd.title);
  if (t) prefix = t[2];
  const f = /Files ([A-Z]+_[A-Za-z0-9]+)_01/.exec(cmd.body);
  if (!prefix && f) prefix = f[1];
  return { set: (t ? t[1] : cmd.title).trim(), prefix };
}

const MULT = /\s*\((?:pair = )?(\d)(?: (?:variants|images))?(?:,[^)]*)?\)\s*$/;
const INTRO = /^((?:[^:()]|\([^)]*\))*?): (.+)$/s;
const cleanItem = (s) => s.replace(/\s+/g, ' ').replace(/^[\s,.;—-]+|[\s,.;]+$/g, '').trim();
const lastSentence = (s) => s.replace(/\.\s+[A-Z][^;]*$/, '');

/** The body minus the file / count-check / after-command sentences, split into items with their multiplicity. */
export function splitItems(cmd) {
  let body = cmd.body
    .replace(/\s*Files [A-Z][^;]*$/, '')
    .replace(/\s*Count check:[^;]*$/, '')
    .replace(/\s*After command \d+,[^;]*$/, '');
  const over = OVERRIDES[cmd.command];
  if (over) return over(body, cmd).map((text) => ({ text: cleanItem(text), n: 1 }));
  const parts = body.split(';').map((p) => p.trim()).filter(Boolean);
  const first = INTRO.exec(parts[0]);
  if (first) parts[0] = first[2];
  parts[parts.length - 1] = lastSentence(parts[parts.length - 1]);
  const items = parts.map((p0) => {
    const p = p0.replace(/\.\s*$/, '');
    const m = MULT.exec(p);
    return { text: cleanItem(m ? p.slice(0, m.index) : p), n: m ? Number(m[1]) : 1 };
  });
  const plain = items.length, total = items.reduce((n, i) => n + i.n, 0);
  if (cmd.command >= 150 && cmd.command <= 152 && plain === PER_COMMAND / 2) return items.map((i) => ({ ...i, n: 1 })); // five tropes x (mnemonic, card)
  if (plain === PER_COMMAND) return items.map((i) => ({ ...i, n: 1 }));
  if (total === PER_COMMAND) return items;
  throw new Error(`command ${cmd.command}: ${plain} items (${total} with multiplicities), expected ${PER_COMMAND}`);
}

/** Commands whose list is not a plain semicolon list. Each returns exactly 10 item texts. */
const OVERRIDES = {
  // the ten hand positions are a comma list after the dash
  153: (b) => b.slice(b.indexOf('— ') + 2).replace(/\.\s*No text.*$/, '').split(/, (?:and )?/),
  // ten clocks: listed as a comma list with "then 2, 3 ..." shorthand
  173: () => [
    'a round cream clock face with tick dots only, hands at the one o\'clock position (short hand up-right, long hand up)',
    'the same clock with hands at the two o\'clock position', 'the same clock with hands at the three o\'clock position (long and short at a right angle)',
    'the same clock with hands at the four o\'clock position', 'the same clock with hands at the five o\'clock position',
    'the same clock with hands at the six o\'clock position (long hand up, short hand down)', 'the same clock showing a quarter past (long hand at right)',
    'the same clock showing half past (long hand down)', 'the same clock showing a quarter to (long hand at left)',
    'the same clock covered by Rimon asleep on top of it',
  ],
  // the wheel: one object per image, listed after "tint:"
  158: (b) => b.slice(b.lastIndexOf(': ') + 2).split(';'),
  // nine rows are listed (20..100); the tenth, the anchor row of ten, is added here and noted in docs/images/RUN3.md
  171: (b) => ['one row of ten pomegranate seeds on a cream plate (10)', ...b.split(';')],
  // fifteen items are listed and then regrouped "split as: (1) circle ... (10) pair vs single shoes"
  179: (b) => {
    const list = b.slice(0, b.indexOf(' — split as:')).split(';').map((s) => s.trim());
    return [...list.slice(0, 8), 'a jar full, a jar half full and a jar empty, shown as one wide image with the three jars side by side', 'a pair of shoes vs one shoe'];
  },
};

// ---------- keys ----------
const norm = (s) => s.toLowerCase().replace(/[^a-z]/g, '');
export function tropeTable() { return JSON.parse(readFileSync(join(ROOT, 'data/corpus/trope/table.json'), 'utf8')).prose; }
/** "Sof Pasuk" -> "sof-pasuk" via the table's id / Ashkenazi / Sephardi names, with the aliases above; '' when no single match. */
export function tropeKey(name, table = tropeTable()) {
  const n = norm(name);
  if (TROPE_ALIAS[n]) return TROPE_ALIAS[n];
  const byId = table.find((t) => norm(t.id) === n);
  if (byId) return byId.id; // "Kadma" is also the Sephardi name of pashta; the table id wins
  const hits = table.filter((t) => [t.id, t.ashkenazi, t.sephardi].some((x) => norm(x) === n));
  return hits.length === 1 ? hits[0].id : '';
}
/** English gloss (lower-cased) -> ids of every noun with that gloss. */
export function vocabIndex() {
  const m = new Map();
  for (const w of JSON.parse(readFileSync(join(ROOT, 'data/vocab/words.json'), 'utf8')).words) {
    if (w.pos !== 'noun' && w.pos !== 'n') continue;
    const k = String(w.en).toLowerCase().trim();
    m.set(k, (m.get(k) ?? []).concat(w.id));
  }
  return m;
}
const singular = (w) => (/(ss|us)$/.test(w) ? w : /ies$/.test(w) ? `${w.slice(0, -3)}y` : /(sh|ch|x|o)es$/.test(w) ? w.slice(0, -2) : /s$/.test(w) ? w.slice(0, -1) : w);
/** Id of the single noun whose gloss is the counted object of the item; '' when there is none or more than one. */
export function vocabKey(text, index) {
  const m = COUNTED.exec(text);
  if (!m) return '';
  const raw = m[1].toLowerCase();
  for (const w of [raw, singular(raw)]) { const ids = index.get(w); if (ids) return ids.length === 1 ? ids[0] : ''; }
  return '';
}

// ---------- rows ----------
const sentence = (s) => { const t = s.trim(); return /[.!?]$/.test(t) ? t : `${t}.`; };
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export function altFor(set, text) {
  let a = `${cap(text.replace(/\s+/g, ' ').trim())} (${set}).`;
  if (a.length > MAX_ALT) a = `${a.slice(0, MAX_ALT - 1).replace(/[,;:\s]+\S*$/, '')}.`;
  return a;
}

export function build(text = readFileSync(SOURCE, 'utf8')) {
  const cmds = parseSource(text);
  const table = tropeTable(), vocab = vocabIndex();
  const rows = [], perCommand = {};
  for (const cmd of cmds) {
    if (cmd.command < FIRST || cmd.command > LAST) continue;
    const { set, prefix } = namesOf(cmd);
    const items = splitItems(cmd);
    const expanded = [];
    if (cmd.command >= 150 && cmd.command <= 152) {
      for (const it of items) {
        const m = /^(.+?)\s*\((.+)\)$/.exec(it.text);
        const name = (m ? m[1] : it.text).trim(), object = (m ? m[2] : it.text).replace(/^(?:a|an|the) /i, '');
        const slug = name.toLowerCase().replace(/[^a-z]+/g, '_').replace(/^_|_$/g, '');
        const key = tropeKey(name, table);
        expanded.push({ id: `TROPE_${slug}_mnemonic`, text: `${object}, drawn so its outline echoes the shape of the trope mark ${name}`, key });
        expanded.push({ id: `TROPE_${slug}_card`, text: `the same ${object} on a FRAME_lettercard card, for the trope mark ${name}`, key });
      }
    } else {
      if (!prefix) throw new Error(`command ${cmd.command}: no file prefix`);
      for (const it of items) for (let k = 0; k < it.n; k++) {
        const text = it.n > 1 ? `${it.text} (${['first', 'second', 'third'][k]} of ${it.n})` : it.text;
        expanded.push({ id: `${prefix}_${String(expanded.length + 1).padStart(2, '0')}`, text, key: null });
      }
    }
    if (expanded.length !== PER_COMMAND) throw new Error(`command ${cmd.command}: ${expanded.length} images`);
    perCommand[cmd.command] = expanded.length;
    const blockWide = WIDE_BLOCKS.has(cmd.block) || WIDE_COMMANDS.has(cmd.command);
    const command = `Command ${cmd.command} (${set}): ${cmd.body}`;
    expanded.forEach((e, i) => {
      const slot = i + 1;
      const wide = blockWide || (WIDE_SLOTS[cmd.command] ?? []).includes(slot) || WIDE_ITEM.test(e.text);
      const aspect = wide ? '1792x1024' : '1:1';
      const [width, height] = SIZES[aspect];
      let key = e.key ?? KEYS[`${cmd.command}:${slot}`] ?? '';
      if (!key && VOCAB_COMMANDS.has(cmd.command)) key = vocabKey(e.text, vocab);
      rows.push({
        id: e.id, file: `${e.id}.png`, block: cmd.block, command: cmd.command, set, slot, kind: kindOf(cmd.command, slot), key, aspect, width, height,
        status: 'pending', alt: altFor(set, e.text),
        prompt: `${command} Image ${slot} of ${PER_COMMAND}: ${sentence(e.text)} ${wide ? 'Wide 1792x1024.' : 'Square 1024x1024.'} No text of any kind anywhere in the image.`,
      });
    });
  }
  const csv = toCsv(HEAD, rows.map((r) => HEAD.map((h) => r[h])));
  return { rows, csv, perCommand, commands: cmds.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const B = build();
  if (process.argv.includes('--check')) {
    for (const [c, n] of Object.entries(B.perCommand)) console.log(`${c}: ${n}`);
    console.log(`${B.rows.length} rows from ${B.commands} commands; keys set on ${B.rows.filter((r) => r.key).length}`);
  } else { writeFileSync(OUT, B.csv); console.log(`wrote ${OUT}: ${B.rows.length} rows`); }
}

// ---------- read-only access to the written csv (used by alt_text.mjs and match_run3.mjs) ----------
/** Rows of data/images/run3.csv as objects keyed by column name; [] when the file does not exist. */
export function loadRun3(path = OUT) {
  if (!existsSync(path)) return [];
  const [head, ...body] = parseCsv(readFileSync(path, 'utf8'));
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}
/** The row's alt text; when the csv has none, a sentence built from its kind and set. */
export function run3Alt(row) {
  const a = String(row.alt ?? '').replace(/\s+/g, ' ').trim();
  if (a) return a;
  return `Flat illustration (${String(row.kind || 'picture').replace(/[-_]+/g, ' ')}) from the set ${String(row.set || row.id).trim()}.`;
}
