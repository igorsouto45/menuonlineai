import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, 
  ShoppingCart, 
  DollarSign, 
  TrendingUp,
  Clock,
  Package
} from 'lucide-react';

const stats = [
  { 
    label: 'Visitas Hoje', 
    value: '247', 
    change: '+12%', 
    icon: Eye,
    color: 'text-primary'
  },
  { 
    label: 'Pedidos Hoje', 
    value: '38', 
    change: '+8%', 
    icon: ShoppingCart,
    color: 'text-success'
  },
  { 
    label: 'Faturamento', 
    value: 'R$ 2.450', 
    change: '+15%', 
    icon: DollarSign,
    color: 'text-warning'
  },
  { 
    label: 'Ticket Médio', 
    value: 'R$ 64,47', 
    change: '+5%', 
    icon: TrendingUp,
    color: 'text-accent'
  },
];

const recentOrders = [
  { id: '1', customer: 'João Silva', items: '2x Pizza Margherita', total: 85.80, status: 'Novo', time: '2 min' },
  { id: '2', customer: 'Maria Santos', items: '1x Calabresa, 1x Suco', total: 48.90, status: 'Preparando', time: '15 min' },
  { id: '3', customer: 'Pedro Costa', items: '1x Quatro Queijos', total: 52.90, status: 'Enviado', time: '30 min' },
];

const topProducts = [
  { name: 'Pizza Margherita', orders: 45, revenue: 'R$ 2.032' },
  { name: 'Pizza Calabresa', orders: 38, revenue: 'R$ 1.478' },
  { name: 'Quatro Queijos', orders: 29, revenue: 'R$ 1.534' },
  { name: 'Frango c/ Catupiry', orders: 24, revenue: 'R$ 1.173' },
];

export default function Dashboard() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Visão geral do seu restaurante</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <Card className="border-border hover:border-primary/20 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <h3 className="text-2xl font-bold text-foreground mt-1">{stat.value}</h3>
                    <p className="text-sm text-success mt-1">{stat.change} vs ontem</p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center ${stat.color}`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-foreground">Pedidos Recentes</CardTitle>
              <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
                <Clock className="w-3 h-3 mr-1" />
                Tempo real
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div 
                    key={order.id} 
                    className="flex items-center justify-between p-4 bg-secondary rounded-xl"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-foreground">{order.customer}</span>
                        <Badge 
                          variant="secondary"
                          className={
                            order.status === 'Novo' 
                              ? 'bg-primary/20 text-primary border-0' 
                              : order.status === 'Preparando'
                              ? 'bg-warning/20 text-warning border-0'
                              : 'bg-success/20 text-success border-0'
                          }
                        >
                          {order.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{order.items}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground">R$ {order.total.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">{order.time} atrás</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Top Products */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-foreground">Produtos Mais Vendidos</CardTitle>
              <Badge variant="secondary" className="bg-accent/20 text-accent border-0">
                <Package className="w-3 h-3 mr-1" />
                Hoje
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topProducts.map((product, index) => (
                  <div 
                    key={product.name}
                    className="flex items-center gap-4 p-4 bg-secondary rounded-xl"
                  >
                    <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{product.name}</p>
                      <p className="text-sm text-muted-foreground">{product.orders} pedidos</p>
                    </div>
                    <p className="font-bold text-success">{product.revenue}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
