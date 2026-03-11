package com.tanmay.billing;

import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbManager;
import android.os.Build;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.util.Log;
import android.view.ViewGroup;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

import org.json.JSONArray;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {

    private static final String TAG            = "TanmayPrint";
    private static final String ACTION_USB_PERM = "com.tanmay.billing.USB_PERMISSION";

    // Keep a strong reference to prevent GC
    private WebView printWebView = null;

    // USB printer manager
    private PrinterManager printerManager;

    // ── USB permission broadcast receiver ────────────────────────────────
    private final BroadcastReceiver usbPermissionReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (!ACTION_USB_PERM.equals(intent.getAction())) return;

            UsbDevice device = intent.getParcelableExtra(UsbManager.EXTRA_DEVICE);
            boolean granted  = intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false);

            if (granted && device != null) {
                Log.d(TAG, "USB permission GRANTED for " + device.getDeviceName());
                Toast.makeText(MainActivity.this,
                        "USB printer connected!", Toast.LENGTH_SHORT).show();
                // Nothing more to do here; the next printEscPos call will connect.
            } else {
                Log.w(TAG, "USB permission DENIED");
                Toast.makeText(MainActivity.this,
                        "USB printer permission denied.", Toast.LENGTH_LONG).show();
            }
        }
    };

    // ── USB device attached/detached receiver ────────────────────────────
    private final BroadcastReceiver usbAttachReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();
            if (UsbManager.ACTION_USB_DEVICE_ATTACHED.equals(action)) {
                UsbDevice device = intent.getParcelableExtra(UsbManager.EXTRA_DEVICE);
                Log.d(TAG, "USB device attached: " + (device != null ? device.getDeviceName() : "null"));
                requestUsbPermissionIfNeeded(device);
            } else if (UsbManager.ACTION_USB_DEVICE_DETACHED.equals(action)) {
                Log.d(TAG, "USB device detached");
                if (printerManager != null) {
                    printerManager.disconnect();
                }
                runOnUiThread(() ->
                        Toast.makeText(MainActivity.this,
                                "USB printer disconnected.", Toast.LENGTH_SHORT).show());
            }
        }
    };

    // ────────────────────────────────────────────────────────────────────
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Log.d(TAG, "MainActivity Created");
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);

        // Initialise PrinterManager
        printerManager = new PrinterManager(this);

        // Register USB receivers
        registerUsbReceivers();

        // Request permission for any printer already plugged in at startup
        UsbDevice existing = printerManager.findPrinterDevice();
        if (existing != null) {
            requestUsbPermissionIfNeeded(existing);
        }

        // ── Inject JavaScript bridges ────────────────────────────────────
        WebView webView = getBridge().getWebView();
        if (webView != null) {

            // ── Bridge 1: printHtml (existing HTML / PrintManager path) ──
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

            // ── Bridge 2: printEscPos (USB OTG ESC/POS path) ─────────────
            webView.addJavascriptInterface(new Object() {

                /**
                 * Called from JS with a JSON string containing bill data.
                 * JSON format:
                 * {
                 *   "billNumber": "1042",
                 *   "billerName": "Tanmay",
                 *   "dateStr":    "11/03/2026",
                 *   "timeStr":    "04:30 PM",
                 *   "items": [
                 *     { "name": "Vada Pav", "qty": "2", "rate": "15", "total": "30" },
                 *     ...
                 *   ],
                 *   "grandTotal":  "₹540",
                 *   "paymentMode": "CASH"
                 * }
                 *
                 * Returns a JSON string: { "success": true } or { "success": false, "error": "..." }
                 */
                @android.webkit.JavascriptInterface
                public String printReceipt(final String jsonData) {
                    Log.d(TAG, "printEscPos.printReceipt() called");
                    try {
                        JSONObject obj = new JSONObject(jsonData);
                        String billNumber  = obj.optString("billNumber", "");
                        String billerName  = obj.optString("billerName", "");
                        String dateStr     = obj.optString("dateStr", "");
                        String timeStr     = obj.optString("timeStr", "");
                        String grandTotal  = obj.optString("grandTotal", "");
                        String paymentMode = obj.optString("paymentMode", "CASH");

                        JSONArray itemsArr  = obj.optJSONArray("items");
                        String[][] items    = null;
                        if (itemsArr != null) {
                            items = new String[itemsArr.length()][4];
                            for (int i = 0; i < itemsArr.length(); i++) {
                                JSONObject itm = itemsArr.getJSONObject(i);
                                items[i][0] = itm.optString("name", "");
                                items[i][1] = itm.optString("qty", "");
                                items[i][2] = itm.optString("rate", "");
                                items[i][3] = itm.optString("total", "");
                            }
                        }

                        // Try to connect if not already connected
                        if (!printerManager.isConnected()) {
                            boolean ok = printerManager.connect();
                            if (!ok) {
                                // Maybe permission is missing — request it
                                UsbDevice dev = printerManager.findPrinterDevice();
                                if (dev != null) {
                                    runOnUiThread(() -> requestUsbPermissionIfNeeded(dev));
                                    return "{\"success\":false,\"error\":\"USB permission required. Please allow and try again.\"}";
                                }
                                return "{\"success\":false,\"error\":\"No USB printer found. Check OTG connection.\"}";
                            }
                        }

                        boolean printed = printerManager.printReceipt(
                                billNumber, billerName, dateStr, timeStr,
                                items, grandTotal, paymentMode);

                        printerManager.disconnect();

                        if (printed) {
                            runOnUiThread(() ->
                                    Toast.makeText(MainActivity.this,
                                            "Receipt printed!", Toast.LENGTH_SHORT).show());
                            return "{\"success\":true}";
                        } else {
                            return "{\"success\":false,\"error\":\"Print transfer failed. Check printer connection.\"}";
                        }

                    } catch (Exception e) {
                        Log.e(TAG, "printReceipt error: " + e.getMessage(), e);
                        return "{\"success\":false,\"error\":\"" + e.getMessage() + "\"}";
                    }
                }

                /**
                 * Returns true if a USB printer is currently detected.
                 */
                @android.webkit.JavascriptInterface
                public boolean isPrinterConnected() {
                    return printerManager.findPrinterDevice() != null;
                }

                /**
                 * Triggers the USB permission dialog for any detected printer.
                 * Call this from JS when user taps "Connect Printer".
                 */
                @android.webkit.JavascriptInterface
                public void requestPrinterPermission() {
                    UsbDevice dev = printerManager.findPrinterDevice();
                    if (dev != null) {
                        runOnUiThread(() -> requestUsbPermissionIfNeeded(dev));
                    } else {
                        runOnUiThread(() ->
                                Toast.makeText(MainActivity.this,
                                        "No USB printer found. Please connect via OTG.",
                                        Toast.LENGTH_LONG).show());
                    }
                }

            }, "AndroidEscPosPrint");

            Log.d(TAG, "JS bridges injected: AndroidPrint + AndroidEscPosPrint");
        }
    }

    // ────────────────────────────────────────────────────────────────────
    @Override
    public void onDestroy() {
        super.onDestroy();
        try {
            unregisterReceiver(usbPermissionReceiver);
            unregisterReceiver(usbAttachReceiver);
        } catch (Exception ignored) {}
        if (printerManager != null) printerManager.disconnect();
    }

    // ── Private helpers ──────────────────────────────────────────────────

    private void registerUsbReceivers() {
        IntentFilter permFilter = new IntentFilter(ACTION_USB_PERM);
        IntentFilter attachFilter = new IntentFilter();
        attachFilter.addAction(UsbManager.ACTION_USB_DEVICE_ATTACHED);
        attachFilter.addAction(UsbManager.ACTION_USB_DEVICE_DETACHED);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) { // API 33+
            // Android 13+: must explicitly declare exported status or OS crashes the app
            // Our custom USB permission action is private (not exported)
            registerReceiver(usbPermissionReceiver, permFilter, Context.RECEIVER_NOT_EXPORTED);
            // USB attach/detach are system broadcasts, so this receiver must be exported
            registerReceiver(usbAttachReceiver, attachFilter, Context.RECEIVER_EXPORTED);
        } else {
            registerReceiver(usbPermissionReceiver, permFilter);
            registerReceiver(usbAttachReceiver, attachFilter);
        }
    }

    private void requestUsbPermissionIfNeeded(UsbDevice device) {
        if (device == null) return;
        UsbManager usbManager = (UsbManager) getSystemService(Context.USB_SERVICE);
        if (usbManager == null) return;

        if (!usbManager.hasPermission(device)) {
            Log.d(TAG, "Requesting USB permission for " + device.getDeviceName());
            int flags = Build.VERSION.SDK_INT >= 31
                    ? PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE
                    : PendingIntent.FLAG_UPDATE_CURRENT;
            
            Intent intent = new Intent(ACTION_USB_PERM);
            intent.setPackage(getPackageName()); // Make intent explicit (required for FLAG_MUTABLE on Android 14+)
            
            PendingIntent permIntent = PendingIntent.getBroadcast(this, 0, intent, flags);
            usbManager.requestPermission(device, permIntent);
        } else {
            Log.d(TAG, "USB permission already granted for " + device.getDeviceName());
        }
    }

    // ── Existing HTML PrintManager path ─────────────────────────────────

    private void doPrintHtml(final String html) {
        if (printWebView != null) {
            printWebView.destroy();
            printWebView = null;
        }

        printWebView = new WebView(this);
        printWebView.setVisibility(WebView.GONE);

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
                view.postDelayed(() -> cleanup(view, rootLayout), 5000);
            }
        });

        finalPrintView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null);
    }

    private void cleanup(WebView view, FrameLayout root) {
        try {
            root.removeView(view);
            view.destroy();
            if (printWebView == view) printWebView = null;
            Log.d(TAG, "Print WebView cleaned up");
        } catch (Exception e) {
            Log.e(TAG, "Cleanup error: " + e.getMessage());
        }
    }
}
