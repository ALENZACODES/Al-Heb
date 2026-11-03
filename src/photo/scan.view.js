// Photo scan view. Lane 6. mount(root, ctx) -> unmount.
// ctx (from lane 8): {settings, store, audio, route, t, photoEngines?}. ctx.photoEngines = engine bundle (see pipeline.js);
// default is the DEMO mock engine, and the UI says so. Nothing here reads real Hebrew unless a real engine is supplied.
import { runPipeline } from './pipeline.js';
import { createMockEngine } from './engines/mock.js';

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
  const engines = ctx.photoEngines || createMockEngine();
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
  if (engines.demo) wrap.append(el('p', { class: 'photo-demo-banner', role: 'status' }, 'demo engine: no real OCR installed. The cards below are canned sample text, not read from your photo.'));
  wrap.append(el('p', { class: 'photo-scope' }, 'Printed text only. Handwriting is not supported.'));
  const modeSel = el('select', { 'aria-label': 'Mode' }, el('option', { value: 'prayer' }, 'Prayer page'), el('option', { value: 'sign' }, 'Sign or menu'));
  const input = el('input', { type: 'file', accept: 'image/*', capture: 'environment', 'aria-label': 'Take or choose a photo' });
  const out = el('div', { class: 'photo-out', 'aria-live': 'polite' });
  wrap.append(modeSel, input, out);
  root.append(wrap);

  const speak = (text) => {
    const synth = root.ownerDocument.defaultView?.speechSynthesis;
    if (!synth) return false;
    const Utter = root.ownerDocument.defaultView.SpeechSynthesisUtterance;
    const u = new Utter(text); u.lang = 'he-IL'; synth.speak(u); return true;
  };
  const playSyllable = (s, note) => {
    if (typeof ctx.audio?.playSequence === 'function') { ctx.audio.playSequence([{ kind: 'syllable', id: s.he, text: s.he }]); return; }
    note.textContent = speak(s.he) ? 'Playing with the browser voice (fallback, not a recorded voice).' : 'No audio available.';
  };
  const playLetter = (l) => { try { ctx.audio?.play?.('letter', l.id); } catch { /* ignore */ } };
  const playVowel = (l) => { try { ctx.audio?.play?.('vowel', l.vowel); } catch { /* ignore */ } };

  const render = (result) => {
    out.textContent = '';
    for (const w of result.warnings) out.append(el('p', { class: 'photo-warn' }, w));
    for (const line of result.lines) {
      for (const lw of line.warnings) out.append(el('p', { class: 'photo-warn' }, `Line ${line.index + 1}: ${lw}`));
      if (line.match?.matched) out.append(el('p', { class: 'photo-match' }, `Matched ${line.match.ref || line.match.id} (score ${line.match.score})`));
    }
    for (const line of result.lines) {
      for (const w of line.words) {
        if (w.kind !== 'hebrew') continue;
        const card = el('article', { class: 'photo-card' });
        card.append(heEl(w.he, 'h3'));
        const letters = el('div', { class: 'photo-letters', role: 'group', 'aria-label': 'Letters' });
        for (const s of w.syllables) for (const l of s.letters) {
          const b = el('button', { type: 'button', class: 'photo-letter' + (l.mater || l.silent ? ' is-silent' : ''), onclick: () => { playLetter(l); if (l.vowel && l.vowel !== 'shva') playVowel(l); } });
          b.append(heEl(l.letter), el('small', {}, l.vowel || ''));
          letters.append(b);
        }
        const note = el('p', { class: 'photo-audio-note', role: 'status' });
        const syl = el('div', { class: 'photo-syllables', role: 'group', 'aria-label': 'Syllables' });
        for (const s of w.syllables) {
          const b = el('button', { type: 'button', class: 'photo-syllable' + (s.stressed ? ' is-stressed' : ''), onclick: () => playSyllable(s, note) });
          b.append(heEl(s.he), el('small', {}, s.translit ?? ''));
          syl.append(b);
        }
        card.append(letters, syl, note);
        if (w.note) card.append(el('p', { class: 'photo-note' }, w.note));
        if (w.ipa) card.append(el('p', {}, `IPA: ${w.ipa}`));
        out.append(card);
      }
      if (line.english) out.append(el('p', { class: 'photo-english' }, `${line.english.text} (${line.english.label})`));
    }
  };

  const run = async (image) => {
    out.textContent = 'Working...';
    try { render(await runPipeline(image, engines, { mode: modeSel.value, registry: ctx.registry || null })); }
    catch (e) { out.textContent = `Could not process the photo: ${e.message}`; }
  };
  const onChange = async () => {
    const f = input.files?.[0];
    if (!f) return;
    let image = f;
    try { image = typeof createImageBitmap === 'function' ? await createImageBitmap(f) : f; } catch { image = f; }
    run(image);
  };
  input.addEventListener('change', onChange);
  // Demo engine: show the canned sample straight away so the UI is not empty.
  if (engines.demo) run({ demo: true });
  modeSel.addEventListener('change', () => { if (engines.demo) run({ demo: true }); });
  return () => { input.removeEventListener('change', onChange); root.textContent = ''; };
}
