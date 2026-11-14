@echo off
rem Records fresh takes of the letter names, the V sound and the vowel names the letter audit heard wrong,
rem with the voice key already saved in Windows. The key is never shown or written to any file.
rem Nothing is pushed and no app file changes. Output: audio-takes\letter-audit\ and letter-retake-run.log.
cd /d "%~dp0..\.."
echo Recording letter takes... this window closes by itself when done (about two minutes).
(
  echo === %date% %time% ===
  where py >nul 2>nul && (py -3 tools\audio\render_letter_takes.py) || (python tools\audio\render_letter_takes.py)
  echo === finished %date% %time% ===
) > letter-retake-run.log 2>&1
