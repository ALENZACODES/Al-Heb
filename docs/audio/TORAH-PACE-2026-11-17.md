# Torah Verse Reading: One Steady Pace (17 Nov 2026)

**The problem (reported by John):** some verses were read very fast and some very slowly, and a chapter did not flow.

**What the clips showed:** the 11,692 Hebrew verse clips (Ari and Noa) came out at two speeds chosen at random by the voice, request by request: about two thirds near 3.3 syllables a second and a third near 5.5, mixed verse by verse inside every chapter. Verse length, book and voice made no difference.

**What was done (no new recordings, by John's choice, except Genesis 1):**
- Every clip was brought to one pace, about 4.6 syllables a second of speech, with rubberband (pitch kept), never stretched below 0.7x or above 1.4x. `tools/torah/audio/ipa/pace.py --stretch-existing`.
- Every clip now starts with 0.15 s of silence and ends with 0.45 s, so verses follow each other evenly when a chapter plays.
- Genesis 1 was re-recorded as a test with pauses at the main breaks (etnachta, segolta, shalshelet, zaqef), with retakes until the pace was right (`pace.py --execute`, workflow `torah-pace`). Doing that for the whole Torah would cost about three times the first recording; John chose the free route for the rest.

| | 1st percentile | median | 99th percentile |
|---|---|---|---|
| before (syllables a second of speech) | 3.11 | 4.07 | 6.89 |
| after | 4.16 | 4.58 | 4.90 |

**Checked:** the word recogniser (ivrit-ai whisper) heard the most-stretched verses (0.72x and 1.35x) as well after as before (Genesis 2:13, 2:15, 2:16). Logs: `tools/torah/audio/ipa/pace-log-*.jsonl`.

**Still open:** outside Genesis 1 there are no pauses inside a verse, so long verses still run on; that needs the paid re-recording. Not reviewed by a person.
