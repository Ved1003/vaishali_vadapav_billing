import { Request, Response, NextFunction } from 'express';
import { Bill } from '../models/Bill.model';
import ExcelJS from 'exceljs';

export const generateSalesReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const startDate = req.query.startDate as string;
        const endDate = req.query.endDate as string;

        if (!startDate || !endDate) {
            res.status(400).json({ message: 'Start date and end date are required' });
            return;
        }

        const start = new Date(`${startDate}T00:00:00.000`);
        const end = new Date(`${endDate}T23:59:59.999`);

        const bills = await Bill.find({
            createdAt: {
                $gte: start,
                $lte: end,
            },
        }).sort({ createdAt: -1 });

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        worksheet.columns = [
            { header: 'Bill Number', key: 'billNumber', width: 15 },
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Time', key: 'time', width: 10 },
            { header: 'Biller Name', key: 'billerName', width: 20 },
            { header: 'Items', key: 'items', width: 40 },
            { header: 'Payment Mode', key: 'paymentMode', width: 15 },
            { header: 'Total Amount', key: 'totalAmount', width: 15 },
        ];

        // Style header
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        let totalRevenue = 0;

        bills.forEach((bill) => {
            const date = new Date(bill.createdAt);
            const itemsString = bill.items.map(i => `${i.itemName} (${i.quantity})`).join(', ');

            worksheet.addRow({
                billNumber: bill.billNumber,
                date: date.toLocaleDateString('en-IN'),
                time: date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                billerName: bill.billerName,
                items: itemsString,
                paymentMode: bill.paymentMode.toUpperCase(),
                totalAmount: bill.totalAmount,
            });

            totalRevenue += bill.totalAmount;
        });

        // Add Total Row
        worksheet.addRow({});
        const totalRow = worksheet.addRow({
            paymentMode: 'TOTAL REVENUE',
            totalAmount: totalRevenue
        });
        totalRow.font = { bold: true };
        totalRow.getCell('paymentMode').alignment = { horizontal: 'right' };

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            'attachment; filename=' + `Sales_Report_${startDate}_to_${endDate}.xlsx`
        );

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        next(error);
    }
};
