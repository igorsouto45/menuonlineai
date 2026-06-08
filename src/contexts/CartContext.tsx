import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CartItem, Product, ProductVariation, ProductAdditional } from '@/lib/types';

export type DeliveryMode = 'delivery' | 'pickup' | 'dine-in';

interface DeliveryArea {
  id: string;
  name: string;
  fee: number;
}

interface DeliveryInfo {
  mode: DeliveryMode;
  deliveryFee: number;
  freeDeliveryMinimum: number | null;
  selectedArea?: DeliveryArea | null;
  tableNumber?: string | null;
}

export type PaymentMethod = 'credit' | 'debit' | 'cash' | 'pix';

interface CartContextType {
  items: CartItem[];
  total: number;
  itemCount: number;
  addItem: (
    product: Product,
    quantity: number,
    variation?: ProductVariation,
    additionals?: ProductAdditional[],
    observation?: string
  ) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getWhatsAppMessage: (customerAddress?: string, deliveryInfo?: DeliveryInfo, paymentMethod?: PaymentMethod, changeFor?: number | null) => string;
  calculateDeliveryFee: (deliveryInfo: DeliveryInfo) => number;
  getGrandTotal: (deliveryInfo: DeliveryInfo) => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const calculateSubtotal = (
    product: Product,
    quantity: number,
    variation?: ProductVariation,
    additionals: ProductAdditional[] = []
  ): number => {
    const basePrice = variation?.price ?? product.price;
    const additionalsTotal = additionals.reduce((sum, a) => sum + a.price, 0);
    return (basePrice + additionalsTotal) * quantity;
  };

  const total = items.reduce((sum, item) => sum + item.subtotal, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const calculateDeliveryFee = useCallback((deliveryInfo: DeliveryInfo): number => {
    const { mode, deliveryFee, freeDeliveryMinimum, selectedArea } = deliveryInfo;
    
    // Pickup and Dine-in are always free
    if (mode === 'pickup' || mode === 'dine-in') {
      return 0;
    }
    
    // Use area fee if selected, otherwise use default
    const baseFee = selectedArea ? selectedArea.fee : deliveryFee;
    
    // If free delivery minimum is set and subtotal exceeds it, delivery is free
    if (freeDeliveryMinimum !== null && total >= freeDeliveryMinimum) {
      return 0;
    }
    
    return baseFee;
  }, [total]);

  const getGrandTotal = useCallback((deliveryInfo: DeliveryInfo): number => {
    return total + calculateDeliveryFee(deliveryInfo);
  }, [total, calculateDeliveryFee]);

  const addItem = useCallback(
    (
      product: Product,
      quantity: number,
      variation?: ProductVariation,
      additionals: ProductAdditional[] = [],
      observation?: string
    ) => {
      const newItem: CartItem = {
        id: `${product.id}-${Date.now()}`,
        product,
        quantity,
        selectedVariation: variation,
        selectedAdditionals: additionals,
        observation,
        subtotal: calculateSubtotal(product, quantity, variation, additionals),
      };
      setItems((prev) => [...prev, newItem]);
    },
    []
  );

  const removeItem = useCallback((itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              quantity,
              subtotal: calculateSubtotal(
                item.product,
                quantity,
                item.selectedVariation,
                item.selectedAdditionals
              ),
            }
          : item
      )
    );
  }, [removeItem]);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const getPaymentMethodLabel = (method: PaymentMethod): string => {
    const labels: Record<PaymentMethod, string> = {
      credit: '💳 Crédito',
      debit: '💳 Débito',
      cash: '💵 Dinheiro',
      pix: '📱 Pix',
    };
    return labels[method];
  };

  const getWhatsAppMessage = useCallback(
    (customerAddress?: string, deliveryInfo?: DeliveryInfo, paymentMethod?: PaymentMethod, changeFor?: number | null) => {
      const isPickup = deliveryInfo?.mode === 'pickup';
      const isDineIn = deliveryInfo?.mode === 'dine-in';
      
      let message = '';
      if (isDineIn) {
        message = `🪑 *Novo Pedido - MESA ${deliveryInfo?.tableNumber || '?'}*\n\n`;
      } else if (isPickup) {
        message = '📦 *Novo Pedido - RETIRADA*\n\n';
      } else {
        message = '🍕 *Novo Pedido - ENTREGA*\n\n';
      }

      items.forEach((item, index) => {
        message += `${index + 1}. *${item.product.name}*`;
        if (item.selectedVariation) {
          message += ` - ${item.selectedVariation.name}`;
        }
        message += ` (x${item.quantity})\n`;

        if (item.selectedAdditionals.length > 0) {
          item.selectedAdditionals.forEach((add) => {
            message += `   + ${add.name}\n`;
          });
        }

        if (item.observation) {
          message += `   📝 ${item.observation}\n`;
        }

        message += `   💰 R$ ${item.subtotal.toFixed(2)}\n\n`;
      });

      message += `━━━━━━━━━━━━━━━━\n`;
      message += `*Subtotal: R$ ${total.toFixed(2)}*\n`;

      // Add delivery info if provided
      if (deliveryInfo) {
        const actualDeliveryFee = calculateDeliveryFee(deliveryInfo);
        const grandTotal = total + actualDeliveryFee;

        if (isDineIn) {
          message += `*Forma: CONSUMO NO LOCAL (Mesa ${deliveryInfo.tableNumber})* 🪑\n`;
        } else if (isPickup) {
          message += `*Forma: RETIRADA NO LOCAL* 📦\n`;
        } else {
          if (deliveryInfo.selectedArea) {
            message += `*Área: ${deliveryInfo.selectedArea.name}*\n`;
          }
          if (actualDeliveryFee > 0) {
            message += `*Taxa de entrega: R$ ${actualDeliveryFee.toFixed(2)}*\n`;
          } else if (deliveryInfo.deliveryFee > 0 && actualDeliveryFee === 0) {
            message += `*Taxa de entrega: GRÁTIS* 🎉\n`;
          }
        }
        
        message += `━━━━━━━━━━━━━━━━\n`;
        message += `*TOTAL: R$ ${grandTotal.toFixed(2)}*\n`;
      } else {
        message += `*TOTAL: R$ ${total.toFixed(2)}*\n`;
      }

      // Add payment method
      if (paymentMethod) {
        message += `\n💰 *Pagamento na entrega:* ${getPaymentMethodLabel(paymentMethod)}`;
        if (paymentMethod === 'cash' && changeFor && changeFor > 0) {
          message += `\n💵 *Troco para:* R$ ${changeFor.toFixed(2)}`;
        }
        message += '\n';
      }

      if (customerAddress && !isPickup) {
        message += `\n📍 *Endereço de entrega:*\n${customerAddress}`;
      }

      return encodeURIComponent(message);
    },
    [items, total, calculateDeliveryFee]
  );

  return (
    <CartContext.Provider
      value={{
        items,
        total,
        itemCount,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        getWhatsAppMessage,
        calculateDeliveryFee,
        getGrandTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
