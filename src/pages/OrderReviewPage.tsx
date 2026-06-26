import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Send, ArrowLeft, CheckCircle, Package, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OrderInfo {
  id: string;
  restaurant_id: string;
  customer_name: string | null;
  items: unknown;
  total: number;
  status: string;
  restaurant_name: string;
  restaurant_slug: string;
  restaurant_logo_url: string | null;
  already_reviewed: boolean;
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
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [overallRating, setOverallRating] = useState(0);
  const [comment, setComment] = useState('');
  const [productRatings, setProductRatings] = useState<Record<string, number>>({});

  useEffect(() => {
    loadOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  async function loadOrder() {
    if (!orderId) {
      setError('Link de avaliação inválido.');
      setLoading(false);
      return;
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
      setError('Link de avaliação inválido.');
      setLoading(false);
      return;
    }

    try {
      const { data, error: rpcError } = await supabase.rpc('get_order_for_review', {
        _order_id: orderId,
      });

      if (rpcError) throw rpcError;

      const row = Array.isArray(data) ? data[0] : data;
      if (!row) {
        setError('Pedido não encontrado.');
        setLoading(false);
        return;
      }

      if (row.status !== 'delivered') {
        setError('Este pedido ainda não foi entregue. A avaliação será liberada após a entrega.');
        setLoading(false);
        return;
      }

      if (row.already_reviewed) {
        setError('Este pedido já foi avaliado. Obrigado!');
        setOrder(row as OrderInfo);
        setLoading(false);
        return;
      }

      setOrder(row as OrderInfo);
    } catch (err) {
      console.error('Error loading order:', err);
      setError('Erro ao carregar pedido.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!order) return;

    if (overallRating === 0) {
      toast.error('Selecione uma avaliação geral antes de enviar.');
      return;
    }

    setSubmitting(true);
    try {
      const items = (order.items as Array<Record<string, unknown>>) || [];
      const customerName = order.customer_name?.trim() || 'Cliente';
      const seen = new Set<string>();
      const rows: Array<{
        order_id: string;
        product_id: string;
        restaurant_id: string;
        customer_name: string;
        rating: number;
        comment: string | null;
        is_approved: boolean;
      }> = [];

      for (const item of items) {
        const productId =
          (item.productId as string) ||
          ((item.product as Record<string, unknown> | undefined)?.id as string);
        if (!productId || seen.has(productId)) continue;
        seen.add(productId);

        rows.push({
          order_id: order.id,
          product_id: productId,
          restaurant_id: order.restaurant_id,
          customer_name: customerName,
          rating: productRatings[productId] || overallRating,
          comment: comment.trim() ? comment.trim() : null,
          is_approved: false,
        });
      }

      if (rows.length === 0) {
        toast.error('Nenhum produto encontrado neste pedido para avaliar.');
        setSubmitting(false);
        return;
      }

      const { error: insertError } = await supabase.from('product_reviews').insert(rows);

      if (insertError) {
        if (insertError.code === '23505') {
          toast.error('Este pedido já foi avaliado.');
          setSubmitted(true);
          return;
        }
        throw insertError;
      }

      setSubmitted(true);
      toast.success('Obrigado pela avaliação! Sua opinião é muito importante para nós.');

      // Redirect to the restaurant menu after a short delay
      setTimeout(() => {
        navigate(`/${order.restaurant_slug}`);
      }, 2500);
    } catch (err) {
      console.error('Error submitting review:', err);
      toast.error('Não foi possível enviar sua avaliação. Tente novamente.');
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

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Package className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="text-xl font-bold text-foreground mb-2">Avaliação indisponível</h1>
        <p className="text-muted-foreground text-center mb-6 max-w-sm">{error}</p>
        <Link to={order?.restaurant_slug ? `/${order.restaurant_slug}` : '/'}>
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {order?.restaurant_slug ? 'Ir para o cardápio' : 'Voltar ao início'}
          </Button>
        </Link>
      </div>
    );
  }

  if (!order) return null;

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
        <Link to={`/${order.restaurant_slug}`}>
          <Button>Fazer novo pedido</Button>
        </Link>
      </div>
    );
  }

  const items = (order.items as Array<Record<string, unknown>>) || [];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="container max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            {order.restaurant_logo_url && (
              <img
                src={order.restaurant_logo_url}
                alt={order.restaurant_name}
                className="w-12 h-12 rounded-full object-cover"
              />
            )}
            <div>
              <h1 className="font-bold text-foreground">{order.restaurant_name}</h1>
              <p className="text-sm text-muted-foreground">
                Pedido #{order.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-lg mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">Como foi seu pedido?</h2>
            <p className="text-muted-foreground">
              Sua opinião nos ajuda a melhorar cada vez mais!
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
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

            {items.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">Avalie os produtos</h3>
                {items.map((item, index) => {
                  const productId =
                    (item.productId as string) ||
                    ((item.product as Record<string, unknown> | undefined)?.id as string) ||
                    `item-${index}`;
                  const productName =
                    (item.productName as string) ||
                    ((item.product as Record<string, unknown> | undefined)?.name as string) ||
                    (item.name as string) ||
                    'Produto';

                  return (
                    <div
                      key={productId}
                      className="p-4 bg-card rounded-xl border border-border flex items-center justify-between gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{productName}</p>
                        <p className="text-sm text-muted-foreground">
                          Qtd: {(item.quantity as number) || 1}
                        </p>
                      </div>
                      <StarRating
                        rating={productRatings[productId] || 0}
                        onRate={(r) =>
                          setProductRatings((prev) => ({ ...prev, [productId]: r }))
                        }
                        size="sm"
                      />
                    </div>
                  );
                })}
              </div>
            )}

            <div className="space-y-2">
              <label className="font-semibold text-foreground">
                Deixe um comentário (opcional)
              </label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Conte-nos como foi sua experiência..."
                rows={4}
                maxLength={1000}
              />
            </div>

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
