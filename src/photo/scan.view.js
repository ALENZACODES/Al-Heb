// Photo scan view. Lane 6. mount(root, ctx) -> unmount.
// ctx (from lane 8): {settings, store, audio, route, t, photoEngines?, registry?, photoLocalServer?}.
//   ctx.photoEngines  optional engine bundle override (tests/demo: the mock bundle shows a "demo engine" banner).
//   default           real engines from ./engines/index.js: in-browser tesseract.js (vendored, lazy ~5 MB download on first photo),
//                     no online vowelizer in this build (removed 2026-11-07, fix #16), optional local translation helper
//                     if ctx.photoLocalServer is set (see tools/ocr-server.mjs).
// Accuracy on real photos is UNMEASURED (synthetic benchmark only: docs/photo/BENCHMARK.md). The UI says so.
import { runPipeline } from './pipeline.js';
import { loadLane3Shva, CONFIDENCE_REASONS } from './syllabify.js';
import { buildWordCards, loadTransliterator, loadLetterInfo, TRADITIONS } from './word-card.js';
import { isLocalHelperUrl } from './engines/local-server.js';
import { speechSafeText } from '../shell/names.js';

export const ACCURACY_NOTICE = 'Accuracy notice: this reader has only been tested on 145 computer-generated images (about 88% of letters right there). It has not been measured on real photos, so expect mistakes, especially with vowel points, curved pages, glare or small print. Treat the result as a study aid, check it against the page, and do not rely on it for anything important (medical, legal, kashrut, prayer text for a ritual).';
export const NO_TRANSLATION_NOTICE = 'This app has no built-in Hebrew-to-English translator. Prayer lines that match the built-in texts show the stored translation; everything else shows no English. Nothing was sent anywhere to try.';
const ROW = 'display:flex;flex-wrap:wrap;gap:4px;justify-content:flex-start';
const BTN = 'display:inline-flex;flex-direction:column;align-items:center;min-width:3.4em;padding:4px 6px;font-size:1.1em';
export const TRADITION_LABEL = { israeli: 'Israeli', sephardi: 'Sephardi', ashkenazi: 'Ashkenazi' };

/** Pure: result -> card data (testable without a DOM). */
export function buildCards(result) {
  const cards = [];
  for (const line of result.lines) {
    for (const w of line.words) {
      if (w.kind !== 'hebrew') continue;
      cards.push({
        lineIndex: line.index, he: w.he, note: w.note || null, ipa: w.ipa || null,
        letters: w.syllables.flatMap((s) => s.letters.map((l) => ({ letter: l.letter, id: l.id, vowel: l.vowel, silent: !!(l.silent || l.mater) }))),
        syllables: w.syllables.map((s) => ({ he: s.he, translit: s.translit ?? '', stressed: s.stressed })),
      });
    }
  }
  return cards;
}

export function mount(root, ctx = {}) {
  const doc = root.ownerDocument;
  const forced = ctx.photoEngines || null;
  const el = (tag, attrs = {}, ...kids) => {
    const n = doc.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) { if (k === 'class') n.className = v; else if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v); }
    for (const k of kids) n.append(k);
    return n;
  };
  const heEl = (text, tag = 'span', cls = '') => el(tag, { dir: 'rtl', lang: 'he', class: cls }, text);
  root.textContent = '';
  const wrap = el('section', { class: 'photo-scan' });
  wrap.append(el('h2', {}, 'Scan a printed Hebrew page or sign'));
  if (forced?.demo) wrap.append(el('p', { class: 'photo-demo-banner', role: 'status' }, 'demo engine: no real OCR installed. The cards below are canned sample text, not read from your photo.'));
  wrap.append(el('p', { class: 'photo-accuracy', role: 'note', style: 'border-left:4px solid #b26a00;padding:0.4em 0.8em;background:rgba(178,106,0,0.10)' }, ACCURACY_NOTICE));
  wrap.append(el('p', { class: 'photo-scope' }, 'Printed text only. Handwriting is not supported.'));
  if (!forced) wrap.append(el('p', { class: 'photo-privacy' }, 'The photo is read on this device (first use downloads about 5 MB of OCR data, then it is cached). It is not uploaded. Accuracy on real photos has not been measured yet: check what was read against the page.'));
  // No online vowelizer in this build: unpointed text stays as read on this device (prayer lines that match the
  // built-in texts still show their stored pointing).
  if (!forced) wrap.append(el('p', { class: 'photo-online-off muted', role: 'note' }, 'No online vowel service in this build. Unpointed text stays as read on this device.'));
  const helperInput = el('input', { type: 'url', id: 'photo-helper', placeholder: 'http://127.0.0.1:8787', 'aria-label': 'Helper address (this computer only), for local translation, optional', style: 'width:14em' });
  const helperMsg = el('span', { class: 'photo-helper-msg', role: 'status' });
  if (!forced) wrap.append(el('details', { class: 'photo-translate-setup' },
    el('summary', {}, 'Translation: off. How to turn it on (optional)'),
    el('p', {}, 'Translation needs a helper program running on your own computer. Photos are never sent to it unless you also choose that; only the recognised Hebrew text is, and only to the address below. Steps: run `node tools/ocr-server.mjs` from the project folder (needs Python and the Argos Translate package with its he-en model; see docs/photo/TRANSLATION.md), then enter its address here.'),
    el('label', { for: 'photo-helper' }, 'Helper address (this computer only): '), helperInput, helperMsg,
    el('p', {}, 'Quality is weak on single words (measured on 30 phrases, about half the words right). Results are always labelled machine translation. A cloud translator is not offered: see the open question in docs/photo/TRANSLATION.md.')));
  const status = el('p', { class: 'photo-status', role: 'status', 'aria-live': 'polite' });
  const modeSel = el('select', { 'aria-label': 'Mode' }, el('option', { value: 'prayer' }, 'Prayer page'), el('option', { value: 'sign' }, 'Sign or menu'));
  const input = el('input', { type: 'file', accept: 'image/*', capture: 'environment', 'aria-label': 'Take or choose a photo' });
  const out = el('div', { class: 'photo-out', 'aria-live': 'polite' });
  wrap.append(modeSel, input, status, out);
  root.append(wrap);

  const speak = (text) => {
    const synth = root.ownerDocument.defaultView?.speechSynthesis;
    if (!synth) return false;
    const safe = speechSafeText(text);
    if (!safe.ok) return false;
    const Utter = root.ownerDocument.defaultView.SpeechSynthesisUtterance;
    const u = new Utter(safe.text); u.lang = 'he-IL'; synth.speak(u); return true;
  };
  const playSyllable = (s, note) => {
    if (typeof ctx.audio?.playSequence === 'function') { ctx.audio.playSequence([{ kind: 'syllable', id: s.he, text: s.he }]); return; }
    note.textContent = speak(s.he) ? 'Playing with the browser voice (fallback, not a recorded voice).' : 'No audio available.';
  };
  const playLetter = (l) => { try { ctx.audio?.play?.('letter', l.id); } catch { /* ignore */ } };
  const playVowel = (l) => { try { ctx.audio?.play?.('vowel', l.vowel); } catch { /* ignore */ } };

  let lastTranslit = null; let lastLetterInfo = null; let lastRegistry = null;
  const hearWord = (card, note) => {
    const a = card.audio;
    if (a.id && ctx.audio?.has?.('word', a.id)) { ctx.audio.play('word', a.id); note.textContent = 'Playing the recorded word.'; return; }
    note.textContent = speak(a.text)
      ? `No recording for this word${a.id ? ` (${a.id})` : ''}. Playing the browser voice instead: modern Israeli pronunciation only, not a recorded voice.`
      : 'No audio available for this word.';
  };
  const render = (result) => {
    out.textContent = '';
    const skip = /^no translation engine$/;
    for (const w of result.warnings) out.append(el('p', { class: 'photo-warn' }, w));
    if (!result.demo) out.append(el('p', { class: 'photo-engines' }, `Engines: ${result.engine}`));
    if (!result.translationAvailable) out.append(el('p', { class: 'photo-no-translation', role: 'note' }, NO_TRANSLATION_NOTICE));
    for (const line of result.lines) {
      if (line.ocrText && !result.demo) out.append(el('p', { class: 'photo-ocrtext' }, `Line ${line.index + 1} as read by OCR: `, heEl(line.ocrText)));
      for (const lw of line.warnings) if (!skip.test(lw)) out.append(el('p', { class: 'photo-warn' }, `Line ${line.index + 1}: ${lw}`));
      if (line.match?.matched) out.append(el('p', { class: 'photo-match' }, `Matched ${line.match.ref || line.match.id} (score ${line.match.score})`));
    }
    const cards = buildWordCards(result, { transliterate: lastTranslit, letterInfo: lastLetterInfo, registry: lastRegistry });
    let ci = 0;
    for (const line of result.lines) {
      for (const w of line.words) {
        if (w.kind !== 'hebrew') continue;
        const c = cards[ci++];
        const card = el('article', { class: 'photo-card' });
        card.append(heEl(w.he, 'h3'));
        const note = el('p', { class: 'photo-audio-note', role: 'status' });
        const letters = el('div', { class: 'photo-letters', role: 'group', 'aria-label': 'Letter by letter', dir: 'rtl', style: ROW });
        let li = 0;
        for (const s of w.syllables) for (const l of s.letters) {
          const info = c.letters[li++];
          const b = el('button', { type: 'button', class: 'photo-letter' + (l.mater || l.silent ? ' is-silent' : ''), title: info.soundEn || '', style: BTN + (l.mater || l.silent ? ';opacity:0.55' : ''), onclick: () => { playLetter(l); if (l.vowel && l.vowel !== 'shva') playVowel(l); } });
          b.append(heEl(l.letter, 'span', 'photo-glyph'), el('small', { dir: 'ltr', style: 'display:block' }, info.name || ''), el('small', { dir: 'ltr', style: 'display:block;opacity:0.8' }, l.vowel || '\u2013'));
          letters.append(b);
        }
        const syl = el('div', { class: 'photo-syllables', role: 'group', 'aria-label': 'Syllables', dir: 'rtl', style: ROW });
        for (const s of w.syllables) {
          const b = el('button', { type: 'button', class: 'photo-syllable' + (s.stressed ? ' is-stressed' : ''), style: BTN + (s.stressed ? ';border-width:2px;font-weight:bold' : ''), onclick: () => playSyllable(s, note) });
          b.append(heEl(s.he, 'span', 'photo-glyph'), el('small', { dir: 'ltr', style: 'display:block' }, s.translit ?? ''));
          syl.append(b);
        }
        if (c.letters.length) card.append(el('p', { class: 'photo-label' }, 'Letters (grey = silent / vowel letter)'), letters, el('p', { class: 'photo-label' }, 'Syllables (stress marked)'), syl);
        if (c.translit) {
          const tl = el('dl', { class: 'photo-translit' });
          for (const t of TRADITIONS) tl.append(el('dt', {}, TRADITION_LABEL[t]), el('dd', {}, c.translit[t] + (t === 'sephardi' && c.translit.sameIsraeliSephardi ? ' (same spelling as Israeli: the Latin scheme does not show the difference)' : '')));
          card.append(el('p', { class: 'photo-label' }, 'Transliteration by tradition'), tl);
        }
        if (c.draftNote) card.append(el('p', { class: 'photo-draft', role: 'note' }, c.draftNote, c.confidence?.reasons?.length ? ` Why: ${c.confidence.reasons.map((r) => CONFIDENCE_REASONS[r] || r).join('; ')}.` : ''));
        if (c.audio.canSpeak) card.append(el('button', { type: 'button', class: 'photo-hear', onclick: () => hearWord(c, note) }, 'Hear the word'));
        card.append(note);
        if (c.unpointedNote) card.append(el('p', { class: 'photo-note' }, c.unpointedNote));
        if (w.note) card.append(el('p', { class: 'photo-note' }, w.note));
        if (w.ipa) card.append(el('p', {}, `IPA: ${w.ipa}`));
        out.append(card);
      }
      if (line.english) out.append(el('p', { class: 'photo-english' }, `${line.english.text} (${line.english.label})`));
      else if (line.englishStatus === 'unavailable' && line.words.some((x) => x.kind === 'hebrew')) out.append(el('p', { class: 'photo-english-missing' }, `Line ${line.index + 1}: translation unavailable offline.`));
      else if (line.englishStatus === 'failed') out.append(el('p', { class: 'photo-english-missing' }, `Line ${line.index + 1}: the translation helper did not answer.`));
    }
  };

  let registryP = null;
  const getRegistry = () => {
    if (ctx.registry) return Promise.resolve(ctx.registry);
    registryP ||= fetch(new URL('../../data/corpus/registry.json', import.meta.url)).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    return registryP;
  };
  let shvaP = null;
  let activeEngines = null;
  const run = async (image) => {
    out.textContent = 'Working...'; status.textContent = '';
    try {
      let engines = forced;
      if (!engines) {
        const { createPhotoEngines } = await import('./engines/index.js');
        const typed = helperInput.value.trim();
        if (typed && !isLocalHelperUrl(typed)) { helperMsg.textContent = ' Only an address on this computer (localhost or 127.0.0.1) is accepted; translation stays off.'; }
        else helperMsg.textContent = '';
        const helperUrl = typed && isLocalHelperUrl(typed) ? typed : (ctx.photoLocalServer || null);
        engines = createPhotoEngines({ localServerUrl: helperUrl,
          onProgress: (m) => { if (m?.status) status.textContent = `${m.status}${typeof m.progress === 'number' ? ` ${Math.round(m.progress * 100)}%` : ''}`; } });
        activeEngines = engines;
      }
      shvaP ||= loadLane3Shva();
      lastTranslit ||= await loadTransliterator(); lastLetterInfo ||= await loadLetterInfo();
      const [registry, shvaClassifier] = await Promise.all([getRegistry(), shvaP]);
      lastRegistry = registry;
      const result = await runPipeline(image, engines, { mode: modeSel.value, registry, shvaClassifier: shvaClassifier || undefined });
      status.textContent = '';
      render(result);
      if (engines.disclosure?.length) out.append(el('p', { class: 'photo-disclosure' }, engines.disclosure.join(' ')));
      out.dataset.done = '1';
    } catch (e) { status.textContent = ''; out.textContent = 'Could not read this photo. Try a clearer, closer photo, or type the word instead.'; out.dataset.done = '1'; }
  };
  const onChange = async () => {
    const f = input.files?.[0];
    if (!f) return;
    out.dataset.done = '';
    let image = f;
    if (forced?.demo) { try { image = typeof createImageBitmap === 'function' ? await createImageBitmap(f) : f; } catch { image = f; } }
    run(image);
  };
  input.addEventListener('change', onChange);
  // Demo engine: show the canned sample straight away so the UI is not empty.
  if (forced?.demo) run({ demo: true });
  modeSel.addEventListener('change', () => { if (forced?.demo) run({ demo: true }); });
  return () => { input.removeEventListener('change', onChange); activeEngines?.terminate?.(); root.textContent = ''; };
}
