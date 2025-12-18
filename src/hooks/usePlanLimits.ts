import { useAuth } from '@/contexts/AuthContext';
import { getPlanLimits, STRIPE_PLANS, PlanLimits, DEFAULT_LIMITS } from '@/lib/stripeConfig';

export function usePlanLimits() {
  const { subscription } = useAuth();
  
  // During trial, users get all premium features
  const isInTrial = subscription.isTrialActive && !subscription.subscribed;
  
  const limits = isInTrial ? DEFAULT_LIMITS : getPlanLimits(subscription.plan);
  const planName = subscription.plan 
    ? STRIPE_PLANS[subscription.plan].name 
    : (isInTrial ? 'Trial' : 'Sem plano');
  
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
    isInTrial,
    trialEndsAt: subscription.trialEndsAt,
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
