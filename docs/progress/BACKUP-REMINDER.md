# Backup reminder

Aleph keeps progress only in this browser on this device. Nothing copies it anywhere automatically, and no screen may say or imply
otherwise. The only backup is the file the learner downloads from Settings > Back up, restore or delete.

## What the learner sees

- Home shows one card, "Keep a copy of your progress", once they have finished **3 lessons** and have never downloaded a backup file.
- After a download, the card stays away until **5 more** lessons are finished.
- "Not now" hides it for **7 days**.
- The card links to Settings. It never claims anything was saved for them.
- The Settings message after a download says the file is only as safe as where it is kept and that Aleph does not make backups by itself.

## Code

- `src/shell/backup-reminder.js`: pure rules (`reminderDue`, `afterExport`, `snoozed`, `completedCount`), wording, and the card.
- Store key `backup.reminder.v1`: `{lastExportAt, lastExportCompleted, snoozeUntil}`. Written by Settings after a download and by
  "Not now". It travels inside backup files like any other key and is removed by "Delete all my data".
- `src/shell/home.view.js` mounts the card under the Today card; `src/shell/settings.view.js` records the download.
- Tests: `tests/backup.reminder.test.js` (rules, wording that never implies an automatic backup, the card).
