// Awards page. Practice medallions record saved game sessions (activity, not mastery).
// The beginner certificate sample is watermarked and is not stored as earned.
// Medallions show their approved medallion picture when the image resolver
// has one for the badge id (BADGE_<id>); the temporary vector is the fallback
// and stays wherever no approved picture resolves. Certificate artwork: none yet.
import { h } from '../shell/ui.js';
import { GAME_STORE_KEYS } from './observe.js';
import { ART_NOTE, renderMedallion } from './icons.js';
import { loadBeginnerRubric } from './rubric.js';
import { img as imgEl } from '../img/resolve.js';
import { loadImageResolver } from '../img/index.js';
import { EVIDENCE_SUMMARY, TRUST_LIMITS } from './trust.js';
import { readAwards, withDisplayName, writeAwards } from './record.js';
import {
  badgeRows, certificateDecision, completionText, evidenceLabel, masterySlots, settleAwards,
} from './eligibility.js';
import {
  MAIL_OFFER, PDF_FILENAME, SAMPLE_PAGE_NOTES, pdfNameNote, renderCertificate, renderCertificatePdf, sampleModel, shareAvailability, shareText,
} from './certificate.js';

const CSS = `
.aw { display: grid; gap: 1rem; max-inline-size: 64rem; }
.aw * { box-sizing: border-box; }
.aw h1 { margin: 0; }
.aw h2, .aw h3 { margin: 0 0 .4rem; }
.aw :focus-visible { outline: 3px solid currentColor; outline-offset: 3px; }
.aw button, .aw input, .aw a.aw-link { min-block-size: 48px; }
.aw button, .aw input { font: inherit; }
.aw input { inline-size: min(100%, 24rem); padding: .4rem .6rem; border: 2px solid currentColor; background: transparent; color: inherit; }
.aw-note { border-inline-start: 4px solid currentColor; padding-inline-start: .6rem; }
.aw-gallery, .aw-slots, .aw-check { list-style: none; padding: 0; margin: 0; display: grid; gap: .75rem; }
.aw-badge, .aw-slot { border: 2px solid currentColor; padding: .75rem; display: grid; grid-template-columns: auto 1fr; gap: .75rem; align-items: start; }
.aw-badge[data-state="locked"], .aw-slot[data-state="locked"] { border-style: dashed; }
.aw-badge[data-state="earned"] { border-style: solid; }
.aw-state { display: flex; flex-wrap: wrap; gap: .4rem .8rem; align-items: center; font-weight: 700; margin: 0 0 .35rem; }
.aw-state-text { border: 2px solid currentColor; padding: .1rem .45rem; }
.aw-badge[data-state="locked"] .aw-state-text { border-style: dashed; }
.aw-art { display: block; inline-size: 64px; block-size: 64px; }
.aw-badge-art { inline-size: 64px; block-size: 64px; border-radius: 50%; object-fit: cover; display: block; }
.aw-badge[data-state="locked"] .aw-badge-art { filter: grayscale(1); opacity: .55; }
.aw-req { margin: .25rem 0; }
.aw-finish { font-weight: 700; }
.aw-finish-activity .aw-med-disc { fill-opacity: .15; }
.aw-finish-matte .aw-med-disc { fill-opacity: .12; }
.aw-finish-polished .aw-med-disc { fill-opacity: .28; }
.aw-finish-foil .aw-med-disc { fill-opacity: .4; }
.aw-links { display: flex; flex-wrap: wrap; gap: .4rem; padding: 0; margin: .4rem 0 0; list-style: none; }
.aw-links a { display: inline-flex; align-items: center; min-block-size: 48px; padding-inline: .4rem; }
.aw-group { margin: .8rem 0; }
.aw-group h3 { font-size: 1rem; }
.aw-cert { position: relative; color: #241c16; background-color: #f3ead5; background-image: radial-gradient(rgba(110, 82, 42, .16) .6px, transparent .7px), radial-gradient(rgba(255, 248, 230, .45) .5px, transparent .65px); background-size: 3px 3px, 5px 5px; background-position: 0 0, 1px 2px; border: 1px solid #b7a88a; padding: 1.2rem 2.2rem 1rem; max-inline-size: 56rem; margin-inline: auto; text-align: center; font-family: "Frank Ruhl Libre", "Times New Roman", Times, "DejaVu Serif", serif; overflow: visible; }
.aw-paper, .aw-waves { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; }
.aw-paper { opacity: .16; }
.aw-cert-frame { position: relative; z-index: 1; background: transparent; margin: .2rem 0 0; padding: 0 1rem .2rem; }
.aw-design-proof { position: relative; z-index: 1; margin: .45rem 0 .15rem; letter-spacing: .12em; font-weight: 600; font-size: .82rem; color: #241c16; }
.aw-wordmark { margin: .55rem 0 .05rem; font-size: .72rem; letter-spacing: .46em; font-variant: small-caps; }
.aw-issuer { margin: 0; font-size: clamp(1.75rem, 4.2vw, 2.55rem); font-weight: 700; letter-spacing: .045em; line-height: 1.12; }
.aw-cert h2 { margin: .35rem 0 .45rem; font-size: .95rem; font-weight: 500; letter-spacing: .18em; font-variant: small-caps; }
.aw-presented, .aw-for { margin: .28rem 0; font-size: .82rem; letter-spacing: .16em; font-variant: small-caps; font-weight: 500; }
.aw-name-panel { min-block-size: 2.4rem; margin: .1rem auto .2rem; max-inline-size: 36rem; border: 0; padding: 0 .4rem; background: transparent; }
.aw-name { margin: 0; font-size: clamp(1.9rem, 4.8vw, 2.85rem); font-weight: 700; line-height: 1.15; overflow-wrap: anywhere; }
.aw-name-empty { margin: .2rem 0 0; font-size: .95rem; }
.aw-course { margin: .1rem auto .35rem; max-inline-size: 36rem; font-size: 1.28rem; font-weight: 700; border-block: 1px solid #b7a88a; padding: .4rem 0; }
.aw-sample-line { margin: .55rem auto .25rem; max-inline-size: 36rem; font-size: .95rem; }
.aw-seal { display: block; width: 148px; height: 148px; margin: .35rem auto .1rem; }
.aw-cert-no { margin: .15rem 0 0; font-size: 1rem; font-weight: 700; letter-spacing: .03em; }
.aw-cert-note { margin: 0 0 .2rem; font-size: .78rem; }
.aw-footer { margin: .1rem auto; max-inline-size: 36rem; font-size: .85rem; }
.aw-date { margin: .1rem 0; font-size: .95rem; }
.aw-art-note { margin: 0 0 .25rem; font-size: .78rem; }
.aw-actions { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; }
.aw-actions button { padding: .4rem .8rem; border: 2px solid currentColor; background: transparent; color: inherit; }
.aw-actions button:disabled { border-style: dashed; cursor: not-allowed; }
@media (max-width: 720px) {
  .aw-cert { padding: 1rem .7rem 1rem; }
  .aw-wordmark { letter-spacing: .28em; }
  .aw-issuer { letter-spacing: .01em; }
  .aw-seal { width: 124px; height: 124px; }
}
@media print {
  @page { size: A4 landscape; margin: 10mm; }
  body * { visibility: hidden; }
  .aw-cert, .aw-cert * { visibility: visible; }
  .aw-cert { position: absolute; inset: 6mm; max-inline-size: none; box-shadow: none; color: #241c16; background-color: #f3ead5; background-image: radial-gradient(rgba(110, 82, 42, .16) .6px, transparent .7px), radial-gradient(rgba(255, 248, 230, .45) .5px, transparent .65px); -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: .45rem 1rem .35rem; }
  .aw-issuer { font-size: 1.55rem; }
  .aw-seal { width: 118px; height: 118px; }
  .aw-cert h2, .aw-presented, .aw-for { margin-block: .12rem; }
  .aw-course { padding-block: .22rem; }
  .aw-noprint { display: none !important; }
  .aw-design-proof { visibility: visible; }
}
`;

function badgeArtSlot(h, row) {
  return h('span', { class: 'aw-art', 'data-badge-art': row.id },
    renderMedallion(h, {
      glyph: row.state === 'earned' ? 'activity' : 'lock',
      state: row.state,
      finish: 'activity',
      game: 'none',
    }));
}

/**
 * Fill medallion slots with approved badge pictures. The resolver only
 * returns a picture whose file exists and is approved; anything else leaves
 * the vector fallback in place. Locked medallions show the picture in
 * greyscale (see CSS); the state is also a word, never colour alone.
 */
async function fillBadgeArt(rootEl, ctx, h, alive) {
  const slots = [...(rootEl.querySelectorAll?.('[data-badge-art]') || [])];
  if (!slots.length) return;
  let R = ctx?.images || null;
  for (const slot of slots) {
    if (alive && !alive()) return;
    const id = 'BADGE_' + slot.getAttribute('data-badge-art');
    let node = null;
    try { node = ctx?.img ? ctx.img(h, { kind: 'id', id, decorative: true, width: 300, class: 'aw-badge-art' }) : null; } catch { node = null; }
    if (!node && !R) {
      try {
        R = await loadImageResolver({
          fetchFn: ctx?.fetchFn || ctx?.fetch, settings: ctx?.settings,
          base: 'assets/img', indexUrl: 'data/img/index.json', approvalsUrl: 'data/images/approvals.json',
        });
      } catch { R = null; }
    }
    if (!node && R) {
      try { node = imgEl(h, { R, kind: 'id', id, decorative: true, width: 300, class: 'aw-badge-art' }); } catch { node = null; }
    }
    if (node && slot.isConnected !== false) slot.replaceChildren(node);
  }
}

function storageLine(save) {
  if (!save || save.saved === false) return 'This browser refused to save Awards. Nothing new was marked earned. You can still read this page.';
  if (save.persistent === false) return 'Saved for this visit only. If this browser is blocking storage, it is dropped when you close the tab. Awards still work offline while the tab stays open.';
  return 'Saved on this device. Awards work offline. There is no account, and nothing is sent to a server.';
}

function gameCode(games, badgeId) {
  const sessions = games?.sessions || [];
  if (!sessions.length) return 'none';
  if (badgeId === 'game-return') {
    const back = sessions.find((s) => s.plays >= 2);
    return back ? back.code : 'none';
  }
  return sessions[0].code || 'none';
}

export async function mount(root, ctx) {
  let alive = true;
  const now = typeof ctx?.now === 'function' ? ctx.now() : (ctx?.now ?? Date.now());
  const style = h('style', {});
  style.textContent = CSS;
  const status = h('p', { class: 'aw-note', role: 'status', 'aria-live': 'polite', id: 'award-status' });
  const page = h('article', { class: 'aw' });
  root.replaceChildren(style, page);
  let rubric = null;
  let rubricError = '';
  try { rubric = ctx?.rubric || await (ctx?.loadRubric ? ctx.loadRubric() : loadBeginnerRubric()); }
  catch (e) { rubricError = 'The beginner checklist could not be read from this copy of Aleph. No certificate is issued.'; }
  if (!alive) return () => {};
  if (rubric && rubric.ok === false) rubricError = 'The beginner checklist did not match the shipped lessons. No certificate is issued.';

  const settled = settleAwards(ctx?.store, rubric, now);
  const input = h('input', {
    type: 'text', id: 'award-name', maxlength: '80', autocomplete: 'name', spellcheck: 'false',
    value: settled.record.displayName || '',
  });
  input.value = settled.record.displayName || '';
  const certHost = h('div', { id: 'award-cert-host' });

  function model() {
    return sampleModel({ displayName: input.value, now });
  }
  function paintCertificate() {
    certHost.replaceChildren(renderCertificate(h, model()));
  }

  const shareNav = ctx?.navigator || (typeof navigator === 'undefined' ? null : navigator);
  const shareOk = shareAvailability(shareNav);
  const shareBtn = h('button', {
    type: 'button', id: 'award-share',
    disabled: shareOk.shareSheet ? null : '',
    onclick: async () => {
      const m = model();
      if (!shareOk.shareSheet || typeof shareNav.share !== 'function') {
        status.textContent = 'Share is not available in this browser. Download the PDF and share the file yourself. Aleph does not send it.';
        return;
      }
      try {
        const bytes = renderCertificatePdf(m);
        let file = null;
        if (typeof File === 'function') {
          try { file = new File([bytes], PDF_FILENAME, { type: 'application/pdf' }); } catch { file = null; }
        }
        if (file && typeof shareNav.canShare === 'function' && shareNav.canShare({ files: [file] })) {
          await shareNav.share({ files: [file], title: 'Aleph sample certificate', text: shareText(m) });
          status.textContent = 'The share sheet opened with the sample PDF. Aleph did not send email and did not upload the file itself.';
          return;
        }
        await shareNav.share({ title: 'Aleph sample certificate', text: shareText(m) });
        status.textContent = 'The share sheet opened with text only. This browser did not take the PDF file. The text says Design proof.';
      } catch (e) {
        status.textContent = e && e.name === 'AbortError'
          ? 'Share was cancelled. Nothing was sent.'
          : 'Share did not finish. Nothing was sent. You can download the PDF instead.';
      }
    },
  }, 'Share sample');

  const downloadBtn = h('button', {
    type: 'button', id: 'award-download',
    onclick: () => {
      const m = model();
      const bytes = renderCertificatePdf(m);
      if (typeof ctx?.download === 'function') {
        ctx.download(bytes, PDF_FILENAME);
        status.textContent = 'PDF ready on this device. It is marked Design proof. Nothing was sent.' + (pdfNameNote(m.displayName) ? ' ' + pdfNameNote(m.displayName) : '');
        return;
      }
      try {
        const doc = root.ownerDocument || document;
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = doc.createElement('a');
        a.href = url;
        a.download = PDF_FILENAME;
        a.rel = 'noopener';
        doc.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
        status.textContent = 'Download started on this device. The file is marked Design proof. Nothing was sent.' + (pdfNameNote(m.displayName) ? ' ' + pdfNameNote(m.displayName) : '');
      } catch {
        status.textContent = 'Download is not available here. You can use Print and choose Save as PDF in the dialog.';
      }
    },
  }, 'Download PDF');

  const printBtn = h('button', {
    type: 'button', id: 'award-print',
    onclick: () => {
      const fn = ctx?.print || globalThis.print;
      if (typeof fn !== 'function') { status.textContent = 'Printing is not available here. Download the PDF instead.'; return; }
      try { fn(); status.textContent = 'The print dialog was requested. Choose Save as PDF there if you want a file. Aleph does not upload it.'; }
      catch { status.textContent = 'Printing did not open. Download the PDF instead.'; }
    },
  }, 'Print or save as PDF');

  const jump = h('button', {
    type: 'button', id: 'award-jump',
    onclick: () => { certHost.querySelector?.('#aw-design-proof')?.focus?.(); },
  }, 'Move to the sample certificate');

  const saveName = h('button', {
    type: 'button', id: 'award-save-name',
    onclick: () => {
      const next = withDisplayName(settled.record, input.value, now);
      const save = writeAwards(ctx?.store, { ...settled.record, ...next });
      if (!save.saved) {
        status.textContent = 'The name could not be saved. The sample can show it during this visit, but it will not be kept. Nothing was marked earned.';
        paintCertificate();
        return;
      }
      const again = readAwards(ctx.store);
      settled.record = again.record;
      input.value = settled.record.displayName || '';
      paintCertificate();
      status.textContent = settled.record.displayName
        ? 'Name saved on this device for the sample only. It is not an account and not a certificate.'
        : 'The sample name was cleared on this device. Nothing was marked earned.';
    },
  }, 'Save name');

  input.addEventListener?.('input', () => paintCertificate());
  paintCertificate();

  const rows = badgeRows(settled.record, settled.games, settled.decision);
  const visit = settled.visit === 'return'
    ? 'You have opened Awards on this browser before. There is no account and no sign-in.'
    : 'First visit to Awards on this browser. There is no account and no sign-in.';
  const unsaved = settled.unsaved?.length
    ? ' New activity was seen, but it could not be saved, so the badge was not marked earned.'
    : '';
  status.textContent = storageLine(settled.save) + unsaved;

  const checklist = rubricError
    ? h('p', { role: 'alert' }, rubricError)
    : h('div', {},
      h('p', {}, `Confirmed criteria: none. Proposed criteria: ${rubric.items.length} items from lessons ${rubric.lessonIds[0]}–${rubric.lessonIds[rubric.lessonIds.length - 1]}. Review status: ${rubric.reviewStatus}. These are not a passing score.`),
      h('p', {}, rubric.graphNote || ''),
      h('p', {}, rubric.belt ? `White-belt sentence from the shipped belt file: ${rubric.belt.gate}` : ''),
      ...['letter', 'vowel', 'word', 'line'].map((kind) => {
        const items = rubric.items.filter((it) => it.kind === kind);
        if (!items.length) return null;
        const title = kind === 'letter' ? 'Letters' : kind === 'vowel' ? 'Vowel signs' : kind === 'word' ? 'Words' : 'Lines';
        return h('section', { class: 'aw-group' },
          h('h3', {}, title),
          h('ul', { class: 'aw-check' }, ...items.map((it) => {
            const ev = evidenceLabel(it, settled.record.evidence);
            const label = it.he ? h('span', { lang: 'he', dir: 'rtl' }, it.he) : it.label;
            return h('li', {},
              h('p', {}, h('strong', {}, label), it.gloss ? ` (${it.gloss})` : ''),
              h('p', { class: 'aw-req' }, it.requirement),
              h('p', { 'data-evidence': ev.state }, ev.text));
          })));
      }));

  page.append(
    h('h1', { id: 'view-title', tabindex: '-1' }, 'Awards'),
    h('p', { id: 'award-visit', 'data-visit': settled.visit }, visit),
    h('p', {}, 'Awards are decided on this device. They do not need a connection. ' + ART_NOTE),
    h('p', { class: 'aw-note' }, EVIDENCE_SUMMARY),
    status,
    h('section', { 'aria-labelledby': 'award-h-badges' },
      h('h2', { id: 'award-h-badges' }, 'Activity'),
      h('p', {}, 'These medallions record a saved practice-game session. They are activity, not mastery. The picture is a temporary enamel stand-in with a mark for the game that saved the play. Locked and earned are written in words, not by colour alone.'),
      h('ul', { class: 'aw-gallery' }, ...rows.filter((r) => r.category === 'practice').map((row) => h('li', {
        class: 'aw-badge', 'data-state': row.state, 'data-badge': row.id, 'data-category': 'activity',
      },
      renderMedallion(h, {
        glyph: row.state === 'earned' ? (row.id === 'game-return' ? 'return' : 'activity') : 'lock',
        state: row.state,
        finish: 'activity',
        game: row.state === 'earned' ? gameCode(settled.games, row.id) : 'none',
      }),
      h('div', {},
        h('h3', {}, row.name),
        h('p', { class: 'aw-state', 'data-state': row.state },
          h('span', { class: 'aw-state-text' }, row.stateText),
          h('span', {}, 'Activity')),
        h('p', { class: 'aw-req' }, row.requirement),
        h('p', {}, row.detail))))),
      h('p', {}, 'Only these five games already save a play count. Other games are not badge sources here.'),
      h('ul', { class: 'aw-links' }, ...GAME_STORE_KEYS.map((g) => h('li', {}, h('a', { class: 'aw-link', href: g.href }, g.title))))),
    h('section', { 'aria-labelledby': 'award-h-ladder' },
      h('h2', { id: 'award-h-ladder' }, 'Streak ladder'),
      h('p', {}, 'One medallion per rung, from two counted days to a full year. The picture grows like a tree instead of showing a number. Days are counted by the streak engine, with Shabbat and festival days frozen so they never break the chain. They are activity, not mastery. Locked and earned are written in words, not by colour alone.'),
      h('ul', { class: 'aw-gallery' }, ...rows.filter((r) => r.category === 'milestones' && r.section === 'ladder').map((row) => h('li', {
        class: 'aw-badge', 'data-state': row.state, 'data-badge': row.id, 'data-category': 'ladder',
      },
      badgeArtSlot(h, row),
      h('div', {},
        h('h3', {}, row.name),
        h('p', { class: 'aw-state', 'data-state': row.state },
          h('span', { class: 'aw-state-text' }, row.stateText),
          h('span', {}, 'Streak')),
        h('p', { class: 'aw-req' }, row.requirement),
        h('p', {}, row.detail)))))),
    h('section', { 'aria-labelledby': 'award-h-milestones' },
      h('h2', { id: 'award-h-milestones' }, 'Milestones and mastery'),
      h('p', {}, 'These medallions record things the app itself counted: a first study day, your daily goal, prayers heard, letters and words in your review decks, sets finished, and days that started early or late. A medallion whose record does not exist yet says so and stays locked. They are activity, not mastery. Locked and earned are written in words, not by colour alone.'),
      h('ul', { class: 'aw-gallery' }, ...rows.filter((r) => r.category === 'milestones' && r.section !== 'ladder').map((row) => h('li', {
        class: 'aw-badge', 'data-state': row.state, 'data-badge': row.id, 'data-category': 'milestones',
      },
      badgeArtSlot(h, row),
      h('div', {},
        h('h3', {}, row.name),
        h('p', { class: 'aw-state', 'data-state': row.state },
          h('span', { class: 'aw-state-text' }, row.stateText),
          h('span', {}, 'Milestone')),
        h('p', { class: 'aw-req' }, row.requirement),
        h('p', {}, row.detail)))))),
    h('section', { 'aria-labelledby': 'award-h-mastery' },
      h('h2', { id: 'award-h-mastery' }, 'Beginner checklist finishes'),
      h('p', {}, 'Matte, polished and foil open once Aleph has a proper reading check, which is still being built. Games, visits and lesson ticks do not count toward them.'),
      h('ul', { class: 'aw-slots' }, ...masterySlots().map((slot) => h('li', {
        class: 'aw-slot', 'data-state': 'locked', 'data-finish': slot.finish, 'data-slot': slot.id,
      },
      renderMedallion(h, { glyph: 'lock', state: 'locked', finish: slot.finish, game: 'none' }),
      h('div', {},
        h('h3', {}, slot.label),
        h('p', { class: 'aw-state', 'data-state': 'locked' }, h('span', { class: 'aw-state-text' }, 'Locked'), h('span', { class: 'aw-finish' }, slot.label)),
        h('p', { class: 'aw-req' }, slot.requirement))))),
      h('p', { 'data-badge': 'beginner-completion', 'data-state': 'locked' }, completionText(rubric ? settled.decision : { satisfied: 0, required: 0 }))),
    h('section', { 'aria-labelledby': 'award-h-cert' },
      h('h2', { id: 'award-h-cert' }, 'Sample certificate'),
      h('p', {}, 'Type your name to see your certificate.'),
      h('p', { id: 'award-art-count' }, 'Approved artwork: 0. No final artwork is accepted.'),
      h('p', {}, MAIL_OFFER.text),
      h('div', { class: 'aw-noprint' },
        h('label', { for: 'award-name' }, 'Name to show on the sample'),
        h('div', {}, input, ' ', saveName),
        h('div', { class: 'aw-actions' }, jump, printBtn, downloadBtn, shareBtn),
        shareOk.shareSheet ? null : h('p', {}, 'Share is not available in this browser. Download the PDF and share the file yourself. Aleph does not send it.')),
      certHost,
      h('details', { id: 'award-sample-notes', class: 'aw-noprint' },
        h('summary', {}, 'Record, storage, and what this sample is not'),
        h('ul', {}, ...SAMPLE_PAGE_NOTES.map((line) => h('li', {}, line))))),
    h('section', { 'aria-labelledby': 'award-h-why' },
      h('h2', { id: 'award-h-why' }, 'Why lesson marks are not used'),
      checklist,
      h('details', {},
        h('summary', {}, 'Where those marks are written'),
        h('ul', {}, ...TRUST_LIMITS.map((row) => h('li', {}, h('p', {}, row.limit), h('p', {}, `${row.path} (${row.symbol})`)))))),
  );

  fillBadgeArt(page, ctx, h, () => alive).catch(() => { /* the vector fallback stays */ });

  return () => { alive = false; root.replaceChildren(); };
}

export { certificateDecision };
