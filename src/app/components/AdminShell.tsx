import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import { useEffect, useState, type ReactNode } from 'react';
import {
  BarChart3,
  Package,
  Boxes,
  Users,
  Receipt,
  UserCog,
  BadgeCheck,
  Truck,
  ScrollText,
  Landmark,
  Contact,
  TrendingDown,
  ArrowLeftRight,
  MapPin,
  Share2,
  CreditCard,
  Settings,
  Bell,
  Store,
  LogOut,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from 'lucide-react';
import { useApp } from '../context';
import { ROLE_LABEL, moduleOfPath, usePerms } from '../lib/perms';
import logo from 'figma:asset/480ee1658c29520edefebbfe9dcbc0d422f8424b.png';
import { useSedes } from '../lib/sedes';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  iconClass: string;
}

const PRINCIPAL: NavItem[] = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: BarChart3, iconClass: 'text-[#2563eb]' },
  { to: '/admin/orders', label: 'Pedidos', icon: Package, iconClass: 'text-[#b45309]' },
  { to: '/admin/inventory', label: 'Inventario', icon: Boxes, iconClass: 'text-[#374151]' },
  { to: '/admin/customers', label: 'Clientes', icon: Contact, iconClass: 'text-[#0891b2]' },
  { to: '/admin/staff', label: 'Personal', icon: UserCog, iconClass: 'text-[#7c3aed]' },
  { to: '/admin/sales', label: 'Ventas y Facturación', icon: Receipt, iconClass: 'text-[#ca8a04]' },
  { to: '/admin/payconf', label: 'Confirmación de pagos', icon: BadgeCheck, iconClass: 'text-[#16a34a]' },
  { to: '/admin/expenses', label: 'Gastos', icon: TrendingDown, iconClass: 'text-[#dc2626]' },
  { to: '/admin/accounts', label: 'Finanzas', icon: Landmark, iconClass: 'text-[#0f766e]' },
  { to: '/admin/finance', label: 'Cambio de divisas', icon: ArrowLeftRight, iconClass: 'text-[#15803d]' },
];

const SISTEMA: NavItem[] = [
  { to: '/admin/users', label: 'Usuarios y permisos', icon: Users, iconClass: 'text-[#4f46e5]' },
  { to: '/admin/suppliers', label: 'Proveedores', icon: Truck, iconClass: 'text-[#b45309]' },
  { to: '/admin/audit', label: 'Registro de actividad', icon: ScrollText, iconClass: 'text-[#78716c]' },
  { to: '/admin/payment-info', label: 'Métodos de pago', icon: CreditCard, iconClass: 'text-[#0f766e]' },
  { to: '/admin/locations', label: 'Ubicaciones', icon: MapPin, iconClass: 'text-[#dc2626]' },
  { to: '/admin/social', label: 'Redes sociales', icon: Share2, iconClass: 'text-[#9333ea]' },
  { to: '/admin/settings', label: 'Ajustes de tienda', icon: Settings, iconClass: 'text-[#6b7280]' },
];

const ALL_ITEMS = [...PRINCIPAL, ...SISTEMA];

function initials(name?: string) {
  if (!name) return 'A';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'A';
}

export default function AdminShell({ children }: { children: ReactNode }) {
  const { currentUser, newOrdersCount, logout } = useApp();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const { can, isAdmin } = usePerms();
  const roleLabel = isAdmin ? 'Administrador Principal' : (ROLE_LABEL[currentUser?.role ?? ''] ?? 'Personal').replace(/^\S+\s/, '');
  const allowed = (i: NavItem) => { const m = moduleOfPath(i.to); return !m || can(m); };
  const principal = PRINCIPAL.filter(allowed);
  const sistema = SISTEMA.filter(allowed);
  const pageTitle = ALL_ITEMS.find((i) => pathname.startsWith(i.to))?.label ?? 'Admin';

  // Activa el tema claro del admin en <html> para que también aplique a
  // diálogos/popovers (que Radix monta fuera de este árbol).
  useEffect(() => {
    document.documentElement.classList.add('admin-light');
    return () => document.documentElement.classList.remove('admin-light');
  }, []);

  useEffect(() => setMobileOpen(false), [pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const showBadge = item.to === '/admin/orders' && newOrdersCount > 0;
    return (
      <NavLink
        key={item.to}
        to={item.to}
        title={collapsed ? item.label : undefined}
        className={({ isActive }) =>
          `relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-colors ${
            isActive ? 'bg-[#ececef] text-[#111] font-medium' : 'text-[#3f3f46] hover:bg-[#f1f1f3]'
          } ${collapsed ? 'lg:justify-center lg:px-2' : ''}`
        }
      >
        <Icon className={`h-4 w-4 shrink-0 ${item.iconClass}`} />
        <span className={collapsed ? 'lg:hidden' : ''}>{item.label}</span>
        {showBadge && (
          <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-[10px] font-bold [color:#fff]">
            {newOrdersCount > 9 ? '9+' : newOrdersCount}
          </span>
        )}
      </NavLink>
    );
  };

  const sidebar = (
    <div className="flex h-full flex-col bg-[#fff]">
      <div className={`flex h-14 items-center gap-2 px-4 border-b border-[#ececef] ${collapsed ? 'lg:justify-center lg:px-2' : ''}`}>
        <Link to={principal[0]?.to ?? '/admin/orders'} className="flex items-center gap-2 min-w-0">
          <img src={logo} alt="ELEMENTAL" className={`h-6 w-auto invert ${collapsed ? 'lg:hidden' : ''}`} />
          <span className={`text-[9px] tracking-[0.25em] text-[#6b7280] ${collapsed ? 'lg:hidden' : ''}`}>ADMIN</span>
        </Link>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="ml-auto hidden lg:inline-flex p-1.5 rounded-md text-[#6b7280] hover:bg-[#f1f1f3]"
          aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="ml-auto lg:hidden p-1.5 rounded-md text-[#6b7280]"
          aria-label="Cerrar menú"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div className="space-y-0.5">
          <p className={`px-3 pb-2 text-[10px] font-medium tracking-[0.12em] text-[#71717a] ${collapsed ? 'lg:hidden' : ''}`}>
            PRINCIPAL
          </p>
          {principal.map(renderItem)}
        </div>
        {sistema.length > 0 && (
          <div className="space-y-0.5">
            <p className={`px-3 pb-2 text-[10px] font-medium tracking-[0.12em] text-[#71717a] ${collapsed ? 'lg:hidden' : ''}`}>
              SISTEMA
            </p>
            {sistema.map(renderItem)}
          </div>
        )}
      </nav>

      <div className="border-t border-[#ececef] p-3 space-y-2">
        <div className={`flex items-center gap-3 px-1 ${collapsed ? 'lg:justify-center' : ''}`}>
          <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#db2777] flex items-center justify-center text-[11px] font-semibold [color:#fff]">
            {initials(currentUser?.name)}
          </div>
          <div className={`min-w-0 ${collapsed ? 'lg:hidden' : ''}`}>
            <p className="truncate text-[13px] font-semibold text-[#111]">{currentUser?.name ?? 'Admin'}</p>
            <p className="truncate text-[11px] text-[#6b7280]">{roleLabel}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12px] text-[#6b7280] hover:bg-[#f1f1f3] hover:text-[#111] ${collapsed ? 'lg:justify-center' : ''}`}
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className={collapsed ? 'lg:hidden' : ''}>Cerrar sesión</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f6f6f7] text-[#111]">
      {/* Sidebar desktop */}
      <aside
        className={`hidden lg:block fixed inset-y-0 left-0 z-30 border-r border-[#ececef] transition-[width] duration-200 ${
          collapsed ? 'w-[68px]' : 'w-[220px]'
        }`}
      >
        {sidebar}
      </aside>

      {/* Sidebar móvil (drawer) */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-[#000]/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[260px] shadow-xl">{sidebar}</aside>
        </div>
      )}

      <div className={`transition-[padding] duration-200 ${collapsed ? 'lg:pl-[68px]' : 'lg:pl-[220px]'}`}>
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-[#ececef] bg-[#f6f6f7]/90 backdrop-blur px-4 lg:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="lg:hidden -ml-1 p-1.5 rounded-md text-[#111] hover:bg-[#ececef]"
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-[15px] font-bold text-[#111] truncate">{pageTitle}</h1>

          <SedePicker />

          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/admin/orders"
              className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#e6e6e9] bg-[#fff] text-[#b45309] hover:bg-[#f1f1f3]"
              aria-label="Pedidos nuevos"
            >
              <Bell className="h-4 w-4" />
              {newOrdersCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[9px] font-bold leading-4 text-center [color:#fff]">
                  {newOrdersCount > 9 ? '9+' : newOrdersCount}
                </span>
              )}
            </Link>
            <div className="hidden sm:flex h-8 items-center gap-1.5 rounded-lg border border-[#e6e6e9] bg-[#fff] px-3 text-[11px] text-[#111]">
              <span className="font-medium">{currentUser?.name ?? 'Admin'}</span>
              <span className="text-[#6b7280]">· {roleLabel}</span>
            </div>
            <Link
              to="/"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#111] px-3 text-[12px] font-medium [color:#fff] hover:bg-[#27272a]"
            >
              <Store className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Ver tienda</span>
            </Link>
          </div>
        </header>

        <main>{children}</main>
      </div>
    </div>
  );
}

// Selector de sede: decide qué se ve en todo el panel. Vacío = todas juntas.
function SedePicker() {
  const { sedes, sede, setSede, ready } = useSedes();
  if (!ready || sedes.length < 2) return null;
  return (
    <select
      value={sede}
      onChange={(e) => setSede(e.target.value)}
      title="Sede que estás viendo"
      className="h-8 rounded-lg border border-[#e6e6e9] bg-[#fff] px-2 text-[12px] font-medium text-[#111] max-w-[180px]"
    >
      <option value="">🏢 Todas las sedes</option>
      {sedes.filter((s) => s.active).map((s) => (
        <option key={s.id} value={s.id}>{s.code}</option>
      ))}
    </select>
  );
}
