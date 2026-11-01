/* Taqweem: illustrated banners (original SVG artwork in img/) added to the feature screens. */
(function () {
  'use strict';
  function img(name, alt) {
    var i = document.createElement('img');
    i.className = 'pban'; i.src = 'img/' + name + '.svg'; i.alt = alt || ''; i.loading = 'lazy'; i.decoding = 'async';
    return i;
  }
  function afterHead(h1, name) {
    if (!h1 || h1.parentNode.querySelector('.pban')) return;
    var host = h1.closest('.head') || h1.parentNode;
    if (host.parentNode) host.parentNode.insertBefore(img(name), host.nextSibling);
  }
  function inBody(id, name) {
    var b = document.querySelector('#' + id + ' .body'); if (!b || b.querySelector('.pban')) return;
    b.insertBefore(img(name), b.firstChild);
  }
  function run() {
    afterHead(document.getElementById('h-qibla'), 'b_qibla');
    afterHead(document.getElementById('h-recite'), 'b_recite');
    afterHead(document.getElementById('h-prayer'), 'b_prayer');
    afterHead(document.getElementById('h-cal'), 'b_calendar');
    [['hadith', 'b_hadith'], ['duas', 'b_duas'], ['books', 'b_books'], ['tafseer', 'b_tafseer']].forEach(function (p) {
      var h = document.querySelector('#' + p[0] + ' h1'); if (!h || h.parentNode.querySelector('.pban')) return;
      h.parentNode.insertBefore(img(p[1]), h.nextSibling);
    });
    inBody('secMosque', 'b_mosque'); inBody('secTasbeeh', 'b_tasbeeh'); inBody('secZakat', 'b_zakat');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
