// @ts-check
// Profiles (#/profiles): household profiles (R2) and guest mode (R3). Several learners on one device, each with their own
// progress, streak and settings. No accounts and no sync: slots on this device (src/shell/profile-slots.js).
import { h } from '../shell/ui.js';
import { frame, statusLine } from './ui.js';
import { household, addProfile, renameProfile, removeProfile, useProfile, startGuest, finishGuest, summaries, MAX_PROFILES, NAME_MAX } from './household.js';

export const COPY = Object.freeze({
  lead: 'Each person who learns on this device can have a profile, with their own progress, streak and settings. There are no accounts and nothing leaves this device.',
  guestLead: 'A guest session lets someone try Aleph without touching anyone’s progress. Lessons, games and books work as usual. When the session ends, nothing is kept unless you choose to keep it.',
  guestOpen: 'A guest session is open. Nothing the guest does is kept unless you choose to keep it. A session left open is ended after 12 hours.',
  notes: 'Back Up in Settings saves the profile in use. Delete All My Data in Settings deletes only the profile in use.',
  none: 'This browser is not keeping saved data right now, so profiles cannot be used. Everything else in Aleph still works.',
});
const line = (s) => `${s.lessons} ${s.lessons === 1 ? 'lesson' : 'lessons'} finished${s.streak ? `, ${s.streak}-day streak` : ''}`;

/** @param {HTMLElement} root @param {any} ctx `ctx.storage` and `ctx.reload` are stand-ins for tests */
export function mount(root, ctx = {}) {
  const s = ctx.storage ?? (() => { try { return globalThis.localStorage; } catch { return null; } })();
  const status = statusLine('pf-status');
  if (!s || ctx.store?.persistent === false) { frame(root, 'Profiles', h('p', {}, COPY.none)); return () => {}; }
  const reload = ctx.reload || (() => { try { location.hash = '#/'; location.reload(); } catch { /* the next open shows the new profile */ } });
  const body = h('div', { class: 'stack' });
  frame(root, 'Profiles', h('p', {}, COPY.lead), status, body, h('p', { class: 'muted' }, COPY.notes));
  const field = (id, label, value = '') => h('label', { class: 'field', for: id }, label, h('input', { type: 'text', id, maxlength: String(NAME_MAX), value, autocomplete: 'off' }));
  const val = (id) => /** @type {any} */ (body.querySelector(`#${id}`))?.value || '';
  const done = (out, okText, thenReload = false) => { if (!out.ok) { status.textContent = out.error; return; } status.textContent = okText; if (thenReload) reload(); else paint(); };

  function guestBox(hh) {
    let asked = false;
    const end = h('button', { type: 'button', class: 'btn', id: 'pf-guest-end', onclick: () => {
      if (!asked) { asked = true; end.textContent = 'End It Now'; status.textContent = 'Press End It Now to end the guest session. What the guest did will not be kept.'; return; }
      done(finishGuest(s), 'The guest session has ended. Nothing was kept.', true);
    } }, 'End Guest Session');
    return h('section', { class: 'card', 'aria-labelledby': 'pf-guest-h' }, h('h2', { id: 'pf-guest-h' }, 'Guest Session'), h('p', { id: 'pf-guest-open' }, COPY.guestOpen),
      h('div', { class: 'row' }, end),
      hh.full ? h('p', { class: 'muted' }, `This device already holds ${MAX_PROFILES} profiles, so the session cannot be kept as a new one.`) : h('div', {}, field('pf-keep-name', 'Keep it as a new profile named'),
        h('button', { type: 'button', class: 'btn secondary', id: 'pf-guest-keep', onclick: () => done(finishGuest(s, { keepAs: val('pf-keep-name') }), 'Kept. That profile is now in use.', true) }, 'Keep As A New Profile')));
  }
  function row(p, sum, hh) {
    let asked = false;
    const del = h('button', { type: 'button', class: 'btn secondary', 'data-pf-delete': p.id, 'aria-label': `Delete ${p.name}`, onclick: () => {
      if (!asked) { asked = true; del.textContent = 'Delete Now'; status.textContent = `Press Delete Now to delete ${p.name} and everything saved in that profile. This cannot be undone.`; return; }
      done(removeProfile(p.id, s), `${p.name} was deleted from this device.`);
    } }, 'Delete');
    return h('section', { class: 'card', 'data-profile': p.id, 'aria-labelledby': `pf-h-${p.id}` },
      h('h2', { id: `pf-h-${p.id}` }, p.name, p.active ? h('span', { class: 'muted' }, ' (in use)') : null),
      h('p', { class: 'muted' }, line(sum)),
      h('div', { class: 'row' },
        p.active || hh.guest ? null : h('button', { type: 'button', class: 'btn', 'data-pf-use': p.id, onclick: () => done(useProfile(p.id, s), `Switching to ${p.name}.`, true) }, `Switch To ${p.name}`),
        p.active || hh.guest ? null : del),
      h('details', {}, h('summary', {}, 'Change the name'), field(`pf-name-${p.id}`, 'Name', p.name),
        h('button', { type: 'button', class: 'btn secondary', 'data-pf-rename': p.id, onclick: () => done(renameProfile(p.id, val(`pf-name-${p.id}`), s), 'Saved ✓') }, 'Save Name')));
  }
  function paint() {
    const hh = household(s); const sums = new Map(summaries(s, ctx.now ?? Date.now()).map((x) => [x.id, x]));
    body.replaceChildren(
      hh.guest ? guestBox(hh) : null,
      ...hh.list.map((p) => row(p, sums.get(p.id), hh)),
      hh.guest ? null : h('section', { class: 'card', 'aria-labelledby': 'pf-add-h' }, h('h2', { id: 'pf-add-h' }, 'Add A Profile'),
        hh.full ? h('p', {}, `This device holds up to ${MAX_PROFILES} profiles.`) : h('div', {}, field('pf-new-name', 'Name'),
          h('button', { type: 'button', class: 'btn', id: 'pf-add', onclick: () => done(addProfile(val('pf-new-name'), s, ctx.now ?? Date.now()), 'Added. Press Switch To start learning in that profile.') }, 'Add Profile'))),
      hh.guest ? null : h('section', { class: 'card', 'aria-labelledby': 'pf-guest-start-h' }, h('h2', { id: 'pf-guest-start-h' }, 'Guest Mode'), h('p', {}, COPY.guestLead),
        h('button', { type: 'button', class: 'btn secondary', id: 'pf-guest-start', onclick: () => done(startGuest(s, ctx.now ?? Date.now()), 'Starting a guest session.', true) }, 'Start A Guest Session')),
      hh.list.length > 1 ? h('p', {}, h('a', { href: '#/study-hall' }, 'Study Hall'), ': everyone on this device side by side.') : null);
  }
  paint();
  return () => {};
}
