// Regenerates docs/a11y/STATEMENT.md from src/shell/a11y.statement.js (so the in-app text and the document cannot drift).
// Usage: node tools/a11y/statement.mjs [--write]   (without --write: exit 1 if the file differs)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toMarkdown } from '../../src/shell/a11y.statement.js';
const file = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', 'docs', 'a11y', 'STATEMENT.md');
const md = toMarkdown();
if (process.argv.includes('--write')) { writeFileSync(file, md); console.log('wrote ' + file); }
else if (!existsSync(file) || readFileSync(file, 'utf8') !== md) { console.error('docs/a11y/STATEMENT.md is out of date: node tools/a11y/statement.mjs --write'); process.exit(1); }
else console.log('docs/a11y/STATEMENT.md is up to date');
