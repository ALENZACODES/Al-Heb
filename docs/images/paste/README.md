# ChatGPT paste files

1. Open one ChatGPT conversation (image generation on) and keep it for the whole run; do not attach anything unless a file starts with an ATTACH line.
2. Open the first file listed in INDEX.md (the first pending command), copy the whole file and paste it as one message; ChatGPT makes the numbered images.
3. Save every image under the exact FILENAME shown for it (ChatGPT only makes 1:1, 3:2 and 2:3, so 1792x1024 images come out 3:2 and 1024x1280 ones 2:3; resize later).
4. When ChatGPT replies with the filenames list and waits, check the count against INDEX.md, then type "next" and paste the following file (the next file in INDEX.md). Files split into -a/-b are pasted in order.
5. If ChatGPT puts any text in an image, ask it to redo that item without text. Rebuild these files with `node tools/images/build_paste_files.mjs`.
