import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Plus, 
  Search,
  Edit2, 
  Trash2, 
  ToggleLeft, 
  ToggleRight,
  Package,
  Loader2,
  LayoutGrid,
  List
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurant } from '@/hooks/useRestaurant';
import { useToast } from '@/hooks/use-toast';
import ProductFormDialog from '@/components/admin/ProductFormDialog';
import type { Tables } from '@/integrations/supabase/types';

type Product = Tables<'products'>;
type Category = Tables<'categories'>;
type ViewMode = 'grid' | 'compact' | 'list';

export default function ProductsPage() {
  const { restaurant, loading: loadingRestaurant } = useRestaurant();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  useEffect(() => {
    if (restaurant) {
      loadData();
    }
  }, [restaurant]);

  const loadData = async () => {
    if (!restaurant) return;

    setLoading(true);
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .eq('restaurant_id', restaurant.id)
          .order('name'),
        supabase
          .from('categories')
          .select('*')
          .eq('restaurant_id', restaurant.id)
          .order('display_order'),
      ]);

      if (productsRes.error) throw productsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;

      setProducts(productsRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleProduct = async (product: Product) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !product.is_active })
        .eq('id', product.id);

      if (error) throw error;

      setProducts(prev =>
        prev.map(p =>
          p.id === product.id ? { ...p, is_active: !p.is_active } : p
        )
      );
    } catch (error) {
      console.error('Error toggling product:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o produto.',
        variant: 'destructive',
      });
    }
  };

  const deleteProduct = async (product: Product) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id);

      if (error) throw error;

      setProducts(prev => prev.filter(p => p.id !== product.id));
      toast({
        title: 'Produto excluído',
        description: 'O produto foi removido do cardápio.',
      });
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o produto.',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingProduct(null);
    setDialogOpen(true);
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || product.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || 'Sem categoria';
  };

  if (loadingRestaurant || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Produtos</h1>
          <p className="text-muted-foreground mt-1">Gerencie os itens do seu cardápio</p>
        </div>
        <Button variant="hero" onClick={openNewDialog}>
          <Plus className="w-4 h-4" />
          Novo Produto
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Buscar produto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          <Button
            variant={selectedCategory === null ? 'default' : 'secondary'}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            Todos
          </Button>
          {categories.map(cat => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.name}
            </Button>
          ))}
        </div>
        
        {/* View Mode Toggle */}
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className="h-8 w-8 p-0"
            title="Visualização em grade"
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'compact' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('compact')}
            className="h-8 w-8 p-0"
            title="Visualização compacta"
          >
            <Package className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="h-8 w-8 p-0"
            title="Visualização em lista"
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Products Grid View */}
      {viewMode === 'grid' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card className="border-border hover:border-primary/20 transition-colors overflow-hidden">
                <div className="aspect-video bg-muted flex items-center justify-center">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-6xl">🍕</span>
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">{product.name}</h3>
                      <Badge 
                        variant="secondary"
                        className={product.is_active 
                          ? 'bg-success/20 text-success border-0' 
                          : 'bg-muted text-muted-foreground border-0'
                        }
                      >
                        {product.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {product.description || 'Sem descrição'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
                      {getCategoryName(product.category_id)}
                    </Badge>
                    <span className="font-bold text-primary text-lg">
                      R$ {Number(product.price).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="flex-1" onClick={() => toggleProduct(product)}>
                      {product.is_active ? (
                        <><ToggleRight className="w-4 h-4 text-success mr-1" />Ativo</>
                      ) : (
                        <><ToggleLeft className="w-4 h-4 text-muted-foreground mr-1" />Inativo</>
                      )}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(product)}>
                      <Edit2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteProduct(product)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Products Compact View */}
      {viewMode === 'compact' && (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filteredProducts.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: index * 0.02 }}
            >
              <Card className="border-border hover:border-primary/20 transition-colors overflow-hidden cursor-pointer group" onClick={() => openEditDialog(product)}>
                <div className="aspect-square bg-muted flex items-center justify-center relative">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl">🍕</span>
                  )}
                  <Badge 
                    className={`absolute top-2 right-2 text-xs ${product.is_active 
                      ? 'bg-success/90 text-white' 
                      : 'bg-muted-foreground/90 text-white'
                    }`}
                  >
                    {product.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                <CardContent className="p-3">
                  <h3 className="font-medium text-sm text-foreground line-clamp-1">{product.name}</h3>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground line-clamp-1">{getCategoryName(product.category_id)}</span>
                    <span className="font-bold text-primary text-sm">R$ {Number(product.price).toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Products List View */}
      {viewMode === 'list' && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">Foto</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Preço</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right w-[150px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id} className="group">
                  <TableCell>
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl">🍕</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground">{product.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{product.description || 'Sem descrição'}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
                      {getCategoryName(product.category_id)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-bold text-primary">
                    R$ {Number(product.price).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge 
                      variant="secondary"
                      className={product.is_active 
                        ? 'bg-success/20 text-success border-0' 
                        : 'bg-muted text-muted-foreground border-0'
                      }
                    >
                      {product.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => toggleProduct(product)} title={product.is_active ? 'Desativar' : 'Ativar'}>
                        {product.is_active ? (
                          <ToggleRight className="w-4 h-4 text-success" />
                        ) : (
                          <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                        )}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(product)}>
                        <Edit2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteProduct(product)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Empty State */}
      {filteredProducts.length === 0 && !loading && (
        <Card className="border-dashed border-2 border-border">
          <CardContent className="p-12 text-center">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum produto encontrado</h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery || selectedCategory 
                ? 'Tente ajustar os filtros de busca' 
                : 'Adicione seu primeiro produto ao cardápio'
              }
            </p>
            {!searchQuery && !selectedCategory && (
              <Button variant="hero" onClick={openNewDialog}>
                <Plus className="w-4 h-4" />
                Criar Produto
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Product Form Dialog */}
      <ProductFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={editingProduct}
        onSuccess={loadData}
      />
    </div>
  );
}