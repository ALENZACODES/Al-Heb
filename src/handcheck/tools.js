// Where the vendored alef-tools packages live (see data/alef-tools.lock.json; tests/handcheck.test.js keeps the two in step).
export const HANDWRITING = new URL('../../assets/vendor/_alef-tools/handwriting@0.1.0/', import.meta.url).href;
export const OCR_FIX = new URL('../../assets/vendor/_alef-tools/ocr-fix@0.1.0/', import.meta.url).href;
export const OCR_WORDS = new URL('../../assets/vendor/_packs/ocr-words/lexicon.json', import.meta.url).href;
