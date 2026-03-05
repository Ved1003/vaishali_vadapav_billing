import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/theme-provider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { BillerLayout } from "@/components/layouts/BillerLayout";
import LoginPage from "./pages/LoginPage";
import BillingScreen from "./pages/billing/BillingScreen";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 2,
            staleTime: 30000,
        },
    },
});

const App = () => {
    useEffect(() => {
        if (Capacitor.isNativePlatform()) {
            // Force the status bar to not float over the app content
            StatusBar.setOverlaysWebView({ overlay: false }).catch(console.error);
            StatusBar.setStyle({ style: Style.Light }).catch(console.error);
            StatusBar.setBackgroundColor({ color: '#ffffff' }).catch(console.error);
        }
    }, []);

    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider defaultTheme="light" storageKey="billing-app-theme">
                <AuthProvider>
                    <TooltipProvider>
                        <Toaster />
                        <Sonner />
                        <BrowserRouter>
                            <Routes>
                                {/* Default: redirect to login */}
                                <Route path="/" element={<Navigate to="/login" replace />} />

                                {/* Public route */}
                                <Route path="/login" element={<LoginPage />} />

                                {/* Billing – BILLER role only */}
                                <Route
                                    path="/billing"
                                    element={
                                        <ProtectedRoute allowedRoles={['BILLER']}>
                                            <BillerLayout />
                                        </ProtectedRoute>
                                    }
                                >
                                    <Route index element={<BillingScreen />} />
                                </Route>

                                {/* Catch-all */}
                                <Route path="*" element={<Navigate to="/login" replace />} />
                            </Routes>
                        </BrowserRouter>
                    </TooltipProvider>
                </AuthProvider>
            </ThemeProvider>
        </QueryClientProvider>
    );
};

export default App;
