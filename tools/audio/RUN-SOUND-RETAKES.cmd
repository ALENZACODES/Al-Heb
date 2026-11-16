@echo off
rem Records fresh takes of the letter sounds and syllables the sound check says to listen to (docs\audio\SOUNDS-CHECK.md),
rem with the voice key already saved in Windows. The key is never shown or written to any file.
rem Nothing is pushed and no app file changes. Output: audio-takes\sound-check\ and sound-retake-run.log.
cd /d "%~dp0..\.."
echo Recording sound takes... this window closes by itself when done (about two minutes).
(
  echo === %date% %time% ===
  where py >/dev/null 2>/dev/null && (py -3 tools\audio\asr-check\sound_takes.py --record) || (python tools\audio\asr-check\sound_takes.py --record)
  echo === finished %date% %time% ===
) > sound-retake-run.log 2>&1
