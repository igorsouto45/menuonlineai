import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurant } from '@/hooks/useRestaurant';
import { useToast } from '@/hooks/use-toast';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Loader2, Plus, Trash2, Lock, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';
import ImageUpload from './ImageUpload';
import MultiImageUpload from './MultiImageUpload';
import type { Tables } from '@/integrations/supabase/types';

type Product = Tables<'products'>;
type Category = Tables<'categories'>;

interface ImageItem {
  id?: string;
  url: string;
  display_order: number;
}

const productSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.string().optional(),
  price: z.number().min(0.01, 'Preço deve ser maior que zero'),
  cost_price: z.number().min(0, 'Preço de custo não pode ser negativo').optional(),
  category_id: z.string().min(1, 'Selecione uma categoria'),
  is_active: z.boolean(),
  current_stock: z.number().nullable().optional(),
  min_stock: z.number().nullable().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  onSuccess: () => void;
}

interface Variation {
  id?: string;
  name: string;
  price: number;
}

interface Additional {
  id?: string;
  name: string;
  price: number;
}

export default function ProductFormDialog({
  open,
  onOpenChange,
  product,
  onSuccess,
}: ProductFormDialogProps) {
  const { restaurant } = useRestaurant();
  const { toast } = useToast();
  const { canUseVariations, canUseAdditionals } = usePlanLimits();
  const [saving, setSaving] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [additionalImages, setAdditionalImages] = useState<ImageItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [additionals, setAdditionals] = useState<Additional[]>([]);

  const isEditing = !!product;

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      cost_price: 0,
      category_id: '',
      is_active: true,
      current_stock: null,
      min_stock: null,
    },
  });

  useEffect(() => {
    if (restaurant) {
      loadCategories();
    }
  }, [restaurant]);

  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name,
        description: product.description || '',
        price: Number(product.price),
        cost_price: Number(product.cost_price) || 0,
        category_id: product.category_id,
        is_active: product.is_active ?? true,
        current_stock: product.current_stock ?? null,
        min_stock: product.min_stock ?? null,
      });
      setImageUrl(product.image_url);
      loadAdditionalImages(product.id);
      loadVariationsAndAdditionals(product.id);
    } else {
      form.reset({
        name: '',
        description: '',
        price: 0,
        cost_price: 0,
        category_id: '',
        is_active: true,
        current_stock: null,
        min_stock: null,
      });
      setImageUrl(null);
      setAdditionalImages([]);
      setVariations([]);
      setAdditionals([]);
    }
  }, [product, form, open]);

  const loadVariationsAndAdditionals = async (productId: string) => {
    const [variationsRes, additionalsRes] = await Promise.all([
      supabase.from('product_variations').select('*').eq('product_id', productId),
      supabase.from('product_additionals').select('*').eq('product_id', productId),
    ]);
    
    if (variationsRes.data) {
      setVariations(variationsRes.data.map(v => ({ id: v.id, name: v.name, price: Number(v.price) })));
    }
    if (additionalsRes.data) {
      setAdditionals(additionalsRes.data.map(a => ({ id: a.id, name: a.name, price: Number(a.price) })));
    }
  };

  const loadAdditionalImages = async (productId: string) => {
    const { data } = await supabase
      .from('product_images')
      .select('*')
      .eq('product_id', productId)
      .order('display_order');
    
    if (data) {
      setAdditionalImages(data.map(img => ({
        id: img.id,
        url: img.image_url,
        display_order: img.display_order || 0,
      })));
    }
  };

  const loadCategories = async () => {
    if (!restaurant) return;

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  const onSubmit = async (data: ProductFormData) => {
    if (!restaurant) return;

    setSaving(true);
    try {
      const productData = {
        name: data.name,
        description: data.description || null,
        price: data.price,
        cost_price: data.cost_price || 0,
        category_id: data.category_id,
        is_active: data.is_active,
        image_url: imageUrl,
        restaurant_id: restaurant.id,
        current_stock: data.current_stock ?? null,
        min_stock: data.min_stock ?? null,
      };

      let productId = product?.id;

      if (isEditing && product) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', product.id);

        if (error) throw error;
      } else {
        const { data: newProduct, error } = await supabase
          .from('products')
          .insert([productData])
          .select()
          .single();

        if (error) throw error;
        productId = newProduct.id;
      }

      // Save additional images
      if (productId) {
        // Delete removed images
        if (isEditing) {
          const existingIds = additionalImages.filter(img => img.id).map(img => img.id);
          if (existingIds.length > 0) {
            await supabase
              .from('product_images')
              .delete()
              .eq('product_id', productId)
              .not('id', 'in', `(${existingIds.join(',')})`);
          } else {
            await supabase
              .from('product_images')
              .delete()
              .eq('product_id', productId);
          }
        }

        // Upsert images
        for (const img of additionalImages) {
          if (img.id) {
            await supabase
              .from('product_images')
              .update({ display_order: img.display_order })
              .eq('id', img.id);
          } else {
            await supabase
              .from('product_images')
              .insert({
                product_id: productId,
                image_url: img.url,
                display_order: img.display_order,
              });
          }
        }

        // Save variations if allowed
        if (canUseVariations()) {
          // Delete old variations
          await supabase.from('product_variations').delete().eq('product_id', productId);
          // Insert new variations
          if (variations.length > 0) {
            await supabase.from('product_variations').insert(
              variations.map(v => ({ product_id: productId, name: v.name, price: v.price }))
            );
          }
        }

        // Save additionals if allowed
        if (canUseAdditionals()) {
          // Delete old additionals
          await supabase.from('product_additionals').delete().eq('product_id', productId);
          // Insert new additionals
          if (additionals.length > 0) {
            await supabase.from('product_additionals').insert(
              additionals.map(a => ({ product_id: productId, name: a.name, price: a.price }))
            );
          }
        }
      }

      toast({
        title: isEditing ? 'Produto atualizado!' : 'Produto criado!',
        description: isEditing ? 'As alterações foram salvas.' : 'O produto foi adicionado ao cardápio.',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving product:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar o produto.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Produto' : 'Novo Produto'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize as informações do produto'
              : 'Preencha as informações do novo produto'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Main Image */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Imagem principal</label>
              <ImageUpload
                value={imageUrl}
                onChange={setImageUrl}
                folder="products"
                aspectRatio="video"
              />
            </div>

            {/* Additional Images */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Imagens adicionais (galeria)</label>
              <MultiImageUpload
                images={additionalImages}
                onChange={setAdditionalImages}
                folder="products"
                maxImages={5}
              />
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do produto</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Pizza Margherita" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descrição do produto..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço de Venda (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cost_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço de Custo (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        {...field}
                        value={field.value ?? 0}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {loadingCategories ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="w-4 h-4 animate-spin" />
                        </div>
                      ) : categories.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          Nenhuma categoria encontrada
                        </div>
                      ) : (
                        categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Stock fields */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="current_stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estoque atual</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="Opcional"
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val === '' ? null : parseInt(val, 10));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="min_stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estoque mínimo</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="Opcional"
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val === '' ? null : parseInt(val, 10));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Variations Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Variações (ex: tamanhos)</label>
                {!canUseVariations() && (
                  <Link to="/precos" className="text-xs text-primary flex items-center gap-1 hover:underline">
                    <Crown className="w-3 h-3" /> Upgrade
                  </Link>
                )}
              </div>
              {canUseVariations() ? (
                <div className="space-y-2">
                  {variations.map((variation, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder="Nome (ex: Grande)"
                        value={variation.name}
                        onChange={(e) => {
                          const updated = [...variations];
                          updated[index].name = e.target.value;
                          setVariations(updated);
                        }}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Preço"
                        value={variation.price || ''}
                        onChange={(e) => {
                          const updated = [...variations];
                          updated[index].price = parseFloat(e.target.value) || 0;
                          setVariations(updated);
                        }}
                        className="w-24"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setVariations(variations.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setVariations([...variations, { name: '', price: 0 }])}
                  >
                    <Plus className="w-4 h-4 mr-1" /> Adicionar variação
                  </Button>
                </div>
              ) : (
                <Card className="p-4 bg-muted/50 border-dashed">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Lock className="w-5 h-5" />
                    <div>
                      <p className="text-sm font-medium">Variações bloqueadas</p>
                      <p className="text-xs">Faça upgrade para o plano Pro para adicionar variações</p>
                    </div>
                  </div>
                </Card>
              )}
            </div>

            {/* Additionals Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Adicionais (ex: ingredientes extras)</label>
                {!canUseAdditionals() && (
                  <Link to="/precos" className="text-xs text-primary flex items-center gap-1 hover:underline">
                    <Crown className="w-3 h-3" /> Upgrade
                  </Link>
                )}
              </div>
              {canUseAdditionals() ? (
                <div className="space-y-2">
                  {additionals.map((additional, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder="Nome (ex: Bacon)"
                        value={additional.name}
                        onChange={(e) => {
                          const updated = [...additionals];
                          updated[index].name = e.target.value;
                          setAdditionals(updated);
                        }}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Preço"
                        value={additional.price || ''}
                        onChange={(e) => {
                          const updated = [...additionals];
                          updated[index].price = parseFloat(e.target.value) || 0;
                          setAdditionals(updated);
                        }}
                        className="w-24"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setAdditionals(additionals.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAdditionals([...additionals, { name: '', price: 0 }])}
                  >
                    <Plus className="w-4 h-4 mr-1" /> Adicionar adicional
                  </Button>
                </div>
              ) : (
                <Card className="p-4 bg-muted/50 border-dashed">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Lock className="w-5 h-5" />
                    <div>
                      <p className="text-sm font-medium">Adicionais bloqueados</p>
                      <p className="text-xs">Faça upgrade para o plano Pro para adicionar adicionais</p>
                    </div>
                  </div>
                </Card>
              )}
            </div>

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Produto ativo</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Produto aparece no cardápio público
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="hero" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {isEditing ? 'Salvar Alterações' : 'Criar Produto'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
