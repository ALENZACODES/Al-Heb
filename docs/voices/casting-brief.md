# Casting brief: ALEF Hebrew course voices

Status: DRAFT brief for a human producer. No talent has been contacted, no recordings exist, and no rates are known (the project research found no published Hebrew per-finished-hour or e-learning buyout rates; only one marketplace profile showing "starting at" US$100 with no unit). Treat all money fields as unknown until quotes arrive.

## Product in one paragraph
ALEF is an interactive Hebrew course (web/mobile app, plus a printed/PDF/EPUB book with companion web audio) taking adults from the alphabet to intermediate reading. Two goals: read Torah and prayers aloud with a congregation, and function in Israel without sounding like an outsider. Narrators are named Ari (man) and Noa (woman).

## Roles
| Role | Voice | Tradition(s) | Notes |
|---|---|---|---|
| Ari | Man, native Israeli Hebrew speaker | Modern Israeli (all content); Sephardi values for prayers if the director decides they differ | Warm, clear, teacherly; not announcer-slick |
| Noa | Woman, native Israeli Hebrew speaker | Same as Ari | Same register; must be distinguishable from Ari at a glance on a waveform-free audio-only listen |
| Ashkenazi reader(s) | Man and woman, OR one talent per gender who is fluent in Ashkenazi liturgical pronunciation | Ashkenazi liturgical | Ideally the same Ari/Noa talent if they can do it authentically; otherwise separate talent, credited as additional voices. Dialect (Litvish vs Polish/Hasidic) to be chosen with the talent, one dialect throughout |

Why human: the project research found no TTS service offering Ashkenazi pronunciation, and Google excludes he-IL from custom pronunciations, so isolated letter and vowel sounds and all Ashkenazi audio cannot be produced reliably by TTS.

## Scope of work (from the generated recording scripts)
- docs/voices/recording-script-israeli.md and recording-script-ashkenazi.md, plus recording-script.csv (filterable by voice).
- Content groups per voice (counts are in docs/voices/coverage.md): 31 letter-form names (27 letters + vet, khaf, fe, sin), 26 isolated letter sounds, 15 vowels and marks, a 110-clip syllable grid (22 letters x 5 vowel sounds), 27 mnemonic anchor words, lesson vocabulary, the survival phrasebook (Israeli only), and prayer lines plus single prayer words. Optional whole-prayer continuous reads are listed but not required.
- Roughly 2-4 takes per clip; take counts are in the scripts. Each kit (docs/voices/kit/<tradition>-<voice>/) has the slate order, pause markers, checklist and a session plan; the Israeli kits are about 1,380 clips per voice and the Ashkenazi kits about 970. Most clips are under 2 seconds. Ask for a per-clip price AND a day rate.
- Estimated studio time: unknown until a talent is timed. docs/voices/kit/*/session-plan.md gives a model-based range (for example Israeli kit, about 4 to 12 booth hours per voice) built from stated assumptions; nobody has been timed, so treat it only as a planning placeholder and run the 30-clip pilot described in docs/voices/kit/README.md.

## Technical requirements
- Treated room, large-diaphragm or shotgun mic, consistent distance; noise floor below about -60 dBFS; no room reverb.
- Deliver 48 kHz / 24-bit WAV, one file per clip, named per the script (e.g. `bet.wav` in the right folder), untreated peaks below -3 dBFS. We normalize and encode ourselves (tools/audio/normalize.sh).
- Consistent mic chain across all sessions for a given voice; if re-records happen months later, match the original chain or re-record the batch.
- Directed sessions preferred (remote via Source-Connect or similar) for the isolated sounds, which are the hardest to do naturally.

## Skills and audition
Audition script (ask for pointed text read with no improvisation):
1. Five letter names and their isolated sounds (no added vowel).
2. Five syllables across the vowel set (ba, ge, di, ko, mu style), with exact vowel purity.
3. A sentence of Modern Hebrew and a pointed Priestly Blessing line (Num 6:24-26) in Israeli pronunciation.
4. For Ashkenazi candidates: the same blessing in Ashkenazi pronunciation (tav as s, kamatz as o, penultimate stress), plus a self-description of the dialect they use.
Evaluate on: vowel purity (no diphthong drift), resh quality matching the stated tradition, consistent level, ability to hold a flat neutral delivery on isolated sounds.

## Where to look (from the research notes; none contacted)
Voices.com, Fiverr, Upwork (Israel voice actors), Voice Crafters. The notes list a handful of public profiles; no endorsement or vetting is implied.

## What a human must still do
- Native-speaker review of the pointed text, the pronunciation targets (the project's IPA is starter data) and the letter-name list.
- Choose the Ashkenazi dialect.
- Decide whether Sephardi-values prayer audio needs its own recordings or can reuse the Israeli ones (the manifest marks no tradition as equivalent until someone with authority decides).
- Obtain quotes and sign the agreement (see buyout-contract-terms.md).
