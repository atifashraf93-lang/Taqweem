/* Taqweem: Seerat and history (prophets named in the Quran, sahaba, sahabiyat). Content is in seerat-data.js; Quran verses are read from the bundled Quran files. */
(function () {
  'use strict';
  var S = window.SEERAT, D = window.TaqweemDaily;
  if (!S || !D) return;
  var esc = D.esc, ur = D.ur;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  var TABS = { anbiya: 'انبیاء', sahaba: 'صحابہ', sahabiyat: 'صحابیات' };
  var HON = { anbiya: 'علیہم السلام', sahaba: 'رضی اللہ عنہم', sahabiyat: 'رضی اللہ عنہن' };
  var DET = window.SEERAT_D || {};
  var SB = [[/وفات|روضہ|قبر|شہادت/, 'wafat'], [/غزوات|جنگ|فتوحات|بدر|احد|خندق|معرکہ|موتہ/, 'ghazwa'], [/ہجرت|غار|حبشہ|سفر|طوفان|کشتی|کعبہ/, 'hijrat'], [/قرآن|علم|تفسیر|حدیث|فقہ|کتاب|تورات|زبور|وحی/, 'quran'], [/اسلام|ایمان|دعوت|نبوت/, 'islam'], [/تعارف|نسب|ولادت|ابتدائی|پیدائش|بچپن/, 'nasab']];
  function sbKind(h) { for (var i = 0; i < SB.length; i++) if (SB[i][0].test(h)) return SB[i][1]; return ''; }
  function rich(t) {
    return esc(t).replace(/ﷺ/g, '<span class="sal">صلی اللہ علیہ وسلم</span>')
      .replace(/(رضی اللہ (?:تعالیٰ )?عن(?:ہ|ہا|ہم|ہما|ہن))/g, '<span class="rz">$1</span>')
      .replace(/(علیہ(?:م)? السلام|علیہما السلام)/g, '<span class="as">$1</span>');
  }
  function secHead(h) { var k = sbKind(h); return k ? '<div class="sban"><img src="img/s_' + k + '.svg" alt="" loading="lazy" decoding="async"><b><i>✦</i>' + rich(h) + '<i>✦</i></b></div>' : '<div class="hs">' + rich(h) + '</div>'; }
  var FILT = {
    anbiya: [['all', 'سب'], ['u', 'اولوالعزم']],
    sahaba: [['all', 'سب'], ['khulafa', 'خلفائے راشدین'], ['ashara', 'عشرہ مبشرہ'], ['ahl', 'اہلِ بیت']],
    sahabiyat: [['all', 'سب'], ['ummahat', 'امہات المؤمنین'], ['ahl', 'اہلِ بیت']]
  };
  var st = { tab: 'anbiya', f: 'all', q: '' }, el = null;
  function norm(s) { return String(s).replace(/[ً-ٰٟۖ-ۭـ]/g, '').replace(/رضی اللہ عنہ[ما]?|رضی اللہ عنہا|علیہ السلام|علیہا السلام|حضرت/g, '').replace(/\s+/g, ' ').trim(); }
  function build() {
    if (el) return;
    el = document.createElement('div'); el.id = 'seerat'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'سیرت و تاریخ');
    el.innerHTML = '<button class="back" id="sBack"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>واپس</button>' +
      '<h1 style="margin:0;font-size:22px;line-height:2" id="sTitle">سیرت و تاریخ</h1>' +
      '<div id="sMain"><img class="pban" id="sTabBan" src="img/b_anbiya.svg" alt=""><div class="stabs" id="sTabs"></div><div class="search" style="margin:4px 0 0"><input id="sSearch" type="search" placeholder="نام تلاش کریں" autocomplete="off" aria-label="نام تلاش کریں"></div>' +
      '<div class="htopics" id="sFilt"></div><div class="hl" id="sList"></div></div><div class="hl" id="sDet" hidden></div>';
    (document.getElementById('app') || document.body).appendChild(el);
    $('#sBack').addEventListener('click', function () { if (!$('#sDet').hidden) showList(); else el.hidden = true; });
    $('#sSearch').addEventListener('input', function () { st.q = this.value; paintList(); });
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-st]'); if (b) { st.tab = b.dataset.st; st.f = 'all'; paintAll(); return; }
      b = e.target.closest('[data-sf]'); if (b) { st.f = b.dataset.sf; paintList(); paintFilt(); return; }
      b = e.target.closest('[data-si]'); if (b) openDetail(+b.dataset.si);
    });
  }
  function paintTabs() { $('#sTabs').innerHTML = Object.keys(TABS).map(function (k) { return '<button data-st="' + k + '" aria-pressed="' + (st.tab === k) + '">' + TABS[k] + '<small class="hon">' + HON[k] + '</small></button>'; }).join(''); }
  function paintFilt() { $('#sFilt').innerHTML = FILT[st.tab].map(function (f) { return '<button data-sf="' + f[0] + '" aria-pressed="' + (st.f === f[0]) + '">' + f[1] + '</button>'; }).join(''); }
  function initial(n) { var c = norm(n).charAt(0); return c || '•'; }
  function match(x) {
    if (st.f === 'u' && !x.u) return false;
    if (st.f !== 'all' && st.f !== 'u' && (x.k || []).indexOf(st.f) < 0) return false;
    if (st.q.trim() && norm(x.n + ' ' + x.t).indexOf(norm(st.q)) < 0) return false;
    return true;
  }
  function paintList() {
    var arr = S[st.tab], html = '';
    arr.forEach(function (x, i) {
      if (!match(x)) return;
      html += '<button class="scard" data-si="' + i + '"><span class="sav">' + esc(initial(x.n)) + '</span><span class="sbd"><b>' + esc(x.n) + '</b><small>' + esc(x.t) + '</small></span><span class="sgo">‹</span></button>';
    });
    if (st.tab === 'sahaba' && st.f === 'all' && !st.q.trim()) html = '<details class="sec" id="sFazl"><summary>صحابہ کی فضیلت: قرآن میں</summary><div class="body" id="sFazlB">…</div></details>' + html;
    var note = '<p class="hnote">' + (st.tab === 'anbiya' ? 'قرآن میں نام کے ساتھ مذکور ۲۵ انبیاء۔ ' : 'مشہور شخصیات کا انتخاب۔ فہرست آئندہ بڑھائی جائے گی۔ ') + 'مختصر خلاصہ ہے؛ مکمل تفصیل کے لیے مستند کتب اور اہلِ علم سے رجوع کریں۔</p>';
    $('#sList').innerHTML = (html || '<div class="empty">کوئی نام نہیں ملا۔</div>') + note;
    if ($('#sFazl')) $('#sFazl').addEventListener('toggle', fazl, { once: true });
  }
  function fazl() {
    D.loadQ().then(function (q) {
      var b = $('#sFazlB'); if (!b) return;
      if (!q) { b.textContent = 'قرآن کی فائل دستیاب نہیں۔'; return; }
      b.innerHTML = S.fazl.map(function (r) { var a = D.ayat(q, r); return qBlock(a); }).join('');
    });
  }
  function qBlock(a) { return '<div class="sq"><div class="har">' + esc(a.ar) + '</div><div class="hur">' + esc(a.ur) + '</div><div class="hs">' + esc(a.ref) + '</div></div>'; }
  function paintAll() { var tb = $('#sTabBan'); if (tb) tb.src = 'img/b_' + st.tab + '.svg'; paintTabs(); paintFilt(); paintList(); $('#sSearch').value = st.q; }
  function showList() { $('#sDet').hidden = true; $('#sMain').hidden = false; $('#sTitle').textContent = 'سیرت و تاریخ'; }
  function openDetail(i) {
    var x = S[st.tab][i]; if (!x) return;
    $('#sMain').hidden = true; $('#sDet').hidden = false; $('#sTitle').textContent = TABS[st.tab] + ' ' + HON[st.tab];
    var det = $('#sDet');
    det.innerHTML = '<div class="shero"><span class="sav big">' + esc(initial(x.n)) + '</span><h2>' + esc(x.n) + '</h2><small>' + esc(x.t) + '</small></div>' +
      '<div class="sbox"><div class="hs">تعارف</div><p>' + rich(x.b) + '</p></div>' +
      (DET[x.n] ? DET[x.n].map(function (sec) { return '<div class="sbox">' + secHead(sec[0]) + String(sec[1]).split('\n').map(function (p) { return '<p>' + rich(p) + '</p>'; }).join('') + '</div>'; }).join('') : '') +
      (x.qn ? '<div class="sbox"><div class="hs">قرآن میں ذکر</div><p>' + rich(x.qn) + '</p></div>' : '') +
      ((x.q && x.q.length) ? '<div class="sbox" id="sQ"><div class="hs">قرآن سے</div><div id="sQB">…</div></div>' : '') +
      '<div class="sbox"><div class="hs">ماخذ</div><p class="small">' + esc(st.tab === 'anbiya' ? S.anbiyaSrc : S.sahabaSrc) + '</p></div>' +
      '<p class="hnote">مختصر خلاصہ ہے۔ جہاں سال میں اختلاف ہے وہاں "تقریباً" لکھا ہے۔ مکمل تفصیل کے لیے مستند کتب اور اہلِ علم سے رجوع کریں۔</p>';
    det.scrollTop = 0;
    if (x.q && x.q.length) D.loadQ().then(function (q) {
      var b = $('#sQB'); if (!b) return;
      b.innerHTML = q ? x.q.map(function (r) { return qBlock(D.ayat(q, r)); }).join('') : 'قرآن کی فائل دستیاب نہیں۔';
    });
  }
  function open() { build(); st.q = ''; showList(); paintAll(); el.hidden = false; $('#sList').scrollTop = 0; }
  document.addEventListener('click', function (e) { if (e.target.closest('[data-seerat]')) open(); });
  window.TaqweemSeerat = { open: open };
})();
