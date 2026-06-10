import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ProductMargin {
  id: string;
  name: string;
  price: number;
  cost_price: number;
  margin: number;
  marginPercent: number;
}

interface ProfitMarginReportProps {
  restaurantId: string;
}

export function ProfitMarginReport({ restaurantId }: ProfitMarginReportProps) {
  const [products, setProducts] = useState<ProductMargin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      const { data, error } = await supabase
        .rpc('get_my_products', { p_restaurant_id: restaurantId });

      const activeData = (data ?? []).filter((p: any) => p.is_active);

      if (!error && activeData) {
        const productsWithMargin = activeData.map((p: any) => {
          const price = Number(p.price) || 0;
          const cost = Number(p.cost_price) || 0;
          const margin = price - cost;
          const marginPercent = price > 0 ? (margin / price) * 100 : 0;

          return {
            id: p.id,
            name: p.name,
            price,
            cost_price: cost,
            margin,
            marginPercent,
          };
        });

        // Sort by margin percent descending
        productsWithMargin.sort((a, b) => b.marginPercent - a.marginPercent);
        setProducts(productsWithMargin);
      }
      setLoading(false);
    }

    loadProducts();
  }, [restaurantId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const avgMargin = products.length > 0
    ? products.reduce((sum, p) => sum + p.marginPercent, 0) / products.length
    : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Margem de Lucro por Produto</CardTitle>
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            Média: {avgMargin.toFixed(1)}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">
            Nenhum produto com preço de custo cadastrado.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Preço Venda</TableHead>
                  <TableHead className="text-right">Preço Custo</TableHead>
                  <TableHead className="text-right">Margem R$</TableHead>
                  <TableHead className="text-right">Margem %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.slice(0, 10).map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-right">
                      R$ {product.price.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      R$ {product.cost_price.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={product.margin >= 0 ? 'text-success' : 'text-destructive'}>
                        R$ {product.margin.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {product.marginPercent >= 30 ? (
                          <TrendingUp className="w-4 h-4 text-success" />
                        ) : product.marginPercent < 15 ? (
                          <TrendingDown className="w-4 h-4 text-destructive" />
                        ) : null}
                        <Badge 
                          variant="secondary"
                          className={
                            product.marginPercent >= 30 
                              ? 'bg-success/10 text-success' 
                              : product.marginPercent < 15
                              ? 'bg-destructive/10 text-destructive'
                              : 'bg-warning/10 text-warning'
                          }
                        >
                          {product.marginPercent.toFixed(1)}%
                        </Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
