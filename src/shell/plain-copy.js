// Plain-language copy for the most-used screens: short sentences, common words, about a grade 6 reading level.
// Each entry has the same id as an entry in tests/fixtures/plain-language-before.json (the wording it replaced), so
// tools/a11y/readability.mjs can measure the same strings before and after. {n} and {word} are filled in by plain().
// The numbers are a rough estimate from a word-counting script (sentence length, long words, a syllable guess), not a test with readers.

export const PLAIN = Object.freeze({
  streakRule: 'A day counts when you study for 5 minutes. The timer stops if you do not tap for a minute.',
  settingsIntro: 'Choose whose voice you hear: Ari (man) or Noa (woman).',
  persistNo: 'This browser cannot protect your progress. It is saved on this device only. Download a backup now and then.',
  persistYes: 'Your progress is protected from automatic clean-up. Clearing site data in your browser still deletes it. Keep a backup file.',
  persistMaybe: 'Your progress is saved on this device. The browser may remove it if space runs low. Download a backup now and then.',
  wipeHelp: 'This deletes your progress, review cards, streaks and settings from this device. It cannot be undone, so download a backup first. Tick the box below to remove the offline copy of the app too. Type {word} to turn on the button.',
  restoreWarn: 'Restoring replaces the progress and settings on this device. Not sure? Press Cancel, then download a backup of what is here now.',
  lessonDraft: 'This is a draft. A native Hebrew speaker has not checked the meanings or vowel marks yet.',
  hooksNote: 'Memory hooks for this course. They are drafts. The stories help you remember. They are not history.',
  quickCheckMany: 'Quick check: {n} questions. Finish them to complete the lesson. Your place is saved.',
  exDraft: 'This exercise is a draft. A native Hebrew speaker has not checked it, and no learners have tried it.',
  closingPerfect: 'You got every answer on the first try. Review again in a day or two to see what stuck.',
  closingSolid: 'Good work. {n} to look at again. They are in your review.',
  closingTough: 'That was a hard one. {n} to look at again. They are in your review. You can try the lesson again if you like.',
  notifyOpenOnly: 'Reminders only work while ALEF is open in this browser. If ALEF is closed, nothing can remind you. To get reminders anyway, add the calendar reminder file to your phone\'s calendar.',
  streakNone: 'A streak counts the days you study for 5 minutes or more.',
  welcomeBackDue: 'Welcome back. There is nothing to catch up on. Try a few review cards and stop whenever you like. Or start with your next step below.',
  skippedNote: '{n} skipped. Skipped items do not count for or against you. Do the exercise again to answer them.',
  sprintNote: 'Only words from our list are counted for a destination, not every word in the line. A miss just brings the word back later.',
  progressNoStreak: 'No streak right now. A day counts after 5 minutes of study.',
  progressRestNote: 'A rest day does not break your streak. A day counts after 5 minutes of study. The card goal below is a separate, gentle target.',
});

/** Fill {n} and {word} in a PLAIN string. @param {keyof typeof PLAIN} key @param {{n?:number|string, word?:string}} [vars] */
export function plain(key, vars = {}) {
  return String(PLAIN[key] ?? '').replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}
