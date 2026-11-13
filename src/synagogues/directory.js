// @ts-check
// Synagogue directory model (idea N9). Pure: no DOM, no fetch.
// The directory is one searchable list built from one data file per country. Today there is one file, Canada
// (data/synagogues/canada.json). The list of files is data/synagogues/sources.json; a United States file in the same shape can be
// added there later (tools/synagogues/import-directory.mjs writes one from a spreadsheet export) and nothing else has to change.
// A country file is { title, updated, provinces|states|regions: [{ code, name }], congregations: [{ id, name, city,
// province|state|region, status, ... }] }.

export const SOURCES_FILE = 'data/synagogues/sources.json';
export const DEFAULT_SOURCES = Object.freeze({ files: [{ country: 'CA', file: 'data/synagogues/canada.json' }] });
export const COUNTRIES = Object.freeze({
  CA: { code: 'CA', name: 'Canada', regionWord: 'province' },
  US: { code: 'US', name: 'the United States', regionWord: 'state' },
});
const str = (v) => (typeof v === 'string' ? v.trim() : '');
const regionsOf = (data) => data?.provinces || data?.states || data?.regions || [];
const regionCodeOf = (c) => str(c?.province) || str(c?.state) || str(c?.region);

/** Lower case, accents folded, punctuation to spaces: "Montréal, QC" -> "montreal qc". */
export const fold = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9֐-׿]+/g, ' ').trim();

/** The sources list, cleaned. Unknown countries and odd paths are dropped; an empty or broken list falls back to Canada alone. */
export function normaliseSources(raw) {
  const files = (Array.isArray(raw?.files) ? raw.files : []).filter((f) => COUNTRIES[f?.country] && /^data\/synagogues\/[a-z0-9-]+\.json$/.test(str(f.file)))
    .map((f) => ({ country: f.country, file: f.file }));
  const seen = new Set(), out = files.filter((f) => !seen.has(f.country) && seen.add(f.country));
  return { files: out.length ? out : DEFAULT_SOURCES.files.map((f) => ({ ...f })) };
}

/** Problems with one country file, as plain sentences. Empty means it can join the directory. */
export function validateDirectory(data, country) {
  const errs = [];
  if (!COUNTRIES[country]) return [`Unknown country ${country}.`];
  if (!data || typeof data !== 'object') return ['The file is empty.'];
  const regions = regionsOf(data), codes = new Set();
  if (!Array.isArray(regions) || !regions.length) errs.push(`The file lists no ${COUNTRIES[country].regionWord}s.`);
  for (const r of regions || []) { if (!str(r?.code) || !str(r?.name)) errs.push('A region has no code or name.'); else if (codes.has(r.code)) errs.push(`Region ${r.code} is listed twice.`); codes.add(r?.code); }
  if (!Array.isArray(data.congregations)) return [...errs, 'The file has no congregations list.'];
  const ids = new Set();
  data.congregations.forEach((c, i) => {
    const who = str(c?.id) || `row ${i + 1}`;
    if (!/^[a-z0-9-]+$/.test(str(c?.id))) errs.push(`${who}: the id must be lower-case letters, digits and hyphens.`);
    else if (ids.has(c.id)) errs.push(`${who}: the id is used twice.`);
    ids.add(c?.id);
    if (!str(c?.name)) errs.push(`${who}: no name.`);
    if (!str(c?.city)) errs.push(`${who}: no city.`);
    if (!codes.has(regionCodeOf(c))) errs.push(`${who}: its ${COUNTRIES[country].regionWord} "${regionCodeOf(c)}" is not in the file's list.`);
    if (c?.status != null && !['current', 'legacy'].includes(c.status)) errs.push(`${who}: status must be current or legacy.`);
    if (c?.website != null && str(c.website) && !/^https?:\/\//.test(c.website)) errs.push(`${who}: the website must start with http:// or https://.`);
  });
  return errs;
}

/**
 * One directory from several country files: { countries: [{ code, name, regionWord, regions: [{ code, name, country }] }],
 * provinces (every region, in file order, for the existing screens), congregations: [{ ...c, country, province }], problems }.
 * A file that fails validateDirectory is left out and named in `problems`; a congregation id already used by an earlier
 * country is left out the same way. The existing fields of a congregation are passed through untouched.
 * @param {{country:string, data:any}[]} files
 */
export function mergeDirectories(files) {
  const countries = [], congregations = [], problems = [], ids = new Set();
  for (const { country, data } of files || []) {
    const errs = validateDirectory(data, country);
    if (errs.length) { problems.push({ country, errors: errs }); continue; }
    const regions = regionsOf(data).map((r) => ({ code: r.code, name: r.name, country }));
    countries.push({ ...COUNTRIES[country], regions, updated: str(data.updated) });
    for (const c of data.congregations) {
      if (ids.has(c.id)) { problems.push({ country, errors: [`${c.id}: this id is already used by another country's file.`] }); continue; }
      ids.add(c.id);
      congregations.push({ ...c, status: c.status || 'current', country, province: regionCodeOf(c) });
    }
  }
  return { countries, provinces: countries.flatMap((c) => c.regions), congregations, problems };
}

/** 'Reform Synagogues in Canada' / '... in Canada and the United States'. */
export function directoryTitle(dir) {
  const names = (dir?.countries || []).map((c) => c.name);
  if (!names.length) return 'Reform Synagogues';
  return 'Reform Synagogues in ' + (names.length === 1 ? names[0] : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1]);
}
/** 'province' / 'province or state', for labels. */
export const regionWords = (dir) => [...new Set((dir?.countries || []).map((c) => c.regionWord))].join(' or ') || 'region';

/** The text a congregation is searched by: name, city, region code and name, country, postal or zip code from the address. */
export function searchText(c, dir) {
  const r = (dir?.provinces || []).find((x) => x.code === c.province && x.country === c.country);
  return fold([c.name, c.city, c.province, r?.name, COUNTRIES[c.country]?.name, c.address].filter(Boolean).join(' '));
}

/**
 * Search and filter. q: free text, every word must be found (a word matches the start of any word in the entry, so "van"
 * finds Vancouver); country / region: codes or ''. Order is the files' own order. Returns the matching congregations.
 */
export function searchDirectory(dir, { q = '', country = '', region = '' } = {}) {
  const terms = fold(q).split(' ').filter(Boolean);
  return (dir?.congregations || []).filter((c) => {
    if (country && c.country !== country) return false;
    if (region && c.province !== region) return false;
    if (!terms.length) return true;
    const words = searchText(c, dir).split(' ');
    return terms.every((t) => words.some((w) => w.startsWith(t)));
  });
}

/** '27 congregations' / '3 of 27 congregations match'. */
export function countLine(found, total, filtered, regionWord = 'province') {
  const noun = (n) => (n === 1 ? 'congregation' : 'congregations');
  if (!filtered) return `${total} ${noun(total)}`;
  return found ? `${found} of ${total} ${noun(total)} ${found === 1 ? 'matches' : 'match'}` : `No congregation matches. Try a city, a ${regionWord} or part of a name.`;
}
