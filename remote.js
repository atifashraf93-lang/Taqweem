/* Remote content + anonymous usage counts (shared by all SMAA apps).
   - Content: reads content.json from the repo, keeps the last copy for offline use.
   - Stats: anonymous counts only (random install id, feature names, app version, Android version, language, time zone).
     No name, phone number, contacts or exact location. The user can switch it off in Settings. */
(function () {
  'use strict';
  var APP = 'taqweem';
  var PREFIX = 'taqweem.';
  var FEATURES = true; /* false: only open count, time and version are sent (no feature names) */
  var FIXED = false; /* true: notices float at the top instead of sitting in #tab-home */
  var VER = '2026.10.26';
  var CONTENT_URL = 'https://raw.githubusercontent.com/atifashraf93-lang/Taqweem/main/content.json';
  var STATS_URL = 'https://script.google.com/macros/s/AKfycbxXg5cacMf8JNUtCZpF9XFnZdNgj3db7SYS6IVxuuTN9KEkzCVkeAAKJ_Y-AcjeDCB0/exec';

  function get(k) { try { var v = localStorage.getItem(PREFIX + k); return v === null ? null : JSON.parse(v); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(PREFIX + k, JSON.stringify(v)); } catch (e) { /* storage off */ } }
  function $(s) { return document.querySelector(s); }

  /* ---------- remote content ---------- */
  var seen = get('rcseen') || [];

  function banner(id, text, link, cls) {
    if (!text || seen.indexOf(id) >= 0) return;
    var host = FIXED ? ($('#app') || document.body) : $('#tab-home'); if (!host) return;
    var d = document.createElement('div');
    d.setAttribute('role', 'status');
    d.style.cssText = (FIXED ? 'position:fixed;top:8px;left:12px;right:12px;z-index:60;box-shadow:0 6px 20px rgba(0,0,0,.35);' : '') + 'margin:10px 0;padding:12px 14px;border-radius:14px;background:#16352F;border:1px solid #E2B861;color:#F4EFE3;font-size:15px;line-height:1.9;text-align:right;display:flex;gap:10px;align-items:center;justify-content:space-between';
    var t = document.createElement('div'); t.style.flex = '1';
    t.textContent = text;
    if (link) {
      var a = document.createElement('a'); a.href = link; a.target = '_blank'; a.rel = 'noopener';
      a.textContent = ' ← کھولیں'; a.style.cssText = 'color:#E2B861;font-weight:700';
      t.appendChild(a);
    }
    var x = document.createElement('button');
    x.textContent = '✕'; x.setAttribute('aria-label', 'بند کریں');
    x.style.cssText = 'background:none;border:0;color:#A9BDB6;font-size:20px;padding:4px 8px';
    x.onclick = function () { seen.push(id); set('rcseen', seen); d.remove(); };
    d.appendChild(t); d.appendChild(x);
    if (FIXED) host.appendChild(d); else host.insertBefore(d, host.firstChild);
  }

  function apply(c) {
    if (!c || typeof c !== 'object') return;
    if (c.notice && c.notice.id) banner('n' + c.notice.id, c.notice.text, c.notice.link);
    if (c.update && c.update.ver && c.update.ver > VER) banner('u' + c.update.ver, c.update.msg || 'ایپ کا نیا ورژن آ گیا ہے', c.update.url);
    if (Array.isArray(c.naats) && window.NAATS) {
      c.naats.forEach(function (n) {
        if (!n || !n.id || !n.t) return;
        if (window.NAATS.some(function (x) { return x.id === n.id; })) return;
        if (!Array.isArray(n.v)) n.v = [];
        window.NAATS.push(n); /* audio may be a full https URL */
      });
    }
    if (Array.isArray(c.hadith) && window.HADITH) {
      c.hadith.forEach(function (h) {
        if (!Array.isArray(h) || h.length < 4) return;
        if (window.HADITH.some(function (x) { return x[1] === h[1]; })) return;
        window.HADITH.push(h);
      });
    }
  }

  var cached = get('rc');
  if (cached) apply(cached);
  if (CONTENT_URL && navigator.onLine !== false) {
    fetch(CONTENT_URL + '?t=' + Math.floor(Date.now() / 600000), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (c) {
        if (!c) return;
        set('rc', c);
        if (!cached) apply(c); /* first run: cached copy was empty, apply now */
      })
      .catch(function () { /* offline: keep cached copy */ });
  }

  /* ---------- anonymous stats ---------- */
  function statsOn() { return get('stats') !== false; }
  function iid() {
    var i = get('iid');
    if (!i) { i = Math.random().toString(36).slice(2, 10) + Date.now().toString(36); set('iid', i); }
    return i;
  }
  var queue = [], timer = 0;
  var shown = Date.now(), visible = document.visibilityState !== 'hidden';
  function androidVer() { var m = /Android (\d+)/.exec(navigator.userAgent); return m ? m[1] : ''; }
  function tz() { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { return ''; } }

  function track(ev, n) {
    if (!STATS_URL || !statsOn()) return;
    queue.push({ e: ev, n: n || 1, t: Date.now() });
    if (queue.length >= 15) flush();
    else if (!timer) timer = setTimeout(function () { timer = 0; flush(); }, 4000);
  }
  function flush() {
    if (!STATS_URL || !statsOn() || !queue.length || navigator.onLine === false) return;
    var body = JSON.stringify({ a: APP, v: VER, i: iid(), z: tz(), l: (navigator.language || '').slice(0, 5), o: androidVer(), ev: queue.splice(0, queue.length) });
    try {
      fetch(STATS_URL, { method: 'POST', body: body, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, keepalive: true, mode: 'no-cors' }).catch(function () { /* ignore */ });
    } catch (e) { /* ignore */ }
  }

  track('open');
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      if (visible) track('secs', Math.round((Date.now() - shown) / 1000));
      visible = false; flush();
    } else { visible = true; shown = Date.now(); track('open'); }
  });
  setInterval(flush, 30000);
  window.addEventListener('pagehide', function () { if (visible) track('secs', Math.round((Date.now() - shown) / 1000)); flush(); });

  /* feature usage: only the name of the screen/section that was opened */
  if (FEATURES) document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-tab],[data-hadith],[data-naat],[data-tf],[data-mushaf],details.sec > summary,[data-go]');
    if (!t) return;
    var name = t.dataset.tab ? 'tab:' + t.dataset.tab :
      t.hasAttribute('data-hadith') ? 'hadith' :
      t.hasAttribute('data-naat') ? 'naat' :
      t.hasAttribute('data-tf') ? 'tafseer' :
      t.hasAttribute('data-mushaf') ? 'mushaf' :
      t.dataset.go ? 'go:' + t.dataset.go :
      t.parentNode && t.parentNode.id ? 'sec:' + t.parentNode.id : 'sec:' + (t.textContent || '').trim().slice(0, 20);
    track(name);
  }, true);

  /* settings switch */
  var btn = $('#statsBtn');
  if (btn) {
    var paint = function () { var on = statsOn(); btn.textContent = on ? 'آن' : 'بند'; btn.setAttribute('aria-pressed', on ? 'true' : 'false'); };
    paint();
    btn.addEventListener('click', function () { set('stats', !statsOn()); if (!statsOn()) queue.length = 0; paint(); });
  }

  window.SMAA = { track: track, version: VER, statsOn: statsOn, setStats: function (on) { set('stats', !!on); if (!on) queue.length = 0; } };
})();
