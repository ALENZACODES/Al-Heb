# Accessibility statement

Preview, written 2026-11-04. This is a plain account of what the builders measured. It is not a promise, not a legal document and not a conformance claim.

## What this statement does not say

- Aleph does not claim to meet WCAG, the ADA, EN 301 549 or any other standard or law. No outside accessibility audit has been done.
- A check that found nothing means that check found nothing. It does not mean the screen works for you.

## What was checked, and how

- An automated checker (axe-core 4.14.0) was run in desktop Chromium over the screens of the app, at phone and desktop sizes, in light and dark colours (docs/A11Y.md). It finds only part of the problems a person can meet.
- A walk using only the keyboard was done through six flows: first-run setup, tracing a letter, the letter atlas quiz, vocabulary review, the reader, and the calendar through the More menu (docs/A11Y.md). Known gaps are listed below.
- Ten newer screens were measured by script for headings, names of buttons and fields, keyboard focus order and a visible focus ring, status messages, reduced motion, narrow-width layout (320 and 195 CSS pixels wide) and Hebrew language tagging (docs/a11y/NEWVIEWS.md).
- Colour numbers: 112 text and component colour pairs for the light, dark and two high-contrast themes were computed from the CSS colours (docs/a11y/colourblind.md, tools/a11y/contrast.mjs). All meet their target (4.5 to 1 for text, 3 to 1 for components) except one yellow picture fill, which is 1.31 to 1.
- Right and wrong answers: where colour was the only sign in some answer screens, a tick or cross and words were added. Screens were looked at through simulated colour-blindness filters by the builder, and some screens were checked only by reading the code (docs/a11y/colourblind.md).
- Hearing: the places in the code that play, record or listen to sound were listed, and the "I do not use audio" setting hides the Listen button on many of them and replaces listening-only questions with reading ones. Tests run the code paths (docs/a11y/deaf-hoh.md).
- Calm mode and reading comfort (text size, spacing, line length, font): tested by unit tests on a fake DOM and by one desktop Chromium run that read computed styles. The code was searched for animation and flashing, and nothing was found that changes more than 3 times per second; this was a code read, not a measurement with a flash analyser (docs/a11y/COGNITIVE.md).
- Plain wording: 21 strings the builder judged long were rewritten; the average sentence went from 11.1 to 7.5 words by a word-counting script. Those strings were chosen by the builder, so this is not a measure of the whole app (docs/a11y/COGNITIVE.md).
- Movement and touch: a Tab-key walk of 23 screens in desktop Chromium found no keyboard trap, every visible control reachable, a visible focus mark on each stop and no jumps back up the page (144 checks). Tap targets were measured by script at an emulated phone size of 375 by 667: none of 908 targets on 32 screens is under 44 by 44 CSS pixels. Letters, Atlas and the quick checks need no dragging or sliding gestures; stroke tracing has a stroke-by-stroke button mode that is recorded as walked through, not as drawn. Time limits, automatic advance, undo and one-handed placement are covered in docs/a11y/motor.md.
- The settings on the Accessibility screen exist, are checked when saved, are kept on this device and are included in a backup. This was tested in code (tests/a11y.hub.test.js).

## What was not tested with real people or devices

- No screen reader (VoiceOver, TalkBack, NVDA, JAWS) was used, so how the screens sound is unknown. No braille display, voice control or switch access was used.
- No switch device, eye tracker, head pointer or voice-control software was used, and no person with a motor disability tried the app. Target sizes are CSS pixels in an emulator, not measured on a finger.
- No real phone or tablet (iOS or Android) and no physical keyboard was used; checks ran in desktop Chromium, some at an emulated phone size.
- Nobody with dyslexia, ADHD, memory difficulties, anxiety, sensory sensitivity, migraine or low literacy tried the calm mode, short sessions or reading settings, and no photosensitivity analyser was used.
- No person with a disability, and no person who is deaf, blind, colour-blind, has limited movement or finds screens overwhelming, tried the app for this statement. Whether a setting helps a given person is not known.
- Pinch zoom was not tested; narrow-width layout was used as a stand-in.
- Hebrew labels in the interface were not proofread by a Hebrew speaker.

## Known gaps

- docs/A11Y.md lists open items from its 2026-11-04 run. Some have been worked on since (for example letter tracing now has a stroke-by-stroke button mode, and the letter atlas keeps keyboard focus), but only the automated keyboard walk in desktop Chromium has re-checked them, not a person using a keyboard or switch.
- The 44 pixel measurement covers 32 screens at one phone size, not every screen. The "Size of buttons and fields: Large" setting was measured on the same screens: all but 49 targets reach 60 pixels (the on-screen typing keys are 56 wide, one paste box is 54 tall, one link is 48). Only lesson quick checks have "Ask me to confirm each answer"; "Keep the main buttons at the bottom" covers Review, first 10 minutes and Word Sprint; the single-key shortcuts setting does not reach the vocabulary list, Torah reader or typing trainer (docs/a11y/motor.md).
- The default border around cards and fields is only about 1.4 to 1 against the page, below the 3 to 1 target for field edges. The two high-contrast themes make the edges solid (docs/a11y/colourblind.md).
- "I do not use audio" does not yet hide every optional play button (for example on the letter atlas, Torah reader, vocabulary and scan screens), and first-run setup does not ask about it; the written text is shown next to those buttons (docs/a11y/deaf-hoh.md).
- Written descriptions of sounds are drafts that no Hebrew speaker has checked, and words cannot replace hearing a sound (docs/a11y/deaf-hoh.md).
- Calm mode removes the Torah "read with me" timer (Previous word and Next word stay, so you move the highlight by hand), but does not change the letter-tracing layout or the letter atlas, which still show a lot at once. Pause and resume covers the lesson page and its quick check, not every practice screen (docs/a11y/COGNITIVE.md).
- Audio: no recorded voices ship yet. The Hebrew clips use a synthetic voice, a man's and a woman's (the About page gives the count and what they cover). Other sound comes from your browser's speech voice, which Aleph cannot control or caption. The "I do not use audio" setting swaps listening questions for reading ones.
- This list can be incomplete. Read docs/A11Y.md and the other files in docs/a11y/ for the measured details.

## How to report a barrier

- Aleph has no feedback form and no published contact address yet, and none is invented here. Until one is added, tell the person who gave you Aleph or who runs the site where you opened it.
- Say which page, what you were trying to do, what got in the way, and what device, browser and assistive tools you use. You do not need to say why.

## Settings on the Accessibility screen (#/accessibility)

**Sound and hearing**

- I do not use audio (`audioFree`): Hides the Listen buttons and swaps questions that need hearing for reading questions; a skipped sound item is not counted as a miss.

**Seeing the screen**

- Text size (`textSize`): Scales the text of the whole app up in steps (the largest step is 1.5 times normal).
- Space between lines (`lineSpacing`): Adds space between lines of text.
- Space between letters (`letterSpacing`): Adds space between letters of English text; Hebrew text is not changed.
- Line length (`lineLength`): Makes lines of text narrower so they are shorter to read across.
- Reading font (`readFont`): Switches between Aleph's own font and a plain font already on your device (nothing is downloaded).

**Colour and contrast**

- Colour theme (`theme`): Chooses the page colours: light, dark, following your device, or the two high-contrast options.

**Tapping, dragging and typing**

- Size of buttons and fields (`targetSize`): Makes buttons, links and fields bigger to tap.
- Keep the main buttons at the bottom (`bottomActions`): Keeps main buttons at the bottom, where a thumb reaches them. Covers Review, your first 10 minutes and Word Sprint; lessons already do this.
- Ask me to check my answer (`confirmAnswers`): Choosing an answer only marks it; a Check answer button submits it. Works in lesson quick checks today; other practice screens still answer on the tap.
- No time limits (`untimed`): Removes time limits: Word Sprint has no clock and a Record and compare clip does not stop by itself.
- Single-key shortcuts (`keyShortcuts`): Lets keys such as 1 to 4 and S act on a screen; turn it off if speech input or a stray key triggers them.

**Calmer and simpler**

- Calm mode (`calmMode`): Turns off animation, sound effects and vibration and removes timer and streak pressure, where the app supports it.
- Short sessions (`shortSession`): Shows lessons in small parts of about 2 to 3 minutes and saves your place after every part.
- Show my streak (`showStreak`): Shows or hides every streak line; your progress is never affected.

**Feedback when you answer**

- Vibrate on exercise feedback (`haptics`): Vibrates after an answer on devices that support it, and never when your system asks for reduced motion.
- Sound effects on exercise feedback (`soundEffects`): Plays a short sound after an answer once the app has sound files; none ship yet, so today it changes nothing you can hear.

Start here buttons only switch on the matching settings; they ask nothing about you and store nothing else. Settings are saved on this device under the store key `settings` and travel in a backup.
