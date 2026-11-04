// Reviewer instructions per pack family and reviewer type. Plain data, no I/O.
// Three reviewer types: teacher (Hebrew teacher), cantor (cantor or rabbi: liturgy and trope),
// native (Israeli native speaker: modern usage). role: 'primary' | 'optional' | 'skip'.

export const REVIEWER_TYPES = {
  teacher: 'Hebrew teacher',
  cantor: 'Cantor or rabbi (liturgy and trope)',
  native: 'Israeli native speaker (modern usage)',
};

export const VERDICTS = ['OK', 'Fix', 'Unsure'];

export const HOW_TO_MARK = [
  'Read each Hebrew cell aloud before you decide.',
  'In the verdict column write OK (you would put your name to it), Fix (and write the right text in the correction column), or Unsure (say why in notes).',
  'Leave a row blank if you did not look at it. Blank means "not reviewed" and that is fine.',
  'Do not change the id or Hebrew columns. Corrections go in the correction column only.',
  'Return the file as CSV (UTF-8), not .xlsx. Keep the first row (the column names).',
];

const T = (role, judge, skip) => ({ role, judge, skip });

export const FAMILIES = {
  core: {
    title: 'Core lessons (r01-r51, il01-il24 word lists)',
    teacher: T('primary',
      ['Pointing: every vowel, dagesh and shin/sin dot', 'Spelling of the word', 'English gloss matches this Hebrew word', 'Word suits the lesson it sits in (letters and vowels taught so far)'],
      ['Teaching order, lesson design or app wording', 'Transliteration style (only whether it matches the sound)', 'Audio (none exists)']),
    cantor: T('optional',
      ['Only words that are also prayer words: pointing and meaning as used in the siddur'],
      ['Everyday or Israeli-street words', 'Teaching order']),
    native: T('primary',
      ['Whether Israelis really say the word this way today', 'Register (too formal, too slang, outdated)', 'Gloss is the common meaning'],
      ['Biblical or liturgical-only readings of the word', 'Full pointing rules (spoken Hebrew is mostly unpointed); flag only wrong vowels you hear']),
  },
  inter: {
    title: 'Intermediate lessons I-01 to I-50 (word lists)',
    teacher: T('primary',
      ['Pointing and spelling', 'Gloss accuracy', 'Whether the three transliterations (israeli / sephardi / ashkenazi) follow from the pointing'],
      ['Which tradition the app should teach', 'Lesson design']),
    cantor: T('primary',
      ['Words from prayer, Torah and Haftarah units: pointing as in a printed siddur or chumash', 'Ashkenazi and Sephardi respellings as a congregation would say them'],
      ['Halacha or what a congregation should do', 'Modern conversational words']),
    native: T('optional',
      ['Israeli respelling and everyday meaning of non-liturgical words'],
      ['Liturgical nusach and trope', 'Ashkenazi and Sephardi respellings']),
  },
  vocab: {
    title: 'Vocabulary: top 1000 words by frequency rank',
    teacher: T('primary',
      ['Pointing, spelling and part of speech implied by the gloss', 'Gloss is a correct and useful meaning for a learner', 'Flag rare senses or homographs that rank high by accident'],
      ['Frequency order itself', 'Example sentences (not in this sheet)']),
    cantor: T('skip',
      ['Optional: words from religion and prayer only, for pointing as in the siddur'],
      ['Everything else']),
    native: T('primary',
      ['Is this a word you actually use or hear', 'Register and gender', 'Gloss that is dictionary-ese or odd in speech'],
      ['Biblical-only senses unless the gloss claims modern use']),
  },
  corpus: {
    title: 'Prayer and Torah lines, and the trope table',
    teacher: T('optional',
      ['Pointing against a printed text', 'English line matches the Hebrew line'],
      ['Nusach choice', 'Trope names and cantillation', 'Theology or halacha']),
    cantor: T('primary',
      ['Hebrew text of each line against a printed siddur or chumash of the named nusach', 'Pointing, maqaf, paseq and divine-name spelling', 'Trope table names (Ashkenazi and Sephardi) and the cantillated verses', 'English line is a fair literal gloss'],
      ['Whether the product is "kosher" or approved', 'Disputes between movements', 'Licence or source attribution', 'Writing new text']),
    native: T('skip',
      ['Optional: modern-Hebrew sense of the English gloss'],
      ['Liturgical nusach', 'Trope']),
  },
  pron: {
    title: 'Pronunciation respellings per tradition',
    teacher: T('primary',
      ['Respelling follows the pointing by the rules of the named tradition', 'Stress position', 'Consistent vowel and consonant choices'],
      ['Which tradition the app should offer', 'The spelling system itself (only whether it conveys the sound)']),
    cantor: T('primary',
      ['Sephardi and Ashkenazi rows: does a congregation of that tradition say it this way (kamatz, tav, cholam, stress)', 'Prayer-word rows especially'],
      ['Israeli rows', 'Disputes about which Ashkenazi or Sephardi sub-tradition is "right"; say which one you judge by in notes']),
    native: T('primary',
      ['Israeli rows: matches how the word is said in Israel today', 'Phrasebook rows: natural everyday sound'],
      ['Ashkenazi and Sephardi rows (skip unless you know the tradition)']),
  },
  speak: {
    title: 'Dialogues and speaking sets',
    teacher: T('optional',
      ['Pointing and grammar (gender and number agreement)', 'Gloss accuracy'],
      ['Whether the dialogue is realistic (leave to native speaker)']),
    cantor: T('skip', ['Nothing required'], ['Everything in this pack']),
    native: T('primary',
      ['Would a person really say this line', 'Natural wording, register, politeness', 'Gender of speaker matches the verb forms', 'Transliteration matches the sound'],
      ['Liturgical or biblical readings', 'Prices and names (made-up for practice)']),
  },
  fest: {
    title: 'Festival vocabulary and reading lines',
    teacher: T('primary',
      ['Pointing, spelling and gloss of the festival word', 'Word really belongs to this festival'],
      ['Halachic detail of the festival', 'Calendar dates']),
    cantor: T('primary',
      ['Reading lines taken from the corpus: correct for the festival', 'Terms used in the synagogue service'],
      ['Customs that differ between communities (note them, do not rule)']),
    native: T('optional',
      ['How Israelis say and use the word today (for example a holiday greeting)'],
      ['Liturgical nusach']),
  },
};

// Pack definitions: id prefix for files, family, who should take it first.
export const PACKS = [
  { key: 'core', num: '01', family: 'core', file: '01-core-lessons', title: 'Core lessons', first: 'teacher' },
  { key: 'inter', num: '02', family: 'inter', file: '02-intermediate-I-01-I-50', title: 'Intermediate lessons I-01 to I-50', first: 'teacher' },
  { key: 'vocab', num: '03', family: 'vocab', file: '03-vocab-top-1000', title: 'Vocabulary top 1000 by frequency', first: 'native' },
  { key: 'corpus', num: '04', family: 'corpus', file: '04-liturgy-corpus-and-trope', title: 'Prayer and Torah lines, trope', first: 'cantor' },
  { key: 'pron-israeli', num: '05a', family: 'pron', file: '05a-pronunciation-israeli', title: 'Pronunciation respellings: Israeli', first: 'native', tradition: 'israeli' },
  { key: 'pron-sephardi', num: '05b', family: 'pron', file: '05b-pronunciation-sephardi', title: 'Pronunciation respellings: Sephardi', first: 'cantor', tradition: 'sephardi' },
  { key: 'pron-ashkenazi', num: '05c', family: 'pron', file: '05c-pronunciation-ashkenazi', title: 'Pronunciation respellings: Ashkenazi', first: 'cantor', tradition: 'ashkenazi' },
  { key: 'speak', num: '06', family: 'speak', file: '06-dialogues-and-speak-sets', title: 'Dialogues and speaking sets', first: 'native' },
  { key: 'fest', num: '07', family: 'fest', file: '07-festival-vocabulary', title: 'Festival vocabulary', first: 'teacher' },
];

export function instructionsFor(pack) {
  const f = FAMILIES[pack.family];
  return { title: f.title, teacher: f.teacher, cantor: f.cantor, native: f.native };
}
