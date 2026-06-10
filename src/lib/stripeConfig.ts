// Stripe subscription plans configuration
export const STRIPE_PLANS = {
  basic: {
    name: 'Básico',
    price: 39.97,
    product_id: 'prod_Tcvij4YuTVtUAN',
    price_id: 'price_1SffqfAMYs4ogTEf5QHLMr57',
    features: [
      '1 restaurante',
      'Até 30 produtos',
      'Cardápio público',
      'Pedido via WhatsApp',
      'Suporte básico',
    ],
    limits: {
      maxProducts: 30,
      variations: false,
      additionals: false,
      orderHistory: false,
      customColors: false,
      qrCode: false,
      reports: false,
      customDomain: false,
    },
  },
  pro: {
    name: 'Pro',
    price: 99.97,
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
    limits: {
      maxProducts: Infinity,
      variations: true,
      additionals: true,
      orderHistory: true,
      customColors: true,
      qrCode: true,
      reports: false,
      customDomain: false,
    },
  },
  premium: {
    name: 'Premium',
    price: 199.97,
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
    limits: {
      maxProducts: Infinity,
      variations: true,
      additionals: true,
      orderHistory: true,
      customColors: true,
      qrCode: true,
      reports: true,
      customDomain: true,
    },
  },
} as const;

export type PlanType = keyof typeof STRIPE_PLANS;

export type PlanLimits = {
  maxProducts: number;
  variations: boolean;
  additionals: boolean;
  orderHistory: boolean;
  customColors: boolean;
  qrCode: boolean;
  reports: boolean;
  customDomain: boolean;
};

// Default limits for users without subscription (trial)
export const DEFAULT_LIMITS: PlanLimits = {
  maxProducts: 30,
  variations: true,
  additionals: true,
  orderHistory: true,
  customColors: true,
  qrCode: true,
  reports: true,
  customDomain: false,
};

export function getPlanByProductId(productId: string): PlanType | null {
  for (const [key, plan] of Object.entries(STRIPE_PLANS)) {
    if (plan.product_id === productId) {
      return key as PlanType;
    }
  }
  return null;
}

export function getPlanLimits(plan: PlanType | null): PlanLimits {
  if (!plan) return DEFAULT_LIMITS;
  return STRIPE_PLANS[plan].limits;
}
