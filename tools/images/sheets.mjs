#!/usr/bin/env node
// Contact sheets as image files, one per ChatGPT command (and one per redo paste file), from the 800 px WebP copies in
// assets/img/gen/. Output: data/images/sheets/cmd-NNN.webp, redo-NN.webp and SHEETS.md (the folder is git-ignored).
// Each tile shows the thumbnail, the id, delivered vs expected size, the ingest flags and the matcher's scene note.
// Rendering uses Pillow through `python3 -I -` (script on stdin, data as JSON); no file is imported from the data folders.
//   node tools/images/sheets.mjs                 write every sheet
//   node tools/images/sheets.mjs --only 11,12    only these commands
//   node tools/images/sheets.mjs --dry           print the plan, render nothing
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildRedo, FLAG_LABEL } from './build_redo.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const OUT = join(ROOT, 'data/images/sheets');
export const GEN = join(ROOT, 'assets/img/gen');
export const COLS = 5;
export const TILE = 300; // thumbnail box, px
export const CAPTION = 64; // caption height under each thumbnail, px

/** Short flag names for captions. */
const SHORT = { contains_text: 'TEXT?', possible_text: 'text?', aspect_mismatch_allowed: 'square<-wide', aspect_substituted: 'aspect subst.', low_resolution: 'low-res', ocr_not_run: 'no OCR' };

/** Groups the ingested images by command number (prompt-groups.json gives titles). Pure: takes the parsed JSON objects. */
export function planSheets(prov, promptGroups, notes, redo) {
  const titles = new Map(promptGroups.map((g) => [g.number, g.title]));
  const byCmd = new Map();
  for (const rec of Object.values(prov.images)) {
    if (!byCmd.has(rec.command)) byCmd.set(rec.command, []);
    byCmd.get(rec.command).push(rec);
  }
  const tile = (rec) => {
    const n = notes[rec.id] ?? {};
    const scene = n.sceneSeen && n.sceneExpected && n.sceneSeen !== n.sceneExpected ? `seen ${n.sceneSeen.replace('BG_', '')}, asked ${n.sceneExpected.replace('BG_', '')}` : '';
    const web = (rec.variants ?? []).find((v) => v.edge === 800) ?? rec.variants?.[0];
    return {
      id: rec.id, file: web ? join(GEN, web.file) : null,
      size: `${rec.width}x${rec.height}${rec.expected && (rec.expected.w !== rec.width || rec.expected.h !== rec.height) && rec.aspect !== 'exact' ? ` (asked ${rec.expected.w}x${rec.expected.h})` : ''}`,
      flags: (rec.flags ?? []).map((f) => SHORT[f] ?? f).join(' '),
      note: scene,
      bad: (rec.flags ?? []).some((f) => f === 'contains_text' || f === 'aspect_mismatch_allowed') || !!scene,
    };
  };
  const sheets = [];
  for (const cmd of [...byCmd.keys()].sort((a, b) => a - b)) {
    const recs = byCmd.get(cmd).sort((a, b) => a.id.localeCompare(b.id));
    sheets.push({ name: `cmd-${String(cmd).padStart(3, '0')}.webp`, title: `Command ${cmd}: ${titles.get(cmd) ?? recs[0].set} (${recs.length} images, block ${recs[0].block})`, tiles: recs.map(tile) });
  }
  for (const f of redo.files) {
    sheets.push({ name: f.name.replace(/\.txt$/, '.webp'), title: `Redo file ${f.name}: ${f.rows.length} flagged images to regenerate`, tiles: f.rows.map((r) => ({ ...tile(prov.images[r.id]), note: r.reasons.map((x) => FLAG_LABEL[x]).join('; ').replace(/ \(.*?\)/g, '') })) });
  }
  return sheets;
}

const PY = `
import json, os, sys, math
from PIL import Image, ImageDraw, ImageFont
P = json.loads(sys.stdin.read())
COLS, TILE, CAP = P['cols'], P['tile'], P['caption']
PAD, HEAD = 12, 44
def font(sz, bold=False):
    for p in ['/usr/share/fonts/truetype/dejavu/DejaVuSans%s.ttf' % ('-Bold' if bold else ''), '/usr/share/fonts/dejavu/DejaVuSans%s.ttf' % ('-Bold' if bold else '')]:
        if os.path.exists(p):
            return ImageFont.truetype(p, sz)
    try:
        return ImageFont.load_default(size=sz)
    except TypeError:
        return ImageFont.load_default()
F_T, F_C, F_S = font(20, True), font(13, True), font(12)
CREAM, INK, RED, GOLD, BLUE = (246, 241, 231), (43, 43, 43), (176, 55, 59), (217, 164, 65), (31, 58, 95)
def fit(draw, text, f, width):
    out, cur = [], ''
    for w in text.split(' '):
        t = (cur + ' ' + w).strip()
        if draw.textlength(t, font=f) <= width: cur = t
        else:
            if cur: out.append(cur)
            cur = w
    if cur: out.append(cur)
    return out
done = []
for S in P['sheets']:
    n = len(S['tiles']); rows = max(1, math.ceil(n / COLS))
    cols = min(COLS, n) if n else 1
    W = PAD + cols * (TILE + PAD); H = HEAD + PAD + rows * (TILE + CAP + PAD)
    im = Image.new('RGB', (W, H), CREAM); d = ImageDraw.Draw(im)
    d.rectangle([0, 0, W, HEAD], fill=BLUE); d.text((PAD, 10), S['title'], fill=(255, 255, 255), font=F_T)
    for i, t in enumerate(S['tiles']):
        x = PAD + (i % COLS) * (TILE + PAD); y = HEAD + PAD + (i // COLS) * (TILE + CAP + PAD)
        d.rectangle([x - 3, y - 3, x + TILE + 2, y + TILE + CAP + 2], outline=RED if t['bad'] else GOLD, width=3)
        if t['file'] and os.path.exists(t['file']):
            try:
                th = Image.open(t['file']).convert('RGB'); th.thumbnail((TILE, TILE))
                im.paste(th, (x + (TILE - th.width) // 2, y + (TILE - th.height) // 2))
            except Exception as e:
                d.text((x + 8, y + 8), 'cannot open: %s' % e.__class__.__name__, fill=RED, font=F_S)
        else:
            d.text((x + 8, y + 8), 'no web copy', fill=RED, font=F_S)
        cy = y + TILE + 4
        d.text((x + 2, cy), t['id'][:40], fill=INK, font=F_C); cy += 16
        d.text((x + 2, cy), t['size'], fill=INK, font=F_S); cy += 14
        line = ' '.join(filter(None, [t['flags'], t['note']]))
        for ln in fit(d, line, F_S, TILE - 4)[:2]:
            d.text((x + 2, cy), ln, fill=RED if t['bad'] else INK, font=F_S); cy += 14
    path = os.path.join(P['out'], S['name'])
    im.save(path, 'WEBP', quality=80, method=4)
    done.append({'name': S['name'], 'w': W, 'h': H, 'tiles': n, 'bytes': os.path.getsize(path)})
sys.stdout.write(json.dumps(done))
`;

export function indexMd(results, sheets) {
  const rows = results.map((r) => { const s = sheets.find((x) => x.name === r.name); const bad = s.tiles.filter((t) => t.bad).length; return `| \`${r.name}\` | ${s.title.replace(/\|/g, '/')} | ${r.tiles} | ${bad} | ${r.w}x${r.h} | ${Math.round(r.bytes / 1024)} KB |`; });
  return `# Contact sheets (regenerable; this folder is git-ignored)

Built by \`node tools/images/sheets.mjs\` from the 800 px WebP copies in \`assets/img/gen/\`. One sheet per ChatGPT command and one per redo paste file (\`docs/images/paste/redo-NN.txt\`). A red frame means the tile carries a blocking or redo flag (OCR text hit, square delivered for a wide row, or wrong backdrop); a gold frame means no such flag. Caption: id, delivered size (and the size asked when different), flags, and the matcher's scene note. Nothing here is an approval; decisions go through \`docs/images/REVIEW-SHEETS.md\`.

| Sheet | Title | Tiles | Flagged | Pixels | Size |
|---|---|---|---|---|---|
${rows.join('\n')}
`;
}

export async function buildSheets({ only = null, dry = false, out = OUT } = {}) {
  const prov = JSON.parse(readFileSync(join(ROOT, 'data/images/provenance.json'), 'utf8'));
  const pg = JSON.parse(readFileSync(join(ROOT, 'data/images/prompt-groups.json'), 'utf8')).groups;
  const notesPath = join(ROOT, 'data/images/review-notes.json');
  const notes = existsSync(notesPath) ? JSON.parse(readFileSync(notesPath, 'utf8')).notes ?? {} : {};
  // Same chunking as the paste files, so redo sheet numbers match the redo-NN.txt numbers.
  let sheets = planSheets(prov, pg, notes, buildRedo(ROOT));
  if (only) sheets = sheets.filter((s) => only.includes(s.name.replace(/\.webp$/, '')));
  if (dry) return { sheets, results: [] };
  mkdirSync(out, { recursive: true });
  const payload = { out, cols: COLS, tile: TILE, caption: CAPTION, sheets };
  // The script goes to python on stdin with the plan embedded as a JSON literal (nothing is imported from the data folders).
  const results = await new Promise((res, rej) => {
    const child = execFile('python3', ['-I', '-'], { maxBuffer: 16 * 1024 * 1024, timeout: 600000 }, (err, stdout, stderr) => {
      if (err) return rej(new Error(`python failed: ${err.message}${stderr ? ` | ${String(stderr).slice(0, 400)}` : ''}`));
      try { res(JSON.parse(stdout)); } catch { rej(new Error(`python returned non-JSON: ${String(stdout).slice(0, 200)}`)); }
    });
    child.stdin.end(PY.replace("P = json.loads(sys.stdin.read())", `P = json.loads(${JSON.stringify(JSON.stringify(payload))})`), 'utf8');
  });
  if (!only) writeFileSync(join(out, 'SHEETS.md'), indexMd(results, sheets));
  return { sheets, results };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2);
  const onlyArg = a.indexOf('--only') >= 0 ? a[a.indexOf('--only') + 1].split(',').map((s) => (/^\d+$/.test(s) ? `cmd-${s.padStart(3, '0')}` : s)) : null;
  buildSheets({ only: onlyArg, dry: a.includes('--dry') }).then(({ sheets, results }) => {
    if (a.includes('--dry')) { for (const s of sheets) console.log(`${s.name}\t${s.tiles.length} tiles\t${s.title}`); return; }
    for (const r of results) console.log(`${r.name}\t${r.tiles} tiles\t${r.w}x${r.h}\t${Math.round(r.bytes / 1024)} KB`);
    console.log(`${results.length} sheet(s) -> ${OUT}`);
  }).catch((e) => { console.error(e.message); process.exitCode = 1; });
}
