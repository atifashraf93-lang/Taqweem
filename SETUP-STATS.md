# Turn on usage stats (one-time, about 5 minutes, free)

1. Open https://sheets.google.com and create a blank sheet named "SMAA Stats".
2. Extensions -> Apps Script. Delete the sample code and paste `backend/Code.gs`. Change the secret word (KEY) near the top. Then add a file (+ -> HTML) named exactly `Dashboard` and paste `backend/Dashboard.html`. Save.
3. Deploy -> New deployment -> type "Web app". Execute as: **Me**. Who has access: **Anyone**. Deploy and allow permissions.
4. Copy the Web app URL (ends with /exec). Your dashboard is that URL followed by `?key=` and your secret word. Bookmark it.
5. Send the /exec URL (without the key) to Claude. It goes into `remote.js` (STATS_URL) of each app, then new APKs are built.

Note: after changing the script later, use Deploy -> Manage deployments -> edit -> New version, or the URL keeps the old code.

Until step 5 the apps send nothing.

# Adding content without a new APK
Edit `content.json` in the repo (GitHub web editor is enough). Phones pick it up the next time the app opens with internet.
- `notice`: change `id` (any new number) and `text` to show a dismissible message on the home screen.
- `update`: set `ver` newer than the installed version (e.g. "2026.12.01"), plus `msg` and `url` to show "new version" banner.
- `naats`: add items like `{ "id": "x1", "t": "title", "poet": "name", "kind": "نعت", "audio": "https://.../file.ogg", "v": [["line 1", "line 2"]] }`.
- `hadith`: add arrays `["topic", "Arabic", "Urdu", "source"]`.
