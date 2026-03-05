package com.tanmay.billing;

import android.content.Context;
import android.os.Build;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.util.Log;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "TanmayPrint";

    // Keep a strong reference to prevent GC
    private WebView printWebView = null;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Log.d(TAG, "MainActivity Created");
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);

        // Inject JavascriptInterface immediately after WebView is initialized
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            webView.addJavascriptInterface(new Object() {
                @android.webkit.JavascriptInterface
                public void printHtml(final String html) {
                    Log.d(TAG, "printHtml() called from JS");
                    runOnUiThread(() -> {
                        if (html == null || html.isEmpty()) {
                            Toast.makeText(MainActivity.this,
                                    "Print Error: empty content", Toast.LENGTH_SHORT).show();
                            return;
                        }
                        Toast.makeText(MainActivity.this,
                                "Preparing print…", Toast.LENGTH_SHORT).show();
                        doPrintHtml(html);
                    });
                }
            }, "AndroidPrint");
            Log.d(TAG, "AndroidPrint bridge injected in onCreate");
        }
    }

    private void doPrintHtml(final String html) {
        // Destroy any previous print WebView
        if (printWebView != null) {
            printWebView.destroy();
            printWebView = null;
        }

        // Create a new WebView and attach it to the root layout so it
        // is part of the View hierarchy – required for createPrintDocumentAdapter()
        printWebView = new WebView(this);
        printWebView.setVisibility(WebView.GONE);

        // Attach to the root content frame
        FrameLayout rootLayout = (FrameLayout) getWindow().getDecorView()
                .findViewById(android.R.id.content);
        rootLayout.addView(printWebView,
                new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.WRAP_CONTENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT));

        printWebView.getSettings().setJavaScriptEnabled(true);

        final WebView finalPrintView = printWebView;
        finalPrintView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                Log.d(TAG, "Print WebView loaded – firing PrintManager");

                PrintManager printManager = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                if (printManager == null) {
                    Toast.makeText(MainActivity.this,
                            "Print service unavailable", Toast.LENGTH_LONG).show();
                    cleanup(view, rootLayout);
                    return;
                }

                String jobName = "SwiftBill-" + System.currentTimeMillis();

                PrintDocumentAdapter adapter;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    adapter = view.createPrintDocumentAdapter(jobName);
                } else {
                    // noinspection deprecation
                    adapter = view.createPrintDocumentAdapter();
                }

                printManager.print(jobName, adapter,
                        new PrintAttributes.Builder()
                                .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                                .build());

                Log.d(TAG, "Print job dispatched: " + jobName);

                // Remove the hidden WebView after a delay
                view.postDelayed(() -> cleanup(view, rootLayout), 5000);
            }
        });

        // loadDataWithBaseURL is the safest way to load HTML in a WebView
        finalPrintView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null);
    }

    private void cleanup(WebView view, FrameLayout root) {
        try {
            root.removeView(view);
            view.destroy();
            if (printWebView == view)
                printWebView = null;
            Log.d(TAG, "Print WebView cleaned up");
        } catch (Exception e) {
            Log.e(TAG, "Cleanup error: " + e.getMessage());
        }
    }
}
