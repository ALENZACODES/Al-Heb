// Turn a spreadsheet export of congregations into a country file for the synagogue directory (idea N9).
//
//   node tools/synagogues/import-directory.mjs --country US --in path/to/congregations.csv            (dry run: prints a summary)
//   node tools/synagogues/import-directory.mjs --country US --in path/to/congregations.csv --write    (writes data/synagogues/usa.json
//                                                                                                      and lists it in sources.json)
//   --map name=Congregation,city=Town,region=ST     name the columns when the headers differ from the ones guessed below
//
// Input: a .csv (first row = headers) or a .json array of objects. Nothing is fetched and nothing is invented: a row keeps only the
// fields the input has. A row with no name, no city or an unknown state or province is rejected and listed, never guessed.
// The app reads the result through src/synagogues/directory.js, which validates it again on the device.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validateDirectory, normaliseSources, COUNTRIES } from '../../src/synagogues/directory.js';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
export const OUT_FILE = { US: 'data/synagogues/usa.json', CA: 'data/synagogues/canada-import.json' };
export const REGIONS = {
  US: { AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', PR: 'Puerto Rico', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', VI: 'U.S. Virgin Islands', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming' },
  CA: { BC: 'British Columbia', AB: 'Alberta', SK: 'Saskatchewan', MB: 'Manitoba', ON: 'Ontario', QC: 'Quebec', NB: 'New Brunswick', NS: 'Nova Scotia', PE: 'Prince Edward Island', NL: 'Newfoundland and Labrador', YT: 'Yukon', NT: 'Northwest Territories', NU: 'Nunavut' },
};
/** Header names tried for each field, compared without case, spaces or punctuation. */
export const HEADER_GUESSES = {
  name: ['name', 'congregation', 'congregationname', 'synagogue', 'organization', 'title'],
  city: ['city', 'town', 'municipality'],
  region: ['state', 'province', 'region', 'st', 'stateprovince', 'stateorprovince'],
  address: ['address', 'streetaddress', 'fulladdress', 'address1', 'street'],
  postal: ['zip', 'zipcode', 'postalcode', 'postcode'],
  website: ['website', 'url', 'web', 'site', 'homepage'],
  phone: ['phone', 'telephone', 'phonenumber', 'tel'],
  email: ['email', 'emailaddress', 'contactemail'],
  founded: ['founded', 'yearfounded', 'established', 'since'],
};
const squash = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
export const slug = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70);

/** A small CSV reader: quoted fields, doubled quotes, commas and line breaks inside quotes. Returns an array of objects by header. */
export function parseCsv(text) {
  const rows = []; let row = [], cell = '', quoted = false;
  const t = String(text).replace(/^﻿/, '');
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (quoted) { if (ch === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else quoted = false; } else cell += ch; continue; }
    if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; row.push(cell); cell = ''; if (row.some((c) => c.trim() !== '')) rows.push(row); row = []; }
    else cell += ch;
  }
  row.push(cell); if (row.some((c) => c.trim() !== '')) rows.push(row);
  const head = (rows.shift() || []).map((x) => x.trim());
  return rows.map((r) => Object.fromEntries(head.map((k, i) => [k, r[i] ?? ''])));
}

/** Which input column feeds each field: the --map choice first, then the header guesses. */
export function columnMap(headers, map = {}) {
  const out = {};
  for (const field of Object.keys(HEADER_GUESSES)) {
    if (map[field]) { const hit = headers.find((x) => x === map[field]) || headers.find((x) => squash(x) === squash(map[field])); if (hit) out[field] = hit; continue; }
    const hit = headers.find((x) => HEADER_GUESSES[field].includes(squash(x)));
    if (hit) out[field] = hit;
  }
  return out;
}

/** A state or province code from a code or a full name; '' when it is not one of the country's regions. */
export function regionCode(country, value) {
  const v = clean(value), table = REGIONS[country] || {};
  if (table[v.toUpperCase()]) return v.toUpperCase();
  const hit = Object.entries(table).find(([, name]) => squash(name) === squash(v));
  return hit ? hit[0] : '';
}

/**
 * Rows -> a country file. Returns { data, rejected: [{ row, reason }], columns }.
 * takenIds: ids already used by other country files (an id is never reused across the directory).
 */
export function convert(rows, { country, map = {}, takenIds = new Set(), updated = '' } = {}) {
  if (!REGIONS[country]) throw new Error(`Unknown country ${country}. Use US or CA.`);
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const col = columnMap(headers, map), get = (r, f) => (col[f] ? clean(r[col[f]]) : '');
  const rejected = [], congregations = [], ids = new Set(takenIds), used = new Set();
  rows.forEach((r, i) => {
    const name = get(r, 'name'), city = get(r, 'city'), region = regionCode(country, get(r, 'region'));
    const why = !name ? 'no name' : !city ? 'no city' : !region ? `unknown ${COUNTRIES[country].regionWord} "${get(r, 'region')}"` : '';
    if (why) { rejected.push({ row: i + 2, reason: why }); return; }
    let id = slug(`${name} ${city} ${region}`), n = 2;
    const base = id; while (ids.has(id)) id = `${base}-${n++}`;
    ids.add(id); used.add(region);
    const c = { id, name, city, [country === 'US' ? 'state' : 'province']: region, status: 'current' };
    const street = get(r, 'address'), postal = get(r, 'postal');
    if (street) c.address = postal && !street.includes(postal) ? `${street} ${postal}` : street;
    const web = get(r, 'website'); if (web) c.website = /^https?:\/\//i.test(web) ? web : `https://${web}`;
    for (const f of ['phone', 'email', 'founded']) { const v = get(r, f); if (v) c[f] = v; }
    congregations.push(c);
  });
  const regions = Object.entries(REGIONS[country]).filter(([code]) => used.has(code)).map(([code, name]) => ({ code, name }));
  const data = { title: `Reform Synagogues in ${COUNTRIES[country].name}`, updated, [country === 'US' ? 'states' : 'provinces']: regions, congregations };
  return { data, rejected, columns: col };
}

function main(argv) {
  const arg = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : ''; };
  const country = (arg('--country') || '').toUpperCase(), input = arg('--in'), write = argv.includes('--write');
  if (!REGIONS[country] || !input) { console.error('usage: node tools/synagogues/import-directory.mjs --country US --in file.csv|file.json [--map name=Col,city=Col,region=Col] [--write]'); process.exit(2); }
  const map = Object.fromEntries((arg('--map') || '').split(',').filter(Boolean).map((p) => p.split('=').map((x) => x.trim())));
  const text = readFileSync(input, 'utf8');
  const rows = extname(input).toLowerCase() === '.json' ? [].concat(JSON.parse(text).congregations || JSON.parse(text)) : parseCsv(text);
  const sourcesPath = join(root, 'data/synagogues/sources.json');
  const sources = normaliseSources(existsSync(sourcesPath) ? JSON.parse(readFileSync(sourcesPath, 'utf8')) : null);
  const taken = new Set(sources.files.filter((f) => f.country !== country).flatMap((f) => { try { return JSON.parse(readFileSync(join(root, f.file), 'utf8')).congregations.map((c) => c.id); } catch { return []; } }));
  const { data, rejected, columns } = convert(rows, { country, map, takenIds: taken, updated: new Date().toISOString().slice(0, 10) });
  const errs = validateDirectory(data, country);
  console.log(`columns used: ${JSON.stringify(columns)}`);
  console.log(`${rows.length} rows read, ${data.congregations.length} congregations kept, ${rejected.length} rejected`);
  for (const r of rejected.slice(0, 50)) console.log(`  row ${r.row}: ${r.reason}`);
  if (errs.length) { console.error('The result is not valid:\n  ' + errs.slice(0, 30).join('\n  ')); process.exit(1); }
  if (!write) { console.log('Dry run. Add --write to save it.'); return; }
  writeFileSync(join(root, OUT_FILE[country]), JSON.stringify(data, null, 1) + '\n');
  const files = [...sources.files.filter((f) => f.country !== country), { country, file: OUT_FILE[country] }];
  const doc = existsSync(sourcesPath) ? JSON.parse(readFileSync(sourcesPath, 'utf8')) : { schema: 'alef-synagogue-sources/1' };
  writeFileSync(sourcesPath, JSON.stringify({ ...doc, files }, null, 1) + '\n');
  console.log(`wrote ${OUT_FILE[country]} and listed it in data/synagogues/sources.json. Now run: node tools/build-precache.mjs && node tools/seo/build-sitemap.mjs`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2));
