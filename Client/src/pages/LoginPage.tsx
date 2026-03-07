import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ShoppingCart, Loader2, User, Lock, ArrowRight, Coffee, Cookie, Sparkles, ChefHat, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { resetPasswordApi } from "@/services/api";

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset Password State
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetUsername, setResetUsername] = useState('');
  const [resetMasterKey, setResetMasterKey] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const { login, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate(user.role === 'ADMIN' ? '/admin' : '/billing', { replace: true });
    }
  }, [user, navigate]);

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUsername || !resetMasterKey || !resetNewPassword) {
      toast({ title: 'Error', description: 'All fields are required', variant: 'destructive' });
      return;
    }

    setIsResetting(true);
    try {
      await resetPasswordApi(resetUsername, resetNewPassword, resetMasterKey);
      toast({ title: 'Success', description: 'Password has been reset successfully. Please login.' });
      setIsResetOpen(false);
      setResetUsername('');
      setResetMasterKey('');
      setResetNewPassword('');
    } catch (error: any) {
      toast({
        title: 'Reset Failed',
        description: error.message || 'Invalid Master Key or Username',
        variant: 'destructive'
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter both username and password',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await login(username.trim(), password);

      if (result.success) {
        toast({
          title: 'Welcome back!',
          description: 'Login successful, taking you to your dashboard.',
        });

        // Post-login redirect is handled by the useEffect watching the 'user' state
      } else {
        toast({
          title: 'Authentication Failed',
          description: result.error || 'The credentials provided are incorrect.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
      }
    } catch (error) {
      toast({
        title: 'System Error',
        description: 'Something went wrong. Please try again later.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#F7F7F9] dark:bg-[#0B0C10]">
      {/* Optimized Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient Orbs - Reduced blur for much better performance */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 dark:bg-orange-600/5 blur-[60px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-500/10 dark:bg-amber-600/5 blur-[60px] rounded-full delay-700" />
        <div className="absolute top-[20%] right-[10%] w-[20%] h-[20%] bg-orange-400/5 blur-[40px] rounded-full" />
      </div>

      {/* Floating Snack Icons */}
      <motion.div
        animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-20 left-20 opacity-10 dark:opacity-5"
      >
        <Coffee className="w-16 h-16 text-orange-600" />
      </motion.div>
      <motion.div
        animate={{ y: [0, 20, 0], rotate: [0, -5, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        className="absolute top-40 right-32 opacity-10 dark:opacity-5"
      >
        <Cookie className="w-20 h-20 text-amber-600" />
      </motion.div>
      <motion.div
        animate={{ y: [0, -15, 0], rotate: [0, 10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-32 left-1/4 opacity-10 dark:opacity-5"
      >
        <ShoppingCart className="w-14 h-14 text-orange-500" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-6xl px-6 relative z-10"
      >
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Left Side - Branding */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="hidden lg:flex flex-col justify-center space-y-8"
          >
            <div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="inline-flex flex-col items-start gap-3 mb-6"
              >
                <motion.div
                  layoutId="logo"
                  className="h-16 w-16 rounded-[2rem] bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center mb-6 shadow-2xl shadow-orange-500/20"
                >
                  <ChefHat className="h-8 w-8 text-white" />
                </motion.div>
                <div>
                  <h1 className="text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                    Vaishali
                  </h1>
                  <p className="text-xl font-bold bg-gradient-to-r from-orange-500 to-amber-600 bg-clip-text text-transparent">Vadapav & Snacks</p>
                </div>
              </motion.div>

              <h2 className="text-4xl font-bold text-slate-800 dark:text-white mb-4 leading-tight">
                Welcome to Your
                <br />
                <span className="bg-gradient-to-r from-orange-500 to-amber-600 bg-clip-text text-transparent">
                  Business HQ
                </span>
              </h2>

              <p className="text-lg text-slate-600 dark:text-slate-300 max-w-md leading-relaxed">
                Streamline your snack center operations with our powerful, easy-to-use billing platform. Fast, secure, and designed for efficiency.
              </p>
            </div>

            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-white">Lightning Fast</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Quick checkout</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                  <Lock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-white">100% Secure</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Protected data</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Side - Login Form */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            {/* Mobile Header - Optimized with bundle icon */}
            <div className="lg:hidden flex flex-col items-center mb-8">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="h-20 w-20 rounded-3xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-2xl shadow-orange-500/20 mb-4"
              >
                <ChefHat className="h-10 w-10 text-white" />
              </motion.div>
              <h1 className="text-4xl font-black text-slate-900 dark:text-white text-center tracking-tight">
                Vaishali Snacks
              </h1>
            </div>

            <div className="bg-white/80 dark:bg-[#1C1D21]/80 backdrop-blur-3xl border border-slate-200/50 dark:border-white/5 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 animate-pulse" />
                  Sign In
                </h3>
                <p className="text-slate-600 dark:text-slate-400">Enter your credentials to access your account</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-slate-700 dark:text-slate-300 font-semibold text-sm">
                    Username
                  </Label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors text-slate-400 group-focus-within:text-orange-600">
                      <User className="h-5 w-5" />
                    </div>
                    <Input
                      id="username"
                      type="text"
                      placeholder="Enter your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="h-12 pl-12 bg-white dark:bg-slate-900 border-slate-200 dark:border-white/5 text-slate-900 dark:text-white placeholder:text-slate-400 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-sm"
                      autoComplete="username"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-slate-700 dark:text-slate-300 font-semibold text-sm">
                      Password
                    </Label>

                    <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
                      <DialogTrigger asChild>
                        <button
                          type="button"
                          className="text-xs font-bold text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 transition-colors"
                        >
                          Forgot Password?
                        </button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                        <DialogHeader>
                          <DialogTitle className="text-slate-900 dark:text-white">Reset Password</DialogTitle>
                          <DialogDescription className="text-slate-600 dark:text-slate-400">
                            Enter your username and the Master Recovery Key to reset your password.
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleResetSubmit} className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="r-username" className="text-slate-700 dark:text-slate-300">Username</Label>
                            <Input
                              id="r-username"
                              value={resetUsername}
                              onChange={(e) => setResetUsername(e.target.value)}
                              placeholder="admin"
                              className="bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="r-key" className="text-slate-700 dark:text-slate-300">Master Recovery Key</Label>
                            <Input
                              id="r-key"
                              type="password"
                              value={resetMasterKey}
                              onChange={(e) => setResetMasterKey(e.target.value)}
                              placeholder="••••••••••••"
                              className="bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="r-new-pass" className="text-slate-700 dark:text-slate-300">New Password</Label>
                            <Input
                              id="r-new-pass"
                              type="password"
                              value={resetNewPassword}
                              onChange={(e) => setResetNewPassword(e.target.value)}
                              placeholder="New secure password"
                              className="bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                            />
                          </div>
                          <DialogFooter>
                            <Button
                              type="submit"
                              disabled={isResetting}
                              className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white"
                            >
                              {isResetting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reset Password"}
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors text-slate-400 group-focus-within:text-orange-600">
                      <Lock className="h-5 w-5" />
                    </div>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 pl-12 bg-white dark:bg-slate-900 border-slate-200 dark:border-white/5 text-slate-900 dark:text-white placeholder:text-slate-400 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-sm"
                      autoComplete="current-password"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-14 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-orange-500/25 transition-all active:scale-[0.98] disabled:opacity-70 group overflow-hidden relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  {isSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      Sign In
                      <ArrowLeft className="h-4 w-4 rotate-180 group-hover:translate-x-1 transition-transform" />
                    </div>
                  )}
                </Button>
              </form>

              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                  Secure login • All rights reserved
                </p>
              </div>
            </div>

            <p className="text-center text-sm text-slate-600 dark:text-slate-400 mt-6">
              © 2025 Vaishali Vadapav & Snacks Center
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
