import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { getActiveItemsApi, createBillApi } from '@/services/api';
import { Item, BillItem, Bill } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  Minus,
  Printer,
  Banknote,
  Smartphone,
  Search,
  ShoppingBag,
  Sparkles,
  X,
} from 'lucide-react';
import PrintReceipt from '@/components/billing/PrintReceipt';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function BillingScreen() {
  const [items, setItems] = useState<Item[]>([]);
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const [lastBill, setLastBill] = useState<Bill | null>(null);

  useEffect(() => {
    getActiveItemsApi().then(setItems).finally(() => setIsLoading(false));
  }, []);

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addItem = (item: Item) => {
    const existing = billItems.find(bi => bi.itemId === item.id);
    if (existing) {
      setBillItems(billItems.map(bi =>
        bi.itemId === item.id
          ? { ...bi, quantity: bi.quantity + 1, total: (bi.quantity + 1) * bi.price }
          : bi
      ));
    } else {
      const newBillItem = {
        id: `temp-${Date.now()}-${Math.random()}`,
        itemId: item.id,
        itemName: item.name,
        quantity: 1,
        price: item.price,
        total: item.price,
      };
      setBillItems([...billItems, newBillItem]);
    }
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setBillItems(billItems.map(bi => {
      if (bi.itemId === itemId) {
        const newQty = Math.max(0, bi.quantity + delta);
        return newQty === 0 ? null : { ...bi, quantity: newQty, total: newQty * bi.price };
      }
      return bi;
    }).filter(Boolean) as BillItem[]);
  };

  const removeItem = (itemId: string) => {
    setBillItems(billItems.filter(bi => bi.itemId !== itemId));
  };

  const grandTotal = billItems.reduce((sum, bi) => sum + bi.total, 0);
  const itemCount = billItems.reduce((sum, bi) => sum + bi.quantity, 0);

  const saveBill = async (paymentMode: 'cash' | 'card' | 'upi') => {
    if (billItems.length === 0) {
      toast({ title: 'Add items to bill first', variant: 'destructive' });
      return;
    }

    const bill = await createBillApi({
      items: billItems,
      totalAmount: grandTotal,
      paymentMode,
      billerId: user!.id,
      billerName: user!.name,
    });

    toast({
      title: "Bill Created Successfully",
      description: `Bill #${bill.billNumber} - ₹${grandTotal.toFixed(2)}`,
      className: "bg-gradient-to-r from-green-600 to-emerald-600 text-white border-none"
    });

    setBillItems([]);
    setLastBill(bill);

    // Use browser/system print dialog (works on Android via Capacitor too)
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const getItemCount = (itemId: string) => billItems.find(bi => bi.itemId === itemId)?.quantity || 0;

  if (isLoading) return (
    <div className="flex items-center justify-center h-screen bg-[#F7F7F9] dark:bg-[#0B0C10]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-16 w-16 rounded-full border-4 border-orange-200 dark:border-orange-900 border-t-orange-600 dark:border-t-orange-400 animate-spin"></div>
        <p className="text-slate-600 dark:text-slate-400 font-semibold animate-pulse">Loading Menu...</p>
      </div>
    </div>
  );

  return (
    <>
      <div className="flex flex-col lg:flex-row flex-1 bg-[#F7F7F9] dark:bg-[#0B0C10] print:hidden overflow-hidden">
        {/* Left Section: Menu */}
        <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#1C1D21] shadow-sm z-10 transition-colors">
          {/* Menu Header with Search */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-5xl mx-auto w-full">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-slate-800 dark:text-white leading-tight">Menu Center</h1>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{items.length} snacks available</p>
                </div>
              </div>

              <div className="flex-1 relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                <Input
                  placeholder="Search delicious snacks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 h-14 bg-white/80 dark:bg-[#1C1D21]/80 backdrop-blur-xl border-slate-200 dark:border-white/5 rounded-2xl text-base font-bold focus-visible:ring-2 focus-visible:ring-orange-500/20 transition-all shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* Items Grid */}
          <ScrollArea className="flex-1">
            <div className="p-4 md:p-6 pb-20">
              <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                <AnimatePresence mode="popLayout">
                  {filteredItems.map((item, idx) => {
                    const count = getItemCount(item.id);
                    const isInCart = count > 0;
                    return (
                      <motion.button
                        key={item.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 25,
                          delay: Math.min(idx * 0.02, 0.2)
                        }}
                        onClick={() => addItem(item)}
                        className={cn(
                          "group relative h-32 flex flex-col justify-between p-4 rounded-3xl border-2 transition-all duration-300 text-left overflow-hidden",
                          isInCart
                            ? "bg-orange-50/50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900/50 shadow-md"
                            : "bg-white dark:bg-slate-800 border-slate-50 dark:border-slate-800 hover:border-orange-100 dark:hover:border-orange-900/30 shadow-sm"
                        )}
                      >
                        {/* Decorative Background Element */}
                        <div className="absolute top-0 right-0 -mr-4 -mt-4 h-12 w-12 rounded-full bg-orange-500/5 group-hover:bg-orange-500/10 transition-colors" />

                        {/* Quantity Badge */}
                        <AnimatePresence>
                          {isInCart && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.5, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.5, y: -10 }}
                              className="absolute top-3 right-3 h-5 min-w-[20px] px-1.5 rounded-full bg-orange-600 text-white text-[10px] font-black flex items-center justify-center shadow-lg z-20"
                            >
                              {count}
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="relative z-10 flex-1">
                          <h3 className={cn(
                            "font-extrabold text-sm leading-snug transition-colors line-clamp-2 uppercase tracking-tight",
                            isInCart ? "text-orange-900 dark:text-orange-100" : "text-slate-700 dark:text-slate-100 group-hover:text-orange-700 dark:group-hover:text-orange-400"
                          )}>
                            {item.name}
                          </h3>
                        </div>

                        <div className="relative z-10 mt-auto">
                          <div className="flex items-center">
                            <span className="text-[11px] font-black text-slate-400 mr-0.5">₹</span>
                            <span className={cn(
                              "text-lg font-black transition-colors tracking-tighter",
                              isInCart ? "text-orange-700 dark:text-orange-400" : "text-slate-900 dark:text-white"
                            )}>
                              {item.price}
                            </span>
                          </div>
                        </div>

                        {/* Plus Button in Corner */}
                        <div className={cn(
                          "absolute bottom-3 right-3 h-8 w-8 rounded-xl flex items-center justify-center text-white shadow-lg transition-all duration-300 z-20",
                          isInCart
                            ? "bg-orange-600 scale-110 shadow-orange-500/20"
                            : "bg-slate-900 dark:bg-slate-700 group-hover:bg-orange-600 group-hover:scale-110 shadow-slate-900/10 group-hover:shadow-orange-500/20"
                        )}>
                          <Plus className="h-5 w-5" strokeWidth={3.5} />
                        </div>
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              </div>

              {filteredItems.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                  <div className="h-16 w-16 rounded-3xl bg-slate-100 flex items-center justify-center mb-4">
                    <Search className="h-8 w-8 text-slate-400" />
                  </div>
                  <p className="text-slate-500 font-bold">No snacks found</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right Section: Order Ticket */}
        <div className="w-[340px] lg:w-[380px] xl:w-[420px] bg-white dark:bg-[#1C1D21] flex flex-col shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.1)] z-20 border-l border-slate-200/50 dark:border-white/5">
          {/* Ticket Header */}
          <div className="p-6 pb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400 text-[10px] font-black uppercase tracking-widest">
                Active Ticket
              </div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">New Order</h2>
              {lastBill && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.print()}
                  className="h-10 w-10 rounded-xl border-slate-200 dark:border-slate-700 hover:bg-orange-50 hover:text-orange-600 transition-all"
                  title="Reprint Bill"
                >
                  <Printer className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>

          <Separator className="mx-6 bg-slate-100 dark:bg-slate-800" />

          {/* Ticket Body: Items */}
          <ScrollArea className="flex-1 px-4">
            <div className="p-2 space-y-2.5">
              <AnimatePresence mode="popLayout" initial={false}>
                {billItems.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-16 text-center"
                  >
                    <div className="h-24 w-24 rounded-[2rem] bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center mb-5 rotate-3 border-2 border-dashed border-slate-200 dark:border-slate-700">
                      <ShoppingBag className="h-10 w-10 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-black text-slate-800 dark:text-white mb-1">Your cart is empty</h3>
                    <p className="text-xs text-slate-500 max-w-[180px] leading-relaxed font-medium">
                      Select items from the menu to start creating a new bill
                    </p>
                  </motion.div>
                ) : (
                  billItems.map(bi => (
                    <motion.div
                      key={bi.itemId}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10, scale: 0.95 }}
                      className="group flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-orange-200 dark:hover:border-orange-950 hover:shadow-sm transition-all"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <p className="font-extrabold text-sm text-slate-800 dark:text-white truncate uppercase tracking-tight">
                            {bi.itemName}
                          </p>
                          <p className="font-black text-sm text-slate-900 dark:text-white ml-2">
                            ₹{bi.total.toFixed(0)}
                          </p>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          ₹{bi.price} per unit
                        </p>
                      </div>

                      <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 rounded-xl p-0.5 border border-slate-100 dark:border-slate-700">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 hover:text-red-600 transition-all shadow-none"
                          onClick={() => updateQuantity(bi.itemId, -1)}
                        >
                          <Minus className="h-3.5 w-3.5" strokeWidth={3} />
                        </Button>
                        <span className="w-8 text-center font-black text-sm text-slate-800 dark:text-white tabular-nums">
                          {bi.quantity}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 hover:text-orange-600 transition-all shadow-none"
                          onClick={() => updateQuantity(bi.itemId, 1)}
                        >
                          <Plus className="h-3.5 w-3.5" strokeWidth={3} />
                        </Button>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </ScrollArea>

          {/* Ticket Footer: Payment */}
          <div className="p-6 bg-white dark:bg-slate-900 shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.05)] border-t border-slate-50 dark:border-slate-800">
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-bold uppercase tracking-widest">Subtotal ({itemCount} items)</span>
                <span className="text-sm font-black">₹{grandTotal.toFixed(0)}</span>
              </div>

              <div className="flex items-baseline justify-between py-2 border-y border-dashed border-slate-200 dark:border-slate-800">
                <span className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">Total Amount</span>
                <div className="flex flex-col items-end">
                  <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                    ₹{grandTotal.toFixed(0)}
                  </span>
                  <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest mt-1">Inclusive of all taxes</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => saveBill('cash')}
                disabled={billItems.length === 0}
                className="group h-16 min-h-[64px] rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <div className="flex flex-col items-center gap-1">
                  <Banknote className="h-6 w-6 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Accept Cash</span>
                </div>
              </Button>

              <Button
                onClick={() => saveBill('upi')}
                disabled={billItems.length === 0}
                className="group h-16 min-h-[64px] rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <div className="flex flex-col items-center gap-1">
                  <Smartphone className="h-6 w-6 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-widest">UPI Scan</span>
                </div>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <PrintReceipt bill={lastBill} />
    </>
  );
}
