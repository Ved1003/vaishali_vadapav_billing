
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getActiveItemsApi, getActiveFridgeItemsApi, createBillApi } from '@/services/api';
import { Item, BillItem, Bill, FridgeItem } from '@/types';
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
    ShoppingCart,
    X,
    ChevronDown,
    Trash2,
    Refrigerator,
    RefreshCcw,
} from 'lucide-react';
import { printBill } from '@/utils/printBill';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function BillingScreen() {
    const [items, setItems] = useState<Item[]>([]);
    const [fridgeItems, setFridgeItems] = useState<FridgeItem[]>([]);
    const [billItems, setBillItems] = useState<BillItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [cartOpen, setCartOpen] = useState(false);
    const { user } = useAuth();
    const { toast } = useToast();
    const [lastBill, setLastBill] = useState<Bill | null>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    // Pull to refresh state
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullProgress, setPullProgress] = useState(0);
    const touchStartY = useRef(0);

    const loadMenu = async () => {
        try {
            const [its, fridge] = await Promise.all([getActiveItemsApi(), getActiveFridgeItemsApi()]);
            setItems(its);
            setFridgeItems(fridge);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        loadMenu().finally(() => setIsLoading(false));
    }, []);

    // ── Pull to refresh handlers ────────────────────────────
    const handleTouchStart = (e: React.TouchEvent) => {
        const viewport = document.querySelector('[data-radix-scroll-area-viewport]');
        // Only trigger pull to refresh if we are at the very top of the scroll view
        if (!viewport || viewport.scrollTop <= 0) {
            touchStartY.current = e.touches[0].clientY;
        } else {
            touchStartY.current = 0;
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!touchStartY.current || isRefreshing) return;
        const currentY = e.touches[0].clientY;
        const diff = currentY - touchStartY.current;

        if (diff > 0) {
            // Apply some resistance
            setPullProgress(Math.min(diff * 0.5, 80));
        }
    };

    const handleTouchEnd = () => {
        if (!touchStartY.current || isRefreshing) return;

        if (pullProgress > 50) {
            setIsRefreshing(true);
            setPullProgress(80); // lock at refresh position
            loadMenu().finally(() => {
                setIsRefreshing(false);
                setPullProgress(0);
            });
        } else {
            setPullProgress(0);
        }
        touchStartY.current = 0;
    };

    // Close cart when tapping outside (backdrop)
    useEffect(() => {
        if (cartOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [cartOpen]);

    const searchLower = useMemo(() => searchQuery.toLowerCase(), [searchQuery]);
    const filteredItems = useMemo(() =>
        items.filter(item => item.name.toLowerCase().includes(searchLower)),
        [items, searchLower]
    );
    const filteredFridgeItems = useMemo(() =>
        fridgeItems.filter(fi => fi.name.toLowerCase().includes(searchLower)),
        [fridgeItems, searchLower]
    );

    const addItem = useCallback((item: Item) => {
        setBillItems(prev => {
            const existing = prev.find(bi => bi.itemId === item.id);
            if (existing) {
                return prev.map(bi =>
                    bi.itemId === item.id
                        ? { ...bi, quantity: bi.quantity + 1, total: (bi.quantity + 1) * bi.price }
                        : bi
                );
            }
            return [...prev, {
                id: `temp-${Date.now()}`,
                itemId: item.id,
                itemName: item.name,
                quantity: 1,
                price: item.price,
                total: item.price,
            }];
        });
    }, []);

    const addFridgeItem = useCallback((item: any) => {
        const itemId = item.id || item._id;
        if (item.stock === 0) {
            toast({ title: `${item.name} is out of stock`, variant: 'destructive' }); return;
        }
        setBillItems(prev => {
            const existing = prev.find(bi => bi.itemId === itemId && bi.isFridgeItem);
            if (existing) {
                if (existing.quantity >= item.stock) {
                    toast({ title: `Only ${item.stock} left in stock`, variant: 'destructive' });
                    return prev;
                }
                return prev.map(bi =>
                    (bi.itemId === itemId && bi.isFridgeItem)
                        ? { ...bi, quantity: bi.quantity + 1, total: (bi.quantity + 1) * bi.price }
                        : bi
                );
            }
            return [...prev, {
                id: `fridge-${Date.now()}`,
                itemId: itemId,
                itemName: item.name,
                quantity: 1,
                price: item.price,
                total: item.price,
                isFridgeItem: true,
            }];
        });
    }, [toast]);

    const updateQuantity = useCallback((itemId: string, delta: number) => {
        setBillItems(prev => prev.map(bi => {
            if (bi.itemId === itemId) {
                const newQty = Math.max(0, bi.quantity + delta);
                return newQty === 0 ? null : { ...bi, quantity: newQty, total: newQty * bi.price };
            }
            return bi;
        }).filter(Boolean) as BillItem[]);
    }, []);

    const clearCart = useCallback(() => {
        setBillItems([]);
    }, []);

    const grandTotal = useMemo(() => billItems.reduce((sum, bi) => sum + bi.total, 0), [billItems]);
    const itemCount = useMemo(() => billItems.reduce((sum, bi) => sum + bi.quantity, 0), [billItems]);

    const saveBill = async (paymentMode: 'cash' | 'upi') => {
        if (billItems.length === 0) {
            toast({ title: 'Add items to bill first', variant: 'destructive' });
            return;
        }
        setIsSaving(true);
        try {
            const bill = await createBillApi({
                items: billItems,
                totalAmount: grandTotal,
                paymentMode,
                billerId: user!.id,
                billerName: user!.name,
            });

            toast({
                title: '✅ Bill Created',
                description: `Bill #${bill.billNumber} – ₹${grandTotal.toFixed(2)}`,
                className: 'bg-gradient-to-r from-green-600 to-emerald-600 text-white border-none',
            });

            setBillItems([]);
            setLastBill(bill);
            setCartOpen(false);

            // Use printBill utility (works in Capacitor Android WebView, unlike window.print)
            setTimeout(() => printBill(bill), 300);
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            toast({ title: 'Failed to create bill', description: msg, variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    // Memoized item count map to avoid O(n) lookup per card render
    const itemCountMap = useMemo(() => {
        const map: Record<string, number> = {};
        for (const bi of billItems) {
            if (!bi.isFridgeItem) map[bi.itemId] = bi.quantity;
        }
        return map;
    }, [billItems]);
    const getItemCount = useCallback((itemId: string) => itemCountMap[itemId] || 0, [itemCountMap]);

    // Memoized fridge count map
    const fridgeCountMap = useMemo(() => {
        const map: Record<string, number> = {};
        for (const bi of billItems) {
            if (bi.isFridgeItem) map[bi.itemId] = bi.quantity;
        }
        return map;
    }, [billItems]);

    // ── Loading state ──────────────────────────────────────
    if (isLoading) return (
        <div className="flex items-center justify-center h-full bg-gradient-to-br from-orange-50 to-amber-50 dark:from-slate-950 dark:to-slate-900">
            <div className="flex flex-col items-center gap-4">
                <div className="h-14 w-14 rounded-full border-4 border-orange-200 dark:border-orange-900 border-t-orange-600 dark:border-t-orange-500 animate-spin" />
                <p className="text-slate-600 dark:text-slate-400 font-bold text-sm animate-pulse">Loading Menu…</p>
            </div>
        </div>
    );

    return (
        <>
            {/* ── FULL-SCREEN ITEMS VIEW ──────────────────────── */}
            <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">

                {/* Search bar */}
                <div className="px-3 pt-3 pb-2">
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            ref={searchRef}
                            placeholder="Search snacks…"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="pl-10 h-11 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm font-medium transition-colors"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 active:scale-90 transition-transform"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Pull to refresh indicator ── */}
                <div
                    className="flex justify-center overflow-hidden transition-all duration-200"
                    style={{ height: `${pullProgress}px`, opacity: pullProgress / 80 }}
                >
                    <div className="flex items-center gap-2 text-slate-500 pt-4">
                        <RefreshCcw className={cn("h-5 w-5", isRefreshing ? "animate-spin text-orange-500" : "")}
                            style={{ transform: `rotate(${pullProgress * 3}deg)` }}
                        />
                        <span className="text-xs font-bold">{isRefreshing ? 'Refreshing...' : 'Release to refresh'}</span>
                    </div>
                </div>

                {/* Items grid – full screen, scrollable */}
                <ScrollArea
                    className="flex-1"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    {/* Extra bottom padding so last row isn't hidden behind floating button */}
                    <div className="px-3 pb-28">
                        <div className="grid grid-cols-2 gap-2.5">
                            <AnimatePresence mode="popLayout">
                                {filteredItems.map((item, idx) => {
                                    const count = getItemCount(item.id);
                                    return (
                                        <motion.button
                                            key={item.id}
                                            layout
                                            initial={{ opacity: 0, scale: 0.92 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.88 }}
                                            transition={{ type: 'spring', stiffness: 320, damping: 26, delay: Math.min(idx * 0.015, 0.12) }}
                                            onClick={() => addItem(item)}
                                            className={cn(
                                                'relative flex flex-col justify-between p-3.5 rounded-2xl border-2 text-left overflow-hidden active:scale-95 transition-all touch-manipulation min-h-[100px]',
                                                count > 0
                                                    ? 'bg-orange-50 dark:bg-orange-950/40 border-orange-400 shadow-md shadow-orange-100 dark:shadow-orange-900/20'
                                                    : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm hover:border-orange-200 dark:hover:border-orange-900/50'
                                            )}
                                        >
                                            {/* Count badge */}
                                            <AnimatePresence>
                                                {count > 0 && (
                                                    <motion.div
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        exit={{ scale: 0 }}
                                                        className="absolute top-2.5 right-2.5 h-5 min-w-[20px] px-1 rounded-full bg-orange-600 text-white text-[10px] font-black flex items-center justify-center z-10"
                                                    >
                                                        {count}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            <p className={cn(
                                                'font-extrabold text-sm leading-snug line-clamp-2 uppercase tracking-tight pr-6',
                                                count > 0 ? 'text-orange-900 dark:text-orange-100' : 'text-slate-700 dark:text-slate-200'
                                            )}>
                                                {item.name}
                                            </p>

                                            <div className="flex items-center justify-between mt-2">
                                                <span className={cn('text-xl font-black tracking-tight', count > 0 ? 'text-orange-700 dark:text-orange-400' : 'text-slate-900 dark:text-white')}>
                                                    ₹{item.price}
                                                </span>
                                                <div className={cn(
                                                    'h-8 w-8 rounded-xl flex items-center justify-center text-white shadow transition-colors',
                                                    count > 0 ? 'bg-orange-600' : 'bg-slate-800 dark:bg-slate-700'
                                                )}>
                                                    <Plus className="h-4 w-4" strokeWidth={3} />
                                                </div>
                                            </div>
                                        </motion.button>
                                    );
                                })}
                            </AnimatePresence>
                        </div>

                        {/* ── FRIDGE SECTION ───────────────────────────────── */}
                        {fridgeItems.length > 0 && (
                            <div className="mt-8 mb-4">
                                <div className="flex items-center gap-3 px-1 mb-4">
                                    <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
                                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                                        <Refrigerator className="h-4 w-4" />
                                        <span className="text-xs font-black uppercase tracking-widest">Fridge</span>
                                    </div>
                                    <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
                                </div>
                                <div className="grid grid-cols-2 gap-2.5">
                                    {filteredFridgeItems.map((item: any, idx) => {
                                        const itemId = item.id || item._id;
                                        const count = fridgeCountMap[itemId] || 0;
                                        const isOut = item.stock === 0;
                                        return (
                                            <motion.button
                                                key={`fridge-${itemId}`}
                                                layout
                                                initial={{ opacity: 0, scale: 0.92 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ type: 'spring', stiffness: 320, damping: 26, delay: Math.min(idx * 0.015, 0.12) }}
                                                onClick={() => addFridgeItem(item)}
                                                disabled={isOut}
                                                className={cn(
                                                    'relative flex flex-col justify-between p-3.5 rounded-2xl border-2 text-left overflow-hidden active:scale-95 transition-all touch-manipulation min-h-[100px]',
                                                    count > 0 ? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-400 shadow-md shadow-cyan-100 dark:shadow-cyan-900/20' :
                                                        isOut ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800/50 opacity-60 grayscale' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm hover:border-cyan-200 dark:hover:border-cyan-900/50'
                                                )}
                                            >
                                                <AnimatePresence>
                                                    {count > 0 && (
                                                        <motion.div
                                                            initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                                                            className="absolute top-2.5 right-2.5 h-5 min-w-[20px] px-1 rounded-full bg-cyan-600 text-white text-[10px] font-black flex items-center justify-center z-10"
                                                        >
                                                            {count}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>

                                                <div>
                                                    <p className={cn(
                                                        'font-extrabold text-sm leading-snug line-clamp-2 uppercase tracking-tight pr-6',
                                                        count > 0 ? 'text-cyan-900 dark:text-cyan-100' : 'text-slate-700 dark:text-slate-200'
                                                    )}>
                                                        {item.name}
                                                    </p>
                                                    {item.stock > 0 && item.stock <= item.lowStockThreshold && (
                                                        <p className="text-[9px] font-black text-amber-600 dark:text-amber-500 mt-0.5">Only {item.stock} left</p>
                                                    )}
                                                </div>

                                                <div className="flex items-center justify-between mt-2">
                                                    <span className={cn('text-xl font-black tracking-tight', count > 0 ? 'text-cyan-700 dark:text-cyan-400' : 'text-slate-900 dark:text-white')}>
                                                        ₹{item.price}
                                                    </span>
                                                    <div className={cn(
                                                        'h-8 w-8 rounded-xl flex items-center justify-center text-white shadow transition-colors',
                                                        isOut ? 'bg-slate-300 dark:bg-slate-700 shadow-none' : count > 0 ? 'bg-cyan-600' : 'bg-slate-800 dark:bg-slate-700'
                                                    )}>
                                                        {isOut ? <X className="h-4 w-4 text-slate-500 dark:text-slate-400" /> : <Plus className="h-4 w-4" strokeWidth={3} />}
                                                    </div>
                                                </div>
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {filteredItems.length === 0 && filteredFridgeItems.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 opacity-50">
                                <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                                    <Search className="h-7 w-7 text-slate-400" />
                                </div>
                                <p className="text-slate-500 font-bold text-sm">No items found</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* ── FLOATING CART BUTTON ──────────────────────────── */}
            <AnimatePresence>
                {
                    itemCount > 0 && !cartOpen && (
                        <motion.button
                            initial={{ y: 80, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 80, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            onClick={() => setCartOpen(true)}
                            className="fixed bottom-5 left-4 right-4 z-40 flex items-center justify-between bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-2xl px-5 py-4 shadow-2xl shadow-orange-500/40 touch-manipulation active:scale-[0.98] transition-transform"
                        >
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 bg-white/20 rounded-xl flex items-center justify-center">
                                    <ShoppingCart className="h-4 w-4" />
                                </div>
                                <div className="text-left">
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Your Cart</p>
                                    <p className="text-sm font-black">{itemCount} {itemCount === 1 ? 'item' : 'items'}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Total</p>
                                <p className="text-xl font-black tracking-tight">₹{grandTotal.toFixed(0)}</p>
                            </div>
                        </motion.button>
                    )
                }
            </AnimatePresence >

            {/* ── REPRINT BUTTON (after bill saved, no items in cart) ─ */}
            <AnimatePresence>
                {
                    lastBill && itemCount === 0 && (
                        <motion.button
                            initial={{ y: 80, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 80, opacity: 0 }}
                            onClick={() => lastBill && printBill(lastBill)}
                            className="fixed bottom-5 right-4 z-40 flex items-center gap-2 bg-slate-800 text-white rounded-2xl px-4 py-3 shadow-xl touch-manipulation active:scale-95 transition-transform"
                        >
                            <Printer className="h-4 w-4" />
                            <span className="text-xs font-black uppercase tracking-widest">Reprint</span>
                        </motion.button>
                    )
                }
            </AnimatePresence >

            {/* ── CART BOTTOM SHEET ─────────────────────────────── */}
            <AnimatePresence>
                {
                    cartOpen && (
                        <>
                            {/* Backdrop */}
                            <motion.div
                                key="cart-backdrop"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
                                onClick={() => setCartOpen(false)}
                            />

                            {/* Sheet */}
                            <motion.div
                                key="cart-sheet"
                                initial={{ y: '100%' }}
                                animate={{ y: 0 }}
                                exit={{ y: '100%' }}
                                transition={{ type: 'spring', stiffness: 400, damping: 38 }}
                                className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.3)] flex flex-col"
                                style={{ maxHeight: '88vh' }}
                            >
                                {/* Sheet handle */}
                                <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                                    <div className="h-1.5 w-10 rounded-full bg-slate-200 dark:bg-slate-700" />
                                </div>

                                {/* Cart header */}
                                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
                                    <div>
                                        <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Your Order</h2>
                                        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">{itemCount} {itemCount === 1 ? 'item' : 'items'} · ₹{grandTotal.toFixed(0)}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {billItems.length > 0 && (
                                            <button
                                                onClick={clearCart}
                                                className="flex items-center gap-1.5 text-red-500 dark:text-red-400 text-xs font-bold px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-500/10 active:scale-95 transition-transform"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                                Clear
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setCartOpen(false)}
                                            className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 active:scale-90 transition-transform"
                                        >
                                            <ChevronDown className="h-4 w-4" strokeWidth={2.5} />
                                        </button>
                                    </div>
                                </div>

                                {/* Cart items – scrollable */}
                                <div className="flex-1 min-h-[150px] overflow-y-auto overscroll-contain custom-scrollbar">
                                    <div className="px-4 py-3 space-y-2">
                                        <AnimatePresence mode="popLayout" initial={false}>
                                            {billItems.length === 0 ? (
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    className="flex flex-col items-center justify-center py-10 text-center"
                                                >
                                                    <div className="h-16 w-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-3 border-2 border-dashed border-slate-200">
                                                        <ShoppingBag className="h-8 w-8 text-slate-300" />
                                                    </div>
                                                    <p className="text-sm font-black text-slate-700 mb-1">Cart empty</p>
                                                    <p className="text-xs text-slate-400 font-medium">Go back and tap items to add</p>
                                                </motion.div>
                                            ) : (
                                                billItems.map(bi => (
                                                    <motion.div
                                                        key={bi.itemId}
                                                        layout
                                                        initial={{ opacity: 0, x: -12 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, scale: 0.9 }}
                                                        className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm"
                                                    >
                                                        {/* Item info */}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-extrabold text-sm text-slate-800 dark:text-white truncate uppercase">{bi.itemName}</p>
                                                            <p className="text-xs text-slate-400 dark:text-slate-500 font-bold mt-0.5">₹{bi.price} × {bi.quantity} = <span className="text-slate-600 dark:text-slate-300">₹{bi.total}</span></p>
                                                        </div>

                                                        {/* Quantity controls */}
                                                        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900/50 rounded-xl p-0.5 border border-slate-100 dark:border-slate-800 flex-shrink-0">
                                                            <button
                                                                className="h-9 w-9 flex items-center justify-center rounded-lg text-red-500 active:bg-red-100 dark:active:bg-red-950/30 touch-manipulation"
                                                                onClick={() => updateQuantity(bi.itemId, -1)}
                                                            >
                                                                <Minus className="h-4 w-4" strokeWidth={3} />
                                                            </button>
                                                            <span className="w-7 text-center font-black text-base text-slate-800 dark:text-white tabular-nums">{bi.quantity}</span>
                                                            <button
                                                                className="h-9 w-9 flex items-center justify-center rounded-lg text-orange-600 dark:text-orange-500 active:bg-orange-100 dark:active:bg-orange-950/30 touch-manipulation"
                                                                onClick={() => updateQuantity(bi.itemId, 1)}
                                                            >
                                                                <Plus className="h-4 w-4" strokeWidth={3} />
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                ))
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                {/* Total + Pay buttons – always visible at bottom */}
                                <div className="px-4 pt-3 pb-6 border-t border-slate-100 dark:border-slate-800 flex-shrink-0 safe-bottom bg-white dark:bg-slate-900 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
                                    {/* Total row */}
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Grand Total</span>
                                        <span className="text-3xl font-black tracking-tighter text-gradient-orange">₹{grandTotal.toFixed(0)}</span>
                                    </div>

                                    {/* Pay buttons */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <Button
                                            onClick={() => saveBill('cash')}
                                            disabled={billItems.length === 0 || isSaving}
                                            className="h-[60px] rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black shadow-lg active:scale-95 disabled:opacity-40 touch-manipulation transition-transform"
                                        >
                                            {isSaving ? (
                                                <span className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                            ) : (
                                                <div className="flex flex-col items-center gap-0.5">
                                                    <Banknote className="h-5 w-5" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Cash</span>
                                                </div>
                                            )}
                                        </Button>

                                        <Button
                                            onClick={() => saveBill('upi')}
                                            disabled={billItems.length === 0 || isSaving}
                                            className="h-[60px] rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/30 active:scale-95 disabled:opacity-40 touch-manipulation transition-transform"
                                        >
                                            {isSaving ? (
                                                <span className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                            ) : (
                                                <div className="flex flex-col items-center gap-0.5">
                                                    <Smartphone className="h-5 w-5" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">UPI</span>
                                                </div>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        </>
                    )
                }
            </AnimatePresence >

        </>
    );
}
