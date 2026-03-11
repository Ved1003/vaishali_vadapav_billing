import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { AuthUser } from '@/types';
import { loginApi, verifyTokenApi, refreshTokenApi, logoutApi } from '@/services/api';

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
const TOKEN_REFRESH_INTERVAL = 5 * 60 * 1000; // Check token every 5 minutes
const TOKEN_EXPIRY_BUFFER = 60 * 60 * 1000; // Refresh if expires within 1 hour

/**
 * Decode JWT token to check expiration
 */
const decodeToken = (token: string): { exp?: number; iat?: number } | null => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

/**
 * Check if token is expired or expiring soon
 */
const isTokenExpiring = (token: string): boolean => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;

  const expirationTime = decoded.exp * 1000; // Convert to milliseconds
  const currentTime = Date.now();
  const timeUntilExpiry = expirationTime - currentTime;

  // Return true if expired or expiring within buffer time
  return timeUntilExpiry < TOKEN_EXPIRY_BUFFER;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [networkSlow, setNetworkSlow] = useState(false);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef(false);

  /**
   * Helper to get stored auth data from either localStorage or sessionStorage
   */
  const getStoredAuth = (): AuthUser | null => {
    const local = localStorage.getItem(AUTH_STORAGE_KEY);
    const session = sessionStorage.getItem(AUTH_STORAGE_KEY);

    try {
      if (local) return JSON.parse(local);
      if (session) return JSON.parse(session);
    } catch (e) {
      console.error('Error parsing stored auth:', e);
    }
    return null;
  };

  /**
   * Helper to set auth data based on role
   */
  const setStoredAuth = (userData: AuthUser) => {
    const data = JSON.stringify(userData);
    if (userData.role === 'BILLER') {
      sessionStorage.setItem(AUTH_STORAGE_KEY, data);
      localStorage.removeItem(AUTH_STORAGE_KEY); // Clean up any stale local data
    } else {
      localStorage.setItem(AUTH_STORAGE_KEY, data);
      sessionStorage.removeItem(AUTH_STORAGE_KEY); // Clean up any stale session data
    }
  };

  /**
   * Helper to clear auth from both storages
   */
  const clearStoredAuth = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
  };

  /**
   * Refresh access token using refresh token
   */
  const refreshAccessToken = async (): Promise<boolean> => {
    if (isRefreshingRef.current) return false;

    const storedUser = getStoredAuth();
    if (!storedUser?.refreshToken) return false;

    try {
      isRefreshingRef.current = true;
      const newToken = await refreshTokenApi(storedUser.refreshToken);

      if (newToken) {
        const updatedUser = { ...storedUser, token: newToken };
        setUser(updatedUser);
        setStoredAuth(updatedUser);
        return true;
      }

      // Refresh token expired, logout user silently
      await logout(true);
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      await logout(true);
      return false;
    } finally {
      isRefreshingRef.current = false;
    }
  };

  /**
   * Verify current token and refresh if needed
   */
  const verifyAndRefreshToken = async (): Promise<void> => {
    const storedUser = getStoredAuth();
    if (!storedUser) {
      setIsLoading(false);
      return;
    }

    try {
      // Check if token is expiring
      if (storedUser.token && isTokenExpiring(storedUser.token)) {
        // Try to refresh token
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          setIsLoading(false);
          return;
        }
      }

      // Verify token with server
      const verifiedUser = await verifyTokenApi();
      if (verifiedUser) {
        setUser({ ...storedUser, ...verifiedUser });
      } else {
        // Token invalid, try refresh
        if (storedUser.refreshToken) {
          const refreshed = await refreshAccessToken();
          if (!refreshed) {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      }
    } catch (error) {
      console.error('Token verification error:', error);
      setUser(null);
      clearStoredAuth();
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Set up token refresh interval
   */
  const setupTokenRefresh = () => {
    // Clear existing interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    // Set up new interval to check and refresh token
    refreshIntervalRef.current = setInterval(async () => {
      const storedUser = getStoredAuth();
      if (!storedUser) return;

      try {
        if (storedUser.token && isTokenExpiring(storedUser.token)) {
          await refreshAccessToken();
        }
      } catch (error) {
        console.error('Token refresh check error:', error);
      }
    }, TOKEN_REFRESH_INTERVAL);
  };

  /**
   * Initialize auth state on mount
   */
  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      const storedUser = getStoredAuth();
      if (!storedUser) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        // Optimistically set user from storage to prevent flash of login redirect
        if (isMounted) {
          setUser(storedUser);
          setIsLoading(false); // OPTIMISTIC: Let the app render immediately
        }

        // Verify token in background
        const verifiedUser = await verifyTokenApi();

        if (verifiedUser && isMounted) {
          // If server returns fresh data, merge it with existing tokens
          const updatedUser = { ...storedUser, ...verifiedUser };
          setUser(updatedUser);
          setStoredAuth(updatedUser);
        } else if (!verifiedUser && isMounted) {
          // Token invalid, try refresh quietly
          if (storedUser.refreshToken) {
            const refreshed = await refreshAccessToken();
            if (!refreshed && isMounted) {
              await logout(true);
            }
          } else if (isMounted) {
            await logout(true);
          }
        }
      } catch (error) {
        console.error('Initialization error:', error);
        if (isMounted) {
          await logout(true);
          setIsLoading(false);
        }
      } finally {
        if (isMounted) {
          setupTokenRefresh();
        }
      }
    };

    initialize();

    return () => {
      isMounted = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []); // Run ONLY once on mount

  /**
   * Separate effect for Heartbeat
   */
  useEffect(() => {
    if (!user) return;

    const heartbeatInterval = setInterval(() => {
      verifyTokenApi().catch(err => {
        console.error('Heartbeat failed:', err);
        // Only logout if it's a 401 Unauthorized
        if (err.message?.includes('401') || err.message?.includes('expired')) {
          logout();
        }
      });
    }, 60000); // 1 minute heartbeat is sufficient

    return () => clearInterval(heartbeatInterval);
  }, [!!user]); // Only restart if user presence changes

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
        setStoredAuth(authUser);
        setupTokenRefresh(); // Restart refresh interval
        return { success: true };
      }
      return { success: false, error: 'Login failed' };
    } catch (error: any) {
      const errorMessage = error?.message || error?.error || 'Login failed. Please try again.';
      return { success: false, error: errorMessage };
    } finally {
      clearTimeout(warningTimeout);
      setIsLoading(false);
      setIsLoggingIn(false);
      setNetworkSlow(false);
    }
  };

  const logout = async (silent: boolean = false): Promise<void> => {
    let warningTimeout: NodeJS.Timeout | null = null;
    
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
      clearStoredAuth();

      // Clear refresh interval
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

  return (
    <AuthContext.Provider value={{ user, isLoading, isLoggingIn, isLoggingOut, networkSlow, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
