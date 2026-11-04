# Image run: how to produce the 797 images (766 from the doc + 31 quirky mnemonics)

Source (groups 1-100): Prompt document "100 ChatGPT commands for the Hebrew image lane" (d497130e-096d-494b-9242-461c91da56e1). Machine-readable form: `data/images/prompt-groups.json` (101 groups, 797 rows: groups 1-100 are the doc, group 101 is lane 7's addition)  and `data/images/manifest.csv`. Rebuild with `node tools/images/build_prompt_groups.mjs`.

## Count discrepancy (reported, not fudged)
The doc states A 32, B 270, C 162, D 75, E 150, F 76 = 765. Its commands actually name A 31, B 270, C 162, D 75, E 150, F 78 = 766 files (F is 79 if the optional icon grid image is counted). Block A: the cup sample, 2 sheets, 8 expressions, 4 variants, 6 mouths, 2 frames, 6 backgrounds, 2 tests = 31 (command 9 is text-only). Block F: 6 + 10 + 8 badges + 8 locked + 40 icons + 6 brand = 78. See `meta.discrepancies` in the JSON. Decide which side is right (probably the doc's stated counts are stale). Block G adds 31 more: manifest total 797, of which the doc's own commands give 766; the log in `meta.discrepancies` lists A, F, G and the total.

## Block G: quirky mnemonic images (command 101, NOT in the doc)
31 rows `L<nn>_<letter>_quirky.png` (27, one per contract letter id) plus `_quirky_vet`, `_quirky_khaf`, `_quirky_fe`, `_quirky_sin` (the four sound-variant forms). The subject of each is the `imageIdea` in `data/letters/mnemonics.json`, read when `node tools/images/build_prompt_groups.mjs` runs (re-run it after lane 2 refines that file; `tests/book.images.test.js` warns, but does not fail, when the prompts are stale). The four variant ideas are written by lane 7 from the existing story sentences (listed in `QUIRKY_VARIANTS` in `tools/images/spec.mjs`); they are not in mnemonics.json. The 27 letters are 27, not ~31: the extra four are the variants. One idea ("a fence of letters", lamed) is rewritten to "a fence of plain wooden planks" in the prompt so the model is not invited to draw lettering. Every prompt carries the style guide, a quirky addendum, the no-text rule and "do not draw any letter"; the Hebrew is overlaid as vector (`tools/images/overlay.mjs`) in the book chapter and on the flashcards. The older `L<nn>_<letter>_print_mnemonic` rows stay; the quirky set is an alternative/extra picture, and the book's "Remember every letter" chapter and the flashcards use the quirky one. Run it as `node tools/images/gen_via_api.mjs --block G` (not run).

## Path 1: human with ChatGPT (the doc's plan)
1. New ChatGPT Project. Paste the "6-hour work order" from the doc as the first message; attach/paste the 100 commands.
2. Say `next` repeatedly. Per image ChatGPT prints `FILE: | SET: | PROMPT: | NOTES:`.
3. Before Block C, supply the 27 `REF_cursive_<name>.png` silhouettes: made, in `assets/img/refs/` (1024x1024, black on white, Gveret Levin; regenerate with `node tools/images/make_cursive_refs.mjs`). 27 matching `REF_print_<name>.png` print-letter silhouettes (Noto Serif Hebrew, semibold) are beside them. They live in a subfolder so they are never mistaken for finished manifest images. Contact sheet checked by eye; the glyph is the plain letter, no niqqud.
4. Save images under the exact names in `manifest.csv` into `assets/img/`, then run `node tools/images/make_placeholders.mjs` (refreshes `assets/img/index.json`).
5. Limits (doc, unverified): ~40 images / 3 h, ~200 / day on Plus, so about a week.

## Path 2: the script (needs an API key and org verification; NEVER RUN so far)
```
node tools/images/gen_via_api.mjs --block A                  # dry run (default): prints the plan, no network
OPENAI_API_KEY=sk-... node tools/images/gen_via_api.mjs --live --block A --variants 3
```
Order matters: Block A first (character sheets and BG_ scenes are reference images for later rows; approve them and copy into `assets/img/` so `refs` resolve). Options: `--command N`, `--match substr`, `--limit N`, `--no-resume`, `--delay MS`, `--model`, `--quality`. Output: `assets/img/generated/<stem>__v<k>.png`; log `data/images/gen-log.jsonl` (resume skips logged-ok and existing files). The default model name `gpt-image-2.5` comes from the research and is unverified; override with `--model` / `OPENAI_IMAGE_MODEL`. Sizes are mapped to 1024x1024 / 1536x1024 / 1024x1536; resize to the manifest dimensions afterwards (icons are 512 transparent: the API call does not request transparency, so redo icons by hand or with the background parameter after checking the API docs).

## Naming
`L<nn>_<letter>_<print|cursive>_<suffix>.png` (print suffixes mnemonic, ari, noa, silhouette, v1-3, s1-3; cursive: mnemonic, ari, noa, silhouette, trace, postcard); `<letter>` = contract id with `-` -> `_` (kaf_final). `V<nn>_<vowel>_<keyword|ari|noa|position|card>.png`; `VOC_<theme>_<01-10>.png`; `PRAY_blessing_01-06`, `PRAY_track_01-10`; `BADGE_01-08[_locked]`; `ICON_<name>`; `BRAND_<name>`; `CHAR_`, `MOUTH_`, `FRAME_`, `BG_`, `TEST_`, `STYLE_`. Doc command 9 lists a different suffix set than the templates; the templates are followed. `tests/book.images.test.js` enforces uniqueness.

## QA checklist (every image)
- [ ] No text of any kind: no Hebrew, no nikkud, no Latin letters, no numerals, no letter-like marks (zoom in; check signs, books, tablets, cards).
- [ ] Style drift: flat vector, thick rounded outlines, cream #F6F1E7 background, palette only, no gradients/photoreal, light from upper left, 10% margin.
- [ ] Off-model characters: Ari and Noa match the approved sheets (hair, skin, clothes, line weight). The doc assumes 15-25% drift (unmeasured); budget regenerations.
- [ ] Mnemonic images: object silhouette plausibly echoes the stated shape (the overlay is judged by eye in the book).
- [ ] Cursive sets: object echoes REF silhouette, not print shape.
- [ ] Empty areas really empty (frames, position cards, blank screens/covers/price tags).
- [ ] Dimensions/aspect match the manifest row; transparent PNG for icons.
- [ ] Cultural check: kippah/tallit/tefillin/seder plate/menorah details by a knowledgeable reader.

## Licensing caveats (from the research; not legal advice)
- OpenAI terms assign output rights to the user and allow commercial use, but US Copyright Office practice (Thaler denial) means unmodified AI images are likely not copyrightable in the US. What you own outright is the overlaid Hebrew type, layout and your edits; keep a record of human edits.
- Do not claim the images are human-made. Credit line for the colophon: "Illustrations created with AI tools and edited by the author."
- Midjourney (revenue threshold, trial CC BY-NC) and Flux dev (non-commercial) are not recommended; OpenAI/Firefly/Flux schnell are the commercially cleaner options per the research. OpenAI's own current terms were NOT fetched in this build; read them before the run.
