# Image runbook: what to paste next

Everything below is pasted into ONE ChatGPT conversation with image generation on. Paste a whole file as one message, wait for the reply that lists the filenames, check the count, type "next", paste the following file. Save every image under the exact FILENAME shown. Nothing is approved automatically; approval is always your decision (`docs/images/REVIEW-SHEETS.md`).

## Order

| Step | Files | Images | Why |
|---|---|---|---|
| 1 | `redo-01.txt` to `redo-07.txt` | 86 | Regenerate the flagged images (text, square-for-wide, wrong backdrop). Same file names as the originals. |
| 2 | `cmd-036.txt` onward (117 files, see `paste/INDEX.md`) | 1000 | The pending 1000-image list, in command order. |
| 3 | `inter-01.txt` to `inter-06.txt` | 100 | Two scene pictures per intermediate lesson (I-01 to I-50). |

Steps 2 and 3 are independent of step 1; run step 1 first because the redo images replace images the lessons already point at.

## Files and counts

- redo (86): redo-01:13, redo-02:13, redo-03:14, redo-04:14, redo-05:14, redo-06:14, redo-07:4
- inter (100): inter-01:18, inter-02:18, inter-03:18, inter-04:18, inter-05:18, inter-06:10
- cmd (1000): cmd-036:9, cmd-037:10, cmd-038:6, cmd-039:6, cmd-040:6, cmd-041:6, cmd-042:6, cmd-043:6, cmd-044:6, cmd-045:6, cmd-046:6, cmd-047:6, cmd-048:6, cmd-049:6, cmd-050:6, cmd-051:6, cmd-052:6, cmd-053:6, cmd-054:6, cmd-055:6, cmd-056:6, cmd-057:6, cmd-058:6, cmd-059:6, cmd-060:6, cmd-061:6, cmd-062:6, cmd-063:6, cmd-064:6, cmd-065:5, cmd-066:5, cmd-067:5, cmd-068:5, cmd-069:5, cmd-070:5, cmd-071:5, cmd-072:5, cmd-073:5, cmd-074:5, cmd-075:5, cmd-076:5, cmd-077:5, cmd-078:5, cmd-079:5, cmd-080:10, cmd-081:10, cmd-082:10, cmd-083:10, cmd-084:10, cmd-085:10, cmd-086:10, cmd-087:10, cmd-088:10, cmd-089:10, cmd-090:10, cmd-091:10, cmd-092:10, cmd-093:10, cmd-094:10, cmd-095:6, cmd-096:10, cmd-097:16, cmd-098:40, cmd-099:6, cmd-100:0, cmd-101-a:8, cmd-101-b:8, cmd-101-c:8, cmd-101-d:7, cmd-102:10, cmd-103:10, cmd-104:10, cmd-105:10, cmd-106:10, cmd-107:10, cmd-108:10, cmd-109:11, cmd-110:10, cmd-111:10, cmd-112:10, cmd-113:10, cmd-114:10, cmd-115:10, cmd-116:10, cmd-117:10, cmd-118:10, cmd-119:10, cmd-120:10, cmd-121:10, cmd-122:10, cmd-123:10, cmd-124:10, cmd-125:10, cmd-126:10, cmd-127:10, cmd-128:10, cmd-129:10, cmd-130:10, cmd-131:10, cmd-132:10, cmd-133:10, cmd-134:10, cmd-135:10, cmd-136:10, cmd-137:10, cmd-138:11, cmd-139:11, cmd-140:11, cmd-141:10, cmd-142:10, cmd-143:10, cmd-144:10, cmd-145:10, cmd-146:10, cmd-147:10, cmd-148:10, cmd-149:11

## After each file

1. Count the images against the number above. If any came out with text in it, a square instead of a wide picture, or the wrong scene, ask ChatGPT to redo just that item, quoting its filename and the rule it broke.
2. Download into one folder per step (for example `~/alef-returns/redo`, `~/alef-returns/cmd`, `~/alef-returns/inter`). Keep the exact names; a browser suffix such as " (1)" is reported but never used.
3. Check names before ingesting. Intermediate images: `node tools/images/match_inter.mjs ~/alef-returns/inter` (dry run, writes nothing). Others: `node tools/images/ingest.mjs ingest <folder> --dry-run`.
4. Ingest: `node tools/images/ingest.mjs ingest <folder>` (redo images: add `--replace`). Intermediate images need their rows in `manifest.csv` first; see `docs/images/INTER-INGEST.md`.
5. Open the contact sheets (`node tools/images/ingest.mjs sheets`, or `node tools/images/sheets.mjs`), look at every image, and record your decisions with `apply-decisions` as described in `docs/images/REVIEW-SHEETS.md`. Then `node tools/images/validate.mjs` must report 0 errors.
6. Regenerate alt text after any manifest rebuild: `node tools/images/alt_text.mjs`.

## Rules that every file already carries

No text of any kind in an image; only 1:1, 3:2 and 2:3 shapes; exact backdrops; no identifiable real people. If an image breaks one of these, do not approve it.
