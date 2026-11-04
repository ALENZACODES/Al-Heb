# Image runbook: what to paste next

Everything below is pasted into ONE conversation with your image tool with image generation on. Paste a whole file as one message, wait for the reply that lists the filenames, check the count, type "next", paste the following file. Save every image under the exact FILENAME shown. Nothing is approved automatically; approval is always your decision (`docs/images/REVIEW-SHEETS.md`).

## Order

| Step | Files | Images | Why |
|---|---|---|---|
| 1 | `redo-01.txt` to `redo-07.txt` | 86 | Regenerate the flagged images (text, square-for-wide, wrong backdrop). Same file names as the originals. |
| 2 | `cmd-036.txt` onward (117 files, see `paste/INDEX.md`) | 1000 | The pending 1000-image list, in command order. |
| 3 | `inter-01.txt` to `inter-06.txt` | 100 | Two scene pictures per intermediate lesson (I-01 to I-50). |
| 4 | `J-MASTER.txt` (read first), then `j-01.txt` to `j-78.txt` | 1000 | Block J: 1000 further pictures, `J-0001.png` to `J-1000.png`, one paste file per command (301 and up). |
| 5 | `tools/images/run3-source.md` (commands 150 to 249, pasted one command per message; see `RUN3.md`) | 1000 | Run 3: 100 commands x 10 images, named by the commands themselves (`TROPE_<name>_mnemonic.png`, `CRAFT_bimah_01.png` ... `FINALE_set_10.png`); rows in `data/images/run3.csv`. |

Steps 2, 3 and 4 and 5 are independent of step 1; run step 1 first because the redo images replace images the lessons already point at.

## Files and counts

- redo (86): redo-01:13, redo-02:13, redo-03:14, redo-04:14, redo-05:14, redo-06:14, redo-07:4
- inter (100): inter-01:18, inter-02:18, inter-03:18, inter-04:18, inter-05:18, inter-06:10
- cmd (1000): cmd-036:9, cmd-037:10, cmd-038:6, cmd-039:6, cmd-040:6, cmd-041:6, cmd-042:6, cmd-043:6, cmd-044:6, cmd-045:6, cmd-046:6, cmd-047:6, cmd-048:6, cmd-049:6, cmd-050:6, cmd-051:6, cmd-052:6, cmd-053:6, cmd-054:6, cmd-055:6, cmd-056:6, cmd-057:6, cmd-058:6, cmd-059:6, cmd-060:6, cmd-061:6, cmd-062:6, cmd-063:6, cmd-064:6, cmd-065:5, cmd-066:5, cmd-067:5, cmd-068:5, cmd-069:5, cmd-070:5, cmd-071:5, cmd-072:5, cmd-073:5, cmd-074:5, cmd-075:5, cmd-076:5, cmd-077:5, cmd-078:5, cmd-079:5, cmd-080:10, cmd-081:10, cmd-082:10, cmd-083:10, cmd-084:10, cmd-085:10, cmd-086:10, cmd-087:10, cmd-088:10, cmd-089:10, cmd-090:10, cmd-091:10, cmd-092:10, cmd-093:10, cmd-094:10, cmd-095:6, cmd-096:10, cmd-097:16, cmd-098:40, cmd-099:6, cmd-100:0, cmd-101-a:8, cmd-101-b:8, cmd-101-c:8, cmd-101-d:7, cmd-102:10, cmd-103:10, cmd-104:10, cmd-105:10, cmd-106:10, cmd-107:10, cmd-108:10, cmd-109:11, cmd-110:10, cmd-111:10, cmd-112:10, cmd-113:10, cmd-114:10, cmd-115:10, cmd-116:10, cmd-117:10, cmd-118:10, cmd-119:10, cmd-120:10, cmd-121:10, cmd-122:10, cmd-123:10, cmd-124:10, cmd-125:10, cmd-126:10, cmd-127:10, cmd-128:10, cmd-129:10, cmd-130:10, cmd-131:10, cmd-132:10, cmd-133:10, cmd-134:10, cmd-135:10, cmd-136:10, cmd-137:10, cmd-138:11, cmd-139:11, cmd-140:11, cmd-141:10, cmd-142:10, cmd-143:10, cmd-144:10, cmd-145:10, cmd-146:10, cmd-147:10, cmd-148:10, cmd-149:11
- block J (1000): j-01:13, j-02:13, j-03:13, j-04:13, j-05:13, j-06:13, j-07:13, j-08:12, j-09:12, j-10:13, j-11:12, j-12:13, j-13:12, j-14:13, j-15:13, j-16:13, j-17:13, j-18:13, j-19:13, j-20:13, j-21:13, j-22:13, j-23:13, j-24:13, j-25:13, j-26:13, j-27:13, j-28:13, j-29:13, j-30:13, j-31:13, j-32:13, j-33:13, j-34:13, j-35:13, j-36:13, j-37:13, j-38:13, j-39:13, j-40:13, j-41:13, j-42:13, j-43:13, j-44:13, j-45:13, j-46:13, j-47:14, j-48:13, j-49:13, j-50:13, j-51:13, j-52:13, j-53:12, j-54:12, j-55:12, j-56:12, j-57:12, j-58:12, j-59:12, j-60:12, j-61:13, j-62:13, j-63:13, j-64:13, j-65:13, j-66:13, j-67:13, j-68:13, j-69:13, j-70:13, j-71:13, j-72:13, j-73:13, j-74:13, j-75:13, j-76:13, j-77:13, j-78:10
- run 3 (1000): one row per image in `data/images/run3.csv`, ten per command, commands 150 to 249

## After each file

1. Count the images against the number above. If any came out with text in it, a square instead of a wide picture, or the wrong scene, ask the image generator to redo just that item, quoting its filename and the rule it broke.
2. Download into one folder per step (for example `~/alef-returns/redo`, `~/alef-returns/cmd`, `~/alef-returns/inter`, `~/alef-returns/block-j`). Keep the exact names; a browser suffix such as " (1)" is reported but never used.
2a. If the image tool returned hashed names (`exec-<uuid>.png`) instead of the FILENAMEs, identify each file first and record the result in an identification map outside the repo (`../alef-image-originals/hashed/map-*.json`, merged into `map-all.json`: hashed name, mtime, id, list, confidence, evidence). Copy the files under their ids into a staging folder and ingest that folder; pass the medium-confidence ids with `--needs-eye ids.txt` so the review page marks them "check by eye". The open review list is `docs/images/REVIEW-QUEUE.md`.
3. Check names before ingesting. Intermediate images: `node tools/images/match_inter.mjs ~/alef-returns/inter` (dry run, writes nothing). Block J: `node tools/images/match_blockj.mjs <folder>` (dry run, also shows which j-NN file is incomplete). Run 3: rename the returned files to their run3 ids, then `node tools/images/match_run3.mjs <folder>` (dry run, shows which command is incomplete). Others: `node tools/images/ingest.mjs ingest <folder> --dry-run`.
4. Ingest: `node tools/images/ingest.mjs ingest <folder>` (redo images: add `--replace`). Intermediate and block J images need their rows in `manifest.csv` first: `node tools/images/append_manifest_rows.mjs --dry-run [data/images/block-j.csv | data/images/run3.csv]`, then without `--dry-run` (see `docs/images/INTER-INGEST.md`).
5. Review: `node tools/images/review_page.mjs`, then open `data/images/review/index.html` (keys: j/k move, a approve, x reject, d redo, Enter enlarge). Download `decisions.json` and run `node tools/images/ingest.mjs apply-decisions decisions.json --force` (`--force` only matters for images you approved despite a text flag). Contact sheets are still available (`node tools/images/sheets.mjs`); see `docs/images/REVIEW-SHEETS.md`. To look at returned files before ingesting: `node tools/images/review_page.mjs --folder <folder>`. Then `node tools/images/validate.mjs` must report 0 errors.
6. Regenerate alt text after any manifest rebuild: `node tools/images/alt_text.mjs`.

## Rules that every file already carries

No text of any kind in an image; only 1:1, 3:2 and 2:3 shapes; exact backdrops; no identifiable real people. If an image breaks one of these, do not approve it.
