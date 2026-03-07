import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { FridgeItem } from '@/types';
import {
    getFridgeItemsApi,
    createFridgeItemApi,
    updateFridgeItemApi,
    restockFridgeItemApi,
} from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import {
    Plus, Pencil, RefreshCw, PackagePlus,
    Search, Snowflake, Eye, EyeOff, ArrowUpDown, X,
    Refrigerator, HardDrive
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSocket } from '@/hooks/useSocket';

export default function FridgeInventory() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isRestockOpen, setIsRestockOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<FridgeItem | null>(null);
    const [restockItem, setRestockItem] = useState<FridgeItem | null>(null);
    const [formData, setFormData] = useState({ name: '', price: '', stock: '' });
    const [restockAmount, setRestockAmount] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [view, setView] = useState<'active' | 'archived'>('active');
    const [sortBy, setSortBy] = useState<'name' | 'stock' | 'price'>('name');

    // ── Queries ────────────────────────────────────────────────
    const { data: items = [], isLoading } = useQuery({
        queryKey: ['fridge-items'],
        queryFn: getFridgeItemsApi,
        staleTime: 30000,
    });

    // ── Mutations ──────────────────────────────────────────────
    const createMutation = useMutation({
        mutationFn: createFridgeItemApi,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fridge-items'] });
            toast({ title: 'Success', description: 'Item added successfully' });
            setIsDialogOpen(false);
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, item }: { id: string, item: Partial<FridgeItem> }) => updateFridgeItemApi(id, item),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fridge-items'] });
            toast({ title: 'Success', description: 'Item updated successfully' });
            setIsDialogOpen(false);
        }
    });

    const restockMutation = useMutation({
        mutationFn: ({ id, amount }: { id: string, amount: number }) => restockFridgeItemApi(id, amount),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fridge-items'] });
            toast({ title: 'Success', description: 'Stock updated' });
            setIsRestockOpen(false);
        }
    });

    // Correct useSocket implementation with invalidation
    useSocket({
        'fridge_update': () => queryClient.invalidateQueries({ queryKey: ['fridge-items'] }),
        'fridge_create': () => queryClient.invalidateQueries({ queryKey: ['fridge-items'] }),
        'fridge_delete': () => queryClient.invalidateQueries({ queryKey: ['fridge-items'] })
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const data = {
            name: formData.name.trim(),
            price: parseFloat(formData.price),
            stock: parseInt(formData.stock),
            isActive: true
        };

        if (editingItem) {
            updateMutation.mutate({ id: editingItem.id, item: data });
        } else {
            createMutation.mutate(data);
        }
    };

    const handleRestock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!restockItem || !restockAmount) return;
        restockMutation.mutate({ id: restockItem.id, amount: parseInt(restockAmount) });
        setRestockAmount('');
    };

    const toggleArchive = async (item: FridgeItem) => {
        updateMutation.mutate({ id: item.id, item: { isActive: !item.isActive } });
        toast({
            title: item.isActive ? 'Archived' : 'Restored',
            description: `${item.name} has been ${item.isActive ? 'archived' : 'restored'}`
        });
    };

    const sortedItems = useMemo(() => {
        return items
            .filter(item => {
                const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
                const matchesView = view === 'active' ? item.isActive : !item.isActive;
                return matchesSearch && matchesView;
            })
            .sort((a, b) => {
                if (sortBy === 'name') return a.name.localeCompare(b.name);
                if (sortBy === 'stock') return a.stock - b.stock;
                if (sortBy === 'price') return a.price - b.price;
                return 0;
            });
    }, [items, searchQuery, view, sortBy]);

    const activeItems = useMemo(() => items.filter(i => i.isActive), [items]);

    const stats = useMemo(() => ({
        total: activeItems.length,
        lowStock: activeItems.filter(i => i.stock <= 5 && i.stock > 0).length,
        outOfStock: activeItems.filter(i => i.stock === 0).length,
        totalUnits: activeItems.reduce((acc, i) => acc + i.stock, 0)
    }), [activeItems]);

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center p-8 bg-[#F7F7F9] dark:bg-[#0B0C10]">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-10 w-10 rounded-full border-4 border-slate-200 dark:border-slate-800 border-t-sky-600 animate-spin"></div>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest text-center">Syncing Fridge<br />Storage...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#F7F7F9] dark:bg-[#0B0C10] overflow-hidden">
            {/* ── Page Header ────────────────────────────────────────────── */}
            <div className="shrink-0 px-6 py-5 border-b border-slate-200/50 dark:border-white/5 bg-white dark:bg-[#1C1D21] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-sky-50 dark:bg-sky-950/30 flex items-center justify-center text-sky-600 shadow-inner">
                        <Snowflake className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 dark:text-white leading-none tracking-tight">FRIDGE</h1>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Cold Storage Inventory</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => queryClient.invalidateQueries({ queryKey: ['fridge-items'] })}
                        className="rounded-xl border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 h-10 w-10 p-0"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                        onClick={() => {
                            setEditingItem(null);
                            setFormData({ name: '', price: '', stock: '' });
                            setIsDialogOpen(true);
                        }}
                        className="rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white shadow-lg shadow-sky-500/20 h-10 px-5 font-bold uppercase text-[11px] tracking-widest"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Cold Item
                    </Button>
                </div>
            </div>

            {/* ── Stats Strip ───────────────────────────────────────────── */}
            <div className="shrink-0 px-6 py-4 bg-white/50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-900 overflow-x-auto no-scrollbar">
                <div className="shrink-0 p-6 pb-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Inside Storage', value: activeItems.length, icon: Refrigerator, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-500/10' },
                        { label: 'Out of Stock', value: sortedItems.filter(i => i.stock === 0).length, icon: Snowflake, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-500/10' },
                        { label: 'Low Levels', value: sortedItems.filter(i => i.stock > 0 && i.stock <= 5).length, icon: PackagePlus, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-500/10' },
                        { label: 'Active Value', value: `₹${Math.round(activeItems.reduce((acc, i) => acc + (i.price * i.stock), 0)).toLocaleString()}`, icon: HardDrive, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
                    ].map((stat, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", stat.bg)}>
                                <stat.icon className={cn("h-4 w-4", stat.color)} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{stat.label}</span>
                                <span className={cn("text-lg font-black leading-none", stat.color)}>{stat.value}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Toolbar & Filters ───────────────────────────────────────── */}
            <div className="shrink-0 px-6 py-3 border-b border-slate-100 dark:border-white/5 bg-white dark:bg-[#1C1D21] flex flex-col md:flex-row items-center gap-3">
                <div className="relative flex-1 w-full group">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
                    <Input
                        placeholder="Search cold storage..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-10 rounded-xl bg-slate-50 dark:bg-[#0B0C10] border-none shadow-none focus-visible:ring-2 focus-visible:ring-sky-500/20 font-bold text-sm"
                    />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setView('active')}
                            className={cn(
                                "h-8 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                view === 'active' ? "bg-white dark:bg-slate-800 text-sky-600 shadow-sm" : "text-slate-400"
                            )}
                        > Active </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setView('archived')}
                            className={cn(
                                "h-8 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                view === 'archived' ? "bg-white dark:bg-slate-800 text-slate-600 shadow-sm" : "text-slate-400"
                            )}
                        > Archived </Button>
                    </div>

                    <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                        <SelectTrigger className="w-full sm:w-[130px] h-10 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B0C10] font-bold text-xs shadow-sm">
                            <ArrowUpDown className="h-3.5 w-3.5 mr-2 text-sky-500" />
                            <SelectValue placeholder="Sort" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                            <SelectItem value="name">Name A-Z</SelectItem>
                            <SelectItem value="stock">Stock Level</SelectItem>
                            <SelectItem value="price">Price: Low</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* ── Main Content Area ────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar pb-32">
                <div className="max-w-[1200px] mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                        <AnimatePresence mode="popLayout">
                            {sortedItems.length === 0 ? (
                                <motion.div
                                    key="empty"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="col-span-full py-20 text-center bg-white dark:bg-[#1C1D21] rounded-[2rem] border-2 border-dashed border-sky-100 dark:border-white/5"
                                >
                                    <Snowflake className="h-10 w-10 text-sky-200/50 mx-auto mb-3" />
                                    <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Storage is empty</h3>
                                    <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or search query</p>
                                </motion.div>
                            ) : (
                                sortedItems.map((item, idx) => {
                                    const isLow = item.stock <= 5 && item.stock > 0;
                                    const isOut = item.stock === 0;

                                    return (
                                        <motion.div
                                            key={item.id}
                                            layout
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ delay: idx * 0.02 }}
                                        >
                                            <Card
                                                className={cn(
                                                    "group h-full relative border transition-all duration-300 rounded-[1.5rem] overflow-hidden bg-white dark:bg-[#1C1D21]",
                                                    isOut ? "border-red-100 dark:border-red-900/30" : isLow ? "border-amber-100 dark:border-amber-900/30" : "border-slate-200/50 dark:border-white/5 hover:border-sky-400 dark:hover:border-sky-500/50 hover:shadow-xl hover:shadow-sky-500/5",
                                                    !item.isActive && "grayscale bg-slate-50/50 dark:bg-[#0B0C10] opacity-80"
                                                )}
                                            >
                                                <div className="p-4 flex flex-col h-full">
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div className={cn(
                                                            "h-9 w-9 rounded-lg flex items-center justify-center transition-colors shadow-sm",
                                                            isOut ? "bg-red-50 dark:bg-red-950/30 text-red-600" : isLow ? "bg-amber-50 dark:bg-amber-950/30 text-amber-600" : "bg-sky-50 dark:bg-sky-950/30 text-sky-600"
                                                        )}>
                                                            <Snowflake className="h-4.5 w-4.5" />
                                                        </div>
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => {
                                                                    setEditingItem(item);
                                                                    setFormData({ name: item.name, price: String(item.price), stock: String(item.stock) });
                                                                    setIsDialogOpen(true);
                                                                }}
                                                                className="h-8 w-8 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-sky-500"
                                                            >
                                                                <Pencil className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => toggleArchive(item)}
                                                                className="h-8 w-8 rounded-lg bg-slate-50 dark:bg-[#0B0C10] text-slate-400 hover:text-red-500"
                                                            >
                                                                {item.isActive ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-bold text-[13px] text-slate-900 dark:text-white leading-tight mb-2 line-clamp-2 uppercase">
                                                            {item.name}
                                                        </h3>

                                                        <div className="space-y-1.5">
                                                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-tight">
                                                                <span className="text-slate-400">Stock Status</span>
                                                                <span className={cn(
                                                                    isOut ? "text-red-500" : isLow ? "text-amber-500" : "text-green-600"
                                                                )}>
                                                                    {isOut ? 'Sold Out' : isLow ? 'Low Stock' : 'In Stock'}
                                                                </span>
                                                            </div>
                                                            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                                <motion.div
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${Math.min((item.stock / 20) * 100, 100)}%` }}
                                                                    className={cn(
                                                                        "h-full rounded-full",
                                                                        isOut ? "bg-red-500" : isLow ? "bg-amber-500" : "bg-sky-600"
                                                                    )}
                                                                />
                                                            </div>
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[11px] font-black text-slate-900 dark:text-white tabular-nums">
                                                                    {item.stock} <span className="text-slate-400 font-bold ml-0.5">Units</span>
                                                                </span>
                                                                <span className="text-[11px] font-black text-sky-600 dark:text-sky-400 tabular-nums">
                                                                    ₹{item.price}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <Button
                                                        onClick={() => {
                                                            setRestockItem(item);
                                                            setIsRestockOpen(true);
                                                        }}
                                                        className={cn(
                                                            "mt-4 w-full h-9 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all",
                                                            isOut
                                                                ? "bg-red-600 hover:bg-red-700 text-white shadow-red-500/20 shadow-lg"
                                                                : "bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 hover:bg-sky-600 hover:text-white shadow-sky-500/5 hover:shadow-lg"
                                                        )}
                                                    >
                                                        <PackagePlus className="h-3.5 w-3.5 mr-2" />
                                                        {isOut ? 'Restock Immediately' : 'Add Stock'}
                                                    </Button>
                                                </div>
                                            </Card>
                                        </motion.div>
                                    );
                                })
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* ── Add/Edit Dialog ─────────────────────────────────────────── */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-md rounded-[2rem] border-none shadow-2xl bg-white dark:bg-[#1C1D21] p-0 overflow-hidden">
                    <div className="px-8 pt-8 pb-8">
                        <DialogHeader className="mb-6">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-[1.25rem] bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-sky-500/20">
                                    {editingItem ? <Pencil className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
                                </div>
                                <div>
                                    <DialogTitle className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none">
                                        {editingItem ? 'Edit Beverage' : 'New Beverage'}
                                    </DialogTitle>
                                    <DialogDescription className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5">
                                        Cold Chain Inventory Control
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Label</Label>
                                <Input
                                    placeholder="e.g. Diet Coke 300ml"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="h-11 rounded-xl bg-slate-100/50 dark:bg-[#0B0C10] border-none px-4 font-bold text-sm"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Price</Label>
                                    <div className="relative group">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-600 font-black text-sm group-focus-within:scale-110 transition-transform">₹</span>
                                        <Input
                                            type="number"
                                            value={formData.price}
                                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                            className="h-11 pl-10 rounded-xl bg-slate-100/50 dark:bg-[#0B0C10] border-none font-black text-sm focus-visible:ring-2 focus-visible:ring-sky-500/20"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Initial Stock</Label>
                                    <Input
                                        type="number"
                                        value={formData.stock}
                                        onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                                        className="h-11 rounded-xl bg-slate-100/50 dark:bg-[#0B0C10] border-none px-4 font-black text-sm"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-3 pt-6 pb-4">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setIsDialogOpen(false)}
                                    className="flex-1 h-11 rounded-xl font-black text-slate-400 uppercase tracking-widest text-[11px]"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="flex-1 h-11 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-black uppercase tracking-widest text-[11px] shadow-lg shadow-sky-500/20"
                                >
                                    {editingItem ? 'Update Item' : 'Create Item'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── Restock Dialog ─────────────────────────────────────────── */}
            <Dialog open={isRestockOpen} onOpenChange={setIsRestockOpen}>
                <DialogContent className="max-w-sm rounded-[2rem] border-none shadow-2xl bg-white dark:bg-[#1C1D21] p-0 overflow-hidden">
                    <div className="px-8 pt-8 pb-8">
                        <DialogHeader className="mb-6">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-[1.25rem] bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-xl shadow-sky-500/20">
                                    <PackagePlus className="h-6 w-6" />
                                </div>
                                <div>
                                    <DialogTitle className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none">
                                        Restock
                                    </DialogTitle>
                                    <DialogDescription className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5 truncate max-w-[180px]">
                                        {restockItem?.name}
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>

                        <form onSubmit={handleRestock} className="space-y-5">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantity to Add</Label>
                                <Input
                                    type="number"
                                    autoFocus
                                    placeholder="0"
                                    value={restockAmount}
                                    onChange={(e) => setRestockAmount(e.target.value)}
                                    className="h-14 rounded-xl bg-slate-100/50 dark:bg-[#0B0C10] border-none px-6 font-black text-2xl text-center"
                                />
                            </div>
                            <Button
                                type="submit"
                                disabled={!restockAmount || parseInt(restockAmount) <= 0}
                                className="w-full h-12 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-black uppercase tracking-widest text-[11px] shadow-lg shadow-sky-500/20"
                            >
                                Confirm Restock
                            </Button>
                        </form>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
