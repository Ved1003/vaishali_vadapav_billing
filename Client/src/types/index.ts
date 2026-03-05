// User Types
export type UserRole = 'ADMIN' | 'BILLER';

export interface User {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  status: 'active' | 'inactive';
  createdAt: string;
  lastLogin?: string;
  lastLogout?: string;
  isOnline?: boolean;
  password?: string;
}

export interface AuthUser extends User {
  token: string;
  refreshToken?: string;
  lastLogin?: string;
}

// Item Types
export interface Item {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
}

// Bill Types
export interface BillItem {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Bill {
  id: string;
  billNumber: string;
  items: BillItem[];
  totalAmount: number;
  paymentMode: 'cash' | 'card' | 'upi';
  billerId: string;
  billerName: string;
  createdAt: string;
}

// Dashboard Types
export interface DashboardStats {
  todaySales: number;
  monthlySales: number;
  todayBillCount: number;
  monthlyBillCount: number;
  periodSales?: number;
  periodBillCount?: number;
  period?: string;
}

export interface BillerRevenue {
  billerId: string;
  billerName: string;
  totalRevenue: number;
  billCount: number;
}

export interface DailyRevenue {
  date: string;
  revenue: number;
}

// Fridge Inventory Types
export interface FridgeItem {
  id: string;
  name: string;
  price: number;
  stock: number;
  lowStockThreshold: number;
  unit: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
