// The three hold sets, decided in one place (M-06, 12 Nov site check). A clip path can be named by three different lists; each
// means something different, and only the first changes what plays:
//
//   clip-holds     data/lab/clip-holds.json "paths": recordings WITHHELD from playback until a person has listened. The file stays
//                  in the app; the player (src/audio/player.js setHeld) never plays it and falls to what would play without it
//                  (the device voice or the written sound), and says so (`held: true` on the plan).
//   plays-israeli  a manifest row whose status is "plays-israeli": a Sephardi or Ashkenazi row with no clip of its own that plays
//                  the Israeli clip of the same voice by the owner's rule (its `plays` field names that file). A FALLBACK, not a
//                  hold. When that Israeli file is itself in clip-holds, the row is withheld with it.
//   chirpHeld      a manifest row with "chirpHeld": true: a Chirp 3 HD re-take of this clip was made and HELD (no try passed the
//                  reviewers), so the CURRENT clip, which passed review as WaveNet, keeps its place and plays. Information, not a
//                  gate: the player reports it on the plan (`chirpHeld: true`) and never withholds on it.
//
// reconcileHoldSets() checks that no set contradicts another; tests/hold-sets.test.js and tools/deploy/check-assets.mjs run it.
// Pure: no file access.
export const PLAYS_ISRAELI = 'plays-israeli';
export const HOLD_SETS = Object.freeze({
  clipHolds: 'Withheld from playback: a person listens before any screen plays it (data/lab/clip-holds.json).',
  playsIsraeli: 'Fallback: a Sephardi or Ashkenazi row with no clip of its own plays the Israeli clip of the same voice (status "plays-israeli").',
  chirpHeld: 'A Chirp re-take was held; the current clip plays (manifest flag "chirpHeld": true).',
});
const ownFile = (e) => !!e && e.status !== 'missing' && e.status !== PLAYS_ISRAELI && typeof e.path === 'string' && !!e.path;

/**
 * @param {Array<any>} rows every catalogued manifest row (any of the audio lists)
 * @param {Iterable<string>} holdPaths the clip-holds paths
 * @returns {{counts: {clipHolds:number, chirpHeld:number, playsIsraeli:number, playsIsraeliTargetHeld:number, chirpHeldAndHeld:number}, problems: string[]}}
 */
export function reconcileHoldSets(rows, holdPaths) {
  const held = new Set(holdPaths || []);
  const byPath = new Map();
  for (const e of rows) if (e && e.path) byPath.set(e.path, e);
  const problems = [];
  let chirp = 0, pi = 0, piHeld = 0, both = 0;
  for (const p of held) {
    const e = byPath.get(p);
    if (!e) problems.push(`clip-holds names ${p}, which no audio list catalogues`);
    else if (!ownFile(e)) problems.push(`clip-holds names ${p}, whose row has no clip of its own (status ${e.status})`);
  }
  for (const e of rows) {
    if (!e) continue;
    if (e.chirpHeld) {
      chirp++;
      if (!ownFile(e)) problems.push(`${e.path}: chirpHeld on a row with no clip of its own (status ${e.status}); chirpHeld means the current clip plays`);
      if (held.has(e.path)) { both++; problems.push(`${e.path}: chirpHeld (the current clip plays) and in clip-holds (withheld) at once`); }
    }
    if (e.status === PLAYS_ISRAELI) {
      pi++;
      if (held.has(e.path)) problems.push(`${e.path}: a plays-israeli row has no file of its own to hold`);
      const t = e.plays ? byPath.get(e.plays) : null;
      if (!e.plays) problems.push(`${e.path}: plays-israeli with no plays target`);
      else if (!t) problems.push(`${e.path}: plays ${e.plays}, which no audio list catalogues`);
      else if (!ownFile(t) || t.tradition !== 'israeli' || t.voice !== e.voice) problems.push(`${e.path}: plays ${e.plays}, which is not a present Israeli clip of the same voice`);
      else if (held.has(e.plays)) piHeld++;
    }
  }
  return { counts: { clipHolds: held.size, chirpHeld: chirp, playsIsraeli: pi, playsIsraeliTargetHeld: piHeld, chirpHeldAndHeld: both }, problems };
}
