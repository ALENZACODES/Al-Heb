// Poll a condition instead of sleeping a fixed time. Resolves with the
// condition's truthy value; rejects with a clear message on timeout.
export async function waitFor(cond, { timeout = 5000, step = 10, message = "" } = {}) {
  const t0 = Date.now();
  let last;
  for (;;) {
    try { const v = await cond(); if (v) return v; last = undefined; }
    catch (e) { last = e; }
    if (Date.now() - t0 >= timeout) {
      throw new Error(`waitFor timed out after ${timeout}ms: ${message || String(cond).replace(/\s+/g, " ").slice(0, 160)}` + (last ? ` (last error: ${last.message})` : ""));
    }
    await new Promise((r) => setTimeout(r, step));
  }
}
