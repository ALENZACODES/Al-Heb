import test from 'node:test';
import assert from 'node:assert/strict';
import { mount, photoHelperOptions } from '../src/photo/scan.view.js';
import { newRoot, all } from './pronunciation.dom-helper.js';
const byId = (root, id) => all(root, n => n.getAttribute('id') === id)[0];
function view(href) {
  const root = newRoot(); root.ownerDocument.defaultView = { location: { href } };
  const unmount = mount(root); return { root, unmount };
}
test('hosted scan explains unavailable integrations and cannot enable their network adapters', () => {
  const { root, unmount } = view('https://alef.pages.dev/#/scan');
  assert.equal(byId(root, 'photo-online').getAttribute('disabled'), '');
  assert.equal(byId(root, 'photo-helper'), undefined);
  assert.match(root.textContent, /unavailable in this hosted app/);
  assert.deepEqual(photoHelperOptions('https://alef.pages.dev/', true, 'http://127.0.0.1:8787', 'http://localhost:8787'), { online: false, localServerUrl: null });
  unmount();
});
test('local development retains opt-in online vowels and local translation setup', () => {
  for (const origin of ['http://127.0.0.1:8080/', 'http://localhost:8080/']) {
    const { root, unmount } = view(origin);
    assert.equal(byId(root, 'photo-online').getAttribute('disabled'), null);
    assert.equal(byId(root, 'photo-online').checked, false);
    assert.ok(byId(root, 'photo-helper'));
    assert.deepEqual(photoHelperOptions(origin, true, 'http://127.0.0.1:8787'), { online: true, localServerUrl: 'http://127.0.0.1:8787' });
    assert.deepEqual(photoHelperOptions(origin, false), { online: false, localServerUrl: null });
    unmount();
  }
});
test('unknown and deceptive origins fail closed; configured helpers must remain local', () => {
  for (const href of [undefined, 'file:///app/index.html', 'https://localhost.example.com/', 'https://example.com/?localhost', 'http://[::1]/']) {
    assert.deepEqual(photoHelperOptions(href, true, 'http://localhost:8787'), { online: false, localServerUrl: null });
  }
  assert.equal(photoHelperOptions('http://localhost/', false, '', 'https://third-party.example/').localServerUrl, null);
  assert.equal(photoHelperOptions('http://localhost/', false, 'https://third-party.example/', 'http://localhost:8787').localServerUrl, null);
});
