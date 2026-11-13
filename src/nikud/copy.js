// @ts-check
// Every word a learner reads about the vowel-mark packs, in one place (tests/nikud.test.js reads this file).
export const PACKS_TITLE = 'Vowel Mark Packs';
export const PACKS_LEAD = 'These packs add vowel marks and a sound line to Hebrew that comes without them: a sign you photographed, a line you typed. They work on this device and send nothing anywhere. Each is a large download, so use Wi-Fi.';
export const PACK_LABEL = Object.freeze({ nikud: 'Vowel Marks', phonemes: 'Sounds And Stress' });
export const PACK_ABOUT = Object.freeze({
  nikud: 'Adds vowel marks to bare Hebrew.',
  phonemes: 'Shows how a line is said, with the stressed part marked.',
});
export const PACKS_NONE = 'These packs are not available on this browser.';
export const PACK_NOT_YET = 'Not available to download yet.';
export const PACK_FAILED = 'The download stopped. Press the button to carry on from where it stopped.';
export const PACK_REMOVED = 'The pack was removed from this device.';
/** Why a download did not start, by the loader's code. */
export const PACK_BLOCKED = Object.freeze({
  'wifi-only': 'You seem to be on mobile data. Connect to Wi-Fi and press the button again.',
  'too-full': 'There is not enough free space on this device for this pack.',
  'over-limit': 'This pack would pass the storage limit you set for packs.',
  'cannot-run': 'This device reports too little memory for this pack. It needs a computer or a recent phone.',
  'no-storage': 'This browser cannot keep a pack.',
  shabbat: 'Downloads wait until after Shabbat.',
  quota: 'There is not enough free space on this device for this pack.',
});
export const MARKS_BUTTON = 'Add Vowel Marks';
export const MARKS_BUSY = 'Adding vowel marks…';
export const MARKS_NOTE = 'Vowel marks added on this device by the language pack, not from a checked line. Check them before you rely on them.';
export const MARKS_FAILED = 'The vowel marks could not be added this time.';
export const NAME_NOTE = 'This line holds the divine Name, so it is written ה׳ and no sound line is shown.';
export const SOUNDS_LABEL = 'Sounds: ';
export const SOUNDS_LIKE_LABEL = 'Sounds like: ';
