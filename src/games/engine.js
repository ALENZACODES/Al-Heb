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
 * Speak a Hebrew line through the app audio player when it can, else no-op.
 * Uses the same clip-index contract as the letter views.
 */
export async function speak(ctx, hebrew, { tradition = 'israeli', voice = 'f' } = {}) {
  try {
    if (!ctx?.audio?.playClipFor) return false;
    const idxMod = await import('../audio/clip-index.js');
    const idx = await idxMod.loadClipIndex({ fetchFn: ctx.fetchFn });
    const line = idxMod.lineFor(idx, hebrew);
    if (!line) return false;
    const v = idxMod.chooseVariant(line, { tradition, voice });
    if (!v) return false;
    await ctx.audio.playClipFor(v.clipKey, { kind: 'line', hebrew });
    return true;
  } catch { return false; }
}

/** Standard end-of-game card: score, stars, best, play again, back to Learn. */
export function resultsCard(h, heSpan, session, { title, onAgain, homeHref = '#/learn' }) {
  const stars = session.stars();
  const rec = session.saveBest();
  return h('section', { class: 'card game-results', 'aria-labelledby': 'game-results-h' },
    h('h2', { id: 'game-results-h' }, title),
    h('p', { class: 'game-stars', 'aria-label': `${stars} of 3 stars` }, '★'.repeat(stars) + '☆'.repeat(3 - stars)),
    h('p', {}, `Score ${session.score} · ${session.correct} of ${session.rounds} right · best streak ${session.bestStreak}`),
    rec ? h('p', { class: 'muted' }, `Your best on this device: ${rec.best} (played ${rec.plays} time${rec.plays === 1 ? '' : 's'})`) : null,
    h('div', { class: 'row' },
      h('button', { type: 'button', class: 'btn', onclick: onAgain }, 'Play again'),
      h('a', { class: 'btn secondary', href: homeHref }, 'Back to Learn')));
}

// Use only the existing app player and recorded, correctly labelled files for
// listening-dependent game rounds. Browser TTS is not interchangeable with a clip.
// No new audio stack, no tradition substitution, and no sound on missing media.
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
