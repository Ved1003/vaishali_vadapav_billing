import { Router } from 'express';
import {
    getAllItems,
    getActiveItems,
    createItem,
    updateItem,
    deleteItem,
} from '../controllers/items.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// GET /api/items - Get all items (admin only)
router.get('/', authenticate, authorize('ADMIN'), getAllItems);

// GET /api/items/active - Get active items (all authenticated users)
router.get('/active', authenticate, getActiveItems);

// POST /api/items - Create new item (admin only)
router.post('/', authenticate, authorize('ADMIN'), createItem);

// PUT /api/items/:id - Update item (admin only)
router.put('/:id', authenticate, authorize('ADMIN'), updateItem);

// DELETE /api/items/:id - Soft delete item (admin only)
router.delete('/:id', authenticate, authorize('ADMIN'), deleteItem);

export default router;
