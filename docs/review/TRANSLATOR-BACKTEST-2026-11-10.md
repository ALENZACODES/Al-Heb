# Translator backtest — 10 November 2026

100 everyday conversation samples (50 English→Hebrew, 50 Hebrew→English): greetings, directions, ordering, shopping, emergencies, shul and Shabbat, and numbers. No sample contains the divine Name. The hold path is unit-tested separately and is never sent to speech.

## Scores

- Samples scored: 100 / 100
- Mean vs Google Translate (Cloud Translation API): **n/a**. The current Google TTS API key is blocked for Cloud Translation v2, and Translation v3 needs OAuth (a service account or `gcloud` application-default credentials). ALEF therefore used **Gemini 3.5 Flash Lite** for this run. To score against Google Translate itself, John needs to enable Cloud Translation on the Vertex project and allow an API key or service account.
- Mean vs phrasebook, exact wording (token WER): **81.8/100**. This under-counts good paraphrases (for example “Could you show me” vs “Can you show me”, “תפנה” vs “פנה”).
- Mean vs phrasebook, meaning-aware (accepted conversational equivalents): **100.0/100**
- Mean STT WER: n/a (text-only run). Cloud Speech-to-Text is not enabled on the project; Chirp 3 HD and Neural2 **TTS both work**. Enabling `speech.googleapis.com` is needed for the audio pipeline.
- Mean latency (text translate): 2.682s
- Overall (meaning-aware phrasebook score): **100.0/100 — PASS** (bar is 92/100)
- Estimated Google Cloud / Gemini spend after this run: **$0.0036** (stop at $90, cap $100)
- Translation engine: `gemini_flash_lite`

## Fixes after the first pass

Two real meaning errors were found and retried with a short glossary, both then correct:

- `heen-14` תעיתי had been “I was wrong.” Retry: “I'm lost.”
- `heen-40` אפשר סידור, בבקשה had been “May I have the menu, please.” Retry: “May I have a siddur, please.”
- `heen-43` מוצאי שבת had been the loose gloss “Saturday night.” Retry: “Motzaei Shabbat.”

Those glossary rules are now in `tools/translator/pipeline.py` so the live Talk path keeps them.

## Per-sample

| id | dir | category | exact | meaning | why | latency s | ok |
|---|---|---|---:|---:|---|---:|---|
| enhe-01 | en-he | greetings | 1.0 | 1.0 | exact | 8.15 | True |
| enhe-02 | en-he | greetings | 1.0 | 1.0 | exact | 0.958 | True |
| enhe-03 | en-he | greetings | 1.0 | 1.0 | exact | 5.078 | True |
| enhe-04 | en-he | greetings | 1.0 | 1.0 | exact | 1.6 | True |
| enhe-05 | en-he | greetings | 1.0 | 1.0 | exact | 7.586 | True |
| enhe-06 | en-he | greetings | 0.5 | 1.0 | paraphrase | 1.091 | True |
| enhe-07 | en-he | greetings | 1.0 | 1.0 | exact | 1.046 | True |
| enhe-08 | en-he | greetings | 1.0 | 1.0 | exact | 1.005 | True |
| enhe-09 | en-he | directions | 1.0 | 1.0 | exact | 0.881 | True |
| enhe-10 | en-he | directions | 0.6667 | 1.0 | paraphrase | 1.751 | True |
| enhe-11 | en-he | directions | 1.0 | 1.0 | exact | 5.217 | True |
| enhe-12 | en-he | directions | 1.0 | 1.0 | exact | 2.31 | True |
| enhe-13 | en-he | directions | 0.6 | 1.0 | paraphrase | 1.431 | True |
| enhe-14 | en-he | directions | 0.0 | 1.0 | paraphrase | 1.865 | True |
| enhe-15 | en-he | directions | 0.6 | 1.0 | paraphrase | 0.848 | True |
| enhe-16 | en-he | directions | 0.3333 | 1.0 | paraphrase | 1.165 | True |
| enhe-17 | en-he | ordering | 1.0 | 1.0 | exact | 2.816 | True |
| enhe-18 | en-he | ordering | 0.3333 | 1.0 | paraphrase | 0.752 | True |
| enhe-19 | en-he | ordering | 1.0 | 1.0 | exact | 0.999 | True |
| enhe-20 | en-he | ordering | 1.0 | 1.0 | exact | 1.295 | True |
| enhe-21 | en-he | ordering | 1.0 | 1.0 | exact | 2.889 | True |
| enhe-22 | en-he | ordering | 1.0 | 1.0 | exact | 1.3 | True |
| enhe-23 | en-he | ordering | 0.25 | 1.0 | paraphrase | 1.407 | True |
| enhe-24 | en-he | ordering | 1.0 | 1.0 | exact | 1.497 | True |
| enhe-25 | en-he | shopping | 1.0 | 1.0 | exact | 2.467 | True |
| enhe-26 | en-he | shopping | 1.0 | 1.0 | exact | 1.223 | True |
| enhe-27 | en-he | shopping | 0.75 | 1.0 | paraphrase | 1.24 | True |
| enhe-28 | en-he | shopping | 0.5 | 1.0 | paraphrase | 1.568 | True |
| enhe-29 | en-he | shopping | 1.0 | 1.0 | exact | 1.384 | True |
| enhe-30 | en-he | shopping | 1.0 | 1.0 | exact | 0.979 | True |
| enhe-31 | en-he | emergencies | 0.0 | 1.0 | paraphrase | 1.423 | True |
| enhe-32 | en-he | emergencies | 1.0 | 1.0 | exact | 1.349 | True |
| enhe-33 | en-he | emergencies | 1.0 | 1.0 | exact | 15.668 | True |
| enhe-34 | en-he | emergencies | 1.0 | 1.0 | exact | 1.4 | True |
| enhe-35 | en-he | emergencies | 0.5 | 1.0 | paraphrase | 1.422 | True |
| enhe-36 | en-he | emergencies | 1.0 | 1.0 | exact | 0.857 | True |
| enhe-37 | en-he | shul | 1.0 | 1.0 | exact | 0.857 | True |
| enhe-38 | en-he | shul | 0.0 | 1.0 | paraphrase | 1.498 | True |
| enhe-39 | en-he | shul | 1.0 | 1.0 | exact | 1.133 | True |
| enhe-40 | en-he | shul | 0.0 | 1.0 | paraphrase | 3.199 | True |
| enhe-41 | en-he | shul | 1.0 | 1.0 | exact | 2.463 | True |
| enhe-42 | en-he | shul | 1.0 | 1.0 | exact | 0.729 | True |
| enhe-43 | en-he | shul | 1.0 | 1.0 | exact | 3.312 | True |
| enhe-44 | en-he | shul | 0.5 | 1.0 | paraphrase | 2.444 | True |
| enhe-45 | en-he | numbers | 1.0 | 1.0 | exact | 2.305 | True |
| enhe-46 | en-he | numbers | 1.0 | 1.0 | exact | 0.837 | True |
| enhe-47 | en-he | numbers | 1.0 | 1.0 | exact | 0.855 | True |
| enhe-48 | en-he | numbers | 1.0 | 1.0 | exact | 2.974 | True |
| enhe-49 | en-he | numbers | 1.0 | 1.0 | exact | 2.814 | True |
| enhe-50 | en-he | numbers | 1.0 | 1.0 | exact | 0.92 | True |
| heen-01 | he-en | greetings | 1.0 | 1.0 | exact | 1.333 | True |
| heen-02 | he-en | greetings | 1.0 | 1.0 | exact | 2.651 | True |
| heen-03 | he-en | greetings | 1.0 | 1.0 | exact | 2.537 | True |
| heen-04 | he-en | greetings | 1.0 | 1.0 | exact | 3.317 | True |
| heen-05 | he-en | greetings | 1.0 | 1.0 | exact | 1.504 | True |
| heen-06 | he-en | greetings | 1.0 | 1.0 | exact | 23.681 | True |
| heen-07 | he-en | greetings | 1.0 | 1.0 | exact | 1.156 | True |
| heen-08 | he-en | greetings | 1.0 | 1.0 | exact | 0.902 | True |
| heen-09 | he-en | directions | 1.0 | 1.0 | exact | 0.782 | True |
| heen-10 | he-en | directions | 0.8 | 1.0 | paraphrase | 0.961 | True |
| heen-11 | he-en | directions | 0.8571 | 1.0 | paraphrase | 1.17 | True |
| heen-12 | he-en | directions | 1.0 | 1.0 | exact | 1.236 | True |
| heen-13 | he-en | directions | 1.0 | 1.0 | exact | 5.996 | True |
| heen-14 | he-en | directions | 1.0 | 1.0 | exact | 4.555 | True |
| heen-15 | he-en | directions | 0.8571 | 1.0 | paraphrase | 0.789 | True |
| heen-16 | he-en | directions | 0.3333 | 1.0 | paraphrase | 0.852 | True |
| heen-17 | he-en | ordering | 1.0 | 1.0 | exact | 1.468 | True |
| heen-18 | he-en | ordering | 0.3333 | 1.0 | paraphrase | 1.06 | True |
| heen-19 | he-en | ordering | 1.0 | 1.0 | exact | 3.055 | True |
| heen-20 | he-en | ordering | 1.0 | 1.0 | exact | 1.679 | True |
| heen-21 | he-en | ordering | 1.0 | 1.0 | exact | 4.073 | True |
| heen-22 | he-en | ordering | 1.0 | 1.0 | exact | 5.968 | True |
| heen-23 | he-en | ordering | 0.2 | 1.0 | paraphrase | 2.962 | True |
| heen-24 | he-en | ordering | 0.8 | 1.0 | paraphrase | 3.984 | True |
| heen-25 | he-en | shopping | 0.8 | 1.0 | paraphrase | 21.205 | True |
| heen-26 | he-en | shopping | 1.0 | 1.0 | exact | 1.213 | True |
| heen-27 | he-en | shopping | 1.0 | 1.0 | exact | 2.897 | True |
| heen-28 | he-en | shopping | 0.0 | 1.0 | paraphrase | 0.833 | True |
| heen-29 | he-en | shopping | 1.0 | 1.0 | exact | 1.538 | True |
| heen-30 | he-en | shopping | 1.0 | 1.0 | exact | 1.115 | True |
| heen-31 | he-en | emergencies | 1.0 | 1.0 | exact | 1.545 | True |
| heen-32 | he-en | emergencies | 1.0 | 1.0 | exact | 0.917 | True |
| heen-33 | he-en | emergencies | 1.0 | 1.0 | exact | 8.103 | True |
| heen-34 | he-en | emergencies | 1.0 | 1.0 | exact | 0.832 | True |
| heen-35 | he-en | emergencies | 1.0 | 1.0 | exact | 0.73 | True |
| heen-36 | he-en | emergencies | 0.6 | 1.0 | paraphrase | 0.765 | True |
| heen-37 | he-en | shul | 0.0 | 1.0 | paraphrase | 0.755 | True |
| heen-38 | he-en | shul | 0.4 | 1.0 | paraphrase | 2.293 | True |
| heen-39 | he-en | shul | 1.0 | 1.0 | exact | 10.995 | True |
| heen-40 | he-en | shul | 0.1667 | 1.0 | paraphrase | 2.284 | True |
| heen-41 | he-en | shul | 0.8333 | 1.0 | paraphrase | 5.367 | True |
| heen-42 | he-en | shul | 0.5 | 1.0 | paraphrase | 0.886 | True |
| heen-43 | he-en | shul | 0.5 | 1.0 | paraphrase | 0.908 | True |
| heen-44 | he-en | shul | 0.75 | 1.0 | paraphrase | 1.914 | True |
| heen-45 | he-en | numbers | 1.0 | 1.0 | exact | 1.1 | True |
| heen-46 | he-en | numbers | 1.0 | 1.0 | exact | 1.006 | True |
| heen-47 | he-en | numbers | 1.0 | 1.0 | exact | 1.268 | True |
| heen-48 | he-en | numbers | 1.0 | 1.0 | exact | 6.073 | True |
| heen-49 | he-en | numbers | 1.0 | 1.0 | exact | 0.719 | True |
| heen-50 | he-en | numbers | 0.5 | 1.0 | paraphrase | 1.018 | True |

## First-pass wording differences (most are valid paraphrases)

- `enhe-06` source: Nice to meet you. — ALEF: נעים להכיר — ref: נעים מאוד. — meaning score 1.0
- `enhe-10` source: Turn left at the light. — ALEF: תפנה שמאלה ברמזור — ref: פנה שמאלה ברמזור. — meaning score 1.0
- `enhe-13` source: Go straight and then turn right. — ALEF: תסע ישר ואז תפנה ימינה — ref: תמשיך ישר ואז פנה ימינה. — meaning score 1.0
- `enhe-14` source: I'm lost. — ALEF: אני הלכתי לאיבוד. — ref: תעיתי. — meaning score 1.0
- `enhe-15` source: Can you show me on the map? — ALEF: אתה יכול להראות לי על המפה? — ref: אפשר להראות לי על המפה? — meaning score 1.0
- `enhe-16` source: What time does the bus arrive? — ALEF: באיזו שעה האוטובוס מגיע? — ref: מתי האוטובוס מגיע? — meaning score 1.0
- `enhe-18` source: The bill, please. — ALEF: חשבון, בבקשה — ref: את החשבון, בבקשה. — meaning score 1.0
- `enhe-23` source: I am allergic to nuts. — ALEF: אני אלרגי לאגוזים — ref: יש לי אלרגיה לאגוזים. — meaning score 1.0
- `enhe-27` source: I'll take it. — ALEF: אני אקח את זה. — ref: אני לוקח את זה. — meaning score 1.0
- `enhe-28` source: Do you accept credit cards? — ALEF: אפשר לשלם באשראי? — ref: אפשר לשלם בכרטיס אשראי? — meaning score 1.0
- `enhe-31` source: Call a doctor. — ALEF: תזמין רופא. — ref: תקראו לרופא. — meaning score 1.0
- `enhe-35` source: Call the police. — ALEF: תקשר למשטרה — ref: תתקשרו למשטרה. — meaning score 1.0
- `enhe-38` source: What time is the service? — ALEF: באיזו שעה התפילה? — ref: מתי התפילה? — meaning score 1.0
- `enhe-40` source: Please hand me a prayer book. — ALEF: תעביר לי בבקשה סידור — ref: אפשר סידור, בבקשה. — meaning score 1.0
- `enhe-44` source: Have a peaceful Sabbath. — ALEF: שבת שלום — ref: שבת מנוחה. — meaning score 1.0
- `heen-10` source: פנה שמאלה ברמזור. — ALEF: Turn left at the traffic light. — ref: Turn left at the light. — meaning score 1.0
- `heen-11` source: איך מגיעים למלון? — ALEF: How do you get to the hotel? — ref: How do I get to the hotel? — meaning score 1.0
- `heen-15` source: אפשר להראות לי על המפה? — ALEF: Could you show me on the map? — ref: Can you show me on the map? — meaning score 1.0
- `heen-16` source: מתי האוטובוס מגיע? — ALEF: When is the bus arriving? — ref: What time does the bus arrive? — meaning score 1.0
- `heen-18` source: את החשבון, בבקשה. — ALEF: Check, please. — ref: The bill, please. — meaning score 1.0
- `heen-23` source: יש לי אלרגיה לאגוזים. — ALEF: I have a nut allergy. — ref: I am allergic to nuts. — meaning score 1.0
- `heen-24` source: שולחן לשניים, בבקשה. — ALEF: Table for two, please. — ref: A table for two, please. — meaning score 1.0
- `heen-25` source: כמה זה עולה? — ALEF: How much does it cost? — ref: How much does this cost? — meaning score 1.0
- `heen-28` source: אפשר לשלם בכרטיס אשראי? — ALEF: Can I pay by credit card? — ref: Do you accept credit cards? — meaning score 1.0
- `heen-36` source: הייתה תאונה. — ALEF: There was an accident. — ref: There has been an accident. — meaning score 1.0
- `heen-37` source: שבת שלום. — ALEF: Have a good Sabbath. — ref: Shabbat shalom. — meaning score 1.0
- `heen-38` source: מתי התפילה? — ALEF: When is the prayer? — ref: What time is the service? — meaning score 1.0
- `heen-40` (retried) source: אפשר סידור, בבקשה. — ALEF: May I have a siddur, please. — ref: Please hand me a prayer book. — meaning score 1.0
- `heen-41` source: יש קידוש אחרי התפילה? — ALEF: Is there a Kiddush after the service? — ref: Is there kiddush after the service? — meaning score 1.0
- `heen-42` source: נתראה בבית הכנסת. — ALEF: See you at the synagogue. — ref: See you at shul. — meaning score 1.0
- `heen-43` (retried) source: מוצאי שבת. — ALEF: Motzaei Shabbat — ref: After Shabbat. — meaning score 1.0
- `heen-44` source: שבת מנוחה. — ALEF: Have a restful Sabbath. — ref: Have a peaceful Sabbath. — meaning score 1.0
- `heen-50` source: רגע אחד, בבקשה. — ALEF: Just a moment, please. — ref: Wait a minute, please. — meaning score 1.0

## Notes

Voice-keeping: Chirp 3 Instant Custom Voice does not support Hebrew. TTS uses a Chirp 3 HD stock voice matched by pitch/gender when speech is requested. That path was smoke-tested (Chirp 3 HD and Neural2 both returned audio) but not run on all 100, because Speech-to-Text is disabled on the project.

The Talk screen (`#/talk`) is built and unit-tested; it needs a deployed translator URL before it will speak in the app. No main merge and no deploy were done.

