import { Link } from 'react-router';
import { useState } from 'react';
import { Menu, X, Store } from 'lucide-react';
import { useApp } from '../context';

export default function AdminNav() {
  const { currentUser } = useApp();
  const isEmployee = currentUser?.role === 'employee';
  const [mobileOpen, setMobileOpen] = useState(false);

  const homeHref = isEmployee ? '/admin/orders' : '/admin/dashboard';
  const title = isEmployee ? 'PORTAL DE EMPLEADO' : 'PORTAL DE ADMINISTRADOR';

  const adminLinks = [
    { to: '/admin/dashboard', label: 'Panel' },
    { to: '/admin/inventory', label: 'Inventario' },
  ];
  const sharedLinks = [{ to: '/admin/orders', label: 'Pedidos' }];
  const adminLinks2 = [
    { to: '/admin/users', label: 'Usuarios' },
    { to: '/admin/locations', label: 'Ubicaciones' },
    { to: '/admin/social', label: 'Redes Sociales' },
    { to: '/admin/payment-info', label: 'Métodos de Pago' },
    { to: '/admin/settings', label: 'Configuración' },
  ];

  const links = isEmployee ? sharedLinks : [...adminLinks, ...sharedLinks, ...adminLinks2];

  const close = () => setMobileOpen(false);

  return (
    <nav className="bg-secondary border-b border-border sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to={homeHref} className="text-white text-sm md:text-xl truncate" onClick={close}>
            <span className="md:hidden">{isEmployee ? 'Empleado' : 'Admin'}</span>
            <span className="hidden md:inline">{title}</span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex space-x-6 overflow-x-auto items-center">
            {links.map((l) => (
              <Link key={l.to} to={l.to} className="text-muted-foreground hover:text-white transition-colors whitespace-nowrap">
                {l.label}
              </Link>
            ))}
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 bg-white text-black hover:bg-gray-200 px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors"
            >
              <Store className="h-4 w-4" />
              Volver a la Tienda
            </Link>
          </div>

          {/* Mobile actions: persistent shop button + hamburger */}
          <div className="md:hidden flex items-center gap-1">
            <Link
              to="/"
              onClick={close}
              className="inline-flex items-center gap-1 bg-white text-black hover:bg-gray-200 px-2.5 py-1.5 rounded-md text-xs font-medium"
              aria-label="Volver a la Tienda"
            >
              <Store className="h-3.5 w-3.5" />
              Tienda
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="text-white p-2 -mr-2"
              aria-label="Abrir menú"
            >
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu drawer */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border pb-4 space-y-1">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={close}
                className="block py-3 px-2 text-white hover:bg-white/5 rounded transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
