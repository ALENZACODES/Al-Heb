# Questions for a rabbi or cantor

ALEF is a free Hebrew reading and prayer-learning app used by learners from many American synagogues. A machine and a
non-clergy author built the content; no clergy member has reviewed it. Please answer in the margin. Examples are in the app.
Reviewer: ____________  Movement/community: ____________  Date: ________

## A. The divine name
1. When a learner sees the four-letter name in a prayer, we show the Hebrew as in the source and say Adonai in audio and respelling.
   Is that acceptable for your community?  Yes / No / Only if: ________
2. Prefixed forms (for example "to the Name" in Gadlu, "for the Name your God" in Shabbat Kiddush, "that the Name" in Ashrei).
   What is the correct spoken form, with its vowels, for each, and how should it be respelled for learners? We have not guessed one. ________
2c. The name written after a maqaf (for example in the Kedushah line that has "glory of" joined to the name) is now sent to a voice as the
    spoken Adonai, and a prefixed form is sent as its prefix as written plus the spoken Adonai (one shared rule in `src/shell/names.js`, used by /read,
    /torahreader and all other speech). This is applied by default pending your review. Is substituting inside a maqaf compound acceptable, and is the
    prefix pointing we keep from the source right? ________
3. Lessons show the name once, with the note "Never pronounce the four letters as written; say Adonai". Is it appropriate to include
   it as a word to recognise, or should the lesson skip it?  Keep / Skip / Change the note to: ________
4. Some printed texts use Adonai, others Hashem, others a he with a geresh or two yods. Which should the app show in Hebrew display
   (as in the source, or a single substitute), and should it be a user setting?  ________
5. Spoken substitutes: for casual contexts (not praying) do you prefer Hashem? Where should the app use Adonai and where Hashem? ________
6. The source text in the app includes a pointing with a cholam on the he (a Jehovah-style form) in places. Keep as in source, or normalise? ________
7. The typing practice asks learners to type the name in blessing formulas (Baruch ata ...). Is typing/writing the name acceptable in
   a learning context, or should the drills use the substitute?  Acceptable / Use a substitute: ________
8. Audio: the recorded clips will say Adonai for the name. Are there phrases where the recording should say Hashem or pause instead? ________

## B. English text
9. Translations in the app write "the LORD" and "God". Should English text offer an optional "G-d" spelling (a setting, off by default)? Yes / No
10. Is "the LORD" (capitals) understandable and respectful as the English rendering of the name, or should it read "Adonai" or "the Eternal"? ________
11. One lesson title reads "Start your day with God". Fine, or rephrase? ________
12. Some glosses from the vocabulary source mention "Jehovah" or "Yahweh" (for example an example sentence about a religious group).
    Remove or rewrite these?  ________

12a. The "G-d" setting (off by default) now rewrites the word "God" in English glosses, translations and review answers in several screens
    (Torah reading, traditions, festivals, review, typing, search results). It does not change "the LORD" or Hebrew. Is that the right scope? ________
12b. When the browser's own voice reads a bare four-letter name in any screen, the app now sends it the pointed Adonai. Prefixed forms
    and names after a maqaf are covered by question 2c. Is that acceptable meanwhile? ________

## C. Movements and gender
13. The app prints the traditional (Orthodox-standard) Hebrew only for Avot, Gevurot and the Amidah blessings. Reform and Conservative learners
    may expect the matriarchs (Sarah, Rivkah, Rachel, Leah). The app says "One version shown". Is that wording right and sufficient? ________
14. Should we add the matriarch versions? If so, which exact texts and from which siddur do you recommend, and can we reproduce them
    (licence)? ________
15. Mi Sheberach and the Avot closing line: same questions as 14. ________
16. Gender-neutral or egalitarian variants (God language, "bnei Yisrael", who is called to the Torah, Aleinu, Yigdal, Lecha Dodi).
    Which should the app mention, and how neutrally should we word the notes? ________
17. Please check the denomination notes in `data/corpus/prayer-meta.json` (70 prayers; 27 say "unknown"). Mark each note correct / wrong / delete. ________
18. Is "Orthodox / Conservative / Reform" the right set of labels? Should Reconstructionist, Renewal, Sephardi/Mizrahi custom, or Chabad be named? ________
19. Kaddish, the Priestly Blessing, Kedushah: who says them differs by community. Is our one-line description accurate? ________

## D. Pronunciation traditions
20. The app offers Israeli, Sephardi and Ashkenazi readings (Ashkenazi uses oy/oi forms such as "adonoy"). Is the label set right and is the
    "adonoy" respelling appropriate for your community? ________
21. Which of these should be removed from learner-facing material because they are not appropriate to practise aloud? ________

## E. Process
22. Which of the 70 prayer entries would you be willing to review line by line, and can we credit you (name and role) in the app? ________
23. Is there anything in the app a learner could find offensive or disrespectful that we have not asked about? ________

## F. Sensitive vocabulary (for a Hebrew educator or rabbi; added 2026-11-04)
24. The word גּוֹי (rank 187, shown as "gentile (a non-Jewish person), goy") is in the first 500 words. The dictionary source has no register note, so we have not reworded it. Keep it in the beginner list? Better English wording (for example "non-Jew; can be offensive in some uses")? ________
25. We hid, for beginners, 41 יָא (vocative particle used before slurs) and 165 לַעֲזָאזֵל (mild curse), and removed the sexual senses of גָּמַר, שָׁכַב, בָּשָׂר, אֵבֶר, שָׁפַךְ and three example sentences (a remark about legs, one about masturbation, one saying "I personally killed Jesus"). Agree, or should any come back with a register label (colloquial, vulgar)? ________
26. Biblical words with sexual or violent senses left visible (עֶרְוָה, זוֹנָה, זָנָה, קָדֵשׁ, אֹנֶס, הָרַג, רָצַח, שָׁחַט and others listed in `OPEN.md`): fine for adult and teen learners, or label or hide? ________
27. Examples that mention other religions or sensitive events (heretics, suicide, bomb): keep, replace or hide? ________
