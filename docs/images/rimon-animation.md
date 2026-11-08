# Rimon sprite art direction

Reference: assets/img/gen/MASCOT_rimon.800.webp. Preserve the round red pomegranate body, gold three-point crown, two olive leaves, blue sash, dark eyes, pink cheeks, thin red arms and red feet.

Output: assets/img/rimon/rimon-sprite.png. A transparent square sheet with a regular four-by-four grid, consistent scale and baseline, one complete character in each cell. Keep every limb within its cell. No labels, borders or scenery.

Read left to right, top to bottom:

1. Open eyes, neutral smile, arms down.
2. Half-closed eyes.
3. Closed eyes for a blink.
4. Left wink.
5. Right wink.
6. Yawn, hand near mouth.
7. Stretch both arms up.
8. Laugh, first pose.
9. Laugh, second pose.
10. Happy bounce.
11. Sad, gentle expression.
12. Thinking, hand at cheek.
13. Point upward toward the next-lesson link.
14. Wave inward.
15. Wave outward.
16. Gentle breathing/rest pose.

Cleanup direction: retain every pose, grid position, character proportion and accessory; remove stray flecks, grain and halos outside the character silhouette; preserve transparency.

The frame index and animation sequences live in src/shell/rimon-model.js. Background positioning selects each equal grid cell; the entire sheet is fetched once. The older rimon-frames.csv is a historical individual-frame proposal, not the active sheet layout.
