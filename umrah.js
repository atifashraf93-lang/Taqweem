/* Taqweem: Umrah and Hajj guide (Hanafi), counters and trip tracker. Data in umrah-data.js; everything is saved on the phone. */
(function () {
  'use strict';
  var U = window.UMRAH, D = window.TaqweemDaily;
  if (!U || !D) return;
  var esc = D.esc, ur = D.ur;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  var KEY = 'umrah.v1';
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  var S = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function g(k, d) { return S[k] === undefined ? d : S[k]; }
  function set(k, v) { S[k] = v; save(); }
  function buzz(n) { try { if (navigator.vibrate) navigator.vibrate(n || 25); } catch (e) {} }
  function rich(t) { return esc(t).replace(/ﷺ/g, '<span class="sal">صلی اللہ علیہ وسلم</span>').replace(/(رضی اللہ عن(?:ہ|ہا|ہم|ہما|ہن))/g, '<span class="rz">$1</span>'); }
  function dua(d) { return d ? '<div class="udua"><div class="uar">' + esc(d.ar) + '</div><div class="uur">' + rich(d.ur) + '</div></div>' : ''; }
  var TABS = [['umrah', 'عمرہ'], ['hajj', 'حج'], ['track', 'ٹریکر'], ['places', 'مقامات'], ['help', 'مدد']];
  var el = null, tab = 'umrah';

  function steps(list, pre) {
    var done = g('done', {}), n = list.filter(function (x) { return done[x.id]; }).length;
    return '<div class="uprog"><span style="width:' + Math.round(n / list.length * 100) + '%"></span><b>' + ur(n) + ' / ' + ur(list.length) + ' مراحل مکمل</b></div>' +
      list.map(function (x, i) {
        return '<details class="ustep' + (done[x.id] ? ' ok' : '') + '"><summary><span class="un">' + ur(i + 1) + '</span><span class="ut">' + (x.d ? '<small>' + esc(x.d) + '</small>' : '') + rich(x.t) + '</span><button class="uck" data-ud="' + x.id + '" aria-label="مکمل">' + (done[x.id] ? '✓' : '') + '</button></summary><div class="ubody">' +
          x.b.map(function (p) { return '<p>' + rich(p) + '</p>'; }).join('') + dua(x.dua) + '</div></details>';
      }).join('');
  }
  function pUmrah() { return '<div class="unote">' + esc(U.note) + '</div>' + steps(U.umrah); }
  function pHajj() {
    var H = U.hajj;
    return '<div class="unote">' + esc(U.note) + '</div>' +
      '<div class="ubox"><h3>حج کی اقسام</h3>' + H.types.map(function (t) { return '<p><b>' + esc(t[0]) + ':</b> ' + esc(t[1]) + '</p>'; }).join('') + '</div>' +
      '<div class="ubox"><h3>فرائض</h3><ul>' + H.fard.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul><h3>واجبات</h3><ul>' + H.wajib.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' +
      '<div class="usec">دن بہ دن ترتیب</div>' + steps(H.days) +
      '<div class="ubox"><h3>مدینہ منورہ</h3>' + U.madina.map(function (m) { return '<p><b>' + rich(m.t) + '</b></p>' + m.b.map(function (p) { return '<p>' + rich(p) + '</p>'; }).join('') + dua(m.dua); }).join('') + '</div>';
  }

  /* ---- tracker ---- */
  var RAMI = [['10', 'جمرۃ العقبہ', [['aq', 'جمرۃ العقبہ']]], ['11', '11 ذوالحجہ', [['a', 'جمرۂ اولیٰ'], ['b', 'وسطیٰ'], ['c', 'عقبہ']]], ['12', '12 ذوالحجہ', [['a', 'جمرۂ اولیٰ'], ['b', 'وسطیٰ'], ['c', 'عقبہ']]], ['13', '13 ذوالحجہ', [['a', 'جمرۂ اولیٰ'], ['b', 'وسطیٰ'], ['c', 'عقبہ']]]];
  function counter(id, title, cur, max, hint, btn, extra) {
    var pct = Math.round(cur / max * 100), full = cur >= max;
    return '<div class="ubox ucount"><h3>' + title + '</h3><div class="uring" style="--p:' + pct + '"><b>' + ur(cur) + '</b><small>/ ' + ur(max) + '</small></div><p class="uhint">' + (full ? '<b class="ugood">✓ مکمل — اللہ قبول فرمائے</b>' : hint) + '</p>' +
      (extra || '') + '<div class="urow"><button class="ubtn big" data-uc="' + id + '"' + (full ? ' disabled' : '') + '>' + btn + '</button><button class="ubtn" data-uu="' + id + '">↩ واپس</button><button class="ubtn" data-ur="' + id + '">صفر</button></div></div>';
  }
  function pTrack() {
    var t = g('tawaf', 0), s = g('sai', 0), h = '';
    h += counter('tawaf', 'طواف کاؤنٹر', t, 7, t === 0 ? 'حجرِ اسود کے سامنے سے شروع کریں۔ ہر چکر پورا ہونے پر بٹن دبائیں۔' : (t < 3 ? 'چکر ' + ur(t + 1) + ' شروع کریں۔ مرد: رمل (اکڑ کر تیز قدم)، رش ہو تو چھوڑ دیں۔' : 'چکر ' + ur(t + 1) + ' شروع کریں۔ حجرِ اسود پر استلام کریں۔'), '＋ ایک چکر مکمل', t === 7 ? '' : '') +
      (t >= 7 ? '<div class="unote">اب مقامِ ابراہیم کے پاس دو رکعت واجب پڑھیں، پھر زمزم اور سعی۔</div>' : '');
    var dir = s >= 7 ? '' : (s % 2 === 0 ? 'صفا ← مروہ' : 'مروہ ← صفا');
    h += counter('sai', 'سعی کاؤنٹر', s, 7, 'اگلا چکر: <b>' + dir + '</b>۔ پہلا صفا سے، ساتواں مروہ پر ختم۔', '＋ ایک چکر مکمل');
    var ra = g('rami', {});
    h += '<div class="ubox"><h3>رمی کاؤنٹر (ہر ایک 7 کنکر)</h3>' + RAMI.map(function (d) {
      return '<div class="uday"><b>' + esc(d[1]) + '</b>' + d[2].map(function (j) {
        var k = d[0] + j[0], c = ra[k] || 0;
        return '<div class="ujam"><span>' + esc(j[1]) + '</span><button class="ubtn" data-um="' + k + '"' + (c >= 7 ? ' disabled' : '') + '>' + (c >= 7 ? '✓ ۷' : '＋ ' + ur(c) + '/۷') + '</button><button class="ux" data-umr="' + k + '" aria-label="صفر">↺</button></div>';
      }).join('') + '</div>';
    }).join('') + '</div>';
    // notes
    var N = g('notes', {}), fields = [['hotelM', 'مکہ: ہوٹل اور کمرہ نمبر'], ['hotelD', 'مدینہ: ہوٹل اور کمرہ نمبر'], ['leader', 'گروپ لیڈر/معلم کا نام'], ['phone', 'گروپ لیڈر کا فون'], ['meet', 'گم ہو جانے پر ملنے کی جگہ (مثلاً گیٹ نمبر)'], ['flight', 'فلائٹ اور تاریخیں'], ['emerg', 'ایمرجنسی رابطہ (گھر والے)'], ['other', 'دیگر نوٹس']];
    h += '<div class="ubox"><h3>میرا سفر</h3>' + fields.map(function (f) { return '<label class="ufld"><span>' + f[1] + '</span><input data-un="' + f[0] + '" value="' + esc(N[f[0]] || '') + '" ' + (f[0] === 'phone' || f[0] === 'emerg' ? 'type="tel" dir="ltr"' : '') + '></label>'; }).join('') +
      (N.phone ? '<a class="ubtn big" href="tel:' + esc(N.phone) + '" style="display:block;text-align:center;text-decoration:none">📞 گروپ لیڈر کو کال</a>' : '') + '</div>';
    // packing
    var pk = g('pack', {}), custom = g('packx', []), total = 0, got = 0;
    var ph = U.packing.map(function (c, ci) {
      return '<div class="uday"><b>' + esc(c[0]) + '</b>' + c[1].map(function (it, ii) { var k = ci + '_' + ii; total++; if (pk[k]) got++; return '<label class="uchk"><input type="checkbox" data-up="' + k + '"' + (pk[k] ? ' checked' : '') + '><span>' + esc(it) + '</span></label>'; }).join('') + '</div>';
    }).join('') + '<div class="uday"><b>میری اپنی چیزیں</b>' + custom.map(function (it, ii) { var k = 'x' + ii; total++; if (pk[k]) got++; return '<label class="uchk"><input type="checkbox" data-up="' + k + '"' + (pk[k] ? ' checked' : '') + '><span>' + esc(it) + '</span><button class="ux" data-upd="' + ii + '" aria-label="حذف">✕</button></label>'; }).join('') + '<div class="urow"><input id="upx" class="ufi" placeholder="کوئی چیز شامل کریں…"><button class="ubtn" id="upa">＋</button></div></div>';
    h += '<div class="ubox"><h3>سامان کی فہرست <small>(' + ur(got) + '/' + ur(total) + ')</small></h3>' + ph + '</div>';
    return h;
  }

  /* ---- places ---- */
  function mapUrl(q) { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q); }
  function hav(a, b, c, d) { var R = 6371, p = Math.PI / 180, x = Math.sin((c - a) * p / 2) * Math.sin((c - a) * p / 2) + Math.cos(a * p) * Math.cos(c * p) * Math.sin((d - b) * p / 2) * Math.sin((d - b) * p / 2); return 2 * R * Math.asin(Math.sqrt(x)); }
  function pPlaces() {
    var h = '<div class="ubox"><h3>میرے قریب</h3><p class="uhint">گوگل میپس میں آپ کی موجودہ جگہ کے قریب کھلتا ہے۔</p><div class="uchips">' +
      [['🏧', 'ATM', 'ATM near me'], ['💊', 'فارمیسی', 'pharmacy near me'], ['🏥', 'ہسپتال', 'hospital near me'], ['🍽', 'کھانا', 'restaurant near me'], ['🚻', 'واش روم', 'public toilet near me'], ['🕌', 'مسجد', 'mosque near me'], ['💱', 'کرنسی ایکسچینج', 'currency exchange near me'], ['🏨', 'ہوٹل', 'hotel near me']].map(function (x) { return '<a class="uchip" target="_blank" rel="noopener" href="' + mapUrl(x[2]) + '">' + x[0] + ' ' + x[1] + '</a>'; }).join('') + '</div></div>' +
      '<div class="ubox"><h3>حرمین سے میری دوری</h3><p class="uhint" id="udist">آپ کی لوکیشن سے فاصلہ۔</p><button class="ubtn big" id="ugeo">📍 فاصلہ معلوم کریں</button></div>';
    var gr = '';
    U.places.forEach(function (p) {
      if (p.g !== gr) { gr = p.g; h += '<div class="usec">' + esc(gr) + '</div>'; }
      h += '<div class="ubox uplace"><b>' + rich(p.t) + '</b><p>' + rich(p.d) + '</p><a class="ubtn" target="_blank" rel="noopener" href="' + mapUrl(p.q) + '">🗺 نقشہ / راستہ</a></div>';
    });
    return h;
  }

  /* ---- help ---- */
  function pHelp() {
    return '<div class="ubox"><h3>سعودی ایمرجنسی نمبر</h3>' + U.emergency.map(function (e) { return '<div class="uem"><span>' + esc(e[0]) + '</span><a class="ubtn" href="tel:' + e[1] + '" dir="ltr">📞 ' + e[1] + '</a></div>'; }).join('') + '<p class="uhint">اپنے ملک کے سفارت خانے/قونصل خانے کا نمبر بھی ایپ کے "میرا سفر" نوٹس میں محفوظ کر لیں۔</p></div>' +
      U.tips.map(function (t) { return '<div class="ubox"><h3>' + esc(t[0]) + '</h3><p>' + esc(t[1]) + '</p></div>'; }).join('') +
      '<div class="unote">یہ ایپ ایک مددگار رہنما ہے، سرکاری ہدایات یا آپ کے معلم کی بات پر عمل مقدم ہے۔</div>';
  }

  var PAGES = { umrah: pUmrah, hajj: pHajj, track: pTrack, places: pPlaces, help: pHelp };
  function paint(keep) {
    var sc = $('#uBody'), y = keep && sc ? sc.scrollTop : 0;
    sc.innerHTML = PAGES[tab]();
    sc.scrollTop = y;
    $$('#uTabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.ut === tab); });
    wire();
  }
  function wire() {
    $$('[data-ud]').forEach(function (b) { b.onclick = function (e) { e.preventDefault(); e.stopPropagation(); var d = g('done', {}); d[b.dataset.ud] = !d[b.dataset.ud]; set('done', d); buzz(); paint(true); }; });
    var max = { tawaf: 7, sai: 7 };
    $$('[data-uc]').forEach(function (b) { b.onclick = function () { var k = b.dataset.uc; set(k, Math.min(max[k], g(k, 0) + 1)); buzz(g(k, 0) >= max[k] ? [60, 40, 60] : 25); paint(true); }; });
    $$('[data-uu]').forEach(function (b) { b.onclick = function () { var k = b.dataset.uu; set(k, Math.max(0, g(k, 0) - 1)); paint(true); }; });
    $$('[data-ur]').forEach(function (b) { b.onclick = function () { set(b.dataset.ur, 0); paint(true); }; });
    $$('[data-um]').forEach(function (b) { b.onclick = function () { var r = g('rami', {}); r[b.dataset.um] = Math.min(7, (r[b.dataset.um] || 0) + 1); set('rami', r); buzz(r[b.dataset.um] >= 7 ? [60, 40, 60] : 20); paint(true); }; });
    $$('[data-umr]').forEach(function (b) { b.onclick = function () { var r = g('rami', {}); r[b.dataset.umr] = 0; set('rami', r); paint(true); }; });
    $$('[data-un]').forEach(function (i) { i.oninput = function () { var n = g('notes', {}); n[i.dataset.un] = i.value; set('notes', n); }; i.onchange = function () { paint(true); }; });
    $$('[data-up]').forEach(function (c) { c.onchange = function () { var p = g('pack', {}); p[c.dataset.up] = c.checked; set('pack', p); paint(true); }; });
    var pa = $('#upa'); if (pa) pa.onclick = function () { var v = $('#upx').value.trim(); if (!v) return; var x = g('packx', []); x.push(v); set('packx', x); paint(true); };
    $$('[data-upd]').forEach(function (b) { b.onclick = function (e) { e.preventDefault(); var x = g('packx', []), i = +b.dataset.upd, p = g('pack', {}); x.splice(i, 1); set('packx', x); set('pack', {}); paint(true); }; });
    var ge = $('#ugeo'); if (ge) ge.onclick = function () {
      var o = $('#udist'); o.textContent = 'لوکیشن لی جا رہی ہے…';
      try { navigator.geolocation.getCurrentPosition(function (p) {
        var a = p.coords.latitude, b = p.coords.longitude, m = hav(a, b, 21.4225, 39.8262), d = hav(a, b, 24.4672, 39.6111);
        function f(k) { return k < 1 ? Math.round(k * 1000) + ' میٹر' : k.toFixed(k < 10 ? 1 : 0) + ' کلومیٹر'; }
        o.innerHTML = 'مسجد الحرام: <b dir="ltr">' + f(m) + '</b><br>مسجدِ نبوی: <b dir="ltr">' + f(d) + '</b>';
      }, function () { o.textContent = 'لوکیشن نہیں ملی۔ فون میں لوکیشن آن کر کے اجازت دیں۔'; }, { timeout: 10000, maximumAge: 60000 }); } catch (e) { o.textContent = 'لوکیشن دستیاب نہیں۔'; }
    };
  }
  function build() {
    if (el) return;
    el = document.createElement('div'); el.id = 'umrah'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'عمرہ و حج');
    el.innerHTML = '<button class="back" id="uBack"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>واپس</button>' +
      '<div class="uhero"><img src="img/b_umrah.svg" alt=""><h2>عمرہ و حج</h2><small>حنفی فقہ کے مطابق رہنما اور ٹریکر</small></div>' +
      '<div id="uTabs">' + TABS.map(function (t) { return '<button data-ut="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div><div id="uBody"></div>';
    (document.getElementById('app') || document.body).appendChild(el);
    $('#uBack').onclick = function () { el.hidden = true; };
    $('#uTabs').onclick = function (e) { var b = e.target.closest('[data-ut]'); if (!b) return; tab = b.dataset.ut; paint(); $('#uBody').scrollTop = 0; };
  }
  function open() { build(); el.hidden = false; paint(); }
  document.addEventListener('click', function (e) { if (e.target.closest('[data-umrah]')) open(); });
  window.TaqweemUmrah = { open: open };
})();
