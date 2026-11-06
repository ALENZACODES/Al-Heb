# ALEF — Game loops (aligned to t1039u)

**TRY → SAVE → PERSONALISE.** Minute One is Game 0.  
**Two registers:** joyful drills may use seeds; **reverent** prayer/siyum never shows XP/mascots on the sacred text.  
**Freeze:** Ari/Noa/Rimon + ALEF colors; production voices untouched. Feather-green = competitor ref only.

XP (joyful only): **+1** micro · **+3** lesson exit · **+5** drill PB. Sacred surfaces: gratitude copy, not seed bursts.

---

## 0) Minute One — Build אבא (first-open, mandatory doorway)
- **Skill:** Assemble א+ב+א; meet niqqud; survive first fade.  
- **Play:** ~7 beats, &lt;60s, no hearts.  
- **Win:** Word built + fade seen.  
- **Finish order:** haptic → large Hebrew → accuracy+time → Day-1 streak → share card → Save (Create profile | Later equal) → personalise.  
- **Route:** `#/firstwin`  
- **Register:** Joyful.

## 1) Daily Speak Session (DSS) — progressive depth
- Hear → Say → Done; tier 0 after Minute One.  
- Win: spoken outcome. Seeds on Said it / With help.  
- Route: `#/speak` · Home CTA.

## 2) Letter Rush (joyful)
- 60s tap-called-letter. Win ≥10 correct. +1 seed.

## 3) Sofit Sniper (joyful)
- Final forms. Streak of 5. +1.

## 4) Niqqud Fade — Dimmer Boss (joyful → bridge)
- Acts 1–5; bare badge. +3. Echoes Minute One fade.

## 5) Prayer Karaoke (reverent)
- Follow / Perform / Hazzan.  
- Win: personal fluency.  
- **UI:** no confetti on Amen; quiet “the hazzan waits” retry.  
- Engaged time may count for streak without fireworks.

## 6) Tradition Detective (joyful listen)
- Name the tradition; field notes. Text mode until Sephardi/Ashkenazi audio pending=0. +1/+3 weekly case.

## 7) Today’s Mix (joyful composer)
- 5 minutes, 3 tiles; **hidden until** progressive-depth gate (after returns). Not Day-1 Minute One.

## 8) Word Sprint (joyful)
- Due vocab; Ghost Race later. +1 / +3 PB.

---

## Sacred close pattern (any prayer game)
1. Speak or hear the last line.  
2. One gratitude sentence.  
3. Soft “Open next” — no XP toast overlapping the Hebrew.

## Implementation
- `#/firstwin` ships before personalise.  
- `#/welcome` = personalise after win (or Settings).  
- Share card reuses cream `--card` / navy `--accent` — Calm structure, ALEF skin.  
- Haptics: existing `hapticsOn` in `exercises.session.js`; celebration pulse once.
