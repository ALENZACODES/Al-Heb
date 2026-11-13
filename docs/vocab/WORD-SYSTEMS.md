# Vocabulary Systems (12 Nov 2026)

Two of the ten vocabulary ideas in group P are built here. Both are preview pages, both are drafts, and both say so on screen.

## Look-Alike Words (`#/pairs`)

A tell-them-apart drill for words a learner mixes up.

- **Where the pairs come from.** `tools/vocab/build_confusables.mjs` reads `data/vocab/words.json` and writes `data/vocab/confusables.json`. Nobody picks or checks a pair by hand. Three rules:
  - **Look alike**: the spellings without vowel marks are one letter apart, or two neighbouring letters change places (עָבַד / עָבַר). Pairs on letters that look alike in print (ד/ר, ב/כ, ה/ח and so on) come first.
  - **Sound alike**: the "sounds like" spellings are the same, or one sound apart for longer words, and the Hebrew letters differ (אִם / עִם, כָּל / קוֹל).
  - **Same letters**: the same letters with different vowel marks (דָּבָר / דִּבֵּר).
- **What is left out.** Entries that are hidden, are more than one word, share an English meaning, share family letters, have broken vowel marks, or sit below frequency rank 4,000. The divine Name is never in a pair.
- **Size.** 1,200 pairs (400 of each kind) over 1,330 words, 214 KiB, fetched when the page first opens. A word joins at most two pairs of a kind.
- **The drill.** A round is 8 pairs. Each question shows one side (a meaning, or a Hebrew word) and offers the two words of the pair. After the answer both words are shown with how they sound, what they mean, a Listen button where the app has a clip, and one line on what differs. Missed pairs come back first in the next round.
- **Browse.** Every pair of a kind, searchable by Hebrew letters, English or sounds-like.
- **Stored.** `pairs.v1`: right and wrong counts per pair and totals, on this device only. Listed on the privacy page.

Limits: the rules find pairs that are close on the page or in the ear. They do not know which pairs learners really confuse, and some pairs are easy. The "sounds like" spellings follow the Israeli pronunciation, so a pair that sounds alike there may differ in another tradition. No Hebrew teacher has looked at the list.

## Family Tree (`#/roots`, "Family tree")

A new mode on the Roots page. The plain list, the seven patterns, the verb forms and both drills are unchanged.

- Browse all word families by first letter (22 letter buttons, with counts).
- Open a family as a tree: one branch per pattern for verbs, in the taught order, then nouns, adjectives and the rest. Most common word first on each branch.
- Tap a word for its meaning, how it sounds, its kind and pattern, its level, a Listen button where the app has a clip, and a link to its verb forms.
- Step to the previous or next family, or switch to the same family as a plain list (and back).
- Deep link: `#/roots?mode=tree&letters=<family letters>`.

Nothing is added to a family. The tree shows the same words as the plain list, from `data/roots/families.json`. No family is confirmed by a Hebrew reader yet, so the page keeps saying "family letters", and loose matches are marked on the word's card.

The Listen button moved into `src/roots/listen.js` so both pages share one copy. Its behaviour is the same.

## Not Built Yet

Cognate finder, collocation drills, semantic field maps, the Core-500 challenge, word of the day, themed journeys. "Homonym hunter" overlaps with the Same letters set here and has no page of its own. "Hebrew in English" already has a page (`#/loanwords`) and was not touched.

## Rebuilding

```
node tools/vocab/build_confusables.mjs          # after data/vocab/words.json changes
node tools/vocab/build_confusables.mjs --check  # exits 1 when the list is stale
node tools/seo/build-sitemap.mjs && node tools/docs/index.mjs && node tools/build-precache.mjs
```
