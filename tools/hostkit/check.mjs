// Host kit checks: lesson ids, corpus ids, external hosts, draft markers, no contact details. Read-only.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const KIT_FILES = ['partner-sheet.html', 'facilitator-guide.md', 'settings-sheet.md', 'outreach-drafts.md', 'feedback-form.html'];
export const ALLOWED_HOSTS = ['holyblossom.org', 'cityshul.ca', 'thejunctionshul.org', 'njop.org'];

export const readKit = (f) => readFileSync(join(ROOT, 'docs/host-kit', f), 'utf8');
const json = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));

export const lessonIds = () => new Set(json('data/curriculum/lessons.json').lessons.map((l) => l.id));
export const corpusIds = () => new Set(json('data/corpus/registry.json').entries.map((e) => e.id));

/** Lesson ids (r01..r99) mentioned in text. */
export const mentionedLessons = (t) => [...new Set(t.match(/\br\d{2}\b/g) || [])];
/** Backticked ids that look like corpus ids (lowercase words with hyphens). */
export const mentionedCorpus = (t) => [...new Set([...t.matchAll(/`([a-z]+(?:-[a-z0-9]+)+)`/g)].map((m) => m[1]))]
  .filter((x) => !/^(class-track|blocks)$/.test(x));
export const externalHosts = (t) => [...new Set([...t.matchAll(/https?:\/\/([^\s/"'<>)]+)/g)].map((m) => m[1].toLowerCase()))];
export const emails = (t) => t.match(/[\w.+-]+@[\w-]+\.[\w.-]+/g) || [];
export const phones = (t) => t.match(/\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/g) || [];
