// How well the browser matcher (src/ask/match.js) maps questions to vetted answers, with no server.
// 1. Leave-one-out: 1,500 bank questions, each removed from the index with every exact copy, then matched; right when the matched
//    answer has the same verdict and shares a verse with the question's own vetted answer. 2. The 150 free-form questions (not in the
//    bank), against the vetted pipeline's own answers (eval/independent-150-truth.json). Abstaining ("no vetted answer yet") is never
//    wrong; a confident wrong match is the number that must stay low.
// Usage: node tools/ask-torah/eval/eval_static_match.mjs [minCover]
import { readFileSync } from 'node:fs';
import { buildIndex, match, shardOf, lookup, buildTopics } from '../../../src/ask/match.js';
const root = new URL('../../../', import.meta.url);
const bank = JSON.parse(readFileSync(new URL('data/ask/bank.json', root)));
const shards = Array.from({ length: bank.shards }, (_, n) => JSON.parse(readFileSync(new URL(`data/ask/answers/${String(n).padStart(2, '0')}.json`, root))));
const ans = (id) => shards[shardOf(id, bank.shards)][id];
const refs = (a) => new Set((a?.passages || []).map((p) => p.ref));
const agree = (a, verdict, rs) => a && a.verdict === verdict && (rs.size === 0 ? refs(a).size === 0 : [...refs(a)].some((r) => rs.has(r)));
const minCover = Number(process.argv[2] || 0) || undefined;
const ix = buildIndex(bank.questions);
const topicsFile = JSON.parse(readFileSync(new URL('data/ask/topics.json', root)));
const ctx = { ix, topicIx: buildTopics(topicsFile.topics), rw: topicsFile.rewrite };
let seed = 20261110; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const picks = new Set(); while (picks.size < 1500) picks.add(Math.floor(rnd() * ix.docs.length));
let right = 0, wrong = 0, none = 0, verse = 0; const wrongEx = [];
for (const i of picks) {
  const d = ix.docs[i], key = d.q.toLowerCase();
  const truth = ans(d.a);
  const m = match(ix, d.q, { minCover, skip: (j) => ix.docs[j].q.toLowerCase() === key });
  if (!m || m.verseId) { if (m?.verseId) { if (m.verseId === (truth.passages?.[0] && null)) right++; } if (!m) none++; else verse++; continue; }
  if (m.answerId === d.a || agree(ans(m.answerId), truth.verdict, refs(truth))) right++; else { wrong++; if (wrongEx.length < 12) wrongEx.push(`${d.q}  ->  ${m.question}`); }
}
console.log(`leave-one-out ${picks.size}: right ${right}, wrong ${wrong}, no answer ${none}, shown as the verse itself ${verse}  (answered ${(100 * (right + wrong) / picks.size).toFixed(1)}%, right when answered ${(100 * right / Math.max(1, right + wrong)).toFixed(1)}%)`);
for (const e of wrongEx) console.log('  wrong: ' + e);
const truth150 = JSON.parse(readFileSync(new URL('tools/ask-torah/eval/independent-150-truth.json', root)));
let r2 = 0, w2 = 0, n2 = 0; const w2ex = [], n2ex = [];
for (const t of truth150) {
  const m = lookup(ctx, t.question, t.history || []);
  if (!m || m.verseId) { n2++; if (n2ex.length < 12) n2ex.push(t.question); continue; }
  if (agree(ans(m.answerId), t.verdict, new Set(t.refs))) r2++; else { w2++; if (w2ex.length < 15) w2ex.push(`${t.question}  ->  ${m.question} [${t.verdict} vs ${ans(m.answerId)?.verdict}]`); }
}
console.log(`free-form 150: right ${r2}, wrong ${w2}, no answer ${n2}  (right when answered ${(100 * r2 / Math.max(1, r2 + w2)).toFixed(1)}%)`);
for (const e of w2ex) console.log('  wrong: ' + e);
for (const e of n2ex) console.log('  none: ' + e);
