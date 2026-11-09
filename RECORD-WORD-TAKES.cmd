@echo off
rem Records fresh takes of the flagged words with the voice key already saved in Windows, then pushes them.
rem The key is never shown or written to any file. Output goes to retake-run.log.
cd /d "%~dp0"
echo Recording word takes... this window closes by itself when done.
(
  echo === %date% %time% ===
  git pull --rebase origin main
  where py >nul 2>nul && (py -3 tools\audio\render_word_takes.py) || (python tools\audio\render_word_takes.py)
  git add audio-takes
  git commit -m "Fresh word takes for the words both reviewers flagged (audio-takes/)"
  git push origin HEAD
  echo === finished %date% %time% ===
) > retake-run.log 2>&1
git add retake-run.log >nul 2>nul
git commit -m "Word takes run log" >nul 2>nul
git push origin HEAD >nul 2>nul
