# Audio contract — licence, status and source vocabulary

Status: the paid-cloud licence position below was read from the vendor's own
terms on **2026-11-08** and is recorded here so that every sidecar's
`licence` field has one definition to point at. This is a terms record, not
legal advice: no lawyer has reviewed it, and `redistributionCleared` stays
`false` on every clip until counsel clears redistribution and sale in
writing (see §5). Terms change — re-read the vendor pages on the day of any
sale or transfer, and keep the read date with any new value.

The sidecar `licence` value itself stays neutral: it names the position, never
the vendor. The vendor is named in this file only, because a terms position
that cannot cite its source is unverifiable.

## 1. The vocabulary (fix #26)

Every clip in `data/audio/manifest*.json` carries a `status` and a `source`.
These are the only values the tools write, and the tests enforce them
(`tests/audio.manifest.test.js`, `tests/audio.sidecar.test.js`).

| status | Meaning |
|---|---|
| `missing` | No clip exists for this entry. `source` is `none`. |
| `tts` | A synthetic clip exists, rendered through the paid-cloud service. Review status is carried by the sidecar, not by this value. |
| `synthetic-unreviewed` | A synthetic clip exists, ingested from an outside generator or pre-existing game audio. No native listener has reviewed it. |
| `synthetic-reviewed` | A native listener has reviewed this exact file (never written by a tool; a person sets it by hand with a reviewer record). No clip holds this status today. |
| `recorded` | A human recording. No clip holds this status today. |

| source | Meaning |
|---|---|
| `paid-cloud` | Rendered through the paid-cloud text-to-speech service, Israeli WaveNet pair (see §2). |
| `tts:google` | Rendered through the same service in the Nov 7 sprint; 108 prayer clips carry no recorded voice id (see §4). |
| `tts:azure` / `tts:elevenlabs` | Rendered through another cloud voice service. Terms not recorded; licence stays `not cleared`. |
| `outside-synthetic` | Ingested from an outside generator. Provider, model and terms unknown to the repo. |
| `tts-respelled` | Pre-existing game audio: a tradition voice reading a Latin respelling. |
| `tts-hebrew` | Pre-existing game audio: pointed Hebrew spoken. Same ingest class as `tts-respelled` (fix #23). |
| `none` | No clip (`missing` only). |

`paid-cloud` is the source value; `tts` is the status value. The audit's
"define tts / paid-cloud" is this table: a clip with status `tts` and source
`paid-cloud` is a paid-cloud render, and its licence is `customer-owned`
(§2). A clip with status `synthetic-unreviewed` is an ingested clip, and its
licence is `not cleared` (§6).

## 2. Paid-cloud clips: the licence position

**Licence value in every paid-cloud sidecar: `customer-owned`.**

Read from the vendor's own pages on 2026-11-08 (terms last modified
2026-10-12; service-specific terms and free-trial terms as linked below):

- **Ownership.** The cloud terms §5.1: "Customer retains all Intellectual
  Property Rights in Customer Data and Customer Applications." "Customer
  Data" is defined to include "data that Customer or End Users derive from
  that data through their use of the Services" — generated audio is data
  derived from the submitted text through use of the service, so it is
  Customer Data, and the customer retains the IP rights in it.
- **Use in an app.** The service's own documentation: "You can use the
  audio data files you create using Cloud Text-to-Speech to power your
  applications or augment media like videos or audio recordings (in
  compliance with the Google Cloud Platform Terms of Service including
  compliance with all applicable law)." There is no attribution requirement
  for this service (unlike the vendor's translation service).
- **No free-vs-paid distinction.** The terms draw no commercial-use
  distinction between free-tier and paid usage, and the free-trial
  supplemental terms impose no commercial-use restriction on outputs. The
  trial's limits are elsewhere: no SLA, and no indemnity applies to use
  under the free trial (§3.4). The clips were rendered on a free-trial
  project, so the ownership and app-use position holds, and the
  no-indemnity position below applies twice over.
- **No indemnity.** The service is not on the vendor's Generative AI
  Indemnified Services list, so the vendor's IP-indemnity for generated
  output does not attach to these clips — and, as above, no indemnity
  applies to use under the free trial in any case. If a third party ever
  claims a clip infringes, there is no vendor indemnity to call on.
- **Restrictions that bind.** (a) Competitive use: the output may not be
  used to develop a similar or competing product or service (service terms
  §17(a)). ALEF is a Hebrew course, not a speech service, so this does not
  bite — but the clips must never be repackaged as a voice product.
  (b) Model restrictions: the output may not be used to substitute,
  replace or circumvent a vendor model, or to create or improve models
  similar to a vendor model (§17(b)). The clips must never be used to train
  or fine-tune any voice model. (c) Acceptable use and applicable law apply
  throughout.

Sources (all read 2026-11-08):

- Google Cloud Terms of Service, §1.1 (use in a Customer Application),
  §5.1 (Intellectual Property Rights), Customer Data definition:
  https://cloud.google.com/terms
- Service Specific Terms, §17 (Use Restrictions for AI/ML Services), §18
  (Training Restriction — the vendor will not train on Customer Data
  without permission), §20 (Generative AI Services):
  https://cloud.google.com/terms/service-terms
- Cloud Text-to-Speech basics ("You can use the audio data files you
  create…"): https://cloud.google.com/text-to-speech/docs/basics
- Supplemental Terms and Conditions for Google Cloud Platform Free Trial,
  §3.4 (SLAs and indemnity do not apply under the free trial):
  https://cloud.google.com/terms/free-trial
- Google Cloud Platform Services Summary (Text-to-Speech is listed as a
  standalone service, not under Generative AI Services):
  https://cloud.google.com/terms/services
- Generative AI Indemnified Services (Text-to-Speech is not listed):
  https://cloud.google.com/terms/generative-ai-indemnified-services

## 3. What `customer-owned` does and does not mean

- It means the customer owns the generated audio and may use it to power
  the app and augment media under the terms above. It is the vendor-terms
  position, recorded per clip so a buyer doing due diligence can trace
  every clip to this file.
- It does **not** mean a lawyer has cleared the clips for sale or for
  transfer with the business. `redistributionCleared` stays `false` on
  every sidecar until counsel clears redistribution and sale in writing.
  The two fields answer different questions: `licence` records what the
  vendor's terms say; `redistributionCleared` records whether counsel has
  signed off.
- It does **not** mean the clip is reviewed. Every paid-cloud clip is still
  synthetic and unreviewed until a native listener listens to that exact
  file. Review status is a separate gate (fix #21's sidecars, the review
  packs) and is untouched by this change.
- It does **not** cover the text that was spoken. The Hebrew texts have
  their own licences (public-domain and CC sources recorded in
  `docs/corpus/LICENSES.md`); this file is about the audio only.

## 4. Open questions (not resolved by this record)

- **The 108 prayer clips with no recorded voice id** (source `tts:google`,
  `voiceId` null, rendered 2026-11-07 through the then-default HD voices).
  The ownership and app-use position in §2 does not depend on the voice,
  so they carry `customer-owned` like the rest — but if the voice used was
  a generative-AI voice, the service terms' Generative AI section (§20)
  may attach, including its age restriction (§20(d): the service must not
  be used as part of a site or app directed towards or likely to be
  accessed by under-18s). Whether that section attaches to these 108 clips
  is an open question for counsel. For the other 19,358 paid-cloud clips
  (the WaveNet pair), Text-to-Speech is listed as a standalone service
  rather than under Generative AI Services — but the terms' catch-all
  ("Generative AI Services also includes any generative AI features or
  functionality of a Service") leaves room for argument about neural
  voices, so the §20 position for WaveNet clips is recorded as the reading
  on the terms as read, not a certainty, and counsel should confirm it.
- **Accent renders already on main.** Renders through the same service
  whose manifest source is `tts-respelled-israeli-voice` (an Israeli voice
  reading a tradition respelling) are the same vendor's output, so the §2
  position applies to them too — but the bulk rewrite covers only the
  manifest `paid-cloud` / `tts:google` set, and `backfill-sidecars.mjs`
  skips that source by design. New accent renders record `customer-owned`
  at render time (`render_tts.mjs`); the sidecars already on main keep
  `not cleared` until a lane verifies each one is a render of this
  service and updates it.
- **Sale and transfer.** Does `customer-owned` under these terms cover
  passing the clips on to a buyer of the app or the business, including
  sub-licensing? The terms as read do not grant or deny that in so many
  words — counsel's call, before any sale.
- **The book companion.** The app-use sentence covers applications and
  media; whether a printed book with a companion audio set is inside it is
  counsel's call.
- **Terms drift.** The vendor may update the terms (URL terms: material
  updates effective 30 days after posting). Re-read before relying on this
  record for a sale, and update the read date above when you do.

## 5. How the licence is recorded

- `tools/audio/sidecar.mjs` — `LICENCE_PAID_CLOUD = 'customer-owned'`
  (the single source of truth for the value) and `LICENCE_NOT_CLEARED =
  'not cleared'` (everything else). `buildSidecar` defaults to `not
  cleared`; only the paid-cloud paths pass `customer-owned`.
- `tools/audio/backfill-sidecars.mjs` — `planSidecar` writes
  `customer-owned` for `paid-cloud` and `tts:google` entries, `not cleared`
  is never written for them again. Backfill `--check` is idempotent: a
  sidecar that already carries the recorded value is a skip.
- `tools/audio/render_tts.mjs` — new renders through the paid-cloud
  provider record `customer-owned` at render time; renders through other
  providers keep `not cleared` until their terms are recorded the same way.
- The bulk record: 19,466 paid-cloud sidecars (19,355 `paid-cloud` +
  111 `tts:google`) change `licence` from `not cleared` to
  `customer-owned`, nothing else. Landed per manifest shard, newest first
  in the run notes and in `hidden_files/fixes-100.md` (fix #22); the core
  shard (1,816 files) goes first and the remaining word shards follow the
  same checkpointed batch flow as fix #21.
- The manifest does not carry `licence` (`build_manifest.mjs` reads
  status/source only), so no manifest file changes for this fix.

## 6. Everything else stays `not cleared`

- `outside-synthetic` (52 files), `tts-respelled` (42), `tts-hebrew` (17):
  the outside generator's terms are unknown to the repo
  (`docs/audio/CLIP-HOSTING-AND-LICENCE.md` §2). Their sidecars keep
  `not cleared` and their ingest-time provenance is never overwritten.
- Renders through other providers (Azure, ElevenLabs): terms not recorded
  in this repo. A future lane may record them the same way this file
  records the paid-cloud terms — read the vendor's own terms, write the
  position here, then update the sidecars.
- Human recordings, when they exist: `donor-consent` (see
  `tools/record-kit/ingest.mjs`).

## 7. What this does not change

- The Credits page still states the audio licence as "unknown: not
  cleared" — updating that copy to this position is the R-ledger item R9,
  a separate change with its own verification, not this fix.
- `docs/legal/*` (Nov 5 snapshots) still describe the 87-clip era; their
  audio rows are superseded by this file for the paid-cloud set and will
  be refreshed when the legal docs are next revised, not silently edited.
- No clip's audio, status, source, voice, text or review state changes.
  Only the `licence` field on paid-cloud sidecars, and the tools that
  write it going forward.
