/**
 * Reading Without Vowels (#/bridge), lane 6, points plan #16. DRAFT, unreviewed.
 *   #/bridge                 the ladder and the four shelves
 *   #/bridge/books           the 63 books, the ones read with vowels first;  #/bridge/book/<id> one book at the learner's level
 *   #/bridge/lines           prayer lines (the Fade-Out lines);              #/bridge/line/<id> one line at the learner's level
 *   #/bridge/words           word recognition without vowel marks (first-try scoring)
 *   #/bridge/modern          short modern texts: signs, menus and messages, as Israel shows them
 * Self-reported: the learner says whether they read a text; nothing is machine-graded. Store key bridge.v1.
 * ctx extras for tests: ctx.bridgeLoad(rel) replaces the JSON loader.
 */
import { el, heText, storeGet, storeSet, CARDS_KEY } from '../curriculum/dom.js';
import { transliterate } from '../pronunciation/transliterate.js';
import { congregationOf } from '../pronunciation/forTradition.js';
import { shelfOrder } from '../books/order.js';
import { FILES, bookFile, loaderFor } from './loader.js';
import { STORE_KEY, DRAFT_NOTE, SPELLING_NOTE, BRIDGE_STAGES, LADDER, FIRST_BRIDGE, normalizeState, levelOf, isDone, present, recordText, bookTextId, lineTextId,
  bookShelf, prayerLines, drillWords, pickWords, wordQuestion, recordWord, wordSummary, modernShelf, recordModern, showName, stageOf } from './model.js';

export const TITLE = 'Reading Without Vowels';

/** @param {HTMLElement} root @param {any} ctx @returns {() => void} */
export function mount(root, ctx) {
  const q = ctx?.query || {};
  const sec = String(q.sec || '');
  const load = loaderFor(ctx);
  const wrap = el('section', { class: 'alef-bridge', 'aria-labelledby': 'view-title' });
  const h1 = el('h1', { id: 'view-title', tabindex: '-1' }, TITLE);
  const body = el('div', { class: 'br-body' });
  const status = el('p', { role: 'status', 'aria-live': 'polite', class: 'br-status' });
  wrap.append(h1, el('p', { class: 'draft-flag', role: 'note' }, DRAFT_NOTE), body, status);
  root.append(wrap);
  let alive = true, st = normalizeState(null);
  const say = (t) => { status.textContent = t; };
  const save = () => storeSet(ctx, STORE_KEY, st);
  const set = (...n) => body.replaceChildren(...n.flat().filter(Boolean));
  const btn = (label, onclick, extra = {}) => el('button', { type: 'button', class: 'btn', onclick, ...extra }, label);
  const back = (href, label) => el('p', {}, el('a', { href }, label));
  const tradition = () => congregationOf(ctx?.settings);
  const failed = () => set(el('p', { role: 'alert' }, 'This practice could not be loaded. If you are offline, open it once while online. Nothing was lost.'));

  function ladderList(level) {
    return el('ol', { class: 'br-ladder', start: '0', 'aria-label': 'The reading ladder' }, ...LADDER.map((s) => el('li', { 'aria-current': s.level === level ? 'step' : null },
      el('strong', {}, s.name), `: ${s.help}`, s.kind === 'fade' ? el('span', { class: 'muted' }, ' (Fade-out recall)') : null)));
  }

  // ---------- hub ----------
  function hub() {
    set(
      el('p', {}, 'Real Hebrew is printed without vowel marks. This ladder carries on from Fade-out recall: after the four recall stages come three reading stages, kept separately for each text you read.'),
      ladderList(-1),
      el('h2', {}, 'Practice'),
      el('ul', { class: 'br-shelves' },
        el('li', {}, el('a', { href: '#/bridge/books' }, 'Little books without vowels'), ': the books you have already read with vowels come first.'),
        el('li', {}, el('a', { href: '#/bridge/lines' }, 'Prayer lines without vowels'), ': the lines from Fade-out recall.'),
        el('li', {}, el('a', { href: '#/bridge/words' }, 'Word recognition'), ': a word without its vowels; the vowelled form is one tap away.'),
        el('li', {}, el('a', { href: '#/bridge/modern' }, 'Modern texts shelf'), ': signs, menus and short messages, the way Israel shows them.'),
        el('li', {}, el('a', { href: '#/readlab/texts' }, 'Three versions'), ': one text with all vowel marks, then some, then none; each version opens when you read the one before it without help.')),
      el('p', { class: 'muted' }, 'Earlier stages: ', el('a', { href: '#/learn?fade=1' }, 'Fade-out recall'), '.'));
  }

  // ---------- one text (a book or a prayer line) at the learner's level ----------
  function textPage({ id, title, sub, lines, backHref, backLabel, fadeHref }) {
    let saved = levelOf(st, id);
    let played = saved, helped = new Set(), answered = false;
    const draw = () => {
      const stage = stageOf(played);
      const rows = lines.map((ln, i) => {
        const p = present(played, ln);
        const open = helped.has(i);
        const heShown = open && !p.vowels ? p.pointed : p.he;
        const tl = p.translit || (open && !stage.translit ? ln.translit : null);
        const helpLabel = stage.vowels ? 'Show transliteration' : stage.translit ? 'Show vowel marks' : 'Show vowel marks and transliteration';
        const help = !open && !answered
          ? btn(helpLabel, () => { helped.add(i); draw(); say(`Help shown on line ${i + 1}. This read now counts as read with help.`); }, { class: 'btn secondary br-help', 'aria-label': `${helpLabel}, line ${i + 1}` })
          : null;
        return el('li', { class: 'br-line', 'data-line': String(i) }, el('p', { class: 'br-he' }, heText(heShown, 'alef-he br-big')),
          tl ? el('p', { class: 'br-translit', lang: 'en' }, tl) : null,
          help,
          ln.en ? el('details', { class: 'br-en' }, el('summary', {}, 'English'), el('p', {}, ln.en)) : null);
      });
      const grade = answered ? null : el('div', { class: 'row br-grade' },
        btn('I read it all', () => finish(true), { id: 'br-read' }), btn('I needed help', () => finish(false), { class: 'btn secondary', id: 'br-help' }),
        el('span', { class: 'muted' }, 'Self-graded: the app cannot hear you.'));
      set(back(backHref, backLabel), el('h2', {}, title), sub ? el('p', { class: 'muted' }, sub) : null,
        el('p', {}, `Your level for this text: stage ${saved}, ${stageOf(saved).name}.${isDone(st, id) ? ' You have read it at every stage.' : ''}`),
        el('div', { class: 'row', role: 'group', 'aria-label': 'Stage to read at' }, ...BRIDGE_STAGES.map((s) => btn(`${s.level}: ${s.name}`, () => { played = s.level; helped = new Set(); answered = false; draw(); say(`${s.name}. ${s.level === saved ? 'This is your saved stage.' : 'Practice only: your saved stage moves only when you read at it.'}`); }, { class: 'btn secondary', 'aria-pressed': String(s.level === played) }))),
        el('p', { class: 'muted' }, `${stage.name}: ${stage.help}`),
        fadeHref ? el('p', { class: 'muted' }, 'Stages 0 to 3 for this line: ', el('a', { href: fadeHref }, 'Fade-out recall'), '.') : null,
        !stage.vowels ? el('p', { class: 'muted br-spelling', role: 'note' }, SPELLING_NOTE) : null,
        el('ol', { class: 'br-lines' }, ...rows), grade);
    };
    async function finish(said) {
      if (answered) return; answered = true;
      const unaided = said && helped.size === 0, before = levelOf(st, id);
      const r = recordText(st, id, played, unaided, Date.now());
      st = r.state; saved = levelOf(st, id); await save();
      if (!alive) return;
      const res = r.result;
      say(played !== before ? 'Saved. You practiced another stage, so your saved stage did not change.'
        : said && helped.size ? `Saved as read with help: you opened help on ${helped.size} line${helped.size === 1 ? '' : 's'}.${res.moved ? ` This text goes back to stage ${res.level}.` : ''}`
        : res.finished ? 'Saved. You have read this text at the last stage, with no vowel marks and no transliteration.'
        : res.moved && unaided ? `Saved. Next time this text is at stage ${res.level}, ${stageOf(res.level).name}.`
        : res.moved ? `Saved. This text goes back to stage ${res.level}, ${stageOf(res.level).name}.`
        : 'Saved. Your stage for this text stays where it is.');
      draw();
    }
    draw();
  }

  // ---------- books ----------
  async function books() {
    const [shelf, rec] = await Promise.all([load(FILES.shelf), storeGet(ctx, 'books.v1', {})]);
    if (!alive) return;
    const rows = bookShelf(shelfOrder(shelf?.books || []), rec, st);
    const read = rows.filter((r) => r.readWithVowels);
    const item = (r) => el('li', { 'data-book': r.id }, el('a', { href: `#/bridge/book/${r.id}` }, `${r.titleTranslit}: ${r.titleEn}`),
      el('span', { class: 'muted' }, ` (${r.readWithVowels === 'finished' ? 'finished with vowels' : r.readWithVowels === 'started' ? 'started with vowels' : 'not read yet'}; ${r.done ? 'read at every stage' : `stage ${r.bridgeLevel}`})`));
    set(back('#/bridge', TITLE), el('h2', {}, 'Little Books Without Vowels'),
      el('p', {}, read.length ? `You have read ${read.length} of ${rows.length} books with vowels. They come first: read what you already know, now without the marks.` : 'You have not opened a book with vowels yet. Reading one first helps; any book works here.'),
      el('p', { class: 'muted' }, 'Each book keeps its own stage. The vowel marks are taken off the book’s own text; nothing is rewritten.'),
      el('ol', { class: 'br-books' }, ...rows.map(item)));
  }
  async function book(id) {
    const b = await load(bookFile(id)).catch(() => null);
    if (!alive) return;
    if (!b || !Array.isArray(b.pages)) { set(back('#/bridge/books', 'All books'), el('p', { role: 'alert' }, 'That book could not be found.')); return; }
    textPage({ id: bookTextId(b.id || id), title: b.titleEn, sub: b.titleTranslit, backHref: '#/bridge/books', backLabel: 'All books',
      lines: b.pages.filter((p) => p && p.he).map((p) => ({ he: p.he, translit: p.translit || '', en: p.en || '' })) });
  }

  // ---------- prayer lines ----------
  async function lineList() {
    const [reg, cards] = await Promise.all([load(FILES.registry), storeGet(ctx, CARDS_KEY, {})]);
    if (!alive) return;
    const rows = prayerLines(reg?.entries || [], cards);
    set(back('#/bridge', TITLE), el('h2', {}, 'Prayer Lines Without Vowels'),
      el('p', {}, 'Lines you have practiced in Fade-out recall come first, the most faded at the top.'),
      el('ol', {}, ...rows.map((r) => el('li', { 'data-line': r.id }, el('a', { href: `#/bridge/line/${r.id}` }, r.title), ' ', heText(showName(r.he)),
        el('span', { class: 'muted' }, ` (${r.fade != null ? `Fade-out stage ${r.fade}; ` : ''}${isDone(st, lineTextId(r.id)) ? 'read at every stage' : `stage ${levelOf(st, lineTextId(r.id))}`})`)))));
  }
  async function line(id) {
    const reg = await load(FILES.registry);
    if (!alive) return;
    const e = prayerLines(reg?.entries || [], {}).find((x) => x.id === id);
    if (!e) { set(back('#/bridge/lines', 'All prayer lines'), el('p', { role: 'alert' }, 'That line is not in the practice set.')); return; }
    let tl = ''; try { tl = transliterate(e.he, { scheme: 'siddur', tradition: tradition() }); } catch { tl = ''; }
    textPage({ id: lineTextId(e.id), title: e.title, sub: 'Transliteration made by the app’s spelling rules for your pronunciation setting.', backHref: '#/bridge/lines', backLabel: 'All prayer lines',
      fadeHref: `#/learn?fade=${encodeURIComponent(e.id)}`, lines: [{ he: e.he, translit: tl, en: e.english }] });
  }

  // ---------- word recognition ----------
  async function words() {
    const set0 = await load(FILES.readingSet);
    if (!alive) return;
    const pool = drillWords(set0);
    let round = 1, queue = [], idx = 0, qn = null, revealed = false, wrong = 0, done = false;
    const start = () => { queue = pickWords(pool, st, { size: 8, seed: round * 7919 + wordSummary(st).seen }); idx = 0; next(); };
    const next = () => { if (idx >= queue.length) return summary(); qn = wordQuestion(queue[idx], pool, round * 31 + idx); revealed = false; wrong = 0; done = false; draw(); };
    function draw() {
      const opts = qn.options.map((o) => btn(o.label, async (e) => {
        if (done) return;
        if (!o.correct) { wrong += 1; e?.target?.setAttribute?.('disabled', ''); say('Not that one. Try again.'); return; }
        done = true;
        const first = wrong === 0 && !revealed;
        st = recordWord(st, qn.id, first); await save();
        say(first ? 'Right, on the first try.' : 'Right. Saved as recognised with help.');
        if (alive) draw();
      }, { class: 'btn secondary', 'data-option': o.id }));
      set(back('#/bridge', TITLE), el('h2', {}, 'Word Recognition'),
        el('p', {}, `Word ${idx + 1} of ${queue.length}. What does it mean?`),
        el('p', { class: 'br-word' }, heText(done || revealed ? qn.pointed : qn.shown, 'alef-he br-big')),
        done ? el('p', {}, `Sounds like: ${qn.translit}.`) : revealed ? el('p', { class: 'muted' }, 'Vowel marks shown: this word will not count as a first-try recognition.')
          : btn('Show the vowelled form', () => { revealed = true; draw(); say('Vowel marks shown.'); }, { class: 'btn secondary', id: 'br-reveal' }),
        el('div', { class: 'br-opts', role: 'group', 'aria-label': 'Meanings' }, ...opts),
        done ? btn(idx + 1 < queue.length ? 'Next word' : 'Finish', () => { idx += 1; next(); }, { id: 'br-next' }) : null,
        el('p', { class: 'muted' }, 'First try means the right meaning on your first pick, without opening the vowelled form. Words come from the vowel-fade word set; words spelled like another common word without their marks are left out.'));
    }
    function summary() {
      const s = wordSummary(st);
      set(back('#/bridge', TITLE), el('h2', {}, 'Word Recognition'),
        el('p', {}, `Round done. All rounds so far: ${s.firstTry} of ${s.seen} words recognised on the first try${s.rate != null ? ` (${s.rate}%)` : ''}, across ${s.words} different words.`),
        btn('Another round', () => { round += 1; start(); }, { id: 'br-again' }));
    }
    if (!pool.length) { set(el('p', { role: 'alert' }, 'No words are available for this drill.')); return; }
    start();
  }

  // ---------- modern texts ----------
  async function modern() {
    const [signs, scenarios] = await Promise.all([load(FILES.signs), load(FILES.scenarios)]);
    if (!alive) return;
    const items = modernShelf({ signs, scenarios });
    let kind = q.kind === 'message' ? 'message' : 'sign', page = 0, open = null, showV = false, showT = false, showE = false, answered = false;
    const SIZE = 10;
    const list = () => items.filter((i) => i.kind === kind);
    function draw() {
      const all = list(), slice = all.slice(page * SIZE, page * SIZE + SIZE);
      const card = open ? el('div', { class: 'card br-modern-card', 'data-item': open.id },
        el('p', { class: 'br-modern' }, heText(showV ? open.pointed : open.shown, 'alef-he br-big')),
        showT ? el('p', { lang: 'en' }, open.translit) : null, showE ? el('p', { class: 'muted' }, open.en) : null,
        el('div', { class: 'row' },
          showV ? null : btn('Show vowel marks', () => { showV = true; draw(); }, { class: 'btn secondary' }),
          showT ? null : btn('Show transliteration', () => { showT = true; draw(); }, { class: 'btn secondary' }),
          showE ? null : btn('Show English', () => { showE = true; draw(); }, { class: 'btn secondary' })),
        answered ? null : el('div', { class: 'row' }, btn('I read it', () => grade(true)), btn('Not yet', () => grade(false), { class: 'btn secondary' })),
        open.spelling === 'marks-removed' ? el('p', { class: 'muted', role: 'note' }, SPELLING_NOTE) : el('p', { class: 'muted' }, 'Spelled as on the sign, from the Camera Translator’s sign list.')) : null;
      set(back('#/bridge', TITLE), el('h2', {}, 'Modern Texts Shelf'),
        el('p', {}, 'Short modern Hebrew with no vowel marks and no transliteration, the way it is printed in Israel. Help is one tap away.'),
        el('div', { class: 'row', role: 'group', 'aria-label': 'Shelf' },
          btn('Signs and menus', () => { kind = 'sign'; page = 0; open = null; draw(); }, { class: 'btn secondary', 'aria-pressed': String(kind === 'sign') }),
          btn('Messages', () => { kind = 'message'; page = 0; open = null; draw(); }, { class: 'btn secondary', 'aria-pressed': String(kind === 'message') })),
        card,
        el('ul', { class: 'br-modern-list' }, ...slice.map((it) => el('li', {}, btn(it.shown, () => { open = it; showV = showT = showE = answered = false; draw(); }, { class: 'btn secondary alef-he', dir: 'rtl', lang: 'he', 'data-id': it.id, 'aria-label': `Open text ${all.indexOf(it) + 1}` }),
          st.modern[it.id] ? el('span', { class: 'muted' }, ` read ${st.modern[it.id].seen}, ${st.modern[it.id].firstTry} without help`) : null))),
        el('div', { class: 'row' }, page > 0 ? btn('Previous', () => { page -= 1; draw(); }, { class: 'btn secondary' }) : null,
          (page + 1) * SIZE < all.length ? btn('More', () => { page += 1; draw(); }, { class: 'btn secondary' }) : null,
          el('span', { class: 'muted' }, `${all.length ? page * SIZE + 1 : 0} to ${Math.min(all.length, (page + 1) * SIZE)} of ${all.length}`)),
        el('p', { class: 'muted' }, 'Sources: the Camera Translator’s sign and menu list and the Israel track’s conversation scenarios. Neither has been checked by a native speaker.'));
    }
    async function grade(read) {
      if (answered || !open) return; answered = true;
      const unaided = read && !showV && !showT && !showE;
      st = recordModern(st, open.id, unaided); await save();
      say(unaided ? 'Saved: read without help.' : read ? 'Saved as read with help.' : 'Saved. Try it again later.');
      if (alive) draw();
    }
    draw();
  }

  (async () => {
    try {
      st = normalizeState(await storeGet(ctx, STORE_KEY, null));
      if (!alive) return;
      const id = String(q.id || '');
      if (sec === 'books') await books();
      else if (sec === 'book' && id) await book(id);
      else if (sec === 'lines') await lineList();
      else if (sec === 'line' && id) await line(id);
      else if (sec === 'words') await words();
      else if (sec === 'modern') await modern();
      else hub();
    } catch { if (alive) failed(); }
  })();
  return () => { alive = false; wrap.remove?.(); };
}

export { FIRST_BRIDGE };
