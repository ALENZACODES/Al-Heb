// @ts-check
// 120 names for the practice league's pretend players: first names used for anyone, plus an initial. No real people.
const FIRST = ['Noam', 'Ariel', 'Tal', 'Shai', 'Yuval', 'Eden', 'Lior', 'Sasha', 'Robin', 'Jordan', 'Avery', 'Rowan', 'Gal', 'Omer', 'Shachar', 'Maayan', 'Daniel', 'Chen', 'Sharon', 'Adi',
  'Amit', 'Yarden', 'Stav', 'Neta', 'Morgan', 'Casey', 'Riley', 'Quinn', 'Taylor', 'Jamie', 'Alex', 'Sam', 'Charlie', 'Skyler', 'Reese', 'Dana', 'Kai', 'Remy', 'Sage', 'Ellis'];
const INITIALS = ['K', 'S', 'B', 'R', 'M', 'L', 'G', 'P', 'T', 'F', 'H', 'D'];
/** @type {readonly string[]} 40 first names x 3 initials each = 120 distinct names. */
export const LEAGUE_NAMES = Object.freeze(FIRST.flatMap((f, i) => [0, 1, 2].map((k) => `${f} ${INITIALS[(i * 5 + k * 4) % INITIALS.length]}.`)));
