package com.tanmay.billing;

import android.content.Context;
import android.hardware.usb.UsbConstants;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbDeviceConnection;
import android.hardware.usb.UsbEndpoint;
import android.hardware.usb.UsbInterface;
import android.hardware.usb.UsbManager;
import android.util.Log;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;

/**
 * PrinterManager — USB OTG ESC/POS printer helper.
 *
 * Usage:
 * PrinterManager pm = new PrinterManager(context);
 * if (pm.connect()) {
 * pm.printReceipt(bill);
 * pm.disconnect();
 * }
 */
public class PrinterManager {

    private static final String TAG = "PrinterManager";

    // Print timeout (ms)
    private static final int TIMEOUT_MS = 5000;

    // ── ESC/POS command bytes ───────────────────────────────────────────
    private static final byte[] ESC_INIT = { 0x1B, 0x40 }; // Initialize printer
    private static final byte[] ESC_STANDARD = { 0x1B, 0x21, 0x00 }; // Standard Font A
    private static final byte[] ESC_ALIGN_LEFT = { 0x1B, 0x61, 0x00 }; // Left align
    private static final byte[] ESC_ALIGN_CENTER = { 0x1B, 0x61, 0x01 }; // Center align
    private static final byte[] ESC_ALIGN_RIGHT = { 0x1B, 0x61, 0x02 }; // Right align
    private static final byte[] ESC_BOLD_ON = { 0x1B, 0x45, 0x01 }; // Bold on
    private static final byte[] ESC_BOLD_OFF = { 0x1B, 0x45, 0x00 }; // Bold off
    private static final byte[] ESC_DOUBLE_SIZE = { 0x1D, 0x21, 0x11 }; // Double width+height
    private static final byte[] ESC_NORMAL_SIZE = { 0x1D, 0x21, 0x00 }; // Normal size
    private static final byte[] LF = { 0x0A }; // Line feed
    private static final byte[] ESC_CUT = { 0x1D, 0x56, 0x42, 0x00 }; // Partial cut

    private final UsbManager usbManager;
    private UsbDevice printerDevice;
    private UsbDeviceConnection connection;
    private UsbEndpoint outEndpoint;
    private boolean connected = false;

    public PrinterManager(Context context) {
        this.usbManager = (UsbManager) context.getSystemService(Context.USB_SERVICE);
    }

    // ── Connection management ───────────────────────────────────────────

    /**
     * Returns the first USB device that looks like a printer.
     * Returns null if no printer is found or UsbManager is unavailable.
     */
    public UsbDevice findPrinterDevice() {
        if (usbManager == null)
            return null;
        HashMap<String, UsbDevice> deviceList = usbManager.getDeviceList();
        for (UsbDevice device : deviceList.values()) {
            if (isPrinterDevice(device)) {
                Log.d(TAG, "Found printer: " + device.getDeviceName()
                        + " class=" + device.getDeviceClass());
                return device;
            }
        }
        return null;
    }

    /**
     * Heuristic: a device is a "printer" if any of its interfaces is a
     * USB Printer class (7) OR if the device class itself is 7.
     * Also accepts vendor-specific (255) as many cheap thermal printers use it.
     */
    private boolean isPrinterDevice(UsbDevice device) {
        if (device.getDeviceClass() == UsbConstants.USB_CLASS_PRINTER)
            return true;

        for (int i = 0; i < device.getInterfaceCount(); i++) {
            UsbInterface iface = device.getInterface(i);
            if (iface.getInterfaceClass() == UsbConstants.USB_CLASS_PRINTER)
                return true;
            // Vendor-specific — many cheap thermal printers
            if (iface.getInterfaceClass() == UsbConstants.USB_CLASS_VENDOR_SPEC)
                return true;
        }
        return false;
    }

    /**
     * Connects to the given USB device.
     * Caller must ensure USB permission is already granted.
     *
     * @return true on success, false on failure.
     */
    public boolean connect(UsbDevice device) {
        if (device == null) {
            Log.e(TAG, "connect: device is null");
            return false;
        }
        if (usbManager == null) {
            Log.e(TAG, "connect: UsbManager is null");
            return false;
        }
        if (!usbManager.hasPermission(device)) {
            Log.e(TAG, "connect: no permission for device " + device.getDeviceName());
            return false;
        }

        // Find a suitable interface + bulk-out endpoint
        UsbInterface printerInterface = null;
        UsbEndpoint bulkOut = null;

        outer: for (int i = 0; i < device.getInterfaceCount(); i++) {
            UsbInterface iface = device.getInterface(i);
            for (int j = 0; j < iface.getEndpointCount(); j++) {
                UsbEndpoint ep = iface.getEndpoint(j);
                if (ep.getType() == UsbConstants.USB_ENDPOINT_XFER_BULK
                        && ep.getDirection() == UsbConstants.USB_DIR_OUT) {
                    printerInterface = iface;
                    bulkOut = ep;
                    break outer;
                }
            }
        }

        if (printerInterface == null || bulkOut == null) {
            Log.e(TAG, "connect: no suitable BULK OUT endpoint found");
            return false;
        }

        connection = usbManager.openDevice(device);
        if (connection == null) {
            Log.e(TAG, "connect: openDevice returned null");
            return false;
        }

        if (!connection.claimInterface(printerInterface, true)) {
            Log.e(TAG, "connect: claimInterface failed");
            connection.close();
            connection = null;
            return false;
        }

        printerDevice = device;
        outEndpoint = bulkOut;
        connected = true;
        Log.d(TAG, "connect: SUCCESS — " + device.getDeviceName());
        return true;
    }

    /** Convenience: auto-find and connect. */
    public boolean connect() {
        UsbDevice device = findPrinterDevice();
        if (device == null) {
            Log.w(TAG, "connect: no printer device found via USB");
            return false;
        }
        return connect(device);
    }

    /** Disconnect and release USB resources. */
    public void disconnect() {
        if (connection != null) {
            connection.close();
            connection = null;
        }
        connected = false;
        Log.d(TAG, "disconnect: done");
    }

    public boolean isConnected() {
        return connected && connection != null;
    }

    // ── Low-level write ─────────────────────────────────────────────────

    /**
     * Sends raw bytes to the printer.
     * 
     * @return true if all bytes were written successfully.
     */
    public boolean writeRaw(byte[] data) {
        if (!isConnected()) {
            Log.e(TAG, "writeRaw: not connected");
            return false;
        }
        int transferred = connection.bulkTransfer(outEndpoint, data, data.length, TIMEOUT_MS);
        if (transferred < 0) {
            Log.e(TAG, "writeRaw: bulkTransfer returned " + transferred);
            return false;
        }
        Log.d(TAG, "writeRaw: sent " + transferred + "/" + data.length + " bytes");
        return true;
    }

    // ── ESC/POS helpers ────────────────────────────────────────────────

    private void append(ByteArrayOutputStream bos, byte[] bytes) {
        try {
            bos.write(bytes);
        } catch (IOException ignored) {
        }
    }

    private void appendText(ByteArrayOutputStream bos, String text) {
        try {
            bos.write(text.getBytes(StandardCharsets.UTF_8));
        } catch (IOException ignored) {
        }
    }

    /** Pads or truncates a string to exactly `width` characters. */
    private String padRight(String s, int width) {
        if (s == null)
            s = "";
        if (s.length() >= width)
            return s.substring(0, width);
        StringBuilder sb = new StringBuilder(s);
        while (sb.length() < width)
            sb.append(' ');
        return sb.toString();
    }

    /** Right-aligns a string within `width` characters. */
    private String padLeft(String s, int width) {
        if (s == null)
            s = "";
        if (s.length() >= width)
            return s.substring(0, width);
        StringBuilder sb = new StringBuilder();
        while (sb.length() < width - s.length())
            sb.append(' ');
        sb.append(s);
        return sb.toString();
    }

    /** Creates an exact 48-character dashed line. */
    private String dashLine() {
        return "------------------------------------------------\n";
    }

    // ── High-level receipt printing ─────────────────────────────────────

    /**
     * Builds and prints a full ESC/POS receipt for the given bill data.
     */
    public boolean printReceipt(
            String billNumber,
            String billerName,
            String dateStr,
            String timeStr,
            String[][] items,
            String grandTotal,
            String paymentMode) {

        if (!isConnected()) {
            Log.e(TAG, "printReceipt: printer not connected");
            return false;
        }

        ByteArrayOutputStream bos = new ByteArrayOutputStream();

        // Initialize and force standard 80mm Font A
        append(bos, ESC_INIT);
        append(bos, ESC_STANDARD);

        // ── Header ─────────────────────────────────────────────────────
        append(bos, ESC_ALIGN_CENTER);
        append(bos, ESC_BOLD_ON);
        append(bos, ESC_DOUBLE_SIZE);
        appendText(bos, "Vaishali Vadapav\n");
        append(bos, ESC_NORMAL_SIZE);
        appendText(bos, "& Snacks Center\n");
        append(bos, ESC_BOLD_OFF);
        appendText(bos, "Katepuram Chowk, Pimple Gurav\n");
        appendText(bos, "Pimpri Chinchwad, Pune 411061\n");
        appendText(bos, "Ph: +91 9420597911\n");
        appendText(bos, "Ph: +91 7755974006\n");

        // ── Bill Info ──────────────────────────────────────────────────
        append(bos, ESC_ALIGN_LEFT);
        appendText(bos, dashLine());

        String billLine = "Bill No: " + billNumber;
        appendText(bos, padRight(billLine, 28) + padLeft(dateStr, 20) + "\n");

        String billerLine = "Biller: " + billerName;
        appendText(bos, padRight(billerLine, 28) + padLeft(timeStr, 20) + "\n");
        appendText(bos, dashLine());

        // ── Column headers ─────────────────────────────────────────────
        append(bos, ESC_BOLD_ON);
        // Item(21) Qty(5) Rate(10) Amt(12) => 48 chars total
        appendText(bos, padRight("Item", 21)
                + padLeft("Qty", 5)
                + padLeft("Rate", 10)
                + padLeft("Amt", 12) + "\n");
        append(bos, ESC_BOLD_OFF);
        appendText(bos, dashLine());

        // ── Items ──────────────────────────────────────────────────────
        if (items != null) {
            for (String[] item : items) {
                String name = item.length > 0 ? item[0] : "";
                String qty = item.length > 1 ? item[1] : "";
                String rate = item.length > 2 ? item[2] : "";
                String total = item.length > 3 ? item[3] : "";

                // Truncate long name to fit 21 chars
                if (name.length() > 21)
                    name = name.substring(0, 20) + ".";

                appendText(bos, padRight(name, 21)
                        + padLeft(qty, 5)
                        + padLeft(rate, 10)
                        + padLeft(total, 12) + "\n");
            }
        }

        // ── Grand Total ────────────────────────────────────────────────
        appendText(bos, dashLine());
        append(bos, ESC_BOLD_ON);
        appendText(bos, padRight("Grand Total", 30) + padLeft(grandTotal, 18) + "\n");
        append(bos, ESC_BOLD_OFF);
        appendText(bos, padRight("Payment Method", 30) + padLeft(paymentMode, 18) + "\n");
        appendText(bos, dashLine());

        // ── Footer ─────────────────────────────────────────────────────
        append(bos, ESC_ALIGN_CENTER);
        append(bos, ESC_BOLD_ON);
        appendText(bos, "* Thank You! Visit Again *\n");
        append(bos, ESC_BOLD_OFF);

        // Reduced paper feed to minimum 1 LF to eliminate gap on subsequent receipts
        append(bos, LF);

        // Paper cut
        append(bos, ESC_CUT);

        // Send to printer
        return writeRaw(bos.toByteArray());
    }
}
