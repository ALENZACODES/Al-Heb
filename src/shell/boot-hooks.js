// @ts-check
// Boot hooks the shell can call once at start-up. Kept tiny and lazy so they cost nothing when reminders are off.
/**
 * Re-arm the daily study reminder from the saved "notify.prefs" (no-op without permission, prefs, or Notification).
 * Never throws and never asks for permission. Call with the shell's ctxBase ({store, settings}).
 * @param {{store?:{get:Function}, settings?:{get:Function}}} ctx
 */
export async function armReminders(ctx) {
  try {
    const { armFromPrefs } = await import("./notify.js");
    return await armFromPrefs(ctx);
  } catch (e) { return { ok: false, reason: String(e?.message || e), next: null, cancel() {} }; }
}
