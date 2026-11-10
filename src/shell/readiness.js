// @ts-check
// "What is ready, and what is not": one plain list shown in Settings and About. It must never claim more than is true.
// Numbers come from the shipped data files when they can be read (data/audio/summary.json, data/images/approvals.json,
// data/img/index.json); when
// they cannot (offline, first load), the line says so instead of guessing. The native-review line is fixed text tied to
// docs/review/STATUS.md by tests/readiness.test.js: when review starts, that test fails and this wording must be updated.

import { audioTruthLine, spokenClips } from './audio-truth.js';
import { createImageResolver } from '../img/resolve.js';

export const READINESS_TITLE = 'What is ready, and what is not';

const approvalMap = (file) => (file && file.approvals && typeof file.approvals === 'object' ? file.approvals : null);
const approvedCount = (map) => Object.values(map).filter((v) => v && v.status === 'approved').length;

/**
 * Catalogue, approval and ingested counts. `shown` is what the resolver can render: approved and ingested.
 * The resolver module is not modified; this reads its existing stats() and resolve().
 * @param {any} index data/img/index.json or null when it could not be read
 * @param {any} approvalsFile data/images/approvals.json or null
 */
export function imageInventory(index, approvalsFile) {
  const map = approvalMap(approvalsFile);
  const approved = map ? approvedCount(map) : null;
  if (!index || typeof index !== 'object') return { catalogued: null, ingested: null, shown: null, approved, pending: null };
  const stats = createImageResolver({ index, approvals: map || {} }).stats();
  if (approved == null) return { catalogued: stats.total, ingested: stats.ingested, shown: null, approved: null, pending: null };
  return { catalogued: stats.total, ingested: stats.ingested, shown: stats.approvedIngested, approved, pending: approved - stats.approvedIngested };
}

/** Approved ids the resolver will not render (no ingested file, or not in the catalogue). For the release check, not the learner line. */
export function pendingApprovedIds(index, approvalsFile) {
  const map = approvalMap(approvalsFile) || {};
  const R = createImageResolver({ index, approvals: map });
  return Object.keys(map).filter((id) => map[id] && map[id].status === 'approved' && R.resolve('id', id) == null).sort();
}

function memoryPictureClause(memoryPictures) {
  const n = Number.isFinite(memoryPictures) && /** @type {number} */ (memoryPictures) > 0 ? `the ${memoryPictures} letter memory pictures are` : 'the letter memory pictures are';
  return `Separately, ${n} drawings made for this app and are shown as unreviewed drafts.`;
}

/** Learner line. Catalogued, approvals and shown are different numbers and are labelled as such. */
export function imageCountText(images, memoryPictures) {
  const known = images && (Number.isFinite(images.approved) || Number.isFinite(images.catalogued) || Number.isFinite(images.shown));
  if (!known) return 'Pictures: could not be checked right now. Only a reviewer-approved picture that is in the app is shown.';
  const mem = memoryPictureClause(memoryPictures);
  if (images.approved === 0) {
    const cat = Number.isFinite(images.catalogued) ? ` ${images.catalogued} catalogued.` : '';
    return `Pictures: none approved yet, so no generated picture is shown.${cat} ${mem}`;
  }
  const shown = Number.isFinite(images.shown)
    ? `${images.shown} shown (approved and the picture file is in the app)`
    : 'how many are shown could not be checked, so approvals are not described as shown';
  const appr = Number.isFinite(images.approved) ? `${images.approved} approvals` : 'approvals could not be checked';
  const cat = Number.isFinite(images.catalogued) ? `${images.catalogued} catalogued` : 'the catalogue could not be checked';
  const pending = Number.isFinite(images.pending) && images.pending > 0
    ? ` ${images.pending} approved but not in the app yet, so they stay hidden.`
    : (images.pending === 0 ? ' Every approval has a picture file in the app.' : '');
  return `Pictures: ${shown}. ${appr}. ${cat}.${pending} ${mem}`;
}

/**
 * @param {{audio?: {total?:number, recorded?:number, tts?:number}|null, imagesApproved?: number|null, images?: {catalogued?: number|null, approved?: number|null, ingested?: number|null, shown?: number|null, pending?: number|null}|null, memoryPictures?: number|null}} facts
 * @returns {{id:string, ready:boolean, text:string}[]}
 */
export function readinessLines({ audio = null, imagesApproved = null, images = null, memoryPictures = null } = {}) {
  const lines = [];
  if (audio && Number.isFinite(audio.total)) {
    // The wording comes from audio-truth.js; every number is read from data/audio/summary.json.
    const rec = audio.recorded || 0, tts = audio.tts || 0;
    const planned = `${tts.toLocaleString('en-US')} of ${audio.total.toLocaleString('en-US')} planned clips exist${rec > 0 ? `, ${rec.toLocaleString('en-US')} of them recorded by a person` : ', and none is a person recording'}.`;
    // Clips that no manifest plans (book pages, arcade lines, opening prayers): counted by tools/audio/summary.mjs in summary.spoken.
    const outside = spokenClips(audio) - tts;
    const extra = outside > 0 ? ` ${outside.toLocaleString('en-US')} more clips (book pages, arcade lines and opening prayers) are outside that plan.` : '';
    lines.push({ id: 'audio', ready: false, text: `Audio: not ready. ${audioTruthLine(audio)} ${planned}${extra}` });
  } else {
    lines.push({ id: 'audio', ready: false, text: `Audio: ${audioTruthLine(null)}` });
  }
  lines.push({ id: 'review', ready: false, text: 'Hebrew content: unreviewed draft. No native Hebrew speaker, teacher, cantor or rabbi has checked the lessons, words, respellings or prayer text yet.' });
  const img = images || (imagesApproved == null ? null : { catalogued: null, ingested: null, shown: null, approved: imagesApproved, pending: null });
  lines.push({ id: 'images', ready: false, text: imageCountText(img, memoryPictures) });
  lines.push({ id: 'pages', ready: false, text: 'Pages: a small first set is the course. Pages marked Preview are unfinished and may change.' });
  lines.push({ id: 'testing', ready: false, text: 'Testing: the code has automated tests. It has not yet been tried by a group of learners or checked on many phones.' });
  lines.push({ id: 'data', ready: true, text: 'Your data: progress stays in this browser on this device. Nothing is sent anywhere, and nothing is backed up for you; use Settings to download a backup file.' });
  return lines;
}

/** Read the shipped data files. Never throws; a file that cannot be read gives null. @param {(u:string)=>Promise<any>} [fetchFn] */
export async function loadReadinessFacts(fetchFn = globalThis.fetch) {
  const json = async (u) => { try { const r = await fetchFn(u); if (!r || (r.ok === false)) return null; return await r.json(); } catch { return null; } };
  const [audio, appr, chain, index] = await Promise.all([json('data/audio/summary.json'), json('data/images/approvals.json'), json('data/letters/memory-chain.json'), json('data/img/index.json')]);
  const m = chain && Array.isArray(chain.letters) ? chain.letters.filter((l) => l && l.picture && l.picture.svg).length : null;
  const images = (appr || index) ? imageInventory(index, appr) : null;
  const a = images ? images.approved : null;
  return { audio: audio && Number.isFinite(audio.total) ? audio : null, imagesApproved: a, images, ...(m ? { memoryPictures: m } : {}) };
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
