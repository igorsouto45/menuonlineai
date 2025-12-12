import { Restaurant, Category, Product } from './types';

export const mockRestaurant: Restaurant = {
  id: '1',
  name: 'Pizzaria Bella Napoli',
  slug: 'bella-napoli',
  description: 'As melhores pizzas artesanais da cidade, feitas com ingredientes frescos e massa especial.',
  whatsapp: '5511999999999',
  address: 'Rua das Pizzas, 123 - Centro',
  openingHours: 'Seg-Dom: 18h às 23h',
  isOpen: true,
};

export const mockCategories: Category[] = [
  { id: '1', restaurantId: '1', name: 'Pizzas Tradicionais', order: 1, isActive: true },
  { id: '2', restaurantId: '1', name: 'Pizzas Especiais', order: 2, isActive: true },
  { id: '3', restaurantId: '1', name: 'Bebidas', order: 3, isActive: true },
  { id: '4', restaurantId: '1', name: 'Sobremesas', order: 4, isActive: true },
];

export const mockProducts: Product[] = [
  {
    id: '1',
    categoryId: '1',
    name: 'Margherita',
    description: 'Molho de tomate, mussarela de búfala, manjericão fresco e azeite extra virgem',
    price: 42.90,
    isActive: true,
    variations: [
      { id: 'v1', name: 'Pequena (4 fatias)', price: 32.90 },
      { id: 'v2', name: 'Média (6 fatias)', price: 42.90 },
      { id: 'v3', name: 'Grande (8 fatias)', price: 54.90 },
    ],
    additionals: [
      { id: 'a1', name: 'Borda recheada com catupiry', price: 8.00 },
      { id: 'a2', name: 'Borda recheada com cheddar', price: 8.00 },
    ],
  },
  {
    id: '2',
    categoryId: '1',
    name: 'Calabresa',
    description: 'Molho de tomate, mussarela, calabresa artesanal fatiada e cebola',
    price: 38.90,
    isActive: true,
    variations: [
      { id: 'v1', name: 'Pequena (4 fatias)', price: 28.90 },
      { id: 'v2', name: 'Média (6 fatias)', price: 38.90 },
      { id: 'v3', name: 'Grande (8 fatias)', price: 48.90 },
    ],
    additionals: [
      { id: 'a1', name: 'Borda recheada com catupiry', price: 8.00 },
      { id: 'a2', name: 'Borda recheada com cheddar', price: 8.00 },
    ],
  },
  {
    id: '3',
    categoryId: '1',
    name: 'Portuguesa',
    description: 'Molho de tomate, mussarela, presunto, ovos, cebola, azeitonas e ervilhas',
    price: 44.90,
    isActive: true,
    variations: [
      { id: 'v1', name: 'Pequena (4 fatias)', price: 34.90 },
      { id: 'v2', name: 'Média (6 fatias)', price: 44.90 },
      { id: 'v3', name: 'Grande (8 fatias)', price: 56.90 },
    ],
  },
  {
    id: '4',
    categoryId: '2',
    name: 'Quatro Queijos',
    description: 'Mussarela, gorgonzola, parmesão e catupiry sobre molho branco',
    price: 52.90,
    isActive: true,
    variations: [
      { id: 'v1', name: 'Pequena (4 fatias)', price: 42.90 },
      { id: 'v2', name: 'Média (6 fatias)', price: 52.90 },
      { id: 'v3', name: 'Grande (8 fatias)', price: 64.90 },
    ],
  },
  {
    id: '5',
    categoryId: '2',
    name: 'Frango com Catupiry',
    description: 'Frango desfiado temperado, catupiry cremoso e milho',
    price: 48.90,
    isActive: true,
    variations: [
      { id: 'v1', name: 'Pequena (4 fatias)', price: 38.90 },
      { id: 'v2', name: 'Média (6 fatias)', price: 48.90 },
      { id: 'v3', name: 'Grande (8 fatias)', price: 58.90 },
    ],
  },
  {
    id: '6',
    categoryId: '3',
    name: 'Refrigerante Lata',
    description: 'Coca-Cola, Guaraná ou Fanta',
    price: 6.00,
    isActive: true,
  },
  {
    id: '7',
    categoryId: '3',
    name: 'Suco Natural',
    description: 'Laranja, limão ou maracujá (500ml)',
    price: 10.00,
    isActive: true,
  },
  {
    id: '8',
    categoryId: '4',
    name: 'Petit Gateau',
    description: 'Bolinho quente de chocolate com sorvete de creme',
    price: 22.90,
    isActive: true,
  },
];
