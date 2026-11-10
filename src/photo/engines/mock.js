// MOCK / DEMO ENGINE. It does NOT read the image. It returns canned boxes (or image.mockBoxes if given) and uses tiny
// built-in lexicons so the pipeline, UI and tests can run with no OCR installed. Never present its output as real OCR.
import { consonantSkeleton } from '../hebrew.js';

// Boxes deliberately listed out of reading order; positions are synthetic.
export const DEMO_PRAYER_BOXES = [
  // OCR-style errors vs the Priestly Blessing line 2: resh->dalet in "אלידך"-like confusion kept mild
  { text: 'ויחנך', x: 40, y: 12, w: 70, h: 30 },
  { text: 'יהוה', x: 230, y: 10, w: 60, h: 30 },
  { text: 'יאר', x: 300, y: 12, w: 50, h: 30 },
  { text: 'פניו', x: 170, y: 11, w: 55, h: 30 },
  { text: 'אליך', x: 112, y: 12, w: 55, h: 30 },
];
export const DEMO_SIGN_BOXES = [
  { text: 'שלום', x: 200, y: 10, w: 80, h: 30 },
  { text: 'ברוך', x: 300, y: 12, w: 80, h: 30 },
  { text: 'הבא', x: 100, y: 11, w: 60, h: 30 },
  { text: 'חלב', x: 220, y: 80, w: 60, h: 30 },
  { text: '12.50', x: 100, y: 82, w: 70, h: 30 },
];

const norm = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [consonantSkeleton(k), v]));
const LEXICON = norm({
  'שלום': 'שָׁלוֹם', 'ברוך': 'בָּרוּךְ', 'הבא': 'הַבָּא', 'חלב': 'חָלָב', 'תורה': 'תּוֹרָה', 'אחד': 'אֶחָד', 'מלך': 'מֶלֶךְ',
});
const GLOSS = norm({ 'שלום': 'peace / hello', 'ברוך': 'blessed', 'הבא': 'the next / coming', 'חלב': 'milk', 'תורה': 'Torah', 'אחד': 'one', 'מלך': 'king' });

export function createMockEngine({ prayerBoxes = DEMO_PRAYER_BOXES, signBoxes = DEMO_SIGN_BOXES } = {}) {
  return {
    name: 'mock', demo: true,
    names: { ocr: 'mock', vowelize: 'mock-lexicon', translate: 'mock-glossary' },
    ocr(image, { mode } = {}) { return image?.mockBoxes ?? (mode === 'prayer' ? prayerBoxes : signBoxes); },
    vowelize(text) {
      return String(text).split(/\s+/).map((w) => LEXICON[consonantSkeleton(w)] ?? w).join(' ');
    },
    ipa: undefined,
    translate(text) {
      const out = String(text).split(/\s+/).map((w) => GLOSS[consonantSkeleton(w)] ?? `[${w}]`).join(' ');
      return { text: out, engine: 'mock-glossary (word-by-word, demo only)' };
    },
  };
}
