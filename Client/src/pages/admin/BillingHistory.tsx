import { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { getBillsApi, getUsersApi, deleteBillApi, downloadSalesReportApi, getItemsApi } from '@/services/api';
import { Bill, User, Item, Pagination, BillingStats } from '@/types';
import {
  Filter, X, ChevronLeft, ChevronRight,
  Search, Download, Receipt, IndianRupee,
  Smartphone, Banknote, Trash2, Layers,
  ChevronDown, MoreHorizontal, TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Cell
} from 'recharts';
import { io } from 'socket.io-client';

type DatePreset = 'all' | 'today' | 'monthly' | 'yearly' | 'custom';

export default function BillingHistory() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [billers, setBillers] = useState<User[]>([]);
  const [itemsList, setItemsList] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [isBillDialogOpen, setIsBillDialogOpen] = useState(false);
  const [billToDelete, setBillToDelete] = useState<Bill | null>(null);
  const { toast } = useToast();

  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    billerId: '',
    itemSearch: '',
    billSearch: '',
    paymentMode: '',
  });

  const [activeFilters, setActiveFilters] = useState({
    startDate: '',
    endDate: '',
    billerId: '',
    paymentMode: '',
  });

  const [showFilters, setShowFilters] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [stats, setStats] = useState<BillingStats>({
    totalRevenue: 0,
    cashCollected: 0,
    upiPayments: 0,
    count: 0,
    topItems: [],
    trendData: []
  });
  const [newBillId, setNewBillId] = useState<string | null>(null);

  useEffect(() => {
    const fetchBillers = async () => {
      try {
        const usersData = await getUsersApi();
        setBillers(usersData.filter((u: User) => u.role === 'BILLER'));
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    fetchBillers();

    const fetchItems = async () => {
      try {
        const itemsData = await getItemsApi();
        setItemsList(itemsData);
      } catch (error) {
        console.error('Error fetching items:', error);
      }
    };
    fetchItems();
  }, []);

  // Real-time WebSocket listener
  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000');

    socket.on('BILL_CREATED', (newBill: Bill) => {
      // Check if bill matches current filters (simplified check for real-time feel)
      // If we are on page 1 and no specific search is active, we prepended it
      if (currentPage === 1 && !activeFilters.billerId && !activeFilters.paymentMode && !filters.billSearch && !filters.itemSearch) {
        setBills(prev => [newBill, ...prev.slice(0, limit - 1)]);
        setNewBillId(newBill.id);
        setTimeout(() => setNewBillId(null), 3000);
      }

      // Always update total stats if no date filter or if it's today
      setStats(prev => ({
        ...prev,
        count: prev.count + 1,
        totalRevenue: prev.totalRevenue + newBill.totalAmount,
        cashCollected: newBill.paymentMode === 'cash' ? prev.cashCollected + newBill.totalAmount : prev.cashCollected,
        upiPayments: newBill.paymentMode === 'upi' ? prev.upiPayments + newBill.totalAmount : prev.upiPayments,
      }));

      toast({
        title: "New Transaction",
        description: `Bill #${newBill.billNumber} for ₹${newBill.totalAmount} just arrived.`,
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [currentPage, activeFilters, filters.billSearch, filters.itemSearch, limit, toast]);

  const fetchBills = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      const data = await getBillsApi({
        startDate: activeFilters.startDate || undefined,
        endDate: activeFilters.endDate || undefined,
        billerId: activeFilters.billerId || undefined,
        paymentMode: activeFilters.paymentMode || undefined,
        billSearch: filters.billSearch || undefined,
        itemSearch: filters.itemSearch === 'all' ? undefined : (filters.itemSearch || undefined),
        page: currentPage,
        limit: limit,
      });
      setBills(data.bills);
      setPagination(data.pagination);
      setStats(data.stats);
    } catch (error) {
      console.error('Error fetching bills:', error);
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, [activeFilters, filters.billSearch, filters.itemSearch, currentPage, limit]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const handleDatePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    const today = new Date();
    let startDate = '';
    let endDate = '';

    switch (preset) {
      case 'today':
        startDate = today.toISOString().split('T')[0];
        endDate = startDate;
        break;
      case 'monthly':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
        break;
      case 'yearly':
        startDate = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
        endDate = new Date(today.getFullYear(), 11, 31).toISOString().split('T')[0];
        break;
      case 'all':
        startDate = '';
        endDate = '';
        break;
      case 'custom':
        return;
    }

    setFilters({ ...filters, startDate, endDate });
  };

  const applyFilters = () => {
    setActiveFilters({
      startDate: filters.startDate,
      endDate: filters.endDate,
      billerId: filters.billerId,
      paymentMode: filters.paymentMode,
    });
  };

  const clearFilters = () => {
    setDatePreset('all');
    setFilters({ startDate: '', endDate: '', billerId: 'all', itemSearch: '', billSearch: '', paymentMode: 'all' });
    setActiveFilters({ startDate: '', endDate: '', billerId: '', paymentMode: '' });
    setLimit(10);
    setCurrentPage(1);
    setShowFilters(false);
  };

  const totalPages = pagination?.pages || 0;
  const paginatedBills = bills;

  const viewBillDetails = (bill: Bill) => {
    setSelectedBill(bill);
    setIsBillDialogOpen(true);
  };

  const handleDeleteBill = async () => {
    if (!billToDelete) return;
    try {
      const billId = billToDelete.id || (billToDelete as any)._id;
      await deleteBillApi(billId);
      toast({ title: `Bill #${billToDelete.billNumber} deleted.` });
      fetchBills();
    } catch (error) {
      toast({ title: 'Error', description: 'Could not delete bill.', variant: 'destructive' });
    } finally {
      setBillToDelete(null);
    }
  };

  const handleDownloadReport = async () => {
    try {
      if (!activeFilters.startDate || !activeFilters.endDate) {
        toast({
          title: "Select Date Range",
          description: "Please apply a date range filter first to download a report.",
          variant: "destructive"
        });
        setShowFilters(true);
        return;
      }
      await downloadSalesReportApi(activeFilters.startDate, activeFilters.endDate);
      toast({ title: "Report Downloaded", description: "Your sales report has been generated." });
    } catch (error) {
      toast({ title: "Download Failed", description: "Could not generate the Excel report.", variant: "destructive" });
    }
  };

  const hasActiveFilters = activeFilters.startDate || activeFilters.endDate || activeFilters.billerId || activeFilters.paymentMode;

  if (isLoading && bills.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-gray-200 dark:border-gray-800 border-t-orange-500 animate-spin" />
          <p className="text-sm text-gray-400 font-medium">Loading transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 dark:bg-[#030711] p-4 md:p-8 transition-colors relative overflow-hidden">
      {/* Background Decorative Aura */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-orange-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-8 relative">

        {/* Executive Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Billing <span className="text-orange-500">History</span></h1>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Live Feed
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-lg">Manage and analyze your organization's transaction history with real-time insights and advanced filtering.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <Layers className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">{pagination?.total || 0} TOTAL TRANS.</span>
            </div>
            <div className="flex items-center gap-2">
              <Select 
                value={filters.itemSearch || 'all'} 
                onValueChange={(v) => setFilters({ ...filters, itemSearch: v === 'all' ? '' : v })}
              >
                <SelectTrigger className="h-9 w-52 rounded-lg border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-sm">
                  <div className="flex items-center gap-2 truncate">
                    <Search className="h-3.5 w-3.5 text-gray-400" />
                    <SelectValue placeholder="All Items" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Items</SelectItem>
                  {itemsList.map(item => (
                    <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <Input
                  placeholder="Bill No."
                  value={filters.billSearch}
                  onChange={(e) => setFilters({ ...filters, billSearch: e.target.value })}
                  className="h-9 pl-9 pr-4 w-32 text-sm rounded-lg border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 focus-visible:ring-orange-500/20 focus-visible:border-orange-400"
                />
              </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "h-9 px-3 rounded-lg text-sm font-medium border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 gap-1.5",
                showFilters && "bg-orange-50 border-orange-200 text-orange-600 dark:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-400",
                hasActiveFilters && !showFilters && "border-orange-200 text-orange-600 dark:border-orange-500/30 dark:text-orange-400"
              )}
            >
              <Filter className="h-3.5 w-3.5" />
              Filters
              {hasActiveFilters && (
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500 ml-0.5" />
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownloadReport}
              className="h-9 w-9 p-0 rounded-lg border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
              title="Download Excel Report"
            >
              <Download className="h-3.5 w-3.5 text-gray-500" />
            </Button>
          </div>
        </div>
      </div>
        {/* Compact Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: (filters.itemSearch && filters.itemSearch !== 'all') ? 'Item Revenue' : 'Total Revenue', val: `₹${stats.totalRevenue.toLocaleString()}`, icon: TrendingUp, color: 'from-orange-500 to-amber-500', bg: 'bg-orange-500/10', growth: '+12.5%', isUp: true },
            { label: 'Transactions', val: stats.count, icon: Layers, color: 'from-blue-500 to-indigo-500', bg: 'bg-blue-500/10', growth: '+8.2%', isUp: true },
            { label: 'UPI Payments', val: `₹${stats.upiPayments.toLocaleString()}`, icon: Smartphone, color: 'from-violet-500 to-fuchsia-500', bg: 'bg-violet-500/10', growth: '+15.4%', isUp: true },
            { label: 'Cash Collected', val: `₹${stats.cashCollected.toLocaleString()}`, icon: Banknote, color: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-500/10', growth: '-2.1%', isUp: false },
          ].map((item, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 12 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: i * 0.08, type: 'spring', stiffness: 100 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
            >
              <Card className="rounded-2xl border-0 bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl shadow-sm hover:shadow-md transition-all overflow-hidden relative group">
                <div className={cn("absolute inset-0 opacity-[0.03] bg-gradient-to-br", item.color)} />
                <CardContent className="p-5 relative">
                  <div className="flex items-start justify-between mb-3">
                    <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shadow-inner", item.bg)}>
                      <item.icon className={cn("h-5 w-5 text-transparent bg-clip-text bg-gradient-to-br", item.color)} style={{ backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-from), var(--tw-gradient-to))` }} />
                    </div>
                    <div className={cn(
                      "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight",
                      item.isUp ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                    )}>
                      {item.isUp ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingUp className="h-2.5 w-2.5 rotate-180" />}
                      {item.growth}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{item.label}</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{item.val}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
          {/* Analytics Toggle Card */}
          <motion.div 
            initial={{ opacity: 0, y: 12 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.35, type: 'spring', stiffness: 100 }}
            whileHover={{ y: -4 }}
          >
            <Card 
              className={cn(
                "rounded-2xl border-0 cursor-pointer transition-all backdrop-blur-xl shadow-sm overflow-hidden h-full relative",
                showAnalytics ? "bg-orange-500/10 ring-1 ring-orange-500/20" : "bg-white/60 dark:bg-gray-900/40 hover:bg-white/80 dark:hover:bg-gray-900/60"
              )}
              onClick={() => setShowAnalytics(!showAnalytics)}
            >
              <CardContent className="p-5 flex flex-col justify-between h-full relative">
                <div className="flex items-center justify-between mb-4">
                  <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shadow-inner", showAnalytics ? "bg-orange-500 text-white" : "bg-gray-100 dark:bg-gray-800")}>
                    <TrendingUp className={cn("h-5 w-5", showAnalytics ? "text-white" : "text-gray-500")} />
                  </div>
                  <ChevronDown className={cn("h-4 w-4 text-gray-400 transition-transform duration-300", showAnalytics && "rotate-180 text-orange-500")} />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Historical</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{showAnalytics ? 'Hide Analytics' : 'Quick Insights'}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Analytics Dashboard */}
        <AnimatePresence>
          {showAnalytics && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-4"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-1">
                {/* Top Selling Items */}
                <Card className="rounded-xl border border-gray-100 dark:border-gray-800/60 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-orange-500" />
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Top 5 Selling Items</h3>
                      </div>
                      <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">By Revenue</span>
                    </div>
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={stats.topItems} margin={{ left: -20, right: 10, top: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#f97316" stopOpacity={0.8} />
                              <stop offset="100%" stopColor="#fbbf24" stopOpacity={1} />
                            </linearGradient>
                          </defs>
                          <XAxis type="number" hide />
                          <YAxis 
                            dataKey="name" 
                            type="category" 
                            axisLine={false} 
                            tickLine={false}
                            width={100}
                            tick={{ fontSize: 11, fontWeight: 500, fill: '#666' }}
                          />
                          <Tooltip 
                            cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md p-3 border border-white/20 dark:border-gray-700/30 rounded-xl shadow-2xl text-xs">
                                    <p className="font-bold text-gray-900 dark:text-white mb-1.5">{payload[0].payload.name}</p>
                                    <div className="space-y-1">
                                      <p className="flex justify-between gap-4 text-gray-500">Revenue: <span className="font-bold text-gray-900 dark:text-white">₹{payload[0].value?.toLocaleString()}</span></p>
                                      <p className="flex justify-between gap-4 text-gray-500">Orders: <span className="font-bold text-orange-500">{payload[0].payload.quantity}</span></p>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar 
                            dataKey="revenue" 
                            radius={[0, 6, 6, 0]} 
                            barSize={18}
                            fill="url(#barGradient)"
                          >
                            {stats.topItems.map((_, index) => (
                              <Cell key={`cell-${index}`} fillOpacity={1 - (index * 0.12)} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Revenue Trend Line */}
                <Card className="rounded-2xl border-0 bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl shadow-sm overflow-hidden h-full">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                        <div className="h-2.5 w-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">Revenue Trend</h3>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                        Live Analytics
                      </div>
                    </div>
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={stats.trendData}>
                          <defs>
                            <linearGradient id="lineContentGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="#88888815" />
                          <XAxis 
                            dataKey="date" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fontWeight: 500, fill: '#888' }}
                            tickFormatter={(str) => {
                              const d = new Date(str);
                              return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                            }}
                          />
                          <YAxis hide domain={['auto', 'auto']} />
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md p-3 border border-white/20 dark:border-gray-700/30 rounded-xl shadow-2xl text-xs">
                                    <p className="font-bold text-gray-500 mb-1.5 uppercase tracking-wider text-[10px]">{new Date(payload[0].payload.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}</p>
                                    <p className="text-blue-500 font-bold text-sm">₹{payload[0].value?.toLocaleString()}</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="revenue" 
                            stroke="#3b82f6" 
                            strokeWidth={4} 
                            dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                            activeDot={{ r: 6, strokeWidth: 0, fill: '#3b82f6', shadow: '0 0 10px rgba(59,130,246,0.5)' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-none">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-gray-500 dark:text-gray-400">Time Period</Label>
                      <Select value={datePreset} onValueChange={(v) => handleDatePresetChange(v as DatePreset)}>
                        <SelectTrigger className="h-9 rounded-lg border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Time</SelectItem>
                          <SelectItem value="today">Today</SelectItem>
                          <SelectItem value="monthly">This Month</SelectItem>
                          <SelectItem value="yearly">This Year</SelectItem>
                          <SelectItem value="custom">Custom Range</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {datePreset === 'custom' && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1.5 sm:col-span-2">
                        <Label className="text-xs font-medium text-gray-500 dark:text-gray-400">Date Range</Label>
                        <div className="flex items-center gap-2">
                          <Input type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} className="h-9 rounded-lg border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm" />
                          <span className="text-gray-300 dark:text-gray-600 text-sm">–</span>
                          <Input type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} className="h-9 rounded-lg border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm" />
                        </div>
                      </motion.div>
                    )}

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-gray-500 dark:text-gray-400">Biller</Label>
                      <Select value={filters.billerId || 'all'} onValueChange={(v) => setFilters({ ...filters, billerId: v === 'all' ? '' : v })}>
                        <SelectTrigger className="h-9 rounded-lg border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm">
                          <SelectValue placeholder="All billers" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Billers</SelectItem>
                          {billers.map(b => (
                            <SelectItem key={b.id} value={b.id || 'unknown'}>{b.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-gray-500 dark:text-gray-400">Payment Mode</Label>
                      <div className="flex gap-2">
                        {['cash', 'upi'].map((mode) => (
                          <button
                            key={mode}
                            onClick={() => setFilters({ ...filters, paymentMode: filters.paymentMode === mode ? '' : mode })}
                            className={cn(
                              "flex-1 h-9 rounded-lg text-xs font-medium border transition-all capitalize",
                              filters.paymentMode === mode
                                ? "bg-orange-500 border-orange-500 text-white"
                                : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300"
                            )}
                          >
                            {mode.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-end gap-2">
                      <Button
                        onClick={applyFilters}
                        className="flex-1 h-9 rounded-lg bg-gray-900 hover:bg-gray-800 dark:bg-orange-500 dark:hover:bg-orange-600 text-white text-xs font-medium"
                      >
                        Apply
                      </Button>
                      <button onClick={clearFilters} className="h-9 px-3 text-xs text-gray-400 hover:text-red-500 transition-colors font-medium">
                        Clear
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Table */}
        <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-none overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-100 dark:border-gray-800 hover:bg-transparent">
                  <TableHead className="h-10 pl-4 text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-50/70 dark:bg-gray-800/40">Bill No.</TableHead>
                  <TableHead className="h-10 text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-50/70 dark:bg-gray-800/40">Date & Time</TableHead>
                  <TableHead className="h-10 text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-50/70 dark:bg-gray-800/40">Biller</TableHead>
                  <TableHead className="h-10 text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-50/70 dark:bg-gray-800/40">Items</TableHead>
                  <TableHead className="h-10 text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-50/70 dark:bg-gray-800/40">Payment</TableHead>
                  <TableHead className="h-10 text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-50/70 dark:bg-gray-800/40 text-right pr-4">Amount</TableHead>
                  <TableHead className="h-10 text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-50/70 dark:bg-gray-800/40 w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence mode="popLayout">
                  {paginatedBills.map((bill, idx) => {
                    const billId = bill.id || (bill as any)._id;
                    const isNew = billId === newBillId;
                    return (
                      <motion.tr
                        layout
                        key={billId}
                        initial={isNew ? { backgroundColor: 'rgba(249, 115, 22, 0.1)', x: -20, opacity: 0 } : { opacity: 0 }}
                        animate={{ 
                          backgroundColor: isNew ? 'rgba(249, 115, 22, 0.1)' : 'transparent',
                          x: 0, 
                          opacity: 1 
                        }}
                        whileHover={{ y: -2, backgroundColor: 'rgba(0,0,0,0.02)', transition: { duration: 0.2 } }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.5, delay: isNew ? 0 : idx * 0.03 }}
                        onClick={() => viewBillDetails(bill)}
                        className={cn(
                          "group border-b border-gray-50 dark:border-gray-800/60 transition-all cursor-pointer relative",
                          isNew && "bg-orange-50/50 dark:bg-orange-500/10"
                        )}
                      >
                        <TableCell className="pl-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                              <Receipt className="h-4 w-4 text-orange-500" />
                            </div>
                            <span className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">{bill.billNumber}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div>
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                              {new Date(bill.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </p>
                            <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                              {new Date(bill.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[10px] font-bold text-gray-500">
                              {bill.billerName.charAt(0)}
                            </div>
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{bill.billerName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex flex-wrap gap-1.5 max-w-[240px]">
                            {bill.items.slice(0, 2).map((item, i) => (
                              <Badge
                                key={i}
                                variant="secondary"
                                className="h-6 px-2.5 rounded-lg text-[10px] font-bold bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-700 shadow-sm"
                              >
                                {item.itemName} <span className="text-orange-500 ml-1">×{item.quantity}</span>
                              </Badge>
                            ))}
                            {bill.items.length > 2 && (
                              <Badge variant="outline" className="h-6 px-2 rounded-lg text-[10px] font-bold text-gray-400 border-gray-100">
                                +{bill.items.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          {bill.paymentMode === 'cash' ? (
                            <div className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 ring-1 ring-emerald-500/20">
                              <Banknote className="h-3 w-3" />
                              CASH
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 ring-1 ring-blue-500/20">
                              <Smartphone className="h-3 w-3" />
                              UPI
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="py-4 text-right pr-6">
                          <span className="text-base font-bold text-gray-900 dark:text-white tracking-tight">₹{bill.totalAmount.toLocaleString()}</span>
                        </TableCell>
                        <TableCell className="py-3 pr-2">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); viewBillDetails(bill); }}
                              className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                              <MoreHorizontal className="h-3.5 w-3.5 text-gray-400" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setBillToDelete(bill); }}
                              className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-gray-400 hover:text-red-500 transition-colors" />
                            </button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
                {!paginatedBills.length && (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                          <Search className="h-5 w-5 text-gray-300 dark:text-gray-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No transactions found</p>
                          <p className="text-xs text-gray-400 mt-0.5">Try adjusting your filters</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={clearFilters} className="mt-1 h-8 text-xs rounded-lg border-orange-200 text-orange-500 hover:bg-orange-50">
                          Clear Filters
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900/50">
              <div className="flex items-center gap-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Page <span className="font-semibold text-gray-900 dark:text-white">{currentPage}</span> of <span className="font-semibold text-gray-900 dark:text-white">{totalPages}</span> · {pagination?.total || 0} entries
                </p>
                
                <div className="flex items-center gap-2 border-l border-gray-100 dark:border-gray-800 pl-4">
                  <span className="text-[11px] text-gray-400 uppercase font-bold tracking-wider">Show</span>
                  <Select
                    value={String(limit)}
                    onValueChange={(v) => {
                      setLimit(Number(v));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="h-7 w-20 rounded-md border-gray-200 dark:border-gray-800 bg-transparent text-[11px] font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="500">500</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                {/* Simplified Page Numbers for better UI */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = 1;
                  if (totalPages <= 5) pageNum = i + 1;
                  else if (currentPage <= 3) pageNum = i + 1;
                  else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                  else pageNum = currentPage - 2 + i;

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={cn(
                        "h-8 w-8 rounded-lg text-xs font-bold transition-all",
                        currentPage === pageNum
                          ? "bg-orange-500 text-white shadow-sm shadow-orange-500/20"
                          : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Bill Detail Dialog */}
        <Dialog open={isBillDialogOpen} onOpenChange={setIsBillDialogOpen}>
          <DialogContent className="max-w-lg rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-0 overflow-hidden shadow-xl outline-none">
            {selectedBill && (
              <div>
                {/* Dialog Header */}
                <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Receipt className="h-4 w-4 text-orange-500" />
                      <span className="text-xs font-medium text-gray-400">Bill #{selectedBill.billNumber}</span>
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">₹{selectedBill.totalAmount.toLocaleString()}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedBill.paymentMode === 'cash' ? (
                      <span className="h-6 px-2.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center">Cash</span>
                    ) : (
                      <span className="h-6 px-2.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center">UPI</span>
                    )}
                  </div>
                </div>

                {/* Meta Info */}
                <div className="px-6 py-4 grid grid-cols-2 gap-4 border-b border-gray-100 dark:border-gray-800">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Date</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {new Date(selectedBill.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(selectedBill.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Billed By</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedBill.billerName}</p>
                  </div>
                </div>

                {/* Items */}
                <div className="px-6 py-4 max-h-64 overflow-y-auto">
                  <p className="text-xs font-medium text-gray-400 mb-3">Items</p>
                  <div className="space-y-2">
                    {selectedBill.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800/60 last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="h-7 w-7 rounded-lg bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center">
                            <span className="text-[10px] font-semibold text-orange-500">×{item.quantity}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{item.itemName}</p>
                            <p className="text-xs text-gray-400">₹{item.price} each</p>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">₹{item.total.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/40 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-gray-400">Total</span>
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">₹{selectedBill.totalAmount.toLocaleString()}</span>
                  </div>
                  <Button size="sm" className="h-8 px-4 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium gap-1.5">
                    <Download className="h-3.5 w-3.5" /> Download PDF
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!billToDelete} onOpenChange={(open) => !open && setBillToDelete(null)}>
          <AlertDialogContent className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl p-6 max-w-sm outline-none">
            <AlertDialogHeader className="text-left mb-4">
              <div className="h-9 w-9 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-3">
                <Trash2 className="h-4 w-4 text-red-500" />
              </div>
              <AlertDialogTitle className="text-base font-semibold text-gray-900 dark:text-white">Delete Transaction?</AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-gray-500 dark:text-gray-400">
                Bill <span className="font-medium text-gray-700 dark:text-gray-300">#{billToDelete?.billNumber}</span> will be permanently removed. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex gap-2 sm:flex-row">
              <AlertDialogCancel className="flex-1 h-9 rounded-lg border-gray-200 dark:border-gray-700 text-sm font-medium">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteBill}
                className="flex-1 h-9 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium border-0"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </div>
  );
}