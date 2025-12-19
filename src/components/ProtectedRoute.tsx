import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useRestaurant } from '@/hooks/useRestaurant';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRestaurant?: boolean;
}

export default function ProtectedRoute({ children, requireRestaurant = true }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { hasRestaurant, loading: restaurantLoading } = useRestaurant();
  const location = useLocation();

  // Only wait for restaurant loading if we actually need it
  const loading = authLoading || (requireRestaurant && restaurantLoading);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // If we need restaurant and still loading, show loading
  if (requireRestaurant && restaurantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando restaurante...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Redirect to onboarding if user doesn't have a restaurant
  if (requireRestaurant && !hasRestaurant && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
