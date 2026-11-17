# Israeli audio: speech-to-text check

Each clip was played to a Hebrew speech-to-text model (ivrit-ai Whisper large-v3-turbo) and what it heard was compared with the Hebrew the clip should say. Spelling-only differences are allowed (ו/י vowel letters, ט/ת, כ/ק, ע/א, ס/ש, a final א/ה). A machine check: a **fail** is strong evidence the clip is wrong; a **pass** means it is recognisable, not that a teacher has approved it.

Unique recordings checked: **6596** (identical files under several ids are counted once).

| kind | fail | unheard | borderline | number | pass |
|---|---|---|---|---|---|
| builder | 0 | 0 | 0 | 0 | 322 |
| word | 7 | 0 | 1 | 6 | 6260 |
| **all** | **7** | **0** | **1** | **6** | **6582** |

Clip files to re-record (fail + unheard + borderline, every path sharing the audio): **8**, listed in [asr-redo-israeli.txt](asr-redo-israeli.txt). Full table: [asr-check.csv](asr-check.csv).

Fix them with `python tools/audio/asr-check/fix.py` (needs GOOGLE_TTS_API_KEY).

## Worst 150

| verdict | score | should say | heard | phonetic | clip |
|---|---|---|---|---|---|
| fail | 0.0 | וָו | ו. | vav | `audio/f/israeli/word/h29a2e2b8.mp3` |
| fail | 0.0 | הָא | אה? | ha | `audio/f/israeli/word/hcd00a615.mp3` |
| fail | 0.0 | וָו | ו. | vav | `audio/m/israeli/word/h29a2e2b8.mp3` |
| fail | 0.667 | אָכֹם | עקם | akhom | `audio/f/israeli/word/hf76c8cd2.mp3` |
| fail | 0.667 | ברוך | ברור. | vrvkh | `audio/f/israeli/word/r35-w3.mp3` |
| fail | 0.667 | וּנְבִיאוֹהִי | ונביאו היא. | unevi'ohi | `audio/m/israeli/word/brich-shmei-w89.mp3` |
| fail | 0.667 | הָא | ‫ההה. | ha | `audio/m/israeli/word/hcd00a615.mp3` |
| borderline | 0.8 | אֲבָרֲכֶךָּ | אברקק | avarakheka | `audio/f/israeli/word/ashrei-145-1-3-w11.mp3` |
