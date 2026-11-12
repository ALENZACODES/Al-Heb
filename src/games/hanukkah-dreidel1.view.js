// Dreidel, Beginner 1: a short real dreidel game against Rimon, Ari and Noa. Every spin names the letter, its sound,
// its word in נֵס גָּדוֹל הָיָה שָׁם and its rule, and counts the gelt on screen. Rules: src/games/hanukkah-dreidel.js.
import { mountDreidel } from './hanukkah-dreidel-ui.js';

export const STORE_KEY = 'games.hanukkah-dreidel1.v1';
export const mount = mountDreidel(1);
