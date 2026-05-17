// Product Types
export interface Product {
  id: string;
  name: string;
  category: 'men' | 'women' | 'kids';
  subcategory: 't-shirts' | 'polos' | 'gorras' | 'hoodies' | 'joggers';
  price: number; // Deprecated - use retailPrice
  retailPrice?: number; // Precio al por detal (1-5 productos)
  wholesalePrice?: number; // Precio al por mayor (6+ productos)
  image: string;
  images: string[];
  description: string;
  sizes: string[];
  colors: string[];
  colorPalette?: string[];
  stock: number;
  allowCustom: boolean;
  customPricing?: {
    small: number; // Precio para S, M
    medium: number; // Precio para L, XL
    large: number; // Precio para 2XL, 3XL
  };
  featured?: boolean;
  trending?: boolean;
  // Imágenes de personalización
  customizationImages?: {
    front?: string; // Imagen vista frontal para personalización
    back?: string; // Imagen vista trasera para personalización
    sleeves?: string; // Imagen vista de mangas para personalización
  };
}

// Cart Types
export interface CartItem {
  product: Product;
  quantity: number;
  size: string;
  color: string;
  isCustom: boolean;
  customLogo?: string;
  customNotes?: string;
  customPrintSize?: 'small' | 'medium' | 'large';
}

export interface PricingTier {
  minQuantity: number;
  price: number;
}

// Order Types
export type OrderStatus = 'pending' | 'approved' | 'in_progress' | 'completed' | 'rejected';
export type PaymentMethod = 'card' | 'zelle' | 'binance' | 'pago_movil' | 'transferencia' | 'pesos_colombianos';

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  items: CartItem[];
  total: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  paymentMethod?: PaymentMethod;
  paymentProof?: string; // URL o base64 de la imagen del comprobante
}

// User Types
export type UserRole = 'customer' | 'employee' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  phone?: string; // Teléfono para clientes
}

// Search Types
export interface SearchResult {
  type: 'product' | 'category';
  id: string;
  name: string;
  image?: string;
  category?: string;
}

// Location Types
export interface Location {
  id: string;
  name: string;
  shoppingCenter: string;
  address?: string;
  phone: string;
  hours?: string;
  image?: string;
}

// Social Media Types
export type SocialMediaPlatform = 'facebook' | 'instagram' | 'twitter' | 'tiktok' | 'youtube' | 'whatsapp' | 'linkedin' | 'pinterest';

export interface SocialMedia {
  id: string;
  platform: SocialMediaPlatform;
  username: string;
  url: string;
  active: boolean;
}

// Payment Info Types
export interface PaymentInfo {
  id: string;
  method: Exclude<PaymentMethod, 'card'>; // Todos menos tarjeta
  active: boolean;
  // Campos comunes
  accountName?: string;
  // Zelle
  zelleEmail?: string;
  zellePhone?: string;
  // Binance
  binanceEmail?: string;
  binanceId?: string;
  binanceWallet?: string;
  // Pago Móvil
  pagoMovilBank?: string;
  pagoMovilPhone?: string;
  pagoMovilId?: string;
  // Transferencia
  bankName?: string;
  accountNumber?: string;
  accountType?: string;
  routingNumber?: string;
  // Pesos Colombianos
  colombiaBank?: string;
  colombiaAccountNumber?: string;
  colombiaAccountType?: string;
  colombiaDocumentType?: string;
  colombiaDocumentNumber?: string;
}

// Site Settings Types
export interface SiteSettings {
  tagline: string; // Eslogan principal de la tienda
}