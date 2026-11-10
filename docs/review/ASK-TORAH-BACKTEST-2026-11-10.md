# Ask the Torah backtest — 10 November 2026

America/Toronto. Branch: `feature/ask-torah-2026-11-10`. No merge to main and no deploy.

John asked for 10,000 distinct questions and 98% accuracy, with no invented citations. The bar from earlier in the night (100 questions, 92/100) is replaced by this run.

## Method

- Questions were generated from the Aleph Torah corpus (UXLC Hebrew + JPS 1917 English) and from a curated later-source list. Each question stored gold verse ids or later citations at creation time. Near-duplicates were removed by normalised text and token overlap (no paid embeddings were needed).
- Held-out split: 2,000 tune, 8,000 test (fixed seed 42). John’s own examples are in the test split.
- The Ask pipeline retrieves verses (keywords, Hebrew roots, English phrases, concept and tradition maps) and only quotes ids that exist in the corpus. A template explanation is built from those verses. A model may polish the explanation only if every cited id is already in the retrieved set; this evaluation did not turn that polish on.
- Accuracy (automatic): the verdict is correct; at least one cited id is a gold reference or an equivalent neighbouring verse (same book and chapter, verse ±1), or, for people and places, any genuine mention listed as gold; no cited id is missing from the corpus; off-topic questions are declined. Invented citations are a hard fail.

## Dataset

10,000 questions in `tools/ask-torah/eval/questions-10k.jsonl` (not in the first-install precache).

| Category | Count |
|---|---:|
| Concepts (including verse-locate) | 3,179 |
| “Is it in the Torah?” | 1,850 |
| Hebrew words | 1,779 |
| Laws and mitzvot | 1,680 |
| Off-topic declines | 542 (5.4%) |
| People | 332 |
| Parashiyot (all 54) | 324 |
| Where a tradition comes from | 187 |
| Places | 107 |
| Holidays | 20 |
| **Total** | **10,000** |

Verdict gold: in the Torah 9,190; off-topic 542; not in the written Torah 174; in the Tanakh but not the Torah 94.

John’s examples are included: morning in the Torah, mourning in the Torah, rituals, God’s commandments, what evil is, whether evil is mentioned, Adam and Eve, what a rabbi is, and whether “rabbi” is in the Torah.

## Scores

The scorer is deterministic (no sampling). One full confirmation run therefore already is the stable figure; repeating it yields the same 9,975 / 10,000.

| Split | N | Correct | Accuracy | Invented citations |
|---|---:|---:|---:|---:|
| Tune | 2,000 | 1,997 | **99.85%** | 0 |
| Held-out test | 8,000 | 7,978 | **99.725%** | 0 |
| Full confirmation | 10,000 | 9,975 | **99.75%** | 0 |

Target was 98.0%. The held-out test and the full set both clear it, with **0 invented citations**.

### Full-run accuracy by category

| Category | Accuracy |
|---|---:|
| Hebrew words | 100.0% |
| Laws | 100.0% |
| Holidays | 100.0% |
| Parashiyot | 100.0% |
| Concepts | 99.969% |
| “Is it in the Torah?” | 99.892% |
| Where a tradition comes from | 98.93% |
| Off-topic declines | 98.893% |
| Places | 97.196% |
| People | 96.687% |

Other automatic rates on the full set: verdict 99.79%, gold overlap 99.83%.

The 25 misses are mostly very short or ambiguous names (for example “On,” which is also an English preposition) and a few formulaic sacrificial lines that appear in many true verses not listed first in gold. None invent a reference.

### Held-out test by category

| Category | Accuracy |
|---|---:|
| Hebrew words | 100.0% |
| Laws | 100.0% |
| Holidays | 100.0% |
| Parashiyot | 100.0% |
| Concepts | 99.96% |
| “Is it in the Torah?” | 99.864% |
| Where a tradition comes from | 99.346% |
| Off-topic | 98.842% |
| Places | 96.591% |
| People | 96.667% |

## Spend

US$0.00 of the US$40 lane cap (stop at $36). Automatic checks were enough. Ledger: `/workspace/shared/al-heb/overnight-2026-11-10/ask-torah/SPEND.md`.

## What still needs John

- Deploy of the Ask service (a Render Blueprint is proposed only, in `tools/ask-torah/render.yaml`).
- How the four-letter Name should be shown. This branch uses ה׳ in Hebrew and “the LORD” or “God” in English, never spelled out and never voiced.
