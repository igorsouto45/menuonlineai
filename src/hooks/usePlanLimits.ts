import { useAuth } from '@/contexts/AuthContext';
import { getPlanLimits, STRIPE_PLANS, PlanLimits } from '@/lib/stripeConfig';

export function usePlanLimits() {
  const { subscription } = useAuth();
  
  const limits = getPlanLimits(subscription.plan);
  const planName = subscription.plan ? STRIPE_PLANS[subscription.plan].name : 'Trial';
  
  const canAddProduct = (currentCount: number) => {
    return currentCount < limits.maxProducts;
  };
  
  const canUseVariations = () => limits.variations;
  const canUseAdditionals = () => limits.additionals;
  const canViewOrderHistory = () => limits.orderHistory;
  const canCustomizeColors = () => limits.customColors;
  const canGenerateQrCode = () => limits.qrCode;
  const canViewReports = () => limits.reports;
  const canUseCustomDomain = () => limits.customDomain;
  
  return {
    limits,
    planName,
    isSubscribed: subscription.subscribed,
    plan: subscription.plan,
    subscriptionEnd: subscription.subscriptionEnd,
    loading: subscription.loading,
    canAddProduct,
    canUseVariations,
    canUseAdditionals,
    canViewOrderHistory,
    canCustomizeColors,
    canGenerateQrCode,
    canViewReports,
    canUseCustomDomain,
  };
}
