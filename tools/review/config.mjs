// Shared configuration for the reviewer-packet tools.

/** Columns of every reviewer sheet, in order. The importer reads columns by NAME, so reordering is safe. */
export const COLUMNS = [
  'id', 'area', 'hebrew', 'transliteration', 'english', 'what_to_check',
  'status', 'corrected_text', 'reviewer_notes', 'reviewer', 'review_date', 'priority', 'source',
];

export const STATUSES = ['ok', 'fix', 'unsure'];

/** Areas in priority order. `layout`: 'cards' = one big block per item, 'table' = compact rows. */
export const AREAS = [
  { slug: 'opening-prayer',   n: 1,  priority: 1, title: 'Book opening prayer (English original with Hebrew terms)', layout: 'cards', group: 'opening prayer', reviewer: 'clergy or educator' },
  { slug: 'prayers',          n: 2,  priority: 2, title: 'Prayer registry (70 texts incl. 43 liturgy additions) and denomination notes', layout: 'cards', group: 'prayers', reviewer: 'clergy / cantor / Hebrew educator' },
  { slug: 'prayer-prompts',   n: 3,  priority: 2, title: 'Daily prompt prayers (morning, evening, Shabbat eve, holidays)', layout: 'cards', group: 'prayers', reviewer: 'clergy / Hebrew educator' },
  { slug: 'prayer-guide',     n: 4,  priority: 2, title: 'Reading a Torah service (guide prose)', layout: 'cards', group: 'prayers', reviewer: 'clergy' },
  { slug: 'torahread',       n: 19, priority: 3, title: 'Torah reading ladder (7 verses, 30 most frequent Torah words)', layout: 'table', group: 'curriculum', reviewer: 'Hebrew teacher / clergy' },
  { slug: 'lessons',          n: 5,  priority: 3, title: 'Curriculum lessons (titles, goals, lesson words)', layout: 'table', group: 'curriculum', reviewer: 'Hebrew teacher' },
  { slug: 'dialogues',        n: 6,  priority: 3, title: 'Dialogues', layout: 'table', group: 'curriculum', reviewer: 'Israeli native speaker / teacher' },
  { slug: 'gender-pairs',     n: 7,  priority: 3, title: 'Gender pairs and paradigms', layout: 'table', group: 'curriculum', reviewer: 'Hebrew teacher' },
  { slug: 'loanwords',        n: 8,  priority: 3, title: 'Loanwords', layout: 'table', group: 'curriculum', reviewer: 'Israeli native speaker' },
  { slug: 'hints',            n: 9,  priority: 3, title: 'Interference hints (English text about Hebrew)', layout: 'cards', group: 'curriculum', reviewer: 'Hebrew teacher' },
  { slug: 'israel-everyday', n: 0, priority: 4, title: 'How Israelis say it: fillers, etiquette, register ladder, scenarios, learner giveaways', layout: 'cards', group: 'phrasebook', reviewer: 'Israeli native speaker' },
  { slug: 'phrasebook',       n: 10, priority: 4, title: 'Survival phrasebook', layout: 'table', group: 'phrasebook', reviewer: 'Israeli native speaker' },
  { slug: 'letter-strokes',   n: 11, priority: 4, title: 'Letter strokes (print and cursive, shape + order)', layout: 'cards', group: 'letters', reviewer: 'Israeli primary-school teacher' },
  { slug: 'mnemonics',        n: 12, priority: 4, title: 'Letter mnemonics (example words and name claims)', layout: 'cards', group: 'letters', reviewer: 'Hebrew teacher' },
  { slug: 'pron-soundgap',    n: 13, priority: 5, title: 'Pronunciation: sound-gap lab', layout: 'table', group: 'pronunciation', reviewer: 'native speaker / speech teacher' },
  { slug: 'pron-prayerwords', n: 14, priority: 5, title: 'Pronunciation: prayer words in three accents', layout: 'table', group: 'pronunciation', reviewer: 'native speaker + Ashkenazi-trained reader' },
  { slug: 'pron-vowels',      n: 15, priority: 5, title: 'Pronunciation: vowel and consonant data, plene pairs, stress, dot hints', layout: 'table', group: 'pronunciation', reviewer: 'Hebrew teacher' },
  { slug: 'pron-traditions', n: 0, priority: 5, title: 'Pronunciation traditions guide: "which should I learn?" and per-sound comparison', layout: 'cards', group: 'pronunciation', reviewer: 'linguist / cantor / Hebrew teacher' },
  { slug: 'calendar',         n: 16, priority: 5, title: 'Calendar texts (holiday and month names)', layout: 'table', group: 'calendar', reviewer: 'Hebrew teacher / clergy' },
  { slug: 'vocab-top1000',    n: 17, priority: 6, title: 'Vocabulary, ranks 1-1000 (pointing and glosses)', layout: 'table', group: 'vocab', reviewer: 'Hebrew teacher / native speaker' },
  { slug: 'vocab-rest',       n: 18, priority: 7, title: 'Vocabulary, ranks 1001-5000 (pointing and glosses) - sheet only', layout: 'table', group: 'vocab', reviewer: 'Hebrew teacher / native speaker', noPdf: true },
  { slug: 'other-flagged', n: 0, priority: 8, title: 'Other flagged data not covered by a dedicated area (automatic catch-all)', layout: 'cards', group: 'other', reviewer: 'Hebrew teacher' },
];
AREAS.forEach((a, i) => { a.n = i + 1; }); // number = position in priority order
export const AREA_BY_SLUG = Object.fromEntries(AREAS.map((a) => [a.slug, a]));

export const VOCAB_TOP = 1000;

/** The 43 liturgy records added to data/corpus/registry.json in commit 449b068 ("corpus: add 43 liturgy records"). */
export const LITURGY_ADDITIONS = [
  'ein-kamocha', 'malchutcha', 'adonai-oz', 'gadlu', 'yehalelu', 'hashivenu', 'kedushah-kadosh', 'kedushah-baruch',
  'kedushah-yimloch', 'kiddush-veshamru', 'kiddush-zachor', 'ashrei-84-5', 'ashrei-144-15', 'ashrei-145-1-3',
  'ashrei-145-16', 'shir-hamaalot', 'vayehi-binsoa', 'lecha-hashem', 'vezot-hatorah', 'etz-chaim', 'brich-shmei',
  'hagomel', 'avot-closing', 'amidah-yihyu', 'amidah-elohai-netzor', 'oseh-shalom', 'sim-shalom', 'kiddush-shabbat-eve',
  'lecha-dodi-1', 'yigdal', 'zimun-opening', 'haftarah-before', 'haftarah-after', 'mi-sheberach-opening',
  'havdalah-opening', 'havdalah-spices', 'havdalah-flame', 'havdalah-hamavdil', 'hanukkah-candle', 'hanukkah-nissim',
  'shehecheyanu', 'hanerot-halalu', 'maoz-tzur-1',
];

/**
 * Time model. Seconds of reviewer time per item; prayers/prompts add seconds per Hebrew word.
 * ASSUMPTIONS (also stated in docs/review/README.md): a fluent reader who reads each Hebrew line ALOUD once,
 * compares it with their own knowledge or a printed text, and types a status. Breaks/overhead are the
 * OVERHEAD multiplier. Sheets are not read cold: the reviewer has the PDF open next to the sheet.
 */
export const RATES = {
  'opening-prayer':   { base: 150 },
  'prayers':          { base: 150, perWord: 10 },
  'prayer-prompts':   { base: 60, perWord: 8 },
  'prayer-guide':     { base: 240 },
  'lessons':          { base: 25 },
  'dialogues':        { base: 40 },
  'gender-pairs':     { base: 40 },
  'loanwords':        { base: 20 },
  'hints':            { base: 60 },
  'phrasebook':       { base: 30 },
  'letter-strokes':   { base: 150 },
  'mnemonics':        { base: 150 },
  'pron-soundgap':    { base: 45 },
  'pron-prayerwords': { base: 120 },
  'pron-vowels':      { base: 60 },
  'pron-traditions':  { base: 150 },
  'calendar':         { base: 90 },
  'israel-everyday':  { base: 75 },
  'other-flagged':    { base: 75 },
  'torahread':        { base: 45, perWord: 4 },
  'vocab-top1000':    { base: 20 },
  'vocab-rest':       { base: 20 },
};
export const OVERHEAD = 1.15;

export function estimateSeconds(slug, item) {
  const r = RATES[slug] || { base: 60 };
  return r.base + (r.perWord || 0) * (item.words || 0);
}
