// Rabbi-appeal / lesson-sense checks added 2026-11-10.
// These catch the concrete errors found in the overnight lesson audit:
// wrong nikkud (map, charger, course), the Yom Kippur greeting, and prayers
// attached to the wrong occasion. Divine-name display is held for John and is
// not changed or asserted here.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const root = new URL("../", import.meta.url);
const J = (p) => JSON.parse(fs.readFileSync(new URL(p, root), "utf8"));
const main = J("data/curriculum/lessons.json");
const byId = Object.fromEntries(main.lessons.map((l) => [l.id, l]));
const blob = (id) => JSON.stringify(byId[id], null, 0);

test("I-16 teaches מַטְעֵן (charger), not מִטְעָן (cargo)", () => {
  const s = blob("I-16");
  assert.equal(s.includes("מִטְעָן"), false);
  assert.equal(s.includes("מַטְעֵן"), true);
  const w = byId["I-16"].words.find((x) => x.he === "מַטְעֵן");
  assert.ok(w, "charger word present");
  assert.match(w.en, /charger/i);
});

test("I-37 teaches קוּרְס (a course), not קוֹרֵס (is collapsing)", () => {
  const s = blob("I-37");
  assert.equal(s.includes("קוֹרֵס"), false);
  assert.equal(s.includes("קוּרְס"), true);
});

test("I-40 teaches מַפָּה (a map), not מִפָּה (to map)", () => {
  const s = blob("I-40");
  assert.equal(s.includes("מִפָּה"), false);
  assert.equal(s.includes("מַפָּה"), true);
});

test("Yom Kippur lessons teach גמר חתימה טובה, not only שנה טובה", () => {
  for (const id of ["I-28", "I-50"]) {
    const s = blob(id);
    assert.ok(s.includes("גְּמַר חֲתִימָה טוֹבָה"), `${id} is missing the Yom Kippur greeting`);
    const respond = (byId[id].exercises || []).find((e) => e.type === "respond" && /Yom Kippur/i.test(e.cue || "") && /Greet your neighbour/i.test(e.cue || ""));
    assert.ok(respond, `${id} has no Yom Kippur greeting cue`);
    assert.equal(respond.answer.he, "גְּמַר חֲתִימָה טוֹבָה");
  }
});

test("Hallel, Sukkot and Purim lessons do not borrow a prayer from another occasion as a stand-in", () => {
  const hallel = new Set(byId["I-07"].prayerLines);
  assert.equal(hallel.has("birkat-hamazon-1"), false);
  assert.equal(hallel.has("havdalah-opening"), false);
  // yehalelu may be listed so the synagogue lesson has a real corpus line; no exercise may treat it as Hallel
  const hallelEx = JSON.stringify(byId["I-07"].exercises);
  assert.equal(hallelEx.includes("birkat-hamazon-1"), false);
  assert.equal(hallelEx.includes("havdalah-opening"), false);
  assert.equal(hallelEx.includes("yehalelu"), false);
  const sukkot = new Set(byId["I-30"].prayerLines);
  assert.equal(sukkot.has("havdalah-opening"), false);
  assert.equal(sukkot.has("kiddush-veshamru"), false);
  const purim = new Set(byId["I-31"].prayerLines);
  assert.equal(purim.has("hagomel"), false);
});

test("the Pesach seder cue does not claim the long Kiddush ends with mekadesh (the Shabbat wording)", () => {
  const e = byId["I-29"].exercises.find((x) => x.id === "I-29-e13");
  assert.ok(e);
  assert.doesNotMatch(e.cue, /long Kiddush blessing ends 'mekadesh'/i);
  assert.match(e.cue, /festival Kiddush|not yet in the corpus/i);
});

test("kinship and ancestor source ids point at the name or kinship lemma, not a lookalike verb or masculine pair", () => {
  const src = (id, he) => (byId[id].words.find((w) => w.he === he) || {}).source || {};
  assert.equal(src("I-02", "יַעֲקֹב").id, "p07b88d14");
  assert.equal(src("I-20", "אָחוֹת").id, "h18108dff");
  assert.equal(src("I-42", "אִמָּא").id, "h1306c935");
});

test("take-care greeting is labelled as said to a man, and the feminine form is taught", () => {
  const wM = byId["I-50"].words.find((w) => w.he === "תִּשְׁמֹר עַל עַצְמְךָ");
  const wF = byId["I-50"].words.find((w) => w.he === "תִּשְׁמְרִי עַל עַצְמֵךְ");
  assert.ok(wM && /man/i.test(wM.en));
  assert.ok(wF && /woman/i.test(wF.en));
});

test("lesson-lexicon.json holds the curated pointed forms the lessons now use", () => {
  const lex = J("data/curriculum/lesson-lexicon.json");
  const he = new Set(lex.entries.map((e) => e.he));
  for (const need of ["מַפָּה", "מַטְעֵן", "קוּרְס", "גְּמַר חֲתִימָה טוֹבָה", "חַג כָּשֵׁר וְשָׂמֵחַ"]) {
    assert.ok(he.has(need), need);
  }
});

test("I-10 tells the learner when Ken yehi ratzon is the answer, and when Amen is", () => {
  const g = byId["I-10"].goals.join(" ");
  assert.match(g, /Ken yehi ratzon/);
  assert.match(g, /kohanim/i);
  assert.match(g, /Amen/);
  const e = (byId["I-10"].exercises || []).find((x) => x.id === "I-10-e13");
  assert.match(e.cue, /leader \(not kohanim\)/);
  assert.match(e.cue, /Ken yehi ratzon/);
  assert.equal(e.answer.he, "כֵּן יְהִי רָצוֹן");
});

test("I-32 names the Edot HaMizrach candle-blessing wording and the common Ashkenaz variant", () => {
  const s = blob("I-32");
  assert.ok(s.includes("נֵר חֲנֻכָּה"));
  assert.match(s, /Edot HaMizrach/);
  assert.match(s, /ner shel Chanukah/);
});

test("I-28 names Kol Nidrei as a gap, and I-08 names the Edot HaMizrach wording of Aleinu", () => {
  assert.ok(byId["I-28"].goals.some((g) => /Kol Nidrei/.test(g)));
  assert.ok(byId["I-08"].goals.some((g) => /Edot HaMizrach/.test(g)));
});
