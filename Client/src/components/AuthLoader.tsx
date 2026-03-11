import React from 'react';
import { Loader2, WifiOff, ShieldCheck, LogOut, Loader, UserCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export const AuthLoader: React.FC = () => {
    const { isLoggingIn, isLoggingOut, networkSlow } = useAuth();
    const isActive = isLoggingIn || isLoggingOut;

    return (
        <AnimatePresence>
            {isActive && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-[12px]"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-[400px] overflow-hidden rounded-[2.5rem] border border-white/20 bg-white/80 p-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] dark:border-white/10 dark:bg-slate-900/80"
                    >
                        {/* Shimmer effect on the card */}
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-50" />
                        
                        <div className="flex flex-col items-center space-y-8 text-center pt-2">
                            {/* Icon Animation Container */}
                            <div className="relative flex h-24 w-24 items-center justify-center">
                                {/* Orbit circles */}
                                <motion.div 
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-0 rounded-full border-2 border-dashed border-orange-500/30"
                                />
                                <motion.div 
                                    animate={{ rotate: -360 }}
                                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-2 rounded-full border-2 border-dotted border-amber-500/20"
                                />
                                
                                {/* Center Icon */}
                                <div className="z-10 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/30 text-white">
                                    {isLoggingIn ? (
                                        <motion.div
                                            initial={{ scale: 0.5, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                        >
                                            <UserCircle2 className="h-9 w-9" />
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            initial={{ scale: 0.5, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                        >
                                            <LogOut className="h-9 w-9" />
                                        </motion.div>
                                    )}
                                </div>
                                
                                {/* Loading Spinner Overlay */}
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                    className="absolute h-full w-full rounded-full border-4 border-transparent border-t-orange-500"
                                />
                            </div>
                            
                            {/* Content */}
                            <div className="space-y-3">
                                <motion.h3 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-2xl font-black tracking-tight text-slate-900 dark:text-white"
                                >
                                    {isLoggingIn ? 'Verifying Access' : 'Concluding Session'}
                                </motion.h3>
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    className="flex items-center justify-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400"
                                >
                                    <ShieldCheck className="h-4 w-4 text-green-500" />
                                    {isLoggingIn ? 'Secure Authentication' : 'Secure Data Cleanup'}
                                </motion.div>
                            </div>

                            {/* Loading Bar */}
                            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <motion.div 
                                    initial={{ x: "-100%" }}
                                    animate={{ x: "100%" }}
                                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                                    className="w-1/2 h-full bg-gradient-to-r from-orange-500 to-amber-600 rounded-full"
                                />
                            </div>

                            {/* Slow Network Warning */}
                            <AnimatePresence>
                                {networkSlow && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="w-full"
                                    >
                                        <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-yellow-800 dark:border-yellow-900/30 dark:bg-yellow-900/20 dark:text-yellow-400 shadow-inner">
                                            <div className="flex items-center gap-2">
                                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/40">
                                                    <WifiOff className="h-3 w-3" />
                                                </div>
                                                <span className="font-bold text-xs uppercase tracking-widest">Network Optimization</span>
                                            </div>
                                            <p className="text-[11px] font-semibold leading-relaxed opacity-90">
                                                Connectivity is low. We're maintaining a secure connection to finish the process.
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
