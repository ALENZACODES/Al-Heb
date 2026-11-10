# Recognizer calibration against human speech

Analysis source: [Mechon Mamre Hebrew Bible recordings](https://www.mechon-mamre.org/p/pt/ptmp3prq.htm), Genesis 1 (`https://www.mechon-mamre.org/mp3/t0101.mp3`). The source page identifies the recordings as clearly pronounced Sephardic-style Hebrew, supplied with permission from Talking Bibles International, ℗ 1992.

Only a local 30-second opening excerpt was analyzed; the source recording is not copied into this repository, used for learner playback, or substituted for Chirp. The resulting phoneme-model report is diagnostic evidence, not a human certification.

The recognizer outputs `haSamaj'im` and `ham'ajim` for the human recording, preserving the /ay/ sequence that it did not detect in the unpointed Chirp Genesis 1:1 pilot. It also outputs `par'a` where the source says *bara*, demonstrating that it is imperfect. Neither exact word ASR nor this phoneme model is a sufficient guarantee of every vowel and stress.
