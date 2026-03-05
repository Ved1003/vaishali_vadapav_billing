/**
 * API Service – Web/Android Implementation
 *
 * Connects to the deployed Node.js/Express REST API.
 * Configure VITE_API_URL in .env / .env.production
 */

import { User, AuthUser, Item, Bill, DashboardStats, BillerRevenue, DailyRevenue, FridgeItem } from '@/types';

// API Base URL – set via environment variable in .env.production
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Helper function to get auth token from localStorage
const getAuthToken = (): string | null => {
  const authUser = localStorage.getItem('authUser');
  if (authUser) {
    try {
      const user = JSON.parse(authUser);
      return user.token;
    } catch {
      return null;
    }
  }
  return null;
};

// Helper function for API calls with authentication
const apiCall = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getAuthToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Add cache-busting timestamp to all GET requests
  const url = new URL(`${API_URL}${endpoint}`);
  if (!options.method || options.method === 'GET') {
    url.searchParams.append('_t', Date.now().toString());
  }

  const response = await fetch(url.toString(), {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
};

// ============ AUTH API ============
export const loginApi = async (username: string, password: string): Promise<AuthUser | null> => {
  try {
    const data = await apiCall<AuthUser>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    // Store user data with tokens in localStorage
    localStorage.setItem('authUser', JSON.stringify(data));

    return data;
  } catch (error: any) {
    console.error('Login error:', error);
    throw error; // Re-throw to allow better error handling in AuthContext
  }
};

export const verifyTokenApi = async (): Promise<AuthUser | null> => {
  try {
    const data = await apiCall<AuthUser>('/auth/verify');

    // Update stored user data (excluding tokens)
    const stored = localStorage.getItem('authUser');
    if (stored) {
      const storedUser = JSON.parse(stored);
      const updatedUser = { ...storedUser, ...data };
      localStorage.setItem('authUser', JSON.stringify(updatedUser));
      return updatedUser;
    }

    return data;
  } catch (error: any) {
    console.error('Token verification error:', error);
    return null;
  }
};

export const refreshTokenApi = async (refreshToken: string): Promise<string | null> => {
  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error('Refresh token error:', error);
    return null;
  }
};

export const logoutApi = async (): Promise<void> => {
  try {
    await apiCall<void>('/auth/logout', {
      method: 'POST',
    });
  } catch (error) {
    console.error('Logout error:', error);
  }
};

export const resetPasswordApi = async (username: string, newPassword: string, masterKey: string): Promise<{ message: string }> => {
  // Use public recovery endpoint
  return apiCall<{ message: string }>('/auth/recovery/reset', {
    method: 'POST',
    body: JSON.stringify({ username, newPassword, masterKey }),
  });
};

// ============ DASHBOARD API ============
export const getDashboardStatsApi = async (period: string = 'monthly'): Promise<DashboardStats> => {
  return apiCall<DashboardStats>(`/dashboard/stats?period=${period}`);
};

export const getDailyRevenueApi = async (days: number = 7): Promise<DailyRevenue[]> => {
  return apiCall<DailyRevenue[]>(`/dashboard/daily-revenue?days=${days}`);
};

export const getBillerRevenueApi = async (period: string = 'monthly'): Promise<BillerRevenue[]> => {
  return apiCall<BillerRevenue[]>(`/dashboard/biller-revenue?period=${period}`);
};

export const getDashboardOverviewApi = async (params: {
  statsPeriod?: string;
  billerPeriod?: string;
  chartDays?: number;
} = {}): Promise<{
  stats: DashboardStats;
  billerRevenue: BillerRevenue[];
  dailyRevenue: DailyRevenue[];
}> => {
  const queryParams = new URLSearchParams();
  if (params.statsPeriod) queryParams.append('statsPeriod', params.statsPeriod);
  if (params.billerPeriod) queryParams.append('billerPeriod', params.billerPeriod);
  if (params.chartDays) queryParams.append('chartDays', String(params.chartDays));

  return apiCall<{
    stats: DashboardStats;
    billerRevenue: BillerRevenue[];
    dailyRevenue: DailyRevenue[];
  }>(`/dashboard/overview?${queryParams.toString()}`);
};

// ============ ITEMS API ============
export const getItemsApi = async (): Promise<Item[]> => {
  return apiCall<Item[]>('/items');
};

export const getActiveItemsApi = async (): Promise<Item[]> => {
  return apiCall<Item[]>('/items/active');
};

export const createItemApi = async (item: Partial<Item>): Promise<Item> => {
  return apiCall<Item>('/items', {
    method: 'POST',
    body: JSON.stringify(item),
  });
};

export const updateItemApi = async (id: string, item: Partial<Item>): Promise<Item> => {
  return apiCall<Item>(`/items/${id}`, {
    method: 'PUT',
    body: JSON.stringify(item),
  });
};

export const deleteItemApi = async (id: string): Promise<void> => {
  return apiCall<void>(`/items/${id}`, {
    method: 'DELETE',
  });
};

// ============ USERS API ============
export const getUsersApi = async (): Promise<User[]> => {
  return apiCall<User[]>('/users');
};

export const createUserApi = async (user: Partial<User>): Promise<User> => {
  return apiCall<User>('/users', {
    method: 'POST',
    body: JSON.stringify(user),
  });
};

export const updateUserApi = async (id: string, user: Partial<User>): Promise<User> => {
  return apiCall<User>(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(user),
  });
};

export const deleteUserApi = async (id: string): Promise<void> => {
  return apiCall<void>(`/users/${id}`, {
    method: 'DELETE',
  });
};

// ============ BILLS API ============
export const createBillApi = async (billData: any): Promise<Bill> => {
  return apiCall<Bill>('/bills', {
    method: 'POST',
    body: JSON.stringify(billData),
  });
};

export const getBillsApi = async (filters: any = {}): Promise<Bill[]> => {
  const queryParams = new URLSearchParams();
  Object.keys(filters).forEach(key => {
    if (filters[key]) queryParams.append(key, String(filters[key]));
  });
  const response = await apiCall<{ bills: Bill[], pagination: any }>(`/bills?${queryParams.toString()}`);
  return response.bills;
};

export const deleteBillApi = async (id: string): Promise<void> => {
  return apiCall<void>(`/bills/${id}`, {
    method: 'DELETE',
  });
};

// ============ REPORTS API ============
export const downloadSalesReportApi = async (startDate: string, endDate: string): Promise<void> => {
  const token = getAuthToken();
  const headers: HeadersInit = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}/reports/sales?startDate=${startDate}&endDate=${endDate}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Download failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  // Handle blob download
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;

  // Try to get filename from content-disposition
  const contentDisposition = response.headers.get('Content-Disposition');
  let filename = `Sales_Report_${startDate}_to_${endDate}.xlsx`;
  if (contentDisposition && contentDisposition.indexOf('attachment') !== -1) {
    const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
    const matches = filenameRegex.exec(contentDisposition);
    if (matches != null && matches[1]) {
      filename = matches[1].replace(/['"]/g, '');
    }
  }

  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

// ============ FRIDGE INVENTORY API ============
export const getFridgeItemsApi = async (): Promise<FridgeItem[]> => {
  return apiCall<FridgeItem[]>('/fridge');
};

export const getActiveFridgeItemsApi = async (): Promise<FridgeItem[]> => {
  return apiCall<FridgeItem[]>('/fridge/active');
};

export const createFridgeItemApi = async (item: Partial<FridgeItem>): Promise<FridgeItem> => {
  return apiCall<FridgeItem>('/fridge', { method: 'POST', body: JSON.stringify(item) });
};

export const updateFridgeItemApi = async (id: string, item: Partial<FridgeItem>): Promise<FridgeItem> => {
  return apiCall<FridgeItem>(`/fridge/${id}`, { method: 'PUT', body: JSON.stringify(item) });
};

export const restockFridgeItemApi = async (id: string, quantity: number): Promise<FridgeItem> => {
  return apiCall<FridgeItem>(`/fridge/${id}/restock`, { method: 'POST', body: JSON.stringify({ quantity }) });
};

export const deleteFridgeItemApi = async (id: string): Promise<void> => {
  return apiCall<void>(`/fridge/${id}`, { method: 'DELETE' });
};

