import { Bill } from '@/types';
import { format } from 'date-fns';

interface PrintReceiptProps {
    bill: Bill | null;
}

export default function PrintReceipt({ bill }: PrintReceiptProps) {
    if (!bill) return null;

    return (
        <div id="receipt-print-area" className="hidden print:block print:w-[72mm] print:max-w-[72mm] print:p-0 print:m-0 print:text-black print:box-border">
            <div className="flex flex-col items-center text-center space-y-1 mb-4">
                <h1 className="text-xl font-bold uppercase">Vaishali Vadapav & Snacks Center</h1>
                <p className="text-xs">Katepuram Chowk, Pimple Gurav, Pimpri Chinchwad, Pune, 411061</p>
                <p className="text-xs">Phone: +91 9420597911</p>
                <p className="text-xs">Phone: +91 7755974006</p>
            </div>

            <div className="border-t border-b border-dashed py-2 mb-2 text-xs">
                <div className="flex justify-between">
                    <span>Bill No: {bill.billNumber}</span>
                    <span>Date: {format(new Date(bill.createdAt), 'dd/MM/yyyy')}</span>
                </div>
                <div className="flex justify-between">
                    <span>Biller: {bill.billerName}</span>
                    <span>Time: {format(new Date(bill.createdAt), 'hh:mm a')}</span>
                </div>
            </div>

            <table className="w-full text-xs mb-4">
                <thead>
                    <tr className="border-b border-dashed">
                        <th className="text-left py-1">Item</th>
                        <th className="text-center py-1">Qty</th>
                        <th className="text-right py-1">Price</th>
                        <th className="text-right py-1">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {bill.items.map((item, index) => (
                        <tr key={index}>
                            <td className="py-1">{item.itemName}</td>
                            <td className="text-center py-1">{item.quantity}</td>
                            <td className="text-right py-1">{item.price}</td>
                            <td className="text-right py-1">{item.total}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="border-t border-dashed pt-2 space-y-1 text-xs">
                <div className="flex justify-between font-bold text-sm">
                    <span>Grand Total</span>
                    <span>₹{bill.totalAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between italic">
                    <span>Payment Mode</span>
                    <span className="uppercase">{bill.paymentMode}</span>
                </div>
            </div>

            <div className="mt-8 text-center space-y-1">
                <p className="text-xs font-bold">Thank You! Visit Again</p>

            </div>

            {/* Extra space for auto-cutter */}
            <div className="h-16"></div>
        </div>
    );
}
