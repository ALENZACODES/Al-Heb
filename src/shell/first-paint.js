/* Immediate first paint for hash routes, before module scripts run (CSP: self, no inline). */
(function () {
  var hash = String(location.hash || '').replace(/^#/, '').split('?')[0];
  var main = document.getElementById('main');
  if (!main || !hash || hash === '/' || hash === '/welcome') return;
  var roster = {"alef":{"he":"א","name":"Aleph"},"bet":{"he":"ב","name":"Bet"},"gimel":{"he":"ג","name":"Gimel"},"dalet":{"he":"ד","name":"Dalet"},"he":{"he":"ה","name":"He"},"vav":{"he":"ו","name":"Vav"},"zayin":{"he":"ז","name":"Zayin"},"chet":{"he":"ח","name":"Chet"},"tet":{"he":"ט","name":"Tet"},"yod":{"he":"י","name":"Yod"},"kaf":{"he":"כ","name":"Kaf"},"lamed":{"he":"ל","name":"Lamed"},"mem":{"he":"מ","name":"Mem"},"nun":{"he":"נ","name":"Nun"},"samekh":{"he":"ס","name":"Samekh"},"ayin":{"he":"ע","name":"Ayin"},"pe":{"he":"פ","name":"Pe"},"tsadi":{"he":"צ","name":"Tsadi"},"qof":{"he":"ק","name":"Qof"},"resh":{"he":"ר","name":"Resh"},"shin":{"he":"ש","name":"Shin"},"tav":{"he":"ת","name":"Tav"},"kaf-final":{"he":"ך","name":"Final Kaf"},"mem-final":{"he":"ם","name":"Final Mem"},"nun-final":{"he":"ן","name":"Final Nun"},"pe-final":{"he":"ף","name":"Final Pe"},"tsadi-final":{"he":"ץ","name":"Final Tsadi"}};
  var title = 'Aleph';
  var glyph = '';
  if (hash === '/learn') title = 'Lessons';
  else if (hash === '/sounds') title = 'Vowels and sounds';
  else if (hash.indexOf('/letters/') === 0) {
    var id = hash.slice('/letters/'.length);
    var L = roster[id];
    if (L) { title = L.name; glyph = L.he; }
    else title = 'Letter ' + id;
  } else return;
  var h1 = document.createElement('h1');
  h1.id = 'view-title';
  h1.className = hash === '/learn' ? 'alef-first-paint alef-learn-hero'
    : (hash.indexOf('/letters/') === 0 ? 'alef-first-paint alef-letter-hero' : 'alef-first-paint');
  h1.tabIndex = -1;
  h1.textContent = glyph ? title + ' ' + glyph : title;
  main.replaceChildren(h1);
  if (glyph) {
    var big = document.createElement('span');
    big.className = 'alef-first-glyph';
    big.lang = 'he';
    big.dir = 'rtl';
    big.textContent = glyph;
    main.append(big);
  }
})();
