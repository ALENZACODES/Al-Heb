// Read-only helpers for data/images/block-j.csv (written by the block J lane; never modified here).
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv } from './ingest_lib.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const BLOCK_J_CSV = join(ROOT, 'data/images/block-j.csv');
export const ID_RE = /^J-\d{4}$/;
export const MAX_ALT = 200;

/** Rows of block-j.csv as objects keyed by column name; [] when the file does not exist. */
export function loadBlockJ(path = BLOCK_J_CSV) {
  if (!existsSync(path)) return [];
  const [head, ...body] = parseCsv(readFileSync(path, 'utf8'));
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

/** The row's alt text; when the csv has none, a sentence built from its kind and set. */
export function blockJAlt(row) {
  const a = String(row.alt ?? '').replace(/\s+/g, ' ').trim();
  if (a) return a;
  const set = String(row.set ?? '').replace(/^j_/, '').replace(/[-_]+/g, ' ').trim();
  return `Flat illustration (${String(row.kind || 'picture').replace(/[-_]+/g, ' ')}) from the set ${set || row.id}.`;
}
