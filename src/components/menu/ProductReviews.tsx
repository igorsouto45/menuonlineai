import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Send, User, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Review {
  id: string;
  customer_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

interface ProductReviewsProps {
  productId: string;
  restaurantId: string;
}

function StarRating({ rating, onRate, interactive = false }: { 
  rating: number; 
  onRate?: (rating: number) => void;
  interactive?: boolean;
}) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onRate?.(star)}
          onMouseEnter={() => interactive && setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className={`transition-transform ${interactive ? 'hover:scale-110 cursor-pointer' : 'cursor-default'}`}
        >
          <Star
            className={`w-5 h-5 transition-colors ${
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

export function ProductReviews({ productId, restaurantId }: ProductReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    rating: 0,
    comment: ''
  });

  useEffect(() => {
    loadReviews();
  }, [productId]);

  async function loadReviews() {
    const { data } = await supabase
      .from('product_reviews')
      .select('*')
      .eq('product_id', productId)
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .limit(10);

    setReviews(data || []);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!formData.name.trim() || formData.rating === 0) {
      toast.error('Preencha seu nome e selecione uma avaliação');
      return;
    }

    setSubmitting(true);

    const { error } = await supabase
      .from('product_reviews')
      .insert({
        product_id: productId,
        restaurant_id: restaurantId,
        customer_name: formData.name.trim(),
        rating: formData.rating,
        comment: formData.comment.trim() || null,
        is_approved: false
      });

    setSubmitting(false);

    if (error) {
      toast.error('Erro ao enviar avaliação');
      return;
    }

    toast.success('Avaliação enviada! Aguarde aprovação.');
    setShowForm(false);
    setFormData({ name: '', rating: 0, comment: '' });
  }

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-foreground">Avaliações</h3>
          {reviews.length > 0 && (
            <div className="flex items-center gap-1 text-sm">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="font-medium text-foreground">{averageRating.toFixed(1)}</span>
              <span className="text-muted-foreground">({reviews.length})</span>
            </div>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowForm(!showForm)}
        >
          <MessageSquare className="w-4 h-4 mr-1" />
          Avaliar
        </Button>
      </div>

      {/* Review Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit}
            className="space-y-3 p-4 bg-secondary rounded-xl overflow-hidden"
          >
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Seu nome</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Como deseja ser chamado?"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Avaliação</label>
              <StarRating
                rating={formData.rating}
                onRate={(rating) => setFormData(prev => ({ ...prev, rating }))}
                interactive
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Comentário (opcional)</label>
              <textarea
                value={formData.comment}
                onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
                placeholder="Conte sua experiência..."
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none resize-none"
              />
            </div>

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? 'Enviando...' : (
                <>
                  <Send className="w-4 h-4 mr-1" />
                  Enviar avaliação
                </>
              )}
            </Button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Reviews List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="animate-pulse bg-secondary rounded-xl p-4 h-20" />
          ))}
        </div>
      ) : reviews.length > 0 ? (
        <div className="space-y-3 max-h-48 overflow-y-auto">
          {reviews.map((review) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-secondary rounded-xl"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-foreground text-sm truncate">
                      {review.customer_name}
                    </span>
                    <StarRating rating={review.rating} />
                  </div>
                  {review.comment && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {review.comment}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          Seja o primeiro a avaliar este produto!
        </p>
      )}
    </div>
  );
}
