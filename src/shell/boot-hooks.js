// @ts-check
// Boot hooks the shell can call once at start-up. Kept tiny and lazy so they cost nothing when reminders are off.
/**
 * Re-arm the daily study reminder from the saved "notify.prefs" (no-op without permission, prefs, or Notification).
 * Never throws and never asks for permission. Call with the shell's ctxBase ({store, settings}).
 * @param {{store?:{get:Function}, settings?:{get:Function}}} ctx
 */
export async function armReminders(ctx) {
  try {
    // Cheap check first: with reminders off (the default) the notify and calendar modules are never fetched at boot.
    const raw = ctx?.store?.get ? await ctx.store.get("notify.prefs") : null;
    if (!raw || raw.enabled !== true) return { ok: false, reason: "disabled", next: null, cancel() {} };
    const { armFromPrefs } = await import("./notify.js");
    return await armFromPrefs(ctx);
  } catch (e) { return { ok: false, reason: String(e?.message || e), next: null, cancel() {} }; }
}
