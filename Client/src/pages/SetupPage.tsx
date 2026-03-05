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
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-16 w-16 rounded-full border-4 border-orange-200 border-t-orange-600 animate-spin" />
                    <p className="font-black text-orange-600 uppercase tracking-widest text-xs">Initializing Vault...</p>
                </div>
            </div>
        );
    }

    if (serverError) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-6 text-center">
                <div className="w-20 h-20 bg-orange-500/10 rounded-3xl flex items-center justify-center mb-6 border border-orange-500/20">
                    <AlertCircle className="w-10 h-10 text-orange-500" />
                </div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Kitchen is Cold</h2>
                <p className="text-slate-400 max-w-sm mt-2 font-medium">
                    The backend server isn't responding. Ensure the application is correctly installed and your database is online.
                </p>
                <Button onClick={fetchStatus} className="mt-8 h-12 rounded-xl bg-orange-600 hover:bg-orange-700 text-white px-8 font-bold">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Ignite Server
                </Button>
            </div>
        );
    }

    return (
        <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950/20 p-6 font-sans relative overflow-hidden">
                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                    <div className="absolute -top-24 -left-24 w-96 h-96 bg-orange-500 rounded-full blur-[120px]" />
                    <div className="absolute top-1/2 -right-24 w-80 h-80 bg-amber-500 rounded-full blur-[100px]" />
                </div>

                <div className="absolute top-8 left-8 flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-5 py-3 backdrop-blur-2xl transition-all hover:bg-white/10">
                    <div className={`w-3 h-3 rounded-full ${currentConfig?.mongoUri ? 'bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.8)]' : 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.8)]'}`} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                        {currentConfig?.mongoUri ? 'Cloud Hybrid' : 'Local Archive'}
                    </span>
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-xl"
                >
                    <Card className="shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-white/5 bg-slate-900/60 backdrop-blur-3xl relative overflow-hidden rounded-[2.5rem]">
                        <CardHeader className="text-center space-y-4 pb-10 pt-12 px-8">
                            <div className="mx-auto w-24 h-24 bg-gradient-to-br from-orange-500 to-amber-600 rounded-[2rem] flex items-center justify-center mb-4 shadow-2xl rotate-3">
                                {step === 1 && <ShieldCheck className="w-12 h-12 text-white" />}
                                {step === 2 && <Cloud className="w-12 h-12 text-white" />}
                                {step === 3 && <ChefHat className="w-12 h-12 text-white" />}
                            </div>
                            <div>
                                <CardTitle className="text-5xl font-black text-white tracking-tighter uppercase italic">
                                    {step === 1 && 'Locked'}
                                    {step === 2 && 'Storage'}
                                    {step === 3 && 'Founder'}
                                </CardTitle>
                                <CardDescription className="text-slate-400 font-bold text-lg leading-tight mt-2">
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
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        onSubmit={handleVerifyCode}
                                        className="space-y-8"
                                    >
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">App Master Key</Label>
                                            <Input
                                                type="password"
                                                placeholder="••••••"
                                                value={secretCode}
                                                onChange={e => setSecretCode(e.target.value)}
                                                className="bg-black/40 border-white/5 text-white text-center text-4xl tracking-[0.5em] h-20 rounded-3xl focus:ring-orange-500/30 font-mono"
                                            />
                                        </div>
                                        <Button type="submit" className="w-full h-16 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-[1.5rem] font-black text-xl shadow-xl shadow-orange-500/20 transition-all uppercase tracking-widest" disabled={isLoading || !secretCode}>
                                            {isLoading ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : 'Decrypt Core'}
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
                                            "p-8 rounded-[2rem] border-2 transition-all relative overflow-hidden group",
                                            !currentConfig?.mongoUri ? "border-orange-500 bg-orange-500/5 shadow-lg shadow-orange-500/10" : "border-white/5 bg-white/5 opacity-50"
                                        )}>
                                            <div className="flex items-start justify-between">
                                                <HardDrive className="w-10 h-10 text-orange-500 mb-4" />
                                                {!currentConfig?.mongoUri && <Badge className="bg-orange-500 text-white font-black px-3 py-1 text-[10px]">ACTIVE</Badge>}
                                            </div>
                                            <h3 className="text-2xl font-black text-white mb-2">Standalone Local</h3>
                                            <p className="text-xs text-slate-500 font-bold mb-4">Fastest response time. Data stays on this machine only.</p>
                                            {currentConfig?.mongoUri && (
                                                <Button onClick={() => handleApplyMongo(null)} disabled={isLoading} className="w-full h-10 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700">
                                                    Switch to Local
                                                </Button>
                                            )}
                                        </div>

                                        <div className={cn(
                                            "p-8 rounded-[2rem] border-2 transition-all relative overflow-hidden",
                                            currentConfig?.mongoUri ? "border-amber-500 bg-amber-500/5 shadow-lg shadow-amber-500/10" : "border-white/5 bg-white/5"
                                        )}>
                                            <div className="flex items-start justify-between">
                                                <Cloud className="w-10 h-10 text-amber-500 mb-4" />
                                                {currentConfig?.mongoUri && <Badge className="bg-amber-500 text-white font-black px-3 py-1 text-[10px]">ACTIVE</Badge>}
                                            </div>
                                            <h3 className="text-2xl font-black text-white mb-2">Cloud Synced</h3>
                                            <p className="text-xs text-slate-500 font-bold mb-6">Real-time sync between multiple terminals via MongoDB Atlas.</p>

                                            <div className="space-y-4">
                                                <Input
                                                    placeholder="mongodb+srv://user:pass@atlas..."
                                                    value={mongoUri}
                                                    onChange={e => { setMongoUri(e.target.value); setConnectionStatus('idle'); }}
                                                    className="bg-black/40 border-white/10 text-amber-100 text-[10px] h-12 rounded-2xl font-mono"
                                                />
                                                <div className="flex gap-2">
                                                    <Button
                                                        onClick={handleTestConnection}
                                                        disabled={isTestingConnection || !mongoUri}
                                                        variant="outline"
                                                        className="flex-1 h-12 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 rounded-2xl font-black uppercase text-xs tracking-tighter"
                                                    >
                                                        {isTestingConnection ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : 'Verify DB'}
                                                    </Button>
                                                    <Button
                                                        onClick={() => handleApplyMongo(mongoUri)}
                                                        disabled={isLoading || !mongoUri || connectionStatus !== 'success'}
                                                        className="flex-1 h-12 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl font-black uppercase text-xs tracking-tighter"
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
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        onSubmit={handleCreateAdmin}
                                        className="space-y-6"
                                    >
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Real Name</Label>
                                                <Input required value={adminDetails.name} onChange={e => setAdminDetails({ ...adminDetails, name: e.target.value })} className="bg-white/5 border-white/10 text-white h-14 rounded-2xl focus:ring-orange-500/20 font-bold" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Admin Username</Label>
                                                <Input required placeholder="e.g. admin" value={adminDetails.username} onChange={e => setAdminDetails({ ...adminDetails, username: e.target.value })} className="bg-white/5 border-white/10 text-white h-14 rounded-2xl focus:ring-orange-500/20 font-bold" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Secure Password</Label>
                                            <Input type="password" required minLength={6} value={adminDetails.password} onChange={e => setAdminDetails({ ...adminDetails, password: e.target.value })} className="bg-white/5 border-white/10 text-white h-14 rounded-2xl focus:ring-orange-500/20 font-bold" />
                                        </div>

                                        <div className="pt-8 flex flex-col gap-4">
                                            <Button type="submit" className="w-full h-16 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-[1.5rem] font-black text-xl shadow-2xl shadow-orange-500/30 uppercase tracking-widest" disabled={isLoading}>
                                                {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : 'Launch Kitchen'}
                                            </Button>
                                            <Button variant="ghost" type="button" onClick={() => setStep(2)} className="text-slate-500 hover:text-white font-bold">Back to Storage</Button>
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
                        className="fixed bottom-10 bg-red-600 text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-4 z-50 border-4 border-white/10"
                    >
                        <AlertCircle className="h-6 w-6" />
                        <div>
                            <p className="font-black text-xs uppercase tracking-tighter leading-none">Native Error</p>
                            <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">Running in browser mode. System functions restricted.</p>
                        </div>
                    </motion.div>
                )}
            </div>
        </ThemeProvider>
    );
}
