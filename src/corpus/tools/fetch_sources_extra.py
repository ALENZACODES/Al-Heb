#!/usr/bin/env python3
"""ROUND 3 ADDITIONS. Fetch extra source strings and MERGE them into data/corpus/source-snapshot.json.

This script never rewrites the items fetched by fetch_sources.py (those stay byte-for-byte); it only adds the
keys listed in EXTRA below, each stamped with its own fetchedAt. Re-running replaces just those keys.

Original docstring of fetch_sources.py follows.

Fetch the raw source strings used by the ALEF corpus and write data/corpus/source-snapshot.json.

Run:  python3 -I src/corpus/tools/fetch_sources.py   (needs outbound HTTPS; uses stdlib only)
Then: node src/corpus/tools/build-registry.mjs        (normalises + writes registry.json)

The snapshot keeps the RAW strings exactly as served (HTML tags, cantillation and all) so the
normalisation in src/corpus/normalize.js is reproducible and testable offline. It also doubles as
the offline cache of Sefaria/tanach.us verses (lane 5 deliverable for the photo feature).
"""
import json, re, sys, time, urllib.parse, urllib.request
from pathlib import Path

OUT = Path(__file__).resolve().parents[3] / "data" / "corpus" / "source-snapshot.json"
SEF = "https://www.sefaria.org/api/v3/texts/"
JPS = "The Holy Scriptures: A New Translation (JPS 1917)"

def get(url, binary=False):
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'alef-corpus-fetch/1.0 (+https://github.com/ALENZACODES)'})
            with urllib.request.urlopen(req, timeout=60) as r:
                data = r.read()
            return data if binary else data.decode("utf8")
        except Exception as e:  # noqa
            err = e; time.sleep(2)
    raise err

def flat(t):
    if isinstance(t, str): yield t
    else:
        for x in t: yield from flat(x)

def sefaria_versions(ref):
    d = json.loads(get(SEF + urllib.parse.quote(ref) + "?version=hebrew%7Call"))
    if "error" in d: raise SystemExit("sefaria error for %s: %s" % (ref, d["error"]))
    return d["versions"]

def sefaria_pick(ref, title_contains, license_, lines):
    for v in sefaria_versions(ref):
        if title_contains in (v.get("versionTitle") or "") and v.get("license") == license_:
            L = list(flat(v["text"]))
            return {
                "kind": "sefaria-siddur", "ref": ref, "versionTitle": v["versionTitle"].strip(),
                "license": v["license"], "versionSource": v.get("versionSource"),
                "url": "https://www.sefaria.org/" + urllib.parse.quote(ref.replace(" ", "_")),
                "apiUrl": SEF + urllib.parse.quote(ref) + "?version=hebrew%7Call",
                "lineIndexes": lines, "rawLines": [L[i] for i in lines],
            }
    raise SystemExit("no version %r/%s for %s" % (title_contains, license_, ref))

_tanach = {}
def tanach_book(name):
    if name not in _tanach:
        _tanach[name] = get("https://tanach.us/Books/%s.xml" % name)
    return _tanach[name]

def tanach_verse(book, ch, v):
    s = tanach_book(book)
    m = re.search(r'<c n="%d">(.*?)</c>' % ch, s, re.S)
    mv = re.search(r'<v n="%d">(.*?)</v>' % v, m.group(1), re.S)
    # Repo convention (same as src/torahread/tools/build-data.mjs and tools/corpus/verify_texts.mjs): read every <w> word AND
    # the pointed <q> (qere) reading of a ketiv/qere pair; skip <k> (ketiv, unpointed). Matching <w> alone silently drops
    # the qere word (Lam 5:21 and Ps 126:4 lost a word before this fix).
    words = [m[1] for m in re.findall(r"<(w|q)>(.*?)</\1>", mv.group(1), re.S)]
    return " ".join(w.strip() for w in words)

def tanach_item(book, ch, v1, v2=None, sefref=None):
    v2 = v2 or v1
    raw = [tanach_verse(book, ch, v) for v in range(v1, v2 + 1)]
    ver = re.search(r"<version>(.*?)</version>", tanach_book(book)).group(1)
    date = re.search(r"<edition>.*?<date>(.*?)</date>", tanach_book(book), re.S).group(1)
    d = json.loads(get(SEF + urllib.parse.quote(sefref) + "?version=" + urllib.parse.quote("english|" + JPS)))
    ev = d["versions"][0]
    assert ev["versionTitle"] == JPS and ev["license"] == "Public Domain", ev["versionTitle"]
    en = ev["text"] if isinstance(ev["text"], list) else [ev["text"]]
    return {
        "kind": "tanach-us", "book": book, "chapter": ch, "verses": [v1, v2],
        "versionTitle": "Unicode/XML Leningrad Codex (UXLC) " + ver + " (file dated " + date + ")",
        "license": "Public Domain / copy without restriction (tanach.us/License.html)",
        "url": "https://tanach.us/Books/%s.xml" % book,
        "rawLines": raw,
        "english": {"versionTitle": JPS, "license": "Public Domain", "ref": sefref, "rawLines": en,
                    "versionSource": ev.get("versionSource")},
    }


ASH = "Siddur Ashkenaz, "
EDOT = "Siddur Edot HaMizrach, "
SEFARD = "Siddur Sefard, "
items = {}
# ---- Tanakh verses used in the liturgy (UXLC; English JPS 1917) ----
T = [
 ("ein-kamocha", "Psalms", 86, 8, None),
 ("malchutcha", "Psalms", 145, 13, None),
 ("adonai-oz", "Psalms", 29, 11, None),
 ("gadlu", "Psalms", 34, 4, None),
 ("yehalelu", "Psalms", 148, 13, 14),
 ("hashivenu", "Lamentations", 5, 21, None),
 ("kedushah-kadosh", "Isaiah", 6, 3, None),
 ("kedushah-baruch", "Ezekiel", 3, 12, None),
 ("kedushah-yimloch", "Psalms", 146, 10, None),
 ("kiddush-veshamru", "Exodus", 31, 16, 17),
 ("kiddush-zachor", "Exodus", 20, 8, 11),
 ("ashrei-84-5", "Psalms", 84, 5, None),
 ("ashrei-144-15", "Psalms", 144, 15, None),
 ("ashrei-145-1-3", "Psalms", 145, 1, 3),
 ("ashrei-145-16", "Psalms", 145, 16, None),
 ("shir-hamaalot", "Psalms", 126, 1, 6),
]
for id_, book, ch, v1, v2 in T:
    ref = "%s %d:%d" % (book, ch, v1) + ("-%d" % v2 if v2 else "")
    items[id_] = tanach_item(book, ch, v1, v2, ref)
# ---- Siddur lines (Sefaria; permissive labels only: CC0, Public Domain, CC-BY) ----
M = "Metsudah"
TOR = ASH + "Weekday, Shacharit, Torah Reading, "
items["vayehi-binsoa"] = sefaria_pick(TOR + "Removing the Torah from Ark, Vayehi Binsoa", M, "CC-BY", [2])
items["lecha-hashem"] = sefaria_pick(TOR + "Removing the Torah from Ark, Lekha Hashem", M, "CC-BY", [2])
items["vezot-hatorah"] = sefaria_pick(TOR + "Reading from Sefer, Raising the Torah", M, "CC-BY", [1])
items["etz-chaim"] = sefaria_pick(TOR + "Reading from Sefer, Raising the Torah", M, "CC-BY", [2])
items["brich-shmei"] = sefaria_pick(TOR + "Removing the Torah from Ark, Berich Shmei", M, "CC-BY", [1])
items["hagomel"] = sefaria_pick(TOR + "Reading from Sefer, Birkat Hagomel", M, "CC-BY", [1, 2])
AM = ASH + "Weekday, Shacharit, Amidah, "
items["avot-closing"] = sefaria_pick(AM + "Patriarchs", M, "CC-BY", [5])
items["amidah-yihyu"] = sefaria_pick(AM + "Concluding Passage", M, "CC-BY", [0])
items["amidah-elohai-netzor"] = sefaria_pick(AM + "Concluding Passage", M, "CC-BY", [1])
items["oseh-shalom"] = sefaria_pick(AM + "Concluding Passage", M, "CC-BY", [2])
items["sim-shalom"] = sefaria_pick(AM + "Peace", M, "CC-BY", [0, 3])
items["kiddush-shabbat-eve"] = sefaria_pick(ASH + "Shabbat, Shabbat Evening, Kiddush", M, "CC-BY", [6])
items["lecha-dodi-1"] = sefaria_pick(ASH + "Shabbat, Kabbalat Shabbat, Lekha Dodi", M, "CC-BY", [0, 1])
items["yigdal"] = sefaria_pick(ASH + "Weekday, Shacharit, Preparatory Prayers, Yigdal", M, "CC-BY", list(range(2, 27, 2)))
items["zimun-opening"] = sefaria_pick(SEFARD + "Birchat HaMazon, Birchat HaMazon", M, "CC-BY", [8, 10])
TE = "Torat Emet"
items["haftarah-before"] = sefaria_pick(EDOT + "Shabbat Shacharit, Haftarah", "Shaliehsaboo", "CC0", [1])
items["haftarah-after"] = sefaria_pick(EDOT + "Shabbat Shacharit, Haftarah", "Shaliehsaboo", "CC0", [6, 7, 8, 9])
items["mi-sheberach-opening"] = sefaria_pick(SEFARD + "Shabbat Morning Services, Prayer for Oleh", TE, "Public Domain", [1])
items["havdalah-opening"] = sefaria_pick(SEFARD + "Motzaei Shabbat , Havdala", TE, "Public Domain", [2])
items["havdalah-spices"] = sefaria_pick(SEFARD + "Motzaei Shabbat , Havdala", TE, "Public Domain", [5])
SH = "Shaliehsaboo"
items["havdalah-flame"] = sefaria_pick(EDOT + "Havdalah, Havdala", SH, "CC0", [13])
items["havdalah-hamavdil"] = sefaria_pick(EDOT + "Havdalah, Havdala", SH, "CC0", [14])
items["hanukkah-candle"] = sefaria_pick(EDOT + "Hanukkah, Menorah Lighting", SH, "CC0", [3])
items["hanukkah-nissim"] = sefaria_pick(EDOT + "Hanukkah, Menorah Lighting", SH, "CC0", [4])
items["shehecheyanu"] = sefaria_pick(EDOT + "Hanukkah, Menorah Lighting", SH, "CC0", [6])
items["hanerot-halalu"] = sefaria_pick(EDOT + "Hanukkah, Menorah Lighting", SH, "CC0", [8])
items["maoz-tzur-1"] = sefaria_pick(EDOT + "Hanukkah, Menorah Lighting", SH, "CC0", [15])

now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
for v in items.values(): v["fetchedAt"] = now
snap = json.loads(OUT.read_text(encoding="utf8"))
snap["items"].update(items)
OUT.write_text(json.dumps(snap, ensure_ascii=False, indent=1) + "\n", encoding="utf8")
print("merged", len(items), "items into", OUT)
