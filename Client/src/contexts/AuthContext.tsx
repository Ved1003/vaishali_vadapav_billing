import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { AuthUser } from '@/types';
import { loginApi, verifyTokenApi, refreshTokenApi, logoutApi } from '@/services/api';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
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
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef(false);

  /**
   * Refresh access token using refresh token
   */
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

      // Refresh token expired, logout user
      await logout();
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      await logout();
      return false;
    } finally {
      isRefreshingRef.current = false;
    }
  };

  /**
   * Verify current token and refresh if needed
   */
  const verifyAndRefreshToken = async (): Promise<void> => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) {
      setIsLoading(false);
      return;
    }

    try {
      const storedUser: AuthUser = JSON.parse(stored);

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
        setUser(verifiedUser);
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
      localStorage.removeItem(AUTH_STORAGE_KEY);
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
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!stored) return;

      try {
        const storedUser: AuthUser = JSON.parse(stored);
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
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!stored) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const storedUser: AuthUser = JSON.parse(stored);

        // Optimistically set user from localStorage to prevent flash of login redirect
        if (isMounted) setUser(storedUser);

        // Verify token in background
        const verifiedUser = await verifyTokenApi();

        if (verifiedUser && isMounted) {
          // If server returns fresh data, merge it with existing tokens
          const updatedUser = { ...storedUser, ...verifiedUser };
          setUser(updatedUser);
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
        } else if (!verifiedUser && isMounted) {
          // Token invalid, try refresh quietly
          if (storedUser.refreshToken) {
            const refreshed = await refreshAccessToken();
            if (!refreshed && isMounted) {
              await logout();
            }
          } else if (isMounted) {
            await logout();
          }
        }
      } catch (error) {
        console.error('Initialization error:', error);
        if (isMounted) await logout();
      } finally {
        if (isMounted) {
          setIsLoading(false);
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
    try {
      const authUser = await loginApi(username, password);
      if (authUser) {
        setUser(authUser);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
        setupTokenRefresh(); // Restart refresh interval
        return { success: true };
      }
      return { success: false, error: 'Login failed' };
    } catch (error: any) {
      const errorMessage = error?.message || error?.error || 'Login failed. Please try again.';
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await logoutApi();
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      setUser(null);
      localStorage.removeItem(AUTH_STORAGE_KEY);

      // Clear refresh interval
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
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
