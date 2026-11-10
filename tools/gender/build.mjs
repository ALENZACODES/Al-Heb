// Builds data/gender/templates.json from data/vocab/words.json. Hebrew is copied from the vocabulary file, never written here.
//  pronouns: the five singular pronouns used for agreement (I, you m, you f, he, she), looked up by unpointed spelling.
//  pairs:    person nouns with a masculine row and a different feminine form in `forms.feminine` (a list of unpointed masculine spellings
//            picks the person nouns whose English gloss does not change with gender (so not son/daughter or boy/girl); the build FAILS if one is missing, so a typo cannot slip in).
//  irregular: nouns whose tagged gender disagrees with the usual ending (feminine without ה/ת, masculine with ה/ת), top 3000 by frequency.
// Adjective and verb agreement are NOT built from this file: the vocabulary data has no feminine adjective (1 row) and one present form per verb.
// Usage: node tools/gender/build.mjs [--check]
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const bare = (s) => s.replace(/[֑-ׇ]/g, '');
const PERSON_M = ['תלמיד', 'חבר', 'ילד', 'זקן', 'סוכן', 'נשיא', 'תינוק', 'חולה', 'גבור', 'חיל', 'רופא', 'מורה', 'טיס', 'יהודי', 'יתום', 'שחקן', 'ידיד', 'שתף', 'קרוב'];
const PRON = { ani: 'אני', atah: 'אתה', at: 'את', hu: 'הוא', hi: 'היא' };

export function build(words) {
  const ok = words.filter((w) => w.kind === 'word' && !(w.flags && w.flags.hidden));
  const pick = (u, pos, test = () => true) => ok.filter((w) => w.heUnpointed === u && w.pos === pos && test(w)).sort((a, b) => (a.modernRank ?? 1e9) - (b.modernRank ?? 1e9))[0];
  const pronouns = {};
  for (const [k, u] of Object.entries(PRON)) { const w = pick(u, 'pron'); if (!w) throw new Error('pronoun missing: ' + u); pronouns[k] = { id: w.id, he: w.he, translit: w.translit, en: w.en }; }
  const pairs = PERSON_M.map((u) => {
    const w = pick(u, 'noun', (x) => x.gender === 'm' && x.forms && x.forms.feminine && x.forms.feminine !== x.he);
    if (!w) throw new Error('person noun pair missing: ' + u);
    return { id: w.id, en: w.en, m: { he: w.he, translit: w.translit }, f: { he: w.forms.feminine }, rank: w.modernRank ?? null };
  });
  const irregular = ok.filter((w) => w.pos === 'noun' && (w.gender === 'm' || w.gender === 'f') && w.modernRank <= 3000 && w.he.indexOf('־') < 0)
    .map((w) => ({ w, end: /[הת]$/.test(bare(w.he)) }))
    .filter(({ w, end }) => (w.gender === 'f' && !end) || (w.gender === 'm' && end))
    .sort((a, b) => a.w.modernRank - b.w.modernRank).map(({ w }) => ({ id: w.id, he: w.he, translit: w.translit, en: w.en, gender: w.gender, kind: w.gender === 'f' ? 'feminine-without-feminine-ending' : 'masculine-with-feminine-ending', rank: w.modernRank }));
  return { schema: 1, source: 'data/vocab/words.json', note: 'Hebrew, pointing and glosses are copied from the vocabulary file. The person-noun list is an editorial choice of existing rows. Gender tags come from the dictionary source; some words are used in both genders. Unreviewed by a Hebrew teacher.', pronouns, pairs, irregular };
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const text = JSON.stringify(build(JSON.parse(readFileSync(root + 'data/vocab/words.json', 'utf8')).words), null, 1) + '\n';
  const p = root + 'data/gender/templates.json';
  if (process.argv.includes('--check')) { let cur = ''; try { cur = readFileSync(p, 'utf8'); } catch {} if (cur !== text) { console.error('templates.json is stale'); process.exit(1); } console.log('templates.json is current'); }
  else { writeFileSync(p, text); console.log('wrote', p, text.length); }
}
