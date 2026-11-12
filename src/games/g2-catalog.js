// Words by topic (g2-*): twenty vocabulary games for food, home, body, family, colours, animals, clothes, weather, school,
// work, places and getting around. id = route and file name (src/games/<id>.view.js); level = where it sits on the arcade's
// 1 to 5 ladder (these run from 2 to 4). Kept apart from ARCADE_GAMES so the arcade rotation is unchanged; the games hub
// shows them in one section and loads this file on demand. art: a scene brief for the game's backdrop
// (assets/games/arcade/<id>/env.png, not made yet; no text or letters in the picture). Hebrew titles are pointed words
// copied from the app's word lists (data/vocab/words.json, data/vocab/vocab5000.json) or this lane's data.
export const G2_GAMES = Object.freeze([
  // Beginner (level 2): one topic at a time, with English help
  { id: 'g2-sortrush', title: 'Sort Rush', titleHe: 'מָהִיר', level: 2, band: 'beginner', tag: 'Drop each word in its topic before the fuse burns out', art: 'a row of wooden crates on a market stall, each crate a different colour, a short fuse cord in front' },
  { id: 'g2-oddone', title: 'Odd One Out', titleHe: 'שׁוֹנֶה', level: 2, band: 'beginner', tag: 'Three belong together; tap the one that does not', art: 'four cups on a shelf, three blue and one a teapot, Noa pointing at the teapot' },
  { id: 'g2-popup', title: 'Pop-Up Pantry', titleHe: 'אֹכֶל', level: 2, band: 'beginner', tag: 'Words pop out of the cupboards: tap only the right topic', art: 'a pantry wall of little cupboard doors, some half open, Rimon peeking out of one' },
  { id: 'g2-familytree', title: 'Family Tree', titleHe: 'עֵץ', level: 2, band: 'beginner', tag: 'Hang each family word on its branch of the tree', art: 'a broad leafy tree with empty round frames hanging from its branches, a picnic blanket below' },
  { id: 'g2-bodymap', title: 'Body Map', titleHe: 'גּוּף', level: 2, band: 'beginner', tag: 'Read the word, touch the part of the body', art: 'a friendly wooden artist\'s mannequin standing on a table beside a hand mirror' },
  { id: 'g2-paintpots', title: 'Paint Pots', titleHe: 'צֶבַע', level: 2, band: 'beginner', tag: 'Name the colours, then mix two pots to make a third', art: 'an easel with a blank canvas, small open paint pots in a row, brushes in a jar' },
  // Intermediate (level 3): memory, order and speed
  { id: 'g2-lineup', title: 'Line Them Up', titleHe: 'שׁוּרָה', level: 3, band: 'intermediate', tag: 'Days, months, seasons and sizes: put them in order', art: 'a washing line in a garden with cards pegged along it, one gap waiting' },
  { id: 'g2-snap', title: 'Topic Snap', titleHe: 'יַחַד', level: 3, band: 'intermediate', tag: 'Two cards land: snap if they share a topic', art: 'two playing cards landing face up on a green card table, Ari\'s hand hovering' },
  { id: 'g2-chain', title: 'Meaning Chain', titleHe: 'שַׁרְשֶׁרֶת', level: 3, band: 'intermediate', tag: 'Link answers into a chain and bank it before it breaks', art: 'a long paper chain draped across a classroom window, a piggy bank on the sill' },
  { id: 'g2-dominoes', title: 'Opposite Dominoes', titleHe: 'הֶפֶךְ', level: 3, band: 'intermediate', tag: 'Play the tile whose half is the opposite of the open end', art: 'a winding line of dominoes on a café table, a glass of tea beside them' },
  { id: 'g2-endings', title: 'Ending Detective', titleHe: 'סוֹף', level: 3, band: 'intermediate', tag: 'Read the ending, guess he or she, catch the rule-breakers', art: 'a detective\'s desk with a magnifying glass resting on the last letter of a card' },
  { id: 'g2-street', title: 'Memory Street', titleHe: 'רְחוֹב', level: 3, band: 'intermediate', tag: 'A word in every house: remember who lives where', art: 'a short street of colourful terraced houses with numbered doors at dusk, windows lit' },
  { id: 'g2-whereami', title: 'Where Am I?', titleHe: 'אֵיפֹה', level: 3, band: 'intermediate', tag: 'A few things around you: name the place', art: 'a signpost at a crossroads with blank arrows pointing to a farm, a beach and a town' },
  { id: 'g2-clues', title: 'Clue After Clue', titleHe: 'רֶמֶז', level: 3, band: 'intermediate', tag: 'One clue at a time: guess early for more points', art: 'a corkboard with cards pinned up and red string between them, a torch shining on one' },
  { id: 'g2-dayafter', title: 'Day After Day', titleHe: 'מָחָר', level: 3, band: 'intermediate', tag: 'The day after, the month before: count round the calendar', art: 'a desk calendar with pages flipping in the breeze, a sunrise in the window behind' },
  // Upper intermediate (level 4): letters and links
  { id: 'g2-trail', title: 'Topic Trail', titleHe: 'דֶּרֶךְ', level: 4, band: 'upper', tag: 'Cross the grid stepping only on words of the topic', art: 'stepping stones across a shallow river, a few stones mossy, a far bank with a flag' },
  { id: 'g2-fourgroups', title: 'Four Groups of Four', titleHe: 'אַרְבָּעָה', level: 4, band: 'upper', tag: 'Sixteen words, four topics: find the groups', art: 'sixteen square tiles on a table, four of them gathered into a neat row' },
  { id: 'g2-hive', title: 'Spelling Hive', titleHe: 'דְּבוֹרָה', level: 4, band: 'upper', tag: 'Seven letters, one in the middle: spell every word you can', art: 'a honeycomb of seven hexagon cells glowing amber, a bee resting on the middle cell' },
  { id: 'g2-ladder', title: 'Word Ladder', titleHe: 'מַדְרֵגָה', level: 4, band: 'upper', tag: 'Change one letter at a time to climb from word to word', art: 'a tall wooden ladder leaning on a wall of bookshelves, each rung a different shade' },
  { id: 'g2-firstletter', title: 'Letter and Topic', titleHe: 'אוֹת', level: 4, band: 'upper', tag: 'An animal that starts with this letter: find the one word that fits both', art: 'a plain wooden toy block on a rug surrounded by toy animals, toy food and small toy furniture' },
]);
export const G2_IDS = Object.freeze(G2_GAMES.map((g) => g.id));
