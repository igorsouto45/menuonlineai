import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CartItem, Product, ProductVariation, ProductAdditional } from '@/lib/types';

interface DeliveryInfo {
  deliveryFee: number;
  freeDeliveryMinimum: number | null;
}

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
  getWhatsAppMessage: (customerAddress?: string, deliveryInfo?: DeliveryInfo) => string;
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
    const { deliveryFee, freeDeliveryMinimum } = deliveryInfo;
    
    // If free delivery minimum is set and subtotal exceeds it, delivery is free
    if (freeDeliveryMinimum !== null && total >= freeDeliveryMinimum) {
      return 0;
    }
    
    return deliveryFee;
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

  const getWhatsAppMessage = useCallback(
    (customerAddress?: string, deliveryInfo?: DeliveryInfo) => {
      let message = '🍕 *Novo Pedido!*\n\n';

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

      // Add delivery fee info if provided
      if (deliveryInfo) {
        const actualDeliveryFee = calculateDeliveryFee(deliveryInfo);
        const grandTotal = total + actualDeliveryFee;

        if (actualDeliveryFee > 0) {
          message += `*Taxa de entrega: R$ ${actualDeliveryFee.toFixed(2)}*\n`;
        } else if (deliveryInfo.deliveryFee > 0 && actualDeliveryFee === 0) {
          message += `*Taxa de entrega: GRÁTIS* 🎉\n`;
        }
        
        message += `━━━━━━━━━━━━━━━━\n`;
        message += `*TOTAL: R$ ${grandTotal.toFixed(2)}*\n`;
      } else {
        message += `*TOTAL: R$ ${total.toFixed(2)}*\n`;
      }

      if (customerAddress) {
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
