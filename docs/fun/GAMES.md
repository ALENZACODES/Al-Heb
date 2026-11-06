# ALEF — Concrete game loops (launch set)

**Identity Test** on every loop. **Freeze:** no cast restyle, no production-voice swap. XP = personal progress seeds (Album / streak minutes), never stranger leaderboards by default.

XP legend (local, device-only): **+1 seed** small win · **+3** lesson exit · **+5** karaoke Perform personal best. Seeds feed Rimon’s Album later; until Album ships, store as `progress` / `speak.v1` counters only.

---

## 1) Daily Speak Session (DSS) — progressive depth core
- **Skill:** Produce today’s phrase.  
- **Play:** Hear → Say → Done; outcomes Said it / With help / Heard only.  
- **Depth:** Tier 0 only at first open; rhythm / Spark / quests reveal per progressive-depth ladder (not Day 1).  
- **Win:** Spoken outcome logged; streak clock can tick toward 5 min.  
- **XP:** +1 seed on Said it / With help.  
- **Routes:** `#/` CTA → `#/speak` or firstday doorway.  
- **Cast/voice:** unchanged; use selected tradition audio when present.

## 2) Letter Rush
- **Skill:** Letter recognition under light time.  
- **Play:** 60s; audio/translit calls a name; tap matching letter glyphs. Sofit only in final-position frames from level 3.  
- **Win:** ≥10 correct OR survive 60s with accuracy ≥70%.  
- **XP:** +1; +3 if sofit round cleared.  
- **Routes:** Letters home card; warm-up before prayer lesson.  
- **Assets:** Existing letter SVGs; `letter` audio.

## 3) Sofit Sniper
- **Skill:** Final forms ך ם ן ף ץ.  
- **Play:** Word with last letter blank; choose base vs sofit before 3s “sets.”  
- **Win:** Streak of 5 correct.  
- **XP:** +1 per streak-5; wrong shows one-line rule.  
- **Identity:** Cannot win by spam-tapping — only one sofit fits.

## 4) Niqqud Fade — Dimmer Boss
- **Skill:** Pointed → bare reading.  
- **Play:** 5 acts; dimmer removes niqqud from strongest words first; fail flickers points back on that word only.  
- **Win:** Act 5 bare line read (self-mark or speak).  
- **XP:** +3; bare-text badge on that line.  
- **Routes:** `#/fade`, `#/nikkudfade`, prayer reader tool.

## 5) Prayer Karaoke
- **Skill:** Fluency + keeping place.  
- **Modes:** Follow (unscored) · Perform (personal score) · Hazzan (dropouts).  
- **Win:** Follow complete; Perform beats yesterday’s personal best *or* finishes clean.  
- **XP:** +1 Follow · +5 Perform PB.  
- **Audio:** `line`/`prayer` production paths; slow/slower rates already in settings.  
- **Routes:** `#/speak` read tab / `#/read` / corpus prayer cards.

## 6) Tradition Detective
- **Skill:** Discriminate Israeli / Sephardi / Ashkenazi cues.  
- **Play:** “Whose mouth is this?” — audio when all three exist; until then **text mode** with stress/tav/kamatz tells (existing `#/tradition-quiz` upgraded with field notes).  
- **Win:** ≥7/10 round; unlock one field-note card (from `ai-studio-2026-11-06/tradition-detective/`).  
- **XP:** +1 round; +3 for weekly Sunday case.  
- **Honesty:** Label missing audio inside the play. Never fake tradition by copying Israeli MP3s.

## 7) Today’s Mix (composed 5 minutes)
- **Skill:** Spacing engine chooses content; learner chooses costume.  
- **Play:** Three tiles, one button **Start my five minutes** — e.g. Letter Rush · Karaoke line · Memory Orchard.  
- **Win:** Complete the composed set (or 5 engaged minutes).  
- **XP:** +3 for finishing Mix; seeds inherit from sub-games.  
- **Home slot:** Under Continue rail (Fun plan §3.1); **hidden on Day 1 tier 0** — reveal after ~3 spoken turns / second day.

## 8) Word Sprint (existing, social later)
- **Skill:** Due-vocab recall speed.  
- **Play:** Existing `#/sprint`; optional Ghost Race vs last-week self.  
- **Win:** Complete N cards; personal-best gain celebrated, not stranger rank.  
- **XP:** +1 per clear round; +3 weekly PB gain in a Circle (later).

---

## Stretch (spec only this pass — do not dump on Day 1)
Root Forge · Ari & Noa Story Mode · Shuk Haggle · Bus! · Rimon’s Album (613) · Streak Quests · Blessings Reflex · Quiet Game — full specs in `fun-deep-alive-plan-2026-11-05.md` Games 5–27.

## Implementation notes for wiring
1. Prefer enhancing existing routes over new top-level chrome.  
2. Tradition Detective: wire field notes into `tradquiz` feedback panel; audio doors unlock when `audio/{m,f}/{tradition}/…` counts cross a gate.  
3. Today’s Mix: pure composer in `src/home/` reading due + unlock tier; render three links max.  
4. No hearts/energy; no streak shame; Shabbat freeze untouched.
