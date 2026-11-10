# Current completion and release boundary

Audit: 2026-11-04. This is a functional learning-app draft, not a professionally reviewed Hebrew course. Earlier lane reports describe different intermediate snapshots; an old “not done” entry is not evidence that a feature is still absent.

## Confirmed in the current source

- Static PWA with curriculum, letters, assisted tracing, pronunciation, reading, vocabulary, calendar, word sprint and photo scanning routes.
- Local Hebrew fonts, deferred audio-manifest loading, lazy congregation word shards, and vendored browser OCR. These supersede older README/DEPLOY/CONTRACT descriptions of missing fonts, blocking audio startup and documentation-only OCR.
- Assisted letter tracing records a walked-through completion separately from drawing. The older accessibility proposal for this behavior is implemented.
- Word Sprint is routed and counted toward learning activity; its old integration instructions are historical.
- The current review round adds keyboard-accessible sound-status expansion and an explicit reload notice for waiting service-worker updates. Activation requires the learner's Reload action; if other app tabs are open, the notice asks the learner to close them and retry. Initial installation does not force a reload.
- `npm test` uses the same Node test command as CI. Browser smoke failures now fail the CI job rather than being ignored.

## Validation

Run `npm test`, then the browser smoke/QA tools with Playwright available. After every final source/data/asset edit run `node tools/build-precache.mjs`; the generated file must be committed with the changes. A passing unit suite does not establish real-device compatibility, pronunciation quality or Hebrew accuracy. See the current change review for actual results; this document deliberately does not reuse historical passing counts.

## Remaining release dependencies

- **Hebrew review:** native speakers, teachers and clergy must review the appropriate content. Preserve draft flags until named reviewers return decisions. `docs/review/README.md` explains the packet/import workflow; its historical estimate is 6,353 items, not a newly measured total.
- **Audio:** the checked-in coverage report records zero supplied clips. Browser speech is a fallback, not a human recording or verification of congregational pronunciation. Recordings or approved TTS production require voice choices, permissions and/or provider access.
- **Illustrations:** the approved generated-image manifest currently contains zero images. Existing placeholders and ingest tools do not establish that artwork has been delivered or reviewed.
- **Publishing:** select a real host before rebuilding print QR codes (`book/config.json` still uses `alef.example.org`). Verify deployment and real HTTPS behavior. A Pages workflow exists, but its presence alone is not evidence of successful publication.
- **Rights:** the project has no selected license. Source text, image and audio permissions need appropriate review before distribution.
- **Devices and print:** verify iOS/Android install and camera flows, screen-reader use and real printed proofs. Existing headless checks do not cover these.

Optional future work includes native store wrappers, richer sprint games and a Phonikud service. These are not prerequisites for using the static app as a clearly labeled draft.
