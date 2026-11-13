// My Collection (#/collection): S1 the learner's own shelf with folders, S2 any folder as a review deck, S3 favorites,
// S4 the personal dictionary (words with the learner's own notes and translations), S8 saved searches, S9 a folder as a file.
// Everything is kept on this device. Nothing is sent anywhere; a file leaves only when the learner downloads it.
import { h } from '../shell/ui.js';
import { review } from '../curriculum/srs.js';
import * as M from './model.js';

const SHELVES = [['all', 'Everything'], ['favorites', 'Favorites'], ['words', 'My Dictionary'], ['none', 'Not in a Folder']];
const RATINGS = [[1, 'Again'], [2, 'Hard'], [3, 'Good'], [4, 'Easy']];
const he = (text, tag = 'span') => h(tag, { lang: 'he', dir: 'rtl', class: 'alef-he' }, text);

export async function mount(root, ctx, env = {}) {
  const store = ctx?.store; const now = env.now || (() => Date.now());
  const loadJSON = env.loadJSON || (async (p) => (await fetch(new URL(p, import.meta.url))).json());
  let rec = M.clean(await M.read(store));
  let cards = (await M.read(store, M.CARDS_KEY, {})) || {};
  let searches = M.cleanSearches(await M.read(store, M.SEARCHES_KEY, []));
  let shelf = typeof ctx?.query?.shelf === 'string' ? ctx.query.shelf : 'all';
  let filter = ''; let session = null; let alive = true;
  const status = h('p', { role: 'status', class: 'muted' });
  const body = h('div', {});
  root.append(h('section', { class: 'card', 'aria-labelledby': 'view-title' }, h('h1', { id: 'view-title', tabindex: '-1' }, 'My Collection'),
    h('p', {}, 'Your own shelf. Save a word, a line, a prayer, a verse, a song or a game from anywhere in Aleph with the Save button at the bottom of its page, then sort what you saved into folders you name. It is all kept on this device.'),
    body, status));
  const say = (t) => { status.textContent = t; };
  const save = async (next, msg) => { rec = M.clean(next); const ok = await M.write(store, M.KEY, rec); say(ok ? msg : 'This could not be saved on this device.'); await syncCards(); render(); };
  async function syncCards() { const s = M.syncDeckCards(rec, cards, now()); cards = s.cards; if (s.added || s.removed) await M.write(store, M.CARDS_KEY, cards); }
  const download = (name, text, type) => {
    try { const url = URL.createObjectURL(new Blob([text], { type })); const a = h('a', { href: url, download: name }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); say(`${name} downloaded.`); }
    catch { say('This browser could not make the file.'); }
  };
  const folderName = (id) => rec.folders.find((f) => f.id === id)?.name || '';

  // ---------- one saved item ----------
  function itemRow(i) {
    const noteId = `col-note-${i.id}`, mineId = `col-mine-${i.id}`, moveId = `col-move-${i.id}`;
    const title = i.href ? h('a', { href: i.href }, i.kind === 'word' ? he(i.title) : i.title) : (i.kind === 'word' ? he(i.title) : h('span', {}, i.title));
    return h('li', { class: 'collection-item', 'data-item': i.id },
      h('p', {}, h('strong', {}, title), ' ', h('span', { class: 'muted' }, `${M.KINDS[i.kind]}${i.folder ? `, in ${folderName(i.folder)}` : ''}`)),
      i.he && i.kind !== 'word' ? h('p', {}, he(i.he)) : null,
      i.translit || i.en ? h('p', {}, [i.translit, i.en].filter(Boolean).join(': ')) : null,
      i.mine ? h('p', {}, h('strong', {}, 'My translation: '), i.mine) : null,
      i.note ? h('p', {}, h('strong', {}, 'My note: '), i.note) : null,
      h('p', {},
        h('button', { type: 'button', class: 'btn secondary', 'aria-pressed': i.fav, 'data-act': 'fav', onclick: () => save(M.toggleFav(rec, i, now()).rec, i.fav ? 'Taken off your favorites.' : 'Added to your favorites.') }, i.fav ? '♥ Favorite' : '♡ Favorite'), ' ',
        h('label', { for: moveId }, 'Folder '),
        h('select', { id: moveId, onchange: (e) => save(M.moveItem(rec, i.id, e.target.value || null), e.target.value ? `Moved to ${folderName(e.target.value)}.` : 'Taken out of its folder.') },
          h('option', { value: '', selected: i.folder ? null : '' }, 'Not in a folder'), ...rec.folders.map((f) => h('option', { value: f.id, selected: i.folder === f.id ? '' : null }, f.name))), ' ',
        h('button', { type: 'button', class: 'btn secondary', 'data-act': 'remove', onclick: () => save(M.removeItem(rec, i.id), `Removed "${i.title}" from your collection.`) }, 'Remove')),
      h('details', {}, h('summary', {}, i.note || i.mine ? 'Change my note' : 'Add a note'),
        i.kind === 'word' || i.he ? h('p', {}, h('label', { for: mineId }, 'My own translation '), h('input', { id: mineId, type: 'text', maxlength: String(M.MAX.text), value: i.mine })) : null,
        h('p', {}, h('label', { for: noteId }, 'My note'), h('br'), h('textarea', { id: noteId, rows: '3', maxlength: String(M.MAX.note), style: 'width:100%' }, i.note)),
        h('p', {}, h('button', { type: 'button', class: 'btn', 'data-act': 'save-note', onclick: (e) => {
          const box = e.target.closest('details'); const note = box.querySelector('textarea').value; const mine = box.querySelector('input')?.value;
          let next = M.setNote(rec, i.id, note, now()); if (mine !== undefined) next = M.setMine(next, i.id, mine, now());
          save(next, 'Note saved.');
        } }, 'Save note'))));
  }

  // ---------- S2 review a folder ----------
  function reviewPanel() {
    const cur = session.queue[0];
    if (!cur) { const n = session.done; session = null; return h('div', {}, h('h2', {}, 'Deck Review'), h('p', {}, n ? `Done: ${n} card${n === 1 ? '' : 's'} answered. They will come back when they are due.` : 'Nothing in this folder is due right now.'), h('p', {}, h('button', { type: 'button', class: 'btn', onclick: () => render() }, 'Back to the folder'))); }
    const answer = h('div', { hidden: '' }, cur.item.translit ? h('p', {}, cur.item.translit) : null, cur.item.en ? h('p', {}, cur.item.en) : null, cur.item.mine ? h('p', {}, h('strong', {}, 'My translation: '), cur.item.mine) : null, cur.item.note ? h('p', { class: 'muted' }, cur.item.note) : null,
      h('p', {}, 'How well did you know it? ', ...RATINGS.map(([r, label]) => h('button', { type: 'button', class: 'btn secondary', 'data-rate': String(r), onclick: async () => {
        const id = M.cardId(cur.item.id); cards = { ...cards, [id]: review(cards[id], r, now()) };
        await M.write(store, M.CARDS_KEY, cards); session.queue.shift(); session.done++;
        if (r === 1) session.queue.push(cur);      // missed: once more before the session ends
        render();
      } }, label))));
    return h('div', { 'data-review': session.folder }, h('h2', {}, `Deck Review: ${folderName(session.folder)}`), h('p', { class: 'muted' }, `${session.queue.length} to go`),
      he(cur.item.he, 'p'),
      h('p', {}, h('button', { type: 'button', class: 'btn', 'data-act': 'show', onclick: (e) => { answer.hidden = false; e.target.hidden = true; } }, 'Show the answer'), ' ',
        h('button', { type: 'button', class: 'btn secondary', onclick: () => { session = null; render(); } }, 'Stop')), answer);
  }

  // ---------- folder tools (S1, S2, S9) ----------
  function folderTools(f) {
    const d = M.deckSummary(rec, cards, f.id, now()); const renameId = 'col-rename';
    return h('div', { class: 'collection-folder-tools' },
      h('h3', {}, 'Review This Folder'),
      h('p', {}, h('label', {}, h('input', { type: 'checkbox', checked: f.deck ? '' : null, 'data-act': 'deck', onchange: (e) => save(M.setDeck(rec, f.id, e.target.checked), e.target.checked ? 'This folder is now a review deck.' : 'This folder is no longer a review deck. Its review history was cleared.') }),
        ' Use this folder as a review deck')),
      f.deck ? h('p', {}, `${d.cards} card${d.cards === 1 ? '' : 's'}: ${d.due} due now, ${d.fresh} not started.${d.skipped ? ` ${d.skipped} item${d.skipped === 1 ? ' has' : 's have'} no Hebrew and meaning to ask about, so ${d.skipped === 1 ? 'it is' : 'they are'} left out.` : ''} The cards are spaced the same way as every other review in Aleph. `,
        d.due ? h('button', { type: 'button', class: 'btn', 'data-act': 'review', onclick: () => { session = { folder: f.id, queue: M.dueInFolder(rec, cards, f.id, now()), done: 0 }; render(); } }, `Review ${d.due} now`) : null)
        : h('p', { class: 'muted' }, 'Turn this on and every item here that has Hebrew and a meaning becomes a card that comes back just before you would forget it.'),
      h('h3', {}, 'Share or Change This Folder'),
      h('p', {}, h('button', { type: 'button', class: 'btn secondary', 'data-act': 'export', onclick: () => { const file = M.exportFolder(rec, f.id, now()); download(M.fileName(f.name), JSON.stringify(file, null, 1) + '\n', 'application/json'); } }, 'Download this folder as a file'),
        ' ', h('span', { class: 'muted' }, 'Send the file to someone yourself; they open it with "Add a folder from a file" on their own device. Your notes go along; your hearts and review history do not.')),
      h('p', {}, h('label', { for: renameId }, 'Folder name '), h('input', { id: renameId, type: 'text', maxlength: String(M.MAX.name), value: f.name }), ' ',
        h('button', { type: 'button', class: 'btn secondary', onclick: () => save(M.renameFolder(rec, f.id, body.querySelector('#' + renameId).value), 'Folder renamed.') }, 'Rename'), ' ',
        h('button', { type: 'button', class: 'btn secondary', 'data-act': 'delete-folder', onclick: () => { shelf = 'all'; save(M.removeFolder(rec, f.id), `Folder "${f.name}" removed. What was in it is still in your collection.`); } }, 'Remove this folder')));
  }

  // ---------- S4 personal dictionary tools ----------
  function wordTools() {
    const qId = 'col-word-q'; const results = h('ul', { 'data-role': 'word-results' });
    const find = async () => {
      const q = body.querySelector('#' + qId).value; results.replaceChildren(h('li', { class: 'muted' }, 'Looking in the dictionary…'));
      let index = null; try { index = await loadJSON('../../data/vocab/index.json'); } catch { index = null; }
      if (!alive) return;
      const hits = index ? M.lookupWords(index, q) : [];
      results.replaceChildren(...(hits.length ? hits.map((w) => h('li', {}, he(w.he), ` ${w.translit ? w.translit + ': ' : ''}${w.en} `,
        h('button', { type: 'button', class: 'btn secondary', 'data-act': 'add-word', onclick: () => { const r = M.saveItem(rec, w, now()); if (r.error) say(r.error); else save(r.rec, `${w.he} added to My Dictionary.`); } }, M.has(rec, w) ? 'Saved' : 'Add')))
        : [h('li', { class: 'muted' }, index ? 'No dictionary word matches that. Try the Hebrew without vowel points, or one English word.' : 'The dictionary could not be opened. It needs a connection the first time.')]));
    };
    return h('div', {},
      h('p', {}, 'Your own copy of the dictionary: the words you chose, with your notes and your own translations. The search box above looks through your notes too.'),
      h('p', {}, h('label', { for: qId }, 'Add a word (Hebrew or English) '), h('input', { id: qId, type: 'search', maxlength: '60', onkeydown: (e) => { if (e.key === 'Enter') find(); } }), ' ', h('button', { type: 'button', class: 'btn', 'data-act': 'find-word', onclick: find }, 'Find')),
      results,
      M.counts(rec).words ? h('p', {}, h('button', { type: 'button', class: 'btn secondary', 'data-act': 'words-csv', onclick: () => download('aleph-my-dictionary.csv', M.wordsCSV(rec), 'text/csv') }, 'Download as a spreadsheet file'), ' ',
        h('button', { type: 'button', class: 'btn secondary', onclick: () => download('aleph-my-dictionary.txt', M.wordsText(rec), 'text/plain') }, 'Download as plain text')) : null);
  }

  // ---------- S8 saved searches ----------
  function searchTools() {
    const qId = 'col-search-q'; const out = h('div', { 'data-role': 'search-out' });
    let ix = null;
    const run = async (q) => {
      if (!ix) { const S = env.search || await import('../platform/search-more.js'); ix = { S, data: await S.loadIndexes() }; }
      return M.flatResults(ix.S.searchAll(ix.data, q));
    };
    const show = async (s) => {
      out.replaceChildren(h('p', { class: 'muted' }, 'Searching…'));
      let rows = []; try { rows = await run(s.q); } catch { out.replaceChildren(h('p', {}, 'The search could not run. It needs a connection the first time.')); return; }
      if (!alive) return;
      const fresh = new Set(M.newMatches(s, rows).map((r) => r.href));
      out.replaceChildren(h('h3', {}, `"${s.q}": ${rows.length} match${rows.length === 1 ? '' : 'es'}, ${fresh.size} new since you last looked`),
        rows.length ? h('ul', {}, ...rows.map((r) => h('li', {}, fresh.has(r.href) ? h('strong', {}, 'New: ') : null, h('a', { href: r.href }, r.label), r.desc ? ` ${r.desc}` : '', h('span', { class: 'muted' }, ` (${r.group})`)))) : h('p', {}, 'Nothing matches yet. New matches will show here when Aleph gains content.'));
      searches = M.markSeen(searches, s.q, rows.map((r) => r.href)); await M.write(store, M.SEARCHES_KEY, searches);
    };
    const add = async () => {
      const q = body.querySelector('#' + qId).value.trim(); if (!q) { say('Type what to search for first.'); return; }
      let rows = []; try { rows = await run(q); } catch { rows = []; }
      searches = M.saveSearch(searches, q, rows.map((r) => r.href), now()); await M.write(store, M.SEARCHES_KEY, searches);
      say(`Search "${q}" saved with the ${rows.length} match${rows.length === 1 ? '' : 'es'} it has today.`); render();
    };
    return h('div', {}, h('h2', {}, 'Saved Searches'),
      h('p', {}, 'Save a search and come back to it. Lessons, little books, root families, prayers and texts are searched; anything added to Aleph since you last looked is marked new.'),
      h('p', {}, h('label', { for: qId }, 'Search to save '), h('input', { id: qId, type: 'search', maxlength: '80', onkeydown: (e) => { if (e.key === 'Enter') add(); } }), ' ', h('button', { type: 'button', class: 'btn', 'data-act': 'save-search', onclick: add }, 'Save this search')),
      searches.length ? h('ul', {}, ...searches.map((s) => h('li', {}, h('button', { type: 'button', class: 'btn secondary', 'data-act': 'open-search', onclick: () => show(s) }, s.q), ' ',
        h('button', { type: 'button', class: 'btn secondary', 'aria-label': `Remove the saved search ${s.q}`, onclick: async () => { searches = M.removeSearch(searches, s.q); await M.write(store, M.SEARCHES_KEY, searches); say('Saved search removed.'); render(); } }, 'Remove')))) : null,
      out);
  }

  // ---------- S9 take a folder file in; verses from the Verse Notebook ----------
  function importTools() {
    const fileId = 'col-file';
    const take = async (e) => {
      const f = e.target.files?.[0]; if (!f) return;
      if (f.size > 2_000_000) { say('That file is too large to be a collection folder.'); return; }
      let data = null; try { data = JSON.parse(await f.text()); } catch { say('That file could not be read as a collection folder.'); return; }
      const r = M.importFolder(rec, data, now());
      if (r.error) { say(r.error); return; }
      shelf = r.folder; save(r.rec, `Folder "${folderName(r.folder) || data.folder}" added: ${r.added} new, ${r.kept} you already had${r.skipped ? `, ${r.skipped} left out` : ''}.`);
    };
    const fromNotebook = async () => {
      const nb = await M.read(store, 'torah.notebook.v1', null); const list = Array.isArray(nb?.items) ? nb.items : [];
      if (!list.length) { say('Your Verse Notebook is empty.'); return; }
      const made = M.addFolder(rec, 'Verse Notebook', now()); let cur = made.rec, n = 0;
      for (const v of list) { const r = M.saveItem(cur, { kind: 'verse', title: `${v.en || v.book} ${v.chapter}:${v.verse}`, he: v.he, en: v.english, note: v.note, href: '#/verse-notebook', folder: made.id }, v.savedAt || now()); if (!r.error) { cur = r.rec; n++; } }
      shelf = made.id || 'all'; save(cur, `${n} verse${n === 1 ? '' : 's'} from your Verse Notebook ${n === 1 ? 'is' : 'are'} now in a folder here. The notebook itself is unchanged.`);
    };
    return h('div', {}, h('h2', {}, 'Add From Elsewhere'),
      h('p', {}, h('label', { for: fileId }, 'Add a folder from a file '), h('input', { id: fileId, type: 'file', accept: '.json,application/json', onchange: take })),
      h('p', {}, h('button', { type: 'button', class: 'btn secondary', 'data-act': 'from-notebook', onclick: fromNotebook }, 'Copy my Verse Notebook into a folder'), ' ', h('a', { href: '#/verse-notebook' }, 'Open the Verse Notebook')));
  }

  function render() {
    if (!alive) return;
    if (session) { body.replaceChildren(reviewPanel()); return; }
    const c = M.counts(rec); const folder = rec.folders.find((f) => f.id === shelf);
    if (!folder && !SHELVES.some(([id]) => id === shelf)) shelf = 'all';
    const tab = (id, label, n) => h('button', { type: 'button', class: shelf === id ? 'btn' : 'btn secondary', 'aria-pressed': shelf === id, 'data-shelf': id, onclick: () => { shelf = id; render(); } }, `${label} (${n})`);
    const list = M.itemsIn(rec, shelf, filter);
    const newId = 'col-new-folder', filterId = 'col-filter';
    body.replaceChildren(...[
      h('div', { role: 'group', 'aria-label': 'Shelves and folders', class: 'collection-shelves' }, ...SHELVES.map(([id, label]) => tab(id, label, c[id])), ...rec.folders.map((f) => tab(f.id, f.name, c.folders[f.id] || 0))),
      h('p', {}, h('label', { for: newId }, 'New folder '), h('input', { id: newId, type: 'text', maxlength: String(M.MAX.name), onkeydown: (e) => { if (e.key === 'Enter') body.querySelector('[data-act="new-folder"]').click(); } }), ' ',
        h('button', { type: 'button', class: 'btn secondary', 'data-act': 'new-folder', onclick: () => { const r = M.addFolder(rec, body.querySelector('#' + newId).value, now()); if (r.error) say(r.error); else { shelf = r.id; save(r.rec, 'Folder made. Move saved items into it with the Folder menu on each one.'); } } }, 'Make folder')),
      h('h2', {}, folder ? folder.name : SHELVES.find(([id]) => id === shelf)[1]),
      shelf === 'words' ? wordTools() : null,
      shelf === 'favorites' ? h('p', {}, 'Everything you gave a heart, newest first. One tap on Save at the bottom of any page puts it here.') : null,
      c.all > 6 || filter ? h('p', {}, h('label', { for: filterId }, 'Search in this shelf '), h('input', { id: filterId, type: 'search', value: filter, oninput: (e) => { filter = e.target.value; const ul = body.querySelector('[data-role="items"]'); ul.replaceChildren(...rows(M.itemsIn(rec, shelf, filter))); } })) : null,
      h('ul', { 'data-role': 'items', class: 'collection-items' }, ...rows(list)),
      folder ? folderTools(folder) : null,
      shelf === 'all' ? searchTools() : null,
      shelf === 'all' ? importTools() : null,
      h('p', { class: 'muted' }, h('a', { href: '#/shelf' }, 'Reading Shelf'), ' · ', h('a', { href: '#/timeline' }, 'My Timeline'), ' · ', h('a', { href: '#/my-hebrew' }, 'My Hebrew'), ' · ', h('a', { href: '#/paths' }, 'Interest Paths'))].filter(Boolean));
  }
  const rows = (list) => (list.length ? list.map(itemRow) : [h('li', { class: 'muted' }, filter ? 'Nothing here matches that search.' : shelf === 'all' ? 'Nothing saved yet. Open any page and press Save at the bottom of it.' : 'Nothing here yet.')]);

  await syncCards();
  render();
  return () => { alive = false; };
}
