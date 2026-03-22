import { Request, Response } from 'express';
import { Item } from '../models/Item.model';

const formatItem = (item: any) => {
    const obj = item.toObject ? item.toObject() : item;
    const { _id, __v, ...rest } = obj;
    return {
        id: _id.toString(),
        ...rest
    };
};

export const getAllItems = async (_req: Request, res: Response): Promise<void> => {
    try {
        const items = await Item.find().sort({ name: 1 });
        res.json(items.map(formatItem));
    } catch (error) {
        console.error('Get items error:', error);
        res.status(500).json({ error: 'Failed to fetch items' });
    }
};

export const getActiveItems = async (_req: Request, res: Response): Promise<void> => {
    try {
        const items = await Item.find({ isActive: true }).sort({ name: 1 });
        res.json(items.map(formatItem));
    } catch (error) {
        console.error('Get active items error:', error);
        res.status(500).json({ error: 'Failed to fetch active items' });
    }
};

export const createItem = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, price, isActive } = req.body;

        if (!name || price === undefined) {
            res.status(400).json({ error: 'Name and price are required' });
            return;
        }

        const item = new Item({
            name,
            price,
            isActive: isActive !== undefined ? isActive : true,
        });

        await item.save();
        res.status(201).json(formatItem(item));
    } catch (error) {
        console.error('Create item error:', error);
        res.status(500).json({ error: 'Failed to create item' });
    }
};

export const updateItem = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const updates = req.body;

        console.log('🔄 Updating item:', { id, updates });

        const item = await Item.findByIdAndUpdate(id, updates, {
            new: true,
            runValidators: true,
        });

        if (!item) {
            console.log('❌ Item not found:', id);
            res.status(404).json({ error: 'Item not found' });
            return;
        }

        console.log('✅ Item updated successfully:', item);
        res.json(formatItem(item));
    } catch (error: any) {
        console.error('❌ Update item error:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
        });
        res.status(500).json({ error: 'Failed to update item' });
    }
};

export const deleteItem = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        // Soft delete - just mark as inactive
        const item = await Item.findByIdAndUpdate(
            id,
            { isActive: false },
            { new: true }
        );

        if (!item) {
            res.status(404).json({ error: 'Item not found' });
            return;
        }

        res.json({ message: 'Item deactivated successfully', item: formatItem(item) });
    } catch (error) {
        console.error('Delete item error:', error);
        res.status(500).json({ error: 'Failed to delete item' });
    }
};
