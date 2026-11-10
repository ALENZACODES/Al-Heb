# Questions for a native Hebrew reader, cantor or teacher

Printable, five questions. Nobody has answered any of them: every answer line below is blank, and this file records no review. It comes from the desk review of Hebrew accuracy (`docs/review/3WAY-A-HEBREW.md`, items 1 to 5), which was written by a program, not by a Hebrew reader. The Hebrew and English strings below were copied from the repo data on 2026-11-05 and not changed. The app's current behavior is stated as it is, not as it should be.

How to answer: tick one option or write your own, add your name and the date at the end. "Not my area" is a fine answer.

Reviewer name: ______________________  Date: ______________  Setting you know best (Israeli / Sephardi / Ashkenazi / other): ______________________

---

## Q1. What should the "Sephardi" setting be?

- Where: `src/pronunciation/transliterate.js` (header comment), `data/traditions/sounds.json` (`settings.american`), `src/traditions/model.js` (label), lesson r19 (ayin).
- Current behavior: the setting named `sephardi` is labelled "American synagogue (Sephardi values)". The Latin spelling it shows is identical to the Israeli one. The data file says it is "not a community". For ayin (עוֹלָם) the English line says "silent", while the consonant data stores a throat sound for Sephardi; lesson r19 says so in its goal. Lesson r25 tells the learner "Israeli and Sephardi do not say it doubled" (dagesh), but the pronunciation data says Sephardi doubling is not covered by its sources.
- Options:
  - A. Keep the sounds, rename the setting to say what it is (American synagogue style).
  - B. Build a real Sephardi track for one named community.
  - C. Drop the Sephardi claim and offer Israeli and Ashkenazi only.
- If B: which community (for example Syrian, Moroccan, Iraqi, Yemenite, Spanish-Portuguese)? ______________________
- Does your community double a letter that has a dagesh in the middle of a word; the repo example is the dagesh in the Priestly Blessing word וִיחֻנֶּךָּ (corpus, Numbers 6:25)? Yes / No / Only when reading prayer: ______
- Answer: ______________________________________________________________

______________________________________________________________________

---

## Q2. How should a prefixed Divine Name be written in Latin letters?

Not a hunt for the right spelling of the Name itself: the bare name is already shown as Adonai (Ashkenazi: Adonoy). The problem is only the forms with a prefix letter, which the engine spells out letter by letter.

| Item (repo ID) | Hebrew | Engine output now (Israeli / Ashkenazi) |
|---|---|---|
| vocab `hacf6831d` (example sentence) | וְהִקְטִירוֹ הַכֹּהֵן הַמִּזְבֵּחָה לֶחֶם אִשֶּׁה לַיהוָה | stored translit ends `laivah` |
| corpus `gadlu` | גַּדְּלוּ לַיהוָה אִתִּי וּנְרוֹמְמָה שְׁמוֹ יַחְדָּו׃ | `laivah` / `laivoh` for לַיהוָה |
| corpus `kiddush-zachor` | וְיוֹם הַשְּׁבִיעִי שַׁבָּת לַיהוָה אֱלֹהֶיךָ | `laivah` / `laivoh` |
| corpus `havdalah-opening` (one word) | לַיהֹוָה הַיְשׁוּעָה עַל עַמְּךָ | `laihovah` / `laihovoh` |
| corpus `ashrei-144-15` | אַשְׁרֵי הָעָם שֶׁיֲהוָה אֱלֹהָיו׃ | `sheyavah` / `sheyavoh` |

- Current behavior: the same stored `laivah` ending appears in 8 vocab example sentences. The prefix-less name is replaced by Adonai only when the four letters stand alone.
- Options:
  - A. Replace the Name part with Adonai and keep the prefix (a form like ladonai); you give the exact accepted form: ______________
  - B. Show the Hebrew only, with no Latin spelling for any line that contains the Name.
  - C. Show a fixed label such as "[the Name]" for those lines.
  - D. Something else (a different reading practice for study versus for prayer).
- The pointing of the last item, שֶׁיֲהוָה (chataf patach under the yod), also needs a reader's eye. Is it as printed in your text? Yes / No: ______
- Answer: ______________________________________________________________

______________________________________________________________________

---

## Q3. Ashkenazi cholam: o or oy?

- Where: `data/pronunciation/prayerwords.json` (the `ashkenazi.say` strings), `src/pronunciation/transliterate.js` (option `cholam`, default `o`), `docs/review/ASHKENAZI-CHOLAM.md`.
- Current behavior, in one setting:

| Word | Hebrew | Ashkenazi respelling shown |
|---|---|---|
| haolam | הָעוֹלָם | `ho-OY-lom (some: ho-OH-lom)` |
| torah | תּוֹרָה | `TOY-roh / TOH-roh` |
| shalom | שָׁלוֹם | `SHO-lom` |

  The engine's own output for the same words uses `o` throughout (for example `sholom`, `toroh`). The sounds table says cholam varies by region: oh, oy, ey or ow.
- Options:
  - A. `o` everywhere as the default (sholom, Toroh), with `oy` available as a labelled regional choice.
  - B. `oy` everywhere (sholoym, Toyroh).
  - C. A setting that lets each learner pick their family's version, no default claimed.
- Which one does the community you know use in prayer? ______________________
- Answer: ______________________________________________________________

______________________________________________________________________

---

## Q4. Where does Ashkenazi stress fall on everyday words?

- Where: `src/pronunciation/syllables.js` (stress rule), `data/pronunciation/prayerwords.json` (the ten prayer words, each with a hand-written stress), `data/traditions/sounds.json`.
- Current behavior: for the ten prayer words, stress is taken from the hand-written file (for example בָּרוּךְ `BO-rukh`, second to last). For every other word the Ashkenazi chips put stress on the last syllable, and the code marks the result "not checked for Ashkenazi". Current chip output, with capitals on the stressed syllable:

| Hebrew | Gloss (from the repo) | Chip shown |
|---|---|---|
| תּוֹדָה | thanks | `to-DO` |
| סוּכָּה | sukkah | `su-KO` |
| כֻּלָּם | all of them | `ku-LOM` |
| אִמָּא | mom | `i-MO` |
| פֵּרוֹת | fruit | `pei-ROS` |

  The sounds data itself describes traditional Ashkenazi stress as second to last.
- Options:
  - A. Move stress to the second-to-last syllable for these words.
  - B. Keep final stress but say on screen that it is Israeli stress.
  - C. Show no stress mark for Ashkenazi on words outside the prayer list.
- Is the second-to-last rule right for everyday words in your Ashkenazi setting, and which words are exceptions? ______________________
- Answer: ______________________________________________________________

______________________________________________________________________

---

## Q5. The first cards of the learner deck

- Where: `data/vocab/deck-order.json` (field `pos` is the deck position), `data/vocab/words.json`. The deck order was generated from spelling frequency; the file itself says it is not native-reviewed.
- Current behavior, copied from the data:

| Deck position | Repo ID | Hebrew | Gloss now | Level |
|---|---|---|---|---|
| 1 | `h5c96df63` | מָן | manna | A1 |
| 2 | `ha3cf2c46` | הִוָּה | to constitute | A1 |
| 13 | `h1a3574d3` | יָד | arm (alt: hand; forelimb) | A1 |
| 39 | `h36fae7b2` | אֶדֶן | base, pedestal, socket | A1 |
| 80 | `hcd826bec` | שָׁר | to sing | A1 |
| 404 | `h8e3fbf43` | שָׁם | to assess, appraise | A1 |
| 874 | `hf2bba104` | שָׁם | there | A1 |
| 775 | `he0b2f96b` | תּוֹדָה | gratitude | A2 |
| not in the deck | `h33cf0d1b` | סְלִיחָה | forgiveness, pardon | B2 |
| not in the deck | `h5350449f` | הַיּוֹם | today | B2 |

  Other entries from the same data: שָׁלוֹם (`hf8c8316a`) is glossed "peace" with no hello or goodbye; מַזָּל (`h66ce9ca4`) is glossed "astrological sign" with luck as an alternative.
- Options:
  - A. Move everyday words (hello, thanks, sorry, today, there, hand, luck) to the start and demote rare senses; you mark which of the rows above are rare or archaic.
  - B. Keep frequency order but split rare homographs into a separate "reading the Bible" deck.
  - C. Replace the first 100 cards with a list a teacher writes.
- Which of these would you not teach a beginner in the first week? ______________________
- Answer: ______________________________________________________________

______________________________________________________________________

Sign-off. Name: ______________________  Role: ______________________  Date: ______________

Returned answers still need someone to apply them to the data by hand; nothing here changes the app.
