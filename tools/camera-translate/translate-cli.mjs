// The app's own word-list rules, callable from the offline test rig so there is one implementation, not two.
// stdin: JSON array of Hebrew lines.  stdout: JSON array of {en, status, translit, pointed, from?}.
// Usage: echo '["יציאה"]' | node tools/camera-translate/translate-cli.mjs
import { readFileSync } from 'node:fs';
import { createGlossary } from '../../src/camera/camera-model.js';
const data = JSON.parse(readFileSync(new URL('../../data/camera/sign-glossary.json', import.meta.url), 'utf8'));
data.realNeighbours = JSON.parse(readFileSync(new URL('../../data/camera/real-neighbours.json', import.meta.url), 'utf8')).words;
const glossary = createGlossary(data);
const lines = JSON.parse(readFileSync(0, 'utf8'));
process.stdout.write(JSON.stringify(lines.map((l) => glossary.translate(String(l ?? '')))));
