import { Request, Response } from 'express';
import { Bill, getNextBillNumber } from '../models/Bill.model';
import { FridgeItem } from '../models/FridgeItem.model';

export const createBill = async (req: Request, res: Response): Promise<void> => {
    try {
        const { items, totalAmount, paymentMode, billerId, billerName } = req.body;

        if (!items || !items.length) {
            res.status(400).json({ error: 'Bill must have at least one item' });
            return;
        }

        if (!totalAmount || !paymentMode || !billerId || !billerName) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }

        // Generate next bill number
        const billNumber = await getNextBillNumber();

        const bill = new Bill({
            billNumber,
            items,
            totalAmount,
            paymentMode,
            billerId,
            billerName,
        });

        await bill.save();
        console.log(`[Bill] Created: ${bill.billNumber} for ₹${bill.totalAmount} by ${bill.billerName}`);

        // Broadcast event via WebSocket
        const { emitEvent } = require('../utils/socket');
        emitEvent('BILL_CREATED', bill);

        // Deduct stock for any fridge items in this bill
        const fridgeItems = items.filter((i: { isFridgeItem?: boolean }) => i.isFridgeItem);
        if (fridgeItems.length > 0) {
            await Promise.all(
                fridgeItems.map((i: { itemId: string; quantity: number }) =>
                    FridgeItem.findByIdAndUpdate(i.itemId, { $inc: { stock: -i.quantity } })
                )
            );
        }

        res.status(201).json(bill);
    } catch (error) {
        console.error('Create bill error:', error);
        res.status(500).json({ error: 'Failed to create bill' });
    }
};


export const getBills = async (req: Request, res: Response): Promise<void> => {
    try {
        const { startDate, endDate, billerId, paymentMode, page = 1, limit = 1000 } = req.query;

        const query: any = {};

        // Date filtering
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) {
                // Parse as local time start of day
                query.createdAt.$gte = new Date(`${startDate}T00:00:00.000`);
            }
            if (endDate) {
                // Parse as local time end of day
                query.createdAt.$lte = new Date(`${endDate}T23:59:59.999`);
            }
        }

        // Biller filtering
        if (billerId) {
            query.billerId = billerId;
        }

        // Payment Mode filtering
        if (paymentMode) {
            query.paymentMode = paymentMode;
        }

        const skip = (Number(page) - 1) * Number(limit);

        const [bills, total] = await Promise.all([
            Bill.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            Bill.countDocuments(query),
        ]);

        res.json({
            bills,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit)),
            },
        });
    } catch (error) {
        console.error('Get bills error:', error);
        res.status(500).json({ error: 'Failed to fetch bills' });
    }
};

export const getBillById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const bill = await Bill.findById(id);

        if (!bill) {
            res.status(404).json({ error: 'Bill not found' });
            return;
        }

        res.json(bill);
    } catch (error) {
        console.error('Get bill error:', error);
        res.status(500).json({ error: 'Failed to fetch bill' });
    }
};

export const deleteBill = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const bill = await Bill.findByIdAndDelete(id);
        if (!bill) {
            res.status(404).json({ error: 'Bill not found' });
            return;
        }

        // Broadcast event via WebSocket
        const { emitEvent } = require('../utils/socket');
        emitEvent('BILL_DELETED', id);

        res.json({ message: 'Bill deleted successfully' });
    } catch (error) {
        console.error('Delete bill error:', error);
        res.status(500).json({ error: 'Failed to delete bill' });
    }
};
