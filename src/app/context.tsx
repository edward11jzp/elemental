import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Product, Order, User, Location, SocialMedia, PaymentInfo, SiteSettings } from './types';
import { mockProducts as initialProducts } from './data';

// Context for managing global application state

interface AppContextType {
  // Cart
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string, size: string, color: string) => void;
  updateCartItemQuantity: (productId: string, size: string, color: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartItemCount: number;
  
  // Products
  products: Product[];
  addProduct: (product: Product) => void;
  updateProduct: (productId: string, updates: Partial<Product>) => void;
  deleteProduct: (productId: string) => void;
  
  // User & Auth
  currentUser: User | null;
  login: (email: string, password: string, role?: 'customer' | 'admin') => boolean;
  logout: () => void;

  // Users Management
  users: User[];
  addUser: (user: User) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
  toggleUserActive: (userId: string) => void;

  // Orders
  orders: Order[];
  addOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  
  // Locations
  locations: Location[];
  addLocation: (location: Omit<Location, 'id'>) => void;
  updateLocation: (locationId: string, updates: Partial<Location>) => void;
  deleteLocation: (locationId: string) => void;

  // Social Media
  socialMedia: SocialMedia[];
  addSocialMedia: (social: Omit<SocialMedia, 'id'>) => void;
  updateSocialMedia: (socialId: string, updates: Partial<SocialMedia>) => void;
  deleteSocialMedia: (socialId: string) => void;

  // Payment Info
  paymentInfo: PaymentInfo[];
  addPaymentInfo: (info: Omit<PaymentInfo, 'id'>) => void;
  updatePaymentInfo: (infoId: string, updates: Partial<PaymentInfo>) => void;
  deletePaymentInfo: (infoId: string) => void;

  // Site Settings
  siteSettings: SiteSettings;
  updateSiteSettings: (settings: Partial<SiteSettings>) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const initialLocations: Location[] = [
  {
    id: 'loc-1',
    name: 'ELEMENTAL - Lagomall',
    shoppingCenter: 'CC Lagomall',
    address: 'Maracaibo',
    phone: '0412-4777970',
    hours: '10:00am - 7:00pm',
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=600&fit=crop',
  },
  {
    id: 'loc-2',
    name: 'ELEMENTAL - Sambil',
    shoppingCenter: 'CC Sambil',
    address: 'Maracaibo',
    phone: '0412-2327907',
    hours: '10:00am - 9:00pm',
    image: 'https://images.unsplash.com/photo-1555529902-5261145633bf?w=800&h=600&fit=crop',
  },
  {
    id: 'loc-3',
    name: 'ELEMENTAL - Metrosol',
    shoppingCenter: 'CC Metrosol',
    address: 'Maracaibo',
    phone: '0412-4872821',
    hours: '10:00am - 8:00pm',
    image: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=800&h=600&fit=crop',
  },
  {
    id: 'loc-4',
    name: 'ELEMENTAL - Galerías Mall',
    shoppingCenter: 'CC Galerías Mall',
    address: 'Maracaibo',
    phone: '0412-2329014',
    hours: '10:00am - 7:00pm',
    image: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800&h=600&fit=crop',
  },
  {
    id: 'loc-5',
    name: 'ELEMENTAL - Mall Paseo',
    shoppingCenter: 'CC Mall Paseo',
    address: 'San Francisco',
    phone: '0422-7142401',
    hours: '10:00am - 9:00pm',
    image: 'https://images.unsplash.com/photo-1556742044-3c52d6e88c62?w=800&h=600&fit=crop',
  },
  {
    id: 'loc-6',
    name: 'ELEMENTAL - Envíos Nacionales',
    shoppingCenter: 'Pedidos y Envíos',
    address: 'Todo el País',
    phone: '0412-4777970',
    hours: 'WhatsApp: Lun - Sáb 9:00am - 6:00pm',
    image: 'https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?w=800&h=600&fit=crop',
  },
];

const initialSocialMedia: SocialMedia[] = [
  {
    id: 'social-1',
    platform: 'instagram',
    username: '@elemental_store',
    url: 'https://instagram.com/elemental_store',
    active: true,
  },
  {
    id: 'social-2',
    platform: 'facebook',
    username: 'Elemental Store',
    url: 'https://facebook.com/elementalstore',
    active: true,
  },
  {
    id: 'social-3',
    platform: 'whatsapp',
    username: '0412-4777970',
    url: 'https://wa.me/584124777970',
    active: true,
  },
];

const initialPaymentInfo: PaymentInfo[] = [
  {
    id: 'payment-1',
    method: 'zelle',
    active: true,
    accountName: 'Elemental Store',
    zelleEmail: 'pagos@elementalstore.com',
    zellePhone: '+1-555-0123',
  },
];

const initialUsers: User[] = [
  {
    id: 'user-1',
    email: 'customer@example.com',
    name: 'John Doe',
    role: 'customer',
    active: true,
    createdAt: '2026-01-15T10:00:00Z',
    phone: '0412-1234567',
  },
  {
    id: 'user-2',
    email: 'customer2@example.com',
    name: 'María García',
    role: 'customer',
    active: true,
    createdAt: '2026-02-10T10:00:00Z',
    phone: '0424-9876543',
  },
  {
    id: 'emp-1',
    email: 'employee@example.com',
    name: 'Jane Smith',
    role: 'employee',
    active: true,
    createdAt: '2026-02-01T10:00:00Z',
  },
  {
    id: 'emp-2',
    email: 'employee2@example.com',
    name: 'Carlos Pérez',
    role: 'employee',
    active: true,
    createdAt: '2026-02-15T10:00:00Z',
  },
  {
    id: 'admin-1',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin',
    active: true,
    createdAt: '2026-01-01T10:00:00Z',
  },
];

export function AppProvider({ children }: { children: React.ReactNode }) {
  // Initialize cart from localStorage
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined') {
      const savedCart = localStorage.getItem('elemental_cart');
      if (savedCart) {
        try {
          return JSON.parse(savedCart);
        } catch (e) {
          console.error('Error loading cart from localStorage:', e);
        }
      }
    }
    return [];
  });

  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Initialize users from localStorage
  const [users, setUsers] = useState<User[]>(() => {
    if (typeof window !== 'undefined') {
      const savedUsers = localStorage.getItem('elemental_users');
      if (savedUsers) {
        try {
          return JSON.parse(savedUsers);
        } catch (e) {
          console.error('Error loading users from localStorage:', e);
        }
      }
    }
    return initialUsers;
  });

  // Initialize orders from localStorage
  const [orders, setOrders] = useState<Order[]>(() => {
    if (typeof window !== 'undefined') {
      const savedOrders = localStorage.getItem('elemental_orders');
      if (savedOrders) {
        try {
          return JSON.parse(savedOrders);
        } catch (e) {
          console.error('Error loading orders from localStorage:', e);
        }
      }
    }
    return [];
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>(() => {
    // Check if we need to reload from data.ts due to customPricing addition
    const needsReload = typeof window !== 'undefined' && !localStorage.getItem('elemental_products_v3');

    if (needsReload) {
      // Clear old localStorage and mark as updated
      localStorage.removeItem('elemental_products');
      localStorage.removeItem('elemental_products_v2');
      localStorage.setItem('elemental_products_v3', 'true');
      return initialProducts;
    }

    // Try to load products from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('elemental_products');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Error loading products from localStorage:', e);
        }
      }
    }
    return initialProducts;
  });

  // Initialize locations from localStorage
  const [locations, setLocations] = useState<Location[]>(() => {
    if (typeof window !== 'undefined') {
      const savedLocations = localStorage.getItem('elemental_locations');
      if (savedLocations) {
        try {
          return JSON.parse(savedLocations);
        } catch (e) {
          console.error('Error loading locations from localStorage:', e);
        }
      }
    }
    return initialLocations;
  });

  // Initialize social media from localStorage
  const [socialMedia, setSocialMedia] = useState<SocialMedia[]>(() => {
    if (typeof window !== 'undefined') {
      const savedSocialMedia = localStorage.getItem('elemental_social_media');
      if (savedSocialMedia) {
        try {
          return JSON.parse(savedSocialMedia);
        } catch (e) {
          console.error('Error loading social media from localStorage:', e);
        }
      }
    }
    return initialSocialMedia;
  });

  // Initialize payment info from localStorage
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo[]>(() => {
    if (typeof window !== 'undefined') {
      const savedPaymentInfo = localStorage.getItem('elemental_payment_info');
      if (savedPaymentInfo) {
        try {
          return JSON.parse(savedPaymentInfo);
        } catch (e) {
          console.error('Error loading payment info from localStorage:', e);
        }
      }
    }
    return initialPaymentInfo;
  });

  // Initialize site settings from localStorage
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(() => {
    if (typeof window !== 'undefined') {
      const savedSettings = localStorage.getItem('elemental_site_settings');
      if (savedSettings) {
        try {
          return JSON.parse(savedSettings);
        } catch (e) {
          console.error('Error loading site settings from localStorage:', e);
        }
      }
    }
    return {
      tagline: 'Redefine Tu Estilo. Atrevido. Minimalista. Sin Disculpas.'
    };
  });

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('elemental_cart', JSON.stringify(cart));
    }
  }, [cart]);

  // Save orders to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('elemental_orders', JSON.stringify(orders));
    }
  }, [orders]);

  // Save users to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('elemental_users', JSON.stringify(users));
    }
  }, [users]);

  // Save locations to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('elemental_locations', JSON.stringify(locations));
    }
  }, [locations]);

  // Save social media to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('elemental_social_media', JSON.stringify(socialMedia));
    }
  }, [socialMedia]);

  // Save payment info to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('elemental_payment_info', JSON.stringify(paymentInfo));
    }
  }, [paymentInfo]);

  // Save site settings to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('elemental_site_settings', JSON.stringify(siteSettings));
    }
  }, [siteSettings]);

  // Save products to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('elemental_products', JSON.stringify(products));
    }
  }, [products]);

  const cartItemCount = cart.reduce((count, item) => count + item.quantity, 0);

  // Calculate pricing based on total cart quantity (wholesale if 6+ total items)
  const calculatePrice = (product: Product, totalCartQuantity: number): number => {
    // Use new pricing structure if available
    if (product.retailPrice && product.wholesalePrice) {
      return totalCartQuantity >= 6 ? product.wholesalePrice : product.retailPrice;
    }
    // Fallback to old logic
    if (totalCartQuantity >= 6) return 6.5;
    return product.price || 9;
  };

  // Calculate cart total
  const cartTotal = cart.reduce((total, item) => {
    const itemPrice = calculatePrice(item.product, cartItemCount);
    return total + (itemPrice * item.quantity);
  }, 0);

  const addToCart = (item: CartItem) => {
    setCart(prev => {
      const existingItemIndex = prev.findIndex(
        i => i.product.id === item.product.id && 
             i.size === item.size && 
             i.color === item.color &&
             i.isCustom === item.isCustom
      );

      if (existingItemIndex > -1) {
        const newCart = [...prev];
        newCart[existingItemIndex].quantity += item.quantity;
        return newCart;
      }

      return [...prev, item];
    });
  };

  const removeFromCart = (productId: string, size: string, color: string) => {
    setCart(prev => prev.filter(
      item => !(item.product.id === productId && item.size === size && item.color === color)
    ));
  };

  const updateCartItemQuantity = (productId: string, size: string, color: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId, size, color);
      return;
    }

    setCart(prev => prev.map(item =>
      item.product.id === productId && item.size === size && item.color === color
        ? { ...item, quantity }
        : item
    ));
  };

  const clearCart = () => setCart([]);

  const login = (email: string, password: string, role: 'customer' | 'admin' = 'customer'): boolean => {
    // Mock login - in real app, this would call an API
    const mockUser: User = {
      id: role === 'admin' ? 'admin-1' : 'user-1',
      email,
      name: role === 'admin' ? 'Admin User' : 'Customer User',
      role: role === 'admin' ? 'admin' : 'customer',
      active: true,
      createdAt: new Date().toISOString(),
    };
    setCurrentUser(mockUser);
    return true;
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const addUser = (user: User) => {
    setUsers(prev => [...prev, user]);
  };

  const updateUser = (userId: string, updates: Partial<User>) => {
    setUsers(prev => prev.map(user =>
      user.id === userId ? { ...user, ...updates } : user
    ));
  };

  const toggleUserActive = (userId: string) => {
    setUsers(prev => prev.map(user =>
      user.id === userId ? { ...user, active: !user.active } : user
    ));
  };

  const addOrder = (order: Order) => {
    setOrders(prev => [order, ...prev]);
  };

  const updateOrderStatus = (orderId: string, status: Order['status']) => {
    setOrders(prev => prev.map(order =>
      order.id === orderId ? { ...order, status, updatedAt: new Date().toISOString() } : order
    ));
  };

  const addProduct = (product: Product) => {
    setProducts(prev => [...prev, product]);
  };

  const updateProduct = (productId: string, updates: Partial<Product>) => {
    setProducts(prev => prev.map(product =>
      product.id === productId ? { ...product, ...updates } : product
    ));
  };

  const deleteProduct = (productId: string) => {
    setProducts(prev => prev.filter(product => product.id !== productId));
  };

  const addLocation = (location: Omit<Location, 'id'>) => {
    setLocations(prev => [...prev, { ...location, id: `loc-${prev.length + 1}` }]);
  };

  const updateLocation = (locationId: string, updates: Partial<Location>) => {
    setLocations(prev => prev.map(location =>
      location.id === locationId ? { ...location, ...updates } : location
    ));
  };

  const deleteLocation = (locationId: string) => {
    setLocations(prev => prev.filter(location => location.id !== locationId));
  };

  const addSocialMedia = (social: Omit<SocialMedia, 'id'>) => {
    setSocialMedia(prev => [...prev, { ...social, id: `social-${prev.length + 1}` }]);
  };

  const updateSocialMedia = (socialId: string, updates: Partial<SocialMedia>) => {
    setSocialMedia(prev => prev.map(social =>
      social.id === socialId ? { ...social, ...updates } : social
    ));
  };

  const deleteSocialMedia = (socialId: string) => {
    setSocialMedia(prev => prev.filter(social => social.id !== socialId));
  };

  const addPaymentInfo = (info: Omit<PaymentInfo, 'id'>) => {
    setPaymentInfo(prev => [...prev, { ...info, id: `payment-${Date.now()}` }]);
  };

  const updatePaymentInfo = (infoId: string, updates: Partial<PaymentInfo>) => {
    setPaymentInfo(prev => prev.map(info =>
      info.id === infoId ? { ...info, ...updates } : info
    ));
  };

  const deletePaymentInfo = (infoId: string) => {
    setPaymentInfo(prev => prev.filter(info => info.id !== infoId));
  };

  const updateSiteSettings = (settings: Partial<SiteSettings>) => {
    setSiteSettings(prev => ({ ...prev, ...settings }));
  };

  return (
    <AppContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateCartItemQuantity,
        clearCart,
        cartTotal,
        cartItemCount,
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        currentUser,
        login,
        logout,
        users,
        addUser,
        updateUser,
        toggleUserActive,
        orders,
        addOrder,
        updateOrderStatus,
        locations,
        addLocation,
        updateLocation,
        deleteLocation,
        socialMedia,
        addSocialMedia,
        updateSocialMedia,
        deleteSocialMedia,
        paymentInfo,
        addPaymentInfo,
        updatePaymentInfo,
        deletePaymentInfo,
        siteSettings,
        updateSiteSettings,
        searchQuery,
        setSearchQuery,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}