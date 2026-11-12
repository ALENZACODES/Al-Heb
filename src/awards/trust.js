// Where existing progress is written, and why Awards does not treat it as a certificate.
// The strings are for the page and for tests. This module does not import those writers.

export const TRUST_LIMITS = Object.freeze([
  {
    id: 'quick-check',
    path: 'src/curriculum/actions.js',
    symbol: 'saveQuickCheck',
    limit: 'A quick check marks the lesson complete only when it meets the pass mark: 70% of its questions, rounded to the nearest whole question, right on the first try (so 2 of 3, 3 of 4 or 7 of 10; each lesson shows its own number and percentage). The pass mark is the app’s own rule, and the questions have not been reviewed by a qualified Hebrew teacher.',
  },
  {
    id: 'mark-complete',
    path: 'src/curriculum/lesson.view.js',
    symbol: 'testout',
    limit: 'The lesson list’s Test out button opens a short test (the lesson’s quick check, same pass mark). Passing it marks the lesson complete without studying it.',
  },
  {
    id: 'intermediate',
    path: 'src/curriculum/intermediate.view.js',
    symbol: 'completeLesson',
    limit: 'An intermediate lesson is marked complete when every exercise has a result and the pass mark (70% of the exercises, rounded to the nearest whole one) was right on the first try.',
  },
  {
    id: 'tracing',
    path: 'src/letters/progress.js',
    symbol: 'letters.progress',
    limit: 'Letter tracing writes a stroke counter. A button walk-through is stored apart from drawn completions. Awards does not read either counter. Audit D-11 groups tracing with self-report.',
  },
  {
    id: 'timed-read',
    path: 'src/timedread/timedread.view.js',
    symbol: 'I read it all',
    limit: 'Timed read-aloud is marked by the learner. The progress screen already calls those reads self-reported.',
  },
  {
    id: 'speak',
    path: 'src/speak/speak.js',
    symbol: 'I read it',
    limit: 'Say it can store an outcome the learner marks, including I read it. That is not a checked score.',
  },
  {
    id: 'firstday',
    path: 'src/firstday/model.js',
    symbol: 'self-reported',
    limit: 'First 10 minutes progress is self-reported. The model says it does not claim the learner can read.',
  },
  {
    id: 'firstday-ladder',
    path: 'src/firstday/ladder.view.js',
    symbol: 'I read it',
    limit: 'The pointed-to-unpointed ladder asks the learner to tap I read it. The screen says the reading is self-reported.',
  },
  {
    id: 'fade',
    path: 'src/curriculum/fade.view.js',
    symbol: 'self',
    limit: 'Some fade-out steps are graded by the learner rather than by a checked answer.',
  },
  {
    id: 'loops',
    path: 'preview/loops/badges' + '.js',
    symbol: 'factsFrom',
    limit: 'The preview daily-goal badges count facts that include self-reported reads and speaking attempts. Awards does not read loops.v1 and does not treat those badges as a certificate.',
  },
]);

export const EVIDENCE_SUMMARY = 'Lesson completion marks, the Test out button, quick-check results, self-reported hearing, tracing and reading, and points are not used. Streaks are used only for the daily and milestone medallions, never for a certificate. A lesson now counts as complete only after a pass: 70% of its quick check, rounded to the nearest whole question, right on the first try (Test out uses the same short test). That pass mark is the app’s own rule; the questions and the mark have not been reviewed by a qualified Hebrew teacher, and several practice screens still ask you to say that you heard or read something. A certificate needs objective checked answers and criteria that have been reviewed. The review is not done, so nothing on this page is a reviewed certificate.';
