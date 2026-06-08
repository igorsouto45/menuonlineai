import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Package, 
  ChefHat, 
  Truck, 
  Search,
  ArrowLeft,
  Phone,
  MapPin,
  Loader2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Database } from '@/integrations/supabase/types';

type OrderStatus = Database['public']['Enums']['order_status'];
type Order = Database['public']['Tables']['orders']['Row'];

const statusConfig: Record<OrderStatus, { 
  icon: React.ElementType; 
  title: string; 
  description: string; 
  color: string;
  bgColor: string;
  estimatedMinutes: number;
}> = {
  pending: {
    icon: Clock,
    title: 'Aguardando Pagamento',
    description: 'Seu pedido está aguardando a confirmação do pagamento.',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10 border-yellow-500/30',
    estimatedMinutes: 0,
  },
  confirmed: {
    icon: CheckCircle,
    title: 'Pedido Confirmado',
    description: 'Seu pagamento foi aprovado! O restaurante recebeu seu pedido.',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10 border-green-500/30',
    estimatedMinutes: 45,
  },
  preparing: {
    icon: ChefHat,
    title: 'Preparando seu Pedido',
    description: 'O restaurante está preparando seu pedido com carinho.',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10 border-orange-500/30',
    estimatedMinutes: 30,
  },
  ready: {
    icon: Package,
    title: 'Pedido Pronto!',
    description: 'Seu pedido está pronto e aguardando entrega ou retirada.',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10 border-blue-500/30',
    estimatedMinutes: 15,
  },
  out_for_delivery: {
    icon: Truck,
    title: 'Saiu para Entrega',
    description: 'Seu pedido está a caminho! Em breve chegará até você.',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10 border-purple-500/30',
    estimatedMinutes: 10,
  },
  delivered: {
    icon: CheckCircle,
    title: 'Pedido Entregue!',
    description: 'Seu pedido foi entregue. Bom apetite!',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10 border-green-500/30',
    estimatedMinutes: 0,
  },
  cancelled: {
    icon: XCircle,
    title: 'Pedido Cancelado',
    description: 'Infelizmente seu pedido foi cancelado.',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10 border-red-500/30',
    estimatedMinutes: 0,
  },
};

const statusOrder: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'];

export default function OrderTrackingPage() {
  const { orderId: urlOrderId } = useParams();
  const [searchParams] = useSearchParams();
  const [orderIdInput, setOrderIdInput] = useState(urlOrderId || searchParams.get('order_id') || '');
  const [order, setOrder] = useState<Order | null>(null);
  const [restaurant, setRestaurant] = useState<{ name: string; logo_url: string | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  // Auto-search if order ID is in URL
  useEffect(() => {
    const id = urlOrderId || searchParams.get('order_id');
    if (id) {
      setOrderIdInput(id);
      searchOrder(id);
    }
  }, [urlOrderId, searchParams]);

  // Real-time subscription
  useEffect(() => {
    if (!order?.id) return;

    const channel = supabase
      .channel(`order-tracking-${order.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${order.id}`,
        },
        (payload) => {
          setOrder(payload.new as Order);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order?.id]);

  const searchOrder = async (id?: string) => {
    const searchId = id || orderIdInput.trim();
    if (!searchId) return;

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', searchId)
        .single();

      if (orderError || !orderData) {
        setError('Pedido não encontrado. Verifique o número do pedido.');
        setOrder(null);
        setRestaurant(null);
        return;
      }

      setOrder(orderData);

      // Fetch restaurant info
      const { data: restaurantData } = await supabase
        .from('restaurants')
        .select('name, logo_url')
        .eq('id', orderData.restaurant_id)
        .single();

      setRestaurant(restaurantData);
    } catch (err) {
      setError('Erro ao buscar pedido. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchOrder();
  };

  const currentStatusIndex = order?.status ? statusOrder.indexOf(order.status as OrderStatus) : -1;
  const config = order?.status ? statusConfig[order.status as OrderStatus] : null;
  const StatusIcon = config?.icon || Clock;

  const formatOrderItems = (items: unknown) => {
    if (!items || !Array.isArray(items)) return [];
    return items as Array<{ productName: string; quantity: number; subtotal: number }>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <div className="container max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Rastrear Pedido</h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe o status do seu pedido em tempo real
          </p>
        </div>

        {/* Search Form */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                placeholder="Digite o número do pedido..."
                value={orderIdInput}
                onChange={(e) => setOrderIdInput(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={loading || !orderIdInput.trim()}>
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 mb-6 text-center"
            >
              <XCircle className="w-6 h-6 text-destructive mx-auto mb-2" />
              <p className="text-destructive">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Order Details */}
        <AnimatePresence>
          {order && config && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="space-y-6"
            >
              {/* Restaurant Info */}
              {restaurant && (
                <div className="flex items-center gap-3 justify-center">
                  {restaurant.logo_url && (
                    <img 
                      src={restaurant.logo_url} 
                      alt={restaurant.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  )}
                  <span className="font-medium text-foreground">{restaurant.name}</span>
                </div>
              )}

              {/* Status Card */}
              <Card className={`border-2 ${config.bgColor}`}>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${config.bgColor}`}>
                      <StatusIcon className={`w-8 h-8 ${config.color}`} />
                    </div>
                    <h2 className="text-xl font-bold text-foreground mb-2">{config.title}</h2>
                    <p className="text-muted-foreground">{config.description}</p>
                    
                    {/* Estimated Time */}
                    {config.estimatedMinutes > 0 && order.status !== 'cancelled' && (
                      <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
                        <Clock className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-primary">
                          Tempo estimado: ~{config.estimatedMinutes} min
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {order.status !== 'cancelled' && currentStatusIndex >= 0 && (
                    <div className="mt-6 pt-6 border-t border-border">
                      <div className="flex justify-between mb-3">
                        {statusOrder.slice(0, 5).map((s, index) => {
                          const isActive = index <= currentStatusIndex;
                          const isCurrent = index === currentStatusIndex;
                          const StepIcon = statusConfig[s].icon;
                          return (
                            <div key={s} className="flex flex-col items-center">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                  isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                                } ${isCurrent ? 'ring-4 ring-primary/30' : ''}`}
                              >
                                <StepIcon className="w-4 h-4" />
                              </div>
                              <span className={`text-xs mt-1 ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {statusConfig[s].title.split(' ')[0]}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-primary"
                          initial={{ width: 0 }}
                          animate={{ width: `${((currentStatusIndex + 1) / 5) * 100}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Order Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Detalhes do Pedido</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Número do pedido:</span>
                    <span className="font-mono font-medium">#{order.id.slice(0, 8).toUpperCase()}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Data:</span>
                    <span>
                      {new Date(order.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {order.customer_name && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Cliente:</span>
                      <span>{order.customer_name}</span>
                    </div>
                  )}

                  {order.customer_phone && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Phone className="w-3 h-3" /> Telefone:
                      </span>
                      <span>{order.customer_phone}</span>
                    </div>
                  )}

                  {order.customer_address && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        {order.table_number ? <Clock className="w-3 h-3" /> : <MapPin className="w-3 h-3" />} 
                        {order.table_number ? 'Mesa:' : 'Endereço:'}
                      </span>
                      <span className="text-right max-w-[60%]">
                        {order.table_number ? `Mesa ${order.table_number}` : order.customer_address}
                      </span>
                    </div>
                  )}

                  {/* Items */}
                  <div className="pt-4 border-t border-border">
                    <h4 className="font-medium mb-3">Itens</h4>
                    <div className="space-y-2">
                      {formatOrderItems(order.items).map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{item.quantity}x {item.productName}</span>
                          <span>R$ {Number(item.subtotal).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Total */}
                  <div className="pt-4 border-t border-border flex justify-between font-bold">
                    <span>Total</span>
                    <span className="text-primary">R$ {Number(order.total).toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Back Link */}
              {restaurant && (
                <div className="text-center">
                  <Link to={`/r/${order.restaurant_id}`}>
                    <Button variant="outline" className="gap-2">
                      <ArrowLeft className="w-4 h-4" />
                      Voltar ao Menu
                    </Button>
                  </Link>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {!order && searched && !error && !loading && (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Digite o número do pedido para rastrear
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
