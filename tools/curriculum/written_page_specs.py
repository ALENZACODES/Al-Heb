"""Specs for the 88 remaining Practical pages after Claude's time and weather units."""

SPECS = []

def P(**kw):
    SPECS.append(kw)

# ---------- pu-hotel ----------
P(
    id="pu-hotel-p01", order=1, kind="learn", title="At Reception",
    can="Name a room, a reservation, a key, a night and breakfast.",
    point="Hotel nouns you need at the desk",
    body="חֶדֶר is the room, הַזְמָנָה the reservation, and מַפְתֵּחַ the key. לַיְלָה counts the nights of the stay. אַרוּחַת בֹּקֶר is breakfast.",
    examples=["il17-w1", "il17-w2"],
    items=["il17-w1", "il17-w2", "il17-w3", "il17-w4", "il17-w5"],
    speak=[
        ("You have booked a room. Name the reservation.", "il17-w2"),
        ("The receptionist hands you the key.", "il17-w4"),
    ],
    review_n=2,
)
P(
    id="pu-hotel-p02", order=2, kind="dialogue", title="Checking In",
    can="Check in, give your name, and ask about breakfast.",
    point="יֵשׁ לִי states what you have",
    body="יֵשׁ לִי הַזְמָנָה means I have a reservation: יֵשׁ לִי is there is to me. בְּאֵיזֶה שֵׁם? asks under what name. מָתַי אֲרוּחַת הַבֹּקֶר? asks when breakfast is.",
    examples=["d-hotel-l1", "d-hotel-l5"],
    items=["d-hotel-l1", "d-hotel-l2", "d-hotel-l3", "d-hotel-l4", "d-hotel-l5", "d-hotel-l6", "d-hotel-l7", "d-hotel-l8"],
    speak=[
        ("You arrive at the desk. Say you have a reservation.", "d-hotel-l1"),
        ("Ask when breakfast is.", "d-hotel-l5"),
    ],
    review_n=3,
    dialogue={"id": "d-hotel", "setting": "A guest checks in at a hotel desk.", "lines": [f"d-hotel-l{i}" for i in range(1, 9)]},
)
P(
    id="pu-hotel-p03", order=3, kind="grammar", title="I Have, You Have: יֵשׁ לִי",
    can="Use יֵשׁ and אֵין to say what there is, and יֵשׁ לִי for what you have.",
    point="יֵשׁ לִי is there is to me",
    body="יֵשׁ means there is, אֵין means there is not. To say you have something, Hebrew uses יֵשׁ לִי, there is to me, as in יֵשׁ לִי הַזְמָנָה. You do not need a separate verb for have.",
    examples=["d-hotel-l1", "i-47-w12"],
    items=["i-47-w12", "il08-w6", "d-hotel-l1"],
    speak=[
        ("Say there is, the short word.", "i-47-w12"),
        ("Say you have a reservation.", "d-hotel-l1"),
    ],
    review_n=2,
)
P(
    id="pu-hotel-p04", order=4, kind="speak", title="Ask for Something in the Room",
    can="Ask for the key, the room, or breakfast.",
    point="Reuse the desk nouns as requests",
    body="At the desk you can ask with the nouns you already have: מַפְתֵּחַ, חֶדֶר, אַרוּחַת בֹּקֶר. Soften a request with בְּבַקָּשָׁה, which you learned in the first units, or just name what you need.",
    examples=["il17-w4", "il17-w5"],
    items=["il17-w4", "il17-w1", "il17-w5"],
    speak=[
        ("You left the key at reception. Ask for it.", "il17-w4"),
        ("In the morning, ask about breakfast.", "il17-w5"),
    ],
    review_n=2,
)
P(
    id="pu-hotel-p05", order=5, kind="review", title="Unit Review",
    can="Thank the receptionist and review the hotel unit.",
    point="Close the check-in with thanks",
    body="תּוֹדָה רַבָּה! is how the guest ends the check-in. You already use תּוֹדָה in shops; the longer form fits a desk you have just been helped at.",
    examples=["d-hotel-l8", "il17-w2"],
    items=["d-hotel-l8"],
    speak=[("The key is in your hand. Thank the receptionist.", "d-hotel-l8")],
    review_n=6,
)

# ---------- pu-phone ----------
P(
    id="pu-phone-p01", order=1, kind="learn", title="Buying a SIM",
    can="Name a phone, a number, the internet and a battery.",
    point="The nouns you need in a phone shop",
    body="טֶלֶפוֹן is the phone, מִסְפָּר a number, and מִסְפַּר טֶלֶפוֹן the phone number. אִינְטֶרְנֶט and סוֹלְלָה are what you ask about when the shop sets up a SIM.",
    examples=["i-16-w1"],
    items=["i-16-w1", "i-16-w2", "i-16-w3", "i-16-w5", "i-16-w7"],
    speak=[
        ("The battery is dead. Name it.", "i-16-w7"),
        ("The clerk asks for your number. Name it.", "i-16-w3"),
    ],
    review_n=2,
)
P(
    id="pu-phone-p02", order=2, kind="learn", title="On the Phone",
    can="Ask for a moment, say you cannot hear, and use the verb to call.",
    point="On the phone you ask for a moment, or say you cannot hear",
    body="רֶגַע asks the other person to wait a moment. אֲנִי לֹא שׁוֹמֵעַ is the man's form for I cannot hear; לְהִתְקַשֵּׁר is the verb to call or get in touch.",
    examples=["i-16-w14"],
    items=["i-16-w13", "i-16-w14", "i-16-w9", "il22-w2"],
    speak=[
        ("Ask the other person to wait a moment.", "i-16-w13"),
        ("You are a man and the line is bad. Say you cannot hear.", "i-16-w14"),
    ],
    review_n=2,
)
P(
    id="pu-phone-p03", order=3, kind="speak", title="Leave a Message",
    can="Talk about a message, sending it, and setting a meeting.",
    point="הוֹדָעָה is the message itself",
    body="הוֹדָעָה is a message or notice. לִשְׁלֹחַ is to send, and שׁוֹלֵחַ is the man's present-tense form, sending. To arrange a time, use פְּגִישָׁה (a meeting) and לְקַבֵּעַ (to set it).",
    examples=["i-16-w4", "i-16-w10"],
    items=["i-16-w4", "i-16-w10", "i-16-w11", "il22-w3", "il22-w4"],
    speak=[
        ("Ask if you may send it: name the verb to send.", "i-16-w10"),
        ("You need a time to meet. Name the meeting.", "il22-w3"),
    ],
    review_n=2,
)
P(
    id="pu-phone-p04", order=4, kind="review", title="Unit Review",
    can="Name a password, then review the phone unit.",
    point="סִיסְמָה is the password",
    body="סִיסְמָה is the password for a phone, a SIM account or the אִינְטֶרְנֶט. Keep it with מִסְפַּר טֶלֶפוֹן when a shop or an office asks you to log in.",
    examples=["i-16-w6", "i-16-w5"],
    items=["i-16-w6"],
    speak=[("The form asks for your password.", "i-16-w6")],
    review_n=6,
)

# ---------- pu-apartment ----------
P(
    id="pu-apartment-p01", order=1, kind="learn", title="Rooms and Rent",
    can="Name an apartment, its rooms, a balcony and parking.",
    point="Start with the place, then the parts",
    body="דִּירָה is the apartment. חֶדֶר is one room and חֲדָרִים is rooms. מִרְפֶּסֶת is the balcony, and חֲנָיָה the parking.",
    examples=["i-17-w1"],
    items=["i-17-w1", "i-17-w2", "i-17-w3", "i-17-w5", "i-17-w6"],
    speak=[
        ("You are on a viewing. Name the apartment.", "i-17-w1"),
        ("Name the balcony.", "i-17-w5"),
    ],
    review_n=2,
)
P(
    id="pu-apartment-p02", order=2, kind="grammar", title="Is There...? יֵשׁ and אֵין",
    can="Ask whether a flat has light, and describe it as big or good.",
    point="יֵשׁ and אֵין answer is there",
    body="You already have יֵשׁ (there is) and אֵין (there is not). On a viewing, put them next to a noun: light, a balcony, parking. גְּדוֹלָה and טוֹבָה are the feminine forms, and they match דִּירָה, which is feminine. אוֹר is light.",
    examples=["i-17-w12", "i-06-w9"],
    items=["i-17-w12", "i-17-w13", "i-06-w9"],
    speak=[
        ("The flat is large. Use the feminine form.", "i-17-w12"),
        ("The rooms feel dark. Name the light.", "i-06-w9"),
    ],
    review_n=2,
)
P(
    id="pu-apartment-p03", order=3, kind="speak", title="Questions for the Owner",
    can="Name the contract, the landlord and the building fee.",
    point="The people and papers around a rental",
    body="חוֹזֶה is the contract. בַּעַל הַבַּיִת is the landlord. וַעַד בַּיִת is the building committee, and also the fee paid to it. Ask for each of these by name when you view a דִּירָה.",
    examples=["i-17-w7", "i-17-w8"],
    items=["i-17-w7", "i-17-w8", "i-17-w9"],
    speak=[
        ("You want to see the contract.", "i-17-w7"),
        ("Ask to speak to the landlord.", "i-17-w8"),
    ],
    review_n=2,
)
P(
    id="pu-apartment-p04", order=4, kind="review", title="Unit Review",
    can="Review the apartment words.",
    point="Put the viewing in order",
    body="Name the דִּירָה and its חֲדָרִים first, then מִרְפֶּסֶת and חֲנָיָה. Save חוֹזֶה and בַּעַל הַבַּיִת for the end of the visit.",
    examples=["i-17-w1", "i-17-w7"],
    items=["i-17-w2"],
    speak=[("How many rooms? Start with the word for room.", "i-17-w2")],
    review_n=6,
)

# ---------- pu-plans ----------
P(
    id="pu-plans-p01", order=1, kind="learn", title="When Are You Free?",
    can="Suggest maybe, in a week, or see you later.",
    point="Soft plans use אוּלַי",
    body="אוּלַי means maybe, and it keeps a plan open. בְּעוֹד שָׁבוּעַ means in a week. נִתְרָאֶה means we will see each other, a natural way to close a plan.",
    examples=["il20-w4", "il20-w3"],
    items=["il20-w4", "il20-w5", "il20-w3"],
    speak=[
        ("You are not sure yet. Soften the plan.", "il20-w4"),
        ("Leave a friend, hoping to meet again.", "il20-w3"),
    ],
    review_n=2,
)
P(
    id="pu-plans-p02", order=2, kind="grammar", title="Want To: רוֹצֶה Plus a Verb",
    can="Say what you want, as a man or as a woman.",
    point="רוֹצֶה and רוֹצָה change with the speaker",
    body="A man says אֲנִי רוֹצֶה מַיִם; a woman says אֲנִי רוֹצָה מַיִם. The ending of רוֹצֶה / רוֹצָה marks who is speaking. You already know אֲנִי רוֹצֶה קָפֶה from the cafe. The thing you want comes after the verb.",
    examples=["gp-04-m", "gp-04-f"],
    items=["gp-04-m", "gp-04-f"],
    speak=[
        ("You are a woman and you want water.", "gp-04-f"),
        ("You are a man and you want water.", "gp-04-m"),
    ],
    review_n=2,
)
P(
    id="pu-plans-p03", order=3, kind="speak", title="Suggest a Plan",
    can="Say I will go or I will eat.",
    point="אֲנִי plus a future form is I will",
    body="אֲנִי אֵלֵךְ is I will go, and אֲנִי אֹכַל is I will eat. The form after אֲנִי already marks the future, so you do not add a separate word for will. Combine these with אוּלַי or בְּעוֹד שָׁבוּעַ from the first page.",
    examples=["il20-w1", "il20-w2"],
    items=["il20-w1", "il20-w2"],
    speak=[
        ("Suggest your own movement: I will go.", "il20-w1"),
        ("Suggest lunch: I will eat.", "il20-w2"),
    ],
    review_n=2,
)
P(
    id="pu-plans-p04", order=4, kind="review", title="Unit Review",
    can="Review the planning phrases.",
    point="Close a plan with נִתְרָאֶה",
    body="A short plan in Hebrew can be אוּלַי, a future line such as אֲנִי אֵלֵךְ, a time such as בְּעוֹד שָׁבוּעַ, and נִתְרָאֶה at the end.",
    examples=["il20-w3", "il20-w1"],
    items=["il20-w5"],
    speak=[("Put the meeting off by a week.", "il20-w5")],
    review_n=6,
)

# ---------- pu-opinions ----------
P(
    id="pu-opinions-p01", order=1, kind="learn", title="I Like, I Don't Like",
    can="Say you prefer, agree or disagree (man's forms).",
    point="These are the man's forms",
    body="אֲנִי מַעֲדִיף, מַסְכִּים and לֹא מַסְכִּים are the forms this lesson stores for a man. Prefer comes with אֲנִי; agree and disagree can stand on their own. This page does not invent the woman's partners.",
    examples=["il21-w3", "il21-w4"],
    items=["il21-w3", "il21-w4", "il21-w5"],
    speak=[
        ("You are a man and you prefer the other option.", "il21-w3"),
        ("You are a man and you do not agree.", "il21-w5"),
    ],
    review_n=2,
)
P(
    id="pu-opinions-p02", order=2, kind="grammar", title="I Think That: שֶׁ",
    can="Open an opinion with I think that, or in my opinion.",
    point="שֶׁ opens the clause you think",
    body="אֲנִי חוֹשֵׁב שֶׁ... is I think that..., and the שֶׁ is the that. This is the man's form in this lesson. לְדַעְתִּי means in my opinion and does not change for a man or a woman. After either opener, add the view itself.",
    examples=["il21-w1", "il21-w2"],
    items=["il21-w1", "il21-w2"],
    speak=[
        ("You are a man. Start I think that...", "il21-w1"),
        ("Give a view without naming I think.", "il21-w2"),
    ],
    review_n=2,
)
P(
    id="pu-opinions-p03", order=3, kind="speak", title="Give Your Opinion",
    can="Tell a man or a woman that they are right.",
    point="You are right changes for who you are speaking to",
    body="אַתָּה צוֹדֵק is said to a man; אַתְּ צוֹדֶקֶת is said to a woman. Use these when you מַסְכִּים. They talk to the other person, unlike אֲנִי חוֹשֵׁב שֶׁ..., which talks about your own view.",
    examples=["gp-10-m", "gp-10-f"],
    items=["gp-10-m", "gp-10-f"],
    speak=[
        ("Noa has the right idea. Tell her so.", "gp-10-f"),
        ("Ari has the right idea. Tell him so.", "gp-10-m"),
    ],
    review_n=2,
)
P(
    id="pu-opinions-p04", order=4, kind="review", title="Unit Review",
    can="Review the opinion phrases.",
    point="Two ways to open a view",
    body="Start with אֲנִי חוֹשֵׁב שֶׁ... or with לְדַעְתִּי, then prefer or agree. Keep מַסְכִּים and לֹא מַסְכִּים ready for a short reply.",
    examples=["il21-w2", "il21-w4"],
    items=["il21-w4"],
    speak=[("You are a man and you agree.", "il21-w4")],
    review_n=6,
)

# ---------- pu-driving ----------
P(
    id="pu-driving-p01", order=1, kind="learn", title="Signs and Roads",
    can="Name a car, a road, a lane and a traffic light.",
    point="The road has a name for each part",
    body="מְכוֹנִית is the car and כְּבִישׁ the road. נָתִיב is a lane, and רִמְזוּר a traffic light. יָשָׁר means straight ahead, the direction you already use in street directions.",
    examples=["i-39-w1"],
    items=["i-39-w1", "i-39-w2", "i-39-w8", "i-39-w9", "i-39-w10"],
    speak=[
        ("Point at the car.", "i-39-w1"),
        ("The light is ahead. Name it.", "i-39-w9"),
    ],
    review_n=2,
)
P(
    id="pu-driving-p02", order=2, kind="learn", title="Parking and Fuel",
    can="Name fuel, parking, the engine, a tyre, stop and slowly.",
    point="Two short commands at the roadside",
    body="דֶּלֶק is fuel and חֲנָיָה is parking. מָנוֹעַ is the engine and צְמִיג a tyre. עֲצֹר is the command stop, and לְאַט means slowly. You already know a longer stop line, עֲצֹר כָּאן, בְּבַקָּשָׁה, from the taxi unit.",
    examples=["i-39-w11", "i-39-w12"],
    items=["i-39-w4", "i-39-w5", "i-39-w6", "i-39-w7", "i-39-w11", "i-39-w12"],
    speak=[
        ("The tank is low. Name the fuel.", "i-39-w4"),
        ("Tell the driver to stop.", "i-39-w11"),
    ],
    review_n=2,
)
P(
    id="pu-driving-p03", order=3, kind="speak", title="Ask a Driver",
    can="Tell a driver to go straight, to stop, or to go slowly.",
    point="One-word directions in the car",
    body="In the car, יָשָׁר, עֲצֹר and לְאַט are enough. Say them clearly. לְאַט also softens a request when the speed feels high.",
    examples=["i-39-w10", "i-39-w12"],
    items=["i-39-w10", "i-39-w11", "i-39-w12"],
    speak=[
        ("You want the next stretch of road, no turn.", "i-39-w10"),
        ("The speed is too high. Say slowly.", "i-39-w12"),
    ],
    review_n=2,
)
P(
    id="pu-driving-p04", order=4, kind="review", title="Unit Review",
    can="Review the road words.",
    point="Name the machine, then the road",
    body="Start with מְכוֹנִית and כְּבִישׁ, then the parts you may need to ask about: דֶּלֶק, חֲנָיָה, רִמְזוּר.",
    examples=["i-39-w1", "i-39-w4"],
    items=["i-39-w2"],
    speak=[("Name the road itself.", "i-39-w2")],
    review_n=6,
)

# ---------- pu-hiking ----------
P(
    id="pu-hiking-p01", order=1, kind="learn", title="On the Trail",
    can="Name a hike, a route, a mountain, a stream, a trail and a map.",
    point="The trail has its own nouns",
    body="טִיּוּל is a hike or a trip. מַסְלוּל is the route and שְׁבִיל the trail under your feet. הַר is a mountain, נַחַל a stream, and מַפָּה the map you carry.",
    examples=["i-40-w1", "i-40-w5"],
    items=["i-40-w1", "i-40-w2", "i-40-w3", "i-40-w4", "i-40-w5", "i-40-w7"],
    speak=[
        ("You are going out for the day. Name the hike.", "i-40-w1"),
        ("Ask to see the map.", "i-40-w7"),
    ],
    review_n=2,
)
P(
    id="pu-hiking-p02", order=2, kind="learn", title="Water and Safety",
    can="Talk about water, sun, heat, a hat, and whether the trail is far or near.",
    point="Far and near are a pair",
    body="מַיִם is water, and you take it with you. שֶׁמֶשׁ and חַם are the same weather words you already know; on the trail you add כּוֹבַע. רָחוֹק means far.",
    examples=["i-40-w11", "i-40-w6"],
    items=["i-40-w6", "i-40-w8", "i-40-w9", "i-40-w10", "i-40-w11"],
    speak=[
        ("Ask if the spring is far.", "i-40-w11"),
        ("Offer water. Name it.", "i-40-w6"),
    ],
    review_n=2,
)
P(
    id="pu-hiking-p03", order=3, kind="speak", title="Ask About the Trail",
    can="Ask whether a point is near, and name the trail or the map.",
    point="Ask with the nouns you have",
    body="To ask about the walk, use שְׁבִיל, מַסְלוּל or מַפָּה, and finish with קָרוֹב or רָחוֹק. A short question can be just the noun and קָרוֹב.",
    examples=["i-40-w12", "i-40-w5"],
    items=["i-40-w12", "i-40-w5", "i-40-w7"],
    speak=[
        ("You hope the lookout is close. Say near.", "i-40-w12"),
        ("Point to the trail itself.", "i-40-w5"),
    ],
    review_n=2,
)
P(
    id="pu-hiking-p04", order=4, kind="review", title="Unit Review",
    can="Review the hiking words.",
    point="Pack water and a hat, then walk",
    body="Take מַיִם and a כּוֹבַע, carry a מַפָּה, and follow the שְׁבִיל. הַר and נַחַל name what you will see.",
    examples=["i-40-w6", "i-40-w1"],
    items=["i-40-w8"],
    speak=[("The sun is strong on the ridge. Name the hat.", "i-40-w8")],
    review_n=6,
)

# ---------- pu-beach ----------
P(
    id="pu-beach-p01", order=1, kind="learn", title="Sun and Sea",
    can="Name the beach, the sea, sand, a wave, a towel and the sun.",
    point="The seashore is חוֹף, the water is יָם",
    body="חוֹף is the beach and יָם the sea. חוֹל is sand, גַּל a wave, מַגֶּבֶת a towel, and שֶׁמֶשׁ the sun you already know from the weather unit.",
    examples=["i-41-w1", "i-41-w2"],
    items=["i-41-w1", "i-41-w2", "i-41-w3", "i-41-w4", "i-41-w5", "i-41-w6"],
    speak=[
        ("You arrive and name the beach.", "i-41-w1"),
        ("Point at the water. Name the sea.", "i-41-w2"),
    ],
    review_n=2,
)
P(
    id="pu-beach-p02", order=2, kind="speak", title="At the Beach Kiosk",
    can="Ask for water, a hat or a towel, and notice danger.",
    point="What you buy, and a warning",
    body="At a kiosk you may want מַיִם, a כּוֹבַע or a מַגֶּבֶת. בֶּגֶד is a garment, for clothes you still need. סַכָּנָה is danger: a flag or a sign on the חוֹף.",
    examples=["i-41-w7", "i-41-w12"],
    items=["i-41-w7", "i-41-w10", "i-41-w11", "i-41-w12", "i-41-w5"],
    speak=[
        ("You are thirsty at the kiosk. Name water.", "i-41-w7"),
        ("There is a warning flag. Name danger.", "i-41-w12"),
    ],
    review_n=2,
)
P(
    id="pu-beach-p03", order=3, kind="review", title="Unit Review",
    can="Review the beach words.",
    point="Hot sand, cold water",
    body="The חוֹף can be חַם; the יָם can be קַר. Keep מַגֶּבֶת and כּוֹבַע with you, and watch for סַכָּנָה.",
    examples=["i-41-w8", "i-41-w9"],
    items=["i-41-w8", "i-41-w9"],
    speak=[("The sand burns your feet. Say hot.", "i-41-w8")],
    review_n=6,
)

# ---------- pu-decide ----------
P(
    id="pu-decide-p01", order=1, kind="learn", title="Sound Less Like an Outsider",
    can="Hear three words that mark careful Israeli speech.",
    point="These words repay careful listening",
    body="רֹאשׁ, חַיִּים and מַה שְׁלוֹמְךָ are ordinary words, but each one carries a sound learners often miss: the resh, the chet, and the last-syllable stress on מַה שְׁלוֹמְךָ. Listen, then copy.",
    examples=["il23-w1", "il23-w3"],
    items=["il23-w1", "il23-w2", "il23-w3"],
    speak=[
        ("Say the word for head, carefully.", "il23-w1"),
        ("Ask a man how he is, with the stress at the end.", "il23-w3"),
    ],
    review_n=2,
    culture="These three are practice for the sounds, not a claim that one pronunciation is the only Israeli one.",
)
P(
    id="pu-decide-p02", order=2, kind="dialogue", title="A Longer Conversation",
    can="Ask what happened, and ask a man to explain it to you.",
    point="Two lines that open a serious talk",
    body="מַה קָרָה opens a conversation when something has happened. תַּסְבִּיר לִי, said to a man, asks him to explain it to you. You already know בּוֹא הֵנָּה as a shorter command with בּוֹא.",
    examples=["il24-w1"],
    items=["il24-w1", "il24-w2"],
    speak=[
        ("Something is wrong. Ask what happened.", "il24-w1"),
        ("Ask a man to explain it to you.", "il24-w2"),
    ],
    review_n=3,
)
P(
    id="pu-decide-p03", order=3, kind="speak", title="Your Turn",
    can="Use the capstone lines in a real exchange.",
    point="Start, then ask",
    body="A short serious talk can open with מַה קָרָה, then תַּסְבִּיר לִי. They use words you have already practised in the daily-life units.",
    examples=["il24-w2", "il24-w1"],
    items=["il24-w1", "il24-w2"],
    speak=[
        ("Ask a man to explain it to you.", "il24-w2"),
        ("Open with what happened.", "il24-w1"),
    ],
    review_n=2,
)
P(
    id="pu-decide-p04", order=4, kind="check", title="Level 2 Check",
    can="Show you can talk about time, weather, home, plans and what happened.",
    point="Putting level 2 together",
    body="This check mixes the daily-life units. One new line: עֲצֹר כָּאן, בְּבַקָּשָׁה, stop here, please, a useful close when you have decided where to go.",
    examples=["i-23-w8", "i-24-w10"],
    items=["i-23-w8"],
    speak=[
        ("Ask the driver to stop here, please.", "i-23-w8"),
        ("Ask what happened.", "il24-w1"),
    ],
    reviewOf_level="L2",
    review_n=11,
)

# ---------- pu-work ----------
P(
    id="pu-work-p01", order=1, kind="learn", title="At the Office",
    can="Name a meeting, a client, today and tomorrow.",
    point="Office people and appointments",
    body="You already have עֲבוֹדָה, מִשְׂרָד and מְנַהֵל from small talk. This page adds פְּגִישָׁה, a meeting, and לָקוֹחַ, a client. הַיּוֹם and מָחָר place the meeting in time. הוֹדָעָה is a notice you may send at work, the same word as a phone message.",
    examples=["i-36-w3", "i-36-w10"],
    items=["i-36-w3", "i-36-w5", "i-36-w9", "i-36-w10", "i-36-w8"],
    speak=[
        ("The meeting is today.", "i-36-w10"),
        ("Name the meeting on the calendar.", "i-36-w3"),
    ],
    review_n=2,
)
P(
    id="pu-work-p02", order=2, kind="grammar", title="Requests at Work",
    can="Ask for a moment, and make a polite request.",
    point="רֶגַע and אֶפְשָׁר keep a request light",
    body="רֶגַע, one moment, buys time in an office the same way it does in a shop. For a polite request, use אֶפְשָׁר plus a to-verb, which you already know from אֶפְשָׁר לְדַבֵּר לְאַט? The form does not change for a man or a woman.",
    examples=["i-36-w12"],
    items=["i-36-w12"],
    speak=[("Someone is mid-sentence. Ask for one moment.", "i-36-w12")],
    review_n=2,
)
P(
    id="pu-work-p03", order=3, kind="learn", title="Meetings and Email",
    can="Name a university, a class, an exam, a book and today.",
    point="Study words sit next to work words",
    body="שִׁעוּר is a class, and מִבְחָן an exam. אוּנִיבֶרְסִיטָה is the university, סֵפֶר a book, and מִלְגָּה a scholarship. מוֹרֶה and מְרַצֶּה name a teacher and a lecturer, both in the man's form here. הַיּוֹם places the class in time.",
    examples=["i-37-w10", "i-37-w5"],
    items=["i-37-w1", "i-37-w2", "i-37-w3", "i-37-w5", "i-37-w6", "i-37-w7", "i-37-w8", "i-37-w10"],
    speak=[
        ("The class is today.", "i-37-w10"),
        ("There is an exam next week.", "i-37-w5"),
    ],
    review_n=2,
)
P(
    id="pu-work-p04", order=4, kind="speak", title="Introduce Your Job",
    can="Name a professor, a friend at work, or today.",
    point="People you name at work or in class",
    body="פְּרוֹפֶסוֹר is a professor. חָבֵר is a friend, the man's form. Together with הַיּוֹם and עֲבוֹדָה, these are enough to say what you do and who you study or work with.",
    examples=["i-37-w4", "i-37-w12"],
    items=["i-37-w4", "i-37-w12", "i-37-w10"],
    speak=[
        ("Introduce the professor.", "i-37-w4"),
        ("Name a friend at the office or in class.", "i-37-w12"),
    ],
    review_n=2,
)
P(
    id="pu-work-p05", order=5, kind="review", title="Unit Review",
    can="Review the work and study words.",
    point="Meetings, classes, people",
    body="At work you will hear פְּגִישָׁה; in study, מִבְחָן. הַיּוֹם and מָחָר place the meeting. Keep רֶגַע ready when you need a second.",
    examples=["i-36-w3", "i-37-w10"],
    items=["i-36-w10"],
    speak=[("The meeting is today.", "i-36-w10")],
    review_n=6,
)

# ---------- pu-health ----------
P(
    id="pu-health-p01", order=1, kind="learn", title="It Hurts Here",
    can="Name a headache, a sore throat, a stomach ache, a fever, and that it hurts.",
    point="Pain is often a noun, or the word כּוֹאֵב",
    body="כְּאֵב רֹאשׁ, כְּאֵב גָּרוֹן and כְּאֵב בֶּטֶן name the place of the pain. חֹם is a fever. כּוֹאֵב means it hurts. A full everyday line is יֵשׁ לִי כְּאֵב רֹאשׁ, I have a headache: יֵשׁ לִי plus the pain.",
    examples=["help-08", "i-20-w7"],
    items=["i-14-w5", "i-14-w6", "i-14-w7", "i-14-w8", "i-20-w7", "help-08"],
    speak=[
        ("You have a headache. Say the full line.", "help-08"),
        ("Point and say that it hurts.", "i-20-w7"),
    ],
    review_n=2,
)
P(
    id="pu-health-p02", order=2, kind="grammar", title="My Head Hurts: כּוֹאֵב לִי",
    can="Say you have a headache, or that something hurts.",
    point="יֵשׁ לִי plus the pain, or כּוֹאֵב alone",
    body="The line is יֵשׁ לִי כְּאֵב רֹאשׁ, there is to me a headache, the same יֵשׁ לִי you used at the hotel. כּוֹאֵב can stand alone for it hurts. This course does not invent a phrase beyond those two lines.",
    examples=["help-08", "i-20-w7"],
    items=["help-08", "i-20-w7", "i-14-w5"],
    speak=[
        ("Tell the doctor you have a headache.", "help-08"),
        ("Say that it hurts.", "i-20-w7"),
    ],
    review_n=2,
)
P(
    id="pu-health-p03", order=3, kind="learn", title="At the Clinic",
    can="Name a hospital, a doctor, a nurse, a test, an ambulance and insurance.",
    point="The clinic names the people and the paper",
    body="בֵּית חוֹלִים is a hospital. רוֹפֵא is a doctor (man). אָחוֹת here is a nurse. בְּדִיקָה is a test or examination, אַמְבּוּלַנְס an ambulance, and בִּטּוּחַ is insurance.",
    examples=["i-20-w2", "i-20-w8"],
    items=["i-20-w1", "i-20-w2", "i-20-w8", "i-20-w4", "i-20-w11", "i-20-w6"],
    speak=[
        ("Ask for a doctor, the man's form.", "i-20-w2"),
        ("Name an ambulance.", "i-20-w11"),
    ],
    review_n=2,
)
P(
    id="pu-health-p04", order=4, kind="learn", title="At the Pharmacy",
    can="Name a pharmacy, medicine, pills, a prescription and how often to take it.",
    point="How often: פַּעַם and פַּעֲמַיִם",
    body="בֵּית מֶרְקַחַת is the pharmacy, תְּרוּפָה medicine, כַּדּוּרִים pills, and מִרְשָׁם the prescription. פַּעַם בְּיוֹם is once a day and פַּעֲמַיִם בְּיוֹם twice a day. נֶגֶד means against, or for a symptom.",
    examples=["i-14-w10", "i-14-w11"],
    items=["i-14-w1", "i-14-w2", "i-14-w3", "i-14-w4", "i-14-w9", "i-14-w10", "i-14-w11"],
    speak=[
        ("The label says once a day.", "i-14-w10"),
        ("Name the prescription.", "i-14-w4"),
    ],
    review_n=2,
)
P(
    id="pu-health-p05", order=5, kind="listen", title="Hear the Instructions",
    can="Hear when to take a medicine, and words like before, after and allergic.",
    point="Listen for before, after and how often",
    body="אַחֲרֵי is after and לִפְנֵי is before. Together with פַּעַם בְּיוֹם they tell you when to take the תְּרוּפָה. אָלֶרְגִּי is allergic, in the man's form, and אַנְטִיבְּיוֹטִיקָה is antibiotics.",
    examples=["i-14-w12", "i-14-w13"],
    items=["i-14-w12", "i-14-w13", "i-14-w10", "i-14-w11", "i-14-w14", "i-14-w15"],
    speak=[("The nurse says to take it after food. Name after.", "i-14-w12")],
    review_n=3,
)
P(
    id="pu-health-p06", order=6, kind="speak", title="Describe What Hurts",
    can="Tell a clinic what hurts, or that you need a doctor.",
    point="Need and pain in one visit",
    body="You can walk in and say אֲנִי צָרִיךְ רוֹפֵא, I need a doctor, the man's form, or describe the pain with יֵשׁ לִי כְּאֵב רֹאשׁ or כּוֹאֵב. אֲנִי לֹא מַרְגִּישׁ טוֹב is I don't feel well, also a man's form.",
    examples=["help-02", "help-07"],
    items=["help-02", "help-07", "help-08"],
    speak=[
        ("You are a man and you need a doctor.", "help-02"),
        ("You are a man and you don't feel well.", "help-07"),
    ],
    review_n=2,
)
P(
    id="pu-health-p07", order=7, kind="review", title="Unit Review",
    can="Review the clinic and pharmacy words.",
    point="People, paper, timing",
    body="Name רוֹפֵא, take a מִרְשָׁם to the בֵּית מֶרְקַחַת, and listen for פַּעַם בְּיוֹם. Keep יֵשׁ לִי כְּאֵב רֹאשׁ ready.",
    examples=["i-14-w1", "help-08"],
    items=["il18-w5"],
    speak=[("Name the pharmacy.", "il18-w5")],
    review_n=6,
)

# ---------- pu-bank ----------
P(
    id="pu-bank-p01", order=1, kind="learn", title="At the Bank",
    can="Name a bank, an account, money, a cash machine and a shekel or a dollar.",
    point="The counter nouns",
    body="בַּנְק is the bank, חֶשְׁבּוֹן an account or a bill, and כֶּסֶף money. כַּסְפּוֹמָט is the cash machine. שֶׁקֶל and דּוֹלָר are the currencies you will hear at the window.",
    examples=["i-21-w1", "i-21-w4"],
    items=["i-21-w1", "i-21-w2", "i-21-w3", "i-21-w4", "i-21-w7", "i-21-w8"],
    speak=[
        ("You need a cash machine. Name it.", "i-21-w4"),
        ("Name the bank.", "i-21-w1"),
    ],
    review_n=2,
)
P(
    id="pu-bank-p02", order=2, kind="learn", title="Filling In a Form",
    can="Name a signature, a name, a loan, and whether the bank is closed.",
    point="The form asks for a name and a signature",
    body="שֵׁם is name and חֲתִימָה is a signature. הַלְוָאָה is a loan. סָגוּר means closed, for the hours of the בַּנְק.",
    examples=["i-48-w3", "i-48-w4"],
    items=["i-48-w3", "i-48-w4", "i-21-w11", "i-21-w10", "i-21-w14"],
    speak=[
        ("The clerk points to the signature line.", "i-48-w3"),
        ("The bank is closed. Say it.", "i-21-w14"),
    ],
    review_n=2,
)
P(
    id="pu-bank-p03", order=3, kind="grammar", title="Must and Need: צָרִיךְ",
    can="Say you need a doctor, or that you need something at the bank, as a man.",
    point="צָרִיךְ means need, in the man's form",
    body="אֲנִי צָרִיךְ רוֹפֵא is I need a doctor. The same צָרִיךְ works for what you need at the bank. You already know the pair אֲנִי צָרִיךְ מוֹנִית and אֲנִי צְרִיכָה מוֹנִית from the taxi unit; the woman's form ends in צְרִיכָה.",
    examples=["help-02"],
    items=["help-02"],
    speak=[("You are a man and you need a doctor.", "help-02")],
    review_n=2,
)
P(
    id="pu-bank-p04", order=4, kind="speak", title="Ask at the Counter",
    can="Ask to withdraw or exchange money, and name a credit card.",
    point="Two infinitives at the window",
    body="לִמְשֹׁךְ is to withdraw and לְהַחְלִיף is to exchange. כַּרְטִיס אַשְׁרַאי is a credit card. Use them with כֶּסֶף, שֶׁקֶל or דּוֹלָר at the counter.",
    examples=["i-21-w5", "i-21-w6"],
    items=["i-21-w5", "i-21-w6", "i-21-w9"],
    speak=[
        ("You want cash from the account. Name to withdraw.", "i-21-w5"),
        ("You have dollars. Name to exchange.", "i-21-w6"),
    ],
    review_n=2,
)
P(
    id="pu-bank-p05", order=5, kind="review", title="Unit Review",
    can="Review the bank words.",
    point="Account, cash, signature",
    body="A visit is often חֶשְׁבּוֹן, then כַּסְפּוֹמָט or לִמְשֹׁךְ, and a חֲתִימָה at the end. Check whether the בַּנְק is סָגוּר.",
    examples=["i-21-w2", "i-48-w3"],
    items=["i-48-w12"],
    speak=[("Name the bank, the form word.", "i-48-w12")],
    review_n=6,
)

# ---------- pu-post ----------
P(
    id="pu-post-p01", order=1, kind="learn", title="Sending a Parcel",
    can="Name the post, a parcel, a letter, a stamp and the verb to send.",
    point="What you hand over at the post office",
    body="דֹּאַר is the post. חֲבִילָה is a parcel, מִכְתָּב a letter, and בּוּל a stamp (בּוּלִים, stamps). לִשְׁלֹחַ is to send, the same verb you used for a message.",
    examples=["i-22-w2", "i-22-w6"],
    items=["i-22-w1", "i-22-w2", "i-22-w3", "i-22-w4", "i-22-w5", "i-22-w6"],
    speak=[
        ("You have a parcel to send.", "i-22-w2"),
        ("Ask for a stamp.", "i-22-w4"),
    ],
    review_n=2,
)
P(
    id="pu-post-p02", order=2, kind="learn", title="Collecting a Parcel",
    can="Name collecting, a number, regular post and air mail.",
    point="Collect, then name the service",
    body="לֶאֱסֹף is to collect. מִסְפָּר is a number. רָגִיל means regular, and דֹּאַר אֲוִיר air mail.",
    examples=["i-22-w7"],
    items=["i-22-w7", "i-22-w9", "i-22-w12", "i-22-w13"],
    speak=[
        ("You have come to collect a parcel.", "i-22-w7"),
        ("You want air mail.", "i-22-w13"),
    ],
    review_n=2,
)
P(
    id="pu-post-p03", order=3, kind="speak", title="Ask Where Your Parcel Is",
    can="Ask about a parcel, a letter or air mail.",
    point="Hold up the noun and ask",
    body="At the counter, name חֲבִילָה or מִכְתָּב. דֹּאַר אֲוִיר is the service you ask for when the letter must go far.",
    examples=["i-22-w2", "i-22-w13"],
    items=["i-22-w2", "i-22-w3", "i-22-w13"],
    speak=[
        ("Ask about your parcel.", "i-22-w2"),
        ("You want air mail.", "i-22-w13"),
    ],
    review_n=2,
)
P(
    id="pu-post-p04", order=4, kind="review", title="Unit Review",
    can="Review the post office words.",
    point="Send or collect",
    body="You either לִשְׁלֹחַ or לֶאֱסֹף. Have a בּוּל ready, and ask for רָגִיל or דֹּאַר אֲוִיר.",
    examples=["i-22-w6", "i-22-w7"],
    items=["i-22-w12"],
    speak=[("You want the regular service, not air mail.", "i-22-w12")],
    review_n=6,
)

# ---------- pu-emergencies ----------
P(
    id="pu-emergencies-p01", order=1, kind="learn", title="Help!",
    can="Call for help, name an emergency, and say something is urgent or dangerous.",
    point="Short shouts first",
    body="עֶזְרָה! and the word חֵרוּם, emergency, are the first things to have ready. סַכָּנָה is danger and דָּחוּף is urgent. The shout עֶזְרָה! already has the mark of a call for help.",
    examples=["help-01", "i-46-w1"],
    items=["help-01", "i-46-w1", "i-46-w4", "i-46-w5", "i-46-w8"],
    speak=[
        ("You need help now. Shout it.", "help-01"),
        ("Name an emergency.", "i-46-w1"),
    ],
    review_n=2,
)
P(
    id="pu-emergencies-p02", order=2, kind="learn", title="Calling an Ambulance or the Police",
    can="Name the police, an ambulance, a fire, and a phone.",
    point="The three numbers people ask for",
    body="מִשְׁטָרָה is the police, אַמְבּוּלַנְס an ambulance, and שְׂרֵפָה a fire. טֶלֶפוֹן is the phone you use to call. רוֹפֵא may also be needed at the scene.",
    examples=["i-46-w2", "i-46-w3"],
    items=["i-46-w2", "i-46-w3", "i-46-w6", "i-46-w12", "i-46-w9"],
    speak=[
        ("Ask someone to find the police.", "i-46-w2"),
        ("Name an ambulance.", "i-46-w3"),
    ],
    review_n=2,
)
P(
    id="pu-emergencies-p03", order=3, kind="grammar", title="Commands: Come, Call, Wait",
    can="Tell a man to call the police or an ambulance, or to wait a moment.",
    point="Commands change for who you are speaking to",
    body="תִּקְרָא לַמִּשְׁטָרָה and תִּקְרָא לְאַמְבּוּלַנְס are said to a man: call the police, call an ambulance. חַכֵּה רֶגַע tells a man to wait a moment; חַכִּי רֶגַע tells a woman. You already know בּוֹא הֵנָּה and בּוֹאִי הֵנָּה for come here.",
    examples=["help-03", "gp-15-m"],
    items=["help-03", "help-04", "gp-15-m", "gp-15-f"],
    speak=[
        ("Tell a man to call the police.", "help-03"),
        ("Tell a woman to wait a moment.", "gp-15-f"),
    ],
    review_n=2,
)
P(
    id="pu-emergencies-p04", order=4, kind="listen", title="Hear the Instructions",
    can="Hear a call for the police or an ambulance, and a wait command.",
    point="Listen for who is being told",
    body="תִּקְרָא marks a command to a man. חַכֵּה and חַכִּי split by gender. מִשְׁטָרָה and אַמְבּוּלַנְס tell you which help is wanted.",
    examples=["help-03", "help-04"],
    items=["help-03", "help-04", "gp-15-m", "gp-15-f", "help-01"],
    speak=[("You hear a call for an ambulance. Repeat it.", "help-04")],
    review_n=3,
)
P(
    id="pu-emergencies-p05", order=5, kind="speak", title="Say What Happened",
    can="Say you lost a passport or a phone, or name a thief.",
    point="The ready-made lost lines",
    body="אָבַד לִי הַדַּרְכּוֹן is I lost my passport, and אָבַד לִי הַטֶּלֶפוֹן is I lost my phone. גַּנָּב is a thief. הַדַּרְכּוֹן is the passport itself.",
    examples=["help-05", "help-06"],
    items=["help-05", "help-06", "i-46-w7", "i-46-w11"],
    speak=[
        ("You cannot find your passport.", "help-05"),
        ("You cannot find your phone.", "help-06"),
    ],
    review_n=2,
)
P(
    id="pu-emergencies-p06", order=6, kind="review", title="Unit Review",
    can="Review the emergency lines.",
    point="Shout, name, command",
    body="Start with עֶזְרָה!, name מִשְׁטָרָה or אַמְבּוּלַנְס, and use a command such as תִּקְרָא לַמִּשְׁטָרָה when you are speaking to a man.",
    examples=["help-01", "help-03"],
    items=["il18-w6"],
    speak=[("Name help, the lesson word.", "il18-w6")],
    review_n=6,
)

# ---------- pu-delivery ----------
P(
    id="pu-delivery-p01", order=1, kind="learn", title="The Order",
    can="Name a delivery, an order, a courier, pizza, salad and something tasty.",
    point="The order and the person who brings it",
    body="מִשְׁלוֹחַ is a delivery and הַזְמָנָה an order, the same word as a hotel reservation. שָׁלִיחַ is the courier. פִּיצָה and סָלָט are what you might order; טָעִים means tasty.",
    examples=["i-45-w1", "i-45-w3"],
    items=["i-45-w1", "i-45-w2", "i-45-w3", "i-45-w4", "i-45-w8", "i-45-w11"],
    speak=[
        ("You are waiting for a delivery.", "i-45-w1"),
        ("The person at the door is the courier.", "i-45-w3"),
    ],
    review_n=2,
)
P(
    id="pu-delivery-p02", order=2, kind="learn", title="The Address",
    can="Name the door, ask how long it will take, and say thanks.",
    point="Where to bring it, and how long",
    body="דֶּלֶת is the door. כַּמָּה זְמַן asks how long. מַיִם may be part of the order; תּוֹדָה is how you close when the שָׁלִיחַ arrives.",
    examples=["i-45-w10"],
    items=["i-45-w7", "i-45-w10", "i-45-w9", "i-45-w12"],
    speak=[
        ("Name the door.", "i-45-w7"),
        ("Ask how long it will take.", "i-45-w10"),
    ],
    review_n=2,
)
P(
    id="pu-delivery-p03", order=3, kind="speak", title="Call the Courier",
    can="Name the courier, the order or the delivery.",
    point="Three nouns for the phone call",
    body="On the phone, מִשְׁלוֹחַ, הַזְמָנָה and שָׁלִיחַ are the words you need. Add דֶּלֶת if they have the wrong door.",
    examples=["i-45-w3", "i-45-w2"],
    items=["i-45-w3", "i-45-w2", "i-45-w1"],
    speak=[
        ("You are calling about the courier.", "i-45-w3"),
        ("Name the order.", "i-45-w2"),
    ],
    review_n=2,
)
P(
    id="pu-delivery-p04", order=4, kind="review", title="Unit Review",
    can="Review the delivery words.",
    point="Order, address, thanks",
    body="Place a הַזְמָנָה, name the דֶּלֶת, and say תּוֹדָה when it arrives. כַּמָּה זְמַן is the useful wait question.",
    examples=["i-45-w2", "i-45-w12"],
    items=["i-45-w12"],
    speak=[("The food is at the door. Thank the courier.", "i-45-w12")],
    review_n=6,
)

# ---------- pu-social ----------
P(
    id="pu-social-p01", order=1, kind="learn", title="Short Messages",
    can="Name a message, a photo, a password and the internet.",
    point="The nouns of a short message",
    body="הוֹדָעָה is a message and תְּמוּנָה a picture. סִיסְמָה is the password and אִינְטֶרְנֶט the internet, as on the phone unit. טֶלֶפוֹן is still the phone you write from.",
    examples=["i-49-w2"],
    items=["i-49-w1", "i-49-w2", "i-49-w4", "i-49-w5", "i-49-w6"],
    speak=[
        ("You want to send a picture. Name it.", "i-49-w2"),
        ("The app asks for a password.", "i-49-w4"),
    ],
    review_n=2,
)
P(
    id="pu-social-p02", order=2, kind="grammar", title="Future Tense: I Will",
    can="Use I will go and I will eat, and ask if you may send.",
    point="The future forms you already have, plus sending",
    body="You already know אֲנִי אֵלֵךְ, I will go, and אֲנִי אֹכַל, I will eat. On this page, אֶפְשָׁר לִשְׁלֹחַ asks if you may send, and שׁוֹלֵחַ is the man's present form, sending. The future in those earlier lines is marked on the verb after אֲנִי, with no extra word for will.",
    examples=["i-49-w9", "i-49-w10"],
    items=["i-49-w9", "i-49-w10"],
    speak=[
        ("Ask if you may send the photo.", "i-49-w9"),
        ("You are a man and you are sending it now.", "i-49-w10"),
    ],
    review_n=2,
)
P(
    id="pu-social-p03", order=3, kind="speak", title="Reply to a Friend",
    can="Name a friend, say wait a moment, or say OK.",
    point="A short reply has a friend and an OK",
    body="חָבֵר is a friend (man) and חֲבֵרָה a friend (woman). רֶגַע buys a moment before you answer, and בְּסֵדֶר is OK, the same everyday word you learned in the first units.",
    examples=["i-49-w7", "i-49-w8"],
    items=["i-49-w7", "i-49-w8", "i-49-w11", "i-49-w12"],
    speak=[
        ("You are writing to a woman friend. Name her as a friend.", "i-49-w8"),
        ("Agree with a short OK.", "i-49-w12"),
    ],
    review_n=2,
)
P(
    id="pu-social-p04", order=4, kind="review", title="Unit Review",
    can="Review the message words.",
    point="Write, send, OK",
    body="A short exchange is often an הוֹדָעָה, a תְּמוּנָה, אֶפְשָׁר לִשְׁלֹחַ, and בְּסֵדֶר at the end.",
    examples=["i-49-w1", "i-49-w12"],
    items=["i-49-w12"],
    speak=[("Close the chat with OK.", "i-49-w12")],
    review_n=6,
)

# ---------- pu-army (live, family-friendly, sourced from I-18) ----------
P(
    id="pu-army-p01", order=1, kind="learn", title="Words From the Army",
    can="Name the army, a soldier, reserve duty, a commander, a base and leave.",
    point="Everyday service words",
    body="צָבָא is the army. חַיָּל is a soldier (man) and חַיֶּלֶת a soldier (woman). מִלּוּאִים is reserve duty, מְפַקֵּד a commander (man), בָּסִיס a base, and חֻפְשָׁה leave. These are ordinary family words in Israeli life; this page stays with those, not with combat slang.",
    examples=["i-18-w2", "i-18-w3"],
    items=["i-18-w1", "i-18-w2", "i-18-w3", "i-18-w4", "i-18-w5", "i-18-w6", "i-18-w9"],
    speak=[
        ("Name a soldier, the man's form.", "i-18-w2"),
        ("A friend is on reserve duty.", "i-18-w4"),
    ],
    review_n=2,
    culture="Many families in Israel use these words in ordinary talk. The course keeps the set family-friendly: service, people and leave, not weapons drill.",
)
P(
    id="pu-army-p02", order=2, kind="listen", title="Hear It in Conversation",
    can="Hear everyday replies used by soldiers and their friends.",
    point="Short replies you will also hear in civilian talk",
    body="יַאלְלָה means come on, or let's go. סַבָּבָה means fine, or cool. מָה הַמַּצָּב? is how's it going, and אֵין מַצָּב is no way. חֲבָל עַל הַזְּמַן praises something as excellent. תִּרְגַּע tells a man to calm down. אַחִי is bro, said to a close friend.",
    examples=["i-18-w10", "i-18-w11"],
    items=["i-18-w10", "i-18-w11", "i-18-w14", "i-18-w15", "i-18-w13", "i-18-w16", "i-18-w12"],
    speak=[
        ("Agree that something is fine.", "i-18-w11"),
        ("Tell a friend, casually, to come on.", "i-18-w10"),
    ],
    review_n=3,
)
P(
    id="pu-army-p03", order=3, kind="review", title="Unit Review",
    can="Review the service and reply words.",
    point="People first, then the short replies",
    body="Name צָבָא, חַיָּל or חַיֶּלֶת, and מִלּוּאִים when the talk is about service. In a casual reply, סַבָּבָה and יַאלְלָה are enough. This unit does not practise weapon words.",
    examples=["i-18-w1", "i-18-w11"],
    items=["i-18-w8"],
    speak=[("Name guard duty.", "i-18-w8")],
    review_n=6,
    culture="Weapon vocabulary from the same lesson is left off these pages so the live unit stays family-friendly.",
)

# ---------- pu-news ----------
P(
    id="pu-news-p01", order=1, kind="learn", title="Headline Words",
    can="Name the news, the government, elections, war, peace and a price.",
    point="Headline nouns are short",
    body="חֲדָשׁוֹת is the news. מֶמְשָׁלָה is the government and בְּחִירוֹת elections. מִלְחָמָה is war and שָׁלוֹם is peace, the same word as hello. מְחִיר is a price, which you already use in shops.",
    examples=["i-47-w1", "i-47-w5"],
    items=["i-47-w1", "i-47-w2", "i-47-w3", "i-47-w4", "i-47-w5", "i-47-w6"],
    speak=[
        ("Point to the news.", "i-47-w1"),
        ("Name peace in a headline.", "i-47-w5"),
    ],
    review_n=2,
)
P(
    id="pu-news-p02", order=2, kind="grammar", title="Reading Without Vowel Marks",
    can="Recognise today's headline words when you already know them with vowels.",
    point="Newspapers drop the vowel marks; you already know the words",
    body="A printed headline is often written without vowel marks. The words themselves are the ones you have just learned: חֲדָשׁוֹת, מֶמְשָׁלָה, מְחִיר, הַיּוֹם. Learn them with the marks here, then look for the same letters on a page. This lesson does not invent unpointed spellings.",
    examples=["i-47-w1", "i-47-w8"],
    items=["i-47-w8", "i-47-w9", "i-47-w10", "i-47-w1"],
    speak=[("A headline starts with today.", "i-47-w8")],
    review_n=2,
)
P(
    id="pu-news-p03", order=3, kind="learn", title="One Short Story",
    can="Read a short headline with there is and there isn't.",
    point="יֵשׁ and אֵין in a news line",
    body="A short story may use יֵשׁ or אֵין with מְחִיר. הַיּוֹם, מָחָר and אֶתְמוֹל place the story in time.",
    examples=["il08-w6"],
    items=["il08-w6", "i-47-w12"],
    speak=[
        ("Say there is.", "i-47-w12"),
        ("Say there isn't.", "il08-w6"),
    ],
    review_n=2,
)
P(
    id="pu-news-p04", order=4, kind="check", title="Level 3 Check",
    can="Show you can handle work, health, the bank, the post, help and a headline.",
    point="Putting level 3 together",
    body="This check mixes the living-in-Israel units. One new polite line: אֶפְשָׁר לְהִשְׁתַּמֵּשׁ בַּטֶּלֶפוֹן שֶׁלְּךָ? asks if you may use someone's phone, built like the other אֶפְשָׁר requests you already know.",
    examples=["help-09"],
    items=["help-09"],
    speak=[
        ("You need to make a call. Ask to use the phone, politely.", "help-09"),
        ("Call for help.", "help-01"),
    ],
    reviewOf_level="L3",
    review_n=11,
)

# ---------- pu-shabbat (stays at the end of the course, with holidays) ----------
P(
    id="pu-shabbat-p01", order=1, kind="learn", title="The Invitation",
    can="Answer an invitation, ask when to come, and offer to bring something.",
    point="Gladly, and when should I come",
    body="בְּשִׂמְחָה means gladly, a warm yes to an invitation. מָתַי לָבוֹא? asks when you should arrive, and לְהָבִיא is to bring. הַשָּׁעָה שֶׁבַע can be the answer, a clock time you already know. שַׁבָּת שָׁלוֹם is the greeting that opens the invitation, the same one you learned in the first units.",
    examples=["i-19-w5", "i-19-w9"],
    items=["i-19-w1", "i-19-w5", "i-19-w6", "i-19-w9", "i-19-w10"],
    speak=[
        ("You are happy to come. Say gladly.", "i-19-w5"),
        ("Ask when you should arrive.", "i-19-w9"),
    ],
    review_n=2,
    culture="This unit is table conversation around an invitation, not a liturgy lesson.",
)
P(
    id="pu-shabbat-p02", order=2, kind="learn", title="At the Table",
    can="Name the meal, wine, dessert, and offer a toast.",
    point="Food words at a Shabbat table",
    body="אֲרוּחָה is the meal and עֶרֶב the evening. יַיִן is wine and קִנּוּחַ dessert. לְחַיִּים! is the toast.",
    examples=["i-19-w3", "i-19-w12"],
    items=["i-19-w3", "i-19-w4", "cafe-12", "i-19-w8", "i-19-w12"],
    speak=[
        ("Raise a glass. Offer the toast.", "i-19-w12"),
        ("Name the wine.", "cafe-12"),
    ],
    review_n=2,
)
P(
    id="pu-shabbat-p03", order=3, kind="grammar", title="Polite Requests at a Meal",
    can="Make a polite request, and thank your hosts.",
    point="בְּבַקָּשָׁה at the table, and thanks",
    body="A request at the table can use בְּבַקָּשָׁה, which you already know, together with לְהָבִיא if you offer to bring something. תּוֹדָה רַבָּה is the thanks you already used at the hotel desk. The invitation itself is answered with בְּשִׂמְחָה, not with a new verb.",
    examples=["i-19-w6", "i-19-w13"],
    items=["i-19-w6", "i-19-w13"],
    speak=[
        ("Offer to bring something.", "i-19-w6"),
        ("Thank your hosts warmly.", "i-19-w13"),
    ],
    review_n=2,
)
P(
    id="pu-shabbat-p04", order=4, kind="speak", title="Thank Your Hosts",
    can="Thank your hosts and say goodbye or wish a good week.",
    point="Leave with thanks and a greeting",
    body="תּוֹדָה רַבָּה closes the meal. לְהִתְרָאוֹת is see you, and שָׁבוּעַ טוֹב is the greeting once Shabbat ends, both of which you already know from earlier units and from this lesson.",
    examples=["i-19-w13", "i-19-w2"],
    items=["i-19-w13", "i-19-w14", "i-19-w2"],
    speak=[
        ("The evening is over. Thank your hosts.", "i-19-w13"),
        ("Shabbat has ended. Wish a good week.", "i-19-w2"),
    ],
    review_n=2,
)
P(
    id="pu-shabbat-p05", order=5, kind="review", title="Unit Review",
    can="Review the invitation and table words.",
    point="Yes, when, thanks",
    body="Answer with בְּשִׂמְחָה, ask מָתַי לָבוֹא?, offer לְהָבִיא, and leave with תּוֹדָה רַבָּה. Open and close with שַׁבָּת שָׁלוֹם or שָׁבוּעַ טוֹב.",
    examples=["i-19-w5", "i-19-w13"],
    items=["i-19-w5"],
    speak=[("Accept the invitation gladly.", "i-19-w5")],
    review_n=6,
)

# ---------- pu-holidays (final unit of the Israel course) ----------
P(
    id="pu-holidays-p01", order=1, kind="learn", title="The Year at a Glance",
    can="Use everyday holiday greetings you already know, and a toast.",
    point="The year is marked with short greetings",
    body="חַג שָׂמֵחַ, שָׁנָה טוֹבָה, שַׁבָּת שָׁלוֹם and שָׁבוּעַ טוֹב are the greetings you learned at the start of the course; they also belong here, at the end of the year. לְחַיִּים is the toast, and יוֹם נָעִים is have a nice day, for ordinary mornings.",
    examples=["i-50-w3", "i-50-w4"],
    items=["i-50-w1", "i-50-w2", "i-50-w3", "i-50-w4", "i-50-w6", "i-50-w11"],
    speak=[
        ("It is a festival. Give the general greeting.", "i-50-w3"),
        ("It is Rosh Hashana. Give that greeting.", "i-50-w4"),
    ],
    review_n=2,
)
P(
    id="pu-holidays-p02", order=2, kind="learn", title="Greetings for Each Holiday",
    can="Give the Yom Kippur and Pesach greetings, and everyday good wishes.",
    point="Two festival greetings kept on the live course",
    body="גְּמַר חֲתִימָה טוֹבָה is the Yom Kippur greeting, a good final sealing. חַג כָּשֵׁר וְשָׂמֵחַ is the Pesach greeting, a kosher and happy holiday. מַזָּל טוֹב and בְּהַצְלָחָה are everyday good wishes, not tied to one day.",
    examples=["i-50-w13", "i-29-w13"],
    items=["i-50-w13", "i-29-w13", "i-50-w5", "i-50-w7"],
    speak=[
        ("It is Yom Kippur. Give the greeting.", "i-50-w13"),
        ("It is Pesach. Give the greeting.", "i-29-w13"),
    ],
    review_n=2,
    culture="Both festival greetings are shown here, as decided: they are ordinary seasonal wishes, copied from the lesson sources.",
)
P(
    id="pu-holidays-p03", order=3, kind="listen", title="Hear the Greeting",
    can="Hear a festival or everyday greeting and pick its meaning.",
    point="Listen for the festival word",
    body="חַג, שָׁנָה and גְּמַר tell you which greeting you are hearing. לִבְרִיאוּת is to your health, often after a sneeze, and סְלִיחָה is the everyday pardon you already know.",
    examples=["i-50-w13", "i-50-w9"],
    items=["i-50-w3", "i-50-w4", "i-50-w13", "i-29-w13", "i-50-w9", "i-50-w12"],
    speak=[("Someone sneezes. Wish them health.", "i-50-w9")],
    review_n=3,
)
P(
    id="pu-holidays-p04", order=4, kind="speak", title="Wish Someone Well",
    can="Tell a man or a woman to take care, or wish good luck.",
    point="Take care changes for a man or a woman",
    body="תִּשְׁמֹר עַל עַצְמְךָ is said to a man; תִּשְׁמְרִי עַל עַצְמֵךְ is said to a woman. You already practised this pair in the greetings unit. בְּהַצְלָחָה and מַזָּל טוֹב are the same for everyone.",
    examples=["i-50-w8", "i-50-w14"],
    items=["i-50-w8", "i-50-w14", "i-50-w7", "i-50-w5"],
    speak=[
        ("Noa is leaving on a trip. Tell her to take care.", "i-50-w14"),
        ("Ari has an interview. Wish him luck.", "i-50-w7"),
    ],
    review_n=2,
)
P(
    id="pu-holidays-p05", order=5, kind="check", title="Final Check",
    can="Show you can greet, thank, and give everyday and festival wishes.",
    point="Putting the whole Practical course together",
    body="This last check mixes greetings from the start of the course with the festival wishes you have just learned. The new line on this page is גְּמַר חֲתִימָה טוֹבָה, already taught in this unit and brought back once more. בְּעֶזְרַת הַשֵּׁם is the everyday set phrase you met under politeness, shown as written, not as a divine name to be voiced in a special way.",
    examples=["i-50-w13", "politeness-21"],
    items=["i-50-w13"],
    speak=[
        ("It is Yom Kippur. Give the greeting.", "i-50-w13"),
        ("Wish someone a kosher and happy Pesach.", "i-29-w13"),
    ],
    reviewOf_level="FINAL",
    review_n=11,
)
