# Sacred listen recordings

Staged 2026-11-06 from the cleared cantorial packs. The 1929 file `pd_barichai_bocherh_aarbi_1929.ogg` is held and is not in this folder.

Public-domain files are early commercial recordings published before 1926. CC BY-SA files keep their Commons attribution and share-alike terms. Chad Gadya is a folk song, not a cantorial recording, and its tradition is not stated.

Playback files are the original Vorbis bytes. `cc_asael_genesis_noah_ashkenaz.ogg` is those same bytes under an `.ogg` name; the Commons original is `.oga` (also stored here).

Each item's Commons page is linked from the Sacred listen screen.

## Enhanced copies (2026-11-07)
The playback files in this folder were enhanced for clarity (gentle denoise, de-click, and loudness
levelling) from the original recordings; the unmodified originals are preserved in `originals/`.
For CC BY-SA items the enhanced file is an adaptation under the same licence; the performer and
source credits in the catalogue are unchanged.

## Restoration (2026-11-08)
All playback files (`.ogg` and `.mp3`) were rendered again from `originals/` with `tools/audio/cantorial_restore.py`, using free ffmpeg filters only: rumble cut, de-click, FFT denoise, a small presence lift for the voice, a low-pass above the range the old discs hold (historic recordings only), a gentle lowering of hiss between phrases, and loudness levelling to about -16 LUFS. Nothing was added to the music. The unmodified downloads stay in `originals/`. CC BY-SA items remain adaptations under the same licence with unchanged credits.
