import { Router } from 'express';
import { createBill, getBills, getBillById, deleteBill } from '../controllers/bills.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All bill routes require authentication
router.use(authenticate);

// POST /api/bills - Create new bill
router.post('/', createBill);

// GET /api/bills - Get bills with filters
router.get('/', getBills);

// GET /api/bills/:id - Get single bill
router.get('/:id', getBillById);

// DELETE /api/bills/:id - Delete single bill
router.delete('/:id', deleteBill);

export default router;
