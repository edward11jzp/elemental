import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { CartItem, Product, Order, User, Location, SocialMedia, PaymentInfo, SiteSettings } from './types';
import { supabase } from './lib/supabase';
import * as ordersApi from './lib/orders';
import * as usersApi from './lib/users';
import * as productsApi from './lib/products';
import * as contentApi from './lib/content';
import * as subcatsApi from './lib/subcategories';
import type { Subcategory } from './lib/subcategories';
import { getBaseUnitPrice, getUnitPrice } from './lib/pricing';

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
  // true mientras el primer fetch a Supabase no termina (independiente de si
  // tenemos data cacheada). Útil para mostrar skeletons en la primera visita.
  productsLoading: boolean;
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
  createStaffUser: (email: string, password: string, name: string, role: string, phone?: string) => Promise<void>;
  updateUser: (userId: string, updates: Partial<User>) => Promise<void>;
  toggleUserActive: (userId: string) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;

  // Orders
  orders: Order[];
  // Devuelve la promesa del insert a Supabase — el checkout ahora la awaits
  // para NO mostrar confirmación al cliente si el guardado falló.
  addOrder: (order: Order) => Promise<void>;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  refreshOrders: () => Promise<void>;
  // Contador de órdenes nuevas desde la última vez que el admin visitó
  // "Órdenes". Se muestra como badge en AdminShell.
  newOrdersCount: number;
  markOrdersSeen: () => void;
  // Suscribirse a cada nueva orden que llega via Supabase Realtime — usado
  // por AdminOrderNotifier para disparar sonido + notificación del navegador.
  onNewOrder: (cb: (order: Order) => void) => () => void;
  
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

  // Subcategories
  subcategories: Subcategory[];
  refreshSubcategories: () => Promise<void>;
  addSubcategory: (value: string, label: string) => Promise<void>;
  deleteSubcategory: (value: string) => Promise<void>;

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

  // Refetch users solo cuando hay sesión de staff — antes esto llamaba al
  // RPC admin_list_users para TODOS los visitantes (incluidos clientes
  // anónimos) en cada carga de página, fallando con 400 innecesariamente.
  useEffect(() => {
    if (!currentUser) { setUsers([]); return; }
    refreshUsers();
  }, [currentUser]);

  // Orders come from Supabase. Anonymous clients can insert but can't list
  // (RLS blocks them); only authenticated staff sees the full list.
  const [orders, setOrders] = useState<Order[]>([]);
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  // Callbacks para notificar UI (sonido + browser Notification) cuando
  // llega una orden por Supabase Realtime. Usamos ref para que la lista
  // no dispare re-renders del provider al suscribirse/desuscribirse.
  const newOrderCallbacksRef = useRef<Array<(order: Order) => void>>([]);
  const onNewOrder = (cb: (order: Order) => void) => {
    newOrderCallbacksRef.current = [...newOrderCallbacksRef.current, cb];
    return () => {
      newOrderCallbacksRef.current = newOrderCallbacksRef.current.filter((x) => x !== cb);
    };
  };
  const markOrdersSeen = () => setNewOrdersCount(0);

  // Fetch orders whenever the auth session changes (so admin login loads them).
  // Corre para todos los visitantes (anon incluido) pero es solo UNA petición
  // por cambio de sesión — no es el origen del problema de performance.
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
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Realtime de `orders`: SOLO para admin/staff autenticado.
  //
  // BUG CRÍTICO QUE ARREGLA ESTO: antes este canal se suscribía para TODOS
  // los visitantes (incluyendo clientes anónimos navegando la tienda), pero
  // la política RLS de SELECT en `orders` es is_staff() — anon no la cumple.
  // Supabase Realtime reintentaba autorizar/reconectar ese canal sin parar
  // en segundo plano en la sesión de CADA cliente, generando peticiones 400
  // repetidas indefinidamente mientras la pestaña estuviera abierta. En
  // celulares esto degradaba el rendimiento hasta el punto de congelar la
  // página (pantalla en gris) al interactuar con el carrito. Ahora solo se
  // abre el canal cuando hay currentUser (staff logueado) y se cierra al
  // cerrar sesión.
  useEffect(() => {
    if (!currentUser) return;

    const refresh = async () => {
      try {
        const list = await ordersApi.listOrders();
        setOrders(list);
      } catch {
        // no-op
      }
    };

    const channel = supabase
      .channel('public:orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          refresh();
          setNewOrdersCount((c) => c + 1);
          const orderRow = payload.new as any;
          const order: Order = {
            id: orderRow.id,
            customerId: 'guest',
            customerName: orderRow.customer_name,
            customerEmail: orderRow.customer_email ?? undefined,
            customerPhone: orderRow.customer_phone ?? undefined,
            items: orderRow.items ?? [],
            total: Number(orderRow.total),
            status: orderRow.status,
            notes: orderRow.notes ?? undefined,
            paymentMethod: orderRow.payment_method ?? undefined,
            paymentProof: orderRow.payment_proof ?? undefined,
            createdAt: orderRow.created_at,
            updatedAt: orderRow.updated_at,
          } as Order;
          newOrderCallbacksRef.current.forEach((cb) => {
            try { cb(order); } catch (e) { console.error('onNewOrder callback failed', e); }
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  const [searchQuery, setSearchQuery] = useState('');

  // Stale-while-revalidate: arrancamos con lo último cacheado en localStorage
  // para que productos y subcategorías se vean al instante en visitas siguientes.
  // En paralelo Supabase refresca con la versión más nueva.
  const PRODUCTS_CACHE_KEY = 'elemental_products_cache_v2';
  // La v1 podía pesar ~18 MB (imágenes en base64): se borra.
  try { localStorage.removeItem('elemental_products_cache_v1'); } catch { /* sin almacenamiento */ }
  const SUBCATS_CACHE_KEY = 'elemental_subcategories_cache_v1';

  const readCache = <T,>(key: string): T[] => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  };

  const writeCache = <T,>(key: string, list: T[]) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, JSON.stringify(list));
    } catch {
      // localStorage lleno o no disponible — ignoramos, no es crítico.
    }
  };

  const [products, setProducts] = useState<Product[]>(() => readCache<Product>(PRODUCTS_CACHE_KEY));
  const [subcategories, setSubcategories] = useState<Subcategory[]>(() => readCache<Subcategory>(SUBCATS_CACHE_KEY));
  const [productsLoading, setProductsLoading] = useState<boolean>(true);

  const refreshSubcategories = async () => {
    try {
      const list = await subcatsApi.listSubcategories();
      setSubcategories(list);
      writeCache(SUBCATS_CACHE_KEY, list);
    } catch (err) {
      console.error('Failed to load subcategories:', err);
    }
  };

  const addSubcategory = async (value: string, label: string) => {
    await subcatsApi.createSubcategory(value, label);
    await refreshSubcategories();
  };

  const deleteSubcategory = async (value: string) => {
    await subcatsApi.deleteSubcategory(value);
    await refreshSubcategories();
  };

  const refreshProducts = async () => {
    try {
      const list = await productsApi.listProducts();
      // Only update state if we got a real response. If the network blips and
      // returns an unexpected empty list while we had products, keep the old
      // ones rather than flashing an empty inventory.
      setProducts(prev => {
        const next = list.length === 0 && prev.length > 0 ? prev : list;
        if (next === list) writeCache(PRODUCTS_CACHE_KEY, list);
        return next;
      });
    } catch (err) {
      console.error('Failed to load products:', err);
      // Network/RLS error — do NOT clear existing state. Keep stale data
      // visible until the next successful fetch.
    } finally {
      setProductsLoading(false);
    }
  };

  useEffect(() => {
    refreshProducts();
    refreshSubcategories();

    // Debounce realtime refetches so a burst of events triggers a single fetch.
    let productsTimer: ReturnType<typeof setTimeout> | null = null;
    let subcatsTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedProducts = () => {
      if (productsTimer) clearTimeout(productsTimer);
      productsTimer = setTimeout(() => { refreshProducts(); }, 1500);
    };
    const debouncedSubcats = () => {
      if (subcatsTimer) clearTimeout(subcatsTimer);
      subcatsTimer = setTimeout(() => { refreshSubcategories(); }, 1500);
    };

    const productsChannel = supabase
      .channel('public:products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, debouncedProducts)
      .subscribe();

    const subcatsChannel = supabase
      .channel('public:subcategories')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subcategories' }, debouncedSubcats)
      .subscribe();

    return () => {
      if (productsTimer) clearTimeout(productsTimer);
      if (subcatsTimer) clearTimeout(subcatsTimer);
      supabase.removeChannel(productsChannel);
      supabase.removeChannel(subcatsChannel);
    };
  }, []);

  const [locations, setLocations] = useState<Location[]>([]);
  const [socialMedia, setSocialMedia] = useState<SocialMedia[]>([]);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    tagline: 'Redefine Tu Estilo. Atrevido. Minimalista. Sin Disculpas.',
    exchangeRate: null,
  });

  useEffect(() => {
    // Críticos para el home (tagline + futuras subscripciones realtime).
    contentApi.getSiteSettings().then(setSiteSettings).catch(() => {});

    // No críticos en primera vista: solo se usan en /locations, /checkout y footer.
    // Los diferimos para no competir con el fetch de productos en el mount inicial.
    // requestIdleCallback es ideal; fallback a setTimeout para Safari.
    const deferred = () => {
      contentApi.listLocations().then(setLocations).catch(() => {});
      contentApi.listSocialMedia().then(setSocialMedia).catch(() => {});
      contentApi.listPaymentInfo().then(setPaymentInfo).catch(() => {});
    };
    const ric: ((cb: () => void) => number) | undefined =
      (window as any).requestIdleCallback?.bind(window);
    const handle = ric ? ric(deferred) : window.setTimeout(deferred, 1500);
    return () => {
      const cic: ((id: number) => void) | undefined =
        (window as any).cancelIdleCallback?.bind(window);
      if (ric && cic) cic(handle as number);
      else window.clearTimeout(handle as number);
    };
  }, []);

  // Save cart to localStorage whenever it changes.
  // Blindado con try/catch: si por cualquier motivo el payload excede la
  // cuota de localStorage (QuotaExceededError, común en Safari/iPhone con
  // ~5MB de límite), lo registramos y seguimos — sin esto, la excepción
  // quedaba sin capturar dentro del efecto y, al no existir un Error
  // Boundary en la app, React desmontaba TODO el árbol dejando solo el
  // fondo (pantalla en blanco/gris). El carrito en memoria sigue
  // funcionando aunque no se persista esa vez.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('elemental_cart', JSON.stringify(cart));
    } catch (err) {
      console.error('No se pudo guardar el carrito en localStorage:', err);
    }
  }, [cart]);

  // Orders are persisted in Supabase, not localStorage.

  // Users are persisted in Supabase (not localStorage).



  const cartItemCount = cart.reduce((count, item) => count + item.quantity, 0);

  // Calcula el precio base por unidad (retail o wholesale) según la cantidad
  // total del carrito. Delegado al helper centralizado en lib/pricing.ts.
  const calculatePrice = (product: Product, totalCartQuantity: number): number => {
    return getBaseUnitPrice(product, totalCartQuantity);
  };

  // Total del carrito. Incluye recargos por talla (2XL/3XL/4XL).
  const cartTotal = cart.reduce((total, item) => {
    return total + getUnitPrice(item.product, item.size, cartItemCount) * item.quantity;
  }, 0);

  const addToCart = (item: CartItem) => {
    // `customizationImages` (vistas frontal/trasera/manga) solo se usa en el
    // preview interactivo de ProductDetail — nunca en carrito/checkout. En
    // productos creados antes de migrar a Supabase Storage, este campo puede
    // traer varias imágenes en base64 embebidas (~1-3MB CADA UNA). Guardar
    // eso en el carrito y por ende en localStorage revienta la cuota de
    // Safari en iPhone con solo 3-4 artículos, tirando una excepción sin
    // capturar que —sin Error Boundary— desmonta toda la app dejando la
    // pantalla en blanco/gris. Lo quitamos aquí, en el único punto de
    // entrada al carrito, para blindar cualquier caller presente o futuro.
    const { customizationImages, ...safeProduct } = item.product;
    const safeItem: CartItem = { ...item, product: safeProduct as typeof item.product };

    setCart(prev => {
      const existingItemIndex = prev.findIndex(
        i => i.product.id === safeItem.product.id &&
             i.size === safeItem.size &&
             i.color === safeItem.color &&
             i.isCustom === safeItem.isCustom
      );

      if (existingItemIndex > -1) {
        const newCart = [...prev];
        newCart[existingItemIndex] = {
          ...newCart[existingItemIndex],
          quantity: newCart[existingItemIndex].quantity + safeItem.quantity,
        };
        return newCart;
      }

      return [...prev, safeItem];
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
    role: string,
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

  const addOrder = async (order: Order) => {
    // Persistimos primero en Supabase. Si el insert falla, propagamos el
    // error al caller (Checkout) para que muestre error al cliente y NO
    // pierda la orden. Antes esto era fire-and-forget y una orden que
    // fallaba en el backend igual mostraba "pedido realizado" al cliente
    // — perdiendo la venta silenciosamente.
    await ordersApi.createOrder(order);
    // Solo tras confirmar el guardado, insertamos localmente para que la
    // pantalla de confirmación / admin lo refleje al instante.
    setOrders(prev => [order, ...prev]);
  };

  const refreshOrders = async () => {
    try {
      setOrders(await ordersApi.listOrders());
    } catch { /* sin sesión de staff */ }
  };

  const updateOrderStatus = (orderId: string, status: Order['status']) => {
    setOrders(prev => prev.map(order =>
      order.id === orderId ? { ...order, status, updatedAt: new Date().toISOString() } : order
    ));
    ordersApi.updateStatus(orderId, status)
      .then(refreshOrders) // trae el historial que anota la base
      .catch((err) => {
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
        productsLoading,
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
        refreshOrders,
        newOrdersCount,
        markOrdersSeen,
        onNewOrder,
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
        subcategories,
        refreshSubcategories,
        addSubcategory,
        deleteSubcategory,
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