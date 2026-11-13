# Together without accounts (ideas R1 to R10)

Community and sharing with no server and no accounts. Everything is on the device, or is carried between devices by a
link, a QR code or a file. Page code is under `src/together/` and loads on first open.

| Idea | Where | How it works |
|---|---|---|
| R1 Challenge codes | `#/friend-challenge`, any arcade game opened with `?challenge=<code>` | A 9-character code names a game, a level and a seed. The same code gives the same board on any device. After a round the results card gives a 13-character code that also carries the score, so both players see the comparison. Only the first finished round on a board counts. |
| R2 Household profiles | `#/profiles` | Up to six profiles. The one in use lives under the app's normal `alef:` keys; the others are parked under `alefp:<id>:`. Switching moves the keys and reloads. `src/shell/profile-slots.js` finishes a switch that was cut short when the app next starts. |
| R3 Guest mode | `#/profiles` | An empty learner. Ending the session deletes what the guest did and brings the previous profile back untouched; or the guest keeps it as a new profile. A session left open for 12 hours is ended at the next start. A small marker shows while it is open. |
| R4 Buddy pairing | `#/buddy` | Each side sends a summary (name, streak, lesson counts) by link, QR code or file whenever they like. The other device keeps the latest and shows it in the Study Hall. |
| R5 Family board | `#/study-hall` | The profiles on this device ranked by XP this week, then lessons this week, then streak. No ranking in Calm mode. |
| R6 Gift a lesson | `#/gift` | A link, QR code or file with one lesson, up to three games, a name and a note. Opening it shows the steps in order. |
| R7 Group challenge by file | `#/friend-challenge` | The table of a challenge saved as a file. Each player adds the file, plays the board, and saves the table again. One result per name. |
| R8 Local ratings | `#/ratings`, the arcade results card | One to five stars, kept in the profile. Five-star picks bring suggestions. |
| R9 Study Hall | `#/study-hall` | The board, a weekly lesson goal the house shares, what each profile did lately, milestones, and buddies. No live presence. |
| R10 Print-and-share | `#/worksheet` | The printed lesson sheet carries a QR code that opens that lesson in Aleph, where its letters and words can be heard. |

## Rules kept

- No server, no accounts, no request to any other address.
- Text that arrives from another device is plain text: cut to length, control characters removed, the divine Name shown as ה׳.
- A gift or a code can only point at a lesson or a game of this app.
- "Back Up" and "Delete All My Data" in Settings act on the profile in use. Other profiles are not touched.
- Two files of this lane are in the first install: `src/shell/profile-slots.js` and `src/shell/together-routes.js`.

## Not done

- Challenge codes cover the arcade games (the ones that run in the shared arcade shell), not every game.
- Ratings can be given on the arcade results card and on the My Ratings page, not inside each lesson or book.
- Buddy updates are sent by hand; nothing is sent on a timer.
