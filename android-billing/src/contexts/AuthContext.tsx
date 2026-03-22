import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { AuthUser } from '@/types';
import { loginApi, verifyTokenApi, refreshTokenApi, logoutApi, getActiveItemsApi, getActiveFridgeItemsApi } from '@/services/api';

// Pre-fetch menu data immediately after login and store in localStorage
// so BillingScreen loads from cache and feels instant
const prefetchMenu = () => {
    setTimeout(async () => {
        try {
            const [items, fridge] = await Promise.all([
                getActiveItemsApi(),
                getActiveFridgeItemsApi(),
            ]);
            if (items?.length) localStorage.setItem('cachedItems', JSON.stringify({ data: items, ts: Date.now() }));
            if (fridge?.length) localStorage.setItem('cachedFridgeItems', JSON.stringify({ data: fridge, ts: Date.now() }));
        } catch { /* silent fail — BillingScreen will fetch on its own if this fails */ }
    }, 500); // 500ms delay — let the navigation animation finish first
};

interface AuthContextType {
    user: AuthUser | null;
    isLoading: boolean;
    isLoggingIn: boolean;
    isLoggingOut: boolean;
    networkSlow: boolean;
    login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: (silent?: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'authUser';
// 5 minutes between heartbeat checks
const TOKEN_EXPIRY_BUFFER = 60 * 60 * 1000;
const LAZY_VERIFICATION_THRESHOLD = 2 * 60 * 60 * 1000;

const decodeToken = (token: string): { exp?: number } | null => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
        );
        return JSON.parse(jsonPayload);
    } catch {
        return null;
    }
};

const isTokenExpiring = (token: string): boolean => {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return true;
    return (decoded.exp * 1000 - Date.now()) < TOKEN_EXPIRY_BUFFER;
};

// Read user synchronously from localStorage before first render
// This eliminates the initial blank/loading screen entirely
const readStoredUser = (): AuthUser | null => {
    try {
        const stored = localStorage.getItem(AUTH_STORAGE_KEY);
        if (!stored) return null;
        const u: AuthUser = JSON.parse(stored);
        // Quickly check token not expired
        const base64Url = u.token.split('.')[1];
        const payload = JSON.parse(atob(base64Url.replace(/-/g, '+').replace(/_/g, '/')));
        if (payload.exp && payload.exp * 1000 < Date.now()) return null;
        return u;
    } catch {
        return null;
    }
};

export function AuthProvider({ children }: { children: ReactNode }) {
    // Initialize synchronously - no blank screen flash
    const [user, setUser] = useState<AuthUser | null>(readStoredUser);
    const [isLoading, setIsLoading] = useState(false); // Start false - user already set above
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [networkSlow, setNetworkSlow] = useState(false);
    const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isRefreshingRef = useRef(false);

    const logout = async (silent: boolean = false): Promise<void> => {
        let warningTimeout: ReturnType<typeof setTimeout> | null = null;
        
        if (!silent) {
            setIsLoggingOut(true);
            setNetworkSlow(false);
            warningTimeout = setTimeout(() => {
                setNetworkSlow(true);
            }, 5000);
        }

        try {
            await logoutApi();
        } catch (error) {
            console.error('Logout API error:', error);
        } finally {
            if (warningTimeout) clearTimeout(warningTimeout);
            setUser(null);
            localStorage.removeItem(AUTH_STORAGE_KEY);
            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current);
                refreshIntervalRef.current = null;
            }
            
            if (!silent) {
                setIsLoggingOut(false);
                setNetworkSlow(false);
            }
        }
    };

    const refreshAccessToken = async (): Promise<boolean> => {
        if (isRefreshingRef.current) return false;
        const stored = localStorage.getItem(AUTH_STORAGE_KEY);
        if (!stored) return false;
        try {
            const storedUser: AuthUser = JSON.parse(stored);
            if (!storedUser.refreshToken) return false;
            isRefreshingRef.current = true;
            const newToken = await refreshTokenApi(storedUser.refreshToken);
            if (newToken) {
                const updatedUser = { ...storedUser, token: newToken };
                setUser(updatedUser);
                localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
                return true;
            }
            await logout(true);
            return false;
        } catch {
            await logout(true);
            return false;
        } finally {
            isRefreshingRef.current = false;
        }
    };

    const setupTokenRefresh = () => {
        if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = setInterval(async () => {
            const stored = localStorage.getItem(AUTH_STORAGE_KEY);
            if (!stored) return;
            try {
                const storedUser: AuthUser = JSON.parse(stored);
                if (storedUser.token && isTokenExpiring(storedUser.token)) {
                    await refreshAccessToken();
                }
            } catch { /* ignore */ }
        }, 5 * 60 * 1000); // 5-minute heartbeat
    };

    useEffect(() => {
        const init = async () => {
            const stored = localStorage.getItem(AUTH_STORAGE_KEY);
            if (!stored) { setIsLoading(false); return; }
            try {
                const storedUser: AuthUser = JSON.parse(stored);
                setUser(storedUser);

                // LAZY VERIFICATION: Trust local session if fresh
                const base64Url = storedUser.token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const payload = JSON.parse(atob(base64));
                const iat = payload.iat ? payload.iat * 1000 : Date.now();
                
                const isFresh = (Date.now() - iat) < LAZY_VERIFICATION_THRESHOLD;
                
                if (isFresh) {
                    setIsLoading(false);
                    return;
                }

                if (storedUser.token && isTokenExpiring(storedUser.token)) {
                    await refreshAccessToken();
                }
                const verifiedUser = await verifyTokenApi();
                if (verifiedUser) {
                    setUser(verifiedUser);
                } else {
                    await refreshAccessToken();
                }
            } catch {
                setUser(null);
                localStorage.removeItem(AUTH_STORAGE_KEY);
                await logout(true);
            } finally {
                setIsLoading(false);
            }
        };
        init();
        setupTokenRefresh();
        return () => { if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current); };
    }, []);

    const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
        setIsLoading(true);
        setIsLoggingIn(true);
        setNetworkSlow(false);

        const warningTimeout = setTimeout(() => {
            setNetworkSlow(true);
        }, 5000);

        try {
            const authUser = await loginApi(username, password);
            if (authUser) {
                setUser(authUser);
                localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
                setupTokenRefresh();
                prefetchMenu(); // 🚀 warm the item cache in background
                return { success: true };
            }
            return { success: false, error: 'Login failed' };
        } catch (error: any) {
            return { success: false, error: error?.message || 'Login failed. Please try again.' };
        } finally {
            clearTimeout(warningTimeout);
            setIsLoading(false);
            setIsLoggingIn(false);
            setNetworkSlow(false);
        }
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, isLoggingIn, isLoggingOut, networkSlow, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
    return context;
}
