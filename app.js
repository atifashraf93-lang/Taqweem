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
    tab: 'home',
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
    if (name === 'home') { renderPrayer(); renderHome(); }
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
        inAppAzan();
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

  function azanOn() { return store('azan') !== false; }
  /* Android notification channels: one with the adhan sound (res/raw/azan_notify), one with the normal sound. */
  function ensureChannels(LN) {
    if (!LN.createChannel) return Promise.resolve();
    return Promise.all([
      LN.createChannel({ id: 'azan', name: 'اذان', description: 'نماز کے وقت اذان کی آواز', importance: 5, sound: 'azan_notify.mp3', vibration: true, visibility: 1 }),
      LN.createChannel({ id: 'prayerchk', name: 'کیا نماز پڑھ لی؟', description: 'نماز کا وقت ختم ہونے سے پہلے یاد دہانی', importance: 5, vibration: true, visibility: 1 }),
      LN.createChannel({ id: 'prayer', name: 'نماز کی یاد دہانی', description: 'نماز کے وقت ہلکی یاد دہانی', importance: 4, vibration: true, visibility: 1 })
    ]).catch(function () { /* channels unavailable */ });
  }

  function scheduleReminders() {
    var LN = nativeLN();
    if (!LN || (!store('rem') && !store('fastrem') && !store('chk'))) return Promise.resolve();
    var now = new Date(), list = [];
    for (var d = 0; store('rem') && d < 14; d++) {
      var date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);
      var t = dayTimes(date);
      if (!t) continue;
      REM_KEYS.forEach(function (k, i) {
        if (t[k] > now) {
          list.push({ id: d * 10 + i + 1, title: 'نماز کا وقت', body: 'اب ' + prayerLabel(k, t[k]) + ' کا وقت ہے', channelId: azanOn() ? 'azan' : 'prayer', schedule: { at: t[k], allowWhileIdle: true } });
        }
      });
    }
    if (store('fastrem')) list = list.concat(fastReminderList());
    if (store('chk')) list = list.concat(chkList());
    return ensureChannels(LN).then(function () { return clearReminders(LN); })
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

  var arab = null, hl = { n: 0, i: -1, w: null };
  function stripAr(t) { return String(t).replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '').replace(/\s+/g, ''); }
  function ayText(map, s, a) {
    var t = (map[s] && map[s][a - 1]) || '';
    if (a === 1 && s !== 1 && s !== 9) {
      var w = t.split(/\s+/);
      if (w.length > 4 && stripAr(w.slice(0, 4).join('')) === stripAr('بسم الله الرحمن الرحيم')) t = w.slice(4).join(' ');
    }
    return t;
  }
  function ayList(n) { var l = (arab && arab.map[n]) || [], o = []; for (var i = 0; i < l.length; i++) o.push(ayText(arab.map, n, i + 1)); return o; }
  function weights() {
    var ay = ayList(player.n), w = [], bis = (player.n !== 1 && player.n !== 9) ? 20 : 0, tot = bis;
    for (var i = 0; i < ay.length; i++) { var x = stripAr(ay[i] || '').length + 2; w.push(x); tot += x; }
    return { w: w, bis: bis, tot: tot };
  }
  function renderTranslation() {
    var box = $('#pTrans'), pl = $('#player');
    pl.classList.toggle('txt', !!transOpen);
    var curMd = store('qmode') || 'both';
    $$('#pModes button').forEach(function (b) { b.setAttribute('aria-pressed', String(!!transOpen && b.dataset.md === curMd)); });
    if (!transOpen) { box.hidden = true; return; }
    box.hidden = false;
    if (!trans && !arab) {
      box.innerHTML = '<div class="timport"><span>متن ابھی ایپ میں شامل نہیں۔ tanzil.net/trans سے اردو (Maududi) کی فائل "Text (with Aya Numbers)" فارمیٹ میں ڈاؤنلوڈ کر کے یہاں چنیں۔ فائل صرف آپ کے فون میں رہے گی۔</span>' +
        '<label class="btn" for="tFile">ترجمہ کی فائل چنیں</label><input type="file" id="tFile" accept=".txt,text/plain" hidden></div>';
      return;
    }
    var lines = (trans && trans.map[player.n]) || [], ay = ayList(player.n), n = Math.max(lines.length, ay.length), html = '', fs = +(store('qfs') || 28), md = store('qmode') || 'both';
    if (arab && md !== 'ur' && player.n !== 1 && player.n !== 9) html += '<div class="qbis" style="font-size:' + fs + 'px">بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ</div>';
    for (var i = 0; i < n; i++) {
      if (!lines[i] && !ay[i]) continue;
      html += '<div class="qa" data-i="' + i + '">' + (ay[i] && md !== 'ur' ? '<div class="qar" style="font-size:' + fs + 'px">' + escapeHtml(ay[i]) + ' <span class="qn">﴿' + ur(i + 1) + '﴾</span></div>' : '<span class="qn">' + ur(i + 1) + '</span>') +
        (lines[i] && md !== 'ar' ? '<p' + (md === 'ur' ? ' class="uo" style="font-size:' + Math.round(fs * .7) + 'px"' : '') + '>' + escapeHtml(lines[i]) + '</p>' : '') + '</div>';
    }
    if (!html) html = '<div class="empty">اس سورت کا متن فائل میں نہیں ملا۔</div>';
    var who = trans ? (trans.maududi ? 'مولانا ابوالاعلیٰ مودودی' : 'درآمد شدہ فائل') : '';
    box.innerHTML = '<div class="qtools"><button data-fs="-2" aria-label="چھوٹا">A−</button><button data-fs="2" aria-label="بڑا">A+</button><button id="qsync" aria-pressed="' + (store('qsync') !== false) + '">آیت نمایاں</button></div>' + html +
      '<div class="tcredit">' + (who ? 'ترجمہ: ' + who + ' · ' : '') + 'متن و ترجمہ ماخذ: <a href="https://tanzil.net" style="color:var(--accent)">tanzil.net</a>' + (trans && !trans.bundled ? '<button id="tRemove">ہٹائیں</button>' : '') + '</div>';
    hl = { n: player.n, i: -1, w: weights() };
    paintHl(true);
  }
  function paintHl(force) {
    if (!transOpen || !arab || store('qsync') === false || !hl.w || hl.n !== player.n) return;
    var d = audio.duration, c = audio.currentTime;
    if (!isFinite(d) || d <= 0) return;
    var pos = c / d * hl.w.tot - hl.w.bis, i = -1, acc = 0;
    if (pos >= 0) { for (i = 0; i < hl.w.w.length; i++) { acc += hl.w.w[i]; if (pos < acc) break; } if (i >= hl.w.w.length) i = hl.w.w.length - 1; }
    if (i === hl.i && !force) return;
    hl.i = i;
    var box = $('#pTrans'), cur = box.querySelector('.qa.on'); if (cur) cur.classList.remove('on');
    if (i < 0) return;
    var el = box.querySelector('.qa[data-i="' + i + '"]'); if (!el) return;
    el.classList.add('on');
    if (!audio.paused || force) box.scrollTo({ top: Math.max(0, el.offsetTop - box.offsetTop - 50), behavior: 'smooth' });
  }
  $('#pModes').addEventListener('click', function (e) {
    var m = e.target.closest('[data-md]'); if (!m) return;
    store('qmode', m.dataset.md); transOpen = true;
    $('#pTransBtn').setAttribute('aria-pressed', 'true');
    renderTranslation(); $('#pTrans').scrollTop = 0;
  });
  $('#pTrans').addEventListener('click', function (e) {
    var f = e.target.closest && e.target.closest('[data-fs]');
    if (f) { store('qfs', Math.min(44, Math.max(20, +(store('qfs') || 28) + +f.dataset.fs))); renderTranslation(); return; }
    if (e.target.closest && e.target.closest('#qsync')) { store('qsync', store('qsync') === false); renderTranslation(); }
  });
  audio.addEventListener('timeupdate', function () { paintHl(false); });
  audio.addEventListener('seeked', function () { paintHl(false); });
  if (window.fetch) fetch('quran-ar.txt').then(function (r) { return r.ok ? r.text() : ''; }).then(function (raw) {
    if (!raw) return; var p = Core.parseTanzil(raw); if (p.count > 6000) { arab = p; if (transOpen) renderTranslation(); if (typeof mRender === 'function') mRender(); }
  }).catch(function () { /* no bundled text */ });

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
      if (raw && loadTranslation(raw)) { trans.bundled = true; kvSet(TRANS_KEY, raw).catch(function () { /* ignore */ }); }
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
      if (at > now) list.push({ id: 1000 + d, title: 'کل روزہ', body: f.text, channelId: 'prayer', schedule: { at: at, allowWhileIdle: true } });
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

  /* ---------- click sound (all buttons) ---------- */
  var clickOn = store('click') !== false;
  var actx = null;
  function tick(strong) {
    if (!clickOn) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      var o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime;
      o.type = 'triangle'; o.frequency.setValueAtTime(strong ? 900 : 1300, t); o.frequency.exponentialRampToValueAtTime(strong ? 420 : 700, t + 0.05);
      g.gain.setValueAtTime(strong ? 0.28 : 0.14, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + 0.08);
    } catch (e) { /* audio unavailable */ }
    if (navigator.vibrate) { try { navigator.vibrate(strong ? 14 : 8); } catch (e2) { /* ignore */ } }
  }
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('button, summary, [role="tab"], a');
    if (el && el.id !== 'tasTap') tick(false);
  }, true);
  function paintClick() { var b = $('#clickBtn'); b.setAttribute('aria-pressed', String(clickOn)); b.textContent = clickOn ? 'آن' : 'بند'; }
  $('#clickBtn').addEventListener('click', function () { clickOn = !clickOn; store('click', clickOn); paintClick(); if (clickOn) tick(false); });
  paintClick();

  /* ---------- tasbeeh and darood ---------- */
  var DAROOD_IBRAHIMI = 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ إِنَّكَ حَمِيدٌ مَجِيدٌ، اللَّهُمَّ بَارِكْ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا بَارَكْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ إِنَّكَ حَمِيدٌ مَجِيدٌ';
  var PHRASES = [
    { n: 'سبحان اللہ', ar: 'سُبْحَانَ اللَّهِ', ur: 'اللہ پاک ہے', clip: 'subhan' },
    { n: 'الحمد للہ', ar: 'الْحَمْدُ لِلَّهِ', ur: 'تمام تعریفیں اللہ کے لیے ہیں', clip: 'hamd' },
    { n: 'اللہ اکبر', ar: 'اللَّهُ أَكْبَرُ', ur: 'اللہ سب سے بڑا ہے', clip: 'akbar' },
    { n: 'لا الٰہ الا اللہ', ar: 'لَا إِلَهَ إِلَّا اللَّهُ', ur: 'اللہ کے سوا کوئی معبود نہیں' },
    { n: 'استغفراللہ', ar: 'أَسْتَغْفِرُ اللَّهَ', ur: 'میں اللہ سے بخشش مانگتا ہوں', listen: 'istighfar' },
    { n: 'درود ابراہیمی', ar: DAROOD_IBRAHIMI, ur: 'درودِ ابراہیمی (نماز میں پڑھا جانے والا درود)', listen: 'darood', sm: true },
    { n: 'مختصر درود', ar: 'صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ', ur: 'اللہ کی رحمت اور سلامتی ہو آپ ﷺ پر' },
    { n: 'درود و سلام', ar: 'اللَّهُمَّ صَلِّ عَلَى سَيِّدِنَا مُحَمَّدٍ وَعَلَى آلِهِ وَصَحْبِهِ وَسَلِّمْ', ur: 'اے اللہ! ہمارے سردار محمد ﷺ اور ان کی آل و اصحاب پر رحمت اور سلام بھیج', sm: true },
    { n: 'لا حول', ar: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ', ur: 'گناہ سے بچنے کی طاقت اور نیکی کی توفیق اللہ ہی کی طرف سے ہے' }
  ];
  var tas = store('tas') || { p: 0, c: 0, t: 33 };
  if (tas.p < 0 || tas.p >= PHRASES.length || tas.v !== 2) { tas.p = 0; tas.c = 0; tas.v = 2; }
  var tasVoice = store('tasVoice') !== false;
  var clips = {}, clipNow = '';
  function clip(name) {
    if (!clips[name]) { clips[name] = new Audio('audio/' + name + '.mp3'); clips[name].preload = 'auto'; clips[name].addEventListener('ended', paintListen); clips[name].addEventListener('pause', paintListen); }
    return clips[name];
  }
  function stopClips() { Object.keys(clips).forEach(function (k) { try { clips[k].pause(); clips[k].currentTime = 0; } catch (e) { /* ignore */ } }); clipNow = ''; }
  function paintListen() {
    var P = PHRASES[tas.p], name = P.listen || P.clip, b = $('#tasListen');
    b.hidden = !name;
    var on = name && clips[name] && !clips[name].paused;
    b.textContent = on ? '⏹ روکیں' : '▶ آواز سنیں';
    $('#tasVoice').hidden = !P.clip;
  }
  function paintTas() {
    var P = PHRASES[tas.p];
    $('#tasCnt').textContent = ur(tas.c);
    $('#tasAr').textContent = P.ar; $('#tasAr').className = 'tar' + (P.sm ? ' sm' : '');
    $('#tasUr').textContent = P.ur;
    $('#tasTap').textContent = 'گنیں';
    $('#tasPhrase').innerHTML = PHRASES.map(function (p, i) { return '<button data-p="' + i + '" aria-pressed="' + (i === tas.p) + '">' + p.n + '</button>'; }).join('');
    $$('[data-t]', $('#tab-more')).forEach(function (b) { b.setAttribute('aria-pressed', String(+b.dataset.t === tas.t)); });
    $('#tasVoice').setAttribute('aria-pressed', String(tasVoice));
    paintListen();
  }
  function playClip(name, restart) {
    if (!audio.paused) audio.pause();
    Object.keys(clips).forEach(function (k) { if (k !== name) { try { clips[k].pause(); clips[k].currentTime = 0; } catch (e) { /* ignore */ } } });
    var c = clip(name); if (restart) { try { c.currentTime = 0; } catch (e) { /* ignore */ } }
    var p = c.play(); if (p && p.catch) p.catch(function () { toast('آواز نہیں چل سکی'); });
  }
  $('#tasTap').addEventListener('click', function () {
    tas.c++;
    var done = tas.c % tas.t === 0;
    tick(true);
    if (navigator.vibrate && done) { try { navigator.vibrate([80, 60, 80]); } catch (e) { /* ignore */ } }
    var P = PHRASES[tas.p];
    if (tasVoice && P.clip) playClip(P.clip, true);
    if (done) toast(ur(tas.c) + ' مکمل ہوئے');
    store('tas', tas); paintTas();
  });
  $('#tasListen').addEventListener('click', function () {
    var P = PHRASES[tas.p], name = P.listen || P.clip; if (!name) return;
    var c = clip(name);
    if (!c.paused) { c.pause(); c.currentTime = 0; } else playClip(name, true);
    paintListen();
  });
  $('#tasVoice').addEventListener('click', function () { tasVoice = !tasVoice; store('tasVoice', tasVoice); if (!tasVoice) stopClips(); paintTas(); });
  $('#tasReset').addEventListener('click', function () { tas.c = 0; store('tas', tas); paintTas(); });
  $('#tasPhrase').addEventListener('click', function (e) {
    var b = e.target.closest('[data-p]'); if (!b) return;
    stopClips(); tas.p = +b.dataset.p; tas.c = 0; store('tas', tas); paintTas();
  });
  $('#tab-more').addEventListener('click', function (e) {
    var b = e.target.closest('[data-t]'); if (!b) return;
    tas.t = +b.dataset.t; store('tas', tas); paintTas();
  });

  /* ---------- hadith ---------- */
  var HD = window.HADITH || [], HT = window.HADITH_TOPICS || {};
  var hfav = store('hfav') || [], hst = { topic: 'all', q: '' };
  function hadithOfDay() { var d = new Date(), n = Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 0)) / 864e5); return (n + d.getFullYear()) % HD.length; }
  function normAr(s) { return String(s).replace(/[ً-ٰٟۖ-ۭـ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ۃ|ہ/g, 'ه').replace(/ک/g, 'ك').replace(/ی/g, 'ي'); }
  function hEsc(s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
  function paintHadith(focus) {
    var q = normAr(hst.q.trim()), shown = 0;
    $('#hTopics').innerHTML = Object.keys(HT).map(function (k) { return '<button data-ht="' + k + '" aria-pressed="' + (hst.topic === k) + '">' + HT[k] + '</button>'; }).join('') + '<button data-ht="fav" aria-pressed="' + (hst.topic === 'fav') + '">★ پسندیدہ</button>';
    var html = HD.map(function (h, i) {
      if (hst.topic === 'fav' ? hfav.indexOf(i) < 0 : (hst.topic !== 'all' && h[0] !== hst.topic)) return '';
      if (q && normAr(h[1] + ' ' + h[2] + ' ' + h[3]).indexOf(q) < 0) return '';
      shown++;
      var on = hfav.indexOf(i) > -1;
      return '<div class="hcard" id="hd' + i + '"><div class="ht"><span>' + HT[h[0]] + '</span><span>' + ur(i + 1) + '</span></div><div class="har">' + hEsc(h[1]) + '</div><div class="hur">' + hEsc(h[2]) + '</div><div class="hs">' + hEsc(h[3]) + '</div><div class="hact"><button data-hfav="' + i + '" aria-pressed="' + on + '">' + (on ? '★ پسندیدہ' : '☆ پسندیدہ') + '</button><button data-hshare="' + i + '">شیئر</button></div></div>';
    }).join('');
    $('#hList').innerHTML = html + (shown ? '<p class="hnote">ترجمہ و حوالہ مختصر ہے۔ مکمل تفصیل کے لیے مستند کتبِ حدیث اور اہلِ علم سے رجوع کریں۔</p>' : '<div class="empty">کوئی حدیث نہیں ملی۔</div>');
    $('#hCount').textContent = '· ' + ur(shown);
    if (focus != null) { var el = document.getElementById('hd' + focus); if (el) { el.scrollIntoView({ block: 'start' }); el.classList.add('flash'); } }
  }
  function openHadith(focus) { hst = { topic: 'all', q: '' }; $('#hSearch').value = ''; $('#hadith').hidden = false; paintHadith(focus); if (focus == null) $('#hList').scrollTop = 0; }
  function shareHadith(i) {
    var h = HD[i], text = h[1] + '\n\n' + h[2] + '\n\n— ' + h[3] + '\n(تقویم، Developed by SMAA)';
    if (navigator.share) { navigator.share({ text: text }).catch(function () { /* cancelled */ }); }
    else if (navigator.clipboard) { navigator.clipboard.writeText(text).then(function () { toast('نقل کر لی گئی'); }).catch(function () { toast('شیئر نہیں ہو سکا'); }); }
  }
  function paintHdayHome() { if (!HD.length) return; var h = HD[hadithOfDay()]; $('#hdAr').textContent = h[1]; $('#hdUr').textContent = h[2]; }
  $('#hBack').addEventListener('click', function () { $('#hadith').hidden = true; });
  $('#hSearch').addEventListener('input', function () { hst.q = this.value; paintHadith(); });
  $('#hadith').addEventListener('click', function (e) {
    var t = e.target.closest('[data-ht]');
    if (t) { hst.topic = t.dataset.ht; paintHadith(); return; }
    t = e.target.closest('[data-hfav]');
    if (t) { var i = +t.dataset.hfav, ix = hfav.indexOf(i); if (ix > -1) hfav.splice(ix, 1); else hfav.push(i); store('hfav', hfav); var y = $('#hList').scrollTop; paintHadith(); $('#hList').scrollTop = y; return; }
    t = e.target.closest('[data-hshare]'); if (t) shareHadith(+t.dataset.hshare);
  });
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-hday]')) openHadith(hadithOfDay());
    else if (e.target.closest('[data-hadith]')) openHadith(null);
  });
  paintHdayHome();

  /* ---------- naat ---------- */
  var NT = window.NAATS || [], naatAudio = new Audio(), nCur = null;
  naatAudio.preload = 'none';
  function nTime(s) { if (!isFinite(s)) return '0:00'; s = Math.floor(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function nList() {
    nCur = null; $('#nTitle').textContent = 'نعت و سلام';
    var last = '';
    $('#nBody').innerHTML = NT.map(function (n, i) {
      var g = n.kind.indexOf('حمد') === 0 ? 'حمد' : 'نعت و سلام', hd = g !== last ? '<h2 class="hs" style="margin:16px 4px 0;font-size:17px">' + g + '</h2>' : ''; last = g;
      return hd + '<button class="ncard" data-nid="' + i + '"><b>' + hEsc(n.t) + '</b><small>' + (n.poet ? hEsc(n.poet) + ' · ' : '') + '<span class="nk">' + n.kind + '</span>' + (n.audio ? ' · 🔊 آڈیو' : '') + '</small></button>';
    }).join('') + '<p class="hnote">یہاں وہ کلام ہے جس کے شعرا کو وفات پائے طویل عرصہ ہو چکا ہے۔ اشعار منتخب ہیں، مکمل کلام اور درست متن کے لیے مستند دیوان سے ملا لیں۔</p>';
  }
  function nShow(i) {
    var n = NT[i]; nCur = i; $('#nTitle').textContent = n.t;
    var arabic = /[ً-ٟ]/.test(n.v.length ? n.v[0][0] : "");
    $('#nBody').innerHTML = '<div class="hs" style="text-align:center;margin-top:6px">' + (n.poet ? hEsc(n.poet) + ' · ' : '') + n.kind + '</div>' +
      (n.audio ? '<div class="nplay"><button id="nPlay" aria-label="چلائیں">▶</button><span id="nCur">0:00</span><input id="nSeek" type="range" min="0" max="100" value="0" aria-label="آگے پیچھے"><span id="nDur">0:00</span></div>' : (n.v.length && 'speechSynthesis' in window ? '<div class="nplay" style="flex-wrap:wrap;justify-content:center"><button class="btn" id="nSpeak" style="width:auto;padding:8px 20px;min-height:44px;font-size:16px;margin:0">🔊 متن پڑھ کر سنائیں</button><small class="hnote" style="width:100%;text-align:center;margin:4px 0 0">مشینی آواز میں تلاوتِ متن ہے، نعت کی ریکارڈنگ نہیں۔</small></div>' : '<p class="noaudio">اس کلام کی ریکارڈنگ ابھی شامل نہیں۔</p>')) +
      (n.v.length ? '' : '<p class="noaudio">اس کلام کا متن شامل نہیں، صرف آڈیو ہے۔</p>') +
      (n.v.length ? '<div class="nv">' : '<div hidden>') + n.v.map(function (c, k) { return '<div class="l1' + (arabic ? ' ar' : '') + '">' + hEsc(c[0]) + '</div><div class="l2' + (arabic ? ' ar' : '') + '">' + hEsc(c[1]) + '</div>' + (n.m && n.m[k] ? '<div class="mean">' + hEsc(n.m[k]) + '</div>' : '') + (k < n.v.length - 1 ? '<hr style="border:none;border-top:1px solid var(--line);margin:6px 24px">' : ''); }).join('') + '</div>' +
      (n.v.length ? '<button class="btn ghost" data-nshare="' + i + '" style="margin-top:12px">شیئر کریں</button>' : '');
    $('#nBody').scrollTop = 0;
    if (n.audio) { if (!naatAudio.src || naatAudio.src.indexOf(n.audio) < 0) { naatAudio.src = n.audio; } nPaint(); }
  }
  function nPaint() {
    var b = $('#nPlay'); if (!b) return;
    b.textContent = naatAudio.paused ? '▶' : '⏸';
    $('#nCur').textContent = nTime(naatAudio.currentTime); $('#nDur').textContent = nTime(naatAudio.duration);
    $('#nSeek').value = naatAudio.duration ? Math.round(naatAudio.currentTime / naatAudio.duration * 100) : 0;
  }
  ['timeupdate', 'play', 'pause', 'loadedmetadata', 'ended'].forEach(function (ev) { naatAudio.addEventListener(ev, nPaint); });
  naatAudio.addEventListener('play', function () { if (!audio.paused) audio.pause(); stopClips(); });
  audio.addEventListener('play', function () { if (!naatAudio.paused) naatAudio.pause(); });
  function nStop() { try { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); } catch (x) { /* ignore */ } var b = $('#nSpeak'); if (b) b.textContent = '🔊 متن پڑھ کر سنائیں'; }
  function nSpeak() {
    var b = $('#nSpeak'), n = NT[nCur]; if (!b || !n) return;
    if (window.speechSynthesis.speaking) { nStop(); return; }
    if (!naatAudio.paused) naatAudio.pause();
    var arabic = /[ً-ٟ]/.test(n.v[0][0]), lines = [];
    n.v.forEach(function (c) { lines.push(c[0]); if (!arabic) lines.push(c[1]); else if (c[1] && !/[a-zA-Z]/.test(c[1])) lines.push(c[1]); });
    window.speechSynthesis.cancel();
    lines.forEach(function (l, i) {
      var u = new SpeechSynthesisUtterance(l); u.lang = arabic && i % 2 === 0 ? 'ar-SA' : 'ur-PK'; u.rate = 0.8;
      if (i === lines.length - 1) u.onend = function () { nStop(); };
      window.speechSynthesis.speak(u);
    });
    b.textContent = '⏹ روکیں';
  }
  function openNaat() { $('#naat').hidden = false; nList(); }
  $('#nBack').addEventListener('click', function () { nStop(); if (nCur !== null) nList(); else { $('#naat').hidden = true; naatAudio.pause(); } });
  $('#naat').addEventListener('click', function (e) {
    var t = e.target.closest('[data-nid]'); if (t) return nShow(+t.dataset.nid);
    if (e.target.closest('#nSpeak')) { nSpeak(); return; }
    if (e.target.closest('#nPlay')) { if (naatAudio.paused) { var p = naatAudio.play(); if (p && p.catch) p.catch(function () { toast('آواز نہیں چل سکی'); }); } else naatAudio.pause(); return; }
    t = e.target.closest('[data-nshare]');
    if (t) { var n = NT[+t.dataset.nshare], text = n.t + '\n' + n.poet + '\n\n' + n.v.map(function (c) { return c[0] + '\n' + c[1]; }).join('\n\n') + '\n\n— تقویم، Developed by SMAA'; if (navigator.share) navigator.share({ text: text }).catch(function () { /* cancelled */ }); else if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { toast('نقل کر لی گئی'); }); }
  });
  $('#naat').addEventListener('input', function (e) { if (e.target.id === 'nSeek' && naatAudio.duration) naatAudio.currentTime = naatAudio.duration * e.target.value / 100; });
  document.addEventListener('click', function (e) { if (e.target.closest('[data-naat]')) openNaat(); });

  /* ---------- mushaf: 604 pages, 15 lines (Madani layout; page starts from Tanzil data) ---------- */
  var MP = window.QPAGES || [], QJ = window.QJUZ || [], mCur = Math.min(604, Math.max(1, +store('mpage') || 1)), mTrOn = false;
  var BISM = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ';
  function qcmp(x, y) { return x[0] - y[0] || x[1] - y[1]; }
  function pageOfAyah(s, a) {
    var lo = 1, hi = 604;
    while (lo < hi) { var mid = (lo + hi + 1) >> 1; if (qcmp(MP[mid - 1], [s, a]) <= 0) lo = mid; else hi = mid - 1; }
    return lo;
  }
  function juzOf(s, a) { var j = 1; for (var i = 1; i <= 30; i++) { if (qcmp(QJ[i - 1], [s, a]) <= 0) j = i; } return j; }
  function arDigits(n) { return String(n).replace(/\d/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'[+d]; }); }
  function mItems(p) {
    var st = MP[p - 1], en = MP[p], items = [], s = st[0], a = st[1], guard = 0;
    while (qcmp([s, a], en) < 0 && guard++ < 400) {
      var cnt = SURAHS[s - 1][2];
      if (a === 1) { items.push({ t: 'h', s: s }); if (s !== 1 && s !== 9) items.push({ t: 'b' }); }
      items.push({ t: 'a', s: s, a: a, text: ayText(arab.map, s, a) });
      a++; if (a > cnt) { s++; a = 1; }
    }
    return items;
  }
  var mCtx = null;
  function mWidth(txt, font) { if (!mCtx) mCtx = document.createElement('canvas').getContext('2d'); mCtx.font = font; return mCtx.measureText(txt).width; }
  function mRender() {
    var box = $('#mPage'); if ($('#mushaf').hidden) return;
    if (!arab) { box.innerHTML = '<p class="noaudio" style="margin:auto">متن لوڈ ہو رہا ہے…</p>'; return; }
    var p = mCur, items = mItems(p), total = p <= 2 ? 8 : 15, words = [], heads = 0, i;
    items.forEach(function (it) {
      if (it.t === 'h' || it.t === 'b') heads++;
      else { it.text.split(/\s+/).filter(Boolean).forEach(function (w) { words.push({ w: w }); }); words.push({ w: arDigits(it.a), n: 1 }); }
    });
    var cs = getComputedStyle(box), W = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 4, H = box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    var fam = getComputedStyle(document.documentElement).getPropertyValue('--arabic') || 'serif', font = '40px ' + fam;
    var n = Math.max(1, total - heads), sp = mWidth(' ', font) || 8, tot = 0;
    words.forEach(function (x) { x.px = (x.n ? 44 : mWidth(x.w, font)) + sp; tot += x.px; });
    n = Math.min(n, words.length);
    var target = tot / n, lines = [[]], cum = 0, k = 0;
    words.forEach(function (x) {
      if (k < n - 1 && lines[k].length && cum + x.px / 2 > (k + 1) * target) { lines.push([]); k++; }
      lines[k].push(x); cum += x.px;
    });
    var maxW = 0; lines.forEach(function (l) { var s = 0; l.forEach(function (x) { s += x.px; }); if (s > maxW) maxW = s; });
    var rowH = H / total, fs = Math.min(40 * W / (maxW || 1) * 0.96, rowH * 0.78);
    var rows = [], cumWords = 0;
    items.forEach(function (it) { if (it.t === 'a') { cumWords += it.text.split(/\s+/).filter(Boolean).length + 1; it.endIdx = cumWords; } });
    var idx = 0, hdrAt = {}, hq = [];
    items.forEach(function (it) {
      if (it.t === 'h' || it.t === 'b') hq.push(it);
      else { if (hq.length) { hdrAt[idx] = (hdrAt[idx] || []).concat(hq); hq = []; } idx = it.endIdx; }
    });
    var pos = 0;
    lines.forEach(function (l) { rows.push({ start: pos, l: l }); pos += l.length; });
    // header positions: each header group applies before the word at index = previous ayah end (hdrAt key); attach to the line that starts at or contains that index
    var out = '', used = {};
    rows.forEach(function (r) {
      Object.keys(hdrAt).forEach(function (key) {
        var kp = +key;
        if (!used[key] && kp >= r.start && kp < r.start + r.l.length) {
          used[key] = 1;
          hdrAt[key].forEach(function (it) { out += it.t === 'h' ? '<div class="mhd" style="height:' + (rowH * .9) + 'px;line-height:' + (rowH * .9) + 'px;font-size:' + (fs * .95) + 'px">سُورَةُ ' + hEsc(SURAHS[it.s - 1][1]) + '</div>' : '<div class="mbis" style="height:' + rowH + 'px;line-height:' + rowH + 'px;font-size:' + (fs * .95) + 'px">' + BISM + '</div>'; });
        }
      });
      out += '<div class="mln" style="height:' + rowH + 'px;line-height:' + rowH + 'px;font-size:' + fs + 'px"><span class="mi">' + r.l.map(function (x) { return x.n ? '<span class="n">' + x.w + '</span>' : hEsc(x.w); }).join(' ') + '</span></div>';
    });
    box.innerHTML = out;
    $$('#mPage .mln').forEach(function (ln) {
      var sp2 = ln.firstChild, gaps = (sp2.textContent.match(/ /g) || []).length + sp2.querySelectorAll('.n').length * 0, natural = sp2.getBoundingClientRect().width, extra = W - natural;
      var cnt = sp2.childNodes.length > 1 ? sp2.childNodes.length - 1 : 0, n2 = Math.max(1, (sp2.textContent.split(' ').length - 1));
      if (extra > 0 && n2 > 0) ln.style.wordSpacing = (extra / n2) + 'px'; else if (extra < 0) ln.style.wordSpacing = Math.max(extra / n2, -3) + 'px';
    });
    var f = items.filter(function (it) { return it.t === 'a'; })[0] || { s: MP[p - 1][0], a: MP[p - 1][1] };
    $('#mJuz').textContent = 'الجزء ' + arDigits(juzOf(f.s, f.a));
    $('#mSura').textContent = SURAHS[f.s - 1][1];
    $('#mNo').textContent = ur(p) + ' / ' + ur(604);
    $('#mPrev').disabled = p <= 1; $('#mNext').disabled = p >= 604;
    $('#mPrev').style.opacity = p <= 1 ? .4 : 1; $('#mNext').style.opacity = p >= 604 ? .4 : 1;
    var bms = store('mbm') || []; var on = bms.indexOf(p) >= 0;
    $('#mBm').textContent = on ? '★' : '☆'; $('#mBm').setAttribute('aria-pressed', String(on));
    store('mpage', p);
    if (mTrOn) mTransRender(items);
  }
  function mTransRender(items) {
    var box = $('#mTrans'); box.hidden = !mTrOn; $('#mTr').setAttribute('aria-pressed', String(mTrOn));
    if (!mTrOn) return;
    items = items || mItems(mCur);
    var h = '';
    items.forEach(function (it) { if (it.t === 'a') { var t = trans && trans.map[it.s] && trans.map[it.s][it.a - 1]; if (t) h += '<p><b>' + ur(it.s) + ':' + ur(it.a) + '</b>' + hEsc(t) + '</p>'; } });
    box.innerHTML = h || '<p>ترجمہ دستیاب نہیں۔</p>';
    box.scrollTop = 0;
  }
  function mGo(p) { mCur = Math.min(604, Math.max(1, p | 0)); mRender(); }
  function openMushaf() { $('#mushaf').hidden = false; requestAnimationFrame(mRender); }
  var mTab = 's';
  function mSheetRender() {
    var b = $('#mSheetBody'), h = '';
    $$('#mSheet [data-mt]').forEach(function (x) { x.setAttribute('aria-pressed', String(x.dataset.mt === mTab)); });
    if (mTab === 's') SURAHS.forEach(function (s, i) { h += '<button class="mi" data-mp="' + pageOfAyah(i + 1, 1) + '"><span>' + ur(i + 1) + '. ' + s[0] + '</span><small style="font-family:var(--arabic);font-size:16px;color:var(--accent)">' + s[1] + ' · ' + ur(pageOfAyah(i + 1, 1)) + '</small></button>'; });
    else if (mTab === 'j') for (var j = 1; j <= 30; j++) h += '<button class="mi" data-mp="' + pageOfAyah(QJ[j - 1][0], QJ[j - 1][1]) + '"><span>پارہ ' + ur(j) + '</span><small>صفحہ ' + ur(pageOfAyah(QJ[j - 1][0], QJ[j - 1][1])) + '</small></button>';
    else if (mTab === 'p') h = '<input id="mPageIn" type="number" inputmode="numeric" min="1" max="604" placeholder="صفحہ نمبر (1 سے 604)"><button class="btn" id="mPageGo">جائیں</button>';
    else { var bm = (store('mbm') || []).slice().sort(function (x, y) { return x - y; }); h = bm.length ? bm.map(function (p) { return '<button class="mi" data-mp="' + p + '"><span>صفحہ ' + ur(p) + '</span><small>' + hEsc(SURAHS[MP[p - 1][0] - 1][0]) + '</small></button>'; }).join('') : '<p class="noaudio">ابھی کوئی نشان نہیں۔ صفحے پر ☆ دبائیں۔</p>'; }
    b.innerHTML = h;
  }
  $('#mushaf').addEventListener('click', function (e) {
    var t = e.target;
    if (t.closest('#mBack')) { $('#mushaf').hidden = true; return; }
    if (t.closest('#mNext')) return mGo(mCur + 1);
    if (t.closest('#mPrev')) return mGo(mCur - 1);
    if (t.closest('#mBm')) { var b = store('mbm') || [], i = b.indexOf(mCur); if (i >= 0) b.splice(i, 1); else b.push(mCur); store('mbm', b); return mRender(); }
    if (t.closest('#mTr')) { mTrOn = !mTrOn; return mTransRender(); }
    if (t.closest('#mIndex')) { $('#mSheet').hidden = false; mSheetRender(); return; }
    if (t.closest('#mSheetClose') || t === $('#mSheet')) { $('#mSheet').hidden = true; return; }
    var tab = t.closest('[data-mt]'); if (tab) { mTab = tab.dataset.mt; return mSheetRender(); }
    var mp = t.closest('[data-mp]'); if (mp) { $('#mSheet').hidden = true; return mGo(+mp.dataset.mp); }
    if (t.closest('#mPageGo')) { var v = +$('#mPageIn').value; if (v >= 1 && v <= 604) { $('#mSheet').hidden = true; mGo(v); } else toast('صفحہ 1 سے 604 تک'); }
  });
  var mX = null;
  $('#mPage').addEventListener('touchstart', function (e) { mX = e.touches[0].clientX; }, { passive: true });
  $('#mPage').addEventListener('touchend', function (e) { if (mX === null) return; var dx = e.changedTouches[0].clientX - mX; mX = null; if (Math.abs(dx) > 60) mGo(mCur + (dx > 0 ? 1 : -1)); });
  document.addEventListener('keydown', function (e) { if ($('#mushaf').hidden) return; if (e.key === 'ArrowLeft') mGo(mCur + 1); else if (e.key === 'ArrowRight') mGo(mCur - 1); });
  window.addEventListener('resize', function () { mRender(); });
  document.addEventListener('click', function (e) { if (e.target.closest('[data-mushaf]')) openMushaf(); });
  window.mTest = { go: mGo, render: mRender };


  /* ---------- tafseer (streamed from archive.org, needs internet) ---------- */
  var TF_ITEM = 'Tafheem-ul-QuranBySyedAbulAlaMoududi-48kBitss', TF_BASE = 'https://archive.org/download/' + TF_ITEM + '/';
  var tfList = null, tfCur = -1, tfAudio = new Audio(), tfLoading = false, tfErr = '';
  tfAudio.preload = 'none';
  function tfLoad() {
    if (tfList || tfLoading) return;
    tfLoading = true; tfErr = '';
    $('#tfBody').innerHTML = '<p class="noaudio">فہرست لوڈ ہو رہی ہے…</p>';
    fetch('https://archive.org/metadata/' + TF_ITEM).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(function (j) {
      var list = (j.files || []).filter(function (f) { return /\.mp3$/i.test(f.name || ''); }).map(function (f) {
        return { file: f.name, name: f.name.replace(/\.mp3$/i, '').replace(/_/g, ' '), mb: Math.round((+f.size || 0) / 1048576) };
      });
      list.sort(function (x, y) { return x.file.localeCompare(y.file, undefined, { numeric: true }); });
      if (!list.length) throw new Error('no mp3 files');
      tfList = list; tfPaint();
    }).catch(function (err) {
      tfErr = String(err && err.message || err);
      $('#tfBody').innerHTML = '<p class="noaudio">فہرست نہیں مل سکی۔ انٹرنیٹ دیکھیں اور دوبارہ کوشش کریں۔<br><span style="direction:ltr;display:block;font-size:12px">' + hEsc(tfErr) + '</span></p><button class="btn ghost" id="tfRetry">دوبارہ کوشش</button>';
    }).then(function () { tfLoading = false; });
  }
  function tfPaint() {
    if (!tfList) return;
    $('#tfBody').innerHTML = (tfCur >= 0 ? '<div class="nplay"><button id="tfPlay" aria-label="چلائیں">▶</button><span id="tfCurT">0:00</span><input id="tfSeek" type="range" min="0" max="100" value="0" aria-label="آگے پیچھے"><span id="tfDur">0:00</span></div><p class="noaudio" id="tfNow"></p>' : '') +
      tfList.map(function (t, i) { return '<button class="ncard" data-tfi="' + i + '"' + (i === tfCur ? ' style="border-color:var(--accent)"' : '') + '><b style="direction:ltr;text-align:left">' + hEsc(t.name) + '</b><small>' + (t.mb ? ur(t.mb) + ' MB · ' : '') + 'انٹرنیٹ سے چلے گی</small></button>'; }).join('') +
      '<p class="hnote">یہ تفسیر انٹرنیٹ (archive.org) سے چلتی ہے اور موبائل ڈیٹا خرچ کرتی ہے۔ آڈیو ایپ کا حصہ نہیں۔</p>';
    tfTick();
  }
  function tfTick() {
    var b = $('#tfPlay'); if (!b) return;
    b.textContent = tfAudio.paused ? '▶' : '⏸';
    $('#tfCurT').textContent = nTime(tfAudio.currentTime); $('#tfDur').textContent = nTime(tfAudio.duration);
    $('#tfSeek').value = tfAudio.duration ? Math.round(tfAudio.currentTime / tfAudio.duration * 100) : 0;
  }
  ['timeupdate', 'play', 'pause', 'loadedmetadata', 'ended'].forEach(function (ev) { tfAudio.addEventListener(ev, tfTick); });
  tfAudio.addEventListener('play', function () { if (!audio.paused) audio.pause(); if (!naatAudio.paused) naatAudio.pause(); stopClips(); });
  audio.addEventListener('play', function () { if (!tfAudio.paused) tfAudio.pause(); });
  naatAudio.addEventListener('play', function () { if (!tfAudio.paused) tfAudio.pause(); });
  tfAudio.addEventListener('error', function () { var n = $('#tfNow'); if (tfAudio.src) { toast('آڈیو نہیں چل سکی'); if (n) n.textContent = 'آڈیو نہیں چل سکی۔ انٹرنیٹ دیکھیں۔'; } });
  tfAudio.addEventListener('ended', function () { if (tfList && tfCur + 1 < tfList.length) tfPlay(tfCur + 1); });
  function tfPlay(i) {
    var t = tfList[i]; tfCur = i; tfPaint(); $('#tfNow').textContent = t.name;
    tfAudio.src = TF_BASE + encodeURIComponent(t.file);
    var p = tfAudio.play(); if (p && p.catch) p.catch(function () { /* error event reports it */ });
  }
  $('#tfBack').addEventListener('click', function () { $('#tafseer').hidden = true; });
  $('#tafseer').addEventListener('click', function (e) {
    var t = e.target.closest('[data-tfi]'); if (t) return tfPlay(+t.dataset.tfi);
    if (e.target.closest('#tfPlay')) { if (tfAudio.paused) tfAudio.play().catch(function () { /* ignore */ }); else tfAudio.pause(); return; }
    if (e.target.closest('#tfRetry')) tfLoad();
  });
  $('#tafseer').addEventListener('input', function (e) { if (e.target.id === 'tfSeek' && tfAudio.duration) tfAudio.currentTime = tfAudio.duration * e.target.value / 100; });
  document.addEventListener('click', function (e) { if (e.target.closest('[data-tf]')) { $('#tafseer').hidden = false; tfList ? tfPaint() : tfLoad(); } });



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
    var wk = '', tot = 0;
    for (var w = 6; w >= 0; w--) {
      var dd = new Date(n.getFullYear(), n.getMonth(), n.getDate() - w), m2 = trk[Core.dateKey(dd.getFullYear(), dd.getMonth() + 1, dd.getDate())] || 0, c = 0;
      for (var b2 = 0; b2 < 5; b2++) if (m2 & (1 << b2)) c++;
      tot += c;
      wk += '<div><i><u style="height:' + (c * 20) + '%"></u></i>' + Data.WEEKDAYS[dd.getDay()] + '</div>';
    }
    $('#trkWeek').innerHTML = wk; $('#trkWk').textContent = ur(tot) + ' / ' + ur(35);
  }
  $('#trkBtns').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-i]'); if (!b) return;
    var k = todayKey();
    trk[k] = (trk[k] || 0) ^ (1 << +b.dataset.i);
    var keys = Object.keys(trk).sort();
    while (keys.length > 120) delete trk[keys.shift()];
    store('trk', trk); paintTrk();
    if (trk[k] & (1 << +b.dataset.i)) cancelChk(+b.dataset.i, new Date());
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
  var azanAudio = null;
  function stopAzan() { if (azanAudio) { azanAudio.pause(); azanAudio = null; } $('#azanTest').textContent = 'اذان سنیں'; }
  function setupAzan() {
    function paint() { var on = azanOn(); $('#azanBtn').setAttribute('aria-pressed', String(on)); $('#azanBtn').textContent = on ? 'اذان' : 'عام آواز'; }
    paint();
    if (nativeLN()) $('#azanRow').hidden = false;
    $('#azanBtn').addEventListener('click', function () { store('azan', !azanOn()); paint(); scheduleReminders(); toast(azanOn() ? 'نماز کے وقت اذان کی آواز آئے گی' : 'عام نوٹیفکیشن آواز'); });
    $('#azanTest').addEventListener('click', function () {
      if (azanAudio) { stopAzan(); return; }
      azanAudio = new Audio('azan.mp3');
      azanAudio.addEventListener('ended', stopAzan);
      azanAudio.play().then(function () { $('#azanTest').textContent = 'روکیں'; }).catch(function () { azanAudio = null; toast('اذان نہیں چل سکی'); });
    });
  }
  /* Browser use only: the app plays the adhan itself. On Android the notification carries the sound. */
  function inAppAzan() {
    if (nativeLN() || !azanOn() || !audio.paused) return;
    try { var z = new Audio('azan.mp3'); z.play().catch(function () { /* blocked until the user taps the page */ }); } catch (e) { /* ignore */ }
  }

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

  /* ---------- home ---------- */
  function renderHome() {
    var tn = todayNum(), ht = Core.hijriFromDayNum(tn, state.hoff), now = new Date(), hr = now.getHours();
    $('#hGreet').textContent = hr < 12 ? 'صبح بخیر' : hr < 18 ? 'السلام علیکم' : 'شام بخیر';
    $('#h-home').textContent = ht ? ur(ht.d) + ' ' + Data.HIJRI_MONTHS[ht.m - 1] + ' ' + ur(ht.y) + 'ھ' : '—';
    $('#hGreg').textContent = Data.WEEKDAYS[now.getDay()] + '، ' + gregText({ d: now.getDate(), m: now.getMonth() + 1, y: now.getFullYear() }) + ' · ' + state.loc.name;
    var t = dayTimes(now);
    if (t) {
      var f = clock(t.fajr), m = clock(t.maghrib);
      $('#hMini').innerHTML = '<div><small>سحری ختم</small><b>' + f.t + ' ' + f.p + '</b></div><div><small>افطار</small><b>' + m.t + ' ' + m.p + '</b></div>';
    }
    var fa = fastFor(tn), fb = fastFor(tn + 1), parts = [];
    if (fa) parts.push('آج: ' + fa.text);
    if (fb) parts.push('کل: ' + fb.text);
    $('#hFast').hidden = !parts.length; $('#hFast').innerHTML = parts.join('<br>');
    var b = Core.qiblaBearing(state.loc.lat, state.loc.lng);
    $('#hQibla').textContent = ur(Math.round(b)) + '° · ' + ur(Math.round(Core.distanceKm(state.loc.lat, state.loc.lng, Core.KAABA.lat, Core.KAABA.lng)).toLocaleString('en-US')) + ' کلومیٹر';
    var last = store('last');
    $('#hRecite').textContent = last ? 'جاری رکھیں: سورۃ ' + SURAHS[last - 1][0] : 'شیخ السدیس کی تلاوت';
    var items = [];
    if (ht) Data.OCCASIONS.forEach(function (o) {
      [ht.y, ht.y + 1].some(function (y) {
        var n = Core.monthStartDayNum(y, o[0], state.hoff, tn) + o[1] - 1;
        if (n >= tn) { items.push({ n: n, name: o[2] }); return true; }
        return false;
      });
    });
    items.sort(function (x, y) { return x.n - y.n; });
    $('#hOcc').textContent = items.length ? items[0].name + ' · ' + (items[0].n - tn === 0 ? 'آج' : ur(items[0].n - tn) + ' دن') : 'اسلامی ایام';
    tickHome();
  }
  function tickHome() {
    if (state.tab !== 'home') return;
    var now = new Date();
    if (!nextInfo || nextInfo.at <= now) renderPrayer();
    if (!nextInfo) return;
    var c = clock(nextInfo.at);
    $('#hnName').textContent = prayerLabel(nextInfo.key, nextInfo.at);
    $('#hnTime').textContent = c.t; $('#hnPer').textContent = c.p;
    $('#hnRem').textContent = remainText(nextInfo.at - now);
  }
  setInterval(tickHome, 1000);
  document.addEventListener('click', function (e) {
    var g = e.target.closest('[data-go]'); if (!g) return;
    showTab(g.dataset.go);
    if (g.dataset.open) { var d = document.getElementById(g.dataset.open); if (d) { d.open = true; d.scrollIntoView(); } }
  });


  /* ---------- masnoon duain ---------- */
  var DU = window.DUAS || [], DCATS = window.DUAS_CATS || {}, dst = { cat: 'all', q: '' }, dfav = store('dfav') || [];
  function duaBody(d) {
    if (!d[4]) return { ar: d[1], ur: d[2] };
    var q = d[4], ar = [], tr = [], i;
    for (i = q[1]; i <= q[2]; i++) {
      if (arab) ar.push(ayText(arab.map, q[0], i));
      if (trans && trans.map[q[0]] && trans.map[q[0]][i - 1]) tr.push(trans.map[q[0]][i - 1]);
    }
    return { ar: ar.join(' ') || 'متن لوڈ ہو رہا ہے…', ur: tr.join(' ') };
  }
  function duaShareText(d) { var b = duaBody(d); return b.ar + '\n\n' + b.ur + '\n\n— ' + d[3] + '\n(تقویم، Developed by SMAA)'; }
  function paintDuas() {
    var cats = Object.keys(DCATS).concat(['fav']);
    $('#dTopics').innerHTML = cats.map(function (k) {
      return '<button data-dt="' + k + '" aria-pressed="' + (dst.cat === k) + '">' + (k === 'fav' ? 'پسندیدہ' : DCATS[k]) + '</button>';
    }).join('');
    var q = dst.q.trim(), out = [];
    DU.forEach(function (d, i) {
      if (dst.cat === 'fav' ? dfav.indexOf(i) < 0 : (dst.cat !== 'all' && d[0] !== dst.cat)) return;
      var b = duaBody(d);
      if (q && (b.ar + ' ' + b.ur + ' ' + d[3]).indexOf(q) < 0) return;
      out.push('<div class="hcard dcard"><div class="ht"><span>' + hEsc(DCATS[d[0]] || '') + '</span></div><div class="har">' + hEsc(b.ar) + '</div><div class="hur">' + hEsc(b.ur) + '</div><div class="hs">' + hEsc(d[3]) + '</div>' +
        '<div class="hact"><button data-dcopy="' + i + '">نقل کریں</button><button data-dshare="' + i + '">شیئر</button><button data-dfav="' + i + '" aria-pressed="' + (dfav.indexOf(i) >= 0) + '">پسندیدہ</button></div></div>');
    });
    $('#dCount').textContent = '(' + ur(out.length) + ')';
    $('#dList').innerHTML = out.join('') || '<p class="hnote">کوئی دعا نہیں ملی۔</p>';
  }
  function openDuas() { dst = { cat: 'all', q: '' }; $('#dSearch').value = ''; $('#duas').hidden = false; paintDuas(); $('#dList').scrollTop = 0; }
  $('#dBack').addEventListener('click', function () { $('#duas').hidden = true; });
  $('#dSearch').addEventListener('input', function () { dst.q = this.value; paintDuas(); });
  $('#duas').addEventListener('click', function (e) {
    var t = e.target.closest('[data-dt]');
    if (t) { dst.cat = t.dataset.dt; paintDuas(); return; }
    t = e.target.closest('[data-dfav]');
    if (t) { var i = +t.dataset.dfav, p = dfav.indexOf(i); if (p >= 0) dfav.splice(p, 1); else dfav.push(i); store('dfav', dfav); paintDuas(); return; }
    t = e.target.closest('[data-dcopy]');
    if (t) { var tx = duaShareText(DU[+t.dataset.dcopy]); if (navigator.clipboard) navigator.clipboard.writeText(tx).then(function () { toast('نقل کر لی گئی'); }).catch(function () { toast('نقل نہیں ہو سکی'); }); return; }
    t = e.target.closest('[data-dshare]');
    if (t) {
      var text = duaShareText(DU[+t.dataset.dshare]);
      if (navigator.share) navigator.share({ text: text }).catch(function () { /* cancelled */ });
      else if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { toast('نقل کر لی گئی'); }).catch(function () { toast('شیئر نہیں ہو سکا'); });
    }
  });
  document.addEventListener('click', function (e) { if (e.target.closest('[data-duas]')) openDuas(); });

  /* ---------- kutub khana (links only, no book text inside the app) ---------- */
  var BK = window.BOOKS || [], BCATS = window.BOOK_CATS || {}, bst = { cat: 'all', q: '' }, bfav = store('bfav') || [];
  function bookCard(b, i) {
    return '<div class="hcard"><div class="bk"><div class="bt"><b>' + hEsc(b[1]) + '</b>' + (b[2] ? '<small>' + hEsc(b[2]) + '</small>' : '') + '</div><a class="rd" href="' + hEsc(b[3]) + '" target="_blank" rel="noopener">پڑھیں</a></div>' +
      '<div class="hact"><button data-bfav="' + i + '" aria-pressed="' + (bfav.indexOf(i) >= 0) + '">پسندیدہ</button></div></div>';
  }
  function paintBooks() {
    $('#bkTopics').innerHTML = Object.keys(BCATS).concat(['fav']).map(function (k) {
      return '<button data-bt="' + k + '" aria-pressed="' + (bst.cat === k) + '">' + (k === 'fav' ? 'پسندیدہ' : BCATS[k]) + '</button>';
    }).join('');
    var q = bst.q.trim(), html = '', n = 0, lastCat = '';
    var groups = bst.cat === 'all' || bst.cat === 'fav' || q;
    BK.forEach(function (b, i) {
      if (bst.cat === 'fav' ? bfav.indexOf(i) < 0 : (bst.cat !== 'all' && b[0] !== bst.cat)) return;
      if (q && (b[1] + ' ' + b[2] + ' ' + (window.BOOK_AUTH[b[0]] || '')).indexOf(q) < 0) return;
      if (groups && b[0] !== lastCat) { lastCat = b[0]; html += '<h2 class="bkh">' + hEsc(window.BOOK_AUTH[b[0]] || '') + '</h2>'; }
      html += bookCard(b, i); n++;
    });
    $('#bkCount').textContent = '(' + ur(n) + ')';
    $('#bkList').innerHTML = (html || '<p class="hnote">کوئی کتاب نہیں ملی۔</p>') + '<p class="hnote">کتابوں کا متن ایپ میں محفوظ نہیں۔ "پڑھیں" دبانے پر Rekhta کی ویب سائٹ کھلتی ہے، جس کے لیے انٹرنیٹ چاہیے۔</p>';
  }
  function openBooks() { bst = { cat: 'all', q: '' }; $('#bkSearch').value = ''; $('#books').hidden = false; paintBooks(); $('#bkList').scrollTop = 0; }
  $('#bkBack').addEventListener('click', function () { $('#books').hidden = true; });
  $('#bkSearch').addEventListener('input', function () { bst.q = this.value; paintBooks(); });
  $('#books').addEventListener('click', function (e) {
    var t = e.target.closest('[data-bt]');
    if (t) { bst.cat = t.dataset.bt; paintBooks(); return; }
    t = e.target.closest('[data-bfav]');
    if (t) { var i = +t.dataset.bfav, p = bfav.indexOf(i); if (p >= 0) bfav.splice(p, 1); else bfav.push(i); store('bfav', bfav); paintBooks(); }
  });
  document.addEventListener('click', function (e) { if (e.target.closest('[data-books]')) openBooks(); });

  /* ---------- after-prayer adhkar ---------- */
  var AS = window.AFTER_SALAH || [], asCount = [];
  function openAfterSalah() {
    asCount = AS.map(function () { return 0; });
    $('#aList').innerHTML = AS.map(function (d, i) {
      var b = duaBody([0, d[0], d[1], d[3], d[4]]);
      return '<div class="hcard"><div class="har">' + hEsc(b.ar) + '</div><div class="hur">' + hEsc(b.ur) + '</div><div class="hs">' + hEsc(d[3]) + '</div>' +
        (d[2] > 1 ? '<button class="acount" data-ai="' + i + '" data-done="0">' + ur(0) + ' / ' + ur(d[2]) + '</button>' : '') + '</div>';
    }).join('') + '<p class="hnote">اللہ قبول فرمائے۔</p>';
    $('#asalah').hidden = false; $('#aList').scrollTop = 0;
  }
  $('#aBack').addEventListener('click', function () { $('#asalah').hidden = true; });
  $('#aList').addEventListener('click', function (e) {
    var t = e.target.closest('[data-ai]'); if (!t) return;
    var i = +t.dataset.ai, max = AS[i][2];
    if (asCount[i] < max) asCount[i]++;
    t.textContent = ur(asCount[i]) + ' / ' + ur(max);
    if (asCount[i] >= max) { t.dataset.done = '1'; t.textContent += ' ✓'; }
    try { if (navigator.vibrate) navigator.vibrate(asCount[i] >= max ? 60 : 10); } catch (x) { /* ignore */ }
  });

  /* ---------- "did you pray?" check-in before each prayer time ends ---------- */
  function chkMin() { var m = +store('chkmin'); return m >= 5 ? m : 30; }
  function prayerWindow(i, date) {
    var t = dayTimes(date); if (!t) return null;
    var k = REM_KEYS[i], end;
    if (k === 'fajr') end = t.sunrise;
    else if (k === 'dhuhr') end = t.asr;
    else if (k === 'asr') end = t.maghrib;
    else if (k === 'maghrib') end = t.isha;
    else { var nx = dayTimes(new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)); if (!nx) return null; end = new Date((t.maghrib.getTime() + nx.fajr.getTime()) / 2); }
    var start = t[k], at = new Date(end.getTime() - chkMin() * 60000);
    if (at.getTime() < start.getTime() + 10 * 60000) at = new Date(start.getTime() + 10 * 60000);
    return { start: start, end: end, at: at };
  }
  function dkOf(date) { return Core.dateKey(date.getFullYear(), date.getMonth() + 1, date.getDate()); }
  function chkId(i, date) { return 2000 + (Core.dayNumOf(date.getFullYear(), date.getMonth() + 1, date.getDate()) % 100) * 10 + i; }
  function leftText(ms) { var m = Math.max(1, Math.round(ms / 60000)); return m >= 60 ? ur(Math.floor(m / 60)) + ' گھنٹے ' + (m % 60 ? ur(m % 60) + ' منٹ' : '') : ur(m) + ' منٹ'; }

  function chkList() {
    var now = new Date(), list = [];
    for (var d = 0; d < 7; d++) {
      var date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d), dk = dkOf(date);
      REM_KEYS.forEach(function (k, i) {
        var w = prayerWindow(i, date);
        if (!w || w.at <= now) return;
        if (d === 0 && (trk[dk] || 0) & (1 << i)) return;
        list.push({ id: chkId(i, date), title: 'کیا آپ نے ' + prayerLabel(k, w.start) + ' کی نماز ادا کر لی؟', body: 'وقت ختم ہونے میں تقریباً ' + leftText(w.end - w.at) + ' باقی ہیں', channelId: 'prayerchk', actionTypeId: 'PRAYERCHK', extra: { k: i, dk: dk }, schedule: { at: w.at, allowWhileIdle: true } });
      });
    }
    return list;
  }
  function cancelChk(i, date) {
    var LN = nativeLN(); if (!LN) return;
    try { LN.cancel({ notifications: [{ id: chkId(i, date) }, { id: 4000 + i }] }).catch(function () { /* ignore */ }); } catch (e) { /* ignore */ }
  }
  var chkSnooze = {}, chkDismiss = {}, chkNow = null, chkCount = {};
  function markPrayer(i, dk) {
    trk[dk] = (trk[dk] || 0) | (1 << i);
    var keys = Object.keys(trk).sort();
    while (keys.length > 120) delete trk[keys.shift()];
    store('trk', trk); paintTrk();
    var p = dk.split('-'); cancelChk(i, new Date(+p[0], +p[1] - 1, +p[2]));
  }
  function snoozeChk(i, dk, minutes) {
    var p = dk.split('-'), date = new Date(+p[0], +p[1] - 1, +p[2]), w = prayerWindow(i, date), key = dk + '#' + i, now = Date.now();
    chkCount[key] = (chkCount[key] || 0) + 1;
    var at = now + minutes * 60000;
    if (!w || chkCount[key] > 3 || at > w.end.getTime() - 3 * 60000) { chkSnooze[key] = Infinity; toast('اللہ توفیق دے'); return; }
    chkSnooze[key] = at;
    toast(ur(minutes) + ' منٹ بعد دوبارہ یاد دلاؤں گا');
    var LN = nativeLN();
    if (LN) LN.schedule({ notifications: [{ id: 4000 + i, title: 'کیا آپ نے ' + prayerLabel(REM_KEYS[i], w.start) + ' کی نماز ادا کر لی؟', body: 'وقت ختم ہونے میں ' + leftText(w.end.getTime() - at) + ' باقی ہیں', channelId: 'prayerchk', actionTypeId: 'PRAYERCHK', extra: { k: i, dk: dk }, schedule: { at: new Date(at), allowWhileIdle: true } }] }).catch(function () { /* ignore */ });
  }
  function showChk(i, dk) {
    var p = dk.split('-'), date = new Date(+p[0], +p[1] - 1, +p[2]), w = prayerWindow(i, date); if (!w) return;
    chkNow = { i: i, dk: dk };
    $('#chkT').textContent = 'کیا آپ نے ' + prayerLabel(REM_KEYS[i], w.start) + ' کی نماز ادا کر لی؟';
    var left = w.end.getTime() - Date.now(), c = clock(w.end);
    $('#chkS').textContent = (left > 0 ? 'وقت ختم ہونے میں ' + leftText(left) + ' باقی ہیں' : 'وقت ختم ہو چکا ہے') + ' (' + c.t + ' ' + c.p + ')';
    $('#chk').hidden = false;
  }
  function checkDue() {
    if (!store('chk') || !$('#chk').hidden) return;
    var now = new Date(), dk = dkOf(now), hit = -1;
    REM_KEYS.forEach(function (k, i) {
      var w = prayerWindow(i, now), key = dk + '#' + i;
      if (!w || (trk[dk] || 0) & (1 << i) || chkDismiss[key]) return;
      if (now >= w.at && now < w.end && (chkSnooze[key] || 0) <= now.getTime()) hit = i;
    });
    if (hit >= 0) showChk(hit, dk);
  }
  function chkAnswer(act) {
    var c = chkNow; $('#chk').hidden = true; if (!c) return;
    if (act === 'yes') {
      markPrayer(c.i, c.dk); toast('ماشاء اللہ، اللہ قبول فرمائے');
      if (store('chkad') !== false) openAfterSalah();
    } else if (act === 'no') snoozeChk(c.i, c.dk, 20);
    else if (act === 'later') snoozeChk(c.i, c.dk, 10);
    else chkDismiss[c.dk + '#' + c.i] = true;
    chkNow = null;
  }
  $('#chkYes').addEventListener('click', function () { chkAnswer('yes'); });
  $('#chkNo').addEventListener('click', function () { chkAnswer('no'); });
  $('#chkLater').addEventListener('click', function () { chkAnswer('later'); });
  $('#chkClose').addEventListener('click', function () { chkAnswer('close'); });
  setInterval(checkDue, 30000);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') setTimeout(checkDue, 500); });

  function setupChk() {
    var LN = nativeLN(), btn = $('#chkBtn'), sel = $('#chkMin'), ad = $('#chkAdhkar');
    function paint() { var on = !!store('chk'); btn.setAttribute('aria-pressed', String(on)); btn.textContent = on ? 'چالو' : 'بند'; sel.value = String(chkMin()); var a = store('chkad') !== false; ad.setAttribute('aria-pressed', String(a)); ad.textContent = a ? 'آن' : 'بند'; }
    $('#chkRow').hidden = false; paint();
    btn.addEventListener('click', function () {
      if (store('chk')) { store('chk', false); paint(); scheduleReminders(); toast('یاد دہانی بند کر دی'); return; }
      function on() { store('chk', true); paint(); scheduleReminders(); toast('وقت ختم ہونے سے پہلے پوچھوں گا'); checkDue(); }
      if (!LN) return on();
      LN.requestPermissions().then(function (r) { if (r && r.display === 'granted') on(); else { store('chk', true); paint(); toast('نوٹیفکیشن کی اجازت نہیں ملی، صرف ایپ کھلنے پر پوچھوں گا'); } }).catch(function () { toast('چالو نہیں ہو سکا'); });
    });
    sel.addEventListener('change', function () { store('chkmin', +sel.value); scheduleReminders(); });
    ad.addEventListener('click', function () { store('chkad', store('chkad') === false); paint(); });
    if (LN && LN.registerActionTypes) {
      LN.registerActionTypes({ types: [{ id: 'PRAYERCHK', actions: [{ id: 'yes', title: 'جی ادا کر لی' }, { id: 'no', title: 'ابھی نہیں' }, { id: 'later', title: '10 منٹ بعد' }] }] }).catch(function () { /* ignore */ });
      LN.addListener('localNotificationActionPerformed', function (ev) {
        var ex = ev && ev.notification && ev.notification.extra; if (!ex || ex.k == null || !ex.dk) return;
        if (ev.actionId === 'yes') { markPrayer(+ex.k, ex.dk); toast('ماشاء اللہ، اللہ قبول فرمائے'); if (store('chkad') !== false) openAfterSalah(); }
        else if (ev.actionId === 'no') snoozeChk(+ex.k, ex.dk, 20);
        else if (ev.actionId === 'later') snoozeChk(+ex.k, ex.dk, 10);
        else if (!((trk[ex.dk] || 0) & (1 << +ex.k))) showChk(+ex.k, ex.dk);
      });
    }
  }
  window.chkTest = { prayerWindow: prayerWindow, showChk: showChk, checkDue: checkDue, openAfterSalah: openAfterSalah, openDuas: openDuas, openBooks: openBooks, chkList: chkList };

  /* ---------- start ---------- */
  var last = store('last');
  if (last && last >= 1 && last <= 114) $('#playFirstTxt').textContent = 'سورۃ ' + SURAHS[last - 1][0] + ' سے جاری رکھیں';
  $$('.locname').forEach(function (el) { el.textContent = state.loc.name; });
  renderQibla();
  initCompass();
  setupReminders();
  setupFastReminders();
  setupChk();
  setupAzan();
  applyLook();
  renderFavChips();
  updatePlayUI();
  showTab('home');
  if (state.loc.src === 'default') locate(true);

  setTimeout(checkDue, 2600);
  setTimeout(function () {
    var s = $('#splash');
    s.classList.add('gone');
    setTimeout(function () { s.remove(); }, 700);
  }, 1400);

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js').catch(function () { /* offline cache unavailable */ });
  }
})();
