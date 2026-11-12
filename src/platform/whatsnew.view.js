// J10 What's New (#/whats-new): every entry in data/platform/changelog.json, the ones added since the learner's last visit
// marked, then the marker moves to the newest entry. Generated from the git history; nothing here is hand-written.
import { h } from '../shell/ui.js';
import { loadChangelog, newSince, entryList, SEEN_KEY } from './whatsnew.js';
import { BUILD, buildStamp } from '../lib/counts.js';

export function mount(root, ctx) {
  const status = h('p', { class: 'muted', role: 'status' }, 'Loading the list of changes…');
  const body = h('div', {});
  root.append(h('section', { class: 'card', 'aria-labelledby': 'view-title' },
    h('h1', { id: 'view-title', tabindex: '-1' }, "What's New"),
    h('p', {}, 'Each line is the first sentence of a change recorded in the project history, newest first. ', h('span', { 'data-version': BUILD.version }, buildStamp())),
    status, body));
  let alive = true;
  loadChangelog(ctx?.readinessFetch || globalThis.fetch).then((entries) => {
    if (!alive) return;
    let seen = null; try { seen = ctx?.store?.get?.(SEEN_KEY, null) ?? null; } catch { /* first look */ }
    const fresh = newSince(entries, seen);
    status.textContent = !seen ? `${entries.length} recent changes.` : fresh.length ? `${fresh.length} new since your last visit.` : 'Nothing new since your last visit.';
    body.replaceChildren(entryList(h, entries, fresh));
    if (entries[0]) try { ctx?.store?.set?.(SEEN_KEY, entries[0].hash); } catch { /* best effort */ }
  }).catch(() => { if (alive) status.textContent = 'The list of changes did not load. Open this page again while online.'; });
  return () => { alive = false; };
}
