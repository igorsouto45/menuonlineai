import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, Clock, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaymentStatusIndicatorProps {
  restaurantId: string;
}

type PaymentStatus = 'pending' | 'success' | 'failure' | null;

export function PaymentStatusIndicator({ restaurantId }: PaymentStatusIndicatorProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState<PaymentStatus>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const paymentParam = searchParams.get('payment');
    if (paymentParam === 'success' || paymentParam === 'pending' || paymentParam === 'failure') {
      setStatus(paymentParam as PaymentStatus);
      setIsVisible(true);
      
      // Clear URL params after reading
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('payment');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Poll for order status when payment is pending
  useEffect(() => {
    if (status !== 'pending' && status !== 'success') return;

    let interval: ReturnType<typeof setInterval>;

    const checkOrderStatus = async () => {
      // Find the most recent order for this restaurant
      const { data: orders } = await supabase
        .from('orders')
        .select('id, status')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (orders && orders.length > 0) {
        const order = orders[0];
        setOrderId(order.id);
        setOrderStatus(order.status);

        if (order.status === 'confirmed') {
          setStatus('success');
        } else if (order.status === 'cancelled') {
          setStatus('failure');
        }
      }
    };

    checkOrderStatus();
    interval = setInterval(checkOrderStatus, 5000); // Check every 5 seconds

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status, restaurantId]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      setStatus(null);
      setOrderId(null);
      setOrderStatus(null);
    }, 300);
  };

  if (!isVisible || !status) return null;

  const statusConfig = {
    pending: {
      icon: <Clock className="w-8 h-8 text-yellow-500" />,
      title: 'Aguardando Pagamento',
      description: 'Seu pedido foi criado e está aguardando a confirmação do pagamento.',
      bgColor: 'bg-yellow-500/10 border-yellow-500/30',
      loader: true,
    },
    success: {
      icon: <CheckCircle className="w-8 h-8 text-green-500" />,
      title: 'Pagamento Aprovado!',
      description: 'Seu pedido foi confirmado e já está sendo preparado.',
      bgColor: 'bg-green-500/10 border-green-500/30',
      loader: false,
    },
    failure: {
      icon: <XCircle className="w-8 h-8 text-red-500" />,
      title: 'Pagamento Recusado',
      description: 'Não foi possível processar seu pagamento. Tente novamente.',
      bgColor: 'bg-red-500/10 border-red-500/30',
      loader: false,
    },
  };

  const config = statusConfig[status];

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
                    <Loader2 className="w-4 h-4 text-yellow-500 animate-spin absolute -bottom-1 -right-1" />
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
            
            {status === 'failure' && (
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
