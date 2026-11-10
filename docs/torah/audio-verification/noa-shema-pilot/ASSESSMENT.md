# Noa Deuteronomy 6:4: limited synthetic pilot

This one clip was selected after comparing two independent audio-only Hugging Face recognizers. It is not human-listening-reviewed or a guarantee of error-free pronunciation. Entire-Torah Hebrew recording remains incomplete. Ari variants remain held.

The exact Hebrew source is preserved. The actual Google Chirp request uses Latin word labels and an explicit IPA dictionary, with de-DE-Chirp3-HD-Kore. The intended spoken language is Hebrew; de-DE is the synthesis locale needed for the supported IPA feature. The complete request, source, hashes, raw word-ASR mismatches and phoneme output are retained beside this assessment.

Word ASR returned שמא ישראל, אדוני אלוהינו, אדוני אחד. Raw word comparison fails four of six tokens. These are not silently marked exact: שמא versus שמע is compatible with the same final /a/; אדוני is orthographically ambiguous between Adonai and Adoni; אלוהינו versus אלהינו differs by vowel-letter spelling. The separate phoneme recognizer returned /ʃemˈa jisʁaʔˈel, ʔadonˈaj ʔelohˈenu, ʔadonˈaj ʔeχˈad/, corroborating Shema, Adonai and Elohenu with the intended stress. Recognition reports individually remain marked publishable:false because neither automatic recognizer alone authorizes publication; this assessment records the combined limited-pilot selection.

Pronunciation convention: contemporary Israeli/Sephardic five-vowel speech, including tsere /e/ in Elohenu, rather than a requirement for /ei/. The Hebrew Academy describes contemporary Israeli speech as five Sephardic vowels: https://eng.hebrew-academy.org.il/our-work/language-decisions/orthography/. This is not a claim of reconstructed Tiberian pronunciation or cantillation. Google IPA support: https://docs.cloud.google.com/text-to-speech/docs/chirp3-hd. Supplemental phoneme model: https://huggingface.co/renikud/whisper-he-ipa.

The phoneme recognizer was also tested against an independent human Sephardic Bible reading for calibration; it is imperfect and sometimes confuses consonants. This selected clip has corroborated intended words and vowel pattern, but no native-speaker listening certification.
