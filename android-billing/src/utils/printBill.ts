import { Capacitor } from '@capacitor/core';
import { Bill } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Type declarations for the Android JS bridges injected by MainActivity.java
// ─────────────────────────────────────────────────────────────────────────────
declare global {
  interface Window {
    AndroidPrint?: {
      printHtml(html: string): void;
    };
    AndroidEscPosPrint?: {
      /** Returns JSON string: { success: boolean, error?: string } */
      printReceipt(jsonData: string): string;
      /** Returns true if a USB printer device is currently detected */
      isPrinterConnected(): boolean;
      /** Triggers the Android USB permission dialog */
      requestPrinterPermission(): void;
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: build receipt HTML (used as fallback for HTML / non-ESC/POS printing)
// ─────────────────────────────────────────────────────────────────────────────
function buildReceiptHtml(bill: Bill): string {
  const date    = new Date(bill.createdAt);
  const dateStr = date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  const itemRows = bill.items.map(item => `
      <tr>
          <td>${item.itemName}</td>
          <td style="text-align:center">${item.quantity}</td>
          <td style="text-align:right">&#8377;${item.price}</td>
          <td style="text-align:right">&#8377;${item.total}</td>
      </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Bill #${bill.billNumber}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Courier New', monospace;
    font-size: 12px;
    width: 72mm;
    max-width: 72mm;
    padding: 4mm;
    color: #000;
  }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .large { font-size: 15px; }
  .spacer { margin: 4px 0; }
  .dashed { border-top: 1px dashed #000; margin: 6px 0; }
  table { width: 100%; border-collapse: collapse; }
  th { font-weight: bold; border-bottom: 1px dashed #000; padding: 3px 0; font-size: 11px; }
  td { padding: 2px 0; font-size: 11px; }
  .total-row td { font-weight: bold; font-size: 13px; padding-top: 6px; }
  .footer { text-align: center; margin-top: 12px; font-size: 11px; }
  @media print {
    @page { margin: 0; size: 72mm auto; }
    body { padding: 2mm; }
  }
</style>
</head>
<body>
  <div class="center">
    <div class="bold large">Vaishali Vadapav &amp; Snacks Center</div>
    <div class="spacer">Katepuram Chowk, Pimple Gurav,</div>
    <div>Pimpri Chinchwad, Pune 411061</div>
    <div>Ph: +91 9420597911 / +91 7755974006</div>
  </div>

  <div class="dashed"></div>
  <div style="display:flex; justify-content:space-between">
    <span>Bill No: <strong>${bill.billNumber}</strong></span>
    <span>${dateStr}</span>
  </div>
  <div style="display:flex; justify-content:space-between">
    <span>Biller: ${bill.billerName}</span>
    <span>${timeStr}</span>
  </div>
  <div class="dashed"></div>

  <table>
    <thead>
      <tr>
        <th style="text-align:left">Item</th>
        <th style="text-align:center">Qty</th>
        <th style="text-align:right">Rate</th>
        <th style="text-align:right">Amt</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
      <tr class="total-row">
        <td colspan="3">Grand Total</td>
        <td style="text-align:right">&#8377;${bill.totalAmount.toLocaleString('en-IN')}</td>
      </tr>
    </tbody>
  </table>

  <div class="dashed"></div>
  <div style="display:flex; justify-content:space-between">
    <span>Payment</span>
    <span class="bold">${bill.paymentMode.toUpperCase()}</span>
  </div>

  <div class="footer">
    <div class="bold">&#9733; Thank You! Visit Again &#9733;</div>
  </div>
  <div style="height:40mm"></div>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: build the ESC/POS JSON payload expected by AndroidEscPosPrint bridge
// ─────────────────────────────────────────────────────────────────────────────
function buildEscPosPayload(bill: Bill): string {
  const date    = new Date(bill.createdAt);
  const dateStr = date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  const items = bill.items.map(item => ({
    name:  item.itemName,
    qty:   String(item.quantity),
    rate:  `\u20B9${item.price}`,
    total: `\u20B9${item.total}`,
  }));

  const payload = {
    billNumber:  String(bill.billNumber),
    billerName:  bill.billerName,
    dateStr,
    timeStr,
    items,
    grandTotal:  `\u20B9${bill.totalAmount.toLocaleString('en-IN')}`,
    paymentMode: bill.paymentMode.toUpperCase(),
  };

  return JSON.stringify(payload);
}

// ─────────────────────────────────────────────────────────────────────────────
// tryEscPosPrint  — attempts USB OTG ESC/POS printing via the native bridge.
// Returns true if the receipt was sent successfully.
// ─────────────────────────────────────────────────────────────────────────────
function tryEscPosPrint(bill: Bill): boolean {
  const bridge = window.AndroidEscPosPrint;
  if (!bridge?.printReceipt) return false;

  try {
    const jsonPayload = buildEscPosPayload(bill);
    const resultStr   = bridge.printReceipt(jsonPayload);
    const result      = JSON.parse(resultStr) as { success: boolean; error?: string };

    if (result.success) {
      console.log('[printBill] ESC/POS print successful');
      return true;
    } else {
      console.warn('[printBill] ESC/POS error:', result.error);
      // Show toast-like alert only for actionable errors
      if (result.error?.includes('permission')) {
        alert(`USB Printer: ${result.error}`);
      } else if (result.error?.includes('No USB printer')) {
        // Silently fall through to HTML print — printer may just not be connected
        console.warn('[printBill] No USB printer, falling back to HTML print');
      } else {
        alert(`Printer error: ${result.error}`);
      }
      return false;
    }
  } catch (e) {
    console.error('[printBill] ESC/POS bridge exception:', e);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// tryHtmlPrint  — falls back to AndroidPrint (PrintManager) or browser popup
// ─────────────────────────────────────────────────────────────────────────────
function tryHtmlPrint(html: string): void {
  const isAndroidNative = Capacitor.getPlatform() === 'android';

  if (isAndroidNative) {
    const attempt = (retries: number) => {
      if (window.AndroidPrint?.printHtml) {
        window.AndroidPrint.printHtml(html);
        return;
      }
      if (retries > 0) {
        setTimeout(() => attempt(retries - 1), 100);
      } else {
        alert('Printing unavailable. Please restart the app.');
      }
    };
    attempt(10);
  } else {
    // Desktop / browser
    const popup = window.open('', '_blank', 'width=350,height=650');
    if (popup) {
      popup.document.write(html);
      popup.document.close();
      popup.focus();
      setTimeout(() => { popup.print(); }, 100);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// printBill — main entry point
//
// Strategy on Android:
//   1. Try ESC/POS USB OTG print  (direct, no dialog, instant)
//   2. Fall back to HTML PrintManager print (system dialog)
//
// Strategy on desktop:
//   - Opens a print popup
// ─────────────────────────────────────────────────────────────────────────────
export function printBill(bill: Bill): void {
  const isAndroidNative = Capacitor.getPlatform() === 'android';

  if (isAndroidNative) {
    // Try ESC/POS first
    const escPosOk = tryEscPosPrint(bill);

    if (!escPosOk) {
      // Fall back to HTML / PrintManager
      console.log('[printBill] Falling back to HTML print');
      const html = buildReceiptHtml(bill);
      tryHtmlPrint(html);
    }
  } else {
    // Desktop: always HTML popup
    const html = buildReceiptHtml(bill);
    tryHtmlPrint(html);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility: check printer status from UI (call from settings/status screen)
// ─────────────────────────────────────────────────────────────────────────────
export function isUsbPrinterConnected(): boolean {
  return window.AndroidEscPosPrint?.isPrinterConnected?.() ?? false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility: request USB permission (call from a "Connect Printer" button)
// ─────────────────────────────────────────────────────────────────────────────
export function requestUsbPrinterPermission(): void {
  window.AndroidEscPosPrint?.requestPrinterPermission?.();
}
