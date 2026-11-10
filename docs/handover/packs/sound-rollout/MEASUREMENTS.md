# MEASUREMENTS — sound rollout (Lane F chain, applied Nov 7, 2026)

Method, identical for every before/after pair below (script: `measure2.py`, raw dumps:
`measure-before.json`, `measure-after.json`, `measure-nodenoise.json`, `measure-variants.json`):

- Integrated loudness **I**, true peak **TP**, loudness range **LRA** — ffmpeg `loudnorm` analysis (BS.1770).
- **Voice band** — mean volume after `highpass=f=300,lowpass=f=3400`. **Top band** — mean volume after
  `highpass=f=6500` (the hiss estimate). Both cross-checked with alternate filter topologies (bandpass /
  anequalizer) on the noisiest disc; agreement within 0.1 dB.
- Output spec verified per file with ffprobe + a byte scan (see §5).

Chains, exactly as Lane F's shipped pilot (REPORT §3):

- **Historic** (`pd_*`): `highpass=f=70, adeclick, afftdn=nf=-25:tn=1, lowpass=f=6000:p=2`, then measured
  static gain, `alimiter=limit=0.89:level=false`, out 44.1 kHz mono, libvorbis q:a 4, `-map_metadata -1`.
  `loudnorm`'s own gain was **not** used anywhere (Lane F rejected it: overshoots true peaks).
- **Light** (`cc_*`): `highpass=f=60, adeclick, afftdn=nf=-30:tn=1`, NO low-pass, same gain/output step.
- Gain rule (Lane F): `gain = min(−16 − I_filtered, −1.5 − TP_filtered)` from an analysis pass over the
  filtered signal — except the two single-transient files in §4, where the rule that reproduces the
  pilot's own shipped result is documented.

## 1. Before → after, all 15 files

| File | Chain | Gain dB | Loudness I | True peak | LRA | Voice band | Top band (hiss) |
|---|---|---:|---|---|---|---|---|
| pd_adon_olam_1903.ogg | historic | −2.96 | −13.03 → **−16.06** | +0.12 → **−0.51** | 10.7 → 10.7 | −16.9 → −16.9 | −44.4 → −46.4 |
| pd_mimkoimoi_hu_jifen_1902.ogg | historic | −5.67 | −10.33 → **−16.03** | +0.31 → **−2.33** | 9.6 → 9.8 | −14.0 → −16.6 | −42.0 → −47.4 |
| pd_kawokores_rohe_adre_1908.ogg | historic | −2.85 | −13.16 → **−15.99** | −0.14 → **−0.82** | 10.9 → 10.9 | −17.1 → −16.9 | −46.5 → −48.0 |
| pd_birchos_kohanim_1908.ogg | historic | −4.95 | −11.01 → **−15.97** | +0.15 → **−1.57** | 12.0 → 11.9 | −15.6 → −17.5 | −40.1 → −43.4 |
| pd_sirota_kaddish_1903.ogg | historic | −0.38 | −15.62 → **−16.01** | −3.06 → **−0.69** | 14.1 → 14.2 | −20.0 → −17.4 | −46.8 → −45.3 |
| pd_zadik_katomor_1908.ogg | historic | −3.49 | −12.50 → **−15.97** | +0.19 → **−0.77** | 10.9 → 11.1 | −16.6 → −17.1 | −38.3 → −45.6 |
| pd_odom_yasoido_meator_1903.ogg | historic | −1.98 | −15.31 → **−17.35** ⚠ | +0.10 → **−0.39** | 10.4 → 10.3 | −19.0 → −18.0 | −48.0 → −48.8 |
| cc_cantillation_torah_ashkenazi.ogg | light | +2.37 | −18.36 → **−16.03** | −3.88 → **−1.54** | 1.6 → 1.4 | −18.8 → −16.4 | −44.0 → −42.0 |
| cc_cantillation_haftarah_ashkenazi.ogg | light | +0.66 | −17.34 → **−16.59** | −2.26 → **−1.54** | 0.8 → 0.7 | −17.6 → −16.9 | −46.3 → −46.6 |
| cc_taamim_torah_superjew.ogg | light §4 | +0.38 | −16.73 → **−16.52** | +0.66 → **−0.30** ⚠ | 5.9 → 5.8 | −18.7 → −18.4 | −37.5 → −37.9 |
| cc_taamim_haftarah_superjew.ogg | light | +2.73 | −22.48 → **−19.76** ⚠ | −4.12 → **−1.55** | 5.8 → 5.7 | −24.4 → −21.7 | −45.6 → −44.1 |
| cc_asael_genesis_noah_ashkenaz.ogg | light §4 | −1.95 | −14.00 → **−16.11** | +0.67 → **−0.64** | 3.9 → 3.8 | −15.5 → −17.5 | −45.4 → −47.8 |
| cc_asael_genesis_noah_ashkenaz.oga | light §4 | −1.95 | identical bytes to the .ogg (see MANIFEST note) | | | | |
| cc_shofar_prayer_ashkenazi_nli.ogg | light | −0.79 | −15.20 → **−15.97** | −2.31 → **−1.30** | 9.6 → 9.6 | −19.1 → −16.8 | −50.5 → −48.8 |
| cc_chad_gadya_traditional.ogg | light | +3.15 | −22.95 → **−19.87** ⚠ | −4.61 → **−1.56** | 2.9 → 2.9 | −24.6 → −21.6 | −48.6 → −45.1 |

⚠ = lands off the −16.0 target for a stated reason; each has a level-variant in §3 or a note in §4/RISKS.

Class notes:

- **Historic discs.** Every disc's over-0 dBTP clipping transfer peaks are gone; LRA (the dynamics Lane F
  promised to preserve) moves by ≤0.2 on all seven. Top-band hiss falls most where it was worst
  (Tzadik katamar −38.3 → −45.6; Mimkoimoi −42.0 → −47.4). Zadik/Mimkoimoi were the shelf's loudest,
  hottest transfers (I −12.50 / −10.33) and are now level with the shelf.
- **Shofar prayer** was deliberately given the LIGHT chain although the source is a 78-era NLI transfer:
  its measured top band was already −50.5 (cleaner than any `pd_` disc) and a shofar's real harmonics
  live above the historic chain's 6 kHz low-pass — the historic chain would have damaged the instrument.
- **Cantillation pair** (Ezra Katz): the fix Lane F identified — loudness consistency — is delivered
  (−18.36 → −16.03; −17.34 → −16.59). Top band rises slightly on the Torah example because the whole
  file was lifted +2.37 dB; nothing was removed up there (no low-pass, by design).
- **"Already at target" count: 0.** Criterion used: |I − (−16.0)| ≤ 0.5 LU **and** TP ≤ −0.5 on the raw
  file. The closest file, Shofar prayer (−15.20 / −2.31), sits 0.80 LU hot, so it took the light chain.
  No file was re-processed "for its own sake" beyond the two approved chains, and the TTS library was
  not touched at all (Lane F: already at spec).

## 2. Pilot reproduction check (the 5 files Lane F enhanced)

Lane F's published after-values vs this rollout's renders, same measurement method as §1 header for both:

| File | Lane F after (I / TP / LRA) | This rollout (I / TP / LRA) | Verdict |
|---|---|---|---|
| pd_adon_olam_1903 | −16.1 / −0.5 / 10.7 | −16.06 / −0.51 / 10.7 | match |
| pd_sirota_kaddish_1903 | −16.0 / −0.7 / 14.2 | −16.01 / −0.69 / 14.2 | match |
| pd_kawokores_rohe_adre_1908 | −16.0 / −0.8 / 10.9 | −15.99 / −0.82 / 10.9 | match |
| cc_cantillation_torah_ashkenazi | −16.0 / −1.5 / 1.4 | −16.03 / −1.54 / 1.4 | match |
| cc_taamim_torah_superjew | −16.2 / −0.9 / 5.7 | −16.52 / −0.30 / 5.8 | loudness match (0.3 LU); one transient 0.6 dB hotter — see §4 |

Stronger than the table: the decoded sample statistics of the three Sirota renders are **identical to
Lane F's pilot files to 3 decimals** (Adon Olam RMS −16.477, peak −0.517 in both; Kaddish RMS −17.121,
peak −0.726 in both). The owner approved the pilot pair by ear; these are that sound.

One honest discrepancy, in the *before* columns only: Lane F's report lists higher before-values for the
voice band on the noisy discs (e.g. Adon Olam −13.9) than this method measures (−16.9, cross-validated
with three filter topologies). A band value above the file's own full-band mean (−16.5) is not physically
reachable here, so Lane F's before-band column appears to come from a differently-normalised pass. All
after-values agree; no conclusion in Lane F's report changes (their hiss claim was the top band, which
agrees in direction everywhere).

## 3. Level variants (`level-variants/`) — for the three files the recipe leaves under target

Lane F's gain rule caps the whole file at the loudest programme peak (TP ceiling). On three files those
peaks are programme, not defects, so the recipe-faithful renders land 1.4–3.9 LU under the shelf. These
variants use loudness-target gain + adeclick + the 0.89 limiter, with a post-render true-peak trim
(max 2 passes) — the same method §4 documents for the pilot's SuperJew file. LRA cost is ≤0.3 on all three.

| File | Main render (I / TP / LRA) | Variant (I / TP / LRA) | Variant gain |
|---|---|---|---|
| pd_odom_yasoido_meator_1903.ogg | −17.35 / −0.39 / 10.3 | **−16.16 / −0.50 / 10.1** | +2.31 (mono-analysis) |
| cc_chad_gadya_traditional.ogg | −19.87 / −1.56 / 2.9 | **−16.34 / −0.50 / 2.7** | +6.85 |
| cc_taamim_haftarah_superjew.ogg | −19.76 / −1.55 / 5.7 | **−16.20 / −0.69 / 5.5** | +6.49 |

Recommendation: ship the variants for these three (the owner's ask was a level, crisp shelf; a folk song
and a trope demo sitting ~4 LU under everything else is the inconsistency Lane F was hired to remove),
and the recipe-faithful renders for the other twelve. The choice is recorded here, not hidden.

## 4. The two single-transient files (why their gain rule differs)

`cc_taamim_torah_superjew` and `cc_asael_genesis_noah_ashkenaz` each carry one sharp transient
(raw TP +0.66 / +0.67; after the light chain's high-pass stage the analysis reads TP as high as +2.57 —
a phase effect of filtering a click-like attack, verified across filter orders). Applying the plain
min() rule to that analysis value forces gains of −3.32 / −4.07 and lands both files near −20 LU —
audibly buried under the shelf, and *not* what Lane F shipped: their SuperJew after-file measures
I −16.22 / TP −0.93, which is only reachable with loudness-target gain + declick + limiter. These two
files were therefore rendered with loudness-target gain and a post-render TP trim (§3 method):
Asael lands −16.11 / −0.64 with no trim needed; SuperJew lands −16.52 / **−0.30** — the trim loop ran
twice and the transient re-emerges at −0.3 dBTP after encode regardless (it is a genuine sharp attack
in the chant, not a click; adeclick does not remove it and the limiter does not catch it). −0.3 dBTP is
0.2 dB outside Lane F's −0.5…−1.5 band, on one event, in a non-clipping encode (sample peak −0.3).
Flagged, not hidden: if that matters, the cost of forcing it is ~0.6 dB more overall trim on this file.

## 5. Output-spec verification (every file in `enhanced/`)

- ffprobe: **44,100 Hz, mono, Vorbis** — all 15. (Chad Gadya's original was 32 kHz; it is resampled to
  house spec.) Bitrates 48–74 kbps, consistent with mono q:a 4 and with Lane F's pilot outputs.
- Metadata: ffprobe format tags are **empty {}** on all 15; a byte scan finds no ID3, no comment/title/
  artist chunks. The only identifier string present is the libvorbis encoder vendor string inside the
  Vorbis header, which every Vorbis file carries (including the originals) — it is not metadata content.
- Durations are unchanged from the originals on all 15 (no trimming anywhere in either chain).

## 6. No-denoise variants (`enhanced-nodenoise/`) — the wateriness fallback

Produced for all 7 historic discs: the historic chain minus the single `afftdn` stage, gains re-measured
per file (they come out within 0.02 dB of the denoised gains — the level was never the denoise's doing).
Measured results (I / TP / LRA / top band): Adon Olam −16.06 / −0.61 / 10.7 / −46.3 · Mimkoimoi −16.02 /
−2.53 / 9.6 / −47.3 · Kawokores −15.97 / −0.75 / 10.9 / −47.8 · Birchos −15.98 / −1.58 / 12.0 / −43.4 ·
Kaddish −16.01 / −0.74 / 14.2 / −45.2 · Odom −17.32 / −0.30 / 10.4 / −48.6 · Zadik −15.97 / −0.93 / 11.1 /
−45.4. If the owner hears FFT wateriness on any held note, swap that one file's variant in — same level,
same peaks, only the denoise missing. (Odom's variant inherits the §3 under-target level; if Odom's
level-variant is chosen and wateriness appears, that combination does not exist yet — it is a 2-minute
re-render from `level_variants2.py` with the afftdn stage dropped.)

## 7. ⚠ Render-path warning — read before any future re-render (full detail in ROLLOUT.md §6)

On this ffmpeg build, a `volume` stage in `-af` is **silently bypassed** when a stereo source is rendered
with `-ac 1` to libvorbis (verified by isolated test renders: stereo-out −19.49 ✓ applied; mono-WAV-out
−19.47 ✓ applied; mono-Vorbis-out −16.46 ✗ absent). Lane F's documented render command uses exactly that
combination, and the pilot's own after-files show the same behaviour — for the three stereo Sirota discs
the static gain never reached the samples in the pilot either; their approved levels are the fold-down
levels, which is why §2 reproduces them exactly. All loudness figures in this document are measured on
the shipped (mono) files, so the tables are true regardless. Any *future* render that needs a gain to
actually apply to a stereo source must put the downmix inside the filter graph (`pan=mono|…`, as
`level_variants2.py` does) instead of using `-ac 1`.
