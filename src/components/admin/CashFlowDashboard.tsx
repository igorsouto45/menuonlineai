import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface DailyCashFlow {
  day: string;
  revenue: number;
  cost: number;
  profit: number;
}

interface CashFlowDashboardProps {
  restaurantId: string;
}

export function CashFlowDashboard({ restaurantId }: CashFlowDashboardProps) {
  const [cashFlowData, setCashFlowData] = useState<DailyCashFlow[]>([]);
  const [totals, setTotals] = useState({
    revenue: 0,
    cost: 0,
    profit: 0,
    profitMargin: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCashFlowData() {
      // Get products with cost prices
      const { data: productsData } = await supabase
        .rpc('get_my_products', { p_restaurant_id: restaurantId });

      const productCosts: Record<string, { price: number; cost: number }> = {};
      productsData?.forEach(p => {
        productCosts[p.name] = {
          price: Number(p.price) || 0,
          cost: Number(p.cost_price) || 0,
        };
      });

      // Get orders from last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .gte('created_at', sevenDaysAgo.toISOString())
        .not('status', 'eq', 'cancelled');

      // Calculate daily cash flow
      const dailyData: Record<string, { revenue: number; cost: number }> = {};

      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayKey = date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }).replace('.', '');
        dailyData[dayKey] = { revenue: 0, cost: 0 };
      }

      ordersData?.forEach(order => {
        const orderDate = new Date(order.created_at);
        const dayKey = orderDate.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }).replace('.', '');

        if (dailyData[dayKey]) {
          const items = (order.items as Array<{ productName?: string; name?: string; quantity: number; unitPrice?: number; price?: number; subtotal?: number }>) || [];
          items.forEach(item => {
            const itemPrice = Number(item.unitPrice) || Number(item.price) || 0;
            const itemQuantity = Number(item.quantity) || 1;
            const revenue = Number(item.subtotal) || (itemPrice * itemQuantity);
            const itemName = item.productName || item.name || '';
            const productInfo = productCosts[itemName];
            const cost = productInfo ? productInfo.cost * itemQuantity : 0;

            dailyData[dayKey].revenue += revenue;
            dailyData[dayKey].cost += cost;
          });
        }
      });

      const chartData = Object.entries(dailyData).map(([day, data]) => ({
        day,
        revenue: data.revenue,
        cost: data.cost,
        profit: data.revenue - data.cost,
      }));

      const totalRevenue = chartData.reduce((sum, d) => sum + d.revenue, 0);
      const totalCost = chartData.reduce((sum, d) => sum + d.cost, 0);
      const totalProfit = totalRevenue - totalCost;

      setCashFlowData(chartData);
      setTotals({
        revenue: totalRevenue,
        cost: totalCost,
        profit: totalProfit,
        profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
      });
      setLoading(false);
    }

    loadCashFlowData();
  }, [restaurantId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Receita Total</p>
                <p className="text-2xl font-bold text-success">
                  R$ {totals.revenue.toFixed(2)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Custo Total</p>
                <p className="text-2xl font-bold text-destructive">
                  R$ {totals.cost.toFixed(2)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Lucro Líquido</p>
                <p className={`text-2xl font-bold ${totals.profit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  R$ {totals.profit.toFixed(2)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Margem Média</p>
                <p className="text-2xl font-bold text-foreground">
                  {totals.profitMargin.toFixed(1)}%
                </p>
              </div>
              <Badge 
                variant="secondary"
                className={
                  totals.profitMargin >= 30 
                    ? 'bg-success/10 text-success' 
                    : totals.profitMargin < 15
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-warning/10 text-warning'
                }
              >
                {totals.profitMargin >= 30 ? 'Ótimo' : totals.profitMargin >= 15 ? 'OK' : 'Baixo'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cash Flow Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Fluxo de Caixa - Últimos 7 Dias</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashFlowData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value: number, name: string) => [
                    `R$ ${value.toFixed(2)}`,
                    name === 'revenue' ? 'Receita' : name === 'cost' ? 'Custo' : 'Lucro'
                  ]}
                />
                <Legend 
                  formatter={(value) => 
                    value === 'revenue' ? 'Receita' : value === 'cost' ? 'Custo' : 'Lucro'
                  }
                />
                <Bar dataKey="revenue" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cost" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
