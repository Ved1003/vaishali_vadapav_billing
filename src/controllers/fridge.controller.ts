import { Request, Response } from 'express';
import { FridgeItem } from '../models/FridgeItem.model';

const formatFridgeItem = (item: any) => {
    const obj = item.toObject ? item.toObject() : item;
    const { _id, __v, ...rest } = obj;
    return {
        id: _id.toString(),
        ...rest
    };
};

// GET /api/fridge — All items (admin)
export const getAllFridgeItems = async (_req: Request, res: Response): Promise<void> => {
    try {
        const items = await FridgeItem.find().sort({ createdAt: -1 });
        res.json(items.map(formatFridgeItem));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch fridge items' });
    }
};

// GET /api/fridge/active — Active items for biller
export const getActiveFridgeItems = async (_req: Request, res: Response): Promise<void> => {
    try {
        const items = await FridgeItem.find({ isActive: true }).sort({ name: 1 });
        res.json(items.map(formatFridgeItem));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch fridge items' });
    }
};

// POST /api/fridge — Create item
export const createFridgeItem = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, price, stock, lowStockThreshold, unit } = req.body;
        if (!name || price === undefined) {
            res.status(400).json({ error: 'Name and price are required' });
            return;
        }
        const item = await FridgeItem.create({ name, price, stock: stock || 0, lowStockThreshold: lowStockThreshold ?? 5, unit: unit || 'piece' });
        const formatted = formatFridgeItem(item);

        // Broadcast event via WebSocket
        const { emitEvent } = require('../utils/socket');
        emitEvent('FRIDGE_ITEM_CREATED', formatted);

        res.status(201).json(formatted);
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: msg });
    }
};

// PUT /api/fridge/:id — Update item
export const updateFridgeItem = async (req: Request, res: Response): Promise<void> => {
    try {
        const item = await FridgeItem.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!item) {
            res.status(404).json({ error: 'Item not found' });
            return;
        }
        const formatted = formatFridgeItem(item);

        // Broadcast event via WebSocket
        const { emitEvent } = require('../utils/socket');
        emitEvent('FRIDGE_ITEM_UPDATED', formatted);

        res.json(formatted);
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: msg });
    }
};

// POST /api/fridge/:id/restock — Add stock
export const restockFridgeItem = async (req: Request, res: Response): Promise<void> => {
    try {
        const { quantity } = req.body;
        if (!quantity || quantity <= 0) {
            res.status(400).json({ error: 'Quantity must be positive' });
            return;
        }
        const item = await FridgeItem.findByIdAndUpdate(
            req.params.id,
            { $inc: { stock: quantity } },
            { new: true }
        );
        if (!item) {
            res.status(404).json({ error: 'Item not found' });
            return;
        }
        const formatted = formatFridgeItem(item);

        // Broadcast event via WebSocket
        const { emitEvent } = require('../utils/socket');
        emitEvent('FRIDGE_ITEM_UPDATED', formatted);

        res.json(formatted);
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: msg });
    }
};

// DELETE /api/fridge/:id — Soft delete
export const deleteFridgeItem = async (req: Request, res: Response): Promise<void> => {
    try {
        const item = await FridgeItem.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
        if (!item) {
            res.status(404).json({ error: 'Item not found' });
            return;
        }
        const formatted = formatFridgeItem(item);

        // Broadcast event via WebSocket
        const { emitEvent } = require('../utils/socket');
        emitEvent('FRIDGE_ITEM_UPDATED', formatted);

        res.json({ message: 'Item deactivated', item: formatted });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete item' });
    }
};
