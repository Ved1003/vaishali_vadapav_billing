import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Receipt, Store, Sparkles, User as UserIcon, Clock, ChefHat } from 'lucide-react';
import { ModeToggle } from '@/components/mode-toggle';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function BillerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="h-full overflow-hidden bg-slate-50 dark:bg-slate-950 flex flex-col font-sans selection:bg-orange-200">
      {/* Premium Header */}
      <header className="sticky top-0 z-50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-b border-orange-100 dark:border-slate-800 px-6 py-4">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.div
              whileHover={{ rotate: 5 }}
              className="h-11 w-11 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/20"
            >
              <ChefHat className="h-5 w-5 text-white" />
            </motion.div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-black text-slate-800 dark:text-white leading-tight tracking-tight uppercase">Vaishali Snacks</h1>
              <div className="flex items-center gap-2">
                <div className="dot-live" />
                <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest">Live Billing Terminal</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 md:gap-8">
            <div className="flex items-center gap-3 px-4 py-2 bg-orange-50 dark:bg-slate-800 rounded-2xl border border-orange-100/50 dark:border-slate-700">
              <div className="h-8 w-8 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center shadow-sm">
                <UserIcon className="h-4 w-4 text-orange-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black text-slate-800 dark:text-white leading-none capitalize">{user?.name}</span>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mt-0.5">Counter Staff</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Live Clock */}
              <div className="hidden md:flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200/50 dark:border-slate-700">
                <Clock className="h-3.5 w-3.5 text-orange-500" />
                <span className="text-xs font-black text-slate-600 dark:text-slate-300 tabular-nums">
                  {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                </span>
              </div>
              <ModeToggle />
              <div className="h-8 w-px bg-orange-100 dark:bg-slate-800 mx-1 hidden md:block" />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="rounded-xl h-10 w-10 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Billing Content */}
      <main className="flex-1 relative flex flex-col overflow-hidden">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="h-full flex flex-col"
        >
          <Outlet />
        </motion.div>
      </main>

      {/* Floating Status Badge (Mobile Only) */}
      <div className="md:hidden fixed bottom-6 right-6 z-50">
        <div className="bg-slate-900 text-white px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 border border-white/10 backdrop-blur-md">
          <Sparkles className="h-3 w-3 text-orange-400" />
          <span className="text-[10px] font-black uppercase tracking-widest">Active Session</span>
        </div>
      </div>
    </div>
  );
}
