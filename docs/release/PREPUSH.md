# Pre-push gate

Usage: `tools/release/prepush.sh [--dry]`

Steps, in order. A normal run stops at the first failure with a `FAIL [step]` message.

1. `node tools/build-precache.mjs` (rewrites the precache manifest).
2. `node tools/meta/scan.mjs` (image, PDF, audio and data metadata), then two extra checks:
   - every `.webp` under `assets/` starts with `RIFF` and has `WEBP` at bytes 8 to 11;
   - no `data/**/*.json` file contains the string `/home/`.
3. `git add -A`, then `node tools/meta/scan.mjs --text`.
4. Commit messages and author fields in `origin/main..HEAD` (read via `git log`, read-only) must not contain a co-author trailer, a session trailer, a "generated with" line, or any tool or vendor name. The pattern list lives in the script.
5. `npm test` (unit tier).
6. Prints `git status --short | wc -l`.

`--dry` is a read-only rehearsal: it skips the precache rebuild, `git add -A` and `npm test`, runs every other check, does not stop on a failure, and lists all failing steps at the end. The text scan in dry mode covers tracked files only.

Exit codes: 0 pass, 1 a check failed, 2 usage error.
