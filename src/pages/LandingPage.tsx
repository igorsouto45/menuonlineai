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
  Star
} from 'lucide-react';

const features = [
  {
    icon: Smartphone,
    title: 'Cardápio Digital',
    description: 'Página moderna e responsiva, igual aos melhores apps de delivery',
  },
  {
    icon: ShoppingCart,
    title: 'Carrinho Inteligente',
    description: 'Variações, adicionais e observações em cada produto',
  },
  {
    icon: MessageCircle,
    title: 'Pedidos via WhatsApp',
    description: 'Mensagem formatada automaticamente, sem intermediários',
  },
  {
    icon: Palette,
    title: 'Personalização Total',
    description: 'Cores, logo, banner e estilo do seu jeito',
  },
  {
    icon: BarChart3,
    title: 'Painel Completo',
    description: 'Dashboard com métricas e gestão simplificada',
  },
  {
    icon: Zap,
    title: 'Ultra Rápido',
    description: 'Carregamento instantâneo, sem apps pesados',
  },
];

const benefits = [
  'Sem taxas por pedido',
  'Sem apps para instalar',
  'Pronto em 5 minutos',
  'Suporte humanizado',
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
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
              Preços
            </a>
            <Link to="/demo" className="text-muted-foreground hover:text-foreground transition-colors">
              Demo
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost">Entrar</Button>
            </Link>
            <Link to="/register">
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
                +2.000 restaurantes ativos
              </span>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-foreground leading-tight mb-6">
                Seu cardápio digital{' '}
                <span className="text-gradient">profissional</span>
                <br />em minutos
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                Crie um cardápio lindo, receba pedidos pelo WhatsApp e venda mais. 
                Sem taxas, sem complicação.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                <Link to="/register">
                  <Button variant="hero" size="xl" className="w-full sm:w-auto">
                    Criar meu cardápio grátis
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </Link>
                <Link to="/demo">
                  <Button variant="outline" size="xl" className="w-full sm:w-auto">
                    Ver demonstração
                  </Button>
                </Link>
              </div>
              <div className="flex flex-wrap justify-center gap-6">
                {benefits.map((benefit) => (
                  <div key={benefit} className="flex items-center gap-2 text-muted-foreground">
                    <Check className="w-5 h-5 text-success" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </motion.div>
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

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="container">
          <div className="max-w-4xl mx-auto gradient-primary rounded-3xl p-8 md:p-12 text-center shadow-glow">
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              Pronto para vender mais?
            </h2>
            <p className="text-lg text-primary-foreground/80 mb-8 max-w-xl mx-auto">
              Crie seu cardápio digital em minutos e comece a receber pedidos pelo WhatsApp hoje mesmo.
            </p>
            <Link to="/register">
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
