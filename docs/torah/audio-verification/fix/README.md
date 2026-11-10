# Torah reader audio: fixes from the two-reviewer check

`../check/all.jsonl` holds the check of every Hebrew verse clip (11,692: Ari and Noa) by both reviewers: the word model
(ivrit-ai Whisper) and the sound model (renikud IPA). The clips both reviewers flagged were re-recorded on GitHub
(`.github/workflows/torah-fix.yml`, `tools/torah/audio/fix_shard.py`) from the pointed Hebrew, the divine name read Adonai:
one take in the Israeli WaveNet voice the rest of the app uses, one in the clip's Chirp 3 HD voice. A take replaced the clip only
when neither reviewer heard it as worse and at least one heard it as better. `fix-<n>.jsonl` has every decision with both
reviewers' scores before and after. Replaced clips are no longer the IPA-pipeline recordings described in
`tools/torah/audio/README.md`; most are now the WaveNet voice. Machine review only, not a reader's approval.
