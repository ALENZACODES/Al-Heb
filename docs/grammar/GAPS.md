# Grammar notes: gaps for a native speaker

Nothing in the grammar screens was typed as Hebrew; every form is sliced from `data/vocab/words.json` or `data/corpus/registry.json`. These things could not be built from that data alone and need a Hebrew teacher to supply or review:

1. **Review of every note.** The English explanations (`data/grammar/notes.json`) and the English glosses of the ten construct chains (`CONSTRUCT_SPEC` in `src/grammar/model.js`) are unreviewed.
2. **Construct state with a changed first noun.** The corpus holds only a few chains. To show the shortened first noun beside its free form (for example a house-of and a house), the vocabulary list would need a `construct` field. Please supply pairs: free form, construct form, gloss.
3. **Definite article with a doubled letter.** Only forms whose base word is spelled identically in the vocabulary list are matched, so forms whose vowels change (for example a base noun with a different first vowel) are skipped. A native list of ha- + noun pairs would widen the set.
4. **Prefix be-/le-/me- with a vowel other than sheva** (be- before a guttural, le- before a sheva, and the ha- contractions such as ba-, la-, ma-). They need the full prefix paradigm table, which is not in the data.
5. **she- examples** are verbs only (the matched nouns are rare); a few noun examples would help.
6. **Plurals.** The plural and gender fields are machine-built; the irregular stems (vowel shifts) are only shown, not explained. A short list of common stem changes would let the note explain them.
7. **Roots.** Only the 1,611 vocabulary entries with a `root` field are used; roots are machine-built and a few families mix words that a teacher would not group. A reviewed family list is needed before this topic is called accurate.
8. **Opening patterns.** Openings are the first three words of each library line. Names for the openings (for example the blessing formula, the call to listen) are not in the data.
