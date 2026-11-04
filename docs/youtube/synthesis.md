# Cross-video synthesis: what the top YouTube Hebrew videos teach, get wrong, and leave to ALEF

Status: research notes, 2026-11-03. Scores are judgement on a 0-1000 scale, not outcomes. Machine-readable: `data/curriculum/resource-concepts-youtube100.json` (validated by `tests/resources-youtube100.test.js`).

## Read this first: the evidence is small

Of 100 candidate videos, captions for only 16 could be fetched before YouTube rate-limited this machine (HTTP 429 and sign-in bot checks), and 15 were usable (see `top100.md`). The counts below are therefore "n of the videos I read": 9 alphabet/vowel videos, 3 phrase videos, 3 prayer videos, plus the earlier Hebrew For Beginners pass (`docs/resources/youtube-hfb-playlists.md`) counted as one extra source where noted. I did not watch or hear anything, so teaching done on screen is invisible to me. "Most common" here means most common in that sample, not across YouTube. The sample skews to the highest-view alphabet courses (HebrewPod101, Tim McNinch, a one-hour course, WORD in Hebrew, Learn Hebrew with Daniel); it holds almost no Israeli-slang, travel or Torah-trope videos, so conclusions about those genres are not drawn.

## The 15 most common teaching techniques (in the sample)

| ID | Concept | r | i | c | f | risk | Score | Improved |
|---|---|---|---|---|---|---|---|---|
| y100-tech-01 | Letters taught in alef-bet order | 650 | 500 | 750 | 650 | 100 | 600 | - |
| y100-tech-02 | Print and handwritten forms shown together | 500 | 800 | 750 | 850 | 100 | 700 | - |
| y100-tech-03 | Live stroke-order demonstration | 450 | 700 | 800 | 900 | 100 | 780 | - |
| y100-tech-04 | Letter name used as the sound cue | 600 | 550 | 700 | 650 | 150 | 640 | - |
| y100-tech-05 | One key word per letter | 550 | 700 | 750 | 700 | 150 | 700 | - |
| y100-tech-06 | Shape gimmicks and picture mnemonics | 700 | 600 | 800 | 800 | 350 | 760 | - |
| y100-tech-07 | Dotted versus undotted pairs compared back to back | 850 | 700 | 850 | 850 | 100 | 790 | - |
| y100-tech-08 | Final letters taught as one batch | 700 | 650 | 800 | 800 | 100 | 800 | - |
| y100-tech-09 | Silent carriers named early | 800 | 700 | 750 | 800 | 100 | 820 | - |
| y100-tech-10 | A real word read in the first lesson | 800 | 900 | 900 | 900 | 100 | 900 | 965 |
| y100-tech-11 | Vowel signs grouped by sound family | 880 | 880 | 850 | 880 | 150 | 820 | - |
| y100-tech-12 | Consonant-plus-vowel syllable chains drilled on a beat | 900 | 800 | 850 | 900 | 150 | 900 | 960 |
| y100-tech-13 | Quizzes and recaps at lesson ends | 550 | 550 | 700 | 800 | 50 | 640 | - |
| y100-tech-14 | Table of letters that sound the same in Israeli Hebrew | 700 | 900 | 850 | 900 | 100 | 880 | 965 |
| y100-tech-15 | Gender variants flagged as phrases arrive | 100 | 900 | 800 | 800 | 100 | 700 | - |

Most widely used in the sample: alphabet order (8 of 9 reading videos), final forms as a batch (6), dotted/undotted pairs (5), silent carriers (5). Most useful per minute: an early real word, syllable chains drilled on a beat, and the merged-sound table.

## The 10 most common errors and myths (in the sample)

| ID | Concept | r | i | c | f | risk | Score | Improved |
|---|---|---|---|---|---|---|---|---|
| y100-err-01 | Shva taught as silent, or as a flat short e | 900 | 850 | 900 | 900 | 100 | 920 | 975 |
| y100-err-02 | Long and short vowels presented as audible pairs | 700 | 900 | 850 | 900 | 100 | 860 | 960 |
| y100-err-03 | Hebrew said to have no vowels | 600 | 650 | 700 | 800 | 100 | 640 | - |
| y100-err-04 | Aleph and ayin simply called silent | 700 | 800 | 800 | 850 | 100 | 840 | - |
| y100-err-05 | Chet and the h letters given incompatible sounds | 800 | 850 | 800 | 800 | 100 | 760 | - |
| y100-err-06 | The letter-name-gives-the-sound rule stated without limits | 500 | 500 | 650 | 700 | 100 | 620 | - |
| y100-err-07 | Final he sounded out as a vowel | 900 | 850 | 850 | 880 | 100 | 900 | 965 |
| y100-err-08 | Vowel marks said to be optional, so skip them | 950 | 700 | 700 | 850 | 100 | 860 | 965 |
| y100-err-09 | One pronunciation presented as the pronunciation | 950 | 900 | 850 | 950 | 100 | 930 | 975 |
| y100-err-10 | Kamatz katan waved away | 850 | 600 | 650 | 800 | 100 | 830 | - |

Each is something said aloud that I judge misleading. Frequencies are tiny, so rank by cost to the learner, not by count: shva, tradition, and silent final letters do the most damage to someone who wants to read a siddur.

## Typical sequences

- Letters: alef-bet order from aleph to tav (8 of 9 reading videos), two to four letters per lesson. Exceptions: the one-hour course pairs look-alikes in a self-chosen order, and the review video runs the whole alphabet in one pass. Dot variants (bet, kaf, pe) are met in place; final forms come after the main letters or inside the lesson of their base letter; shin and sin come near the end.
- Vowels (when taught in a block): the a-signs first, then the e-signs, then i, then o, then u, with shva last or deferred; one series brings shva in right after the first e-sign. The long/short pairing appears in the academic-style course only. Vowels are interleaved with letters from lesson one in the HebrewPod101 and Daniel courses, and taught after the alphabet in McNinch, WORD in Hebrew and Hebrew For Beginners.
- First word: a two-letter family word (father, come) in videos that interleave; in videos that separate, the first real word arrives only after the vowels.

## What no video does well and ALEF can

| ID | Concept | r | i | c | f | risk | Score | Improved |
|---|---|---|---|---|---|---|---|---|
| y100-gap-01 | Adaptive look-alike drilling | 850 | 800 | 900 | 950 | 100 | 880 | 965 |
| y100-gap-02 | Stylus tracing with a real stroke check | 400 | 800 | 850 | 950 | 100 | 870 | 960 |
| y100-gap-03 | Word stress and rhythm | 700 | 900 | 800 | 850 | 100 | 860 | 955 |
| y100-gap-04 | Follow-along prayer reading without transliteration | 950 | 300 | 850 | 950 | 100 | 900 | 970 |
| y100-gap-05 | Gender-aware phrase builder | 50 | 900 | 800 | 800 | 100 | 740 | - |
| y100-gap-06 | Error log that explains the rule behind a miss | 800 | 800 | 900 | 950 | 100 | 840 | - |

In short: none checks the learner (writing, reading aloud, spelling); none makes pronunciation tradition a setting; none drills confusions based on the individual's own errors; none teaches stress or links a prayer's printed letters to its sound; and the phrase videos lean on Latin spellings.

## Top 10 concepts by improved score

| Rank | ID | Concept | Score | Improved |
|---|---|---|---|---|
| 1 | y100-err-09 | Tradition setting in every drill | 930 | 975 |
| 2 | y100-err-01 | Shva decision walker | 920 | 975 |
| 3 | y100-gap-04 | Tap-a-word prayer reader | 900 | 970 |
| 4 | y100-tech-10 | First-lesson word contract | 900 | 965 |
| 5 | y100-err-07 | Silent-letter tagging game | 900 | 965 |
| 6 | y100-tech-14 | Same-sound explorer with spelling quiz | 880 | 965 |
| 7 | y100-gap-01 | Confusion-pair trainer | 880 | 965 |
| 8 | y100-err-08 | Pointed to unpointed bridge | 860 | 965 |
| 9 | y100-tech-12 | Syllable chain runner | 900 | 960 |
| 10 | y100-gap-02 | Stroke-checked tracing | 870 | 960 |

Each concept scoring 850 or more has a full improved spec (screen, data, interaction, test) rescored to 950 or more in the JSON, in the same shape as `data/curriculum/resource-concepts-books.json`. Several overlap earlier specs (yt-alphabet-03, yt-vowels-01) and are marked as such rather than re-specced. Originality: no teacher's mnemonic, example word list or script is reused; ALEF art and wording must be its own.
