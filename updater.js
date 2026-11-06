/* Self-update for this app (shared by the SMAA apps).
   On start and every 30 minutes it looks for a newer release. Small changes (screens, text) are downloaded
   and switched in without reinstalling; native changes open the Android installer. */
(function () {
  'use strict';
  var REPO = 'atifashraf93-lang/Taqweem', K = 'smaa.upd.';
  var BUILD = window.SMAA_BUILD || 0;
  if (!BUILD) return; /* browser / desktop copy: nothing to update */
  function g(k) { try { return JSON.parse(localStorage.getItem(K + k)); } catch (e) { return null; } }
  function s(k, v) { try { localStorage.setItem(K + k, JSON.stringify(v)); } catch (e) { /* storage off */ } }
  function P() { return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Upd; }
  function W() { return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.WebView; }
  var API = 1, busy = false, hidden = false, err = '', pct = -1, lis = false;
  if (P() && P().api) P().api().then(function (r) { API = r.api || 1; }).catch(function () { /* old build */ });
  setTimeout(function () { try { if (P() && P().otaOk) P().otaOk(); } catch (e) { /* ignore */ } }, 4000);

  function toast(t) {
    var d = document.createElement('div');
    d.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:90px;z-index:99999;background:#16352F;color:#F4EFE3;border:1px solid #E2B861;border-radius:12px;padding:10px 16px;font-size:15px;box-shadow:0 6px 20px rgba(0,0,0,.35)';
    d.textContent = t; document.body.appendChild(d); setTimeout(function () { d.remove(); }, 3500);
  }
  var ot = g('otatry'); if (ot && BUILD >= ot) { s('otatry', 0); setTimeout(function () { toast('ایپ اپڈیٹ ہو گئی ✅'); }, 800); }

  function zipUrls(u) {
    var l = [u.zip];
    if (u.sha) { l.push('https://cdn.jsdelivr.net/gh/' + REPO + '@' + u.sha + '/www.zip'); l.push('https://raw.githubusercontent.com/' + REPO + '/' + u.sha + '/www.zip'); }
    return l;
  }

  function check() {
    s('chk', Date.now());
    return fetch('https://api.github.com/repos/' + REPO + '/releases?per_page=15').then(function (r) { return r.json(); }).then(function (rs) {
      var best = null;
      (rs || []).forEach(function (x) {
        var m = /^apk-(\d+)$/.exec(x.tag_name || ''); if (!m || !x.assets || (best && +m[1] <= best.n)) return;
        var apk = null, zip = null;
        x.assets.forEach(function (a) { if (/\.apk$/i.test(a.name)) apk = a.browser_download_url; else if (a.name === 'www.zip') zip = a.browser_download_url; });
        var nd = /need=(\d+)/.exec(x.body || ''), sh = /sha=([0-9a-f]{7,40})/.exec(x.body || '');
        if (apk) best = { n: +m[1], url: apk, zip: zip, need: nd ? +nd[1] : 1, sha: sh ? sh[1] : '' };
      });
      if (best) s('rel', best);
      return best;
    }).catch(function () { return g('rel'); });
  }

  /* ---------- card ---------- */
  function card() {
    var old = document.getElementById('smaaupd');
    var u = g('rel'), rd = g('otaready');
    if (!u || u.n <= BUILD || hidden) { if (old) old.remove(); return; }
    var otaOk = u.zip && (u.need || 1) <= API && P() && P().otaApply && W() && W().setServerBasePath;
    var txt = err ? '⚠️ اپڈیٹ نہیں لگ سکی' : busy ? '⬇ ڈاؤن لوڈ ہو رہی ہے' + (pct >= 0 ? ' ' + pct + '%' : '…') : rd ? 'اپڈیٹ تیار ہے' : 'ایپ کا نیا ورژن دستیاب ہے';
    var btn = busy ? '' : err ? 'دوبارہ' : rd ? 'ابھی لگائیں' : 'اپڈیٹ کریں';
    if (!old) {
      old = document.createElement('div'); old.id = 'smaaupd'; old.setAttribute('role', 'status'); old.dir = 'rtl';
      old.style.cssText = 'position:fixed;top:calc(env(safe-area-inset-top,0px) + 8px);left:12px;right:12px;z-index:99998;display:flex;gap:10px;align-items:center;padding:10px 12px;border-radius:14px;background:#16352F;border:1px solid #E2B861;color:#F4EFE3;font-size:15px;box-shadow:0 6px 20px rgba(0,0,0,.35)';
      document.body.appendChild(old);
    }
    old.innerHTML = '<span style="font-size:22px">⬆️</span><div style="flex:1;line-height:1.7"><b>' + txt + '</b><small style="display:block;opacity:.75;font-size:12.5px">' + (err ? err.slice(0, 110) : (otaOk ? 'ورژن ' : 'ایپ ورژن ') + u.n) + '</small></div>' +
      (btn ? '<button id="smaaupb" style="background:#E2B861;color:#16352F;border:0;border-radius:10px;padding:8px 14px;font-weight:700;font-size:15px">' + btn + '</button>' : '') +
      '<button id="smaaupx" aria-label="بعد میں" style="background:none;border:0;color:#A9BDB6;font-size:20px;padding:4px 6px">✕</button>';
    var b = document.getElementById('smaaupb');
    if (b) b.onclick = function () { if (g('otaready')) apply(); else start(u); };
    document.getElementById('smaaupx').onclick = function () { hidden = true; card(); };
  }

  function listen(p) {
    if (lis || !p.addListener) return; lis = true;
    try {
      p.addListener('otaProgress', function (e) { pct = e.pct; card(); });
      p.addListener('apkProgress', function (e) { pct = e.pct; card(); });
    } catch (e) { /* ignore */ }
  }
  function fail(e) {
    busy = false; pct = -1;
    err = String((e && (e.message || e.errorMessage)) || e || 'unknown'); card();
  }
  function start(u) {
    var p = P(); if (!p || busy) return;
    listen(p); err = ''; hidden = false;
    if (u.zip && p.otaApply && W() && W().setServerBasePath && (u.need || 1) <= API) {
      busy = true; pct = 0; card();
      p.otaApply({ url: u.zip, urls: zipUrls(u), build: u.n }).then(function (r) {
        busy = false; pct = -1; s('otaready', { path: r.path, n: u.n }); card();
      }).catch(fail);
    } else if (p.apkInstall) {
      busy = true; pct = 0; card();
      p.apkInstall({ url: u.url, urls: [u.url] }).then(function (r) {
        busy = false; pct = -1; card();
        if (r && r.needPerm) toast('"اس سورس سے انسٹال" کی اجازت دیں، پھر دوبارہ دبائیں');
      }).catch(fail);
    }
  }
  function apply() {
    var r = g('otaready'), w = W(); if (!r || !w || !w.setServerBasePath) return false;
    if (BUILD >= r.n) { s('otaready', null); card(); return false; }
    s('otaready', null); s('otatry', r.n);
    try { w.setServerBasePath({ path: r.path }).then(function () { return w.persistServerBasePath ? w.persistServerBasePath() : null; }); } catch (e) { /* ignore */ }
    return true;
  }

  function look() {
    return check().then(function (u) {
      card();
      if (u && u.n > BUILD && u.zip && (u.need || 1) <= API && !g('otaready') && g('otabad') !== u.n) start(u); /* fetch small updates in the background */
    });
  }

  /* start: finish a downloaded update straight away, otherwise look for a new one */
  setTimeout(function () { if (!apply()) look(); }, 2500);
  var hid = 0;
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { hid = Date.now(); return; }
    if (hid && Date.now() - hid > 20000) { if (!apply() && Date.now() - (g('chk') || 0) > 30 * 60000) look(); }
  });
  setInterval(function () { if (!document.hidden && Date.now() - (g('chk') || 0) > 30 * 60000) look(); }, 5 * 60000);
})();
