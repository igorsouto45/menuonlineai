import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  GripVertical, 
  Edit2, 
  Trash2, 
  ToggleLeft, 
  ToggleRight,
  FolderOpen
} from 'lucide-react';
import { mockCategories } from '@/lib/mockData';

export default function CategoriesPage() {
  const [categories, setCategories] = useState(mockCategories);

  const toggleCategory = (id: string) => {
    setCategories(prev =>
      prev.map(cat =>
        cat.id === id ? { ...cat, isActive: !cat.isActive } : cat
      )
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Categorias</h1>
          <p className="text-muted-foreground mt-1">Organize seu cardápio em categorias</p>
        </div>
        <Button variant="hero">
          <Plus className="w-4 h-4" />
          Nova Categoria
        </Button>
      </div>

      {/* Categories List */}
      <div className="space-y-4">
        {categories.map((category, index) => (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <Card className="border-border hover:border-primary/20 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Drag Handle */}
                  <button className="cursor-grab text-muted-foreground hover:text-foreground transition-colors">
                    <GripVertical className="w-5 h-5" />
                  </button>

                  {/* Icon */}
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <FolderOpen className="w-6 h-6" />
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{category.name}</h3>
                      <Badge 
                        variant="secondary"
                        className={category.isActive 
                          ? 'bg-success/20 text-success border-0' 
                          : 'bg-muted text-muted-foreground border-0'
                        }
                      >
                        {category.isActive ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {category.description || 'Sem descrição'}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => toggleCategory(category.id)}
                    >
                      {category.isActive ? (
                        <ToggleRight className="w-5 h-5 text-success" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                      )}
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Edit2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {categories.length === 0 && (
        <Card className="border-dashed border-2 border-border">
          <CardContent className="p-12 text-center">
            <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma categoria</h3>
            <p className="text-muted-foreground mb-6">Crie sua primeira categoria para organizar o cardápio</p>
            <Button variant="hero">
              <Plus className="w-4 h-4" />
              Criar Categoria
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
