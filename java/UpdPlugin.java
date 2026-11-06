package pk.smaa.taqweem;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Enumeration;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

/** Self-update helpers: download a new web bundle (no reinstall) or a new APK and open the installer. */
@CapacitorPlugin(name = "Upd")
public class UpdPlugin extends Plugin {
    /** Bump this whenever the Java side changes in a way the web files depend on. */
    static final int API = 1;
    static final String OTA_PREFS = "smaa.ota";

    private Context ctx() { return getContext().getApplicationContext(); }

    @PluginMethod
    public void api(PluginCall call) {
        JSObject r = new JSObject();
        r.put("api", API);
        call.resolve(r);
    }

    private void fetch(String url, File out, String evt) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(15000);
        c.setReadTimeout(60000);
        c.setInstanceFollowRedirects(true);
        c.setRequestProperty("User-Agent", "SMAAApp");
        int code = c.getResponseCode();
        if (code / 100 != 2) throw new Exception("http " + code);
        long total = c.getContentLengthLong();
        InputStream in = c.getInputStream();
        OutputStream os = new FileOutputStream(out);
        byte[] buf = new byte[65536];
        long got = 0;
        int last = -1;
        int n;
        while ((n = in.read(buf)) > 0) {
            os.write(buf, 0, n);
            got += n;
            if (total > 0) {
                int pct = (int) (got * 100 / total);
                if (pct != last) { last = pct; JSObject o = new JSObject(); o.put("pct", pct); notifyListeners(evt, o); }
            }
        }
        os.close();
        in.close();
        c.disconnect();
        if (total > 0 && got != total) throw new Exception("incomplete");
    }

    private java.util.List<String> urls(PluginCall call) {
        java.util.List<String> l = new java.util.ArrayList<String>();
        try {
            com.getcapacitor.JSArray a = call.getArray("urls");
            if (a != null) for (int i = 0; i < a.length(); i++) { String x = a.getString(i); if (x != null && x.startsWith("http") && !l.contains(x)) l.add(x); }
        } catch (Throwable t) { /* ignore */ }
        String u = call.getString("url", "");
        if (u != null && u.startsWith("http") && !l.contains(u)) l.add(u);
        return l;
    }

    /** Tries every address, twice around, and reports what went wrong at each. */
    private void fetchAny(java.util.List<String> list, File out, String evt) throws Exception {
        StringBuilder err = new StringBuilder();
        for (int round = 0; round < 2; round++) {
            for (String u : list) {
                try { fetch(u, out, evt); return; } catch (Throwable t) {
                    String host = "?";
                    try { host = new URL(u).getHost(); } catch (Throwable x) { /* ignore */ }
                    String m = t.getClass().getSimpleName() + (t.getMessage() == null ? "" : " " + t.getMessage());
                    if (err.indexOf(host + " " + m) < 0) err.append(host).append(": ").append(m).append(" | ");
                    try { Thread.sleep(1200); } catch (InterruptedException e) { /* ignore */ }
                }
            }
        }
        throw new Exception(err.toString());
    }

    private static void wipe(File f) {
        if (f == null || !f.exists()) return;
        File[] k = f.listFiles();
        if (k != null) for (File x : k) wipe(x);
        f.delete();
    }

    /* ---------- web bundle update (no reinstall) ---------- */
    @PluginMethod
    public void otaApply(final PluginCall call) {
        final java.util.List<String> list = urls(call);
        final long build = call.getData().optLong("build", 0L);
        new Thread(new Runnable() {
            @Override public void run() {
                try {
                    if (list.isEmpty() || build <= 0) throw new Exception("bad args");
                    File base = new File(ctx().getFilesDir(), "ota");
                    File zip = new File(ctx().getCacheDir(), "ota.zip");
                    fetchAny(list, zip, "otaProgress");
                    File dir = new File(base, String.valueOf(build));
                    wipe(dir);
                    dir.mkdirs();
                    String root = dir.getCanonicalPath() + File.separator;
                    ZipFile z = new ZipFile(zip);
                    Enumeration<? extends ZipEntry> en = z.entries();
                    while (en.hasMoreElements()) {
                        ZipEntry e = en.nextElement();
                        File o = new File(dir, e.getName());
                        if (!o.getCanonicalPath().startsWith(root)) throw new Exception("bad entry");
                        if (e.isDirectory()) { o.mkdirs(); continue; }
                        o.getParentFile().mkdirs();
                        InputStream in = z.getInputStream(e);
                        OutputStream os = new FileOutputStream(o);
                        byte[] b = new byte[32768];
                        int n;
                        while ((n = in.read(b)) > 0) os.write(b, 0, n);
                        os.close();
                        in.close();
                    }
                    z.close();
                    zip.delete();
                    if (!new File(dir, "index.html").exists()) { wipe(dir); throw new Exception("no index"); }
                    File[] old = base.listFiles();
                    if (old != null) for (File x : old) if (!x.getName().equals(String.valueOf(build))) wipe(x);
                    getContext().getSharedPreferences(OTA_PREFS, Context.MODE_PRIVATE).edit().putBoolean("ok", false).putInt("boots", 0).apply();
                    JSObject r = new JSObject();
                    r.put("path", dir.getAbsolutePath());
                    call.resolve(r);
                } catch (Throwable t) { call.reject("ota: " + t); }
            }
        }).start();
    }

    /** The new bundle started and ran fine: stop the rollback guard. */
    @PluginMethod
    public void otaOk(PluginCall call) {
        getContext().getSharedPreferences(OTA_PREFS, Context.MODE_PRIVATE).edit().putBoolean("ok", true).putInt("boots", 0).apply();
        call.resolve();
    }

    /* ---------- full app update (native changes) ---------- */
    @PluginMethod
    public void apkInstall(final PluginCall call) {
        final java.util.List<String> list = urls(call);
        new Thread(new Runnable() {
            @Override public void run() {
                try {
                    File dir = new File(ctx().getCacheDir(), "update");
                    dir.mkdirs();
                    File apk = new File(dir, "App.apk");
                    if (call.getBoolean("fresh", true) || !apk.exists()) fetchAny(list, apk, "apkProgress");
                    if (Build.VERSION.SDK_INT >= 26 && !ctx().getPackageManager().canRequestPackageInstalls()) {
                        Intent s = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + ctx().getPackageName()));
                        s.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        ctx().startActivity(s);
                        JSObject r = new JSObject();
                        r.put("needPerm", true);
                        call.resolve(r);
                        return;
                    }
                    Uri u = FileProvider.getUriForFile(ctx(), ctx().getPackageName() + ".fileprovider", apk);
                    Intent i = new Intent(Intent.ACTION_VIEW);
                    i.setDataAndType(u, "application/vnd.android.package-archive");
                    i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                    ctx().startActivity(i);
                    JSObject r = new JSObject();
                    r.put("ok", true);
                    call.resolve(r);
                } catch (Throwable t) { call.reject("apk: " + t); }
            }
        }).start();
    }
}
