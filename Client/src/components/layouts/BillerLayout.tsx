import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Receipt, Store, Sparkles, User as UserIcon, Clock, ChefHat } from 'lucide-react';
import { ModeToggle } from '@/components/mode-toggle';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
    <div className="h-full overflow-hidden bg-[#F7F7F9] dark:bg-[#0B0C10] flex flex-col font-sans selection:bg-orange-200">
      {/* Premium Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#1C1D21]/80 backdrop-blur-2xl border-b border-slate-200 dark:border-white/5 px-6 py-5">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.div
              whileHover={{ rotate: 5, scale: 1.05 }}
              className="h-12 w-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-xl shadow-orange-500/20"
            >
              <ChefHat className="h-6 w-6 text-white" />
            </motion.div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-black text-slate-900 dark:text-white leading-none tracking-tighter uppercase italic">Vaishali Snacks</h1>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Live Billing Terminal</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 md:gap-8">
            <div className="flex items-center gap-4 px-5 py-2.5 bg-slate-100 dark:bg-white/5 rounded-[1.25rem] border border-slate-200 dark:border-white/5 transition-all hover:bg-white/10">
              <div className="h-9 w-9 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center shadow-sm border border-slate-200 dark:border-white/10">
                <UserIcon className="h-4.5 w-4.5 text-orange-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black text-slate-900 dark:text-white leading-none capitalize tracking-tight">{user?.name}</span>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Counter Staff</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Live Clock */}
              <div className="hidden md:flex items-center gap-3 bg-slate-100 dark:bg-white/5 px-4 py-2 rounded-[1.25rem] border border-slate-200 dark:border-white/5">
                <Clock className="h-4 w-4 text-orange-500" />
                <span className="text-xs font-black text-slate-600 dark:text-slate-300 tabular-nums tracking-tight">
                  {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                </span>
              </div>
              <ModeToggle />
              <div className="h-10 w-px bg-slate-200 dark:bg-white/5 mx-2 hidden md:block" />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-xl h-10 w-10 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                    title="Logout"
                  >
                    <LogOut className="h-5 w-5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-3xl border-none p-6 bg-white dark:bg-[#1C1D21] shadow-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                      <div className="h-10 w-10 rounded-2xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
                        <LogOut className="h-5 w-5 text-red-500" />
                      </div>
                      Sign Out?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-slate-500 dark:text-slate-400 font-bold mt-2">
                      Are you sure you want to end your billing session?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex flex-row gap-3 mt-6">
                    <AlertDialogCancel className="flex-1 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-black text-slate-600 dark:text-slate-300 active:scale-95 transition-all m-0 shadow-none">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleLogout}
                      className="flex-1 h-12 rounded-2xl bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-black active:scale-95 transition-all shadow-lg shadow-red-500/25 border-none"
                    >
                      Logout
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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
      <div className="md:hidden fixed bottom-10 right-10 z-50">
        <div className="bg-orange-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border-4 border-white/20 backdrop-blur-xl">
          <Sparkles className="h-4 w-4 text-orange-200" />
          <span className="text-[10px] font-black uppercase tracking-widest">Active Session</span>
        </div>
      </div>
    </div>
  );
}
