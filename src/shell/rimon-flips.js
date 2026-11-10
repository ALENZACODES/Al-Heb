// On-demand 8-frame flip-books built from rimon-###.webp stills.
// Sheets live in data/images/rimon/anim/ and are not precached (data/images is
// skipped by tools/build-precache.mjs). A missing sheet is a silent no-op.
export const FLIPS = Object.freeze({
  burst:     { file: 'anim/rimon-flip-burst.webp',     frames: ['018','023','030','002','027','057','025b','040'], count: 8, ms: 70,  loop: false },
  bounce:    { file: 'anim/rimon-flip-bounce.webp',    frames: ['023','030','005','023','027','030','023','001'],  count: 8, ms: 80,  loop: false },
  celebrate: { file: 'anim/rimon-flip-celebrate.webp', frames: ['028','039','034','026','027','031','035','024'],  count: 8, ms: 90,  loop: false },
  slump:     { file: 'anim/rimon-flip-slump.webp',     frames: ['041','042','048','043','044','045','054','055'],  count: 8, ms: 110, loop: false },
  sleepy:    { file: 'anim/rimon-flip-sleepy.webp',    frames: ['015','050','015','037','015','050','001','015'],  count: 8, ms: 220, loop: true  },
  peek:      { file: 'anim/rimon-flip-peek.webp',      frames: ['033','011','020','033','009','011','020','001'],  count: 8, ms: 120, loop: false },
  streak:    { file: 'anim/rimon-flip-streak.webp',    frames: ['056','057','058','027','030','002','025b','035'], count: 8, ms: 80,  loop: false },
});

// Which flip plays for a situation. Quiet situations (Shabbat, rest) get none.
export const SITUATION_FLIP = Object.freeze({
  home: 'burst', onboarding: 'burst', welcomeBack: 'peek', lessonStart: 'burst',
  correct: 'celebrate', bigCorrect: 'celebrate', wrong: 'slump', hint: 'bounce',
  streak: 'streak', streakRisk: 'peek', rest: null, lessonComplete: 'celebrate',
  unitComplete: 'celebrate', idle: 'sleepy', loading: 'bounce', empty: 'peek',
  error: 'slump', recovered: 'celebrate', offline: 'peek', shabbat: null, holiday: null,
  brainLab: 'burst', brainLabWin: 'celebrate', brainLabMiss: 'slump',
  storybooks: 'peek', storyReader: 'sleepy', award: 'celebrate', reminder: 'peek',
});

export function flipUrl(name, base = 'data/images/rimon/') {
  const spec = FLIPS[name];
  return spec ? `${base}${spec.file}` : null;
}

export function flipForSituation(situation, { reduceMotion = false, quiet = false } = {}) {
  if (!situation || reduceMotion || quiet) return null;
  const name = SITUATION_FLIP[situation];
  return name && FLIPS[name] ? name : null;
}
