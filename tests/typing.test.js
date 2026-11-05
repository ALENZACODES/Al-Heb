import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import * as T from "../src/typing/typing.js";
import * as G from "../src/typing/guide.js";

const readJ = (p) => JSON.parse(readFileSync(new URL("../" + p, import.meta.url), "utf8"));
const layout = readJ("data/letters/keyboard-si1452.json");
const drills = readJ("data/typing/drills.json");
const deck = readJ("data/vocab/deck-order.json");

// ---------- data ----------
test("drills.json is current with its sources (src/typing/build.mjs --check) and has the documented shape", () => {
  const r = spawnSync("node", ["src/typing/build.mjs", "--check"], { cwd: new URL("..", import.meta.url).pathname, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(drills.schema, "alef-typing-drills/1");
  assert.ok(drills.words.length >= 150 && drills.words.length <= 200); assert.ok(drills.lines.length >= 20);
});
test("words come only from the first 200 deck-order entries, are unpointed, 2+ letters, typable and unique", () => {
  const first200 = new Set([...deck.entries].sort((a, b) => a.pos - b.pos).slice(0, 200).map((e) => e.id));
  const typable = new Set(Object.values(layout.letters).map((l) => l.char));
  const seen = new Set();
  for (const w of drills.words) {
    assert.ok(first200.has(w.id), w.id); assert.match(w.he, /^[א-ת]{2,}$/); assert.ok([...w.he].every((c) => typable.has(c)), w.he);
    assert.ok(!seen.has(w.he)); seen.add(w.he); assert.equal(T.stripPoints(w.pointed), w.he);
  }
});
test("prayer lines are unpointed letters and spaces, 2 to 10 words, with a pointed display form", () => {
  for (const l of drills.lines) {
    assert.match(l.he, /^[א-ת ]+$/); const n = l.he.split(" ").length; assert.ok(n >= 2 && n <= 10, l.id);
    assert.equal(T.stripPoints(l.pointed), l.he, l.id); assert.match(l.pointed, /[ְ-ּ]/, "pointed form keeps vowel points");
  }
  assert.ok(drills.lines.some((l) => l.id === "bless-formula-1" && l.he === "ברוך אתה יהוה אלהינו מלך העולם"));
});

// ---------- text logic ----------
test("stripPoints: removes points and cantillation, maqaf becomes a space, sof pasuk and direction marks go", () => {
  assert.equal(T.stripPoints("בְּרֵאשִׁית"), "בראשית");
  assert.equal(T.stripPoints("אֶת־הַשָּׁמַיִם׃"), "את השמים");
  assert.equal(T.stripPoints("‏שלום‎  עולם "), "שלום עולם");
  assert.equal(T.stripPoints(null), "");
});
test("checkAnswer: exact match, mistakes with accuracy and first difference, Latin input, final-form-only slips, empty input", () => {
  assert.deepEqual({ ...T.checkAnswer("שלום", "שלום"), typed: 0, answer: 0 }, { ok: true, accuracy: 1, typed: 0, answer: 0, firstDiff: -1, latin: false, empty: false, finalFormOnly: false });
  const w = T.checkAnswer("שלוס", "שלום"); assert.equal(w.ok, false); assert.equal(w.firstDiff, 3); assert.equal(w.accuracy, 0.75);
  assert.equal(T.checkAnswer("שלומ", "שלום").finalFormOnly, true);
  assert.equal(T.checkAnswer("shalom", "שלום").latin, true);
  assert.equal(T.checkAnswer("", "שלום").empty, true);
  assert.equal(T.checkAnswer("שלוֹם", "שלום").ok, true, "points typed by the learner are ignored");
  assert.equal(T.checkAnswer("ם", "מ").ok, false, "final and regular forms are different answers");
  assert.equal(T.levenshtein("אבג", "אג"), 1);
});

// ---------- layout mapping ----------
test("physicalMap: Israeli standard base layer for the letter keys (documented mapping), and it matches the layout file", () => {
  const m = T.physicalMap(layout);
  const expect = { KeyE: "ק", KeyR: "ר", KeyT: "א", KeyY: "ט", KeyU: "ו", KeyI: "ן", KeyO: "ם", KeyP: "פ", KeyA: "ש", KeyS: "ד", KeyD: "ג", KeyF: "כ", KeyG: "ע", KeyH: "י", KeyJ: "ח", KeyK: "ל", KeyL: "ך", Semicolon: "ף", KeyZ: "ז", KeyX: "ס", KeyC: "ב", KeyV: "ה", KeyB: "נ", KeyN: "מ", KeyM: "צ", Comma: "ת", Period: "ץ" };
  assert.deepEqual(m, expect);
  assert.equal(Object.keys(m).length, 27, "22 letters + 5 final forms, each on its own key");
  assert.deepEqual(new Set(Object.values(m)), new Set(Object.values(layout.letters).map((l) => l.char)));
});
test("mapKeyEvent: maps English-layout key presses, never double-maps a Hebrew key, never steals shortcuts", () => {
  const m = T.physicalMap(layout);
  assert.equal(T.mapKeyEvent(m, { key: "t", code: "KeyT" }), "א");
  assert.equal(T.mapKeyEvent(m, { key: "א", code: "KeyT" }), null, "OS layout already Hebrew");
  assert.equal(T.mapKeyEvent(m, { key: "t", code: "KeyT", ctrlKey: true }), null); assert.equal(T.mapKeyEvent(m, { key: "t", code: "KeyT", metaKey: true }), null);
  assert.equal(T.mapKeyEvent(m, { key: "q", code: "KeyQ" }), null, "KeyQ carries a punctuation mark, not a letter"); assert.equal(T.mapKeyEvent(m, { key: "Enter", code: "Enter" }), null); assert.equal(T.mapKeyEvent(m, null), null);
});
test("screenRows: three rows of Hebrew letter keys in physical order, 27 keys, each with a name", () => {
  const rows = T.screenRows(layout);
  assert.equal(rows.length, 3); assert.equal(rows.flat().length, 27);
  assert.deepEqual(rows[0].map((k) => k.char).join(""), "קראטוןםפ"); assert.deepEqual(rows[1].map((k) => k.char).join(""), "שדגכעיחלךף"); assert.deepEqual(rows[2].map((k) => k.char).join(""), "זסבהנמצתץ");
  assert.ok(rows.flat().every((k) => k.name && k.domCode && k.qwerty));
});

// ---------- rounds and stats ----------
test("buildRound: letters (no finals), finals (ordinary letter shown, final expected), words, lines; seeded and bounded", () => {
  const rng = T.makeRng(7);
  const L = T.buildRound("letters", drills, layout, { rng }); assert.equal(L.length, 10); assert.equal(new Set(L.map((x) => x.answer)).size, 10); assert.ok(L.every((x) => !(x.answer in T.FINAL_TO_REGULAR)));
  const F = T.buildRound("finals", drills, layout, { rng: T.makeRng(1) }); assert.equal(F.length, 5);
  for (const f of F) { assert.equal(T.FINAL_TO_REGULAR[f.answer], f.prompt); assert.match(f.label, /final form/); }
  const W = T.buildRound("words", drills, layout, { rng: T.makeRng(3) }); assert.equal(W.length, 8); assert.ok(W.every((x) => /^[א-ת]+$/.test(x.answer) && /[ְ-ּ]|[א-ת]/.test(x.prompt)));
  const P = T.buildRound("lines", drills, layout, { rng: T.makeRng(3) }); assert.equal(P.length, 3);
  assert.deepEqual(T.buildRound("words", drills, layout, { rng: T.makeRng(3) }).map((x) => x.id), W.map((x) => x.id), "same seed, same round");
  assert.throws(() => T.buildRound("nope", drills, layout));
  assert.deepEqual(T.buildRound("words", { words: [] }, layout), []);
});
test("buildRound: letters you missed come up more often", () => {
  let hits = 0, base = 0;
  for (let s = 1; s <= 200; s++) { if (T.buildRound("letters", drills, layout, { rng: T.makeRng(s), size: 1, misses: { "ש": 10 } })[0].answer === "ש") hits++; if (T.buildRound("letters", drills, layout, { rng: T.makeRng(s), size: 1 })[0].answer === "ש") base++; }
  assert.ok(hits > base * 3, `${hits} vs ${base}`);
});
test("summarise: counts correct answers only; speed only after 3 seconds; clock format", () => {
  const s = T.summarise([{ ok: true, chars: 4, ms: 4000 }, { ok: false, chars: 5, ms: 9000 }, { ok: true, chars: 2, ms: 2000 }]);
  assert.deepEqual(s, { items: 3, correct: 2, accuracy: 2 / 3, chars: 6, ms: 6000, cpm: 60 });
  assert.equal(T.summarise([{ ok: true, chars: 1, ms: 1000 }]).cpm, null); assert.deepEqual(T.summarise([]), { items: 0, correct: 0, accuracy: 0, chars: 0, ms: 0, cpm: null });
  assert.equal(T.fmtClock(75000), "1:15");
});
test("typing.v1 state: normalises junk, folds rounds in, tracks misses (up on a miss, down on a hit), caps recent", () => {
  const n = T.normalizeState({ mapKeys: "yes", lastDrill: "x", totals: { letters: { items: -1, correct: "a" } }, misses: { "ש": 3, "x": 2, "ב": -1 }, recent: [{ drill: "nope" }] });
  assert.equal(n.mapKeys, false); assert.equal(n.lastDrill, "letters"); assert.equal(n.totals.letters.items, 0); assert.deepEqual(n.misses, { "ש": 3 }); assert.deepEqual(n.recent, []);
  let s = T.normalizeState(null);
  s = T.recordRound(s, "letters", 1000, { items: 2, correct: 1, chars: 1, ms: 2000 }, [{ char: "ש", ok: false }, { char: "ב", ok: true }]);
  assert.equal(s.totals.letters.rounds, 1); assert.equal(s.totals.letters.items, 2); assert.deepEqual(s.misses, { "ש": 1 });
  s = T.recordRound(s, "letters", 2000, { items: 1, correct: 1, chars: 1, ms: 1000 }, [{ char: "ש", ok: true }]); assert.deepEqual(s.misses, {});
  for (let i = 0; i < 25; i++) s = T.recordRound(s, "words", i, { items: 1, correct: 1, chars: 3, ms: 3000 });
  assert.equal(s.recent.length, 20); assert.equal(s.lastDrill, "words");
  assert.deepEqual(T.normalizeState(JSON.parse(JSON.stringify(s))), s);
});

// ---------- guide ----------
test("guide: each platform is labelled as untested general knowledge; the AltGr table comes from the layout and covers all 14 marks", () => {
  assert.deepEqual(G.PLATFORMS.map((p) => p.id), ["windows", "mac", "ios", "android"]);
  for (const p of G.PLATFORMS) { assert.equal(p.status, "From general knowledge, not tested here."); assert.ok(p.steps.length >= 3); }
  const rows = G.niqqudRows(layout); assert.equal(rows.length, 14); assert.ok(rows.every((r) => /^U\+05[B-C][0-9A-F]$/.test(r.codepoint) && r.mark && r.key));
  assert.ok(G.GENERAL.some((g) => /Shuruk/.test(g) && /vav/.test(g)));
  assert.ok(!G.PLATFORMS.some((p) => p.steps.some((s) => /\b(guarantee|always works|tested on)\b/i.test(s))));
});

// ---------- the view, with a fake DOM ----------
class El {
  constructor(tag) { this.tag = tag; this.nodeType = 1; this.children = []; this.attrs = {}; this.listeners = {}; this.parent = null; this.className = ""; this.value = ""; this.hidden = false; this.selectionStart = null; this.selectionEnd = null; }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k === "value") this.value = String(v); }
  getAttribute(k) { return this.attrs[k] ?? null; }
  removeAttribute(k) { delete this.attrs[k]; }
  append(...c) { for (const x of c) { if (x && x.nodeType === 1) x.parent = this; this.children.push(x); } }
  replaceChildren(...c) { this.children = []; this.append(...c.filter((x) => x != null)); }
  set textContent(v) { this.replaceChildren({ nodeType: 3, data: String(v) }); }
  get textContent() { return this.text; }
  focus() { globalThis.__focus = this; }
  get text() { return this.children.map((c) => (c.nodeType === 3 ? c.data : c.text)).join(""); }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  find(pred, out = []) { if (pred(this)) out.push(this); for (const c of this.children) if (c.nodeType === 1) c.find(pred, out); return out; }
  querySelector(sel) { const m = /^#(.+)$/.exec(sel); return this.find((n) => n.attrs.id === m[1])[0] || null; }
  querySelectorAll(sel) { return sel === "button" ? this.find((n) => n.tag === "button") : []; }
  setSelectionRange(a, b) { this.selectionStart = a; this.selectionEnd = b; }
  fire(type, ev = {}) { const e = { target: this, preventDefault() { e.prevented = true; }, ...ev }; for (const f of this.listeners[type] || []) f(e); return e; }
  click() { return this.fire("click"); }
}
globalThis.document = { createElement: (t) => new El(t), createTextNode: (d) => ({ nodeType: 3, data: String(d) }), getElementById: () => null, head: null };
const flush = () => new Promise((r) => setTimeout(r, 0));
const waitFor = async (f) => { for (let i = 0; i < 300; i++) { const v = f(); if (v) return v; await flush(); } throw new Error("timed out waiting"); };
const byId = (root, id) => root.find((n) => n.attrs.id === id)[0];
const { mount } = await import("../src/typing/typing.view.js");

function fakeClock(t = 1_800_000_000_000) { const c = { t, now: () => c.t, advance(ms) { c.t += ms; } }; return c; }
async function boot(storeInit = {}, extra = {}) {
  const root = new El("div"), mem = { ...storeInit }, clock = fakeClock();
  const ctx = { store: { get: (k) => mem[k], set: (k, v) => { mem[k] = v; } }, typingData: drills, keyboard: layout, rng: T.makeRng(11), clock, ...extra };
  const unmount = mount(root, ctx);
  await waitFor(() => byId(root, "ty-drill-letters"));
  return { root, mem, clock, ctx, unmount };
}
const status = (root) => byId(root, "ty-status").text;
const type = (root, text) => { const i = byId(root, "ty-input"); i.value = text; return i.fire("input", {}); };
const answerOf = (root) => { // the target is shown in the prompt; look it up from the round via the label/gloss
  const prompt = byId(root, "ty-prompt").text; return prompt;
};

test("view: start screen has the four drills, a labelled key-positions option, the guide, and Hebrew lang/dir on Hebrew text", async () => {
  const { root, unmount } = await boot();
  for (const id of ["letters", "finals", "words", "lines"]) assert.ok(byId(root, `ty-drill-${id}`));
  assert.ok(byId(root, "ty-map") && root.find((n) => n.tag === "label" && n.attrs.for === "ty-map").length === 1);
  const guide = byId(root, "ty-guide"); assert.equal(guide.tag, "details");
  for (const p of G.PLATFORMS) { const sec = guide.find((n) => n.attrs["data-platform"] === p.id)[0]; assert.match(sec.text, /not tested here/); }
  assert.match(guide.text, /Right Alt/); assert.equal(guide.find((n) => n.attrs["data-mark"]).length, 14);
  const heb = root.find((n) => /[֐-׿]/.test(n.children.filter((c) => c.nodeType === 3).map((c) => c.data).join("")));
  assert.ok(heb.length > 0);
  for (const n of heb) { const own = n.children.filter((c) => c.nodeType === 3).map((c) => c.data).join(""); if (/^[\s◌֐-׿]+$/.test(own)) { assert.equal(n.attrs.lang, "he", own); assert.equal(n.attrs.dir, "rtl", own); } }
  assert.match(byId(root, "ty-totals").text, /No rounds yet/); unmount();
});

test("view: letters drill - typing the right letter advances and counts; a wrong one shows the answer and waits for Next; Latin input is not counted", async () => {
  const { root, mem, clock, unmount } = await boot();
  byId(root, "ty-drill-letters").click();
  await waitFor(() => byId(root, "ty-input"));
  const input = byId(root, "ty-input"); assert.equal(input.attrs.lang, "he"); assert.equal(input.attrs.dir, "rtl"); assert.ok(root.find((n) => n.tag === "label" && n.attrs.for === "ty-input").length === 1);
  assert.match(byId(root, "ty-progress").text, /Item 1 of 10/);
  // Latin: not counted, explained
  type(root, "a"); assert.match(status(root), /Latin letters.*Nothing was counted/); assert.match(byId(root, "ty-progress").text, /Item 1 of 10/);
  // wrong Hebrew letter
  const target = byId(root, "ty-prompt").text; const wrong = target === "א" ? "ב" : "א";
  clock.advance(1500); type(root, wrong);
  assert.match(status(root), /Not quite\. The answer is /); assert.ok(byId(root, "ty-next"));
  byId(root, "ty-next").click(); assert.match(byId(root, "ty-progress").text, /Item 2 of 10/);
  // right letter, via the on-screen key (inserts into the field and checks)
  const t2 = byId(root, "ty-prompt").text;
  const key = root.find((n) => n.attrs["data-key"] === t2)[0]; assert.ok(key, "on-screen key for " + t2);
  key.click(); assert.match(status(root), /Right\./); assert.match(byId(root, "ty-progress").text, /Item 3 of 10/);
  byId(root, "ty-stop").click(); await waitFor(() => byId(root, "ty-summary"));
  assert.match(byId(root, "ty-summary").text, /1 of 2 right \(50%\)/); assert.match(byId(root, "ty-summary").text, /not a typing test, and not a measure of fluency/);
  assert.equal(mem["typing.v1"].totals.letters.rounds, 1); assert.equal(mem["typing.v1"].totals.letters.items, 2); assert.equal(mem["typing.v1"].misses[target], 1);
  unmount();
});

test("view: full words round with exact answers; speed uses the fake clock; final-form slip gets the specific hint; Enter checks", async () => {
  const { root, mem, clock, unmount } = await boot();
  byId(root, "ty-drill-words").click(); await waitFor(() => byId(root, "ty-input"));
  const expected = T.buildRound("words", drills, layout, { rng: T.makeRng(11), misses: {} }); // same seed and state => same items
  for (let i = 0; i < 8; i++) {
    assert.match(byId(root, "ty-progress").text, new RegExp(`Item ${i + 1} of 8`));
    const ans = expected[i].answer;
    const input = byId(root, "ty-input"); input.value = ans.slice(0, 1); input.fire("input", {}); clock.advance(2000);
    input.value = i === 3 ? ans.replace(/ם|ן|ך|ף|ץ/g, (c) => T.FINAL_TO_REGULAR[c]) + (/[םןךףץ]/.test(ans) ? "" : "") : ans;
    if (i === 3 && !/[םןךףץ]/.test(ans)) input.value = ans; // no final letter in this word: answer it right
    input.fire("keydown", { key: "Enter" });
    if (i === 3 && /[םןךףץ]/.test(ans)) { assert.match(byId(root, "ty-feedback").text, /final forms/); byId(root, "ty-next").click(); }
  }
  await waitFor(() => byId(root, "ty-summary"));
  const t = mem["typing.v1"].totals.words; assert.equal(t.rounds, 1); assert.equal(t.items, 8); assert.ok(t.correct >= 7);
  assert.match(byId(root, "ty-summary").text, /Words|Common words/); assert.match(byId(root, "ty-summary").text, /characters a minute/);
  byId(root, "ty-again").click(); await waitFor(() => byId(root, "ty-input")); unmount();
});

test("view: key positions option maps English-layout presses to Hebrew in the field and is stored", async () => {
  const { root, mem, unmount } = await boot();
  const box = byId(root, "ty-map"); box.checked = true; box.fire("change", { target: { checked: true } });
  await waitFor(() => mem["typing.v1"]?.mapKeys === true);
  byId(root, "ty-drill-words").click(); await waitFor(() => byId(root, "ty-input"));
  const input = byId(root, "ty-input"); input.value = "";
  const ev = input.fire("keydown", { key: "t", code: "KeyT" }); assert.equal(ev.prevented, true); assert.equal(input.value, "א");
  const ev2 = input.fire("keydown", { key: "t", code: "KeyT", ctrlKey: true }); assert.equal(ev2.prevented, undefined); assert.equal(input.value, "א");
  const ev3 = input.fire("keydown", { key: "א", code: "KeyT" }); assert.equal(ev3.prevented, undefined);
  unmount();
  // option off: nothing is intercepted
  const b = await boot({ "typing.v1": { mapKeys: false } }); b.root.find((n) => n.attrs.id === "ty-drill-words")[0].click(); await waitFor(() => byId(b.root, "ty-input"));
  const i2 = byId(b.root, "ty-input"); assert.equal(i2.fire("keydown", { key: "t", code: "KeyT" }).prevented, undefined); b.unmount();
});

test("view: on-screen keyboard is one roving tab stop with arrow-key movement, every key has a visible Hebrew letter and a spoken name", async () => {
  const { root, unmount } = await boot();
  byId(root, "ty-drill-letters").click(); await waitFor(() => byId(root, "ty-kb"));
  const kb = byId(root, "ty-kb"); const keys = kb.find((n) => n.tag === "button");
  assert.equal(keys.length, 27 + 2); assert.equal(keys.filter((k) => k.attrs.tabindex === "0").length, 1);
  const alefKey = keys.find((k) => k.attrs["data-key"] === "א"); assert.match(alefKey.text, /א/);
  // Deliberate change (44 px key redesign): every key has an explicit aria-label that starts with the visible letter (label-in-name) and then names it in English.
  assert.equal(alefKey.attrs["aria-label"], "א alef");
  assert.ok(keys.every((k) => k.attrs["aria-label"]), "every on-screen key, including Space and Delete, has an aria-label");
  assert.deepEqual(["ך", "ם", "ן", "ף", "ץ"].map((c) => keys.find((k) => k.attrs["data-key"] === c).attrs["aria-label"]), ["ך kaf (final form)", "ם mem (final form)", "ן nun (final form)", "ף pe (final form)", "ץ tsadi (final form)"]);
  assert.equal(keys.find((k) => k.attrs["data-key"] === " ").attrs["aria-label"], "Space"); assert.equal(keys.find((k) => k.attrs["data-key"] === "BS").attrs["aria-label"], "Delete last letter");
  const first = keys.find((k) => k.attrs.tabindex === "0"); const e = kb.fire("keydown", { target: first, key: "ArrowRight" });
  assert.equal(e.prevented, true); assert.equal(keys.filter((k) => k.attrs.tabindex === "0").length, 1); assert.notEqual(keys.find((k) => k.attrs.tabindex === "0"), first);
  kb.fire("keydown", { target: keys.find((k) => k.attrs.tabindex === "0"), key: "ArrowDown" });
  assert.equal(keys.find((k) => k.attrs.tabindex === "0").attrs["data-r"], "1");
  const bs = keys.find((k) => k.attrs["data-key"] === "BS"); const inp = byId(root, "ty-input"); inp.value = "אב"; bs.click(); assert.equal(inp.value, "א");
  unmount();
});

test("keyboard CSS: keys are at least 44 px both ways; narrow screens use a wrapping grid, not sideways scroll", async () => {
  const { CSS, KEY_MIN } = await import("../src/typing/typing.view.js");
  assert.equal(KEY_MIN, 44);
  const key = CSS.match(/\.ty-key\{([^}]*)\}/)[1];
  assert.match(key, /min-inline-size:44px/); assert.match(key, /min-block-size:max\(44px,/);
  const narrow = CSS.slice(CSS.indexOf("@media (max-width:32rem)"));
  assert.match(narrow, /grid-template-columns:repeat\(auto-fill,minmax\(44px,1fr\)\)/, "7 keys per line at 375 px, each >= 44 px");
  assert.match(narrow, /\.ty-kr:not\(:last-child\)\{display:contents\}/);
  assert.doesNotMatch(CSS, /\.ty-kb\{[^}]*overflow-x/, "the keyboard never scrolls sideways");
  assert.match(CSS, /\.ty-check\{[^}]*min-block-size:44px/, "the Israeli-key-positions checkbox row is a 44 px target");
});

test("view: practice box inserts a vowel mark at the cursor; stored state is restored; load failure is an alert", async () => {
  const { root, unmount } = await boot({ "typing.v1": { totals: { letters: { items: 10, correct: 9, chars: 9, ms: 9000, rounds: 1 } }, lastDrill: "letters" } });
  assert.match(byId(root, "ty-totals").text, /1 round, 9 of 10 answers right \(90%\)/); assert.match(byId(root, "ty-totals").text, /60 characters a minute/);
  const sb = byId(root, "ty-sandbox"); sb.value = "ב"; sb.selectionStart = sb.selectionEnd = 1;
  root.find((n) => n.attrs["data-mark"] === "patach")[0].click(); assert.equal(sb.value, "בַ");
  unmount();
  const r2 = new El("div"); const u2 = mount(r2, { store: { get: () => null, set() {} }, typingData: drills, get keyboard() { throw new Error("no layout"); } });
  await waitFor(() => r2.find((n) => n.attrs.role === "alert").length); u2();
});
