// Shared helpers for the retention tests. Every test runs in America/Toronto unless it changes the zone itself.
process.env.TZ = 'America/Toronto';
export const T = (s) => new Date(s).getTime(); // "2026-11-10T19:00" is read as local time
/** A v2 streak record. */
export const streakRec = (o = {}) => ({ v: 2, count: 10, best: 10, last: '2026-11-09', todayDate: null, todaySeconds: 0, frozenDates: [], doneDates: [], freeze: false, mode: 'reform', ...o });
