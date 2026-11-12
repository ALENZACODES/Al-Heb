// C9: grammar spotlights come only from the existing grammar data, each with a three-question drill; the Name is never spelled out.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const S = await import("../src/coursemap/spotlight.js");
const B = await import("../tools/grammar/build-spotlights.mjs");
const data = JSON.parse(readFileSync(new URL("../data/grammar/spotlights.json", import.meta.url), "utf8"));
const { lessons } = await import("../src/curriculum/lessons.js");
const sk = (s) => String(s || "").replace(/[֑-ׇ]/g, "").replace(/[־׃]/g, "");

test("the committed spotlight file is what the builder makes from the grammar data (not hand-written)", async () => {
  const built = await B.build();
  assert.deepEqual(JSON.parse(JSON.stringify(built)), data);
});

test("each spotlight's examples are forms of its own topic found in that lesson's words or prayer lines", async () => {
  const { buildTopics } = await import("../src/grammar/model.js"); const { loadGrammarData } = await import("../src/grammar/loader.js");
  const gd = await loadGrammarData(); const topics = buildTopics(gd); const reg = new Map(gd.registry.map((e) => [e.id, e]));
  assert.ok(Object.keys(data.lessons).length >= 20);
  for (const [id, s] of Object.entries(data.lessons)) {
    const l = lessons.find((x) => x.id === id); assert.ok(l, id);
    const forms = new Set([...l.words.map((w) => sk(w.he)), ...l.prayerLines.flatMap((p) => sk(reg.get(p)?.he || "").split(/\s+/))]);
    for (const ex of s.examples) {
      assert.ok(topics[s.topic].items.some((i) => i.he === ex.he), `${id}: example is a topic form`);
      const it = topics[s.topic].items.find((i) => i.he === ex.he), line = (/^reg:([^#]+)#/.exec(it.id || "") || [])[1] || it.entryId;
      assert.ok(forms.has(sk(ex.he)) || l.prayerLines.includes(line), `${id}: example is in the lesson`);
    }
  }
  for (const t of Object.values(data.topics)) { assert.ok(t.drill.length <= 3); for (const q of t.drill) assert.ok(q.options[q.answer]); }
});

test("spotlightFor / node: three questions, the Name shown as ה׳, a drill that scores", async () => {
  const id = Object.entries(data.lessons).find(([, v]) => v.topic === "openings")?.[0];
  const s = S.spotlightFor(data, id); assert.equal(s.drill.length, 3);
  assert.equal(S.spotlightFor(data, "nope"), null);
  class N { constructor(t) { this.tag = t; this.children = []; this.attrs = {}; this.listeners = {}; this.nodeType = 1; this.hidden = false; this.disabled = false; }
    setAttribute(k, v) { this.attrs[k] = v; if (k === "hidden") this.hidden = true; } removeAttribute(k) { delete this.attrs[k]; if (k === "hidden") this.hidden = false; }
    addEventListener(t, f) { (this.listeners[t] ||= []).push(f); } append(...c) { for (const x of c) if (x != null) this.children.push(x.nodeType ? x : { nodeType: 3, data: String(x) }); }
    replaceChildren(...c) { this.children = []; this.append(...c); } set textContent(v) { this.children = [{ nodeType: 3, data: String(v) }]; }
    get text() { return this.children.map((c) => (c.nodeType === 3 ? c.data : c.text)).join(""); } find(p, o = []) { if (p(this)) o.push(this); for (const c of this.children) if (c.nodeType === 1) c.find(p, o); return o; }
    click() { for (const f of this.listeners.click || []) f({}); } focus() {} }
  const prev = globalThis.document; globalThis.document = { createElement: (t) => new N(t), createTextNode: (d) => ({ nodeType: 3, data: String(d) }) };
  try {
    const node = S.spotlightNode(s);
    assert.doesNotMatch(node.text, /יהוה|יְהוָה/, "the Name is abbreviated"); assert.match(node.text, /Grammar Spotlight/);
    for (let q = 0; q < 3; q++) { node.find((n) => n.attrs["data-opt"] === "0")[0].click(); node.find((n) => n.tag === "button" && !n.hidden && /Next question|See the score/.test(n.text))[0].click(); }
    assert.match(node.text, /of 3 right/);
  } finally { globalThis.document = prev; }
});

test("lesson and intermediate pages load the spotlight on demand; the data file is on demand", async () => {
  for (const f of ["src/curriculum/lesson.view.js", "src/curriculum/intermediate.view.js"]) assert.match(readFileSync(new URL("../" + f, import.meta.url), "utf8"), /import\("\.\.\/coursemap\/spotlight\.js"\)/);
  const { isOnDemand } = await import("../tools/build-precache.mjs");
  assert.ok(isOnDemand("data/grammar/spotlights.json") && isOnDemand("src/coursemap/spotlight.js"));
});
