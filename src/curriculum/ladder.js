/**
 * Syllable ladder (concept gr-alh-01, "Hear a syllable, pick the matching card"), pure logic.
 * Generated from data/letters/letters.json, data/letters/confusables.json and data/pronunciation/niqqud.json (read-only).
 *
 * Shape: ladder = { levels: [{ level, newLetters, newVowels, items:[{ id, kind, audioKind, audioId, target, glyph, letter, vowel, distractors:[{id,glyph}] }] }] }
 * Level 1 is the seed ("a tiny alphabet": two letters on one vowel); every later level adds at most ONE new letter or vowel.
 * Levels after the 22 syllable letters add one FINAL letter form each (audio kind "letter", because no syllable clips exist for finals).
 *
 * Distractors are chosen from letters/vowels the learner has already met and are never homophones of the target. Homophone
 * detection uses a small hand-written sound-class table (below); it is deliberately conservative (treats a pair as the same
 * sound if ANY tradition might merge it) and has NOT been checked by a native speaker.
 */
import { loadJSON } from "./data.js";
import { rng, shuffled } from "./spotit.js";

export const VOWEL_FAMILIES = ["a", "e", "i", "o", "u"];
/** Representative vowel sign per family, resolved against niqqud.json records. */
export const FAMILY_SIGN = { a: "patach", e: "segol", i: "chirik", o: "cholam", u: "kubutz" };
/** Near-miss vowel families by sound (own judgement). */
const NEAR_VOWEL = { a: ["o", "e"], e: ["i", "a"], i: ["e", "u"], o: ["u", "a"], u: ["o", "i"] };
/** Letters that sound alike in some tradition (merged to one class). Everything else is its own class. */
const SOUND_CLASS = { tet: "t", tav: "t", qof: "k", kaf: "k", alef: "glottal", ayin: "glottal" };
/** A final form sounds like its base letter. */
export const soundClass = (letterId) => { const b = letterId.replace(/-final$/, ""); return SOUND_CLASS[b] || b; };
export const soundKey = (letterId, family) => `${soundClass(letterId)}|${family}`;

/** Teaching order: seed (first three), then one new letter or vowel per level. "V:" = vowel family, "L:" = letter. */
export const SEQUENCE = ["L:bet", "L:kaf", "V:a", "L:pe", "L:gimel", "L:nun", "V:i", "L:dalet", "L:resh", "L:vav", "V:u", "L:zayin", "L:yod", "L:he",
  "V:o", "L:chet", "L:tav", "L:tet", "V:e", "L:samekh", "L:mem", "L:shin", "L:lamed", "L:alef", "L:ayin", "L:tsadi", "L:qof"];
export const FINALS = ["kaf-final", "mem-final", "nun-final", "tsadi-final", "pe-final"];
const DAGESH_LETTERS = new Set(["bet", "kaf", "pe"]);
const SHIN_DOT = "ׁ";

export const syllableId = (letterId, family) => `${letterId}-${family}`;

/** Glyph of a consonant+vowel syllable, in the same spelling as the audio manifest ("בַּ", "שַׁ"). Marks are NFC-normalised. */
export function syllableGlyph(letter, signChar, letterId) {
  return (letter.he + (DAGESH_LETTERS.has(letterId) ? "ּ" : "") + (letterId === "shin" ? SHIN_DOT : "") + signChar).normalize("NFC");
}

function neighbours(letterId, confusables) {
  const out = [];
  for (const s of confusables?.sets || []) if (s.letters.includes(letterId)) for (const x of s.letters) if (x !== letterId && !out.includes(x)) out.push(x);
  return out;
}

/**
 * @param {{letters:object[], niqqud:{records:object[]}, confusables:object}} data
 */
export function buildLadder({ letters, niqqud, confusables }) {
  const L = new Map(letters.map((l) => [l.id, l]));
  const signChar = {};
  for (const f of VOWEL_FAMILIES) {
    const rec = niqqud.records.find((r) => r.id === FAMILY_SIGN[f]);
    if (!rec) throw new Error("niqqud record missing: " + FAMILY_SIGN[f]);
    signChar[f] = String.fromCodePoint(parseInt(rec.codepoints[0].slice(2), 16));
  }
  const syllItem = (letterId, family) => ({ letterId, family, glyph: syllableGlyph(L.get(letterId), signChar[family], letterId) });

  const knownL = [], knownV = [];
  const levels = [];
  const pushLevel = (newLetters, newVowels, items) => levels.push({ level: levels.length + 1, newLetters, newVowels, items });

  // distractor candidates for (letter, family) given what is known so far
  function syllDistractors(letterId, family, kl, kv) {
    const t = soundKey(letterId, family), seen = new Set([t]), out = [];
    const add = (l, f, why) => { const k = soundKey(l, f); if (seen.has(k) || !kl.includes(l) || !kv.includes(f)) return; seen.add(k); out.push({ id: syllableId(l, f), glyph: syllItem(l, f).glyph, why }); };
    for (const n of neighbours(letterId, confusables)) add(n, family, "look-alike letter");
    for (const f of NEAR_VOWEL[family]) add(letterId, f, "near vowel");
    for (const l of kl) add(l, family, "other letter");
    for (const f of kv) add(letterId, f, "other vowel");
    return out;
  }
  const mkItem = (letterId, family, kl, kv) => {
    const s = syllItem(letterId, family);
    return { id: syllableId(letterId, family), kind: "syllable", audioKind: "syllable", audioId: syllableId(letterId, family), target: syllableId(letterId, family),
      glyph: s.glyph, letter: letterId, vowel: family, distractors: syllDistractors(letterId, family, kl, kv) };
  };

  // level 1: the seed
  const seedL = SEQUENCE.slice(0, 2).map((x) => x.slice(2)), seedV = [SEQUENCE[2].slice(2)];
  knownL.push(...seedL); knownV.push(...seedV);
  pushLevel(seedL, seedV, seedL.map((l) => mkItem(l, seedV[0], knownL, knownV)));

  for (const step of SEQUENCE.slice(3)) {
    const id = step.slice(2);
    if (step[0] === "L") {
      knownL.push(id);
      pushLevel([id], [], knownV.map((v) => mkItem(id, v, knownL, knownV)));
    } else {
      knownV.push(id);
      // newest letters first, capped, so a vowel level stays short
      const pick = knownL.slice().reverse().slice(0, 8);
      pushLevel([], [id], pick.map((l) => mkItem(l, id, knownL, knownV)));
    }
  }

  // final-form levels (audio kind "letter")
  for (const f of FINALS) {
    const base = f.replace(/-final$/, "");
    const seen = new Set([soundClass(f)]), dis = [];
    const add = (l) => { if (!L.has(l) || seen.has(soundClass(l)) || (!knownL.includes(l) && !FINALS.includes(l))) return; seen.add(soundClass(l)); dis.push({ id: l, glyph: L.get(l).he, why: "look-alike letter" }); };
    for (const n of neighbours(f, confusables)) add(n);
    for (const n of neighbours(base, confusables)) add(n);
    for (const l of knownL) add(l);
    const item = { id: f, kind: "final", audioKind: "letter", audioId: f, target: f, glyph: L.get(f).he, letter: f, vowel: null, distractors: dis.slice(0, 6) };
    knownL.push(f);
    pushLevel([f], [], [item]);
  }
  return { levels, order: SEQUENCE, finals: FINALS };
}

let cached;
/** Load the ladder from the data files (fetch in browser, fs in Node). */
export function loadLadder() {
  cached ??= (async () => {
    const [letters, niqqud, confusables] = await Promise.all([loadJSON("data/letters/letters.json"), loadJSON("data/pronunciation/niqqud.json"), loadJSON("data/letters/confusables.json")]);
    return buildLadder({ letters, niqqud, confusables });
  })();
  cached.catch(() => { cached = undefined; });
  return cached;
}

/** Every item id of a ladder, flat. */
export const allItems = (ladder) => ladder.levels.flatMap((l) => l.items);

/**
 * Deterministic practice session. Rules: STREAK_UP correct answers in a row at a level advance one level;
 * two wrong answers in a row drop back one level (never below 1). Cleared when the last level is advanced past.
 */
export const STREAK_UP = 3, WRONG_DROP = 2;
export function createLadderSession(ladder, { seed = 1, level = 1 } = {}) {
  const rand = rng(seed);
  const max = ladder.levels.length;
  let lvl = Math.min(max, Math.max(1, level)), streak = 0, wrongRun = 0, cleared = false, pending = null, n = 0;
  const missed = new Set(), right = new Set(), asked = [];
  let best = lvl;

  function pickItem() {
    const cur = ladder.levels[lvl - 1];
    const earlier = ladder.levels.slice(0, lvl - 1).flatMap((l) => l.items);
    const useEarlier = earlier.length && rand() < 0.3;
    const pool = useEarlier ? earlier : cur.items;
    // avoid an immediate repeat when possible
    const last = asked.at(-1);
    const choices = pool.length > 1 ? pool.filter((i) => i.id !== last) : pool;
    return choices[Math.floor(rand() * choices.length)];
  }
  function next() {
    if (cleared) return null;
    const item = pickItem();
    const dis = item.distractors[Math.floor(rand() * Math.min(2, item.distractors.length))];
    const options = shuffled([{ id: item.id, glyph: item.glyph, correct: true }, { id: dis.id, glyph: dis.glyph, correct: false }], rand);
    pending = { n: ++n, level: lvl, item, options };
    asked.push(item.id);
    return pending;
  }
  return {
    current: () => pending || next(),
    /** @returns {{correct:boolean, correctId:string, event:null|"advance"|"drop"|"cleared", level:number, finished:boolean}} */
    answer(optionId) {
      const p = pending || next();
      if (!p) throw new Error("session is finished");
      pending = null;
      const correct = optionId === p.item.id;
      let event = null;
      if (correct) {
        right.add(p.item.id); wrongRun = 0; streak++;
        if (streak >= STREAK_UP) {
          streak = 0;
          if (lvl >= max) { cleared = true; event = "cleared"; } else { lvl++; best = Math.max(best, lvl); event = "advance"; }
        }
      } else {
        missed.add(p.item.id); streak = 0; wrongRun++;
        if (wrongRun >= WRONG_DROP) { wrongRun = 0; if (lvl > 1) { lvl--; event = "drop"; } }
      }
      return { correct, correctId: p.item.id, event, level: lvl, finished: cleared };
    },
    state: () => ({ level: lvl, best, streak, wrongRun, cleared, answered: n - (pending ? 1 : 0), missed: [...missed], right: [...right] }),
  };
}
