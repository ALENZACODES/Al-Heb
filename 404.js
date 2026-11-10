/* GitHub Pages and other static hosts serve 404.html for unknown paths. Hash routes live at /#/path, so a typo such as /privacy is moved there when it has no file extension. This file is loaded from /404.js (site root). The repo folder name Al-Heb is used only when the site is served from /Al-Heb/. Inline script cannot be used: the host CSP is script-src 'self' and blocks it. */
(function () {
  var parts = (location.pathname || '/').split('/').filter(function (s) { return s && s !== 'index.html' && s !== '404.html'; });
  var atRepo = parts[0] === 'Al-Heb';
  var base = atRepo ? '/Al-Heb/' : '/';
  var rest = (atRepo ? parts.slice(1) : parts).join('/');
  var home = document.getElementById('alef-home');
  if (home) home.setAttribute('href', base);
  if (rest && !/\.[A-Za-z0-9]{1,8}$/.test(rest)) {
    location.replace(base + '#/' + rest + (location.search || ''));
  }
})();
