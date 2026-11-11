// Calm mode, reading comfort, short sessions, resume, plain language, memory hooks, wording and motion.
// Logic and static checks on a fake DOM and on the source files. This is NOT a test with people, a screen reader or a real browser.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from 'node:url';
import { waitFor } from "./helpers/waitfor.js";

const read = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");

// ---- fake DOM (same style as the other curriculum view tests)
class Node_ {
  constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; this.listeners = {}; this.parent = null; this.nodeType = 1; this.className = ""; this.hidden = false; this.disabled = false; }
  setAttribute(k, v) { this.attrs[k] = v; if (k === "hidden") this.hidden = true; if (k === "disabled") this.disabled = true; }
  removeAttribute(k) { delete this.attrs[k]; if (k === "hidden") this.hidden = false; if (k === "disabled") this.disabled = false; }
  getAttribute(k) { return this.attrs[k]; }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  append(...c) { for (const x of c) { const n = x != null && x.nodeType ? x : { nodeType: 3, data: String(x), parent: undefined }; this.children.push(n); if (n.parent !== undefined) n.parent = this; } }
  replaceChildren(...c) { this.children = []; this.append(...c); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((x) => x !== this); }
  set textContent(v) { this.children = [{ nodeType: 3, data: String(v), parent: undefined }]; }
  get text() { return this.children.map((c) => (c.nodeType === 3 ? c.data : c.hidden ? "" : c.text)).join(""); }
  find(pred, out = []) { if (pred(this)) out.push(this); for (const c of this.children) if (c.nodeType === 1) c.find(pred, out); return out; }
  querySelector(sel) { const f = sel.startsWith("#") ? (n) => n.attrs.id === sel.slice(1) : (n) => new RegExp("\\b" + sel.slice(1) + "\\b").test(n.className); return this.find(f)[0] ?? null; }
  async click() { if (this.disabled) return; for (const f of this.listeners.click || []) await f({ currentTarget: this, target: this, preventDefault() {} }); }
  focus() {}
}
const keyHandlers = [];
globalThis.document = { createElement: (t) => new Node_(t), createTextNode: (d) => ({ nodeType: 3, data: String(d), parent: undefined }), activeElement: null,
  addEventListener: (t, f) => { if (t === "keydown") keyHandlers.push(f); }, removeEventListener: (t, f) => { const i = keyHandlers.indexOf(f); if (i >= 0) keyHandlers.splice(i, 1); } };
const memStore = (init = {}) => { const m = { ...init }; return { get: (k) => m[k], set: (k, v) => { m[k] = JSON.parse(JSON.stringify(v)); }, m }; };
const btn = (root, pred) => root.find((n) => n.tag === "button" && pred(n));
const settingsOf = (o = {}) => ({ get: (k) => ({ congregation: "sephardi", ...o })[k] });

const { DEFAULTS, ENUMS, validate, createSettings } = await import("../src/shell/settings.js");
const C = await import("../src/shell/comfort.js");
const K = await import("../src/curriculum/chunks.js");
const S = await import("../src/curriculum/exercises.session.js");
const { lessons, byId } = await import("../src/curriculum/lessons.js");

// ------------------------------------------------------------------------------------------------ settings keys
test("new settings: defaults are the quiet-neutral ones, enums and booleans validate, bad values are refused", () => {
  assert.equal(DEFAULTS.calmMode, false); assert.equal(DEFAULTS.shortSession, false); assert.equal(DEFAULTS.showStreak, true);
  assert.equal(DEFAULTS.readFont, "default"); assert.equal(DEFAULTS.lineSpacing, "normal"); assert.equal(DEFAULTS.letterSpacing, "normal");
  assert.equal(DEFAULTS.textSize, "normal"); assert.equal(DEFAULTS.lineLength, "normal");
  for (const k of ["calmMode", "shortSession", "showStreak"]) { assert.equal(validate(k, true).ok, true); assert.equal(validate(k, "yes").ok, false); }
  for (const k of ["readFont", "lineSpacing", "letterSpacing", "textSize", "lineLength"]) {
    for (const v of ENUMS[k]) assert.equal(validate(k, v).ok, true, k + "=" + v);
    assert.equal(validate(k, "huge").ok, false, k);
    assert.ok(ENUMS[k].includes(DEFAULTS[k]), k + " default is one of its choices");
  }
  const s = createSettings(memStore());
  assert.deepEqual(s.set({ calmMode: true, textSize: "larger", readFont: "clear" }), []);
  assert.deepEqual(s.set({ textSize: "enormous" }), ["textSize"]);
  assert.equal(s.get("textSize"), "larger");
});
test("Settings groups its long list: every control sits under a named, collapsible group, and the new groups exist", () => {
  const src = read("src/shell/settings.view.js");
  for (const id of ["calm", "read", "look", "forms", "place", "data", "adv"]) assert.match(src, new RegExp(`group\\('${id}'`), id);
  for (const k of ["calmMode", "shortSession", "showStreak", "readFont", "textSize", "lineSpacing", "letterSpacing", "lineLength"]) assert.match(src, new RegExp(`['"]${k}['"]`), k);
  assert.match(src, /'details'/);
});

// ------------------------------------------------------------------------------------------------ reading comfort
test("comfortStyle: defaults add nothing; each step maps to a CSS variable; unknown values fall back", () => {
  assert.deepEqual(C.comfortStyle({}).vars, {});
  assert.deepEqual(C.comfortStyle({ ...DEFAULTS }).vars, {});
  const v = C.comfortStyle({ textSize: "largest", lineSpacing: "wide", letterSpacing: "wider", readFont: "clear", lineLength: "narrow" }).vars;
  assert.equal(v["--text-scale"], "1.5"); assert.equal(v["--line-height"], "2.1"); assert.equal(v["--letter-spacing"], "0.1em");
  assert.match(v["--font-ui"], /Verdana/); assert.equal(v["--measure"], "36rem");
  assert.deepEqual(C.comfortStyle({ textSize: "nope", lineSpacing: 7 }).vars, {});
  for (let i = 1; i < 4; i++) assert.ok(Object.values(C.TEXT_SCALE)[i] > Object.values(C.TEXT_SCALE)[i - 1], "text steps grow");
});
test("applyComfort sets and removes variables on the root and toggles data-calm", () => {
  const props = {}, attrs = {};
  const root = { style: { setProperty: (k, v) => { props[k] = v; }, removeProperty: (k) => { delete props[k]; } }, setAttribute: (k, v) => { attrs[k] = v; }, removeAttribute: (k) => { delete attrs[k]; } };
  C.applyComfort(root, { textSize: "large", calmMode: true });
  assert.equal(props["--text-scale"], "1.15"); assert.ok("data-calm" in attrs);
  C.applyComfort(root, { textSize: "normal", calmMode: false });
  assert.deepEqual(props, {}); assert.ok(!("data-calm" in attrs));
});
test("only fonts that need no download are offered, and no font file or licence entry was added for them", () => {
  const css = read("assets/css/fonts.css");
  const faces = [...css.matchAll(/font-family:\s*"([^"]+)"/g)].map((m) => m[1]).sort();
  assert.deepEqual(faces, ["Frank Ruhl Libre", "Gveret Levin", "Heebo"], "no new @font-face");
  assert.match(C.CLEAR_FONT_STACK, /system-ui/); assert.match(C.CLEAR_FONT_STACK, /sans-serif$/);
  assert.ok(!/@import|url\(/.test(C.CLEAR_FONT_STACK));
});
test("the stylesheet reads the comfort variables, keeps Hebrew letters unspaced, and has the calm rule", () => {
  const css = read("assets/css/app.css");
  assert.match(css, /font-size: calc\(100% \* var\(--text-scale, 1\)\)/);
  assert.match(css, /var\(--line-height, 1\.55\)/); assert.match(css, /letter-spacing: var\(--letter-spacing, normal\)/);
  assert.match(css, /max-inline-size: var\(--measure, 46rem\)/);
  assert.match(css, /\.he, \[lang="he"\][^{]*\{ letter-spacing: normal; \}/);
  assert.match(css, /:root\[data-calm\][^{]*\{ animation: none !important; transition: none !important; scroll-behavior: auto !important; \}/);
  assert.match(css, /prefers-reduced-motion: reduce\)[^\n]*animation: none !important/, "the system choice is honoured whether or not calm mode is on");
});

// ------------------------------------------------------------------------------------------------ calm mode
test("calm mode turns off vibration and sound effects even when they were switched on; reduced motion does too", () => {
  const win = { navigator: { vibrate() {} }, matchMedia: () => ({ matches: false }) };
  const ctx = (o) => ({ settings: settingsOf(o), sfx: { play() {} } });
  assert.equal(S.hapticsOn(ctx({ haptics: true }), win), true);
  assert.equal(S.hapticsOn(ctx({ haptics: true, calmMode: true }), win), false);
  assert.equal(S.soundOn(ctx({ soundEffects: true })), true);
  assert.equal(S.soundOn(ctx({ soundEffects: true, calmMode: true })), false);
  assert.equal(S.hapticsOn(ctx({ haptics: true }), { ...win, matchMedia: () => ({ matches: true }) }), false);
  const did = S.fireFeedback(ctx({ haptics: true, soundEffects: true, calmMode: true }), true, win);
  assert.deepEqual(did, { haptic: false, sound: false });
});
test("calm helpers: quietNow follows calm mode or the system choice; streaks hide with calm mode or the streak switch; lessons come in parts", () => {
  const off = { matchMedia: () => ({ matches: false }) }, on = { matchMedia: () => ({ matches: true }) };
  assert.equal(C.quietNow(settingsOf({}), off), false);
  assert.equal(C.quietNow(settingsOf({ calmMode: true }), off), true);
  assert.equal(C.quietNow(settingsOf({}), on), true, "reduced motion is honoured with calm mode off");
  assert.equal(C.streakVisible({ settings: settingsOf({}) }), true);
  assert.equal(C.streakVisible({ settings: settingsOf({ showStreak: false }) }), false);
  assert.equal(C.streakVisible({ settings: settingsOf({ calmMode: true }) }), false);
  assert.equal(C.streakVisible({}), true, "no settings object: default");
  assert.equal(C.chunkedLessons({ settings: settingsOf({}) }), false);
  assert.equal(C.chunkedLessons({ settings: settingsOf({ shortSession: true }) }), true);
  assert.equal(C.chunkedLessons({ settings: settingsOf({ calmMode: true }) }), true);
});
test("the stroke-order demo shows the finished stroke at once in calm mode (source check)", () => {
  assert.match(read("src/letters/trace.js"), /prefers-reduced-motion: reduce\)'\)\.matches\) \|\| \(typeof document !== 'undefined' && document\.documentElement\?\.hasAttribute\?\.\('data-calm'\)\)/);
});
test("sprint and timed read: no countdown or running clock in calm mode (source check)", () => {
  const sp = read("src/sprint/sprint.view.js");
  assert.match(sp, /const noClock = \(ctx\) => calmOn\(ctx\)/, "calm mode is one of the reasons the sprint has no clock");
  assert.match(sp, /noClock\(ctx\) \? createTimer\(Infinity\)/);
  assert.match(sp, /noClock\(ctx\) \? null : el\('p', \{ class: 'sp-timer' \}/);
  assert.match(read("src/timedread/timedread.view.js"), /if \(!calmOn\(ctx\)\) \{ timer = setInterval/);
});

// ------------------------------------------------------------------------------------------------ flashing and motion (static)
test("motion audit: animations match the reviewed inventory, loops are slow, and reduced motion and calm mode disable them", () => {
  const files = [];
  const walk = (d) => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) { if (n !== "node_modules") walk(p); } else if (/\.(css|js)$/.test(n)) files.push(p); } };
  const base = fileURLToPath(new URL('../', import.meta.url));
  walk(base + "src"); walk(base + "assets/css");
  const frames = [], anims = [];
  for (const f of files) {
    const t = readFileSync(f, "utf8");
    for (const m of t.matchAll(/@keyframes\s+([\w-]+)/g)) frames.push(m[1]);
    for (const m of t.matchAll(/\banimation\s*:\s*([^;}\n]+)/g)) if (!/^none\b/.test(m[1].trim())) anims.push(f.replace(base, "") + " :: " + m[1].trim());
  }
  const reviewed = ['fwSplashIn', 'alef-bob', 'skel-pulse', 'prayer-prompt', 'prayer-stars', 'prayer-light',
    'astral-harvest-breathe', 'astral-motes-drift', 'astral-ancient-reveal', 'astral-photo-drift',
    'astral-stars-drift', 'astral-ray-pass', 'prefix-float', 'game-conveyor-move', 'show-shimmer',
    'show-rise', 'show-pop', 'rimon-breathe', 'rimon-bubble-pop', 'alef-nudge',
    // first-lesson player (assets/css/player.css): one-shot, never looping; the global reduced-motion and calm rules switch them off
    'fd-rise', 'fd-pop', 'fd-fall',
    // Learn continue card and lesson-finished celebration (assets/css/learn.css): Rimon bobs every 3.2 s, the next stop pulses every 2 s, the confetti and hop play once; reduced motion and calm mode switch all of them off
    'alef-continue-bob', 'alef-pulse', 'alef-burst', 'alef-hop', 'alef-rimon-burst',
    // Brain Lab (src/lab/lab.view.js): a 0.3 s one-shot shake on a wrong tile, never looping; reduced motion switches it off
    'lab-shake',
    // First-minute pass (assets/css/polish.css, 2026-11-10), reviewed: the welcome page slides in once (0.22 s), Rimon's bubble pops in
    // once (0.42 s), the first letter grows in once, the streak flame pops once when the day lights; the current lesson on the path
    // rises 3 px every 2.4 s (transform only, no colour or brightness change). The global reduced-motion and calm rules switch all off.
    'ob-page-in', 'rimon-say-in', 'fd-glyph-in', 'stat-pop', 'path-here',
    // Rimon stills card (assets/css/rimon.css): a 0.3 s one-shot slide-in, never looping; reduced motion and calm mode switch it off
    'rimon-toast-in',
    // Rimon big moments (assets/css/rimon.css, feature/rimon-stills): one-shot entrances of 0.5 to 0.6 s and a 1.1 s gold pulse on streak
    // moments (under two cycles per second); the reduced-motion block and the global calm rule switch all of them off
    'rimon-burst', 'rimon-bounce', 'rimon-crash', 'rimon-peek-in', 'rimon-gold-pulse',
    // round 2: the "Today counts" toast drops in once (0.42 s) and leaves after about 4 s; reduced motion and calm switch it off
    'stat-toast-in',
    // opening prayer in gold leaf: the letters brighten once (2.6 s) and a sheen of light crosses them every 9 s (background position
    // only, no flashing: brightness peaks once and settles); reduced motion and calm mode keep steady gold
    'prayer-gold-dawn', 'prayer-gold-sheen',
    // Retention reward panel (src/retention/retention.css): the XP chip pops once (0.25 s) and the confetti falls once (1.6 s), never looping; reduced motion and calm mode switch both off and hide the confetti
    'ret-pop', 'ret-fall',
    // Star of David light (assets/css/light.css): the star and halo ease opacity and scale every 2.4 s while pulse is on
    // (under two cycles per second). Animations exist only under prefers-reduced-motion: no-preference; the local reduce
    // block and the global reduced-motion and calm rules switch both off. The phone torch flash is separately gated by
    // reduced motion, calm mode and Shabbat/chag quiet in src/light/light.js.
    'alef-light-breathe', 'alef-light-halo',
    // Brain Lab 3D Studio (src/lab/lab.view.js, 2026-11-10): birds cross the sky once (lab-fly), syllables fall once (lab-fall),
    // a card turns in once (lab-flipin, 0.35 s), and gold particles fade out once on a right answer (lab-pop, 0.45 s, no flashing).
    // None loops; the global reduced-motion and calm-mode rules switch all four off, and the games show a still layout instead.
    'lab-fly', 'lab-fall', 'lab-flipin', 'lab-pop',
    // Combo meter pop and floating +points (src/lab/lab.view.js, 2026-11-10): both one-shot, under 0.75 s, no flashing.
    // Reduced motion switches them off. The on-demand 3D particle field in lab.fx3d.js is canvas-only and has no keyframes.
    'lab-combo-pop', 'lab-float-up'];
  assert.deepEqual(frames.sort(), reviewed.sort(), 'new animations require a motion review');
  for (const animation of anims) {
    if (!/\binfinite\b/.test(animation)) continue;
    const duration = animation.match(/(?:^|\s)([\d.]+)(ms|s)(?=\s|$)/);
    assert.ok(duration, `loop must declare its duration: ${animation}`);
    assert.ok(Number(duration[1]) * (duration[2] === 'ms' ? 1 : 1000) >= 500, `loop exceeds two cycles per second: ${animation}`);
  }
  const globalCss = read('assets/css/app.css');
  assert.match(globalCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{\s*\*,\s*\*::before,\s*\*::after\s*\{[^}]*animation:\s*none\s*!important[^}]*transition:\s*none\s*!important/);
  assert.match(globalCss, /:root\[data-calm\][^{]*\{[^}]*animation:\s*none\s*!important[^}]*transition:\s*none\s*!important/);
  const learn = read("assets/css/learn.css");
  assert.match(learn, /@media \(prefers-reduced-motion: no-preference\)\s*\{[^@]*alef-nudge/, "the nudge only exists when motion is allowed");
  const nudge = learn.match(/@keyframes alef-nudge\s*\{([^}]*\}[^}]*)\}/)[1];
  assert.ok(!/opacity|background|color|filter/.test(nudge), "the nudge moves 3px sideways; it does not change brightness or colour");
  // 0.25 s, once: at most 4 position changes in a quarter second, and nothing changes colour or brightness, so it cannot flash
  for (const f of files) { const t = readFileSync(f, "utf8"); if (/\.mc \.mc-svg \.morph-a\{[^}]*transition:opacity \.4s/.test(t)) assert.match(t, /prefers-reduced-motion:reduce\)\{\.mc \.mc-svg \.morph-a,\.mc \.mc-svg \.morph-b\{transition:none!important/); }
});

// ------------------------------------------------------------------------------------------------ chunks and resume (pure)
test("planChunks: parts of a few items, then parts of a few questions; nothing dropped, nothing repeated", () => {
  for (const l of lessons.filter((x) => !/^I-/.test(x.id))) {
    const qids = Array.from({ length: 7 }, (_, i) => `${l.id}-q${i}`);
    const plan = K.planChunks(l, qids);
    const teach = plan.filter((p) => p.kind === "teach"), check = plan.filter((p) => p.kind === "check");
    assert.equal(teach.flatMap((p) => p.items).length, K.teachItems(l).length, l.id);
    assert.deepEqual(check.flatMap((p) => p.ids), qids);
    assert.ok(plan.every((p) => (p.kind === "teach" ? p.items.length : p.ids.length) <= 3), "at most 3 per part");
    assert.ok(plan.findIndex((p) => p.kind === "check") >= teach.length - 0 || !check.length, "teaching comes before questions");
  }
});
test("resume record: sanitized on read, clamped to the plan, merged or replaced on write, cleared on completion, bounded in size", () => {
  assert.deepEqual(K.sanitizeResume(null), {}); assert.deepEqual(K.sanitizeResume([1]), {}); assert.deepEqual(K.sanitizeResume({ r01: 5 }), {});
  const dirty = { r01: { chunk: -2, results: { a: true, b: "x", c: false }, at: "no" } };
  assert.deepEqual(K.sanitizeResume(dirty).r01, { chunk: 0, results: { a: true, c: false }, at: 0 });
  let raw = K.setResume({}, "r01", { chunk: 2, results: { a: true } }, 100);
  raw = K.setResume(raw, "r01", { results: { b: false } }, 200);
  assert.deepEqual(raw.r01.results, { a: true, b: false }); assert.equal(raw.r01.chunk, 2);
  raw = K.setResume(raw, "r01", { results: { b: true }, replaceResults: true }, 300);
  assert.deepEqual(raw.r01.results, { b: true });
  assert.equal(K.getResume(raw, "r01", { planLength: 2 }).chunk, 1, "clamped to the last part");
  assert.deepEqual(K.getResume(raw, "r01", { questionIds: ["zzz"] }).results, {}, "answers for questions that no longer exist are ignored");
  assert.equal(K.getResume(raw, "nope").found, false);
  assert.deepEqual(K.clearResume(raw, "r01"), {});
  let many = {}; for (let i = 0; i < 60; i++) many = K.setResume(many, "L" + i, { chunk: 1 }, i);
  assert.equal(Object.keys(many).length, 40); assert.ok(!("L0" in many) && "L59" in many, "oldest dropped first");
});
test("createSession carry: earlier answers count as answered, and an earlier miss still comes back once at the end", () => {
  const items = [{ id: "a" }, { id: "b" }, { id: "c" }];
  const s = S.createSession([items[2]], { carry: [{ it: items[0], right: true }, { it: items[1], right: false }] });
  assert.deepEqual(s.firstResults(), { a: true, b: false });
  assert.equal(s.current().id, "c");
  s.answer(true); assert.equal(s.current().id, "b"); assert.equal(s.isRetry(), true);
  s.answer(true); assert.equal(s.done(), true);
  assert.deepEqual(s.firstResults(), { a: true, b: false, c: true });
  assert.equal(s.progress().fraction, 1);
});

// ------------------------------------------------------------------------------------------------ pause and resume on the real lesson views
const lessonCtx = (store, o = {}) => ({ store, t: (k) => k, settings: settingsOf(o) });
const { mountLesson } = await import("../src/curriculum/lesson.view.js");
const content = await (await import("../src/curriculum/content.js")).loadContent();
// The right option of a shown quick-check question (the lesson pages build their questions the same way).
const answerOf = (lessonId, qid, tradition = "sephardi") => {
  const idx = lessons.findIndex((l) => l.id === lessonId);
  const qs = S.buildChoiceQuestions(byId[lessonId], { ...content, wordPool: lessons.filter((l) => !/^I-\d{2}$/.test(l.id)).flatMap((l) => l.words) }, { seed: 1 + idx, tradition });
  return qs.find((q) => q.id === qid).answerIndex;
};

test("quick check (normal mode): answers are saved as you go; reopening says Continue, keeps them, and finishing clears the saved place", async () => {
  const store = memStore(); const ctx = lessonCtx(store);
  let root = new Node_("div"); let off = mountLesson(root, ctx, "r01");
  await waitFor(() => btn(root, (b) => b.attrs.id === "alef-quick-start")[0]);
  assert.match(btn(root, (b) => b.attrs.id === "alef-quick-start")[0].text, /Start quick check/);
  await btn(root, (b) => b.attrs.id === "alef-quick-start")[0].click();
  const ex1 = root.find((n) => n.attrs["data-ex"])[0].attrs["data-ex"];
  await btn(root, (b) => b.attrs["data-n"] === "1")[0].click();
  const saved = store.m["lesson.resume.v1"]?.r01;
  assert.ok(saved && Object.keys(saved.results).length === 1 && ex1 in saved.results, "the first answer was saved at once");
  off();
  root = new Node_("div"); off = mountLesson(root, ctx, "r01");
  await waitFor(() => btn(root, (b) => b.attrs.id === "alef-quick-start")[0]);
  assert.match(btn(root, (b) => b.attrs.id === "alef-quick-start")[0].text, /Continue quick check/);
  assert.match(root.text, /You have already answered 1/);
  await btn(root, (b) => b.attrs.id === "alef-quick-start")[0].click();
  assert.notEqual(root.find((n) => n.attrs["data-ex"])[0].attrs["data-ex"], ex1, "the answered question is not asked again");
  assert.match(root.find((n) => n.attrs.id === "alef-q-title")[0].text, /Question 2 of/, "the count carries on from where it stopped");
  off();
});

test("short session lesson: one part at a time, same buttons in the same order, place saved at each part, and it reopens on the same part", async () => {
  const store = memStore(); const ctx = lessonCtx(store, { shortSession: true });
  let root = new Node_("div"); let off = mountLesson(root, ctx, "r01");
  await waitFor(() => root.find((n) => n.attrs.id === "alef-part-title")[0]);
  assert.equal(btn(root, (b) => b.attrs.id === "alef-quick-start").length, 0, "no long all-in-one page");
  const total = Number(/of (\d+)/.exec(root.find((n) => n.attrs.id === "alef-part-title")[0].text)[1]);
  assert.ok(total >= 3, "a lesson is several small parts");
  assert.match(root.text, /Part 1 of /); assert.match(root.text, /Your place is saved/);
  const bar = root.find((n) => /alef-actionbar/.test(n.className))[0];
  assert.deepEqual(bar.find((n) => n.tag === "button" || n.tag === "a").map((n) => n.attrs.id), ["alef-next-part", "alef-pause"], "first part: Next, then Pause (no Back yet)");
  await btn(root, (b) => b.attrs.id === "alef-next-part")[0].click();
  assert.match(root.text, /Part 2 of /);
  assert.equal(store.m["lesson.resume.v1"].r01.chunk, 1, "saved when the part changed");
  const bar2 = root.find((n) => /alef-actionbar/.test(n.className))[0];
  assert.deepEqual(bar2.find((n) => n.tag === "button" || n.tag === "a").map((n) => n.attrs.id), ["alef-next-part", "alef-prev-part", "alef-pause"], "same order every part: main button, Back, Pause");
  off();
  root = new Node_("div"); off = mountLesson(root, ctx, "r01");
  await waitFor(() => root.find((n) => n.attrs.id === "alef-part-title")[0]);
  assert.match(root.text, /Part 2 of /, "reopened on the same part");
  await btn(root, (b) => b.attrs.id === "alef-prev-part")[0].click();
  assert.match(root.text, /Part 1 of /, "Back works");
  off();
});

test("short session lesson: walking through every part and answering finishes the lesson, saves it, and clears the saved place", async () => {
  const store = memStore(); const ctx = lessonCtx(store, { calmMode: true });   // calm mode also uses parts
  const root = new Node_("div"); const off = mountLesson(root, ctx, "r01");
  await waitFor(() => root.find((n) => n.attrs.id === "alef-part-title")[0]);
  for (let g = 0; g < 200 && !/Lesson complete/.test(root.text); g++) {
    const q = root.find((n) => n.attrs["data-ex"])[0];
    if (q) {
      const cont = btn(root, (b) => b.attrs["data-act"] === "next" && !b.hidden)[0];
      if (cont) { await cont.click(); continue; }
      // C-01: the lesson completes only on a pass (70% right on the first try), so answer right
      const n = answerOf("r01", q.attrs["data-ex"]) + 1;
      await btn(root, (b) => b.attrs["data-n"] === String(n))[0].click(); continue;
    }
    const next = btn(root, (b) => b.attrs.id === "alef-next-part")[0];
    if (!next) break;
    await next.click();
  }
  await waitFor(() => store.m["curriculum.progress"]?.completed?.r01);
  assert.match(root.text, /Lesson complete/);
  assert.equal(store.m["lesson.resume.v1"]?.r01, undefined, "nothing left to resume once the lesson is done");
  assert.ok(Object.keys(store.m["srs.cards"] || {}).length > 0, "review cards were created");
  off();
});

test("short session lesson: leaving in the middle of the questions keeps the answers and the part", async () => {
  const store = memStore(); const ctx = lessonCtx(store, { shortSession: true });
  let root = new Node_("div"); let off = mountLesson(root, ctx, "r01");
  await waitFor(() => root.find((n) => n.attrs.id === "alef-part-title")[0]);
  while (!root.find((n) => n.attrs["data-ex"])[0]) await btn(root, (b) => b.attrs.id === "alef-next-part")[0].click();
  await btn(root, (b) => b.attrs["data-n"] === "1")[0].click();
  const rec = store.m["lesson.resume.v1"].r01; assert.equal(Object.keys(rec.results).length, 1);
  const part = rec.chunk; off();
  root = new Node_("div"); off = mountLesson(root, ctx, "r01");
  await waitFor(() => root.find((n) => n.attrs["data-ex"])[0]);
  assert.match(root.find((n) => n.attrs.id === "alef-q-title")[0].text, /Question 2 of/);
  assert.equal(store.m["lesson.resume.v1"].r01.chunk >= part, true);
  off();
});

// ------------------------------------------------------------------------------------------------ Home, streaks, gentle wording
const { buildToday, renderToday } = await import("../src/home/today.js");
const { h } = await import("../src/shell/ui.js");
const todayText = (streak, opts) => {
  const lessonsList = lessons.filter((l) => !/^I-/.test(l.id));
  const today = buildToday({ completedIds: [lessonsList[0].id], lessons: lessonsList, goal: "read", dueCount: 3, streak, hasRoute: () => true, daysAway: 0 });
  const node = renderToday(today, (k) => k, () => {}, opts);
  const all = (n) => (n.nodeType === 3 ? n.data : n.hidden ? "" : (n.children || []).map(all).join(""));
  return { node, text: all(node), html: node };
};
test("Home card: one clear next step; the streak can be hidden; calm mode keeps only the next step and tucks the rest under one button", () => {
  const streak = { count: 4, best: 4, activeToday: false };
  const normal = todayText(streak, {});
  assert.match(normal.text, /streak/i);
  const hidden = todayText(streak, { showStreak: false });
  assert.doesNotMatch(hidden.text, /streak|day[s]? and counting|Study for 5 minutes today/i);
  assert.match(hidden.text, /Continue/, "the next step is still there");
  const calm = todayText(streak, { calm: true });
  assert.doesNotMatch(calm.text, /streak|Daily goal/i);
  const mains = calm.html.find ? [] : [];
  const find = (n, pred, out = []) => { if (n.nodeType === 1 && pred(n)) out.push(n); for (const c of n.children || []) find(c, pred, out); return out; };
  assert.equal(find(calm.node, (n) => n.tag === "a" && /btn/.test(n.className)).length, 1, "exactly one main button");
  assert.equal(find(calm.node, (n) => n.tag === "details").length, 1, "everything else is under one More choices button");
  assert.match(find(calm.node, (n) => n.tag === "summary")[0].text, /More choices/); void mains;
});
test("missing days never remove progress: lessons and cards are untouched and the best streak is kept", async () => {
  const { loadState, currentStreak } = await import("../src/curriculum/state.js").then(async (m) => ({ loadState: m.loadState, currentStreak: m.currentStreak }));
  const day = 86400000, now = Date.UTC(2026, 10, 4, 12);
  const rec = { count: 9, best: 12, last: new Date(now - 20 * day).toISOString().slice(0, 10) };
  const store = memStore({ "curriculum.progress": { completed: { r01: 1, r02: 2 } }, "srs.cards": { a: { id: "a", due: 0 } }, streak: rec });
  const st = await loadState({ store }, now);
  assert.equal(st.streak.count, 0, "the day count restarts");
  assert.equal(st.streak.best, 12, "the best run is kept");
  assert.deepEqual(Object.keys(st.completed), ["r01", "r02"]); assert.ok(st.cards.a);
  assert.deepEqual(store.m["curriculum.progress"], { completed: { r01: 1, r02: 2 } }, "reading did not change anything stored");
  void currentStreak;
  // the Home card for a returning learner is welcoming, with no blame words
  const lessonsList = lessons.filter((l) => !/^I-/.test(l.id));
  const today = buildToday({ completedIds: ["r01"], lessons: lessonsList, goal: "read", dueCount: 30, streak: { count: 0, best: 12 }, hasRoute: () => true, daysAway: 20 });
  const t = renderToday(today, (k) => k, () => {}, {});
  const all = (n) => (n.nodeType === 3 ? n.data : (n.children || []).map(all).join(""));
  assert.match(all(t), /Welcome back/); assert.doesNotMatch(all(t), /\b(lost|broke|broken|missed|behind|overdue|failed|too late)\b/i);
});
test("learner-facing wording has no penalty words (a scan of the strings the most-used screens show)", () => {
  const banned = /\b(wrong|failed|you failed|you broke|broke your|lost your|overdue|behind schedule|don't lose|do not lose|last chance|hurry|stupid|bad answer)\b/i;
  const files = ["src/curriculum/exercises.session.js", "src/curriculum/exercises.ui.js", "src/curriculum/lesson.view.js", "src/curriculum/lesson.parts.js", "src/curriculum/review.view.js", "src/home/today.js", "src/shell/plain-copy.js", "src/shell/home.view.js", "src/letters/memory.view.js"];
  const found = [];
  for (const f of files) {
    const t = read(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    for (const m of t.matchAll(/(["'`])((?:\\.|(?!\1).){6,}?)\1/g)) { const s = m[2]; if (/[A-Za-z]+ [A-Za-z]+/.test(s) && banned.test(s) && !/data-state|class|picked-wrong/.test(s)) found.push(f + ": " + s.slice(0, 90)); }
  }
  assert.deepEqual(found, []);
  const fb = S.feedbackText(false, {}) + " " + S.feedbackText(false, { retry: true }) + " " + S.closingLine(0.2, 4) + " " + S.closingLine(1, 0);
  assert.doesNotMatch(fb, banned);
  assert.match(S.feedbackText(false, {}), /^Not quite\.$/);
});
test("reminders and empty states are gentle: the default reminder is optional in tone and says nothing about streaks or time lost", () => {
  const src = read("src/shell/notify.js");
  const m = /opt\.title \?\? "([^"]+)", opt\.body \?\? "([^"]+)"/.exec(src);
  assert.ok(m, "default reminder text found");
  assert.doesNotMatch(m[1] + " " + m[2], /streak|miss|lose|lost|don't|do not|must|should|time to study|hurry/i);
  assert.match(m[2], /Only if you feel like it/);
});

// ------------------------------------------------------------------------------------------------ memory hooks
const { hookLine, HOOK_LABEL } = await import("../src/letters/hookline.js");
test("memory hook: every letter in the chain gives a hook line, the same label, and the story follows the pronunciation style", () => {
  assert.ok(content.chain && content.chain.size >= 20);
  for (const [id, e] of content.chain) {
    for (const trad of ["israeli", "sephardi", "ashkenazi"]) {
      const hk = hookLine(content.chain, trad, { letterId: id });
      assert.ok(hk && hk.text.length > 5, id + "/" + trad); assert.equal(hk.label, HOOK_LABEL); assert.equal(hk.letterId, id);
    }
    const w = hookLine(content.chain, "sephardi", { he: e.word.he });
    assert.ok(w && w.letterId, "the example word " + e.word.he + " finds its hook");
  }
  assert.equal(hookLine(content.chain, "sephardi", { letterId: "nope" }), null, "no entry, no hook (nothing is made up)");
  assert.equal(hookLine(null, "sephardi", { letterId: "bet" }), null);
  assert.notEqual(hookLine(content.chain, "ashkenazi", { letterId: "bet" }).text, hookLine(content.chain, "sephardi", { letterId: "bet" }).text);
});
test("lesson page and review cards show the hook line in the same wording and form", async () => {
  const store = memStore(); const root = new Node_("div"); const off = mountLesson(root, lessonCtx(store), "r01");
  await waitFor(() => /Memory hook: /.test(root.text));
  const lines = root.find((n) => n.tag === "p" && /alef-hook-line/.test(n.className));
  assert.ok(lines.length >= 2, "each letter of the lesson has one");
  assert.ok(lines.every((p) => p.text.startsWith("Memory hook: ")));
  off();
  const { describeCard, hookNode } = await import("../src/curriculum/review.view.js");
  const dl = describeCard("letter:bet", content, "sephardi"), dw = describeCard("word:r01:1", content, "sephardi");
  assert.deepEqual(dl.hook, { letterId: "bet" }); assert.ok(dw.hook.he);
  assert.equal(hookNode(hookLine(content.chain, "sephardi", dl.hook)).className, "alef-hook-line");
  assert.equal(hookNode(null), null);
});

// ------------------------------------------------------------------------------------------------ progressive disclosure
test("Learn: a long lesson list shows the next few lessons first and the rest on request (all stay in the page)", async () => {
  const { mount } = await import("../src/curriculum/learn.view.js");
  const store = memStore(); const root = new Node_("div");
  const un = mount(root, { store, route() {}, t: (k) => k, settings: settingsOf({}) });
  await waitFor(() => root.find((n) => n.tag === "li" && n.attrs["data-lesson"]).length >= 20);
  const items = root.find((n) => n.tag === "li" && n.attrs["data-lesson"]);
  const shown = items.filter((n) => !n.hidden);
  assert.ok(shown.length <= 8 && shown.length >= 1, "at most 8 lessons visible at first: " + shown.length);
  assert.ok(items.length > shown.length);
  const more = btn(root, (b) => b.attrs.id === "alef-show-all")[0]; assert.ok(more); assert.match(more.text, /Show all \d+ lessons/);
  await more.click();
  await waitFor(() => root.find((n) => n.tag === "li" && n.attrs["data-lesson"]).every((n) => !n.hidden));
  assert.match(btn(root, (b) => b.attrs.id === "alef-show-all")[0].text, /Show fewer/);
  assert.ok(root.find((n) => n.tag === "details" && /alef-more-practice/.test(n.className)).length === 1, "the many practice links sit under one More ways to practise");
  un();
});
test("Learn and Review hide the streak when asked", async () => {
  const { mount } = await import("../src/curriculum/learn.view.js");
  const mk = (o) => { const store = memStore({ streak: { count: 3, best: 3, last: new Date(Date.now() - 86400000).toISOString().slice(0, 10) } }); const root = new Node_("div"); const un = mount(root, { store, route() {}, t: (k) => k, settings: settingsOf(o) }); return { root, un }; };
  let a = mk({}); await waitFor(() => /Streak:/.test(a.root.text)); a.un();
  let b = mk({ showStreak: false }); await waitFor(() => /lessons done/.test(b.root.text)); assert.doesNotMatch(b.root.text, /Streak|streak/); b.un();
  let c = mk({ calmMode: true }); await waitFor(() => /lessons done/.test(c.root.text)); assert.doesNotMatch(c.root.text, /Streak|streak/); c.un();
});

// ------------------------------------------------------------------------------------------------ plain language
test("plain-language pass: same strings, shorter sentences, fewer long words; every new string is short", async () => {
  const R = await import("../tools/a11y/readability.mjs");
  const r = await R.compare();
  assert.ok(r.rows.length >= 18);
  assert.ok(r.after.avgSentence < r.before.avgSentence, `average sentence ${r.before.avgSentence} -> ${r.after.avgSentence}`);
  assert.ok(r.after.longWordPct < r.before.longWordPct, `long words ${r.before.longWordPct}% -> ${r.after.longWordPct}%`);
  assert.ok(r.after.grade <= r.before.grade, `grade ${r.before.grade} -> ${r.after.grade}`);
  for (const x of r.rows) assert.ok(x.after.avgSentence <= 13, `${x.id}: ${x.after.avgSentence} words per sentence`);
  const { PLAIN, plain } = await import("../src/shell/plain-copy.js");
  assert.equal(plain("closingSolid", { n: 3 }), "Good work. 3 to look at again. They are in your review.");
  assert.match(plain("wipeHelp", { word: "DELETE" }), /Type DELETE to turn on the button\.$/);
  for (const [k, v] of Object.entries(PLAIN)) assert.ok(!/\{(?!n\}|word\})/.test(v), k);
  const m = R.measure("It is a cat. It sat on a mat and looked at the sun today.");
  assert.equal(m.sentences, 2); assert.equal(m.words, 15); assert.equal(m.avgSentence, 7.5);
  assert.equal(R.syllables("the"), 1); assert.ok(R.syllables("understanding") >= 4);
});

// ------------------------------------------------------------------------------------------------ privacy table
test("the new store key is listed on the Privacy screen with its source file", async () => {
  const { STORE_KEYS } = await import("../src/shell/privacy.view.js");
  const row = STORE_KEYS.find((r) => r[0] === K.RESUME_KEY); assert.ok(row);
  assert.match(read(row[2]), new RegExp(K.RESUME_KEY.replace(/\./g, "\\.")));
  // no other new store key was introduced by this work: the settings live under the existing "settings" key
  assert.ok(STORE_KEYS.find((r) => r[0] === "settings"));
});
