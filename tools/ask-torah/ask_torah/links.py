from __future__ import annotations

from .config import SEFARIA_BASE

TORAH_BOOKS = {
    "genesis": "Genesis",
    "exodus": "Exodus",
    "leviticus": "Leviticus",
    "numbers": "Numbers",
    "deuteronomy": "Deuteronomy",
}
# Sefaria / standard English names for the rest of Tanakh and later works.
SEFARIA_BOOKS = {
    **TORAH_BOOKS,
    "joshua": "Joshua",
    "judges": "Judges",
    "i_samuel": "I Samuel",
    "ii_samuel": "II Samuel",
    "i_kings": "I Kings",
    "ii_kings": "II Kings",
    "isaiah": "Isaiah",
    "jeremiah": "Jeremiah",
    "ezekiel": "Ezekiel",
    "hosea": "Hosea",
    "joel": "Joel",
    "amos": "Amos",
    "obadiah": "Obadiah",
    "jonah": "Jonah",
    "micah": "Micah",
    "nahum": "Nahum",
    "habakkuk": "Habakkuk",
    "zephaniah": "Zephaniah",
    "haggai": "Haggai",
    "zechariah": "Zechariah",
    "malachi": "Malachi",
    "psalms": "Psalms",
    "proverbs": "Proverbs",
    "job": "Job",
    "song_of_songs": "Song of Songs",
    "ruth": "Ruth",
    "lamentations": "Lamentations",
    "ecclesiastes": "Ecclesiastes",
    "esther": "Esther",
    "daniel": "Daniel",
    "ezra": "Ezra",
    "nehemiah": "Nehemiah",
    "i_chronicles": "I Chronicles",
    "ii_chronicles": "II Chronicles",
    "mishnah_avot": "Pirkei Avot",
    "mishnah_berakhot": "Mishnah Berakhot",
    "mishnah_megillah": "Mishnah Megillah",
    "mishnah_rosh_hashanah": "Mishnah Rosh Hashanah",
    "mishnah_sanhedrin": "Mishnah Sanhedrin",
    "mishnah_taanit": "Mishnah Taanit",
    "mishnah_shabbat": "Mishnah Shabbat",
    "b_shabbat": "Shabbat",
    "b_sanhedrin": "Sanhedrin",
    "b_megillah": "Megillah",
    "b_kiddushin": "Kiddushin",
}


def book_en(book_id: str) -> str:
    return TORAH_BOOKS.get(book_id) or SEFARIA_BOOKS.get(book_id) or book_id.replace("_", " ").title()


def verse_id(book: str, chapter: int, verse: int) -> str:
    return f"{book}.{int(chapter)}.{int(verse)}"


def parse_id(vid: str) -> tuple[str, int, int] | None:
    parts = str(vid).split(".")
    if len(parts) != 3:
        return None
    book, ch, v = parts[0], parts[1], parts[2]
    try:
        return book, int(ch), int(v)
    except ValueError:
        return None


def display_ref(book: str, chapter: int, verse: int, verse_end: int | None = None) -> str:
    name = book_en(book)
    if verse_end and verse_end != verse:
        return f"{name} {int(chapter)}:{int(verse)}-{int(verse_end)}"
    return f"{name} {int(chapter)}:{int(verse)}"


def alef_reader_href(book: str, chapter: int, verse: int) -> str | None:
    if book not in TORAH_BOOKS:
        return None
    return f"#/torahreader?book={book}&chapter={int(chapter)}&verse={int(verse)}"


def sefaria_href(book: str, chapter: int, verse: int, verse_end: int | None = None) -> str:
    name = SEFARIA_BOOKS.get(book) or book_en(book)
    path = name.replace(" ", "_")
    ref = f"{path}.{int(chapter)}.{int(verse)}"
    if verse_end and verse_end != verse:
        ref += f"-{int(verse_end)}"
    return f"{SEFARIA_BASE}/{ref}"


def passage_link(book: str, chapter: int, verse: int, verse_end: int | None = None) -> dict:
    alef = alef_reader_href(book, chapter, verse)
    if alef:
        return {"href": alef, "kind": "alef", "label": "Read this passage in Aleph"}
    return {"href": sefaria_href(book, chapter, verse, verse_end), "kind": "sefaria", "label": "Read this passage on Sefaria"}
