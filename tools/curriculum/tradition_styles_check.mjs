#!/usr/bin/env node
// Offline tradition-style checks: transliteration rules + settings/audio switch.
// Reads a JSON array of {id, kind, he} from stdin or --items path; writes JSON to stdout.
import { readFileSync } from 'node:fs';
import { transliterate } from '../../src/pronunciation/transliterate.js';
import { respellAll } from '../../src/pronunciation/forTradition.js';
import { createAudio, PLAYBACK_TRADITION, isAccentClip } from '../../src/audio/player.js';
import { loadManifestFull } from '../audio/manifest_io.mjs';

const args = process.argv.slice(2);
const itemsPath = args.includes('--items') ? args[args.indexOf('--items') + 1] : null;
const items = itemsPath
  ? JSON.parse(readFileSync(itemsPath, 'utf8'))
  : JSON.parse(readFileSync(0, 'utf8'));

const TAV = 'ת';
const DAGESH = '\u05BC';
const KAMATZ = '\u05B8';
const KAMATZ_KATAN = '\u05C7';

function hasUndageshedTav(he) {
  const s = String(he || '');
  for (let i = 0; i < s.length; i++) {
    if (s[i] === TAV) {
      const next = s[i + 1] || '';
      if (next !== DAGESH) return true;
    }
  }
  return false;
}
function hasKamatzGadol(he) {
  const s = String(he || '');
  return s.includes(KAMATZ) && true;
}

const translit = items.map((it) => {
  const he = it.he || '';
  const israeli = transliterate(he, { scheme: 'siddur', tradition: 'israeli' });
  const sephardi = transliterate(he, { scheme: 'siddur', tradition: 'sephardi' });
  const ashkenazi = transliterate(he, { scheme: 'siddur', tradition: 'ashkenazi' });
  const all = respellAll(he);
  const expectTav = hasUndageshedTav(he);
  const expectKamatz = hasKamatzGadol(he);
  const fails = [];
  if (israeli !== sephardi) {
    fails.push('israeli-sephardi-latin-should-match');
  }
  if (expectTav) {
    // Ashkenazi should use s (sav) somewhere israeli uses t, for this word family.
    // Check the known tav rule on the isolated letter in context by comparing strings
    // after normalizing vowels: if israeli has t and ashkenazi the same slot is s.
    if (!/s/i.test(ashkenazi) && /t/i.test(israeli)) {
      // may still be ok if t comes only from tet; do a stricter cluster check below
    }
    // Build consonant-only skeletons from the engine by also requesting...
    const ashkHasSav = /s/i.test(ashkenazi);
    const isrHasT = /t/i.test(israeli);
    // If the only t/s difference we can test is full-string inequality when tav is present
    if (israeli.replace(/[tT]/g, 'T') === ashkenazi.replace(/[sS]/g, 'T') || israeli !== ashkenazi) {
      // pass if they differ in the expected direction or map t->s
    }
    const mapped = israeli.replace(/t/gi, (m) => (m === 'T' ? 'S' : 's'));
    // Not every t is a tav (tet is also t). Only fail if ashkenazi equals israeli despite undageshed tav
    // and the word actually contains a tav that should become s.
    // Use a letter-by-letter walk via transliterate of just the tav cluster: תָ or ת at end.
  }
  // Explicit tav-without-dagesh microcheck: isolated ת with a patach / at end
  const tavRule = {
    israeli: transliterate('תַ', { scheme: 'siddur', tradition: 'israeli' }),
    sephardi: transliterate('תַ', { scheme: 'siddur', tradition: 'sephardi' }),
    ashkenazi: transliterate('תַ', { scheme: 'siddur', tradition: 'ashkenazi' }),
  };
  const kamatzRule = {
    israeli: transliterate('בָּ', { scheme: 'siddur', tradition: 'israeli' }),
    sephardi: transliterate('בָּ', { scheme: 'siddur', tradition: 'sephardi' }),
    ashkenazi: transliterate('בָּ', { scheme: 'siddur', tradition: 'ashkenazi' }),
  };
  const ruleFails = [];
  if (tavRule.israeli !== 'ta' || tavRule.sephardi !== 'ta' || tavRule.ashkenazi !== 'sa') {
    ruleFails.push({ rule: 'tav-without-dagesh', ...tavRule, expected: { israeli: 'ta', sephardi: 'ta', ashkenazi: 'sa' } });
  }
  const dageshTav = {
    israeli: transliterate('תָּ', { scheme: 'siddur', tradition: 'israeli' }),
    ashkenazi: transliterate('תָּ', { scheme: 'siddur', tradition: 'ashkenazi' }),
  };
  // תָּ is tav with dagesh + kamatz: israeli 'ta', ashkenazi 'to' (dagesh keeps t, kamatz becomes o)
  if (dageshTav.israeli !== 'ta' || dageshTav.ashkenazi !== 'to') {
    // record but don't block if close
    ruleFails.push({ rule: 'tav-with-dagesh-kamatz', ...dageshTav, expected: { israeli: 'ta', ashkenazi: 'to' } });
  }
  if (kamatzRule.israeli !== 'ba' || kamatzRule.sephardi !== 'ba' || !/^bo/.test(kamatzRule.ashkenazi)) {
    ruleFails.push({ rule: 'kamatz-gadol', ...kamatzRule, expected: { israeli: 'ba', sephardi: 'ba', ashkenazi: 'bo' } });
  }
  const itemFails = [];
  if (all.israeli !== all.sephardi) itemFails.push('latin-israeli-sephardi-differ');
  if ((expectTav || expectKamatz) && all.israeli === all.ashkenazi) {
    itemFails.push('latin-ashkenazi-did-not-differ');
  }
  return {
    id: it.id,
    kind: it.kind,
    he,
    translit: { israeli, sephardi, ashkenazi },
    expectTav,
    expectKamatz,
    differsAshkenazi: israeli !== ashkenazi,
    sameIsraeliSephardi: israeli === sephardi,
    itemFails,
    // attach global rule check once on first item
  };
});

const all = loadManifestFull();
const admitted = all.filter((e) => isAccentClip(e)).map((e) => e.path);
const audio = {
  PLAYBACK_TRADITION,
  admittedAccentClips: admitted,
};
const switchResults = items.slice(0, 20).map((it) => {
  const out = { id: it.id, kind: it.kind, paths: {}, texts: respellAll(it.he) };
  for (const setting of ['israeli', 'sephardi', 'ashkenazi']) {
    const p = createAudio({
      settings: { voice: 'm', congregation: setting },
      manifest: all,
      AudioCtor: class {},
      speech: null,
      UtteranceCtor: null,
    });
    const r = p.status(it.kind, it.id);
    out.paths[setting] = { source: r.source, path: r.path, tradition: r.tradition, fileTradition: r.fileTradition, reason: r.reason };
  }
  const paths = Object.values(out.paths).map((x) => x.path);
  out.audioChangesWithSetting = new Set(paths).size > 1;
  out.allIsraeliFiles = paths.every((p) => typeof p === 'string' && p.includes('/israeli/'));
  out.textChangesWithSetting = out.texts.israeli !== out.texts.ashkenazi;
  return out;
});

const probe = {
  tav: {
    israeli: transliterate('תַ', { scheme: 'siddur', tradition: 'israeli' }),
    sephardi: transliterate('תַ', { scheme: 'siddur', tradition: 'sephardi' }),
    ashkenazi: transliterate('תַ', { scheme: 'siddur', tradition: 'ashkenazi' }),
  },
  kamatz: {
    israeli: transliterate('בָּ', { scheme: 'siddur', tradition: 'israeli' }),
    sephardi: transliterate('בָּ', { scheme: 'siddur', tradition: 'sephardi' }),
    ashkenazi: transliterate('בָּ', { scheme: 'siddur', tradition: 'ashkenazi' }),
  },
  shabbat: {
    israeli: transliterate('שַׁבָּת', { scheme: 'siddur', tradition: 'israeli' }),
    sephardi: transliterate('שַׁבָּת', { scheme: 'siddur', tradition: 'sephardi' }),
    ashkenazi: transliterate('שַׁבָּת', { scheme: 'siddur', tradition: 'ashkenazi' }),
  },
  shabbatGeminate: {
    israeli: transliterate('שַׁבָּת', { scheme: 'siddur', tradition: 'israeli', geminate: true }),
    sephardi: transliterate('שַׁבָּת', { scheme: 'siddur', tradition: 'sephardi', geminate: true }),
    ashkenazi: transliterate('שַׁבָּת', { scheme: 'siddur', tradition: 'ashkenazi', geminate: true }),
  },
};
const probeFails = [];
if (probe.tav.israeli !== 'ta' || probe.tav.sephardi !== 'ta' || probe.tav.ashkenazi !== 'sa') {
  probeFails.push({ rule: 'tav-without-dagesh', got: probe.tav, expected: { israeli: 'ta', sephardi: 'ta', ashkenazi: 'sa' } });
}
if (probe.kamatz.israeli !== 'ba' || probe.kamatz.sephardi !== 'ba' || probe.kamatz.ashkenazi !== 'bo') {
  probeFails.push({ rule: 'kamatz-gadol', got: probe.kamatz, expected: { israeli: 'ba', sephardi: 'ba', ashkenazi: 'bo' } });
}
// Default engine (geminate: false) writes a single b: shabat / shabos. The familiar
// American-siddur "Shabbat / Shabbos" needs geminate: true. Both must keep tav/sav and kamatz o/a.
if (!/^shabos$/i.test(probe.shabbat.ashkenazi) || !/^shabat$/i.test(probe.shabbat.israeli) || probe.shabbat.israeli !== probe.shabbat.sephardi) {
  probeFails.push({ rule: 'shabat-vs-shabos-default', got: probe.shabbat, expected: { israeli: 'shabat', sephardi: 'shabat', ashkenazi: 'shabos' } });
}
if (!/^shabbat$/i.test(probe.shabbatGeminate.israeli) || !/^shabbos$/i.test(probe.shabbatGeminate.ashkenazi) || probe.shabbatGeminate.israeli !== probe.shabbatGeminate.sephardi) {
  probeFails.push({ rule: 'shabbat-vs-shabbos-geminate', got: probe.shabbatGeminate, expected: { israeli: 'shabbat', sephardi: 'shabbat', ashkenazi: 'shabbos' } });
}

console.log(JSON.stringify({ translit, switchResults, audio, probe, probeFails }, null, 2));
