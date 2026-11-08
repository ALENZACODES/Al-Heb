# English Torah recordings: Google Chirp

This pipeline records the existing public-domain JPS 1917 English text of all five books: 187 chapters, 5,846 verses, two synthetic voices (374 chapter recordings). Ari is `en-US-Chirp3-HD-Charon`; Noa is `en-US-Chirp3-HD-Kore`. No voice cloning is involved.

The source text remains unchanged. Requests join complete verses in order, with at most 4,800 UTF-8 bytes per request. For Google's long-sentence rejection only, the renderer may change semicolons and colons to periods in the speech request. Every word remains unchanged; the exact submitted text and hash are retained. The chapter player uses measured chapter duration, without fabricated verse timestamps.

## Resume on Windows

Requirements: Node, PowerShell 7 with ThreadJob, Python with `av` and `faster-whisper`, and FFmpeg. Keep models and credentials outside version control. The renderer reads `GOOGLE_TTS_API_KEY` from the Windows user environment (or process environment) without printing it.

1. Run `node plan.mjs PATH_TO_REPOSITORY`. The resulting 502 requests contain 1,634,994 characters; nominal Google Chirp pricing at $30/million is approximately $49.05 before free tiers/taxes. Do not regenerate a plan against a different source revision mid-run.
2. Run `./render-parallel.ps1 -Workers 4` (up to 8 per launcher). Coordinate global worker/rate limits with other jobs. Do not launch overlapping workers over the same missing requests. Completed matching-fingerprint files are reused. A `PAUSE_AFTER_CURRENT` file in the script directory pauses workers before their next request; remove it to resume. In-flight requests are allowed to finish.
3. Run `python assemble.py --ffmpeg PATH_TO_FFMPEG`. This assembles only complete chapters, checks every chunk's fingerprint and file hash, and fully decodes each chapter to measure duration and detect corrupt audio. `delivery/audio/` contains the MP3s. Merge `manifest-english.json` into the application's Torah manifest, preserving unrelated entries. Archive `provenance.json` separately; it includes exact request text/hashes.
4. Optionally cache `Systran/faster-whisper-tiny.en` revision `0d3d19a32d3338f10357c0889762bd8d64bbdeba` in `models/`, then run `python verify_chunks.py --shard 0 --shards 2` and a second process for shard 1. Recognition uses no reference prompt or hotwords. It waits for new clips and writes hash-bound ASR reports. Tiny recognition often differs on biblical names, archaic numbers, and homophones; a low error rate is not pronunciation certification.

## Quality evidence and limitations

Six short Genesis 1 pilots were checked with unprompted English ASR: five matched after case/punctuation normalization; Noa's verse 2 had one recognition difference. A full-chapter tiny-model transcript suggested a missing phrase in Ari Genesis 1. A stronger `base.en` check independently recovered the complete phrase at 221.46–224.42 seconds, resolving that apparent omission as a recognition error.

All released tracks receive source coverage, hash, and full-decode checks. ASR reports are additional evidence, not a claim that all pronunciations have received human listening review. Chapter timing is measured audio duration only. Hebrew verification is a separate pipeline; these English checks make no claims about Hebrew accuracy.

The first production run also used eight disjoint later-half workers in a separate directory while the original four handled earlier requests. That temporary scheduling layout is not required for future resumptions; use one coordinated launcher over the saved plan and clip directory.
