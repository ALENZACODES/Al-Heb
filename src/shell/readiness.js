// @ts-check
// "What is ready, and what is not": one plain list shown in Settings and About. It must never claim more than is true.
// Numbers come from the shipped data files when they can be read (data/audio/summary.json, data/images/approvals.json); when
// they cannot (offline, first load), the line says so instead of guessing. The native-review line is fixed text tied to
// docs/review/STATUS.md by tests/readiness.test.js: when review starts, that test fails and this wording must be updated.

export const READINESS_TITLE = 'What is ready, and what is not';

/**
 * @param {{audio?: {total?:number, recorded?:number, tts?:number}|null, imagesApproved?: number|null}} facts
 * @returns {{id:string, ready:boolean, text:string}[]}
 */
export function readinessLines({ audio = null, imagesApproved = null } = {}) {
  const lines = [];
  if (audio && Number.isFinite(audio.total)) {
    const rec = audio.recorded || 0, tts = audio.tts || 0;
    lines.push(rec > 0
      ? { id: 'audio', ready: false, text: `Recorded audio: ${rec.toLocaleString('en-US')} of ${audio.total.toLocaleString('en-US')} planned clips. Everything else uses your device's voice or has no sound.` }
      : { id: 'audio', ready: false, text: `Recorded audio: not ready. 0 of ${audio.total.toLocaleString('en-US')} planned clips are recorded${tts ? ` (${tts.toLocaleString('en-US')} synthetic clips exist, labelled as synthetic)` : ''}. Listen buttons use your device's voice, which is a computer voice and Israeli-style only.` });
  } else {
    lines.push({ id: 'audio', ready: false, text: 'Recorded audio: could not be checked right now. No recorded teacher clips were included when this version was built; Listen buttons use your device\'s voice.' });
  }
  lines.push({ id: 'review', ready: false, text: 'Hebrew content: unreviewed draft. No native Hebrew speaker, teacher, cantor or rabbi has checked the lessons, words, respellings or prayer text yet.' });
  lines.push(Number.isFinite(imagesApproved) && /** @type {number} */ (imagesApproved) > 0
    ? { id: 'images', ready: false, text: `Pictures: ${imagesApproved} approved by a reviewer and shown; the rest stay hidden until reviewed.` }
    : { id: 'images', ready: false, text: imagesApproved === 0 ? 'Pictures: none approved yet, so no generated picture is shown.' : 'Pictures: could not be checked right now. Only reviewer-approved pictures are ever shown.' });
  lines.push({ id: 'pages', ready: false, text: 'Pages: a small first set is the course. Pages marked Preview are unfinished and may change.' });
  lines.push({ id: 'testing', ready: false, text: 'Testing: the code has automated tests. It has not yet been tried by a group of learners or checked on many phones.' });
  lines.push({ id: 'data', ready: true, text: 'Your data: progress stays in this browser on this device. Nothing is sent anywhere, and nothing is backed up for you; use Settings to download a backup file.' });
  return lines;
}

/** Read the two shipped data files. Never throws; a file that cannot be read gives null. @param {(u:string)=>Promise<any>} [fetchFn] */
export async function loadReadinessFacts(fetchFn = globalThis.fetch) {
  const json = async (u) => { try { const r = await fetchFn(u); if (!r || (r.ok === false)) return null; return await r.json(); } catch { return null; } };
  const [audio, appr] = await Promise.all([json('data/audio/summary.json'), json('data/images/approvals.json')]);
  const a = appr && appr.approvals && typeof appr.approvals === 'object' ? Object.values(appr.approvals).filter((v) => v === true || (v && v.status === 'approved') || v === 'approved').length : null;
  return { audio: audio && Number.isFinite(audio.total) ? audio : null, imagesApproved: a };
}

/**
 * The block. Drawn at once with "checking" wording, then filled in when the files arrive.
 * @param {Function} h element factory @param {{open?: boolean, facts?: any, fetchFn?: any}} [o]
 */
export function readinessNode(h, { open = false, facts, fetchFn } = {}) {
  const list = h('ul', { class: 'readiness-list' });
  const fill = (f) => list.replaceChildren(...readinessLines(f).map((l) => h('li', { 'data-ready': l.ready ? 'yes' : 'no', 'data-id': l.id }, l.text)));
  fill(facts || {});
  if (!facts) loadReadinessFacts(fetchFn).then(fill).catch(() => { /* keep the cautious wording */ });
  return h('details', { class: 'card readiness', id: 'readiness', open: open ? '' : null },
    h('summary', {}, h('strong', {}, READINESS_TITLE)),
    h('p', { class: 'muted' }, 'This is an early, unfinished version. Here is plainly where it stands.'),
    list,
    h('p', { class: 'muted' }, h('a', { href: '#/how' }, 'How this works'), '. ', h('a', { href: '#/credits' }, 'Credits and licences'), '.'));
}
