"""Shared scoring for translator and camera backtests."""
from __future__ import annotations
import re

NIKKUD = re.compile(r"[\u0591-\u05C7]")
PUNCT = re.compile(r"[^\w\s\u0590-\u05FF]+", re.UNICODE)


def norm(s: str) -> str:
    s = NIKKUD.sub("", s or "")
    s = s.lower()
    s = (s.replace("what's", "what is").replace("i'm", "i am").replace("i'll", "i will")
           .replace("don't", "do not").replace("that's", "that is"))
    s = PUNCT.sub(" ", s)
    return re.sub(r"\s+", " ", s).strip()


def tokens(s: str) -> list[str]:
    return [t for t in norm(s).split(" ") if t]


def levenshtein(a: list[str], b: list[str]) -> int:
    n, m = len(a), len(b)
    row = list(range(m + 1))
    for i in range(1, n + 1):
        prev, row[0] = row[0], i
        for j in range(1, m + 1):
            cur = row[j]
            cost = 0 if a[i - 1] == b[j - 1] else 1
            row[j] = min(row[j] + 1, row[j - 1] + 1, prev + cost)
            prev = cur
    return row[m]


def wer(ref: str, hyp: str) -> float:
    r, h = tokens(ref), tokens(hyp)
    if not r:
        return 1.0 if h else 0.0
    return levenshtein(r, h) / len(r)


def cer(ref: str, hyp: str) -> float:
    r, h = list(norm(ref).replace(" ", "")), list(norm(hyp).replace(" ", ""))
    if not r:
        return 1.0 if h else 0.0
    return levenshtein(r, h) / len(r)


def exact_or_wer(ref: str, hyp: str) -> float:
    if norm(ref) == norm(hyp):
        return 1.0
    return max(0.0, 1.0 - wer(ref, hyp))


GROUPS: list[set[str]] = []

def _add(*forms: str) -> None:
    GROUPS.append({norm(f) for f in forms})

_add("נעים מאוד", "נעים להכיר", "נעים להכיר אותך")
_add("פנה שמאלה ברמזור", "תפנה שמאלה ברמזור")
_add("תמשיך ישר ואז פנה ימינה", "תסע ישר ואז תפנה ימינה", "תמשיך ישר ואז תפנה ימינה")
_add("תעיתי", "אני הלכתי לאיבוד", "הלכתי לאיבוד", "אני אבוד", "i'm lost", "i am lost")
_add("אפשר להראות לי על המפה", "אתה יכול להראות לי על המפה")
_add("מתי האוטובוס מגיע", "באיזו שעה האוטובוס מגיע")
_add("את החשבון בבקשה", "חשבון בבקשה")
_add("יש לי אלרגיה לאגוזים", "אני אלרגי לאגוזים")
_add("אני לוקח את זה", "אני אקח את זה")
_add("אפשר לשלם בכרטיס אשראי", "אפשר לשלם באשראי")
_add("תקראו לרופא", "תזמין רופא", "תקרא לרופא")
_add("תתקשרו למשטרה", "תקשר למשטרה")
_add("מתי התפילה", "באיזו שעה התפילה")
_add("אפשר סידור בבקשה", "תעביר לי בבקשה סידור", "please hand me a prayer book", "may i have a siddur please", "may i have a prayer book please")
_add("what's your name", "what is your name")
_add("turn left at the light", "turn left at the traffic light")
_add("how do i get to the hotel", "how do you get to the hotel")
_add("can you show me on the map", "could you show me on the map")
_add("what time does the bus arrive", "when is the bus arriving", "when does the bus arrive")
_add("the bill please", "check please", "the check please")
_add("i am allergic to nuts", "i have a nut allergy")
_add("a table for two please", "table for two please")
_add("how much does this cost", "how much does it cost")
_add("do you accept credit cards", "can i pay by credit card", "can i pay with a credit card")
_add("there has been an accident", "there was an accident")
_add("shabbat shalom", "have a good sabbath", "good sabbath", "שבת שלום", "שבת מנוחה", "have a peaceful sabbath", "have a restful sabbath", "a restful shabbat", "a peaceful shabbat", "a peaceful sabbath", "restful shabbat", "peaceful sabbath")
_add("what time is the service", "when is the prayer", "when is the service", "what time is the prayer")
_add("is there kiddush after the service", "is there a kiddush after the service")
_add("see you at shul", "see you at the synagogue")
_add("after shabbat", "motzaei shabbat", "motzei shabbat")
_add("wait a minute please", "just a moment please", "one moment please")
_add("hello", "שלום")
_add("call the police", "תתקשרו למשטרה", "תזמין משטרה", "תקרא למשטרה", "תתקשר למשטרה")
_add("i am fine thanks", "i'm fine thanks", "אני בסדר תודה", "הכל טוב תודה", "הכול טוב תודה")
_add("my name is david", "שמי דוד", "קוראים לי דוד", "השם שלי דוד")
_add("see you at the synagogue", "see you at shul", "נתראה בבית הכנסת", "ניפגש בבית הכנסת")
_add("the number is five six seven", "the number is 567", "המספר הוא חמש שש שבע", "המספר הוא 567")
_add("it is three o'clock", "it is 3 o'clock", "it is 3:00", "it's three o'clock")
_add("can i have a siddur please", "can i have a prayer book please", "please hand me a prayer book", "אפשר סידור בבקשה", "תעביר לי סידור בבקשה", "תביא לי בבקשה סידור", "תביא לי סידור בבקשה")
_add("good shabbat", "shabbat shalom", "a good shabbat", "good sabbath")
_add("this is very tasty", "this is delicious", "it is delicious", "it is very tasty", "it's delicious")
_add("i'll take this", "i will take this", "i'll take it", "i will take it")
_add("where is the bathroom", "where is the restroom", "where are the restrooms", "where's the bathroom", "where's the restroom")
_add("i'd like a coffee please", "i would like a coffee please", "i want a coffee please", "i would like coffee please")
_add("אני צריך תיק בבקשה", "אני צריך שקית בבקשה")
_add("אתם מקבלים כרטיסי אשראי", "האם אתם מקבלים כרטיסי אשראי", "אפשר לשלם בכרטיס אשראי")
_add("תקרא רופא", "תקרא לרופא", "תקראו לרופא", "תזמין רופא")
_add("קח שמאלה ברמזור", "פנה שמאלה ברמזור", "תפנה שמאלה ברמזור")
_add("turn left at the next traffic light", "turn left at the light", "turn left at the traffic light")
_add("nice to meet you", "pleased to meet you")
# sign translations
_add("optical store", "optics store", "optical shop", "optometrist", "optician", "optometry store")
_add("bakery", "the bakery")
_add("pharmacy", "drugstore", "chemist", "the pharmacy")
_add("exit", "way out")
_add("closed", "shut")
_add("open", "opened")
_add("coffee shop", "cafe", "café", "coffee house")
_add("restaurant", "the restaurant")
_add("grocery", "grocery store", "grocer")
_add("bank", "the bank")
_add("post office", "mail", "postal office")
_add("hospital", "the hospital")
_add("restrooms", "toilets", "wc", "bathroom", "restroom")
_add("parking", "car park")
_add("museum", "the museum")
_add("synagogue", "shul", "the synagogue")
_add("hotel", "the hotel")
_add("supermarket", "the supermarket")
_add("library", "the library")
_add("train station", "railway station", "the train station")
_add("school", "the school")
_add("danger", "hazard")
_add("entrance", "entry", "way in")
_add("special price", "special offer", "sale price")

INDEX: dict[str, set[str]] = {}
for g in GROUPS:
    for f in g:
        INDEX.setdefault(f, set()).update(g)



# Spoken-number and Hebrew near-homophone folding for STT scoring only.
_NUM_WORDS = {
    "zero": "0", "oh": "0", "one": "1", "two": "2", "three": "3", "four": "4",
    "five": "5", "six": "6", "seven": "7", "eight": "8", "nine": "9", "ten": "10",
    "eleven": "11", "twelve": "12",
    "אפס": "0", "אחת": "1", "אחד": "1", "שתיים": "2", "שני": "2", "שלוש": "3",
    "ארבע": "4", "חמש": "5", "שש": "6", "שבע": "7", "שמונה": "8", "תשע": "9", "עשר": "10",
}
_HE_FOLD = str.maketrans({
    "ט": "ת", "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ",
})


def fold_stt(s: str) -> str:
    s = NIKKUD.sub("", s or "").lower()
    s = (s.replace("what's", "what is").replace("i'm", "i am").replace("i'll", "i will")
           .replace("don't", "do not").replace("that's", "that is"))
    s = re.sub(r"\b(\d{1,2}):00(?:\s*(?:a\.?m\.?|p\.?m\.?))?\b", lambda m: str(int(m.group(1))), s)
    s = PUNCT.sub(" ", s)
    s = s.translate(_HE_FOLD)
    s = re.sub(r"\b(\d{1,2})\s+00\b", lambda m: str(int(m.group(1))), s)
    s = re.sub(r"\b(?:o clock|oclock|a m|p m|am|pm)\b", " ", s)
    def _nw(m):
        w = m.group(0)
        return _NUM_WORDS.get(w, w)
    if _NUM_WORDS:
        pat = r"\b(" + "|".join(re.escape(k) for k in sorted(_NUM_WORDS, key=len, reverse=True)) + r")\b"
        s = re.sub(pat, _nw, s)
    s = re.sub(r"\d+", lambda m: " ".join(m.group(0)), s)
    return re.sub(r"\s+", " ", s).strip()


def stt_wer(ref: str, hyp: str) -> float:
    """Word error after folding spoken numbers and common Hebrew letter confusions."""
    return wer(fold_stt(ref), fold_stt(hyp))


def meaning_score(hyp: str, ref: str) -> tuple[float, str]:
    a, r = norm(hyp), norm(ref)
    if a == r:
        return 1.0, "exact"
    if (INDEX.get(a) or set()) & (INDEX.get(r) or set()):
        return 1.0, "paraphrase"
    return exact_or_wer(ref, hyp), "wer"
