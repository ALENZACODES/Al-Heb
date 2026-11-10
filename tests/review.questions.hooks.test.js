// The reviewer questions must quote memory-chain hooks from data/letters/memory-chain.json, never from a typed list.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chainQuestions, loadChain, CHAIN_GENERAL_QUESTIONS, HOOK_QUESTIONS } from '../tools/review/questions.mjs';

const chain = loadChain();
const hookOf = (id) => chain.letters.find((l) => l.id === id).sound.hook;

test('chain questions name the current chain hooks', () => {
  const text = Object.fromEntries(CHAIN_GENERAL_QUESTIONS);
  for (const id of ['tsadi', 'resh', 'chet', 'kaf-final', 'tsadi-final', 'alef', 'ayin']) assert.ok(text['chain-hooks'].includes(hookOf(id)), `chain-hooks names ${id} hook`);
  for (const id of ['chet', 'he', 'kaf-final', 'kaf', 'pe-final', 'pe', 'resh']) assert.ok(text['chain-hook-collisions'].includes(hookOf(id)), `collisions names ${id} hook`);
  assert.ok(HOOK_QUESTIONS.chet.includes(hookOf('chet')));
});

test('questions follow the data: a changed hook changes the text', () => {
  const edited = JSON.parse(JSON.stringify(chain));
  const swap = { chet: 'zzchetzz', 'kaf-final': 'zzkaffinalzz', kaf: 'zzkafzz', he: 'zzhezz' };
  for (const l of edited.letters) if (swap[l.id]) l.sound.hook = swap[l.id];
  const q = chainQuestions(edited);
  const all = q.chet + q.general.map((x) => x[1]).join('\n');
  for (const w of Object.values(swap)) assert.ok(all.includes(w), `${w} appears`);
  assert.ok(!all.includes(hookOf('chet')) || hookOf('chet') === 'zzchetzz');
});

test('a missing hook throws instead of printing a stale or blank one', () => {
  const broken = JSON.parse(JSON.stringify(chain));
  broken.letters = broken.letters.filter((l) => l.id !== 'chet');
  assert.throws(() => chainQuestions(broken), /no hook for chet/);
});

test('no retired hook list is typed back into the chain rows', () => {
  const src = readFileSync(new URL('../tools/review/questions.mjs', import.meta.url), 'utf8');
  const chainPart = src.slice(src.indexOf('export function chainQuestions'), src.indexOf('const CHAIN_Q'));
  const chetLine = src.split('\n').find((l) => /^\s*chet:/.test(l));
  for (const stale of ['Chanukah', 'Bach', 'kernel', 'Hanukkah']) {
    assert.ok(!chainPart.includes(stale), `chainQuestions must not hard-code ${stale}`);
    assert.ok(!chetLine.includes(stale), `chet row must not hard-code ${stale}`);
  }
  // every chain hook typed literally inside quotes in the chain builder would be a hard-coded list: none of the 27 current hooks may appear in quotes there
  const hooks = [...new Set(chain.letters.map((l) => l.sound.hook))];
  const literal = hooks.filter((h) => new RegExp(`['"]${h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`).test(chainPart));
  assert.deepEqual(literal, [], 'hooks must come from the data, not literals');
});
