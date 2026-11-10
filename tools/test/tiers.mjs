// Test tiers. Files listed in BROWSER launch a real browser (or the QA servers) and are slow;
// everything else in tests/*.test.js is the fast unit tier.
import { readdirSync } from 'node:fs';
export const BROWSER = [
  'a11y.newviews', 'a11y.browser', 'perf', 'pwa.browser', 'qa.walk', 'journey', 'sweep', 'qa.devices',
  'deploy.smoke', 'deploy.subpath', 'photo.scan-e2e', 'a11y.gate',
].map((n) => `tests/${n}.test.js`);
// Convention: any tests/*.browser.test.js is browser tier too.
const isBrowser = (f) => BROWSER.includes(f) || f.endsWith('.browser.test.js');
const all = () => readdirSync('tests').filter((f) => f.endsWith('.test.js')).map((f) => `tests/${f}`).sort();
export const unitFiles = () => all().filter((f) => !isBrowser(f));
export const browserFiles = () => all().filter(isBrowser);
export const allFiles = () => all();
