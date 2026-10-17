package com.vajeyar.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        try {
            WebView wv = getBridge().getWebView();
            WebSettings s = wv.getSettings();
            // the app has its own font-size setting; ignore the system "font size" so layouts never break
            s.setTextZoom(100);
            // pronunciation audio starts from a tap that is already a user gesture
            s.setMediaPlaybackRequiresUserGesture(false);
        } catch (Exception ignored) { }
    }
}
