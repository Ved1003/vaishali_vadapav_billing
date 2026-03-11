
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
} from 'lucide-react';
import { printBill } from '@/utils/printBill';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';
import vadapavIcon from '@/assets/images/vadapav-icon.png';

const BillingSkeleton = () => (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 px-3 pt-3">
        <div className="h-11 w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse mb-4" />
        <div className="flex gap-2 overflow-hidden mb-6">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-8 w-20 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse flex-shrink-0" />
            ))}
        </div>
        <div className="grid grid-cols-2 gap-2.5">
            {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-28 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 animate-pulse" />
            ))}
        </div>
    </div>
);


// Memoized Item Card for Grid performance
const ItemCard = React.memo(React.forwardRef(({
    item,
    count,
    idx,
    onAdd
}: {
    item: Item;
    count: number;
    idx: number;
    onAdd: (item: Item, e: React.MouseEvent | React.TouchEvent) => void
}, ref: React.ForwardedRef<HTMLButtonElement>) => {
    return (
        <motion.button
            ref={ref}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.88 }}
            transition={{
                duration: 0.4,
                delay: Math.min(idx * 0.03, 0.15),
                ease: [0.23, 1, 0.32, 1]
            }}
            onClick={(e) => onAdd(item, e)}
            style={{ transform: 'translateZ(0)', willChange: 'transform' }}
            className={cn(
                'relative flex flex-col justify-between p-3.5 rounded-2xl border-2 text-left overflow-hidden active:scale-95 transition-all touch-manipulation min-h-[100px]',
                count > 0
                    ? 'bg-orange-50 dark:bg-orange-950/40 border-orange-400 shadow-md shadow-orange-100 dark:shadow-orange-900/20'
                    : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm hover:border-orange-200 dark:hover:border-orange-900/50'
            )}
        >
            <AnimatePresence>
                {count > 0 && (
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        transition={{ duration: 0.2 }}
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
                    'h-8 w-8 rounded-xl flex items-center justify-center text-white shadow transition-all duration-300',
                    count > 0 ? 'bg-orange-600 rotate-0' : 'bg-slate-800 dark:bg-slate-700'
                )}>
                    <Plus className={cn("h-4 w-4 transition-transform duration-300", count > 0 ? "scale-0" : "scale-100")} strokeWidth={3} />
                    {count > 0 && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute"><Plus className="h-4 w-4" strokeWidth={4} /></motion.div>}
                </div>
            </div>
        </motion.button>
    );
}));
ItemCard.displayName = 'ItemCard';

const FridgeItemCard = React.memo(React.forwardRef(({
    item,
    count,
    idx,
    onAdd
}: {
    item: any;
    count: number;
    idx: number;
    onAdd: (item: any, e: React.MouseEvent | React.TouchEvent) => void
}, ref: React.ForwardedRef<HTMLButtonElement>) => {
    const isOut = item.stock === 0;
    return (
        <motion.button
            ref={ref}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
                duration: 0.4,
                delay: Math.min(idx * 0.03, 0.15),
                ease: [0.23, 1, 0.32, 1]
            }}
            onClick={(e) => onAdd(item, e)}
            disabled={isOut}
            style={{ transform: 'translateZ(0)', willChange: 'transform' }}
            className={cn(
                'relative flex flex-col justify-between p-3.5 rounded-2xl border-2 text-left overflow-hidden active:scale-95 transition-all touch-manipulation min-h-[100px]',
                count > 0 ? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-400 shadow-md shadow-cyan-100 dark:shadow-cyan-900/20' :
                    isOut ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800/50 opacity-60 grayscale' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm hover:border-cyan-200 dark:hover:cyan-900/50'
            )}
        >
            <AnimatePresence>
                {count > 0 && (
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        transition={{ duration: 0.2 }}
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
}));
FridgeItemCard.displayName = 'FridgeItemCard';

const CartItem = React.memo(React.forwardRef(({ bi, onUpdateQuantity }: { bi: BillItem, onUpdateQuantity: (id: string, d: number) => void }, ref: React.ForwardedRef<HTMLDivElement>) => (
    <div ref={ref} className="relative overflow-hidden rounded-2xl h-[74px]">
        <div className="absolute inset-0 bg-red-500 flex justify-end items-center px-6">
            <Trash2 className="text-white h-5 w-5" />
        </div>
        <motion.div
            layout="position"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, x: -100 }}
            drag="x"
            dragConstraints={{ left: -100, right: 0 }}
            dragElastic={0.05}
            dragSnapToOrigin
            onDragEnd={(_, info) => {
                if (info.offset.x < -60 || info.velocity.x < -300) {
                    onUpdateQuantity(bi.itemId, -bi.quantity);
                }
            }}
            whileDrag={{ scale: 1.02, zIndex: 10 }}
            transition={{ type: "spring", stiffness: 500, damping: 35, mass: 0.5 }}
            style={{ transform: 'translateZ(0)', willChange: 'transform' }}
            className="relative z-10 h-full flex items-center gap-3 p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm touch-pan-y"
        >
            <div className="flex-1 min-w-0">
                <p className="font-extrabold text-sm text-slate-800 dark:text-white truncate uppercase leading-none">{bi.itemName}</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-bold mt-1">₹{bi.price} × {bi.quantity} = <span className="text-slate-600 dark:text-slate-300 font-black">₹{bi.total}</span></p>
            </div>
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900/50 rounded-xl p-0.5 border border-slate-100 dark:border-slate-800">
                <button
                    className="h-8 w-8 flex items-center justify-center rounded-lg text-red-500 active:bg-red-100 touch-manipulation transition-colors"
                    onClick={() => onUpdateQuantity(bi.itemId, -1)}
                >
                    <Minus className="h-3.5 w-3.5" strokeWidth={3} />
                </button>
                <span className="w-6 text-center font-black text-sm text-slate-800 dark:text-white tabular-nums">{bi.quantity}</span>
                <button
                    className="h-8 w-8 flex items-center justify-center rounded-lg text-orange-600 active:bg-orange-100 touch-manipulation transition-colors"
                    onClick={() => onUpdateQuantity(bi.itemId, 1)}
                >
                    <Plus className="h-3.5 w-3.5" strokeWidth={3} />
                </button>
            </div>
        </motion.div>
    </div>
)));
CartItem.displayName = 'CartItem';


// Standalone Animation Layer to prevent main screen re-renders
const AnimationLayer = React.memo(({
    flyingItems
}: {
    flyingItems: { id: number; x: number; y: number; name: string }[]
}) => {
    return (
        <AnimatePresence>
            {flyingItems.map(f => (
                <motion.div
                    key={f.id}
                    initial={{
                        position: 'fixed',
                        left: f.x,
                        top: f.y,
                        x: '-50%',
                        y: '-50%',
                        scale: 1,
                        opacity: 1,
                        zIndex: 9999
                    }}
                    animate={{
                        left: '50%',
                        top: typeof window !== 'undefined' ? window.innerHeight - 50 : 800,
                        scale: 0.1,
                        opacity: 0,
                    }}
                    transition={{
                        duration: 0.7,
                        ease: [0.23, 1, 0.32, 1]
                    }}
                    style={{ transform: 'translateZ(0)', willChange: 'transform' }}
                    className="pointer-events-none whitespace-nowrap"
                >
                    <span className="bg-orange-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase shadow-lg border border-orange-400">
                        {f.name}
                    </span>
                </motion.div>
            ))}
        </AnimatePresence>
    );
});
AnimationLayer.displayName = 'AnimationLayer';

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
    const [selectedCategory, setSelectedCategory] = useState<string>('⭐ Popular');
    const [pulse, setPulse] = useState(false);
    const [flyingItems, setFlyingItems] = useState<{ id: number; x: number; y: number; name: string }[]>([]);
    const searchRef = useRef<HTMLInputElement>(null);

    // Pull to refresh state
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullProgress, setPullProgress] = useState(0);
    const touchStartY = useRef(0);

    const loadMenu = async () => {
        try {
            const cachedItems = localStorage.getItem('__cached_items');
            const cachedFridge = localStorage.getItem('__cached_fridge');
            
            if (cachedItems) setItems(JSON.parse(cachedItems));
            if (cachedFridge) setFridgeItems(JSON.parse(cachedFridge));
            
            // If cache exists, app is instantly ready without blocking
            if (cachedItems) setIsLoading(false);

            const [its, fridge] = await Promise.all([getActiveItemsApi(), getActiveFridgeItemsApi()]);
            
            setItems(its);
            setFridgeItems(fridge);
            
            localStorage.setItem('__cached_items', JSON.stringify(its));
            localStorage.setItem('__cached_fridge', JSON.stringify(fridge));
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadMenu();
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
    const categories = useMemo(() => {
        const cats = new Set(items.map(i => i.category || 'Other'));
        const list = Array.from(cats).sort();
        const finalCats = ['All', '⭐ Popular', ...list];
        return finalCats;
    }, [items]);

    const popularItems = useMemo(() => {
        // Sort by soldCount descending, pick top 4
        return [...items].sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0)).slice(0, 4);
    }, [items]);

    const filteredItems = useMemo(() => {
        if (selectedCategory === '⭐ Popular') return popularItems;
        return items.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchLower);
            const matchesCategory = selectedCategory === 'All' || (item.category || 'Other') === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [items, searchLower, selectedCategory, popularItems]);

    const filteredFridgeItems = useMemo(() =>
        fridgeItems.filter(fi => {
            const matchesSearch = fi.name.toLowerCase().includes(searchLower);
            return matchesSearch && (selectedCategory === 'All' || selectedCategory === 'Fridge' ? matchesSearch : false);
        }),
        [fridgeItems, searchLower, selectedCategory]
    );

    const addItem = useCallback((item: Item, e?: React.MouseEvent | React.TouchEvent) => {
        setPulse(true);
        setTimeout(() => setPulse(false), 300);

        if (e && 'currentTarget' in e) {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const id = Date.now() + Math.random();
            setFlyingItems(prev => [...prev, {
                id,
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
                name: item.name
            }]);
            setTimeout(() => {
                setFlyingItems(prev => prev.filter(f => f.id !== id));
            }, 800);
        }

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

    const addFridgeItem = useCallback((item: any, e?: React.MouseEvent | React.TouchEvent) => {
        const itemId = item.id || item._id;
        if (item.stock === 0) {
            toast({ title: `${item.name} is out of stock`, variant: 'destructive' }); return;
        }
        setPulse(true);
        setTimeout(() => setPulse(false), 300);

        if (e && 'currentTarget' in e) {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const id = Date.now() + Math.random();
            setFlyingItems(prev => [...prev, {
                id,
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
                name: item.name
            }]);
            setTimeout(() => {
                setFlyingItems(prev => prev.filter(f => f.id !== id));
            }, 800);
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

            // Celebration!
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.8 },
                colors: ['#f97316', '#fbbf24', '#ffffff']
            });

            // Trigger print immediately for maximum speed during rush hours
            printBill(bill);
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
    if (isLoading) return <BillingSkeleton />;

    return (
        <>
            {/* ── FULL-SCREEN ITEMS VIEW ──────────────────────── */}
            <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">

                {/* Search bar */}
                <div className="px-3 pt-3 pb-1">
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

                {/* Categories */}
                <div className="px-3 py-2 overflow-x-auto no-scrollbar flex items-center gap-2 whitespace-nowrap">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={cn(
                                "px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all border",
                                selectedCategory === cat
                                    ? "bg-orange-600 border-orange-600 text-white shadow-md shadow-orange-500/20"
                                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400"
                            )}
                        >
                            {cat}
                        </button>
                    ))}
                    {fridgeItems.length > 0 && (
                        <button
                            onClick={() => setSelectedCategory('Fridge')}
                            className={cn(
                                "px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all border flex items-center gap-1.5",
                                selectedCategory === 'Fridge'
                                    ? "bg-cyan-600 border-cyan-600 text-white shadow-md shadow-cyan-500/20"
                                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400"
                            )}
                        >
                            <Refrigerator className="h-3 w-3" />
                            Fridge
                        </button>
                    )}
                </div>

                {/* ── Pull to refresh indicator (Snack Themed) ── */}
                <div
                    className="flex justify-center overflow-hidden transition-all duration-200 pointer-events-none"
                    style={{ height: `${pullProgress}px`, opacity: pullProgress / 80 }}
                >
                    <div className="flex flex-col items-center gap-1 pt-2">
                        <motion.img
                            src={vadapavIcon}
                            className="h-10 w-10 object-contain drop-shadow-sm"
                            animate={isRefreshing ? {
                                rotate: [0, 15, -15, 0],
                                y: [0, -12, 0],
                                scale: [1, 1.15, 1]
                            } : {
                                rotate: pullProgress * 4.5,
                                scale: 0.5 + (pullProgress / 160)
                            }}
                            transition={isRefreshing ? {
                                duration: 0.8,
                                repeat: Infinity,
                                ease: "easeInOut"
                            } : { duration: 0 }}
                        />
                        <motion.span
                            animate={isRefreshing ? { opacity: [1, 0.5, 1] } : {}}
                            transition={{ duration: 1, repeat: Infinity }}
                            className="text-[10px] font-black uppercase tracking-tighter text-orange-500/80"
                        >
                            {isRefreshing ? 'Loading Snacks...' : 'Pull for Vadapav'}
                        </motion.span>
                    </div>
                </div>

                {/* Items grid – full screen, scrollable */}
                <ScrollArea
                    className="flex-1"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    style={{ transform: 'translateZ(0)', willChange: 'scroll-position' }}
                >
                    {/* Extra bottom padding so last row isn't hidden behind floating button */}
                    <div className="px-3 pb-28">
                        <div className="grid grid-cols-2 gap-2.5">
                            <AnimatePresence mode="popLayout">
                                {filteredItems.map((item, idx) => (
                                    <ItemCard
                                        key={item.id}
                                        item={item}
                                        count={getItemCount(item.id)}
                                        idx={idx}
                                        onAdd={addItem}
                                    />
                                ))}
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
                                    {filteredFridgeItems.map((item: any, idx) => (
                                        <FridgeItemCard
                                            key={`fridge-${item.id || item._id}`}
                                            item={item}
                                            count={fridgeCountMap[item.id || item._id] || 0}
                                            idx={idx}
                                            onAdd={addFridgeItem}
                                        />
                                    ))}
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
                            initial={{ y: 100, opacity: 0 }}
                            animate={{
                                y: 0,
                                opacity: 1,
                                scale: pulse ? [1, 1.05, 1] : 1
                            }}
                            exit={{ y: 100, opacity: 0 }}
                            transition={{
                                duration: 0.2,
                                ease: [0.22, 1, 0.36, 1]
                            }}
                            whileTap={{ scale: 0.95 }}
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
                                <div className="h-7 overflow-hidden relative flex justify-end">
                                    <AnimatePresence mode="popLayout" initial={false}>
                                        <motion.p
                                            key={grandTotal}
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            exit={{ y: -20, opacity: 0 }}
                                            transition={{ duration: 0.2, ease: "easeOut" }}
                                            className="text-xl font-black tracking-tight"
                                        >
                                            ₹{grandTotal.toFixed(0)}
                                        </motion.p>
                                    </AnimatePresence>
                                </div>
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
                                transition={{
                                    duration: 0.25,
                                    ease: [0.22, 1, 0.36, 1]
                                }}
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
                                                    key="empty"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
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
                                                    <CartItem key={bi.itemId} bi={bi} onUpdateQuantity={updateQuantity} />
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
                                        <div className="overflow-hidden h-10 relative flex items-center">
                                            <AnimatePresence mode="popLayout" initial={false}>
                                                <motion.span
                                                    key={grandTotal}
                                                    initial={{ y: 30, opacity: 0 }}
                                                    animate={{ y: 0, opacity: 1 }}
                                                    exit={{ y: -30, opacity: 0 }}
                                                    transition={{ duration: 0.3, ease: "easeOut" }}
                                                    className="text-3xl font-black tracking-tighter text-gradient-orange"
                                                >
                                                    ₹{grandTotal.toFixed(0)}
                                                </motion.span>
                                            </AnimatePresence>
                                        </div>
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

            {/* ── FLYING ITEMS ANIMATION LAYER ──────────────────── */}
            <AnimationLayer flyingItems={flyingItems} />
        </>
    );
}
