/**
 * Say it (#/speak): spoken practice. DRAFT, unreviewed. Three screens in one module (query `tab`):
 *   say     - show a word or phrase from the vocabulary list, play the model (clip if one exists, else the browser voice),
 *             then capture the learner's attempt: browser SpeechRecognition (he-IL) where it exists, else record-and-listen-back
 *             (MediaRecorder), else a plain "I said it / Not yet".
 *   drills  - minimal-pair listening (bet/vet, het/khaf, kamatz a/o, shin/sin) built from existing words.
 *   history - scoring history and a weakest-sounds report.
 * Hebrew comes only from data/speak/ (built from data/vocab/words.json); nothing here invents Hebrew.
 * The browser recognizer is UNVERIFIED for Hebrew: ALEF has not measured it; its verdicts are hints. Nothing is uploaded by
 * ALEF; the browser's own recognizer may send audio to its vendor, and the screen says so before the first use.
 * Module pattern: mount(root, ctx) -> unmount. Store key speak.v1. ctx extras for tests: ctx.clock {now}, ctx.rng,
 * ctx.speak {data:{sets, setItems, pairs}, RecognitionCtor, MediaRecorderCtor, getUserMedia, synth, UtteranceCtor, caps}.
 */
import { el, heText, storeGet, storeSet } from '../curriculum/dom.js';
import { count } from '../shell/plural.js';
import { loadSetsIndex, loadSet, loadPairs } from './loader.js';
import { STORE_KEY, MODES, capabilities, pickMode, compare, usableItems, coerceState, recordAttempt, setSummary, soundReport, historyRows, dailyTotals } from './model.js';
import { createRecognizer, createRecorder, createSpeaker } from './recognizer.js';
import { contrastById, drillQueue, drillQuestion } from './pairs.js';

export const DRAFT = 'Draft, not yet reviewed: the words, their vowel points and transliterations were built by a program from the vocabulary list and no Hebrew teacher has checked them.';
export const RECOGNIZER_NOTE = 'The speech check uses your browser\'s own recognizer set to Hebrew (he-IL). ALEF has not verified how well it hears Hebrew, so treat its verdict as a hint, not a grade. Your browser may send the audio to its maker\'s servers to do the recognition; ALEF itself sends nothing anywhere.';
export const RECORD_NOTE = 'Recordings stay in this page\'s memory and are discarded when you leave; nothing is uploaded.';
const MODE_LABEL = { asr: 'Let the browser listen and compare (speech recognition)', record: 'Record me and play it back; I judge it', self: 'No microphone: I just say whether I said it' };
const CSS = `
.alef-speak{max-inline-size:36rem;margin-inline:auto;overflow-wrap:anywhere}
.alef-speak *{box-sizing:border-box;max-inline-size:100%}
.alef-speak select{inline-size:100%;min-block-size:var(--tap,48px);font:inherit;padding:.4rem .6rem;border:2px solid var(--border,#999);border-radius:8px;background:var(--card,#fff);color:inherit}
.alef-speak label{display:block;font-weight:600;margin-block:.75rem .25rem}
.alef-speak fieldset{border:2px solid var(--border,#999);border-radius:8px;padding:.5rem .75rem;margin-block:.75rem}
.alef-speak fieldset label{display:flex;gap:.5rem;align-items:flex-start;font-weight:400;margin-block:.35rem}
.alef-speak fieldset input{inline-size:1.25rem;block-size:1.25rem;flex:none;margin-block-start:.15rem}
.alef-speak .sk-he{font-size:2.6rem;line-height:1.35;text-align:center;margin-block:.5rem}
.alef-speak .sk-he .mark{text-decoration:underline double;text-underline-offset:.2em;font-weight:700}
.alef-speak .sk-sub{text-align:center;margin-block:.25rem}
.alef-speak .sk-row{display:grid;gap:.5rem;margin-block:.75rem}
.alef-speak .sk-opts{display:grid;gap:.5rem;margin-block:.75rem}
.alef-speak button.btn{min-block-size:var(--tap,48px);inline-size:100%;white-space:normal;text-align:center}
.alef-speak .sk-verdict{border-inline-start:6px solid currentColor;padding-inline-start:.5rem;margin-block:.75rem}
.alef-speak .sk-tabs{display:flex;flex-wrap:wrap;gap:.5rem;margin-block:.5rem 1rem;padding:0;list-style:none}
.alef-speak .sk-tabs a{display:inline-flex;align-items:center;min-block-size:var(--tap,48px);padding:.25rem .9rem;border-radius:999px;border:2px solid var(--accent,#246);text-decoration:none;color:inherit}
.alef-speak .sk-tabs a[aria-current="page"]{background:var(--accent,#246);color:var(--accent-fg,#fff)}
.alef-speak table{border-collapse:collapse;inline-size:100%;margin-block:.5rem}
.alef-speak th,.alef-speak td{text-align:start;padding:.3rem .4rem;border-block-end:1px solid var(--border,#999)}
.alef-speak .sk-list{list-style:none;margin:0;padding:0;display:grid;gap:.4rem}
.alef-speak audio{inline-size:100%}
.alef-speak footer{margin-block-start:1.5rem;font-size:.85rem;color:var(--muted,#555)}
`;
function injectStyle() {
  try { if (!document.head || document.getElementById?.('alef-speak-style')) return; const s = document.createElement('style'); s.id = 'alef-speak-style'; s.textContent = CSS; document.head.append(s); } catch { /* optional */ }
}
const focusNode = (n) => { try { n?.focus?.(); } catch { /* ignore */ } };
const ERRORS = {
  'not-allowed': 'The microphone was not allowed. You can allow it in the browser\'s site settings, or switch to "No microphone" below.',
  'audio-capture': 'No microphone could be opened.',
  'no-speech': 'Nothing was heard. Try again a little louder, or closer to the microphone.',
  network: 'The browser\'s recognizer needs a network connection and could not reach it.',
  timeout: 'The recognizer gave no answer in time.',
  aborted: 'Listening was stopped.',
  unsupported: 'This browser cannot do that.',
  'service-not-allowed': 'The browser\'s recognition service is not allowed here.',
  'language-not-supported': 'This browser\'s recognizer does not offer Hebrew.',
};
const errorText = (e) => ERRORS[e] || `The browser reported: ${e}.`;

/** @param {HTMLElement} root @param {any} ctx @returns {() => void} unmount */
export function mount(root, ctx) {
  injectStyle();
  const clock = ctx?.clock || { now: () => Date.now() };
  const rng = ctx?.rng || Math.random;
  const inj = ctx?.speak || {};
  const g = /** @type {any} */ (globalThis);
  const caps = inj.caps || capabilities(inj.RecognitionCtor !== undefined || inj.MediaRecorderCtor !== undefined ? {
    SpeechRecognition: inj.RecognitionCtor, MediaRecorder: inj.MediaRecorderCtor, navigator: inj.getUserMedia ? { mediaDevices: { getUserMedia: inj.getUserMedia } } : g.navigator,
    speechSynthesis: inj.synth !== undefined ? inj.synth : g.speechSynthesis, SpeechSynthesisUtterance: inj.UtteranceCtor !== undefined ? inj.UtteranceCtor : g.SpeechSynthesisUtterance, isSecureContext: true,
  } : g);
  const recognizer = createRecognizer({ Ctor: inj.RecognitionCtor, setTimeout: inj.setTimeout, clearTimeout: inj.clearTimeout });
  const recorder = createRecorder({ MediaRecorderCtor: inj.MediaRecorderCtor, getUserMedia: inj.getUserMedia, URL: inj.URL, BlobCtor: inj.BlobCtor, now: clock.now, setTimeout: inj.setTimeout, clearTimeout: inj.clearTimeout });
  const speaker = createSpeaker({ synth: inj.synth, UtteranceCtor: inj.UtteranceCtor });
  const audioHas = (kind, id) => { try { return !!id && !!ctx?.audio?.has?.(kind, id); } catch { return false; } };

  const wrap = el('section', { class: 'alef-speak', 'aria-labelledby': 'view-title' });
  const h1 = el('h1', { id: 'view-title', tabindex: '-1' }, 'Say it');
  const tabs = el('ul', { class: 'sk-tabs', 'aria-label': 'Say it sections' });
  const body = el('div', { class: 'sk-body' });
  const status = el('div', { class: 'sk-status', role: 'status', 'aria-live': 'polite' });
  const footer = el('footer', {}, el('p', {}, 'Vocabulary: data/vocab/words.json (Wiktionary, CC BY-SA 4.0, and ALEF\'s own phrasebook), a machine-built draft. Speech recognition and the fallback voice are your browser\'s; neither is verified for Hebrew by ALEF.'));
  wrap.append(h1, tabs, body, status, footer);
  root.append(wrap);

  let alive = true, state = coerceState(null), index = [], pairs = null, tab = ['say', 'drills', 'history'].includes(ctx?.query?.tab) ? ctx.query.tab : 'say';
  let chosenSet = ctx?.query?.set || null, mode = 'auto', chosenContrast = ctx?.query?.contrast || 'bet-vet';
  let set = null, items = [], qi = 0, results = [], busy = false;
  const say = (t) => { status.textContent = t; };
  const setBody = (...n) => { body.replaceChildren(...n.filter(Boolean)); };
  const save = () => storeSet(ctx, STORE_KEY, state);
  const record = (a) => { state = recordAttempt(state, a, clock.now()); return save(); };

  function renderTabs() {
    tabs.replaceChildren(...[['say', 'Say it'], ['drills', 'Listening drills'], ['history', 'History']].map(([id, label]) =>
      el('li', {}, el('a', { href: `#/speak${id === 'say' ? '' : `?tab=${id}`}`, 'aria-current': tab === id ? 'page' : null, 'data-tab': id, onclick: (e) => { e.preventDefault?.(); go(id); } }, label))));
  }
  function go(id) { if (!alive) return; tab = id; renderTabs(); say(''); if (id === 'say') renderStart(); else if (id === 'drills') renderDrillStart(); else renderHistory(); }

  async function init() {
    setBody(el('p', {}, 'Loading...'));
    try {
      const d = inj.data;
      index = d?.sets || await loadSetsIndex();
      state = coerceState(await storeGet(ctx, STORE_KEY, null));
      mode = state.mode || 'auto';
      if (!chosenSet) chosenSet = state.lastSet && index.some((s) => s.id === state.lastSet) ? state.lastSet : (index[0]?.id || null);
    } catch {
      if (alive) setBody(el('p', { role: 'alert' }, 'The practice sets could not be loaded. Check your connection and reload; nothing was lost.'));
      return;
    }
    if (alive) go(tab);
  }

  // ---- Say it ---------------------------------------------------------------------------------------------------------
  function capsText() {
    const parts = [];
    parts.push(caps.recognition ? 'Speech recognition: offered by this browser (Hebrew support unverified).' : 'Speech recognition: not available in this browser, so the check is by ear.');
    parts.push(caps.recording ? 'Recording: available.' : 'Recording: not available here.');
    parts.push(caps.synthesis ? (caps.hebrewVoice === false ? 'Model voice: this browser lists no Hebrew voice, so "Listen" may stay silent or read with a wrong accent.' : 'Model voice: no recorded clips exist yet, so "Listen" uses the browser\'s voice.') : 'Model voice: this browser has no speech synthesis; "Listen" will do nothing until clips are recorded.');
    return parts.join(' ');
  }
  function renderStart() {
    const sel = el('select', { id: 'speak-set', name: 'set' });
    const opt = (v, label) => el('option', { value: v, selected: v === chosenSet }, label);
    const groups = new Map();
    for (const s of index) { const k = s.pack?.startsWith('survival-') ? 'Survival phrases' : `Level ${s.level}`; (groups.get(k) || groups.set(k, []).get(k)).push(s); }
    for (const [label, list] of groups) sel.append(el('optgroup', { label }, list.map((s) => opt(s.id, `${s.title} (${count(s.size, 'item')})`))));
    if (!index.some((s) => s.id === chosenSet)) chosenSet = index[0]?.id || null;
    sel.value = chosenSet;
    sel.addEventListener('change', (e) => { chosenSet = e.target.value; });
    const fs = el('fieldset', {}, el('legend', {}, 'How to check what you said'));
    const ok = { asr: caps.recognition, record: caps.recording, self: true };
    const current = pickMode(caps, mode);
    for (const m of MODES) {
      const input = el('input', { type: 'radio', name: 'speak-mode', id: `speak-mode-${m}`, value: m, checked: current === m, disabled: !ok[m] });
      input.addEventListener('change', () => { mode = m; state = { ...state, mode }; save(); });
      fs.append(el('label', { for: `speak-mode-${m}` }, input, el('span', {}, MODE_LABEL[m] + (ok[m] ? '' : ' (not available in this browser)'))));
    }
    setBody(
      el('p', {}, 'Hear a word, say it out loud, then check. Twelve words or phrases a set.'),
      el('p', { class: 'draft-flag', role: 'note' }, DRAFT),
      el('p', { class: 'muted', id: 'speak-caps' }, capsText()),
      el('label', { for: 'speak-set' }, 'Set'),
      sel,
      fs,
      el('p', { class: 'muted' }, caps.recognition ? RECOGNIZER_NOTE : 'With no recognizer, you judge yourself: listen, say it, and be honest. That is still good practice.'),
      caps.recording ? el('p', { class: 'muted' }, RECORD_NOTE) : null,
      el('div', { class: 'sk-row' }, el('button', { type: 'button', class: 'btn', id: 'speak-start', onclick: start }, 'Start')),
    );
    say('');
    focusNode(h1);
  }

  async function start() {
    const meta = index.find((s) => s.id === chosenSet);
    if (!meta) return;
    setBody(el('p', {}, 'Loading the set...'));
    try { set = inj.data?.setItems?.[meta.id] || await loadSet(meta.id); } catch { if (alive) setBody(el('p', { role: 'alert' }, 'That set could not be loaded. Try another one.'), el('div', { class: 'sk-row' }, el('button', { type: 'button', class: 'btn', onclick: renderStart }, 'Back'))); return; }
    if (!alive) return;
    items = usableItems(set.items); qi = 0; results = [];
    state = { ...state, lastSet: meta.id }; save();
    if (!items.length) return end();
    question();
  }

  async function playModel(he, audioId, btn) {
    if (busy) return; busy = true; if (btn) btn.setAttribute('disabled', '');
    try {
      if (audioId && audioHas('word', audioId)) { const r = await ctx.audio.play('word', audioId); say(r?.source === 'file' ? 'Played a recorded clip.' : 'Played the browser\'s voice, not a recording.'); }
      else if (speaker.supported) { const r = await speaker.speak(he, { rate: ctx?.settings?.get?.('ttsRate') }); say(r.ok ? 'Played the browser\'s voice, not a recording; its Hebrew is unverified.' : `No sound: ${errorText(r.error)}`); }
      else say('No sound: this browser has no speech synthesis and no clip exists for this item yet.');
    } catch { say('The audio could not play.'); }
    busy = false; if (btn) btn.removeAttribute?.('disabled');
  }

  function question() {
    const item = items[qi], m = pickMode(caps, mode);
    const n = qi + 1;
    const listen = el('button', { type: 'button', class: 'btn secondary', id: 'speak-listen', 'aria-label': `Listen to the model pronunciation of ${item.translit || 'this item'}`, onclick: () => playModel(item.he, item.audioId, listen) }, 'Listen');
    const area = el('div', { class: 'sk-opts', role: 'group', 'aria-label': 'Your attempt' });
    const verdict = el('div', { class: 'sk-verdict', id: 'speak-verdict', hidden: true });
    const nextRow = el('div', { class: 'sk-row' });
    const next = el('button', { type: 'button', class: 'btn', id: 'speak-next', onclick: advance }, n >= items.length ? 'See my results' : 'Next');
    const skip = el('button', { type: 'button', class: 'btn secondary', id: 'speak-skip', onclick: () => settle({ outcome: 'skip' }) }, 'Skip this one');
    let settled = false;
    const attemptButtons = [skip];
    const settle = async (r) => {
      if (settled) return; settled = true;
      const i = results.findIndex((x) => x.item === item);
      if (i >= 0) results[i] = { item, ...r }; else results.push({ item, ...r });
      for (const b of attemptButtons) b.setAttribute?.('disabled', '');
      await record({ kind: 'say', set: set.id, itemId: item.id, he: item.he, mode: m, outcome: r.outcome, score: r.score, heard: r.heard });
      nextRow.replaceChildren(next);
      focusNode(next);
    };
    const showVerdict = (text, extra) => { verdict.hidden = false; verdict.removeAttribute?.('hidden'); verdict.replaceChildren(el('p', {}, el('strong', {}, text)), extra || ''); say(text); };
    const selfButtons = (prefix = '') => {
      const bs = [
        el('button', { type: 'button', class: 'btn', id: 'speak-said', onclick: () => { showVerdict(`${prefix}Marked as said.`); settle({ outcome: 'said' }); } }, 'I said it'),
        el('button', { type: 'button', class: 'btn secondary', id: 'speak-notyet', onclick: () => { showVerdict(`${prefix}Marked as not yet; it will come round again.`); settle({ outcome: 'notyet' }); } }, 'Not yet'),
      ];
      attemptButtons.push(...bs);
      return bs;
    };
    if (m === 'asr') {
      const mic = el('button', { type: 'button', class: 'btn', id: 'speak-mic', onclick: async () => {
        if (recognizer.listening) return;
        mic.setAttribute('disabled', ''); mic.textContent = 'Listening... say it now';
        say('Listening. Say it now.');
        const r = await recognizer.listen();
        if (!alive) return;
        mic.removeAttribute?.('disabled'); mic.textContent = 'Say it again (microphone)';
        if (!r.ok) {
          showVerdict(errorText(r.error), r.error === 'not-allowed' || r.error === 'unsupported' || r.error === 'language-not-supported' || r.error === 'service-not-allowed' ? el('div', { class: 'sk-opts' }, el('p', {}, 'Judge it yourself instead:'), ...selfButtons()) : null);
          return;
        }
        const c = compare(item.he, r.alternatives);
        const heardNode = el('p', {}, 'The recognizer wrote: ', heText(c.heard));
        const text = c.outcome === 'match' ? 'That matched the target.' : c.outcome === 'close' ? `Close: ${Math.round(c.score * 100)}% of the letters matched.` : 'That did not match. Listen once more and try again, or judge it yourself.';
        showVerdict(text, el('div', {}, heardNode, el('p', { class: 'muted' }, 'A hint from the browser\'s recognizer, which is unverified for Hebrew.'), c.outcome === 'match' ? null : el('div', { class: 'sk-opts' }, ...selfButtons('You decided: '))));
        if (c.outcome === 'match') settle({ outcome: 'match', score: c.score, heard: c.heard });
        else { // keep the best attempt; the learner may try again or self-judge
          const prev = results.find((x) => x.item === item);
          if (!prev) { results.push({ item, outcome: c.outcome, score: c.score, heard: c.heard, provisional: true }); }
          await record({ kind: 'say', set: set.id, itemId: item.id, he: item.he, mode: m, outcome: c.outcome, score: c.score, heard: c.heard });
          nextRow.replaceChildren(next);
        }
      } }, 'Say it (microphone)');
      attemptButtons.push(mic); area.append(mic);
    } else if (m === 'record') {
      let player = null;
      const rec = el('button', { type: 'button', class: 'btn', id: 'speak-record', onclick: async () => {
        if (!recorder.recording) {
          const r = await recorder.start();
          if (!alive) return;
          if (!r.ok) { showVerdict(errorText(r.error), el('div', { class: 'sk-opts' }, el('p', {}, 'Judge it yourself instead:'), ...selfButtons())); return; }
          rec.textContent = 'Stop recording'; say('Recording. Say it now, then press Stop.');
        } else {
          const r = await recorder.stop();
          if (!alive) return;
          rec.textContent = 'Record again';
          if (!r.ok) { showVerdict(errorText(r.error)); return; }
          if (player) player.remove?.();
          player = el('audio', { controls: true, src: r.url, 'aria-label': 'Your recording' });
          showVerdict(`Recorded ${Math.round(r.ms / 100) / 10} seconds. Play it back, then decide.`, el('div', {}, player, el('div', { class: 'sk-opts' }, ...selfButtons())));
        }
      } }, 'Record');
      attemptButtons.push(rec); area.append(rec);
    } else {
      area.append(...selfButtons());
    }
    setBody(
      el('p', { class: 'muted' }, `${set.title}: ${n} of ${items.length}`),
      el('h2', { tabindex: '-1', id: 'speak-q' }, m === 'self' ? 'Listen, then say it out loud' : 'Listen, then say it'),
      el('div', { class: 'sk-he' }, heText(item.he)),
      el('p', { class: 'sk-sub' }, el('span', { lang: 'he-Latn' }, item.translit || ''), item.translit ? ' - ' : '', item.en),
      el('div', { class: 'sk-row' }, listen),
      area, verdict, nextRow,
      el('div', { class: 'sk-row' }, skip, el('button', { type: 'button', class: 'btn secondary', id: 'speak-finish', onclick: () => end() }, 'Finish now')),
    );
    say('');
    focusNode(body.querySelector?.('#speak-q'));
  }

  function advance() { recognizer.stop(); if (qi + 1 >= items.length) return end(); qi++; question(); }

  function end() {
    recognizer.stop(); recorder.dispose();
    const sum = set ? setSummary(state.attempts, set.id) : { tried: 0, good: 0, close: 0, missed: 0 };
    const answered = results.filter((r) => r.outcome !== 'skip').length;
    const kids = [el('h2', {}, answered ? 'Set done' : 'Nothing tried this time')];
    if (answered) kids.push(el('p', {}, `You tried ${count(answered, 'item')} this round. Across every round of "${set.title}": ${sum.good} said or matched, ${sum.close} close, ${sum.missed} not yet, of ${sum.tried} tried.`));
    else kids.push(el('p', {}, 'Nothing was recorded, so nothing changed.'));
    kids.push(el('p', { class: 'muted' }, 'A "match" means the browser\'s recognizer wrote the same letters, not that a teacher heard you.'));
    kids.push(el('div', { class: 'sk-row' },
      el('button', { type: 'button', class: 'btn', id: 'speak-again', onclick: renderStart }, 'Another set'),
      el('button', { type: 'button', class: 'btn secondary', id: 'speak-to-drills', onclick: () => go('drills') }, 'Listening drills'),
      el('button', { type: 'button', class: 'btn secondary', id: 'speak-to-history', onclick: () => go('history') }, 'My history')));
    setBody(...kids);
    say(answered ? `Set done. ${answered} tried.` : 'Set done.');
    focusNode(h1);
  }

  // ---- Listening drills --------------------------------------------------------------------------------------------
  let dq = [], di = 0, dright = 0;
  async function ensurePairs() { if (!pairs) pairs = inj.data?.pairs || await loadPairs(); return pairs; }
  async function renderDrillStart() {
    setBody(el('p', {}, 'Loading drills...'));
    try { await ensurePairs(); } catch { if (alive) setBody(el('p', { role: 'alert' }, 'The drills could not be loaded. Check your connection and reload.')); return; }
    if (!alive || tab !== 'drills') return;
    const sel = el('select', { id: 'speak-contrast', name: 'contrast' });
    for (const c of pairs.contrasts) { const n = pairs.items.filter((i) => i.contrast === c.id).length; sel.append(el('option', { value: c.id, selected: c.id === chosenContrast }, `${c.title} (${count(n, 'item')})`)); }
    if (!pairs.contrasts.some((c) => c.id === chosenContrast)) chosenContrast = pairs.contrasts[0].id;
    sel.value = chosenContrast;
    const note = el('p', { class: 'muted', id: 'speak-contrast-note' }, contrastById(chosenContrast)?.note || '');
    sel.addEventListener('change', (e) => { chosenContrast = e.target.value; note.textContent = contrastById(chosenContrast)?.note || ''; });
    setBody(
      el('p', {}, 'Hear one word and pick the sound you heard at the marked letter, or which of two look-alike words was played. Ten a round.'),
      el('p', { class: 'draft-flag', role: 'note' }, DRAFT + ' No recorded clips exist yet: the only sound is the browser\'s voice, which may itself say a word wrongly.'),
      el('label', { for: 'speak-contrast' }, 'Contrast'),
      sel, note,
      el('div', { class: 'sk-row' }, el('button', { type: 'button', class: 'btn', id: 'drill-start', onclick: startDrill }, 'Start 10')),
    );
    say('');
    focusNode(h1);
  }
  function startDrill() { dq = drillQueue(pairs.items, chosenContrast, rng, 10); di = 0; dright = 0; if (!dq.length) return endDrill(); drillQuestion_(); }
  function drillQuestion_() {
    const q = drillQuestion(dq[di], rng), c = contrastById(q.item.contrast);
    const listen = el('button', { type: 'button', class: 'btn', id: 'drill-listen', 'aria-label': 'Listen to the word', onclick: () => playModel(q.play.he, q.play.audioId, listen) }, 'Listen');
    const area = el('div', { class: 'sk-opts', role: 'group', 'aria-label': 'Answers' });
    const verdict = el('div', { class: 'sk-verdict', id: 'drill-verdict', hidden: true });
    const nextRow = el('div', { class: 'sk-row' });
    let answered = false;
    for (const o of q.options) {
      area.append(el('button', { type: 'button', class: 'btn secondary', 'data-id': o.id, onclick: async () => {
        if (answered) return; answered = true;
        const correct = o.id === q.answer;
        if (correct) dright++;
        for (const b of area.children) b.setAttribute?.('disabled', '');
        const reveal = el('p', {}, 'The word was ', heText(q.played.he), ` (${q.played.translit}, ${q.played.en}).`);
        const text = correct ? 'Right.' : `Not this time: it was ${q.kind === 'pair' ? q.played.en : c.sounds.find((s) => s.id === q.answer)?.label}.`;
        verdict.hidden = false; verdict.removeAttribute?.('hidden'); verdict.replaceChildren(el('p', {}, el('strong', {}, text)), reveal);
        say(`${text} ${q.played.translit}, ${q.played.en}.`);
        await record({ kind: 'pair', set: q.item.contrast, itemId: q.item.id, he: q.played.he, mode: 'drill', outcome: correct ? 'match' : 'miss', contrast: q.item.contrast, correct });
        const next = el('button', { type: 'button', class: 'btn', id: 'drill-next', onclick: () => { if (di + 1 >= dq.length) return endDrill(); di++; drillQuestion_(); } }, di + 1 >= dq.length ? 'See my results' : 'Next');
        nextRow.replaceChildren(next); focusNode(next);
      } }, q.kind === 'pair' ? [heText(o.he), ` ${o.label}`] : o.label));
    }
    const shown = q.kind === 'sound'
      ? el('div', { class: 'sk-he' }, el('span', { dir: 'rtl', lang: 'he', class: 'alef-he' }, q.item.marked.map((s) => (s.mark ? el('span', { class: 'mark', 'aria-label': `marked letter ${s.text === '?' ? 'hidden' : s.text}` }, s.text) : s.text))))
      : el('p', { class: 'sk-sub' }, 'Two words that differ in one sound. Listen, then pick the one you heard.');
    setBody(
      el('p', { class: 'muted' }, `${c.title}: ${di + 1} of ${dq.length}`),
      el('h2', { tabindex: '-1', id: 'drill-q' }, q.prompt),
      shown,
      c.byEar ? null : el('p', { class: 'muted' }, `Hint: ${q.item.en}`),
      el('div', { class: 'sk-row' }, listen),
      area, verdict, nextRow,
      el('div', { class: 'sk-row' }, el('button', { type: 'button', class: 'btn secondary', id: 'drill-finish', onclick: endDrill }, 'Finish now')),
    );
    say('');
    focusNode(body.querySelector?.('#drill-q'));
  }
  function endDrill() {
    const c = contrastById(chosenContrast);
    const tried = Math.min(di + (body.querySelector?.('#drill-next') ? 1 : 0), dq.length);
    setBody(
      el('h2', {}, 'Round done'),
      el('p', { id: 'drill-summary' }, tried ? `${c.title}: ${dright} of ${tried} right this round.` : 'Nothing answered.'),
      el('p', { class: 'muted' }, 'Answers come from the vowel points in the draft word list, read by the browser\'s voice; both can be wrong.'),
      el('div', { class: 'sk-row' },
        el('button', { type: 'button', class: 'btn', id: 'drill-again', onclick: renderDrillStart }, 'Another round'),
        el('button', { type: 'button', class: 'btn secondary', id: 'drill-to-history', onclick: () => go('history') }, 'Weakest sounds')));
    say(tried ? `Round done. ${dright} of ${tried} right.` : 'Round done.');
    focusNode(h1);
  }

  // ---- History ----------------------------------------------------------------------------------------------------
  function renderHistory() {
    const rep = soundReport(state.attempts);
    const days = dailyTotals(state.attempts, inj.dayKey);
    const kids = [el('h2', { tabindex: '-1', id: 'speak-history-h' }, 'Your speaking history')];
    if (!state.attempts.length) kids.push(el('p', {}, 'Nothing yet. Attempts from "Say it" and the listening drills are kept on this device only.'));
    else {
      kids.push(el('h3', {}, 'Weakest sounds'));
      if (!rep.ranked.length) kids.push(el('p', {}, `Not enough yet: a sound is listed after 3 tries. ${count(rep.total, 'letter or drill answer', 'letters and drill answers')} counted so far.`));
      else kids.push(el('ol', { class: 'sk-list', id: 'speak-weakest', 'aria-label': 'Sounds, weakest first' }, rep.ranked.slice(0, 6).map((r) => el('li', {}, `${r.label}: missed ${r.misses} of ${r.tries} (${Math.round(r.rate * 100)}%)${r.sources.drill ? ', incl. drills' : ''}`))));
      kids.push(el('p', { class: 'muted' }, 'Letter misses are what the browser\'s recognizer wrote back when you said a word; it is unverified for Hebrew, so a weak sound may be its weakness, not yours. Drill misses are your own answers in the listening drills.'));
      kids.push(el('h3', {}, 'By day'));
      kids.push(el('table', { id: 'speak-days' }, el('thead', {}, el('tr', {}, el('th', { scope: 'col' }, 'Day'), el('th', { scope: 'col' }, 'Said / matched'), el('th', { scope: 'col' }, 'Drill answers right'))),
        el('tbody', {}, days.slice(0, 14).map((d) => el('tr', {}, el('td', {}, d.day), el('td', {}, `${d.good} of ${d.say}`), el('td', {}, `${d.drillRight} of ${d.drills}`))))));
      kids.push(el('h3', {}, 'Recent attempts'));
      kids.push(el('ul', { class: 'sk-list', id: 'speak-recent' }, historyRows(state.attempts, 20).map((a) => el('li', {}, heText(a.he), ` - ${a.kind === 'pair' ? `drill (${a.contrast})` : a.mode}: ${a.outcome}${a.heard ? ' (heard: ' : ''}`, a.heard ? heText(a.heard) : '', a.heard ? ')' : ''))));
      const clear = el('button', { type: 'button', class: 'btn secondary', id: 'speak-clear', onclick: () => {
        clear.replaceWith?.(el('div', { class: 'sk-row' }, el('p', {}, 'Delete every speaking attempt from this device?'),
          el('button', { type: 'button', class: 'btn', id: 'speak-clear-yes', onclick: async () => { state = { ...coerceState(null), mode: state.mode }; await save(); say('History cleared.'); renderHistory(); } }, 'Yes, delete it'),
          el('button', { type: 'button', class: 'btn secondary', onclick: renderHistory }, 'Keep it')));
      } }, 'Clear my speaking history');
      kids.push(el('div', { class: 'sk-row' }, clear));
    }
    setBody(...kids);
    focusNode(body.querySelector?.('#speak-history-h'));
  }

  init();
  return () => { alive = false; recognizer.stop(); recorder.dispose(); speaker.cancel(); };
}
