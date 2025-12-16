import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurant } from '@/hooks/useRestaurant';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, 
  Star, 
  Check, 
  X, 
  Trash2,
  MessageSquare,
  Clock,
  CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Review {
  id: string;
  product_id: string;
  customer_name: string;
  rating: number;
  comment: string | null;
  is_approved: boolean;
  created_at: string;
  product?: {
    name: string;
    image_url: string | null;
  };
}

export default function ReviewsPage() {
  const { restaurant } = useRestaurant();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    if (restaurant) {
      loadReviews();
    }
  }, [restaurant]);

  const loadReviews = async () => {
    if (!restaurant) return;

    try {
      const { data, error } = await supabase
        .from('product_reviews')
        .select(`
          *,
          product:products(name, image_url)
        `)
        .eq('restaurant_id', restaurant.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error('Error loading reviews:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as avaliações.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const approveReview = async (reviewId: string) => {
    try {
      const { error } = await supabase
        .from('product_reviews')
        .update({ is_approved: true })
        .eq('id', reviewId);

      if (error) throw error;

      setReviews(reviews.map(r => 
        r.id === reviewId ? { ...r, is_approved: true } : r
      ));

      toast({
        title: 'Avaliação aprovada!',
        description: 'A avaliação agora está visível no cardápio.',
      });
    } catch (error) {
      console.error('Error approving review:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível aprovar a avaliação.',
        variant: 'destructive',
      });
    }
  };

  const rejectReview = async (reviewId: string) => {
    try {
      const { error } = await supabase
        .from('product_reviews')
        .update({ is_approved: false })
        .eq('id', reviewId);

      if (error) throw error;

      setReviews(reviews.map(r => 
        r.id === reviewId ? { ...r, is_approved: false } : r
      ));

      toast({
        title: 'Avaliação rejeitada',
        description: 'A avaliação não será exibida no cardápio.',
      });
    } catch (error) {
      console.error('Error rejecting review:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível rejeitar a avaliação.',
        variant: 'destructive',
      });
    }
  };

  const deleteReview = async (reviewId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta avaliação?')) return;

    try {
      const { error } = await supabase
        .from('product_reviews')
        .delete()
        .eq('id', reviewId);

      if (error) throw error;

      setReviews(reviews.filter(r => r.id !== reviewId));

      toast({
        title: 'Avaliação excluída',
        description: 'A avaliação foi removida permanentemente.',
      });
    } catch (error) {
      console.error('Error deleting review:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a avaliação.',
        variant: 'destructive',
      });
    }
  };

  const pendingReviews = reviews.filter(r => !r.is_approved);
  const approvedReviews = reviews.filter(r => r.is_approved);

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${
            star <= rating 
              ? 'fill-amber-400 text-amber-400' 
              : 'text-muted-foreground/30'
          }`}
        />
      ))}
    </div>
  );

  const ReviewCard = ({ review, showActions = true }: { review: Review; showActions?: boolean }) => (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Product Image */}
          {review.product?.image_url && (
            <img
              src={review.product.image_url}
              alt={review.product?.name}
              className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
            />
          )}
          
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <p className="font-medium text-foreground truncate">
                  {review.product?.name || 'Produto'}
                </p>
                <p className="text-sm text-muted-foreground">{review.customer_name}</p>
              </div>
              <div className="flex items-center gap-2">
                {renderStars(review.rating)}
                <Badge variant={review.is_approved ? 'default' : 'secondary'}>
                  {review.is_approved ? 'Aprovada' : 'Pendente'}
                </Badge>
              </div>
            </div>

            {/* Comment */}
            {review.comment && (
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                "{review.comment}"
              </p>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {format(new Date(review.created_at), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
              </span>

              {showActions && (
                <div className="flex gap-2">
                  {!review.is_approved && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                      onClick={() => approveReview(review.id)}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Aprovar
                    </Button>
                  )}
                  {review.is_approved && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8"
                      onClick={() => rejectReview(review.id)}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Ocultar
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => deleteReview(review.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Avaliações</h1>
        <p className="text-muted-foreground">Gerencie as avaliações dos seus produtos</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{reviews.length}</p>
              <p className="text-sm text-muted-foreground">Total de avaliações</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Clock className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{pendingReviews.length}</p>
              <p className="text-sm text-muted-foreground">Pendentes</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{approvedReviews.length}</p>
              <p className="text-sm text-muted-foreground">Aprovadas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="w-4 h-4" />
            Pendentes
            {pendingReviews.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {pendingReviews.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-2">
            <CheckCircle className="w-4 h-4" />
            Aprovadas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 space-y-3">
          {pendingReviews.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Clock className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="font-medium text-foreground mb-1">
                  Nenhuma avaliação pendente
                </h3>
                <p className="text-sm text-muted-foreground">
                  Novas avaliações dos clientes aparecerão aqui para aprovação
                </p>
              </CardContent>
            </Card>
          ) : (
            pendingReviews.map(review => (
              <ReviewCard key={review.id} review={review} />
            ))
          )}
        </TabsContent>

        <TabsContent value="approved" className="mt-4 space-y-3">
          {approvedReviews.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="font-medium text-foreground mb-1">
                  Nenhuma avaliação aprovada
                </h3>
                <p className="text-sm text-muted-foreground">
                  Avaliações aprovadas serão exibidas no seu cardápio público
                </p>
              </CardContent>
            </Card>
          ) : (
            approvedReviews.map(review => (
              <ReviewCard key={review.id} review={review} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}