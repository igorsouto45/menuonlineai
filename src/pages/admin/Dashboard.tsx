import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRestaurant } from '@/hooks/useRestaurant';
import { supabase } from '@/integrations/supabase/client';
import { 
  ShoppingCart, 
  DollarSign, 
  TrendingUp,
  Clock,
  Package,
  Loader2
} from 'lucide-react';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  customer_name: string | null;
  items: OrderItem[];
  total: number;
  status: string;
  created_at: string;
}

interface TopProduct {
  name: string;
  orders: number;
  revenue: number;
}

export default function Dashboard() {
  const { restaurant } = useRestaurant();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    ordersToday: 0,
    revenueToday: 0,
    avgTicket: 0,
    totalOrders: 0
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);

  useEffect(() => {
    if (!restaurant?.id) return;

    async function loadDashboardData() {
      setLoading(true);
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Fetch orders
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('*')
          .eq('restaurant_id', restaurant!.id)
          .order('created_at', { ascending: false });

        if (ordersError) throw ordersError;

        const orders = ordersData || [];
        const todayOrders = orders.filter(o => new Date(o.created_at) >= today);
        
        // Calculate stats
        const ordersToday = todayOrders.length;
        const revenueToday = todayOrders.reduce((sum, o) => sum + Number(o.total), 0);
        const avgTicket = ordersToday > 0 ? revenueToday / ordersToday : 0;

        setStats({
          ordersToday,
          revenueToday,
          avgTicket,
          totalOrders: orders.length
        });

        // Recent orders (last 5)
        const recent = orders.slice(0, 5).map(o => ({
          id: o.id,
          customer_name: o.customer_name,
          items: (o.items as unknown as OrderItem[]) || [],
          total: Number(o.total),
          status: o.status || 'pending',
          created_at: o.created_at
        }));
        setRecentOrders(recent);

        // Calculate top products
        const productCounts: Record<string, { orders: number; revenue: number }> = {};
        orders.forEach(order => {
          const items = (order.items as unknown as OrderItem[]) || [];
          items.forEach(item => {
            if (!productCounts[item.name]) {
              productCounts[item.name] = { orders: 0, revenue: 0 };
            }
            productCounts[item.name].orders += item.quantity;
            productCounts[item.name].revenue += item.price * item.quantity;
          });
        });

        const topProductsList = Object.entries(productCounts)
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => b.orders - a.orders)
          .slice(0, 4);

        setTopProducts(topProductsList);
      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [restaurant?.id]);

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Novo',
      preparing: 'Preparando',
      ready: 'Pronto',
      delivered: 'Entregue',
      cancelled: 'Cancelado'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-primary/20 text-primary border-0',
      preparing: 'bg-warning/20 text-warning border-0',
      ready: 'bg-accent/20 text-accent border-0',
      delivered: 'bg-success/20 text-success border-0',
      cancelled: 'bg-destructive/20 text-destructive border-0'
    };
    return colors[status] || 'bg-muted text-muted-foreground';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const statsData = [
    { 
      label: 'Pedidos Hoje', 
      value: stats.ordersToday.toString(), 
      icon: ShoppingCart,
      color: 'text-success'
    },
    { 
      label: 'Faturamento Hoje', 
      value: `R$ ${stats.revenueToday.toFixed(2)}`, 
      icon: DollarSign,
      color: 'text-warning'
    },
    { 
      label: 'Ticket Médio', 
      value: `R$ ${stats.avgTicket.toFixed(2)}`, 
      icon: TrendingUp,
      color: 'text-accent'
    },
    { 
      label: 'Total de Pedidos', 
      value: stats.totalOrders.toString(), 
      icon: Package,
      color: 'text-primary'
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Visão geral do seu restaurante</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsData.map((stat, index) => (
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
              {recentOrders.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Nenhum pedido ainda.</p>
              ) : (
                <div className="space-y-4">
                  {recentOrders.map((order) => (
                    <div 
                      key={order.id} 
                      className="flex items-center justify-between p-4 bg-secondary rounded-xl"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-foreground">
                            {order.customer_name || 'Cliente'}
                          </span>
                          <Badge 
                            variant="secondary"
                            className={getStatusColor(order.status)}
                          >
                            {getStatusLabel(order.status)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {order.items?.slice(0, 2).map(i => `${i.quantity}x ${i.name}`).join(', ')}
                          {order.items?.length > 2 && '...'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-foreground">R$ {order.total.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">{getTimeAgo(order.created_at)} atrás</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                Total
              </Badge>
            </CardHeader>
            <CardContent>
              {topProducts.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Nenhum produto vendido ainda.</p>
              ) : (
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
                      <p className="font-bold text-success">R$ {product.revenue.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
