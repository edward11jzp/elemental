import { useApp } from '../context';
import { useNavigate } from 'react-router';
import { useEffect } from 'react';
import AdminNav from '../components/AdminNav';
import { Package, ShoppingCart, Users, AlertCircle } from 'lucide-react';

export default function AdminDashboard() {
  const { currentUser, orders, products } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/admin/login');
    }
  }, [currentUser, navigate]);

  if (!currentUser || currentUser.role !== 'admin') return null;

  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const approvedOrders = orders.filter(o => o.status === 'approved').length;
  const inProgressOrders = orders.filter(o => o.status === 'in_progress').length;
  const completedOrders = orders.filter(o => o.status === 'completed').length;
  const totalRevenue = orders
    .filter(o => ['approved', 'in_progress', 'completed'].includes(o.status))
    .reduce((sum, o) => sum + o.total, 0);
  const lowStockProducts = products.filter(p => p.stock < 50).length;

  return (
    <div className="bg-black min-h-screen">
      <AdminNav />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl mb-8">Panel de Administrador</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-gradient-to-br from-yellow-900/20 to-yellow-800/10 border border-yellow-500/30 p-6 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm text-yellow-200/80">Pendientes</h3>
              <ShoppingCart className="h-5 w-5 text-yellow-400" />
            </div>
            <p className="text-3xl text-yellow-400">{pendingOrders}</p>
            <p className="text-xs text-yellow-200/60 mt-1">Requieren aprobación</p>
          </div>

          <div className="bg-gradient-to-br from-green-900/20 to-green-800/10 border border-green-500/30 p-6 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm text-green-200/80">Aprobados</h3>
              <ShoppingCart className="h-5 w-5 text-green-400" />
            </div>
            <p className="text-3xl text-green-400">{approvedOrders}</p>
            <p className="text-xs text-green-200/60 mt-1">Listos para procesar</p>
          </div>

          <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border border-blue-500/30 p-6 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm text-blue-200/80">En Proceso</h3>
              <Package className="h-5 w-5 text-blue-400" />
            </div>
            <p className="text-3xl text-blue-400">{inProgressOrders}</p>
            <p className="text-xs text-blue-200/60 mt-1">Procesando actualmente</p>
          </div>

          <div className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 border border-purple-500/30 p-6 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm text-purple-200/80">Completados</h3>
              <ShoppingCart className="h-5 w-5 text-purple-400" />
            </div>
            <p className="text-3xl text-purple-400">{completedOrders}</p>
            <p className="text-xs text-purple-200/60 mt-1">Listos para recoger</p>
          </div>
        </div>

        {/* Revenue Card */}
        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#1C1C1C] border-2 border-white/10 p-6 rounded-2xl mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-muted-foreground mb-2">Ingresos Totales</h3>
              <p className="text-4xl text-white">${totalRevenue.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {orders.filter(o => ['approved', 'in_progress', 'completed'].includes(o.status)).length} pedidos
              </p>
            </div>
            <div className="bg-green-500/20 p-4 rounded-full">
              <Package className="h-8 w-8 text-green-400" />
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-card p-6 rounded-lg mb-8">
          <h2 className="text-2xl mb-6">Pedidos Recientes</h2>
          {orders.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Aún no hay pedidos</p>
          ) : (
            <div className="space-y-4">
              {orders.slice(0, 5).map(order => (
                <div key={order.id} className="flex justify-between items-center border-b border-border pb-4">
                  <div>
                    <p>Order #{order.id}</p>
                    <p className="text-sm text-muted-foreground">{order.customerName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">
                      <span className={`font-semibold
                        ${order.status === 'pending' ? 'text-yellow-400' : ''}
                        ${order.status === 'approved' ? 'text-green-400' : ''}
                        ${order.status === 'in_progress' ? 'text-blue-400' : ''}
                        ${order.status === 'completed' ? 'text-purple-400' : ''}
                        ${order.status === 'rejected' ? 'text-red-400' : ''}
                      `}>
                        {order.status === 'pending' ? 'Pendiente' :
                         order.status === 'approved' ? 'Aprobado' :
                         order.status === 'in_progress' ? 'En Proceso' :
                         order.status === 'completed' ? 'Listo' :
                         'Rechazado'}
                      </span>
                    </p>
                    <p>${order.total.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Inventory Alerts */}
        <div className="bg-card p-6 rounded-lg">
          <h2 className="text-2xl mb-6">Alertas de Inventario</h2>
          {lowStockProducts === 0 ? (
            <p className="text-muted-foreground text-center py-8">Todos los productos bien surtidos</p>
          ) : (
            <div className="space-y-4">
              {products
                .filter(p => p.stock < 50)
                .slice(0, 5)
                .map(product => (
                  <div key={product.id} className="flex justify-between items-center border-b border-border pb-4">
                    <div className="flex items-center gap-4">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                      <div>
                        <p>{product.name}</p>
                        <p className="text-sm text-muted-foreground">{product.category}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-red-400">{product.stock} restantes</p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}