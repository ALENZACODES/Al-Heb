// @ts-check
// In-play artwork: painted pieces (SPR_*, transparent, with a blank panel where a game draws its letter or word) and
// playfield backgrounds (BGP_*). Files live in assets/img/play as WebP. Pictures never carry writing: Hebrew is always drawn live.
export const PLAY_ART_DIR = 'assets/img/play/';
/** Address of one piece or background, by its file name without the extension. */
export const playArt = (name) => `${PLAY_ART_DIR}${String(name).replace(/[^A-Za-z0-9_]/g, '')}.webp`;
