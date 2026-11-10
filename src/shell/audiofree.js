// @ts-check
// "I do not use audio" (settings key audioFree, default false). One place that says what that setting means, so every screen
// treats it the same way:
//   - Listen / Hear buttons are not drawn (a short written line takes their place where a button would have been the only cue).
//   - A question that can only be answered by hearing is replaced by a reading question about the same item, or skipped.
//   - A skipped listening or speaking item is never recorded as a miss, never lowers a score and never touches a streak.
//   - Sound is never the only way to learn something: every sound has its written description (see src/pronunciation/soundtext.js).
// Pure: no DOM, no store. Views pass their ctx.

/** True when the learner turned on "I do not use audio". @param {any} ctx */
export function isAudioFree(ctx) {
  try { return ctx?.settings?.get?.('audioFree') === true; } catch { return false; }
}

export const AUDIO_FREE_LABEL = 'I do not use audio';
export const AUDIO_FREE_HELP = 'Hides the Listen buttons and swaps questions that need hearing for reading questions. Skipping a listening or speaking item never counts against you. You can turn it off at any time.';

/** One honest line for a screen that left a listening or speaking part out. */
export const AUDIO_FREE_NOTE = 'Sound parts are left out because you chose "I do not use audio" in Settings. Nothing here counts against you.';

/** What a skip does, said the same way everywhere. */
export const SKIP_NOTE = 'Skipping is fine. A skipped item is not marked wrong, does not change your score and does not affect your streak.';

/** What the written sound descriptions are, said the same way everywhere. */
export const SOUND_TEXT_NOTE = 'Draft. These are written descriptions of how a sound is made, taken from ALEF\'s pronunciation notes. Nobody who speaks Hebrew has checked this wording, and words alone cannot replace hearing a sound.';

/**
 * Wording for a "say it / read it aloud" instruction. For a learner who does not use audio, "aloud" becomes "in the way you read".
 * @param {any} ctx @param {string} aloud text for everyone else @param {string} silent text when audioFree
 */
export function spoken(ctx, aloud, silent) { return isAudioFree(ctx) ? silent : aloud; }

/**
 * The letter-name stand-in for a syllable card when the sound cannot be used: "Bet with a patach vowel".
 * @param {string} letterName @param {string|null|undefined} vowel
 */
export function syllableByName(letterName, vowel) {
  return vowel ? `${letterName} with the "${vowel}" vowel` : `${letterName} (final form)`;
}

const PROMPT_SWAPS = [
  [/\bsay its sound\b/i, 'recall its sound'],
  [/\bSay this syllable aloud\b/i, 'Read this syllable and recall how it is said'],
  [/\bRead this word aloud\b/i, 'Read this word'],
  [/\bSay the whole line\b/i, 'Recall the whole line'],
  [/\bSay it aloud\b/i, 'Read it'],
];
/** Prompt wording for a learner who does not use audio: "say aloud" becomes "read" or "recall". Other text is left as it is. @param {string} text */
export function silentPrompt(text) {
  let t = String(text ?? '');
  for (const [re, to] of PROMPT_SWAPS) t = t.replace(re, to);
  return t;
}
