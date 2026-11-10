#!/usr/bin/env python3
"""Add Hallel (UXLC Psalms) and festival Kiddush (Sefaria Torat Emet, Public Domain)
into data/corpus/source-snapshot.json WITHOUT rewriting any existing keys.

Run: python3 -I src/corpus/tools/fetch_sources_lesson_integrity.py
Then add META in build-registry.mjs, or append registry entries with the same
normaliser, and re-run prayer-meta updates.

Existing snapshot items are left byte-for-byte. If a new id already exists, the
script refuses to overwrite it.
"""
import json, re, sys, time, urllib.parse, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "data" / "corpus" / "source-snapshot.json"
SEF = "https://www.sefaria.org/api/v3/texts/"
JPS = "The Holy Scriptures: A New Translation (JPS 1917)"

def get(url, binary=False):
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'alef-corpus-fetch/1.0 (+https://github.com/ALENZACODES)'})
            with urllib.request.urlopen(req, timeout=60) as r:
                data = r.read()
            return data if binary else data.decode("utf8")
        except Exception as e:
            err = e
            time.sleep(2)
    raise err

def flat(t):
    if isinstance(t, str):
        yield t
    else:
        for x in t:
            yield from flat(x)

def sefaria_versions(ref):
    d = json.loads(get(SEF + urllib.parse.quote(ref) + "?version=hebrew%7Call"))
    if "error" in d:
        raise SystemExit("sefaria error for %s: %s" % (ref, d["error"]))
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

items = {}
# ---- Hallel: UXLC Psalms, English JPS 1917 (both public domain) ----
T = [
    ("hallel-113-1", "Psalms", 113, 1, None),
    ("hallel-115-1", "Psalms", 115, 1, None),
    ("hallel-116-13", "Psalms", 116, 13, None),
    ("hallel-117", "Psalms", 117, 1, 2),
    ("hallel-118-1-4", "Psalms", 118, 1, 4),
    ("hallel-118-5", "Psalms", 118, 5, None),
    ("hallel-118-6", "Psalms", 118, 6, None),
    ("hallel-118-24", "Psalms", 118, 24, None),
    ("hallel-118-25", "Psalms", 118, 25, None),
    ("hallel-118-28", "Psalms", 118, 28, None),
    ("kiddush-festival-day-verses", "Leviticus", 23, 4, 4),  # placeholder, fixed below
]
# Leviticus 23:4 and 23:44 are not a contiguous range; fetch as two verses with a custom ref.
for id_, book, ch, v1, v2 in T:
    if id_ == "kiddush-festival-day-verses":
        continue
    ref = "%s %d:%d" % (book, ch, v1) + ("-%d" % v2 if v2 else "")
    items[id_] = tanach_item(book, ch, v1, v2, ref)

# Lev 23:4 + 23:44 (the two verses said at festival daytime Kiddush)
raw4 = tanach_verse("Leviticus", 23, 4)
raw44 = tanach_verse("Leviticus", 23, 44)
ver = re.search(r"<version>(.*?)</version>", tanach_book("Leviticus")).group(1)
date = re.search(r"<edition>.*?<date>(.*?)</date>", tanach_book("Leviticus"), re.S).group(1)
def jps_verse(ref):
    d = json.loads(get(SEF + urllib.parse.quote(ref) + "?version=" + urllib.parse.quote("english|" + JPS)))
    ev = d["versions"][0]
    assert ev["versionTitle"] == JPS and ev["license"] == "Public Domain", ev["versionTitle"]
    en = ev["text"] if isinstance(ev["text"], list) else [ev["text"]]
    return ev, en
ev4, en4 = jps_verse("Leviticus 23:4")
ev44, en44 = jps_verse("Leviticus 23:44")
items["kiddush-festival-day-verses"] = {
    "kind": "tanach-us", "book": "Leviticus", "chapter": 23, "verses": [4, 44],
    "verseList": [4, 44],
    "versionTitle": "Unicode/XML Leningrad Codex (UXLC) " + ver + " (file dated " + date + ")",
    "license": "Public Domain / copy without restriction (tanach.us/License.html)",
    "url": "https://tanach.us/Books/Leviticus.xml",
    "rawLines": [raw4, raw44],
    "english": {"versionTitle": JPS, "license": "Public Domain", "ref": "Leviticus 23:4, 23:44",
                "rawLines": list(en4) + list(en44), "versionSource": ev4.get("versionSource")},
}

# ---- Festival Kiddush (Sefard / Torat Emet 357, Public Domain on Sefaria) ----
REF_EVE = "Siddur Sefard, Holidays, Yom Tov Eve Kiddush"
TE = "Torat Emet"
items["kiddush-festival-eve-open"] = sefaria_pick(REF_EVE, TE, "Public Domain", [9])
items["kiddush-festival-pesach"] = sefaria_pick(REF_EVE, TE, "Public Domain", [10])
items["kiddush-festival-shavuot"] = sefaria_pick(REF_EVE, TE, "Public Domain", [11])
items["kiddush-festival-sukkot"] = sefaria_pick(REF_EVE, TE, "Public Domain", [12])
items["kiddush-festival-shemini"] = sefaria_pick(REF_EVE, TE, "Public Domain", [13])
items["kiddush-festival-eve-close"] = sefaria_pick(REF_EVE, TE, "Public Domain", [14])
items["leshev-basukkah"] = sefaria_pick(REF_EVE, TE, "Public Domain", [17])

now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
for v in items.values():
    v["fetchedAt"] = now

snap = json.loads(OUT.read_text(encoding="utf8"))
existing = [k for k in items if k in snap["items"]]
fresh = {k: v for k, v in items.items() if k not in snap["items"]}
if existing:
    print("skipping", len(existing), "keys already in the snapshot")
if not fresh:
    raise SystemExit("nothing new to add")
snap["items"].update(fresh)
items = fresh
OUT.write_text(json.dumps(snap, ensure_ascii=False, indent=1) + "\n", encoding="utf8")
print("added", len(items), "new snapshot keys at", now)
for k in items:
    print(" ", k, "lines", len(items[k]["rawLines"]))
