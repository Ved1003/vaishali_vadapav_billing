import { Request, Response } from 'express';
import { Bill } from '../models/Bill.model';

export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const period = (req.query.period as string) || 'monthly';
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let startDate: Date;
        let endDate: Date = new Date();

        switch (period) {
            case 'today':
                startDate = today;
                break;
            case 'yearly':
                startDate = new Date(today.getFullYear(), 0, 1);
                endDate = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
                break;
            case 'monthly':
            default:
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                break;
        }

        // Period stats
        const periodStats = await Bill.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate, $lte: endDate },
                },
            },
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: '$totalAmount' },
                    totalBillCount: { $sum: 1 },
                },
            },
        ]);

        // Always get today's stats for comparison
        const todayStats = await Bill.aggregate([
            {
                $match: {
                    createdAt: { $gte: today },
                },
            },
            {
                $group: {
                    _id: null,
                    todaySales: { $sum: '$totalAmount' },
                    todayBillCount: { $sum: 1 },
                },
            },
        ]);

        // Always get monthly stats for comparison
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthlyStats = await Bill.aggregate([
            {
                $match: {
                    createdAt: { $gte: startOfMonth },
                },
            },
            {
                $group: {
                    _id: null,
                    monthlySales: { $sum: '$totalAmount' },
                    monthlyBillCount: { $sum: 1 },
                },
            },
        ]);

        const response = {
            todaySales: todayStats[0]?.todaySales || 0,
            todayBillCount: todayStats[0]?.todayBillCount || 0,
            monthlySales: monthlyStats[0]?.monthlySales || 0,
            monthlyBillCount: monthlyStats[0]?.monthlyBillCount || 0,
            periodSales: periodStats[0]?.totalSales || 0,
            periodBillCount: periodStats[0]?.totalBillCount || 0,
            period,
        };

        console.log(`[Dashboard] Stats fetched for period ${period}. Today Sales: ₹${response.todaySales}`);
        res.json(response);
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
};

export const getBillerRevenue = async (req: Request, res: Response): Promise<void> => {
    try {
        const period = (req.query.period as string) || 'monthly';
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let startDate: Date;
        let endDate: Date = new Date();

        switch (period) {
            case 'today':
                startDate = today;
                break;
            case 'yearly':
                startDate = new Date(today.getFullYear(), 0, 1);
                endDate = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
                break;
            case 'monthly':
            default:
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                break;
        }

        const billerRevenue = await Bill.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate, $lte: endDate },
                },
            },
            {
                $group: {
                    _id: '$billerId',
                    billerName: { $first: '$billerName' },
                    totalRevenue: { $sum: '$totalAmount' },
                    billCount: { $sum: 1 },
                },
            },
            {
                $lookup: {
                    from: 'users',
                    let: { billerId: { $toObjectId: '$_id' } },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$_id', '$$billerId'] } } },
                        { $project: { status: 1 } }
                    ],
                    as: 'userInfo'
                }
            },
            {
                $match: {
                    'userInfo.status': 'active'
                }
            },
            {
                $project: {
                    _id: 0,
                    billerId: '$_id',
                    billerName: 1,
                    totalRevenue: 1,
                    billCount: 1,
                },
            },
            {
                $sort: { totalRevenue: -1 },
            },
        ]);

        res.json(billerRevenue);
    } catch (error) {
        console.error('Biller revenue error:', error);
        res.status(500).json({ error: 'Failed to fetch biller revenue' });
    }
};

export const getDailyRevenue = async (req: Request, res: Response): Promise<void> => {
    try {
        const days = parseInt(req.query.days as string) || 7;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days + 1);
        startDate.setHours(0, 0, 0, 0);

        const dailyRevenue = await Bill.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate },
                },
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
                    },
                    revenue: { $sum: '$totalAmount' },
                },
            },
            {
                $sort: { _id: 1 },
            },
        ]);

        // Fill in missing days with zero revenue
        const result = [];
        for (let i = 0; i < days; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];

            const dayData = dailyRevenue.find((d) => d._id === dateStr);

            result.push({
                date: date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }),
                revenue: dayData?.revenue || 0,
            });
        }

        res.json(result);
    } catch (error) {
        console.error('Daily revenue error:', error);
        res.status(500).json({ error: 'Failed to fetch daily revenue' });
    }
};

export const getQuarterlyReport = async (_req: Request, res: Response): Promise<void> => {
    try {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentQuarter = Math.floor(currentMonth / 3);
        const startOfQuarter = new Date(today.getFullYear(), currentQuarter * 3, 1);

        const quarterlyStats = await Bill.aggregate([
            {
                $match: {
                    createdAt: { $gte: startOfQuarter },
                },
            },
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: '$totalAmount' },
                    totalBills: { $sum: 1 },
                },
            },
        ]);

        res.json({
            quarter: currentQuarter + 1,
            year: today.getFullYear(),
            totalSales: quarterlyStats[0]?.totalSales || 0,
            totalBills: quarterlyStats[0]?.totalBills || 0,
        });
    } catch (error) {
        console.error('Quarterly report error:', error);
        res.status(500).json({ error: 'Failed to fetch quarterly report' });
    }
};

export const getYearlyReport = async (req: Request, res: Response): Promise<void> => {
    try {
        const year = parseInt(req.query.year as string) || new Date().getFullYear();
        const startOfYear = new Date(year, 0, 1);
        const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);

        const yearlyStats = await Bill.aggregate([
            {
                $match: {
                    createdAt: { $gte: startOfYear, $lte: endOfYear },
                },
            },
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: '$totalAmount' },
                    totalBills: { $sum: 1 },
                },
            },
        ]);

        res.json({
            year,
            totalSales: yearlyStats[0]?.totalSales || 0,
            totalBills: yearlyStats[0]?.totalBills || 0,
        });
    } catch (error) {
        console.error('Yearly report error:', error);
        res.status(500).json({ error: 'Failed to fetch yearly report' });
    }
};
export const getDashboardOverview = async (req: Request, res: Response): Promise<void> => {
    try {
        const statsPeriod = (req.query.statsPeriod as string) || 'monthly';
        const billerPeriod = (req.query.billerPeriod as string) || 'monthly';
        const chartDays = parseInt(req.query.chartDays as string) || 7;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 1. Get Stats (Internal Logic Reuse)
        let statsStartDate: Date;
        switch (statsPeriod) {
            case 'today': statsStartDate = today; break;
            case 'yearly': statsStartDate = new Date(today.getFullYear(), 0, 1); break;
            case 'monthly':
            default: statsStartDate = new Date(today.getFullYear(), today.getMonth(), 1); break;
        }

        const [periodStats, todayStats, monthlyStats] = await Promise.all([
            Bill.aggregate([
                { $match: { createdAt: { $gte: statsStartDate } } },
                { $group: { _id: null, totalSales: { $sum: '$totalAmount' }, totalBillCount: { $sum: 1 } } }
            ]),
            Bill.aggregate([
                { $match: { createdAt: { $gte: today } } },
                { $group: { _id: null, todaySales: { $sum: '$totalAmount' }, todayBillCount: { $sum: 1 } } }
            ]),
            Bill.aggregate([
                { $match: { createdAt: { $gte: new Date(today.getFullYear(), today.getMonth(), 1) } } },
                { $group: { _id: null, monthlySales: { $sum: '$totalAmount' }, monthlyBillCount: { $sum: 1 } } }
            ])
        ]);

        const stats = {
            todaySales: todayStats[0]?.todaySales || 0,
            todayBillCount: todayStats[0]?.todayBillCount || 0,
            monthlySales: monthlyStats[0]?.monthlySales || 0,
            monthlyBillCount: monthlyStats[0]?.monthlyBillCount || 0,
            periodSales: periodStats[0]?.totalSales || 0,
            periodBillCount: periodStats[0]?.totalBillCount || 0,
            period: statsPeriod,
        };

        // 2. Get Biller Revenue
        let billerStartDate: Date;
        switch (billerPeriod) {
            case 'today': billerStartDate = today; break;
            case 'yearly': billerStartDate = new Date(today.getFullYear(), 0, 1); break;
            case 'monthly':
            default: billerStartDate = new Date(today.getFullYear(), today.getMonth(), 1); break;
        }

        const billerRevenue = await Bill.aggregate([
            { $match: { createdAt: { $gte: billerStartDate } } },
            { $group: { _id: '$billerId', billerName: { $first: '$billerName' }, totalRevenue: { $sum: '$totalAmount' }, billCount: { $sum: 1 } } },
            { $lookup: { from: 'users', let: { billerId: { $toObjectId: '$_id' } }, pipeline: [{ $match: { $expr: { $eq: ['$_id', '$$billerId'] } } }, { $project: { status: 1 } }], as: 'userInfo' } },
            { $match: { 'userInfo.status': 'active' } },
            { $project: { _id: 0, billerId: '$_id', billerName: 1, totalRevenue: 1, billCount: 1 } },
            { $sort: { totalRevenue: -1 } }
        ]);

        // 3. Get Daily Revenue
        const chartStartDate = new Date();
        chartStartDate.setDate(chartStartDate.getDate() - chartDays + 1);
        chartStartDate.setHours(0, 0, 0, 0);

        const dailyRaw = await Bill.aggregate([
            { $match: { createdAt: { $gte: chartStartDate } } },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$totalAmount' } } },
            { $sort: { _id: 1 } }
        ]);

        const dailyRevenue = [];
        for (let i = 0; i < chartDays; i++) {
            const date = new Date(chartStartDate);
            date.setDate(date.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            const dayData = dailyRaw.find(d => d._id === dateStr);
            dailyRevenue.push({
                date: date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }),
                revenue: dayData?.revenue || 0,
            });
        }

        res.json({ stats, billerRevenue, dailyRevenue });
    } catch (error) {
        console.error('Dashboard overview error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard overview' });
    }
};
