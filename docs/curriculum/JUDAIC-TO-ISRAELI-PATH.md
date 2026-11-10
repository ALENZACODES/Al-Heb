# From Judaic and liturgical Hebrew to Israeli Hebrew

This is a reading of the 125 lessons as a rabbi-appeal path: can a learner go from the Hebrew of the siddur and the Torah to the Hebrew of the street without jumps that a teacher would have to apologise for? It is not a regeneration of `PATH.md` (that file is built from the data). No 126th lesson was added: the integrity tests lock the count at 125, and a prerequisite may only point at a lesson on the same track.

Written 10 November 2026, America/Toronto. Not a rabbi review.

## The two tracks are real, and they do not formally meet

There are two roots.

- **Read track:** `r01`–`r51` (letters, vowels, then Shema, the Priestly Blessing, Friday-night Kiddush, Amidah openings, Kaddish, and a grey-belt assessment), then intermediate synagogue `I-01`–`I-10` and `I-26`–`I-35`. `I-01` requires `r51`.
- **Israel track:** `il01`–`il24` (greetings through an A2–B1 conversation), then intermediate Israel `I-11`–`I-25` and `I-36`–`I-50`. `I-11` requires `il24`.

A lesson on one track cannot list a lesson on the other as a prerequisite (the intermediate tests enforce this). So the product cannot, today, require a street-Hebrew learner to have finished the siddur belt, or a siddur learner to have finished the cafe belt. The "from Judaism Hebrew to Israeli Hebrew" story is therefore a **recommended order for a person**, not a single DAG.

**Recommended order for a learner who wants both,** if they have time for the long path:

1. `r01`–`r51` — decode pointed Hebrew, including the Name as the curriculum already presents it (a decision for John; this path does not change it).
2. `I-01`–`I-10` — the service the first-year attendee actually meets (Shema and its blessings, Amidah openings, Torah service, Kaddish, Friday-night Kiddush, Havdalah, Hallel refrains, Aleinu, Adon Olam, Mi Shebeirach).
3. `I-26`–`I-35` — the service in order, Shabbat-morning Amidah, the festivals the corpus now holds (Yom Kippur lines, Pesach and the festival Kiddush, Sukkot and leshev basukkah, Purim, Hanukkah, Birkat Hamazon openings, Hagomel, Shabbat-day Kiddush).
4. `il01`–`il24` then `I-11`–`I-25` and `I-36`–`I-50` — Israeli Hebrew, with `I-19` (Shabbat invitation) and `I-50` (holiday greetings) as the places the two worlds already touch.

**Recommended order for a visitor who only has weeks in Israel:** the Israel track first, and treat `I-19` and `I-50` as the Judaic bridges. Offer the read track as a parallel "learn to follow the siddur" path; do not pretend the Israel track teaches decoding of a new siddur page (`r50` is the place that does).

## What is already in a sensible order

- Letters and vowels are built, then immediately used in real liturgical lines (Priestly Blessing from `r05`/`r15`, Shema at `r22`/`r36`, V'ahavta at `r37`, Friday-night wine at `r41`). That is the right Judaic instinct.
- `I-01` through `I-06` follow a first Shabbat: Shema, Amidah, Torah service, Kaddish, Kiddush, Havdalah.
- Festival Kiddush and leshev basukkah, added 10 November 2026, are wired into `I-29` and `I-30`, so those lessons no longer borrow Shabbat or Havdalah texts as stand-ins.
- `I-19` (being invited for Shabbat) sits on the Israel track after the cafe and apartment lessons, which is a natural social bridge.
- `I-50` collects greetings, including the Yom Kippur greeting that a rabbi would expect, and labels the gendered take-care forms.

## Jumps and gaps (and what was or was not changed)

| Issue | Why it matters | What this round did |
|---|---|---|
| Two tracks cannot cross-require | `I-50` cannot formally depend on `I-28`–`I-32`, so a street-track learner may meet "chag sameach" without having seen the festival Kiddush. | Documented. `I-50`'s note now points at `I-28`–`I-32` as the liturgical companions. Prerequisite graph left alone. |
| No Shavuot (or Shemini Atzeret) lesson | There is no 126th lesson. The festival Kiddush inserts for Shavuot and Shemini Atzeret are in the registry. | `I-29`'s note now says the same Kiddush pattern is used on Shavuot and Shemini Atzeret, with those registry ids. |
| Hallel (`I-07`) comes after `I-01`, before the festival lessons | Pedagogically acceptable (the refrain is a synagogue skill) but easy to miss that these lines live on festivals, Rosh Chodesh and Hanukkah. | A goal was added on `I-07` pointing forward to `I-29`, `I-30` and `I-32`. Prerequisite left as `I-01`. |
| `I-28` Yom Kippur hangs off `I-01` only | A first-year attendee often meets Yom Kippur before they have the Shabbat-morning Amidah (`I-27`). | Left in place: the lesson already admits it teaches only the lines the corpus holds. Requiring `I-27` would hide the High Holiday too late for many users. |
| Calendar vs. teaching order of festivals | The chain is Pesach (`I-29`) → Sukkot (`I-30`) → Purim (`I-31`) → Hanukkah (`I-32`). That is not the Jewish year. | Left in place. Pesach first is a reasonable seder-first choice; rewriting the chain would churn prerequisites and image slots. |
| `I-18` army slang after `I-11` | A large register jump, and a topic some families will want later. | Documented only. Reordering would be a product decision. |
| Festival-specific greetings | `מועדים לשמחה`, `צום קל`, `חג אורים שמח`, and pointed "chag Pesach kasher vesameach" as a standing greeting are still thin or missing as source tokens. `I-29` does teach `חַג כָּשֵׁר וְשָׂמֵחַ`. | Held. Adding new lesson words needs audio clip slots this worktree does not invent. |
| Remaining corpus gaps on the path | Full Hallel, festival Amidah (Yaaleh v'Yavo), lulav, the Haggadah, yaknehaz, Friday-night-plus-festival Kiddush as its own record. | Named in `data/corpus/gaps.json` (`g-hallel`, `g-festival-kiddush`). Lessons must keep naming those gaps. |

## Safe bridges applied in the lessons

Only notes and goals inside existing lessons were touched (see the "Wire Hallel and festival Kiddush" commit and the follow-up that adds the path pointers). No lesson was moved, and no cross-track prerequisite was added.

## How a rabbi can read this path in an hour

Start at `r22` and `r36` (Shema), `r41` and `I-05` (Kiddush), `I-07` (Hallel), `I-29`–`I-32` (festivals), `I-50` (greetings). If those five stops make liturgical sense, the path is doing its job even though the Israel track is a separate belt.

## Fourth-pass notes (10 November 2026, still overnight)

`il01` and `r51` now tell the learner how the two paths meet, and `I-11` and `I-19` point at their synagogue companions (`I-19`/`I-50`, and `I-05`/`I-06`), still without any cross-track prerequisite. No new lesson words and no new audio slots were added.

The Israel track can also be opened as 13 Babbel-style units at `#/israel-units` (Claude lane C, folded 10 November 2026). That grouping does not change prerequisites. Everyday phrase practice, including greetings that sit on the synagogue track, stays at `#/practical`.
