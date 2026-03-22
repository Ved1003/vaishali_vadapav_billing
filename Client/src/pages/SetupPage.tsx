import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck, UserPlus, ArrowRight, Loader2, Cloud, HardDrive, RefreshCw, CheckCircle2, AlertCircle, Store, Sparkles, ChefHat } from 'lucide-react';
import { ThemeProvider } from '@/components/theme-provider';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function SetupPage() {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [secretCode, setSecretCode] = useState('');
    const [adminDetails, setAdminDetails] = useState({ name: '', username: '', password: '' });
    const [mongoUri, setMongoUri] = useState('');
    const [currentConfig, setCurrentConfig] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isChecking, setIsChecking] = useState(true);
    const [isTestingConnection, setIsTestingConnection] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [serverError, setServerError] = useState(false);
    const navigate = useNavigate();
    const { toast } = useToast();

    const fetchStatus = async () => {
        setServerError(false);
        try {
            if ((window as any).electronAPI) {
                const config = await (window as any).electronAPI.getConfig();
                setCurrentConfig(config);
                if (config.mongoUri) setMongoUri(config.mongoUri);
            }
            const res = await fetch('http://localhost:3000/api/setup/status');
            const data = await res.json();
            if (data.isSetup) {
                navigate('/login');
            }
        } catch (err) {
            console.error("Failed to check setup status:", err);
            setServerError(true);
        } finally {
            setIsChecking(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, [navigate]);

    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const res = await fetch('http://localhost:3000/api/setup/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: secretCode })
            });
            const data = await res.json();

            if (data.success) {
                if (currentConfig?.mongoUri) setStep(3);
                else setStep(2);
                toast({ title: "System Decrypted", variant: "default" });
            } else {
                toast({ title: "Invalid Master Code", variant: "destructive" });
            }
        } catch (err) {
            toast({ title: "Verification Failed", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleTestConnection = async () => {
        if (!mongoUri) {
            toast({ title: "URI Required", variant: "destructive" });
            return;
        }
        setIsTestingConnection(true);
        setConnectionStatus('idle');
        try {
            const res = await fetch('http://localhost:3000/api/setup/validate-mongo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mongoUri })
            });
            const data = await res.json();
            if (data.success) {
                setConnectionStatus('success');
                toast({ title: "Linked Successfully", description: "Cloud database is reachable." });
            } else {
                setConnectionStatus('error');
                toast({ title: "Link Failed", description: data.message, variant: "destructive" });
            }
        } catch (err) {
            setConnectionStatus('error');
            toast({ title: "Test Failed", variant: "destructive" });
        } finally {
            setIsTestingConnection(false);
        }
    };

    const handleApplyMongo = async (uri: string | null) => {
        setIsLoading(true);
        try {
            if ((window as any).electronAPI) {
                await (window as any).electronAPI.saveConfig({ mongoUri: uri });
                toast({ title: "Configuration Updated", description: "Relaunching system..." });
                setTimeout(() => { (window as any).electronAPI.relaunch(); }, 1500);
            }
        } catch (err) {
            toast({ title: "Config Error", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (adminDetails.password.length < 6) {
            toast({ title: "Weak Password", variant: "destructive" });
            return;
        }
        setIsLoading(true);
        try {
            const res = await fetch('http://localhost:3000/api/setup/create-admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(adminDetails)
            });
            const data = await res.json();
            if (data.success) {
                if ((window as any).electronAPI) await (window as any).electronAPI.markSetupComplete();
                toast({ title: "Welcome Aboard!", description: "Master admin account initialized." });
                setTimeout(() => { navigate('/login'); }, 1000);
            } else {
                toast({ title: "Initializers Error", description: data.message, variant: "destructive" });
            }
        } catch (err) {
            toast({ title: "Fatal Error", description: "Server unreachable.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    if (isChecking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0B0C10]">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-16 w-16 rounded-full border-4 border-slate-800 border-t-indigo-600 animate-spin" />
                    <p className="font-black text-slate-500 uppercase tracking-widest text-[10px] animate-pulse">Initializing Vault...</p>
                </div>
            </div>
        );
    }

    if (serverError) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0C10] p-6 text-center">
                <motion.div
                    layoutId="logo"
                    className="h-20 w-20 rounded-[2.5rem] bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center mb-8 shadow-2xl shadow-orange-500/20"
                >
                    <ChefHat className="h-10 w-10 text-white" />
                </motion.div>
                <h2 className="text-4xl font-black text-white uppercase tracking-tighter leading-none">Kitchen is Cold</h2>
                <p className="text-slate-500 max-w-sm mt-4 font-bold uppercase tracking-widest text-[10px] leading-relaxed">
                    The backend server isn't responding. Ensure the application is correctly installed and your database is online.
                </p>
                <Button onClick={fetchStatus} className="mt-10 h-14 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white px-10 font-black uppercase tracking-widest text-xs shadow-xl shadow-orange-500/20 transition-all active:scale-95">
                    <RefreshCw className="mr-3 h-5 w-5" />
                    Ignite Server
                </Button>
            </div>
        );
    }

    return (
        <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
            <div className="min-h-screen flex items-center justify-center bg-[#F7F7F9] dark:bg-[#0B0C10] p-6 font-sans relative overflow-hidden">
                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
                    <div className="absolute -top-24 -left-24 w-[30rem] h-[30rem] bg-orange-500 rounded-full blur-[150px]" />
                    <div className="absolute top-1/2 -right-24 w-[25rem] h-[25rem] bg-amber-500 rounded-full blur-[130px]" />
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[40rem] h-40 bg-fuchsia-500/20 blur-[100px]" />
                </div>

                <div className="absolute top-8 left-8 flex items-center gap-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-3 shadow-xl backdrop-blur-2xl transition-all hover:bg-white/10">
                    <div className={`w-3 h-3 rounded-full ${currentConfig?.mongoUri ? 'bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.8)]' : 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]'}`} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-300">
                        {currentConfig?.mongoUri ? 'Cloud Hybrid' : 'Local Archive'}
                    </span>
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-xl"
                >
                    <Card className="shadow-2xl shadow-orange-500/10 border-none bg-white/80 dark:bg-[#1C1D21]/80 backdrop-blur-3xl relative overflow-hidden rounded-[3rem]">
                        <CardHeader className="text-center space-y-4 pb-10 pt-16 px-10">
                            <div className="mx-auto w-28 h-28 bg-gradient-to-br from-orange-500 to-amber-600 rounded-[2.5rem] flex items-center justify-center mb-6 shadow-2xl rotate-3 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                                {step === 1 && <ShieldCheck className="w-14 h-14 text-white relative z-10" />}
                                {step === 2 && <Cloud className="w-14 h-14 text-white relative z-10" />}
                                {step === 3 && <ChefHat className="w-14 h-14 text-white relative z-10" />}
                            </div>
                            <div>
                                <CardTitle className="text-6xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">
                                    {step === 1 && 'Locked'}
                                    {step === 2 && 'Storage'}
                                    {step === 3 && 'Founder'}
                                </CardTitle>
                                <CardDescription className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] mt-4">
                                    {step === 1 && 'Validation required to unlock vault'}
                                    {step === 2 && 'Connect your global data source'}
                                    {step === 3 && 'Setup the master chef account'}
                                </CardDescription>
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-8 px-10 pb-12">
                            <AnimatePresence mode="wait">
                                {step === 1 && (
                                    <motion.form
                                        key="step1"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        onSubmit={handleVerifyCode}
                                        className="space-y-10"
                                    >
                                        <div className="space-y-3">
                                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] ml-2">App Master Key</Label>
                                            <div className="relative group">
                                                <Input
                                                    type="password"
                                                    placeholder="••••••"
                                                    value={secretCode}
                                                    onChange={e => setSecretCode(e.target.value)}
                                                    className="bg-slate-50 dark:bg-black/40 border-slate-200 dark:border-white/5 text-slate-900 dark:text-white text-center text-4xl tracking-[0.5em] h-24 rounded-[2rem] focus:ring-orange-500/20 font-black shadow-inner transition-all group-focus-within:border-orange-500/50"
                                                />
                                            </div>
                                        </div>
                                        <Button type="submit" className="w-full h-18 py-8 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-[2rem] font-black text-xl shadow-2xl shadow-orange-500/30 transition-all uppercase tracking-[0.2em] active:scale-[0.98]" disabled={isLoading || !secretCode}>
                                            {isLoading ? <Loader2 className="h-8 w-8 animate-spin" /> : 'Decrypt Core'}
                                        </Button>
                                    </motion.form>
                                )}

                                {step === 2 && (
                                    <motion.div
                                        key="step2"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-4"
                                    >
                                        <div className={cn(
                                            "p-10 rounded-[2.5rem] border-2 transition-all relative overflow-hidden group cursor-pointer",
                                            !currentConfig?.mongoUri ? "border-orange-500 bg-orange-500/5 shadow-2xl shadow-orange-500/10" : "border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 opacity-50"
                                        )}>
                                            <div className="flex items-start justify-between">
                                                <HardDrive className="w-12 h-12 text-orange-500 mb-6" />
                                                {!currentConfig?.mongoUri && <Badge className="bg-orange-500 text-white font-black px-4 py-1 text-[10px] tracking-widest uppercase">ACTIVE</Badge>}
                                            </div>
                                            <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-2 leading-none">Standalone Local</h3>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-6">Fastest response time. Data stays on this machine only.</p>
                                            {currentConfig?.mongoUri && (
                                                <Button onClick={() => handleApplyMongo(null)} disabled={isLoading} className="w-full h-12 rounded-xl bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] hover:bg-black transition-all">
                                                    Switch to Local
                                                </Button>
                                            )}
                                        </div>

                                        <div className={cn(
                                            "p-10 rounded-[2.5rem] border-2 transition-all relative overflow-hidden group cursor-pointer",
                                            currentConfig?.mongoUri ? "border-violet-500 bg-violet-500/5 shadow-2xl shadow-violet-500/10" : "border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5"
                                        )}>
                                            <div className="flex items-start justify-between">
                                                <Cloud className="w-12 h-12 text-violet-500 mb-6" />
                                                {currentConfig?.mongoUri && <Badge className="bg-violet-500 text-white font-black px-4 py-1 text-[10px] tracking-widest uppercase">ACTIVE</Badge>}
                                            </div>
                                            <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-2 leading-none">Cloud Synced</h3>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-8">Real-time sync between multiple terminals via MongoDB Atlas.</p>

                                            <div className="space-y-5">
                                                <Input
                                                    placeholder="mongodb+srv://user:pass@atlas..."
                                                    value={mongoUri}
                                                    onChange={e => { setMongoUri(e.target.value); setConnectionStatus('idle'); }}
                                                    className="bg-white dark:bg-black/40 border-slate-200 dark:border-white/10 text-indigo-600 dark:text-indigo-400 text-[10px] h-14 rounded-2xl font-mono shadow-inner"
                                                />
                                                <div className="flex gap-3">
                                                    <Button
                                                        onClick={handleTestConnection}
                                                        disabled={isTestingConnection || !mongoUri}
                                                        variant="outline"
                                                        className="flex-1 h-14 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all"
                                                    >
                                                        {isTestingConnection ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : 'Verify DB'}
                                                    </Button>
                                                    <Button
                                                        onClick={() => handleApplyMongo(mongoUri)}
                                                        disabled={isLoading || !mongoUri || connectionStatus !== 'success'}
                                                        className="flex-1 h-14 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg shadow-indigo-500/20"
                                                    >
                                                        Apply Link
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>

                                        <Button variant="ghost" onClick={() => setStep(3)} className="w-full text-slate-500 hover:text-white mt-4 font-bold flex items-center justify-center gap-2">
                                            Skip Connection <ArrowRight className="h-4 w-4" />
                                        </Button>
                                    </motion.div>
                                )}

                                {step === 3 && (
                                    <motion.form
                                        key="step3"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        onSubmit={handleCreateAdmin}
                                        className="space-y-8"
                                    >
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Real Name</Label>
                                                <Input required value={adminDetails.name} onChange={e => setAdminDetails({ ...adminDetails, name: e.target.value })} className="bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white h-14 rounded-2xl focus:ring-indigo-500/20 font-black" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Admin ID</Label>
                                                <Input required placeholder="admin_login" value={adminDetails.username} onChange={e => setAdminDetails({ ...adminDetails, username: e.target.value })} className="bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white h-14 rounded-2xl focus:ring-indigo-500/20 font-black" />
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Secure Password</Label>
                                            <Input type="password" required minLength={6} value={adminDetails.password} onChange={e => setAdminDetails({ ...adminDetails, password: e.target.value })} className="bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white h-14 rounded-2xl focus:ring-indigo-500/20 font-black" />
                                        </div>

                                        <div className="pt-10 flex flex-col gap-6">
                                            <Button type="submit" className="w-full h-18 py-8 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white rounded-[2rem] font-black text-xl shadow-2xl shadow-indigo-500/30 uppercase tracking-[0.2em] transition-all transform active:scale-[0.98]" disabled={isLoading}>
                                                {isLoading ? <Loader2 className="h-8 w-8 animate-spin" /> : 'Launch Kitchen'}
                                            </Button>
                                            <Button variant="ghost" type="button" onClick={() => setStep(2)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors">Back to Storage</Button>
                                        </div>
                                    </motion.form>
                                )}
                            </AnimatePresence>
                        </CardContent>
                    </Card>

                    <p className="text-center mt-8 text-slate-500 text-xs font-bold tracking-widest uppercase">
                        © 2025 Vaishali Vadapav & Snacks • Core V1.0
                    </p>
                </motion.div>

                {!isChecking && currentConfig === null && (
                    <motion.div
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="fixed bottom-10 bg-indigo-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-5 z-50 border-4 border-white/20 backdrop-blur-xl"
                    >
                        <AlertCircle className="h-8 w-8 text-white/50" />
                        <div>
                            <p className="font-black text-xs uppercase tracking-widest leading-none mb-1">Native Override</p>
                            <p className="text-[9px] font-black opacity-60 uppercase tracking-[0.2em]">Running in browser mode. System functions restricted.</p>
                        </div>
                    </motion.div>
                )}
            </div>
        </ThemeProvider>
    );
}
