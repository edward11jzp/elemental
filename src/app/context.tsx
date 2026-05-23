import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Product, Order, User, Location, SocialMedia, PaymentInfo, SiteSettings } from './types';
import { supabase } from './lib/supabase';
import * as ordersApi from './lib/orders';
import * as usersApi from './lib/users';
import * as productsApi from './lib/products';
import * as contentApi from './lib/content';

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
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (productId: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  
  // User & Auth
  currentUser: User | null;
  login: (email: string, password: string, role?: 'customer' | 'admin' | 'employee') => Promise<boolean>;
  logout: () => Promise<void>;

  // Users Management
  users: User[];
  refreshUsers: () => Promise<void>;
  createStaffUser: (email: string, password: string, name: string, role: 'admin' | 'employee', phone?: string) => Promise<void>;
  updateUser: (userId: string, updates: Partial<User>) => Promise<void>;
  toggleUserActive: (userId: string) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;

  // Orders
  orders: Order[];
  addOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  
  // Locations
  locations: Location[];
  addLocation: (location: Omit<Location, 'id'>) => Promise<void>;
  updateLocation: (locationId: string, updates: Partial<Location>) => Promise<void>;
  deleteLocation: (locationId: string) => Promise<void>;

  // Social Media
  socialMedia: SocialMedia[];
  addSocialMedia: (social: Omit<SocialMedia, 'id'>) => Promise<void>;
  updateSocialMedia: (socialId: string, updates: Partial<SocialMedia>) => Promise<void>;
  deleteSocialMedia: (socialId: string) => Promise<void>;

  // Payment Info
  paymentInfo: PaymentInfo[];
  addPaymentInfo: (info: Omit<PaymentInfo, 'id'>) => Promise<void>;
  updatePaymentInfo: (infoId: string, updates: Partial<PaymentInfo>) => Promise<void>;
  deletePaymentInfo: (infoId: string) => Promise<void>;

  // Site Settings
  siteSettings: SiteSettings;
  updateSiteSettings: (settings: Partial<SiteSettings>) => Promise<void>;

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

// Users are loaded from Supabase via lib/users.ts (admin only).

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

  // Sync currentUser with Supabase Auth session on mount and on auth changes.
  useEffect(() => {
    let cancelled = false;
    import('./lib/auth').then(({ getCurrentUser }) => {
      getCurrentUser().then((u) => { if (!cancelled) setCurrentUser(u); });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      // Defer to next tick so the supabase-js auth lock is released before
      // we make any further supabase calls (avoids deadlock after signUp).
      setTimeout(async () => {
        if (!session) { setCurrentUser(null); return; }
        const { getCurrentUser } = await import('./lib/auth');
        const u = await getCurrentUser();
        if (!cancelled) setCurrentUser(u);
      }, 0);
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  // Users come from Supabase (admin only — RLS/RPC enforce). Anon and employees
  // get an empty list, which is fine since only admins see /admin/users.
  const [users, setUsers] = useState<User[]>([]);

  const refreshUsers = async () => {
    try {
      const list = await usersApi.listUsers();
      setUsers(list);
    } catch {
      // Not authorized (not admin) — clear list silently.
      setUsers([]);
    }
  };

  // Refetch users whenever the auth session changes (admin login → load list).
  useEffect(() => {
    refreshUsers();
    const { data: sub } = supabase.auth.onAuthStateChange(() => { refreshUsers(); });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  // Orders come from Supabase. Anonymous clients can insert but can't list
  // (RLS blocks them); only authenticated staff sees the full list.
  const [orders, setOrders] = useState<Order[]>([]);

  // Fetch orders whenever the auth session changes (so admin login loads them).
  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const list = await ordersApi.listOrders();
        if (!cancelled) setOrders(list);
      } catch {
        // Anon users hit RLS and return empty — that's expected.
        if (!cancelled) setOrders([]);
      }
    };
    refresh();
    const { data: sub } = supabase.auth.onAuthStateChange(() => { refresh(); });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);

  const refreshProducts = async () => {
    try {
      const list = await productsApi.listProducts();
      setProducts(list);
    } catch (err) {
      console.error('Failed to load products:', err);
    }
  };

  useEffect(() => {
    refreshProducts();
  }, []);

  const [locations, setLocations] = useState<Location[]>([]);
  const [socialMedia, setSocialMedia] = useState<SocialMedia[]>([]);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    tagline: 'Redefine Tu Estilo. Atrevido. Minimalista. Sin Disculpas.',
  });

  useEffect(() => {
    contentApi.listLocations().then(setLocations).catch(() => {});
    contentApi.listSocialMedia().then(setSocialMedia).catch(() => {});
    contentApi.listPaymentInfo().then(setPaymentInfo).catch(() => {});
    contentApi.getSiteSettings().then(setSiteSettings).catch(() => {});
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('elemental_cart', JSON.stringify(cart));
    }
  }, [cart]);

  // Orders are persisted in Supabase, not localStorage.

  // Users are persisted in Supabase (not localStorage).



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

  const login = async (
    email: string,
    password: string,
    _role: 'customer' | 'admin' | 'employee' = 'customer',
  ): Promise<boolean> => {
    // Real auth via Supabase. The user's role comes from public.profiles, not
    // from the `_role` argument (which is now ignored — kept for API compat).
    try {
      const { signIn } = await import('./lib/auth');
      const user = await signIn(email, password);
      setCurrentUser(user);
      return true;
    } catch (err) {
      console.error('Login failed:', err);
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    const { signOut } = await import('./lib/auth');
    await signOut();
    setCurrentUser(null);
  };

  const createStaffUser = async (
    email: string,
    password: string,
    name: string,
    role: 'admin' | 'employee',
    phone?: string,
  ) => {
    await usersApi.createStaff(email, password, name, role, phone);
    await refreshUsers();
  };

  const updateUser = async (userId: string, updates: Partial<User>) => {
    if (updates.role || updates.name !== undefined || updates.phone !== undefined) {
      await usersApi.setUserRole(
        userId,
        (updates.role ?? users.find(u => u.id === userId)?.role ?? 'employee') as any,
        updates.name,
        updates.phone,
      );
    }
    if (updates.active !== undefined) {
      await usersApi.setUserActive(userId, updates.active);
    }
    await refreshUsers();
  };

  const toggleUserActive = async (userId: string) => {
    const u = users.find(x => x.id === userId);
    if (!u) return;
    await usersApi.setUserActive(userId, !u.active);
    await refreshUsers();
  };

  const deleteUser = async (userId: string) => {
    await usersApi.deleteUser(userId);
    await refreshUsers();
  };

  const addOrder = (order: Order) => {
    // Optimistic local insert so the confirmation screen sees it instantly.
    setOrders(prev => [order, ...prev]);
    // Persist to Supabase. If RLS rejects (shouldn't, insert is public) we log
    // but don't crash the customer-facing flow.
    ordersApi.createOrder(order).catch((err) => {
      console.error('Order insert failed:', err);
    });
  };

  const updateOrderStatus = (orderId: string, status: Order['status']) => {
    setOrders(prev => prev.map(order =>
      order.id === orderId ? { ...order, status, updatedAt: new Date().toISOString() } : order
    ));
    ordersApi.updateStatus(orderId, status).catch((err) => {
      console.error('Order status update failed:', err);
    });
  };

  const addProduct = async (product: Omit<Product, 'id'>) => {
    await productsApi.createProduct(product);
    await refreshProducts();
  };

  const updateProduct = async (productId: string, updates: Partial<Product>) => {
    await productsApi.updateProduct(productId, updates);
    await refreshProducts();
  };

  const deleteProduct = async (productId: string) => {
    await productsApi.deleteProduct(productId);
    await refreshProducts();
  };

  const addLocation = async (location: Omit<Location, 'id'>) => {
    await contentApi.createLocation(location);
    contentApi.listLocations().then(setLocations).catch(() => {});
  };

  const updateLocation = async (locationId: string, updates: Partial<Location>) => {
    await contentApi.updateLocation(locationId, updates);
    contentApi.listLocations().then(setLocations).catch(() => {});
  };

  const deleteLocation = async (locationId: string) => {
    await contentApi.deleteLocation(locationId);
    contentApi.listLocations().then(setLocations).catch(() => {});
  };

  const addSocialMedia = async (social: Omit<SocialMedia, 'id'>) => {
    await contentApi.createSocialMedia(social);
    contentApi.listSocialMedia().then(setSocialMedia).catch(() => {});
  };

  const updateSocialMedia = async (socialId: string, updates: Partial<SocialMedia>) => {
    await contentApi.updateSocialMedia(socialId, updates);
    contentApi.listSocialMedia().then(setSocialMedia).catch(() => {});
  };

  const deleteSocialMedia = async (socialId: string) => {
    await contentApi.deleteSocialMedia(socialId);
    contentApi.listSocialMedia().then(setSocialMedia).catch(() => {});
  };

  const addPaymentInfo = async (info: Omit<PaymentInfo, 'id'>) => {
    await contentApi.createPaymentInfo(info);
    contentApi.listPaymentInfo().then(setPaymentInfo).catch(() => {});
  };

  const updatePaymentInfo = async (infoId: string, updates: Partial<PaymentInfo>) => {
    await contentApi.updatePaymentInfo(infoId, updates);
    contentApi.listPaymentInfo().then(setPaymentInfo).catch(() => {});
  };

  const deletePaymentInfo = async (infoId: string) => {
    await contentApi.deletePaymentInfo(infoId);
    contentApi.listPaymentInfo().then(setPaymentInfo).catch(() => {});
  };

  const updateSiteSettings = async (settings: Partial<SiteSettings>) => {
    setSiteSettings(prev => ({ ...prev, ...settings }));
    await contentApi.updateSiteSettings(settings);
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
        refreshUsers,
        createStaffUser,
        updateUser,
        toggleUserActive,
        deleteUser,
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
