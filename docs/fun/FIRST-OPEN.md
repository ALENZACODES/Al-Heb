# ALEF — First open (cold start → tradition pick → first win)

**Audience:** product + ChatGPT wiring. **Freeze:** do not change Ari / Noa / Rimon faces or production WaveNet/Chirp voices. Novelty = situations + mechanics only.  
**Identity Test:** if the learner can “win” without doing the Hebrew skill, redesign.  
**Progressive depth (locked):** Day 1 is a quiet doorway — one CTA, one turn — not a lobby with every wing lit. See `/workspace/shared/al-heb/progressive-depth-note-2026-11-05.md`.

**Clock:** times below are design budgets (America/Toronto learner). Not measured yet.

---

## Exact first 60–90 seconds

### 0:00–0:08 — Cold start splash (no chrome dump)
- Cream card, ALEF wordmark + Hebrew אלף (DOM text; no text inside images).
- One line: **“Hebrew you can hear, say, and use — starting now.”**
- Single button: **Start** → `#/welcome`.
- No tile grid, no quest board, no Speak Spark, no album tree.

### 0:08–0:25 — Goal + letters (existing `#/welcome` stage 1)
Keep the current two-question screen; tighten copy only:
1. **What do you want first?**  
   - Read prayers / Torah  
   - Speak in Israel  
   - Both (or not sure)
2. **Can you already read the Hebrew letters?**  
   - No → `#/firstday`  
   - Some / Yes with vowels → `#/placement`

Continue saves `onboarding.v1` + `settings.onboarded` / `goal` (already wired).

### 0:25–0:45 — Tradition pick (stage 2; skipped if goal = Israel)
- **Which pronunciation do you want?** Israeli / Sephardi / Ashkenazi  
  - One-line honesty each (existing `PRONUNCIATIONS[].changes`).  
  - Sound note from `audioSupport` — never fake missing tradition audio.  
  - Optional: **Start without sound** (audio-free path of equal dignity).
- Denomination stays collapsed under “Optional”.
- Primary: **Continue**. Secondary: **Skip** (keep current congregation).

**Game beat (Identity Test):** choosing a tradition is not XP — it sets which ear the app trains. No points here.

### 0:45–0:55 — Plan card (stage 3 / plan)
- Skip the long 7-day essay on first open: show **one** primary action only.
  - Beginners (`letters:none`): **Speak your first word — about a minute** → `#/firstday` (or `#/speak` once DSS doorway ships; until then `#/firstday`).
  - Placement path: **Take the short check** → `#/placement`.
- Minutes default 5 (streak floor). “Change minutes” stays under a details fold.
- Quiet honesty: *Draft plan — minutes are goals, not measurements.*

### 0:55–1:30 — First win (game-driven)

**Path A — true beginner (firstday)**  
1. One letter (Shin) **Hear → Say → Done** (three calm outcomes: Said it / With help / Heard only).  
2. Immediate win copy: **“You said ש — Shin. Saved on this device.”**  
3. Offer: **One more** or **Done for today**.  
No rhythm dots, no quests, no tradition quiz yet.

**Path B — some letters (placement)**  
1. Up to 6–8 short items (existing placement).  
2. Land on recommended lesson with primary **Continue: lesson rNN**.  
3. First win = finish one micro-activity that requires production (say or build), not tap-only MC.

**Path C — Israel goal**  
1. Skip tradition stage (Israeli locked).  
2. First win = one street phrase Hear → Say → Done from the Israel track opener.

### After first win — Home (`#/`)
- Progressive depth **tier 0**: Home shows **one** primary (“Speak today — about a minute” or Continue firstday) + muted link to Settings.  
- Reveal ladder stays invisible until thresholds (3 turns / return day, etc.).

---

## Identity Test checklist (first open)
| Moment | Skill required to proceed | Fail if… |
|--------|---------------------------|----------|
| Tradition pick | Choosing the sound world you’ll train | Awarding XP for the tap |
| First Hear → Say → Done | Producing or honestly marking the phrase | Advancing on “Heard only” as a *mastery* win (it’s allowed as outcome, not as mastery seed) |
| Firstday Shin | Saying/recognizing Shin | Skipping via decorative animation alone |

## Freeze / honesty
- Cast art: reuse existing Ari/Noa/Rimon only if already on-screen assets; no new faces.  
- Audio: use production paths `audio/<m|f>/<tradition>/<kind>/<id>.mp3` when present; otherwise device voice / silent with honest label.  
- Never copy Israeli MP3s into Sephardi/Ashkenazi folders.

## Wire targets (existing)
- `src/onboarding/firstrun.view.js`, `src/onboarding/model.js`  
- `src/shell/home.view.js`, `src/home/today.js`  
- `src/firstday/*`, `src/speak/*` (DSS)  
- Docs: `docs/onboarding/FLOW.md`
