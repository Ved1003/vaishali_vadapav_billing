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
import { getBillsApi, getUsersApi, deleteBillApi } from '@/services/api';
import { Bill, User } from '@/types';
import {
  Filter, X, ChevronLeft, ChevronRight,
  Search, Download, Receipt, IndianRupee,
  Smartphone, Banknote, Trash2, Layers,
  ChevronDown, MoreHorizontal, TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type DatePreset = 'all' | 'today' | 'monthly' | 'yearly' | 'custom';

export default function BillingHistory() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [billers, setBillers] = useState<User[]>([]);
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
    paymentMode: '',
  });

  const [activeFilters, setActiveFilters] = useState({
    startDate: '',
    endDate: '',
    billerId: '',
    paymentMode: '',
  });

  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
  }, []);

  const fetchBills = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      const data = await getBillsApi({
        startDate: activeFilters.startDate || undefined,
        endDate: activeFilters.endDate || undefined,
        billerId: activeFilters.billerId || undefined,
        paymentMode: activeFilters.paymentMode || undefined,
      });
      setBills(data);
      if (!isSilent) setCurrentPage(1);
    } catch (error) {
      console.error('Error fetching bills:', error);
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, [activeFilters]);

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
    setFilters({ startDate: '', endDate: '', billerId: '', itemSearch: '', paymentMode: '' });
    setActiveFilters({ startDate: '', endDate: '', billerId: '', paymentMode: '' });
  };

  const filteredBills = useMemo(() => {
    return filters.itemSearch
      ? bills.filter(bill =>
        bill.items.some(item =>
          item.itemName.toLowerCase().includes(filters.itemSearch.toLowerCase())
        )
      )
      : bills;
  }, [bills, filters.itemSearch]);

  const totalPages = Math.ceil(filteredBills.length / itemsPerPage);
  const paginatedBills = filteredBills.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const stats = useMemo(() => {
    const total = filteredBills.reduce((sum, bill) => sum + bill.totalAmount, 0);
    const count = filteredBills.length;
    return {
      total,
      count,
      average: count > 0 ? total / count : 0,
      cash: filteredBills.filter(b => b.paymentMode === 'cash').reduce((s, b) => s + b.totalAmount, 0),
      upi: filteredBills.filter(b => b.paymentMode === 'upi').reduce((s, b) => s + b.totalAmount, 0),
    };
  }, [filteredBills]);

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
    <div className="min-h-full bg-gray-50 dark:bg-gray-950 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Billing History</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{filteredBills.length} transactions</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                placeholder="Search items..."
                value={filters.itemSearch}
                onChange={(e) => setFilters({ ...filters, itemSearch: e.target.value })}
                className="h-9 pl-9 pr-4 w-52 text-sm rounded-lg border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 focus-visible:ring-orange-500/20 focus-visible:border-orange-400"
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
            <Button size="sm" variant="outline" className="h-9 w-9 p-0 rounded-lg border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <Download className="h-3.5 w-3.5 text-gray-500" />
            </Button>
          </div>
        </div>

        {/* Compact Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Revenue', val: `₹${stats.total.toLocaleString()}`, icon: TrendingUp, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-500/10' },
            { label: 'Transactions', val: stats.count, icon: Layers, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
            { label: 'UPI Payments', val: `₹${stats.upi.toLocaleString()}`, icon: Smartphone, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-500/10' },
            { label: 'Cash Collected', val: `₹${stats.cash.toLocaleString()}`, icon: Banknote, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          ].map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-none">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0", item.bg)}>
                    <item.icon className={cn("h-4 w-4", item.color)} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.label}</p>
                    <p className="text-base font-semibold text-gray-900 dark:text-white leading-tight">{item.val}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

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
                    return (
                      <motion.tr
                        layout
                        key={billId}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ delay: idx * 0.03 }}
                        onClick={() => viewBillDetails(bill)}
                        className="group border-b border-gray-50 dark:border-gray-800/60 hover:bg-gray-50/70 dark:hover:bg-gray-800/30 cursor-pointer transition-colors"
                      >
                        <TableCell className="pl-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-lg bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                              <Receipt className="h-3.5 w-3.5 text-orange-500" />
                            </div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{bill.billNumber}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <div>
                            <p className="text-sm text-gray-700 dark:text-gray-200">
                              {new Date(bill.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              {new Date(bill.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="text-sm text-gray-700 dark:text-gray-300">{bill.billerName}</span>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex flex-wrap gap-1.5 max-w-[220px]">
                            {bill.items.slice(0, 2).map((item, i) => (
                              <Badge
                                key={i}
                                variant="secondary"
                                className="h-5 px-2 rounded-md text-[11px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-0"
                              >
                                {item.itemName.split(' ')[0]} <span className="text-orange-500 ml-1">×{item.quantity}</span>
                              </Badge>
                            ))}
                            {bill.items.length > 2 && (
                              <span className="text-[11px] text-gray-400 flex items-center">+{bill.items.length - 2}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          {bill.paymentMode === 'cash' ? (
                            <span className="inline-flex items-center gap-1 h-5 px-2 rounded-md text-[11px] font-medium bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              Cash
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 h-5 px-2 rounded-md text-[11px] font-medium bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                              UPI
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-3 text-right pr-4">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">₹{bill.totalAmount.toLocaleString()}</span>
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/20">
              <p className="text-xs text-gray-400">
                Page {currentPage} of {totalPages} · {filteredBills.length} entries
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-7 w-7 p-0 rounded-md"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                {[...Array(Math.min(totalPages, 7))].map((_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(page)}
                      className={cn(
                        "h-7 w-7 rounded-md text-xs font-medium transition-all",
                        currentPage === page
                          ? "bg-gray-900 dark:bg-orange-500 text-white"
                          : "text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      )}
                    >
                      {page}
                    </button>
                  );
                })}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-7 w-7 p-0 rounded-md"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
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