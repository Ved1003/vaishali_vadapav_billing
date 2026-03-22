import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Store, User as UserIcon } from 'lucide-react';
import { ServerSettings } from '@/components/billing/ServerSettings';
import { ModeToggle } from '@/components/mode-toggle';
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

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="h-full overflow-hidden bg-slate-50 dark:bg-slate-950 flex flex-col font-sans selection:bg-orange-200">

            {/* ── Compact Mobile Header ─────────────────────── */}
            <header className="flex-shrink-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-4 py-2.5 w-full shadow-sm z-30">
                <div className="flex items-center justify-between">

                    {/* Left: Logo + name */}
                    <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-md shadow-orange-400/30 flex-shrink-0">
                            <Store className="h-4.5 w-4.5 text-white h-[18px] w-[18px]" />
                        </div>
                        <div>
                            <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">Vaishali Snacks</p>
                            <div className="flex items-center gap-1 mt-0.5">
                                <div className="dot-live" />
                                <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest">Live</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: User name + settings + mode + logout */}
                    <div className="flex items-center gap-1.5">
                        {/* User chip */}
                        <div className="flex items-center gap-1.5 bg-orange-50 dark:bg-slate-800 border border-orange-100/50 dark:border-slate-700 rounded-xl px-2.5 py-1.5">
                            <UserIcon className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
                            <span className="text-xs font-black text-slate-800 dark:text-white capitalize max-w-[80px] truncate">{user?.name}</span>
                        </div>

                        <ServerSettings />
                        <ModeToggle />

                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="rounded-xl h-9 w-9 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors touch-manipulation"
                                    title="Logout"
                                >
                                    <LogOut className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="w-[90vw] max-w-[360px] rounded-3xl border-none p-6 bg-white dark:bg-slate-900 shadow-2xl">
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-2xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
                                            <LogOut className="h-5 w-5 text-red-500" />
                                        </div>
                                        Sign Out?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription className="text-slate-500 dark:text-slate-400 font-bold mt-2">
                                        Are you sure you want to end your billing session? Any unsaved progress will be lost.
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
            </header>

            {/* Main content area */}
            <main className="flex-1 relative flex flex-col overflow-hidden min-h-0 bg-slate-50 dark:bg-slate-950">
                <Outlet />
            </main>
        </div>
    );
}
