import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AuthProvider } from "./contexts/AuthContext";
import { CartProvider } from "./contexts/CartContext";
import { CustomerProvider } from "./contexts/CustomerContext";
import ProtectedRoute from "./components/ProtectedRoute";

// Eager — landing is the most common entrypoint (keep snappy first paint)
import LandingPage from "./pages/LandingPage";

// Lazy — split everything else into separate chunks
const MenuPage = lazy(() => import("./pages/MenuPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const OrderTrackingPage = lazy(() => import("./pages/OrderTrackingPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Admin chunk(s)
const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const CategoriesPage = lazy(() => import("./pages/admin/CategoriesPage"));
const ProductsPage = lazy(() => import("./pages/admin/ProductsPage"));
const OrdersPage = lazy(() => import("./pages/admin/OrdersPage"));
const SettingsPage = lazy(() => import("./pages/admin/SettingsPage"));
const AppearancePage = lazy(() => import("./pages/admin/AppearancePage"));
const ReviewsPage = lazy(() => import("./pages/admin/ReviewsPage"));
const LeadsPage = lazy(() => import("./pages/admin/LeadsPage"));
const CampaignsPage = lazy(() => import("./pages/admin/CampaignsPage"));
const SystemAdminPage = lazy(() => import("./pages/admin/SystemAdminPage"));

const queryClient = new QueryClient();

const PageFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CustomerProvider>
        <CartProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Suspense fallback={<PageFallback />}>
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/precos" element={<PricingPage />} />
                  <Route path="/rastrear" element={<OrderTrackingPage />} />
                  <Route path="/rastrear/:orderId" element={<OrderTrackingPage />} />
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
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </CartProvider>
      </CustomerProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
