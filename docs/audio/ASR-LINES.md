# Sentences and prayers: speech-to-text check

Each whole clip was transcribed by the Hebrew Whisper model and lined up word by word with the text it was rendered from. Spelling-only differences are allowed (same rules as the word check). A flagged word is one the model heard as a different word, or did not hear.

Clips checked: **1**. Clips with every word heard: **0**.

| clip | words heard right | problem words (should say → heard) |
|---|---|---|
| `audio/f/israeli/prayer/hanukkah-candle.mp3` | 69% (13 words) | אֱלֹהֵינוּ → עלינו; קִדְּשָׁנוּ → קדשסנו; בְּמִצְוֹתָיו → במצוותיו; וְצִוָּנוּ → וציינו |
