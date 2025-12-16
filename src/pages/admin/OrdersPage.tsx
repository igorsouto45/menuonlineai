import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ClipboardList, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ChefHat,
  Truck,
  Phone,
  MapPin,
  MessageSquare,
  Loader2,
  Filter
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurant } from '@/hooks/useRestaurant';
import { useToast } from '@/hooks/use-toast';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import type { Database } from '@/integrations/supabase/types';

type Order = Database['public']['Tables']['orders']['Row'];
type OrderStatus = Database['public']['Enums']['order_status'];

const statusConfig: Record<OrderStatus, { label: string; icon: React.ElementType; color: string }> = {
  pending: { label: 'Pendente', icon: Clock, color: 'bg-warning/20 text-warning' },
  confirmed: { label: 'Confirmado', icon: CheckCircle2, color: 'bg-primary/20 text-primary' },
  preparing: { label: 'Preparando', icon: ChefHat, color: 'bg-accent/20 text-accent' },
  ready: { label: 'Pronto', icon: CheckCircle2, color: 'bg-success/20 text-success' },
  delivered: { label: 'Entregue', icon: Truck, color: 'bg-success/20 text-success' },
  cancelled: { label: 'Cancelado', icon: XCircle, color: 'bg-destructive/20 text-destructive' },
};

const statusFlow: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready', 'delivered'];

const filterOptions: { value: string; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'confirmed', label: 'Confirmados' },
  { value: 'preparing', label: 'Preparando' },
  { value: 'ready', label: 'Prontos' },
  { value: 'delivered', label: 'Entregues' },
  { value: 'cancelled', label: 'Cancelados' },
];

export default function OrdersPage() {
  const { restaurant } = useRestaurant();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { toast } = useToast();
  const { playNotification } = useNotificationSound();

  useEffect(() => {
    if (!restaurant?.id) return;

    const fetchOrders = async () => {
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('created_at', { ascending: false });

      if (error) {
        toast({ title: 'Erro ao carregar pedidos', variant: 'destructive' });
      } else {
        setOrders(ordersData || []);
      }
      setLoading(false);
    };

    fetchOrders();
  }, [restaurant?.id]);

  // Real-time subscription
  useEffect(() => {
    if (!restaurant?.id) return;

    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurant.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setOrders(prev => [payload.new as Order, ...prev]);
            playNotification();
            toast({
              title: '🔔 Novo pedido!',
              description: `Pedido de ${(payload.new as Order).customer_name || 'Cliente'}`,
            });
          } else if (payload.eventType === 'UPDATE') {
            setOrders(prev => 
              prev.map(o => o.id === payload.new.id ? payload.new as Order : o)
            );
          } else if (payload.eventType === 'DELETE') {
            setOrders(prev => prev.filter(o => o.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurant?.id, toast, playNotification]);

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Status atualizado',
        description: `Pedido marcado como ${statusConfig[newStatus].label.toLowerCase()}.`,
      });
    }
  };

  const getNextStatus = (currentStatus: OrderStatus | null): OrderStatus | null => {
    if (!currentStatus) return 'confirmed';
    const currentIndex = statusFlow.indexOf(currentStatus);
    if (currentIndex === -1 || currentIndex >= statusFlow.length - 1) return null;
    return statusFlow[currentIndex + 1];
  };

  const formatItems = (items: unknown) => {
    if (!items || !Array.isArray(items)) return [];
    return items as Array<{ name: string; quantity: number; price: number }>;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredOrders = statusFilter === 'all' 
    ? orders 
    : orders.filter(o => o.status === statusFilter);

  const orderCounts = {
    all: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    ready: orders.filter(o => o.status === 'ready').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Pedidos</h1>
        <p className="text-muted-foreground mt-1">Gerencie os pedidos do seu restaurante em tempo real</p>
      </div>

      {/* Status Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        {filterOptions.map((option) => (
          <Button
            key={option.value}
            variant={statusFilter === option.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(option.value)}
            className={statusFilter === option.value ? 'gradient-primary text-primary-foreground' : ''}
          >
            {option.label}
            {orderCounts[option.value as keyof typeof orderCounts] > 0 && (
              <Badge 
                variant="secondary" 
                className={`ml-2 ${statusFilter === option.value ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted'}`}
              >
                {orderCounts[option.value as keyof typeof orderCounts]}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <Card className="border-dashed border-2 border-border">
          <CardContent className="p-12 text-center">
            <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {statusFilter === 'all' ? 'Nenhum pedido ainda' : `Nenhum pedido ${filterOptions.find(f => f.value === statusFilter)?.label.toLowerCase()}`}
            </h3>
            <p className="text-muted-foreground">
              Os pedidos dos seus clientes aparecerão aqui em tempo real.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredOrders.map((order, index) => {
            const status = order.status || 'pending';
            const StatusIcon = statusConfig[status].icon;
            const nextStatus = getNextStatus(status);
            const items = formatItems(order.items);

            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.03 }}
              >
                <Card className="border-border hover:border-primary/20 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-lg">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </CardTitle>
                        <Badge className={`${statusConfig[status].color} border-0`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusConfig[status].label}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(order.created_at)}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Customer Info */}
                    <div className="grid sm:grid-cols-3 gap-3 text-sm">
                      {order.customer_name && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{order.customer_name}</span>
                        </div>
                      )}
                      {order.customer_phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="w-4 h-4" />
                          {order.customer_phone}
                        </div>
                      )}
                      {order.customer_address && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          <span className="line-clamp-1">{order.customer_address}</span>
                        </div>
                      )}
                    </div>

                    {/* Items */}
                    <div className="bg-secondary rounded-xl p-4">
                      <div className="space-y-2">
                        {items.map((item, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="text-foreground">{item.quantity}x {item.name}</span>
                            <span className="text-muted-foreground">
                              R$ {(item.price * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-border mt-3 pt-3 flex justify-between font-semibold">
                        <span className="text-foreground">Total</span>
                        <span className="text-primary">R$ {Number(order.total).toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Notes */}
                    {order.notes && (
                      <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                        <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{order.notes}</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {nextStatus && status !== 'cancelled' && (
                        <Button 
                          variant="hero" 
                          size="sm"
                          onClick={() => updateOrderStatus(order.id, nextStatus)}
                        >
                          Marcar como {statusConfig[nextStatus].label.toLowerCase()}
                        </Button>
                      )}
                      {status !== 'cancelled' && status !== 'delivered' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => updateOrderStatus(order.id, 'cancelled')}
                          className="text-destructive hover:text-destructive"
                        >
                          Cancelar pedido
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
