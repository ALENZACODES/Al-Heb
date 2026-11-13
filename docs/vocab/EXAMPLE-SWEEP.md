# Example Sweep (12 Nov 2026)

John's spot check of 50 dictionary entries found that about 1 example sentence in 5 illustrates the wrong word, almost always a look-alike: the sentence's word shares the entry's letters and is a different word (מסירה "delivery" under a sentence where מסירה is "I take off"). This sweep looked for that across every example in `data/vocab/words.json` and took the doubtful ones off their entries.

## What Was Done

- All 5,705 examples (of 6,303 entries) were read in their own sentence, and the word the entry matched was compared with the entry: same dictionary form and a part of speech the entry allows, or not.
- **1,443 examples were held** (25.3%): 1,337 Tatoeba sentences and 106 verses. 4,262 entries still have an example.
- A held example is removed from the entry and from its pack file. It is kept whole in `data/vocab/corrections.json` (`old`), with the reason, so it can be put back.
- **No sentence was written or swapped in.** An entry whose example was held now has none.
- **No lemma field was touched**: no pointing, gloss, part of speech, gender, forms, root or binyan. For הָרֶה the example had already been held, and its plural form fixed, by the lemma fixes on main; this sweep did not touch that entry.

## Why Each Was Held

| Reason | Held | Example |
|---|---|---|
| The word is the same letters but another part of speech than the entry | 695 | חָד (verb, "to pose a riddle") under a sentence where חוד is the noun "tip" |
| The word is read as another dictionary word | 487 | הִפְנִים under "the Japanese (יפנים) eat three times a day" |
| No dictionary form could be read, and the part of speech cannot be the entry's | 182 | נִנְעַל (verb) under "I lost my shoe (הנעל)" |
| The word is a name in that sentence, and the sentence's English shares no word with the entry's meaning | 79 | מָג ("mage") under "Meg must carry on her studies" |

An example was kept when the two agree, when nothing could be read either way but the part of speech fits (405), when the word is letter for letter a form the entry lists and the part of speech fits (179), when a pointed verse carries exactly the entry's own vowels and the word is not a name there (79), or when a second reading agreed with the entry (3).

All nine wrong examples named in the spot check are now off their entries (the הָרֶה one was held by the lemma fixes on main, the rest here).

## How Sure

- The reading was done with the open DictaBERT tools pinned in the tools repo (ALENZACODES/alef-tools, `packages/morph/scripts/sweep_examples.py`; the full list with a verdict and the evidence for every example is `packages/morph/review/example-sweep.json` there). They are right most of the time, not always.
- In a look at 50 holds drawn at random, about 42 were right to hold and about 8 were sentences that did fit their entry (mostly rarer verbs whose dictionary form was misread, and a few verses). So expect roughly one held example in six to have been fine. Nobody who reads Hebrew natively has checked the list.
- The other direction was not measured: some wrong examples will have been kept, above all where a look-alike has the same part of speech and is itself a listed form.
- Verses are the weak spot. These tools are built for modern Hebrew; 106 of 433 verse examples were held and more of those holds will be mistaken than for everyday sentences.
- The rule followed was the one John set: a held example is better than a wrong one.

## Putting One Back

Delete its entry from `data/vocab/corrections.json` (field `example`, reason ending "(example sweep, 12 Nov 2026)"), restore the `old` value as the entry's `example` in `data/vocab/words.json` and in its pack file, then run `node tools/vocab/attribution.mjs` and the tests. To run the sweep again after the list changes: run the script in the tools repo, then `node tools/vocab/hold_examples.mjs --sweep <list>` and `node tools/vocab/apply_corrections.mjs` here.
