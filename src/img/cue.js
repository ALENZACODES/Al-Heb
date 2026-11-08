// Approved-image cues. Exact id only. A missing image is text, never a broken <img>.
// The picture is the cue, so the Hebrew answer stays off the prompt until the learner checks.
// Held Noa-drift stills and composites are not ids here.

/** The activity scenes used as context on their own screens, not as a separate gallery. */
export const SCENE_CONTEXT = Object.freeze([
  { id: 'GAME_minute_one_celebration', route: '#/firstwin', file: 'src/firstday/minuteone.view.js' },
]);

/**
 * Vocab review prompt. Picture when `imgFn` returns a node for this exact word id; otherwise the Hebrew word is the text cue.
 * @param {(tag:string, attrs?:object, ...kids:any[]) => any} h
 * @param {Function|undefined} imgFn ctx.img
 * @param {{ id:string, pointed?:string, lemma?:string }} entry
 */
export function wordReviewCue(h, imgFn, entry, { n, total }) {
  const he = entry?.pointed || entry?.lemma || '';
  const pic = typeof imgFn === 'function' ? (imgFn(h, { kind: 'word', id: entry.id, class: 'vc-pic', width: 400 }) || null) : null;
  if (pic) {
    return {
      mode: 'picture',
      he,
      nodes: [h('p', { class: 'vc-meta' }, `Word ${n} of ${total}. What is this in Hebrew? Say it, then check.`), pic],
    };
  }
  return {
    mode: 'text',
    he,
    nodes: [h('p', { class: 'vc-meta' }, `Word ${n} of ${total}. Say what it means, then check.`)],
  };
}
