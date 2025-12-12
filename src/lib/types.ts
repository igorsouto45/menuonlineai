export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  cover?: string;
  whatsapp: string;
  address?: string;
  openingHours?: string;
  isOpen: boolean;
  primaryColor?: string;
  secondaryColor?: string;
}

export interface Category {
  id: string;
  restaurantId: string;
  name: string;
  description?: string;
  image?: string;
  order: number;
  isActive: boolean;
}

export interface ProductVariation {
  id: string;
  name: string;
  price: number;
}

export interface ProductAdditional {
  id: string;
  name: string;
  price: number;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  image?: string;
  price: number;
  isActive: boolean;
  variations?: ProductVariation[];
  additionals?: ProductAdditional[];
}

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  selectedVariation?: ProductVariation;
  selectedAdditionals: ProductAdditional[];
  observation?: string;
  subtotal: number;
}

export interface Cart {
  items: CartItem[];
  total: number;
  restaurantId: string;
}
