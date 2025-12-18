// Stripe subscription plans configuration
export const STRIPE_PLANS = {
  basic: {
    name: 'Básico',
    price: 19,
    product_id: 'prod_Tcvij4YuTVtUAN',
    price_id: 'price_1SffqfAMYs4ogTEf5QHLMr57',
    features: [
      '1 restaurante',
      'Até 30 produtos',
      'Cardápio público',
      'Pedido via WhatsApp',
      'Suporte básico',
    ],
  },
  pro: {
    name: 'Pro',
    price: 29,
    product_id: 'prod_TcvjFCGuMBn60j',
    price_id: 'price_1Sffs9AMYs4ogTEfLtIMap5s',
    features: [
      '1 restaurante',
      'Produtos ilimitados',
      'Variações e adicionais',
      'Histórico de pedidos',
      'Personalização de cores',
      'QR Code do cardápio',
    ],
    popular: true,
  },
  premium: {
    name: 'Premium',
    price: 49,
    product_id: 'prod_TcvkEEm1Z6eRIG',
    price_id: 'price_1SffstAMYs4ogTEflDAdClP1',
    features: [
      '1 restaurante',
      'Tudo do PRO',
      'Relatórios',
      'Prioridade no suporte',
      'Domínio personalizado',
      'Acesso antecipado a novas funções',
    ],
  },
} as const;

export type PlanType = keyof typeof STRIPE_PLANS;

export function getPlanByProductId(productId: string): PlanType | null {
  for (const [key, plan] of Object.entries(STRIPE_PLANS)) {
    if (plan.product_id === productId) {
      return key as PlanType;
    }
  }
  return null;
}
