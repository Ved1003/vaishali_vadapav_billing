import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getItemsApi, createItemApi, updateItemApi, deleteItemApi } from '@/services/api';
import { Item } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Search, X, Package, Filter, ArrowUpDown, Sparkles, Trash2, Eye, EyeOff, CheckSquare, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { GridCardSkeleton } from '@/components/ui/SkeletonCards';

type SortOption = 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc';
type FilterOption = 'all' | 'active' | 'inactive';

export default function ManageItems() {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [formData, setFormData] = useState({ name: '', price: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterOption>('all');
  const [sortOption, setSortOption] = useState<SortOption>('name-asc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const data = await getItemsApi();
      setItems(data);
    } finally {
      setIsLoading(false);
    }
  };

  const openAddDialog = () => {
    setEditingItem(null);
    setFormData({ name: '', price: '' });
    setIsDialogOpen(true);
  };

  const openEditDialog = (item: Item) => {
    setEditingItem(item);
    setFormData({ name: item.name, price: String(item.price) });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const name = formData.name.trim();
    const price = parseFloat(formData.price);

    if (!name || isNaN(price) || price <= 0) {
      toast({
        title: 'Error',
        description: 'Please enter valid name and price',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingItem) {
        const updated = await updateItemApi(editingItem.id, { name, price });
        if (updated) {
          setItems(items.map(i => i.id === editingItem.id ? updated : i));
          toast({ title: 'Item updated successfully' });
        }
      } else {
        const newItem = await createItemApi({ name, price, isActive: true });
        setItems([...items, newItem]);
        toast({ title: 'Item added successfully' });
      }
      setIsDialogOpen(false);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to save item',
        variant: 'destructive',
      });
    }
  };

  const toggleItemStatus = async (item: Item) => {
    try {
      const updated = await updateItemApi(item.id, { isActive: !item.isActive });
      if (updated) {
        setItems(items.map(i => i.id === item.id ? updated : i));
        toast({
          title: `Item ${updated.isActive ? 'activated' : 'deactivated'}`,
          description: `${item.name} is now ${updated.isActive ? 'active' : 'inactive'}`,
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to toggle item status',
        variant: 'destructive',
      });
    }
  };

  const filteredAndSortedItems = useMemo(() => {
    return items
      .filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' ||
          (statusFilter === 'active' ? item.isActive : !item.isActive);
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        switch (sortOption) {
          case 'name-asc': return a.name.localeCompare(b.name);
          case 'name-desc': return b.name.localeCompare(a.name);
          case 'price-asc': return a.price - b.price;
          case 'price-desc': return b.price - a.price;
          default: return 0;
        }
      });
  }, [items, searchQuery, statusFilter, sortOption]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllSelection = () => {
    if (selectedIds.size === filteredAndSortedItems.length && filteredAndSortedItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAndSortedItems.map(i => i.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.size} items?`)) return;

    try {
      await Promise.all(Array.from(selectedIds).map(id => deleteItemApi(id)));
      setItems(items.filter(i => !selectedIds.has(i.id)));
      setSelectedIds(new Set());
      toast({ title: 'Success', description: 'Selected items deleted' });
    } catch {
      toast({ title: 'Error', description: 'Failed to delete some items', variant: 'destructive' });
    }
  };

  const handleBulkToggleStatus = async (active: boolean) => {
    try {
      const updatedItems = await Promise.all(
        Array.from(selectedIds).map(id => updateItemApi(id, { isActive: active }))
      );
      setItems(items.map(i => {
        const updated = updatedItems.find(u => u.id === i.id);
        return updated || i;
      }));
      setSelectedIds(new Set());
      toast({ title: 'Success', description: `Items ${active ? 'activated' : 'deactivated'}` });
    } catch {
      toast({ title: 'Error', description: 'Failed to update some items', variant: 'destructive' });
    }
  };

  const activeCount = items.filter(i => i.isActive).length;
  const inactiveCount = items.filter(i => !i.isActive).length;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center p-8 bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-4 border-slate-200 dark:border-slate-800 border-t-orange-600 animate-spin"></div>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Syncing Inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="shrink-0 px-6 py-5 border-b border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center text-orange-600 shadow-inner">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white leading-none tracking-tight">INVENTORY</h1>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Manage your snack catalog</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden lg:flex items-center gap-1.5 mr-2">
            <Badge variant="outline" className="rounded-md border-slate-200 dark:border-slate-800 text-[10px] font-bold font-mono py-0.5 px-2 bg-slate-50 dark:bg-slate-900">
              {activeCount} ACTIVE
            </Badge>
            <Badge variant="outline" className="rounded-md border-slate-200 dark:border-slate-800 text-[10px] font-bold font-mono py-0.5 px-2 bg-slate-50 dark:bg-slate-900">
              {inactiveCount} OFF
            </Badge>
          </div>
          <Button
            onClick={openAddDialog}
            className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-500/10 h-10 px-5 font-bold uppercase text-[11px] tracking-widest"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {/* ── Toolbar & Filters ───────────────────────────────────────── */}
      <div className="shrink-0 px-6 py-3 border-b border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-900/50 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
          <Input
            placeholder="Search catalog..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 rounded-xl bg-slate-100/50 dark:bg-slate-950 border-none shadow-none focus-visible:ring-2 focus-visible:ring-orange-500 font-bold text-sm"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as FilterOption)}>
            <SelectTrigger className="w-full sm:w-[130px] h-10 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold text-xs">
              <Filter className="h-3.5 w-3.5 mr-2 text-orange-500" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
              <SelectItem value="all">Everything</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="inactive">Inactive Only</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
            <SelectTrigger className="w-full sm:w-[130px] h-10 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold text-xs">
              <ArrowUpDown className="h-3.5 w-3.5 mr-2 text-orange-500" />
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
              <SelectItem value="name-asc">Name A-Z</SelectItem>
              <SelectItem value="name-desc">Name Z-A</SelectItem>
              <SelectItem value="price-asc">Price: Low</SelectItem>
              <SelectItem value="price-desc">Price: High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Main Content Area ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar pb-32">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleAllSelection}
                className="flex items-center gap-2 text-xs font-black text-slate-400 hover:text-orange-600 transition-colors uppercase tracking-widest"
              >
                {selectedIds.size === filteredAndSortedItems.length && filteredAndSortedItems.length > 0
                  ? <CheckSquare className="h-4.5 w-4.5" />
                  : <Square className="h-4.5 w-4.5" />
                }
                Select All
              </button>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Showing {filteredAndSortedItems.length} items
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredAndSortedItems.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="col-span-full py-20 text-center bg-white dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800"
                >
                  <Filter className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">No results found</h3>
                  <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or search query</p>
                </motion.div>
              ) : (
                filteredAndSortedItems.map((item, idx) => {
                  const isSelected = selectedIds.has(item.id);
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
                          "group h-full relative border flex flex-col transition-all duration-300 rounded-[1.25rem] overflow-hidden cursor-pointer",
                          isSelected
                            ? "border-orange-500 bg-orange-50/30 dark:bg-orange-950/20 ring-1 ring-orange-500/20"
                            : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-orange-200 dark:hover:border-orange-900/50 hover:shadow-md",
                          !item.isActive && !isSelected && "bg-slate-50/50 dark:bg-slate-950/50 grayscale opacity-80"
                        )}
                        onClick={() => toggleSelection(item.id)}
                      >
                        <div className="p-4 flex flex-col h-full">
                          <div className="flex items-start justify-between mb-3">
                            <div className={cn(
                              "h-9 w-9 rounded-lg flex items-center justify-center transition-colors",
                              item.isActive
                                ? "bg-slate-50 dark:bg-slate-800 text-orange-600"
                                : "bg-slate-100 dark:bg-slate-950 text-slate-400"
                            )}>
                              <Package className="h-4.5 w-4.5" />
                            </div>
                            <div
                              className={cn(
                                "h-5 w-5 rounded-md border flex items-center justify-center transition-colors",
                                isSelected ? "bg-orange-600 border-orange-600" : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                              )}
                              onClick={(e) => { e.stopPropagation(); toggleSelection(item.id); }}
                            >
                              {isSelected && <CheckSquare className="h-3 w-3 text-white" />}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-[13px] text-slate-900 dark:text-white leading-tight mb-1 line-clamp-2 uppercase">
                              {item.name}
                            </h3>
                            <div className="flex items-center gap-1.5">
                              <div className={cn(
                                "h-1 w-1 rounded-full",
                                item.isActive ? "bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.6)]" : "bg-slate-400"
                              )} />
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                {item.isActive ? 'Active' : 'Archived'}
                              </span>
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-50 dark:border-slate-800/50">
                            <div className="flex flex-col">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight leading-none mb-0.5">Price</span>
                              <span className="text-base font-black text-orange-600 dark:text-orange-400 tabular-nums">
                                ₹{item.price.toLocaleString('en-IN')}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => { e.stopPropagation(); openEditDialog(item); }}
                                className="h-8 w-8 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-600 hover:text-orange-700 h-8 w-8"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => { e.stopPropagation(); toggleItemStatus(item); }}
                                className={cn(
                                  "h-8 w-8 rounded-lg",
                                  item.isActive
                                    ? "text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                                    : "text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20"
                                )}
                              >
                                {item.isActive ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              </Button>
                            </div>
                          </div>
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

      {/* ── Bulk Action Floating Bar ───────────────────────────────── */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-3 rounded-2xl shadow-2xl border border-white/10 dark:border-slate-200/50 backdrop-blur-xl"
          >
            <div className="flex items-center gap-2.5 border-r border-white/10 dark:border-slate-200 pr-4 mr-1">
              <div className="h-6 w-6 rounded-md bg-orange-500 text-white flex items-center justify-center text-[11px] font-black">
                {selectedIds.size}
              </div>
              <span className="text-[11px] font-black uppercase tracking-tight whitespace-nowrap">Selected</span>
            </div>

            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleBulkToggleStatus(true)}
                className="rounded-lg h-9 px-3 hover:bg-white/10 dark:hover:bg-slate-100 text-[10px] font-black uppercase tracking-widest"
              >
                <Eye className="h-3.5 w-3.5 mr-2" />
                Active
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleBulkToggleStatus(false)}
                className="rounded-lg h-9 px-3 hover:bg-white/10 dark:hover:bg-slate-100 text-[10px] font-black uppercase tracking-widest"
              >
                <EyeOff className="h-3.5 w-3.5 mr-2" />
                Hide
              </Button>
              <div className="w-px h-5 bg-white/10 dark:bg-slate-200 mx-1" />
              <Button
                size="sm"
                onClick={handleBulkDelete}
                className="rounded-lg h-9 px-3 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-widest"
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Delete
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setSelectedIds(new Set())}
                className="rounded-lg h-9 w-9 text-white/40 hover:text-white dark:text-slate-400 dark:hover:text-slate-900"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add/Edit Dialog ─────────────────────────────────────────── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md rounded-[1.5rem] border-none shadow-2xl bg-white dark:bg-slate-900 p-0 overflow-hidden">
          <div className="px-8 pt-8 pb-6">
            <DialogHeader className="mb-8">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center text-orange-600">
                  {editingItem ? <Pencil className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
                </div>
                <div>
                  <DialogTitle className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none">
                    {editingItem ? 'Edit Product' : 'Add Product'}
                  </DialogTitle>
                  <DialogDescription className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5">
                    Product Metadata Management
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Title</Label>
                <Input
                  placeholder="e.g. Special Onion Samosa"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-11 rounded-xl bg-slate-100/50 dark:bg-slate-950 border-none px-4 font-bold text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Retail Price</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-600 font-black text-base">₹</span>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="h-11 pl-10 rounded-xl bg-slate-100/50 dark:bg-slate-950 border-none px-4 font-black text-base"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 pb-8">
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
                  className="flex-1 h-11 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black uppercase tracking-widest text-[11px] shadow-lg shadow-orange-500/20"
                >
                  {editingItem ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

