// Google Apps Script: receives anonymous counts from the SMAA apps and stores them in a Google Sheet.
// Tab "events" holds one row per event. Opening the web-app URL with ?key=<KEY> shows the dashboard.
var SHEET = 'events';
var KEY = 'ATIF4321'; // dashboard link ends with ?key=<this word>
function sh_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var s = ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
  if (s.getLastRow() === 0) s.appendRow(['time', 'app', 'ver', 'install', 'tz', 'lang', 'android', 'event', 'n']);
  return s;
}
function log_(msg) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet(), l = ss.getSheetByName('log') || ss.insertSheet('log');
    l.appendRow([new Date(), String(msg).slice(0, 300)]);
  } catch (err) {}
}
function record_(d) {
  var rows = [], now = new Date();
  (d.ev || []).slice(0, 50).forEach(function (x) {
    rows.push([now, String(d.a || '').slice(0, 20), String(d.v || '').slice(0, 12), String(d.i || '').slice(0, 24),
      String(d.z || '').slice(0, 40), String(d.l || '').slice(0, 8), String(d.o || '').slice(0, 4), String(x.e || '').slice(0, 40), Number(x.n) || 1]);
  });
  if (rows.length) { var s = sh_(); s.getRange(s.getLastRow() + 1, 1, rows.length, 9).setValues(rows); }
}
function doPost(e) {
  try { record_(JSON.parse(e.postData.contents)); } catch (err) { log_('doPost ' + err); }
  return ContentService.createTextOutput('ok');
}
function getStats() {
  var s = sh_(), v = s.getDataRange().getValues(); v.shift();
  var tz = Session.getScriptTimeZone(), days = {}, users = {}, feats = {}, vers = {}, zones = {}, secs = 0, apps = {};
  var today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  v.forEach(function (r) {
    var day = Utilities.formatDate(new Date(r[0]), tz, 'yyyy-MM-dd'), app = r[1], id = r[3], ev = r[7], n = r[8];
    var k = app + '|' + day; days[k] = days[k] || { app: app, day: day, users: {}, opens: 0 };
    days[k].users[id] = 1;
    if (ev === 'open') days[k].opens++;
    users[app + '|' + id] = 1;
    if (ev === 'secs') secs += n;
    else if (ev !== 'open') feats[app + '|' + ev] = (feats[app + '|' + ev] || 0) + n;
    vers[app + '|' + r[2] + '|' + id] = 1;
    zones[app + '|' + r[4] + '|' + id] = 1;
    apps[app] = 1;
  });
  var out = { today: today, apps: Object.keys(apps), daily: [], totalUsers: {}, features: [], versions: {}, zones: {}, totalSecs: secs };
  Object.keys(days).sort().forEach(function (k) { var d = days[k]; out.daily.push({ app: d.app, day: d.day, users: Object.keys(d.users).length, opens: d.opens }); });
  Object.keys(users).forEach(function (k) { var a = k.split('|')[0]; out.totalUsers[a] = (out.totalUsers[a] || 0) + 1; });
  Object.keys(feats).forEach(function (k) { var p = k.split('|'); out.features.push({ app: p[0], ev: p[1], n: feats[k] }); });
  Object.keys(vers).forEach(function (k) { var p = k.split('|'), kk = p[0] + '|' + p[1]; out.versions[kk] = (out.versions[kk] || 0) + 1; });
  Object.keys(zones).forEach(function (k) { var p = k.split('|'), kk = p[0] + '|' + p[1]; out.zones[kk] = (out.zones[kk] || 0) + 1; });
  return out;
}
function doGet(e) {
  if (e && e.parameter && e.parameter.d) {
    try { record_(JSON.parse(e.parameter.d)); } catch (err) { log_('doGet ' + err); }
    return ContentService.createTextOutput('ok');
  }
  if (!e || !e.parameter || e.parameter.key !== KEY) return ContentService.createTextOutput('Not allowed');
  return HtmlService.createHtmlOutputFromFile('Dashboard').setTitle('SMAA Stats').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
