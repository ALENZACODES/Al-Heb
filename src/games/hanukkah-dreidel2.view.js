// Dreidel, Beginner 2: the learner reads each letter and picks its rule before the gelt moves. Longer game, and the
// Israeli dreidel (פ for פֹּה, "here") as an option. Rules: src/games/hanukkah-dreidel.js.
import { mountDreidel } from './hanukkah-dreidel-ui.js';

export const STORE_KEY = 'games.hanukkah-dreidel2.v1';
export const mount = mountDreidel(2);
