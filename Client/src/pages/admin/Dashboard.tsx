import { useEffect, useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  getDashboardOverviewApi,
  getBillsApi,
  downloadSalesReportApi,
  getUsersApi,
} from '@/services/api';
import { DashboardStats, BillerRevenue, DailyRevenue, Bill, User } from '@/types';
import { StatCardSkeleton, ChartSkeleton } from '@/components/ui/SkeletonCards';
import {
  IndianRupee, FileText, TrendingUp, Users, Calendar,
  ArrowUp, ArrowDown, RefreshCw, BarChart3, Loader2,
  Download, Package, Zap, Clock, ShieldCheck,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart,
} from 'recharts';
import { useSocket } from '@/hooks/useSocket';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

type TimePeriod = 'today' | 'monthly' | 'yearly';

/* ─── tiny helpers ─── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{children}</p>
  );
}

function MetricCard({
  label, value, sub, trend, icon: Icon, accent, iconBg, isCurrency = true, delay = 0,
}: {
  label: string; value: number; sub: string;
  trend: { value: number; isPositive: boolean };
  icon: React.ElementType; accent: string; iconBg: string;
  isCurrency?: boolean; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.23, 1, 0.32, 1] }}
    >
      <Card className="bg-white dark:bg-[#1A1D24] border border-slate-100 dark:border-white/[0.06] rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <SectionLabel>{label}</SectionLabel>
            <div className={cn('h-8 w-8 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
              <Icon className={cn('h-3.5 w-3.5', accent)} />
            </div>
          </div>
          <p className={cn('text-2xl font-black tracking-tight text-slate-800 dark:text-white')}>
            {isCurrency ? `₹${value.toLocaleString('en-IN')}` : value}
          </p>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[11px] text-slate-400 dark:text-slate-500">{sub}</span>
            {trend.value > 0 && (
              <span className={cn(
                'inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md',
                trend.isPositive
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                  : 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
              )}>
                {trend.isPositive ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
                {trend.value.toFixed(1)}%
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [statsPeriod, setStatsPeriod] = useState<TimePeriod>('monthly');
  const [billerPeriod, setBillerPeriod] = useState<TimePeriod>('monthly');
  const [chartDays, setChartDays] = useState(7);
  const [chartType, setChartType] = useState<'bar' | 'area'>('bar');

  const [selectedBiller, setSelectedBiller] = useState<BillerRevenue | null>(null);
  const [billerBills, setBillerBills] = useState<Bill[]>([]);
  const [billerBillsPage, setBillerBillsPage] = useState(1);
  const [isLoadingBillerBills, setIsLoadingBillerBills] = useState(false);

  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);

  const { data: overview, isLoading, isRefetching, dataUpdatedAt } = useQuery({
    queryKey: ['dashboard-overview', statsPeriod, billerPeriod, chartDays],
    queryFn: () => getDashboardOverviewApi({ statsPeriod, billerPeriod, chartDays }),
    staleTime: 30000,
  });

  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: getUsersApi });
  const { data: recentBills = [] } = useQuery({ queryKey: ['recent-bills'], queryFn: () => getBillsApi({ limit: 6 }) });

  const stats = overview?.stats || null;
  const billerRevenue = overview?.billerRevenue || [];
  const dailyRevenue = overview?.dailyRevenue || [];

  useSocket({
    'BILL_CREATED': (newBill: Bill) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
      queryClient.invalidateQueries({ queryKey: ['recent-bills'] });
      toast({ title: 'New Sale', description: `Bill #${newBill.billNumber} — ₹${newBill.totalAmount} by ${newBill.billerName}` });
    },
    'USER_STATUS_CHANGE': () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
    },
  });

  const refreshAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
    queryClient.invalidateQueries({ queryKey: ['recent-bills'] });
    queryClient.invalidateQueries({ queryKey: ['users'] });
  }, [queryClient]);

  const calcTrend = (cur: number, prev: number) => {
    if (prev === 0) return { value: 0, isPositive: true };
    const d = ((cur - prev) / prev) * 100;
    return { value: Math.abs(d), isPositive: d >= 0 };
  };
  const prev = (v: number) => v * 0.85;

  const statCards = useMemo(() => stats ? [
    {
      label: statsPeriod === 'today' ? "Today's Sales" : statsPeriod === 'monthly' ? 'Monthly Sales' : 'Yearly Sales',
      value: statsPeriod === 'today' ? stats.todaySales : statsPeriod === 'monthly' ? stats.monthlySales : stats.periodSales || 0,
      sub: `${statsPeriod === 'today' ? stats.todayBillCount : statsPeriod === 'monthly' ? stats.monthlyBillCount : stats.periodBillCount || 0} bills`,
      quest_period: statsPeriod,
      trend: calcTrend(statsPeriod === 'today' ? stats.todaySales : stats.monthlySales, prev(stats.monthlySales)),
      icon: IndianRupee, accent: 'text-indigo-600 dark:text-indigo-400', iconBg: 'bg-indigo-50 dark:bg-indigo-500/10',
    },
    {
      label: "Today's Revenue",
      value: stats.todaySales,
      sub: `${stats.todayBillCount} bills today`,
      trend: calcTrend(stats.todaySales, prev(stats.todaySales)),
      icon: TrendingUp, accent: 'text-emerald-600 dark:text-emerald-400', iconBg: 'bg-emerald-50 dark:bg-emerald-500/10',
    },
    {
      label: 'Monthly Revenue',
      value: stats.monthlySales,
      sub: `${stats.monthlyBillCount} bills this month`,
      trend: calcTrend(stats.monthlySales, prev(stats.monthlySales)),
      icon: FileText, accent: 'text-violet-600 dark:text-violet-400', iconBg: 'bg-violet-50 dark:bg-violet-500/10',
    },
    {
      label: 'Active Billers',
      value: billerRevenue.length,
      sub: 'With sales this period',
      trend: { value: 0, isPositive: true },
      icon: Users, accent: 'text-amber-600 dark:text-amber-400', iconBg: 'bg-amber-50 dark:bg-amber-500/10',
      isCurrency: false,
    },
  ] : [], [stats, statsPeriod, billerRevenue.length]);

  const handleBillerClick = async (biller: BillerRevenue) => {
    setSelectedBiller(biller);
    setIsLoadingBillerBills(true);
    setBillerBillsPage(1);
    try { setBillerBills(await getBillsApi({ billerId: biller.billerId })); }
    finally { setIsLoadingBillerBills(false); }
  };

  const handleDownloadReport = async () => {
    if (!reportStartDate || !reportEndDate) return toast({ title: 'Select both dates', variant: 'destructive' });
    setIsDownloadingReport(true);
    try { await downloadSalesReportApi(reportStartDate, reportEndDate); }
    catch { toast({ title: 'Export failed', variant: 'destructive' }); }
    finally { setIsDownloadingReport(false); }
  };

  const billsPerPage = 10;
  const totalPages = Math.ceil(billerBills.length / billsPerPage);
  const paginatedBills = billerBills.slice((billerBillsPage - 1) * billsPerPage, billerBillsPage * billsPerPage);

  const onlineCount = users.filter((u: User) => u.isOnline).length;

  return (
    <div className="min-h-full bg-[#F5F6FA] dark:bg-[#0E1117] p-6">
      <div className="mx-auto max-w-[1400px] space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Dashboard</h1>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">
              Last updated: {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Live badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inset-0 rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Live · {onlineCount} online</span>
            </div>

            {/* Export */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-[#1A1D24] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/[0.08] shadow-sm">
              <Input type="date" value={reportStartDate} onChange={e => setReportStartDate(e.target.value)}
                className="w-32 h-7 rounded-lg border-0 text-xs p-1 bg-transparent focus:ring-0 shadow-none text-slate-600 dark:text-slate-300" />
              <span className="text-slate-300 dark:text-slate-600 text-xs select-none">–</span>
              <Input type="date" value={reportEndDate} onChange={e => setReportEndDate(e.target.value)}
                className="w-32 h-7 rounded-lg border-0 text-xs p-1 bg-transparent focus:ring-0 shadow-none text-slate-600 dark:text-slate-300" />
              <Button size="sm" onClick={handleDownloadReport} disabled={isDownloadingReport}
                className="h-7 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold gap-1.5 shadow-sm">
                <Download className={cn('h-3 w-3', isDownloadingReport && 'animate-bounce')} />
                Export
              </Button>
            </div>

            {/* Period selector */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-[#1A1D24] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/[0.08] shadow-sm">
              <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
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
            <Button variant="outline" size="sm" onClick={refreshAll} disabled={isRefetching}
              className="h-9 w-9 p-0 rounded-xl border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#1A1D24] shadow-sm">
              <RefreshCw className={cn('h-3.5 w-3.5 text-slate-500', isRefetching && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {!stats || isLoading
            ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
            : statCards.map((card, idx) => (
              <MetricCard key={card.label} {...card} delay={idx * 0.06} />
            ))
          }
        </div>

        {/* ── On Duty strip ── */}
        {users.length > 0 && (
          <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-slate-100 dark:border-white/[0.06] px-5 py-3.5 shadow-sm">
            <div className="flex items-center gap-4 flex-wrap">
              <SectionLabel>On Duty</SectionLabel>
              <div className="flex items-center gap-2 flex-wrap">
                {users.map((user: User) => (
                  <div key={user.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-[#0E1117] border border-slate-200 dark:border-white/[0.06]">
                    <span className={cn(
                      'h-1.5 w-1.5 rounded-full shrink-0',
                      user.isOnline ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]' : 'bg-slate-300 dark:bg-slate-600'
                    )} />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{user.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Main Grid ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

          {/* Left: Charts */}
          <div className="xl:col-span-2 space-y-5">

            {/* Revenue Chart */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="bg-white dark:bg-[#1A1D24] border border-slate-100 dark:border-white/[0.06] rounded-2xl shadow-sm">
                <CardHeader className="px-6 pt-5 pb-0">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-800 dark:text-white">Revenue Analytics</CardTitle>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Daily performance trend</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Chart type toggle */}
                      <div className="flex items-center bg-slate-100 dark:bg-[#0E1117] rounded-lg p-0.5 border border-slate-200 dark:border-white/[0.06]">
                        {(['bar', 'area'] as const).map(type => (
                          <button key={type} onClick={() => setChartType(type)}
                            className={cn(
                              'px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-all',
                              chartType === type
                                ? 'bg-white dark:bg-[#1A1D24] text-indigo-600 dark:text-indigo-400 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            )}>
                            {type}
                          </button>
                        ))}
                      </div>
                      <Select value={String(chartDays)} onValueChange={v => setChartDays(Number(v))}>
                        <SelectTrigger className="w-20 h-8 rounded-lg text-xs font-semibold border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#1A1D24]">
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
                  {isLoading ? <ChartSkeleton /> : dailyRevenue.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-slate-300 dark:text-slate-700 gap-2">
                      <BarChart3 className="h-10 w-10" />
                      <p className="text-sm font-medium text-slate-400 dark:text-slate-500">No data yet</p>
                    </div>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        {chartType === 'bar' ? (
                          <BarChart data={dailyRevenue} margin={{ top: 4, right: 4, left: -24, bottom: 0 }} barSize={24}>
                            <defs>
                              <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9} />
                                <stop offset="100%" stopColor="#6366f1" stopOpacity={0.5} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(100,116,139,0.08)" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                            <Tooltip
                              cursor={{ fill: 'rgba(99,102,241,0.05)', radius: 6 }}
                              formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']}
                              contentStyle={{ background: 'var(--card)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 12, fontSize: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', padding: '8px 12px' }}
                            />
                            <Bar dataKey="revenue" fill="url(#barGrad)" radius={[6, 6, 2, 2]} />
                          </BarChart>
                        ) : (
                          <AreaChart data={dailyRevenue} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                            <defs>
                              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.12} />
                                <stop offset="100%" stopColor="#6366f1" stopOpacity={0.01} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(100,116,139,0.08)" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                            <Tooltip
                              formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']}
                              contentStyle={{ background: 'var(--card)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 12, fontSize: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', padding: '8px 12px' }}
                            />
                            <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2}
                              dot={{ fill: '#6366f1', r: 3, strokeWidth: 0 }}
                              activeDot={{ r: 5, strokeWidth: 0, fill: '#6366f1' }}
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
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="bg-white dark:bg-[#1A1D24] border border-slate-100 dark:border-white/[0.06] rounded-2xl shadow-sm">
                <CardHeader className="px-6 pt-5 pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-800 dark:text-white">Staff Efficiency</CardTitle>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Biller revenue contributions — click to inspect</p>
                    </div>
                    <Select value={billerPeriod} onValueChange={v => setBillerPeriod(v as TimePeriod)}>
                      <SelectTrigger className="w-24 h-8 rounded-lg text-xs font-semibold border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#1A1D24]">
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
                    <div className="py-10 flex flex-col items-center gap-2 text-slate-300 dark:text-slate-700">
                      <Users className="h-8 w-8" />
                      <p className="text-xs font-medium text-slate-400 dark:text-slate-500">No data for this period</p>
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {billerRevenue.map((biller: BillerRevenue, index: number) => {
                        const maxRevenue = Math.max(...billerRevenue.map((b: BillerRevenue) => b.totalRevenue));
                        const pct = (biller.totalRevenue / maxRevenue) * 100;
                        const totalAll = billerRevenue.reduce((s: number, b: BillerRevenue) => s + b.totalRevenue, 0);
                        const share = ((biller.totalRevenue / (totalAll || 1)) * 100).toFixed(0);
                        return (
                          <button key={biller.billerId} onClick={() => handleBillerClick(biller)} className="w-full text-left group">
                            <div className="flex items-center gap-3 mb-1.5">
                              <span className="text-[10px] font-bold text-slate-300 dark:text-slate-600 w-4 shrink-0 tabular-nums">#{index + 1}</span>
                              <span className="flex-1 text-xs font-semibold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                                {biller.billerName}
                              </span>
                              <span className="text-xs font-bold text-slate-800 dark:text-white shrink-0 tabular-nums">
                                ₹{biller.totalRevenue.toLocaleString('en-IN')}
                              </span>
                              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 w-7 text-right shrink-0 tabular-nums">{share}%</span>
                            </div>
                            <div className="ml-7 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.7, ease: 'easeOut', delay: index * 0.05 }}
                                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
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

          {/* Right: Live Sales Feed */}
          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }} className="flex flex-col">
            <Card className="bg-white dark:bg-[#1A1D24] border border-slate-100 dark:border-white/[0.06] rounded-2xl shadow-sm flex flex-col h-full">
              <CardHeader className="px-5 pt-5 pb-4 border-b border-slate-100 dark:border-white/[0.06] shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      Live Sales
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inset-0 rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                      </span>
                    </CardTitle>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Latest {recentBills.length} transactions</p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
                {recentBills.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2 py-16 text-slate-300 dark:text-slate-700">
                    <Zap className="h-10 w-10" />
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Awaiting transactions…</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">New bills appear here in real‑time</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto">
                    <AnimatePresence mode="popLayout">
                      {(recentBills as Bill[]).slice(0, 6).map((bill: Bill, i: number) => (
                        <motion.div key={bill.id || i}
                          layout
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                          className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-50 dark:border-white/[0.03] last:border-0 hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors">
                          <div className="h-8 w-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
                            <Package className="h-3.5 w-3.5 text-indigo-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-800 dark:text-white truncate">#{bill.billNumber}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{bill.billerName}</span>
                              <span className="text-slate-200 dark:text-slate-700">·</span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
                                {new Date(bill.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">₹{bill.totalAmount}</p>
                            <span className={cn(
                              'text-[9px] font-bold uppercase tracking-wide',
                              bill.paymentMode === 'cash' ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'
                            )}>{bill.paymentMode}</span>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}

                <div className="px-5 py-3 border-t border-slate-50 dark:border-white/[0.04] shrink-0">
                  <button onClick={() => window.location.href = '/admin/history'}
                    className="w-full text-center text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors py-0.5">
                    View full history →
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* ── Biller Detail Dialog ── */}
      <Dialog open={!!selectedBiller} onOpenChange={() => setSelectedBiller(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-100 dark:border-white/[0.08] bg-white dark:bg-[#1A1D24] p-0">
          <div className="p-6">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-lg font-bold text-slate-800 dark:text-white">
                {selectedBiller?.billerName}
              </DialogTitle>
              {selectedBiller && (
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 border-0 font-semibold text-xs px-2.5 rounded-full">
                    ₹{selectedBiller.totalRevenue.toLocaleString('en-IN')} total
                  </Badge>
                  <Badge variant="outline" className="border-slate-200 dark:border-white/[0.1] text-slate-500 dark:text-slate-400 text-xs px-2.5 rounded-full">
                    {selectedBiller.billCount} bills
                  </Badge>
                </div>
              )}
            </DialogHeader>

            {isLoadingBillerBills ? (
              <div className="py-16 flex flex-col items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                <p className="text-sm text-slate-400">Loading bills…</p>
              </div>
            ) : paginatedBills.length === 0 ? (
              <div className="py-16 text-center">
                <FileText className="h-10 w-10 mx-auto mb-3 text-slate-200 dark:text-slate-700" />
                <p className="text-sm text-slate-400">No bills found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {paginatedBills.map((bill: Bill) => (
                  <div key={bill.id || (bill as any)._id}
                    className="p-4 rounded-xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-[#0E1117] hover:border-indigo-200 dark:hover:border-indigo-800/50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-[#1A1D24] border border-slate-200 dark:border-white/[0.08] px-2 py-0.5 rounded-md">
                          {bill.billNumber}
                        </span>
                        <Badge className={cn(
                          'text-[10px] font-bold h-5 px-2 border-0 uppercase rounded-full',
                          bill.paymentMode === 'cash'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                            : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400'
                        )}>
                          {bill.paymentMode}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-base text-slate-900 dark:text-white tabular-nums">₹{bill.totalAmount.toLocaleString('en-IN')}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{bill.items.length} item{bill.items.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 mb-2 flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      {new Date(bill.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <div className="border-t border-slate-100 dark:border-white/[0.05] pt-2 space-y-1.5">
                      {bill.items.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs">
                          <span className="text-slate-500 dark:text-slate-400">{item.itemName} × {item.quantity}</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300 tabular-nums">₹{item.total.toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                      {bill.items.length > 3 && (
                        <p className="text-[11px] text-slate-400 pt-0.5">+{bill.items.length - 3} more item{bill.items.length - 3 !== 1 ? 's' : ''}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-white/[0.06]">
                <Button variant="outline" size="sm" onClick={() => setBillerBillsPage(p => Math.max(1, p - 1))} disabled={billerBillsPage === 1}
                  className="rounded-lg h-8 text-xs border-slate-200 dark:border-white/[0.08]">Previous</Button>
                <span className="text-xs text-slate-400 font-medium px-3 tabular-nums">{billerBillsPage} / {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setBillerBillsPage(p => Math.min(totalPages, p + 1))} disabled={billerBillsPage === totalPages}
                  className="rounded-lg h-8 text-xs border-slate-200 dark:border-white/[0.08]">Next</Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}