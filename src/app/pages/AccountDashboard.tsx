import { useApp } from '../context';
import { useNavigate, Link } from 'react-router';
import { Button } from '../components/ui/button';
import { useEffect } from 'react';

export default function AccountDashboard() {
  const { currentUser, orders, logout } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser || currentUser.role === 'admin') {
      navigate('/account/login');
    }
  }, [currentUser, navigate]);

  if (!currentUser) return null;

  const userOrders = orders.filter(o => o.customerId === currentUser.id);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-400';
      case 'approved': return 'text-green-400';
      case 'in_progress': return 'text-blue-400';
      case 'completed': return 'text-purple-400';
      case 'rejected': return 'text-red-400';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'pending': 'Pendiente',
      'approved': 'Aprobado',
      'in_progress': 'En Proceso',
      'completed': 'Listo',
      'rejected': 'Rechazado',
    };
    return labels[status] || status;
  };

  const getStatusDescription = (status: string) => {
    const descriptions: Record<string, string> = {
      'pending': 'Tu pedido está en revisión',
      'approved': 'Tu pedido ha sido aprobado',
      'in_progress': 'Tu pedido está siendo procesado',
      'completed': '¡Tu pedido está listo!',
      'rejected': 'Tu pedido fue rechazado',
    };
    return descriptions[status] || '';
  };

  return (
    <div className="bg-black min-h-screen py-12 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-64 h-64 bg-white rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.8s' }}></div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl">Mi Cuenta</h1>
          <Button
            onClick={() => {
              logout();
              navigate('/');
            }}
            variant="outline"
            className="border-border hover:scale-105 transition-transform duration-300"
          >
            Cerrar Sesión
          </Button>
        </div>

        {/* Account Info */}
        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#1C1C1C] p-6 rounded-2xl mb-8 border-2 border-white/10 hover:border-white/20 transition-all duration-300 hover:shadow-2xl hover:shadow-white/5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative z-10">
            <h2 className="text-2xl mb-4">Información de la Cuenta</h2>
            <div className="space-y-2">
              <p><span className="text-muted-foreground">Nombre:</span> {currentUser.name}</p>
              <p><span className="text-muted-foreground">Correo:</span> {currentUser.email}</p>
              <p><span className="text-muted-foreground">Rol:</span> {currentUser.role}</p>
            </div>
          </div>
        </div>

        {/* Orders */}
        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#1C1C1C] p-6 rounded-2xl border-2 border-white/10 hover:border-white/20 transition-all duration-300 hover:shadow-2xl hover:shadow-white/5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative z-10">
            <h2 className="text-2xl mb-6">Mis Pedidos</h2>
            
            {userOrders.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">Aún no hay pedidos</p>
                <Link to="/">
                  <Button className="bg-white text-black hover:bg-gray-200">
                    Comenzar a Comprar
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {userOrders.map(order => (
                  <div key={order.id} className="border border-border rounded-lg p-4 bg-secondary/30">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Pedido #{order.id.split('-')[1]}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl mb-1">${order.total.toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Status indicator */}
                    <div className={`mb-4 p-3 rounded-lg border ${
                      order.status === 'pending' ? 'bg-yellow-900/20 border-yellow-500/30' :
                      order.status === 'approved' ? 'bg-green-900/20 border-green-500/30' :
                      order.status === 'in_progress' ? 'bg-blue-900/20 border-blue-500/30' :
                      order.status === 'completed' ? 'bg-purple-900/20 border-purple-500/30' :
                      'bg-red-900/20 border-red-500/30'
                    }`}>
                      <div className="flex items-center gap-2 mb-3">
                        {order.status === 'completed' && (
                          <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        {order.status === 'in_progress' && (
                          <svg className="w-5 h-5 text-blue-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        )}
                        {order.status === 'pending' && (
                          <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        {order.status === 'approved' && (
                          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        <div>
                          <p className={`font-semibold ${getStatusColor(order.status)}`}>
                            {getStatusLabel(order.status)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {getStatusDescription(order.status)}
                          </p>
                        </div>
                      </div>

                      {/* Progress timeline for non-rejected orders */}
                      {order.status !== 'rejected' && (
                        <div className="flex items-center gap-2 text-xs">
                          <div className="flex items-center gap-1">
                            <div className={`w-3 h-3 rounded-full ${
                              ['pending', 'approved', 'in_progress', 'completed'].includes(order.status)
                                ? 'bg-yellow-400'
                                : 'bg-gray-600'
                            }`}></div>
                            <span className="text-muted-foreground">Pendiente</span>
                          </div>
                          <div className={`h-0.5 w-8 ${
                            ['approved', 'in_progress', 'completed'].includes(order.status)
                              ? 'bg-green-400'
                              : 'bg-gray-600'
                          }`}></div>
                          <div className="flex items-center gap-1">
                            <div className={`w-3 h-3 rounded-full ${
                              ['approved', 'in_progress', 'completed'].includes(order.status)
                                ? 'bg-green-400'
                                : 'bg-gray-600'
                            }`}></div>
                            <span className="text-muted-foreground">Aprobado</span>
                          </div>
                          <div className={`h-0.5 w-8 ${
                            ['in_progress', 'completed'].includes(order.status)
                              ? 'bg-blue-400'
                              : 'bg-gray-600'
                          }`}></div>
                          <div className="flex items-center gap-1">
                            <div className={`w-3 h-3 rounded-full ${
                              ['in_progress', 'completed'].includes(order.status)
                                ? 'bg-blue-400'
                                : 'bg-gray-600'
                            }`}></div>
                            <span className="text-muted-foreground">En Proceso</span>
                          </div>
                          <div className={`h-0.5 w-8 ${
                            order.status === 'completed'
                              ? 'bg-purple-400'
                              : 'bg-gray-600'
                          }`}></div>
                          <div className="flex items-center gap-1">
                            <div className={`w-3 h-3 rounded-full ${
                              order.status === 'completed'
                                ? 'bg-purple-400'
                                : 'bg-gray-600'
                            }`}></div>
                            <span className="text-muted-foreground">Listo</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex gap-4 items-center">
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                          <div className="flex-1">
                            <p className="text-sm">{item.product.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.size} / {item.color} × {item.quantity}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {order.paymentMethod && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-xs text-muted-foreground mb-1">Método de Pago</p>
                        <p className="text-sm">
                          {order.paymentMethod === 'card' && '💳 Tarjeta de Crédito/Débito'}
                          {order.paymentMethod === 'zelle' && '💵 Zelle'}
                          {order.paymentMethod === 'binance' && '₿ Binance'}
                          {order.paymentMethod === 'pago_movil' && '📱 Pago Móvil'}
                          {order.paymentMethod === 'transferencia' && '🏦 Transferencia Bancaria'}
                          {order.paymentMethod === 'pesos_colombianos' && '🇨🇴 Pesos Colombianos'}
                        </p>
                      </div>
                    )}

                    {order.notes && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-sm text-muted-foreground">Notas: {order.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}