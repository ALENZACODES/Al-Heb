# Meet-the-letter cartoon pack — status

**Date:** November 5, 2026  
**Coverage:** 22 alphabet letters + 5 final forms = 27 forms.  
**Stage:** complete local working drafts; external review not run.  
**Images:** zero generated. No Git branch or main changes.

## Important provenance

No browser/computer-control tool is available in this run. Therefore the requested live ChatGPT brainstorm → Claude refinement → ChatGPT prompts/scenes exchange could not be executed. `BRAINSTORM-chatgpt-round1.md` is a **local round-1 draft prepared for ChatGPT**, not a received ChatGPT message. `BRAINSTORM-claude-round2.md` is a **provisional local review**, not a received Claude response. JSON `claudePick` and `claudeNotes` are intentionally null. Image prompts are provisional and use working picks, not claims of Claude selections.

## Files

- `letter-metaphors.json`: all 27 forms, 3 analogies each, working pick, one-line explanation, confusion notes, teaching beat, external-refinement placeholders.
- `BRAINSTORM-chatgpt-round1.md`: readable round-1 working pack.
- `BRAINSTORM-claude-round2.md`: selector rubric, working picks and visual/font risk flags.
- `IMAGE-PROMPTS-batch01.json`: 27 prompt + four-step intro-scene records, ready for 100-item batches.
- `PASTE-01-chatgpt-brainstorm.md`: round-1 exchange brief.
- `PASTE-02-claude-refine.md`: refinement exchange brief.
- `PASTE-03-chatgpt-image-scenes.md`: prompt/scene and optional three-image sample brief.
- `validate.py`: coverage/schema/provenance validation.

## Required next step

Run the three paste briefs in order with the relevant JSON attachments in a browser-enabled session. Save actual replies verbatim, apply Claude's 27 `claudePick`/`claudeNotes` values, then regenerate prompts/scenes from those selections. Only then request alef/bet/shin sample art. Do not push this unreviewed pack into production.

## UX safeguard

The art contains no writing. Hebrew, English and phonetics are readable app typography (Hebrew → English → phonetics), with right-to-left arrows on reading screens. Generated glyphs are never accepted as correct typography. Finals are taught as word-end forms, not 5 extra alphabet letters.
