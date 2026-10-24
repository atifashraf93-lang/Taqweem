/* Taqweem core: pure calculations (Qibla, prayer times, Hijri calendar).
   No DOM and no network, so it can be tested in Node. */
(function (root) {
  'use strict';

  var R2D = 180 / Math.PI, D2R = Math.PI / 180;
  var KAABA = { lat: 21.422487, lng: 39.826206 };
  var DAY = 86400000;

  /* ---------- Qibla ---------- */
  function qiblaBearing(lat, lng) {
    var p1 = lat * D2R, p2 = KAABA.lat * D2R, dl = (KAABA.lng - lng) * D2R;
    var y = Math.sin(dl) * Math.cos(p2);
    var x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
    return (Math.atan2(y, x) * R2D + 360) % 360;
  }

  function distanceKm(lat, lng) {
    var R = 6371.0088;
    var p1 = lat * D2R, p2 = KAABA.lat * D2R;
    var dp = p2 - p1, dl = (KAABA.lng - lng) * D2R;
    var a = Math.sin(dp / 2) * Math.sin(dp / 2) +
      Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /* ---------- Prayer times (standard solar-angle method) ---------- */
  function dsin(d) { return Math.sin(d * D2R); }
  function dcos(d) { return Math.cos(d * D2R); }
  function dtan(d) { return Math.tan(d * D2R); }
  function darcsin(x) { return Math.asin(x) * R2D; }
  function darccos(x) { return Math.acos(x) * R2D; }
  function darctan2(y, x) { return Math.atan2(y, x) * R2D; }
  function darccot(x) { return Math.atan(1 / x) * R2D; }
  function fixAngle(a) { a = a - 360 * Math.floor(a / 360); return a < 0 ? a + 360 : a; }
  function fixHour(a) { a = a - 24 * Math.floor(a / 24); return a < 0 ? a + 24 : a; }

  function julian(y, m, d) {
    if (m <= 2) { y -= 1; m += 12; }
    var A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
  }

  function sunPosition(jd) {
    var D = jd - 2451545.0;
    var g = fixAngle(357.529 + 0.98560028 * D);
    var q = fixAngle(280.459 + 0.98564736 * D);
    var L = fixAngle(q + 1.915 * dsin(g) + 0.020 * dsin(2 * g));
    var e = 23.439 - 0.00000036 * D;
    var RA = fixHour(darctan2(dcos(e) * dsin(L), dcos(L)) / 15);
    return { decl: darcsin(dsin(e) * dsin(L)), eqt: q / 15 - RA };
  }

  /* Returns hours (0-24, local clock) for fajr, sunrise, dhuhr, asr, maghrib, isha.
     opts: fajrAngle (18), ishaAngle (18), asrFactor (1 Shafi, 2 Hanafi). */
  function computeTimes(year, month, day, lat, lng, tz, opts) {
    opts = opts || {};
    var fajrAngle = opts.fajrAngle == null ? 18 : opts.fajrAngle;
    var ishaAngle = opts.ishaAngle == null ? 18 : opts.ishaAngle;
    var asrFactor = opts.asrFactor || 2;
    var riseSet = 0.833;
    var jd = julian(year, month, day) - lng / (15 * 24);

    function midDay(t) { return fixHour(12 - sunPosition(jd + t).eqt); }
    function sunAngleTime(angle, t, ccw) {
      var decl = sunPosition(jd + t).decl;
      var v = (-dsin(angle) - dsin(decl) * dsin(lat)) / (dcos(decl) * dcos(lat));
      if (v > 1 || v < -1) return NaN;
      var tt = darccos(v) / 15;
      return midDay(t) + (ccw ? -tt : tt);
    }
    function asrTime(f, t) {
      var decl = sunPosition(jd + t).decl;
      var angle = -darccot(f + dtan(Math.abs(lat - decl)));
      return sunAngleTime(angle, t, false);
    }

    var t = { fajr: 5 / 24, sunrise: 6 / 24, dhuhr: 12 / 24, asr: 13 / 24, sunset: 18 / 24, isha: 18 / 24 };
    var r = {
      fajr: sunAngleTime(fajrAngle, t.fajr, true),
      sunrise: sunAngleTime(riseSet, t.sunrise, true),
      dhuhr: midDay(t.dhuhr),
      asr: asrTime(asrFactor, t.asr),
      sunset: sunAngleTime(riseSet, t.sunset, false),
      isha: sunAngleTime(ishaAngle, t.isha, false)
    };
    var shift = tz - lng / 15;
    var out = {
      fajr: r.fajr + shift,
      sunrise: r.sunrise + shift,
      dhuhr: r.dhuhr + shift,
      asr: r.asr + shift,
      maghrib: r.sunset + shift,
      isha: r.isha + shift
    };
    Object.keys(out).forEach(function (k) { out[k] = Math.round(out[k] * 60) / 60; });
    return out;
  }

  /* ---------- Hijri calendar (Intl based, adjustable by whole days) ---------- */
  var fmt = null;
  function getFmt() {
    if (fmt) return fmt;
    var cals = ['islamic-umalqura', 'islamic-civil'];
    for (var i = 0; i < cals.length; i++) {
      try {
        var f = new Intl.DateTimeFormat('en-u-ca-' + cals[i] + '-nu-latn',
          { day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'UTC' });
        var p = f.formatToParts(new Date(Date.UTC(2026, 9, 25, 12)));
        var yr = 0;
        p.forEach(function (x) { if (x.type === 'year') yr = parseInt(x.value, 10); });
        if (yr > 1300 && yr < 1600) { fmt = f; return fmt; }
      } catch (e) { /* try next */ }
    }
    return null;
  }

  function dayNumOf(y, m, d) { return Math.floor(Date.UTC(y, m - 1, d) / DAY); }
  function gregFromDayNum(n) {
    var dt = new Date(n * DAY + 12 * 3600000);
    return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate(), wd: dt.getUTCDay() };
  }

  function hijriFromDayNum(n, offset) {
    var f = getFmt();
    if (!f) return null;
    var parts = f.formatToParts(new Date((n + (offset || 0)) * DAY + 12 * 3600000));
    var o = { y: 0, m: 0, d: 0 };
    parts.forEach(function (p) {
      if (p.type === 'year') o.y = parseInt(p.value, 10);
      else if (p.type === 'month') o.m = parseInt(p.value, 10);
      else if (p.type === 'day') o.d = parseInt(p.value, 10);
    });
    return o;
  }

  /* Day number of the first day of Hijri month (hy, hm) */
  function monthStartDayNum(hy, hm, offset, todayNum) {
    var h0 = hijriFromDayNum(todayNum, offset);
    var target = hy * 12 + hm;
    var diff = target - (h0.y * 12 + h0.m);
    var n = todayNum + Math.round(diff * 29.53) - (h0.d - 1);
    var guard = 0, h = hijriFromDayNum(n, offset);
    while ((h.y * 12 + h.m) !== target && guard++ < 90) {
      n += ((h.y * 12 + h.m) < target) ? 1 : -1;
      h = hijriFromDayNum(n, offset);
    }
    guard = 0;
    while (h.d > 1 && guard++ < 40) { n -= 1; h = hijriFromDayNum(n, offset); }
    return n;
  }

  function nextMonth(hy, hm) { return hm === 12 ? { y: hy + 1, m: 1 } : { y: hy, m: hm + 1 }; }
  function prevMonth(hy, hm) { return hm === 1 ? { y: hy - 1, m: 12 } : { y: hy, m: hm - 1 }; }

  function monthLength(hy, hm, offset, todayNum) {
    var s = monthStartDayNum(hy, hm, offset, todayNum);
    var nm = nextMonth(hy, hm);
    return monthStartDayNum(nm.y, nm.m, offset, todayNum) - s;
  }

  /* ---------- Translation file parser (Tanzil "text with aya numbers": sura|aya|text) ---------- */
  function parseTanzil(raw) {
    var map = {}, count = 0;
    String(raw).replace(/^﻿/, '').split(/\r?\n/).forEach(function (line) {
      if (!line || line.charAt(0) === '#') return;
      var m = /^(\d{1,3})\|(\d{1,3})\|(.*)$/.exec(line);
      if (!m) return;
      var s = +m[1], a = +m[2];
      if (s < 1 || s > 114 || a < 1) return;
      (map[s] || (map[s] = []))[a - 1] = m[3].replace(/^\s+|\s+$/g, '');
      count++;
    });
    return { map: map, count: count, maududi: /maududi|mawdudi|مودود/i.test(String(raw).slice(0, 4000) + String(raw).slice(-4000)) };
  }

  /* ---------- General geometry (mosque finder) ---------- */
  function bearingTo(lat1, lng1, lat2, lng2) {
    var p1 = lat1 * D2R, p2 = lat2 * D2R, dl = (lng2 - lng1) * D2R;
    var y = Math.sin(dl) * Math.cos(p2);
    var x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
    return (Math.atan2(y, x) * R2D + 360) % 360;
  }

  function distKm(lat1, lng1, lat2, lng2) {
    var R = 6371.0088;
    var dp = (lat2 - lat1) * D2R, dl = (lng2 - lng1) * D2R;
    var a = Math.sin(dp / 2) * Math.sin(dp / 2) +
      Math.cos(lat1 * D2R) * Math.cos(lat2 * D2R) * Math.sin(dl / 2) * Math.sin(dl / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  var DIRS = ['شمال', 'شمال مشرق', 'مشرق', 'جنوب مشرق', 'جنوب', 'جنوب مغرب', 'مغرب', 'شمال مغرب'];
  function dirName(b) { return DIRS[Math.round(b / 45) % 8]; }

  /* OpenStreetMap Overpass JSON -> nearest mosques, de-duplicated, sorted by distance. */
  function parseMosques(json, lat, lng) {
    var els = (json && json.elements) || [], out = [];
    els.forEach(function (e) {
      var la = e.lat != null ? e.lat : (e.center && e.center.lat);
      var lo = e.lon != null ? e.lon : (e.center && e.center.lon);
      if (typeof la !== 'number' || typeof lo !== 'number') return;
      var t = e.tags || {};
      var name = t['name:ur'] || t.name || t['name:en'] || '';
      var d = distKm(lat, lng, la, lo);
      out.push({ id: e.type + e.id, name: name, lat: la, lng: lo, dist: d, bearing: bearingTo(lat, lng, la, lo), street: t['addr:street'] || '' });
    });
    out.sort(function (a, b) { return a.dist - b.dist; });
    var res = [];
    out.forEach(function (m) {
      var dup = res.some(function (r) {
        return distKm(r.lat, r.lng, m.lat, m.lng) < 0.04 && (!r.name || !m.name || r.name === m.name);
      });
      if (!dup) res.push(m);
    });
    return res;
  }

  /* ---------- Fasting days (Hijri: h = {m, d}, wd = weekday 0=Sunday) ---------- */
  function fastingInfo(h, wd) {
    if (!h || !h.m) return null;
    var m = h.m, d = h.d;
    if ((m === 10 && d === 1) || (m === 12 && d >= 10 && d <= 13)) return { kind: 'forbidden', text: 'روزہ رکھنا منع ہے (عید / ایامِ تشریق)' };
    if (m === 9) return { kind: 'ramadan', text: 'رمضان کا روزہ' };
    if (m === 12 && d === 9) return { kind: 'arafah', text: 'یومِ عرفہ کا روزہ' };
    if (m === 1 && d === 10) return { kind: 'ashura', text: 'یومِ عاشورہ کا روزہ' };
    if (m === 1 && (d === 9 || d === 11)) return { kind: 'ashura', text: 'عاشورہ کے ساتھ ملا کر نفلی روزہ' };
    if (d >= 13 && d <= 15) return { kind: 'white', text: 'ایامِ بیض کا نفلی روزہ' };
    if (wd === 1) return { kind: 'monhu', text: 'پیر کا نفلی روزہ' };
    if (wd === 4) return { kind: 'monhu', text: 'جمعرات کا نفلی روزہ' };
    return null;
  }

  /* ---------- Prayer tracker streak: trk = { 'YYYY-MM-DD': bitmask of 5 prayers } ---------- */
  function dateKey(y, m, d) {
    var dt = new Date(y, m - 1, d);
    return dt.getFullYear() + '-' + (dt.getMonth() + 1 < 10 ? '0' : '') + (dt.getMonth() + 1) + '-' + (dt.getDate() < 10 ? '0' : '') + dt.getDate();
  }
  function computeStreak(trk, y, m, d) {
    var n = 0, i = 0;
    if ((trk[dateKey(y, m, d)] || 0) !== 31) i = 1;
    for (; i < 4000; i++) {
      if ((trk[dateKey(y, m, d - i)] || 0) === 31) n++; else break;
    }
    return n;
  }

  var api = {
    bearingTo: bearingTo, distKm: distKm, dirName: dirName, parseMosques: parseMosques,
    fastingInfo: fastingInfo, dateKey: dateKey, computeStreak: computeStreak,
    parseTanzil: parseTanzil,
    KAABA: KAABA,
    qiblaBearing: qiblaBearing,
    distanceKm: distanceKm,
    computeTimes: computeTimes,
    dayNumOf: dayNumOf,
    gregFromDayNum: gregFromDayNum,
    hijriFromDayNum: hijriFromDayNum,
    monthStartDayNum: monthStartDayNum,
    monthLength: monthLength,
    nextMonth: nextMonth,
    prevMonth: prevMonth
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TaqweemCore = api;
})(typeof self !== 'undefined' ? self : this);
