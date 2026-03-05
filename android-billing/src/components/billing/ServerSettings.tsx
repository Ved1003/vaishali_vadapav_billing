
import { useState } from 'react';
import { Settings, Wifi, WifiOff, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';

const STORAGE_KEY = 'serverUrl';
const DEFAULT_URL: string = (import.meta as unknown as { env: Record<string, string> }).env.VITE_API_URL || 'http://localhost:3000/api';

export function getEffectiveServerUrl(): string {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_URL;
}

export function ServerSettings() {
    const [open, setOpen] = useState(false);
    const [url, setUrl] = useState<string>(localStorage.getItem(STORAGE_KEY) || DEFAULT_URL);
    const [saved, setSaved] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null);

    const handleSave = () => {
        const clean = url.trim().replace(/\/api\/?$/, '');
        const apiUrl = `${clean}/api`;
        localStorage.setItem(STORAGE_KEY, apiUrl);
        setUrl(apiUrl);
        setSaved(true);
        setTimeout(() => {
            setSaved(false);
            setOpen(false);
            // Reload page so api.ts picks up the new URL
            window.location.reload();
        }, 800);
    };

    const handleTest = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const base = url.trim().replace(/\/api\/?$/, '');
            const res = await fetch(`${base}/health`, { signal: AbortSignal.timeout(5000) });
            setTestResult(res.ok ? 'ok' : 'fail');
        } catch {
            setTestResult('fail');
        } finally {
            setTesting(false);
        }
    };

    const handleReset = () => {
        localStorage.removeItem(STORAGE_KEY);
        setUrl(DEFAULT_URL);
    };

    return (
        <>
            {/* Trigger button */}
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(true)}
                className="rounded-xl h-9 w-9 text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                title="Server Settings"
            >
                <Settings className="h-4 w-4" />
            </Button>

            {/* Backdrop + Modal */}
            <AnimatePresence>
                {open && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 z-[100] backdrop-blur-sm"
                            onClick={() => setOpen(false)}
                        />

                        {/* Modal */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[101] bg-white rounded-3xl shadow-2xl p-6 max-w-sm mx-auto"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-lg font-black text-slate-900">Server Settings</h2>
                                    <p className="text-xs text-slate-500 mt-0.5">Change backend API URL</p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setOpen(false)}
                                    className="h-8 w-8 rounded-xl text-slate-400"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* URL Input */}
                            <div className="space-y-2 mb-4">
                                <Label className="text-xs font-black text-slate-600 uppercase tracking-wider">
                                    API URL
                                </Label>
                                <Input
                                    value={url}
                                    onChange={e => { setUrl(e.target.value); setTestResult(null); }}
                                    placeholder="http://192.168.1.7:3000/api"
                                    className="h-12 rounded-xl font-mono text-sm bg-slate-50 border-slate-200"
                                    autoCapitalize="none"
                                    autoCorrect="off"
                                    spellCheck={false}
                                />
                                <p className="text-[10px] text-slate-400 font-medium">
                                    Format: http://&lt;SERVER_IP&gt;:3000/api
                                </p>
                            </div>

                            {/* Test result banner */}
                            <AnimatePresence>
                                {testResult && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className={`mb-4 rounded-xl px-4 py-3 flex items-center gap-2 text-sm font-bold ${testResult === 'ok'
                                            ? 'bg-green-50 text-green-700 border border-green-200'
                                            : 'bg-red-50 text-red-700 border border-red-200'
                                            }`}
                                    >
                                        {testResult === 'ok' ? (
                                            <><CheckCircle className="h-4 w-4 flex-shrink-0" /> Server reachable!</>
                                        ) : (
                                            <><WifiOff className="h-4 w-4 flex-shrink-0" /> Cannot reach server. Check IP & port.</>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Action buttons */}
                            <div className="space-y-2">
                                <Button
                                    onClick={handleTest}
                                    disabled={testing || !url.trim()}
                                    variant="outline"
                                    className="w-full h-11 rounded-xl border-slate-200 font-bold text-sm"
                                >
                                    {testing ? (
                                        <span className="flex items-center gap-2">
                                            <span className="h-4 w-4 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin" />
                                            Testing...
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <Wifi className="h-4 w-4" /> Test Connection
                                        </span>
                                    )}
                                </Button>

                                <Button
                                    onClick={handleSave}
                                    disabled={!url.trim() || saved}
                                    className="w-full h-12 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-black shadow-lg shadow-orange-500/20"
                                >
                                    {saved ? (
                                        <span className="flex items-center gap-2">
                                            <CheckCircle className="h-4 w-4" /> Saved! Reloading...
                                        </span>
                                    ) : 'Save & Reconnect'}
                                </Button>

                                <button
                                    onClick={handleReset}
                                    className="w-full text-center text-xs text-slate-400 font-medium underline underline-offset-2 pt-1"
                                >
                                    Reset to default ({DEFAULT_URL})
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
