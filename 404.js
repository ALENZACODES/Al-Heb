// Not-found page for static hosts (404.html). An external file because the site's Content-Security-Policy (script-src 'self',
// _headers) blocks inline scripts. A path is resolved next to the page, so a one-level typo (/privacy, /Al-Heb/privacy) is
// handled; a deeper unknown path just shows the page and its link.
/* GitHub Pages and other static hosts serve this file for unknown paths. Hash routes live at /#/path, so a typo such as /privacy is moved there when it has no file extension. The repo folder name is used only when the site is served from /Al-Heb/. */
(function () {
  var parts = (location.pathname || '/').split('/').filter(function (s) { return s && s !== 'index.html' && s !== '404.html'; });
  var atRepo = parts[0] === 'Al-Heb';
  var base = atRepo ? '/Al-Heb/' : '/';
  var rest = (atRepo ? parts.slice(1) : parts).join('/');
  window.__alefHome = base;
  if (rest && !/\.[A-Za-z0-9]{1,8}$/.test(rest)) {
    location.replace(base + '#/' + rest + (location.search || ''));
  }
})();
document.addEventListener('DOMContentLoaded', function () {
  var a = document.getElementById('alef-home');
  if (a && window.__alefHome) a.setAttribute('href', window.__alefHome);
});
