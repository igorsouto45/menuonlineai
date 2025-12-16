import { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart, CartProvider, DeliveryMode } from '@/contexts/CartContext';
import { supabase } from '@/integrations/supabase/client';
import { ProductSearch } from '@/components/menu/ProductSearch';
import { ProductImageCarousel } from '@/components/menu/ProductImageCarousel';
import { ProductReviews } from '@/components/menu/ProductReviews';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  X, 
  Clock, 
  MapPin, 
  MessageCircle,
  Loader2,
  Package,
  Truck
} from 'lucide-react';

interface DeliveryArea {
  id: string;
  name: string;
  fee: number;
  is_active: boolean;
}

interface Restaurant {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  whatsapp: string;
  address: string | null;
  opening_hours: string | null;
  is_open: boolean;
  primary_color: string | null;
  secondary_color: string | null;
  delivery_fee: number | null;
  free_delivery_minimum: number | null;
  pickup_enabled: boolean | null;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  display_order: number;
}

interface ProductVariation {
  id: string;
  name: string;
  price: number;
}

interface ProductAdditional {
  id: string;
  name: string;
  price: number;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category_id: string;
  is_active: boolean;
  variations?: ProductVariation[];
  additionals?: ProductAdditional[];
}

function ProductCard({ product, onAddToCart }: { product: Product; onAddToCart: (product: Product) => void }) {
  return (
    <motion.div
      layout
      whileHover={{ scale: 1.01, y: -2 }}
      whileTap={{ scale: 0.99 }}
      className="group flex gap-4 p-4 bg-card rounded-2xl border border-border hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 cursor-pointer"
      onClick={() => onAddToCart(product)}
    >
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-foreground text-lg mb-1 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          <p className="text-muted-foreground text-sm line-clamp-2">{product.description}</p>
        </div>
        <div className="flex items-center gap-2 mt-3">
          {product.variations && product.variations.length > 0 ? (
            <span className="text-sm text-muted-foreground">
              a partir de{' '}
              <span className="text-xl font-bold text-primary">
                R$ {Math.min(...product.variations.map(v => v.price)).toFixed(2)}
              </span>
            </span>
          ) : (
            <span className="text-xl font-bold text-primary">
              R$ {product.price.toFixed(2)}
            </span>
          )}
        </div>
      </div>
      <div className="relative w-28 h-28 rounded-xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner">
        {product.image_url ? (
          <img 
            src={product.image_url} 
            alt={product.name} 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
          />
        ) : (
          <span className="text-4xl">🍕</span>
        )}
        <motion.div 
          initial={{ scale: 0.8, opacity: 0.8 }}
          whileHover={{ scale: 1.1, opacity: 1 }}
          className="absolute bottom-2 right-2 w-9 h-9 rounded-full gradient-primary flex items-center justify-center shadow-lg shadow-primary/40"
        >
          <Plus className="w-5 h-5 text-primary-foreground" />
        </motion.div>
      </div>
    </motion.div>
  );
}

function ProductModal({ 
  product, 
  restaurantId,
  onClose, 
  onAdd 
}: { 
  product: Product; 
  restaurantId: string;
  onClose: () => void; 
  onAdd: (product: Product, qty: number, variation?: ProductVariation, additionals?: ProductAdditional[], obs?: string) => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const [selectedVariation, setSelectedVariation] = useState<ProductVariation | undefined>(
    product.variations?.[0]
  );
  const [selectedAdditionals, setSelectedAdditionals] = useState<ProductAdditional[]>([]);
  const [observation, setObservation] = useState('');
  const [imageZoomed, setImageZoomed] = useState(false);

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
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-foreground/60 backdrop-blur-md p-0 md:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="w-full max-w-lg max-h-[95vh] overflow-hidden bg-card rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Enhanced Image Section with Carousel */}
        <div 
          className={`relative bg-gradient-to-b from-muted to-muted/50 overflow-hidden transition-all duration-500 ${
            imageZoomed ? 'h-80 md:h-96' : 'h-56 md:h-64'
          }`}
        >
          <ProductImageCarousel
            productId={product.id}
            mainImageUrl={product.image_url}
            productName={product.name}
            zoomed={imageZoomed}
            onToggleZoom={() => setImageZoomed(!imageZoomed)}
          />
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-transparent to-transparent pointer-events-none" />
          
          {/* Close button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-foreground hover:bg-background transition-colors shadow-lg z-10"
          >
            <X className="w-5 h-5" />
          </button>
          
          {/* Price badge */}
          <div className="absolute bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-full font-bold shadow-lg z-10">
            R$ {product.price.toFixed(2)}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Product Info */}
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">{product.name}</h2>
            {product.description && (
              <p className="text-muted-foreground leading-relaxed">{product.description}</p>
            )}
          </div>

          {/* Variations */}
          {product.variations && product.variations.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">Escolha o tamanho</h3>
                <Badge variant="secondary" className="text-xs">Obrigatório</Badge>
              </div>
              <div className="grid gap-2">
                {product.variations.map((v) => (
                  <motion.button
                    key={v.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedVariation(v)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                      selectedVariation?.id === v.id
                        ? 'border-primary bg-primary/10 shadow-md'
                        : 'border-border hover:border-primary/40 hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        selectedVariation?.id === v.id ? 'border-primary bg-primary' : 'border-muted-foreground'
                      }`}>
                        {selectedVariation?.id === v.id && (
                          <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-2 h-2 rounded-full bg-primary-foreground"
                          />
                        )}
                      </div>
                      <span className="font-medium text-foreground">{v.name}</span>
                    </div>
                    <span className="font-bold text-primary">R$ {v.price.toFixed(2)}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* Additionals */}
          {product.additionals && product.additionals.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">Adicionais</h3>
                <Badge variant="outline" className="text-xs">Opcional</Badge>
              </div>
              <div className="grid gap-2">
                {product.additionals.map((add) => {
                  const isSelected = selectedAdditionals.find((a) => a.id === add.id);
                  return (
                    <motion.button
                      key={add.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => toggleAdditional(add)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/10 shadow-md'
                          : 'border-border hover:border-primary/40 hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                          isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'
                        }`}>
                          {isSelected && (
                            <motion.svg 
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-3 h-3 text-primary-foreground" 
                              fill="none" 
                              viewBox="0 0 24 24" 
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </motion.svg>
                          )}
                        </div>
                        <span className="font-medium text-foreground">{add.name}</span>
                      </div>
                      <span className="font-semibold text-emerald-600">+ R$ {add.price.toFixed(2)}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Observation */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Alguma observação?</h3>
            <textarea
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Ex: Tirar cebola, bem passada, sem pimenta..."
              className="w-full p-4 rounded-xl border-2 border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none resize-none transition-colors"
              rows={2}
            />
          </div>

          {/* Reviews */}
          <ProductReviews productId={product.id} restaurantId={restaurantId} />
        </div>

        {/* Fixed Footer */}
        <div className="p-4 border-t border-border bg-card/95 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-secondary rounded-xl p-1">
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
              className="flex-1 h-12"
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
  onClose,
  whatsapp,
  deliveryFee,
  freeDeliveryMinimum,
  pickupEnabled,
  deliveryAreas
}: { 
  isOpen: boolean; 
  onClose: () => void;
  whatsapp: string;
  deliveryFee: number;
  freeDeliveryMinimum: number | null;
  pickupEnabled: boolean;
  deliveryAreas: DeliveryArea[];
}) {
  const { items, total, removeItem, updateQuantity, getWhatsAppMessage, clearCart, calculateDeliveryFee, getGrandTotal } = useCart();
  const [address, setAddress] = useState('');
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>(pickupEnabled ? 'pickup' : 'delivery');
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(deliveryAreas.length > 0 ? deliveryAreas[0].id : null);

  const selectedArea = deliveryAreas.find(a => a.id === selectedAreaId) || null;
  
  const deliveryInfo = { 
    mode: deliveryMode,
    deliveryFee, 
    freeDeliveryMinimum,
    selectedArea: deliveryMode === 'delivery' ? selectedArea : null
  };
  const actualDeliveryFee = calculateDeliveryFee(deliveryInfo);
  const grandTotal = getGrandTotal(deliveryInfo);
  const hasFreeDelivery = deliveryMode === 'delivery' && deliveryFee > 0 && actualDeliveryFee === 0;
  const amountForFreeDelivery = freeDeliveryMinimum !== null && deliveryMode === 'delivery' ? freeDeliveryMinimum - total : null;

  const handleSendWhatsApp = () => {
    const message = getWhatsAppMessage(deliveryMode === 'delivery' ? address : undefined, deliveryInfo);
    const formattedWhatsapp = whatsapp.replace(/\D/g, '');
    window.open(`https://wa.me/55${formattedWhatsapp}?text=${message}`, '_blank');
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
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-xl font-bold text-foreground">Seu Pedido</h2>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-foreground" />
              </button>
            </div>

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

                  {/* Delivery Mode Selection */}
                  <div className="pt-4 space-y-3">
                    <h3 className="font-semibold text-foreground">Como deseja receber?</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {pickupEnabled && (
                        <button
                          onClick={() => setDeliveryMode('pickup')}
                          className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                            deliveryMode === 'pickup'
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-primary/40'
                          }`}
                        >
                          <Package className="w-5 h-5" />
                          <span className="text-sm font-medium">Retirada</span>
                          <span className="text-xs text-muted-foreground">Grátis</span>
                        </button>
                      )}
                      <button
                        onClick={() => setDeliveryMode('delivery')}
                        className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                          deliveryMode === 'delivery'
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/40'
                        } ${!pickupEnabled ? 'col-span-2' : ''}`}
                      >
                        <Truck className="w-5 h-5" />
                        <span className="text-sm font-medium">Entrega</span>
                        {deliveryAreas.length > 0 ? (
                          <span className="text-xs text-muted-foreground">Selecione a área</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {deliveryFee > 0 ? `R$ ${deliveryFee.toFixed(2)}` : 'Grátis'}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Delivery Area Selection */}
                  {deliveryMode === 'delivery' && deliveryAreas.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-foreground text-sm">Selecione sua região</h3>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {deliveryAreas.map((area) => (
                          <button
                            key={area.id}
                            onClick={() => setSelectedAreaId(area.id)}
                            className={`w-full p-3 rounded-xl border-2 transition-all flex justify-between items-center ${
                              selectedAreaId === area.id
                                ? 'border-primary bg-primary/10'
                                : 'border-border hover:border-primary/40'
                            }`}
                          >
                            <span className="font-medium text-sm">{area.name}</span>
                            <span className="text-sm text-primary font-semibold">
                              {area.fee > 0 ? `R$ ${area.fee.toFixed(2)}` : 'Grátis'}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Address input - only for delivery */}
                  {deliveryMode === 'delivery' && (
                    <div className="pt-2">
                      <h3 className="font-semibold text-foreground mb-2">Endereço de entrega</h3>
                      <textarea
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Rua, número, bairro, complemento..."
                        className="w-full p-3 rounded-xl border-2 border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none resize-none"
                        rows={2}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="p-4 border-t border-border bg-card">
                {/* Delivery info */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Subtotal</span>
                    <span>R$ {total.toFixed(2)}</span>
                  </div>
                  
                  {deliveryMode === 'delivery' && (
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>
                        Taxa de entrega
                        {selectedArea && <span className="text-xs ml-1">({selectedArea.name})</span>}
                      </span>
                      {hasFreeDelivery ? (
                        <span className="text-success font-medium">GRÁTIS 🎉</span>
                      ) : actualDeliveryFee === 0 ? (
                        <span className="text-success font-medium">Grátis</span>
                      ) : (
                        <span>R$ {actualDeliveryFee.toFixed(2)}</span>
                      )}
                    </div>
                  )}

                  {deliveryMode === 'pickup' && (
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>Retirada no local</span>
                      <span className="text-success font-medium">Grátis 📦</span>
                    </div>
                  )}
                  
                  {/* Free delivery progress */}
                  {deliveryMode === 'delivery' && freeDeliveryMinimum !== null && !hasFreeDelivery && amountForFreeDelivery !== null && amountForFreeDelivery > 0 && (
                    <div className="p-2 bg-primary/10 rounded-lg text-center">
                      <p className="text-sm text-primary">
                        Faltam <strong>R$ {amountForFreeDelivery.toFixed(2)}</strong> para frete grátis!
                      </p>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center pt-2 border-t border-border">
                    <span className="text-lg font-semibold text-foreground">Total</span>
                    <span className="text-2xl font-bold text-primary">R$ {grandTotal.toFixed(2)}</span>
                  </div>
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
  const { slug } = useParams<{ slug: string }>();
  const { addItem, itemCount, total } = useCart();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [deliveryAreas, setDeliveryAreas] = useState<DeliveryArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadData() {
      if (!slug) {
        setError('Restaurante não encontrado');
        setLoading(false);
        return;
      }

      try {
        // Fetch restaurant
        const { data: restaurantData, error: restaurantError } = await supabase
          .from('restaurants')
          .select('*')
          .eq('slug', slug)
          .maybeSingle();

        if (restaurantError) throw restaurantError;
        if (!restaurantData) {
          setError('Restaurante não encontrado');
          setLoading(false);
          return;
        }

        setRestaurant(restaurantData);

        // Fetch categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('*')
          .eq('restaurant_id', restaurantData.id)
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (categoriesError) throw categoriesError;
        setCategories(categoriesData || []);
        if (categoriesData && categoriesData.length > 0) {
          setActiveCategory(categoriesData[0].id);
        }

        // Fetch delivery areas
        const { data: areasData } = await supabase
          .from('delivery_areas')
          .select('*')
          .eq('restaurant_id', restaurantData.id)
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        setDeliveryAreas(areasData || []);

        // Fetch products with variations and additionals
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .eq('restaurant_id', restaurantData.id)
          .eq('is_active', true);

        if (productsError) throw productsError;

        // Fetch variations and additionals for each product
        const productIds = productsData?.map(p => p.id) || [];
        
        const [variationsRes, additionalsRes] = await Promise.all([
          supabase.from('product_variations').select('*').in('product_id', productIds),
          supabase.from('product_additionals').select('*').in('product_id', productIds)
        ]);

        const variationsMap: Record<string, ProductVariation[]> = {};
        const additionalsMap: Record<string, ProductAdditional[]> = {};

        variationsRes.data?.forEach(v => {
          if (!variationsMap[v.product_id]) variationsMap[v.product_id] = [];
          variationsMap[v.product_id].push({ id: v.id, name: v.name, price: Number(v.price) });
        });

        additionalsRes.data?.forEach(a => {
          if (!additionalsMap[a.product_id]) additionalsMap[a.product_id] = [];
          additionalsMap[a.product_id].push({ id: a.id, name: a.name, price: Number(a.price) });
        });

        const enrichedProducts = productsData?.map(p => ({
          ...p,
          price: Number(p.price),
          variations: variationsMap[p.id] || [],
          additionals: additionalsMap[p.id] || []
        })) || [];

        setProducts(enrichedProducts);
      } catch (err) {
        console.error('Error loading menu:', err);
        setError('Erro ao carregar cardápio');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [slug]);

  // Filter products based on search
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.description?.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  const productsByCategory = useMemo(() => {
    const grouped: Record<string, Product[]> = {};
    categories.forEach((cat) => {
      grouped[cat.id] = filteredProducts.filter((p) => p.category_id === cat.id);
    });
    return grouped;
  }, [categories, filteredProducts]);

  const handleAddToCart = (
    product: Product,
    qty: number,
    variation?: ProductVariation,
    additionals?: ProductAdditional[],
    obs?: string
  ) => {
    // Map to types.ts Product format
    const cartProduct = {
      id: product.id,
      categoryId: product.category_id,
      name: product.name,
      description: product.description || undefined,
      image: product.image_url || undefined,
      price: product.price,
      isActive: product.is_active,
      variations: product.variations,
      additionals: product.additionals
    };
    addItem(cartProduct, qty, variation, additionals || [], obs);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-foreground mb-2">Oops!</h1>
        <p className="text-muted-foreground">{error || 'Restaurante não encontrado'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div 
        className="gradient-primary"
        style={{ 
          background: restaurant.cover_url 
            ? `linear-gradient(to bottom, rgba(0,0,0,0.5), rgba(0,0,0,0.7)), url(${restaurant.cover_url}) center/cover`
            : undefined
        }}
      >
        <div className="container py-8">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-background/20 flex items-center justify-center text-4xl backdrop-blur-sm overflow-hidden">
              {restaurant.logo_url ? (
                <img src={restaurant.logo_url} alt={restaurant.name} className="w-full h-full object-cover" />
              ) : (
                '🍕'
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-primary-foreground">{restaurant.name}</h1>
              <p className="text-primary-foreground/80 text-sm mt-1">{restaurant.description}</p>
              <div className="flex items-center gap-4 mt-2 text-sm text-primary-foreground/70">
                {restaurant.opening_hours && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {restaurant.opening_hours}
                  </span>
                )}
                {restaurant.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {restaurant.address.split('-')[0]}
                  </span>
                )}
              </div>
            </div>
          </div>
          {restaurant.is_open ? (
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

      {/* Search Bar */}
      <div className="container py-4 -mt-2">
        <ProductSearch 
          onSearch={setSearchQuery} 
          placeholder="Buscar produtos por nome..."
        />
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border shadow-sm">
          <div className="container">
            <div className="flex gap-2 overflow-x-auto py-3 scrollbar-hide">
              {categories.map((cat) => (
                <motion.button
                  key={cat.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    const element = document.getElementById(`category-${cat.id}`);
                    if (element) {
                      const yOffset = -80;
                      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
                      window.scrollTo({ top: y, behavior: 'smooth' });
                    }
                  }}
                  className={`px-5 py-2.5 rounded-full whitespace-nowrap font-semibold transition-all duration-200 ${
                    activeCategory === cat.id
                      ? 'gradient-primary text-primary-foreground shadow-lg shadow-primary/30'
                      : 'bg-muted text-foreground hover:bg-primary/10 hover:text-primary border border-border'
                  }`}
                >
                  {cat.name}
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Products */}
      <div className="container py-6">
        {categories.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhum produto disponível no momento.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {categories.map((cat) => (
              <motion.section 
                key={cat.id} 
                id={`category-${cat.id}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4 }}
              >
                <div className="flex items-center gap-3 mb-5">
                  <h2 className="text-2xl font-bold text-foreground">{cat.name}</h2>
                  <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
                </div>
                {productsByCategory[cat.id]?.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {productsByCategory[cat.id].map((product, index) => (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 15 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                        <ProductCard
                          product={product}
                          onAddToCart={() => setSelectedProduct(product)}
                        />
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm py-4 text-center bg-muted/30 rounded-xl">
                    Nenhum produto nesta categoria.
                  </p>
                )}
              </motion.section>
            ))}
          </div>
        )}
      </div>

      {/* Floating Cart Button */}
      {itemCount > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-6 left-4 right-4 z-40"
        >
          <Button
            variant="hero"
            size="xl"
            className="w-full shadow-2xl"
            onClick={() => setCartOpen(true)}
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="flex-1">Ver carrinho ({itemCount} itens)</span>
            <span className="font-bold">R$ {total.toFixed(2)}</span>
          </Button>
        </motion.div>
      )}

      {/* Product Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <ProductModal
            product={selectedProduct}
            restaurantId={restaurant.id}
            onClose={() => setSelectedProduct(null)}
            onAdd={handleAddToCart}
          />
        )}
      </AnimatePresence>

      {/* Cart Sheet */}
      <CartSheet 
        isOpen={cartOpen} 
        onClose={() => setCartOpen(false)} 
        whatsapp={restaurant.whatsapp}
        deliveryFee={restaurant.delivery_fee ?? 0}
        freeDeliveryMinimum={restaurant.free_delivery_minimum}
        pickupEnabled={restaurant.pickup_enabled ?? true}
        deliveryAreas={deliveryAreas}
      />
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
