# Dev tool: regenerates data/calendar/prayer-cards.json from data/corpus/registry.json (run from the repo root: python3 tests/calendar.tools/make-prayer-cards.py).
# The reflections (text) and glosses are hand-written ALEF drafts; the Hebrew pieces are sliced by word position from the registry, so they are verbatim.
import json,re
reg={e['id']:e['he'] for e in json.load(open('data/corpus/registry.json'))['entries']}
def piece(rid,start,n):
    w=reg[rid].split()
    return ' '.join(w[start:start+n]).rstrip('׃')
M=[ # id, registry, startword, nwords, gloss, text
("m01","modeh-ani-1",0,6,"I give thanks before You, living and enduring King.","Before the list begins, one breath of thanks. You woke up, and that is where the day starts."),
("m02","mah-tovu-1",0,6,"How good are your tents, Jacob, your dwellings, Israel.","Whatever room you walk into today, notice what is good about it before you notice what is missing."),
("m03","amidah-lips",0,6,"Eternal One, open my lips, and my mouth will declare Your praise.","You will say some words today that matter. Begin them slowly."),
("m04","sim-shalom",0,8,"Grant peace, goodness, blessing, grace, kindness and compassion upon us.","You cannot fix everything today. You can add a little peace to one conversation."),
("m05","amidah-elohai-netzor",0,7,"My God, guard my tongue from evil and my lips from speaking deceit.","Before you speak: is it true, is it kind, does it need saying? One honest pause is enough."),
("m06","amidah-yihyu",0,7,"May the words of my mouth and the meditation of my heart be acceptable before You.","Let what you say and what you think today point in the same direction."),
("m07","ashrei-145-16",0,5,"You open Your hand and satisfy every living thing with favor.","Enough is a real amount. Notice one thing today that is already enough."),
("m08","hashivenu",0,6,"Return us to You, Eternal One; renew our days as of old.","Starting again is allowed, even in the middle of a week. Especially then."),
("m09","yehalelu",0,6,"Let them praise the name of the Eternal One, for His name alone is exalted.","Say one thing out loud today that you usually only think: thank you, I was wrong, I am glad you are here."),
("m10","bless-priestly-1",0,3,"May the Eternal One bless you and keep you.","Someone near you needs a blessing and has not asked. Give it quietly, in words or in an act."),
("m11","bless-priestly-2",0,5,"May the Eternal One make His face shine upon you and be gracious to you.","A face that lights up when you arrive is a gift. Be that face for someone today."),
("m12","bless-priestly-3",0,7,"May the Eternal One lift up His face to you and give you peace.","Peace is a practice, not a mood. Do one small thing toward it before noon."),
("m13","shema-1",0,4,"Hear, O Israel: the Eternal One is our God.","Listen first. Finish hearing one person today before you begin your reply."),
("m14","torah-bless-1",13,5,"Blessed are You, Eternal One, who gives the Torah.","Learning is a way of showing up. Ten minutes with these letters counts."),
("m15","gadlu",0,6,"Magnify the Eternal One with me, and let us exalt His name together.","Praise and curiosity are stronger shared. Tell someone what you are learning today."),
("m16","num-12-13",0,5,"God, please heal her, please.","The shortest prayer in the Torah is five words (Numbers 12:13). Short is allowed. Is there someone to wish healing for, in five words or fewer?"),
("m17","ashrei-84-5",0,5,"Happy are those who dwell in Your house; they will praise You always.","Some places feel like home when you sit in them. Make one today, even a corner of a table."),
("m18","vahavta-1",0,7,"You shall love the Eternal One your God with all your heart and all your soul and all your might.","Bring the whole of yourself to one thing today, not the split-screen version."),
("m19","mi-chamocha-1",0,3,"Who is like You among the mighty, Eternal One?","Wonder is allowed before breakfast. Look at one ordinary thing as if for the first time."),
("m20","kedushah-baruch",0,3,"Blessed be the glory of the Eternal One from its place.","Meaning is not always where you expect it. Stay alert for it in the commute, the kitchen, the inbox."),
("m21","oseh-shalom",0,7,"May the One who makes peace in the heights make peace for us.","Make room for someone who sees it differently. You can disagree and still make peace."),
("m22","adonai-oz",0,4,"The Eternal One gives strength to His people.","Strength shared is strength doubled. Borrow a little from someone today, and lend a little back."),
("m23","zimun-opening",0,2,"Friends, let us bless.","Before you eat today, take one breath of thanks. Then eat."),
]
E=[
("e01","shema-1",0,4,"Hear, O Israel: the Eternal One is our God.","The day is done. What is unfinished can wait. Listen once more, then rest."),
("e02","shema-2",0,6,"Blessed be the name of His glorious kingdom forever and ever.","Not everything needs a verdict tonight. Let the day be what it was."),
("e03","adon-olam-1",65,7,"And with my spirit, my body: the Eternal One is with me, I will not fear.","Fear is loudest at night. Name one worry, put it down, and let it wait until morning."),
("e04","adon-olam-1",59,6,"Into His hand I entrust my spirit when I sleep and when I wake.","Hand the day back. You are allowed to sleep without having solved it."),
("e05","oseh-shalom",0,7,"May the One who makes peace in the heights make peace for us.","Name one tension from today. Wish it peace, even if you cannot resolve it."),
("e06","sim-shalom",0,8,"Grant peace, goodness, blessing, grace, kindness and compassion upon us.","Which small kindness did you receive today? Say thank you to it, silently or aloud."),
("e07","hashivenu",0,6,"Return us to You, Eternal One; renew our days as of old.","Where did you drift today? Notice it without scolding yourself. Tomorrow is another chance to come back."),
("e08","amidah-yihyu",0,7,"May the words of my mouth and the meditation of my heart be acceptable before You.","Look back over your words today. Keep the ones you would say again, and quietly drop the rest."),
("e09","amidah-elohai-netzor",0,7,"My God, guard my tongue from evil and my lips from speaking deceit.","If you spoke too sharply today, decide on the one sentence of repair you will offer tomorrow."),
("e10","bless-priestly-3",0,7,"May the Eternal One lift up His face to you and give you peace.","Bless the people in your home, or in your thoughts, tonight, by name."),
("e11","amidah-lips",0,6,"Eternal One, open my lips, and my mouth will declare Your praise.","What did you learn today, even if it was small? Say it in one sentence."),
("e12","ashrei-145-16",0,5,"You open Your hand and satisfy every living thing with favor.","List three things that were enough today."),
("e13","torah-barchu",0,4,"Bless the Eternal One, who is blessed.","Someone answered you today, in words or in a look. Remember who."),
("e14","mah-tovu-1",0,5,"How good are your tents, Jacob, your dwellings, Israel.","Where did you feel at home today? Go back there in your mind for a moment."),
("e15","vahavta-1",0,7,"You shall love the Eternal One your God with all your heart and all your soul and all your might.","Choose one line from today that you want to remember, and say it once before you sleep."),
("e16","adon-olam-1",0,8,"Lord of the world, who reigned before any being was created.","Before all of this there was quiet. Sit in a little of it before you sleep."),
("e17","yehalelu",0,6,"Let them praise the name of the Eternal One, for His name alone is exalted.","Close with praise for something small: a meal, a message, a bus that came on time."),
("e18","mi-chamocha-1",0,3,"Who is like You among the mighty, Eternal One?","Honest wonder tonight: what surprised you today?"),
("e19","adonai-oz",0,4,"The Eternal One gives strength to His people.","Strength for tomorrow comes from rest. Let the lights go off."),
("e20","bless-priestly-1",0,3,"May the Eternal One bless you and keep you.","Say a quiet blessing for yourself. You did your best with what you had."),
("e21","num-12-13",0,5,"God, please heal her, please.","Is someone you know unwell or struggling? Five words for them tonight, or fewer."),
("e22","kedushah-yimloch",0,7,"The Eternal One will reign forever, your God, Zion, from generation to generation.","Some things last longer than any one day's worries. Let that be enough for tonight."),
("e23","ein-kamocha",0,3,"There is none like You among the gods, Eternal One.","Gratitude for uniqueness: one person or thing today that nothing else could replace."),
]
F=[ # Friday evening
("f01","candle-shabbat",10,4,"...to kindle the Shabbat light.","The week stops being a to-do list. Light the candles, or simply pause, and let the room change."),
("f02","lecha-dodi-1",0,7,"Come, my beloved, to meet the bride; let us welcome Shabbat.","Welcome Shabbat the way you would welcome a friend you have been waiting for."),
("f03","kiddush-veshamru",0,3,"The children of Israel shall keep the Sabbath.","Shabbat is kept, not just reached. Decide what you will set down until it ends."),
("f04","kiddush-zachor",0,4,"Remember the Sabbath day and keep it holy.","Remember, then rest. Six days of making, one of being."),
]
S=[ # Saturday evening (Havdalah)
("s01","havdalah-opening",0,6,"Behold, God is my salvation; I will trust and not be afraid.","As Shabbat ends, choose one thing from the rest to carry into the week."),
("s02","havdalah-hamavdil",6,7,"...who separates between holy and ordinary, between light and darkness.","A difference between rest and work is worth protecting. What will you protect this week?"),
]
def build(rows,slot):
    out=[]
    for i,rid,st,n,gl,tx in rows:
        out.append(dict(id=i,slot=slot,registryId=rid,piece=piece(rid,st,n),gloss=gl,text=tx))
    return out
doc={"schema":"alef-prayer-cards-1","status":"draft-not-clergy-reviewed",
"note":"Original short reflections written for ALEF (Lane 1, 2026-11-04) in the spirit of book/opening-prayer.txt. They are NOT reviewed by clergy, a rabbi or a native Hebrew speaker and are not liturgy. The Hebrew phrase in each card is a verbatim slice of a data/corpus/registry.json entry (referenced by registryId); registry statuses vary (tests/calendar.cards.test.js checks the slice is contained in the entry). Glosses are plain English renderings written for ALEF, not published translations. Card pools are 23 long so a given card does not repeat on the same weekday.",
"femaleVariants":{"m01":{"from":"מוֹדֶה","to":"מוֹדָה"}},
"morning":build(M,"morning"),"evening":build(E,"evening"),"fridayEvening":build(F,"fridayEvening"),"saturdayEvening":build(S,"saturdayEvening")}
for k in ("morning","evening","fridayEvening","saturdayEvening"):
    for c in doc[k]:
        assert c['piece'] and re.search('[֐-׿]',c['piece']),c
        print(c['id'],c['piece'])
json.dump(doc,open('data/calendar/prayer-cards.json','w'),indent=1,ensure_ascii=False)
