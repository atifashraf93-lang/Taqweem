/* Taqweem app: UI and device features. Depends on core.js and data.js. */
(function () {
  'use strict';

  var Core = window.TaqweemCore, Data = window.TaqweemData;
  var SURAHS = Data.SURAHS, CITIES = Data.CITIES;
  var DIGITS = '۰۱۲۳۴۵۶۷۸۹';
  var RECITER = 'شیخ عبدالرحمٰن السدیس';

  function ur(n) { return String(n).replace(/\d/g, function (d) { return DIGITS[+d]; }); }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function store(key, val) {
    try {
      if (val === undefined) {
        var v = localStorage.getItem('taqweem.' + key);
        return v === null ? null : JSON.parse(v);
      }
      localStorage.setItem('taqweem.' + key, JSON.stringify(val));
    } catch (e) { /* storage unavailable */ }
    return null;
  }

  var ICON_PLAY = '<svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>';
  var ICON_PAUSE = '<svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>';
  var ICON_STAR = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E2B861" stroke-width="1.8" aria-hidden="true"><rect x="6" y="6" width="12" height="12"/><rect x="6" y="6" width="12" height="12" transform="rotate(45 12 12)"/></svg>';
  var ICON_CHECK = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  /* ---------- state ---------- */
  var state = {
    tab: 'qibla',
    loc: store('loc') || { name: CITIES[0].name, lat: CITIES[0].lat, lng: CITIES[0].lng, src: 'default' },
    asr: store('asr') === 1 ? 1 : 2,
    hoff: typeof store('hoff') === 'number' ? store('hoff') : -1
  };
  var cal = { y: 0, m: 0 };

  /* ---------- toast ---------- */
  var toastTimer = 0;
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 3200);
  }

  /* ---------- tabs ---------- */
  function showTab(name) {
    state.tab = name;
    $$('.tab').forEach(function (s) { s.hidden = s.id !== 'tab-' + name; });
    $$('#nav button').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.tab === name ? 'true' : 'false'); });
    if (name === 'prayer') renderPrayer();
    if (name === 'cal') renderCal();
    if (name === 'recite') { renderSurahs(); renderFavChips(); }
    if (name === 'more') { paintTas(); paintTrk(); }
  }
  $('#nav').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-tab]');
    if (b) showTab(b.dataset.tab);
  });

  /* ---------- location ---------- */
  function nearestCity(lat, lng) {
    var best = null, bd = 1e9;
    CITIES.forEach(function (c) {
      var dLat = (c.lat - lat) * Math.PI / 180, dLng = (c.lng - lng) * Math.PI / 180;
      var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat * Math.PI / 180) * Math.cos(c.lat * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
      var d = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      if (d < bd) { bd = d; best = c; }
    });
    return bd < 40 ? best : null;
  }

  function setLoc(l) {
    state.loc = l;
    store('loc', l);
    $$('.locname').forEach(function (el) { el.textContent = l.name; });
    renderQibla();
    renderPrayer();
    scheduleReminders();
  }

  function locate(silent) {
    if (!navigator.geolocation) { if (!silent) toast('اس براؤزر میں لوکیشن دستیاب نہیں۔ شہر چنیں۔'); return; }
    navigator.geolocation.getCurrentPosition(function (pos) {
      var lat = pos.coords.latitude, lng = pos.coords.longitude;
      var c = nearestCity(lat, lng);
      setLoc({ name: c ? c.name : 'آپ کا مقام', lat: lat, lng: lng, src: 'gps' });
      if (!silent) toast('مقام مل گیا');
    }, function () {
      if (!silent) toast('لوکیشن کی اجازت نہیں ملی۔ شہر چنیں۔');
    }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 });
  }

  function openSheet() {
    var list = $('#cityList');
    list.innerHTML = CITIES.map(function (c, i) {
      var cur = state.loc.src !== 'gps' && state.loc.name === c.name;
      return '<button class="city" data-i="' + i + '"' + (cur ? ' aria-current="true"' : '') + '><span>' + c.name + '</span>' + (cur ? ICON_CHECK : '') + '</button>';
    }).join('');
    $('#sheet').hidden = false;
  }
  function closeSheet() { $('#sheet').hidden = true; }
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-act="loc"]')) openSheet();
  });
  $('#sheetClose').addEventListener('click', closeSheet);
  $('#sheet').addEventListener('click', function (e) { if (e.target.id === 'sheet') closeSheet(); });
  $('#useGps').addEventListener('click', function () { closeSheet(); locate(false); });
  $('#cityList').addEventListener('click', function (e) {
    var b = e.target.closest('.city');
    if (!b) return;
    var c = CITIES[+b.dataset.i];
    setLoc({ name: c.name, lat: c.lat, lng: c.lng, src: 'city' });
    closeSheet();
  });

  /* ---------- qibla ---------- */
  var compass = { bearing: 0, heading: 0, target: 0, has: false, raf: 0, aligned: false, listening: false };

  function renderQibla() {
    var l = state.loc;
    compass.bearing = Core.qiblaBearing(l.lat, l.lng);
    $('#qDeg').textContent = ur(Math.round(compass.bearing)) + '°';
    var km = Math.round(Core.distanceKm(l.lat, l.lng) / 10) * 10;
    $('#qDist').innerHTML = ur(km.toLocaleString('en-US')).replace(/,/g, '٬') + ' <i>کلومیٹر</i>';
    $('#kaaba').setAttribute('transform', 'rotate(' + compass.bearing.toFixed(2) + ' 170 170)');
    applyHeading(compass.heading);
  }

  function applyHeading(h) {
    $('#ring').setAttribute('transform', 'rotate(' + (-h).toFixed(2) + ' 170 170)');
    [['lblN', 170, 22], ['lblS', 170, 314], ['lblE', 316, 170], ['lblW', 24, 170]].forEach(function (a) {
      $('#' + a[0]).setAttribute('transform', 'rotate(' + h.toFixed(2) + ' ' + a[1] + ' ' + a[2] + ')');
    });
    var delta = ((compass.bearing - h + 540) % 360) - 180;
    var aligned = compass.has && Math.abs(delta) < 4;
    var st = $('#qStatus');
    if (!compass.has) {
      st.className = 'status';
      st.innerHTML = '';
    } else if (aligned) {
      st.className = 'status ok';
      st.innerHTML = ICON_CHECK + '<span>آپ کا رخ قبلے کی طرف ہے</span>';
    } else {
      st.className = 'status';
      var dir = delta > 0 ? 'دائیں' : 'بائیں';
      st.innerHTML = '<span>' + dir + ' طرف ' + ur(Math.round(Math.abs(delta))) + '° گھومیں</span>';
    }
    $('#kaabaBox').setAttribute('fill', aligned ? '#7FD1B9' : '#E2B861');
    if (aligned && !compass.aligned && navigator.vibrate) { try { navigator.vibrate(40); } catch (e) { /* ignore */ } }
    compass.aligned = aligned;
  }

  function frame() {
    compass.raf = 0;
    var diff = ((compass.target - compass.heading + 540) % 360) - 180;
    compass.heading = (compass.heading + diff * 0.2 + 360) % 360;
    applyHeading(compass.heading);
    if (Math.abs(diff) > 0.2) compass.raf = requestAnimationFrame(frame);
  }

  function onOrientation(e) {
    var h = null;
    if (typeof e.webkitCompassHeading === 'number' && !isNaN(e.webkitCompassHeading)) h = e.webkitCompassHeading;
    else if (e.alpha != null && (e.absolute || e.type === 'deviceorientationabsolute')) h = (360 - e.alpha) % 360;
    if (h == null) return;
    var ang = (window.screen && screen.orientation && screen.orientation.angle) || 0;
    h = (h + ang + 360) % 360;
    if (!compass.has) { compass.has = true; compass.heading = h; $('#qHint').textContent = 'فون کو ہموار رکھیں۔ کمپاس غلط لگے تو فون کو ہوا میں ۸ کی شکل میں گھمائیں۔'; }
    compass.target = h;
    if (!compass.raf) compass.raf = requestAnimationFrame(frame);
  }

  function listenCompass() {
    if (compass.listening) return;
    compass.listening = true;
    window.addEventListener('deviceorientationabsolute', onOrientation, true);
    window.addEventListener('deviceorientation', onOrientation, true);
    setTimeout(function () {
      if (!compass.has) $('#qHint').textContent = 'اس ڈیوائس پر کمپاس سینسر نہیں ملا۔ اوپر دی گئی ڈگری کے مطابق قبلہ نما یا نقشہ استعمال کریں۔';
    }, 2500);
  }

  function initCompass() {
    $('#qHint').textContent = '';
    var needsPermission = typeof window.DeviceOrientationEvent !== 'undefined' &&
      typeof window.DeviceOrientationEvent.requestPermission === 'function';
    var btn = $('#compassBtn');
    if (needsPermission) {
      btn.hidden = false;
      btn.addEventListener('click', function () {
        window.DeviceOrientationEvent.requestPermission().then(function (r) {
          if (r === 'granted') { btn.hidden = true; listenCompass(); }
          else toast('کمپاس کی اجازت نہیں ملی۔');
        }).catch(function () { toast('کمپاس فعال نہیں ہو سکا۔'); });
      });
      $('#qHint').textContent = 'کمپاس چلانے کے لیے نیچے بٹن دبا کر اجازت دیں۔';
    } else if ('DeviceOrientationEvent' in window) {
      listenCompass();
    } else {
      $('#qHint').textContent = 'اس ڈیوائس پر کمپاس سینسر دستیاب نہیں۔';
    }
  }

  /* ---------- prayer times ---------- */
  var PRAYERS = [['fajr', 'فجر'], ['sunrise', 'طلوعِ آفتاب'], ['dhuhr', 'ظہر'], ['asr', 'عصر'], ['maghrib', 'مغرب'], ['isha', 'عشاء']];
  var PRAYER_ICONS = {
    fajr: 'M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z',
    sunrise: 'M12 3v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M8 12a4 4 0 018 0',
    dhuhr: 'M12 7a5 5 0 100 10 5 5 0 000-10zM12 2v2M12 20v2M2 12h2M20 12h2',
    asr: 'M12 7a5 5 0 100 10 5 5 0 000-10zM12 2v2M12 20v2M2 12h2M20 12h2',
    maghrib: 'M12 3v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M8 12a4 4 0 018 0',
    isha: 'M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z'
  };

  function dayTimes(date) {
    var y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();
    var tz = -new Date(y, m - 1, d, 12).getTimezoneOffset() / 60;
    var t = Core.computeTimes(y, m, d, state.loc.lat, state.loc.lng, tz, { asrFactor: state.asr });
    var base = new Date(y, m - 1, d).getTime(), o = {}, ok = true;
    Object.keys(t).forEach(function (k) {
      if (!isFinite(t[k])) ok = false;
      o[k] = new Date(base + Math.round(t[k] * 3600000));
    });
    return ok ? o : null;
  }

  function clock(d) {
    var h = d.getHours(), m = d.getMinutes();
    var per = h < 4 ? 'رات' : h < 12 ? 'صبح' : h < 15 ? 'دوپہر' : h < 17 ? 'سہ پہر' : h < 19 ? 'شام' : 'رات';
    return { t: ur(h % 12 || 12) + ':' + ur(pad2(m)), p: per };
  }

  function remainText(ms) {
    var mins = Math.max(0, Math.ceil(ms / 60000));
    var h = Math.floor(mins / 60), m = mins % 60;
    if (mins <= 0) return 'ابھی';
    if (h === 0) return ur(m) + ' منٹ باقی';
    if (m === 0) return ur(h) + ' گھنٹے باقی';
    return ur(h) + ' گھنٹے ' + ur(m) + ' منٹ باقی';
  }

  var nextInfo = null, renderedDay = '', notifiedKey = '';

  function prayerLabel(key, date) {
    if (key === 'dhuhr' && date.getDay() === 5) return 'جمعہ';
    return PRAYERS.filter(function (p) { return p[0] === key; })[0][1];
  }

  function renderPrayer() {
    var now = new Date();
    renderedDay = now.toDateString();
    var g = { d: now.getDate(), m: now.getMonth(), y: now.getFullYear() };
    $('#pDate').textContent = Data.WEEKDAYS[now.getDay()] + '، ' + ur(g.d) + ' ' + Data.GREG_MONTHS[g.m] + ' ' + ur(g.y);
    $$('.seg button[data-asr]').forEach(function (b) { b.setAttribute('aria-pressed', String(+b.dataset.asr === state.asr)); });

    var times = dayTimes(now);
    var list = $('#pList');
    if (!times) {
      list.innerHTML = '<div class="empty">اس مقام کے لیے آج کے اوقات حساب نہیں ہو سکے۔</div>';
      nextInfo = null; $('#nName').textContent = '—'; $('#nTime').textContent = '—'; $('#nRem').textContent = ''; $('#nPer').textContent = '';
      return;
    }
    var cand = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'], next = null, i;
    for (i = 0; i < cand.length; i++) { if (times[cand[i]] > now) { next = { key: cand[i], at: times[cand[i]], today: true }; break; } }
    if (!next) {
      var tm = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      var t2 = dayTimes(tm);
      next = t2 ? { key: 'fajr', at: t2.fajr, today: false, date: tm } : null;
    }
    nextInfo = next;

    list.innerHTML = PRAYERS.map(function (p) {
      var k = p[0], at = times[k], c = clock(at);
      var cls = 'prow' + (next && next.today && next.key === k ? ' next' : (at <= now ? ' past' : ''));
      return '<div class="' + cls + '"><div class="l"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="' +
        (cls.indexOf('next') > -1 ? '#E2B861' : '#A9BDB6') + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' +
        PRAYER_ICONS[k] + '"/></svg><span>' + prayerLabel(k, at) + '</span></div><div class="r">' + c.t + ' ' + c.p + '</div></div>';
    }).join('');

    if (next) {
      var nc = clock(next.at);
      $('#nName').textContent = prayerLabel(next.key, next.at);
      $('#nTime').textContent = nc.t;
      $('#nPer').textContent = nc.p;
    }
    renderSehri();
    tickPrayer();
  }

  function tickPrayer() {
    var now = new Date();
    if (now.toDateString() !== renderedDay) { renderPrayer(); return; }
    if (!nextInfo) return;
    var ms = nextInfo.at - now;
    $('#nRem').textContent = remainText(ms);
    if (ms <= 0) {
      var key = nextInfo.key + now.toDateString();
      if (key !== notifiedKey) {
        notifiedKey = key;
        toast('اب ' + prayerLabel(nextInfo.key, nextInfo.at) + ' کا وقت ہے');
        if (navigator.vibrate) { try { navigator.vibrate([120, 80, 120]); } catch (e) { /* ignore */ } }
      }
      renderPrayer();
    }
  }
  setInterval(tickPrayer, 1000);

  $('.seg').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-asr]');
    if (!b) return;
    state.asr = +b.dataset.asr;
    store('asr', state.asr);
    renderPrayer();
    scheduleReminders();
  });

  /* ---------- prayer reminders (Android app only, via Capacitor LocalNotifications) ---------- */
  function nativeLN() {
    var C = window.Capacitor;
    return (C && C.isNativePlatform && C.isNativePlatform() && C.Plugins && C.Plugins.LocalNotifications) || null;
  }
  var REM_KEYS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

  function clearReminders(LN) {
    return LN.getPending().then(function (p) {
      return p.notifications.length ? LN.cancel({ notifications: p.notifications.map(function (n) { return { id: n.id }; }) }) : null;
    });
  }

  function scheduleReminders() {
    var LN = nativeLN();
    if (!LN || (!store('rem') && !store('fastrem'))) return Promise.resolve();
    var now = new Date(), list = [];
    for (var d = 0; store('rem') && d < 14; d++) {
      var date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);
      var t = dayTimes(date);
      if (!t) continue;
      REM_KEYS.forEach(function (k, i) {
        if (t[k] > now) {
          list.push({ id: d * 10 + i + 1, title: 'نماز کا وقت', body: 'اب ' + prayerLabel(k, t[k]) + ' کا وقت ہے', schedule: { at: t[k], allowWhileIdle: true } });
        }
      });
    }
    if (store('fastrem')) list = list.concat(fastReminderList());
    return clearReminders(LN)
      .then(function () { return list.length ? LN.schedule({ notifications: list }) : null; })
      .catch(function () { /* reminders unavailable */ });
  }

  function setupReminders() {
    var LN = nativeLN();
    if (!LN) return;
    var row = $('#remRow'), btn = $('#remBtn');
    row.hidden = false;
    function paint() {
      var on = !!store('rem');
      btn.setAttribute('aria-pressed', String(on));
      btn.textContent = on ? 'چالو' : 'بند';
    }
    paint();
    btn.addEventListener('click', function () {
      if (store('rem')) {
        store('rem', false); paint();
        scheduleReminders();
        toast('یاد دہانی بند کر دی');
        return;
      }
      LN.requestPermissions().then(function (r) {
        if (r && r.display === 'granted') {
          store('rem', true); paint(); scheduleReminders();
          toast('ہر نماز کے وقت یاد دہانی آئے گی');
        } else toast('نوٹیفکیشن کی اجازت نہیں ملی');
      }).catch(function () { toast('یاد دہانی چالو نہیں ہو سکی'); });
    });
    scheduleReminders();
  }

  /* ---------- hijri calendar ---------- */
  function todayNum() {
    var n = new Date();
    return Core.dayNumOf(n.getFullYear(), n.getMonth() + 1, n.getDate());
  }
  function gregText(g) { return ur(g.d) + ' ' + Data.GREG_MONTHS[g.m - 1] + ' ' + ur(g.y); }

  function renderCal() {
    var tn = todayNum(), off = state.hoff;
    var ht = Core.hijriFromDayNum(tn, off);
    var grid = $('#calGrid');
    $('#adjVal').textContent = off === 0 ? 'بغیر تبدیلی' : (off > 0 ? '+' : '−') + ur(Math.abs(off)) + ' دن';
    if (!ht) {
      grid.innerHTML = '';
      $('#calTitle').textContent = 'ہجری تقویم دستیاب نہیں';
      $('#calSub').textContent = '';
      $('#occList').innerHTML = '<div class="empty">اس براؤزر میں ہجری کیلنڈر کی سہولت نہیں۔</div>';
      return;
    }
    renderFastNote();
    $('#todayH').textContent = ur(ht.d) + ' ' + Data.HIJRI_MONTHS[ht.m - 1];
    if (!cal.y) { cal.y = ht.y; cal.m = ht.m; }

    var start = Core.monthStartDayNum(cal.y, cal.m, off, tn);
    var len = Core.monthLength(cal.y, cal.m, off, tn);
    var first = Core.gregFromDayNum(start), last = Core.gregFromDayNum(start + len - 1);
    $('#calTitle').textContent = Data.HIJRI_MONTHS[cal.m - 1] + ' ' + ur(cal.y) + 'ھ';
    $('#calSub').textContent = first.m === last.m
      ? Data.GREG_MONTHS[first.m - 1] + ' ' + ur(first.y)
      : Data.GREG_MONTHS[first.m - 1] + ' – ' + Data.GREG_MONTHS[last.m - 1] + ' ' + ur(last.y);

    var total = Math.ceil((first.wd + len) / 7) * 7, html = '';
    for (var i = 0; i < total; i++) {
      var d = i - first.wd + 1;
      if (d < 1 || d > len) { html += '<div class="cell void"></div>'; continue; }
      var n = start + d - 1, g = Core.gregFromDayNum(n);
      var cls = 'cell' + (i % 7 === 5 ? ' fri' : '') + (n === tn ? ' today' : '');
      html += '<div class="' + cls + '"><span class="h">' + ur(d) + '</span><span class="g">' + g.d + '</span></div>';
    }
    grid.innerHTML = html;

    var items = [];
    Data.OCCASIONS.forEach(function (o) {
      [ht.y, ht.y + 1].some(function (y) {
        var n = Core.monthStartDayNum(y, o[0], off, tn) + o[1] - 1;
        if (n >= tn) { items.push({ n: n, hm: o[0], hd: o[1], name: o[2] }); return true; }
        return false;
      });
    });
    items.sort(function (a, b) { return a.n - b.n; });
    $('#occList').innerHTML = items.slice(0, 4).map(function (it) {
      var g = Core.gregFromDayNum(it.n), left = it.n - tn;
      var lt = left === 0 ? 'آج' : left === 1 ? 'کل' : ur(left) + ' دن باقی';
      return '<div class="occ"><div class="l">' + ICON_STAR + '<span>' + it.name + '</span></div><div class="r"><b>' +
        ur(it.hd) + ' ' + Data.HIJRI_MONTHS[it.hm - 1] + '</b>' + Data.WEEKDAYS[g.wd] + '، ' + gregText(g) + ' · ' + lt + '</div></div>';
    }).join('');
  }

  $('#calPrev').addEventListener('click', function () { var p = Core.prevMonth(cal.y, cal.m); cal.y = p.y; cal.m = p.m; renderCal(); });
  $('#calNext').addEventListener('click', function () { var p = Core.nextMonth(cal.y, cal.m); cal.y = p.y; cal.m = p.m; renderCal(); });
  function adjust(delta) {
    state.hoff = Math.max(-2, Math.min(2, state.hoff + delta));
    store('hoff', state.hoff);
    cal.y = 0; cal.m = 0;
    renderCal();
  }
  $('#adjMinus').addEventListener('click', function () { adjust(-1); });
  $('#adjPlus').addEventListener('click', function () { adjust(1); });

  /* ---------- recitation ---------- */
  var audio = new Audio();
  audio.preload = 'none';
  var player = { n: 0, sources: [], si: 0, token: 0, repeat: false, sleep: 0, sleepTimer: 0, dragging: false };
  var SLEEP_STEPS = [0, 15, 30, 60];

  function srcMp3Quran(n) { return 'https://server11.mp3quran.net/sds/' + String(n).padStart(3, '0') + '.mp3'; }

  function resolveFallback(n) {
    return fetch('https://api.quran.com/api/v4/chapter_recitations/3/' + n)
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var u = j && j.audio_file && j.audio_file.audio_url;
        if (!u) return null;
        return /^https?:/.test(u) ? u : 'https://download.quranicaudio.com/' + u.replace(/^\/+/, '');
      })
      .catch(function () { return null; });
  }

  function norm(s) {
    return String(s).replace(/[ً-ٰٟـ]/g, '').replace(/[يى]/g, 'ی').replace(/ك/g, 'ک')
      .replace(/[ةۃه]/g, 'ہ').replace(/[أإآٱ]/g, 'ا').replace(/\s+/g, '');
  }
  function latinDigits(s) {
    return String(s).replace(/[۰-۹]/g, function (d) { return DIGITS.indexOf(d); })
      .replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 0x660; });
  }

  function renderSurahs() {
    var q = $('#surahSearch').value.trim(), qn = norm(latinDigits(q));
    var out = [];
    SURAHS.forEach(function (s, i) {
      var n = i + 1;
      if (qn) {
        var isNum = /^\d+$/.test(qn);
        if (isNum ? String(n) !== qn : (norm(s[0]).indexOf(qn) < 0 && norm(s[1]).indexOf(qn) < 0)) return;
      }
      out.push('<button class="srow' + (player.n === n ? ' playing' : '') + '" data-n="' + n + '"><span class="num">' + ur(n) +
        '</span><span class="mid"><span class="u">' + s[0] + '</span><span class="a">' + ur(s[2]) + ' آیات</span></span><span class="ar">' + s[1] + '</span></button>');
    });
    $('#surahList').innerHTML = out.length ? out.join('') : '<div class="empty">کوئی سورت نہیں ملی۔</div>';
  }
  $('#surahSearch').addEventListener('input', renderSurahs);
  $('#surahList').addEventListener('click', function (e) {
    var f = e.target.closest('[data-fav]');
    if (f) {
      var fn = +f.dataset.fav, ix = favs.indexOf(fn);
      if (ix > -1) favs.splice(ix, 1); else favs.push(fn);
      store('favs', favs); renderSurahs(); renderFavChips(); return;
    }
    var b = e.target.closest('.srow');
    if (b) { playSurah(+b.dataset.n); openPlayer(); }
  });

  function fmtTime(s) {
    if (!isFinite(s) || s < 0) s = 0;
    return ur(Math.floor(s / 60) + ':' + pad2(Math.floor(s % 60)));
  }

  function setState(msg, isErr) {
    var el = $('#pState');
    el.textContent = msg || '';
    el.className = 'pstate' + (isErr ? ' err' : '');
  }

  function updatePlayUI() {
    var playing = !audio.paused && !audio.ended;
    var icon = playing ? ICON_PAUSE : ICON_PLAY, label = playing ? 'روکیں' : 'چلائیں';
    ['#pPlay', '#miniPlay'].forEach(function (id) { $(id).innerHTML = icon; $(id).setAttribute('aria-label', label); });
  }

  function updateNowPlaying() {
    var s = SURAHS[player.n - 1];
    if (!s) return;
    $('#pCover').textContent = s[1];
    $('#pTitle').textContent = 'سورۃ ' + s[0];
    $('#pArt').textContent = RECITER + ' · ' + ur(s[2]) + ' آیات';
    $('#miniAr').textContent = s[1];
    $('#miniU').textContent = s[0];
    $('#mini').hidden = false;
    $('#pPrev').disabled = player.n <= 1; $('#pNext').disabled = player.n >= 114;
    $('#pPrev').style.opacity = player.n <= 1 ? '.35' : '1'; $('#pNext').style.opacity = player.n >= 114 ? '.35' : '1';
    $('#playFirstTxt').textContent = 'سورۃ ' + s[0] + ' سے جاری رکھیں';
    if (state.tab === 'recite') renderSurahs();
    if (typeof renderTranslation === 'function' && transOpen) renderTranslation();
    if ('mediaSession' in navigator && window.MediaMetadata) {
      try { navigator.mediaSession.metadata = new MediaMetadata({ title: 'سورۃ ' + s[0], artist: RECITER, album: 'تقویم' }); } catch (e) { /* ignore */ }
    }
  }

  function playSurah(n) {
    if (n < 1 || n > 114) return;
    player.n = n;
    player.token++;
    store('last', n);
    updateNowPlaying();
    setState('لوڈ ہو رہا ہے…');
    $('#pSeek').value = 0; $('#pSeek').style.setProperty('--p', '0%');
    $('#pCur').textContent = fmtTime(0); $('#pDur').textContent = fmtTime(0);
    player.sources = [srcMp3Quran(n)];
    player.si = 0;
    player.fallbackTried = false;
    audio.src = player.sources[0];
    var p = audio.play();
    if (p && p.catch) p.catch(function (err) {
      if (err && err.name === 'NotAllowedError') setState('چلانے کے لیے پلے کا بٹن دبائیں');
    });
    updatePlayUI();
  }

  function tryNextSource() {
    var tok = player.token;
    if (player.si + 1 < player.sources.length) {
      player.si++;
      audio.src = player.sources[player.si];
      audio.play().catch(function () { /* handled by error event */ });
      return;
    }
    if (!player.fallbackTried) {
      player.fallbackTried = true;
      resolveFallback(player.n).then(function (u) {
        if (tok !== player.token) return;
        if (u && player.sources.indexOf(u) < 0) {
          player.sources.push(u); player.si = player.sources.length - 1;
          audio.src = u;
          audio.play().catch(function () { setState('چلانے کے لیے پلے کا بٹن دبائیں'); });
        } else {
          setState('آڈیو لوڈ نہیں ہو سکی۔ انٹرنیٹ چیک کر کے دوبارہ کوشش کریں۔', true);
        }
      });
      return;
    }
    setState('آڈیو لوڈ نہیں ہو سکی۔ انٹرنیٹ چیک کر کے دوبارہ کوشش کریں۔', true);
    updatePlayUI();
  }

  audio.addEventListener('error', function () { if (audio.src) tryNextSource(); });
  audio.addEventListener('playing', function () { setState(''); updatePlayUI(); });
  audio.addEventListener('waiting', function () { setState('لوڈ ہو رہا ہے…'); });
  audio.addEventListener('pause', updatePlayUI);
  audio.addEventListener('play', updatePlayUI);
  audio.addEventListener('loadedmetadata', function () { $('#pDur').textContent = fmtTime(audio.duration); });
  audio.addEventListener('timeupdate', function () {
    if (player.dragging) return;
    var d = audio.duration, c = audio.currentTime;
    if (player.n && Math.floor(c) % 5 === 0) store('pos', { n: player.n, t: Math.floor(c) });
    $('#pCur').textContent = fmtTime(c);
    if (isFinite(d) && d > 0) {
      var v = Math.round(c / d * 1000);
      $('#pSeek').value = v;
      $('#pSeek').style.setProperty('--p', (v / 10) + '%');
    }
  });
  audio.addEventListener('ended', function () {
    if (player.repeat) { audio.currentTime = 0; audio.play(); return; }
    if (player.n < 114) playSurah(player.n + 1);
    else { updatePlayUI(); setState(''); }
  });

  function togglePlay() {
    if (!player.n) { playSurah(store('last') || 1); return; }
    if (audio.paused) {
      var p = audio.play();
      if (p && p.catch) p.catch(function () { setState('آڈیو نہیں چل سکی۔ دوبارہ کوشش کریں۔', true); });
    } else audio.pause();
  }
  $('#pPlay').addEventListener('click', togglePlay);
  $('#miniPlay').addEventListener('click', togglePlay);
  $('#pPrev').addEventListener('click', function () { playSurah(player.n - 1); });
  $('#pNext').addEventListener('click', function () { playSurah(player.n + 1); });
  $('#playFirst').addEventListener('click', function () {
    var n = store('last') || 1, pos = store('pos');
    playSurah(n); openPlayer();
    if (pos && pos.n === n && pos.t > 10) {
      audio.addEventListener('loadedmetadata', function () { try { audio.currentTime = pos.t; } catch (e) { /* ignore */ } }, { once: true });
    }
  });

  var seek = $('#pSeek');
  seek.addEventListener('input', function () {
    player.dragging = true;
    var d = audio.duration;
    seek.style.setProperty('--p', (seek.value / 10) + '%');
    if (isFinite(d)) $('#pCur').textContent = fmtTime(seek.value / 1000 * d);
  });
  seek.addEventListener('change', function () {
    var d = audio.duration;
    if (isFinite(d) && d > 0) audio.currentTime = seek.value / 1000 * d;
    player.dragging = false;
  });

  $('#pRepeat').addEventListener('click', function () {
    player.repeat = !player.repeat;
    this.setAttribute('aria-pressed', String(player.repeat));
  });
  $('#pSleep').addEventListener('click', function () {
    var i = (SLEEP_STEPS.indexOf(player.sleep) + 1) % SLEEP_STEPS.length;
    player.sleep = SLEEP_STEPS[i];
    clearTimeout(player.sleepTimer);
    if (player.sleep) {
      player.sleepTimer = setTimeout(function () {
        audio.pause(); player.sleep = 0;
        $('#pSleep').setAttribute('aria-pressed', 'false'); $('#pSleepTxt').textContent = 'نیند ٹائمر';
        toast('نیند ٹائمر کے مطابق تلاوت روک دی گئی');
      }, player.sleep * 60000);
    }
    this.setAttribute('aria-pressed', String(!!player.sleep));
    $('#pSleepTxt').textContent = player.sleep ? ur(player.sleep) + ' منٹ' : 'نیند ٹائمر';
  });

  function openPlayer() { if (player.n) $('#player').hidden = false; }
  function closePlayer() { $('#player').hidden = true; }
  $('#pBack').addEventListener('click', closePlayer);
  $('#miniOpen').addEventListener('click', openPlayer);

  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.setActionHandler('play', function () { audio.play(); });
      navigator.mediaSession.setActionHandler('pause', function () { audio.pause(); });
      navigator.mediaSession.setActionHandler('previoustrack', function () { playSurah(player.n - 1); });
      navigator.mediaSession.setActionHandler('nexttrack', function () { playSurah(player.n + 1); });
    } catch (e) { /* unsupported actions */ }
  }

  /* ---------- translation (Tanzil text file, kept on this device) ---------- */
  var trans = null, transOpen = false, TRANS_KEY = 'trans-ur', TRANS_FILE = 'translation-ur.txt';

  function idbOpen() {
    return new Promise(function (res, rej) {
      if (!window.indexedDB) { rej(new Error('no indexedDB')); return; }
      var r = indexedDB.open('taqweem', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('kv'); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function kvGet(k) {
    return idbOpen().then(function (db) {
      return new Promise(function (res, rej) {
        var q = db.transaction('kv').objectStore('kv').get(k);
        q.onsuccess = function () { res(q.result); };
        q.onerror = function () { rej(q.error); };
      });
    });
  }
  function kvSet(k, v) {
    return idbOpen().then(function (db) {
      return new Promise(function (res, rej) {
        var tx = db.transaction('kv', 'readwrite');
        tx.objectStore('kv').put(v, k);
        tx.oncomplete = function () { res(); };
        tx.onerror = function () { rej(tx.error); };
      });
    });
  }

  function loadTranslation(raw) {
    var p = Core.parseTanzil(raw);
    if (p.count < 6000) return false;
    trans = p;
    return true;
  }

  function renderTranslation() {
    var box = $('#pTrans');
    if (!transOpen) { box.hidden = true; return; }
    box.hidden = false;
    if (!trans) {
      box.innerHTML = '<div class="timport"><span>ترجمہ ابھی ایپ میں شامل نہیں۔ tanzil.net/trans سے اردو (Maududi) کی فائل "Text (with Aya Numbers)" فارمیٹ میں ڈاؤنلوڈ کر کے یہاں چنیں۔ فائل صرف اسی ڈیوائس میں محفوظ رہے گی۔</span>' +
        '<label class="btn" for="tFile">ترجمہ کی فائل چنیں</label><input type="file" id="tFile" accept=".txt,text/plain" hidden></div>';
      return;
    }
    var lines = trans.map[player.n] || [], html = '';
    for (var i = 0; i < lines.length; i++) {
      if (lines[i]) html += '<div class="tv"><span class="n">' + ur(i + 1) + '</span><p>' + escapeHtml(lines[i]) + '</p></div>';
    }
    if (!html) html = '<div class="empty">اس سورت کا ترجمہ فائل میں نہیں ملا۔</div>';
    var who = trans.maududi ? 'مولانا ابوالاعلیٰ مودودی' : 'درآمد شدہ فائل';
    box.innerHTML = html + '<div class="tcredit">ترجمہ: ' + who + ' · ماخذ: tanzil.net<button id="tRemove">ہٹائیں</button></div>';
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  $('#pTransBtn').addEventListener('click', function () {
    transOpen = !transOpen;
    this.setAttribute('aria-pressed', String(transOpen));
    renderTranslation();
    if (transOpen) $('#pTrans').scrollIntoView && $('#pTrans').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  $('#pTrans').addEventListener('change', function (e) {
    var f = e.target && e.target.files && e.target.files[0];
    if (!f) return;
    var rd = new FileReader();
    rd.onload = function () {
      var raw = String(rd.result);
      if (!loadTranslation(raw)) { toast('یہ فائل درست نہیں۔ Tanzil کی "Text (with Aya Numbers)" فائل چنیں۔'); return; }
      kvSet(TRANS_KEY, raw).catch(function () { toast('ترجمہ محفوظ نہیں ہو سکا، اگلی بار دوبارہ چنیں۔'); });
      renderTranslation();
      toast('ترجمہ شامل ہو گیا');
    };
    rd.onerror = function () { toast('فائل پڑھی نہیں جا سکی۔'); };
    rd.readAsText(f, 'utf-8');
  });

  $('#pTrans').addEventListener('click', function (e) {
    if (e.target && e.target.id === 'tRemove') {
      trans = null;
      kvSet(TRANS_KEY, null).catch(function () { /* ignore */ });
      renderTranslation();
      toast('ترجمہ ہٹا دیا');
    }
  });

  /* On start: saved copy first, otherwise a translation-ur.txt shipped next to the app. */
  kvGet(TRANS_KEY).then(function (raw) {
    if (raw && loadTranslation(raw)) return true;
    return false;
  }).catch(function () { return false; }).then(function (ok) {
    if (ok || !window.fetch) return;
    return fetch(TRANS_FILE, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.text() : ''; }).then(function (raw) {
      if (raw && loadTranslation(raw)) { kvSet(TRANS_KEY, raw).catch(function () { /* ignore */ }); }
    }).catch(function () { /* no bundled file */ });
  });

  /* ---------- sehri / iftar ---------- */
  function renderSehri() {
    var el = $('#sehri'), now = new Date(), t = dayTimes(now);
    if (!t) { el.innerHTML = ''; return; }
    function rem(at) { return at > now ? remainText(at - now) : 'گزر چکا'; }
    var f = clock(t.fajr), m = clock(t.maghrib);
    el.innerHTML = '<div><small>سحری ختم</small><b>' + f.t + ' ' + f.p + '</b><i>' + rem(t.fajr) + '</i></div>' +
      '<div><small>افطار</small><b>' + m.t + ' ' + m.p + '</b><i>' + rem(t.maghrib) + '</i></div>';
  }
  setInterval(function () { if (state.tab === 'prayer') renderSehri(); }, 1000);

  /* ---------- fasting note on calendar ---------- */
  function fastFor(dayNum) {
    var g = Core.gregFromDayNum(dayNum), h = Core.hijriFromDayNum(dayNum, state.hoff);
    return h ? Core.fastingInfo(h, g.wd) : null;
  }
  function renderFastNote() {
    var tn = todayNum(), a = fastFor(tn), b = fastFor(tn + 1), parts = [];
    if (a) parts.push('آج: ' + a.text);
    if (b) parts.push('کل: ' + b.text);
    var el = $('#fastNote');
    el.hidden = !parts.length;
    el.innerHTML = parts.join('<br>');
  }

  /* ---------- fasting reminders (native app) ---------- */
  function fastReminderList() {
    var list = [], now = new Date(), tn = todayNum();
    for (var d = 0; d < 14; d++) {
      var f = fastFor(tn + d + 1);
      if (!f || f.kind === 'forbidden' || f.kind === 'ramadan') continue;
      var at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d, 21, 0, 0);
      if (at > now) list.push({ id: 1000 + d, title: 'کل روزہ', body: f.text, schedule: { at: at, allowWhileIdle: true } });
    }
    return list;
  }

  /* ---------- nearest mosques (OpenStreetMap Overpass) ---------- */
  var OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
  function overpassQuery(lat, lng, r) {
    var a = '(around:' + r + ',' + lat + ',' + lng + ')';
    return '[out:json][timeout:25];(node["amenity"="place_of_worship"]["religion"="muslim"]' + a +
      ';way["amenity"="place_of_worship"]["religion"="muslim"]' + a + ';);out center 80;';
  }
  function fetchMosques(lat, lng, r, i) {
    i = i || 0;
    return fetch(OVERPASS[i], { method: 'POST', body: 'data=' + encodeURIComponent(overpassQuery(lat, lng, r)),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
      .then(function (res) { if (!res.ok) throw new Error('http'); return res.json(); })
      .catch(function (err) { if (i + 1 < OVERPASS.length) return fetchMosques(lat, lng, r, i + 1); throw err; });
  }
  function distText(km) { return km < 1 ? ur(Math.round(km * 1000)) + ' میٹر' : ur(km.toFixed(1)) + ' کلومیٹر'; }
  function findMosques() {
    var box = $('#mosqList'), btn = $('#mosqBtn'), lat = state.loc.lat, lng = state.loc.lng;
    if (!window.fetch) { box.innerHTML = '<div class="empty">اس ڈیوائس پر یہ سہولت دستیاب نہیں۔</div>'; return; }
    btn.disabled = true; box.innerHTML = '<div class="empty">تلاش ہو رہی ہے…</div>';
    fetchMosques(lat, lng, 3000).then(function (j) {
      var r = Core.parseMosques(j, lat, lng);
      if (r.length >= 3) return r;
      return fetchMosques(lat, lng, 10000).then(function (j2) { return Core.parseMosques(j2, lat, lng); });
    }).then(function (r) {
      btn.disabled = false;
      if (!r.length) { box.innerHTML = '<div class="empty">اس علاقے میں کوئی مسجد نہیں ملی۔</div>'; return; }
      var note = state.loc.src === 'gps' ? '' : '<p class="hint">آپ کا مقام شہر کے مرکز کے طور پر لیا گیا ہے۔ بہتر نتیجے کے لیے GPS سے مقام لیں۔</p>';
      box.innerHTML = note + r.slice(0, 15).map(function (m) {
        var nm = m.name || 'مسجد (نام درج نہیں)';
        var url = 'https://www.google.com/maps/dir/?api=1&destination=' + m.lat + ',' + m.lng + '&travelmode=walking';
        return '<div class="row2"><span class="m"><span>' + escapeHtml(nm) + '</span><small>' + distText(m.dist) + ' · ' + Core.dirName(m.bearing) + ' کی طرف' +
          (m.street ? ' · ' + escapeHtml(m.street) : '') + '</small></span><a href="' + url + '" target="_blank" rel="noopener">راستہ</a></div>';
      }).join('');
    }).catch(function () {
      btn.disabled = false;
      box.innerHTML = '<div class="empty">تلاش نہیں ہو سکی۔ انٹرنیٹ چیک کر کے دوبارہ کوشش کریں۔</div>';
    });
  }
  $('#mosqBtn').addEventListener('click', findMosques);

  /* ---------- tasbeeh ---------- */
  var PHRASES = ['سبحان اللہ', 'الحمد للہ', 'اللہ اکبر', 'استغفراللہ', 'درود شریف'];
  var tas = store('tas') || { p: 0, c: 0, t: 33 };
  function paintTas() {
    $('#tasCnt').textContent = ur(tas.c);
    $('#tasTap').textContent = PHRASES[tas.p];
    $('#tasPhrase').innerHTML = PHRASES.map(function (p, i) { return '<button data-p="' + i + '" aria-pressed="' + (i === tas.p) + '">' + p + '</button>'; }).join('');
    $$('[data-t]', $('#tab-more')).forEach(function (b) { b.setAttribute('aria-pressed', String(+b.dataset.t === tas.t)); });
  }
  $('#tasTap').addEventListener('click', function () {
    tas.c++;
    if (navigator.vibrate) { try { navigator.vibrate(tas.c % tas.t === 0 ? [80, 60, 80] : 12); } catch (e) { /* ignore */ } }
    if (tas.c % tas.t === 0) toast(ur(tas.c) + ' مکمل ہوئے');
    store('tas', tas); paintTas();
  });
  $('#tasReset').addEventListener('click', function () { tas.c = 0; store('tas', tas); paintTas(); });
  $('#tasPhrase').addEventListener('click', function (e) {
    var b = e.target.closest('[data-p]'); if (!b) return;
    tas.p = +b.dataset.p; tas.c = 0; store('tas', tas); paintTas();
  });
  $('#tab-more').addEventListener('click', function (e) {
    var b = e.target.closest('[data-t]'); if (!b) return;
    tas.t = +b.dataset.t; store('tas', tas); paintTas();
  });

  /* ---------- prayer tracker + qaza ---------- */
  var trk = store('trk') || {};
  var qaza = typeof store('qaza') === 'number' ? store('qaza') : 0;
  var TRK_NAMES = ['فجر', 'ظہر', 'عصر', 'مغرب', 'عشاء'];
  function todayKey() { var n = new Date(); return Core.dateKey(n.getFullYear(), n.getMonth() + 1, n.getDate()); }
  function paintTrk() {
    var mask = trk[todayKey()] || 0;
    $('#trkBtns').innerHTML = TRK_NAMES.map(function (n, i) {
      return '<button data-i="' + i + '" aria-pressed="' + !!(mask & (1 << i)) + '">' + n + '</button>';
    }).join('');
    var n = new Date();
    $('#trkStreak').textContent = ur(Core.computeStreak(trk, n.getFullYear(), n.getMonth() + 1, n.getDate()));
    $('#qazaVal').textContent = ur(qaza);
  }
  $('#trkBtns').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-i]'); if (!b) return;
    var k = todayKey();
    trk[k] = (trk[k] || 0) ^ (1 << +b.dataset.i);
    var keys = Object.keys(trk).sort();
    while (keys.length > 120) delete trk[keys.shift()];
    store('trk', trk); paintTrk();
  });
  $('#qazaPlus').addEventListener('click', function () { qaza++; store('qaza', qaza); paintTrk(); });
  $('#qazaMinus').addEventListener('click', function () { qaza = Math.max(0, qaza - 1); store('qaza', qaza); paintTrk(); });

  /* ---------- zakat ---------- */
  var ZF = ['zCash', 'zGold', 'zSilver', 'zGoods', 'zDebt', 'zGP', 'zSP'];
  var zs = store('zakat') || {};
  function num(id) { var v = parseFloat(latinDigits($('#' + id).value).replace(/,/g, '')); return isFinite(v) && v > 0 ? v : 0; }
  function money(x) { return ur(Math.round(x).toLocaleString('en-US')); }
  function calcZakat() {
    ZF.forEach(function (id) { zs[id] = $('#' + id).value; });
    store('zakat', zs);
    var gp = num('zGP'), sp = num('zSP');
    if (!sp) { $('#zRes').textContent = 'نصاب معلوم کرنے کے لیے آج چاندی کا ریٹ فی گرام لکھیں۔'; return; }
    var total = num('zCash') + num('zGoods') + num('zGold') * gp + num('zSilver') * sp - num('zDebt');
    var nisab = 612.36 * sp;
    $('#zRes').innerHTML = 'کل قابلِ زکوٰۃ مال: <b>' + money(Math.max(0, total)) + '</b> روپے<br>نصاب (چاندی): ' + money(nisab) + ' روپے<br>' +
      (total >= nisab ? 'زکوٰۃ (۲.۵٪): <b>' + money(total * 0.025) + '</b> روپے' : 'مال نصاب سے کم ہے، زکوٰۃ فرض نہیں ہوتی۔');
  }
  ZF.forEach(function (id) { $('#' + id).value = zs[id] || ''; $('#' + id).addEventListener('input', calcZakat); });
  calcZakat();

  /* ---------- settings: theme, size, fasting reminders ---------- */
  function applyLook() {
    var th = store('theme') === 'light' ? 'light' : 'dark', zm = +store('zoom') || 0;
    document.documentElement.setAttribute('data-theme', th);
    document.documentElement.setAttribute('data-zoom', String(zm));
    var mt = document.querySelector('meta[name="theme-color"]'); if (mt) mt.content = th === 'light' ? '#EDE6D3' : '#0A1B19';
    $$('[data-theme]', $('#tab-more')).forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.theme === th)); });
    $$('[data-zoom]', $('#tab-more')).forEach(function (b) { b.setAttribute('aria-pressed', String(+b.dataset.zoom === zm)); });
  }
  $('#tab-more').addEventListener('click', function (e) {
    var t = e.target.closest('button[data-theme]'), z = e.target.closest('button[data-zoom]');
    if (t) { store('theme', t.dataset.theme); applyLook(); }
    if (z) { store('zoom', +z.dataset.zoom); applyLook(); }
  });
  function setupFastReminders() {
    var LN = nativeLN();
    if (!LN) return;
    $('#fastRemRow').hidden = false;
    var btn = $('#fastRemBtn');
    function paint() { var on = !!store('fastrem'); btn.setAttribute('aria-pressed', String(on)); btn.textContent = on ? 'چالو' : 'بند'; }
    paint();
    btn.addEventListener('click', function () {
      if (store('fastrem')) { store('fastrem', false); paint(); scheduleReminders(); toast('روزے کی یاد دہانی بند'); return; }
      LN.requestPermissions().then(function (r) {
        if (r && r.display === 'granted') { store('fastrem', true); paint(); scheduleReminders(); toast('روزے سے ایک رات پہلے یاد دہانی آئے گی'); }
        else toast('نوٹیفکیشن کی اجازت نہیں ملی');
      }).catch(function () { toast('یاد دہانی چالو نہیں ہو سکی'); });
    });
  }

  /* ---------- favourites + continue listening ---------- */
  var favs = store('favs') || [];
  function renderFavChips() {
    var el = $('#favChips');
    el.hidden = !favs.length;
    el.innerHTML = favs.slice().sort(function (a, b) { return a - b; }).map(function (n) {
      return '<button data-n="' + n + '">' + SURAHS[n - 1][0] + '</button>';
    }).join('');
  }
  $('#favChips').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-n]'); if (b) { playSurah(+b.dataset.n); openPlayer(); }
  });

  /* ---------- start ---------- */
  var last = store('last');
  if (last && last >= 1 && last <= 114) $('#playFirstTxt').textContent = 'سورۃ ' + SURAHS[last - 1][0] + ' سے جاری رکھیں';
  $$('.locname').forEach(function (el) { el.textContent = state.loc.name; });
  renderQibla();
  initCompass();
  setupReminders();
  setupFastReminders();
  applyLook();
  renderFavChips();
  updatePlayUI();
  showTab('qibla');
  if (state.loc.src === 'default') locate(true);

  setTimeout(function () {
    var s = $('#splash');
    s.classList.add('gone');
    setTimeout(function () { s.remove(); }, 700);
  }, 1400);

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js').catch(function () { /* offline cache unavailable */ });
  }
})();
