import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Loader2, ArrowLeft, Crown, Star, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { STRIPE_PLANS, PlanType } from '@/lib/stripeConfig';

const planIcons: Record<PlanType, typeof Crown> = {
  basic: Zap,
  pro: Star,
  premium: Crown,
};

export default function PricingPage() {
  const navigate = useNavigate();
  const { user, session, subscription, checkSubscription } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<PlanType | null>(null);

  const handleCheckout = async (planKey: PlanType) => {
    if (!user || !session) {
      toast.error('Você precisa estar logado para assinar');
      navigate('/auth');
      return;
    }

    setLoadingPlan(planKey);

    try {
      const plan = STRIPE_PLANS[planKey];
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId: plan.price_id },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Erro ao iniciar checkout. Tente novamente.');
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleManageSubscription = async () => {
    if (!session) return;

    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Portal error:', error);
      toast.error('Erro ao abrir portal. Tente novamente.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>

        {/* Title */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Escolha seu plano</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Comece grátis por 7 dias. Cancele quando quiser.
          </p>
          
          {subscription.subscribed && subscription.plan && (
            <div className="mt-6">
              <Badge variant="secondary" className="text-sm px-4 py-2">
                Plano atual: {STRIPE_PLANS[subscription.plan].name}
              </Badge>
              <Button
                variant="link"
                onClick={handleManageSubscription}
                className="ml-4"
              >
                Gerenciar assinatura
              </Button>
            </div>
          )}
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {(Object.entries(STRIPE_PLANS) as [PlanType, typeof STRIPE_PLANS[PlanType]][]).map(([key, plan]) => {
            const Icon = planIcons[key];
            const isCurrentPlan = subscription.plan === key;
            const isPopular = 'popular' in plan && plan.popular;

            return (
              <Card
                key={key}
                className={`relative flex flex-col ${
                  isPopular
                    ? 'border-primary shadow-lg scale-105'
                    : ''
                } ${isCurrentPlan ? 'ring-2 ring-primary' : ''}`}
              >
                {isPopular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                    Mais popular
                  </Badge>
                )}
                
                {isCurrentPlan && (
                  <Badge variant="secondary" className="absolute -top-3 right-4">
                    Seu plano
                  </Badge>
                )}

                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 w-fit">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>
                    <span className="text-4xl font-bold text-foreground">
                      R${plan.price}
                    </span>
                    <span className="text-muted-foreground">/mês</span>
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1">
                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <Button
                    className="w-full"
                    variant={isPopular ? 'default' : 'outline'}
                    size="lg"
                    disabled={loadingPlan === key || isCurrentPlan}
                    onClick={() => handleCheckout(key)}
                  >
                    {loadingPlan === key ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processando...
                      </>
                    ) : isCurrentPlan ? (
                      'Plano atual'
                    ) : subscription.subscribed ? (
                      'Trocar plano'
                    ) : (
                      'Começar agora'
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Refresh button */}
        {user && (
          <div className="text-center mt-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                checkSubscription();
                toast.success('Status atualizado');
              }}
              disabled={subscription.loading}
            >
              {subscription.loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Atualizar status da assinatura
            </Button>
          </div>
        )}

        {/* FAQ or additional info */}
        <div className="mt-16 text-center">
          <p className="text-muted-foreground">
            Dúvidas? Entre em contato pelo WhatsApp ou email.
          </p>
        </div>
      </div>
    </div>
  );
}
