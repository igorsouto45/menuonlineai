import { useState, useMemo, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart, CartProvider, DeliveryMode, PaymentMethod } from '@/contexts/CartContext';
import { useCustomer } from '@/contexts/CustomerContext';
import { supabase } from '@/integrations/supabase/client';
import { ProductSearch } from '@/components/menu/ProductSearch';
import { ProductImageCarousel } from '@/components/menu/ProductImageCarousel';
import { ProductReviews } from '@/components/menu/ProductReviews';
import { MenuSkeleton } from '@/components/menu/MenuSkeleton';
import { InstallPWAButton } from '@/components/menu/InstallPWAButton';
import { CustomerAuthModal } from '@/components/menu/CustomerAuthModal';
import { FloatingCart } from '@/components/menu/FloatingCart';
import { PaymentStatusIndicator } from '@/components/menu/PaymentStatusIndicator';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  X, 
  Clock, 
  MapPin, 
  MessageCircle,
  Package,
  Truck,
  LogIn,
  CreditCard,
  Loader2,
  Star,
  TrendingUp,
  Trash2,
  Banknote,
  Smartphone,
  Wallet,
  Table as TableIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  dine_in_enabled: boolean | null;
  mercado_pago_enabled: boolean | null;
  mercado_pago_public_key: string | null;
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
  is_featured?: boolean;
  variations?: ProductVariation[];
  additionals?: ProductAdditional[];
}

function ProductCard({ 
  product, 
  onAddToCart,
  isFeatured = false,
  isBestSeller = false
}: { 
  product: Product; 
  onAddToCart: (product: Product) => void;
  isFeatured?: boolean;
  isBestSeller?: boolean;
}) {
  return (
    <motion.div
      layout
      whileTap={{ scale: 0.98 }}
      className="group flex gap-3 p-3 sm:p-4 bg-card rounded-xl sm:rounded-2xl border border-border active:border-primary/30 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 cursor-pointer relative"
      onClick={() => onAddToCart(product)}
    >
      {/* Badges */}
      {(isFeatured || isBestSeller) && (
        <div className="absolute top-2 left-2 z-10 flex gap-1">
          {isFeatured && (
            <Badge className="bg-yellow-500 text-white text-xs px-2 py-0.5">
              <Star className="w-3 h-3 mr-1 fill-current" />
              Destaque
            </Badge>
          )}
          {isBestSeller && !isFeatured && (
            <Badge className="bg-primary text-primary-foreground text-xs px-2 py-0.5">
              <TrendingUp className="w-3 h-3 mr-1" />
              Mais Vendido
            </Badge>
          )}
        </div>
      )}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
        <div>
          <h3 className="font-bold text-foreground text-base sm:text-lg mb-1 group-hover:text-primary transition-colors line-clamp-2">
            {product.name}
          </h3>
          <p className="text-muted-foreground text-xs sm:text-sm line-clamp-2">{product.description}</p>
        </div>
        <div className="flex items-center gap-2 mt-2 sm:mt-3">
          {product.variations && product.variations.length > 0 ? (
            <span className="text-xs sm:text-sm text-muted-foreground">
              a partir de{' '}
              <span className="text-lg sm:text-xl font-bold text-primary">
                R$ {Math.min(...product.variations.map(v => v.price)).toFixed(2)}
              </span>
            </span>
          ) : (
            <span className="text-lg sm:text-xl font-bold text-primary">
              R$ {product.price.toFixed(2)}
            </span>
          )}
        </div>
      </div>
      <div className="relative w-20 h-20 sm:w-28 sm:h-28 rounded-lg sm:rounded-xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner">
        {product.image_url ? (
          <img 
            src={product.image_url} 
            alt={product.name} 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
          />
        ) : (
          <span className="text-3xl sm:text-4xl">🍕</span>
        )}
        <div className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 w-7 h-7 sm:w-9 sm:h-9 rounded-full gradient-primary flex items-center justify-center shadow-lg shadow-primary/40">
          <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
        </div>
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
  deliveryAreas,
  restaurantId,
  restaurantName,
  evolutionApiUrl,
  evolutionApiKey,
  evolutionInstanceName,
  orderWelcomeMessage,
  tableNumber,
  dineInEnabled
}: { 
  isOpen: boolean; 
  onClose: () => void;
  whatsapp: string;
  deliveryFee: number;
  freeDeliveryMinimum: number | null;
  pickupEnabled: boolean;
  deliveryAreas: DeliveryArea[];
  restaurantId: string;
  restaurantName: string;
  evolutionApiUrl?: string | null;
  evolutionApiKey?: string | null;
  evolutionInstanceName?: string | null;
  orderWelcomeMessage?: string | null;
  tableNumber?: string | null;
  dineInEnabled?: boolean;
}) {
  const { items, total, removeItem, updateQuantity, getWhatsAppMessage, clearCart, calculateDeliveryFee, getGrandTotal } = useCart();
  const { session, user, customer, loadCustomerByRestaurant } = useCustomer();
  const { toast } = useToast();
  const [address, setAddress] = useState('');
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>(
    tableNumber ? 'dine-in' : (pickupEnabled ? 'pickup' : 'delivery')
  );
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(deliveryAreas.length > 0 ? deliveryAreas[0].id : null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(tableNumber ? 'pix' : 'pix');
  const [changeFor, setChangeFor] = useState<string>('');

  // Load customer data when user is logged in
  useEffect(() => {
    if (user && restaurantId) {
      loadCustomerByRestaurant(restaurantId);
    }
  }, [user, restaurantId]);

  // Pre-fill address from customer profile
  useEffect(() => {
    if (customer?.address) {
      const fullAddress = [customer.address, customer.neighborhood, customer.city].filter(Boolean).join(', ');
      setAddress(fullAddress);
    }
  }, [customer]);

  const selectedArea = deliveryAreas.find(a => a.id === selectedAreaId) || null;
  
  const deliveryInfo = { 
    mode: deliveryMode,
    deliveryFee, 
    freeDeliveryMinimum,
    selectedArea: deliveryMode === 'delivery' ? selectedArea : null,
    tableNumber: tableNumber
  };
  const actualDeliveryFee = calculateDeliveryFee(deliveryInfo);
  const grandTotal = getGrandTotal(deliveryInfo);
  const hasFreeDelivery = deliveryMode === 'delivery' && deliveryFee > 0 && actualDeliveryFee === 0;
  const amountForFreeDelivery = freeDeliveryMinimum !== null && deliveryMode === 'delivery' ? freeDeliveryMinimum - total : null;

  const handleSendWhatsApp = async () => {
    if (!session?.user || !customer) {
      setShowAuthModal(true);
      return;
    }

    if (deliveryMode === 'delivery' && !address.trim()) {
      toast({
        title: 'Endereço obrigatório',
        description: 'Por favor, preencha o endereço de entrega.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Prepare order items
      const orderItems = items.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: item.selectedVariation?.price || item.product.price,
        subtotal: item.subtotal,
        variation: item.selectedVariation?.name || null,
        additionals: item.selectedAdditionals.map(a => a.name),
        observation: item.observation || null,
      }));

      // Create payment method note
      const paymentMethodLabels: Record<PaymentMethod, string> = {
        pix: 'Pix',
        credit: 'Crédito',
        debit: 'Débito',
        cash: 'Dinheiro',
      };
      const changeAmount = selectedPaymentMethod === 'cash' && changeFor ? parseFloat(changeFor) : null;
      let paymentNote = `Pagamento na entrega: ${paymentMethodLabels[selectedPaymentMethod]}`;
      if (changeAmount) {
        paymentNote += ` - Troco para R$ ${changeAmount.toFixed(2)}`;
      }

      // Create order in database - directly as confirmed since payment is on delivery
      // IMPORTANT: don't request the inserted row back (SELECT) because customers may be unauthenticated
      // and orders are not publicly readable due to sensitive data.
      const orderId = crypto.randomUUID();

      const { error: orderError } = await supabase
        .from('orders')
        .insert({
          id: orderId,
          restaurant_id: restaurantId,
          customer_name: customer.name,
          customer_phone: customer.whatsapp,
          customer_address: deliveryMode === 'delivery' ? address : (deliveryMode === 'pickup' ? 'Retirada no local' : `Mesa ${tableNumber}`),
          items: orderItems,
          total: grandTotal,
          status: 'confirmed',
          notes: paymentNote,
          delivery_mode: deliveryMode,
          table_number: tableNumber,
        });

      if (orderError) throw orderError;

      // Send welcome message via Evolution API if configured
      if (evolutionApiUrl && evolutionApiKey && evolutionInstanceName) {
        try {
          await supabase.functions.invoke('send-whatsapp-notification', {
            body: {
              orderId,
              customerPhone: customer.whatsapp,
              customerName: customer.name,
              status: 'confirmed',
              restaurantName,
              orderTotal: grandTotal,
              evolutionApiUrl,
              evolutionApiKey,
              evolutionInstanceName,
              customMessage: orderWelcomeMessage || undefined,
              baseUrl: window.location.origin,
            },
          });
        } catch (notifError) {
          console.error('Failed to send WhatsApp welcome notification:', notifError);
          // Don't fail the order if notification fails
        }
      }

      // Send WhatsApp message
      const message = getWhatsAppMessage(
        deliveryMode === 'delivery' ? address : undefined,
        deliveryInfo,
        selectedPaymentMethod,
        changeAmount
      );
      const formattedWhatsapp = whatsapp.replace(/\D/g, '');
      window.open(`https://wa.me/55${formattedWhatsapp}?text=${message}`, '_blank');

      // Clear cart after successful order
      clearCart();

      toast({
        title: 'Pedido confirmado!',
        description: `Pedido #${orderId.slice(0, 8)} criado com sucesso. Acompanhe pelo WhatsApp.`,
      });
    } catch (error: any) {
      console.error('Error creating order:', error);
      toast({
        title: 'Erro ao criar pedido',
        description: error.message || 'Não foi possível criar o pedido. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const handleClearCart = () => {
    clearCart();
    toast({
      title: 'Carrinho limpo',
      description: 'Todos os itens foram removidos do carrinho.',
    });
  };

  const paymentMethods: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
    { value: 'pix', label: 'Pix', icon: <Smartphone className="w-4 h-4" /> },
    { value: 'credit', label: 'Crédito', icon: <CreditCard className="w-4 h-4" /> },
    { value: 'debit', label: 'Débito', icon: <CreditCard className="w-4 h-4" /> },
    { value: 'cash', label: 'Dinheiro', icon: <Banknote className="w-4 h-4" /> },
  ];


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
            className="absolute right-0 top-0 h-full w-full max-w-md bg-card shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
              <h2 className="text-xl font-bold text-foreground">Seu Pedido</h2>
              <div className="flex items-center gap-2">
                {items.length > 0 && (
                  <button
                    onClick={handleClearCart}
                    className="w-10 h-10 rounded-full hover:bg-destructive/10 flex items-center justify-center transition-colors text-destructive"
                    title="Limpar carrinho"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-foreground" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
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
                    <div className={`grid ${pickupEnabled && dineInEnabled ? 'grid-cols-3' : (pickupEnabled || dineInEnabled ? 'grid-cols-2' : 'grid-cols-1')} gap-2`}>
                      {dineInEnabled && (
                        <button
                          onClick={() => setDeliveryMode('dine-in')}
                          className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                            deliveryMode === 'dine-in'
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-primary/40'
                          }`}
                        >
                          <TableIcon className="w-5 h-5" />
                          <span className="text-sm font-medium">Mesa</span>
                          <span className="text-xs text-muted-foreground">{tableNumber ? `Nº ${tableNumber}` : 'Local'}</span>
                        </button>
                      )}
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
                        }`}
                      >
                        <Truck className="w-5 h-5" />
                        <span className="text-sm font-medium">Entrega</span>
                        {deliveryAreas.length > 0 ? (
                          <span className="text-xs text-muted-foreground">Selecione</span>
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

                  {/* Payment Type Selection */}
                  <div className="pt-4 space-y-3">
                    <h3 className="font-semibold text-foreground">Forma de pagamento</h3>
                    
                    {/* Payment Type: On Delivery only (Mercado Pago disabled for now) */}
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">Selecione a forma de pagamento:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {paymentMethods.map((method) => (
                          <button
                            key={method.value}
                            onClick={() => {
                              setSelectedPaymentMethod(method.value);
                              if (method.value !== 'cash') {
                                setChangeFor('');
                              }
                            }}
                            className={`p-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                              selectedPaymentMethod === method.value
                                ? 'border-primary bg-primary/10'
                                : 'border-border hover:border-primary/40'
                            }`}
                          >
                            {method.icon}
                            <span className="text-sm font-medium">{method.label}</span>
                          </button>
                        ))}
                      </div>
                      
                      {/* Change input - only for cash */}
                      {selectedPaymentMethod === 'cash' && (
                        <div className="pt-2">
                          <label className="text-sm text-muted-foreground mb-2 block">
                            Precisa de troco? Para quanto?
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                            <input
                              type="number"
                              value={changeFor}
                              onChange={(e) => setChangeFor(e.target.value)}
                              placeholder="0,00"
                              className="w-full pl-10 p-3 rounded-xl border-2 border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Deixe em branco se não precisar de troco
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="p-4 border-t border-border bg-card shrink-0">
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
                
                {user ? (
                  <Button variant="whatsapp" size="xl" className="w-full" onClick={handleSendWhatsApp}>
                    <MessageCircle className="w-5 h-5" />
                    Enviar pedido via WhatsApp
                  </Button>
                ) : (
                  <Button variant="hero" size="xl" className="w-full" onClick={() => setShowAuthModal(true)}>
                    <LogIn className="w-5 h-5" />
                    Entrar para fazer pedido
                  </Button>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
                    {tableStatus === 'occupied' && (
                      <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-xl mb-4 text-center">
                        <p className="text-sm text-destructive font-medium">
                          Esta mesa está marcada como ocupada no sistema.
                        </p>
                      </div>
                    )}

      {/* Customer Auth Modal */}
      <CustomerAuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        restaurantId={restaurantId}
        restaurantName={restaurantName}
        onSuccess={() => loadCustomerByRestaurant(restaurantId)}
      />
    </AnimatePresence>
  );
}

function MenuPageContent() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { addItem, clearCart } = useCart();
  const { toast } = useToast();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [deliveryAreas, setDeliveryAreas] = useState<DeliveryArea[]>([]);
  const [bestSellerIds, setBestSellerIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tableStatus, setTableStatus] = useState<'free' | 'occupied' | 'reserved' | null>(null);

  // Get payment status from URL
  const paymentStatus = searchParams.get('payment');
  const orderId = searchParams.get('order_id');

  // Handle payment return - clear cart on success
  useEffect(() => {
    if (paymentStatus === 'success' && orderId) {
      clearCart();
      toast({
        title: 'Pagamento realizado!',
        description: 'Seu pedido foi confirmado. Acompanhe o status abaixo.',
      });
      // Clean URL params after handling
      setSearchParams({});
    } else if (paymentStatus === 'failure') {
      toast({
        title: 'Pagamento não realizado',
        description: 'O pagamento foi cancelado ou falhou. Tente novamente.',
        variant: 'destructive',
      });
      setSearchParams({});
    }
  }, [paymentStatus, orderId, clearCart, toast, setSearchParams]);

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

        // Fetch table status if table number is present
        const tableNum = searchParams.get('table');
        if (tableNum && restaurantData) {
          const { data: tableData } = await supabase
            .from('restaurant_tables')
            .select('status')
            .eq('restaurant_id', restaurantData.id)
            .eq('table_number', tableNum)
            .single();
          
          if (tableData) {
            setTableStatus(tableData.status as any);
          }
        }

        // Fetch best sellers from orders
        const { data: ordersData } = await supabase
          .from('orders')
          .select('items')
          .eq('restaurant_id', restaurantData.id)
          .limit(100);

        if (ordersData && ordersData.length > 0) {
          const productCounts: Record<string, number> = {};
          ordersData.forEach(order => {
            const items = (order.items as any[]) || [];
            items.forEach(item => {
              const productId = item.productId || item.id;
              if (productId) {
                productCounts[productId] = (productCounts[productId] || 0) + (item.quantity || 1);
              }
            });
          });
          
          const sorted = Object.entries(productCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 6)
            .map(([id]) => id);
          setBestSellerIds(sorted);
        }

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

  // Featured products
  const featuredProducts = useMemo(() => {
    return products.filter(p => p.is_featured);
  }, [products]);

  // Best sellers
  const bestSellerProducts = useMemo(() => {
    if (bestSellerIds.length === 0) return [];
    return bestSellerIds
      .map(id => products.find(p => p.id === id))
      .filter((p): p is Product => !!p);
  }, [products, bestSellerIds]);

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
    return <MenuSkeleton />;
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
    <div className="min-h-screen bg-background pb-40 sm:pb-36">
      {/* Payment Status Indicator */}
      <PaymentStatusIndicator restaurantId={restaurant.id} />
      
      {/* Table Status Banner */}
      {tableStatus && (
        <div className={`py-2 px-4 text-center text-sm font-medium ${
          tableStatus === 'free' ? 'bg-success/20 text-success' : 
          tableStatus === 'occupied' ? 'bg-destructive/20 text-destructive' : 
          'bg-warning/20 text-warning'
        }`}>
          Mesa {searchParams.get('table')}: {
            tableStatus === 'free' ? 'Disponível' : 
            tableStatus === 'occupied' ? 'Ocupada' : 
            'Reservada'
          }
        </div>
      )}
      {/* Header */}
      <div 
        className="gradient-primary"
        style={{ 
          background: restaurant.cover_url 
            ? `linear-gradient(to bottom, rgba(0,0,0,0.5), rgba(0,0,0,0.7)), url(${restaurant.cover_url}) center/cover`
            : undefined
        }}
      >
        <div className="container px-4 py-6 sm:py-8">
          <div className="flex items-start sm:items-center gap-3 sm:gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-background/20 flex items-center justify-center text-3xl sm:text-4xl backdrop-blur-sm overflow-hidden flex-shrink-0">
              {restaurant.logo_url ? (
                <img src={restaurant.logo_url} alt={restaurant.name} className="w-full h-full object-cover" />
              ) : (
                '🍕'
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-primary-foreground truncate">{restaurant.name}</h1>
              <p className="text-primary-foreground/80 text-xs sm:text-sm mt-1 line-clamp-2">{restaurant.description}</p>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs sm:text-sm text-primary-foreground/70">
                {restaurant.opening_hours && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                    {restaurant.opening_hours}
                  </span>
                )}
                {restaurant.address && (
                  <span className="flex items-center gap-1 truncate max-w-[150px] sm:max-w-none">
                    <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="truncate">{restaurant.address.split('-')[0]}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 sm:mt-4">
            {restaurant.is_open ? (
              <Badge variant="secondary" className="bg-success/20 text-success border-success/30 text-xs">
                ● Aberto agora
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-destructive/20 text-destructive border-destructive/30 text-xs">
                ● Fechado
              </Badge>
            )}
            <InstallPWAButton />
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="container px-4 py-3 sm:py-4 -mt-2">
        <ProductSearch 
          onSearch={setSearchQuery} 
          placeholder="Buscar produtos..."
        />
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border shadow-sm">
          <div className="px-4 sm:container">
            <div className="flex gap-2 overflow-x-auto py-2.5 sm:py-3 scrollbar-hide -mx-1 px-1">
              {categories.map((cat) => (
                <motion.button
                  key={cat.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    const element = document.getElementById(`category-${cat.id}`);
                    if (element) {
                      const yOffset = -60;
                      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
                      window.scrollTo({ top: y, behavior: 'smooth' });
                    }
                  }}
                  className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full whitespace-nowrap text-sm sm:text-base font-semibold transition-all duration-200 ${
                    activeCategory === cat.id
                      ? 'gradient-primary text-primary-foreground shadow-lg shadow-primary/30'
                      : 'bg-muted text-foreground active:bg-primary/10 hover:bg-primary/10 active:text-primary hover:text-primary border border-border'
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
      <div className="container px-4 py-4 sm:py-6">
        {/* Featured Products Section */}
        {featuredProducts.length > 0 && !searchQuery && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-8 sm:mb-10"
          >
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
              <Star className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500 fill-yellow-500" />
              <h2 className="text-lg sm:text-2xl font-bold text-foreground">Destaques</h2>
              <div className="flex-1 h-px bg-gradient-to-r from-yellow-500/50 to-transparent" />
            </div>
            <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
              {featuredProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <ProductCard
                    product={product}
                    onAddToCart={() => setSelectedProduct(product)}
                    isFeatured={true}
                  />
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Best Sellers Section */}
        {bestSellerProducts.length > 0 && !searchQuery && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mb-8 sm:mb-10"
          >
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              <h2 className="text-lg sm:text-2xl font-bold text-foreground">Mais Vendidos</h2>
              <div className="flex-1 h-px bg-gradient-to-r from-primary/50 to-transparent" />
            </div>
            <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
              {bestSellerProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <ProductCard
                    product={product}
                    onAddToCart={() => setSelectedProduct(product)}
                    isBestSeller={true}
                  />
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {categories.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhum produto disponível no momento.</p>
          </div>
        ) : (
          <div className="space-y-8 sm:space-y-10">
            {categories.map((cat) => (
              <motion.section 
                key={cat.id} 
                id={`category-${cat.id}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4 }}
              >
                <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
                  <h2 className="text-lg sm:text-2xl font-bold text-foreground">{cat.name}</h2>
                  <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
                </div>
                {productsByCategory[cat.id]?.length > 0 ? (
                  <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                    {productsByCategory[cat.id].map((product, index) => (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 15 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.3, delay: index * 0.03 }}
                      >
                        <ProductCard
                          product={product}
                          onAddToCart={() => setSelectedProduct(product)}
                          isFeatured={product.is_featured}
                          isBestSeller={bestSellerIds.includes(product.id)}
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

      {/* Floating Cart - Always visible */}
      <FloatingCart onOpenFullCart={() => setCartOpen(true)} />

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
        restaurantId={restaurant.id}
        restaurantName={restaurant.name}
        evolutionApiUrl={(restaurant as any).evolution_api_url}
        evolutionApiKey={(restaurant as any).evolution_api_key}
        evolutionInstanceName={(restaurant as any).evolution_instance_name}
        orderWelcomeMessage={(restaurant as any).order_welcome_message}
        tableNumber={searchParams.get('table')}
        dineInEnabled={restaurant.dine_in_enabled ?? false}
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
