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
  { slug: 'intermediate',     n: 0,  priority: 3, title: 'Intermediate lessons I-01 to I-50: exercises (lesson titles and words are in the lessons area)', layout: 'cards', group: 'curriculum', reviewer: 'Hebrew teacher; clergy or cantor for the prayer units' },
  { slug: 'firstday',         n: 0,  priority: 3, title: 'First day: first-10-minutes path, baby-step on-ramp, 20-word reading ladder', layout: 'cards', group: 'curriculum', reviewer: 'Hebrew teacher' },
  { slug: 'israel-everyday', n: 0, priority: 4, title: 'How Israelis say it: fillers, etiquette, register ladder, scenarios, learner giveaways', layout: 'cards', group: 'phrasebook', reviewer: 'Israeli native speaker' },
  { slug: 'phrasebook',       n: 10, priority: 4, title: 'Survival phrasebook', layout: 'table', group: 'phrasebook', reviewer: 'Israeli native speaker' },
  { slug: 'speak',            n: 0,  priority: 4, title: 'Speaking practice: minimal-pair contrasts and the nine speak-aloud prayers', layout: 'cards', group: 'phrasebook', reviewer: 'Israeli native speaker / Hebrew teacher' },
  { slug: 'letter-strokes',   n: 11, priority: 4, title: 'Letter strokes (print and cursive, shape + order)', layout: 'cards', group: 'letters', reviewer: 'Israeli primary-school teacher' },
  { slug: 'mnemonics',        n: 12, priority: 4, title: 'Letter mnemonics (example words and name claims)', layout: 'cards', group: 'letters', reviewer: 'Hebrew teacher' },
  { slug: 'pron-soundgap',    n: 13, priority: 5, title: 'Pronunciation: sound-gap lab', layout: 'table', group: 'pronunciation', reviewer: 'native speaker / speech teacher' },
  { slug: 'pron-prayerwords', n: 14, priority: 5, title: 'Pronunciation: prayer words in three accents', layout: 'table', group: 'pronunciation', reviewer: 'native speaker + Ashkenazi-trained reader' },
  { slug: 'pron-vowels',      n: 15, priority: 5, title: 'Pronunciation: vowel and consonant data, plene pairs, stress, dot hints', layout: 'table', group: 'pronunciation', reviewer: 'Hebrew teacher' },
  { slug: 'pron-traditions', n: 0, priority: 5, title: 'Pronunciation traditions guide: "which should I learn?" and per-sound comparison', layout: 'cards', group: 'pronunciation', reviewer: 'linguist / cantor / Hebrew teacher' },
  { slug: 'pron-rules',       n: 0,  priority: 5, title: 'Pronunciation rules and a stratified sample of the rule-generated respellings (not the 6,630 derived rows)', layout: 'cards', group: 'pronunciation', reviewer: 'Hebrew teacher; cantor for Sephardi and Ashkenazi' },
  { slug: 'calendar',         n: 16, priority: 5, title: 'Calendar texts (holiday and month names)', layout: 'table', group: 'calendar', reviewer: 'Hebrew teacher / clergy' },
  { slug: 'vocab-top1000',    n: 17, priority: 6, title: 'Vocabulary, ranks 1-1000 (pointing and glosses)', layout: 'table', group: 'vocab', reviewer: 'Hebrew teacher / native speaker' },
  { slug: 'vocab-rest',       n: 18, priority: 7, title: 'Vocabulary, ranks 1001-5000 (pointing and glosses) - sheet only', layout: 'table', group: 'vocab', reviewer: 'Hebrew teacher / native speaker', noPdf: true },
  { slug: 'other-flagged', n: 0, priority: 8, title: 'Safety net: flagged data that no area claims (must be empty; tests/review.coverage.test.js fails otherwise)', layout: 'cards', group: 'other', reviewer: 'Hebrew teacher' },
];
AREAS.forEach((a, i) => { a.n = i + 1; }); // number = position in priority order
export const AREA_BY_SLUG = Object.fromEntries(AREAS.map((a) => [a.slug, a]));

export const VOCAB_TOP = 1000;

/**
 * Data files that are CLAIMED by an area without being turned into rows of their own. A flagged file must be
 * either extracted into an area (its rows name it in `source`) or listed here with a reason; anything else lands
 * in `other-flagged`, and tests/review.coverage.test.js fails while that area is not empty.
 */
export const CLAIMS = [
  { area: 'pron-rules', match: /^data\/pronunciation\/variants\//, reason: 'derived: 6,630 rule-generated respellings x 3 traditions. Reviewers get the rule list and a stratified sample (pron-rules), not every row.' },
  { area: 'pron-rules', match: /^data\/pronunciation\/derived\//, reason: 'derived from the rules and the variants: syllable splits and speech markup. Judged through the rules, never row by row.' },
  { area: 'pron-rules', match: /^data\/pronunciation\/runtime\/(?!rules\.json$)/, reason: 'derived lookup shards, picks, reasons and quiz pool built from the rules. rules.json (learner-facing prose) is reviewed as rows.' },
  { area: 'lessons', match: /^data\/curriculum\/lessons-intermediate\/I-\d+\.json$/, reason: 'generated copies of the I-01..I-50 entries in lessons.json (identical); titles and words are in lessons, exercises in intermediate.' },
  { area: 'lessons', match: /^data\/curriculum\/intermediate-index\.json$/, reason: 'index of the same lessons (titles, prerequisites, prayer line ids); nothing to read that the lessons rows do not show.' },
  { area: 'lessons', match: /^data\/curriculum\/lesson-lexicon\.json$/, reason: 'seven curated pointed forms already used as lesson words in lessons.json (I-16, I-18, I-37, I-40 and festival greetings). Not generated vocabulary; proofread is still false and native review is outstanding.' },
  { area: 'lessons', match: /^data\/curriculum\/practical(-units\.json|\/)/, reason: 'draft conversation units and pages that only copy phrasebook, lesson and dialogue Hebrew already in those files; no new Hebrew; native review still outstanding (proofread: false).' },
  { area: 'vocab-top1000', match: /^data\/vocab\/(words|corrections)\.json$/, reason: 'carries the replacement example sentences flagged needsNativeReview (flags on the example). They are reviewer rows vocab-example:<id> in docs/review/packs/03-vocab-top-1000, not rows here, because the sheet there has no example column.' },
  { area: 'vocab-top1000', match: /^data\/vocab\/packs\/(?!vocab5k-tier-)[a-z-]+-\d+\.json$/, reason: 'themed word packs: copies of the same flagged example sentences as data/vocab/words.json (see that claim).' },
];
export const claimFor = (file) => CLAIMS.find((c) => c.match.test(file)) || null;

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
  'intermediate':     { base: 40, perWord: 3 },
  'firstday':         { base: 45 },
  'speak':            { base: 60 },
  'pron-rules':       { base: 30 },
  'torahread':        { base: 45, perWord: 4 },
  'vocab-top1000':    { base: 20 },
  'vocab-rest':       { base: 20 },
};
export const OVERHEAD = 1.15;

export function estimateSeconds(slug, item) {
  if (item.secs != null) return item.secs; // an item may carry its own time (pron-rules: rule cards take longer than sample rows)
  const r = RATES[slug] || { base: 60 };
  return r.base + (r.perWord || 0) * (item.words || 0);
}
