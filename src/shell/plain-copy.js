// Plain-language copy for the most-used screens: short sentences, common words, about a grade 6 reading level.
// Each entry has the same id as an entry in tests/fixtures/plain-language-before.json (the wording it replaced), so
// tools/a11y/readability.mjs can measure the same strings before and after. {n} and {word} are filled in by plain().
// The numbers are a rough estimate from a word-counting script (sentence length, long words, a syllable guess), not a test with readers.

export const PLAIN = Object.freeze({
  streakRule: 'A day counts when you study for 5 minutes. The timer pauses if you stop tapping for a minute.',
  settingsIntro: 'Choose whose voice you hear: Ari (man) or Noa (woman).',
  persistNo: 'This browser cannot protect your progress. It is saved on this device only. Download a backup now and then.',
  persistYes: 'Your progress is protected from automatic clean-up. Clearing site data in your browser still deletes it. Keep a backup file.',
  persistMaybe: 'Your progress is saved on this device. The browser may remove it if space runs low. Download a backup now and then.',
  wipeHelp: 'This deletes your progress, review cards, streaks and settings from this device. It cannot be undone, so download a backup first. Tick the box below to remove the offline copy of the app too. Type {word} to turn on the button.',
  restoreWarn: 'Restoring replaces the progress and settings on this device. Not sure? Press Cancel, then download a backup of what is here now.',
  hooksNote: 'Memory hooks are little stories to help you remember, not history.',
  quickCheckMany: 'Quick check: {n} questions. Finish them to complete the lesson. Your place is saved.',
  closingPerfect: 'Perfect! You got every answer right on the first try. Review in a day or two to make it stick.',
  closingSolid: 'Nice work! {n} to look at again. They are in your review.',
  closingTough: 'That one was tough. {n} to look at again. They are in your review, and you can retry the lesson anytime.',
  notifyOpenOnly: 'Reminders only work while Aleph is open in this browser. To get them when Aleph is closed, add the reminder file to your phone\'s calendar.',
  streakNone: 'A streak counts the days you study for 5 minutes or more.',
  welcomeBackDue: 'Welcome back! There is nothing to catch up on. Try a few review cards, or start your next step below.',
  skippedNote: '{n} skipped. Skipped items do not count for or against you. Do the exercise again to answer them.',
  sprintNote: 'Only words from the word list count toward a destination. A missed word comes back later.',
  progressNoStreak: 'No streak right now. A day counts after 5 minutes of study.',
  progressRestNote: 'A rest day does not break your streak. A day counts after 5 minutes of study. The card goal below is a separate, gentle target.',
});

/** Fill {n} and {word} in a PLAIN string. @param {keyof typeof PLAIN} key @param {{n?:number|string, word?:string}} [vars] */
export function plain(key, vars = {}) {
  return String(PLAIN[key] ?? '').replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}
