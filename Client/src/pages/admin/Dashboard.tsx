import { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { getDashboardStatsApi, getBillerRevenueApi, getDailyRevenueApi, getBillsApi, downloadSalesReportApi, getUsersApi } from '@/services/api';
import { DashboardStats, BillerRevenue, DailyRevenue, Bill, User } from '@/types';
import { StatCardSkeleton, ChartSkeleton } from '@/components/ui/SkeletonCards';
import {
  IndianRupee,
  FileText,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  BarChart3,
  Loader2,
  Download,
  Sparkles,
  Package,
  Zap,
  Clock,
  CreditCard,
  Banknote,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Area, AreaChart } from 'recharts';
import { useSocket } from '@/hooks/useSocket';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

type TimePeriod = 'today' | 'monthly' | 'yearly' | 'custom';

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [previousStats, setPreviousStats] = useState<DashboardStats | null>(null);
  const [billerRevenue, setBillerRevenue] = useState<BillerRevenue[]>([]);
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [statsPeriod, setStatsPeriod] = useState<TimePeriod>('monthly');
  const [chartDays, setChartDays] = useState(7);
  const [billerPeriod, setBillerPeriod] = useState<TimePeriod>('monthly');
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');

  const [selectedBiller, setSelectedBiller] = useState<BillerRevenue | null>(null);
  const [billerBills, setBillerBills] = useState<Bill[]>([]);
  const [billerBillsPage, setBillerBillsPage] = useState(1);
  const [isLoadingBillerBills, setIsLoadingBillerBills] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);
  const [recentBills, setRecentBills] = useState<Bill[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const { toast } = useToast();

  useSocket({
    'BILL_CREATED': (newBill: Bill) => {
      setRecentBills(prev => [newBill, ...prev].slice(0, 6));
      setStats(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          todaySales: prev.todaySales + newBill.totalAmount,
          todayBillCount: prev.todayBillCount + 1,
          monthlySales: prev.monthlySales + newBill.totalAmount,
          monthlyBillCount: prev.monthlyBillCount + 1,
          periodSales: prev.periodSales !== undefined ? prev.periodSales + newBill.totalAmount : undefined,
          periodBillCount: prev.periodBillCount !== undefined ? prev.periodBillCount + 1 : undefined,
        };
      });
      toast({
        title: "New Sale!",
        description: `Bill #${newBill.billNumber} — ₹${newBill.totalAmount} by ${newBill.billerName}`,
      });
    },
    'USER_STATUS_CHANGE': (updatedUser: User) => {
      setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    }
  });

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [bills, usersData] = await Promise.all([
          getBillsApi({ limit: 6 }),
          getUsersApi()
        ]);
        setRecentBills(bills);
        setUsers(usersData);
      } catch (error) {
        console.error("Failed to load initial dashboard data:", error);
      }
    };
    loadInitialData();
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadStats = async () => {
      try {
        const data = await getDashboardStatsApi(statsPeriod);
        if (isMounted) {
          setStats(prev => { if (prev) setPreviousStats(prev); return data; });
          setLastRefreshed(new Date());
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      }
    };
    loadStats();
    return () => { isMounted = false; };
  }, [statsPeriod]);

  useEffect(() => {
    let isMounted = true;
    const loadDailyRevenue = async () => {
      try {
        const data = await getDailyRevenueApi(chartDays);
        if (isMounted) setDailyRevenue(data);
      } catch (error) {
        console.error("Failed to fetch daily revenue:", error);
      }
    };
    loadDailyRevenue();
    return () => { isMounted = false; };
  }, [chartDays]);

  useEffect(() => {
    let isMounted = true;
    const loadBillerRevenue = async () => {
      try {
        const data = await getBillerRevenueApi(billerPeriod);
        if (isMounted) setBillerRevenue(data);
      } catch (error) {
        console.error("Failed to fetch biller revenue:", error);
      }
    };
    loadBillerRevenue();
    return () => { isMounted = false; };
  }, [billerPeriod]);

  const refreshAll = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [statsData, dailyData, billerData] = await Promise.all([
        getDashboardStatsApi(statsPeriod),
        getDailyRevenueApi(chartDays),
        getBillerRevenueApi(billerPeriod)
      ]);
      setStats(prev => { if (prev) setPreviousStats(prev); return statsData; });
      setDailyRevenue(dailyData);
      setBillerRevenue(billerData);
      setLastRefreshed(new Date());
    } catch (error) {
      console.error("Failed to refresh dashboard:", error);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, [statsPeriod, chartDays, billerPeriod]);

  const calculateTrend = (current: number, previous: number): { value: number; isPositive: boolean } => {
    if (previous === 0) return { value: 0, isPositive: true };
    const change = ((current - previous) / previous) * 100;
    return { value: Math.abs(change), isPositive: change >= 0 };
  };

  const getPreviousValue = (currentValue: number, _period: TimePeriod): number => {
    return currentValue * 0.85;
  };

  const handleBillerClick = async (biller: BillerRevenue) => {
    setSelectedBiller(biller);
    setIsLoadingBillerBills(true);
    setBillerBillsPage(1);
    try {
      const bills = await getBillsApi({ billerId: biller.billerId });
      setBillerBills(bills);
    } finally {
      setIsLoadingBillerBills(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!reportStartDate || !reportEndDate) {
      alert('Please select both start and end dates');
      return;
    }
    setIsDownloadingReport(true);
    try {
      await downloadSalesReportApi(reportStartDate, reportEndDate);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download sales report');
    } finally {
      setIsDownloadingReport(false);
    }
  };

  const statCards = useMemo(() => stats ? [
    {
      label: statsPeriod === 'today' ? "Today's Sales" : statsPeriod === 'monthly' ? 'Monthly Sales' : 'Yearly Sales',
      value: statsPeriod === 'today' ? stats.todaySales : statsPeriod === 'monthly' ? stats.monthlySales : stats.periodSales || 0,
      sub: `${statsPeriod === 'today' ? stats.todayBillCount : statsPeriod === 'monthly' ? stats.monthlyBillCount : stats.periodBillCount || 0} bills`,
      trend: calculateTrend(
        statsPeriod === 'today' ? stats.todaySales : statsPeriod === 'monthly' ? stats.monthlySales : stats.periodSales || 0,
        getPreviousValue(statsPeriod === 'today' ? stats.todaySales : statsPeriod === 'monthly' ? stats.monthlySales : stats.periodSales || 0, statsPeriod)
      ),
      icon: IndianRupee,
      accent: 'text-orange-600 dark:text-orange-400',
      iconBg: 'bg-orange-100 dark:bg-orange-500/10',
    },
    {
      label: "Today's Revenue",
      value: stats.todaySales,
      sub: `${stats.todayBillCount} bills today`,
      trend: calculateTrend(stats.todaySales, getPreviousValue(stats.todaySales, 'today')),
      icon: TrendingUp,
      accent: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-100 dark:bg-blue-500/10',
    },
    {
      label: 'Monthly Revenue',
      value: stats.monthlySales,
      sub: `${stats.monthlyBillCount} bills this month`,
      trend: calculateTrend(stats.monthlySales, getPreviousValue(stats.monthlySales, 'monthly')),
      icon: FileText,
      accent: 'text-purple-600 dark:text-purple-400',
      iconBg: 'bg-purple-100 dark:bg-purple-500/10',
    },
    {
      label: 'Active Billers',
      value: billerRevenue.length,
      sub: 'With sales this period',
      trend: { value: 0, isPositive: true },
      icon: Users,
      accent: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-100 dark:bg-emerald-500/10',
      isCurrency: false,
    },
  ] : [], [stats, statsPeriod, billerRevenue.length]);

  const billsPerPage = 10;
  const totalPages = Math.ceil(billerBills.length / billsPerPage);
  const paginatedBills = billerBills.slice(
    (billerBillsPage - 1) * billsPerPage,
    billerBillsPage * billsPerPage
  );

  return (
    <div className="min-h-full bg-gradient-to-br from-orange-50/30 via-amber-50/20 to-yellow-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
      <div className="max-w-[1440px] mx-auto px-5 py-5 space-y-5">

        {/* ── Page Header ──────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">Dashboard</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Last updated: {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Live pill */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
              </span>
              <span className="text-[11px] font-semibold text-orange-600 dark:text-orange-400">Live</span>
            </div>

            {/* Date range + export */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <Input type="date" value={reportStartDate} onChange={e => setReportStartDate(e.target.value)}
                className="w-32 h-7 rounded-md border-0 text-xs p-1 bg-transparent focus:ring-0 shadow-none" />
              <span className="text-slate-300 dark:text-slate-600 text-xs">–</span>
              <Input type="date" value={reportEndDate} onChange={e => setReportEndDate(e.target.value)}
                className="w-32 h-7 rounded-md border-0 text-xs p-1 bg-transparent focus:ring-0 shadow-none" />
              <Button size="sm" onClick={handleDownloadReport} disabled={isDownloadingReport}
                className="h-7 px-2.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1">
                <Download className={`h-3 w-3 ${isDownloadingReport ? 'animate-bounce' : ''}`} />
                Export
              </Button>
            </div>

            {/* Period selector */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <Calendar className="h-3.5 w-3.5 text-orange-500 shrink-0" />
              <Select value={statsPeriod} onValueChange={v => setStatsPeriod(v as TimePeriod)}>
                <SelectTrigger className="w-24 border-0 h-auto p-0 text-xs font-semibold focus:ring-0 text-slate-700 dark:text-slate-200 bg-transparent shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Refresh */}
            <Button variant="outline" size="sm" onClick={() => refreshAll()} disabled={isRefreshing}
              className="h-8 w-8 p-0 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* ── Stat Cards ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {!stats || isLoading
            ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
            : statCards.map((card, idx) => {
              const Icon = card.icon;
              const isCurrency = card.isCurrency !== false;
              return (
                <motion.div key={card.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.06 }}>
                  <Card className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide leading-none">{card.label}</p>
                        <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center shrink-0', card.iconBg)}>
                          <Icon className={cn('h-3.5 w-3.5', card.accent)} />
                        </div>
                      </div>
                      <p className={cn('text-2xl font-bold tracking-tight', card.accent)}>
                        {isCurrency ? `₹${card.value.toLocaleString('en-IN')}` : card.value}
                      </p>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">{card.sub}</span>
                        {card.trend.value > 0 && (
                          <span className={cn(
                            'inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md',
                            card.trend.isPositive
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                              : 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
                          )}>
                            {card.trend.isPositive ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
                            {card.trend.value.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          }
        </div>

        {/* ── On-Duty Team ──────────────────────────────────────── */}
        {users.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0">On Duty</span>
            {users.map(user => (
              <div key={user.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                <span className={cn(
                  'h-1.5 w-1.5 rounded-full shrink-0',
                  user.isOnline ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]' : 'bg-slate-300 dark:bg-slate-600'
                )} />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{user.name}</span>
                <Badge variant="outline" className="text-[9px] h-4 px-1.5 rounded-full border-slate-200 dark:border-slate-600 font-semibold text-slate-500 dark:text-slate-400 uppercase">
                  {user.role}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* ── Main Content Grid ─────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

          {/* ── Left: Charts ────────────────────────────────────── */}
          <div className="xl:col-span-2 space-y-5">

            {/* Revenue Chart */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <Card className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 rounded-2xl shadow-sm">
                <CardHeader className="px-5 pt-5 pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-sm font-semibold text-slate-800 dark:text-white">Revenue Analytics</CardTitle>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Daily performance trend</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Chart type toggle */}
                      <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
                        <button
                          onClick={() => setChartType('bar')}
                          className={cn(
                            'px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all',
                            chartType === 'bar'
                              ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-sm'
                              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                          )}>
                          Bar
                        </button>
                        <button
                          onClick={() => setChartType('line')}
                          className={cn(
                            'px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all',
                            chartType === 'line'
                              ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-sm'
                              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                          )}>
                          Line
                        </button>
                      </div>
                      <Select value={String(chartDays)} onValueChange={v => setChartDays(Number(v))}>
                        <SelectTrigger className="w-20 h-8 rounded-lg text-xs font-semibold border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="7">7 days</SelectItem>
                          <SelectItem value="14">14 days</SelectItem>
                          <SelectItem value="30">30 days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="px-3 pt-4 pb-4">
                  {isLoading || dailyRevenue.length === 0 ? (
                    isLoading ? <ChartSkeleton /> : (
                      <div className="h-64 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
                        <BarChart3 className="h-10 w-10 mb-2 opacity-30" />
                        <p className="text-sm font-medium">No data yet</p>
                      </div>
                    )
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        {chartType === 'bar' ? (
                          <BarChart data={dailyRevenue} margin={{ top: 4, right: 4, left: -24, bottom: 0 }} barSize={28}>
                            <defs>
                              <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#f97316" stopOpacity={0.95} />
                                <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.6} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(100,116,139,0.1)" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                            <Tooltip
                              cursor={{ fill: 'rgba(249,115,22,0.04)', radius: 8 }}
                              formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']}
                              contentStyle={{ background: 'white', border: '1px solid #fed7aa', borderRadius: 12, fontSize: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', padding: '8px 12px' }}
                            />
                            <Bar dataKey="revenue" fill="url(#barGrad)" radius={[6, 6, 2, 2]} />
                          </BarChart>
                        ) : (
                          <AreaChart data={dailyRevenue} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                            <defs>
                              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#f97316" stopOpacity={0.15} />
                                <stop offset="100%" stopColor="#f97316" stopOpacity={0.01} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(100,116,139,0.1)" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                            <Tooltip
                              formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']}
                              contentStyle={{ background: 'white', border: '1px solid #fed7aa', borderRadius: 12, fontSize: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', padding: '8px 12px' }}
                            />
                            <Area type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2.5}
                              dot={{ fill: '#f97316', r: 3, strokeWidth: 0 }}
                              activeDot={{ r: 5, strokeWidth: 0, fill: '#f97316' }}
                              fill="url(#areaGrad)" />
                          </AreaChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Staff Efficiency */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
              <Card className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 rounded-2xl shadow-sm">
                <CardHeader className="px-5 pt-5 pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold text-slate-800 dark:text-white">Staff Efficiency</CardTitle>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Biller contributions</p>
                    </div>
                    <Select value={billerPeriod} onValueChange={v => setBillerPeriod(v as TimePeriod)}>
                      <SelectTrigger className="w-24 h-8 rounded-lg text-xs font-semibold border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>

                <CardContent className="px-5 pb-5">
                  {billerRevenue.length === 0 ? (
                    <div className="py-10 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
                      <Users className="h-8 w-8 mb-2 opacity-30" />
                      <p className="text-xs font-medium">No data for this period</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {billerRevenue.map((biller, index) => {
                        const maxRevenue = Math.max(...billerRevenue.map(b => b.totalRevenue));
                        const pct = (biller.totalRevenue / maxRevenue) * 100;
                        const totalAll = billerRevenue.reduce((s, b) => s + b.totalRevenue, 0);
                        return (
                          <button
                            key={biller.billerId}
                            onClick={() => handleBillerClick(biller)}
                            className="w-full text-left group">
                            <div className="flex items-center gap-3 mb-1.5">
                              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 w-4 shrink-0">#{index + 1}</span>
                              <span className="flex-1 text-xs font-semibold text-slate-700 dark:text-slate-200 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors truncate">
                                {biller.billerName}
                              </span>
                              <span className="text-xs font-bold text-slate-800 dark:text-white shrink-0">
                                ₹{biller.totalRevenue.toLocaleString('en-IN')}
                              </span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 w-8 text-right shrink-0">
                                {((biller.totalRevenue / (totalAll || 1)) * 100).toFixed(0)}%
                              </span>
                            </div>
                            <div className="ml-7 h-1.5 bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut', delay: index * 0.05 }}
                                className="h-full bg-gradient-to-r from-orange-400 to-amber-500 rounded-full"
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* ── Right: Live Sales Feed ───────────────────────────── */}
          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <Card className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 rounded-2xl shadow-sm h-full flex flex-col">
              <CardHeader className="px-5 pt-5 pb-3 shrink-0 border-b border-slate-100 dark:border-slate-700/50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                      Live Sales
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                      </span>
                    </CardTitle>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Latest {recentBills.length} transactions</p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
                {recentBills.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-600">
                    <Zap className="h-10 w-10 mb-3 opacity-20" />
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Waiting for transactions…</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">New bills will appear here in real‑time</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <AnimatePresence mode="popLayout">
                      {recentBills.slice(0, 6).map((bill, i) => (
                        <motion.div
                          key={bill.id || i}
                          layout
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                          className="flex items-center gap-3 px-5 py-3 border-b border-slate-50 dark:border-slate-700/30 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-700/20 transition-colors">
                          {/* Icon */}
                          <div className="h-8 w-8 rounded-xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center shrink-0">
                            <Package className="h-4 w-4 text-orange-500" />
                          </div>
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-800 dark:text-white truncate">#{bill.billNumber}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate">{bill.billerName}</span>
                              <span className="text-slate-200 dark:text-slate-600">·</span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
                                {new Date(bill.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                          {/* Amount + mode */}
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-slate-900 dark:text-white">₹{bill.totalAmount}</p>
                            <span className={cn(
                              'text-[9px] font-bold uppercase tracking-wide',
                              bill.paymentMode === 'cash'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-blue-600 dark:text-blue-400'
                            )}>
                              {bill.paymentMode}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}

                {/* Footer link */}
                <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700/50 shrink-0">
                  <button
                    onClick={() => window.location.href = '/admin/billing-history'}
                    className="w-full text-center text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 transition-colors py-0.5">
                    View full history →
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* ── Biller Detail Dialog ──────────────────────────────── */}
      <Dialog open={!!selectedBiller} onOpenChange={() => setSelectedBiller(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800 dark:text-white">
              {selectedBiller?.billerName}'s Bills
            </DialogTitle>
            {selectedBiller && (
              <div className="flex items-center gap-2 mt-2">
                <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 border-0 font-semibold text-xs px-2.5">
                  ₹{selectedBiller.totalRevenue.toLocaleString('en-IN')} total
                </Badge>
                <Badge variant="outline" className="border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs px-2.5">
                  {selectedBiller.billCount} bills
                </Badge>
              </div>
            )}
          </DialogHeader>

          {isLoadingBillerBills ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-orange-500" />
              <p className="text-sm text-slate-500 dark:text-slate-400">Loading bills…</p>
            </div>
          ) : (
            <>
              {paginatedBills.length === 0 ? (
                <div className="py-12 text-center">
                  <FileText className="h-10 w-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">No bills found</p>
                </div>
              ) : (
                <div className="space-y-2 mt-2">
                  {paginatedBills.map(bill => (
                    <div key={bill.id || (bill as any)._id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 hover:border-orange-200 dark:hover:border-orange-800/50 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                            {bill.billNumber}
                          </span>
                          <Badge className={cn(
                            'text-[10px] font-bold h-5 px-2 border-0 uppercase',
                            bill.paymentMode === 'cash'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                          )}>
                            {bill.paymentMode}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-base text-slate-900 dark:text-white">
                            ₹{bill.totalAmount.toLocaleString('en-IN')}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{bill.items.length} item{bill.items.length !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-2">
                        {new Date(bill.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <div className="border-t border-slate-200 dark:border-slate-700 pt-2 space-y-1">
                        {bill.items.slice(0, 3).map((item, idx) => (
                          <div key={idx} className="flex justify-between text-xs">
                            <span className="text-slate-500 dark:text-slate-400">{item.itemName} × {item.quantity}</span>
                            <span className="font-medium text-slate-700 dark:text-slate-300">₹{item.total.toLocaleString('en-IN')}</span>
                          </div>
                        ))}
                        {bill.items.length > 3 && (
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-0.5">+{bill.items.length - 3} more item{bill.items.length - 3 !== 1 ? 's' : ''}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <Button variant="outline" size="sm" onClick={() => setBillerBillsPage(p => Math.max(1, p - 1))} disabled={billerBillsPage === 1} className="rounded-lg h-8 text-xs">
                    Previous
                  </Button>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium px-2">
                    {billerBillsPage} / {totalPages}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => setBillerBillsPage(p => Math.min(totalPages, p + 1))} disabled={billerBillsPage === totalPages} className="rounded-lg h-8 text-xs">
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
