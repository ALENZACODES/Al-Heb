"""Specs for the written pages of three place units: the shuk, the pharmacy and the hospital (11 pages, 189 to 200).

Three lesson words are left off these pages because their clips failed the voice check and are on the hide list
(data/curriculum/practical/hidden-items.json): i-12-w8, i-20-w3 and i-20-w5.

Same fields as written_page_specs.py. Every Hebrew word comes from the unit's own lesson words or phrasebook lines.
AFTER names the unit each new unit follows in the course.
"""

UNITS = [
    dict(id="pu-shuk", level="L1", title="At the Shuk", lessons=["I-12"], after="pu-shop"),
    dict(id="pu-pharmacy", level="L3", title="At the Pharmacy", lessons=["I-14"], after="pu-health"),
    dict(id="pu-hospital", level="L3", title="Hospital and Clinic", lessons=["I-20"], after="pu-pharmacy"),
]

SPECS = []


def P(**kw):
    SPECS.append(kw)


# ---------- pu-shuk ----------
P(
    id="pu-shuk-p01", order=1, kind="learn", title="The Market and the Prices",
    can="Name the market, ask a price, and say if it is expensive or cheap.",
    point="Two ways to ask a price",
    body="שׁוּק is the open market. כַּמָּה זֶה עוֹלֶה? asks how much something costs, and מָה הַמְּחִיר? asks what the price is. Your answer can be short: זֶה יָקָר when it is expensive, זֶה זוֹל when it is cheap.",
    examples=["i-12-w2", "i-12-w4"],
    items=["i-12-w1", "i-12-w2", "i-12-w3", "i-12-w4", "i-12-w5"],
    speak=[
        ("You pick up a melon at a stall. Ask how much it costs.", "i-12-w2"),
        ("The price is too high. Say it is expensive.", "i-12-w4"),
    ],
    review_n=2,
)
P(
    id="pu-shuk-p02", order=2, kind="speak", title="A Discount and Two Vegetables",
    can="Ask for a discount and name two vegetables.",
    point="Asking with יֵשׁ",
    body="יֵשׁ means there is. Said as a question, יֵשׁ הַנָּחָה? asks if there is a discount. חֲצִי is half. עַגְבָנִיָּה is a tomato and מְלָפְפוֹן is a cucumber.",
    examples=["i-12-w6", "i-12-w9"],
    items=["i-12-w6", "i-12-w7", "i-12-w9", "i-12-w10"],
    speak=[
        ("You are buying a lot. Ask if there is a discount.", "i-12-w6"),
        ("Point at the tomatoes and name one.", "i-12-w9"),
    ],
    review_n=2,
)
P(
    id="pu-shuk-p03", order=3, kind="review", title="Unit Review",
    can="Choose, pay in cash and take a bag.",
    point="Closing the sale",
    body="אֶקַּח אֶת זֶה says I will take this, and it works for גְּבִינָה, for זֵיתִים, or for anything you point at. מְזֻמָּן is cash. A שַׂקִּית is a bag.",
    examples=["i-12-w13", "i-12-w14"],
    items=["i-12-w11", "i-12-w12", "i-12-w13", "i-12-w14", "i-12-w15"],
    speak=[("You have chosen. Say you will take this.", "i-12-w13")],
    review_n=5,
)

# ---------- pu-pharmacy ----------
P(
    id="pu-pharmacy-p01", order=1, kind="learn", title="Words at the Pharmacy",
    can="Name the pharmacy, medicine, pills, a prescription and a headache.",
    point="The pharmacy and what you ask for",
    body="בֵּית מֶרְקַחַת is the pharmacy. תְּרוּפָה is a medicine and כַּדּוּרִים are pills. A מִרְשָׁם is the prescription from the doctor. כְּאֵב רֹאשׁ is a headache: כְּאֵב is an ache and רֹאשׁ is the head.",
    examples=["i-14-w1", "i-14-w5"],
    items=["i-14-w1", "i-14-w2", "i-14-w3", "i-14-w4", "i-14-w5"],
    speak=[
        ("You need medicine. Name the pharmacy.", "i-14-w1"),
        ("Your head hurts. Name a headache.", "i-14-w5"),
    ],
    review_n=2,
)
P(
    id="pu-pharmacy-p02", order=2, kind="learn", title="Pain, Fever and How Often",
    can="Name a sore throat, a stomach ache and a fever, and say once a day.",
    point="כְּאֵב plus the part that hurts",
    body="כְּאֵב joins the part of the body that hurts: כְּאֵב גָּרוֹן is a sore throat and כְּאֵב בֶּטֶן is a stomach ache, built the same way as the word for a headache. A fever is חֹם, and נֶגֶד means against, so a medicine can be נֶגֶד חֹם. Once a day is פַּעַם בְּיוֹם.",
    examples=["i-14-w6", "i-14-w10"],
    items=["i-14-w6", "i-14-w7", "i-14-w8", "i-14-w9", "i-14-w10"],
    speak=[
        ("Your throat hurts. Name a sore throat.", "i-14-w6"),
        ("The label says one time each day. Say once a day.", "i-14-w10"),
    ],
    review_n=2,
)
P(
    id="pu-pharmacy-p03", order=3, kind="speak", title="Before, After and Allergies",
    can="Say twice a day, before and after, and name an allergy and antibiotics.",
    point="The ending of פַּעֲמַיִם means two",
    body="פַּעַם is one time and פַּעֲמַיִם is two times, so פַּעֲמַיִם בְּיוֹם is twice a day. אַחֲרֵי is after and לִפְנֵי is before, as in before or after a meal. אָלֶרְגִּי is allergic, in the form a man uses about himself. אַנְטִיבְּיוֹטִיקָה is antibiotics.",
    examples=["i-14-w11", "i-14-w14"],
    items=["i-14-w11", "i-14-w12", "i-14-w13", "i-14-w14", "i-14-w15"],
    speak=[
        ("The pharmacist says two times each day. Say twice a day.", "i-14-w11"),
        ("You are a man with an allergy. Say allergic.", "i-14-w14"),
    ],
    review_n=2,
)
P(
    id="pu-pharmacy-p04", order=4, kind="review", title="Unit Review",
    can="Ask where the pharmacy is and review the unit.",
    point="Finding the pharmacy",
    body="אֵיפֹה בֵּית הַמִּרְקַחַת? asks where the pharmacy is. With הַ it is the pharmacy, a particular one: בֵּית מֶרְקַחַת becomes בֵּית הַמִּרְקַחַת, and the הַ goes on the second word.",
    examples=["directions-18"],
    items=["directions-18"],
    speak=[("You are in a new town and need medicine. Ask where the pharmacy is.", "directions-18")],
    review_n=6,
)

# ---------- pu-hospital ----------
P(
    id="pu-hospital-p01", order=1, kind="learn", title="The Hospital and Who Works There",
    can="Name the hospital, a doctor and a nurse.",
    point="The hospital, a doctor and a nurse",
    body="בֵּית חוֹלִים is the hospital. רוֹפֵא is a doctor, in the form used for a man. אָחוֹת is a nurse, and it is also the word for a sister.",
    examples=["i-20-w1", "i-20-w2"],
    items=["i-20-w1", "i-20-w2", "i-20-w4"],
    speak=[
        ("The taxi driver asks where to. Name the hospital.", "i-20-w1"),
        ("You ask who will see you. Name a doctor.", "i-20-w2"),
    ],
    review_n=2,
)
P(
    id="pu-hospital-p02", order=2, kind="learn", title="Insurance, Tests and Emergencies",
    can="Name insurance, a test, blood and an emergency, and say it hurts.",
    point="כּוֹאֵב says it hurts",
    body="כּוֹאֵב means it hurts, and it comes from the same root as the word for an ache. Insurance is בִּטּוּחַ. A בְּדִיקָה is a test or an examination, and דָּם is blood. חֵרוּם is an emergency.",
    examples=["i-20-w7", "i-20-w8"],
    items=["i-20-w6", "i-20-w7", "i-20-w8", "i-20-w9", "i-20-w10"],
    speak=[
        ("The doctor presses your arm. Say it hurts.", "i-20-w7"),
        ("It cannot wait. Name an emergency.", "i-20-w10"),
    ],
    review_n=2,
)
P(
    id="pu-hospital-p03", order=3, kind="speak", title="Ambulance, Passport and Family",
    can="Name an ambulance, the passport and family.",
    point="הַ makes it the passport",
    body="אַמְבּוּלַנְס is an ambulance. הַדַּרְכּוֹן is the passport: the הַ at the front is the word the. At a hospital desk you may be asked for הַדַּרְכּוֹן, and about your מִשְׁפָּחָה, your family.",
    examples=["i-20-w11", "i-20-w12"],
    items=["i-20-w11", "i-20-w12", "i-20-w13"],
    speak=[
        ("Someone has collapsed in the street. Name an ambulance.", "i-20-w11"),
        ("The clerk asks for your papers. Name the passport.", "i-20-w12"),
    ],
    review_n=2,
)
P(
    id="pu-hospital-p04", order=4, kind="review", title="Unit Review",
    can="Ask where the hospital is and say you need a doctor.",
    point="אֲנִי צָרִיךְ says I need",
    body="אֵיפֹה בֵּית הַחוֹלִים? asks where the hospital is. אֲנִי צָרִיךְ רוֹפֵא says I need a doctor, in the form a man uses: צָרִיךְ is the man's form.",
    examples=["directions-17", "help-02"],
    items=["directions-17", "help-02"],
    speak=[
        ("You are lost and unwell. Ask where the hospital is.", "directions-17"),
        ("You are a man and feel very ill. Say you need a doctor.", "help-02"),
    ],
    review_n=6,
)
