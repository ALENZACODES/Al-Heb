// Torah and text study (ideas M1, M2, M4): [name, pattern, module, title, section, extra] for router.js, nav-model.js and
// nav.strings.js. Every view loads on first open (src/chant/ and src/torahstudy/ are on demand, see tools/build-precache.mjs).
const C = '../chant/', T = '../torahstudy/';
export const STUDY = [
  ['trope-melody', '/trope/melody', C + 'melody.view.js', 'Trope Melody', 'read'],
  ['word-study', '/word-study', T + 'wordstudy.view.js', 'Word by Word', 'read'],
  ['word-study-portion', '/word-study/:id', T + 'wordstudy.view.js', 'Word by Word', 'read', { paramQuery: { id: 'id' }, parent: 'word-study' }],
  ['cross-references', '/cross-references', T + 'xref.view.js', 'Cross-References', 'read'],
];
export const STUDY_ROUTES = STUDY.map(([name, pattern, module, title, , x = {}]) => ({ name, pattern, module, title, owner: 'study', optional: true, ...(x.paramQuery ? { paramQuery: x.paramQuery } : {}) }));
export const STUDY_SECTION = (sec) => STUDY.filter((r) => r[4] === sec).map((r) => r[0]);
export const STUDY_PARENT = Object.fromEntries(STUDY.filter((r) => r[5]?.parent).map((r) => [r[0], r[5].parent]));
export const STUDY_LABELS = Object.fromEntries(STUDY.map((r) => ['nav.route.' + r[0], r[3]]));
