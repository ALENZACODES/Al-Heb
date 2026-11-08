import test from 'node:test';
import assert from 'node:assert/strict';
import { mount } from '../src/photo/scan.view.js';
import { isLocalHelperUrl } from '../src/photo/engines/local-server.js';
import { newRoot, all } from './pronunciation.dom-helper.js';
const byId = (root, id) => all(root, n => n.getAttribute('id') === id)[0];
test('hosted and local scan never offer the removed online vowel service', () => {
  for (const href of ['https://alef.pages.dev/#/scan', 'http://localhost:8080/']) {
    const root = newRoot(); root.ownerDocument.defaultView = { location: { href } };
    const unmount = mount(root);
    assert.equal(byId(root, 'photo-online'), undefined);
    assert.match(root.textContent, /No online vowel service in this build/);
    assert.ok(byId(root, 'photo-helper'));
    assert.match(root.textContent, /own computer/);
    unmount();
  }
});
test('optional helper accepts only loopback URLs', () => {
  for (const url of ['http://localhost:8787', 'http://127.0.0.1:8787', 'http://[::1]:8787']) assert.equal(isLocalHelperUrl(url), true);
  for (const url of [undefined, 'file:///app', 'https://localhost.example.com', 'https://example.com/?localhost', 'javascript:localhost']) assert.equal(isLocalHelperUrl(url), false);
});
