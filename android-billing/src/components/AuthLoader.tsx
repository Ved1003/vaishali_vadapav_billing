import React from 'react';
import { WifiOff, ShieldCheck, LogOut, UserCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';

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
                    transition={{ duration: 0.4 }}
                    className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-900/95 backdrop-blur-[16px] px-8"
                >
                    {/* Background Visual Effects */}
                    <div className="absolute inset-x-0 top-0 h-[40%] bg-gradient-to-b from-orange-500/10 to-transparent pointer-events-none" />
                    <div className="absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-t from-amber-500/10 to-transparent pointer-events-none" />
                    
                    {/* Orbit Spinner Visual */}
                    <div className="relative mb-14">
                        <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                            className="h-36 w-36 rounded-full border-2 border-dashed border-white/20"
                        />
                        <motion.div 
                            animate={{ rotate: -360 }}
                            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-4 rounded-full border-2 border-dotted border-white/10"
                        />
                        
                        {/* Glow and Shadow Effect Container */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <motion.div
                                animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="absolute h-24 w-24 rounded-full bg-orange-500/30 blur-2xl"
                            />
                            
                            <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-[2.5rem] bg-gradient-to-br from-orange-500 to-amber-600 shadow-2xl shadow-orange-500/40 text-white border border-white/20">
                                {isLoggingIn ? (
                                    <UserCircle2 className="h-10 w-10 animate-pulse" />
                                ) : (
                                    <LogOut className="h-10 w-10 animate-pulse" />
                                )}
                            </div>
                        </div>

                        {/* Top Speed Spinner Layer */}
                        <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                            className="absolute -inset-2 rounded-full border-[6px] border-white/0 border-t-white/80"
                        />
                    </div>
                    
                    {/* Text and Status */}
                    <div className="text-center space-y-4 max-w-xs">
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="space-y-2"
                        >
                            <h2 className="text-3xl font-black text-white tracking-tight">
                                {isLoggingIn ? 'Establishing Secure Link' : 'Securely Closing'}
                            </h2>
                            <p className="text-sm font-bold text-white/50 uppercase tracking-[0.2em]">
                                {isLoggingIn ? 'Terminal Access' : 'Session Cleanup'}
                            </p>
                        </motion.div>
                        
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="flex items-center justify-center gap-3 py-2 px-4 rounded-full bg-white/5 border border-white/10"
                        >
                            <ShieldCheck className="h-4 w-4 text-green-400" />
                            <span className="text-xs font-bold text-white/70 tracking-wide uppercase">
                                Encrypted Connection
                            </span>
                        </motion.div>
                    </div>

                    {/* Progress Bar with marquee effect */}
                    <div className="fixed bottom-16 left-1/4 right-1/4 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <motion.div 
                            initial={{ left: "-100%" }}
                            animate={{ left: "100%" }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-orange-500 to-transparent"
                        />
                    </div>

                    {/* Low Network Overlay for Mobile */}
                    <AnimatePresence>
                        {networkSlow && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 30 }}
                                className="fixed bottom-24 left-6 right-6 z-[10000]"
                            >
                                <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-yellow-500/30 bg-yellow-500/10 p-6 text-yellow-500 shadow-2xl backdrop-blur-xl">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-yellow-500/40 blur-lg rounded-full animate-pulse" />
                                        <WifiOff className="h-8 w-8 relative z-10" />
                                    </div>
                                    <div className="text-center">
                                        <p className="font-black text-lg mb-1 leading-none uppercase tracking-tighter text-yellow-500">Weak Link Detected</p>
                                        <p className="text-sm font-bold text-white/60 leading-tight">Your terminal network is unstable. We're keeping your session safe.</p>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
