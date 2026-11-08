import { signalRimon } from '../shell/rimon-events.js';
// ALEF games engine — shared plumbing for the mini-game views.
// Zero-dependency ES module, written against the same ctx contract as the
// rest of the app: mount(root, ctx) with ctx = { settings, store, audio,
// route, t, hasRoute }. Everything defensive: a game must still play in
// pure text if the image resolver or the audio player is unavailable.
//
// Images: loadGameImages uses ctx.images when the shell already built it,
// otherwise src/img/index.js (which calls src/img/resolve.js). A missing
// resolver returns null and the game stays text-only.

/** Fisher-Yates shuffle, returns a new array. */
export function shuffled(arr, rnd = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Pick n distinct items at random. */
export function pick(arr, n, rnd = Math.random) {
  return shuffled(arr, rnd).slice(0, Math.max(0, Math.min(n, arr.length)));
}

/** Rope/pull math for tug-style games: position in [-1, 1], clamped. */
export function pull(pos, dir, step = 0.09) {
  return Math.max(-1, Math.min(1, pos + dir * step));
}

/**
 * A game session: score, streak, rounds, and a best-score store record.
 * storeKey e.g. 'games.tugowar.v1'. Pure logic — no DOM — so it is unit
 * testable in Node.
 */
export function createSession({ store = null, storeKey = '', par = 10 } = {}) {
  let score = 0, streak = 0, bestStreak = 0, rounds = 0, correct = 0;
  return {
    answer(ok) {
      signalRimon(ok ? 'correct' : 'wrong');
      rounds++;
      if (ok) { correct++; streak++; score += 10 + Math.min(streak - 1, 5) * 2; }
      else { streak = 0; score = Math.max(0, score - 3); }
      bestStreak = Math.max(bestStreak, streak);
      return { score, streak, rounds, correct };
    },
    get score() { return score; },
    get streak() { return streak; },
    get bestStreak() { return bestStreak; },
    get rounds() { return rounds; },
    get correct() { return correct; },
    /** stars: 0-3 against par correct answers. */
    stars() { return correct >= par ? 3 : correct >= Math.ceil(par * 0.7) ? 2 : correct >= Math.ceil(par * 0.4) ? 1 : 0; },
    saveBest() {
      if (!store || !storeKey) return null;
      const prev = store.get(storeKey) || {};
      const rec = { best: Math.max(prev.best || 0, score), plays: (prev.plays || 0) + 1, lastStars: this.stars() };
      store.set(storeKey, rec);
      return rec;
    },
  };
}

/**
 * Load the image resolver the same way the letter views do. Returns null
 * when unavailable so callers can fall back to text-only rendering.
 * @param {any} ctx
 */
export async function loadGameImages(ctx) {
  try {
    // The shell already builds this resolver in app.js and puts it on ctx.images.
    // A game opened without that (a test, or a failed boot) loads it the same way.
    if (ctx?.images && typeof ctx.images.resolve === 'function') return ctx.images;
    const m = await import('../img/index.js');
    const R = await m.loadImageResolver({
      fetchFn: ctx?.fetchFn || ctx?.fetch, settings: ctx?.settings,
      base: 'assets/img', indexUrl: 'data/img/index.json', approvalsUrl: 'data/images/approvals.json',
    });
    return R && typeof R.resolve === 'function' ? R : null;
  } catch { return null; }
}

/** Resolve one image or return null. kind/id per src/img/resolve.js. */
export function imgOf(R, kind, id, opts = {}) {
  try { return R ? R.resolve(kind, id, opts) : null; } catch { return null; }
}

/**
 * Environment backdrops for the game that the picture was made for.
 * A missing or unapproved id renders nothing. These are not word cues and not cast portraits.
 */
export const GAME_ENV = Object.freeze({
  arch: 'GAME_arch_builder_env',
  bumper: 'GAME_bumper_verbs_env',
  laser: 'GAME_laser_maze_env',
  palace: 'GAME_memory_palace_courtyard',
  shabbat: 'GAME_shabbat_rush_env',
  shadow: 'GAME_shadow_craft_env',
  taxi: 'GAME_shuk_taxi_env',
  sonar: 'GAME_submarine_sonar_env',
  typewriter: 'GAME_typewriter_env',
  vowels: 'GAME_vowel_catcher_env',
  karaoke: 'GAME_karaoke_listen',
  ciphergrid: 'GAME_ciphergrid_env',
  petclinic: 'GAME_petclinic_env',
  trainswitch: 'GAME_trainswitch_env',
  wordfinder: 'GAME_wordfinder_env',
  letterbridge: 'GAME_letterbridge_env',
  museumcurator: 'GAME_museumcurator_env',
  rentalagent: 'GAME_rentalagent_env',
  rhymelab: 'GAME_rhymelab_env',
  roottree: 'GAME_roottree_env',
  tugowar: 'GAME_tugowar_env',
  weatherstudio: 'GAME_weatherstudio_env',
  barter: 'GAME_barter_env',
  echochamber: 'GAME_echochamber_env',
  pinball: 'GAME_pinball_table',
  prefixblast: 'GAME_prefix_blast_stage',
});

/** replaceChildren drops nulls, so a missing picture does not become the text "null" or throw. */
export function placeBoard(board, ...nodes) {
  board.replaceChildren(...nodes.filter((n) => n != null));
}

/** A visible environment picture, or null when the resolver has nothing approved for this id.
 * The returned id must be the scene asked for: a backdrop is never a word cue's picture. */
export function envNode(h, R, id) {
  const image = imgOf(R, 'id', id);
  if (!image?.src || image.id !== id) return null;
  return h('img', {
    class: 'game-env', src: image.src, alt: image.alt, width: image.width, height: image.height, 'data-img-id': image.id,
  });
}

/**
 * The redraw owns the live status. A miss passes feedback and stays on the round.
 * A new round passes no feedback, so the loading line and the previous success are replaced.
 */
export function roundStatus(node, feedback, prompt) {
  if (node) node.textContent = feedback || prompt;
}

/**
 * Honest line when a game cannot play a recorded Hebrew clip.
 * Never invites the device to guess in another language.
 */
export function speechFallbackMessage(result) {
  const reason = result?.reason || result?.fileError || result?.error || 'no-clip';
  if (result?.source === 'file' && !result.fileError) return '';
  if (result?.source === 'tts-fallback') return "Played with this device's Hebrew voice, not a recording.";
  if (reason === 'no-hebrew-browser-voice' || reason === 'file-error') {
    return 'No Hebrew recording played. This device will not speak another language. The words stay on screen.';
  }
  if (reason === 'play-rejected' || reason === 'network' || reason === 'play-threw' || reason === 'no-audio-support') {
    return 'The recording could not be reached. Nothing was spoken in another language. The words stay on screen.';
  }
  return 'No recorded Hebrew clip for this line. The words stay on screen.';
}

/**
 * Recorded clip first, through ctx.audio.play(kind, id). There is no clip-index module.
 * A missing file, a 404, or a network error does not fall through to a non-Hebrew voice.
 * Without a real kind and id, the line stays text. The game keeps working either way.
 */
export async function speak(ctx, hebrew, opts = {}) {
  const report = (result) => {
    const message = speechFallbackMessage(result);
    if (message && typeof opts.onStatus === 'function') opts.onStatus(message);
    const spoken = result?.source === 'file' || result?.source === 'tts-fallback';
    return { ...(result || {}), spoken, message };
  };
  const audio = ctx?.audio;
  if (!audio || typeof audio.play !== 'function' || !opts.kind || !opts.id) {
    return report({ source: 'none', reason: 'no-clip' });
  }
  try {
    const result = await audio.play(opts.kind, opts.id, { text: typeof hebrew === 'string' ? hebrew : '' });
    return report(result || { source: 'none', reason: 'no-clip' });
  } catch {
    return report({ source: 'none', reason: 'network' });
  }
}

/** Standard end-of-game card: score, stars, best, play again, back to Learn. */
export function resultsCard(h, heSpan, session, { title, onAgain, homeHref = '#/learn' }) {
  const stars = session.stars();
  const rec = session.saveBest();
  signalRimon(stars ? 'correct' : 'wrong');
  return h('section', { class: 'card game-results', 'aria-labelledby': 'game-results-h' },
    h('h2', { id: 'game-results-h' }, title),
    h('p', { class: 'game-stars', 'aria-label': `${stars} of 3 stars` }, '★'.repeat(stars) + '☆'.repeat(3 - stars)),
    h('p', {}, `Score ${session.score} · ${session.correct} of ${session.rounds} right · best streak ${session.bestStreak}`),
    rec ? h('p', { class: 'muted' }, `Your best on this device: ${rec.best} (played ${rec.plays} time${rec.plays === 1 ? '' : 's'})`) : null,
    h('div', { class: 'row' },
      h('button', { type: 'button', class: 'btn', onclick: onAgain }, 'Play again'),
      h('a', { class: 'btn secondary', href: homeHref }, 'Back to Learn')));
}

// Listening rounds use one contract: kind `word`, the active voice (m or f; voices are not swapped),
// and the active tradition (Echo passes it explicitly). status.source must be `file`, which the player
// returns only when that exact slot's manifest status is not `missing`. A missing row, a missing file,
// another tradition, or the browser voice does not open the round. No new clips are generated here.
export async function playRecordedClip(ctx, kind, id, options = {}) {
  try {
    if (!ctx?.audio || typeof ctx.audio.status !== 'function' || typeof ctx.audio.play !== 'function') return false;
    const status = ctx.audio.status(kind, id, options);
    if (!status || status.source !== 'file') return false;
    const result = await ctx.audio.play(kind, id, options);
    return result?.source === 'file';
  } catch { return false; }
}
export function hasRecordedClip(ctx, kind, id, options = {}) {
  try { return ctx?.audio?.status?.(kind, id, options)?.source === 'file'; }
  catch { return false; }
}
