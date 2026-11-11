/**
 * Word Sprint (#/sprint): a 5-minute vocabulary session with a destination (a prayer line or an Israel scenario, or just the
 * most common words). Words come from the 5,000-word list (a machine-built DRAFT, proofread:false; the screen says so) and every
 * answer goes to the vocab SRS cards (store key "srs.vocab", scheduler src/curriculum/srs.js). Wrong answers are never punished:
 * the answer is shown kindly and the word comes back later.
 * Timer: local, pauses while the page is hidden. Time running out never cuts a question in half: the current one is finished first.
 * ctx extras for tests: ctx.clock {now,setInterval,clearInterval}, ctx.rng, ctx.sprintData {entries,registry,scenarios}.
 */
import { plain } from '../shell/plain-copy.js';
import { el, heText, storeGet, storeSet } from '../curriculum/dom.js';
import { transliterate } from '../pronunciation/transliterate.js';
import { ATTRIBUTION } from '../vocab/vocab.view.js';
import { count } from '../shell/plural.js';
import { uiEnglish } from '../shell/names.js';
import { calmOn } from '../shell/comfort.js';
import { untimedOn } from '../shell/motor.js';
/** No countdown and no time limit: calm mode, or Settings > "No time limits". */
const noClock = (ctx) => calmOn(ctx) || untimedOn(ctx);
import { loadAllVocab, loadRegistry, loadScenarios } from './loader.js';
import { VOCAB_CARDS_KEY, LAST_KEY, TOP, buildIndex, buildDestinations, buildQueue, buildQuestion, applyAnswer, knownCount, isKnown, cardId, createTimer, clockText } from './model.js';
import { isAudioFree } from '../shell/audiofree.js';
import { audioButton } from '../shell/audio-access.js';

export const UNVERIFIED = 'Unverified vocabulary: the word list was built by a program from Wiktionary and subtitle counts. No Hebrew teacher has checked it, so a gloss or vowel point may be wrong.';
const TRAD = { israeli: 1, sephardi: 1, ashkenazi: 1 };
const CSS = `
.alef-sprint{max-inline-size:36rem;margin-inline:auto;overflow-wrap:anywhere}
.alef-sprint *{box-sizing:border-box;max-inline-size:100%}
.alef-sprint select{inline-size:100%;min-block-size:var(--tap,48px);font:inherit;padding:.4rem .6rem;border:2px solid var(--border,#999);border-radius:8px;background:var(--card,#fff);color:inherit}
.alef-sprint label{display:block;font-weight:600;margin-block:.75rem .25rem}
.alef-sprint .sp-timer{font-weight:700;font-size:1.25rem}
.alef-sprint .sp-he{font-size:2.6rem;line-height:1.35;text-align:center;margin-block:.5rem}
.alef-sprint .sp-opts{display:grid;gap:.5rem;margin-block:.75rem}
.alef-sprint button.btn{min-block-size:var(--tap,48px);inline-size:100%;white-space:normal;text-align:center}
.alef-sprint .sp-row{display:grid;gap:.5rem;margin-block:.75rem}
.alef-sprint .sp-ok{border-inline-start:6px solid currentColor;padding-inline-start:.5rem}
.alef-sprint .sp-list{list-style:none;margin:0;padding:0;display:grid;gap:.4rem}
.alef-sprint footer{margin-block-start:1.5rem;font-size:.85rem;color:var(--muted,#555)}
`;
function injectStyle() {
  try { if (!document.head || document.getElementById?.('alef-sprint-style')) return; const s = document.createElement('style'); s.id = 'alef-sprint-style'; s.textContent = CSS; document.head.append(s); } catch { /* optional */ }
}
const focusNode = (n) => { try { n?.focus?.(); } catch { /* ignore */ } };

/** @param {HTMLElement} root @param {any} ctx @returns {() => void} unmount */
export function mount(root, ctx) {
  injectStyle();
  const clock = ctx?.clock || { now: () => Date.now(), setInterval: (f, ms) => globalThis.setInterval(f, ms), clearInterval: (h) => globalThis.clearInterval(h) };
  const rng = ctx?.rng || Math.random;
  const tradition = () => { const c = ctx?.settings?.get?.('congregation'); return TRAD[c] ? c : 'sephardi'; };
  const translit = (e) => { if (!e.pointed) return ''; try { return transliterate(e.pointed, { scheme: 'siddur', tradition: tradition() }); } catch { return ''; } };

  const wrap = el('section', { class: 'alef-sprint', 'aria-labelledby': 'view-title' });
  const h1 = el('h1', { id: 'view-title', tabindex: '-1' }, 'Word Sprint');
  const body = el('div', { class: 'sp-body' });
  const status = el('div', { class: 'sp-status', role: 'status', 'aria-live': 'polite' });
  const footer = el('footer', {}, el('p', {}, ATTRIBUTION));
  wrap.append(h1, body, status, footer);
  root.append(wrap);

  let alive = true, data = null, cards = {}, chosenId = ctx?.query?.dest || TOP;
  let timer = null, tick = null, queue = [], qi = 0, results = [], timeUp = false, answered = false, dest = null, knownBefore = 0;
  const say = (t) => { status.textContent = t; };
  const setBody = (...n) => { body.replaceChildren(...n.filter(Boolean)); };
  const stopTick = () => { if (tick != null) { clock.clearInterval(tick); tick = null; } };
  const onVis = () => {
    if (!timer || !alive) return;
    if (document.hidden) timer.pause(clock.now()); else timer.resume(clock.now());
  };
  try { document.addEventListener?.('visibilitychange', onVis); } catch { /* ignore */ }

  async function init() {
    setBody(el('p', {}, 'Loading words...'));
    try {
      const d = ctx?.sprintData;
      const [entries, registry, scenarios] = d ? [d.entries, d.registry, d.scenarios] : await Promise.all([loadAllVocab(ctx?.vocabLoader?.loadTier), loadRegistry(), loadScenarios()]);
      const index = buildIndex(entries);
      data = { entries, index, dests: buildDestinations(index, registry, scenarios) };
      const c = await storeGet(ctx, VOCAB_CARDS_KEY, {});
      cards = Array.isArray(c) ? Object.fromEntries(c.filter((x) => x?.id).map((x) => [x.id, x])) : (c || {});
    } catch (err) {
      if (alive) setBody(el('p', { role: 'alert' }, 'The word list could not be loaded. Check your connection and reload; nothing was lost.'));
      return;
    }
    if (alive) renderStart();
  }

  function renderStart() {
    stopTick(); timer = null;
    const sel = el('select', { id: 'sprint-dest', name: 'dest' });
    const opt = (v, label) => el('option', { value: v, selected: v === chosenId }, label);
    const grp = (label, kind) => el('optgroup', { label }, data.dests.filter((d) => d.kind === kind).map((d) => opt(d.id, `${d.title} (${count(d.words.length, 'word')})`)));
    sel.append(opt(TOP, 'No destination: the most common words'), grp('Prayer lines', 'prayer'), grp('Israel scenarios', 'israel'));
    if (!data.dests.some((d) => d.id === chosenId)) chosenId = TOP;
    sel.value = chosenId;
    sel.addEventListener('change', (e) => { chosenId = e.target.value; });
    setBody(
      el('p', {}, noClock(ctx) ? 'Short word cards, with no timer. Pick where you are heading. Press Finish now whenever you want to stop.' : 'Five minutes of short word cards. Pick where you are heading and the sprint chooses words from it first, mixed with the most common words.'),
      el('p', { class: 'draft-flag', role: 'note' }, UNVERIFIED),
      el('label', { for: 'sprint-dest' }, 'Destination'),
      sel,
      el('p', { class: 'muted' }, plain('sprintNote')),
      el('div', { class: 'sp-row' }, el('button', { type: 'button', class: 'btn', id: 'sprint-start', onclick: start }, noClock(ctx) ? 'Start' : 'Start 5 minutes')),
    );
    say('');
    focusNode(h1);
  }

  function start() {
    dest = data.dests.find((d) => d.id === chosenId) || null;
    const now = clock.now();
    queue = buildQueue({ entries: data.entries, cards, dest, now });
    knownBefore = dest ? knownCount(dest.words, cards) : 0;
    results = []; qi = 0; timeUp = false; answered = false;
    timer = noClock(ctx) ? createTimer(Infinity) : createTimer(); timer.start(now); // calm mode: no time limit and no countdown
    if (document.hidden) timer.pause(now);
    tick = clock.setInterval(onTick, 1000);
    if (!queue.length) return end();
    question();
  }

  const timerText = () => `Time left ${clockText(timer.remaining(clock.now()))}`;
  let timerNode = null, nextBtn = null;
  function onTick() {
    if (!alive || !timer || !timerNode) return;
    timerNode.textContent = timerText();
    if (timer.done(clock.now()) && !timeUp) {
      timeUp = true; stopTick();
      if (answered) { if (nextBtn) nextBtn.textContent = 'See my results'; say('Time is up. That was your last word.'); }
      else say('Time is up. Finish this last word and your sprint is done.');
    }
  }

  function question() {
    answered = false;
    const entry = queue[qi];
    const q = buildQuestion({ entry, entries: data.entries, card: cards[cardId(entry)], translit, rng });
    timerNode = noClock(ctx) ? null : el('p', { class: 'sp-timer' }, timerText());
    const finish = el('button', { type: 'button', class: 'btn secondary', id: 'sprint-finish', onclick: () => end() }, 'Finish now');
    const hear = q.type === 'hear-meaning';
    const prompt = { 'hear-meaning': 'What does this word mean?', 'pick-sound': 'How is this word pronounced? (approximate spelling in Latin letters)', 'point-to-english': isAudioFree(ctx) ? 'Look at the word and read it in the way you read, then check the meaning.' : 'Look at the word, say it if you can, then check the meaning.' }[q.type];
    const heNode = el('div', { class: 'sp-he' }, heText(entry.pointed));
    let audioNode = null;
    if (hear && !isAudioFree(ctx)) {
      audioNode = audioButton(el, ctx, { kind: 'word', id: entry.id, text: String(entry.pointed || '').replace(/־/g, ' '), label: 'Listen' });
    }
    const area = el('div', { class: 'sp-opts', role: 'group', 'aria-label': 'Answers' });
    const next = el('button', { type: 'button', class: 'btn', id: 'sprint-next', onclick: advance }, 'Next word');
    const nextRow = el('div', { class: 'sp-row' });
    nextBtn = next;

    const settle = (correct, shown) => {
      if (answered) return; answered = true;
      cards = applyAnswer(cards, entry, correct, clock.now());
      storeSet(ctx, VOCAB_CARDS_KEY, cards);
      results.push({ entry, correct });
      for (const b of area.children) b.setAttribute?.('disabled', '');
      say(correct ? `Right. ${shown}` : `Not yet. ${shown} We will bring it back later.`);
      nextRow.append(next);
      if (timer.done(clock.now()) && !timeUp) timeUp = true;
      if (timeUp) next.textContent = 'See my results';
      focusNode(next);
    };

    if (q.type === 'point-to-english') {
      const reveal = el('button', { type: 'button', class: 'btn', id: 'sprint-reveal', onclick: () => {
        reveal.remove?.();
        area.replaceChildren(
          el('p', {}, el('strong', {}, uiEnglish(ctx, entry.gloss))),
          el('button', { type: 'button', class: 'btn', id: 'sprint-knew', onclick: () => settle(true, `${uiEnglish(ctx, entry.gloss)}.`) }, 'I knew it'),
          el('button', { type: 'button', class: 'btn secondary', id: 'sprint-notyet', onclick: () => settle(false, `${uiEnglish(ctx, entry.gloss)}.`) }, 'Not yet'));
        focusNode(area.children[1]);
      } }, 'Show meaning');
      area.replaceChildren(reveal);
    } else {
      for (const o of q.options) {
        area.append(el('button', { type: 'button', class: 'btn secondary', 'data-id': o.id, onclick: (ev) => {
          const ok = o.id === entry.id;
          settle(ok, ok ? `${q.answer}.` : `This one is ${q.type === 'pick-sound' ? q.answer : `"${q.answer}"`}.`);
        } }, o.label));
      }
    }
    setBody(timerNode, finish, el('h2', { tabindex: '-1', id: 'sprint-q' }, prompt), heNode, audioNode, area, nextRow);
    focusNode(body.querySelector?.('#sprint-q'));
  }

  function advance() {
    if (timeUp || qi + 1 >= queue.length) return end();
    qi++; say(''); question();
  }

  async function end() {
    stopTick(); timer?.pause(clock.now()); timer = null; timerNode = null; nextBtn = null;
    const right = results.filter((r) => r.correct).length;
    const kids = [];
    kids.push(el('h2', {}, results.length ? 'Sprint done' : 'No words this time'));
    if (results.length) kids.push(el('p', {}, `You met ${count(results.length, 'word')} and got ${right} of them right. Every answer is saved in your vocabulary reviews.`));
    else kids.push(el('p', {}, 'Nothing was answered, so nothing changed.'));
    let destLine = '';
    if (dest) {
      const now = knownCount(dest.words, cards), gained = now - knownBefore;
      destLine = `Toward "${dest.title}": you have now answered ${now} of ${dest.words.length} recognised words correctly${gained > 0 ? ` (${gained} new this sprint)` : ''}. The line has ${dest.total} words; our list recognised ${dest.matchedTokens} of them. This counts correct answers in sprints, not mastery.`;
      kids.push(el('p', { class: 'sp-ok', id: 'sprint-dest-progress' }, destLine));
      const learned = dest.words.filter((e) => isKnown(cards[cardId(e)]));
      if (learned.length) kids.push(el('ul', { class: 'sp-list', 'aria-label': 'Words you have answered correctly' }, learned.map((e) => el('li', {}, heText(e.pointed, 'alef-he'), ` ${e.gloss}`))));
      kids.push(dest.readId
        ? el('p', {}, el('a', { href: `#/read/${dest.readId}` }, 'Read this line aloud'))
        : el('p', {}, el('a', { href: '#/israel' }, 'Practice this scenario')));
    } else if (results.length) kids.push(el('p', {}, 'Pick a destination next time to aim the words at a prayer line or an Israel scenario.'));
    kids.push(el('div', { class: 'sp-row' },
      el('button', { type: 'button', class: 'btn', id: 'sprint-again', onclick: () => renderStart() }, 'Another sprint'),
      el('a', { class: 'btn secondary', href: '#/vocab' }, 'See my vocabulary')));
    setBody(...kids);
    say(results.length ? `Sprint done. ${right} of ${results.length} right.${destLine ? ' ' + destLine : ''}` : 'Sprint done. No words answered.');
    focusNode(h1);
    if (results.length) await storeSet(ctx, LAST_KEY, { at: clock.now(), answered: results.length, correct: right, dest: dest ? dest.id : null });
  }

  init();
  return () => { alive = false; stopTick(); try { document.removeEventListener?.('visibilitychange', onVis); } catch { /* ignore */ } };
}
