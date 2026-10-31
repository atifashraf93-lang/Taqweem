/* Taqweem: daily ayat and hadith. Full-screen popup, notification at a chosen time, and a shareable post image (WhatsApp status size).
   Quran text is read from the bundled Tanzil files, so every ayat is exact. Hadith come from hadith.js (with sources). */
(function () {
  'use strict';
  var Core = window.TaqweemCore, Data = window.TaqweemData;
  var DIGITS = '۰۱۲۳۴۵۶۷۸۹';
  function ur(n) { return String(n).replace(/\d/g, function (d) { return DIGITS[+d]; }); }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function store(key, val) {
    try {
      if (val === undefined) { var v = localStorage.getItem('taqweem.' + key); return v === null ? null : JSON.parse(v); }
      localStorage.setItem('taqweem.' + key, JSON.stringify(val));
    } catch (e) { /* storage unavailable */ }
    return null;
  }
  function toast(m) { var t = $('#toast'); if (!t) return; t.textContent = m; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(function () { t.hidden = true; }, 3200); }
  function nativeLN() { var C = window.Capacitor; return (C && C.isNativePlatform && C.isNativePlatform() && C.Plugins && C.Plugins.LocalNotifications) || null; }
  function isNative() { var C = window.Capacitor; return !!(C && C.isNativePlatform && C.isNativePlatform()); }

  /* ---------- content ---------- */
  /* Self-contained short ayat [surah, first, last]; text is read from the bundled Quran files. */
  var AY = [[94, 5, 6], [2, 152], [2, 153], [2, 186], [3, 139], [39, 53], [29, 69], [33, 56], [17, 23], [49, 13], [49, 10], [16, 90], [112, 1, 4], [103, 1, 3],
    [93, 3], [93, 5], [40, 60], [7, 199], [14, 7], [3, 200], [11, 115], [12, 87], [59, 18], [20, 14], [29, 45], [39, 10], [2, 201], [3, 8], [14, 40], [25, 74],
    [7, 23], [23, 118], [6, 162], [64, 11], [3, 185], [2, 110], [8, 46], [41, 34], [4, 58], [5, 8], [3, 134], [42, 43], [9, 51], [2, 286], [2, 255], [20, 25, 28], [2, 261], [31, 14]];
  var HD = window.HADITH || [];
  var BSM = 'بِسْمِ اللَّهِ الرَّحْمَـٰنِ الرَّحِيمِ';
  var Qp = null;
  function loadQ() {
    if (Qp) return Qp;
    if (!window.fetch) return (Qp = Promise.resolve(null));
    Qp = Promise.all([fetch('quran-ar.txt').then(function (r) { return r.ok ? r.text() : ''; }), fetch('translation-ur.txt').then(function (r) { return r.ok ? r.text() : ''; })]).then(function (a) {
      if (!a[0]) return null;
      return { ar: Core.parseTanzil(a[0]).map, ur: a[1] ? Core.parseTanzil(a[1]).map : {} };
    }).catch(function () { return null; });
    return Qp;
  }
  function cleanAr(t, s, a) {
    t = String(t || '').replace(/۞/g, '').replace(/\s+/g, ' ').trim();
    if (a === 1 && s !== 1 && s !== 9 && t.indexOf(BSM) === 0) t = t.slice(BSM.length).trim();
    return t;
  }
  function surahName(s) { var x = Data.SURAHS[s - 1]; return x ? x[0] : String(s); }
  /* ref -> {ar, ur, ref} */
  function ayat(q, ref) {
    var s = ref[0], a = ref[1], b = ref[2] || ref[1], ar = [], u = [];
    for (var i = a; i <= b; i++) {
      ar.push(cleanAr(q.ar[s] && q.ar[s][i - 1], s, i));
      if (q.ur[s] && q.ur[s][i - 1]) u.push(String(q.ur[s][i - 1]).replace(/\s+/g, ' ').trim());
    }
    return { ar: ar.join(' '), ur: u.join(' '), ref: 'سورۃ ' + surahName(s) + ' · آیت ' + ur(a) + (b > a ? '–' + ur(b) : '') + ' (' + ur(s) + ':' + ur(a) + (b > a ? '–' + ur(b) : '') + ')' };
  }
  function dayN(d) { d = d || new Date(); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); }
  /* same rule as the home-screen hadith card in app.js */
  function hadithIdx(d) { d = d || new Date(); var n = Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 0)) / 864e5); return (n + d.getFullYear()) % HD.length; }
  function ayatIdx(d) { return ((dayN(d) % AY.length) + AY.length) % AY.length; }
  function mode() { var m = store('dmode'); return m === 'ayat' || m === 'hadith' ? m : 'alt'; }
  function kindFor(d) { var m = mode(); return m === 'alt' ? (dayN(d) % 2 === 0 ? 'ayat' : 'hadith') : m; }
  /* item for a kind and date. Always resolves (hadith needs no Quran file). */
  function itemFor(kind, d) {
    if (kind === 'hadith') {
      var h = HD[hadithIdx(d)];
      return Promise.resolve(h ? { kind: 'hadith', label: 'آج کی حدیث', ar: h[1], ur: h[2], ref: h[3] } : null);
    }
    return loadQ().then(function (q) {
      if (!q) return null;
      var x = ayat(q, AY[ayatIdx(d)]);
      return { kind: 'ayat', label: 'آج کی آیت', ar: x.ar, ur: x.ur, ref: x.ref };
    });
  }

  /* ---------- full-screen popup ---------- */
  var pop = null, popItems = [];
  var ORN = '<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><rect x="6" y="6" width="12" height="12"/><rect x="6" y="6" width="12" height="12" transform="rotate(45 12 12)"/></svg>';
  function build() {
    if (pop) return;
    pop = document.createElement('div');
    pop.id = 'dpop'; pop.hidden = true; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'آج کی آیت اور حدیث');
    pop.innerHTML = '<div class="dp-top"><button class="dp-x" id="dpX" aria-label="بند کریں">✕</button><span id="dpDate"></span></div>' +
      '<div class="dp-track" id="dpTrack"></div><div class="dp-dots" id="dpDots"></div>' +
      '<div class="dp-btns"><button class="dp-p" id="dpPost">پوسٹ بنائیں</button><button id="dpShare">متن شیئر</button></div>' +
      '<button class="dp-go" id="dpClose">جزاک اللہ، آگے چلیں</button><div class="dp-note">دن میں ایک بار · ترتیبات (مزید ← روزانہ آیت و حدیث) سے بند کر سکتے ہیں</div>';
    (document.getElementById('app') || document.body).appendChild(pop);
    $('#dpX').addEventListener('click', closePop);
    $('#dpClose').addEventListener('click', closePop);
    $('#dpPost').addEventListener('click', function () { var it = popItems[cur()]; if (it) openPost(it); });
    $('#dpShare').addEventListener('click', function () { var it = popItems[cur()]; if (it) shareText(it); });
    $('#dpTrack').addEventListener('scroll', function () { paintDots(); });
  }
  function cur() { var t = $('#dpTrack'); if (!t) return 0; var w = t.clientWidth || 1; return Math.max(0, Math.min(popItems.length - 1, Math.round(Math.abs(t.scrollLeft) / w))); }
  function paintDots() { var c = cur(); $$('#dpDots i').forEach(function (d, i) { d.className = i === c ? 'on' : ''; }); }
  function fit(len) { return len > 260 ? 20 : len > 160 ? 23 : len > 90 ? 26 : 30; }
  function showPop(focusKind) {
    build();
    Promise.all([itemFor('ayat'), itemFor('hadith')]).then(function (a) {
      popItems = a.filter(Boolean);
      if (!popItems.length) return;
      /* today's chosen kind first */
      var k = focusKind || kindFor();
      popItems.sort(function (x, y) { return (x.kind === k ? 0 : 1) - (y.kind === k ? 0 : 1); });
      var g = Core.hijriFromDayNum(Core.dayNumOf(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()), typeof store('hoff') === 'number' ? store('hoff') : -1);
      $('#dpDate').textContent = g ? ur(g.d) + ' ' + Data.HIJRI_MONTHS[g.m - 1] + ' ' + ur(g.y) + 'ھ' : '';
      $('#dpTrack').innerHTML = popItems.map(function (it) {
        return '<div class="dp-slide"><div class="dp-orn">' + ORN + '</div><div class="dp-lab">' + it.label + '</div><div class="dp-ar" style="font-size:' + fit(it.ar.length) + 'px">' + esc(it.ar) + '</div>' +
          '<div class="dp-ur">' + esc(it.ur) + '</div><div class="dp-ref">' + esc(it.ref) + '</div></div>';
      }).join('');
      $('#dpDots').innerHTML = popItems.length > 1 ? popItems.map(function () { return '<i></i>'; }).join('') : '';
      $('#dpTrack').scrollLeft = 0; paintDots();
      pop.hidden = false;
      store('dpopday', Core.dateKey(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()));
    });
  }
  function closePop() { if (pop) pop.hidden = true; }
  function maybeAutoPop() {
    if (store('dpop') === false) return;
    var k = Core.dateKey(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
    if (store('dpopday') === k) return;
    showPop();
  }

  /* ---------- text share ---------- */
  function shareText(it) {
    var text = it.ar + '\n\n' + it.ur + '\n\n— ' + it.ref + '\n(تقویم، Developed by SMAA)';
    if (navigator.share) navigator.share({ text: text }).catch(function () { /* cancelled */ });
    else if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { toast('نقل کر لی گئی'); }).catch(function () { toast('شیئر نہیں ہو سکا'); });
  }

  /* ---------- post image ---------- */
  var STYLES = {
    green: { name: 'سبز', bg: ['#0A1B19', '#16352F'], fg: '#F4EFE3', mut: '#A9BDB6', acc: '#E2B861', line: '#2A514A' },
    cream: { name: 'کریم', bg: ['#F6F1E4', '#EDE6D3'], fg: '#1B2B28', mut: '#5E6F6A', acc: '#8A5A00', line: '#CFC4A6' },
    night: { name: 'نیلا', bg: ['#0B1426', '#17305A'], fg: '#F3F1EA', mut: '#B5C0D6', acc: '#E0BB63', line: '#35507F' }
  };
  var post = { item: null, style: 'green', fmt: 'story', url: '', blob: null };
  function wrap(ctx, text, maxW) {
    var words = String(text).split(/\s+/), lines = [], line = '';
    words.forEach(function (w) {
      var t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
    });
    if (line) lines.push(line);
    return lines;
  }
  function fontsReady() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    var t = new Promise(function (res) { setTimeout(res, 1800); });
    return Promise.race([Promise.all([document.fonts.load('60px Amiri', 'بسم'), document.fonts.load('40px "Noto Nastaliq Urdu"', 'بسم')]).catch(function () { /* ignore */ }), t]);
  }
  function drawPost(it, styleKey, fmt) {
    var S = STYLES[styleKey] || STYLES.green, W = 1080, H = fmt === 'sq' ? 1080 : 1920;
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var c = cv.getContext('2d');
    var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, S.bg[0]); g.addColorStop(1, S.bg[1]);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.strokeStyle = S.acc; c.globalAlpha = 0.55; c.lineWidth = 3; c.strokeRect(36, 36, W - 72, H - 72);
    c.globalAlpha = 0.25; c.strokeRect(52, 52, W - 104, H - 104); c.globalAlpha = 1;
    c.textAlign = 'center'; c.direction = 'rtl'; c.textBaseline = 'alphabetic';
    var top = fmt === 'sq' ? 100 : 190;
    /* ornament */
    var ox = W / 2, oy = top + 40, r = fmt === 'sq' ? 34 : 52;
    c.strokeStyle = S.acc; c.lineWidth = 4;
    c.strokeRect(ox - r, oy - r, r * 2, r * 2);
    c.save(); c.translate(ox, oy); c.rotate(Math.PI / 4); c.strokeRect(-r, -r, r * 2, r * 2); c.restore();
    var y = oy + r * 1.4 + 60;
    c.fillStyle = S.acc; c.font = '600 44px "Noto Nastaliq Urdu", serif'; c.fillText(it.label, W / 2, y);
    y += 40;
    /* bottom block */
    var footH = fmt === 'sq' ? 130 : 200, bottom = H - footH - 20, maxW = W - 220;
    /* fit arabic + urdu into the space between y and bottom */
    var ar = it.ar, uu = it.ur, as = fmt === 'sq' ? 52 : 66, us = fmt === 'sq' ? 32 : 40, aL, uL, ah, uh, total;
    var min = fmt === 'sq' ? 26 : 30;
    for (; ;) {
      c.font = as + 'px Amiri, "Noto Naskh Arabic", serif'; aL = wrap(c, ar, maxW); ah = aL.length * as * 1.9;
      c.font = us + 'px "Noto Nastaliq Urdu", serif'; uL = wrap(c, uu, maxW); uh = uL.length * us * 2.05;
      total = ah + uh + 120;
      if (total <= bottom - y || (as <= min && us <= min * 0.62)) break;
      as = Math.max(min, as - 3); us = Math.max(Math.round(min * 0.62), us - 2);
    }
    var start = y + Math.max(0, (bottom - y - total) / 2);
    var yy = start + as * 1.5;
    c.fillStyle = S.fg; c.font = as + 'px Amiri, "Noto Naskh Arabic", serif';
    aL.forEach(function (l) { c.fillText(l, W / 2, yy); yy += as * 1.9; });
    yy += 20; c.strokeStyle = S.line; c.lineWidth = 2; c.beginPath(); c.moveTo(W / 2 - 90, yy - 30); c.lineTo(W / 2 + 90, yy - 30); c.stroke();
    yy += 40; c.fillStyle = S.mut === S.fg ? S.fg : S.fg; c.globalAlpha = 0.92; c.font = us + 'px "Noto Nastaliq Urdu", serif';
    uL.forEach(function (l) { c.fillText(l, W / 2, yy); yy += us * 2.05; });
    c.globalAlpha = 1; yy += 10; c.fillStyle = S.acc; c.font = '600 ' + Math.max(28, us - 4) + 'px "Noto Nastaliq Urdu", serif';
    wrap(c, it.ref, maxW).forEach(function (l) { c.fillText(l, W / 2, yy); yy += us * 1.8; });
    /* footer */
    c.fillStyle = S.mut; c.font = '34px "Noto Nastaliq Urdu", serif'; c.fillText('تقویم', W / 2, H - footH + 40);
    c.direction = 'ltr'; c.font = '28px Amiri, serif'; c.fillText('Developed by SMAA', W / 2, H - footH + 90);
    return cv;
  }
  var postEl = null;
  function openPost(it) {
    post.item = it;
    if (!postEl) {
      postEl = document.createElement('div');
      postEl.id = 'dpost'; postEl.hidden = true; postEl.setAttribute('role', 'dialog'); postEl.setAttribute('aria-label', 'پوسٹ');
      postEl.innerHTML = '<div class="dq-top"><button class="dp-x" id="dqX" aria-label="بند کریں">✕</button><b>واٹس ایپ اسٹیٹس پوسٹ</b></div>' +
        '<div class="dq-view"><img id="dqImg" alt="پوسٹ کا نمونہ"><div class="dq-wait" id="dqWait">بن رہی ہے…</div></div>' +
        '<div class="dq-row" id="dqStyles"></div><div class="dq-row" id="dqFmt"><button data-f="story">اسٹیٹس (۹:۱۶)</button><button data-f="sq">مربع</button></div>' +
        '<div class="dq-row"><button class="dp-p" id="dqShare">شیئر / اسٹیٹس لگائیں</button></div><div class="dq-note" id="dqNote"></div>';
      (document.getElementById('app') || document.body).appendChild(postEl);
      $('#dqStyles').innerHTML = Object.keys(STYLES).map(function (k) { return '<button data-s="' + k + '">' + STYLES[k].name + '</button>'; }).join('');
      $('#dqX').addEventListener('click', function () { postEl.hidden = true; });
      postEl.addEventListener('click', function (e) {
        var b = e.target.closest('[data-s]'); if (b) { post.style = b.dataset.s; paintPost(); return; }
        b = e.target.closest('[data-f]'); if (b) { post.fmt = b.dataset.f; paintPost(); }
      });
      $('#dqShare').addEventListener('click', sharePost);
    }
    postEl.hidden = false; paintPost();
  }
  function paintPost() {
    $$('#dqStyles button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.s === post.style)); });
    $$('#dqFmt button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.f === post.fmt)); });
    $('#dqWait').hidden = false; $('#dqNote').textContent = '';
    var token = (post.token = (post.token || 0) + 1);
    fontsReady().then(function () {
      if (token !== post.token) return;
      var cv = drawPost(post.item, post.style, post.fmt);
      cv.toBlob(function (blob) {
        if (token !== post.token || !blob) return;
        post.blob = blob;
        if (post.url) URL.revokeObjectURL(post.url);
        post.url = URL.createObjectURL(blob);
        $('#dqImg').src = post.url; $('#dqImg').className = post.fmt; $('#dqWait').hidden = true;
      }, 'image/png');
    });
  }
  function blobToB64(blob) {
    return new Promise(function (res, rej) { var r = new FileReader(); r.onloadend = function () { res(String(r.result).split(',')[1]); }; r.onerror = rej; r.readAsDataURL(blob); });
  }
  function sharePost() {
    if (!post.blob) return;
    var P = window.Capacitor && window.Capacitor.Plugins, name = 'taqweem-post-' + Date.now() + '.png';
    if (isNative() && P && P.Filesystem && P.Share) {
      blobToB64(post.blob).then(function (b64) {
        return P.Filesystem.writeFile({ path: name, data: b64, directory: 'CACHE' });
      }).then(function (r) { return P.Share.share({ title: 'تقویم', dialogTitle: 'پوسٹ شیئر کریں', files: [r.uri] }); })
        .catch(function (e) { if (!e || !/cancel/i.test(String(e.message || e))) fallbackShow(); });
      return;
    }
    try {
      var f = new File([post.blob], name, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [f] })) { navigator.share({ files: [f] }).catch(function () { /* cancelled */ }); return; }
    } catch (e) { /* fall through */ }
    fallbackShow();
  }
  function fallbackShow() {
    $('#dqNote').innerHTML = 'تصویر کو دیر تک دبائیں اور محفوظ کریں، یا <a href="' + post.url + '" download="taqweem-post.png">یہاں سے ڈاؤن لوڈ کریں</a>۔';
  }

  /* ---------- daily notification ---------- */
  function timeParts() { var t = String(store('dtime') || '07:00').split(':'); return [Math.min(23, +t[0] || 0), Math.min(59, +t[1] || 0)]; }
  function ensureChannel(LN) {
    if (!LN.createChannel) return Promise.resolve();
    return LN.createChannel({ id: 'daily', name: 'روزانہ آیت و حدیث', description: 'روزانہ مقررہ وقت پر آیت یا حدیث', importance: 4, vibration: true, visibility: 1 }).catch(function () { /* ignore */ });
  }
  function scheduleDaily() {
    var LN = nativeLN();
    if (!LN) return Promise.resolve();
    var on = !!store('dnote');
    return LN.getPending().then(function (p) {
      var old = (p.notifications || []).filter(function (n) { return n.id >= 7000 && n.id < 8000; });
      return old.length ? LN.cancel({ notifications: old.map(function (n) { return { id: n.id }; }) }) : null;
    }).then(function () {
      if (!on) return null;
      var tp = timeParts(), now = new Date(), jobs = [];
      for (var d = 0; d < 14; d++) {
        (function (d) {
          var date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d, tp[0], tp[1], 0);
          if (date <= now) return;
          jobs.push(itemFor(kindFor(date), date).then(function (it) {
            if (!it) return null;
            var short = it.ur.length > 150 ? it.ur.slice(0, 147) + '…' : it.ur;
            return { id: 7000 + d, title: it.label, body: short + ' — ' + it.ref, largeBody: it.ar + '\n\n' + it.ur + '\n\n— ' + it.ref, summaryText: 'تقویم', channelId: 'daily', extra: { daily: it.kind }, schedule: { at: date, allowWhileIdle: true } };
          }));
        })(d);
      }
      return Promise.all(jobs).then(function (list) {
        list = list.filter(Boolean);
        return ensureChannel(LN).then(function () { return list.length ? LN.schedule({ notifications: list }) : null; });
      });
    }).catch(function () { /* notifications unavailable */ });
  }

  /* ---------- settings card (More tab) ---------- */
  function buildSettings() {
    var more = $('#tab-more'); if (!more || $('#secDaily')) return;
    var sec = document.createElement('details'); sec.className = 'sec'; sec.id = 'secDaily';
    var native = !!nativeLN();
    sec.innerHTML = '<summary>روزانہ آیت و حدیث</summary><div class="body">' +
      '<div class="seg"><span>ایپ کھولنے پر پاپ اپ:</span><button id="dpopBtn" aria-pressed="true">چالو</button></div>' +
      (native ? '<div class="seg"><span>روزانہ نوٹیفکیشن:</span><button id="dnoteBtn" aria-pressed="false">بند</button></div>' +
        '<div class="cfgrow"><span>وقت</span><input type="time" id="dTime" value="07:00" aria-label="وقت"></div>' : '') +
      '<div class="seg" id="dModeRow" style="flex-wrap:wrap"><span>کیا آئے:</span><button data-dm="alt">ایک دن آیت، ایک دن حدیث</button><button data-dm="ayat">صرف آیت</button><button data-dm="hadith">صرف حدیث</button></div>' +
      '<div class="seg"><span></span><button id="dNow">ابھی دیکھیں</button><button id="dPostNow">آج کی پوسٹ بنائیں</button></div>' +
      '<p class="hint">آیات اور ترجمہ ایپ کے اندر موجود قرآن کی فائل سے آتے ہیں، حدیث حوالے کے ساتھ۔ نوٹیفکیشن کے لیے فون کی نوٹیفکیشن اجازت ضروری ہے' + (native ? '۔' : ' اور یہ سہولت صرف ایپ میں ہے۔') + '</p></div>';
    var first = $('details.sec', more); more.insertBefore(sec, first);
    function paint() {
      $('#dpopBtn').setAttribute('aria-pressed', String(store('dpop') !== false)); $('#dpopBtn').textContent = store('dpop') === false ? 'بند' : 'چالو';
      if (native) { var n = !!store('dnote'); $('#dnoteBtn').setAttribute('aria-pressed', String(n)); $('#dnoteBtn').textContent = n ? 'چالو' : 'بند'; $('#dTime').value = String(store('dtime') || '07:00'); }
      $$('#dModeRow [data-dm]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.dm === mode())); });
    }
    paint();
    $('#dpopBtn').addEventListener('click', function () { store('dpop', store('dpop') === false); paint(); });
    $('#dModeRow').addEventListener('click', function (e) { var b = e.target.closest('[data-dm]'); if (!b) return; store('dmode', b.dataset.dm); paint(); scheduleDaily(); });
    $('#dNow').addEventListener('click', function () { showPop(); });
    $('#dPostNow').addEventListener('click', function () { itemFor(kindFor()).then(function (it) { if (it) openPost(it); }); });
    if (native) {
      var LN = nativeLN();
      $('#dnoteBtn').addEventListener('click', function () {
        if (store('dnote')) { store('dnote', false); paint(); scheduleDaily(); toast('روزانہ نوٹیفکیشن بند'); return; }
        LN.requestPermissions().then(function (r) {
          if (r && r.display === 'granted') { store('dnote', true); paint(); scheduleDaily(); toast('روزانہ ' + $('#dTime').value + ' بجے آیت یا حدیث آئے گی'); }
          else toast('نوٹیفکیشن کی اجازت نہیں ملی');
        }).catch(function () { toast('نوٹیفکیشن چالو نہیں ہو سکے'); });
      });
      $('#dTime').addEventListener('change', function () { if (this.value) { store('dtime', this.value); scheduleDaily(); toast('وقت محفوظ: ' + this.value); } });
    }
  }

  /* ---------- wiring ---------- */
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-dpop]')) showPop();
  });
  var LN0 = nativeLN();
  if (LN0 && LN0.addListener) {
    LN0.addListener('localNotificationActionPerformed', function (ev) {
      var n = ev && ev.notification;
      if (n && n.id >= 7000 && n.id < 8000) showPop(n.extra && n.extra.daily);
    });
  }
  buildSettings();
  setTimeout(function () { maybeAutoPop(); scheduleDaily(); }, 900);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') scheduleDaily(); });

  window.TaqweemDaily = { show: showPop, post: openPost, itemFor: itemFor, kindFor: kindFor, loadQ: loadQ, ayat: ayat, cleanAr: cleanAr, drawPost: drawPost, schedule: scheduleDaily, esc: esc, ur: ur, store: store, toast: toast };
})();
