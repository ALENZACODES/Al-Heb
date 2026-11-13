// @ts-check
// Talk translation pack: this module now lives in the tools repository (alef-tools, packages/translate), vendored at the pinned
// commit (data/alef-tools.lock.json). This file keeps the old import path working.
import { translateUrl } from './tools.js';
const m = await import(translateUrl('decode.js'));
export const { createDecoder } = m;
