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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 dark:from-slate-950 dark:to-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-full border-4 border-orange-200 dark:border-orange-900 border-t-orange-600 dark:border-t-orange-400 animate-spin"></div>
          <p className="text-slate-600 dark:text-slate-400 font-semibold animate-pulse">Loading History...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-orange-50/30 via-amber-50/20 to-yellow-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 p-4">
      <div className="max-w-[1400px] mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-md">
              <Receipt className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                Billing History
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-xs font-medium">Archive of all past transactions</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={cn("rounded-xl h-10 px-4 border-orange-200 hover:border-orange-400 transition-all", showFilters && "bg-orange-600 text-white hover:bg-orange-700")}
            >
              <Filter className={cn("h-3.5 w-3.5 mr-2", showFilters ? "text-white" : "text-orange-600")} />
              {showFilters ? 'Hide Filters' : 'Filters'}
            </Button>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="rounded-2xl border-2 border-white/50 dark:border-slate-700/50 shadow-md bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Volume</p>
                  <p className="text-xl font-black text-slate-800 dark:text-white mt-1">₹{totalAmount.toLocaleString('en-IN')}</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center">
                  <IndianRupee className="h-5 w-5 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-2 border-white/50 dark:border-slate-700/50 shadow-md bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Invoices</p>
                  <p className="text-xl font-black text-slate-800 dark:text-white mt-1">{totalBills}</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-2 border-white/50 dark:border-slate-700/50 shadow-md bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Average Bill</p>
                  <p className="text-xl font-black text-slate-800 dark:text-white mt-1">₹{averageBillAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-500/10 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-purple-600" />
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
              <Card className="rounded-2xl border-2 border-white/50 dark:border-slate-700/50 shadow-md bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Date Range</Label>
                    <div className="flex gap-1">
                      <Select value={datePreset} onValueChange={(v) => handleDatePresetChange(v as DatePreset)}>
                        <SelectTrigger className="h-10 rounded-xl border-orange-100 dark:border-slate-700 font-bold text-xs bg-white dark:bg-slate-900">
                          <Calendar className="h-3.5 w-3.5 mr-2" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
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
                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                        className="rounded-xl border-orange-100 h-10 flex-1 min-w-[130px] text-xs"
                      />
                      <span className="text-slate-400 text-[10px] font-black uppercase">to</span>
                      <Input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                        className="rounded-xl border-orange-100 h-10 flex-1 min-w-[130px] text-xs"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Counter Staff</Label>
                    <Select value={filters.billerId || 'all'} onValueChange={(v) => setFilters({ ...filters, billerId: v === 'all' ? '' : v })}>
                      <SelectTrigger className="h-10 rounded-xl border-orange-100 dark:border-slate-700 font-bold text-xs bg-white dark:bg-slate-900">
                        <SelectValue placeholder="All Staff" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="all">All Staff</SelectItem>
                        {billers.map(b => (
                          <SelectItem key={b.id} value={b.id || 'unknown'}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Payment Mode</Label>
                    <div className="flex gap-2">
                      {['cash', 'upi'].map((mode) => (
                        <Button
                          key={mode}
                          variant="outline"
                          size="sm"
                          onClick={() => setFilters({ ...filters, paymentMode: filters.paymentMode === mode ? '' : mode })}
                          className={cn(
                            "flex-1 h-10 rounded-xl border-orange-100 dark:border-slate-700 capitalize font-bold text-xs",
                            filters.paymentMode === mode ? "bg-orange-600 text-white border-orange-600" : "bg-white dark:bg-slate-900"
                          )}
                        >
                          {mode}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Contains Item</Label>
                    <div className="relative">
                      <Input
                        placeholder="Search snack name..."
                        value={filters.itemSearch}
                        onChange={(e) => setFilters({ ...filters, itemSearch: e.target.value })}
                        className="pl-10 h-10 rounded-xl border-orange-100 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-xs"
                      />
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-orange-400" />
                    </div>
                  </div>

                  <div className="flex items-end gap-2">
                    <Button onClick={applyFilters} className="flex-1 h-10 rounded-xl bg-slate-900 text-white font-black text-xs">APPLY FILTERS</Button>
                    <Button onClick={clearFilters} variant="ghost" className="h-10 w-10 p-0 rounded-xl text-slate-400 hover:text-red-500"><X className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Records Table */}
        <Card className="rounded-2xl border-2 border-white/50 dark:border-slate-700/50 shadow-2xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-md overflow-hidden min-h-[500px]">
          <CardHeader className="p-4 border-b border-orange-50/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black text-slate-800 dark:text-white">Transaction Logs</CardTitle>
                <p className="text-slate-500 font-medium text-sm">Archive of {filteredBills.length} valid bills</p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-500/10 px-4 py-2 rounded-xl border border-orange-100 border-dashed">
                <p className="text-[9px] font-black text-orange-600/60 uppercase tracking-widest">Page Total</p>
                <p className="text-xl font-black text-orange-600">₹{paginatedBills.reduce((s, b) => s + b.totalAmount, 0).toLocaleString('en-IN')}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredBills.length === 0 ? (
              <div className="py-20 text-center">
                <div className="h-20 w-20 rounded-full bg-orange-50 dark:bg-orange-950 flex items-center justify-center mx-auto mb-4">
                  <Receipt className="h-10 w-10 text-orange-200" />
                </div>
                <h3 className="text-xl font-black text-slate-800 dark:text-white">No matches found</h3>
                <p className="text-slate-500 text-sm">We couldn't find any bills for these filters.</p>
                <Button variant="link" onClick={clearFilters} className="mt-3 text-orange-600 font-bold text-sm">Clear all filters</Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
                    <TableRow className="hover:bg-transparent border-none">
                      <TableHead className="py-3 pl-6 font-black uppercase text-[10px] text-slate-400 tracking-widest">ID / Number</TableHead>
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
                          className="group hover:bg-orange-50/30 dark:hover:bg-orange-950/20 cursor-pointer border-orange-50/50 dark:border-slate-800"
                          onClick={() => viewBillDetails(bill)}
                        >
                          <TableCell className="pl-6 py-3">
                            <div className="flex flex-col">
                              <span className="font-mono font-bold text-orange-600 bg-orange-100 dark:bg-orange-500/10 px-2 py-0.5 rounded-md w-fit text-xs">#{bill.billNumber}</span>
                              <span className="text-[9px] text-slate-400 mt-0.5 uppercase font-bold">{(billId || '--------').slice(-8)}</span>
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
                          <TableCell className="py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-md">
                                <span className="text-white text-[10px] font-black">{bill.billerName.charAt(0)}</span>
                              </div>
                              <span className="font-bold text-slate-800 dark:text-white text-xs">{bill.billerName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="flex flex-wrap gap-1 max-w-[180px]">
                              {bill.items.slice(0, 2).map((item, idx) => (
                                <Badge key={idx} variant="outline" className="rounded-md border-slate-200 dark:border-slate-700 text-slate-500 text-[9px] py-0 px-1 h-5">
                                  {item.itemName.split(' ')[0]}×{item.quantity}
                                </Badge>
                              ))}
                              {bill.items.length > 2 && (
                                <span className="text-[9px] font-black text-orange-400 self-center">+{bill.items.length - 2} MORE</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="flex items-center gap-2">
                              {bill.paymentMode === 'cash' ? (
                                <div className="h-7 w-7 rounded-lg bg-green-100 dark:bg-green-500/10 flex items-center justify-center"><Banknote className="h-3.5 w-3.5 text-green-600" /></div>
                              ) : (
                                <div className="h-7 w-7 rounded-lg bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center"><Smartphone className="h-3.5 w-3.5 text-orange-600" /></div>
                              )}
                              <span className="font-black text-[9px] uppercase text-slate-600 dark:text-slate-400">{bill.paymentMode}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-6 py-3">
                            <div className="flex flex-col items-end">
                              <span className="font-black text-xl bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">₹{bill.totalAmount.toLocaleString('en-IN')}</span>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                                <Button variant="ghost" size="sm" className="h-6 text-[9px] font-bold" onClick={(e) => { e.stopPropagation(); viewBillDetails(bill); }}>VIEW BILL</Button>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-md" onClick={(e) => { e.stopPropagation(); setBillToDelete(bill); }}>
                                  <Trash2 className="h-3.5 w-3.5" />
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
              <div className="p-8 border-t border-orange-50/50 flex items-center justify-between">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  PAGE <span className="text-slate-800 dark:text-white">{currentPage}</span> OF <span className="text-slate-800 dark:text-white">{totalPages}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(c => Math.max(1, c - 1))}
                    disabled={currentPage === 1}
                    className="rounded-xl border-orange-100 h-10 px-4"
                  ><ChevronLeft className="h-4 w-4 mr-1" /> PREV</Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(c => Math.min(totalPages, c + 1))}
                    disabled={currentPage === totalPages}
                    className="rounded-xl border-orange-100 h-10 px-4"
                  >NEXT <ChevronRight className="h-4 w-4 ml-1" /></Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoice Detail Dialog */}
        <Dialog open={isBillDialogOpen} onOpenChange={setIsBillDialogOpen}>
          <DialogContent className="max-w-lg rounded-[1.5rem] border-2 border-orange-100 dark:border-slate-800 p-0 overflow-hidden">
            {selectedBill && (
              <div className="flex flex-col">
                <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-5 text-white relative">
                  <div className="absolute top-0 right-0 p-5 opacity-10">
                    <Receipt className="h-24 w-24" />
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <Badge className="bg-white/20 hover:bg-white/30 text-white border-none mb-2 font-black text-[10px]">INVOICE #{selectedBill.billNumber}</Badge>
                      <h2 className="text-3xl font-black">₹{selectedBill.totalAmount.toLocaleString('en-IN')}</h2>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">Cashier</p>
                      <p className="text-lg font-black">{selectedBill.billerName}</p>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-white dark:bg-slate-900">
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Date Issued</p>
                      <p className="font-bold text-xs">{new Date(selectedBill.createdAt).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}</p>
                    </div>
                    <div className="space-y-0.5 text-right">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Settlement Method</p>
                      <Badge className={cn("font-black capitalize text-[9px] h-5", selectedBill.paymentMode === 'cash' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700")}>
                        {selectedBill.paymentMode}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="h-3.5 w-3.5 text-orange-400" />
                      <span className="text-xs font-black uppercase text-slate-800 dark:text-white">Order Summary</span>
                    </div>
                    <div className="rounded-2xl border-2 border-slate-50 dark:border-slate-800 overflow-hidden">
                      <div className="px-4 py-2.5 bg-slate-50/50 dark:bg-slate-900/50 grid grid-cols-4 font-black text-[9px] text-slate-400 tracking-widest uppercase border-b border-slate-50 dark:border-slate-800">
                        <span className="col-span-2">Description</span>
                        <span className="text-center">Qty</span>
                        <span className="text-right">Total</span>
                      </div>
                      <div className="max-h-[220px] overflow-y-auto">
                        {selectedBill.items.map((item, idx) => (
                          <div key={idx} className="px-4 py-2.5 grid grid-cols-4 border-b border-slate-50 dark:border-slate-800 last:border-none">
                            <div className="col-span-2 space-y-0.5">
                              <p className="font-bold text-slate-800 dark:text-white uppercase text-[11px] leading-tight">{item.itemName}</p>
                              <p className="text-[9px] font-bold text-slate-400">UNIT: ₹{item.price}</p>
                            </div>
                            <span className="text-center font-black text-slate-700 dark:text-slate-300 text-xs">×{item.quantity}</span>
                            <span className="text-right font-black text-slate-900 dark:text-white text-xs">₹{item.total.toLocaleString('en-IN')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t-2 border-dashed border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Verification ID</p>
                      <p className="text-[10px] font-mono font-bold text-slate-600">{(selectedBill.id || (selectedBill as any)._id || '--------').slice(-12)}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-baseline justify-end gap-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Grand Total</span>
                        <span className="text-2xl font-black bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">₹{selectedBill.totalAmount.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex gap-3">
                    <Button className="flex-1 h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shadow-md"><Download className="h-3.5 w-3.5 mr-2" /> DOWNLOAD PDF</Button>
                    <Button variant="outline" className="h-11 w-11 p-0 rounded-xl border-orange-100" onClick={() => setIsBillDialogOpen(false)}><X className="h-4 w-4 text-orange-600" /></Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Alert Dialog */}
        <AlertDialog open={!!billToDelete} onOpenChange={(open) => !open && setBillToDelete(null)}>
          <AlertDialogContent className="rounded-2xl max-w-sm">
            <AlertDialogHeader className="mb-2">
              <AlertDialogTitle className="text-xl font-black">Delete Bill #{billToDelete?.billNumber}?</AlertDialogTitle>
              <AlertDialogDescription className="text-sm font-medium">
                This will permanently delete this transaction from your history and the database. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl h-11 w-full sm:w-auto font-black text-slate-500">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteBill}
                className="rounded-xl h-11 w-full sm:w-auto bg-red-500 hover:bg-red-600 text-white font-black border-0"
              >
                Yes, delete bill
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
