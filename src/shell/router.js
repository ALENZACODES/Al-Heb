// @ts-check
// Hash router + route table. Pure matching (matchRoute) is testable in Node.
// Each route lazily imports its view module; views export mount(root, ctx) => unmount.

/**
 * @typedef {{name:string, pattern:string, module:string|null, nav?:string, title:string, owner:string, optional?:boolean, quick?:string,
 *   group?:string, needs?:string, query?:Record<string,string>, paramQuery?:Record<string,string>, tier?:'v0'|'preview'}} RouteDef
 * `query` is merged into ctx.query for the view; `paramQuery` copies a path param into ctx.query (param -> query key). This lets
 * pretty routes such as /dialogues/cafe drive lane 1's learn.view.js, which dispatches on ?dialogue=cafe. `group` ("learn") lists
 * the route on Home under "More ways to learn" instead of the nav bar.
 */
/** @type {RouteDef[]} Module paths are relative to src/shell/. */
export const ROUTES = [
  { name: 'home',     pattern: '/',               module: './home.view.js', tier: 'v0',                      nav: 'nav.home',     title: 'Home', owner: 'lane8' },
  { name: 'learn',    pattern: '/learn',          module: '../curriculum/learn.view.js', tier: 'v0',         nav: 'nav.learn',    title: 'Learn', owner: 'lane1' },
  { name: 'letters',  pattern: '/letters',        module: '../letters/trace.view.js', tier: 'v0',            nav: 'nav.letters',  title: 'Letters', owner: 'lane2' },
  { name: 'atlas',    pattern: '/letters/atlas',  module: '../letters/atlas.view.js', tier: 'v0',            title: 'Letter atlas', owner: 'lane2', optional: true, quick: 'nav.atlas' },
  { name: 'letter',   pattern: '/letters/:id',    module: '../letters/trace.view.js', tier: 'v0',            title: 'Letter', owner: 'lane2' },
  // Lane 1 sub-screens. They have no nav entry (nav is already full); Home lists them under "More ways to learn".
  // Their code lives in curriculum/*.view.js and is dispatched by learn.view.js from ctx.query; these routes only inject the query.
  { name: 'loanwords',  pattern: '/loanwords',         module: '../curriculum/learn.view.js', title: 'Words you can already read', owner: 'lane1', group: 'learn', quick: 'nav.loanwords', query: { loanwords: '1' }, needs: 'curriculum/loanwords.view.js' },
  { name: 'loanword',   pattern: '/loanwords/:group',  module: '../curriculum/learn.view.js', title: 'Words you can already read', owner: 'lane1', paramQuery: { group: 'loanwords' }, needs: 'curriculum/loanwords.view.js' },
  { name: 'spotit',     pattern: '/spotit/:letter',    module: '../curriculum/learn.view.js', title: 'Spot It', owner: 'lane1', paramQuery: { letter: 'spotit' }, needs: 'curriculum/spotit.view.js' },
  { name: 'checkpoint', pattern: '/checkpoint',        module: '../curriculum/learn.view.js', title: 'Look-alike checkpoint', owner: 'lane1', group: 'learn', quick: 'nav.checkpoint', query: { checkpoint: '1' }, needs: 'curriculum/checkpoint.view.js' },
  { name: 'dialogues',  pattern: '/dialogues',         module: '../curriculum/learn.view.js', title: 'Israel dialogues', owner: 'lane1', group: 'learn', quick: 'nav.dialogues', query: { dialogues: '1' }, needs: 'curriculum/dialogues.view.js' },
  { name: 'dialogue',   pattern: '/dialogues/:id',     module: '../curriculum/learn.view.js', title: 'Israel dialogue', owner: 'lane1', paramQuery: { id: 'dialogue' }, needs: 'curriculum/dialogues.view.js' },
  { name: 'phrases', pattern: '/phrases', module: '../phrases/phrases.view.js', title: 'Common phrases and sentences', owner: 'phrases', optional: true, group: 'learn', quick: 'nav.phrases' },
  { name: 'phrase', pattern: '/phrases/:id', module: '../phrases/phrases.view.js', title: 'Phrase', owner: 'phrases', optional: true, paramQuery: { id: 'id' } },
  { name: 'awards', pattern: '/awards', module: '../awards/gallery.view.js', title: 'Awards and certificate', owner: 'awards', optional: true, group: 'progress', quick: 'nav.route.awards' },
  { name: 'listen-shelf', pattern: '/listen/shelf', module: '../listen/shelf.view.js', title: 'Sacred listen', owner: 'listen', optional: true, group: 'learn', quick: 'nav.route.listen-shelf' },
  { name: 'ladder',   pattern: '/ladder',        module: '../curriculum/learn.view.js', title: 'Syllable ladder',  owner: 'lane1', group: 'learn', quick: 'nav.ladder',   query: { ladder: '1' },      needs: 'curriculum/ladder.view.js' },
  { name: 'fade',     pattern: '/fade',          module: '../curriculum/learn.view.js', title: 'Fade-out recall',  owner: 'lane1', group: 'learn', quick: 'nav.fade',     query: { fade: '1' },        needs: 'curriculum/fade.view.js' },
  { name: 'fadeline', pattern: '/fade/:id',      module: '../curriculum/learn.view.js', title: 'Fade-out recall',  owner: 'lane1', paramQuery: { id: 'fade' },                                                       needs: 'curriculum/fade.view.js' },
  { name: 'progress', pattern: '/progress', module: '../progress/progress.view.js', tier: 'v0', title: 'Progress', owner: 'lane10', group: 'learn', quick: 'nav.progress' },
  { name: 'wordtrace', pattern: '/words/trace', module: '../wordtrace/wordtrace.view.js', title: 'Trace words', owner: 'lane2', optional: true, quick: 'nav.wordtrace' },
  { name: 'israel',    pattern: '/israel',      module: '../israel/israel.view.js', title: 'Sound like a local', owner: 'lane10', optional: true, group: 'learn', quick: 'nav.israel' },
  { name: 'israelsec', pattern: '/israel/:sec', module: '../israel/israel.view.js', title: 'Sound like a local', owner: 'lane10', paramQuery: { sec: 'sec' } },
  { name: 'traditions', pattern: '/traditions', module: '../traditions/traditions.view.js', title: 'Traditions', owner: 'lane10', optional: true, quick: 'nav.traditions' },
  { name: 'traditions-guide', pattern: '/traditions/guide', module: '../traditions/traditions.view.js', title: 'Which tradition should I learn?', owner: 'lane10', optional: true, query: { tab: 'guide' } },
  { name: 'traditions-hear', pattern: '/traditions/hear', module: '../traditions/traditions.view.js', title: 'Hear the difference', owner: 'lane10', optional: true, query: { tab: 'hear' } },
  { name: 'classtrack',         pattern: '/classtrack',               module: '../classtrack/classtrack.view.js', title: 'Class track', owner: 'lane10', group: 'learn', quick: 'nav.classtrack' },
  { name: 'classtrackweek',     pattern: '/classtrack/:week',         module: '../classtrack/classtrack.view.js', title: 'Class track week', owner: 'lane10', paramQuery: { week: 'week' } },
  { name: 'classtrackmode',     pattern: '/classtrack/:week/:mode',   module: '../classtrack/classtrack.view.js', title: 'Class track sheet', owner: 'lane10', paramQuery: { week: 'week', mode: 'mode' } },
  { name: 'morning', pattern: '/morning', module: '../morning/morning.view.js', title: 'Start your day with God', owner: 'morning', optional: true, quick: 'nav.morning' },
  { name: 'books', pattern: '/books', module: '../books/books.view.js', title: 'Little books', owner: 'books', optional: true },
  { name: 'book', pattern: '/book/:id', module: '../books/book.view.js', title: 'Read a book', owner: 'books', paramQuery: { id: 'book' } },
  { name: 'games', pattern: '/games', module: '../games/games.view.js', title: 'Games', tier: 'preview', owner: 'games' },
  { name: 'tugowar', pattern: '/tugowar', module: '../games/tugowar.view.js', title: 'Antonym Tug-of-War', tier: 'preview', owner: 'games' },
  { name: 'vowelcatcher', pattern: '/vowelcatcher', module: '../games/vowelcatcher.view.js', title: 'Vowel Catcher', tier: 'preview', owner: 'games' },
  { name: 'pinball', pattern: '/pinball', module: '../games/pinball.view.js', title: 'The Hebrew Pinball Bouncer', tier: 'preview', owner: 'games' },
  { name: 'prefixblast', pattern: '/prefixblast', module: '../games/prefixblast.view.js', title: 'Bubble Pop Prefix Blast', tier: 'preview', owner: 'games' },
  { name: 'memorypalace', pattern: '/memorypalace', module: '../games/memorypalace.view.js', title: 'The Memory Palace Courtyard', tier: 'preview', owner: 'games' },
  { name: 'shabbatrush', pattern: '/shabbatrush', module: '../games/shabbatrush.view.js', tier: 'preview', title: 'Endless Runner: Shabbat Rush', owner: 'games' },
  { name: 'typewriter', pattern: '/typewriter', module: '../games/typewriter.view.js', tier: 'preview', title: 'Typewriter Conveyor Belt', owner: 'games' },
  { name: 'petclinic', pattern: '/petclinic', module: '../games/petclinic.view.js', tier: 'preview', title: 'Pet Clinic Helper', owner: 'games' },
  { name: 'trainswitch', pattern: '/trainswitch', module: '../games/trainswitch.view.js', tier: 'preview', title: 'Train Track Switchboard', owner: 'games' },
  { name: 'weatherstudio', pattern: '/weatherstudio', module: '../games/weatherstudio.view.js', tier: 'preview', title: 'Weather Presenter Studio', owner: 'games' },
  { name: 'rentalagent', pattern: '/rentalagent', module: '../games/rentalagent.view.js', tier: 'preview', title: 'Apartment Rental Agent', owner: 'games' },
  { name: 'echochamber', pattern: '/echochamber', module: '../games/echochamber.view.js', tier: 'preview', title: 'Acoustic Echo Chamber', owner: 'games' },
  { name: 'museumcurator', pattern: '/museumcurator', module: '../games/museumcurator.view.js', tier: 'preview', title: 'The Museum Curator', owner: 'games' },
  { name: 'karaokebeat', pattern: '/karaokebeat', module: '../games/karaokebeat.view.js', tier: 'preview', title: 'The Karaoke Beat Matcher', owner: 'games' },
  { name: 'archbuilder', pattern: '/archbuilder', module: '../games/archbuilder.view.js', tier: 'preview', title: 'Hebrew Arch-Builder', owner: 'games' },
  { name: 'lasermaze', pattern: '/lasermaze', module: '../games/lasermaze.view.js', tier: 'preview', title: 'Laser Mirror Laser Maze', owner: 'games' },
  { name: 'roottree', pattern: '/roottree', module: '../games/roottree.view.js', tier: 'preview', title: 'Hebrew Root Tree Cultivator', owner: 'games' },
  { name: 'letterbridge', pattern: '/letterbridge', module: '../games/letterbridge.view.js', tier: 'preview', title: 'Letter Bridge Builder', owner: 'games' },
  { name: 'shadowcraft', pattern: '/shadowcraft', module: '../games/shadowcraft.view.js', tier: 'preview', title: 'Shadow Craft', owner: 'games' },
  { name: 'ciphergrid', pattern: '/ciphergrid', module: '../games/ciphergrid.view.js', tier: 'preview', title: 'Cipher Decryption Grid', owner: 'games' },
  { name: 'shuktaxi', pattern: '/shuktaxi', module: '../games/shuktaxi.view.js', tier: 'preview', title: 'Shuk Taxi Driver', owner: 'games' },
  { name: 'barter', pattern: '/barter', module: '../games/barter.view.js', tier: 'preview', title: 'The Israeli Flea Market Barter', owner: 'games' },
  { name: 'submarinesonar', pattern: '/submarinesonar', module: '../games/submarinesonar.view.js', tier: 'preview', title: 'Submarine Sonar Vowels', owner: 'games' },
  { name: 'rhymelab', pattern: '/rhymelab', module: '../games/rhymelab.view.js', tier: 'preview', title: 'Hebrew Rhyme Laboratory', owner: 'games' },
  { name: 'bumperverbs', pattern: '/bumperverbs', module: '../games/bumperverbs.view.js', tier: 'preview', title: 'Bumper Car Verb Conjugations', owner: 'games' },
  { name: 'timedread', pattern: '/timedread', module: '../timedread/timedread.view.js', title: 'Timed read-aloud', owner: 'timedread', optional: true, quick: 'nav.timedread' },
  { name: 'share', pattern: '/share', module: '../teacher/teacher.view.js', title: 'Share my progress', owner: 'teacher', optional: true, quick: 'nav.share', query: { mode: 'share' } },
  { name: 'classsummary', pattern: '/classsummary', module: '../teacher/teacher.view.js', title: 'Class summary', owner: 'teacher', optional: true, quick: 'nav.classsummary', query: { mode: 'class' } },
  { name: 'service', pattern: '/service', module: '../service/service.view.js', title: 'Follow the service', owner: 'service', optional: true, quick: 'nav.service' },
  { name: 'firstday', pattern: '/firstday', module: '../firstday/firstday.view.js', tier: 'v0', title: 'Your first 10 minutes', owner: 'firstday', optional: true, group: 'learn', quick: 'nav.firstday' },
  { name: 'firstday-ladder', pattern: '/firstday/ladder', module: '../firstday/ladder.view.js', title: 'Pointed to unpointed ladder', owner: 'firstday', optional: true, group: 'learn', quick: 'nav.firstday-ladder' },
  { name: 'placement', pattern: '/placement', module: '../placement/placement.view.js', title: 'Placement check (draft)', owner: 'placement', optional: true, group: 'learn', quick: 'nav.placement' },
  { name: 'reminders', pattern: '/reminders', module: './notify.view.js', title: 'Study reminders', owner: 'notify', optional: true, group: 'learn', quick: 'nav.reminders' },
  { name: 'install', pattern: '/install', module: './install.view.js', tier: 'v0', title: 'Install ALEF', owner: 'install', optional: true, group: 'learn', quick: 'nav.install' },
  { name: 'typing', pattern: '/typing', module: '../typing/typing.view.js', title: 'Typing practice', owner: 'typing', optional: true, group: 'learn', quick: 'nav.typing' },
  { name: 'festivals', pattern: '/festivals', module: '../festivals/festivals.view.js', title: 'This week in the Jewish year', owner: 'festivals', optional: true, group: 'learn', quick: 'nav.festivals' },
  { name: 'festival', pattern: '/festivals/:id', module: '../festivals/festivals.view.js', title: 'Festival words', owner: 'festivals', optional: true, paramQuery: { id: 'id' } },
  { name: 'listen', pattern: '/listen', module: '../listen/listen.view.js', title: 'Listen and pick', owner: 'listen', optional: true, group: 'learn', quick: 'nav.listen' },
  { name: 'trope', pattern: '/trope', module: '../trope/trope.view.js', title: 'Trope trainer', owner: 'trope', optional: true, group: 'learn', quick: 'nav.trope' },
  { name: 'tradition-quiz', pattern: '/tradition-quiz', module: '../pronunciation/quiz.view.js', title: 'Which tradition is this?', owner: 'pronunciation', optional: true, group: 'learn', quick: 'nav.traditionquiz' },
  { name: 'read-my-way', pattern: '/read-my-way', module: '../pronunciation/convert.view.js', title: 'Read it my way', owner: 'pronunciation', optional: true, group: 'learn', quick: 'nav.readmyway' },
  { name: 'rules', pattern: '/rules', module: '../pronunciation/rules.view.js', title: 'Pronunciation rules', owner: 'pronunciation', optional: true, group: 'learn', quick: 'nav.rules' },
  { name: 'rules-page', pattern: '/rules/:rule', module: '../pronunciation/rules.view.js', title: 'Pronunciation rules', owner: 'pronunciation', optional: true, group: 'learn' },
  { name: 'intermediate',       pattern: '/intermediate',     module: '../curriculum/intermediate.view.js', title: 'Intermediate lessons', owner: 'intermediate', optional: true, group: 'learn', quick: 'nav.intermediate' },
  { name: 'intermediatelesson', pattern: '/intermediate/:id', module: '../curriculum/intermediate.view.js', title: 'Intermediate lesson',  owner: 'intermediate', optional: true, paramQuery: { id: 'id' } },
  { name: 'grammar', pattern: '/grammar', module: '../grammar/grammar.view.js', title: 'Grammar notes', owner: 'grammar', optional: true, group: 'learn', quick: 'nav.grammar' },
  { name: 'grammartopic', pattern: '/grammar/:topic', module: '../grammar/grammar.view.js', title: 'Grammar topic', owner: 'grammar', optional: true, paramQuery: { topic: 'topic' } },
  { name: 'credits', pattern: '/credits', module: './credits.view.js', tier: 'v0', title: 'Credits and licences', owner: 'legal', optional: true, group: 'learn', quick: 'nav.credits' },
  { name: 'privacy', pattern: '/privacy', module: './privacy.view.js', tier: 'v0', title: 'Privacy', owner: 'legal', optional: true, group: 'learn', quick: 'nav.privacy' },
  { name: 'compare', pattern: '/compare', module: '../pronunciation/compare.view.js', title: 'Compare pronunciations', owner: 'pronunciation', optional: true, group: 'learn', quick: 'nav.compare' },
  { name: 'offline', pattern: '/offline', module: './offline.view.js', tier: 'v0', title: 'Use ALEF offline', owner: 'offline', optional: true, group: 'learn', quick: 'nav.offline' },
  { name: 'vocab-themes', pattern: '/vocab/themes', module: '../vocab/themes.view.js', title: 'Theme packs', owner: 'vocab', optional: true, group: 'learn', quick: 'nav.vocab-themes' },
  { name: 'speak', pattern: '/speak', module: '../speak/speak.view.js', title: 'Say it', owner: 'speak', optional: true, group: 'learn', quick: 'nav.speak' },
  { name: 'sprint', pattern: '/sprint', module: '../sprint/sprint.view.js', title: 'Word Sprint', owner: 'sprint', optional: true, group: 'learn', quick: 'nav.sprint' },
  { name: 'gender',   pattern: '/gender',        module: '../curriculum/learn.view.js', title: 'Gender pairs',     owner: 'lane1', group: 'learn', quick: 'nav.gender',   query: { gender: 'pairs' }, needs: 'curriculum/gender.view.js' },
  { name: 'roles',    pattern: '/gender/roles',  module: '../curriculum/learn.view.js', title: 'Say it as me',     owner: 'lane1', group: 'learn', quick: 'nav.roles',    query: { gender: 'roles' }, needs: 'curriculum/gender.view.js' },
  { name: 'scaffold', pattern: '/scaffold',      module: '../curriculum/learn.view.js', title: 'Read without Latin', owner: 'lane1', group: 'learn', quick: 'nav.scaffold', query: { scaffold: '1' }, needs: 'curriculum/scaffold.view.js' },
  { name: 'sounds',   pattern: '/sounds',         module: '../pronunciation/sounds.view.js',     nav: 'nav.sounds',   title: 'Sounds', owner: 'lane3' },
  { name: 'read',     pattern: '/read',           module: '../corpus/read.view.js',              nav: 'nav.read',     title: 'Read', owner: 'lane5' },
  { name: 'text',     pattern: '/read/:textId',   module: '../corpus/read.view.js',              title: 'Read', owner: 'lane5' },
  { name: 'scan',     pattern: '/scan',           module: '../photo/scan.view.js',               nav: 'nav.scan',     title: 'Scan', owner: 'lane6' },
  { name: 'calendar', pattern: '/calendar',       module: '../curriculum/calendar.view.js',      nav: 'nav.calendar', title: 'Calendar', owner: 'lane1' },
  { name: 'settings', pattern: '/settings',       module: './settings.view.js', tier: 'v0',                  nav: 'nav.settings', title: 'Settings', owner: 'lane8' },
  { name: 'accessibility', pattern: '/accessibility', module: './a11y.view.js', tier: 'preview', title: 'Accessibility', owner: 'a11y', quick: 'nav.accessibility' },
  { name: 'welcome', pattern: '/welcome',        module: './onboarding.view.js', tier: 'v0',                title: 'Welcome', owner: 'lane8' },
  { name: 'how',      pattern: '/how',            module: './how.view.js',                       title: 'How this works', owner: 'lane8' },
  // Optional routes: other lanes add these view files over time. When the file is missing the route is hidden from nav/quick
  // links (see probeRoutes) and a direct visit shows the "not available yet" card; nothing else breaks.
  { name: 'workbook', pattern: '/workbook',        module: './workbook.view.js',                  nav: 'nav.workbook', title: 'Workbook', owner: 'lane8' },
  { name: 'soundgap', pattern: '/soundgap',       module: '../pronunciation/soundgap.view.js',   title: 'Sound gap', owner: 'lane3', optional: true, quick: 'nav.soundgap' },
  { name: 'vowelboard',   pattern: '/vowelboard',    module: '../pronunciation/vowelboard.view.js',    title: 'Vowel board', owner: 'lane3', optional: true, quick: 'nav.vowelboard' },
  { name: 'niqquddial',   pattern: '/niqquddial',    module: '../pronunciation/niqquddial.view.js',    title: 'Vowel-point dial', owner: 'lane3', optional: true, quick: 'nav.niqquddial' },
  { name: 'dottile',      pattern: '/dottile',       module: '../pronunciation/dottile.view.js',       title: 'Dot tiles', owner: 'lane3', optional: true, quick: 'nav.dottile' },
  { name: 'syllablechips',pattern: '/syllablechips', module: '../pronunciation/syllablechips.view.js', title: 'Syllable chips', owner: 'lane3', optional: true, quick: 'nav.syllablechips' },
  { name: 'torahread',    pattern: '/torahread',          module: '../torahread/torahread.view.js', title: 'Torah reading', owner: 'torahread', optional: true, quick: 'nav.torahread' },
  { name: 'torahreader', pattern: '/torahreader', module: '../torahreader/torahreader.view.js', title: 'Torah reader', owner: 'torahreader', optional: true, tier: 'preview', group: 'learn', quick: 'nav.torahreader' },
  { name: 'torahreadsec', pattern: '/torahread/:section', module: '../torahread/torahread.view.js', title: 'Torah reading', owner: 'torahread', optional: true },
  { name: 'vocab',    pattern: '/vocab',          module: '../vocab/vocab.view.js',              title: 'Vocabulary', owner: 'lane9', optional: true, quick: 'nav.vocab' },
  { name: 'nikkud-fade', pattern: '/nikkud-fade', module: '../nikkudfade/nikkudfade.view.js', tier: 'preview', title: 'Vowel marks, fading out', owner: 'builder', group: 'learn', quick: 'nav.route.nikkud-fade' },
  { name: 'roots', pattern: '/roots', module: '../roots/roots.view.js', tier: 'preview', title: 'Roots and verb families', owner: 'builder', group: 'learn', quick: 'nav.route.roots' },
  { name: 'gender-drill', pattern: '/gender-drill', module: '../genderdrill/genderdrill.view.js', tier: 'preview', title: 'Gender drill', owner: 'builder', group: 'learn', quick: 'nav.route.gender-drill' },
  { name: 'record-compare', pattern: '/record-compare', module: '../recordcompare/recordcompare.view.js', tier: 'preview', title: 'Record and compare', owner: 'builder', group: 'learn', quick: 'nav.route.record-compare' },
  { name: 'scheduler', pattern: '/scheduler', module: '../fsrs/scheduler.view.js', tier: 'preview', title: 'How reviews could be spaced', owner: 'builder2', group: 'learn', quick: 'nav.route.scheduler' },
  { name: 'known-words', pattern: '/known-words', module: '../knownwords/knownwords.view.js', tier: 'preview', title: 'Known-word checker', owner: 'builder2', group: 'learn', quick: 'nav.route.known-words' },
  { name: 'syllabus', pattern: '/syllabus', module: '../coursemap/syllabus.view.js', tier: 'preview', title: 'Syllabus and goals', owner: 'builder2', group: 'progress', quick: 'nav.route.syllabus' },
  { name: 'time-budget', pattern: '/time-budget', module: '../coursemap/timebudget.view.js', tier: 'preview', title: 'Time budget', owner: 'builder2', group: 'progress', quick: 'nav.route.time-budget' },
  { name: 'daily', pattern: '/daily', module: '../../preview/loops/daily.view.js', tier: 'preview', title: 'Daily goal and quests', owner: 'loops', group: 'progress', quick: 'nav.route.daily' },
  { name: 'search',   pattern: '/search',         module: './search.view.js', tier: 'v0',                    title: 'Search', owner: 'nav' },
  { name: 'about',    pattern: '/about',          module: './about.view.js', tier: 'v0',                     nav: 'nav.about',    title: 'About', owner: 'lane8' },
];

/**
 * Release tier (see docs/v0/SCOPE.md). 'v0' routes are the small first release: they are the only bottom-nav destinations
 * and the only menu entries outside the collapsed Preview group. Everything else defaults to 'preview': reachable, searchable
 * (labelled), and shown with a top banner saying it is unreviewed and may change. Promote a route by setting tier: 'v0' once the
 * exit criteria in SCOPE.md are met.
 */
for (const r of ROUTES) if (r.tier !== 'v0') r.tier = 'preview';
export const tierOf = (r) => (r && r.tier === 'v0' ? 'v0' : 'preview');
export const isPreview = (r) => tierOf(r) === 'preview';

/** Parse "#/letters/alef?x=1" -> {path, query}. @param {string} hash */
export function parseHash(hash) {
  let h = (hash || '').replace(/^#/, '');
  if (!h.startsWith('/')) h = '/' + h;
  const [rawPath, qs = ''] = h.split('?');
  let path = rawPath.replace(/\/{2,}/g, '/');
  if (path.length > 1) path = path.replace(/\/$/, '');
  /** @type {Record<string,string>} */
  const query = {};
  for (const [k, v] of new URLSearchParams(qs)) query[k] = v;
  return { path, query };
}

/** @param {string} hash @returns {{route:RouteDef|null, params:Record<string,string>, path:string, query:Record<string,string>}} */
export function matchRoute(hash) {
  const { path, query } = parseHash(hash);
  const segs = path.split('/').filter(Boolean);
  for (const route of ROUTES) {
    const ps = route.pattern.split('/').filter(Boolean);
    if (ps.length !== segs.length) continue;
    /** @type {Record<string,string>} */
    const params = {}; let ok = true;
    for (let i = 0; i < ps.length; i++) {
      if (ps[i].startsWith(':')) {
        let v = segs[i]; try { v = decodeURIComponent(v); } catch { ok = false; break; }
        if (!/^[\p{L}\p{N}_.-]{1,80}$/u.test(v)) { ok = false; break; }
        params[ps[i].slice(1)] = v;
      } else if (ps[i] !== segs[i]) { ok = false; break; }
    }
    if (ok) {
      const q = { ...query, ...(route.query || {}) };
      for (const [p, k] of Object.entries(route.paramQuery || {})) if (p in params) q[k] = params[p];
      return { route, params, path, query: q };
    }
  }
  return { route: null, params: {}, path, query };
}

/** @param {(m:ReturnType<typeof matchRoute>)=>void} onChange */
export function createRouter(onChange) {
  const handle = () => onChange(matchRoute(location.hash));
  return {
    start() { window.addEventListener('hashchange', handle); handle(); },
    stop() { window.removeEventListener('hashchange', handle); },
    /** @param {string} path e.g. "/letters/alef" */
    go(path) { const target = '#' + (path.startsWith('/') ? path : '/' + path); if (location.hash === target) handle(); else location.hash = target; },
  };
}

/** Lazily import a route's view module (paths in ROUTES are relative to this file). @param {RouteDef} route */
export function loadRouteModule(route) {
  if (!route.module) return Promise.reject(new Error('route has no module'));
  return import(route.module);
}

/**
 * Which routes have a view file in this build? `views.generated.js` (written by tools/build-precache.mjs from the files on disk)
 * lists every src/**\/*.view.js, so no network probe (and no 404 in the console) is needed. Non-optional routes always count.
 * @param {string[]} files view files relative to src/, e.g. "letters/atlas.view.js" @returns {Set<string>} usable route names
 */
export function availableRoutes(files) {
  const have = new Set(files);
  const norm = (m) => m.replace(/^\.\//, 'shell/').replace(/^\.\.\//, '');
  return new Set(ROUTES.filter((r) => (!r.optional || (r.module && have.has(norm(r.module)))) && (!r.needs || have.has(r.needs))).map((r) => r.name));
}
