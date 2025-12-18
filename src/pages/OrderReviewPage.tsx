import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Send, ArrowLeft, CheckCircle, Package, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Order {
  id: string;
  customer_name: string | null;
  items: unknown;
  total: number;
  status: string;
  restaurant_id: string;
}

interface Restaurant {
  id: string;
  name: string;
  logo_url: string | null;
  slug: string;
}

function StarRating({ rating, onRate, size = 'lg' }: { 
  rating: number; 
  onRate: (rating: number) => void;
  size?: 'sm' | 'lg';
}) {
  const [hovered, setHovered] = useState(0);
  const starSize = size === 'lg' ? 'w-10 h-10' : 'w-6 h-6';

  return (
    <div className="flex gap-2 justify-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onRate(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110"
        >
          <Star
            className={`${starSize} transition-colors ${
              star <= (hovered || rating)
                ? 'fill-amber-400 text-amber-400'
                : 'text-muted-foreground'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function OrderReviewPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { toast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [overallRating, setOverallRating] = useState(0);
  const [comment, setComment] = useState('');
  const [productRatings, setProductRatings] = useState<Record<string, number>>({});

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  async function loadOrder() {
    if (!orderId) {
      setError('Pedido não encontrado');
      setLoading(false);
      return;
    }

    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError || !orderData) {
        setError('Pedido não encontrado');
        setLoading(false);
        return;
      }

      setOrder({
        ...orderData,
        items: orderData.items as unknown,
      });

      // Load restaurant
      const { data: restaurantData } = await supabase
        .from('restaurants')
        .select('id, name, logo_url, slug')
        .eq('id', orderData.restaurant_id)
        .single();

      if (restaurantData) {
        setRestaurant(restaurantData);
      }
    } catch (err) {
      console.error('Error loading order:', err);
      setError('Erro ao carregar pedido');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (overallRating === 0) {
      toast({
        title: 'Avaliação obrigatória',
        description: 'Por favor, selecione uma avaliação geral.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      // Save product reviews
      const items = order?.items as any[] || [];
      const reviewPromises = items.map(async (item) => {
        const productId = item.productId || item.product?.id;
        const rating = productRatings[productId] || overallRating;
        
        if (productId && restaurant) {
          return supabase.from('product_reviews').insert({
            product_id: productId,
            restaurant_id: restaurant.id,
            customer_name: order?.customer_name || 'Cliente',
            rating,
            comment: null,
            is_approved: false,
          });
        }
      });

      await Promise.all(reviewPromises.filter(Boolean));

      // If there's a general comment, save it as a review for the first product
      if (comment.trim() && items.length > 0) {
        const firstProductId = items[0].productId || items[0].product?.id;
        if (firstProductId && restaurant) {
          await supabase.from('product_reviews').insert({
            product_id: firstProductId,
            restaurant_id: restaurant.id,
            customer_name: order?.customer_name || 'Cliente',
            rating: overallRating,
            comment: comment.trim(),
            is_approved: false,
          });
        }
      }

      setSubmitted(true);
      toast({
        title: 'Obrigado pela avaliação!',
        description: 'Sua opinião é muito importante para nós.',
      });
    } catch (err) {
      console.error('Error submitting review:', err);
      toast({
        title: 'Erro ao enviar',
        description: 'Não foi possível enviar sua avaliação. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Package className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="text-xl font-bold text-foreground mb-2">Pedido não encontrado</h1>
        <p className="text-muted-foreground text-center mb-6">
          O pedido que você está procurando não existe ou já foi removido.
        </p>
        <Link to="/">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao início
          </Button>
        </Link>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-6"
        >
          <CheckCircle className="w-10 h-10 text-primary" />
        </motion.div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Obrigado!</h1>
        <p className="text-muted-foreground text-center mb-6">
          Sua avaliação foi enviada com sucesso.
        </p>
        {restaurant && (
          <Link to={`/${restaurant.slug}`}>
            <Button>
              Fazer novo pedido
            </Button>
          </Link>
        )}
      </div>
    );
  }

  const items = order.items as any[] || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="container max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            {restaurant?.logo_url && (
              <img 
                src={restaurant.logo_url} 
                alt={restaurant.name} 
                className="w-12 h-12 rounded-full object-cover"
              />
            )}
            <div>
              <h1 className="font-bold text-foreground">{restaurant?.name || 'Restaurante'}</h1>
              <p className="text-sm text-muted-foreground">
                Pedido #{order.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container max-w-lg mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Title */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Como foi seu pedido?
            </h2>
            <p className="text-muted-foreground">
              Sua opinião nos ajuda a melhorar cada vez mais!
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Overall Rating */}
            <div className="p-6 bg-card rounded-2xl border border-border text-center space-y-4">
              <h3 className="font-semibold text-foreground">Avaliação Geral</h3>
              <StarRating rating={overallRating} onRate={setOverallRating} />
              <p className="text-sm text-muted-foreground">
                {overallRating === 0 && 'Toque nas estrelas para avaliar'}
                {overallRating === 1 && 'Muito ruim 😞'}
                {overallRating === 2 && 'Ruim 😕'}
                {overallRating === 3 && 'Regular 😐'}
                {overallRating === 4 && 'Bom 😊'}
                {overallRating === 5 && 'Excelente! 🤩'}
              </p>
            </div>

            {/* Product Ratings */}
            {items.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">Avalie os produtos</h3>
                {items.map((item, index) => {
                  const productId = item.productId || item.product?.id || `item-${index}`;
                  const productName = item.productName || item.product?.name || item.name || 'Produto';
                  
                  return (
                    <div 
                      key={productId}
                      className="p-4 bg-card rounded-xl border border-border flex items-center justify-between gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{productName}</p>
                        <p className="text-sm text-muted-foreground">Qtd: {item.quantity || 1}</p>
                      </div>
                      <StarRating 
                        rating={productRatings[productId] || 0} 
                        onRate={(r) => setProductRatings(prev => ({ ...prev, [productId]: r }))}
                        size="sm"
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Comment */}
            <div className="space-y-2">
              <label className="font-semibold text-foreground">
                Deixe um comentário (opcional)
              </label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Conte-nos como foi sua experiência..."
                rows={4}
              />
            </div>

            {/* Submit */}
            <Button 
              type="submit" 
              size="xl" 
              className="w-full"
              disabled={submitting || overallRating === 0}
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              {submitting ? 'Enviando...' : 'Enviar avaliação'}
            </Button>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
