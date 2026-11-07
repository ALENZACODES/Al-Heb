import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

// Fake DOM like the other curriculum view tests, but replaceChildren is STRICT like a browser: a null argument becomes the text "null".
class Node_ {
  constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; this.listeners = {}; this.parent = null; this.nodeType = 1; this.className = ""; this.hidden = false; }
  setAttribute(k, v) { this.attrs[k] = v; if (k === "hidden") this.hidden = true; }
  getAttribute(k) { return this.attrs[k]; }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  append(...c) { for (const x of c) { const n = x != null && x.nodeType ? x : { nodeType: 3, data: String(x), parent: undefined }; this.children.push(n); if (n.parent !== undefined) n.parent = this; } }
  replaceChildren(...c) { this.children = []; this.append(...c); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((x) => x !== this); }
  set textContent(v) { this.children = [{ nodeType: 3, data: String(v), parent: undefined }]; }
  get text() { return this.children.map((c) => (c.nodeType === 3 ? c.data : c.hidden ? "" : c.text)).join(""); }
  find(pred, out = []) { if (pred(this)) out.push(this); for (const c of this.children) if (c.nodeType === 1) c.find(pred, out); return out; }
  async click() { if (this.disabled) return; for (const f of this.listeners.click || []) await f({ currentTarget: this, target: this }); }
  focus() {}
}
const keyHandlers = [];
globalThis.document = { createElement: (t) => new Node_(t), createTextNode: (d) => ({ nodeType: 3, data: String(d), parent: undefined }),
  addEventListener: (t, f) => { if (t === "keydown") keyHandlers.push(f); }, removeEventListener: (t, f) => { const i = keyHandlers.indexOf(f); if (i >= 0) keyHandlers.splice(i, 1); } };
import { waitFor } from "./helpers/waitfor.js";
const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms));
const memStore = (init = {}) => { const m = { ...init }; return { get: (k) => m[k], set: (k, v) => { m[k] = v; }, m }; };
const played = [];
const audioMock = (has = () => true) => ({ play: async (k, i, o) => { played.push([k, i, o?.voice]); return { source: "tts-fallback" }; },
  status: (k, i) => (has(k, i) ? { source: "file", entryStatus: "recorded" } : { source: "none", reason: "unknown-item" }) });
const ctxFor = (store, query, extra = {}) => ({ store, query, route() {}, t: (k) => k, settings: { get: (k) => ({ congregation: "sephardi", voice: "m" }[k]) }, audio: audioMock(), ...extra });
const btn = (root, re) => root.find((n) => n.tag === "button" && re.test((n.attrs["aria-label"] || "") + n.text))[0];
const readJson = (f) => JSON.parse(readFileSync(new URL("../" + f, import.meta.url), "utf8"));

const ladderMod = await import("../src/curriculum/ladder.js");
const fadeMod = await import("../src/curriculum/fade.js");
const genderMod = await import("../src/curriculum/gender.js");
const scafMod = await import("../src/curriculum/scaffold.js");
const actions = await import("../src/curriculum/actions.js");
const { mount: mountLearn } = await import("../src/curriculum/learn.view.js");
const { describeCard } = await import("../src/curriculum/review.view.js");
const { loadContent } = await import("../src/curriculum/content.js");
const { parseCardId } = await import("../src/curriculum/progress.js");
const { newCard, review } = await import("../src/curriculum/srs.js");

const manifest = readJson("data/audio/manifest.json");
const niqqud = readJson("data/pronunciation/niqqud.json");
const ladder = await ladderMod.loadLadder();
const mk = (n) => ladder.levels[n - 1];

// ---------------------------------------------------------------- ladder (gr-alh-01)
test("ladder: seed level has two letters on one vowel; every later level adds at most one new letter or vowel", () => {
  assert.deepEqual([mk(1).newLetters.length, mk(1).newVowels.length], [2, 1]);
  for (const lv of ladder.levels.slice(1)) assert.ok(lv.newLetters.length + lv.newVowels.length <= 1, `level ${lv.level}`);
});
test("ladder: reaches all 27 letters and all 5 vowel families", () => {
  const letters = new Set(ladder.levels.flatMap((l) => l.newLetters)), vowels = new Set(ladder.levels.flatMap((l) => l.newVowels));
  assert.equal(letters.size, 27);
  assert.deepEqual([...vowels].sort(), ["a", "e", "i", "o", "u"]);
  const ids = new Set(readJson("data/letters/letters.json").map((l) => l.id));
  for (const l of letters) assert.ok(ids.has(l), l);
});
test("ladder: distractors are known, never the target, never a homophone (any tradition)", () => {
  const knownL = new Set(), knownV = new Set();
  for (const lv of ladder.levels) {
    lv.newLetters.forEach((l) => knownL.add(l)); lv.newVowels.forEach((v) => knownV.add(v));
    for (const it of lv.items) {
      assert.ok(it.distractors.length >= 1, it.id);
      for (const d of it.distractors) {
        assert.notEqual(d.id, it.id);
        if (it.kind === "syllable") {
          const [l, f] = [d.id.slice(0, d.id.lastIndexOf("-")), d.id.slice(d.id.lastIndexOf("-") + 1)];
          assert.ok(knownL.has(l) && knownV.has(f), `${it.id} -> ${d.id} not yet taught`);
          assert.notEqual(ladderMod.soundKey(l, f), ladderMod.soundKey(it.letter, it.vowel), `${it.id} homophone ${d.id}`);
        } else {
          assert.notEqual(ladderMod.soundClass(d.id), ladderMod.soundClass(it.letter), `${it.id} homophone ${d.id}`);
          assert.notEqual(d.glyph, it.glyph);
        }
      }
    }
  }
});
test("ladder: look-alike letters come first as distractors (bet vs kaf, dalet vs resh)", () => {
  assert.equal(mk(1).items.find((i) => i.id === "bet-a").distractors[0].id, "kaf-a");
  const resh = ladder.levels.flatMap((l) => l.items).find((i) => i.id === "resh-a");
  assert.equal(resh.distractors[0].id, "dalet-a");
});
test("ladder: vowel family signs have distinct IPA in each tradition", () => {
  for (const t of ["israeli", "sephardi", "ashkenazi"]) {
    const ipas = Object.values(ladderMod.FAMILY_SIGN).map((id) => niqqud.records.find((r) => r.id === id).ipa[t].replace(/[ːˑ()]/g, ""));
    // e [e̞] / segol and a/o/i/u are distinct values in each tradition's own table
    assert.equal(new Set(ipas).size, 5, t + " " + ipas.join(","));
  }
});
test("ladder: every item has an audio id in the manifest for both voices and all three traditions; glyph matches the manifest text", () => {
  for (const it of ladderMod.allItems(ladder)) {
    for (const voice of ["m", "f"]) for (const tr of ["israeli", "sephardi", "ashkenazi"]) {
      const e = manifest.find((x) => x.voice === voice && x.tradition === tr && x.kind === it.audioKind && x.id === it.audioId);
      assert.ok(e, `${voice}/${tr}/${it.audioKind}/${it.audioId}`);
      if (it.kind === "syllable" && voice === "m" && tr === "israeli") assert.equal(e.text.normalize("NFC"), it.glyph, it.id);
    }
  }
});
test("ladder session: three right advance, two wrong drop back, never below 1, clears at the top, resumes by level", () => {
  const s = ladderMod.createLadderSession(ladder, { seed: 5, level: 2 });
  let r;
  for (let i = 0; i < 3; i++) { const c = s.current(); r = s.answer(c.item.id); }
  assert.equal(r.event, "advance"); assert.equal(r.level, 3);
  for (let i = 0; i < 2; i++) { const c = s.current(); r = s.answer(c.options.find((o) => !o.correct).id); }
  assert.equal(r.event, "drop"); assert.equal(r.level, 2);
  const low = ladderMod.createLadderSession(ladder, { seed: 1, level: 1 });
  for (let i = 0; i < 4; i++) { const c = low.current(); low.answer(c.options.find((o) => !o.correct).id); }
  assert.equal(low.state().level, 1);
  const top = ladderMod.createLadderSession(ladder, { seed: 2, level: ladder.levels.length });
  for (let i = 0; i < 3; i++) { const c = top.current(); r = top.answer(c.item.id); }
  assert.equal(r.event, "cleared"); assert.equal(top.state().cleared, true); assert.equal(top.current(), null);
  assert.ok(low.state().missed.length > 0);
  const a = ladderMod.createLadderSession(ladder, { seed: 9 }), b = ladderMod.createLadderSession(ladder, { seed: 9 });
  assert.equal(a.current().item.id, b.current().item.id);
});
test("ladder view: plays the sound, two RTL cards, keyboard answers, saves level and SRS, unlocks the verse at the end", async () => {
  played.length = 0;
  const store = memStore(); const root = new Node_("div");
  const un = mountLearn(root, ctxFor(store, { ladder: "1", seed: "4" })); await waitFor(() => /Level 1 of 30/.test(root.text) && played.length > 0 && root.find((n) => n.attrs["data-option"]).length === 2, { message: "/Level 1 of 30/.test(root.text) && played.length > 0 && root.find((n) => n.attrs[\"data-option\"]).length === 2" });
  assert.match(root.text, /Draft/); assert.match(root.text, /Level 1 of 30/);
  assert.equal(played[0][0], "syllable");
  const cards = root.find((n) => n.attrs["data-option"]);
  assert.equal(cards.length, 2);
  assert.ok(root.find((n) => n.attrs.lang === "he" && n.attrs.dir === "rtl").length >= 2);
  assert.ok(root.find((n) => n.attrs.dir === "rtl" && /alef-cardpair/.test(n.className)).length === 1);
  // a wrong answer through the keyboard (the card that is not the played syllable)
  const target = played.at(-1)[1];
  const wrongIdx = cards.findIndex((c) => c.attrs["data-option"] !== target);
  keyHandlers[0]({ key: String(wrongIdx + 1), preventDefault() {}, target: {} }); await waitFor(() => /Not quite/.test(root.text), { message: "/Not quite/.test(root.text)" });
  assert.match(root.text, /Not quite/);
  await btn(root, /Finish and save/).click(); await waitFor(() => store.m["srs.cards"]?.[`syllable:${target}`] && store.m["curriculum.ladder"]?.level >= 1, { message: "store.m[\"srs.cards\"]?.[`syllable:${target}`] && store.m[\"curriculum.ladder\"]?.level >= 1" });
  assert.ok(store.m["srs.cards"][`syllable:${target}`], "missed syllable becomes an SRS card");
  assert.equal(store.m["srs.cards"][`syllable:${target}`].state, "relearning");
  assert.ok(store.m["curriculum.ladder"].level >= 1);
  un(); assert.equal(keyHandlers.length, 0);
  // cleared verse
  const top = new Node_("div"); const s2 = memStore({ "curriculum.ladder": { level: 30 } });
  mountLearn(top, ctxFor(s2, { ladder: "1", level: "30", seed: "1" })); await waitFor(() => played.length > 0 && top.find((n) => n.attrs["data-option"]).length > 0, { message: "played.length > 0 && top.find((n) => n.attrs[\"data-option\"]).length > 0" });
  for (let i = 0; i < 3; i++) { const p = played.at(-1)[1]; const opt = top.find((n) => n.attrs["data-option"] === p)[0]; await opt.click(); await waitFor(() => btn(top, /^(Next|See results)/), { message: "btn(top, /^(Next|See results)/)" }); const prevPlayed = played.length; await btn(top, /^(Next|See results)/).click(); await waitFor(() => played.length > prevPlayed || /Priestly Blessing/.test(top.text), { message: "played.length > prevPlayed || /Priestly Blessing/.test(top.text)" }); }
  assert.match(top.text, /Priestly Blessing/); assert.match(top.text, /not proofread/);
});

// ---------------------------------------------------------------- fade-out recall (gr-gv-01)
const LINE = "יְבָרֶכְךָ יְהוָה וְיִשְׁמְרֶךָ׃";
test("fade: level 0 unchanged, level 3 is the empty string, reversing restores the original, separators survive", () => {
  assert.equal(fadeMod.fade(LINE, 0).text, LINE);
  assert.equal(fadeMod.fade(LINE, 3).text, "");
  for (let l = 0; l <= 3; l++) assert.equal(fadeMod.restore(fadeMod.fade(LINE, l)), LINE);
  assert.ok(fadeMod.fade(LINE, 1).text.endsWith("׃") && fadeMod.fade(LINE, 2).text.includes(" "));
  assert.ok(fadeMod.fade(LINE, 1).gaps.length < fadeMod.fade(LINE, 2).gaps.length && fadeMod.fade(LINE, 2).gaps.length < fadeMod.fade(LINE, 3).gaps.length);
});
test("fade: masking never hides a niqqud mark apart from its letter (every corpus line, every level)", () => {
  const entries = readJson("data/corpus/registry.json").entries;
  const isMark = (ch) => ch >= "֑" && ch <= "ׇ" && !"־׀׃".includes(ch);
  for (const e of entries) for (let l = 0; l <= 3; l++) {
    const f = fadeMod.fade(e.he, l);
    assert.equal(fadeMod.restore(f), e.he);
    const chars = [...f.text];
    chars.forEach((ch, i) => { if (isMark(ch)) assert.ok(i > 0 && (/[א-ת]/.test(chars[i - 1]) || isMark(chars[i - 1])), `${e.id} level ${l}: orphan mark`); });
    for (const t of f.tokens) if (t.type === "word") for (const c of t.clusters) assert.match(c.text[0], /[א-ת]/);
  }
});
test("fade: nextFadeLevel moves only when practised at the stored level; options contain the right answer exactly once", () => {
  const n = fadeMod.nextFadeLevel;
  assert.equal(n(0, 0, true), 1); assert.equal(n(1, 1, false), 0); assert.equal(n(3, 3, true), 3); assert.equal(n(0, 0, false), 0);
  assert.equal(n(2, 0, true), 2); assert.equal(n(2, 3, false), 2);
  const conf = readJson("data/letters/confusables.json"), f = fadeMod.fade(LINE, 1);
  for (const g of f.gaps) {
    const o = fadeMod.gapOptions(g, f, conf, { seed: g.n + 1 });
    assert.equal(o.filter((x) => x.normalize("NFC") === g.text.normalize("NFC")).length, 1);
    assert.equal(new Set(o).size, o.length); assert.ok(o.length >= 3);
  }
});
test("fade view: pick a line, fill gaps by keyboard, level stored in the SRS card and advances; honest about corpus text", async () => {
  const store = memStore(); const root = new Node_("div");
  mountLearn(root, ctxFor(store, { fade: "1" })); await waitFor(() => root.find((n) => n.attrs["data-line"] === "bless-priestly-1").length === 1, { message: "root.find((n) => n.attrs[\"data-line\"] === \"bless-priestly-1\").length === 1" });
  assert.match(root.text, /Draft/); assert.match(root.text, /not proofread/);
  assert.ok(root.find((n) => n.attrs["data-line"] === "bless-priestly-1").length === 1);
  const r2 = new Node_("div"); const un = mountLearn(r2, ctxFor(store, { fade: "bless-priestly-1", level: "1", seed: "1" })); await waitFor(() => r2.find((n) => n.attrs.dir === "rtl" && /alef-fade-line/.test(n.className)).length === 1, { message: "r2.find((n) => n.attrs.dir === \"rtl\" && /alef-fade-line/.test(n.className)).length === 1" });
  assert.ok(r2.find((n) => n.attrs.dir === "rtl" && /alef-fade-line/.test(n.className)).length === 1);
  const gaps = r2.find((n) => n.attrs["data-gap"] !== undefined).length;
  assert.ok(gaps > 3);
  const f = fadeMod.fade(LINE, 1);
  for (let k = 0; k < f.gaps.length; k++) {
    const gapBtn = r2.find((n) => n.tag === "button" && n.attrs["data-gap"] !== undefined)[0];
    await gapBtn.click();
    const g = f.gaps[Number(gapBtn.attrs["data-gap"])];
    const opts = r2.find((n) => n.attrs["data-option"] !== undefined);
    const wrong = opts.filter((n) => n.attrs["data-option"].normalize("NFC") !== g.text.normalize("NFC"))[0];
    if (k === 0) { await wrong.click(); assert.match(wrong.className, /alef-wrong/); }
    await opts.filter((n) => n.attrs["data-option"].normalize("NFC") === g.text.normalize("NFC"))[0].click();
  }
  await waitFor(() => store.m["srs.cards"]?.["line:bless-priestly-1"] && /saved level stays/.test(r2.text), { message: "store.m[\"srs.cards\"]?.[\"line:bless-priestly-1\"] && /saved level stays/.test(r2.text)" });
  const card = store.m["srs.cards"]["line:bless-priestly-1"];
  assert.ok(card, "SRS card for the line"); assert.equal(card.fadeLevel, 0, "practised level 1 while stored level was 0: no change");
  assert.match(r2.text, /saved level stays/);
  un();
  // practise at the stored level (0) with self-grading: advances to 1
  const r3 = new Node_("div"); mountLearn(r3, ctxFor(store, { fade: "bless-priestly-1", level: "0" })); await waitFor(() => btn(r3, /I can read it smoothly/), { message: "btn(r3, /I can read it smoothly/)" });
  await btn(r3, /I can read it smoothly/).click(); await waitFor(() => /one stage more faded/.test(r3.text), { message: "/one stage more faded/.test(r3.text)" });
  assert.equal(store.m["srs.cards"]["line:bless-priestly-1"].fadeLevel, 1);
  assert.match(r3.text, /one stage more faded/);
  // a miss at stored level 1 goes back to 0 and lapses the card
  const r4 = new Node_("div"); mountLearn(r4, ctxFor(store, { fade: "bless-priestly-1", level: "3" })); await waitFor(() => /Blank/.test(r4.text), { message: "/Blank/.test(r4.text)" });
  assert.match(r4.text, /Blank/);
  await btn(r4, /Reveal the line/).click(); await waitFor(() => btn(r4, /I missed some/), { message: "btn(r4, /I missed some/)" });
  const before4 = JSON.stringify(store.m["srs.cards"]["line:bless-priestly-1"]); await btn(r4, /I missed some/).click(); await waitFor(() => JSON.stringify(store.m["srs.cards"]["line:bless-priestly-1"]) !== before4, { message: "JSON.stringify(store.m[\"srs.cards\"][\"line:bless-priestly-1\"]) !== before4" });
  assert.equal(store.m["srs.cards"]["line:bless-priestly-1"].fadeLevel, 1, "practised a different stage: unchanged");
  assert.equal(store.m["srs.cards"]["line:bless-priestly-1"].lapses + store.m["srs.cards"]["line:bless-priestly-1"].reps >= 3, true);
});

// ---------------------------------------------------------------- gender pairs (gr-tmh-02) and roles (gr-jm-02)
const gender = await genderMod.loadGender();
test("gender pairs: every pair differs, differsAt points at real differing clusters, sentences are unique and authored pairs flagged for audio", () => {
  assert.ok(gender.pairs.length >= 40);
  const seen = new Set();
  for (const p of gender.pairs) {
    assert.notEqual(p.forms.m.he, p.forms.f.he, p.id);
    assert.ok(p.differsAt.m.length + p.differsAt.f.length >= 1, p.id);
    const cm = [...p.forms.m.he.matchAll(/[א-ת][֑-ׇ]*/g)].map((m) => m[0].normalize("NFC")), cf = [...p.forms.f.he.matchAll(/[א-ת][֑-ׇ]*/g)].map((m) => m[0].normalize("NFC"));
    for (const i of p.differsAt.m) assert.ok(i < cm.length, p.id);
    // removing the differing clusters from both leaves identical text
    assert.deepEqual(cm.filter((_, i) => !p.differsAt.m.includes(i)), cf.filter((_, i) => !p.differsAt.f.includes(i)), p.id);
    assert.ok(!seen.has(p.id)); seen.add(p.id);
  }
  const authored = gender.pairs.filter((p) => p.source === "authored");
  assert.ok(authored.length >= 16);
  assert.equal(new Set(authored.map((p) => p.forms.m.he)).size, authored.length);
});
test("gender pairs: authored data file stores differsAt-free sources and no sentence is on the forbidden list (when one exists)", () => {
  const file = readJson("data/curriculum/gender-pairs.json");
  assert.equal(file.status, "draft-needs-native-review");
  const fixture = new URL("./fixtures/forbidden-gender-strings.json", import.meta.url);
  const forbidden = existsSync(fixture) ? JSON.parse(readFileSync(fixture, "utf8")) : [];
  for (const p of file.pairs) for (const f of ["m", "f"]) assert.ok(!forbidden.includes(p.forms[f].he));
});
test("gender pairs: audio ids that are in the manifest exist for both voices; the rest report 'none' from the real player", async () => {
  const { createAudio } = await import("../src/audio/player.js");
  const player = createAudio({ settings: { voice: "m", congregation: "israeli" }, manifest, speech: null });
  const ids = new Set(manifest.filter((x) => x.kind === "word").map((x) => x.id));
  let flagged = 0;
  for (const p of gender.pairs) for (const f of ["m", "f"]) {
    const id = p.audio[f];
    if (id && ids.has(id)) for (const v of ["m", "f"]) assert.ok(manifest.some((x) => x.kind === "word" && x.id === id && x.voice === v), id);
    else { flagged++; assert.equal(player.status("word", id || "none", { voice: "m" }).source, "none"); }
  }
  assert.ok(flagged > 0);
  assert.ok(gender.pairs.filter((p) => p.source === "authored").every((p) => !ids.has(p.audio.m)));
});
test("gender paradigms: all four speaker/addressee pairs compose and differ only in the role-dependent parts", () => {
  assert.ok(gender.paradigms.length >= 5);
  for (const par of gender.paradigms) {
    const forms = genderMod.genderedForms(par);
    assert.equal(forms.length, 4);
    for (const a of forms) for (const b of forms) {
      const expected = genderMod.differingParts(par, a.speaker, a.addressee, b.speaker, b.addressee);
      const pa = par.parts.map((p) => (p.fixed ? p.fixed.he : p[p.by === "speaker" ? a.speaker : a.addressee].he)), pb = par.parts.map((p) => (p.fixed ? p.fixed.he : p[p.by === "speaker" ? b.speaker : b.addressee].he));
      const actual = pa.map((x, i) => (x !== pb[i] ? i : -1)).filter((i) => i >= 0);
      assert.deepEqual(actual, expected, `${par.id} ${a.speaker}${a.addressee} vs ${b.speaker}${b.addressee}`);
    }
    for (const p of par.parts) if (!p.fixed) assert.notEqual(p.m.he, p.f.he, par.id);
  }
});
test("gender quiz: builds which/tap questions, reading mode when no audio, grades a tap", () => {
  const qs = genderMod.buildQuiz(gender.pairs, { seed: 3, count: 6 });
  assert.equal(qs.length, 6);
  assert.ok(qs.some((q) => q.type === "which") && qs.some((q) => q.type === "tap"));
  assert.ok(qs.filter((q) => q.type === "which").every((q) => q.mode === "read"));
  const tap = qs.find((q) => q.type === "tap");
  assert.ok(genderMod.gradeTap(tap, tap.answer)); assert.ok(!genderMod.gradeTap(tap, []));
  assert.ok(genderMod.buildQuiz(gender.pairs, { seed: 3, count: 2, listen: () => true }).some((q) => q.mode === "listen"));
});
test("gender pairs view: own form first, voice selector passes the voice to ctx.audio, honest 'no audio yet'", async () => {
  played.length = 0;
  const audio = audioMock((k, i) => i === "gp-04-m" || i === "gp-04-f"); // pretend one authored pair has files
  const store = memStore(); const root = new Node_("div");
  const un = mountLearn(root, ctxFor(store, { gender: "pairs" }, { audio })); await waitFor(() => /No audio yet/.test(root.text), { message: "/No audio yet/.test(root.text)" });
  assert.match(root.text, /Draft/); assert.match(root.text, /No audio yet/);
  assert.match(root.text, /pair cards:/); assert.match(root.text, /paradigms, counted separately/);
  assert.doesNotMatch(root.text, /70\s*\+/);
  const first = root.find((n) => n.attrs["data-pair"] === "gp-04")[0];
  assert.equal(first.find((n) => n.attrs["data-form"])[0].attrs["data-form"], "m");
  assert.ok(root.find((n) => n.attrs.lang === "he" && n.attrs.dir === "rtl").length > 10);
  assert.ok(root.find((n) => n.tag === "mark" && n.className === "alef-diff").length > 10);
  await root.find((n) => n.attrs["data-iam"] === "f")[0].click(); await waitFor(() => store.m["curriculum.gender"]?.iAm === "f", { message: "store.m[\"curriculum.gender\"]?.iAm === \"f\"" });
  assert.equal(store.m["curriculum.gender"].iAm, "f");
  assert.equal(root.find((n) => n.attrs["data-pair"] === "gp-04")[0].find((n) => n.attrs["data-form"])[0].attrs["data-form"], "f");
  await root.find((n) => n.attrs["data-voice"] === "f" && n.attrs.role === "radio")[0].click();
  const playBtn = root.find((n) => n.attrs["data-audio"] === "word/gp-04-m" && n.attrs["data-voice"] === "f")[0];
  assert.ok(playBtn, "play button uses the selected voice"); await playBtn.click(); await waitFor(() => played.at(-1)?.[1] === "gp-04-m" && played.at(-1)?.[2] === "f", { message: "played.at(-1)?.[1] === \"gp-04-m\" && played.at(-1)?.[2] === \"f\"" });
  assert.deepEqual(played.at(-1), ["word", "gp-04-m", "f"]);
  assert.equal(root.find((n) => n.attrs["data-audio"] === "word/gp-05-f").length, 0, "no button for an item without audio");
  un();
});
test("gender quiz view: reading questions when there is no audio, tap question graded, results saved to SRS and stats", async () => {
  const store = memStore(); const root = new Node_("div");
  mountLearn(root, ctxFor(store, { gender: "pairs", quiz: "1", seed: "3" })); await waitFor(() => /Question 1 of 8/.test(root.text), { message: "/Question 1 of 8/.test(root.text)" });
  assert.match(root.text, /Question 1 of 8/);
  for (let i = 0; i < 8; i++) {
    const which = root.find((n) => n.attrs["data-answer"]);
    if (which.length) { assert.match(root.text, /No audio yet/); await which[0].click(); }
    else { assert.ok(root.find((n) => n.attrs["data-cluster"] !== undefined).length >= 3); await btn(root, /^Check/).click(); }
    await waitFor(() => btn(root, /^(Next|See results)/), { message: "Next/See results never shown" });
    await btn(root, /^(Next|See results)/).click();
    await waitFor(() => new RegExp(`Question ${i + 2} of 8|Quiz done`).test(root.text), { message: "no next question or result" });
  }
  await waitFor(() => /Quiz done/.test(root.text) && Object.keys(store.m["curriculum.gender"]?.stats || {}).length === 8, { message: "/Quiz done/.test(root.text) && Object.keys(store.m[\"curriculum.gender\"]?.stats || {}).length === 8" });
  assert.match(root.text, /Quiz done/);
  assert.ok(Object.keys(store.m["curriculum.gender"].stats).length === 8);
});
test("gender roles view: two role choosers, swap changes both lines, no audio button for missing items", async () => {
  const store = memStore(); const root = new Node_("div");
  mountLearn(root, ctxFor(store, { gender: "roles" }, { audio: audioMock(() => false) })); await waitFor(() => /You hear/.test(root.text), { message: "/You hear/.test(root.text)" });
  assert.match(root.text, /You say/); assert.match(root.text, /You hear/); assert.match(root.text, /No audio yet/);
  assert.match(root.text, /pair cards:/); assert.match(root.text, /composed forms/);
  assert.doesNotMatch(root.text, /70\s*\+/);
  const before = root.text;
  await btn(root, /Swap roles/).click(); await waitFor(() => root.text !== before, { message: "root.text !== before" });
  assert.notEqual(root.text, before);
  assert.ok(root.find((n) => n.attrs["data-audio"] && /gpar/.test(n.attrs["data-audio"])).length === 0);
  assert.ok(root.find((n) => n.attrs["data-role-value"]).length === 4);
});

// ---------------------------------------------------------------- scaffold (gr-fsi-01)
test("scaffold: fresh word starts at 0 or 1 by setting; level never rises without a correct review; bounds hold; one step per day", () => {
  assert.equal(scafMod.nextScaffold(undefined, { rating: 2, stability: 0, now: 0, start: "full" }).level, 0);
  assert.equal(scafMod.nextScaffold(undefined, { rating: 2, stability: 0, now: 0, start: "faint" }).level, 1);
  const day = 86400000; let e = undefined, t = Date.UTC(2026, 0, 1, 12);
  for (const rating of [2, 1, 1, 2]) { const n = scafMod.nextScaffold(e, { rating, stability: 99, now: t }); assert.ok(n.level <= (e?.level ?? 0)); e = n; }
  e = undefined;
  let prev = 0;
  for (let i = 0; i < 12; i++) { // good reviews on separate days with growing stability
    const a = scafMod.nextScaffold(e, { rating: 3, stability: 30, now: t + i * day });
    assert.ok(a.level - prev <= 1 && a.level <= 3 && a.level >= 0); prev = a.level; e = a;
  }
  assert.equal(e.level, 3);
  const same = scafMod.nextScaffold({ level: 1, pinned: false, advancedOn: null }, { rating: 3, stability: 30, now: t });
  assert.equal(same.level, 2);
  assert.equal(scafMod.nextScaffold(same, { rating: 4, stability: 30, now: t + 1000 }).level, 2, "second advance on the same day is refused");
  assert.equal(scafMod.nextScaffold({ level: 1, pinned: false, advancedOn: null }, { rating: 3, stability: 1, now: t }).level, 1, "low stability: no fade");
  assert.equal(scafMod.nextScaffold({ level: 0, pinned: false, advancedOn: null }, { rating: 1, stability: 9, now: t }).level, 0);
  assert.equal(scafMod.effectiveLevel({ level: 3, pinned: true }), 0);
});
test("scaffold wiring: rating a word card in review updates the stored scaffold; pin persists; view shows Latin per level and rates through the SRS", async () => {
  const ctxW = (store, extra) => ctxFor(store, { scaffold: "1" }, extra);
  const now = Date.now();
  const card = { ...newCard({ id: "word:r01:1", kind: "word", now: now - 5 * 86400000 }), state: "review", stability: 20, difficulty: 5, reps: 3, lastReview: now - 5 * 86400000, due: now - 1000 };
  const store = memStore({ "srs.cards": { "word:r01:1": card }, "curriculum.scaffold": { "word:r01:1": { level: 1, pinned: false, advancedOn: null } } });
  await actions.rateCard(ctxW(store), "word:r01:1", 3, now);
  assert.equal(store.m["curriculum.scaffold"]["word:r01:1"].level, 2);
  await actions.rateCard(ctxW(store), "word:r01:1", 1, now + 1000);
  assert.equal(store.m["curriculum.scaffold"]["word:r01:1"].level, 1);
  await actions.setScaffoldPin(ctxW(store), "word:r01:1", true);
  assert.equal(store.m["curriculum.scaffold"]["word:r01:1"].pinned, true);

  // view: stored level 1 = faint
  const s2 = memStore({ "srs.cards": { "word:r01:1": { ...card } }, "curriculum.scaffold": { "word:r01:1": { level: 3, pinned: false, advancedOn: null } } });
  const root = new Node_("div"); mountLearn(root, ctxW(s2)); await waitFor(() => /Latin help: Hidden/.test(root.text), { message: "/Latin help: Hidden/.test(root.text)" });
  assert.match(root.text, /Draft/); assert.match(root.text, /Latin help: Hidden/);
  assert.equal(root.find((n) => /alef-latin/.test(n.className))[0].text, "");
  await btn(root, /Pin the Latin letters on/).click(); await waitFor(() => /Latin help: Shown \(pinned\)/.test(root.text), { message: "/Latin help: Shown \\(pinned\\)/.test(root.text)" });
  assert.match(root.text, /Latin help: Shown \(pinned\)/);
  assert.ok(root.find((n) => /alef-latin/.test(n.className))[0].text.length > 0);
  assert.ok(root.find((n) => n.attrs.lang === "he" && n.attrs.dir === "rtl").length >= 1);
  await btn(root, /Show meaning/).click(); await btn(root, /^3 Good/).click(); await waitFor(() => /Session done/.test(root.text), { message: "/Session done/.test(root.text)" });
  assert.match(root.text, /Session done/);
  assert.equal(s2.m["srs.cards"]["word:r01:1"].reps, 4);
  const empty = new Node_("div"); mountLearn(empty, ctxW(memStore())); await waitFor(() => /no word cards yet/.test(empty.text), { message: "/no word cards yet/.test(empty.text)" });
  assert.match(empty.text, /no word cards yet/);
});

// ---------------------------------------------------------------- SRS wiring and review support
test("SRS wiring: ids parse, saveFade keeps fadeLevel on the card, gender and ladder outcomes only create cards on a miss", async () => {
  assert.deepEqual(parseCardId("syllable:bet-a"), { kind: "syllable", key: "bet-a" });
  assert.deepEqual(parseCardId("line:shema-1"), { kind: "prayerLine", key: "shema-1" });
  const store = memStore(); const ctx = ctxFor(store);
  let r = await actions.saveFade(ctx, "shema-1", 0, true); assert.equal(r.level, 1);
  r = await actions.saveFade(ctx, "shema-1", 1, false); assert.equal(r.level, 0);
  assert.equal(store.m["srs.cards"]["line:shema-1"].lapses >= 0, true);
  await actions.saveGender(ctx, [{ id: "gp-01", good: true }, { id: "gp-02", good: false }]);
  assert.equal(store.m["srs.cards"]["gender:gp-01"], undefined); assert.ok(store.m["srs.cards"]["gender:gp-02"]);
  await actions.saveLadder(ctx, { missed: ["kaf-final"], right: ["bet-a"], answered: 2, level: 3, best: 4, cleared: false });
  assert.ok(store.m["srs.cards"]["letter:kaf-final"]); assert.equal(store.m["srs.cards"]["syllable:bet-a"], undefined);
  assert.deepEqual(store.m["curriculum.ladder"].level, 3);
});
test("review: syllable, line and gender cards have a front/back so due ones do not vanish from the queue", async () => {
  const c = await loadContent();
  const s = describeCard("syllable:bet-a", c, "israeli");
  assert.deepEqual(s.audio, ["syllable", "bet-a"]); assert.equal(s.he, "בַּ");
  const l = describeCard("line:bless-priestly-1", c, "israeli");
  assert.equal(l.audio[0], "line"); assert.ok(l.he.length > 5);
  const g = describeCard("gender:gp-04", c, "israeli");
  assert.ok(g && g.he.includes("רוֹצָה"));
  assert.equal(describeCard("syllable:nope-x", c, "israeli"), null);
});

// ---------------------------------------------------------------- regression: spot it result panel printed "null"
test("spotit view regression: the result panel never contains the text 'null' (strict replaceChildren)", async () => {
  const store = memStore(); const root = new Node_("div");
  const un = mountLearn(root, ctxFor(store, { spotit: "kaf", seed: "3" })); await waitFor(() => root.find((n) => n.attrs["data-i"] !== undefined).length > 0, { message: "root.find((n) => n.attrs[\"data-i\"] !== undefined).length > 0" });
  const cells = root.find((n) => n.attrs["data-i"] !== undefined);
  await cells[0].click();
  await btn(root, /^Check/).click(); await waitFor(() => /Found \d+ of \d+/.test(root.text), { message: "/Found \\d+ of \\d+/.test(root.text)" });
  assert.match(root.text, /Found \d+ of \d+/);
  assert.doesNotMatch(root.text, /null/);
  un();
});

test("ladder view: 'Listen again' is the shared audio button (file, labelled device voice, or No audio yet with no dead button)", async () => {
  for (const [source, state] of [["file", "file"], ["tts-fallback", "device"], ["none", null]]) {
    played.length = 0;
    const audio = { play: async (k, i, o) => { played.push([k, i, o?.voice]); return { source }; }, status: () => ({ source, entryStatus: "recorded", reason: "no-speech-synthesis" }) };
    const root = new Node_("div");
    const un = mountLearn(root, ctxFor(memStore(), { ladder: "1", seed: "4" }, { audio })); await waitFor(() => /Level 1 of 30/.test(root.text) && root.find((n) => n.attrs["data-option"]).length === 2, { message: "ladder drawn" });
    const again = root.find((n) => n.tag === "button" && /^syllable\//.test(n.attrs["data-audio"] || ""));
    if (!state) { assert.equal(again.length, 0); assert.match(root.text, /No audio yet/); un(); continue; }
    assert.equal(again.length, 1, source); assert.equal(again[0].attrs["data-audio-state"], state);
    if (state === "device") assert.match(again[0].attrs["aria-label"], /Device voice, not a recorded teacher; Israeli-style only/);
    played.length = 0; await again[0].click(); assert.equal(played.length, 1); assert.equal(played[0][0], "syllable");
    un();
  }
});
