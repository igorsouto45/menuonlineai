import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Search,
  Edit2, 
  Trash2, 
  ToggleLeft, 
  ToggleRight,
  Package,
  Filter
} from 'lucide-react';
import { mockProducts, mockCategories } from '@/lib/mockData';

export default function ProductsPage() {
  const [products, setProducts] = useState(mockProducts);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const toggleProduct = (id: string) => {
    setProducts(prev =>
      prev.map(prod =>
        prod.id === id ? { ...prod, isActive: !prod.isActive } : prod
      )
    );
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || product.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryName = (categoryId: string) => {
    return mockCategories.find(c => c.id === categoryId)?.name || 'Sem categoria';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Produtos</h1>
          <p className="text-muted-foreground mt-1">Gerencie os itens do seu cardápio</p>
        </div>
        <Button variant="hero">
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
          {mockCategories.map(cat => (
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
      </div>

      {/* Products Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <Card className="border-border hover:border-primary/20 transition-colors overflow-hidden">
              {/* Image */}
              <div className="aspect-video bg-muted flex items-center justify-center">
                {product.image ? (
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-6xl">🍕</span>
                )}
              </div>
              
              <CardContent className="p-4">
                {/* Info */}
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">{product.name}</h3>
                    <Badge 
                      variant="secondary"
                      className={product.isActive 
                        ? 'bg-success/20 text-success border-0' 
                        : 'bg-muted text-muted-foreground border-0'
                      }
                    >
                      {product.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {product.description || 'Sem descrição'}
                  </p>
                </div>

                {/* Category & Price */}
                <div className="flex items-center justify-between mb-4">
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
                    {getCategoryName(product.categoryId)}
                  </Badge>
                  <span className="font-bold text-primary text-lg">
                    R$ {product.price.toFixed(2)}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="flex-1"
                    onClick={() => toggleProduct(product.id)}
                  >
                    {product.isActive ? (
                      <>
                        <ToggleRight className="w-4 h-4 text-success mr-1" />
                        Ativo
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-4 h-4 text-muted-foreground mr-1" />
                        Inativo
                      </>
                    )}
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Edit2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {filteredProducts.length === 0 && (
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
              <Button variant="hero">
                <Plus className="w-4 h-4" />
                Criar Produto
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
