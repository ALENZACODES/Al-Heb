"""Image slot map for I-01..I-50: two slots per lesson, one scene line each (for later image prompts)."""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))

S = {
"I-01": ("A congregation standing, one hand over the eyes, during the Shema, seen from behind in a warm sanctuary.", "A prayer book open on a wooden stand beside a pair of reading glasses, soft window light."),
"I-02": ("A worshipper standing alone with feet together in quiet prayer facing a plain stone wall.", "A cantor's hands resting on a lectern as the congregation rises behind in blurred rows."),
"I-03": ("A Torah scroll carried slowly through a seated congregation, hands reaching out to touch it.", "An open ark with several scrolls in embroidered velvet covers, lit from inside."),
"I-04": ("A row of mourners standing together, shoulders touching, in a small prayer room.", "A single memorial candle burning on a table beside a closed prayer book."),
"I-05": ("A family around a Friday-night table with a silver cup of wine and two covered loaves.", "Two hands lifting a small kiddush cup toward the light of Shabbat candles."),
"I-06": ("A braided havdalah candle and a small spice box held up in a darkened room.", "Fingers curled toward a flame to see the light reflected on the nails, dim kitchen."),
"I-07": ("A crowded hall of people singing with their mouths open, hands raised, festive light.", "A table with a cup of wine, a prayer book and a plate of dates, late afternoon."),
"I-08": ("Worshippers bowing low from the waist at the end of a service, seen from the side.", "A sunlit window of a synagogue with a tree outside and rows of empty chairs."),
"I-09": ("People drifting out of a synagogue at midday, children running ahead down the steps.", "A small group at the door singing together with arms around each other's shoulders."),
"I-10": ("A person standing at the front of a congregation while others lean in to listen.", "A hospital corridor with a bunch of flowers on a chair and a window onto a garden."),
"I-11": ("A passenger tapping a transit card on a reader on a crowded city bus.", "A train platform at dusk with a waiting passenger and the lights of an approaching train."),
"I-12": ("A covered market lane with crates of tomatoes, cucumbers and olives and a vendor holding up two fingers.", "Two hands exchanging coins and a paper bag of fruit across a wooden stall."),
"I-13": ("A cafe counter with a glass of milky coffee, a pastry and a barista's hand sliding the cup forward.", "A sunny pavement table with two coffees, a small sugar pot and a street cat nearby."),
"I-14": ("A pharmacist handing a small white box across the counter to a customer, shelves behind.", "A hand holding a thermometer and a glass of water beside a window."),
"I-15": ("A traveller turning a paper map in a narrow old-city street, a stone archway ahead.", "A street corner with a traffic light, a bakery and a pedestrian pointing the way."),
"I-16": ("A person holding a phone high to find a signal on a rooftop at sunset.", "A phone on a charger beside a cup of tea and an open notebook."),
"I-17": ("A bright empty apartment living room with a balcony door open to a city view.", "A key being handed from one hand to another in front of a front door."),
"I-18": ("Two young adults in plain olive clothes laughing on a bus with duffel bags at their feet.", "A kitchen table with a kit bag, a water bottle and a phone, early morning light."),
"I-19": ("A long Friday-night table with candles, wine, bread and guests laughing.", "A guest arriving at an open door holding a bottle and a cake box, hosts greeting."),
"I-20": ("A clinic waiting room with a few chairs, a nurse's station and a window.", "A doctor's hand resting reassuringly on a patient's shoulder in a small exam room."),
"I-21": ("A bank counter with a clerk and a customer filling in a form with a pen.", "A cash machine on a sunny street wall with a person waiting behind."),
"I-22": ("A post office queue with parcels in hands and a clerk weighing a box on a scale.", "A small stack of stamped envelopes and a taped parcel on a counter."),
"I-23": ("A taxi at a kerb with the driver leaning over to a passenger's window.", "A passenger's view from the back seat of a road at dusk with a meter glowing."),
"I-24": ("A street under a sudden rain shower with open umbrellas and wet pavement.", "A bright beach-front promenade at noon with a hot haze over the sea."),
"I-25": ("Two strangers chatting on a bench in a park, one holding a language notebook.", "A cafe terrace conversation between three people with coffees and gestures."),
"I-26": ("A congregation seated facing the reading table as a scroll is lifted high above it.", "A reader's silver pointer resting on an open unrolled scroll."),
"I-27": ("A sanctuary at the peak of the service with everyone rising on tiptoe together.", "A pair of worshippers taking three small steps backward at the end of silent prayer."),
"I-28": ("A synagogue at dusk with white-clad worshippers standing in a long silent line.", "A ram's horn resting on a white cloth beside a prayer book."),
"I-29": ("A festive table with matzo, a seder plate of small dishes and a cup of wine.", "A child's wide eyes at a holiday table lit by candlelight."),
"I-30": ("A leafy hut built on a balcony with fruit hanging from its roof and a table set inside.", "A family eating together inside a temporary booth with the night sky visible through the branches."),
"I-31": ("Children in colourful homemade costumes in a street parade, faces turned to a noise-maker.", "A table of triangular pastries and gift baskets wrapped in ribbon."),
"I-32": ("A window sill with a candelabrum of lit candles and a dark street beyond.", "A child lighting a candle with the helper flame while a parent watches."),
"I-33": ("A table after a meal with empty plates, crumbs and people leaning back and singing softly.", "Hands passing a small book around a table of friends after dinner."),
"I-34": ("A traveller at an airport window with a bag at their feet and a plane on the runway.", "A quiet road at dawn with a lone car and hills in the distance."),
"I-35": ("A long Saturday lunch table in a garden with wine, bread and a crowd of guests.", "A kiddush cup being passed along a table of smiling neighbours."),
"I-36": ("A modern shared office with colleagues around a table and a window onto the city.", "A job interview seen from the side, two people across a desk, handshake just ending."),
"I-37": ("A campus lawn with students sitting on the grass with books and laptops.", "A lecture hall seen from the back with a speaker at the front and rows of listeners."),
"I-38": ("Two people on a first date at a small restaurant table, candle between them, mid-laugh.", "Friends in a cinema queue at night with warm light on their faces."),
"I-39": ("A car stopped at a red traffic light on a wide city road at sunset.", "A driver's hands on the wheel and a road bending toward hills."),
"I-40": ("Hikers on a narrow dry trail along a stream with a hill rising behind.", "A paper map and a water bottle on a flat rock in the sun."),
"I-41": ("A wide Mediterranean beach with umbrellas, sand and a calm sea.", "A towel and a hat left on the sand beside footprints leading to the water."),
"I-42": ("Children running across a playground while a parent watches from a bench.", "A kindergarten room with small chairs, drawings on the wall and a teacher kneeling beside a child."),
"I-43": ("A supermarket aisle with a full trolley and shelves of bread, milk and fruit.", "A checkout belt with groceries and a hand holding out a card."),
"I-44": ("A landlord and tenant looking at a broken fridge with the door hanging open.", "An electrician on a stool with a torch inspecting a ceiling light."),
"I-45": ("A delivery rider on a scooter arriving at an apartment block at night with a box on the back.", "A hand taking a warm pizza box through a half-open door."),
"I-46": ("An ambulance with its lights on at the kerb of a quiet street at night and a crowd standing back.", "A person on a phone in a stairwell looking worried, a police car's blue light on the wall."),
"I-47": ("A family watching a television news broadcast in a living room, faces serious.", "A newsstand with a stack of folded newspapers and a hand taking one."),
"I-48": ("A person signing a paper form at a desk with a pen and a folder of documents.", "A banker's desk with a calculator, a folder and two cups of coffee."),
"I-49": ("A friend group leaning together to take a photo on a phone at a street festival.", "A hand scrolling a phone screen beside a cup of coffee, blurred cafe behind."),
"I-50": ("Neighbours greeting each other on a street with flowers and holiday decorations.", "A table with a honey jar, an apple, a candle and a card, set for a festive greeting."),
}

def build():
    idx = json.load(open(os.path.join(ROOT, 'data/curriculum/intermediate-index.json')))
    slots = []
    for l in idx['lessons']:
        a, b = S[l['id']]
        slots.append({"lesson": l['id'], "title": l['title'], "slots": [
            {"id": f"{l['id']}-img1", "role": "opening scene", "scene": a},
            {"id": f"{l['id']}-img2", "role": "closing scene", "scene": b}]})
    assert set(S) == {l['id'] for l in idx['lessons']}
    out = {
        "schema": "alef-intermediate-image-slots/1", "version": 1, "status": "draft",
        "note": "Two image slots per intermediate lesson. Each scene is one line meant as the core of a later image prompt. No images exist yet; nothing here has been generated or reviewed.",
        "rules": ["No text, letters, numbers, logos or readable signs anywhere in the image; blank or blurred surfaces instead.",
                  "No identifiable real people and no faces of real individuals; people are generic, mostly seen from behind, the side or at a distance.",
                  "Warm, realistic photographic style; the same style across the set.",
                  "Do not draw sacred texts with legible writing; ritual objects are shown plainly and respectfully."],
        "lessons": slots,
    }
    p = os.path.join(ROOT, 'data/curriculum/intermediate-image-slots.json')
    json.dump(out, open(p, 'w'), ensure_ascii=False, indent=1); open(p, 'a').write('\n')
    print('slots', len(slots) * 2)

if __name__ == '__main__':
    build()
