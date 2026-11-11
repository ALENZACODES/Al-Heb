// Rimon's praise, encouragement and nudges, with the Hebrew in the form that fits the learner.
// The learner's grammatical gender comes from Settings ('m' | 'f' | 'both' | null). Nothing falls back to a masculine
// form: when it is not chosen, or is 'both', Rimon uses the plural (אַתֶּם), as the rest of Rimon's lines do.
// Lines 3 and 4 have no gendered words, so all three forms are the same.

const P = (en, m, f, pl, tm, tf, tpl) => Object.freeze({ en, he: Object.freeze({ m, f, pl }), say: Object.freeze({ m: tm, f: tf, pl: tpl }) });

export const PRAISE = Object.freeze({
  praise: Object.freeze([
    P("You're doing great.", 'אַתָּה עוֹשֶׂה עֲבוֹדָה נֶהֱדֶרֶת!', 'אַתְּ עוֹשָׂה עֲבוֹדָה נֶהֱדֶרֶת!', 'אַתֶּם עוֹשִׂים עֲבוֹדָה נֶהֱדֶרֶת!',
      'Ata ose avoda nehederet!', 'At osa avoda nehederet!', 'Atem osim avoda nehederet!'),
    P("You're doing really well.", 'אַתָּה מַצְלִיחַ מַמָּשׁ יָפֶה!', 'אַתְּ מַצְלִיחָה מַמָּשׁ יָפֶה!', 'אַתֶּם מַצְלִיחִים מַמָּשׁ יָפֶה!',
      'Ata matzliach mamash yafe!', 'At matzlicha mamash yafe!', 'Atem matzlichim mamash yafe!'),
    P("That's awesome!", 'זֶה מַדְהִים!', 'זֶה מַדְהִים!', 'זֶה מַדְהִים!', 'Ze madhim!', 'Ze madhim!', 'Ze madhim!'),
    P('Great job!', 'עֲבוֹדָה מְצֻיֶּנֶת!', 'עֲבוֹדָה מְצֻיֶּנֶת!', 'עֲבוֹדָה מְצֻיֶּנֶת!', 'Avoda metzuyenet!', 'Avoda metzuyenet!', 'Avoda metzuyenet!'),
  ]),
  encourage: Object.freeze([
    P('Keep it up!', 'תַּמְשִׁיךְ כָּכָה!', 'תַּמְשִׁיכִי כָּכָה!', 'תַּמְשִׁיכוּ כָּכָה!', 'Tamshich kacha!', 'Tamshichi kacha!', 'Tamshichu kacha!'),
    P("Keep it up, you're on the right track.", 'תַּמְשִׁיךְ כָּכָה, אַתָּה בַּדֶּרֶךְ הַנְּכוֹנָה.', 'תַּמְשִׁיכִי כָּכָה, אַתְּ בַּדֶּרֶךְ הַנְּכוֹנָה.', 'תַּמְשִׁיכוּ כָּכָה, אַתֶּם בַּדֶּרֶךְ הַנְּכוֹנָה.',
      'Tamshich kacha, ata baderech hanechona.', 'Tamshichi kacha, at baderech hanechona.', 'Tamshichu kacha, atem baderech hanechona.'),
    P("You've got this!", 'אַתָּה יָכוֹל!', 'אַתְּ יְכוֹלָה!', 'אַתֶּם יְכוֹלִים!', 'Ata yachol!', 'At yechola!', 'Atem yecholim!'),
    P('You can do it — I believe in you.', 'אַתָּה יָכוֹל לַעֲשׂוֹת אֶת זֶה, אֲנִי מַאֲמִין בְּךָ.', 'אַתְּ יְכוֹלָה לַעֲשׂוֹת אֶת זֶה, אֲנִי מַאֲמִין בָּךְ.', 'אַתֶּם יְכוֹלִים לַעֲשׂוֹת אֶת זֶה, אֲנִי מַאֲמִין בָּכֶם.',
      "Ata yachol la'asot et ze, ani ma'amin becha.", "At yechola la'asot et ze, ani ma'amin bach.", "Atem yecholim la'asot et ze, ani ma'amin bachem."),
  ]),
  nudge: Object.freeze([
    P("Don't give up, you're almost there.", 'אַל תְּוַתֵּר, אַתָּה כִּמְעַט שָׁם.', 'אַל תְּוַתְּרִי, אַתְּ כִּמְעַט שָׁם.', 'אַל תְּוַתְּרוּ, אַתֶּם כִּמְעַט שָׁם.',
      'Al tevater, ata kim\'at sham.', 'Al tevatri, at kim\'at sham.', 'Al tevatru, atem kim\'at sham.'),
    P("Try again — you'll get it.", 'נַסֵּה שׁוּב, אַתָּה תַּצְלִיחַ.', 'נַסִּי שׁוּב, אַתְּ תַּצְלִיחִי.', 'נַסּוּ שׁוּב, אַתֶּם תַּצְלִיחוּ.',
      'Nase shuv, ata tatzliach.', 'Nasi shuv, at tatzlichi.', 'Nasu shuv, atem tatzlichu.'),
    P("Give it another try — you're close.", 'תְּנַסֶּה עוֹד קְצָת, אַתָּה קָרוֹב.', 'תְּנַסִּי עוֹד קְצָת, אַתְּ קְרוֹבָה.', 'תְּנַסּוּ עוֹד קְצָת, אַתֶּם קְרוֹבִים.',
      "Tenase od ktzat, ata karov.", "Tenasi od ktzat, at krova.", "Tenasu od ktzat, atem krovim."),
    P("Come by tomorrow and we'll try again.", 'בּוֹא מָחָר וּנְנַסֶּה שׁוּב.', 'בּוֹאִי מָחָר וּנְנַסֶּה שׁוּב.', 'בּוֹאוּ מָחָר וּנְנַסֶּה שׁוּב.',
      "Bo machar u'nenase shuv.", "Bo'i machar u'nenase shuv.", "Bo'u machar u'nenase shuv."),
  ]),
});

/** Which Hebrew form to use for a learner gender setting. Unknown or 'both' -> plural, never a masculine fallback. */
export const formFor = (gender) => (gender === 'm' ? 'm' : gender === 'f' ? 'f' : 'pl');

/** The n-th line of a group as a bubble line {he, en, say}. */
export function praiseLine(group, n = 0, gender = null) {
  const list = PRAISE[group];
  if (!list || !list.length) return null;
  const l = list[((n % list.length) + list.length) % list.length], k = formFor(gender);
  return { he: l.he[k], en: l.en, say: l.say[k] };
}
