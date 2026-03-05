import { Router } from 'express';
import {
    getDashboardStats,
    getBillerRevenue,
    getDailyRevenue,
    getQuarterlyReport,
    getYearlyReport,
} from '../controllers/dashboard.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// All dashboard routes require admin authentication
router.use(authenticate, authorize('ADMIN'));

// GET /api/dashboard/stats - Today and monthly stats
router.get('/stats', getDashboardStats);

// GET /api/dashboard/biller-revenue - Biller-wise revenue
router.get('/biller-revenue', getBillerRevenue);

// GET /api/dashboard/daily-revenue?days=7 - Daily revenue
router.get('/daily-revenue', getDailyRevenue);

// GET /api/reports/quarterly - Quarterly report
router.get('/quarterly', getQuarterlyReport);

// GET /api/reports/yearly?year=2024 - Yearly report
router.get('/yearly', getYearlyReport);

export default router;
