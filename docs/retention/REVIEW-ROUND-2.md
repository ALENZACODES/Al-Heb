# Retention: Review Round 2 of 5

Reviewed: branch `claude/retention-fable-2026-11-10` at `e79ec465`, then merged with `main` at `4da2d9a5`.
Method: a read of every file in `src/retention/` and every edit to existing files, an axe-core run on each retention screen in light and dark at 390 px, and click-throughs in headless Chrome. No real phone and no real learner was involved.

## Found and Fixed in This Round

| # | Finding | Fix |
| --- | --- | --- |
| 1 | At zero hearts every lesson page was gated, including lessons the learner had already finished. Old material is supposed to stay open. | A finished lesson is never gated; only a new one is. Checked by hand: finished lesson opens, new lesson is gated. |
| 2 | One round of an intermediate lesson ("Round finished") was paid and counted as a whole finished lesson, which would unlock hearts and the league early. | A round pays its XP but is not a finished lesson. |
| 3 | XP earned before the league opened (5 lessons), or while it was switched off, was still ranked, so a learner could find a result for a league they had never seen. | League XP counts only while the league is open. |
| 4 | Travel grace could be lost: the time-zone change was remembered only for the one rollover in which it was noticed. | The change is remembered until the next missed day is judged. |
| 5 | A reminder the browser refused to show was still recorded as sent. | Recorded only when it was shown. |
| 6 | The calendar reminder file started on today's date even on a Friday or Saturday; some calendars show that first date. | The first event is moved to Sunday. |
| 7 | Every stored change redrew the top bar, the goal card and the shop, which closed the open goal picker and dropped keyboard focus. | Each redraws only when what it shows has changed, and puts focus back. |
| 8 | axe: the "3-minute lesson" button had a spoken name different from its visible text (a problem for voice control). | The extra label is removed. All five screens now pass axe with no violations in light and dark. |
| 9 | The top bar and Home cards appeared for a brand-new learner with nothing in them. | Hidden until something has been earned. |

Found in the earlier passes and already fixed: the "Three Minutes Done" card was wiped by the lesson redraw; the older in-app streak banner showed on Saturday for learners not in observant mode; a 3-minute sitting counted as a finished lesson.

## Open After This Round

| # | Finding | Why it is open |
| --- | --- | --- |
| A | Home now has two daily goals: the lesson card's goal in minutes and the new goal in XP. The new one is renamed "Daily XP Goal" to tell them apart. | Merging them into one is a product decision. |
| B | Friday is a free streak day for everyone, so a learner can skip every Friday at no cost. | It follows the "no streak loss from Friday 18:00" rule; `STREAK.shabbatCoversFriday` turns it off. |
| C | Reminders cannot reach a closed app except on installed Android or Chromium, and there only when the browser chooses. | No push server. The calendar file is the fallback. |
| D | Periodic Background Sync and the notification tap were never run on a real installed phone. The service-worker check is unit-tested; the events themselves are not. | Needs a real Android device. |
| E | Fifteen Hebrew strings are unreviewed (`HEBREW-REVIEW.md`). | Needs a native reader; two tier names need the rabbi's view. |
| F | `/league` and `/shop` are preview routes and carry the "unreviewed" banner. | Promotion to the first release is the owner's call. |
| G | First install is within about 1 KB of the 3.95 MiB limit. | Not caused by retention, but any small change to an installed file will cross it. |
| H | The hearts chip shows on every page, not only inside lessons. | Left as is so the top bar does not jump between pages. |
| I | The pretend league and every number in the system are design guesses. | Nothing has been tried with learners. |
| J | No badges for league results, daily goals or quests. | Each badge needs its own medallion picture. |

## Checks Run

- `npm test`: 3,397 tests, 0 failures, 10 skipped.
- `tests/retention/retention.browser.test.js`: five browser tests, including a real click-through of a 3-minute lesson.
- axe-core 4 on Home, Shop, League, the zero-hearts gate and the lesson reward panel, light and dark: no violations inside the retention UI.
