import { Router } from 'express';
import {
    getAllFridgeItems,
    getActiveFridgeItems,
    createFridgeItem,
    updateFridgeItem,
    restockFridgeItem,
    deleteFridgeItem,
} from '../controllers/fridge.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// GET /api/fridge — All items (admin only)
router.get('/', authenticate, authorize('ADMIN'), getAllFridgeItems);

// GET /api/fridge/active — Active items (biller + admin)
router.get('/active', authenticate, getActiveFridgeItems);

// POST /api/fridge — Create item (admin only)
router.post('/', authenticate, authorize('ADMIN'), createFridgeItem);

// PUT /api/fridge/:id — Update item (admin only)
router.put('/:id', authenticate, authorize('ADMIN'), updateFridgeItem);

// POST /api/fridge/:id/restock — Add stock (admin only)
router.post('/:id/restock', authenticate, authorize('ADMIN'), restockFridgeItem);

// DELETE /api/fridge/:id — Soft delete (admin only)
router.delete('/:id', authenticate, authorize('ADMIN'), deleteFridgeItem);

export default router;
