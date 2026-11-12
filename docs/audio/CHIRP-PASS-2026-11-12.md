# Chirp 3 HD pass on the prayer lines (R-11, 12 November 2026)

Owner rule: prayer lines are spoken with Google Chirp 3 HD voices. Fill-clips run 5 (`tools/audio/r10_r11_list.mjs`, logs `docs/audio/fill/fill-r5-*.jsonl`) made up to six Chirp 3 HD takes for each of 153 prayer lines (Ari: Charon, Orus, Fenrir; Noa: Kore, Aoede, Leda; rates 1.0, 0.9 and 0.85, one take with the words read apart) and kept, per line, the best take that at most one of the three reviewers (sound review, word check, Google Speech-to-Text) heard a word off in.

- Chirp take kept: **85** lines (82 service clips, 3 of the 17 held prayer lines).
- Chirp take held: **68** lines. No Chirp take passed 2 of 3 reviewers, so the current clip keeps playing and the catalogue row carries `"chirpHeld": true`. 14 of them are held prayer lines whose WaveNet take from fill-clips run 1 plays again (no line is silent).
- Untouched: the four clergy-list clips (`kedushah-baruch`, `ashrei-144-15`, both voices).

## Lines whose Chirp take is held

| clip | why |
|---|---|
| `audio/f/israeli/line/adon-olam-1-l5.mp3` | best take: sound review 1 weak, word check 2 off, Google 3 off |
| `audio/f/israeli/line/adon-olam-1-l7.mp3` | best take: sound review 0 weak, word check 1 off, Google 1 off |
| `audio/f/israeli/line/aleinu-1.mp3` | Chirp 3 HD refused the whole text (HTTP 400); recorded in parts later and still held: see the last section |
| `audio/f/israeli/line/amidah-elohai-netzor.mp3` | Chirp 3 HD refused the whole text (HTTP 400); recorded in parts later and still held: see the last section |
| `audio/f/israeli/line/avot-1.mp3` | best take: sound review 4 weak, word check 0 off, Google 1 off |
| `audio/f/israeli/line/candle-shabbat.mp3` | best take: sound review 0 weak, word check 5 off, Google 4 off |
| `audio/f/israeli/line/haftarah-after-l1.mp3` | best take: sound review 16 weak, word check 1 off, Google 8 off |
| `audio/f/israeli/line/haftarah-after-l2.mp3` | best take: sound review 0 weak, word check 1 off, Google 1 off |
| `audio/f/israeli/line/haftarah-after-l3.mp3` | best take: sound review 7 weak, word check 4 off, Google 5 off |
| `audio/f/israeli/line/haftarah-after-l4.mp3` | best take: sound review 8 weak, word check 7 off, Google 4 off |
| `audio/f/israeli/line/haftarah-before.mp3` | best take: sound review 0 weak, word check 2 off, Google 1 off |
| `audio/f/israeli/line/hallel-113-1.mp3` (was held; WaveNet plays) | best take: sound review 1 weak, word check 2 off, Google 2 off |
| `audio/f/israeli/line/hallel-115-1.mp3` (was held; WaveNet plays) | best take: sound review 0 weak, word check 1 off, Google 2 off |
| `audio/f/israeli/line/hallel-116-13.mp3` (was held; WaveNet plays) | best take: sound review 1 weak, word check 1 off, Google 0 off |
| `audio/f/israeli/line/hallel-118-25.mp3` (was held; WaveNet plays) | best take: sound review 3 weak, word check 1 off, Google 0 off |
| `audio/f/israeli/line/hallel-118-28.mp3` (was held; WaveNet plays) | best take: sound review 0 weak, word check 1 off, Google 2 off |
| `audio/f/israeli/line/kaddish-1-l4.mp3` | best take: sound review 1 weak, word check 2 off, Google 0 off |
| `audio/f/israeli/line/kedushah-yimloch.mp3` | best take: sound review 1 weak, word check 1 off, Google 2 off |
| `audio/f/israeli/line/kiddush-festival-eve-open.mp3` (was held; WaveNet plays) | best take: sound review 1 weak, word check 1 off, Google 2 off |
| `audio/f/israeli/line/kiddush-shabbat-eve.mp3` | best take: sound review 20 weak, word check 6 off, Google 4 off |
| `audio/f/israeli/line/leshev-basukkah.mp3` (was held; WaveNet plays) | best take: sound review 2 weak, word check 1 off, Google 2 off |
| `audio/f/israeli/line/sim-shalom-l1.mp3` | best take: sound review 13 weak, word check 3 off, Google 2 off |
| `audio/f/israeli/line/vahavta-full-l2.mp3` | best take: sound review 0 weak, word check 2 off, Google 1 off |
| `audio/f/israeli/line/vayehi-binsoa.mp3` | best take: sound review 1 weak, word check 3 off, Google 2 off |
| `audio/f/israeli/line/vezot-hatorah.mp3` | best take: sound review 0 weak, word check 2 off, Google 2 off |
| `audio/f/israeli/prayer/adon-olam-1.mp3` | Chirp 3 HD refused the whole text (HTTP 400); recorded in parts later and still held: see the last section |
| `audio/f/israeli/prayer/ashrei-145-1-3.mp3` | best take: sound review 1 weak, word check 1 off, Google 0 off |
| `audio/f/israeli/prayer/haftarah-after.mp3` | Chirp 3 HD refused the whole text (HTTP 400); recorded in parts later and still held: see the last section |
| `audio/f/israeli/prayer/kaddish-1.mp3` | Chirp 3 HD refused the whole text (HTTP 400); recorded in parts later and still held: see the last section |
| `audio/f/israeli/prayer/kiddush-gen-2-1-3.mp3` | best take: sound review 4 weak, word check 3 off, Google 0 off |
| `audio/f/israeli/prayer/sim-shalom.mp3` | best take: sound review 19 weak, word check 5 off, Google 4 off |
| `audio/f/israeli/prayer/vahavta-full.mp3` | best take: sound review 11 weak, word check 1 off, Google 0 off |
| `audio/m/israeli/line/adon-olam-1-l5.mp3` | best take: sound review 1 weak, word check 1 off, Google 1 off |
| `audio/m/israeli/line/adon-olam-1-l6.mp3` | best take: sound review 0 weak, word check 1 off, Google 3 off |
| `audio/m/israeli/line/adon-olam-1-l7.mp3` | best take: sound review 0 weak, word check 2 off, Google 2 off |
| `audio/m/israeli/line/aleinu-1.mp3` | Chirp 3 HD refused the whole text (HTTP 400); recorded in parts later and still held: see the last section |
| `audio/m/israeli/line/amidah-elohai-netzor.mp3` | Chirp 3 HD refused the whole text (HTTP 400); recorded in parts later and still held: see the last section |
| `audio/m/israeli/line/avot-1.mp3` | best take: sound review 6 weak, word check 1 off, Google 1 off |
| `audio/m/israeli/line/candle-shabbat.mp3` | best take: sound review 0 weak, word check 4 off, Google 2 off |
| `audio/m/israeli/line/etz-chaim.mp3` | best take: sound review 2 weak, word check 3 off, Google 0 off |
| `audio/m/israeli/line/haftarah-after-l1.mp3` | best take: sound review 17 weak, word check 3 off, Google 10 off |
| `audio/m/israeli/line/haftarah-after-l2.mp3` | best take: sound review 1 weak, word check 1 off, Google 2 off |
| `audio/m/israeli/line/haftarah-after-l3.mp3` | best take: sound review 8 weak, word check 5 off, Google 4 off |
| `audio/m/israeli/line/haftarah-after-l4.mp3` | best take: sound review 8 weak, word check 7 off, Google 6 off |
| `audio/m/israeli/line/haftarah-before.mp3` | best take: sound review 0 weak, word check 1 off, Google 2 off |
| `audio/m/israeli/line/hallel-113-1.mp3` (was held; WaveNet plays) | best take: sound review 1 weak, word check 1 off, Google 1 off |
| `audio/m/israeli/line/hallel-118-1-4-l4.mp3` (was held; WaveNet plays) | best take: sound review 1 weak, word check 0 off, Google 1 off |
| `audio/m/israeli/line/hallel-118-25.mp3` (was held; WaveNet plays) | best take: sound review 2 weak, word check 2 off, Google 0 off |
| `audio/m/israeli/line/hallel-118-28.mp3` (was held; WaveNet plays) | best take: sound review 0 weak, word check 1 off, Google 1 off |
| `audio/m/israeli/line/kaddish-1-l2.mp3` | best take: sound review 1 weak, word check 1 off, Google 0 off |
| `audio/m/israeli/line/kaddish-1-l4.mp3` | best take: sound review 1 weak, word check 2 off, Google 0 off |
| `audio/m/israeli/line/kedushah-kadosh.mp3` | best take: sound review 1 weak, word check 3 off, Google 0 off |
| `audio/m/israeli/line/kedushah-yimloch.mp3` | best take: sound review 1 weak, word check 1 off, Google 2 off |
| `audio/m/israeli/line/kiddush-festival-eve-close.mp3` (was held; WaveNet plays) | best take: sound review 2 weak, word check 1 off, Google 2 off |
| `audio/m/israeli/line/kiddush-festival-eve-open.mp3` (was held; WaveNet plays) | best take: sound review 1 weak, word check 3 off, Google 2 off |
| `audio/m/israeli/line/kiddush-gen-2-1-3-l3.mp3` | best take: sound review 1 weak, word check 2 off, Google 0 off |
| `audio/m/israeli/line/kiddush-shabbat-eve.mp3` | best take: sound review 19 weak, word check 8 off, Google 5 off |
| `audio/m/israeli/line/leshev-basukkah.mp3` (was held; WaveNet plays) | best take: sound review 1 weak, word check 1 off, Google 2 off |
| `audio/m/israeli/line/mi-chamocha-1.mp3` | best take: sound review 1 weak, word check 1 off, Google 0 off |
| `audio/m/israeli/line/sim-shalom-l1.mp3` | best take: sound review 12 weak, word check 3 off, Google 0 off |
| `audio/m/israeli/line/vayehi-binsoa.mp3` | best take: sound review 1 weak, word check 2 off, Google 1 off |
| `audio/m/israeli/prayer/adon-olam-1.mp3` | Chirp 3 HD refused the whole text (HTTP 400); recorded in parts later and still held: see the last section |
| `audio/m/israeli/prayer/ashrei-145-1-3.mp3` | best take: sound review 2 weak, word check 2 off, Google 0 off |
| `audio/m/israeli/prayer/haftarah-after.mp3` | Chirp 3 HD refused the whole text (HTTP 400); recorded in parts later and still held: see the last section |
| `audio/m/israeli/prayer/kaddish-1.mp3` | Chirp 3 HD refused the whole text (HTTP 400); recorded in parts later and still held: see the last section |
| `audio/m/israeli/prayer/kiddush-gen-2-1-3.mp3` | best take: sound review 6 weak, word check 4 off, Google 1 off |
| `audio/m/israeli/prayer/sim-shalom.mp3` | best take: sound review 20 weak, word check 4 off, Google 2 off |
| `audio/m/israeli/prayer/vahavta-full.mp3` | best take: sound review 13 weak, word check 1 off, Google 1 off |

## The five whole prayers too long for one Chirp request (chirp-long run 1)

Chirp 3 HD refused every take of these with HTTP 400. Fill-clips run 5 shows where the limit sits: the longest text it accepted was 840 bytes and the shortest it refused 966, which matches a per-request limit of about 900 bytes, far below the 5,000 bytes the general Text-to-Speech quota page gives. `tools/audio/chirp_long.py` split each prayer at its own lines and sentence breaks in `data/corpus/registry.json`, cutting a sentence still over 400 bytes at a word boundary before a joining word (nothing retyped), and spoke each part as the Torah clips are (`spoken()`: the four-letter name read as Adonai; no line is on the clergy list). Every part was accepted: no request was refused. One voice per prayer: each narrator had 9 tries (Ari: Charon, Orus, Fenrir; Noa: Kore, Aoede, Leda; rates 1.0, 0.9, 0.85). The joined clips are over Google Speech-to-Text's 55-second limit, so **each part was judged on its own** by the three reviewers, and a try counted only if every part passed at least 2 of 3. A try stopped at its first failing part.

No try passed for any of the ten clips, so every current clip keeps playing and its catalogue row carries `"chirpHeld": true` and `chirpHeldReason`.

| clip | parts | furthest part reached before a part failed 2 of 3 |
|---|---:|---:|
| `audio/m/israeli/prayer/adon-olam-1.mp3` | 10 | 5 |
| `audio/f/israeli/prayer/adon-olam-1.mp3` | 10 | 5 |
| `audio/m/israeli/prayer/kaddish-1.mp3` | 7 | 4 |
| `audio/f/israeli/prayer/kaddish-1.mp3` | 7 | 3 |
| `audio/m/israeli/prayer/haftarah-after.mp3` | 8 | 2 |
| `audio/f/israeli/prayer/haftarah-after.mp3` | 8 | 2 |
| `audio/m/israeli/line/aleinu-1.mp3` | 4 | 1 |
| `audio/f/israeli/line/aleinu-1.mp3` | 4 | 1 |
| `audio/m/israeli/line/amidah-elohai-netzor.mp3` | 4 | 2 |
| `audio/f/israeli/line/amidah-elohai-netzor.mp3` | 4 | 2 |

Logs: `docs/audio/fill/chirp-long-r1-*.jsonl`.
