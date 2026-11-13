// Where the vendored alef-tools packages live. The folders come from the pin (data/alef-tools.lock.json) through the generated
// list, so no version is written here.
import { ALEF_TOOLS } from '../settings/alef-tools.generated.js';
const folder = (id) => new URL(ALEF_TOOLS.packages[id].base, import.meta.url).href;
export const HANDWRITING = folder('handwriting');
export const OCR_FIX = folder('ocr-fix');
export const OCR_WORDS = new URL('../../assets/vendor/_packs/ocr-words/lexicon.json', import.meta.url).href;
