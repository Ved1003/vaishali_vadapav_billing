import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { ServerSettings } from '@/components/billing/ServerSettings';

// Pure CSS animations — no framer-motion needed (saves ~124KB on this chunk)
const styles = `
@keyframes fadeInScale {
    from { opacity: 0; transform: scale(0.85); }
    to   { opacity: 1; transform: scale(1); }
}
@keyframes slideUp {
    from { opacity: 0; transform: translateY(48px); }
    to   { opacity: 1; transform: translateY(0); }
}
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
}
.anim-icon  { animation: fadeInScale 0.35s cubic-bezier(0.34,1.56,0.64,1) both; }
.anim-title { animation: fadeIn 0.3s ease both 0.12s; }
.anim-card  { animation: slideUp 0.4s cubic-bezier(0.22,1,0.36,1) both 0.05s; }
`;

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { login, user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    useEffect(() => {
        if (user) navigate('/billing', { replace: true });
    }, [user, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim() || !password.trim()) {
            toast({ title: 'Enter username & password', variant: 'destructive' });
            return;
        }
        setIsSubmitting(true);
        try {
            const result = await login(username.trim(), password);
            if (result.success) {
                navigate('/billing', { replace: true });
            } else {
                toast({
                    title: 'Login Failed',
                    description: result.error || 'Incorrect credentials.',
                    variant: 'destructive',
                });
                setIsSubmitting(false);
            }
        } catch {
            toast({ title: 'Connection Error', description: 'Cannot reach server. Check Settings (⚙️).', variant: 'destructive' });
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <style>{styles}</style>
            <div className="min-h-screen flex flex-col bg-gradient-to-b from-orange-500 via-amber-500 to-yellow-400 relative">
                {/* Settings Button */}
                <div className="absolute top-4 right-4 z-[50]">
                    <ServerSettings />
                </div>

                {/* Top hero area */}
                <div className="flex-1 flex flex-col items-center justify-center pt-16 pb-8 px-6">
                    <div
                        className="anim-icon h-24 w-24 rounded-3xl bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center shadow-2xl mb-6"
                    >
                        <span className="text-5xl">🧆</span>
                    </div>

                    <div className="anim-title text-center">
                        <h1 className="text-3xl font-black text-white tracking-tight drop-shadow">Vaishali Snacks</h1>
                        <p className="text-white/80 font-bold text-sm tracking-widest uppercase mt-1">Billing Terminal</p>
                    </div>
                </div>

                {/* Login card – bottom sheet style */}
                <div className="anim-card bg-white rounded-t-[2.5rem] pt-8 pb-10 px-6 shadow-2xl">
                    {/* Handle */}
                    <div className="flex justify-center mb-6">
                        <div className="h-1.5 w-10 rounded-full bg-slate-200" />
                    </div>

                    <h2 className="text-2xl font-black text-slate-900 mb-1">Sign In</h2>
                    <p className="text-slate-400 text-sm font-medium mb-7">Access your billing terminal</p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Username */}
                        <div>
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">
                                Username
                            </label>
                            <Input
                                id="username"
                                type="text"
                                placeholder="Enter username"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                className="h-14 rounded-2xl bg-slate-50 border-slate-200 text-slate-900 text-base font-semibold focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                                autoComplete="username"
                                autoCapitalize="none"
                                disabled={isSubmitting}
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="h-14 rounded-2xl bg-slate-50 border-slate-200 text-slate-900 text-base font-semibold pr-14 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                                    autoComplete="current-password"
                                    disabled={isSubmitting}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(v => !v)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 touch-manipulation p-1"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full h-[60px] mt-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-base uppercase tracking-widest shadow-xl shadow-orange-500/30 active:scale-[0.98] transition-transform disabled:opacity-70 flex items-center justify-center gap-2 touch-manipulation"
                        >
                            {isSubmitting ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : 'Login'}
                        </button>
                    </form>

                    <p className="text-center text-xs font-bold text-slate-300 uppercase tracking-widest mt-8">
                        © 2025 Vaishali Snacks Center
                    </p>
                </div>
            </div>
        </>
    );
}
