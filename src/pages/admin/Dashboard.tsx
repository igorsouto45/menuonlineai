import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRestaurant } from '@/hooks/useRestaurant';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  ShoppingCart, 
  DollarSign, 
  TrendingUp,
  Clock,
  Package,
  Loader2,
  AlertTriangle,
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

interface LowStockProduct {
  id: string;
  name: string;
  current_stock: number;
  min_stock: number;
}

interface DailyRevenue {
  day: string;
  revenue: number;
  orders: number;
}

export default function Dashboard() {
  const { restaurant } = useRestaurant();
  const { toast } = useToast();
  const { playNotification } = useNotificationSound();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    ordersToday: 0,
    revenueToday: 0,
    avgTicket: 0,
    totalOrders: 0
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [weeklyData, setWeeklyData] = useState<DailyRevenue[]>([]);

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

        // Calculate weekly revenue
        const last7Days: DailyRevenue[] = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          date.setHours(0, 0, 0, 0);
          const nextDate = new Date(date);
          nextDate.setDate(nextDate.getDate() + 1);

          const dayOrders = orders.filter(o => {
            const orderDate = new Date(o.created_at);
            return orderDate >= date && orderDate < nextDate;
          });

          last7Days.push({
            day: date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
            revenue: dayOrders.reduce((sum, o) => sum + Number(o.total), 0),
            orders: dayOrders.length
          });
        }
        setWeeklyData(last7Days);

        // Fetch low stock products
        const { data: lowStockData, error: lowStockError } = await supabase
          .from('products')
          .select('id, name, current_stock, min_stock')
          .eq('restaurant_id', restaurant!.id)
          .not('current_stock', 'is', null)
          .not('min_stock', 'is', null);

        if (!lowStockError && lowStockData) {
          const lowStock = lowStockData.filter(
            p => p.current_stock !== null && p.min_stock !== null && p.current_stock <= p.min_stock
          ) as LowStockProduct[];
          setLowStockProducts(lowStock);
        }

      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [restaurant?.id]);

  // Real-time subscription for new orders
  useEffect(() => {
    if (!restaurant?.id) return;

    const channel = supabase
      .channel('dashboard-orders')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurant.id}`,
        },
        (payload) => {
          playNotification();
          toast({
            title: '🔔 Novo pedido!',
            description: `Pedido de ${(payload.new as Order).customer_name || 'Cliente'}`,
          });
          
          // Update recent orders
          const newOrder = {
            id: payload.new.id,
            customer_name: payload.new.customer_name,
            items: (payload.new.items as unknown as OrderItem[]) || [],
            total: Number(payload.new.total),
            status: payload.new.status || 'pending',
            created_at: payload.new.created_at
          };
          setRecentOrders(prev => [newOrder, ...prev.slice(0, 4)]);
          
          // Update today stats
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (new Date(payload.new.created_at) >= today) {
            setStats(prev => ({
              ...prev,
              ordersToday: prev.ordersToday + 1,
              revenueToday: prev.revenueToday + Number(payload.new.total),
              avgTicket: (prev.revenueToday + Number(payload.new.total)) / (prev.ordersToday + 1),
              totalOrders: prev.totalOrders + 1
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurant?.id, playNotification, toast]);

  const exportToExcel = () => {
    const salesData = weeklyData.map(d => ({
      'Dia': d.day,
      'Pedidos': d.orders,
      'Faturamento (R$)': d.revenue.toFixed(2)
    }));

    const stockData = lowStockProducts.map(p => ({
      'Produto': p.name,
      'Estoque Atual': p.current_stock,
      'Estoque Mínimo': p.min_stock,
      'Status': 'Baixo'
    }));

    const topProductsData = topProducts.map(p => ({
      'Produto': p.name,
      'Pedidos': p.orders,
      'Faturamento (R$)': p.revenue.toFixed(2)
    }));

    const wb = XLSX.utils.book_new();
    
    const ws1 = XLSX.utils.json_to_sheet(salesData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Vendas Semanais');
    
    const ws2 = XLSX.utils.json_to_sheet(topProductsData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Produtos Mais Vendidos');
    
    if (stockData.length > 0) {
      const ws3 = XLSX.utils.json_to_sheet(stockData);
      XLSX.utils.book_append_sheet(wb, ws3, 'Estoque Baixo');
    }

    XLSX.writeFile(wb, `relatorio-${restaurant?.name || 'restaurante'}-${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`);
    
    toast({
      title: 'Relatório exportado!',
      description: 'O arquivo Excel foi baixado com sucesso.',
    });
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text(`Relatório - ${restaurant?.name || 'Restaurante'}`, 14, 22);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);

    // Stats summary
    doc.setFontSize(14);
    doc.text('Resumo do Dia', 14, 45);
    doc.setFontSize(10);
    doc.text(`Pedidos Hoje: ${stats.ordersToday}`, 14, 55);
    doc.text(`Faturamento Hoje: R$ ${stats.revenueToday.toFixed(2)}`, 14, 62);
    doc.text(`Ticket Médio: R$ ${stats.avgTicket.toFixed(2)}`, 14, 69);
    doc.text(`Total de Pedidos: ${stats.totalOrders}`, 14, 76);

    // Weekly sales table
    doc.setFontSize(14);
    doc.text('Vendas Semanais', 14, 92);
    
    autoTable(doc, {
      startY: 98,
      head: [['Dia', 'Pedidos', 'Faturamento (R$)']],
      body: weeklyData.map(d => [d.day, d.orders, `R$ ${d.revenue.toFixed(2)}`]),
    });

    // Top products table
    const finalY = (doc as any).lastAutoTable.finalY || 150;
    doc.setFontSize(14);
    doc.text('Produtos Mais Vendidos', 14, finalY + 15);
    
    autoTable(doc, {
      startY: finalY + 21,
      head: [['Produto', 'Pedidos', 'Faturamento (R$)']],
      body: topProducts.map(p => [p.name, p.orders, `R$ ${p.revenue.toFixed(2)}`]),
    });

    // Low stock alert if any
    if (lowStockProducts.length > 0) {
      const finalY2 = (doc as any).lastAutoTable.finalY || 200;
      doc.setFontSize(14);
      doc.text('Alerta de Estoque Baixo', 14, finalY2 + 15);
      
      autoTable(doc, {
        startY: finalY2 + 21,
        head: [['Produto', 'Estoque Atual', 'Estoque Mínimo']],
        body: lowStockProducts.map(p => [p.name, p.current_stock, p.min_stock]),
      });
    }

    doc.save(`relatorio-${restaurant?.name || 'restaurante'}-${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`);
    
    toast({
      title: 'Relatório exportado!',
      description: 'O arquivo PDF foi baixado com sucesso.',
    });
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Visão geral do seu restaurante</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportToExcel}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={exportToPDF}>
            <FileText className="w-4 h-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-warning/50 bg-warning/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-warning flex items-center gap-2 text-lg">
                <AlertTriangle className="w-5 h-5" />
                Alerta de Estoque Baixo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {lowStockProducts.map((product) => (
                  <div 
                    key={product.id}
                    className="flex items-center justify-between p-3 bg-warning/10 rounded-lg"
                  >
                    <span className="font-medium text-foreground">{product.name}</span>
                    <Badge variant="secondary" className="bg-warning/20 text-warning border-0">
                      {product.current_stock}/{product.min_stock}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

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

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Faturamento Semanal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Faturamento']}
                    />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Orders Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
        >
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Pedidos por Dia</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [value, 'Pedidos']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="orders" 
                      stroke="hsl(var(--accent))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--accent))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
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
