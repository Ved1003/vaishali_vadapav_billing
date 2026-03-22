import { Router } from 'express';
import { generateSalesReport } from '../controllers/reports.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Protect routes - only admin should generate reports
router.get('/sales', authenticate, authorize('ADMIN'), generateSalesReport);

export default router;
