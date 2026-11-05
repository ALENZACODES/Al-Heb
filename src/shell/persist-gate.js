// Which store writes count as "real progress" for the storage-persistence request (src/app.js).
// Settings never count. The 'streak' key is also written at boot with an empty record (no seconds, no count), which is
// bookkeeping, not engagement; it counts only once it holds time studied or a streak.
export function isRealProgressWrite(key, value) {
  if (key === 'settings' || key == null) return false;
  if (key === 'streak') {
    const r = value && typeof value === 'object' ? value : null;
    return !!r && ((Number(r.todaySeconds) || 0) > 0 || (Number(r.count) || 0) > 0 || (Number(r.best) || 0) > 0);
  }
  return true;
}
