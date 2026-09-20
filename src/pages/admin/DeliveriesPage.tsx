import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurant } from '@/hooks/useRestaurant';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bike, CheckCircle2, KeyRound, Loader2, MapPin, Phone, RefreshCw } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Order = Database['public']['Tables']['orders']['Row'];

/**
 * Painel simples de acompanhamento de entregas.
 * Três colunas: pedidos confirmados (em produção), códigos aguardando retirada
 * pelo entregador (prontos) e entregas já em rota.
 */
export default function DeliveriesPage() {
  const { restaurant, loading: loadingRestaurant } = useRestaurant();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    if (!restaurant?.id) return;
    setLoading(true);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .in('status', ['confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'])
      .gte('created_at', startOfDay.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erro ao carregar entregas:', error);
      setOrders([]);
    } else {
      setOrders((data ?? []) as Order[]);
    }
    setLoading(false);
  }, [restaurant?.id]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Atualização em tempo real dos pedidos do restaurante
  useEffect(() => {
    if (!restaurant?.id) return;

    const channel = supabase
      .channel(`deliveries-${restaurant.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurant.id}` },
        () => fetchOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurant?.id, fetchOrders]);

  // Só pedidos de entrega interessam aqui (mesa/retirada ficam no Kanban)
  const deliveryOrders = useMemo(
    () => orders.filter((o) => !o.table_number && o.delivery_mode !== 'dine-in' && o.delivery_mode !== 'pickup'),
    [orders]
  );

  const confirmed = deliveryOrders.filter((o) => o.status === 'confirmed' || o.status === 'preparing');
  const pendingCodes = deliveryOrders.filter((o) => o.status === 'ready');
  const inRoute = deliveryOrders.filter((o) => o.status === 'out_for_delivery');
  const deliveredToday = deliveryOrders.filter((o) => o.status === 'delivered');

  if (loadingRestaurant || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Entregas</h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe em tempo real os pedidos de entrega de hoje
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={fetchOrders}>
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Confirmados" value={confirmed.length} icon={CheckCircle2} />
        <StatCard label="Códigos pendentes" value={pendingCodes.length} icon={KeyRound} />
        <StatCard label="Em rota" value={inRoute.length} icon={Bike} />
        <StatCard label="Entregues hoje" value={deliveredToday.length} icon={CheckCircle2} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <OrderColumn title="Confirmados" description="Em produção" orders={confirmed} />
        <OrderColumn title="Códigos pendentes" description="Prontos, aguardando entregador" orders={pendingCodes} highlightCode />
        <OrderColumn title="Em rota" description="Saíram para entrega" orders={inRoute} highlightCode />
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

interface OrderColumnProps {
  title: string;
  description: string;
  orders: Order[];
  highlightCode?: boolean;
}

function OrderColumn({ title, description, orders, highlightCode }: OrderColumnProps) {
  return (
    <Card className="bg-secondary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span>{title}</span>
          <Badge variant="secondary">{orders.length}</Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {orders.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhum pedido aqui</p>
        ) : (
          orders.map((order) => <DeliveryCard key={order.id} order={order} highlightCode={highlightCode} />)
        )}
      </CardContent>
    </Card>
  );
}

function DeliveryCard({ order, highlightCode }: { order: Order; highlightCode?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">#{order.id.slice(0, 8).toUpperCase()}</span>
        {order.delivery_code && (
          <Badge
            variant={highlightCode ? 'default' : 'outline'}
            className="font-mono text-[11px] font-bold tracking-widest"
          >
            {order.delivery_code}
          </Badge>
        )}
      </div>

      {order.customer_name && <p className="text-sm font-medium text-foreground">{order.customer_name}</p>}

      {order.customer_phone && (
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <Phone className="h-3 w-3" />
          {order.customer_phone}
        </div>
      )}

      {order.customer_address && (
        <div className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
          <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
          <span className="line-clamp-2">{order.customer_address}</span>
        </div>
      )}

      <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
        <span className="text-sm font-bold text-primary">R$ {Number(order.total).toFixed(2)}</span>
        <span className="text-xs text-muted-foreground">
          {new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}
