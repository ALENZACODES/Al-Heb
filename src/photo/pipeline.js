// Photo pipeline: OCR boxes -> reading order -> (prayer: corpus match | sign: vowelize) -> syllables -> IPA -> English.
// Lane 6. Pure orchestration; every engine is injected. No network calls are made here.
//
// ENGINE INTERFACES (all may be sync or async):
//   ocr(image)        -> Box[]            required. Box = {text,x,y,w,h} in image pixels (origin top-left).
//   vowelize(text)    -> string           optional. Unpointed Hebrew -> pointed Hebrew (e.g. the mock lexicon in tests/demo).
//   ipa(pointed)      -> string|null      optional. Phonikud placeholder; absent in this build.
//   translate(text)   -> string | {text, engine?}   optional. Hebrew -> English. ALWAYS labelled "machine translation".
// Engine bundle: {name?, demo?: boolean, ocr, vowelize?, ipa?, translate?, names?:{ocr?,vowelize?,...}}
import { orderLines } from './order-lines.js';
import { matchPrayer, DEFAULT_THRESHOLD } from './match-prayer.js';
import { syllabifyWord } from './syllabify.js';
import { consonantSkeleton, isPointed, isHebrew, stripMarks, tokenise } from './hebrew.js';

export const MACHINE_TRANSLATION_LABEL = 'machine translation';
export const CORPUS_TRANSLATION_LABEL = 'corpus translation';

const asText = (x) => (typeof x === 'string' ? { text: x } : x);

/** @returns {Promise<object>} see docs/photo/ENGINES.md for the result shape */
export async function runPipeline(image, engines, { mode = 'prayer', registry = null, threshold = DEFAULT_THRESHOLD, shvaClassifier } = {}) {
  if (!engines || typeof engines.ocr !== 'function') throw new TypeError('runPipeline: engines.ocr(image) is required');
  if (mode !== 'prayer' && mode !== 'sign') throw new RangeError(`runPipeline: unknown mode "${mode}"`);
  const warnings = [];
  const boxes = await engines.ocr(image, { mode });
  const ordered = orderLines(boxes);
  if (!ordered.length) warnings.push('OCR returned no text');
  const lines = [];
  for (let index = 0; index < ordered.length; index++) {
    const ol = ordered[index];
    const lw = [];
    const line = { index, ocrText: ol.text, skeleton: consonantSkeleton(ol.text), bbox: ol.bbox, match: null, pointedSource: 'none', pointed: '', words: [], english: null, warnings: lw };
    if (!isHebrew(ol.text)) { lw.push('no Hebrew letters in this line'); line.words = tokenise(ol.text).map((t) => ({ he: t, kind: 'other', syllables: [] })); lines.push(line); continue; }

    // 1. pointed text
    let corpusEnglish = null;
    if (mode === 'prayer') {
      const m = matchPrayer(ol.text, registry, { threshold });
      line.match = m ? { id: m.id, ref: m.ref, score: m.score, matched: m.matched, kind: m.kind, source: m.source, lineIndex: m.lineIndex } : null;
      if (m?.matched) { line.pointed = m.pointed; line.pointedSource = 'corpus'; corpusEnglish = m.english; }
      else lw.push(m ? `no confident corpus match (best score ${m.score} < ${threshold}); falling back to the sign/menu path` : 'no corpus candidates');
    }
    if (!line.pointed) {
      if (isPointed(ol.text)) { line.pointed = ol.text; line.pointedSource = 'ocr'; }
      else if (typeof engines.vowelize === 'function') {
        try { const p = await engines.vowelize(stripMarks(ol.text)); line.pointed = typeof p === 'string' ? p : (p?.text ?? ''); line.pointedSource = engines.names?.vowelize || 'vowelizer'; }
        catch (e) { lw.push(`vowelize failed: ${e.message}`); }
      } else lw.push('no vowelizer engine: cannot add vowels to unpointed text');
      if (line.pointedSource !== 'ocr' && line.pointed) lw.push('vowels are machine-generated and may be wrong');
    }

    // 2. syllables (+ ipa)
    for (const tok of tokenise(line.pointed || ol.text)) {
      if (!isHebrew(tok)) { line.words.push({ he: tok, kind: 'other', syllables: [] }); continue; }
      const syllables = syllabifyWord(tok, shvaClassifier ? { shvaClassifier } : {});
      const w = { he: tok, kind: 'hebrew', syllables };
      if (syllables.confidence) w.confidence = syllables.confidence;
      if (!syllables.length) w.note = 'no vowel points: cannot syllabify';
      if (syllables.some((s) => s.substituted)) w.note = 'divine name: read as Adonai';
      if (typeof engines.ipa === 'function' && syllables.length) {
        try { const ipa = await engines.ipa(tok); if (ipa) w.ipa = ipa; } catch (e) { lw.push(`ipa failed: ${e.message}`); }
      }
      line.words.push(w);
    }

    // 3. English
    line.englishStatus = 'unavailable';
    if (corpusEnglish) line.english = { text: corpusEnglish, label: CORPUS_TRANSLATION_LABEL, machineTranslation: false, engine: 'registry' };
    if (corpusEnglish) line.englishStatus = 'corpus';
    else if (typeof engines.translate === 'function') {
      try {
        const r = asText(await engines.translate(stripMarks(line.pointed || ol.text)));
        if (r?.text) line.english = { text: r.text, label: MACHINE_TRANSLATION_LABEL, machineTranslation: true, engine: r.engine || engines.names?.translate || 'translator' };
        line.englishStatus = line.english ? 'machine' : 'failed';
      } catch (e) { lw.push(`translate failed: ${e.message}`); line.englishStatus = 'failed'; }
    } else lw.push('no translation engine');
    lines.push(line);
  }
  return {
    mode, demo: !!engines.demo, engine: engines.name || 'custom', engines: engines.names || {},
    lines, warnings,
    translationAvailable: typeof engines.translate === 'function',
    notice: engines.demo ? 'demo engine: no real OCR installed. Output does not come from the photo.' : undefined,
  };
}

/** Compose an engine bundle from parts; demo is true if any part declares demo:true. */
export function composeEngines(parts) {
  const names = {}; const out = { names };
  let demo = false;
  for (const k of ['ocr', 'vowelize', 'ipa', 'translate']) {
    const p = parts[k]; if (!p) continue;
    const fn = typeof p === 'function' ? p : p[k];
    out[k] = fn; names[k] = p.name || k; if (p.demo) demo = true;
  }
  out.demo = demo; out.name = Object.values(names).join('+');
  return out;
}
