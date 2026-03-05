import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Package,
  Users,
  FileText,
  LogOut,
  Menu,
  X,
  Store,
  Sparkles,
  ChevronRight,
  Refrigerator,
  PanelLeftClose,
  PanelLeftOpen,
  Clock,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { getDashboardStatsApi } from '@/services/api';
import { ModeToggle } from '@/components/mode-toggle';
import { useSocket } from '@/hooks/useSocket';
import { Bill } from '@/types';
import { CommandMenu } from '@/components/CommandMenu';
import { Search as SearchIcon } from 'lucide-react';

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', description: 'Business overview', end: true, color: 'from-orange-500 to-amber-600' },
  { to: '/admin/items', icon: Package, label: 'Inventory', description: 'Manage snacks', color: 'from-orange-500 to-amber-600' },
  { to: '/admin/fridge', icon: Refrigerator, label: 'Fridge', description: 'Chilled items & stock', color: 'from-cyan-500 to-sky-600' },
  { to: '/admin/users', icon: Users, label: 'Staff', description: 'Counter billers', color: 'from-violet-500 to-purple-600' },
  { to: '/admin/history', icon: FileText, label: 'History', description: 'Past receipts', color: 'from-emerald-500 to-teal-600' },
];

const pageTitles: Record<string, { label: string; description: string }> = {
  '/admin': { label: 'Dashboard', description: 'Real-time business insights' },
  '/admin/items': { label: 'Inventory', description: 'Manage your menu items' },
  '/admin/fridge': { label: 'Fridge Inventory', description: 'Track chilled items & stock' },
  '/admin/users': { label: 'Staff Management', description: 'Manage billing counter staff' },
  '/admin/history': { label: 'Billing History', description: 'Archive of all transactions' },
};

export function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(window.matchMedia('(min-width: 1024px)').matches);
  const [todaySales, setTodaySales] = useState<number>(0);
  const [todayBills, setTodayBills] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    const handleResize = (e: MediaQueryListEvent) => {
      setIsLargeScreen(e.matches);
      if (!e.matches) { setIsMobileMenuOpen(false); setIsCollapsed(false); }
    };
    mql.addEventListener('change', handleResize);
    return () => mql.removeEventListener('change', handleResize);
  }, []);

  // Sync stats in real-time
  useSocket({
    'BILL_CREATED': (newBill: Bill) => {
      setTodaySales(prev => prev + newBill.totalAmount);
      setTodayBills(prev => prev + 1);
    }
  });

  useEffect(() => {
    getDashboardStatsApi('today').then(stats => {
      setTodaySales(stats.todaySales || 0);
      setTodayBills(stats.todayBillCount || 0);
    });
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const currentPage = pageTitles[location.pathname] || { label: 'Admin', description: '' };

  return (
    <div className="h-full overflow-hidden bg-slate-50 dark:bg-slate-950 flex font-sans selection:bg-orange-200 selection:text-orange-900">
      <CommandMenu />

      {/* ── Desktop Sidebar ───────────────────────────────────────────── */}
      <aside className={cn(
        "hidden lg:flex flex-col shrink-0 bg-white dark:bg-slate-900 border-r border-orange-100/80 dark:border-slate-800 sidebar-transition z-40",
        isCollapsed ? "w-[72px]" : "w-64"
      )}>

        {/* Logo + Collapse Toggle */}
        <div className={cn("flex items-center h-16 border-b border-slate-100 dark:border-slate-800 transition-all duration-300", isCollapsed ? "px-3 justify-center" : "px-5 justify-between")}>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2.5"
            >
              <div className="h-8 w-8 rounded-lg bg-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Store className="h-4 w-4 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-black text-slate-900 dark:text-white leading-none tracking-tight uppercase">Vaishali</span>
                <span className="text-[9px] font-bold text-orange-600 tracking-wider">SNACK CENTER</span>
              </div>
            </motion.div>
          )}
          {isCollapsed && (
            <div className="h-8 w-8 rounded-lg bg-orange-600 flex items-center justify-center shadow-md">
              <Store className="h-4 w-4 text-white" />
            </div>
          )}
          {!isCollapsed && (
            <button
              onClick={() => setIsCollapsed(true)}
              className="p-1.5 rounded-md text-slate-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-slate-800 transition-all"
            >
              <PanelLeftClose className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-3 pt-4 pb-2 space-y-1 overflow-y-auto custom-scrollbar">
          {!isCollapsed && (
            <p className="px-3 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Main Menu</p>
          )}
          {navItems.map((item) => {
            const isActive = item.end
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => cn(
                  "group relative flex items-center gap-3 rounded-xl transition-all duration-200",
                  isCollapsed ? "px-2.5 py-2.5 justify-center" : "px-3 py-2.5",
                  isActive
                    ? "bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200"
                )}
              >
                {/* Active Indicator Bar */}
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute left-0 top-2 bottom-2 w-1 bg-orange-600 rounded-r-full"
                  />
                )}

                <item.icon className={cn(
                  "h-4.5 w-4.5 shrink-0 transition-colors",
                  isActive ? "text-orange-600 dark:text-orange-400" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                )} />

                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-none truncate">{item.label}</p>
                    {/* <p className="text-[10px] mt-1 font-medium truncate opacity-60 opacity-0 group-hover:opacity-60 transition-opacity">{item.description}</p> */}
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className={cn(
          "border-t border-slate-100 dark:border-slate-800",
          isCollapsed ? "p-3" : "p-4"
        )}>
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 text-xs">
                {user?.name.charAt(0)}
              </div>
              <Button variant="ghost" size="icon" onClick={handleLogout}
                className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-lg">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-8 w-8 rounded-lg bg-orange-600 flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-sm">
                  {user?.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate leading-none">{user?.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">Admin</p>
                </div>
              </div>
              <div className="flex items-center shrink-0 gap-0.5">
                <ModeToggle />
                <Button variant="ghost" size="icon" onClick={handleLogout}
                  className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-lg">
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ── Mobile Sidebar ────────────────────────────────────────────── */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-orange-100 dark:border-slate-800 flex flex-col lg:hidden"
            >
              {/* Mobile logo */}
              <div className="flex items-center justify-between h-16 px-5 border-b border-orange-50 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-md">
                    <Store style={{ height: '16px', width: '16px' }} className="text-white" />
                  </div>
                  <div>
                    <h1 className="text-base font-black text-slate-800 dark:text-white">VAISHALI</h1>
                    <p className="text-[8px] font-black text-orange-600 uppercase tracking-widest">Snack Center</p>
                  </div>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Mobile nav */}
              <nav className="flex-1 px-3 pt-4 space-y-1 overflow-y-auto custom-scrollbar">
                <p className="px-3 mb-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Navigation</p>
                {navItems.map((item) => {
                  const isActive = item.end ? location.pathname === item.to : location.pathname.startsWith(item.to);
                  return (
                    <NavLink key={item.to} to={item.to} end={item.end}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all",
                        isActive
                          ? `bg-gradient-to-r ${item.color} text-white shadow-md`
                          : "text-slate-500 dark:text-slate-400 hover:bg-orange-50 dark:hover:bg-slate-800 hover:text-orange-600"
                      )}>
                      <div className={cn("p-1.5 rounded-lg", isActive ? "bg-white/20" : "bg-orange-50 dark:bg-slate-800")}>
                        <item.icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold">{item.label}</p>
                        <p className={cn("text-[10px] font-medium", isActive ? "text-white/70" : "text-slate-400")}>{item.description}</p>
                      </div>
                    </NavLink>
                  );
                })}
              </nav>

              {/* Mobile user footer */}
              <div className="p-3 border-t border-orange-50 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center font-black text-white text-xs shadow-md">
                      {user?.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800 dark:text-white">{user?.name}</p>
                      <p className="text-[9px] font-black text-orange-600 uppercase">Admin</p>
                    </div>
                  </div>
                  <div className="flex">
                    <ModeToggle />
                    <Button variant="ghost" size="icon" onClick={handleLogout}
                      className="h-9 w-9 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl">
                      <LogOut className="h-4.5 w-4.5" style={{ height: '18px', width: '18px' }} />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main Panel ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Top Header Bar */}
        <header className="h-14 shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-orange-100/70 dark:border-slate-800 flex items-center justify-between px-4 z-30">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <Button variant="ghost" size="icon"
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden rounded-xl h-9 w-9 bg-orange-50 dark:bg-slate-800">
              <Menu className="h-5 w-5 text-orange-600" />
            </Button>

            {/* Breadcrumb */}
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-sm hidden sm:flex">
                <Store style={{ height: '14px', width: '14px' }} className="text-white" />
              </div>
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-bold">
                <span>Admin</span>
                <ChevronRight className="h-3 w-3" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-800 dark:text-white leading-none">{currentPage.label}</h2>
                <p className="text-[10px] font-medium text-slate-400 hidden sm:block">{currentPage.description}</p>
              </div>
            </div>
          </div>

          {/* Global Search Trigger */}
          <div className="flex-1 max-w-md px-4 hidden md:block">
            <Button
              variant="outline"
              className="w-full h-9 justify-start text-slate-400 dark:text-slate-500 font-medium px-3 rounded-xl bg-slate-50/50 dark:bg-slate-950/50 border-orange-100/50 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-900 transition-all border shadow-none"
              onClick={() => {
                const event = new KeyboardEvent('keydown', {
                  key: 'k',
                  ctrlKey: true,
                  metaKey: true,
                  bubbles: true
                });
                document.dispatchEvent(event);
              }}
            >
              <SearchIcon className="h-4 w-4 mr-2" />
              <span className="text-xs">Search inventory, staff, or actions...</span>
              <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {/* Live clock */}
            <div className="hidden md:flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200/50 dark:border-slate-700">
              <Clock className="h-3.5 w-3.5 text-orange-500" />
              <span className="text-xs font-black text-slate-600 dark:text-slate-300 tabular-nums">
                {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
              </span>
            </div>

            {/* Quick sales badge */}
            <div className="hidden sm:flex items-center gap-2 bg-orange-50 dark:bg-orange-900/20 px-3 py-1.5 rounded-xl border border-orange-200/50 dark:border-orange-800/30">
              <div className="dot-live" />
              <span className="text-xs font-black text-orange-700 dark:text-orange-400">
                ₹{todaySales.toLocaleString('en-IN', { maximumFractionDigits: 0 })} today
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
