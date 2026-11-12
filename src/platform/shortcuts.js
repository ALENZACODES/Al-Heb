// J6 Keyboard shortcuts: the single-key shortcuts that exist in the app today. Each row names the file whose code makes it work and a
// pattern that must be found there (tests/platform.shortcuts.test.js), so the help page cannot list a shortcut that is not built.
// Rows without `always` follow Settings > "Single-key shortcuts" (src/shell/motor.js keyShortcuts); rows with `always: true` do not.
export const SHORTCUTS = Object.freeze([
  { where: 'Anywhere', keys: '?', does: 'Open this page of keyboard shortcuts (not on letter tracing, typing practice or the word builder, which use the keys themselves).', file: 'src/app.js', proof: "e.key === '?'" },
  { where: 'Anywhere', keys: 'Tab, Shift+Tab, Enter, Space', does: 'Move between controls and press the one that has focus. Buttons and links are real HTML controls, so the browser does this.', native: true, always: true },
  { where: 'Menu', keys: 'Escape', does: 'Close the More menu and return to its button.', file: 'src/app.js', proof: "e.key === 'Escape'", always: true },
  { where: 'Lessons', keys: '1 to 9', does: 'Choose that answer.', file: 'src/curriculum/exercises.ui.js', proof: '/^[1-9]$/.test(e.key)' },
  { where: 'Lessons', keys: 'Enter', does: 'Check the chosen answer, then Continue.', file: 'src/curriculum/exercises.ui.js', proof: 'e.key === "Enter" && check' },
  { where: 'Lessons', keys: 'S', does: 'Skip the question.', file: 'src/curriculum/exercises.ui.js', proof: 'e.key === "s" || e.key === "S"' },
  { where: 'Review', keys: '1, 2, 3, 4', does: 'After the answer shows: rate Again, Hard, Good or Easy.', file: 'src/curriculum/review.view.js', proof: '/^[1-4]$/.test(e.key)' },
  { where: 'Dictionary review', keys: '1, 2, 3, 4', does: 'After the answer shows: rate Again, Hard, Good or Easy.', file: 'src/vocab/vocab.view.js', proof: "['1', '2', '3', '4'].includes(ev.key)", always: true },
  { where: 'First day', keys: '1 to 4, Enter', does: 'Pick an answer; Enter presses the button at the bottom.', file: 'src/firstday/firstday.view.js', proof: '.fd-opt[data-n=', always: true },
  { where: 'Fade-out recall', keys: '1 to 4', does: 'Choose the word for the open gap.', file: 'src/curriculum/fade.view.js', proof: 'state.openGap != null && /^[1-4]$/.test(e.key)' },
  { where: 'Build your first word', keys: 'Hebrew letters, Backspace, Enter, Escape', does: 'Place a letter, remove the last one, check the word, clear it.', file: 'src/firstday/minuteone.model.js', proof: "if (key === 'Escape') return { type: 'clear' }", always: true },
  { where: 'Follow the service', keys: 'Right Arrow or Page Down, Left Arrow or Page Up', does: 'With the service text focused: next and previous part.', file: 'src/service/service.view.js', proof: "e.key === 'ArrowRight' || e.key === 'PageDown'", always: true },
  { where: 'Prayer reader tabs', keys: 'Left and Right Arrows', does: 'Move between the tabs.', file: 'src/corpus/read.view.js', proof: "e.key === 'ArrowRight' || e.key === 'ArrowLeft'", always: true },
  { where: 'Focus mode', keys: 'Right Arrow or Page Down, Left Arrow or Page Up, Escape', does: 'Next passage, previous passage, leave focus mode.', file: 'src/platform/focus.view.js', proof: "e.key === 'ArrowRight' || e.key === 'PageDown'", always: true },
  { where: 'Talk', keys: 'Enter (Shift+Enter for a new line)', does: 'Send what you typed.', file: 'src/talk/talk.view.js', proof: "e.key === 'Enter' && !e.shiftKey", always: true },
]);
