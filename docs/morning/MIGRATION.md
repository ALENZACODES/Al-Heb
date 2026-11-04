# Streak: one record, one number

Store key `streak` (unchanged). Old record `{count, best, last}` (last = any activity day) stays readable. The engine adds
`v:2, todayDate, todaySeconds, frozenDates[], doneDates[], freeze, mode`. Field mapping to the spec names: currentStreak = `count`,
longestStreak = `best`, lastCompletedDate = `last`.

- Migration happens on first `startMorning()` / settings change (`syncRecord`): `count/best/last` are kept as they are (an old `last` is read as a completed day), `v:2` is added. Nothing is deleted.
- Once `v:2`: `recordActivity` returns the record untouched (engaged time, not an action, decides the day), `currentStreak` (Home) and `streakInfo` (Progress) both call `projectStreak` in `src/curriculum/streak.js`, so they cannot differ.
- Progress "rest day" buttons write `progress.state.rest` as before and (via `setRestDay`) mirror the date into `frozenDates`; Progress also passes `rest` to the projection.
- A break is a projection (displayed 0, `best` kept); `count` is only rewritten when the next day completes, so declaring a rest day afterwards repairs it.
- Freeze/Yom Tov days are by civil date (Saturday, or a major festival day per `calendar.js` and the calendar's observance mode: reform = first/last day, traditional = two-day diaspora, israel = one-day). Not sunset-aware.
- Completing 5 minutes on a frozen day leaves the count unchanged.
- Rollback: delete the added fields or set `v` to 1; legacy code reads `count/best/last`.
