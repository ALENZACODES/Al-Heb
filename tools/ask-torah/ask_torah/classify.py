from __future__ import annotations

import re

from .corpus import norm_en

IN_TORAH_PAT = re.compile(
    r"\b(torah|tanakh|tanach|bible|chumash|pentateuch|genesis|exodus|leviticus|numbers|deuteronomy|"
    r"parasha|parsha|parashat|parashah|mitzvah|mitzvot|commandment|shabbat|sabbath|kosher|kashrut|"
    r"pesach|passover|shema|rabbi|moses|abraham|israelite|judaism|hebrew bible|"
    r"mishnah|talmud|halakhah|halacha|tefillin|mezuzah|sukkot|yom kippur|hanukkah|purim|"
    r"adam and eve|noah|the flood|golden calf|ten commandments|"
    r"chumash|pentateuch|five books|shemot|devarim|vayikra|bamidbar|bereshit|"
    r"kashrut|tefillin|tzitzit|messiah|mashiach|shabbos|olam haba|malachim|"
    r"satan|sheol|afterlife)\b",
    re.I,
)
IS_X_IN = re.compile(
    r"\b(is|does|did|was|are|do)\b.+\b(in (the )?(torah|tanakh|chumash|pentateuch|bible)|mentioned)\b",
    re.I,
)
OFF_TOPIC_STRONG = re.compile(
    r"\b(weather|forecast|stock market|stock price|crypto|bitcoin|nft|"
    r"recipe for|sourdough|how do i bake|python function|python loop|write a python|javascript|debug this|"
    r"world series|super bowl|premier league|hockey game|basketball|offside|"
    r"movie tickets|netflix|celebrity|reset my email|password|"
    r"capital of france|best pizza|best restaurants|toyota|used car|"
    r"flat tire|potty train|puppy|camera should i buy|concert tickets|"
    r"calculus|algebra homework|programming interview|quantum entanglement|"
    r"wifi|dishwasher|lawnmower|snowblower|vacuum|toaster|ukulele|guitar|"
    r"compound interest|credit scores?|running shoes|5k training|"
    r"not about religion|none of this is about religion|indoor plants|current events|near me|"
    r"how do i handle|look it up)\b",
    re.I,
)
# Modern everyday objects / tasks that are not biblical questions unless the Torah is named.
OFF_TOPIC_SOFT = re.compile(
    r"\b(laptop|headphones|printer|smartphone|router|blender|kettle|skateboard|"
    r"packing for|blocked gutter|rust stain|folding laundry|parallel parking|"
    r"furnace filter|assembling a desk|home wifi|tyre|tire|calorie|oatmeal|"
    r"weekend in|population of|gardening|watercolour|watercolor)\b",
    re.I,
)


def is_off_topic(question: str) -> bool:
    q = question.strip()
    if not q:
        return True
    # "Is X in the Torah?" is always on-topic, even if X is modern.
    if IS_X_IN.search(q) or re.search(r"\bin the torah\b", q, re.I):
        return False
    if IN_TORAH_PAT.search(q):
        return False
    if OFF_TOPIC_STRONG.search(q) or OFF_TOPIC_SOFT.search(q):
        return True
    return False


def wants_in_torah_verdict(question: str) -> bool:
    q = norm_en(question)
    return bool(
        re.search(r"\b(is|are|was|were|does|did)\b.+\b(in (the )?(torah|tanakh|chumash|bible)|mentioned)\b", q)
        or q.startswith("is ")
        or "is it in" in q
        or q.endswith("in torah")
        or q.endswith("in the torah")
    )
