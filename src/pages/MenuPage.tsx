import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart, CartProvider } from '@/contexts/CartContext';
import { mockRestaurant, mockCategories, mockProducts } from '@/lib/mockData';
import { Product, ProductVariation, ProductAdditional } from '@/lib/types';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  X, 
  Clock, 
  MapPin, 
  MessageCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

function ProductCard({ product, onAddToCart }: { product: Product; onAddToCart: (product: Product) => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-4 p-4 bg-card rounded-2xl border border-border hover:border-primary/20 hover:shadow-card transition-all duration-300 cursor-pointer"
      onClick={() => onAddToCart(product)}
    >
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-foreground text-lg mb-1">{product.name}</h3>
        <p className="text-muted-foreground text-sm line-clamp-2 mb-3">{product.description}</p>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-primary">
            R$ {product.price.toFixed(2)}
          </span>
          {product.variations && product.variations.length > 0 && (
            <span className="text-xs text-muted-foreground">
              a partir de R$ {Math.min(...product.variations.map(v => v.price)).toFixed(2)}
            </span>
          )}
        </div>
      </div>
      <div className="relative w-24 h-24 rounded-xl bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
        {product.image ? (
          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-4xl">🍕</span>
        )}
        <div className="absolute bottom-1 right-1 w-8 h-8 rounded-full gradient-primary flex items-center justify-center shadow-glow">
          <Plus className="w-5 h-5 text-primary-foreground" />
        </div>
      </div>
    </motion.div>
  );
}

function ProductModal({ 
  product, 
  onClose, 
  onAdd 
}: { 
  product: Product; 
  onClose: () => void; 
  onAdd: (product: Product, qty: number, variation?: ProductVariation, additionals?: ProductAdditional[], obs?: string) => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const [selectedVariation, setSelectedVariation] = useState<ProductVariation | undefined>(
    product.variations?.[0]
  );
  const [selectedAdditionals, setSelectedAdditionals] = useState<ProductAdditional[]>([]);
  const [observation, setObservation] = useState('');

  const toggleAdditional = (add: ProductAdditional) => {
    setSelectedAdditionals((prev) =>
      prev.find((a) => a.id === add.id)
        ? prev.filter((a) => a.id !== add.id)
        : [...prev, add]
    );
  };

  const basePrice = selectedVariation?.price ?? product.price;
  const additionalsTotal = selectedAdditionals.reduce((sum, a) => sum + a.price, 0);
  const total = (basePrice + additionalsTotal) * quantity;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-foreground/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-card rounded-t-3xl md:rounded-3xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Image */}
        <div className="relative h-48 bg-muted flex items-center justify-center">
          {product.image ? (
            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-8xl">🍕</span>
          )}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-foreground/20 backdrop-blur-sm flex items-center justify-center text-background hover:bg-foreground/30 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{product.name}</h2>
            <p className="text-muted-foreground mt-1">{product.description}</p>
          </div>

          {/* Variations */}
          {product.variations && product.variations.length > 0 && (
            <div>
              <h3 className="font-semibold text-foreground mb-3">Tamanho</h3>
              <div className="space-y-2">
                {product.variations.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariation(v)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                      selectedVariation?.id === v.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/30'
                    }`}
                  >
                    <span className="font-medium text-foreground">{v.name}</span>
                    <span className="font-semibold text-primary">R$ {v.price.toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Additionals */}
          {product.additionals && product.additionals.length > 0 && (
            <div>
              <h3 className="font-semibold text-foreground mb-3">Adicionais</h3>
              <div className="space-y-2">
                {product.additionals.map((add) => (
                  <button
                    key={add.id}
                    onClick={() => toggleAdditional(add)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                      selectedAdditionals.find((a) => a.id === add.id)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/30'
                    }`}
                  >
                    <span className="font-medium text-foreground">{add.name}</span>
                    <span className="font-semibold text-success">+ R$ {add.price.toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Observation */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">Alguma observação?</h3>
            <textarea
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Ex: Tirar cebola, bem passada..."
              className="w-full p-4 rounded-xl border-2 border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none resize-none"
              rows={2}
            />
          </div>

          {/* Quantity & Add */}
          <div className="flex items-center gap-4 pt-4 border-t border-border">
            <div className="flex items-center gap-3 bg-secondary rounded-xl p-1">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 rounded-lg flex items-center justify-center text-foreground hover:bg-muted transition-colors"
              >
                <Minus className="w-5 h-5" />
              </button>
              <span className="w-8 text-center font-bold text-foreground text-lg">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-10 h-10 rounded-lg flex items-center justify-center text-foreground hover:bg-muted transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <Button
              variant="hero"
              size="lg"
              className="flex-1"
              onClick={() => {
                onAdd(product, quantity, selectedVariation, selectedAdditionals, observation);
                onClose();
              }}
            >
              Adicionar • R$ {total.toFixed(2)}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function CartSheet({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
}) {
  const { items, total, removeItem, updateQuantity, getWhatsAppMessage, clearCart } = useCart();
  const [address, setAddress] = useState('');

  const handleSendWhatsApp = () => {
    const message = getWhatsAppMessage(address);
    window.open(`https://wa.me/${mockRestaurant.whatsapp}?text=${message}`, '_blank');
    clearCart();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-foreground/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute right-0 top-0 h-full w-full max-w-md bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-xl font-bold text-foreground">Seu Pedido</h2>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 h-[calc(100vh-200px)]">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <ShoppingCart className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Carrinho vazio</h3>
                  <p className="text-muted-foreground">Adicione itens do cardápio</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.id} className="p-4 bg-secondary rounded-xl">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground">{item.product.name}</h4>
                          {item.selectedVariation && (
                            <p className="text-sm text-muted-foreground">{item.selectedVariation.name}</p>
                          )}
                          {item.selectedAdditionals.map((add) => (
                            <p key={add.id} className="text-sm text-success">+ {add.name}</p>
                          ))}
                          {item.observation && (
                            <p className="text-sm text-muted-foreground italic">📝 {item.observation}</p>
                          )}
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-destructive hover:text-destructive/80 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 bg-background rounded-lg p-1">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-8 h-8 rounded flex items-center justify-center text-foreground hover:bg-muted"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-6 text-center font-semibold text-foreground">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-8 h-8 rounded flex items-center justify-center text-foreground hover:bg-muted"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <span className="font-bold text-primary">R$ {item.subtotal.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}

                  {/* Address */}
                  <div className="pt-4">
                    <h3 className="font-semibold text-foreground mb-2">Endereço de entrega</h3>
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Rua, número, bairro, complemento..."
                      className="w-full p-3 rounded-xl border-2 border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none resize-none"
                      rows={2}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="p-4 border-t border-border bg-card">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-semibold text-foreground">Total</span>
                  <span className="text-2xl font-bold text-primary">R$ {total.toFixed(2)}</span>
                </div>
                <Button variant="whatsapp" size="xl" className="w-full" onClick={handleSendWhatsApp}>
                  <MessageCircle className="w-5 h-5" />
                  Enviar pedido via WhatsApp
                </Button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MenuPageContent() {
  const { addItem, itemCount, total } = useCart();
  const [activeCategory, setActiveCategory] = useState(mockCategories[0]?.id);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);

  const productsByCategory = useMemo(() => {
    const grouped: Record<string, Product[]> = {};
    mockCategories.forEach((cat) => {
      grouped[cat.id] = mockProducts.filter((p) => p.categoryId === cat.id && p.isActive);
    });
    return grouped;
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="gradient-primary">
        <div className="container py-8">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-background/20 flex items-center justify-center text-4xl backdrop-blur-sm">
              🍕
            </div>
            <div>
              <h1 className="text-2xl font-bold text-primary-foreground">{mockRestaurant.name}</h1>
              <p className="text-primary-foreground/80 text-sm mt-1">{mockRestaurant.description}</p>
              <div className="flex items-center gap-4 mt-2 text-sm text-primary-foreground/70">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {mockRestaurant.openingHours}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {mockRestaurant.address?.split('-')[0]}
                </span>
              </div>
            </div>
          </div>
          {mockRestaurant.isOpen ? (
            <Badge variant="secondary" className="mt-4 bg-success/20 text-success border-success/30">
              ● Aberto agora
            </Badge>
          ) : (
            <Badge variant="secondary" className="mt-4 bg-destructive/20 text-destructive border-destructive/30">
              ● Fechado
            </Badge>
          )}
        </div>
      </div>

      {/* Categories */}
      <div className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="container">
          <div className="flex gap-2 overflow-x-auto py-4 scrollbar-hide">
            {mockCategories.filter((c) => c.isActive).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-5 py-2.5 rounded-full whitespace-nowrap font-medium transition-all ${
                  activeCategory === cat.id
                    ? 'gradient-primary text-primary-foreground shadow-glow'
                    : 'bg-secondary text-secondary-foreground hover:bg-muted'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="container py-6">
        <div className="space-y-8">
          {mockCategories.filter((c) => c.isActive).map((category) => (
            <div key={category.id} id={category.id}>
              <h2 className="text-xl font-bold text-foreground mb-4">{category.name}</h2>
              <div className="space-y-4">
                {productsByCategory[category.id]?.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={setSelectedProduct}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Product Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <ProductModal
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
            onAdd={addItem}
          />
        )}
      </AnimatePresence>

      {/* Cart Sheet */}
      <CartSheet isOpen={cartOpen} onClose={() => setCartOpen(false)} />

      {/* Floating Cart Button */}
      {itemCount > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent"
        >
          <Button
            variant="hero"
            size="xl"
            className="w-full max-w-lg mx-auto flex justify-between"
            onClick={() => setCartOpen(true)}
          >
            <span className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Ver Carrinho
              <Badge className="bg-primary-foreground/20 text-primary-foreground border-0">
                {itemCount}
              </Badge>
            </span>
            <span className="font-bold">R$ {total.toFixed(2)}</span>
          </Button>
        </motion.div>
      )}
    </div>
  );
}

export default function MenuPage() {
  return (
    <CartProvider>
      <MenuPageContent />
    </CartProvider>
  );
}
