import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  Smartphone, 
  ShoppingCart, 
  MessageCircle, 
  Palette, 
  BarChart3, 
  Zap,
  ChevronRight,
  Check,
  Star,
  X,
  QrCode,
  History,
  FileText,
  Headphones,
  Globe
} from 'lucide-react';

const features = [
  {
    icon: Smartphone,
    title: 'Funciona no celular',
    description: 'Cardápio 100% responsivo, perfeito em qualquer dispositivo',
  },
  {
    icon: ShoppingCart,
    title: 'Não precisa baixar app',
    description: 'Cliente acessa direto pelo link, sem instalar nada',
  },
  {
    icon: MessageCircle,
    title: 'Pedido organizado',
    description: 'Mensagem formatada automaticamente no WhatsApp',
  },
  {
    icon: Palette,
    title: 'Visual profissional',
    description: 'Design moderno que impressiona seus clientes',
  },
  {
    icon: BarChart3,
    title: 'Setup em minutos',
    description: 'Configure tudo rapidamente, sem complicação',
  },
  {
    icon: Zap,
    title: 'Ultra rápido',
    description: 'Carregamento instantâneo, sem travamentos',
  },
];

const problems = [
  'Cliente pergunta "tem cardápio?"',
  'Você manda PDF pesado',
  'Pedido vem todo errado',
  'Tempo perdido = dinheiro perdido',
];

const idealFor = [
  'Lanchonetes',
  'Pizzarias',
  'Restaurantes',
  'Delivery',
  'Food trucks',
];

const plans = [
  {
    name: 'Básico',
    price: 19,
    period: '/mês',
    description: 'Para quem quer começar.',
    color: 'success',
    features: [
      '1 restaurante',
      'Até 30 produtos',
      'Cardápio público',
      'Pedido via WhatsApp',
      'Suporte básico',
    ],
    popular: false,
  },
  {
    name: 'Pro',
    price: 29,
    period: '/mês',
    description: 'Para quem quer vender mais.',
    color: 'primary',
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
  {
    name: 'Premium',
    price: 49,
    period: '/mês',
    description: 'Para quem quer escalar.',
    color: 'accent',
    features: [
      '1 restaurante',
      'Tudo do PRO',
      'Relatórios',
      'Prioridade no suporte',
      'Domínio personalizado',
      'Acesso antecipado a novas funções',
    ],
    popular: false,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">M</span>
            </div>
            <span className="font-bold text-xl text-foreground">MENU AI</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
              Funcionalidades
            </a>
            <Link to="/precos" className="text-muted-foreground hover:text-foreground transition-colors">
              Preços
            </Link>
            <Link to="/demo" className="text-muted-foreground hover:text-foreground transition-colors">
              Demo
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost">Entrar</Button>
            </Link>
            <Link to="/auth?mode=signup">
              <Button variant="hero">Começar Grátis</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 gradient-hero">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Star className="w-4 h-4 fill-current" />
                7 dias grátis para testar
              </span>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-foreground leading-tight mb-6">
                Seu cardápio no WhatsApp.{' '}
                <br />
                <span className="text-gradient">Mais pedidos. Menos complicação.</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                Crie um cardápio digital profissional em minutos e receba pedidos direto no WhatsApp — sem taxas, sem apps e sem dor de cabeça.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                <Link to="/auth?mode=signup">
                  <Button variant="hero" size="xl" className="w-full sm:w-auto">
                    Teste grátis agora
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </Link>
                <Link to="/demo">
                  <Button variant="outline" size="xl" className="w-full sm:w-auto">
                    Ver demonstração
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-8">
              O problema que você conhece bem:
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {problems.map((problem, index) => (
                <motion.div
                  key={problem}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="flex items-center gap-3 p-4 bg-destructive/10 rounded-xl border border-destructive/20"
                >
                  <X className="w-5 h-5 text-destructive shrink-0" />
                  <span className="text-foreground">{problem}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-16 px-4">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              A solução é simples:
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Um cardápio online <strong className="text-foreground">bonito, rápido e fácil de usar</strong>.<br />
              O cliente escolhe. O pedido chega pronto no seu WhatsApp.<br />
              <span className="text-primary font-semibold">Simples assim.</span>
            </p>
          </div>
        </div>
      </section>

      {/* Phone Mockup */}
      <section className="py-12 px-4 -mt-8">
        <div className="container">
          <motion.div 
            className="max-w-sm mx-auto"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="relative">
              <div className="absolute inset-0 gradient-primary rounded-[3rem] blur-3xl opacity-20" />
              <div className="relative bg-foreground rounded-[3rem] p-3 shadow-2xl">
                <div className="bg-background rounded-[2.5rem] overflow-hidden aspect-[9/16]">
                  <div className="h-full flex flex-col">
                    {/* Phone header */}
                    <div className="gradient-primary p-4 pb-12">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-background/20 flex items-center justify-center">
                          <span className="text-2xl">🍕</span>
                        </div>
                        <div>
                          <h3 className="font-bold text-primary-foreground">Pizzaria Bella</h3>
                          <span className="text-xs text-primary-foreground/80">Aberto agora</span>
                        </div>
                      </div>
                    </div>
                    {/* Menu items */}
                    <div className="flex-1 bg-background p-4 -mt-8 rounded-t-3xl space-y-3">
                      {['Margherita', 'Calabresa', 'Quatro Queijos'].map((item, i) => (
                        <div key={item} className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
                          <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center text-2xl">
                            🍕
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-foreground">{item}</h4>
                            <p className="text-xs text-muted-foreground">Deliciosa pizza...</p>
                            <p className="font-bold text-primary mt-1">R$ {(38.90 + i * 4).toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* WhatsApp button */}
                    <div className="p-4 border-t border-border">
                      <div className="bg-success text-success-foreground rounded-xl py-3 text-center font-semibold">
                        Enviar Pedido via WhatsApp
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Tudo que você precisa para vender mais
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Um sistema completo, bonito e fácil de usar. Sem complicação.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-card transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Ideal For */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-8">
            Ideal para:
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            {idealFor.map((item) => (
              <span
                key={item}
                className="px-6 py-3 rounded-full bg-card border border-border text-foreground font-medium"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Planos simples e acessíveis
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Escolha o plano ideal para o seu negócio. Todos incluem 7 dias grátis para testar.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`relative p-6 rounded-2xl bg-card border ${
                  plan.popular ? 'border-primary shadow-glow' : 'border-border'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full gradient-primary text-primary-foreground text-sm font-medium">
                    Mais vendido
                  </span>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-foreground mb-2">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-extrabold text-foreground">R${plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-muted-foreground">
                      <Check className="w-5 h-5 text-success shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/auth?mode=signup">
                  <Button
                    variant={plan.popular ? 'hero' : 'outline'}
                    className="w-full"
                  >
                    Começar agora
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="container">
          <div className="max-w-4xl mx-auto gradient-primary rounded-3xl p-8 md:p-12 text-center shadow-glow">
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              🚀 Criar meu cardápio agora
            </h2>
            <p className="text-lg text-primary-foreground/80 mb-8 max-w-xl mx-auto">
              Teste grátis por 7 dias. Sem cartão de crédito.
            </p>
            <Link to="/auth?mode=signup">
              <Button variant="glass" size="xl" className="bg-background/10 text-primary-foreground border-primary-foreground/20 hover:bg-background/20">
                Começar agora — é grátis
                <ChevronRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold">M</span>
              </div>
              <span className="font-bold text-lg text-foreground">MENU AI</span>
            </div>
            <p className="text-muted-foreground text-sm">
              © 2024 MENU AI. Todos os direitos reservados.
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
                Termos de Uso
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
                Privacidade
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
