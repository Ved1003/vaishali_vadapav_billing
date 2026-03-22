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

        // Send immediate success response
        res.status(201).json(bill);

        // Perform background tasks (don't block the client)
        (async () => {
            try {
                // Broadcast event via WebSocket
                const { emitEvent } = require('../utils/socket');
                emitEvent('BILL_CREATED', bill);

                // Deduct stock for any fridge items in this bill
                const fridgeItemsToUpdate = items.filter((i: { isFridgeItem?: boolean }) => i.isFridgeItem);
                if (fridgeItemsToUpdate.length > 0) {
                    await Promise.all(
                        fridgeItemsToUpdate.map((i: { itemId: string; quantity: number }) =>
                            FridgeItem.findByIdAndUpdate(i.itemId, { $inc: { stock: -i.quantity } })
                        )
                    );
                }
            } catch (bgError) {
                console.error('Background task error after bill creation:', bgError);
            }
        })();
    } catch (error) {
        console.error('Create bill error:', error);
        res.status(500).json({ error: 'Failed to create bill' });
    }
};


export const getBills = async (req: Request, res: Response): Promise<void> => {
    try {
        const { startDate, endDate, billerId, paymentMode, itemSearch, billSearch, page = 1, limit = 10 } = req.query;

        const query: any = {};

        // Date filtering
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) {
                query.createdAt.$gte = new Date(`${startDate}T00:00:00.000`);
            }
            if (endDate) {
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

        // Bill Number Search
        if (billSearch) {
            query.billNumber = { $regex: String(billSearch), $options: 'i' };
        }

        // Item Name Search (nested in array)
        if (itemSearch) {
            query['items.itemName'] = { $regex: String(itemSearch), $options: 'i' };
        }

        const skip = (Number(page) - 1) * Number(limit);

        console.log(`[GetBills] Query:`, JSON.stringify(query));
        console.log(`[GetBills] Page: ${page}, Limit: ${limit}, Skip: ${skip}`);

        // Fetch paginated data and stats in parallel
        const [bills, total, aggStats, topItems, trendData] = await Promise.all([
            Bill.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            Bill.countDocuments(query),
            Bill.aggregate([
                { $match: query },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: '$totalAmount' },
                        cashCollected: {
                            $sum: { $cond: [{ $eq: ['$paymentMode', 'cash'] }, '$totalAmount', 0] }
                        },
                        upiPayments: {
                            $sum: { $cond: [{ $eq: ['$paymentMode', 'upi'] }, '$totalAmount', 0] }
                        }
                    }
                }
            ]),
            // Top 5 selling items by revenue
            Bill.aggregate([
                { $match: query },
                { $unwind: '$items' },
                {
                    $group: {
                        _id: '$items.itemName',
                        revenue: { $sum: '$items.total' },
                        quantity: { $sum: '$items.quantity' }
                    }
                },
                { $sort: { revenue: -1 } },
                { $limit: 5 },
                {
                    $project: {
                        _id: 0,
                        name: '$_id',
                        revenue: 1,
                        quantity: 1
                    }
                }
            ]),
            // Daily trend data
            Bill.aggregate([
                { $match: query },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        revenue: { $sum: '$totalAmount' }
                    }
                },
                { $sort: { _id: 1 } },
                {
                    $project: {
                        _id: 0,
                        date: '$_id',
                        revenue: 1
                    }
                }
            ])
        ]);

        const stats = aggStats.length > 0 ? aggStats[0] : {
            totalRevenue: 0,
            cashCollected: 0,
            upiPayments: 0
        };

        res.json({
            bills,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit)),
            },
            stats: {
                ...stats,
                count: total,
                topItems: topItems || [],
                trendData: trendData || []
            }
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
