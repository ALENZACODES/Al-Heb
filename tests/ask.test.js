import test from 'node:test';
import assert from 'node:assert/strict';
import { matchRoute, ROUTES } from '../src/shell/router.js';
import { VIEW_FILES } from '../src/shell/views.generated.js';
import { ROUTE_SECTION } from '../src/shell/nav-model.js';
import { en } from '../src/shell/i18n.js';
import '../src/shell/nav.strings.js';
import { labelKey } from '../src/shell/nav-model.js';
import { apiUrl, configured, alefHrefFromId, passageHref, OFFLINE_COPY, INTRO } from '../src/ask/model.js';
import { isOnDemand } from '../tools/build-precache.mjs';

test('ask route matches #/ask and is in the Read section', () => {
  const m = matchRoute('#/ask');
  assert.equal(m.route?.name, 'ask');
  assert.equal(m.route.module, '../ask/ask.view.js');
  assert.equal(ROUTE_SECTION.ask, 'read');
  assert.equal(en[labelKey(m.route)], 'Ask the Torah');
  assert.ok(VIEW_FILES.includes('ask/ask.view.js'));
});

test('ask view is on-demand, not first-install precache', () => {
  assert.equal(isOnDemand('src/ask/ask.view.js'), true);
  assert.equal(isOnDemand('src/ask/model.js'), true);
});

test('apiUrl and configured read only explicit settings', () => {
  assert.equal(apiUrl({}), '');
  assert.equal(configured({}), false);
  assert.equal(apiUrl({ ALEF_ASK_TORAH_URL: 'https://ask.example/api/' }), 'https://ask.example/api');
  assert.equal(configured({ ALEF_ASK_TORAH_URL: 'https://ask.example/api' }), true);
  const document = { querySelector: (s) => (s === 'meta[name="alef-ask-torah"]' ? { getAttribute: () => ' https://x.test/v1/ ' } : null) };
  assert.equal(apiUrl({ document }), 'https://x.test/v1');
});

test('alef reader links for Torah verses, Sefaria otherwise', () => {
  assert.equal(alefHrefFromId('genesis.2.7'), '#/torahreader?book=genesis&chapter=2&verse=7');
  assert.equal(alefHrefFromId('deuteronomy.6.4'), '#/torahreader?book=deuteronomy&chapter=6&verse=4');
  assert.equal(alefHrefFromId('esther.9.20'), null);
  assert.equal(passageHref({ id: 'exodus.20.1', link_kind: 'alef', href: '#/torahreader?book=exodus&chapter=20&verse=1' }), '#/torahreader?book=exodus&chapter=20&verse=1');
  assert.equal(passageHref({ id: 'esther.1.1', href: 'https://www.sefaria.org/Esther.1.1', link_kind: 'sefaria' }), 'https://www.sefaria.org/Esther.1.1');
});

test('user-facing copy names no AI product', () => {
  const banned = /chatgpt|claude|gemini|openai|anthropic|google cloud|vertex|gradio|llm/i;
  assert.equal(banned.test(OFFLINE_COPY), false);
  assert.equal(banned.test(INTRO), false);
  const route = ROUTES.find((r) => r.name === 'ask');
  assert.equal(banned.test(route.title), false);
});
