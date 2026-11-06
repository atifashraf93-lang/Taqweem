package pk.smaa.taqweem;

import android.content.SharedPreferences;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    /** If a downloaded web bundle fails to start twice in a row, go back to the bundled files. */
    private void guardOta() {
        try {
            SharedPreferences o = getSharedPreferences(UpdPlugin.OTA_PREFS, MODE_PRIVATE);
            SharedPreferences w = getSharedPreferences("CapWebViewSettings", MODE_PRIVATE);
            if (w.getString("serverBasePath", null) == null) return;
            int boots = o.getInt("boots", 0);
            if (!o.getBoolean("ok", true) && boots >= 2) {
                w.edit().remove("serverBasePath").apply();
                o.edit().putBoolean("ok", true).putInt("boots", 0).apply();
            } else if (!o.getBoolean("ok", true)) {
                o.edit().putInt("boots", boots + 1).apply();
            }
        } catch (Throwable t) { /* ignore */ }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(UpdPlugin.class);
        guardOta();
        super.onCreate(savedInstanceState);
    }
}
