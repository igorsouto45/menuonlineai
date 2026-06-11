import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurant } from '@/hooks/useRestaurant';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table as TableIcon, Loader2, Clock, DollarSign, Receipt, TrendingUp, ChevronDown, ChevronRight } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Order = Database['public']['Tables']['orders']['Row'];

type PeriodKey = 'today' | '7d' | '30d' | '90d' | 'all';

const periodOptions: { value: PeriodKey; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '90d', label: 'Últimos 90 dias' },
  { value: 'all', label: 'Todo período' },
];

const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  ready: 'Pronto',
  out_for_delivery: 'Saiu',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

function getPeriodStart(period: PeriodKey): Date | null {
  const now = new Date();
  if (period === 'today') {
    const d = new Date(now); d.setHours(0, 0, 0, 0); return d;
  }
  if (period === '7d') return new Date(now.getTime() - 7 * 86400000);
  if (period === '30d') return new Date(now.getTime() - 30 * 86400000);
  if (period === '90d') return new Date(now.getTime() - 90 * 86400000);
  return null;
}

function formatDuration(ms: number): string {
  if (!isFinite(ms) || ms <= 0) return '—';
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}min`;
}

export default function TableHistoryPage() {
  const { restaurant } = useRestaurant();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodKey>('30d');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!restaurant?.id) return;
    let active = true;
    (async () => {
      setLoading(true);
      let q = supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .not('table_number', 'is', null)
        .order('created_at', { ascending: false });

      const start = getPeriodStart(period);
      if (start) q = q.gte('created_at', start.toISOString());

      const { data, error } = await q;
      if (!active) return;
      if (error) {
        console.error(error);
        setOrders([]);
      } else {
        setOrders((data || []) as Order[]);
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [restaurant?.id, period]);

  const grouped = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const o of orders) {
      const k = o.table_number || '—';
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(o);
    }
    const result = Array.from(map.entries()).map(([table, list]) => {
      const totalRevenue = list.reduce((s, o) => s + Number(o.total || 0), 0);
      const avgTicket = totalRevenue / Math.max(list.length, 1);
      // Average duration = (updated_at - created_at) for non-cancelled
      const durations = list
        .filter(o => o.status === 'delivered')
        .map(o => new Date(o.updated_at).getTime() - new Date(o.created_at).getTime())
        .filter(d => d > 0);
      const avgDuration = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

      const statusCounts: Record<string, number> = {};
      list.forEach(o => {
        const s = o.status || 'pending';
        statusCounts[s] = (statusCounts[s] || 0) + 1;
      });
      const lastOrder = list[0];
      return { table, list, totalRevenue, avgTicket, avgDuration, statusCounts, lastOrder };
    });
    result.sort((a, b) => b.totalRevenue - a.totalRevenue);
    return result;
  }, [orders]);

  const totals = useMemo(() => {
    const revenue = orders.reduce((s, o) => s + Number(o.total || 0), 0);
    return {
      revenue,
      orders: orders.length,
      tables: grouped.length,
      avgTicket: orders.length ? revenue / orders.length : 0,
    };
  }, [orders, grouped.length]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TableIcon className="w-7 h-7 text-primary" />
            Histórico por Mesa
          </h1>
          <p className="text-muted-foreground mt-1">Desempenho de cada mesa por período</p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {periodOptions.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Receipt className="w-3.5 h-3.5" />Pedidos</div>
          <div className="text-2xl font-bold mt-1">{totals.orders}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><DollarSign className="w-3.5 h-3.5" />Receita</div>
          <div className="text-2xl font-bold mt-1 text-success">R$ {totals.revenue.toFixed(2)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><TrendingUp className="w-3.5 h-3.5" />Ticket médio</div>
          <div className="text-2xl font-bold mt-1">R$ {totals.avgTicket.toFixed(2)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><TableIcon className="w-3.5 h-3.5" />Mesas ativas</div>
          <div className="text-2xl font-bold mt-1">{totals.tables}</div>
        </CardContent></Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : grouped.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="p-12 text-center text-muted-foreground">
            <TableIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>Nenhum pedido por mesa no período selecionado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {grouped.map(({ table, list, totalRevenue, avgTicket, avgDuration, statusCounts, lastOrder }, idx) => (
            <motion.div
              key={table}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.03 }}
            >
              <Card className="border-border hover:border-primary/30 transition-colors">
                <CardHeader
                  className="pb-3 cursor-pointer"
                  onClick={() => setExpanded(expanded === table ? null : table)}
                >
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      {expanded === table
                        ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                      <div className="w-12 h-12 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-lg">
                        {table}
                      </div>
                      <div>
                        <CardTitle className="text-lg">Mesa {table}</CardTitle>
                        <CardDescription>
                          {list.length} pedido(s) · último em {new Date(lastOrder.created_at).toLocaleString('pt-BR')}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-right text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground">Receita</div>
                        <div className="font-bold text-success">R$ {totalRevenue.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Ticket médio</div>
                        <div className="font-bold">R$ {avgTicket.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end"><Clock className="w-3 h-3" />Tempo médio</div>
                        <div className="font-bold">{formatDuration(avgDuration)}</div>
                      </div>
                      <div className="flex flex-wrap gap-1 justify-end items-center">
                        {Object.entries(statusCounts).map(([s, c]) => (
                          <Badge key={s} variant="outline" className="text-[10px]">
                            {statusLabels[s] || s}: {c}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                {expanded === table && (
                  <CardContent className="pt-0">
                    <div className="border-t border-border pt-3 space-y-2 max-h-80 overflow-y-auto">
                      {list.map(o => (
                        <div key={o.id} className="flex items-center justify-between text-sm py-2 px-3 rounded-lg bg-muted/30">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs">#{o.id.slice(0, 8).toUpperCase()}</span>
                            <Badge variant="outline" className="text-[10px]">{statusLabels[o.status || 'pending']}</Badge>
                            {o.customer_name && <span className="text-muted-foreground">{o.customer_name}</span>}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-primary">R$ {Number(o.total).toFixed(2)}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(o.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
