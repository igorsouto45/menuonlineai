import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { CartProvider } from "./contexts/CartContext";
import { CustomerProvider } from "./contexts/CustomerContext";
import LandingPage from "./pages/LandingPage";
import MenuPage from "./pages/MenuPage";
import AuthPage from "./pages/AuthPage";
import OnboardingPage from "./pages/OnboardingPage";
import PricingPage from "./pages/PricingPage";
import OrderTrackingPage from "./pages/OrderTrackingPage";
import OrderReviewPage from "./pages/OrderReviewPage";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./components/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import CategoriesPage from "./pages/admin/CategoriesPage";
import ProductsPage from "./pages/admin/ProductsPage";
import OrdersPage from "./pages/admin/OrdersPage";
import SettingsPage from "./pages/admin/SettingsPage";
import AppearancePage from "./pages/admin/AppearancePage";
import ReviewsPage from "./pages/admin/ReviewsPage";
import LeadsPage from "./pages/admin/LeadsPage";
import CampaignsPage from "./pages/admin/CampaignsPage";
import SystemAdminPage from "./pages/admin/SystemAdminPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CustomerProvider>
        <CartProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/precos" element={<PricingPage />} />
                <Route path="/rastrear" element={<OrderTrackingPage />} />
                <Route path="/rastrear/:orderId" element={<OrderTrackingPage />} />
                {/* Review page disabled for now */}
                {/* <Route path="/avaliar/:orderId" element={<OrderReviewPage />} /> */}
                <Route path="/demo" element={<Navigate to="/hamburqueria-lapis-criativo" replace />} />
                <Route path="/r/:slug" element={<MenuPage />} />
                <Route path="/:slug" element={<MenuPage />} />
                
                {/* Onboarding - Protected but doesn't require restaurant */}
                <Route
                  path="/onboarding"
                  element={
                    <ProtectedRoute requireRestaurant={false}>
                      <OnboardingPage />
                    </ProtectedRoute>
                  }
                />
                
                {/* System Admin - Protected */}
                <Route
                  path="/system-admin"
                  element={
                    <ProtectedRoute requireRestaurant={false}>
                      <SystemAdminPage />
                    </ProtectedRoute>
                  }
                />
                
                {/* Admin Routes - Protected */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute>
                      <AdminLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Dashboard />} />
                  <Route path="categories" element={<CategoriesPage />} />
                  <Route path="products" element={<ProductsPage />} />
                  <Route path="orders" element={<OrdersPage />} />
                  <Route path="reviews" element={<ReviewsPage />} />
                  <Route path="leads" element={<LeadsPage />} />
                  <Route path="campaigns" element={<CampaignsPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="appearance" element={<AppearancePage />} />
                </Route>
                
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </CartProvider>
      </CustomerProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
