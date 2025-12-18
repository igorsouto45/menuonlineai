import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GripVertical, Star, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Product = Tables<'products'>;

interface SortableProductProps {
  product: Product;
  onRemove: (product: Product) => void;
}

function SortableProduct({ product, onRemove }: SortableProductProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="w-5 h-5" />
      </button>
      
      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-xl">🍕</span>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{product.name}</p>
        <p className="text-sm text-muted-foreground">R$ {Number(product.price).toFixed(2)}</p>
      </div>
      
      <Badge className="bg-yellow-500/20 text-yellow-600 border-0">
        <Star className="w-3 h-3 mr-1 fill-current" />
        Destaque
      </Badge>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRemove(product)}
        title="Remover destaque"
      >
        <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
      </Button>
    </div>
  );
}

interface FeaturedProductsManagerProps {
  products: Product[];
  onUpdate: () => void;
}

export function FeaturedProductsManager({ products, onUpdate }: FeaturedProductsManagerProps) {
  const { toast } = useToast();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>(
    products.filter(p => p.is_featured)
  );
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = featuredProducts.findIndex((p) => p.id === active.id);
      const newIndex = featuredProducts.findIndex((p) => p.id === over.id);
      
      const newOrder = arrayMove(featuredProducts, oldIndex, newIndex);
      setFeaturedProducts(newOrder);
      
      // Save order to database (using a custom field or display_order for products)
      // For now, we just update local state - in production you'd want to persist this
    }
  };

  const handleRemoveFeatured = async (product: Product) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_featured: false })
        .eq('id', product.id);

      if (error) throw error;

      setFeaturedProducts(prev => prev.filter(p => p.id !== product.id));
      onUpdate();
      
      toast({
        title: 'Destaque removido',
        description: `${product.name} não aparecerá mais nos destaques.`,
      });
    } catch (error) {
      console.error('Error removing featured:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o destaque.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (featuredProducts.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Star className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-muted-foreground">
          Nenhum produto em destaque. Marque produtos como destaque na lista de produtos.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <GripVertical className="w-4 h-4" />
        <span>Arraste para reordenar os destaques</span>
      </div>
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={featuredProducts.map(p => p.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {featuredProducts.map((product) => (
              <SortableProduct
                key={product.id}
                product={product}
                onRemove={handleRemoveFeatured}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
