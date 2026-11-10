// @ts-check
// Talk: loads the stored sentence pairs and builds the on-device engine. Every file is part of the site itself;
// nothing is sent anywhere. The 6,300-word dictionary index is fetched only when a line needs it.
import { loadJSON } from '../curriculum/data.js';
import { createEngine, pairsFromLines } from './engine.js';

export const FILES = Object.freeze({
  pack: 'data/talk/pack.json',
  phrasebook: 'data/corpus/phrasebook.json',
  dialogues: 'data/curriculum/dialogues.json',
  scenarios: 'data/israel/scenarios.json',
  dictionary: 'data/vocab/index.json',
});

/** Lines with Hebrew and English from the Israel dialogues and the "Sound like a local" scenes. */
export function extraPairs(dialogues, scenarios) {
  const lines = [];
  for (const d of dialogues?.dialogues || []) for (const l of d.lines || []) lines.push(l);
  const scene = [];
  for (const s of scenarios?.scenarios || []) {
    if (s.other?.he && s.other?.en) scene.push({ id: `${s.id}-other`, he: s.other.he, en: s.other.en });
    (s.options || []).forEach((o, i) => { if (o.role === 'natural' && o.he && o.en) scene.push({ id: `${s.id}-o${i}`, he: o.he, en: o.en }); });
  }
  return [...pairsFromLines(lines, 'dialogue'), ...pairsFromLines(scene, 'scene')];
}

/**
 * @param {(rel:string) => Promise<any>} [load]
 * @returns {Promise<ReturnType<typeof createEngine> & {loadDictionary: () => Promise<boolean>}>}
 */
export async function loadEngine(load = loadJSON) {
  const pack = await load(FILES.pack);
  const optional = (f) => load(f).catch(() => null); // the pack alone is enough to run
  const [phrasebook, dialogues, scenarios] = await Promise.all([optional(FILES.phrasebook), optional(FILES.dialogues), optional(FILES.scenarios)]);
  const engine = createEngine({ pack, phrasebook, extraPairs: extraPairs(dialogues, scenarios) });
  /** @type {Promise<boolean>|null} */
  let dict = null;
  const loadDictionary = () => {
    if (!dict) {
      dict = load(FILES.dictionary).then((d) => { engine.setDictionary(d?.rows || []); return engine.hasDictionary; }).catch(() => false);
    }
    return dict;
  };
  return Object.assign(engine, { loadDictionary });
}
