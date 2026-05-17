import { Link } from 'react-router';

export default function AdminNav() {
  return (
    <nav className="bg-secondary border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/admin/dashboard" className="text-white text-xl">
            PORTAL DE ADMINISTRADOR
          </Link>
          <div className="flex space-x-6">
            <Link
              to="/admin/dashboard"
              className="text-muted-foreground hover:text-white transition-colors"
            >
              Panel
            </Link>
            <Link
              to="/admin/inventory"
              className="text-muted-foreground hover:text-white transition-colors"
            >
              Inventario
            </Link>
            <Link
              to="/admin/orders"
              className="text-muted-foreground hover:text-white transition-colors"
            >
              Pedidos
            </Link>
            <Link
              to="/admin/users"
              className="text-muted-foreground hover:text-white transition-colors"
            >
              Usuarios
            </Link>
            <Link
              to="/admin/locations"
              className="text-muted-foreground hover:text-white transition-colors"
            >
              Ubicaciones
            </Link>
            <Link
              to="/admin/social"
              className="text-muted-foreground hover:text-white transition-colors"
            >
              Redes Sociales
            </Link>
            <Link
              to="/admin/payment-info"
              className="text-muted-foreground hover:text-white transition-colors"
            >
              Métodos de Pago
            </Link>
            <Link
              to="/admin/settings"
              className="text-muted-foreground hover:text-white transition-colors"
            >
              Configuración
            </Link>
            <Link
              to="/"
              className="text-muted-foreground hover:text-white transition-colors"
            >
              Volver a la Tienda
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}