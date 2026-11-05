import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildPlan, renderMarkdown, priceRow, elevenPlanCost, count, scenarioText, SCENARIOS, CONTINGENCY, load } from '../tools/audio/cost_plan.mjs';
import * as azure from '../tools/audio/tts/azure.mjs';
import * as google from '../tools/audio/tts/google.mjs';
import * as eleven from '../tools/audio/tts/elevenlabs.mjs';

const R = fileURLToPath(new URL('..', import.meta.url));
const { manifest, prices, vocab } = load(R);

test('price file: every row has source + evidence + verified flag; unverified items are listed, not hidden', () => {
  assert.equal(prices.fetchedAt, '2026-11-03');
  for (const [pid, p] of Object.entries(prices.providers)) {
    assert.ok(p.rows.length >= 1, pid);
    for (const r of p.rows) { assert.equal(typeof r.verified, 'boolean'); assert.ok(r.usdPerMillionChars > 0); assert.match(r.source, /^https:\/\//); assert.ok(r.evidence.length > 20); }
  }
  assert.ok(prices.unverified.length >= 3);
  assert.equal(prices.providers.azure.rows.find((r) => r.id === 'neural').caveat.includes('inferred'), true);
});

test('adapter price constants agree with the verified price file', () => {
  assert.equal(azure.pricePerMillionChars, prices.providers.azure.rows.find((r) => r.id === 'neural').usdPerMillionChars);
  assert.equal(google.pricePerMillionChars, prices.providers.google.rows.find((r) => r.id === 'chirp3-hd').usdPerMillionChars);
  assert.equal(eleven.pricePerMillionChars, prices.providers.elevenlabs.rows.find((r) => r.id === 'v3-api').usdPerMillionChars);
});

test('arithmetic: priceRow, free tier, eleven plan search', () => {
  assert.deepEqual(priceRow(2e6, 15, 0), { list: 30, afterFreeTier: 30 });
  assert.deepEqual(priceRow(400000, 15, 500000), { list: 6, afterFreeTier: 0 });
  assert.equal(priceRow(1.5e6, 30, 1e6).afterFreeTier, 15);
  const plans = [{ name: 'A', usdPerMonth: 10, includedCharsV4: 100 }, { name: 'B', usdPerMonth: 15, includedCharsV4: 1000 }];
  assert.deepEqual(elevenPlanCost(250, plans), { plan: 'B', months: 1, cost: 15 });
  assert.deepEqual(elevenPlanCost(50, plans), { plan: 'A', months: 1, cost: 10 });
});

test('plan: israeli only, human-only groups excluded, both voices doubled, contingency applied, tiny costs', () => {
  const plan = buildPlan(manifest, prices, vocab);
  const core = plan.scenarios.find((s) => s.id === 'core');
  const texts = scenarioText(manifest, SCENARIOS[0], 'm');
  assert.equal(core.clipsPerVoice, texts.length);
  assert.equal(core.charsBothVoices.withNiqqud, count(texts).charsWithNiqqud * 2);
  assert.equal(core.charsBothVoicesWithContingency.withNiqqud, Math.ceil(core.charsBothVoices.withNiqqud * (1 + CONTINGENCY)));
  assert.ok(core.charsBothVoices.lettersOnly < core.charsBothVoices.withNiqqud);
  for (const sc of SCENARIOS) for (const g of ['syllable', 'niqqud', 'letter', 'letter-final', 'letter-variant', 'letter-sound', 'letter-variant-sound']) assert.ok(!sc.groups.includes(g), g);
  for (const s of plan.scenarios) for (const r of s.rows) { assert.ok(r.costLow <= r.costHigh); assert.ok(r.costHigh < 100); assert.equal(r.priceVerified, true); }
  assert.ok(plan.scenarios.length >= 2);
});

test('docs/voices/tts-cost-plan.md is current and states nothing was rendered or called', () => {
  const md = renderMarkdown(buildPlan(manifest, prices, vocab), prices);
  assert.equal(fs.readFileSync(path.join(R, 'docs/voices/tts-cost-plan.md'), 'utf8'), md);
  assert.match(md, /No TTS API was called/); assert.match(md, /Israeli tradition only/); assert.match(md, /NOT verified/);
});

test('cost_plan.mjs contains no network code and no provider adapter imports; CLI runs offline', () => {
  const src = fs.readFileSync(path.join(R, 'tools/audio/cost_plan.mjs'), 'utf8');
  assert.ok(!/\bfetch\(/.test(src.replace(/\/\/.*$/gm, '')));
  assert.ok(!/from '\.\/tts\//.test(src) && !/node:https?|node:net/.test(src));
  const r = spawnSync('node', [path.join(R, 'tools/audio/cost_plan.mjs'), '--check'], { encoding: 'utf8', env: { ...process.env, HTTPS_PROXY: 'http://127.0.0.1:1', HTTP_PROXY: 'http://127.0.0.1:1' } });
  assert.equal(r.status, 0, r.stderr);
});
