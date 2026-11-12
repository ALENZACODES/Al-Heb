// Lane games-books: [name, pattern, module, title, section, extra] for router.js, nav-model.js, nav.strings.js. Views load lazily.
const G = '../games/', B = '../books/', T = '../torahstudy/';
export const GB = [
  ['game-library', '/game-library', G + 'library.view.js', 'Games Library', 'learn'],
  ['tournament', '/tournament', G + 'tournament.view.js', 'Games Tournament', 'learn'],
  ['rootbuilder', '/rootbuilder', G + 'rootbuilder.view.js', 'Root Builder', 'learn', { hidden: 1 }],
  ['sprint60', '/sprint60', G + 'sprint60.view.js', 'Sixty-Second Sprint', 'learn', { hidden: 1 }],
  ['wordfinder-listen', '/wordfinder-listen', G + 'wordfinder.view.js', 'Word Finder: Listening', 'learn', { hidden: 1, query: { listen: '1' } }],
  ['listenspot', '/listenspot', G + 'listenspot.view.js', 'Listen and Spot', 'learn', { hidden: 1 }],
  ['quizladder-duo', '/quizladder-duo', G + 'quizladder-duo.view.js', 'Quiz Ladder for Two', 'learn', { hidden: 1 }],
  ['dreidel-duo', '/dreidel-duo', G + 'hanukkah-dreidel1.view.js', 'Dreidel for Two to Four', 'learn', { hidden: 1, query: { players: '2' } }],
  ['parashah', '/parashah', T + 'parashah.view.js', "This Week's Parashah", 'read'],
  ['torah-search', '/torah-search', T + 'search.view.js', 'Torah Search', 'read'],
  ['verse-notebook', '/verse-notebook', T + 'notebook.view.js', 'Verse Notebook', 'read'],
  ['reading-challenge', '/reading-challenge', B + 'challenge.view.js', 'Reading Challenges', 'read'],
  ['book-card', '/book-card/:id', B + 'card.view.js', 'Book Completion Card', 'read', { paramQuery: { id: 'id' }, parent: 'books' }],
];
export const GB_ROUTES = GB.map(([name, pattern, module, title, , x = {}]) => ({ name, pattern, module, title, owner: 'games-books', optional: true, ...(x.query ? { query: x.query } : {}), ...(x.paramQuery ? { paramQuery: x.paramQuery } : {}) }));
export const GB_SECTION = (sec) => GB.filter((r) => r[4] === sec).map((r) => r[0]);
export const GB_HIDDEN = GB.filter((r) => r[5]?.hidden).map((r) => r[0]);
export const GB_PARENT = Object.fromEntries(GB.filter((r) => r[5]?.parent).map((r) => [r[0], r[5].parent]));
export const GB_LABELS = Object.fromEntries(GB.map((r) => ['nav.route.' + r[0], r[3]]));
