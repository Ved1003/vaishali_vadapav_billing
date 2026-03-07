import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
  DialogHeader,
  DialogTitle,
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
import { FileText, Filter, X, ChevronLeft, ChevronRight, Search, Download, Eye, Receipt, IndianRupee, Calendar, Smartphone, Banknote, Sparkles, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useSocket } from '@/hooks/useSocket';

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
        setBillers(usersData.filter(u => u.role === 'BILLER'));
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
    // Polling removed - replaced by WebSocket events
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

  const filteredBills = filters.itemSearch
    ? bills.filter(bill =>
      bill.items.some(item =>
        item.itemName.toLowerCase().includes(filters.itemSearch.toLowerCase())
      )
    )
    : bills;

  const totalPages = Math.ceil(filteredBills.length / itemsPerPage);
  const paginatedBills = filteredBills.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalAmount = filteredBills.reduce((sum, bill) => sum + bill.totalAmount, 0);
  const totalBills = filteredBills.length;
  const averageBillAmount = totalBills > 0 ? totalAmount / totalBills : 0;

  const viewBillDetails = (bill: Bill) => {
    setSelectedBill(bill);
    setIsBillDialogOpen(true);
  };

  const handleDeleteBill = async () => {
    if (!billToDelete) return;

    try {
      const billId = billToDelete.id || (billToDelete as any)._id;
      await deleteBillApi(billId);
      toast({ title: `Bill #${billToDelete.billNumber} deleted successfully.` });
      fetchBills(); // Refresh the list
    } catch (error) {
      console.error('Error deleting bill:', error);
      toast({ title: 'Failed to delete bill', variant: 'destructive' });
    } finally {
      setBillToDelete(null);
    }
  };

  if (isLoading && bills.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F7F9] dark:bg-[#0B0C10]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-full border-4 border-slate-200 dark:border-slate-800 border-t-orange-600 animate-spin"></div>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest text-center animate-pulse">Loading History...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#F7F7F9] dark:bg-[#0B0C10] p-4 md:p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-[1.25rem] bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-xl shadow-orange-500/20">
              <Receipt className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-none tracking-tight uppercase">
                Billing History
              </h1>
              <p className="text-[10px] font-black text-slate-400 mt-1.5 uppercase tracking-widest">Archive of all past transactions</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "rounded-xl h-11 px-6 border-slate-200 dark:border-white/5 bg-white dark:bg-[#1C1D21] font-black uppercase text-[10px] tracking-widest transition-all shadow-sm",
                showFilters && "bg-slate-900 text-white border-slate-900"
              )}
            >
              <Filter className={cn("h-4 w-4 mr-2", showFilters ? "text-white" : "text-orange-500")} />
              {showFilters ? 'Hide Filters' : 'Filters'}
            </Button>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-[#1C1D21] p-0 overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Volume</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">₹{totalAmount.toLocaleString('en-IN')}</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center">
                  <Receipt className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-[#1C1D21] p-0 overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoices</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalBills}</p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center shadow-inner">
                  <FileText className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-[#1C1D21] p-0 overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Average Bill</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">₹{averageBillAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-fuchsia-50 dark:bg-fuchsia-950/30 flex items-center justify-center shadow-inner">
                  <Sparkles className="h-6 w-6 text-fuchsia-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Section - Expandable */}
        <AnimatePresence>
          {(showFilters || datePreset || filters.itemSearch) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <Card className="rounded-[2rem] border-none shadow-xl bg-white dark:bg-[#1C1D21] p-0 overflow-hidden">
                <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Date Range</Label>
                    <div className="flex gap-1 group">
                      <Select value={datePreset} onValueChange={(v) => handleDatePresetChange(v as DatePreset)}>
                        <SelectTrigger className="h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0C10] font-black text-xs">
                          <Calendar className="h-4 w-4 mr-2 text-orange-500" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                          <SelectItem value="all">All Time</SelectItem>
                          <SelectItem value="today">Today</SelectItem>
                          <SelectItem value="monthly">This Month</SelectItem>
                          <SelectItem value="yearly">This Year</SelectItem>
                          <SelectItem value="custom">Custom Range</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {datePreset === 'custom' && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                        className="rounded-xl border-slate-200 dark:border-slate-800 h-11 flex-1 min-w-[130px] font-black text-[11px] bg-slate-50 dark:bg-[#0B0C10]"
                      />
                      <span className="text-slate-400 text-[10px] font-black uppercase">to</span>
                      <Input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                        className="rounded-xl border-slate-200 dark:border-slate-800 h-11 flex-1 min-w-[130px] font-black text-[11px] bg-slate-50 dark:bg-[#0B0C10]"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Counter Staff</Label>
                    <Select value={filters.billerId || 'all'} onValueChange={(v) => setFilters({ ...filters, billerId: v === 'all' ? '' : v })}>
                      <SelectTrigger className="h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0C10] font-black text-xs">
                        <SelectValue placeholder="All Staff" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                        <SelectItem value="all">All Staff</SelectItem>
                        {billers.map(b => (
                          <SelectItem key={b.id} value={b.id || 'unknown'}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Payment Mode</Label>
                    <div className="flex gap-2">
                      {['cash', 'upi'].map((mode) => (
                        <Button
                          key={mode}
                          variant="outline"
                          size="sm"
                          onClick={() => setFilters({ ...filters, paymentMode: filters.paymentMode === mode ? '' : mode })}
                          className={cn(
                            "flex-1 h-11 rounded-xl border-none capitalize font-black text-[10px] tracking-widest transition-all",
                            filters.paymentMode === mode
                              ? "bg-slate-900 text-white shadow-lg"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200"
                          )}
                        >
                          {mode}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Contains Item</Label>
                    <div className="relative group">
                      <Input
                        placeholder="Search snack name..."
                        value={filters.itemSearch}
                        onChange={(e) => setFilters({ ...filters, itemSearch: e.target.value })}
                        className="pl-10 h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0C10] font-bold text-xs"
                      />
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                    </div>
                  </div>

                  <div className="flex items-end gap-3 md:col-span-2 lg:col-span-4 justify-end pt-4 border-t border-slate-100 dark:border-white/5">
                    <Button
                      onClick={clearFilters}
                      variant="ghost"
                      className="h-11 px-6 rounded-xl font-black text-[10px] tracking-widest text-slate-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4 mr-2" />
                      CLEAR ALL
                    </Button>
                    <Button
                      onClick={applyFilters}
                      className="h-11 px-8 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-black text-[10px] tracking-widest shadow-lg shadow-orange-500/20"
                    >
                      APPLY FILTERS
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Records Table */}
        <Card className="rounded-[2rem] border-none shadow-2xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-[#1C1D21] p-0 overflow-hidden min-h-[500px]">
          <CardHeader className="p-6 border-b border-slate-100 dark:border-white/5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Transaction Logs</CardTitle>
                <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-widest">Archive of {filteredBills.length} valid bills</p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-950/30 px-5 py-3 rounded-2xl border border-orange-100 dark:border-orange-800 border-dashed">
                <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest mb-1">Page Total</p>
                <p className="text-2xl font-black text-orange-600">₹{paginatedBills.reduce((s, b) => s + b.totalAmount, 0).toLocaleString('en-IN')}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredBills.length === 0 ? (
              <div className="py-24 text-center">
                <div className="h-20 w-20 rounded-[1.5rem] bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <Receipt className="h-10 w-10 text-orange-200" />
                </div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">No matches found</h3>
                <p className="text-[11px] text-slate-500 mt-2 font-bold uppercase tracking-widest">We couldn't find any bills for these filters.</p>
                <Button variant="link" onClick={clearFilters} className="mt-4 text-orange-600 font-black text-[10px] tracking-widest uppercase hover:text-orange-700">Clear all filters</Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-[#0B0C10]">
                    <TableRow className="hover:bg-transparent border-none">
                      <TableHead className="py-4 pl-8 font-black uppercase text-[10px] text-slate-400 tracking-widest">ID / Number</TableHead>
                      <TableHead className="py-3 font-black uppercase text-[10px] text-slate-400 tracking-widest">Timeline</TableHead>
                      <TableHead className="py-3 font-black uppercase text-[10px] text-slate-400 tracking-widest">Biller / Cashier</TableHead>
                      <TableHead className="py-3 font-black uppercase text-[10px] text-slate-400 tracking-widest">Inventory Detail</TableHead>
                      <TableHead className="py-3 font-black uppercase text-[10px] text-slate-400 tracking-widest">Settlement</TableHead>
                      <TableHead className="text-right pr-6 py-3 font-black uppercase text-[10px] text-slate-400 tracking-widest">Grand Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedBills.map((bill) => {
                      const billId = bill.id || (bill as any)._id;
                      return (
                        <TableRow
                          key={billId}
                          className="group hover:bg-orange-50/50 dark:hover:bg-orange-950/10 cursor-pointer border-slate-100 dark:border-white/5 transition-colors"
                          onClick={() => viewBillDetails(bill)}
                        >
                          <TableCell className="pl-8 py-5">
                            <div className="flex flex-col">
                              <span className="font-mono font-black text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 px-3 py-1 rounded-[10px] w-fit text-[11px] shadow-sm tracking-tighter">#{bill.billNumber}</span>
                              <span className="text-[9px] text-slate-400 mt-1.5 uppercase font-black tracking-widest">{(billId || '--------').slice(-8)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                                {new Date(bill.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                              <span className="text-[10px] text-slate-400 uppercase font-black">
                                {new Date(bill.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-5">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/10">
                                <span className="text-white text-[11px] font-black">{bill.billerName.charAt(0)}</span>
                              </div>
                              <span className="font-black text-slate-900 dark:text-white text-[13px] uppercase tracking-tight">{bill.billerName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-5">
                            <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                              {bill.items.slice(0, 2).map((item, idx) => (
                                <Badge key={idx} variant="outline" className="rounded-lg border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0C10] text-slate-500 text-[10px] font-black py-0.5 px-2 h-6 uppercase">
                                  {item.itemName.split(' ')[0]}×{item.quantity}
                                </Badge>
                              ))}
                              {bill.items.length > 2 && (
                                <span className="text-[9px] font-black text-orange-400 self-center uppercase tracking-widest ml-1">+{bill.items.length - 2} MORE</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-5">
                            <div className="flex items-center gap-3">
                              {bill.paymentMode === 'cash' ? (
                                <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center shadow-inner"><Banknote className="h-4.5 w-4.5 text-emerald-600" /></div>
                              ) : (
                                <div className="h-9 w-9 rounded-xl bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center shadow-inner"><Smartphone className="h-4.5 w-4.5 text-orange-600" /></div>
                              )}
                              <span className="font-black text-[10px] uppercase tracking-widest text-slate-500">{bill.paymentMode}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-8 py-5">
                            <div className="flex flex-col items-end">
                              <span className="font-black text-2xl text-slate-900 dark:text-white tracking-tighter">₹{bill.totalAmount.toLocaleString('en-IN')}</span>
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0 mt-2">
                                <Button variant="ghost" size="sm" className="h-7 px-3 text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-900 hover:text-white transition-all" onClick={(e) => { e.stopPropagation(); viewBillDetails(bill); }}>VIEW BILL</Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg" onClick={(e) => { e.stopPropagation(); setBillToDelete(bill); }}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-8 border-t border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-[#0B0C10]/50 mt-auto">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  PAGE <span className="text-slate-900 dark:text-white">{currentPage}</span> OF <span className="text-slate-900 dark:text-white">{totalPages}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(c => Math.max(1, c - 1))}
                    disabled={currentPage === 1}
                    className="rounded-xl border-slate-200 dark:border-slate-800 h-11 px-5 font-black text-[10px] tracking-widest uppercase bg-white dark:bg-[#1C1D21]"
                  ><ChevronLeft className="h-4 w-4 mr-2 text-orange-500" /> PREV</Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(c => Math.min(totalPages, c + 1))}
                    disabled={currentPage === totalPages}
                    className="rounded-xl border-slate-200 dark:border-slate-800 h-11 px-5 font-black text-[10px] tracking-widest uppercase bg-white dark:bg-[#1C1D21]"
                  >NEXT <ChevronRight className="h-4 w-4 ml-2 text-orange-500" /></Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoice Detail Dialog */}
        <Dialog open={isBillDialogOpen} onOpenChange={setIsBillDialogOpen}>
          <DialogContent className="max-w-lg rounded-[2.5rem] border-none shadow-2xl bg-white dark:bg-[#1C1D21] p-0 overflow-hidden">
            {selectedBill && (
              <div className="flex flex-col">
                <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-8 text-white relative">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Receipt className="h-32 w-32" />
                  </div>
                  <div className="flex justify-between items-start relative z-10">
                    <div>
                      <Badge className="bg-white/20 hover:bg-white/30 text-white border-none mb-3 font-black text-[10px] uppercase tracking-widest px-3 py-1">INVOICE #{selectedBill.billNumber}</Badge>
                      <h2 className="text-4xl font-black tracking-tight mt-1">₹{selectedBill.totalAmount.toLocaleString('en-IN')}</h2>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2">Cashier</p>
                      <div className="flex items-center gap-2 justify-end">
                        <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center font-black text-xs">{selectedBill.billerName.charAt(0)}</div>
                        <p className="text-xl font-black">{selectedBill.billerName}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-8 bg-white dark:bg-[#1C1D21]">
                  <div className="grid grid-cols-2 gap-6 mb-8">
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date Issued</p>
                      <p className="font-bold text-[13px] text-slate-900 dark:text-white line-clamp-1">{new Date(selectedBill.createdAt).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}</p>
                    </div>
                    <div className="space-y-2 text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Settlement Method</p>
                      <Badge className={cn("font-black uppercase text-[10px] h-6 px-3 tracking-widest", selectedBill.paymentMode === 'cash' ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30" : "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30")}>
                        {selectedBill.paymentMode}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                      <span className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Order Summary</span>
                    </div>
                    <div className="rounded-[2rem] border border-slate-100 dark:border-white/5 overflow-hidden shadow-inner">
                      <div className="px-6 py-4 bg-slate-50 dark:bg-[#0B0C10] grid grid-cols-4 font-black text-[10px] text-slate-400 tracking-widest uppercase">
                        <span className="col-span-2">Description</span>
                        <span className="text-center">Qty</span>
                        <span className="text-right">Total</span>
                      </div>
                      <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
                        {selectedBill.items.map((item, idx) => (
                          <div key={idx} className="px-6 py-4 grid grid-cols-4 border-b border-slate-50 dark:border-white/5 last:border-none hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                            <div className="col-span-2 space-y-1">
                              <p className="font-black text-slate-900 dark:text-white uppercase text-[13px] tracking-tight line-clamp-1">{item.itemName}</p>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">UNIT: ₹{item.price}</p>
                            </div>
                            <span className="text-center font-black text-slate-900 dark:text-white text-sm pt-0.5">×{item.quantity}</span>
                            <span className="text-right font-black text-slate-900 dark:text-white text-sm pt-0.5">₹{item.total.toLocaleString('en-IN')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/5 flex justify-between items-center">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Verification ID</p>
                      <p className="text-[11px] font-mono font-black text-indigo-400">{(selectedBill.id || (selectedBill as any)._id || '--------').slice(-12).toUpperCase()}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Grand Total</span>
                        <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">₹{selectedBill.totalAmount.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-10 flex gap-4">
                    <Button className="flex-1 h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-[11px] tracking-widest uppercase shadow-lg transition-all transform active:scale-[0.98]"><Download className="h-4 w-4 mr-2" /> PDF INVOICE</Button>
                    <Button variant="outline" className="h-12 w-12 p-0 rounded-xl border-slate-200 dark:border-slate-800" onClick={() => setIsBillDialogOpen(false)}><X className="h-5 w-5 text-indigo-500" /></Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Alert Dialog */}
        <AlertDialog open={!!billToDelete} onOpenChange={(open) => !open && setBillToDelete(null)}>
          <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl bg-white dark:bg-[#1C1D21] p-8 max-w-sm">
            <AlertDialogHeader className="mb-6">
              <div className="h-14 w-14 rounded-2xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center text-red-600 mb-4 shadow-inner">
                <Trash2 className="h-7 w-7" />
              </div>
              <AlertDialogTitle className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Delete Bill?</AlertDialogTitle>
              <AlertDialogDescription className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-2 leading-relaxed">
                Bill <span className="text-red-500">#{billToDelete?.billNumber}</span> will be permanently removed. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex flex-col gap-3 sm:flex-row">
              <AlertDialogCancel className="flex-1 h-12 rounded-xl h-11 border-none bg-slate-100 dark:bg-slate-800 font-black text-slate-500 uppercase tracking-widest text-[10px]">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteBill}
                className="flex-1 h-12 rounded-xl h-11 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-red-500/20"
              >
                Delete Now
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
