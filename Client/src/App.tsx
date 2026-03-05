import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/theme-provider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { BillerLayout } from "@/components/layouts/BillerLayout";

const LoginPage = lazy(() => import("./pages/LoginPage"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const ManageItems = lazy(() => import("./pages/admin/ManageItems"));
const ManageUsers = lazy(() => import("./pages/admin/ManageUsers"));
const BillingHistory = lazy(() => import("./pages/admin/BillingHistory"));
const FridgeInventory = lazy(() => import("./pages/admin/FridgeInventory"));
const BillingScreen = lazy(() => import("./pages/billing/BillingScreen"));
const NotFound = lazy(() => import("./pages/NotFound"));

const LoadingFallback = () => (
  <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
    <div className="h-10 w-10 rounded-full border-4 border-cyan-100 border-t-cyan-600 animate-spin" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,       // 60s – data is fresh, no background refetch
      gcTime: 5 * 60 * 1000,      // 5 min cache retention after unmount
      retry: 1,                    // Only one retry on failure (faster UX)
      refetchOnWindowFocus: false, // Don't refetch every tab switch
    },
    mutations: {
      retry: 0,
    },
  },
});


const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="restaurant-theme">
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <Suspense fallback={<LoadingFallback />}>
                <Routes>
                  <Route path="/" element={<Navigate to="/login" replace />} />
                  <Route path="/login" element={<LoginPage />} />

                  {/* Admin Routes */}
                  <Route path="/admin" element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <AdminLayout />
                    </ProtectedRoute>
                  }>
                    <Route index element={<AdminDashboard />} />
                    <Route path="items" element={<ManageItems />} />
                    <Route path="users" element={<ManageUsers />} />
                    <Route path="history" element={<BillingHistory />} />
                    <Route path="fridge" element={<FridgeInventory />} />
                  </Route>

                  {/* Biller Routes */}
                  <Route path="/billing" element={
                    <ProtectedRoute allowedRoles={['BILLER']}>
                      <BillerLayout />
                    </ProtectedRoute>
                  }>
                    <Route index element={<BillingScreen />} />
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
