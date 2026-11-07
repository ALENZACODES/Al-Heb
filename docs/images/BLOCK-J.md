# Block J: the further 1000 images

Commands 301 to 378. 1000 images that do not repeat the manifest, next1000 or intermediate-lesson sets. Rebuild with `node tools/images/build_blockj.mjs`; selection rules live in `tools/images/spec_blockj.mjs`.

| Part | Images | Source of the key |
|---|---|---|
| Vocabulary theme packs (most concrete words per pack, 12 each plus top-ups) | 559 | word id in data/vocab/themes/*.json |
| Festivals, Shabbat table, Havdalah, synagogue interior | 120 | intermediate lesson id (data/curriculum/intermediate-index.json) |
| One extra scene per intermediate lesson I-01 to I-50 | 50 | lesson id |
| Second memory picture per letter (27) | 27 | letter id in data/letters/letters.json |
| Second memory picture per vowel (15) | 15 | vowel set name in data/images/manifest.csv |
| Flashcard pictures from data/vocab/deck-order.json not already in a pack | 229 | word id |

Files: `data/images/block-j.csv` (id, file, block, command, set, slot, kind, key, aspect, width, height, status, alt, prompt), `docs/images/paste/j-NN.txt`, `docs/images/paste/J-MASTER.txt`. Start with `docs/images/paste/J-MASTER.txt`, then `j-01.txt`.

| File | Command | Images | First | Last |
|---|---|---|---|---|
| j-01.txt | 301 | 13 | J-0001.png | J-0013.png |
| j-02.txt | 302 | 13 | J-0014.png | J-0026.png |
| j-03.txt | 303 | 13 | J-0027.png | J-0039.png |
| j-04.txt | 304 | 13 | J-0040.png | J-0052.png |
| j-05.txt | 305 | 13 | J-0053.png | J-0065.png |
| j-06.txt | 306 | 13 | J-0066.png | J-0078.png |
| j-07.txt | 307 | 13 | J-0079.png | J-0091.png |
| j-08.txt | 308 | 12 | J-0092.png | J-0103.png |
| j-09.txt | 309 | 12 | J-0104.png | J-0115.png |
| j-10.txt | 310 | 13 | J-0116.png | J-0128.png |
| j-11.txt | 311 | 12 | J-0129.png | J-0140.png |
| j-12.txt | 312 | 13 | J-0141.png | J-0153.png |
| j-13.txt | 313 | 12 | J-0154.png | J-0165.png |
| j-14.txt | 314 | 13 | J-0166.png | J-0178.png |
| j-15.txt | 315 | 13 | J-0179.png | J-0191.png |
| j-16.txt | 316 | 13 | J-0192.png | J-0204.png |
| j-17.txt | 317 | 13 | J-0205.png | J-0217.png |
| j-18.txt | 318 | 13 | J-0218.png | J-0230.png |
| j-19.txt | 319 | 13 | J-0231.png | J-0243.png |
| j-20.txt | 320 | 13 | J-0244.png | J-0256.png |
| j-21.txt | 321 | 13 | J-0257.png | J-0269.png |
| j-22.txt | 322 | 13 | J-0270.png | J-0282.png |
| j-23.txt | 323 | 13 | J-0283.png | J-0295.png |
| j-24.txt | 324 | 13 | J-0296.png | J-0308.png |
| j-25.txt | 325 | 13 | J-0309.png | J-0321.png |
| j-26.txt | 326 | 13 | J-0322.png | J-0334.png |
| j-27.txt | 327 | 13 | J-0335.png | J-0347.png |
| j-28.txt | 328 | 13 | J-0348.png | J-0360.png |
| j-29.txt | 329 | 13 | J-0361.png | J-0373.png |
| j-30.txt | 330 | 13 | J-0374.png | J-0386.png |
| j-31.txt | 331 | 13 | J-0387.png | J-0399.png |
| j-32.txt | 332 | 13 | J-0400.png | J-0412.png |
| j-33.txt | 333 | 13 | J-0413.png | J-0425.png |
| j-34.txt | 334 | 13 | J-0426.png | J-0438.png |
| j-35.txt | 335 | 13 | J-0439.png | J-0451.png |
| j-36.txt | 336 | 13 | J-0452.png | J-0464.png |
| j-37.txt | 337 | 13 | J-0465.png | J-0477.png |
| j-38.txt | 338 | 13 | J-0478.png | J-0490.png |
| j-39.txt | 339 | 13 | J-0491.png | J-0503.png |
| j-40.txt | 340 | 13 | J-0504.png | J-0516.png |
| j-41.txt | 341 | 13 | J-0517.png | J-0529.png |
| j-42.txt | 342 | 13 | J-0530.png | J-0542.png |
| j-43.txt | 343 | 13 | J-0543.png | J-0555.png |
| j-44.txt | 344 | 13 | J-0556.png | J-0568.png |
| j-45.txt | 345 | 13 | J-0569.png | J-0581.png |
| j-46.txt | 346 | 13 | J-0582.png | J-0594.png |
| j-47.txt | 347 | 14 | J-0595.png | J-0608.png |
| j-48.txt | 348 | 13 | J-0609.png | J-0621.png |
| j-49.txt | 349 | 13 | J-0622.png | J-0634.png |
| j-50.txt | 350 | 13 | J-0635.png | J-0647.png |
| j-51.txt | 351 | 13 | J-0648.png | J-0660.png |
| j-52.txt | 352 | 13 | J-0661.png | J-0673.png |
| j-53.txt | 353 | 12 | J-0674.png | J-0685.png |
| j-54.txt | 354 | 12 | J-0686.png | J-0697.png |
| j-55.txt | 355 | 12 | J-0698.png | J-0709.png |
| j-56.txt | 356 | 12 | J-0710.png | J-0721.png |
| j-57.txt | 357 | 12 | J-0722.png | J-0733.png |
| j-58.txt | 358 | 12 | J-0734.png | J-0745.png |
| j-59.txt | 359 | 12 | J-0746.png | J-0757.png |
| j-60.txt | 360 | 12 | J-0758.png | J-0769.png |
| j-61.txt | 361 | 13 | J-0770.png | J-0782.png |
| j-62.txt | 362 | 13 | J-0783.png | J-0795.png |
| j-63.txt | 363 | 13 | J-0796.png | J-0808.png |
| j-64.txt | 364 | 13 | J-0809.png | J-0821.png |
| j-65.txt | 365 | 13 | J-0822.png | J-0834.png |
| j-66.txt | 366 | 13 | J-0835.png | J-0847.png |
| j-67.txt | 367 | 13 | J-0848.png | J-0860.png |
| j-68.txt | 368 | 13 | J-0861.png | J-0873.png |
| j-69.txt | 369 | 13 | J-0874.png | J-0886.png |
| j-70.txt | 370 | 13 | J-0887.png | J-0899.png |
| j-71.txt | 371 | 13 | J-0900.png | J-0912.png |
| j-72.txt | 372 | 13 | J-0913.png | J-0925.png |
| j-73.txt | 373 | 13 | J-0926.png | J-0938.png |
| j-74.txt | 374 | 13 | J-0939.png | J-0951.png |
| j-75.txt | 375 | 13 | J-0952.png | J-0964.png |
| j-76.txt | 376 | 13 | J-0965.png | J-0977.png |
| j-77.txt | 377 | 13 | J-0978.png | J-0990.png |
| j-78.txt | 378 | 10 | J-0991.png | J-1000.png |

Word selections are by rule (concrete nouns, everyday actions, plain qualities, counts and times) and are not reviewed by a native speaker; check each picture against its Hebrew word before use.
