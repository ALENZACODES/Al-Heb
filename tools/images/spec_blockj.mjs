// Block J spec: the 1000 further images (commands 301+). Pure data + selection rules; build_blockj.mjs renders it.
// Sources (all read-only): data/vocab/themes/*.json, data/vocab/deck-order.json, data/curriculum/intermediate-index.json,
// data/letters/letters.json, vowel set names in data/images/manifest.csv.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const J = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
export const TOTAL = 1000;
export const PER_PACK = 12;

// ---------- English head of a gloss ----------
export function head(en) {
  return String(en || '').replace(/\(.*?\)/g, '').split(/[,;/]/)[0].trim().toLowerCase().replace(/^(to|a|an|the)\s+/, '').trim();
}

// ---------- concreteness lists ----------
const W = (s) => new Set(s.trim().split(/\s+/));
const W2 = (s) => new Set(s.split(',').map((x) => x.trim()).filter(Boolean));
export const ACTION_VERBS = W(`wound pluck sprout spray prune engrave slumber carve drown plow smoke slice exhale drag bite scream float glide row scrape braid knit roast chew grind polish hop bark whip wrestle bleed bleat sniff bind inhale stab tremble scatter hatch sigh march saddle tear wipe shake pierce strike crush blossom soar sweat twist steam undress faint leak wring suck mix crash sink heat extinguish illuminate weld sift launch hover mourn pave plaster glue nail rake bore yawn sneeze eat drink sleep walk run sit stand jump swim climb fly fall push pull throw catch carry lift open close wash cook bake cut write read sing dance laugh smile cry hug kiss kick hit knock wave point look see watch listen hear smell touch taste sew weave knead pour fill empty dig plant build paint draw ride drive sail dive pray bow bless kneel hold grab hide bury wake sweep clean shave comb dress wear pack hang spin boil melt freeze burn shine blow bounce drop slip spill stretch rub lick swallow whistle shout whisper call phone photograph record print load press pay buy sell give take bring send teach learn study ask answer count weigh tie connect split break smash shatter explode lean bend turn spread gather herd lead follow chase wander travel arrive leave enter ascend rise lie wait hurry stop start finish win play hunt fish milk harvest feed rest stare wink nod clap tap crawl stomp punch hoist tilt dial cross wrap fold`);
export const EMOTION = W2('be happy,be angry,be afraid,laugh,smile,cry,worry,dream,wonder,feel embarrassed,be sorry,calm down,miss,be amazed,be ashamed,be frightened,giggle,be miserable,wake up,imagine,think,hug');
export const QUALITY = W('big small tall short long wide narrow thin thick heavy light hot cold warm cool fast slow old new young empty full wet dry dark bright clean dirty sweet sour bitter soft hard loud quiet open closed high low deep shallow far straight round sharp rich poor strong weak happy sad hungry sick healthy beautiful ugly broken red blue green yellow white black brown purple pink orange gray');
export const COLORS = W('red blue green yellow white black brown purple pink orange gray');
export const PREP = W('on under in between behind near up down inside outside beside around through across over above below');
export const COUNTS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twenty: 20 };
export const TIMES = {
  morning: 'a sunrise over rooftops with a rooster standing in the foreground',
  evening: 'a dusk sky over a quiet street with the first lamps lit in windows',
  night: 'a deep blue night sky with a crescent moon and stars over sleeping houses',
  noon: 'a bright sun directly overhead with very short shadows under a tree',
  summer: 'a hot bright sun, a beach umbrella and a slice of watermelon on sand',
  winter: 'rain clouds over a window with a warm scarf and a mug of tea steaming beside it',
  autumn: 'orange and gold leaves falling onto an empty park path',
  week: 'seven identical cups in one neat row',
  month: 'four phases of the moon drawn in a row from thin crescent to full circle',
  hour: 'a plain hourglass with sand running through',
  minute: 'a small egg timer shaped like an egg with a plain dial',
  half: 'an apple cut cleanly into two equal halves',
  quarter: 'a round pie with exactly one quarter slice pulled away',
};
export const CONCRETE = new Set(`parchment spire runner defender photographer throat pin peel wool coal vein cuff blazer goblet mug steak sauce pumpkin yogurt cardamom maize chickpeas sushi mango fountain bathroom kitchen fruit snack torch couch notebook barrel crate cage buffet armchair refrigerator anvil balance necktie balcony vault moustache scales sapphire thunder hazel cypress tyre villa platform dwarf cocktail alley ditch rubber brick cigar hyssop microphone cube millstone hail bat squirrel kitten penguin orchestra grove beehive spark powder ink sieve torso chin grasshopper jet gorilla lipstick thumb armpit coconut dessert vanilla berry balsam iceberg papyrus seagull buffalo piglet cobra raccoon clam bagel cardboard headphone stretcher fossil cockroach ankle lightning diary hall lantern screw oak coriander glasses whiskey vinegar shower carriage beaver crescent satellite raven ash glider bedsheet scythe clown shepherd accountant waitress bartender babysitter magician twin clerk ferry library ambulance tourist limousine granary dagger folder stack ventilator weight spool hinge axle detective skull trunk ostrich football metal hamburger cigarette wig zebra insect frost fog storm cliff thermometer seedling vegetable flax laurel herb steppe pole pulpit necktie platform dwarf hamburger tent sack soldier queen king horseman gong drum diamond harp basketball piano guitar violin camera song ball bell flute trumpet tennis golf medal crown throne knee heel lung hip thigh neck diadem muscle heart blood nose ear eye mouth tooth tongue finger hand foot arm leg head face hair beard shoulder skin belly stomach bone brain forehead eyelid eyelash biceps forearm tendon rib nail elbow wrist chest lip shoe coat pants hat belt sash glove sock sweater shirt dress skirt scarf jacket boot sandal ring bracelet necklace umbrella button pocket collar sleeve robe underwear helmet bag purse milk fish olive bread cake cookie juice apple orange banana grape fig date pomegranate lemon pear peach melon watermelon cherry strawberry tomato cucumber carrot onion garlic potato pepper cheese butter egg honey wine beer tea coffee soup salad rice pasta meat chicken sandwich pizza chocolate ice cream candy sugar salt oil flour wheat barley corn bean pea lentil nut almond walnut peanut cabbage lettuce mushroom pickle noodle stew toast waffle challah matzo spaghetti pie jam jar bottle cup glass plate bowl spoon fork knife pot pan kettle tray bucket basket door window roof wall floor ceiling stairs staircase chimney gate fence bridge tower castle house hut tent barn farm fortress stadium cinema museum school hospital church mosque synagogue shop store market restaurant bakery hotel bus train car taxi truck bicycle motorcycle ship boat plane airplane helicopter rocket spacecraft tractor wheel engine road street path trail bed chair table sofa desk shelf cupboard drawer lamp candle clock mirror curtain carpet rug pillow blanket cushion towel soap brush comb key lock rope chain broom ladder shovel hammer saw axe scissors needle thread bathtub toilet sink oven stove fridge television radio telephone phone computer laptop keyboard battery tree leaf flower grass bush branch root forest wood jungle desert mountain hill valley cave river stream lake sea ocean beach island rock stone sand mud snow rain cloud sun moon sky rainbow wind fire flame smoke volcano field garden vineyard orchard cedar pine reed thorn vine cactus rose lily jasmine mustard dog cat horse cow sheep goat pig donkey mule camel lion tiger bear wolf fox deer rabbit rat monkey elephant giraffe turtle snake lizard frog bird eagle hawk owl dove pigeon rooster duck goose swan whale shark dolphin crab bee ant spider fly butterfly worm scorpion wasp beetle calf lamb ram ibex vulture dinosaur baby girl boy man woman bride bridegroom grandfather grandmother father mother brother sister uncle aunt daughter son teacher student professor doctor nurse pilot farmer chef baker butcher fisherman policeman judge archer thief guest sailor seaman prince princess ambassador newscaster artist musician singer dancer book newspaper magazine paper pen pencil envelope stamp map dictionary album scroll chalk briefcase backpack sword spear shield arrow bomb gun pistol cannon flag statue pearl ruby gold silver copper iron steel coin banknote doorway wreath grain womb seat dew bolt waterskin goatskin fleece wax bead bubble claw bandage maze avalanche pigtail ponytail glue medicine pill antibiotics aspirin thermometer laser robot sensor planet globe telescope microscope magnet firework balloon kite toy doll puppet gift present ribbon mask costume parade festival sukkah menorah shofar altar skeleton wing feather beak tail horn fur shell nest web mouse screen star palm bank tablet back card`.split(/\s+/));
export const isConcrete = (h) => CONCRETE.has(h) || (h.includes(' ') && CONCRETE.has(h.split(' ').pop()) && !/^(temple|high|news|wood|drug|loved|night|calendar)/.test(h));
// (legacy deny list, no longer used for nouns)
// Nouns that are abstract, archaic, offensive, unclear without Hebrew, or not drawable as one object.
export const DENY = W2(`gateway,plot,absorb,pioneer,scale,playing,league,pipe,agora,photograph,growing,flesh,cane,assume,palate,submit,blindfold,giant,tyrian purple,biblical blue,sale,felt,color,penny,vest,manna,charm,chi,millennium,maidservant,bovine,alien,might,delay,landmark,gratitude,majesty,mourning,pedestal,fleet,pond,ephah,mixture,here,understanding,base,pharaoh,philistine,dollar,yard,accuracy,silversmith,beauty,lack,drug,fool,tip,cairn,plague,error,kodashim,armory,women,arms,secret,target,odor,vow,kahen,accident,female servant,midst,nail polish,birth,lot,spell,pregnancy,hunter,widower,priestly breastplate,complex,emergency,suspect,monster,moth,gathering,mound,robbery,code,metre,finding,chaldean,netherworld,craft,zest,serif,aptitude,interview,virgin,kilometre,fertilizer,rumor,foreigner,laughter,lick,hunt,trap,flock,ruin,revenge,firstborn,challenge,lane,pyre,council,tempo,sherry,schmuck,curse,envy,excuse,darling,scene,supply,slip,peril,cover,institute,tenant,lowland,something ruled,band,lump,trauma,incident,cripple,novel,fury,summit,merchandise,zombie,changing,prey,sinner,paperwork,filth,caravan,tenant farmer,fighting,welfare,protest,drama,combatant,infant,duke,outfit,hit,anxiety,craving,comparison,bundle,competencies,liberty,loser,stake,inside,visit,magic,legacy,fly,mud,crossing,nucleus,progeny,hashish,reward,someone lazy,talisman,lycium,cartel,legend,shaft,beep,center,shard,supplier,marine,diet,saving,woof,chutzpah,summary,complaint,guarantee,stub,molt,presidency,cardinal,drug addict,phenomenon,seah,beta,delta,wreck,heartburn,cutting,hymen,terrorist attack,flash,gallery,brawl,defect,tequila,bite,hobby,captive,assassination attempt,scandal,bitumen,smoking,gleaning,tens,watchmaker,accessory,juniper,timing,hiding place,fit,founder,standard,minimum,bribe,schwa,byssus,killing,testicle,tributary,female leopard,oath,habitus,tzadekes,opposite,eavesdropping,hypocrite,shaking,mesembryanthemum,conspiracy,update,twilight,fling,spasm,nikud,spittle,monitoring,bulbul,affront,drop,core,container,money box,image,generic pot,chapter,small bag,shot glass,program,homer,justice,gear,tour,sending,astrological sign,chelev,holiday,temple prostitute,public servant,splendor,receipt,psalm,covenant,levite,praise,mercy,grade,hebrew,letter x,speaker,survey,concept,ego,unit,arithmetic,set,source,taste,path,energy,surroundings,threshold,high school,crew,military,warfare,corps,major general,captain,aimer,horn,poor,general,decree,commissioned officer,colonel,signaller,payee,credit,troop,platoon,statute,tax,villain,datum,background,contents,wizard,assault,wood shaving,net,news report,riverbed,breach,software,memory,deputy,loved one,high five,men,decade,ten thousand,walker,poo,fucker,night foodstuff,calendar date,front,hang out,point at,old person,agent,idiot,mistress,female prostitute,young woman,pair,jew,egyptian,painted,babies,boss,turn,well,fine flower,female goat,jackass,boxwood,strait,sinner,gentile,guy,jewish priest,mikveh,estate,detail,nonsense,client,partner,inhabitant,president,dear,offering,heave offering,ritual sacrifice,labdanum,gene,miracle,dream,joke,list,marriage,breast,cistern,crowbar,yoke,handgun,rage,hunger,hero,card,limb,board,cell,range,mount,club,parent,bomb,vapour,sentence,`);
export const VERB_DENY = W2('wound,peel,hatch,bore,sprout,sweat,plaster,illuminate,strike,mix,tilt,tear,pack,hang,taste,extinguish,connect,spread,drop,bind,sift,steam,hover');
export const EXTRA_DENY = W2('gay man,wise man,color gold,reality television,shining fire,torrential rain,pin,spire,defender,peel,wool,hall,platform,almond,balance,ink,powder,base');
// Heads that need a clearer sense than the bare English word.
export const SENSE = {
  bank: 'a bank building with columns and a heavy front door (a place for money)', park: 'a city park with a lawn, a tree and a bench', palm: 'an open human palm held up flat, hand only', date: 'a single date fruit', crown: 'a plain royal crown', mouse: 'a computer mouse', screen: 'a computer screen showing a blank colour field', star: 'a five-pointed star in a night sky', file: 'a paper file folder', record: 'a vinyl record on a turntable', bat: 'a bat hanging upside down', nail: 'a single iron nail', pen: 'a single ballpoint pen', watch: 'a wristwatch with a blank dial', glass: 'a drinking glass of water', light: 'a lit light bulb', bar: 'a chocolate bar', mail: 'a stack of blank envelopes', stream: 'a small stream running over rocks', rock: 'a large grey rock', club: 'a wooden club', stick: 'a straight wooden stick', cup: 'a ceramic cup', plant: 'a potted plant', chip: 'a single potato chip', letter: 'a closed blank envelope', train: 'a passenger train', stamp: 'a postage stamp with a blank picture', tea: 'a cup of tea with steam', ship: 'a sailing ship at sea', bridge: 'a stone arch bridge over a river', port: 'a harbour with cranes and boats', capital: 'a city skyline with a domed building', car: 'a small family car', tablet: 'a computer tablet lying flat showing a blank colour field', back: 'the back of a clothed human torso, shoulders and spine area, no face', card: 'a plain playing card with one bold red shape and no marks', taxi: 'a plain taxi car with a blank roof light', 'foreign country': 'a globe',
};

// ---------- verb / quality prompts ----------
export function wordCore(h, pos) {
  if (SENSE[h]) return `A single clear picture of ${SENSE[h]}, centred, nothing else competing.`;
  if (COUNTS[h]) return `Exactly ${COUNTS[h]} identical pomegranates in a tidy arrangement on a plain surface, so the quantity is obvious at a glance.`;
  if (TIMES[h]) return `A calm scene that shows the idea "${h}": ${TIMES[h]}.`;
  if (COLORS.has(h)) return `One plain, bold object in a single saturated ${h} colour, centred, so the colour is the whole point.`;
  if (PREP.has(h)) return `A ball and a box arranged so the relation "${h}" is unmistakable, no people.`;
  if (pos === 'adj' || QUALITY.has(h)) return `Two plain objects that make the quality "${h}" obvious at a glance (one clearly ${h}, one clearly the opposite), no people.`;
  if (pos === 'verb') {
    if (EMOTION.has(h)) return `A generic stylised figure showing the feeling or action "${h}" through posture and a very simple abstract face with no individual features.`;
    return `A generic stylised figure, seen from behind or from a distance with no individual face, clearly performing the action "${h}" in an everyday setting.`;
  }
  return `A single ${h}, drawn as one clear, instantly recognisable object centred on the plain background, nothing else competing.`;
}
export const wordKind = (h, pos) => (pos === 'verb' ? 'word-action' : (pos === 'adj' || QUALITY.has(h) || PREP.has(h) || COLORS.has(h)) ? 'word-quality' : (COUNTS[h] || TIMES[h]) ? 'word-concept' : 'word-object');

// ---------- (a) theme packs ----------
const SPECIAL_PACK = /^(describing-words|small-words|time-numbers)/;
function packCandidates(theme, usedHeads) {
  const out = [];
  for (const w of theme.words) {
    const h = head(w.en);
    if (!h || !/^[a-z][a-z ]{1,24}$/.test(h) || h.split(' ').length > 2) continue;
    if (usedHeads.has(h)) continue;
    const r = w.frequencyRank ?? (w.corpusRank ? w.corpusRank + 3000 : 99999);
    let ok = false, pos = w.pos;
    if (SPECIAL_PACK.test(theme.id)) {
      if (['adj', 'adv', 'num', 'noun', 'prep'].includes(w.pos) || !w.pos) ok = QUALITY.has(h) || PREP.has(h) || COUNTS[h] || TIMES[h];
      if (COUNTS[h] || TIMES[h]) pos = 'noun'; else if (QUALITY.has(h)) pos = 'adj';
    } else if (w.pos === 'verb') ok = (ACTION_VERBS.has(h) || EMOTION.has(h)) && !VERB_DENY.has(h);
    else if (w.pos === 'noun') ok = isConcrete(h) && !DENY.has(h) && !EXTRA_DENY.has(h);
    if (ok) out.push({ id: w.id, he: w.he, h, pos, r });
  }
  const seen = new Set();
  return out.sort((a, b) => a.r - b.r || a.id.localeCompare(b.id)).filter((c) => (seen.has(c.h) ? false : seen.add(c.h)));
}
export function themePicks(usedIn = new Set()) {
  const idx = J('data/vocab/themes/index.json');
  const themes = idx.themes.map((t) => ({ id: t.id, words: J(`data/vocab/themes/${t.file}`).words }));
  const used = new Set(usedIn), picks = [], pools = [];
  for (const t of themes) {
    const c = packCandidates(t, used);
    const take = c.slice(0, PER_PACK);
    take.forEach((x) => used.add(x.h));
    pools.push({ id: t.id, rest: c.slice(PER_PACK) });
    picks.push(...take.map((x) => ({ ...x, pack: t.id })));
  }
  return { picks, pools, used, themes };
}

// ---------- (e) SRS cards from deck-order ----------
export function deckPicks(used, limit = 308) {
  const ids = new Set();
  const out = [];
  for (const e of J('data/vocab/deck-order.json').entries) {
    const h = head(e.en);
    if (!/^[a-z][a-z ]{1,24}$/.test(h) || h.split(' ').length > 2 || used.has(h) || ids.has(e.id)) continue;
    let ok = false, pos = e.partOfSpeech;
    if (pos === 'verb') ok = (ACTION_VERBS.has(h) || EMOTION.has(h)) && !VERB_DENY.has(h);
    else if (pos === 'noun') ok = isConcrete(h) && !DENY.has(h) && !EXTRA_DENY.has(h);
    else if (pos === 'adj') ok = QUALITY.has(h);
    if (!ok) continue;
    used.add(h);
    out.push({ id: e.id, he: e.he, h, pos, deckPos: e.pos });
    if (out.length >= limit) break;
  }
  return out;
}

// ---------- (b) festivals and Shabbat ----------
const F = (set, lesson, items) => items.map(([aspect, text]) => ({ set, lesson, aspect, text }));
export const FESTIVALS = [
  ...F('rosh-hashanah', 'I-50', [
    ['3:2', 'A family table set for the new year with round loaves, a bowl of apple slices beside a small jar of honey, and a pomegranate.'],
    ['1:1', 'A round challah loaf shaped like a crown, with a small bowl of honey beside it, on a plain cloth.'],
    ['1:1', 'A ram\'s-horn shofar resting on a folded cloth in warm light.'],
    ['3:2', 'A shofar being lifted to the lips of a figure seen from behind in a sunlit sanctuary, the congregation standing in rows.'],
    ['1:1', 'An apple cut in half beside a honey dipper dripping gold honey into a small dish.'],
    ['1:1', 'A whole pomegranate split open, seeds glowing red, on a wooden board.'],
    ['3:2', 'A river bank at dusk where a few generic figures seen from a distance shake out their pockets over the water.'],
    ['1:1', 'A fish head and a bunch of dates on a serving dish, festive and tidy.'],
    ['2:3', 'A tall honey jar with a wooden dipper beside a ripe apple and a pomegranate, still life.'],
    ['3:2', 'A synagogue courtyard in autumn light with families in good clothes walking in, seen from behind.'],
    ['1:1', 'A small sweet cake with a honey glaze beside a cup of tea.'],
  ]),
  ...F('yom-kippur', 'I-28', [
    ['3:2', 'A sanctuary dressed in white, the ark curtain and reading-table covers all plain white, no people.'],
    ['2:3', 'A tall memorial candle burning in a glass, a quiet corner of a synagogue behind it.'],
    ['3:2', 'Rows of worshippers in white garments seen from behind, standing in quiet prayer in a bright hall.'],
    ['1:1', 'A pair of plain canvas shoes set neatly side by side beside a doorway.'],
    ['1:1', 'A white prayer shawl folded on a bench with a plain closed prayer book.'],
    ['3:2', 'A shofar resting on the reading table at the close of the day, gold evening light through a high window.'],
    ['3:2', 'A family around a table breaking the fast with water, bread, fruit and a plate of simple cakes.'],
    ['1:1', 'A glass of water and a plain bread roll on a small plate, simple and quiet.'],
    ['3:2', 'A quiet city street at dusk with shops shuttered and an empty road, calm and still.'],
  ]),
  ...F('sukkot', 'I-30', [
    ['3:2', 'A small sukkah hut built of wood poles with a leafy branch roof, open to the sky, with a table inside set for a meal.'],
    ['1:1', 'A citron (etrog) resting in a small padded box next to a bundle of palm, myrtle and willow branches.'],
    ['1:1', 'A bundle of a palm frond, myrtle and willow tied together, held upright.'],
    ['2:3', 'A palm frond with bound myrtle and willow standing tall against a pale sky.'],
    ['3:2', 'Children\'s hand-made paper chains and plain paper fruit decorating the inside of a leafy hut.'],
    ['3:2', 'A balcony sukkah on a city rooftop with a view of apartment buildings, the roof of green branches letting stars through.'],
    ['1:1', 'A lemon-yellow citron with a bumpy skin and a small stem on a plain dish.'],
    ['3:2', 'Worshippers seen from behind walking in a slow circle round a reading table holding palm branches.'],
    ['1:1', 'A bunch of grapes and a pomegranate hanging from the leafy roof of a hut.'],
    ['3:2', 'A family seen from a distance eating dinner in a sukkah lit by lanterns at night.'],
    ['1:1', 'A stuffed cabbage roll and a bowl of soup on a plain table, harvest-festival food.'],
    ['3:2', 'A large Torah scroll with blank parchment being carried in a joyful dance by figures seen from behind, flags with plain colours waving.'],
  ]),
  ...F('hanukkah', 'I-32', [
    ['2:3', 'A nine-branch menorah with all eight lights and the helper candle burning, on a windowsill at night.'],
    ['1:1', 'A nine-branch Hanukkah menorah with three candles lit, plain and simple.'],
    ['3:2', 'A windowsill menorah glowing in a city window seen from the street at night, snow lightly falling.'],
    ['1:1', 'A spinning top (dreidel) with plain unmarked faces, caught mid-spin on a table.'],
    ['1:1', 'A pile of gold foil-wrapped chocolate coins spilling from a small cloth bag.'],
    ['3:2', 'A family around a table, a menorah in the middle, children seen from behind leaning forward to watch the light.'],
    ['1:1', 'A plate of golden fried potato pancakes with a bowl of apple sauce beside it.'],
    ['1:1', 'A round jelly doughnut dusted with sugar on a plate.'],
    ['3:2', 'A small clay oil lamp and a flask of olive oil on a stone shelf in a temple-like room.'],
    ['1:1', 'A single candle being lit from the helper candle, hands only.'],
    ['3:2', 'A row of menorahs in many shapes on a shelf, each lit, in a warm room.'],
    ['2:3', 'A stone arch doorway with a single lamp glowing within, ancient and quiet.'],
  ]),
  ...F('purim', 'I-31', [
    ['3:2', 'A table laden with triangle-shaped filled pastries, fruit, and bright paper masks, a festive feast.'],
    ['1:1', 'A three-cornered filled pastry cookie on a plate with a sprinkling of poppy seeds.'],
    ['1:1', 'A scroll of blank parchment, partly unrolled, tied with a ribbon, for the festival reading.'],
    ['1:1', 'A noisy wooden rattle (grogger) with a spinning body and a handle.'],
    ['3:2', 'A synagogue crowd seen from behind swinging rattles and cheering while a reader at the table reads aloud.'],
    ['1:1', 'A plain carnival mask with feathers, no face drawn on it, on a hook.'],
    ['3:2', 'Children in colourful costumes, a crown, a cape and a cardboard crown, seen from behind, lining up in a hallway.'],
    ['1:1', 'A gift basket of fruit, wine and sweets wrapped in cellophane with a bow.'],
    ['3:2', 'A street parade at noon with a floating flower-covered cart and cheering crowds seen at a distance, banners plain and blank.'],
    ['1:1', 'A little bag of coins being handed from one hand to another, a gift for the poor.'],
    ['2:3', 'A queen\'s crown on a velvet cushion beside a long royal staff.'],
  ]),
  ...F('pesach', 'I-29', [
    ['3:2', 'A set seder table with wine cups, a stack of three matzot under a cloth, and a large decorated plate in the centre.'],
    ['1:1', 'A seder plate with six small round places holding a shank bone, an egg, bitter herbs, charoset, greens and a second bitter herb.'],
    ['1:1', 'A stack of three flat square matzot wrapped in a plain cloth.'],
    ['1:1', 'A single square matzah with the dotted perforations, on a plain plate.'],
    ['1:1', 'A cup of red wine at a table, the Cup of Elijah, filled to the brim, with a small door ajar behind it.'],
    ['3:2', 'A family seen from behind reclining on cushions at a long table, wine cups raised.'],
    ['1:1', 'A small bowl of dark brown fruit-and-nut paste (charoset) with an apple slice beside it.'],
    ['1:1', 'A sprig of fresh parsley and a bowl of salt water on a small tray.'],
    ['1:1', 'A horseradish root and a head of romaine lettuce side by side.'],
    ['3:2', 'A kitchen scene with a long table covered in boxes being packed and cleaned for the holiday, a hand with a feather and a wooden spoon.'],
    ['3:2', 'A desert landscape with a path through parted water walls, generic figures seen from far behind.'],
    ['1:1', 'A child\'s hand hiding a piece of matzah under a pillow, the afikoman.'],
    ['2:3', 'A tall wine bottle beside two stemmed cups, and a pile of fresh green herbs.'],
    ['3:2', 'A bright spring window with lamb-shaped cookies and flowers on the sill, the season of freedom.'],
  ]),
  ...F('shavuot', 'I-50', [
    ['3:2', 'A table of cheesecake, blintzes and fruit in a sunlit kitchen, dairy festival food.'],
    ['1:1', 'A slice of cheesecake on a plate with a few strawberries.'],
    ['1:1', 'A basket of first fruits: grapes, figs, pomegranates, dates, olives and wheat.'],
    ['3:2', 'A mountain at sunrise with a soft cloud on its peak, a path winding up the side.'],
    ['1:1', 'A wreath of green leaves and flowers woven for the holiday.'],
    ['3:2', 'A synagogue hall filled with greenery and flowers, pots and branches around the reading table.'],
    ['3:2', 'A wheat field at golden hour with a few generic harvesters in the far distance.'],
    ['1:1', 'Two tablets of plain blank stone, leaning against each other.'],
  ]),
  ...F('tu-bishvat', 'I-50', [
    ['3:2', 'A table of dried fruit, nuts, figs, dates, almonds and carob in bowls, the festival of the trees.'],
    ['1:1', 'A bowl of dried figs and dates on a wooden table.'],
    ['1:1', 'A young sapling in a small pot, held by a pair of hands.'],
    ['3:2', 'A group of children seen from behind planting a tree on a hillside with small spades.'],
    ['2:3', 'A blossoming almond tree against a pale spring sky.'],
    ['1:1', 'A carob pod and a handful of almonds in a small dish.'],
    ['3:2', 'An orchard of olive and fig trees in rows on a green hill in late winter.'],
  ]),
  ...F('shabbat-table', 'I-35', [
    ['3:2', 'A Shabbat dinner table with two braided challah loaves under an embroidered cloth, a wine cup and two candlesticks.'],
    ['1:1', 'Two braided challah loaves under an embroidered cover, a knife beside them.'],
    ['2:3', 'Two tall candlesticks with lit candles, a soft glow, a hand-woven cloth below.'],
    ['1:1', 'A silver kiddush cup filled with red wine on a small saucer.'],
    ['3:2', 'A family seen from behind around a table, the father lifting a cup for the blessing, children waiting.'],
    ['1:1', 'A bowl of chicken soup with a few noodles and a spoon.'],
    ['1:1', 'A hand-washing cup with two handles beside a basin.'],
    ['3:2', 'A kitchen on Friday afternoon, pots steaming, braided dough on a tray, a warm bustle, no one in focus.'],
    ['1:1', 'A hand passing a lit match to a candle wick, hands only.'],
    ['3:2', 'A guest at the doorway holding a bouquet of flowers and a bottle of grape juice, seen from behind, the table visible inside.'],
    ['3:2', 'A Shabbat lunch table with a pot of slow-cooked stew, a salad of chopped vegetables and a basket of bread.'],
    ['1:1', 'A plate of fish balls beside a bowl of salad and pickled vegetables.'],
    ['3:2', 'A quiet afternoon in a living room: a book on an armchair, a sleeping cat in the sun and a tea glass.'],
    ['1:1', 'A salt shaker and a round bread knife beside a plain bread board.'],
  ]),
  ...F('havdalah', 'I-06', [
    ['2:3', 'A tall braided Havdalah candle with several wicks burning, held in a hand.'],
    ['1:1', 'A small spice box shaped like a tower, with clove-studded oranges beside it.'],
    ['3:2', 'A family seen from behind in a dim room around a braided candle, the youngest holding it up, wine cup on the table.'],
    ['1:1', 'A cup of wine overflowing slightly onto a saucer.'],
    ['1:1', 'A braided candle being dipped into a spilled puddle of wine on a saucer, extinguished.'],
    ['3:2', 'The first stars appearing in a deep blue sky above a row of rooftops.'],
    ['1:1', 'Cloves, cinnamon sticks and myrtle sprigs in a small silver dish.'],
    ['3:2', 'A balcony at dusk with a family seen from behind watching the first three stars, a lit candle on the rail.'],
  ]),
  ...F('synagogue-interior', 'I-03', [
    ['3:2', 'A synagogue sanctuary seen from the back: rows of wooden benches, a raised reading table and an ark with a plain curtain.'],
    ['3:2', 'The holy ark with a plain curtain drawn open to show three scrolls in blank mantles.'],
    ['1:1', 'A Torah scroll in a velvet mantle with a silver breastplate and pointer, all plain and unmarked.'],
    ['1:1', 'A silver pointer hand (yad) resting on blank parchment.'],
    ['2:3', 'A hanging eternal lamp glowing above an ark, tall and narrow view.'],
    ['3:2', 'The women\'s section balcony of a sanctuary with a carved wooden railing, empty, light through windows.'],
    ['1:1', 'A prayer shawl with plain striped borders folded over a bench, tassels visible.'],
    ['1:1', 'A pair of tefillin: two small black boxes with long straps coiled on a table.'],
    ['3:2', 'A synagogue entrance hall with a hand-washing basin, coat hooks and a plain notice board, entirely blank.'],
    ['3:2', 'A small neighbourhood synagogue in the morning, a few figures seen from behind, early light through arched windows.'],
    ['1:1', 'A carved wooden reading stand holding a closed prayer book with no title.'],
    ['3:2', 'A synagogue seen from the street outside: a modest stone building with a round window and arched doors and a blank wall above the entrance.'],
    ['2:3', 'A pair of tall brass candelabra flanking a staircase to the ark, a gentle glow.'],
    ['3:2', 'A children\'s service in a bright room, small figures seen from behind sitting on a carpet around a leader holding a blank scroll.'],
  ]),
];

// ---------- (c) one more scene for each of the 50 intermediate lessons ----------
export const LESSON_SCENES = {
  'I-01': 'A hand cupped over closed eyes at a prayer book, a single candle burning on the shelf beside it.',
  'I-02': 'A figure seen from behind taking three small steps forward and then settling, in a quiet corner of a sanctuary.',
  'I-03': 'A scroll being carried slowly down the aisle in a procession, hands reaching to touch it as it passes, parchment blank.',
  'I-04': 'A small group standing together in the dim twilight of a prayer hall, heads slightly bowed in quiet response.',
  'I-05': 'A wine cup raised over two candlesticks and two loaves on a table, Friday night glow.',
  'I-06': 'A braided candle burning bright in a darkened room, with a little spice box and a cup beside it.',
  'I-07': 'A line of figures seen from behind clapping and swaying in a bright, joyful sanctuary.',
  'I-08': 'Worshippers seen from behind bending forward in a deep bow at the same moment.',
  'I-09': 'The last worshippers leaving a sanctuary at the end of the service, sunlight at the door.',
  'I-10': 'A hospital corridor with a visitor seen from behind holding a small book and a bouquet.',
  'I-11': 'A crowded train platform at rush hour with sliding doors opening, travellers seen from behind, display boards blank.',
  'I-12': 'A fruit seller\'s stall in an open-air market piled high with pomegranates and oranges, scales and price cards blank.',
  'I-13': 'A cafe counter with a tall glass of milky coffee, a sugar bowl and a plate with a pastry, barista seen from behind.',
  'I-14': 'A pharmacy counter with shelves of plain boxes and a pharmacist seen from behind handing over a paper bag.',
  'I-15': 'A crossroads with a corner bakery, a bus stop and a pedestrian seen from behind pointing down a side street.',
  'I-16': 'Two hands holding a phone with a blank bright screen and a charging cable, on a cafe table.',
  'I-17': 'An empty sunlit apartment with open balcony doors, keys on a counter, and a landlord seen from behind in the hallway.',
  'I-18': 'A group of young soldiers seen from behind relaxing at a bus stop with rucksacks and a guitar, base fence in the distance.',
  'I-19': 'A guest at a doorway handing over a cake box and a bouquet, host\'s arms reaching out, both seen from behind or the side.',
  'I-20': 'A clinic waiting room with chairs in a row, a water cooler and a closed consulting door, empty.',
  'I-21': 'A cash machine on a stone wall in a city street, a figure seen from behind collecting banknotes.',
  'I-22': 'A post-office counter with a parcel on a scale and a queue of figures seen from behind.',
  'I-23': 'A taxi pulling up at the kerb of a quiet street at dusk, the driver\'s hand waving from the window, no faces.',
  'I-24': 'A hot street scene with heat shimmering, a figure seen from behind carrying a hat and a water bottle.',
  'I-25': 'Two figures seen from behind chatting over coffee on a balcony with a view of a hillside town.',
  'I-26': 'A scroll being lifted high above the reading table in front of the congregation, parchment blank.',
  'I-27': 'The congregation seen from behind standing on tiptoe for a moment of praise, sunlit windows above.',
  'I-28': 'A small plate of dates and a glass of water on a quiet table at the end of a long day.',
  'I-29': 'A cloth being lifted from a plate of matzah on a seder table, eager children\'s hands reaching in.',
  'I-30': 'A palm branch resting across the roof of a hut at sunset, lanterns waiting to be lit.',
  'I-31': 'A table of fresh pastries and wrapped parcels of food being packed into baskets for neighbours.',
  'I-32': 'A hand lighting the helper candle in a nine-branch menorah as shadows dance on a window.',
  'I-33': 'A table cleared after a meal, with a loaf on a board and a cup, hands washed and ready for the closing blessing.',
  'I-34': 'A traveller seen from behind at an airport window watching a plane take off at sunrise, suitcase beside.',
  'I-35': 'A table set for lunch with two loaves under a cloth and a wine cup beside a window with bright daylight.',
  'I-36': 'An office meeting room seen from the doorway: a long table, laptops, a whiteboard left completely blank.',
  'I-37': 'A university lecture hall seen from the back, rows of figures at desks, the screen at the front blank.',
  'I-38': 'Two figures seen from behind walking along a sea-front promenade at sunset, ice creams in hand.',
  'I-39': 'A car on a coastal road at a petrol pump, a figure seen from behind holding the nozzle, pump display blank.',
  'I-40': 'A mountain trail with a hiker seen from behind pausing at a stream, a paper map spread blank on a rock.',
  'I-41': 'Beach towels, an umbrella and a pair of flip-flops on golden sand, the sea behind, a swimmer far out.',
  'I-42': 'A playground with children seen from a distance on a slide and swings while a parent sits on a bench.',
  'I-43': 'A supermarket aisle with shelves of colourful boxes and a cart, a figure seen from behind choosing a jar.',
  'I-44': 'A leaking kitchen tap with a bucket under it and a toolbox on the floor, a pair of legs of a repairer visible behind.',
  'I-45': 'A delivery courier on a scooter pulling up at an apartment building doorway, a pizza box on the back, no faces.',
  'I-46': 'An ambulance with flashing lights parked at the end of a quiet street, plain unmarked vehicle, onlookers far away.',
  'I-47': 'A newspaper stand in a city square with stacks of blank-fronted papers, a figure seen from behind reading.',
  'I-48': 'A desk with a blank form on a clipboard, a pen in a hand, and a cup of tea at the corner.',
  'I-49': 'A figure seen from behind taking a photo of a sunset over a city with a phone held up, the screen away from view.',
  'I-50': 'A neighbourhood street before a holiday, with lit windows, strings of lights between balconies and neighbours greeting each other from a distance.',
};

// ---------- (d) letter and vowel alternates ----------
export const LETTER_ALTS = {
  alef: ['1:1', 'A mime in a silent handstand with one hand over the mouth and a tiny audience clapping behind, in a stripe-free costume.'],
  bet: ['1:1', 'A bed seen from the side: tall headboard on the right, mattress sticking out, open on the left.'],
  gimel: ['1:1', 'A stout camel walking forward with one front foot kicked out, wearing a woven saddle blanket.'],
  dalet: ['1:1', 'A wooden diving board overhanging a pool, held up by a single thick post.'],
  he: ['1:1', 'A small hut with a window whose left shutter is missing, and a figure leaning out to call, seen from behind.'],
  vav: ['1:1', 'A single straight violin bow standing upright on its tip, with a small vacuum cleaner humming beside it.'],
  zayin: ['1:1', 'A zipper pull standing upright on a jacket zipper, being zipped up.'],
  chet: ['1:1', 'A closed arched garden gate with no gap, a hissing cat peeking behind a bush.'],
  tet: ['1:1', 'A round-bellied teapot with its spout curling inward, steam rising.'],
  yod: ['1:1', 'A small yo-yo on a string dangling from a small hand, high on the page.'],
  kaf: ['1:1', 'A kangaroo\'s open pouch seen from the side with a tiny joey peeping out, opening to the left.'],
  lamed: ['2:3', 'A tall llama with a very long neck rising above a row of short sheep, looking around.'],
  mem: ['1:1', 'A small camping tent with its door flap open to one side and a glass of water beside it.'],
  nun: ['1:1', 'A cat curled up asleep in an open box, head tucked in the corner.'],
  samekh: ['1:1', 'A sesame bagel, perfectly round and closed, on a plate.'],
  ayin: ['1:1', 'A big cartoon eye winking above a cup with a straw, a finger against closed lips.'],
  pe: ['1:1', 'A party horn unrolling as someone blows, a stream of confetti.'],
  tsadi: ['1:1', 'A cat sitting upright with pointed ears, seen from the side, beside a slice of pizza.'],
  qof: ['2:3', 'A kite in the sky whose long string droops far below the frame\'s middle line.'],
  resh: ['1:1', 'A wooden ramp with a smooth curved end, a ball rolling down.'],
  shin: ['1:1', 'A birthday cake with three lit candles and a finger held to the lips.'],
  tav: ['1:1', 'A small table with one leg ending in a toe tapping the floor.'],
  'kaf-final': ['2:3', 'A long khaki sock hanging off a washing line, with a tall tail.'],
  'mem-final': ['1:1', 'A tightly wrapped gift box tied with ribbon, a closed square shape.'],
  'nun-final': ['2:3', 'A single long iron nail driven straight down into a wooden plank.'],
  'pe-final': ['2:3', 'A long party horn fully unrolled to a very long curl, with a feather floating above it.'],
  'tsadi-final': ['2:3', 'A cat sitting tall on one long pole, pointed ears forming a fork shape.'],
};
export const VOWEL_ALTS = {
  'vowel_01_kamatz': ['1:1', 'A lion yawning with its mouth wide open, the sound "ah", with a doctor\'s wooden tongue depressor beside it.'],
  'vowel_02_patach': ['1:1', 'A short flat bar of gold lying horizontally, the sound "ah", with a puff of calm breath above it.'],
  'vowel_03_tzere': ['1:1', 'A bright-eyed hen ("ay") standing next to two round eggs in a straw nest.'],
  'vowel_04_segol': ['1:1', 'Three neat dots arranged as a small triangle on a stone, with an elephant ("eh") in the background.'],
  'vowel_05_chirik': ['1:1', 'A single dot above a small smiling cheese wedge, the sound "ee", with a mouse beside it.'],
  'vowel_06_cholam_male': ['1:1', 'A round "oh"-shaped mouth blowing a smoke ring, with a small dot hovering on top.'],
  'vowel_07_cholam_chaser': ['1:1', 'A single dot hovering above the left shoulder of a small figure, who says "oh" in surprise.'],
  'vowel_08_kubutz': ['1:1', 'Three dots on a slant like a staircase leading down to a smiling owl ("oo").'],
  'vowel_09_shuruk': ['1:1', 'A single straight pole with a dot beside it, a train going "oo" past it.'],
  'vowel_10_shva': ['1:1', 'Two dots stacked one above the other, like a pair of eyes, with a tiny mouse whispering a very quick sound.'],
  'vowel_11_chataf_patach': ['1:1', 'A short flat bar with a tiny pair of dots beside it, a quick hopping frog ("ah").'],
  'vowel_12_chataf_segol': ['1:1', 'A tiny triangle of dots with a pair of dots beside it, a small chick ("eh") peeping.'],
  'vowel_13_chataf_kamatz': ['1:1', 'A tiny T-shaped figure with a pair of dots beside it, a quick hum of "oh".'],
  'vowel_14_dagesh': ['1:1', 'A single bold dot in the centre of a plain round bread roll, the bread pressed firm.'],
  'vowel_15_shin_sin_dots': ['1:1', 'Two identical three-flame candles, one with a dot on the right flame and one with a dot on the left flame.'],
};
