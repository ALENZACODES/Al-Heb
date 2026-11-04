# Codex batch 01: import and review

Source: `C:\Users\user\.codex\generated_images\01a1a3a4-7a61-74e3-89fa-235efabff120` (286 files, not 202). Ordered by device mtime; matched to `data/images/manifest.csv` rows by visual content plus order. Nothing is approved: every file stays `pending`.

## Summary

- 286 files: 282 matched (278 high, 4 medium), 4 extras (retries), 0 unmatched. Rows covered: 1 to 282 (STYLE_sample_cup to L26_pe_final_print_mnemonic).
- Text/letters/numerals inside images: none found (eye check of all 286 on contact sheets, 8 zoomed; tesseract eng+heb gave only noise).
- Aspect: 79 files differ from the manifest ratio. All are manifest-wide (1792x1024) rows delivered as 1254x1254 squares (the 3 s1/s2/s3 scenes per letter, CHAR sheets, TEST_consistency). Only the 6 BG_* scenes came out wide (1659x948).
- Background mismatch: 58 of 75 letter scene images (s1/s2/s3) use a different scene than the prompt names (e.g. cafe or shabbat instead of market). The object is right.
- Scene images are an inset rounded panel on a cream border, not full-bleed (minor).
- Style: palette, outlines and character looks hold throughout (Ari: curly dark hair, trimmed beard, navy tee, silver chain; Noa: wavy hair, terracotta blouse, gold hoops). Minor drift: mouth set mixes peach-filled and outline-only faces; a few glossy highlights (phone, gold bars, balloon, bottle) against the no-gradient rule; full-body Ari/Noa trousers vary.
- Extras: idx 1 (cup try 1), 93 (zayin mnemonic try 1), 126 (Noa yo-yo try 1, two yo-yos), 245 (tav mnemonic try 1). Which of each pair is "kept" is inferred (later one, and the one later images reuse); the cup pick is a guess.

## Files

- Repo copies: `assets/images/incoming/<manifest-name>`; extras in `assets/images/incoming/_extras/`. Web-size: re-encoded lossless PNG, squares 1024x1024, portrait frames 1024x1280, wide 1600 px; metadata stripped. About 229 MB total.
- Original-resolution copies (not in git): `/home/claude/research_notes/images/codex-batch-01/originals/exec-<uuid>.png` (1254x1254 etc.).
- Full data: `docs/images/codex-batch-01.json` (sha256 of source and repo copy, mtimeMs, sizes, scene seen vs expected).

## Table

| # | uuid | mtimeMs | matched manifest file | conf | defects |
|---|------|---------|-----------------------|------|---------|
| 1 | c96ae3fe | 1793746880473 | EXTRA of STYLE_sample_cup.png | medium | - |
| 2 | e224b98d | 1793746912402 | STYLE_sample_cup.png | medium | - |
| 3 | 8efef0d9 | 1793747014860 | CHAR_ari_sheet.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75) |
| 4 | 1de52592 | 1793747053919 | CHAR_noa_sheet.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75) |
| 5 | c1d7cf07 | 1793747086647 | CHAR_ari_neutral.png | high | - |
| 6 | 067dc538 | 1793747121642 | CHAR_ari_listen.png | high | - |
| 7 | 3230de85 | 1793747144633 | CHAR_ari_speak.png | high | - |
| 8 | 6c1779ce | 1793747178569 | CHAR_ari_celebrate.png | high | - |
| 9 | 7a2f8d67 | 1793747202123 | CHAR_noa_neutral.png | high | - |
| 10 | 797965db | 1793747260525 | CHAR_noa_listen.png | high | - |
| 11 | d6e9548c | 1793747285863 | CHAR_noa_speak.png | high | - |
| 12 | 72aa2e89 | 1793747323363 | CHAR_noa_celebrate.png | high | - |
| 13 | d6fb5af4 | 1793747376708 | CHAR_ari_synagogue.png | high | - |
| 14 | 9ecad15d | 1793747430532 | CHAR_noa_synagogue.png | high | - |
| 15 | 3949dcfc | 1793747467520 | CHAR_ari_telaviv.png | high | - |
| 16 | 26dd6174 | 1793747505813 | CHAR_noa_telaviv.png | high | - |
| 17 | 83572e2d | 1793747532364 | MOUTH_ah.png | high | style drift (minor): mouth set mixes peach-filled and outline-only faces |
| 18 | d093d430 | 1793747561215 | MOUTH_eh.png | high | style drift (minor): mouth set mixes peach-filled and outline-only faces |
| 19 | c5233dbc | 1793747590679 | MOUTH_ee.png | high | style drift (minor): mouth set mixes peach-filled and outline-only faces |
| 20 | fe24100e | 1793747615109 | MOUTH_oh.png | high | style drift (minor): mouth set mixes peach-filled and outline-only faces |
| 21 | 69da736f | 1793747641354 | MOUTH_oo.png | high | style drift (minor): mouth set mixes peach-filled and outline-only faces |
| 22 | 45b40c95 | 1793747666575 | MOUTH_none.png | high | style drift (minor): mouth set mixes peach-filled and outline-only faces |
| 23 | ced341bf | 1793747689054 | FRAME_lettercard.png | high | - |
| 24 | d2c79053 | 1793747716179 | FRAME_lettercard_dual.png | high | - |
| 25 | 534cd108 | 1793747752922 | BG_jerusalem.png | high | - |
| 26 | 70dab0bb | 1793747791918 | BG_telaviv.png | high | - |
| 27 | b0e51bc8 | 1793747832957 | BG_shabbat.png | high | - |
| 28 | 0f9ceb55 | 1793747874504 | BG_synagogue.png | high | - |
| 29 | 76fa2178 | 1793747912697 | BG_market.png | high | - |
| 30 | 7ac46354 | 1793747949303 | BG_cafe.png | high | - |
| 31 | e554795b | 1793748037371 | TEST_consistency_1.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75) |
| 32 | 191e1c47 | 1793748108648 | TEST_consistency_2.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75) |
| 33 | 91ce97d5 | 1793748153772 | L01_alef_print_mnemonic.png | high | - |
| 34 | e30ef778 | 1793748189675 | L01_alef_print_ari.png | high | - |
| 35 | e8c6be9d | 1793748255662 | L01_alef_print_noa.png | high | - |
| 36 | 51ed812b | 1793748284601 | L01_alef_print_silhouette.png | high | - |
| 37 | 478951eb | 1793748313027 | L01_alef_print_v1.png | high | - |
| 38 | bc66d3d8 | 1793748343903 | L01_alef_print_v2.png | high | - |
| 39 | 394aafa0 | 1793748381881 | L01_alef_print_v3.png | high | - |
| 40 | 4f8b4480 | 1793748421995 | L01_alef_print_s1.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_telaviv instead of BG_jerusalem |
| 41 | c523074e | 1793748461700 | L01_alef_print_s2.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_jerusalem instead of BG_market |
| 42 | d6c2a286 | 1793748503409 | L01_alef_print_s3.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_cafe instead of BG_telaviv |
| 43 | 1e2bf4f3 | 1793748549402 | L02_bet_print_mnemonic.png | high | - |
| 44 | a5bb51a6 | 1793748588084 | L02_bet_print_ari.png | high | - |
| 45 | 785f6e0b | 1793748625350 | L02_bet_print_noa.png | high | - |
| 46 | 13143391 | 1793748707183 | L02_bet_print_silhouette.png | high | - |
| 47 | 365b79d8 | 1793748765897 | L02_bet_print_v1.png | high | - |
| 48 | 4d8fde01 | 1793748803266 | L02_bet_print_v2.png | high | - |
| 49 | 268aa886 | 1793748842684 | L02_bet_print_v3.png | high | - |
| 50 | 9c324ab9 | 1793748899785 | L02_bet_print_s1.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75) |
| 51 | aa6f4b7d | 1793748952812 | L02_bet_print_s2.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75) |
| 52 | fa0e17fe | 1793749042600 | L02_bet_print_s3.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75) |
| 53 | 3ca1362f | 1793749089883 | L03_gimel_print_mnemonic.png | high | - |
| 54 | fa52e441 | 1793749149262 | L03_gimel_print_ari.png | high | - |
| 55 | 3169e1e3 | 1793749202238 | L03_gimel_print_noa.png | high | - |
| 56 | ea0d841d | 1793749248060 | L03_gimel_print_silhouette.png | high | - |
| 57 | 17d4b536 | 1793749297820 | L03_gimel_print_v1.png | high | - |
| 58 | 677b7a51 | 1793749348626 | L03_gimel_print_v2.png | high | - |
| 59 | 4a598854 | 1793749395550 | L03_gimel_print_v3.png | high | - |
| 60 | f4320a59 | 1793749454317 | L03_gimel_print_s1.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75) |
| 61 | fb417a05 | 1793749520351 | L03_gimel_print_s2.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_cafe instead of BG_market |
| 62 | 3b1bc063 | 1793749585236 | L03_gimel_print_s3.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_market instead of BG_telaviv |
| 63 | a01d9751 | 1793749658206 | L04_dalet_print_mnemonic.png | high | - |
| 64 | d43c0437 | 1793749715296 | L04_dalet_print_ari.png | high | - |
| 65 | d3a18bfc | 1793749774877 | L04_dalet_print_noa.png | high | - |
| 66 | 7df3a54d | 1793749821438 | L04_dalet_print_silhouette.png | high | - |
| 67 | fd6aa297 | 1793749877172 | L04_dalet_print_v1.png | high | - |
| 68 | 5737e8c5 | 1793749922991 | L04_dalet_print_v2.png | high | - |
| 69 | 3185bc01 | 1793749973140 | L04_dalet_print_v3.png | high | - |
| 70 | 0066d2ff | 1793750033525 | L04_dalet_print_s1.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75) |
| 71 | 803489c2 | 1793750101414 | L04_dalet_print_s2.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_telaviv instead of BG_market |
| 72 | 81e19a8e | 1793750176440 | L04_dalet_print_s3.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_shabbat instead of BG_telaviv |
| 73 | 1d952f8f | 1793750230498 | L05_he_print_mnemonic.png | high | - |
| 74 | 50e26092 | 1793750288364 | L05_he_print_ari.png | high | - |
| 75 | 17563c21 | 1793750348310 | L05_he_print_noa.png | high | - |
| 76 | 3e29384e | 1793750419694 | L05_he_print_silhouette.png | high | - |
| 77 | 22e91fa9 | 1793750497288 | L05_he_print_v1.png | high | - |
| 78 | f0ad83ab | 1793750578965 | L05_he_print_v2.png | high | - |
| 79 | 9e68a091 | 1793750663015 | L05_he_print_v3.png | high | - |
| 80 | 1fbc4ecf | 1793750751522 | L05_he_print_s1.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75) |
| 81 | 6d805008 | 1793750850415 | L05_he_print_s2.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_cafe instead of BG_market |
| 82 | e1c3bbe1 | 1793750921952 | L05_he_print_s3.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75) |
| 83 | 6140426e | 1793750974820 | L06_vav_print_mnemonic.png | high | - |
| 84 | a0cfc6f9 | 1793751109291 | L06_vav_print_ari.png | high | - |
| 85 | 4ca10f77 | 1793751144505 | L06_vav_print_noa.png | high | - |
| 86 | 5507eda4 | 1793751173854 | L06_vav_print_silhouette.png | high | - |
| 87 | 3138a426 | 1793751200336 | L06_vav_print_v1.png | high | - |
| 88 | 83d477c4 | 1793751226955 | L06_vav_print_v2.png | high | - |
| 89 | 5b017253 | 1793751254542 | L06_vav_print_v3.png | high | - |
| 90 | dfa23f7b | 1793751298925 | L06_vav_print_s1.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75) |
| 91 | 996deb3c | 1793751339826 | L06_vav_print_s2.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_synagogue instead of BG_market |
| 92 | d082a203 | 1793751389312 | L06_vav_print_s3.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_cafe instead of BG_telaviv |
| 93 | 25877d3d | 1793751420117 | EXTRA of L07_zayin_print_mnemonic.png | high | - |
| 94 | a9c9c185 | 1793751449644 | L07_zayin_print_mnemonic.png | medium | - |
| 95 | fa24291e | 1793751511686 | L07_zayin_print_ari.png | high | - |
| 96 | 2a0fb4a9 | 1793751549391 | L07_zayin_print_noa.png | high | - |
| 97 | 26fcf125 | 1793751579885 | L07_zayin_print_silhouette.png | high | - |
| 98 | 8017d06d | 1793751610645 | L07_zayin_print_v1.png | high | - |
| 99 | 09895dec | 1793751638406 | L07_zayin_print_v2.png | high | - |
| 100 | 358164ed | 1793751671184 | L07_zayin_print_v3.png | high | - |
| 101 | d25a2438 | 1793751719430 | L07_zayin_print_s1.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_market instead of BG_jerusalem |
| 102 | cbdfc3e0 | 1793751760310 | L07_zayin_print_s2.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_jerusalem instead of BG_market |
| 103 | e5b7dc27 | 1793751807754 | L07_zayin_print_s3.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_cafe instead of BG_telaviv |
| 104 | 5c12952b | 1793751852779 | L08_chet_print_mnemonic.png | high | - |
| 105 | dce52a9d | 1793751893474 | L08_chet_print_ari.png | high | - |
| 106 | 837b43a4 | 1793751930901 | L08_chet_print_noa.png | high | - |
| 107 | 6bc24cdb | 1793751969468 | L08_chet_print_silhouette.png | high | - |
| 108 | e27e7727 | 1793752019242 | L08_chet_print_v1.png | high | - |
| 109 | d2fed422 | 1793752061014 | L08_chet_print_v2.png | high | - |
| 110 | c24e8dbb | 1793752105468 | L08_chet_print_v3.png | high | - |
| 111 | 0043b0ee | 1793752161956 | L08_chet_print_s1.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_cafe instead of BG_jerusalem |
| 112 | 082fe9d1 | 1793752216602 | L08_chet_print_s2.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_shabbat instead of BG_market |
| 113 | 60b750fa | 1793752270116 | L08_chet_print_s3.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75) |
| 114 | bb70c934 | 1793752318331 | L09_tet_print_mnemonic.png | high | - |
| 115 | a853cc03 | 1793752368779 | L09_tet_print_ari.png | high | - |
| 116 | c956a8d7 | 1793752423685 | L09_tet_print_noa.png | high | - |
| 117 | 1aae6360 | 1793752469042 | L09_tet_print_silhouette.png | high | - |
| 118 | 210739fc | 1793752515152 | L09_tet_print_v1.png | high | - |
| 119 | 4a5d3034 | 1793752569862 | L09_tet_print_v2.png | high | - |
| 120 | 564b8e3f | 1793752621547 | L09_tet_print_v3.png | high | - |
| 121 | d91cd76b | 1793752684346 | L09_tet_print_s1.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_cafe instead of BG_jerusalem |
| 122 | dde3eddd | 1793752749416 | L09_tet_print_s2.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_jerusalem instead of BG_market |
| 123 | cf6b01df | 1793752818708 | L09_tet_print_s3.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_market instead of BG_telaviv |
| 124 | e869f58a | 1793752871692 | L10_yod_print_mnemonic.png | high | - |
| 125 | a1994526 | 1793752933388 | L10_yod_print_ari.png | high | - |
| 126 | 60fb6b72 | 1793752982536 | EXTRA of L10_yod_print_noa.png | high | - |
| 127 | 7a9694a5 | 1793753027623 | L10_yod_print_noa.png | medium | - |
| 128 | bb6f6163 | 1793753064145 | L10_yod_print_silhouette.png | high | content (minor): silhouette reads as a round fruit with a stem, not a yo-yo |
| 129 | 17ae71ef | 1793753110131 | L10_yod_print_v1.png | high | - |
| 130 | 4d2375eb | 1793753148120 | L10_yod_print_v2.png | high | - |
| 131 | e1802556 | 1793753185458 | L10_yod_print_v3.png | high | - |
| 132 | fddc0559 | 1793753292492 | L10_yod_print_s1.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75) |
| 133 | 20fbb033 | 1793753363665 | L10_yod_print_s2.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_telaviv instead of BG_market |
| 134 | 5a136c06 | 1793753445804 | L10_yod_print_s3.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_cafe instead of BG_telaviv |
| 135 | 8311fd40 | 1793753500981 | L11_kaf_print_mnemonic.png | high | - |
| 136 | 25e6b497 | 1793753564492 | L11_kaf_print_ari.png | high | - |
| 137 | bb11cb02 | 1793753637324 | L11_kaf_print_noa.png | high | - |
| 138 | 303643e1 | 1793753698877 | L11_kaf_print_silhouette.png | high | - |
| 139 | 31e30e6c | 1793753759767 | L11_kaf_print_v1.png | high | - |
| 140 | e06150ae | 1793753818557 | L11_kaf_print_v2.png | high | - |
| 141 | c232516f | 1793753880860 | L11_kaf_print_v3.png | high | - |
| 142 | 3f228c83 | 1793753945408 | L11_kaf_print_s1.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_telaviv instead of BG_jerusalem |
| 143 | cc700074 | 1793754010415 | L11_kaf_print_s2.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_cafe instead of BG_market |
| 144 | c1c14ac8 | 1793754067357 | L11_kaf_print_s3.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_synagogue instead of BG_telaviv |
| 145 | ea08b09e | 1793754113777 | L12_lamed_print_mnemonic.png | high | - |
| 146 | 4f985653 | 1793754189871 | L12_lamed_print_ari.png | high | - |
| 147 | af138ad5 | 1793754261540 | L12_lamed_print_noa.png | high | - |
| 148 | 1ba922df | 1793754312450 | L12_lamed_print_silhouette.png | high | - |
| 149 | c7d44569 | 1793754357272 | L12_lamed_print_v1.png | high | - |
| 150 | 355347d3 | 1793754405442 | L12_lamed_print_v2.png | high | - |
| 151 | 5b3eaa5a | 1793754475176 | L12_lamed_print_v3.png | high | - |
| 152 | 1f48eeca | 1793754562588 | L12_lamed_print_s1.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_cafe instead of BG_jerusalem |
| 153 | 16e0c4cf | 1793754637155 | L12_lamed_print_s2.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_jerusalem instead of BG_market |
| 154 | b3da6001 | 1793754723312 | L12_lamed_print_s3.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_market instead of BG_telaviv |
| 155 | 2b76d898 | 1793754774308 | L13_mem_print_mnemonic.png | high | - |
| 156 | 1cce3e89 | 1793754845529 | L13_mem_print_ari.png | high | - |
| 157 | c70d5a99 | 1793754915249 | L13_mem_print_noa.png | high | - |
| 158 | b8171247 | 1793754966228 | L13_mem_print_silhouette.png | high | - |
| 159 | 4a809bcd | 1793755019871 | L13_mem_print_v1.png | high | - |
| 160 | c9cabeac | 1793755082887 | L13_mem_print_v2.png | high | - |
| 161 | c0e961ca | 1793755146088 | L13_mem_print_v3.png | high | - |
| 162 | 35a9a998 | 1793755249850 | L13_mem_print_s1.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_cafe instead of BG_jerusalem |
| 163 | b2f029e3 | 1793755314578 | L13_mem_print_s2.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_jerusalem instead of BG_market |
| 164 | e14140bd | 1793755384391 | L13_mem_print_s3.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_shabbat instead of BG_telaviv |
| 165 | 6c4891f5 | 1793755442796 | L14_nun_print_mnemonic.png | high | - |
| 166 | c741a65b | 1793755520999 | L14_nun_print_ari.png | high | - |
| 167 | 21d10313 | 1793755584355 | L14_nun_print_noa.png | high | - |
| 168 | c6cd84d1 | 1793755634000 | L14_nun_print_silhouette.png | high | - |
| 169 | 14ac5824 | 1793755700035 | L14_nun_print_v1.png | high | - |
| 170 | 71336f24 | 1793755754894 | L14_nun_print_v2.png | high | - |
| 171 | d7f6e0a0 | 1793755813984 | L14_nun_print_v3.png | high | - |
| 172 | 222fac93 | 1793755941800 | L14_nun_print_s1.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_shabbat instead of BG_jerusalem |
| 173 | 03c654b7 | 1793755991044 | L14_nun_print_s2.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_jerusalem instead of BG_market |
| 174 | c88d0c63 | 1793756032888 | L14_nun_print_s3.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75) |
| 175 | 4fb3c9ef | 1793756063549 | L15_samekh_print_mnemonic.png | high | - |
| 176 | 556dcc95 | 1793756103416 | L15_samekh_print_ari.png | high | - |
| 177 | 6dbd1c3a | 1793756140955 | L15_samekh_print_noa.png | high | - |
| 178 | fdea7418 | 1793756171051 | L15_samekh_print_silhouette.png | high | - |
| 179 | 6bf0d177 | 1793756202096 | L15_samekh_print_v1.png | high | - |
| 180 | 44fb4189 | 1793756236407 | L15_samekh_print_v2.png | high | - |
| 181 | d691c65b | 1793756272627 | L15_samekh_print_v3.png | high | - |
| 182 | 0225dea2 | 1793756336034 | L15_samekh_print_s1.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_cafe instead of BG_jerusalem |
| 183 | a702acd7 | 1793756382321 | L15_samekh_print_s2.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_jerusalem instead of BG_market |
| 184 | 043bf6af | 1793756479913 | L15_samekh_print_s3.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_market instead of BG_telaviv |
| 185 | 9cedaf48 | 1793756542780 | L16_ayin_print_mnemonic.png | high | - |
| 186 | 30406166 | 1793756587360 | L16_ayin_print_ari.png | high | - |
| 187 | 4d1f484a | 1793756631415 | L16_ayin_print_noa.png | high | - |
| 188 | abb9ad09 | 1793756670374 | L16_ayin_print_silhouette.png | high | - |
| 189 | 26df8d41 | 1793756707779 | L16_ayin_print_v1.png | high | - |
| 190 | b6415bdf | 1793756740957 | L16_ayin_print_v2.png | high | - |
| 191 | 4a495f58 | 1793756789541 | L16_ayin_print_v3.png | high | - |
| 192 | a5176686 | 1793756845637 | L16_ayin_print_s1.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_cafe instead of BG_jerusalem |
| 193 | 0f9030cb | 1793756899590 | L16_ayin_print_s2.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_jerusalem instead of BG_market |
| 194 | 29d528bd | 1793756978807 | L16_ayin_print_s3.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75) |
| 195 | 73032405 | 1793757021713 | L17_pe_print_mnemonic.png | high | - |
| 196 | 865a5bb1 | 1793757070544 | L17_pe_print_ari.png | high | - |
| 197 | f49a7a9f | 1793757117763 | L17_pe_print_noa.png | high | - |
| 198 | 825c1d5d | 1793757162947 | L17_pe_print_silhouette.png | high | - |
| 199 | 51c112ca | 1793757206338 | L17_pe_print_v1.png | high | - |
| 200 | 285294c7 | 1793757252020 | L17_pe_print_v2.png | high | - |
| 201 | 5bef53ee | 1793757304364 | L17_pe_print_v3.png | high | - |
| 202 | 45858af3 | 1793757361274 | L17_pe_print_s1.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_cafe instead of BG_jerusalem |
| 203 | 1ff94416 | 1793757425034 | L17_pe_print_s2.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_telaviv instead of BG_market |
| 204 | ad57340d | 1793757509130 | L17_pe_print_s3.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_market instead of BG_telaviv |
| 205 | cc73f279 | 1793757557547 | L18_tsadi_print_mnemonic.png | high | - |
| 206 | 59607bd8 | 1793757612220 | L18_tsadi_print_ari.png | high | - |
| 207 | ba7f65f1 | 1793757664790 | L18_tsadi_print_noa.png | high | - |
| 208 | 975b39ef | 1793757709551 | L18_tsadi_print_silhouette.png | high | - |
| 209 | f56fdf38 | 1793757757357 | L18_tsadi_print_v1.png | high | - |
| 210 | 3f7a0e44 | 1793757811118 | L18_tsadi_print_v2.png | high | - |
| 211 | bff49331 | 1793757866458 | L18_tsadi_print_v3.png | high | - |
| 212 | 436ed9de | 1793757937852 | L18_tsadi_print_s1.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75) |
| 213 | 60172b3b | 1793758001923 | L18_tsadi_print_s2.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_cafe instead of BG_market |
| 214 | 466980c9 | 1793758068391 | L18_tsadi_print_s3.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_jerusalem instead of BG_telaviv |
| 215 | 01ee7e6c | 1793758132775 | L19_qof_print_mnemonic.png | high | - |
| 216 | d08b8dad | 1793758202987 | L19_qof_print_ari.png | high | - |
| 217 | 1fd749c6 | 1793758275772 | L19_qof_print_noa.png | high | - |
| 218 | cb94b093 | 1793758334466 | L19_qof_print_silhouette.png | high | - |
| 219 | 737147ea | 1793758400093 | L19_qof_print_v1.png | high | - |
| 220 | 9e86eeb4 | 1793758458343 | L19_qof_print_v2.png | high | - |
| 221 | 09228652 | 1793758518232 | L19_qof_print_v3.png | high | - |
| 222 | e72efb4a | 1793758590953 | L19_qof_print_s1.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_cafe instead of BG_jerusalem |
| 223 | 64f63f9f | 1793758669857 | L19_qof_print_s2.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_synagogue instead of BG_market |
| 224 | 6a8a7c79 | 1793758741364 | L19_qof_print_s3.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_market instead of BG_telaviv |
| 225 | 4f22890a | 1793758799982 | L20_resh_print_mnemonic.png | high | - |
| 226 | 24c5cd10 | 1793758860005 | L20_resh_print_ari.png | high | - |
| 227 | 22bbe82f | 1793758924171 | L20_resh_print_noa.png | high | - |
| 228 | f45801a5 | 1793758977969 | L20_resh_print_silhouette.png | high | - |
| 229 | c19dc8aa | 1793759044838 | L20_resh_print_v1.png | high | - |
| 230 | 4228d79c | 1793759147088 | L20_resh_print_v2.png | high | - |
| 231 | 9a08911a | 1793759220376 | L20_resh_print_v3.png | high | - |
| 232 | f5cc0709 | 1793759299249 | L20_resh_print_s1.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_cafe instead of BG_jerusalem |
| 233 | a126cfab | 1793759386318 | L20_resh_print_s2.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_telaviv instead of BG_market |
| 234 | 4ed5d3a9 | 1793759472655 | L20_resh_print_s3.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_jerusalem instead of BG_telaviv |
| 235 | e83e9bb7 | 1793759547343 | L21_shin_print_mnemonic.png | high | - |
| 236 | a2f929f6 | 1793759631690 | L21_shin_print_ari.png | high | - |
| 237 | 58f89432 | 1793759712731 | L21_shin_print_noa.png | high | - |
| 238 | 232e5c9d | 1793759779984 | L21_shin_print_silhouette.png | high | - |
| 239 | 419b7519 | 1793759850664 | L21_shin_print_v1.png | high | - |
| 240 | b6fbe632 | 1793759921384 | L21_shin_print_v2.png | high | - |
| 241 | 18705f77 | 1793759998692 | L21_shin_print_v3.png | high | - |
| 242 | 9d163d2d | 1793760082481 | L21_shin_print_s1.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75) |
| 243 | 4e0aab33 | 1793760171194 | L21_shin_print_s2.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_telaviv instead of BG_market |
| 244 | 1ce47d31 | 1793760266407 | L21_shin_print_s3.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_shabbat instead of BG_telaviv |
| 245 | 541776ab | 1793760326372 | EXTRA of L22_tav_print_mnemonic.png | high | - |
| 246 | 8197fc97 | 1793760392639 | L22_tav_print_mnemonic.png | medium | - |
| 247 | ac79b4df | 1793760483859 | L22_tav_print_ari.png | high | - |
| 248 | 473753b5 | 1793760568768 | L22_tav_print_noa.png | high | - |
| 249 | 6e118ab5 | 1793760645468 | L22_tav_print_silhouette.png | high | - |
| 250 | 1e512ea9 | 1793760717421 | L22_tav_print_v1.png | high | - |
| 251 | 8c6a0a47 | 1793760797645 | L22_tav_print_v2.png | high | - |
| 252 | 4f5c6c1b | 1793760874563 | L22_tav_print_v3.png | high | - |
| 253 | 0d275bed | 1793760969862 | L22_tav_print_s1.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_market instead of BG_jerusalem |
| 254 | 71a0bd52 | 1793761050528 | L22_tav_print_s2.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_cafe instead of BG_market |
| 255 | 2bf2bd4c | 1793761125558 | L22_tav_print_s3.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_synagogue instead of BG_telaviv |
| 256 | ad50f5f8 | 1793761201715 | L23_kaf_final_print_mnemonic.png | high | - |
| 257 | 99135ed2 | 1793761287555 | L23_kaf_final_print_ari.png | high | - |
| 258 | 4deaf49b | 1793761363016 | L23_kaf_final_print_noa.png | high | - |
| 259 | a316c568 | 1793761448950 | L23_kaf_final_print_silhouette.png | high | - |
| 260 | 90c48870 | 1793761524304 | L23_kaf_final_print_v1.png | high | - |
| 261 | f27e2953 | 1793761670291 | L23_kaf_final_print_v2.png | high | - |
| 262 | 58b3a6dc | 1793761707728 | L23_kaf_final_print_v3.png | high | content: "go (arrow)" shows a walking man, no arrow |
| 263 | 364f75df | 1793761751144 | L23_kaf_final_print_s1.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75) |
| 264 | 3ce7c8aa | 1793761818716 | L23_kaf_final_print_s2.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_jerusalem instead of BG_market |
| 265 | dc1f59cb | 1793761860614 | L23_kaf_final_print_s3.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75) |
| 266 | f5ebed75 | 1793761891134 | L24_mem_final_print_mnemonic.png | high | - |
| 267 | c326250b | 1793761932379 | L24_mem_final_print_ari.png | high | - |
| 268 | 02053de7 | 1793761968231 | L24_mem_final_print_noa.png | high | - |
| 269 | 90783ac4 | 1793761998037 | L24_mem_final_print_silhouette.png | high | - |
| 270 | 416adc32 | 1793762030434 | L24_mem_final_print_v1.png | high | - |
| 271 | ff86f4b1 | 1793762062038 | L24_mem_final_print_v2.png | high | - |
| 272 | b5462014 | 1793762097465 | L24_mem_final_print_v3.png | high | - |
| 273 | 032059dc | 1793762142581 | L24_mem_final_print_s1.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_cafe instead of BG_jerusalem |
| 274 | 5212934d | 1793762192369 | L24_mem_final_print_s2.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_telaviv instead of BG_market |
| 275 | 2edd07f4 | 1793762241408 | L24_mem_final_print_s3.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_jerusalem instead of BG_telaviv |
| 276 | 5828f15a | 1793762280672 | L25_nun_final_print_mnemonic.png | high | - |
| 277 | 805d82ec | 1793762327655 | L25_nun_final_print_ari.png | high | - |
| 278 | 1b7a4e9a | 1793762374777 | L25_nun_final_print_noa.png | high | - |
| 279 | 9b90b67d | 1793762415229 | L25_nun_final_print_silhouette.png | high | - |
| 280 | d1bc1752 | 1793762456364 | L25_nun_final_print_v1.png | high | - |
| 281 | 54d2facb | 1793762529737 | L25_nun_final_print_v2.png | high | - |
| 282 | 1a3a5cf5 | 1793762565161 | L25_nun_final_print_v3.png | high | - |
| 283 | 2300d5bd | 1793762623117 | L25_nun_final_print_s1.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75) |
| 284 | 155502d3 | 1793762672401 | L25_nun_final_print_s2.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_telaviv instead of BG_market |
| 285 | 62ca5335 | 1793762728723 | L25_nun_final_print_s3.png | high | aspect: file 1254x1254 (1.00) vs manifest 1792x1024 (1.75); background differs from prompt: BG_shabbat instead of BG_telaviv |
| 286 | c42cf757 | 1793762767528 | L26_pe_final_print_mnemonic.png | high | - |
