import test from 'node:test';
import assert from 'node:assert/strict';
import { scanStatusText } from '../src/photo/scan.view.js';

test('R-05: Scan explains the one-time engine download and reading progress in plain words', () => {
  assert.equal(scanStatusText({ status: 'loading tesseract core', progress: 0.4 }), 'Downloading the reading engine (about 5 MB, first use only) 40%');
  assert.equal(scanStatusText({ status: 'loading language traineddata', progress: 1 }), 'Downloading the reading engine (about 5 MB, first use only) 100%');
  assert.equal(scanStatusText({ status: 'initializing api' }), 'Starting the reading engine…');
  assert.equal(scanStatusText({ status: 'recognizing text', progress: 0.5 }), 'Reading the Hebrew 50%');
  assert.equal(scanStatusText({}), '');
});
