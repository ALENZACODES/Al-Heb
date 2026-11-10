# Torah Hebrew speech verification evidence — 2026-11-08

This is real Google Chirp 3 HD synthesis tested through the locally downloaded Hugging Face model `ivrit-ai/whisper-large-v3-turbo-ct2` (revision `72ad623a37947395efcc3933132353790e5a12f5`). Model weights SHA256: `db2a2265aa012c16c7db9edda3d699c99f984efdd3f2e22a72a8ce7e9720f3a2`.

Initial pilot: Genesis 1:1–3, Ari/Charon and Noa/Kore, using pointed Hebrew after cantillation removal. All six Hebrew clips had raw ASR mismatches. Genesis 1:1 had five word edits out of seven for both voices; recognizer output included malformed words rather than merely modern spelling differences. These clips are not cleared for learner playback.

Second pilot: identical verses/voices, with vowel points omitted from speech input only. Recognition improved substantially. Genesis 1:1 differed only by modern spelling אלוהים versus biblical אלהים. Genesis 1:2 Ari still produced a substantive mismatch (אליהם); this cannot be waived as a spelling variant. Exact raw comparisons and file hashes are retained in the JSON reports. The `unpointed/` subdirectory is the second pilot.

Source display text was never modified. A further pilot tests speech-only modern spelling אלוהים and corrected Elohim qere passages. Neither pilot is a guarantee of vowel or biblical pronunciation accuracy: Hebrew recognition normally emits unpointed text. No broad removal of vav/yod is allowed to turn failures into passes.

The full updated four-track verse plan has 23,384 clips and 2,901,644 spoken characters, nominally $87.05 at $30/million before any Google allowance. Full Hebrew synthesis remains held while input quality is evaluated. Files, retries, and manifests are fingerprinted for resumable operation. English chapter recording is handled separately.

Further controlled trials are retained in separate directories: `candidate` (unpointed plus modern speech-only Elohim spelling), `selective` (original vowels on selected ambiguous words), `vowels` (vowels retained but consonant dots removed), `independent` (generic Whisper-small second recognizer), `domain` (explicitly labeled generic Biblical-Hebrew recognition prompt, never the source verse), `latin-pilot` (one phrase in phonetic Latin input; exact Hebrew reference retained), and `chapter-pilot` (full Genesis 15 context). All remain unresolved for publication. A mismatch is not proof of a voice error: recognition spelling substitutions and homophones require careful separation from actual pronunciation errors.

The best simple-verse candidate reads Genesis 1:1–3 with matching words in both voices after the explicit modern spelling equivalence היתה/הייתה. Harder verses still show unresolved differences. No universal correction strategy has yet passed the broader pilot.

The current Google documentation supports pace control across locales but explicitly excludes he-IL from custom phoneme pronunciation and pause controls. A slower-pace trial is in progress. See [Chirp 3 language availability](https://docs.cloud.google.com/text-to-speech/docs/chirp3-hd#language_availability_for_voice_controls).
