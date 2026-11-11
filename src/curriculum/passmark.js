/** C-01 pass mark for lesson quick checks and test-outs (pure, no imports). */
/**
 * A lesson counts as done only when the learner gets at least this share of its quick check right on the FIRST try.
 * Retries teach, but they do not count toward the pass. The rule is shown before the lesson starts (passRuleText).
 */
export const PASS_SHARE = 0.7;
/** Questions that must be right on the first try for `n` questions (at least 70%, rounded up; at least 1 when n > 0). */
export const passMark = (n) => (n > 0 ? Math.max(1, Math.ceil(PASS_SHARE * n - 1e-9)) : 0);
/** Did `right` first-try answers out of `n` questions pass? A check with no questions never passes. */
export const passed = (right, n) => n > 0 && right >= passMark(n);
/** The rule in words, for the lesson intro and the test-out screen. */
export function passRuleText(n) {
  if (!n) return "";
  const need = passMark(n);
  return `To pass: at least ${need} of ${n} right on the first try (${Math.round(PASS_SHARE * 100)}% or more). Below that the lesson is not marked done, and no lesson XP is given; your review cards are still updated, and you can try again.`;
}
/** "1 retry so far" / "2 retries so far" (empty for none). */
export const retryText = (n) => (n > 0 ? `${n} ${n === 1 ? "retry" : "retries"} so far` : "");

