/**
 * Gender pair cards (gr-tmh-02) and say-as-me / hear-as-you paradigms (gr-jm-02), pure logic.
 * Data: data/curriculum/gender-pairs.json (original sentences, unreviewed) plus the gendered entries of the survival
 * phrasebook (data/corpus/phrasebook.json, "native-speaker-needed"). Audio ids: gp-NN-m / gp-NN-f for authored pairs
 * (Israeli clips, both voices, since 11 November 2026; role-play forms play word/gpar-NN-<speaker><addressee>); phrasebook pairs use the entry id for the masculine form only.
 */
import { loadJSON } from "./data.js";
import { tokenize } from "./fade.js";
import { rng, shuffled } from "./spotit.js";

const clustersOf = (he) => tokenize(he).flatMap((t) => (t.type === "word" ? t.clusters.map((c) => c.text.normalize("NFC")) : []));

/** Indices of letter clusters (letter + marks, counted across the whole string) that differ, for each string (LCS on clusters). */
export function clusterDiff(a, b) {
  const x = clustersOf(a), y = clustersOf(b);
  const dp = Array.from({ length: x.length + 1 }, () => new Array(y.length + 1).fill(0));
  for (let i = x.length - 1; i >= 0; i--) for (let j = y.length - 1; j >= 0; j--)
    dp[i][j] = x[i] === y[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const keepX = new Set(), keepY = new Set();
  let i = 0, j = 0;
  while (i < x.length && j < y.length) {
    if (x[i] === y[j]) { keepX.add(i); keepY.add(j); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++;
  }
  return { a: x.map((_, k) => k).filter((k) => !keepX.has(k)), b: y.map((_, k) => k).filter((k) => !keepY.has(k)) };
}

/** Pair = { id, en, who:"speaker"|"addressee", grammarTag, forms:{m:{he,translit},f:{...}}, differsAt:{m:[],f:[]}, audio:{m:id|null,f:id|null} } */
export function withDiff(p) {
  const d = clusterDiff(p.forms.m.he, p.forms.f.he);
  return { ...p, differsAt: { m: d.a, f: d.b } };
}

export function buildPairs(file, phrasebook) {
  const authored = (file.pairs || []).map((p) => ({ ...withDiff(p), source: "authored", audio: { m: `${p.id}-m`, f: `${p.id}-f` } }));
  const fromBook = (phrasebook?.entries || []).filter((e) => e.gendered && e.forms?.m?.he && e.forms?.f?.he).map((e) => withDiff({
    id: `pb-${e.id}`, en: e.en, who: /\b(you|your)\b/i.test(e.en) || /to one person/.test(e.en) ? "addressee" : "speaker", grammarTag: "phrasebook",
    forms: { m: { he: e.forms.m.he, translit: e.forms.m.translit }, f: { he: e.forms.f.he, translit: e.forms.f.translit } }, source: "phrasebook", phrasebookId: e.id,
    audio: { m: e.id, f: null } })).filter((p) => p.differsAt.m.length + p.differsAt.f.length > 0);
  return [...authored, ...fromBook];
}

/** Which form to show first: the learner's own (speaker pairs) or the one matching the learner's gender in general. */
export const orderFor = (iAm) => (iAm === "f" ? ["f", "m"] : ["m", "f"]);

/** Quiz questions. type "which": which gender is the form for/said by (listening if `listen(pair, form)` is true, else reading). type "tap": tap the letters that change. */
export function buildQuiz(pairs, { seed = 1, count = 8, listen = () => false } = {}) {
  const rand = rng(seed), qs = [];
  const pick = shuffled(pairs, rand).slice(0, count);
  pick.forEach((p, i) => {
    const form = rand() < 0.5 ? "m" : "f";
    if (i % 2 === 0) qs.push({ id: `q${i + 1}`, type: "which", pairId: p.id, form, mode: listen(p, form) ? "listen" : "read", answer: form });
    else {
      const f = p.differsAt[form].length ? form : form === "m" ? "f" : "m"; // a form with nothing to change (the other one only adds letters) cannot be tapped
      qs.push({ id: `q${i + 1}`, type: "tap", pairId: p.id, form: f, other: f === "m" ? "f" : "m", answer: p.differsAt[f].slice() });
    }
  });
  return qs;
}
export function gradeTap(q, selected) {
  const a = new Set(q.answer), s = new Set(selected);
  return a.size === s.size && [...a].every((x) => s.has(x));
}

// ---- paradigms (say-as-me / hear-as-you)
const ROLES = ["m", "f"];
/** Compose one paradigm for a speaker and addressee gender. varying = indices of parts that depend on a role. */
export function composeParadigm(par, speaker, addressee) {
  const parts = par.parts.map((p) => (p.fixed ? p.fixed : p[p.by === "speaker" ? speaker : addressee]));
  return { speaker, addressee, he: parts.map((p) => p.he).join(" "), translit: parts.map((p) => p.translit).join(" ") };
}
/** gendered[] = {paradigm, speaker, addressee, he, translit} for all four role pairs. */
export function genderedForms(par) {
  return ROLES.flatMap((s) => ROLES.map((a) => ({ paradigm: par.id, ...composeParadigm(par, s, a) })));
}

/** Pair cards, paradigms and composed forms as separate counts. Numbers come from the arrays the page renders. */
export function genderInventory(pairs, paradigms) {
  const list = Array.isArray(pairs) ? pairs : [];
  const pars = Array.isArray(paradigms) ? paradigms : [];
  const authored = list.filter((p) => p.source === 'authored').length;
  const phrasebook = list.filter((p) => p.source === 'phrasebook').length;
  return {
    pairs: list.length, authored, phrasebook, other: list.length - authored - phrasebook,
    paradigms: pars.length, composedForms: pars.reduce((n, p) => n + genderedForms(p).length, 0),
  };
}

/** Learner line. Pair cards are not paradigms and not composed forms. No rounded-up pair claim. */
export function genderCountText(inv) {
  const extra = inv.other ? ` and ${inv.other} from another listed source` : '';
  return `${inv.pairs} pair cards: ${inv.authored} written for this page and ${inv.phrasebook} from the phrasebook${extra}. ${inv.paradigms} paradigms, counted separately from the pair cards, make ${inv.composedForms} composed forms (four speaker and addressee combinations each).`;
}
/** Indices (in the composed part list) that differ between two role pairs: should equal the role-dependent parts. */
export function differingParts(par, s1, a1, s2, a2) {
  return par.parts.map((p, i) => [p, i]).filter(([p]) => !p.fixed && ((p.by === "speaker" && s1 !== s2) || (p.by === "addressee" && a1 !== a2))).map(([, i]) => i);
}

let cached;
export function loadGender() {
  cached ??= (async () => {
    const [file, book] = await Promise.all([loadJSON("data/curriculum/gender-pairs.json"), loadJSON("data/corpus/phrasebook.json")]);
    return { file, pairs: buildPairs(file, book), paradigms: file.paradigms };
  })();
  cached.catch(() => { cached = undefined; });
  return cached;
}
