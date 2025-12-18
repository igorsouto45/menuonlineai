import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, Clock, Loader2, X, Package, ChefHat, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Database } from '@/integrations/supabase/types';

type OrderStatus = Database['public']['Enums']['order_status'];

interface PaymentStatusIndicatorProps {
  restaurantId: string;
}

type PaymentStatus = 'pending' | 'success' | 'failure' | null;

const orderStatusConfig: Record<OrderStatus, { icon: React.ElementType; title: string; description: string; color: string }> = {
  pending: {
    icon: Clock,
    title: 'Aguardando Pagamento',
    description: 'Seu pedido foi criado e está aguardando a confirmação do pagamento.',
    color: 'text-yellow-500',
  },
  confirmed: {
    icon: CheckCircle,
    title: 'Pedido Confirmado!',
    description: 'Seu pagamento foi aprovado e o pedido foi recebido pelo restaurante.',
    color: 'text-green-500',
  },
  preparing: {
    icon: ChefHat,
    title: 'Preparando seu Pedido',
    description: 'O restaurante está preparando seu pedido com carinho.',
    color: 'text-orange-500',
  },
  ready: {
    icon: Package,
    title: 'Pedido Pronto!',
    description: 'Seu pedido está pronto e aguardando entrega ou retirada.',
    color: 'text-blue-500',
  },
  out_for_delivery: {
    icon: Truck,
    title: 'Saiu para Entrega',
    description: 'Seu pedido está a caminho! Em breve chegará até você.',
    color: 'text-purple-500',
  },
  delivered: {
    icon: CheckCircle,
    title: 'Pedido Entregue!',
    description: 'Seu pedido foi entregue. Bom apetite!',
    color: 'text-green-500',
  },
  cancelled: {
    icon: XCircle,
    title: 'Pedido Cancelado',
    description: 'Infelizmente seu pedido foi cancelado.',
    color: 'text-red-500',
  },
};

export function PaymentStatusIndicator({ restaurantId }: PaymentStatusIndicatorProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState<PaymentStatus>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderStatus, setOrderStatus] = useState<OrderStatus | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const paymentParam = searchParams.get('payment');
    const orderIdParam = searchParams.get('order_id');
    
    if (paymentParam === 'success' || paymentParam === 'pending' || paymentParam === 'failure') {
      setStatus(paymentParam as PaymentStatus);
      setIsVisible(true);
      
      if (orderIdParam) {
        setOrderId(orderIdParam);
      }
      
      // Clear URL params after reading
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('payment');
      newParams.delete('order_id');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Fetch initial order and subscribe to realtime updates
  useEffect(() => {
    if (!orderId) return;

    // Fetch initial order status
    const fetchOrder = async () => {
      const { data: order } = await supabase
        .from('orders')
        .select('status')
        .eq('id', orderId)
        .single();

      if (order) {
        setOrderStatus(order.status);
        if (order.status === 'confirmed' || order.status === 'preparing' || order.status === 'ready' || order.status === 'out_for_delivery' || order.status === 'delivered') {
          setStatus('success');
        } else if (order.status === 'cancelled') {
          setStatus('failure');
        }
      }
    };

    fetchOrder();

    // Subscribe to realtime updates for this specific order
    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          const newStatus = payload.new.status as OrderStatus;
          setOrderStatus(newStatus);
          
          if (newStatus === 'confirmed' || newStatus === 'preparing' || newStatus === 'ready' || newStatus === 'out_for_delivery' || newStatus === 'delivered') {
            setStatus('success');
          } else if (newStatus === 'cancelled') {
            setStatus('failure');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  // Fallback: Find most recent order if no order_id in URL
  useEffect(() => {
    if (orderId || !isVisible || status !== 'pending') return;

    const findRecentOrder = async () => {
      const { data: orders } = await supabase
        .from('orders')
        .select('id, status')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (orders && orders.length > 0) {
        setOrderId(orders[0].id);
        setOrderStatus(orders[0].status);
      }
    };

    findRecentOrder();
  }, [isVisible, status, orderId, restaurantId]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      setStatus(null);
      setOrderId(null);
      setOrderStatus(null);
    }, 300);
  };

  if (!isVisible || !status) return null;

  const currentOrderConfig = orderStatus ? orderStatusConfig[orderStatus] : null;
  const StatusIcon = currentOrderConfig?.icon || Clock;

  const statusConfig = {
    pending: {
      icon: <Clock className="w-8 h-8 text-yellow-500" />,
      title: currentOrderConfig?.title || 'Aguardando Pagamento',
      description: currentOrderConfig?.description || 'Seu pedido foi criado e está aguardando a confirmação do pagamento.',
      bgColor: 'bg-yellow-500/10 border-yellow-500/30',
      loader: orderStatus === 'pending',
    },
    success: {
      icon: <StatusIcon className={`w-8 h-8 ${currentOrderConfig?.color || 'text-green-500'}`} />,
      title: currentOrderConfig?.title || 'Pedido Confirmado!',
      description: currentOrderConfig?.description || 'Seu pedido foi confirmado e está sendo processado.',
      bgColor: orderStatus === 'cancelled' ? 'bg-red-500/10 border-red-500/30' : 'bg-green-500/10 border-green-500/30',
      loader: orderStatus === 'preparing' || orderStatus === 'out_for_delivery',
    },
    failure: {
      icon: <XCircle className="w-8 h-8 text-red-500" />,
      title: currentOrderConfig?.title || 'Pagamento Recusado',
      description: currentOrderConfig?.description || 'Não foi possível processar seu pagamento. Tente novamente.',
      bgColor: 'bg-red-500/10 border-red-500/30',
      loader: false,
    },
  };

  const config = statusConfig[status];

  // Progress indicator for order status
  const statusOrder: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'];
  const currentStatusIndex = orderStatus ? statusOrder.indexOf(orderStatus) : 0;
  const showProgress = orderStatus && orderStatus !== 'cancelled' && currentStatusIndex >= 0;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm"
        >
          <div className={`rounded-xl border-2 ${config.bgColor} bg-card p-4 shadow-lg`}>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                {config.loader ? (
                  <div className="relative">
                    {config.icon}
                    <Loader2 className="w-4 h-4 text-primary animate-spin absolute -bottom-1 -right-1" />
                  </div>
                ) : (
                  config.icon
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground">{config.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
                {orderId && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Pedido: #{orderId.slice(0, 8).toUpperCase()}
                  </p>
                )}
              </div>
              <button
                onClick={handleClose}
                className="flex-shrink-0 w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Progress bar */}
            {showProgress && (
              <div className="mt-4 pt-3 border-t border-border">
                <div className="flex justify-between mb-2">
                  {statusOrder.slice(0, 5).map((s, index) => {
                    const isActive = index <= currentStatusIndex;
                    const isCurrent = index === currentStatusIndex;
                    return (
                      <div
                        key={s}
                        className={`w-2 h-2 rounded-full transition-all ${
                          isActive ? 'bg-primary' : 'bg-muted'
                        } ${isCurrent ? 'ring-2 ring-primary ring-offset-2 ring-offset-card' : ''}`}
                      />
                    );
                  })}
                </div>
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentStatusIndex + 1) / 5) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            )}
            
            {status === 'failure' && orderStatus !== 'cancelled' && (
              <div className="mt-3 pt-3 border-t border-border">
                <Button variant="outline" size="sm" className="w-full" onClick={handleClose}>
                  Tentar Novamente
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
