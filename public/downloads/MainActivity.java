package com.qchat.messenger;

import android.os.Bundle;
import android.view.WindowManager;
import com.google.androidbrowserhelper.trusted.LauncherActivity;

/**
 * QChat Launcher Activity with Android Hardware Screenshot Blocking (FLAG_SECURE)
 * Prevents OS-level screenshots, screen recording, and recent-app previews for security.
 */
public class MainActivity extends LauncherActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Hardware-level screenshot blocking across Android OS
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        );
    }
}
