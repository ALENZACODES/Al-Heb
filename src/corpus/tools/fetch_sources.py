#!/usr/bin/env python3
"""Fetch the raw source strings used by the ALEF corpus and write data/corpus/source-snapshot.json.

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
    words = re.findall(r"<w>(.*?)</w>", mv.group(1), re.S)
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
items = {}
# ---- Torah / Tanakh (tanach.us UXLC; English JPS 1917 via Sefaria) ----
items["bless-priestly-1"] = tanach_item("Numbers", 6, 24, None, "Numbers 6:24")
items["bless-priestly-2"] = tanach_item("Numbers", 6, 25, None, "Numbers 6:25")
items["bless-priestly-3"] = tanach_item("Numbers", 6, 26, None, "Numbers 6:26")
items["shema-1"] = tanach_item("Deuteronomy", 6, 4, None, "Deuteronomy 6:4")
items["vahavta-1"] = tanach_item("Deuteronomy", 6, 5, None, "Deuteronomy 6:5")
items["vahavta-2"] = tanach_item("Deuteronomy", 6, 6, 7, "Deuteronomy 6:6-7")
items["vahavta-full"] = tanach_item("Deuteronomy", 6, 5, 9, "Deuteronomy 6:5-9")
items["shema-vahavta"] = tanach_item("Deuteronomy", 6, 4, 9, "Deuteronomy 6:4-9")
items["mah-tovu-1"] = tanach_item("Numbers", 24, 5, None, "Numbers 24:5")
items["mi-chamocha-1"] = tanach_item("Exodus", 15, 11, None, "Exodus 15:11")
items["num-12-13"] = tanach_item("Numbers", 12, 13, None, "Numbers 12:13")
items["kiddush-gen-2-1-3"] = tanach_item("Genesis", 2, 1, 3, "Genesis 2:1-3")
# ---- Siddur (Sefaria; version chosen for the most permissive licence available) ----
EDOT = "Siddur Edot HaMizrach, "
SEFARD = "Siddur Sefard, "
items["shema-2"] = sefaria_pick(ASH + "Weekday, Shacharit, Blessings of the Shema, Shema", "Metsudah", "CC-BY", [4])
items["hamotzi"] = sefaria_pick(EDOT + "Shabbat Evening, First Meal", "Shaliehsaboo", "CC0", [7])
items["candle-shabbat"] = sefaria_pick(SEFARD + "Shabbat Candle Lighting", "Torat Emet", "Public Domain", [2])
items["kiddush-wine-1"] = sefaria_pick(SEFARD + "Birchat HaMazon, Blessing on Foods", "Torat Emet", "Public Domain", [2])
items["torah-bless-1"] = sefaria_pick(EDOT + "Preparatory Prayers, Torah Blessings", "Shaliehsaboo", "CC0", [3])
items["torah-barchu"] = sefaria_pick(ASH + "Weekday, Shacharit, Torah Reading, Reading from Sefer, Birkat HaTorah", "Metsudah", "CC-BY", [1, 3])
items["torah-bless-2"] = sefaria_pick(ASH + "Weekday, Shacharit, Torah Reading, Reading from Sefer, Birkat HaTorah", "Metsudah", "CC-BY", [7])
items["amidah-lips"] = sefaria_pick(EDOT + "Weekday Shacharit, Amida", "Shaliehsaboo", "CC0", [1])
items["avot-1"] = sefaria_pick(EDOT + "Weekday Shacharit, Amida", "Shaliehsaboo", "CC0", [2])
items["aleinu-1"] = sefaria_pick(EDOT + "Weekday Shacharit, Alenu", "Shaliehsaboo", "CC0", [1])
items["modeh-ani-1"] = sefaria_pick(ASH + "Weekday, Shacharit, Preparatory Prayers, Modeh Ani", "Metsudah", "CC-BY", [0])
items["adon-olam-1"] = sefaria_pick(ASH + "Weekday, Shacharit, Preparatory Prayers, Adon Olam", "Metsudah", "CC-BY", list(range(0, 10)))
items["kaddish-1"] = sefaria_pick(ASH + "Weekday, Shacharit, Concluding Prayers, Mourner's Kaddish", "Metsudah", "CC-BY", list(range(0, 7)))
items["birkat-hamazon-1"] = sefaria_pick(SEFARD + "Birchat HaMazon, Birchat HaMazon", "Torat Emet", "Public Domain", [36])

OUT.write_text(json.dumps({
    "fetchedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "note": "Raw strings exactly as served. Normalise with src/corpus/normalize.js.",
    "items": items}, ensure_ascii=False, indent=1) + "\n", encoding="utf8")
print("wrote", OUT, len(items), "items")
