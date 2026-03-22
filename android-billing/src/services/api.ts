/**
 * API Service – Android Billing App
 * Connects to the deployed Node.js/Express REST API (MongoDB Atlas backend)
 * Configure VITE_API_URL in .env / .env.production
 */

import { AuthUser, Item, Bill, FridgeItem } from '@/types';

// API Base URL – priority: localStorage override → .env VITE_API_URL → localhost fallback
// Change the URL at runtime via the ⚙️ Settings icon in the app header.
const API_URL = localStorage.getItem('serverUrl')
    || import.meta.env.VITE_API_URL
    || 'http://localhost:3000/api';

// Helper: get auth token from localStorage
const getAuthToken = (): string | null => {
    const authUser = localStorage.getItem('authUser');
    if (authUser) {
        try {
            return JSON.parse(authUser).token;
        } catch {
            return null;
        }
    }
    return null;
};

// Helper: authenticated API calls
const apiCall = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
    const token = getAuthToken();

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Add a 10-second timeout to all API calls to avoid hanging on slow networks
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
        const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers, signal: controller.signal });
        clearTimeout(timeout);

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Request failed' }));
            throw new Error(error.error || `HTTP ${response.status}`);
        }

        return response.json();
    } catch (err) {
        clearTimeout(timeout);
        throw err;
    }
};

// ── AUTH ──────────────────────────────────────────────────────────────────────

export const loginApi = async (username: string, password: string): Promise<AuthUser | null> => {
    const data = await apiCall<AuthUser>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    });
    localStorage.setItem('authUser', JSON.stringify(data));
    return data;
};

export const verifyTokenApi = async (): Promise<AuthUser | null> => {
    try {
        const data = await apiCall<AuthUser>('/auth/verify');
        const stored = localStorage.getItem('authUser');
        if (stored) {
            const updatedUser = { ...JSON.parse(stored), ...data };
            localStorage.setItem('authUser', JSON.stringify(updatedUser));
            return updatedUser;
        }
        return data;
    } catch {
        return null;
    }
};

export const refreshTokenApi = async (refreshToken: string): Promise<string | null> => {
    try {
        const response = await fetch(`${API_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
        });
        if (!response.ok) return null;
        const data = await response.json();
        return data.token;
    } catch {
        return null;
    }
};

export const logoutApi = async (): Promise<void> => {
    try {
        const token = getAuthToken();
        // keepalive: true ensures this request completes even if the user navigates away
        await fetch(`${API_URL}/auth/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            keepalive: true,
        });
    } catch {
        // Ignore logout errors
    }
};

// ── ITEMS ─────────────────────────────────────────────────────────────────────

export const getActiveItemsApi = async (): Promise<Item[]> => {
    return apiCall<Item[]>('/items/active');
};

// ── FRIDGE ────────────────────────────────────────────────────────────────────

export const getActiveFridgeItemsApi = async (): Promise<FridgeItem[]> => {
    return apiCall<FridgeItem[]>('/fridge/active');
};

// ── BILLS ─────────────────────────────────────────────────────────────────────

export const createBillApi = async (billData: {
    items: Array<{ itemId: string; itemName: string; quantity: number; price: number; total: number; isFridgeItem?: boolean }>;
    totalAmount: number;
    paymentMode: 'cash' | 'card' | 'upi';
    billerId: string;
    billerName: string;
}): Promise<Bill> => {
    return apiCall<Bill>('/bills', {
        method: 'POST',
        body: JSON.stringify(billData),
    });
};
