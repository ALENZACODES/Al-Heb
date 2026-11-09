# Privacy for testers (draft, 2026-11-05)

Plain words for someone trying Aleph. This is a summary of what the app's code does, taken from the app's own Privacy page, not a legal document. The Privacy page is the source of truth: open `#/privacy` in the app, or read `src/shell/privacy.view.js` (the lists `FLOWS`, `LOCAL_ONLY` and `STORE_KEYS`; `tests/credits.test.js` checks each key and file named there exists). The page itself says its statement comes from reading the code, not from a capture of network traffic on a live site.

## What the app stores, and where
- In your browser's local storage on this device, under names starting with `alef:`: your settings, which lessons you finished, your review cards, your streak, where you stopped in a lesson, and similar counts for the practice screens. The Privacy page lists all 56 entries, one line each, with the source file that writes it (`STORE_KEYS` in `src/shell/privacy.view.js`; 56 was counted by loading that file on 2026-11-05).
- One entry (scroll position) is kept for the open tab only and is gone when the tab closes.
- Your browser's Cache Storage holds copies of Aleph's own files so it can open offline. It holds no progress and no settings.
- No account, no name, no email. The app uses no cookies and no IndexedDB (stated on the Privacy page).
- If your browser blocks local storage (for example in a private window), the app keeps your data in memory only and it is lost when you close the tab.

## What leaves your phone
Per the Privacy page, nothing you type or do in lessons is sent anywhere. It lists four kinds of network request and says two of them can carry something of yours:
- **Say it screen (only if you press its button):** your browser's own speech recogniser may send your voice to the browser maker. Aleph does not upload audio itself. This screen is not part of the three test tasks; skip it if you prefer.
- **Photo vowel service:** the page says it is not offered in this build.
- The other two requests fetch Aleph's own files, or talk to a helper program on your own computer if you type its address.

Things the app cannot control: whoever hosts the app, and your browser or phone maker, can see ordinary connection details such as your IP address when the page loads.

The owner of the test also writes down what he sees and what you say (Part 2 and 3 of `docs/launch/TESTER-KIT.md`), identified by a tester ID such as T01. That record is separate from the app.

## How to delete it
- **In the app:** Settings > "Delete all my data". Type DELETE to confirm. It removes your progress, review cards, streaks and settings from this device. A tick box there can also remove the offline copy of the app (Aleph then needs a connection to open next time).
- **In your browser:** clear this site's data in the browser settings, or uninstall the app if you added it to your home screen.
- **Keep a copy first, if you want one:** Settings > Backup > "Download backup" saves your data as one file.
- **The owner's notes about you:** ask for them to be deleted at any time; give your tester ID.

These steps were read from the code (`src/shell/settings.view.js`, `src/shell/privacy.view.js`); no one has yet tried them on a real phone.
