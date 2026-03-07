import { Capacitor } from '@capacitor/core';
import { Bill } from '@/types';

/**
 * printBill – Capacitor Android + Desktop printing utility.
 *
 * On Android (native): Calls the AndroidPrint JavascriptInterface injected
 *   by MainActivity, which invokes the Android PrintManager directly.
 * On Desktop (browser): Opens a popup window and triggers window.print().
 */
export function printBill(bill: Bill): void {
  const date = new Date(bill.createdAt);
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

  const html = `<!DOCTYPE html>
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

  const win = window as any;
  const isAndroidNative = Capacitor.getPlatform() === 'android';

  if (isAndroidNative) {
    const tryPrint = (attempts: number) => {
      if (win.AndroidPrint?.printHtml) {
        win.AndroidPrint.printHtml(html);
        return true;
      }
      if (attempts > 0) {
        setTimeout(() => tryPrint(attempts - 1), 100);
      } else {
        alert('Printing unavailable. Please restart the app.');
      }
      return false;
    };

    // Try immediately, if fails, poll every 100ms for 1 second total
    if (!tryPrint(10)) {
      console.warn('[printBill] AndroidPrint bridge not found, polling...');
    }
  } else {
    // ── Desktop / Browser path ───────────────────────────────────────
    const popup = window.open('', '_blank', 'width=350,height=650');
    if (popup) {
      popup.document.write(html);
      popup.document.close();
      popup.focus();
      // Reduced delay for faster printing
      setTimeout(() => { popup.print(); }, 100);
    }
  }
}
