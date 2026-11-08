// Canonical .mp3.meta.json sidecar schema (fix #21).
// Every clip sidecar carries the seven audit fields — engine, voice id, tradition,
// respelled input text, inputSha256, ingestedAt, licence — plus the status/source
// the manifest rebuild reads. Values that are genuinely unknown stay null; they are
// NEVER invented. A null with a note in the sidecar is honest provenance; a guessed
// voice id would be a false label (see docs/audio/ISRAELI-VOICE-2026-11-07.md, where
// a render through the wrong default voice was only caught because nothing had
// claimed a voice id for those clips).
// Writers: tools/audio/render_tts.mjs (new renders), tools/audio/ingest.mjs
// (outside/respelled ingest), tools/tts/manifest_update.mjs (Chatterbox pipeline).
// Backfill for clips rendered before this schema: tools/audio/backfill-sidecars.mjs.
// Readers: tools/audio/build_manifest.mjs reads status/source/synth only; the audit
// fields are for humans, reviewers and the licence record, not the app.
//
// inputTextKind (extra field, not one of the seven): what inputText is.
// 'hebrew' — the pointed Hebrew text was sent as-is. 'respelling' — the Latin sound
// word that was actually spoken. 'respelling-unrecorded' — a tradition clip whose
// respelling was never written down; inputText is the manifest Hebrew text and
// inputSha256 is the hash of THAT text, not of the respelling. 'manifest-text' —
// an ingested clip; inputText is the manifest text the clip is filed under, and
// what was actually sent to the outside service was not recorded.
import { createHash } from 'node:crypto';

/** The seven fields the audit requires on every clip sidecar. */
export const SIDECAR_AUDIT_FIELDS = Object.freeze(['engine', 'voiceId', 'tradition', 'inputText', 'inputSha256', 'ingestedAt', 'licence']);

/** Licence value until counsel clears redistribution/sale in writing. */
export const LICENCE_NOT_CLEARED = 'not cleared';

/** Licence value for paid-cloud clips (fix #22): the customer owns the
 * generated audio under the vendor's cloud terms — the customer retains all
 * IP rights in generated audio (Customer Data) and the vendor's own docs
 * permit using created audio files to power applications and augment media.
 * No vendor indemnity attaches. Defined in full in docs/audio/CONTRACT.md;
 * this constant is the single source of truth for the value. It does NOT
 * mean counsel has cleared redistribution/sale: `redistributionCleared`
 * stays false until then. */
export const LICENCE_PAID_CLOUD = 'customer-owned';

/** sha256 of the exact input text, hex. The hash is of the text, not of the audio file. */
export function sha256Text(text) {
  return createHash('sha256').update(String(text), 'utf8').digest('hex');
}

/**
 * Build a sidecar object in canonical field order. Unknown values stay null.
 * `inputText` is the text actually sent to the voice (pointed Hebrew for Israeli
 * clips; the respelled Latin sound word for tradition clips). When the sent text
 * was not recorded, pass the manifest Hebrew text and say so in `inputTextKind`
 * (see backfill-sidecars.mjs) — never pass a respelling you do not have.
 * Extra keys (renderedAt, reviewed, redistributionCleared, synth, cer, ...) are
 * appended after `note` so older readers keep working.
 */
export function buildSidecar({ status, source, engine = null, voiceId = null, tradition = null, inputText = null, ingestedAt = null, licence = LICENCE_NOT_CLEARED, note = '', ...extra } = {}) {
  const hasText = inputText != null && inputText !== '';
  return {
    status,
    source,
    engine,
    voiceId,
    tradition,
    inputText: hasText ? inputText : null,
    inputSha256: hasText ? sha256Text(inputText) : null,
    ingestedAt,
    licence,
    note,
    ...extra,
  };
}

/** Audit fields that are missing (null/undefined/empty) on a parsed sidecar. */
export function missingSidecarFields(meta = {}) {
  return SIDECAR_AUDIT_FIELDS.filter((f) => meta[f] == null || meta[f] === '');
}

/** True when every audit field is present (nulls count as missing). */
export function sidecarComplete(meta = {}) {
  return missingSidecarFields(meta).length === 0;
}
