import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Plus, Minus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FloatingCartProps {
  onOpenFullCart: () => void;
}

export function FloatingCart({ onOpenFullCart }: FloatingCartProps) {
  const { items, total, itemCount, updateQuantity, removeItem } = useCart();

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border shadow-2xl"
    >
      {/* Mini Cart Summary */}
      {itemCount > 0 && (
        <div className="px-4 py-2 border-b border-border bg-muted/30">
          <ScrollArea className="max-h-32">
            <div className="space-y-2">
              {items.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex-1 min-w-0">
                    <span className="truncate block font-medium text-foreground">
                      {item.quantity}x {item.product.name}
                    </span>
                    {item.selectedVariation && (
                      <span className="text-xs text-muted-foreground">{item.selectedVariation.name}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (item.quantity === 1) {
                          removeItem(item.id);
                        } else {
                          updateQuantity(item.id, item.quantity - 1);
                        }
                      }}
                      className="w-6 h-6 rounded-full bg-muted flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      {item.quantity === 1 ? <Trash2 className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                    </button>
                    <span className="w-5 text-center text-xs font-medium">{item.quantity}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateQuantity(item.id, item.quantity + 1);
                      }}
                      className="w-6 h-6 rounded-full bg-muted flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
              {items.length > 3 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{items.length - 3} item(s) no carrinho
                </p>
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Cart Button */}
      <div className="p-3 sm:p-4">
        {itemCount > 0 ? (
          <Button
            variant="hero"
            size="lg"
            className="w-full h-14 text-base"
            onClick={onOpenFullCart}
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="flex-1 text-left">Finalizar pedido ({itemCount})</span>
            <span className="font-bold">R$ {total.toFixed(2)}</span>
          </Button>
        ) : (
          <div className="flex items-center justify-center gap-2 h-14 text-muted-foreground">
            <ShoppingCart className="w-5 h-5" />
            <span>Carrinho vazio</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
