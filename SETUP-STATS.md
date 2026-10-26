# Turn on usage stats (one-time, about 5 minutes, free)

1. Open https://sheets.google.com and create a blank sheet named "SMAA Stats".
2. Extensions -> Apps Script. Delete the sample code and paste the contents of `backend/Code.gs`. Save.
3. Deploy -> New deployment -> type "Web app". Execute as: **Me**. Who has access: **Anyone**. Deploy and allow permissions.
4. Copy the Web app URL (ends with /exec).
5. Send that URL to Claude. It goes into `remote.js` (STATS_URL) of each app and into the dashboard, then a new APK is built.

Until step 5 the apps send nothing.

# Adding content without a new APK
Edit `content.json` in the repo (GitHub web editor is enough). Phones pick it up the next time the app opens with internet.
- `notice`: change `id` (any new number) and `text` to show a dismissible message on the home screen.
- `update`: set `ver` newer than the installed version (e.g. "2026.12.01"), plus `msg` and `url` to show "new version" banner.
- `naats`: add items like `{ "id": "x1", "t": "title", "poet": "name", "kind": "نعت", "audio": "https://.../file.ogg", "v": [["line 1", "line 2"]] }`.
- `hadith`: add arrays `["topic", "Arabic", "Urdu", "source"]`.
