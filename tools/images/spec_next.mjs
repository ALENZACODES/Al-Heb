// Block H: 485 NEW images (commands 102-149) added after the doc's 100 commands and block G.
// Pure data, no I/O. Item prefixes: "A|" = Ari in the picture, "N|" = Noa, "B|" = both; no prefix = no narrator.
import { STYLE_GUIDE, ARI, NOA } from './spec.mjs';

export { STYLE_GUIDE, ARI, NOA };
export const NO_TEXT = 'No text, letters or numerals anywhere in the image.';
export const BLANK_RULE = 'Any sign, screen, page, book, label, scroll or parchment in the picture stays completely blank.';
export const MASCOT =
  "MASCOT 'Rimon': a small round pomegranate-red sprite with a gold crown-shaped calyx on top, two olive-green leaf ears, big friendly dot eyes, tiny arms and feet, thick charcoal outline; expressive but never any writing.";

export const WIDE = [1792, 1024];
export const SQUARE = [1024, 1024];
export const PORTRAIT = [1024, 1280];
export const ALLOWED_SIZES = ['1024x1024', '1792x1024', '1024x1280'];

/**
 * Each command: number, set, title, prefix, size, cast ('mixed' = per-item prefixes; 'none'; 'mascot'),
 * parts: [{ topic, items }] (file nn restarts per part), frame (sentence describing what to draw).
 */
export const COMMANDS = [
  { number: 102, set: 'next_scn_torah', title: 'Torah service steps', prefix: 'SCN', size: WIDE, cast: 'mixed', frame: 'a step of the Torah service, one scene per step',
    parts: [{ topic: 'torah', items: [
      'the ark curtain being drawn open by a congregant, the gold-lit ark interior with scrolls in their mantles',
      'the Torah procession (hakafah) circling the sanctuary, people reaching out with the corners of closed prayer books, seen from above',
      'hagbah: a strong lifter raising the open Torah scroll high so the whole congregation sees the columns, which are shown only as soft pale bands with no marks',
      'gelilah: two people rolling the scroll closed and tying its binder, the mantle waiting on the table',
      'N|Noa standing at the bimah for an aliyah, one hand touching the scroll edge, tallit on her shoulders',
      'a reader guiding a silver yad pointer along the open scroll, the parchment shown only as blank pale bands',
      'B|Ari and Noa in the pews, a small child between them on tiptoe to see the scroll',
      'the Torah being carried back to the ark while the congregation faces it and sings',
      'the ark closing, the curtain falling, a red-gold eternal-light lamp glowing above',
      'dressing the Torah: velvet mantle, silver breastplate and crown laid out on a table, one hand fixing the pointer chain'] }] },
  { number: 103, set: 'next_scn_service', title: 'Synagogue service flow', prefix: 'SCN', size: WIDE, cast: 'mixed', frame: 'a moment of a synagogue visit',
    parts: [{ topic: 'service', items: [
      'A|Ari at the sanctuary door taking a kippah from a basket',
      'N|Noa wrapping a tallit around her shoulders with both hands',
      'a vestibule with coats and umbrellas on hooks and two closed prayer books with blank covers on a shelf',
      'B|Ari and Noa choosing seats while an usher gestures with an open palm',
      'the congregation standing together, backs to the viewer, facing the ark',
      'a worshipper taking three steps back, only feet and floor shown',
      'a seated mourner rising with a hand on a friend\'s shoulder, a small memorial candle lit in a wall niche',
      'a cantor at the front with hands open and the congregation swaying behind',
      'a child kissing the corner of a closed prayer book, parent smiling beside',
      'a kiddush table after services with wine cups, challah and cake, people mingling'] }] },
  { number: 104, set: 'next_scn_shabbat', title: 'Shabbat table steps', prefix: 'SCN', size: WIDE, cast: 'mixed', frame: 'a step of the Friday-night Shabbat evening',
    parts: [{ topic: 'shabbat', items: [
      'a family laying a white tablecloth together on Friday afternoon, flowers waiting in a vase',
      'N|Noa lighting two candles, hands circling toward her face',
      'a parent blessing a child with a hand on the head while siblings wait',
      'A|Ari raising the kiddush cup with the family standing around the table',
      'hands being washed from a two-handled cup at a kitchen sink, towel on a shoulder',
      'a challah under its cover being uncovered, a knife hovering over it',
      'a steaming bowl of chicken soup being ladled around the table',
      'the family singing at the table with mouths open, a child tapping the table',
      'grace after the meal: people seated with closed books, candles burned low',
      'A|Ari asleep on a sofa on Saturday afternoon with a closed book on his chest, tea cooling beside him'] }] },
  { number: 105, set: 'next_scn_havdalah', title: 'Friday prep and havdalah', prefix: 'SCN', size: WIDE, cast: 'mixed', frame: 'Friday preparation or the end of Shabbat',
    parts: [{ topic: 'havdalah', items: [
      'cooking for Shabbat: pots on a stove and braided dough rising on a tray',
      'a tidy-up before sundown with a broom and a basket of folded laundry',
      'B|Ari and Noa on a balcony at dusk, the first three stars appearing',
      'a braided multi-wick candle being lit by a child with a grown-up steadying the hand',
      'a spice box held out and sniffed, eyes closed',
      'a full wine cup overflowing slightly onto a saucer',
      'the braided candle dipped into spilled wine, flame hissing and steam rising',
      'hands cupped toward the flame, fingernails catching the light',
      'a family hugging goodbye to Shabbat with candle smoke curling above them',
      'a phone with a blank screen lighting up on a table as a calendar page turns to a new week'] }] },
  { number: 106, set: 'next_hol_rosh_yomkippur', title: 'Rosh Hashanah and Yom Kippur', prefix: 'HOL', size: WIDE, cast: 'mixed', frame: 'a scene of the holiday named in the file topic',
    parts: [
      { topic: 'roshhashana', items: [
        'apple slices being dipped in honey, several family hands reaching in',
        'a round challah with raisins on a plate beside a small honey jar',
        'a pomegranate cut open on a table with seeds spilling',
        'A|Ari blowing a shofar in a synagogue, cheeks puffed',
        'tashlich: people at a river at sunset shaking out their pockets over the water'] },
      { topic: 'yomkippur', items: [
        'a congregation dressed in white standing before the open ark',
        'a quiet empty street with a few people in white walking to synagogue',
        'a break-fast table with bagels, eggs, fruit and a water jug',
        'neilah: the ark open, last light through a high window, a shofar raised',
        'a white candle burning in a glass beside a closed prayer book'] }] },
  { number: 107, set: 'next_hol_sukkot_simchat', title: 'Sukkot and Simchat Torah', prefix: 'HOL', size: WIDE, cast: 'mixed', frame: 'a scene of the holiday named in the file topic',
    parts: [
      { topic: 'sukkot', items: [
        'building a sukkah: a ladder, wooden poles and green branches laid across the top',
        'N|Noa shaking a lulav and etrog toward the four directions',
        'a family meal inside the sukkah with stars visible through the leafy roof',
        'the four species laid on a table with the etrog in its little box',
        'children hanging paper garlands and plastic fruit inside a sukkah'] },
      { topic: 'simchattorah', items: [
        'dancing with Torah scrolls in a joyful circle',
        'a child on a parent\'s shoulders waving a blank flag topped with an apple',
        'a whole Torah scroll unrolled around the room held by a ring of people',
        'candy raining down on delighted children',
        'hakafot at night: a crowd singing among rows of lit candles'] }] },
  { number: 108, set: 'next_hol_hanukkah', title: 'Hanukkah', prefix: 'HOL', size: WIDE, cast: 'mixed', frame: 'a Hanukkah scene',
    parts: [{ topic: 'hanukkah', items: [
      'a child lighting the first candle of a menorah with the helper candle',
      'a menorah glowing in a window facing a snowless street at dusk',
      'a dreidel spinning on a table with blank sides',
      'jelly doughnuts on a plate dusted with sugar',
      'chocolate coins in gold wrappers spilling from a small bag',
      'B|Ari and Noa frying latkes in a pan, steam rising',
      'a family opening small gifts around the lit menorah',
      'a row of menorahs showing one candle, then four, then eight, side by side',
      'a small jar of oil and an olive branch beside a menorah',
      'children playing a dreidel game on the floor with a pile of coins'] }] },
  { number: 109, set: 'next_hol_tubishvat_purim', title: 'Tu BiShvat and Purim', prefix: 'HOL', size: WIDE, cast: 'mixed', frame: 'a scene of the holiday named in the file topic',
    parts: [
      { topic: 'tubishvat', items: [
        'a child planting a sapling with both hands in the soil',
        'a table of dried fruits and nuts in small bowls',
        'an almond tree in pink and white blossom on a hillside',
        'the seven species on one plate: wheat, barley, grapes, figs, pomegranate, olives and dates',
        'A|Ari watering a young tree with a green can'] },
      { topic: 'purim', items: [
        'a scroll being read aloud while children swing noisemakers',
        'children in simple costumes laughing in a doorway',
        'a tray of triangular hamantaschen',
        'a gift basket being handed over at a front door',
        'a festive table with masks and wine glasses',
        'a coin dropping into a charity box'] }] },
  { number: 110, set: 'next_hol_pesach', title: 'Pesach', prefix: 'HOL', size: WIDE, cast: 'mixed', frame: 'a Passover scene',
    parts: [{ topic: 'pesach', items: [
      'cleaning for Passover: a candle, a feather and a wooden spoon sweeping crumbs',
      'bread burning in a small outdoor fire, children watching',
      'the seder plate at the centre of a set table with its six small items',
      'three matzot stacked in a cloth',
      'four wine cups lined up in a row',
      'a small child with mouth wide open asking a question at the seder table',
      'a door opened wide with an empty cup on the table for Elijah',
      'the sea parted into two walls of water with a dry path between them',
      'a hunt for hidden matzah under cushions, a child holding it up in triumph',
      'B|Ari and Noa leaning on pillows at the seder table'] }] },
  { number: 111, set: 'next_hol_shavuot_tisha', title: 'Shavuot and Tisha B\'Av', prefix: 'HOL', size: WIDE, cast: 'mixed', frame: 'a scene of the holiday named in the file topic',
    parts: [
      { topic: 'shavuot', items: [
        'cheesecake and blintzes on a table with flowers',
        'a mountain wrapped in cloud and light',
        'children carrying baskets of first fruits',
        'late-night study: people with closed books and coffee at midnight',
        'a wheat field with a wreath of flowers laid in the front'] },
      { topic: 'tishabav', items: [
        'low chairs on the floor in a dim room',
        'a quiet synagogue with the ark curtain removed',
        'the old city wall at dusk, quiet, nobody in sight',
        'people reading by candlelight sitting on the floor',
        'worshippers in canvas shoes sitting on stone steps at sunset'] }] },
  { number: 112, set: 'next_hol_modern_calendar', title: 'Other days on the calendar', prefix: 'HOL', size: WIDE, cast: 'mixed', frame: 'a calendar-day scene',
    parts: [{ topic: 'calendar', items: [
      'Lag BaOmer: a bonfire at night with children roasting potatoes',
      'Yom HaAtzmaut: a backyard barbecue under strings of blank blue-and-white flags',
      'Yom HaZikaron: people standing still on a street and cars stopped during a siren, heads bowed',
      'Yom Yerushalayim: people dancing with flags near the old city walls',
      'Rosh Chodesh: a group of women under a thin new moon sharing a snack',
      'counting the Omer: a calendar grid with sheaves of grain, no numerals',
      'Selichot: a synagogue lit at midnight with a full moon outside',
      'Shemini Atzeret: rain falling on a field with a farmer\'s hat held up',
      'Hoshana Rabbah: willow branches being beaten gently on the floor',
      'Shabbat HaGadol: a rabbi\'s hands open before a full synagogue'] }] },

  // Israel street course (113-122)
  { number: 113, set: 'next_str_bus', title: 'Street Hebrew: buses and trains', prefix: 'STR', size: WIDE, cast: 'mixed', frame: 'an everyday Israel street scenario',
    parts: [{ topic: 'bus', items: [
      'A|Ari waiting at a bus stop, checking a blank watch',
      'N|Noa tapping a blank transit card on a bus reader',
      'a crowded bus interior with standing passengers holding straps',
      'A|Ari offering his seat to an older woman',
      'a hand pressing the stop button, a red light glowing',
      'N|Noa leaning toward the driver to ask something, the driver pointing ahead',
      'a bus route map poster with coloured lines and dots but no writing',
      'B|Ari and Noa stepping off a bus at night under a streetlamp',
      'A|Ari running after a bus pulling away, bag swinging',
      'a light-rail platform with a train arriving and people waiting behind the line'] }] },
  { number: 114, set: 'next_str_market', title: 'Street Hebrew: the market', prefix: 'STR', size: WIDE, cast: 'mixed', frame: 'an everyday Israel street scenario',
    parts: [{ topic: 'market', items: [
      'a market stall of tomatoes, cucumbers and peppers under a striped awning',
      'N|Noa haggling, one hand open, the vendor shrugging with a smile',
      'a customer tasting an olive offered on a toothpick',
      'a vendor weighing grapes on a hanging scale',
      'pyramids of colourful spices in open sacks',
      'a vendor squeezing pomegranate juice into a tall glass',
      'a bakery counter piled with rugelach and bourekas',
      'a Friday rush with crowded lanes and people carrying flowers',
      'A|Ari carrying heavy shopping bags up a lane',
      'a fishmonger arranging silver fish on ice'] }] },
  { number: 115, set: 'next_str_cafe', title: 'Street Hebrew: cafe scenes', prefix: 'STR', size: WIDE, cast: 'mixed', frame: 'an everyday Israel street scenario',
    parts: [{ topic: 'cafe', items: [
      'A|Ari ordering at a cafe counter, a barista leaning in to listen',
      'B|Ari and Noa at a small table for two with two glasses of iced coffee',
      'a waiter taking an order with a pad that stays blank',
      'two friends splitting a bill, hands over a small tray with coins',
      'a tiny espresso cup beside a glass of sparkling water',
      'N|Noa carrying a takeaway cup out of a cafe door',
      'a pastry display case full of cakes and croissants',
      'A|Ari working on a laptop with a blank screen on a shady balcony',
      'a birthday cake with candles being carried to a cafe table',
      'a cafe terrace on a busy street with chatting groups under umbrellas'] }] },
  { number: 116, set: 'next_str_phone', title: 'Street Hebrew: phone life', prefix: 'STR', size: WIDE, cast: 'mixed', frame: 'an everyday Israel street scenario',
    parts: [{ topic: 'phone', items: [
      'N|Noa on a phone call, one finger raised to say "one moment"',
      'hands texting on a phone with empty speech bubbles on the blank screen',
      'a delivery courier on an electric scooter holding a food bag',
      'A|Ari following a map on a blank phone screen with a single pin',
      'B|Ari and Noa on a video call with two friends in small windows',
      'a voice-message screen showing only a wavy line',
      'A|Ari patting his pockets, searching for a lost phone',
      'a phone charging on a cafe table with a cable running to the wall',
      'N|Noa taking a selfie with a friend on a beach promenade',
      'a hand paying with a phone held to a card reader'] }] },
  { number: 117, set: 'next_str_street', title: 'Street Hebrew: directions and city', prefix: 'STR', size: WIDE, cast: 'mixed', frame: 'an everyday Israel street scenario',
    parts: [{ topic: 'street', items: [
      'N|Noa asking a passer-by for directions, the passer-by pointing to the right',
      'a pedestrian crossing with a green walking figure on the light',
      'A|Ari raising an arm to hail a taxi',
      'a jogger on a beachfront promenade at sunrise',
      'a scooter parked beside a row of bikes',
      'a narrow street with cars parked half on the pavement',
      'stray cats on a stairway between apartment blocks',
      'a four-way intersection seen from above with crossing arrows painted on the road',
      'a tourist turning a blank paper map upside down',
      'a quiet Shabbat street with closed shutters and an empty crossing'] }] },
  { number: 118, set: 'next_str_shop', title: 'Street Hebrew: shops and services', prefix: 'STR', size: WIDE, cast: 'mixed', frame: 'an everyday Israel street scenario',
    parts: [{ topic: 'shop', items: [
      'a grocery aisle with shelves of jars and boxes with blank labels',
      'N|Noa trying on a jacket in front of a mirror',
      'a pharmacy counter with a pharmacist handing over a small paper bag',
      'a post office counter with a parcel being weighed',
      'A|Ari at a bank teller window, hands over a card',
      'a supermarket checkout with a conveyor and a cashier scanning',
      'a shop window of phones and headphones',
      'a small bookshop with a cat asleep on a stack of books',
      'a flower stall on a corner with buckets of blooms',
      'a shoe shop with a fitting stool and boxes stacked to the ceiling'] }] },
  { number: 119, set: 'next_str_travel', title: 'Street Hebrew: travel', prefix: 'STR', size: WIDE, cast: 'mixed', frame: 'an everyday Israel street scenario',
    parts: [{ topic: 'travel', items: [
      'an airport check-in desk with a suitcase on the belt',
      'A|Ari at passport control holding a blank passport',
      'a baggage carousel with colourful suitcases',
      'N|Noa at a hotel reception desk taking a key card',
      'a rental car handover with keys passing between two hands',
      'a beach with striped umbrellas and a lifeguard tower',
      'a hostel dorm room with bunk beds and backpacks',
      'a shared taxi van with passengers squeezed in',
      'a train carriage window showing fields and hills',
      'B|Ari and Noa at a hike trailhead with backpacks and water bottles'] }] },
  { number: 120, set: 'next_str_social', title: 'Street Hebrew: friends and neighbours', prefix: 'STR', size: WIDE, cast: 'mixed', frame: 'an everyday Israel street scenario',
    parts: [{ topic: 'social', items: [
      'two friends hugging in greeting on a street corner',
      'a big family dinner around a long table, hands passing dishes',
      'N|Noa chatting with a neighbour on a stairwell',
      'a birthday party with balloons and a cake',
      'a barbecue on a small mangal on a balcony, smoke curling',
      'a picnic on a lawn with a blanket and fruit',
      'friends playing basketball on a neighbourhood court',
      'a wedding dance in a circle with raised arms',
      'A|Ari and a neighbour sharing a cup of tea over a fence',
      'A|Ari bumping into someone on the pavement and apologising with an open palm'] }] },
  { number: 121, set: 'next_str_health', title: 'Street Hebrew: health and wellbeing', prefix: 'STR', size: WIDE, cast: 'mixed', frame: 'an everyday Israel street scenario',
    parts: [{ topic: 'health', items: [
      'a doctor listening to a patient\'s chest with a stethoscope',
      'a pharmacy shelf with neat rows of boxes with blank labels',
      'a waiting room with chairs, a plant and a magazine rack',
      'a dentist chair with a lamp above and a friendly hygienist',
      'a nurse taking a blood pressure reading from an arm',
      'a small gym with weights and a treadmill',
      'N|Noa doing yoga on a beach at sunrise',
      'A|Ari in bed with a blanket, a thermometer and a cup of tea',
      'a friend arriving at a door with a pot of soup',
      'B|Ari and Noa walking in a park with a dog'] }] },
  { number: 122, set: 'next_str_work', title: 'Street Hebrew: work life', prefix: 'STR', size: WIDE, cast: 'mixed', frame: 'an everyday Israel street scenario',
    parts: [{ topic: 'work', items: [
      'an open-plan office with desks, plants and a window onto a city',
      'a meeting around a table with a blank projector screen',
      'a coffee machine with colleagues queuing for cups',
      'N|Noa shaking hands with an interviewer across a desk',
      'a whiteboard with only coloured sticky notes and arrows',
      'colleagues eating lunch together on the office stairs',
      'A|Ari working at a desk with two blank screens',
      'a desk phone ringing beside a stack of folders',
      'colleagues clapping around a cake in the office',
      'N|Noa commuting by train with headphones, looking out of the window'] }] },

  // Vocab-tier object illustrations (123-137)
  ...[
    [123, 'fruit', 'Fruit', ['an orange with a leaf', 'a bunch of red grapes', 'a slice of watermelon', 'a strawberry', 'a peach with a leaf', 'a pear', 'a ripe fig cut in half', 'a date branch with dates', 'half a melon with seeds', 'a pair of cherries']],
    [124, 'vegetables', 'Vegetables', ['a cucumber', 'a tomato on the vine', 'an onion', 'a red pepper', 'an eggplant', 'a potato', 'half a cabbage', 'a corn cob', 'a mushroom', 'a garlic bulb']],
    [125, 'bakery_dairy', 'Bakery and dairy', ['a block of butter on a dish', 'three eggs in a bowl', 'a yogurt cup with a spoon', 'a round cheese wheel with a wedge cut', 'a stack of pita breads', 'a basket of bread rolls', 'a slice of layered cake', 'a plate of cookies', 'three rugelach pastries', 'a stuffed pastry cut in half']],
    [126, 'drinks', 'Drinks', ['a glass of tea with a mint sprig', 'a glass of orange juice', 'a soda can with a straw', 'a jug of lemonade with mint', 'a milk carton and glass', 'a glass of red wine', 'a coffee pot pouring', 'a water jug with a glass', 'a thick fruit smoothie with a straw', 'a small Turkish coffee cup on a saucer']],
    [127, 'dishes', 'Israeli dishes', ['a schnitzel with a lemon wedge', 'a pita sandwich of eggplant and egg', 'a bowl of couscous', 'a steaming bowl of chicken soup', 'a stuffed dumpling in broth', 'a bowl of chopped Israeli salad', 'a pot of rice with a ladle', 'a bowl of strained yogurt with olive oil and herbs', 'a plate of grilled vegetables', 'a tray of baked fish with lemons']],
    [128, 'family', 'Family members', ['a grandmother with grey hair knitting', 'a grandfather with a cane and a hat', 'a teenage brother with headphones', 'a young sister with a ponytail', 'a baby in a blanket', 'an aunt with a bright scarf', 'an uncle holding a toolbox', 'two cousins playing together', 'a wedding couple holding hands', 'a mother and father with three children']],
    [129, 'body', 'More body parts', ['a nose in profile', 'a mouth smiling', 'a head of curly hair', 'an arm with a bent elbow', 'a leg in a stride', 'a back with a backpack', 'a tooth with a sparkle', 'a shoulder with a bag strap', 'a stomach with hands on it', 'a knee with a bandage']],
    [130, 'rooms', 'Rooms and furniture', ['a sofa with two cushions', 'a wooden chair', 'a round dining table', 'a floor lamp', 'a bookshelf with blank spines', 'a wall mirror', 'a woven rug', 'a bathroom sink with a tap', 'a balcony with plants', 'a staircase with a railing']],
    [131, 'kitchen', 'Kitchen items', ['a fork', 'a knife', 'a spoon', 'a plate', 'a bowl', 'a cooking pot with a lid', 'a frying pan', 'a kettle', 'an open fridge', 'an oven with a tray']],
    [132, 'clothing', 'Clothing', ['a T-shirt', 'a pair of trousers', 'a dress', 'a pair of sneakers', 'a pair of sandals', 'a sun hat', 'a winter coat', 'a scarf', 'a pair of socks', 'a pair of glasses']],
    [133, 'travel', 'Travel objects', ['a boarding pass with no markings', 'a folded paper map', 'a bus', 'a train', 'a car', 'a ship at sea', 'a petrol pump', 'a bridge over a river', 'a tent', 'a camera']],
    [134, 'animals', 'Animals', ['a cow', 'a sheep', 'a goat', 'a donkey', 'a lion', 'a bear', 'a rabbit', 'a mouse', 'a butterfly', 'a hen with chicks']],
    [135, 'nature', 'Nature', ['a crescent moon with a star', 'a fluffy cloud', 'a rainbow over hills', 'a flower field', 'a desert dune', 'a mountain peak', 'a flowing river', 'a waterfall', 'a lake with reeds', 'a single green leaf']],
    [136, 'school', 'School and office', ['a desk', 'a stack of books', 'a pair of scissors', 'a ruler', 'a school backpack', 'a laptop', 'a printer', 'a classroom whiteboard, blank', 'an eraser and pencil', 'a stapler']],
    [137, 'city', 'City places', ['a hospital building with a cross', 'a school building with a flag', 'a synagogue building with arched windows', 'a park bench under a tree', 'a town square fountain', 'a shopping mall front', 'a bank building', 'a street post box', 'a library with tall windows', 'a stadium']],
  ].map(([number, topic, title, items]) => ({ number, set: `next_obj_${topic}`, title: `Object illustrations: ${title}`, prefix: 'OBJ', size: SQUARE, cast: 'none', frame: 'one centred object illustration for a vocabulary card (no people, no background clutter)', parts: [{ topic, items }] })),

  { number: 138, set: 'next_trd_congregations', title: 'Traditions explorer', prefix: 'TRD', size: WIDE, cast: 'mixed', frame: 'a congregation or custom scene for the traditions explorer',
    parts: [{ topic: 'congregations', items: [
      'an Ashkenazi synagogue interior with a raised central bimah and wooden pews',
      'a Sephardi synagogue with a central bimah, benches facing each other and patterned tiles',
      'a Yemenite-style prayer room with worshippers seated on carpets and cushions',
      'a Kabbalat Shabbat gathering on a Tel Aviv beach at sunset with a guitar',
      'a Reform sanctuary with mixed seating, a guitar and a choir',
      'a Chabad house with a long table of friends and plates of food',
      'a Masorti congregation with a woman and a man sharing the aliyah at the bimah',
      'an Italian-rite synagogue with a pair of facing pulpits and ornate stucco',
      'a Sephardi cylindrical Torah case and an Ashkenazi mantled scroll side by side',
      'B|Ari and Noa comparing two prayer books with blank covers while two friends look on',
      'a young Israeli crowd dancing to welcome Shabbat on a rooftop'] }] },
  { number: 139, set: 'next_awd_badges_belts', title: 'Achievement badges and belts', prefix: 'AWD', size: SQUARE, cast: 'none', frame: 'a round enamel-pin style badge or a coiled cloth belt on a cream field, same ring and ribbon family as the level badges',
    parts: [
      { topic: 'badge', items: [
        'a streak badge: one match with a tiny spark',
        'a streak badge: a small steady flame',
        'a streak badge: a bright torch',
        'a streak badge: a roaring bonfire',
        'a perfect-quiz badge: a gold star on a shield',
        'a prayer-mastered badge: an open scroll with a gold ribbon, blank'] },
      { topic: 'belt', items: [
        'a coiled cream cloth belt with a plain knot',
        'a coiled gold cloth belt with a plain knot',
        'a coiled olive-green cloth belt with a plain knot',
        'a coiled deep-blue cloth belt with a plain knot',
        'a coiled belt half pomegranate red and half charcoal with a gold knot'] }] },
  { number: 140, set: 'next_mas_dashboard', title: 'Progress dashboard mascot', prefix: 'MAS', size: SQUARE, cast: 'mascot', frame: 'the mascot in a pose for the progress dashboard',
    parts: [{ topic: 'rimon', items: [
      'waving hello with one arm',
      'curled up asleep on a small cushion',
      'cheering with both arms up and gold sparkles',
      'thinking with one hand on its chin and a lightbulb',
      'tired but smiling after a long climb',
      'reading a closed book with a blank cover',
      'climbing a staircase of stacked books',
      'holding a small trophy',
      'wearing big headphones and bobbing along',
      'running with a blank flag',
      'sitting on a closed book with a mug of tea'] }] },
  { number: 141, set: 'next_doo_workbook', title: 'Workbook notebook doodles', prefix: 'DOO', size: PORTRAIT, cast: 'none', frame: 'a notebook-style workbook page, portrait, with hand-drawn doodle decoration and large blank areas left for later typesetting',
    parts: [{ topic: 'workbook', items: [
      'a blank lined page with a border of pomegranates and olive branches',
      'a blank squared page with a star doodle in one corner',
      'a blank page with a winding vine down the left margin',
      'a sticker sheet of ten small round doodles: star, heart, flame, book, cup, sun, key, leaf, candle, drum',
      'a blank tracing page with faint dotted guide rows and a pencil resting at the bottom',
      'a page with five colourful tab dividers down the right edge',
      'a flat lay of a pencil, an eraser and a sharpener on a blank page',
      'a blank page with a coffee ring and a small doodle of a cup beside it',
      'a blank page with strips of patterned washi tape across the top corners',
      'a blank page with a curled bottom corner and a sticky note, blank'] }] },

  // Block H extension: commands 142-149 (81 more new images)
  { number: 142, set: 'next_str_train', title: 'Street Hebrew: the train', prefix: 'STR', size: WIDE, cast: 'mixed', frame: 'an everyday Israel train-journey scene (all signs and screens stay blank)',
    parts: [{ topic: 'train', items: [
      'A|Ari tapping a blank card on a reader at a station gate',
      'a platform with a blank departures board and commuters waiting beside a yellow line',
      'N|Noa stepping onto a double-decker train carriage with a rucksack',
      'B|Ari and Noa finding two seats facing each other by the window',
      'a conductor walking down the aisle checking cards with a handheld reader',
      'a soldier asleep with a duffel bag on the luggage rack above',
      'A|Ari offering his seat to an older woman with a shopping trolley',
      'a window view of orange groves and a coastline rushing by',
      'N|Noa asking a passenger a question and pointing down the carriage',
      'a crowded platform at the end of the line, people streaming toward an exit'] }] },
  { number: 143, set: 'next_str_beach_kibbutz', title: 'Street Hebrew: beach and kibbutz', prefix: 'STR', size: WIDE, cast: 'mixed', frame: 'an everyday Israel leisure scene (all signs stay blank)',
    parts: [{ topic: 'beach', items: [
      'a Mediterranean beach with umbrellas, a lifeguard tower and swimmers',
      'B|Ari and Noa playing paddle-ball on the sand',
      'a vendor with a cool box walking along the beach with an ice-lolly',
      'A|Ari buying a cold drink from a beach kiosk, coins in his hand',
      'N|Noa reading under an umbrella while waves roll in',
      'a family building a sandcastle with a flag made of a blank scrap',
      'a communal kibbutz dining hall at lunchtime with long tables and trays',
      'a kibbutz lawn with children running between low houses and a water tower',
      'B|Ari and Noa carrying trays to a table in the kibbutz dining hall',
      'a kibbutz cowshed at dawn with a worker feeding the animals'] }] },
  { number: 144, set: 'next_str_haggle', title: 'Street Hebrew: haggling in the shuk', prefix: 'STR', size: WIDE, cast: 'mixed', frame: 'a market haggling scene (price tags are blank, no signs)',
    parts: [{ topic: 'haggle', items: [
      'A|Ari picking up a ceramic bowl and raising his eyebrows at the seller',
      'a seller holding up fingers to show a price while smiling broadly',
      'N|Noa shaking her head with a polite smile and a hand raised, saying no thanks',
      'B|Ari and Noa walking away from a stall while the seller calls after them with a friendly gesture',
      'a seller adding an extra handful of dates into a bag as a bonus',
      'a scale balancing a pile of tomatoes against brass weights',
      'A|Ari counting coins into a seller\'s open hand',
      'a spice stall with open sacks of coloured powders and a scoop',
      'N|Noa tasting a free sample of halva from a toothpick',
      'a crowded alley between stalls with hanging scarves and baskets overhead'] }] },
  { number: 145, set: 'next_lcy_reform_moments', title: 'Reform life-cycle moments', prefix: 'LCY', size: WIDE, cast: 'mixed', frame: 'a joyful Reform Jewish life-cycle moment (all pages and certificates stay blank)',
    parts: [{ topic: 'lifecycle', items: [
      'a baby naming at the bimah with proud parents holding the baby and a rabbi smiling',
      'a bat mitzvah girl chanting at the bimah with a silver pointer and family watching',
      'a bar mitzvah boy being lifted on a chair while family dances around him',
      'a wedding chuppah with a couple under the canopy and a rabbi holding a wine cup',
      'a groom stamping on a wrapped glass while guests cheer',
      'a wedding circle dance with the couple lifted on chairs',
      'a confirmation class of teenagers on the bimah holding flowers',
      'a family blessing a toddler on the first day of religious school',
      'A|Ari handing a rolled blank certificate to a smiling student',
      'N|Noa lighting a candle at an anniversary celebration surrounded by family'] }] },
  { number: 146, set: 'next_cls_classroom', title: 'Classroom and learning scenes', prefix: 'CLS', size: WIDE, cast: 'mixed', frame: 'a Hebrew-learning classroom or study moment (boards, books and screens stay blank)',
    parts: [{ topic: 'classroom', items: [
      'A|Ari at a desk tracing in the air with one finger, tongue between his teeth in concentration',
      'N|Noa holding up a blank flashcard to a small group of students',
      'B|Ari and Noa working as study partners over one open blank workbook',
      'a teacher pointing to a blank whiteboard while students raise hands',
      'a student reading aloud with a classmate listening with hands cupped to an ear',
      'A|Ari with Rimon the small round pomegranate-red sprite with a gold crown calyx and olive leaf ears sitting on his desk, both looking at a blank flashcard',
      'N|Noa high-fiving Rimon the small round pomegranate-red sprite with a gold crown calyx and olive leaf ears after finishing a page',
      'B|Ari and Noa laughing as Rimon the small round pomegranate-red sprite with a gold crown calyx and olive leaf ears hides behind a stack of books',
      'a quiet evening study corner with a lamp, mug and open blank notebook',
      'students holding up small whiteboards in a circle during a game'] }] },
  { number: 147, set: 'next_obj_garden', title: 'Object illustrations: Garden and outdoors', prefix: 'OBJ', size: SQUARE, cast: 'none', frame: 'one centred object illustration for a vocabulary card (no people, no background clutter)',
    parts: [{ topic: 'garden', items: ['a watering can', 'a garden spade', 'a wheelbarrow', 'a flower pot with a seedling', 'a tall sunflower', 'a beehive with a bee', 'a ladder leaning on a tree', 'a garden hose coiled', 'an olive tree', 'a swing hanging from a branch'] }] },
  { number: 148, set: 'next_mth_vowels', title: 'Mouth and articulation panels', prefix: 'MTH', size: SQUARE, cast: 'none', frame: 'a clean side-view cartoon cross-section of a head showing lips, teeth, tongue and throat, with a soft arrow-free highlight on the active part (no arrows, no labels)',
    parts: [{ topic: 'mouth', items: [
      'lips wide open and the tongue low and flat, for an open vowel',
      'lips rounded into a small circle with the tongue pulled back and raised',
      'lips spread in a smile with the tongue high and forward',
      'lips relaxed and slightly open with the tongue in the middle',
      'lips rounded and slightly open with the tongue mid-back',
      'the tongue tip touching the ridge behind the upper teeth',
      'the back of the tongue lifted to touch the soft palate',
      'lips pressed together while air builds behind them',
      'the tongue tip between the teeth with a gentle breath of air',
      'the throat narrowed with the tongue root pulled back, a gentle rasp of air'] }] },
  { number: 149, set: 'next_awd_pins_extra', title: 'Extra achievement pins', prefix: 'AWD', size: SQUARE, cast: 'none', frame: 'a round enamel-pin style badge on a cream field, same ring and ribbon family as the level badges, with a simple icon only',
    parts: [{ topic: 'pin', items: [
      'a first-lesson badge: a small green sprout',
      'a week-complete badge: seven small gold dots in a ring',
      'a vowel-master badge: a row of five rounded gold dots',
      'a reading-fluency badge: an open book with a gold bookmark, blank pages',
      'a listening badge: a pair of headphones with sound ripples',
      'a speaking badge: a speech bubble, blank, with a gold star',
      'a holiday-explorer badge: a gold candle and a small leaf',
      'a Shabbat-keeper badge: two candles with a loaf',
      'a market-ready badge: a basket of fruit',
      'a comeback badge: a flame rising from a small pot',
      'a grand-finish badge: a laurel wreath around a gold pomegranate'] }] },
];

const pad = (n) => String(n).padStart(2, '0');
const ref = (c) => ({ A: 'CHAR_ari_sheet.png', N: 'CHAR_noa_sheet.png' }[c]);

export function buildNext() {
  const groups = [];
  for (const C of COMMANDS) {
    const rows = [];
    const lines = [];
    for (const part of C.parts) {
      part.items.forEach((raw, k) => {
        const m = /^([ANB])\|(.*)$/.exec(raw);
        const who = m ? m[1] : null;
        const desc = m ? m[2] : raw;
        const file = `${C.prefix}_${part.topic}_${pad(k + 1)}.png`;
        const refs = who === 'B' ? [ref('A'), ref('N')] : who ? [ref(who)] : C.cast === 'mascot' ? ['MAS_rimon_01.png'].filter(() => k > 0) : [];
        const cast = who === 'A' ? ARI : who === 'N' ? NOA : who === 'B' ? `${ARI} ${NOA}` : C.cast === 'mascot' ? MASCOT : '';
        const shape = C.size === WIDE ? 'Wide 1792x1024 scene' : C.size === PORTRAIT ? 'Portrait 1024x1280 page' : 'Square 1024x1024 image';
        const crowd = C.cast === 'none' || C.cast === 'mascot' ? '' : ' Any other people are simple small figures with plain friendly faces.';
        const match = refs.length ? ' Match the attached character sheet(s) exactly.' : '';
        const prompt = `${STYLE_GUIDE} ${cast ? cast + ' ' : ''}${shape}: ${desc}.${crowd}${match} ${BLANK_RULE} ${NO_TEXT}`.replace(/\s+/g, ' ');
        rows.push({ file, set: C.set, command: C.number, block: 'H', width: C.size[0], height: C.size[1], status: 'pending', prompt, refs });
        lines.push(`${lines.length + 1} ${desc}`);
      });
    }
    const first = rows[0].file, last = rows[rows.length - 1].file;
    const prompt = `Make ${rows.length} images in STYLE GUIDE v1 (${C.size[0]}x${C.size[1]}), ${C.frame}: ${lines.join('; ')}. ` +
      `${NO_TEXT} ${BLANK_RULE} Files ${first} ... ${last} (exact names in the list).`;
    groups.push({ number: C.number, block: 'H', set: C.set, title: C.title, template: 'literal', variables: {}, prompt, inputs: [...new Set(rows.flatMap((r) => r.refs))], textOutputs: [], rows, expectedFiles: rows.map((r) => r.file) });
  }
  return groups;
}
