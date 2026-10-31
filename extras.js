/* Taqweem extras: home cards (today's prayers, upcoming Islamic days), More-tab tiles, fasting log, Quran-completion goal, special Hijri dates. */
(function () {
  'use strict';
  var Core = window.TaqweemCore, Data = window.TaqweemData, D = window.TaqweemDaily;
  var ur = D.ur, esc = D.esc, store = D.store, toast = D.toast;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function hoff() { return typeof store('hoff') === 'number' ? store('hoff') : -1; }
  function now() { return new Date(); }
  function todayNum() { var n = now(); return Core.dayNumOf(n.getFullYear(), n.getMonth() + 1, n.getDate()); }
  function todayKey() { var n = now(); return Core.dateKey(n.getFullYear(), n.getMonth() + 1, n.getDate()); }
  function keyNum(k) { var p = k.split('-'); return Core.dayNumOf(+p[0], +p[1], +p[2]); }
  function nativeLN() { var C = window.Capacitor; return (C && C.isNativePlatform && C.isNativePlatform() && C.Plugins && C.Plugins.LocalNotifications) || null; }
  var HM = Data.HIJRI_MONTHS;

  /* next occurrence (day number) of Hijri month m, day d */
  function nextOcc(m, d) {
    var tn = todayNum(), h = Core.hijriFromDayNum(tn, hoff());
    if (!h) return null;
    var out = null;
    [h.y, h.y + 1].some(function (y) {
      var n = Core.monthStartDayNum(y, m, hoff(), tn) + d - 1;
      if (n >= tn) { out = n; return true; }
      return false;
    });
    return out;
  }
  function daysText(n) { var k = n - todayNum(); return k === 0 ? 'آج' : k === 1 ? 'کل' : ur(k) + ' دن'; }

  /* ---------- home ---------- */
  var PN = ['فجر', 'ظہر', 'عصر', 'مغرب', 'عشاء'];
  function buildHome() {
    var home = $('#tab-home'); if (!home || $('#hPray')) return;
    var anchor = $('#hFast') || $('#hMini');
    var pr = document.createElement('button'); pr.id = 'hPray'; pr.className = 'xcard'; pr.setAttribute('data-go', 'more'); pr.setAttribute('data-open', 'secTrk');
    var dc = document.createElement('div'); dc.id = 'hDays'; dc.className = 'xcard';
    anchor.parentNode.insertBefore(pr, anchor.nextSibling);
    pr.parentNode.insertBefore(dc, pr.nextSibling);
    var q = $('.hquick', home);
    if (q) {
      var b1 = document.createElement('button'); b1.setAttribute('data-seerat', '1'); b1.textContent = 'سیرت و تاریخ';
      var b2 = document.createElement('button'); b2.setAttribute('data-dpop', '1'); b2.textContent = 'آج کی آیت و حدیث';
      q.insertBefore(b2, q.firstChild); q.insertBefore(b1, q.firstChild);
    }
  }
  function paintHome() {
    buildHome();
    var trk = store('trk') || {}, n = now(), mask = trk[todayKey()] || 0, c = 0, i;
    for (i = 0; i < 5; i++) if (mask & (1 << i)) c++;
    var streak = Core.computeStreak(trk, n.getFullYear(), n.getMonth() + 1, n.getDate());
    var pills = PN.map(function (p, k) { return '<span class="' + ((mask & (1 << k)) ? 'on' : '') + '">' + p + '</span>'; }).join('');
    $('#hPray').innerHTML = '<div class="xr"><div class="xring" style="--p:' + (c * 20) + '"><i>' + ur(c) + '/۵</i></div><div class="xt"><b>آج کی نمازیں</b><small>' +
      (streak ? ur(streak) + ' دن سے لگاتار مکمل' : 'ٹریکر میں نشان لگائیں') + '</small></div></div><div class="xpills">' + pills + '</div>';
    var items = [];
    Data.OCCASIONS.forEach(function (o) { var d = nextOcc(o[0], o[1]); if (d != null) items.push({ n: d, name: o[2] }); });
    (store('sdates') || []).forEach(function (s) { var d = nextOcc(s.m, s.d); if (d != null) items.push({ n: d, name: s.t, mine: 1 }); });
    items.sort(function (a, b) { return a.n - b.n; });
    $('#hDays').innerHTML = '<div class="xt"><b>آنے والے دن</b></div>' + items.slice(0, 3).map(function (x) {
      return '<div class="xev"><span>' + (x.mine ? '★ ' : '') + esc(x.name) + '</span><em>' + daysText(x.n) + '</em></div>';
    }).join('');
  }

  /* ---------- More tiles ---------- */
  var TILES = [['🕌', 'قریبی مساجد', 'secMosque'], ['📿', 'تسبیح اور درود', 'secTasbeeh'], ['✅', 'نماز ٹریکر اور قضا', 'secTrk'], ['🌙', 'روزوں کا ٹریکر', 'secRoza'],
    ['📖', 'قرآن ختم کا ہدف', 'secKhatm'], ['🎂', 'خاص ہجری تاریخیں', 'secDates'], ['🔔', 'روزانہ آیت و حدیث', 'secDaily'], ['💰', 'زکوٰۃ', 'secZakat'], ['🕋', 'سیرت و تاریخ', 'SEERAT'], ['⚙️', 'ترتیبات', 'secSet']];
  function buildTiles() {
    var more = $('#tab-more'); if (!more || $('#mTiles')) return;
    var g = document.createElement('div'); g.id = 'mTiles'; g.className = 'mtiles';
    g.innerHTML = TILES.map(function (t) { return '<button data-tile="' + t[2] + '"><span>' + t[0] + '</span><b>' + t[1] + '</b></button>'; }).join('');
    var head = $('.head', more); head.parentNode.insertBefore(g, head.nextSibling);
    g.addEventListener('click', function (e) {
      var b = e.target.closest('[data-tile]'); if (!b) return;
      if (b.dataset.tile === 'SEERAT') { if (window.TaqweemSeerat) window.TaqweemSeerat.open(); return; }
      var d = document.getElementById(b.dataset.tile); if (d) { d.open = true; d.scrollIntoView({ block: 'start' }); }
    });
  }

  /* ---------- section helper ---------- */
  function addSection(id, title, html) {
    var more = $('#tab-more'); if (!more || document.getElementById(id)) return null;
    var s = document.createElement('details'); s.className = 'sec'; s.id = id;
    s.innerHTML = '<summary>' + title + '</summary><div class="body">' + html + '</div>';
    var ref = document.getElementById('secDaily') || $('details.sec', more);
    ref.parentNode.insertBefore(s, ref.nextSibling);
    return s;
  }

  /* ---------- fasting log ---------- */
  function paintRoza() {
    var r = store('roza') || {}, k = todayKey(), tn = todayNum(), h = Core.hijriFromDayNum(tn, hoff()), total = 0, yr = 0, mo = 0;
    Object.keys(r).forEach(function (key) {
      total++;
      var hh = Core.hijriFromDayNum(keyNum(key), hoff());
      if (h && hh && hh.y === h.y) { yr++; if (hh.m === h.m) mo++; }
    });
    var g = Core.gregFromDayNum(tn), info = h ? Core.fastingInfo(h, g.wd) : null;
    $('#rzToday').textContent = info ? 'آج: ' + info.text : 'آج کوئی خاص نفلی روزہ نہیں';
    $('#rzBtn').textContent = r[k] ? 'آج کا روزہ ہٹائیں' : 'آج روزہ رکھا';
    $('#rzBtn').setAttribute('aria-pressed', String(!!r[k]));
    $('#rzYr').textContent = ur(yr); $('#rzMo').textContent = ur(mo); $('#rzAll').textContent = ur(total);
    $('#rzQ').textContent = ur(store('rozaq') || 0);
  }
  function buildRoza() {
    var s = addSection('secRoza', 'روزوں کا ٹریکر', '<p class="sub" id="rzToday"></p><button class="btn" id="rzBtn" aria-pressed="false">آج روزہ رکھا</button>' +
      '<div class="row2"><span>اس ہجری مہینے میں</span><b id="rzMo">۰</b></div><div class="row2"><span>اس ہجری سال میں</span><b id="rzYr">۰</b></div><div class="row2"><span>کل درج کیے ہوئے</span><b id="rzAll">۰</b></div>' +
      '<div class="row2"><span>باقی قضا روزے</span><span class="ctl" style="display:flex;align-items:center;gap:8px"><button class="qb" id="rzQm" aria-label="کم">−</button><b id="rzQ">۰</b><button class="qb" id="rzQp" aria-label="زیادہ">+</button></span></div>' +
      '<p class="hint">یہ صرف آپ کا ذاتی ریکارڈ ہے اور فون میں رہتا ہے۔ رمضان، عرفہ، عاشورہ، ایامِ بیض اور پیر جمعرات کی رہنمائی ہجری تاریخ سے خودکار ہے۔</p>');
    if (!s) return;
    $('#rzBtn').addEventListener('click', function () {
      var r = store('roza') || {}, k = todayKey();
      if (r[k]) delete r[k]; else r[k] = 1;
      var keys = Object.keys(r).sort(); while (keys.length > 800) delete r[keys.shift()];
      store('roza', r); paintRoza();
    });
    $('#rzQp').addEventListener('click', function () { store('rozaq', (store('rozaq') || 0) + 1); paintRoza(); });
    $('#rzQm').addEventListener('click', function () { store('rozaq', Math.max(0, (store('rozaq') || 0) - 1)); paintRoza(); });
    paintRoza();
  }

  /* ---------- Quran completion goal ---------- */
  var PAGES = 604;
  function kh() { var k = store('khatm') || {}; k.pages = Math.max(0, Math.min(PAGES, k.pages || 0)); k.per = k.per || 2; k.log = k.log || {}; return k; }
  function paintKhatm() {
    var k = kh(), left = PAGES - k.pages, today = k.log[todayKey()] || 0;
    $('#khBar').style.width = (k.pages / PAGES * 100) + '%';
    $('#khTxt').textContent = ur(k.pages) + ' / ' + ur(PAGES) + ' صفحات (' + ur(Math.round(k.pages / PAGES * 100)) + '٪)';
    $('#khToday').textContent = ur(today) + ' / ' + ur(k.per);
    $$('#khPer button').forEach(function (b) { b.setAttribute('aria-pressed', String(+b.dataset.k === k.per)); });
    var el = $('#khEst');
    if (!left) { el.textContent = 'ماشاء اللہ، ختم مکمل ہوا۔ نیا آغاز کرنے کے لیے "نئے سرے سے" دبائیں۔'; return; }
    var days = Math.ceil(left / k.per), tn = todayNum() + days, g = Core.gregFromDayNum(tn), h = Core.hijriFromDayNum(tn, hoff());
    el.textContent = 'روزانہ ' + ur(k.per) + ' صفحے پڑھیں تو ' + ur(days) + ' دن میں ختم: ' + ur(g.d) + ' ' + Data.GREG_MONTHS[g.m - 1] + ' ' + ur(g.y) + (h ? ' (' + ur(h.d) + ' ' + HM[h.m - 1] + ' ' + ur(h.y) + 'ھ)' : '');
  }
  function khAdd(n) {
    var k = kh(), before = k.pages; k.pages = Math.max(0, Math.min(PAGES, k.pages + n));
    var delta = k.pages - before, key = todayKey(); k.log[key] = Math.max(0, (k.log[key] || 0) + delta);
    var ks = Object.keys(k.log).sort(); while (ks.length > 60) delete k.log[ks.shift()];
    store('khatm', k); paintKhatm();
    if (before < PAGES && k.pages === PAGES) toast('ماشاء اللہ، ختمِ قرآن مکمل');
  }
  function buildKhatm() {
    var s = addSection('secKhatm', 'قرآن ختم کا ہدف', '<div class="xbar"><i id="khBar"></i></div><p class="sub" id="khTxt"></p>' +
      '<div class="row2"><span>آج پڑھے (ہدف)</span><b id="khToday">۰</b></div>' +
      '<div class="seg" id="khPer"><span>روزانہ:</span><button data-k="1">۱</button><button data-k="2">۲</button><button data-k="4">۴</button><button data-k="10">۱۰</button><button data-k="20">۲۰</button></div>' +
      '<div class="seg"><span>صفحات:</span><button data-a="1">+۱</button><button data-a="5">+۵</button><button data-a="-1">−۱</button></div>' +
      '<p class="hint" id="khEst"></p><div class="seg"><span></span><button id="khReset">نئے سرے سے</button></div>' +
      '<p class="hint">مصحفِ مدنی کے ۶۰۴ صفحات کے حساب سے۔ جتنا پڑھیں اتنے صفحے خود درج کریں۔</p>');
    if (!s) return;
    s.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]'); if (b) { khAdd(+b.dataset.a); return; }
      b = e.target.closest('[data-k]'); if (b) { var k = kh(); k.per = +b.dataset.k; store('khatm', k); paintKhatm(); }
    });
    $('#khReset').addEventListener('click', function () { if (confirm('ختم کا شمار صفر کر دیں؟')) { var k = kh(); k.pages = 0; store('khatm', k); paintKhatm(); } });
    paintKhatm();
  }

  /* ---------- special Hijri dates ---------- */
  function paintDates() {
    var list = store('sdates') || [];
    $('#sdList').innerHTML = list.length ? list.map(function (s, i) {
      var n = nextOcc(s.m, s.d);
      return '<div class="row2"><span>' + esc(s.t) + '<small style="display:block;color:var(--muted)">' + ur(s.d) + ' ' + HM[s.m - 1] + (n != null ? ' · ' + daysText(n) : '') + '</small></span><button class="qb" data-del="' + i + '" aria-label="ہٹائیں">✕</button></div>';
    }).join('') : '<p class="hint">ابھی کوئی تاریخ درج نہیں۔ نیچے نام اور ہجری تاریخ لکھ کر شامل کریں۔</p>';
  }
  function scheduleDates() {
    var LN = nativeLN(); if (!LN) return Promise.resolve();
    return LN.getPending().then(function (p) {
      var old = (p.notifications || []).filter(function (n) { return n.id >= 8000 && n.id < 9000; });
      return old.length ? LN.cancel({ notifications: old.map(function (n) { return { id: n.id }; }) }) : null;
    }).then(function () {
      var list = [], tn = todayNum(), t = now();
      (store('sdates') || []).forEach(function (s, i) {
        var n = nextOcc(s.m, s.d); if (n == null) return;
        var at = new Date(t.getFullYear(), t.getMonth(), t.getDate() + (n - tn), 9, 0, 0);
        if (at <= t) return;
        list.push({ id: 8000 + i, title: 'آج کی خاص تاریخ', body: s.t + ' (' + ur(s.d) + ' ' + HM[s.m - 1] + ')', channelId: 'prayer', schedule: { at: at, allowWhileIdle: true } });
      });
      return list.length ? LN.schedule({ notifications: list }) : null;
    }).catch(function () { /* ignore */ });
  }
  function buildDates() {
    var opts = HM.map(function (m, i) { return '<option value="' + (i + 1) + '">' + m + '</option>'; }).join('');
    var days = ''; for (var d = 1; d <= 30; d++) days += '<option value="' + d + '">' + ur(d) + '</option>';
    var s = addSection('secDates', 'خاص ہجری تاریخیں', '<div id="sdList"></div><div class="fld"><span>نام (مثلاً: شادی کی سالگرہ)</span><input id="sdName" placeholder="نام لکھیں" maxlength="40"></div>' +
      '<div class="cfgrow"><span>ہجری مہینہ</span><select id="sdM" aria-label="مہینہ">' + opts + '</select></div><div class="cfgrow"><span>دن</span><select id="sdD" aria-label="دن">' + days + '</select></div>' +
      '<button class="btn" id="sdAdd">شامل کریں</button><p class="hint">ایپ میں اس دن کی گنتی ہوم پر نظر آئے گی، اور فون میں نوٹیفکیشن کی اجازت ہو تو اس دن صبح ۹ بجے یاد دہانی آئے گی۔ ہجری تاریخ ایپ کی ترتیب (تاریخ میں ایڈجسٹمنٹ) کے مطابق نکلتی ہے۔</p>');
    if (!s) return;
    s.addEventListener('click', function (e) {
      var b = e.target.closest('[data-del]'); if (!b) return;
      var l = store('sdates') || []; l.splice(+b.dataset.del, 1); store('sdates', l); paintDates(); scheduleDates();
    });
    $('#sdAdd').addEventListener('click', function () {
      var t = $('#sdName').value.trim(); if (!t) { toast('پہلے نام لکھیں'); return; }
      var l = store('sdates') || []; if (l.length >= 40) { toast('زیادہ سے زیادہ ۴۰ تاریخیں'); return; }
      l.push({ t: t, m: +$('#sdM').value, d: +$('#sdD').value }); store('sdates', l); $('#sdName').value = ''; paintDates();
      var LN = nativeLN();
      if (LN) LN.requestPermissions().then(function () { return scheduleDates(); }).catch(function () { /* ignore */ });
      toast('شامل ہو گئی');
    });
    paintDates();
  }

  buildTiles(); buildDates(); buildKhatm(); buildRoza(); buildHome();
  setTimeout(scheduleDates, 1500);
  document.addEventListener('click', function (e) { if (e.target.closest('#tab-more') || e.target.closest('[data-go="more"]')) setTimeout(function () { if ($('#rzBtn')) { paintRoza(); paintKhatm(); paintDates(); } }, 0); });
  window.TaqweemExtras = { paintHome: paintHome, nextOcc: nextOcc };
  paintHome();
})();
