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
  MessageSquare
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
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

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    const fetchRestaurantAndOrders = async () => {
      // First get the user's restaurant
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (restaurant) {
        setRestaurantId(restaurant.id);
        
        // Then fetch orders
        const { data: ordersData } = await supabase
          .from('orders')
          .select('*')
          .eq('restaurant_id', restaurant.id)
          .order('created_at', { ascending: false });

        if (ordersData) {
          setOrders(ordersData);
        }
      }
      setLoading(false);
    };

    fetchRestaurantAndOrders();
  }, [user]);

  // Real-time subscription
  useEffect(() => {
    if (!restaurantId) return;

    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setOrders(prev => [payload.new as Order, ...prev]);
            toast({
              title: '🔔 Novo pedido!',
              description: `Pedido de ${(payload.new as Order).customer_name || 'Cliente'}`,
            });
          } else if (payload.eventType === 'UPDATE') {
            setOrders(prev => 
              prev.map(o => o.id === payload.new.id ? payload.new as Order : o)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, toast]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Pedidos</h1>
        <p className="text-muted-foreground mt-1">Gerencie os pedidos do seu restaurante em tempo real</p>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <Card className="border-dashed border-2 border-border">
          <CardContent className="p-12 text-center">
            <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum pedido ainda</h3>
            <p className="text-muted-foreground">
              Os pedidos dos seus clientes aparecerão aqui em tempo real.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {orders.map((order, index) => {
            const status = order.status || 'pending';
            const StatusIcon = statusConfig[status].icon;
            const nextStatus = getNextStatus(status);
            const items = formatItems(order.items);

            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card className="border-border hover:border-primary/20 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
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
                        <div className="flex items-center gap-2 text-muted-foreground">
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
                          {order.customer_address}
                        </div>
                      )}
                    </div>

                    {/* Items */}
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="space-y-1">
                        {items.map((item, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span>{item.quantity}x {item.name}</span>
                            <span className="text-muted-foreground">
                              R$ {(item.price * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-border mt-2 pt-2 flex justify-between font-semibold">
                        <span>Total</span>
                        <span className="text-primary">R$ {Number(order.total).toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Notes */}
                    {order.notes && (
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <MessageSquare className="w-4 h-4 mt-0.5" />
                        <span>{order.notes}</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
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
                        >
                          Cancelar
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
