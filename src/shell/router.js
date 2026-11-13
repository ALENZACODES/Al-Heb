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
import { G4_ROUTES } from './g4-routes.js'; // lane 4 (g4)
import { PLATFORM_ROUTES } from './platform-routes.js'; // lane platform
import { GB_ROUTES } from './gb-routes.js';
import { WRITING_ROUTES } from './writing-routes.js'; // writing lane: journal, typed answers, rewriting
import { COURSE_ROUTES } from './course-routes.js'; // course lane: course map, checkpoints, mixed review, rules
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
  { name: 'songs', pattern: '/songs', module: '../listen/songs.view.js', title: 'Songs', owner: 'listen', optional: true, group: 'learn', quick: 'nav.route.songs' },
  { name: 'listen-shelf', pattern: '/listen/shelf', module: '../listen/shelf.view.js', title: 'Sacred Listen', owner: 'listen', optional: true, group: 'learn', quick: 'nav.route.listen-shelf' },
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
  { name: 'classtrack',         pattern: '/classtrack',               module: '../classtrack/classtrack.view.js', title: 'My Study Plan', owner: 'lane10', group: 'learn', quick: 'nav.classtrack' },
  { name: 'classtrackweek',     pattern: '/classtrack/:week',         module: '../classtrack/classtrack.view.js', title: 'My plan: week', owner: 'lane10', paramQuery: { week: 'week' } },
  { name: 'classtrackmode',     pattern: '/classtrack/:week/:mode',   module: '../classtrack/classtrack.view.js', title: 'My plan: handout', owner: 'lane10', paramQuery: { week: 'week', mode: 'mode' } },
  { name: 'morning', pattern: '/morning', module: '../morning/morning.view.js', title: 'Start your day with God', owner: 'morning', optional: true, quick: 'nav.morning' },
  { name: 'synagogues', pattern: '/synagogues', module: '../synagogues/synagogues.view.js', title: 'Reform Synagogues in Canada', owner: 'synagogues', optional: true, quick: 'nav.route.synagogues' },
  { name: 'synagogue', pattern: '/synagogues/:id', module: '../synagogues/synagogues.view.js', title: 'Synagogue', owner: 'synagogues', optional: true, paramQuery: { id: 'id' } },
  { name: 'books', pattern: '/books', module: '../books/books.view.js', title: 'Little books', owner: 'books', optional: true, tier: 'v0', quick: 'nav.books' },
  { name: 'book', pattern: '/book/:id', module: '../books/book.view.js', title: 'Read a book', owner: 'books', paramQuery: { id: 'book' } },
  { name: 'readhub', pattern: '/read-home', module: './read-hub.view.js', tier: 'v0', nav: 'nav.read', title: 'Read', owner: 'books' },
  { name: 'speakhub', pattern: '/speak-home', module: './speak-hub.view.js', tier: 'v0', nav: 'nav.speak', title: 'Speak', owner: 'speak' },
  { name: 'games', pattern: '/games', module: '../games/games.view.js', title: 'Games', tier: 'preview', owner: 'games', quick: 'nav.games' },
  { name: 'library', pattern: '/library', module: '../library/library.view.js', title: 'Library', tier: 'v0', owner: 'library', quick: 'nav.route.library' },
  { name: 'libraryarticle', pattern: '/library/:id', module: '../library/library.view.js', title: 'Library', tier: 'v0', owner: 'library', paramQuery: { id: 'article' } },
  { name: 'lab', pattern: '/lab', module: '../lab/lab.view.js', title: 'Brain Lab', tier: 'v0', owner: 'lab', quick: 'nav.route.lab' },
  { name: 'league', pattern: '/league', module: '../retention/league.view.js', title: 'League', owner: 'retention', quick: 'nav.route.league' },
  { name: 'shop', pattern: '/shop', module: '../retention/shop.view.js', title: 'Shop', owner: 'retention', quick: 'nav.route.shop' },
  { name: 'labgame', pattern: '/lab/:game', module: '../lab/lab.view.js', title: 'Brain Lab', tier: 'v0', owner: 'lab', paramQuery: { game: 'game' } },
  { name: 'letterchomp', pattern: '/letterchomp', module: '../games/letterchomp.view.js', title: 'Letter Chomp', tier: 'preview', owner: 'games' },
  { name: 'fallingletters', pattern: '/fallingletters', module: '../games/fallingletters.view.js', title: 'Falling Letters', tier: 'preview', owner: 'games' },
  { name: 'lettertwins', pattern: '/lettertwins', module: '../games/lettertwins.view.js', title: 'Letter Twins', tier: 'preview', owner: 'games' },
  { name: 'soundsnap', pattern: '/soundsnap', module: '../games/soundsnap.view.js', title: 'Sound Snap', tier: 'preview', owner: 'games' },
  { name: 'lookalikes', pattern: '/lookalikes', module: '../games/lookalikes.view.js', title: 'Look-Alike Sorter', tier: 'preview', owner: 'games' },
  { name: 'alefbetrun', pattern: '/alefbetrun', module: '../games/alefbetrun.view.js', title: 'Aleph-Bet Run', tier: 'preview', owner: 'games' },
  { name: 'finalfive', pattern: '/finalfive', module: '../games/finalfive.view.js', title: 'Final Five', tier: 'preview', owner: 'games' },
  { name: 'letterdrop', pattern: '/letterdrop', module: '../games/letterdrop.view.js', title: 'Letter Drop', tier: 'preview', owner: 'games' },
  { name: 'vowelstack', pattern: '/vowelstack', module: '../games/vowelstack.view.js', title: 'Vowel Stack', tier: 'preview', owner: 'games' },
  { name: 'syllablesnake', pattern: '/syllablesnake', module: '../games/syllablesnake.view.js', title: 'Syllable Snake', tier: 'preview', owner: 'games' },
  { name: 'wordbuilder', pattern: '/wordbuilder', module: '../games/wordbuilder.view.js', title: 'Word Builder', tier: 'preview', owner: 'games' },
  { name: 'meltdown', pattern: '/meltdown', module: '../games/meltdown.view.js', title: 'Meltdown', tier: 'preview', owner: 'games' },
  { name: 'flapvowel', pattern: '/flapvowel', module: '../games/flapvowel.view.js', title: 'Flap the Vowel', tier: 'preview', owner: 'games' },
  { name: 'bingoletters', pattern: '/bingoletters', module: '../games/bingoletters.view.js', title: 'Letter Bingo', tier: 'preview', owner: 'games' },
  { name: 'wordsearch', pattern: '/wordsearch', module: '../games/wordsearch.view.js', title: 'Word Search', tier: 'preview', owner: 'games' },
  { name: 'minicross', pattern: '/minicross', module: '../games/minicross.view.js', title: 'Mini Crossword', tier: 'preview', owner: 'games' },
  { name: 'wordmaze', pattern: '/wordmaze', module: '../games/wordmaze.view.js', title: 'Word Maze', tier: 'preview', owner: 'games' },
  { name: 'scramble', pattern: '/scramble', module: '../games/scramble.view.js', title: 'Scramble', tier: 'preview', owner: 'games' },
  { name: 'bubbleword', pattern: '/bubbleword', module: '../games/bubbleword.view.js', title: 'Bubble Word', tier: 'preview', owner: 'games' },
  { name: 'trueornot', pattern: '/trueornot', module: '../games/trueornot.view.js', title: 'True or Not', tier: 'preview', owner: 'games' },
  { name: 'lettercrush', pattern: '/lettercrush', module: '../games/lettercrush.view.js', title: 'Letter Crush', tier: 'preview', owner: 'games' },
  { name: 'lettersudoku', pattern: '/lettersudoku', module: '../games/lettersudoku.view.js', title: 'Letter Sudoku', tier: 'preview', owner: 'games' },
  { name: 'quizladder', pattern: '/quizladder', module: '../games/quizladder.view.js', title: 'Quiz Ladder', tier: 'preview', owner: 'games' },
  { name: 'speedtype', pattern: '/speedtype', module: '../games/speedtype.view.js', title: 'Speed Type', tier: 'preview', owner: 'games' },
  { name: 'gendersplit', pattern: '/gendersplit', module: '../games/gendersplit.view.js', title: 'Gender Split', tier: 'preview', owner: 'games' },
  { name: 'pluralpop', pattern: '/pluralpop', module: '../games/pluralpop.view.js', title: 'Plural Pop', tier: 'preview', owner: 'games' },
  { name: 'sentencetrain', pattern: '/sentencetrain', module: '../games/sentencetrain.view.js', title: 'Sentence Train', tier: 'preview', owner: 'games' },
  { name: 'noahseven', pattern: '/noahseven', module: '../games/noahseven.view.js', title: 'The Seven Laws', tier: 'preview', owner: 'games' },
  { name: 'tenwords', pattern: '/tenwords', module: '../games/tenwords.view.js', title: 'The Ten Words', tier: 'preview', owner: 'games' },
  { name: 'mitzvot613', pattern: '/mitzvot613', module: '../games/mitzvot613.view.js', title: '613 Sorter', tier: 'preview', owner: 'games' },
  // Hanukkah games (src/games/hanukkah-*.view.js; catalogue HANUKKAH_GAMES in src/games/arcade.catalog.js)
  { name: 'hanukkah-dreidel1', pattern: '/hanukkah-dreidel1', module: '../games/hanukkah-dreidel1.view.js', title: 'Dreidel, Beginner 1', tier: 'preview', owner: 'games' },
  { name: 'hanukkah-dreidel2', pattern: '/hanukkah-dreidel2', module: '../games/hanukkah-dreidel2.view.js', title: 'Dreidel, Beginner 2', tier: 'preview', owner: 'games' },
  { name: 'hanukkah-candles', pattern: '/hanukkah-candles', module: '../games/hanukkah-candles.view.js', title: 'Candle Blow-Out', tier: 'preview', owner: 'games' },
  { name: 'hanukkah-count', pattern: '/hanukkah-count', module: '../games/hanukkah-count.view.js', title: 'Count the Lights', tier: 'preview', owner: 'games' },
  { name: 'hanukkah-pairs', pattern: '/hanukkah-pairs', module: '../games/hanukkah-pairs.view.js', title: 'Candle Pairs', tier: 'preview', owner: 'games' },
  { name: 'hanukkah-colour', pattern: '/hanukkah-colour', module: '../games/hanukkah-colour.view.js', title: 'Colour by Letter', tier: 'preview', owner: 'games' },
  { name: 'hanukkah-gelthunt', pattern: '/hanukkah-gelthunt', module: '../games/hanukkah-gelthunt.view.js', title: 'Gelt Hunt', tier: 'preview', owner: 'games' },
  { name: 'hanukkah-slide', pattern: '/hanukkah-slide', module: '../games/hanukkah-slide.view.js', title: 'Sevivon Slide', tier: 'preview', owner: 'games' },
  { name: 'hanukkah-hiddenlights', pattern: '/hanukkah-hiddenlights', module: '../games/hanukkah-hiddenlights.view.js', title: 'Hidden Lights', tier: 'preview', owner: 'games' },
  { name: 'hanukkah-jumble', pattern: '/hanukkah-jumble', module: '../games/hanukkah-jumble.view.js', title: 'Jumbled Jars', tier: 'preview', owner: 'games' },
  { name: 'hanukkah-saveflame', pattern: '/hanukkah-saveflame', module: '../games/hanukkah-saveflame.view.js', title: 'Save the Flame', tier: 'preview', owner: 'games' },
  { name: 'hanukkah-charades', pattern: '/hanukkah-charades', module: '../games/hanukkah-charades.view.js', title: 'Hanukkah Charades', tier: 'preview', owner: 'games' },
  { name: 'hanukkah-forbidden', pattern: '/hanukkah-forbidden', module: '../games/hanukkah-forbidden.view.js', title: 'Forbidden Word', tier: 'preview', owner: 'games' },
  // Torah and Hebrew games (src/games/tg-catalog.js), beginner to advanced
  { name: 'tg-tilepairs', pattern: '/tg-tilepairs', module: '../games/tg-tilepairs.view.js', title: 'Tile Pairs', tier: 'preview', owner: 'games' },
  { name: 'tg-letterhunt', pattern: '/tg-letterhunt', module: '../games/tg-letterhunt.view.js', title: 'Verse Letter Hunt', tier: 'preview', owner: 'games' },
  { name: 'tg-numerals', pattern: '/tg-numerals', module: '../games/tg-numerals.view.js', title: 'Letter Numbers', tier: 'preview', owner: 'games' },
  { name: 'tg-wordguess', pattern: '/tg-wordguess', module: '../games/tg-wordguess.view.js', title: 'Six Tries', tier: 'preview', owner: 'games' },
  { name: 'tg-torahwords', pattern: '/tg-torahwords', module: '../games/tg-torahwords.view.js', title: 'Torah Top Thirty', tier: 'preview', owner: 'games' },
  { name: 'tg-family', pattern: '/tg-family', module: '../games/tg-family.view.js', title: 'Family Letters', tier: 'preview', owner: 'games' },
  { name: 'tg-verbslots', pattern: '/tg-verbslots', module: '../games/tg-verbslots.view.js', title: 'Verb Slots', tier: 'preview', owner: 'games' },
  { name: 'tg-storyorder', pattern: '/tg-storyorder', module: '../games/tg-storyorder.view.js', title: 'Story Order', tier: 'preview', owner: 'games' },
  { name: 'tg-whosaid', pattern: '/tg-whosaid', module: '../games/tg-whosaid.view.js', title: 'Who Said It?', tier: 'preview', owner: 'games' },
  { name: 'tg-parashah', pattern: '/tg-parashah', module: '../games/tg-parashah.view.js', title: 'Parashah Path', tier: 'preview', owner: 'games' },
  { name: 'tg-tropehunt', pattern: '/tg-tropehunt', module: '../games/tg-tropehunt.view.js', title: 'Trope Hunt', tier: 'preview', owner: 'games' },
  { name: 'tg-holidays', pattern: '/tg-holidays', module: '../games/tg-holidays.view.js', title: 'Holiday Sorter', tier: 'preview', owner: 'games' },
  // Lane g1 games (src/games/g1-catalog.js), id:Title
  ...('strokeorder:Stroke Order|reveal:Slow Reveal|script:Print and Script|duel:Look-Alike Duel|sounddash:Sound Dash|rhythm:Letter Rhythm|gaptrain:Gap Train|whereis:Start, Middle or End|finalswitch:Final Switch|sounddots:Dot or No Dot|vowelchain:Vowel Dominoes|soundpairs:Same Sound Pairs|blend:Blend It|nonsense:Nonsense Reader|dagesh:Dagesh Spotter|riverhop:River Hop|shva:Shva: Said or Silent|helpers:Silent Helpers|syllablecut:Syllable Cut|flashread:Flash Read')
    .split('|').map((x) => { const n = 'g1-' + x.slice(0, x.indexOf(':')); return { name: n, pattern: '/' + n, module: `../games/${n}.view.js`, title: x.slice(x.indexOf(':') + 1), tier: /** @type {'preview'} */ ('preview'), owner: 'games' }; }),
  // lane g2: words by topic (src/games/g2-catalog.js)
  ...[['sortrush', 'Sort Rush'], ['oddone', 'Odd One Out'], ['popup', 'Pop-Up Pantry'], ['familytree', 'Family Tree'], ['bodymap', 'Body Map'], ['paintpots', 'Paint Pots'], ['lineup', 'Line Them Up'], ['snap', 'Topic Snap'], ['chain', 'Meaning Chain'], ['dominoes', 'Opposite Dominoes'], ['endings', 'Ending Detective'], ['street', 'Memory Street'], ['whereami', 'Where Am I?'], ['clues', 'Clue After Clue'], ['dayafter', 'Day After Day'], ['trail', 'Topic Trail'], ['fourgroups', 'Four Groups of Four'], ['hive', 'Spelling Hive'], ['ladder', 'Word Ladder'], ['firstletter', 'Letter and Topic']]
    .map(([id, title]) => ({ name: 'g2-' + id, pattern: '/g2-' + id, module: `../games/g2-${id}.view.js`, title, tier: 'preview', owner: 'games' })),
  // lane g3: Grammar in Action
  ...'conveyor:Tense Conveyor|lostfound:Lost and Found|whack:Article Whack|onetwomany:One, Two, Many|questions:Question Radar|packcheck:Pack Check|clues:Pattern Clues|gate:Pattern Gate|grid:Ending Grid|arrows:Gift Arrows|agree:Agreement Match|negate:Not-Word Gap|swapfix:Swap Fix|mirror:Mirror Flip|shop:Counting Shop|chains:Chain Links|press:Pattern Press|sieve:Letter Sieve|repair:Repair Shop|decoder:Ending Decoder'
    .split('|').map((x) => { const [n, title] = x.split(':'), name = 'g3-' + n; return { name, pattern: '/' + name, module: `../games/${name}.view.js`, title, tier: 'preview', owner: 'games' }; }),
  ...G4_ROUTES.map(([id, title]) => ({ name: 'g4-' + id, pattern: '/g4-' + id, module: `../games/g4-${id}.view.js`, title, tier: 'preview', owner: 'games' })), // lane 4 (g4): Everyday Israel games
  // g5 (lane 5) games
  ...'simanim:Sweet Year Table|harvest:Seven Species|grogger:Grogger|fireworks:Independence Fireworks|table:Shabbat Table|greet:Holiday Greetings|shofar:Shofar Echo|kippur:Quiet Words|gifts:Mishloach Manot|plate:Seder Plate|questions:The Four Questions|omer:Count to Shavuot|sukkah:Sukkah Builder|species:Four Species|steps:Seder Steps|stars:Sundown to Stars|bless:Blessing Match|mend:Siddur Mend|readings:Holiday Readings|scroll:Roll the Scroll'.split('|').map((x) => { const [n, title] = x.split(':'); return { name: 'g5-' + n, pattern: '/g5-' + n, module: `../games/g5-${n}.view.js`, title, tier: 'preview', owner: 'games' }; }),
  { name: 'wordfinder', pattern: '/wordfinder', module: '../games/wordfinder.view.js', title: 'Hebrew Word Finder: Level 1', tier: 'preview', owner: 'games' },
  { name: 'tugowar', pattern: '/tugowar', module: '../games/tugowar.view.js', title: 'Antonym Tug-of-War', tier: 'preview', owner: 'games' },
  { name: 'vowelcatcher', pattern: '/vowelcatcher', module: '../games/vowelcatcher.view.js', title: 'Vowel Catcher', tier: 'preview', owner: 'games' },
  { name: 'pinball', pattern: '/pinball', module: '../games/pinball.view.js', title: 'Hebrew Pinball', tier: 'preview', owner: 'games' },
  { name: 'prefixblast', pattern: '/prefixblast', module: '../games/prefixblast.view.js', title: 'Prefix Blast', tier: 'preview', owner: 'games' },
  { name: 'memorypalace', pattern: '/memorypalace', module: '../games/memorypalace.view.js', title: 'Memory Palace', tier: 'preview', owner: 'games' },
  { name: 'shabbatrush', pattern: '/shabbatrush', module: '../games/shabbatrush.view.js', tier: 'preview', title: 'Shabbat Rush', owner: 'games' },
  { name: 'typewriter', pattern: '/typewriter', module: '../games/typewriter.view.js', tier: 'preview', title: 'Typewriter Belt', owner: 'games' },
  { name: 'petclinic', pattern: '/petclinic', module: '../games/petclinic.view.js', tier: 'preview', title: 'Pet Clinic Helper', owner: 'games' },
  { name: 'trainswitch', pattern: '/trainswitch', module: '../games/trainswitch.view.js', tier: 'preview', title: 'Train Track Switchboard', owner: 'games' },
  { name: 'weatherstudio', pattern: '/weatherstudio', module: '../games/weatherstudio.view.js', tier: 'preview', title: 'Weather Presenter Studio', owner: 'games' },
  { name: 'rentalagent', pattern: '/rentalagent', module: '../games/rentalagent.view.js', tier: 'preview', title: 'Apartment Rental Agent', owner: 'games' },
  { name: 'echochamber', pattern: '/echochamber', module: '../games/echochamber.view.js', tier: 'preview', title: 'Acoustic Echo Chamber', owner: 'games' },
  { name: 'museumcurator', pattern: '/museumcurator', module: '../games/museumcurator.view.js', tier: 'preview', title: 'The Museum Curator', owner: 'games' },
  { name: 'karaokebeat', pattern: '/karaokebeat', module: '../games/karaokebeat.view.js', tier: 'preview', title: 'Karaoke Beat', owner: 'games' },
  { name: 'archbuilder', pattern: '/archbuilder', module: '../games/archbuilder.view.js', tier: 'preview', title: 'Hebrew Arch-Builder', owner: 'games' },
  { name: 'lasermaze', pattern: '/lasermaze', module: '../games/lasermaze.view.js', tier: 'preview', title: 'Laser Mirror Maze', owner: 'games' },
  { name: 'roottree', pattern: '/roottree', module: '../games/roottree.view.js', tier: 'preview', title: 'Root Tree', owner: 'games' },
  { name: 'letterbridge', pattern: '/letterbridge', module: '../games/letterbridge.view.js', tier: 'preview', title: 'Letter Bridge Builder', owner: 'games' },
  { name: 'shadowcraft', pattern: '/shadowcraft', module: '../games/shadowcraft.view.js', tier: 'preview', title: 'Shadow Craft', owner: 'games' },
  { name: 'ciphergrid', pattern: '/ciphergrid', module: '../games/ciphergrid.view.js', tier: 'preview', title: 'Cipher Grid', owner: 'games' },
  { name: 'shuktaxi', pattern: '/shuktaxi', module: '../games/shuktaxi.view.js', tier: 'preview', title: 'Shuk Taxi Driver', owner: 'games' },
  { name: 'barter', pattern: '/barter', module: '../games/barter.view.js', tier: 'preview', title: 'Shuk Barter', owner: 'games' },
  { name: 'submarinesonar', pattern: '/submarinesonar', module: '../games/submarinesonar.view.js', tier: 'preview', title: 'Sonar Vowels', owner: 'games' },
  { name: 'rhymelab', pattern: '/rhymelab', module: '../games/rhymelab.view.js', tier: 'preview', title: 'Rhyme Lab', owner: 'games' },
  { name: 'bumperverbs', pattern: '/bumperverbs', module: '../games/bumperverbs.view.js', tier: 'preview', title: 'Verb Bumper Cars', owner: 'games' },
  { name: 'bumpercar', pattern: '/bumpercar', module: '../games/bumperverbs.view.js', tier: 'preview', title: 'Verb Bumper Cars', owner: 'games' },
  { name: 'traintrack', pattern: '/traintrack', module: '../games/trainswitch.view.js', tier: 'preview', title: 'Train Track Switchboard', owner: 'games' },
  { name: 'weatherpresenter', pattern: '/weatherpresenter', module: '../games/weatherstudio.view.js', tier: 'preview', title: 'Weather Presenter Studio', owner: 'games' },
  { name: 'karaoke', pattern: '/karaoke', module: '../games/karaokebeat.view.js', tier: 'preview', title: 'Karaoke Beat', owner: 'games' },
  { name: 'cipher', pattern: '/cipher', module: '../games/ciphergrid.view.js', tier: 'preview', title: 'Cipher Grid', owner: 'games' },
  { name: 'fleamarket', pattern: '/fleamarket', module: '../games/barter.view.js', tier: 'preview', title: 'Shuk Barter', owner: 'games' },
  { name: 'timedread', pattern: '/timedread', module: '../timedread/timedread.view.js', title: 'Timed read-aloud', owner: 'timedread', optional: true, quick: 'nav.timedread' },
  { name: 'share', pattern: '/share', module: '../teacher/teacher.view.js', title: 'Share my progress', owner: 'teacher', optional: true, quick: 'nav.share', query: { mode: 'share' } },
  { name: 'classsummary', pattern: '/classsummary', module: '../teacher/teacher.view.js', title: 'Class summary', owner: 'teacher', optional: true, quick: 'nav.classsummary', query: { mode: 'class' } },
  { name: 'service', pattern: '/service', module: '../service/service.view.js', title: 'Follow the service', owner: 'service', optional: true, quick: 'nav.service' },
  // lane 5 (12 Nov, plan #10): Shabbat Companion, a lazy route (its code and data are on demand)
  { name: 'shabbat', pattern: '/shabbat', module: '../service/shabbat.view.js', title: 'Shabbat Companion', owner: 'service', optional: true, quick: 'nav.route.shabbat' },
  // siddur-speaking lane (CODER-100 F3-F9): Prayer Practice, a lazy route (src/service/ is on demand)
  { name: 'prayer-practice', pattern: '/prayer-practice', module: '../service/practice.view.js', title: 'Prayer Practice', owner: 'service', optional: true, quick: 'nav.route.prayer-practice' },
  { name: 'firstday', pattern: '/firstday', module: '../firstday/firstday.view.js', tier: 'v0', title: 'Your first 10 minutes', owner: 'firstday', optional: true, group: 'learn', quick: 'nav.firstday' },
  { name: 'firstday-ladder', pattern: '/firstday/ladder', module: '../firstday/ladder.view.js', title: 'Pointed to unpointed ladder', owner: 'firstday', optional: true, group: 'learn', quick: 'nav.firstday-ladder' },
  { name: 'firstwin', pattern: '/firstwin', module: '../firstday/minuteone.view.js', title: 'Build your first Hebrew word', owner: 'firstday', optional: true, group: 'learn' },
  { name: 'placement', pattern: '/placement', module: '../placement/placement.view.js', title: 'Placement Check', owner: 'placement', optional: true, group: 'learn', quick: 'nav.placement' },
  { name: 'reminders', pattern: '/reminders', module: './notify.view.js', title: 'Study reminders', owner: 'notify', optional: true, group: 'learn', quick: 'nav.reminders' },
  { name: 'install', pattern: '/install', module: './install.view.js', tier: 'v0', title: 'Install Aleph', owner: 'install', optional: true, group: 'learn', quick: 'nav.install' },
  { name: 'typing', pattern: '/typing', module: '../typing/typing.view.js', title: 'Typing practice', owner: 'typing', optional: true, group: 'learn', quick: 'nav.typing' },
  { name: 'festivals', pattern: '/festivals', module: '../festivals/festivals.view.js', tier: 'v0', title: 'This week in the Jewish year', owner: 'festivals', optional: true, group: 'learn', quick: 'nav.festivals' },
  { name: 'festival', pattern: '/festivals/:id', module: '../festivals/festivals.view.js', tier: 'v0', title: 'Festival words', owner: 'festivals', optional: true, paramQuery: { id: 'id' } },
  { name: 'listen', pattern: '/listen', module: '../listen/listen.view.js', title: 'Listen and pick', owner: 'listen', optional: true, group: 'learn', quick: 'nav.listen' },
  { name: 'listen-practice', pattern: '/listen-practice', module: '../audiolab/practice.view.js', title: 'Listening Practice', owner: 'audio', optional: true, group: 'learn', quick: 'nav.route.listen-practice' },
  { name: 'trope', pattern: '/trope', module: '../trope/trope.view.js', title: 'Trope trainer', owner: 'trope', optional: true, group: 'learn', quick: 'nav.trope' },
  { name: 'tradition-quiz', pattern: '/tradition-quiz', module: '../pronunciation/quiz.view.js', title: 'Which tradition is this?', owner: 'pronunciation', optional: true, group: 'learn', quick: 'nav.traditionquiz' },
  { name: 'read-my-way', pattern: '/read-my-way', module: '../pronunciation/convert.view.js', title: 'Read it my way', owner: 'pronunciation', optional: true, group: 'learn', quick: 'nav.readmyway' },
  { name: 'rules', pattern: '/rules', module: '../pronunciation/rules.view.js', title: 'Pronunciation rules', owner: 'pronunciation', optional: true, group: 'learn', quick: 'nav.rules' },
  { name: 'rules-page', pattern: '/rules/:rule', module: '../pronunciation/rules.view.js', title: 'Pronunciation rules', owner: 'pronunciation', optional: true, group: 'learn' },
  { name: 'intermediate',       pattern: '/intermediate',     module: '../curriculum/intermediate.view.js', title: 'Intermediate lessons', owner: 'intermediate', optional: true, group: 'learn', quick: 'nav.intermediate' },
  { name: 'intermediatelesson', pattern: '/intermediate/:id', module: '../curriculum/intermediate.view.js', title: 'Intermediate lesson',  owner: 'intermediate', optional: true, paramQuery: { id: 'id' } },
  // Curriculum: every lesson and every Practical page in one order to follow (data/curriculum/path.json, built by tools/curriculum/build_path.mjs).
  { name: 'curriculum',    pattern: '/curriculum',    module: '../curriculum/path.view.js',      title: 'Curriculum',     owner: 'curriculum', optional: true, tier: 'v0', group: 'learn', quick: 'nav.curriculum' },
  { name: 'practical',     pattern: '/practical',     module: '../curriculum/practical.view.js', title: 'Practical',      owner: 'curriculum', optional: true, tier: 'v0', group: 'learn', quick: 'nav.practical' },
  { name: 'practicalunit', pattern: '/practical/:id', module: '../curriculum/practical.view.js', title: 'Practical unit', owner: 'curriculum', optional: true, paramQuery: { id: 'id' } },
  { name: 'practicalpage', pattern: '/practical/:id/:page', module: '../curriculum/practical.view.js', title: 'Practical page', owner: 'curriculum', optional: true, paramQuery: { id: 'id', page: 'page' } },
  { name: 'israelunits',        pattern: '/israel-units',     module: '../curriculum/israel-units.view.js', title: 'Hebrew for Israel, unit by unit', owner: 'intermediate', optional: true, group: 'learn', quick: 'nav.israelunits', tier: 'preview' },
  { name: 'israelunit',         pattern: '/israel-units/:id', module: '../curriculum/israel-units.view.js', title: 'Israel unit', owner: 'intermediate', optional: true, tier: 'preview', paramQuery: { id: 'id' } },
  { name: 'grammar', pattern: '/grammar', module: '../grammar/grammar.view.js', title: 'Grammar notes', owner: 'grammar', optional: true, group: 'learn', quick: 'nav.grammar' },
  { name: 'grammartopic', pattern: '/grammar/:topic', module: '../grammar/grammar.view.js', title: 'Grammar topic', owner: 'grammar', optional: true, paramQuery: { topic: 'topic' } },
  { name: 'credits', pattern: '/credits', module: './credits.view.js', tier: 'v0', title: 'Credits and licences', owner: 'legal', optional: true, group: 'learn', quick: 'nav.credits' },
  { name: 'privacy', pattern: '/privacy', module: './privacy.view.js', tier: 'v0', title: 'Privacy', owner: 'legal', optional: true, group: 'learn', quick: 'nav.privacy' },
  { name: 'terms', pattern: '/terms', module: './terms.view.js', tier: 'v0', title: 'Terms and rights', owner: 'legal', optional: true, group: 'learn', quick: 'nav.terms' },
  { name: 'compare', pattern: '/compare', module: '../pronunciation/compare.view.js', title: 'Compare pronunciations', owner: 'pronunciation', optional: true, group: 'learn', quick: 'nav.compare' },
  // lane 4: move progress between own devices (merge, no server); own certificate
  { name: 'move', pattern: '/move', module: '../sync/move.view.js', title: 'Move to another device', owner: 'sync', optional: true },
  { name: 'certificate', pattern: '/certificate', module: '../sync/certificate.view.js', title: 'Certificate of lessons completed', owner: 'sync', optional: true },
  { name: 'offline', pattern: '/offline', module: './offline.view.js', tier: 'v0', title: 'Use Aleph offline', owner: 'offline', optional: true, group: 'learn', quick: 'nav.offline' },
  { name: 'vocab-themes', pattern: '/vocab/themes', module: '../vocab/themes.view.js', title: 'Theme packs', owner: 'vocab', optional: true, group: 'learn', quick: 'nav.vocab-themes' },
  { name: 'talk', pattern: '/talk', module: '../talk/talk.view.js', title: 'Talk', owner: 'talk', optional: true, quick: 'nav.talk' },
  { name: 'speak', pattern: '/speak', module: '../speak/speak.view.js', title: 'Say it', owner: 'speak', optional: true, group: 'learn', quick: 'nav.speak' },
  // siddur-speaking lane (CODER-100 G1-G10): Speaking Studio, a lazy route (src/voice/ is on demand)
  { name: 'speak-studio', pattern: '/speak-studio', module: '../voice/voice.view.js', title: 'Speaking Studio', owner: 'speak', optional: true, quick: 'nav.route.speak-studio' },
  { name: 'sprint', pattern: '/sprint', module: '../sprint/sprint.view.js', title: 'Word Sprint', owner: 'sprint', optional: true, group: 'learn', quick: 'nav.sprint' },
  { name: 'gender',   pattern: '/gender',        module: '../curriculum/learn.view.js', title: 'Gender pairs',     owner: 'lane1', group: 'learn', quick: 'nav.gender',   query: { gender: 'pairs' }, needs: 'curriculum/gender.view.js' },
  { name: 'roles',    pattern: '/gender/roles',  module: '../curriculum/learn.view.js', title: 'Say it as me',     owner: 'lane1', group: 'learn', quick: 'nav.roles',    query: { gender: 'roles' }, needs: 'curriculum/gender.view.js' },
  { name: 'scaffold', pattern: '/scaffold',      module: '../curriculum/learn.view.js', title: 'Read without Latin', owner: 'lane1', group: 'learn', quick: 'nav.scaffold', query: { scaffold: '1' }, needs: 'curriculum/scaffold.view.js' },
  { name: 'sounds',   pattern: '/sounds',         module: '../pronunciation/sounds.view.js',     nav: 'nav.sounds',   title: 'Sounds', owner: 'lane3' },
  { name: 'read',     pattern: '/read',           module: '../corpus/read.view.js',              nav: 'nav.read',     title: 'Read', owner: 'lane5' },
  { name: 'text',     pattern: '/read/:textId',   module: '../corpus/read.view.js',              title: 'Read', owner: 'lane5' },
  { name: 'scan',     pattern: '/scan',           module: '../photo/scan.view.js',               nav: 'nav.scan',     title: 'Scan', owner: 'lane6' },
  { name: 'camera',   pattern: '/camera',         module: '../camera/camera.view.js',            title: 'Camera Translator', owner: 'camera', optional: true, group: 'learn', quick: 'nav.route.camera' },
  { name: 'calendar', pattern: '/calendar',       module: '../curriculum/calendar.view.js',      tier: 'v0', nav: 'nav.calendar', title: 'Calendar', owner: 'lane1' },
  { name: 'day',      pattern: '/day/:date',      module: '../curriculum/day.view.js',           tier: 'preview', title: 'Day', owner: 'items' },
  { name: 'settings', pattern: '/settings',       module: './settings.view.js', tier: 'v0',                  nav: 'nav.settings', title: 'Settings', owner: 'lane8' },
  { name: 'accessibility', pattern: '/accessibility', module: './a11y.view.js', tier: 'preview', title: 'Accessibility', owner: 'a11y', quick: 'nav.accessibility' },
  { name: 'welcome', pattern: '/welcome',        module: './onboarding.view.js', tier: 'v0',                title: 'Welcome', owner: 'lane8' },
  { name: 'how',      pattern: '/how',            module: './how.view.js',                       title: 'How this works', owner: 'lane8' },
  { name: 'help',     pattern: '/help',           module: './help.view.js',        tier: 'v0', nav: 'nav.help',     title: 'Help', owner: 'lane8' },
  // Optional routes: other lanes add these view files over time. When the file is missing the route is hidden from nav/quick
  // links (see probeRoutes) and a direct visit shows the "not available yet" card; nothing else breaks.
  { name: 'workbook', pattern: '/workbook',        module: './workbook.view.js',                  nav: 'nav.workbook', title: 'Workbook', owner: 'lane8' },
  { name: 'light', pattern: '/light', module: '../light/light.view.js', title: 'Star of David light', owner: 'light', optional: true, quick: 'nav.light' },
  { name: 'soundgap', pattern: '/soundgap',       module: '../pronunciation/soundgap.view.js',   title: 'Sound gap', owner: 'lane3', optional: true, quick: 'nav.soundgap' },
  { name: 'vowelboard',   pattern: '/vowelboard',    module: '../pronunciation/vowelboard.view.js',    title: 'Vowel board', owner: 'lane3', optional: true, quick: 'nav.vowelboard' },
  { name: 'niqquddial',   pattern: '/niqquddial',    module: '../pronunciation/niqquddial.view.js',    title: 'Vowel-point dial', owner: 'lane3', optional: true, quick: 'nav.niqquddial' },
  { name: 'dottile',      pattern: '/dottile',       module: '../pronunciation/dottile.view.js',       title: 'Dot tiles', owner: 'lane3', optional: true, quick: 'nav.dottile' },
  { name: 'syllablechips',pattern: '/syllablechips', module: '../pronunciation/syllablechips.view.js', title: 'Syllable chips', owner: 'lane3', optional: true, quick: 'nav.syllablechips' },
  { name: 'torahread',    pattern: '/torahread',          module: '../torahread/torahread.view.js', title: 'Torah reading', owner: 'torahread', optional: true, quick: 'nav.torahread' },
  { name: 'torahreader', pattern: '/torahreader', module: '../torahreader/torahreader.view.js', title: 'Torah reader', owner: 'torahreader', optional: true, group: 'learn', quick: 'nav.torahreader' },
  { name: 'ask', pattern: '/ask', module: '../ask/ask.view.js', title: 'Ask the Torah', owner: 'ask-torah', optional: true, group: 'learn', quick: 'nav.ask' },
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
  // lane 6 (12 Nov round 2): unvocalized bridge (#16) and trope families / per-aliyah practice (#13); views load on first open
  { name: 'bridge', pattern: '/bridge', module: '../bridge/bridge.view.js', title: 'Reading Without Vowels', owner: 'lane6', group: 'learn', quick: 'nav.route.bridge' },
  { name: 'bridge-sec', pattern: '/bridge/:sec', module: '../bridge/bridge.view.js', title: 'Reading Without Vowels', owner: 'lane6', paramQuery: { sec: 'sec' } },
  { name: 'bridge-text', pattern: '/bridge/:sec/:id', module: '../bridge/bridge.view.js', title: 'Reading Without Vowels', owner: 'lane6', paramQuery: { sec: 'sec', id: 'id' } },
  // reading lane (12 Nov): Reading Tools hub and its five tools (src/readlab, loaded on first open)
  { name: 'readlab', pattern: '/readlab', module: '../readlab/readlab.view.js', title: 'Reading Tools', owner: 'reading', group: 'learn', quick: 'nav.route.readlab' },
  { name: 'readlab-tool', pattern: '/readlab/:tool', module: '../readlab/readlab.view.js', title: 'Reading Tools', owner: 'reading', paramQuery: { tool: 'tool' } },
  { name: 'trope-families', pattern: '/trope/families', module: '../trope/practice.view.js', title: 'Trope Families', owner: 'lane6', group: 'learn', quick: 'nav.route.trope-families' },
  { name: 'trope-family', pattern: '/trope/families/:id', module: '../trope/practice.view.js', title: 'Trope Families', owner: 'lane6', paramQuery: { id: 'id' } },
  ...COURSE_ROUTES,
  { name: 'trope-aliyah', pattern: '/trope/aliyah', module: '../trope/practice.view.js', title: 'Trope Practice by Aliyah', owner: 'lane6', group: 'learn', quick: 'nav.route.trope-aliyah', query: { sec: 'aliyah' } },
  ...PLATFORM_ROUTES, // lane platform (12 Nov): What's New, My Data, Mastery Map, Cram, My Week, Keyboard Shortcuts
  ...GB_ROUTES, // lane games-books
  ...WRITING_ROUTES, // writing lane (12 Nov): Writing
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
export function canonicalPath(path) {
  if (path === '/brainlab' || path.startsWith('/brainlab/')) return '/lab' + path.slice('/brainlab'.length);
  return path;
}

export function matchRoute(hash) {
  const parsed = parseHash(hash);
  const path = canonicalPath(parsed.path);
  const query = parsed.query;
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

/**
 * M-09 navigation contract: on every route change the old view is fully unmounted before the new one renders. After the
 * old view's own cleanup has run, whatever it left in the page root (stale headings, banners, text) is removed here, except
 * the nodes in `keep` (the first-paint title the next view reuses). Returns the number of nodes removed.
 * @param {{childNodes:ArrayLike<any>, removeChild?:(n:any)=>any}} root @param {Iterable<any>} [keep]
 */
export function clearView(root, keep = []) {
  if (!root) return 0;
  const kept = new Set([...keep].filter(Boolean));
  let n = 0;
  for (const node of [...(root.childNodes || root.children || [])]) {
    if (kept.has(node)) continue;
    if (typeof node.remove === 'function') node.remove(); else root.removeChild?.(node);
    n++;
  }
  return n;
}

/**
 * Announce the new page's title in the live region, then empty it shortly after, so the title of a page the learner has
 * left never stays in the page text (M-09: "Word Search - Aleph" read at the end of the Scramble page). Call with an
 * empty text at the start of a navigation to drop the previous announcement at once.
 * @param {{textContent:string}|null} live @param {string} text @param {{win?:any, ms?:number}} [o]
 */
export function announceTitle(live, text, { win = globalThis, ms = 2000 } = {}) {
  if (!live) return;
  const t = /** @type {any} */ (live);
  try { if (t.__alefClear) win.clearTimeout?.(t.__alefClear); } catch { /* ignore */ }
  t.__alefClear = 0;
  live.textContent = text || '';
  if (text) t.__alefClear = win.setTimeout?.(() => { t.__alefClear = 0; if (live.textContent === text) live.textContent = ''; }, ms) || 0;
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
