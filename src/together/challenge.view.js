// @ts-check
// Challenge A Friend (#/friend-challenge): challenge codes (R1) and the group table by file (R7).
// A code names a game, a level and a board. Whoever enters it plays the same board on their own device. No server.
import { h } from '../shell/ui.js';
import { frame, statusLine, saveFile, copyButton, filePicker } from './ui.js';
import { ARCADE_GAMES } from '../games/arcade.catalog.js';
import { CHALLENGES_KEY, newBoard, makeCode, readCode, playHref, noteBoard, noteOther, table, compareLine, groupFile, readGroupFile, emptyChallenges } from './challenge.js';
import { cleanText, appBase, fromPasted } from './share.js';
import { myName } from './household.js';

export const COPY = Object.freeze({
  lead: 'Pick a game and get a short code. A friend types the code into their own Aleph and plays the very same board at the same level. Each results card then shows both scores. The code is the whole message: no accounts, and nothing goes through a server.',
  fair: 'For a fair match, agree first whether you both play with the timer on. Only your first finished round on a board counts; later rounds are practice.',
  group: 'More than two players? Save the table as a file and pass it on. Each player adds the file here, plays the board, and saves the table again with their own score in it.',
});
const NAME_KEY = 'together.name';
const titleOf = (id) => ARCADE_GAMES.find((g) => g.id === id)?.title || id;

/** @param {HTMLElement} root @param {any} ctx */
export function mount(root, ctx = {}) {
  const store = ctx.store; const now = () => ctx.now ?? Date.now();
  const status = statusLine('ch-status');
  const made = h('div', { id: 'ch-made' });
  const listHost = h('div', { id: 'ch-list' });
  const load = () => { try { return store?.get?.(CHALLENGES_KEY) || emptyChallenges(); } catch { return emptyChallenges(); } };
  const save = (s) => { try { store?.set?.(CHALLENGES_KEY, s); } catch { /* storage blocked: this session only */ } };
  const name = /** @type {any} */ (h('input', { type: 'text', id: 'ch-name', maxlength: '20', autocomplete: 'off', value: cleanText(store?.get?.(NAME_KEY) || myName(ctx.storage)), onchange: (e) => { try { store?.set?.(NAME_KEY, cleanText(e.target.value)); } catch { /* not kept */ } paintList(); } }));
  const me = () => cleanText(name.value) || 'You';
  const game = /** @type {any} */ (h('select', { id: 'ch-game' }, ...ARCADE_GAMES.map((g) => h('option', { value: g.id }, g.title))));
  const level = /** @type {any} */ (h('select', { id: 'ch-level' }, ...[1, 2, 3, 4, 5].map((n) => h('option', { value: String(n) }, `Level ${n}`))));
  const codeIn = /** @type {any} */ (h('input', { type: 'text', id: 'ch-code', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', value: ctx.query?.c ? String(ctx.query.c) : '' }));
  const fromIn = /** @type {any} */ (h('input', { type: 'text', id: 'ch-from', maxlength: '20', autocomplete: 'off', value: cleanText(ctx.query?.n) }));

  function make() {
    const b = newBoard(game.value, Number(level.value), ctx.random || Math.random);
    save(noteBoard(load(), b, now()));
    const code = makeCode(b);
    const link = `${ctx.base ?? appBase()}#/friend-challenge?c=${code.replace(/-/g, '')}`;
    made.replaceChildren(h('p', {}, `${titleOf(b.game)}, level ${b.level}. The code: `, h('strong', { id: 'ch-new-code' }, code)),
      h('div', { class: 'row' }, h('a', { class: 'btn', id: 'ch-play-new', href: playHref(b) }, 'Play It Now'), copyButton('Copy Code', () => code, status), copyButton('Copy Link', () => link, status)),
      h('p', { class: 'muted' }, 'Play first if you like: after your round the results card gives a longer code that carries your score.'));
    paintList();
  }
  function open() {
    const c = readCode(fromPasted(codeIn.value, 'c'));
    if (!c.ok) { status.textContent = c.error; return; }
    let s = noteBoard(load(), c, now());
    if (c.score != null) s = noteOther(s, c, { name: cleanText(fromIn.value), score: c.score, at: now() }, now(), cleanText);
    save(s); paintList();
    const it = s.items[c.key];
    status.textContent = it.mine ? (c.score != null ? compareLine(it.mine, it.others[it.others.length - 1]) : 'You have already played that board. It is in your list below.')
      : `${c.title}, level ${c.level}${c.score != null ? `. Score to beat: ${c.score}` : ''}. It is in your list below: press Play.`;
  }
  function addFile(text) {
    if (text == null) { status.textContent = 'That file could not be read. Choose the challenge file you were sent.'; return; }
    const r = readGroupFile(load(), text, me(), now(), cleanText);
    if (!r.ok) { status.textContent = r.error; return; }
    save(r.state); paintList();
    status.textContent = `${r.board.title}, level ${r.board.level}: ${r.added} ${r.added === 1 ? 'result' : 'results'} added from the file. ${r.state.items[r.board.key].mine ? 'Your own score is already in the table.' : 'Press Play to add yours.'}`;
  }
  function card(key, it) {
    const rows = table(it, me());
    return h('section', { class: 'card', 'data-board': key, 'aria-label': `${titleOf(it.game)}, level ${it.level}` },
      h('h3', {}, `${titleOf(it.game)}, Level ${it.level}`),
      h('p', {}, 'Code: ', h('strong', {}, makeCode(it, it.mine ? it.mine.score : null)), it.mine ? ' (carries your score)' : ''),
      ...(it.mine ? it.others.map((o) => h('p', { class: 'ch-compare' }, compareLine(it.mine, o))) : []),
      rows.length ? h('table', {}, h('caption', {}, 'Results on this board'), h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Place'), h('th', { scope: 'col' }, 'Name'), h('th', { scope: 'col' }, 'Points'))),
        h('tbody', {}, ...rows.map((r) => h('tr', {}, h('td', {}, String(r.place)), h('th', { scope: 'row' }, r.name, r.me ? ' (you)' : ''), h('td', {}, String(r.score)))))) : h('p', { class: 'muted' }, 'Nobody has a score on this board yet.'),
      h('div', { class: 'row' }, h('a', { class: it.mine ? 'btn secondary' : 'btn', href: playHref(it) }, it.mine ? 'Play Again For Practice' : 'Play'),
        h('button', { type: 'button', class: 'btn secondary', 'data-ch-file': key, onclick: () => { status.textContent = saveFile(`aleph-challenge-${key}.json`, JSON.stringify(groupFile(it, me(), now(), cleanText))) ? 'Saved the table as a file. Pass it on.' : 'This browser could not save a file.'; } }, 'Save The Table As A File')));
  }
  function paintList() {
    const items = Object.entries(load().items).sort((a, b) => (b[1].at || 0) - (a[1].at || 0));
    listHost.replaceChildren(...(items.length ? items.map(([k, it]) => card(k, it)) : [h('p', { class: 'muted' }, 'No challenges yet.')]));
  }
  frame(root, 'Challenge A Friend', h('p', {}, COPY.lead), h('p', { class: 'muted' }, COPY.fair), status,
    h('label', { class: 'field', for: 'ch-name' }, 'Your name on the table', name),
    h('section', { 'aria-labelledby': 'ch-make-h' }, h('h2', { id: 'ch-make-h' }, 'Start A Challenge'), h('label', { class: 'field', for: 'ch-game' }, 'Game', game), h('label', { class: 'field', for: 'ch-level' }, 'Level', level),
      h('button', { type: 'button', class: 'btn', id: 'ch-make', onclick: make }, 'Make A Code'), made),
    h('section', { 'aria-labelledby': 'ch-open-h' }, h('h2', { id: 'ch-open-h' }, 'Enter A Code'), h('label', { class: 'field', for: 'ch-code' }, 'The code you were sent', codeIn), h('label', { class: 'field', for: 'ch-from' }, 'Who sent it (optional)', fromIn),
      h('button', { type: 'button', class: 'btn', id: 'ch-open', onclick: open }, 'Open The Code')),
    h('section', { 'aria-labelledby': 'ch-group-h' }, h('h2', { id: 'ch-group-h' }, 'Group Challenge By File'), h('p', {}, COPY.group), h('div', { class: 'row' }, ...filePicker('ch-pick', 'Add A Challenge File', addFile))),
    h('section', { 'aria-labelledby': 'ch-list-h' }, h('h2', { id: 'ch-list-h' }, 'Your Challenges'), listHost),
    h('p', {}, h('a', { href: '#/games' }, 'Games')));
  paintList();
  if (ctx.query?.c) open();
  return () => {};
}
