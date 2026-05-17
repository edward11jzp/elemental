import { useApp } from '../context';
import { useNavigate } from 'react-router';
import { useEffect, useState } from 'react';
import AdminNav from '../components/AdminNav';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';

export default function AdminOrders() {
  const { currentUser, orders, updateOrderStatus } = useApp();
  const navigate = useNavigate();
  const [selectedOrder, setSelectedOrder] = useState<typeof orders[0] | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/admin/login');
    }
  }, [currentUser, navigate]);

  if (!currentUser || currentUser.role !== 'admin') return null;

  const filteredOrders = statusFilter === 'all'
    ? orders
    : orders.filter(o => o.status === statusFilter);

  const handleStatusChange = (orderId: string, status: string) => {
    updateOrderStatus(orderId, status as any);
    const statusMessages: Record<string, string> = {
      'approved': '¡Pedido aprobado!',
      'rejected': 'Pedido rechazado',
      'in_progress': 'Pedido en proceso',
      'completed': '¡Pedido completado!',
    };
    toast.success(statusMessages[status] || 'Estado actualizado');
    setSelectedOrder(null);
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

  return (
    <div className="bg-black min-h-screen">
      <AdminNav />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl mb-8">Gestión de Pedidos</h1>

        {/* Filter */}
        <div className="bg-card p-6 rounded-lg mb-6">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-secondary border border-border rounded-md px-4 py-2 text-white"
          >
            <option value="all">Todos los Pedidos</option>
            <option value="pending">Pendiente</option>
            <option value="approved">Aprobado</option>
            <option value="in_progress">En Proceso</option>
            <option value="completed">Listo</option>
            <option value="rejected">Rechazado</option>
          </select>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="bg-card p-12 rounded-lg text-center">
            <p className="text-muted-foreground">No se encontraron pedidos</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map(order => (
              <div key={order.id} className="bg-card p-6 rounded-lg">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl mb-1">Order #{order.id}</h3>
                    <p className="text-sm text-muted-foreground">
                      Customer: {order.customerName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Date: {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold mb-2 ${
                      order.status === 'pending' ? 'text-yellow-400' :
                      order.status === 'approved' ? 'text-green-400' :
                      order.status === 'in_progress' ? 'text-blue-400' :
                      order.status === 'completed' ? 'text-purple-400' :
                      'text-red-400'
                    }`}>
                      {getStatusLabel(order.status)}
                    </p>
                    <p className="text-2xl">${order.total.toFixed(2)}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="text-sm text-muted-foreground mb-2">Artículos:</h4>
                  <div className="space-y-2">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-4 text-sm">
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          className="w-10 h-10 object-cover rounded"
                        />
                        <div className="flex-1">
                          <p>{item.product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.size} / {item.color} × {item.quantity}
                          </p>
                        </div>
                        {item.isCustom && (
                          <span className="text-xs bg-secondary px-2 py-1 rounded">
                            Personalizado
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {order.notes && (
                  <div className="mb-4 p-4 bg-secondary rounded">
                    <p className="text-sm text-muted-foreground mb-1">Notas del Cliente:</p>
                    <p className="text-sm">{order.notes}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => setSelectedOrder(order)}
                    variant="outline"
                    className="border-border"
                  >
                    Ver Detalles
                  </Button>
                  {order.status === 'pending' && (
                    <>
                      <Button
                        onClick={() => handleStatusChange(order.id, 'approved')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Aprobar
                      </Button>
                      <Button
                        onClick={() => handleStatusChange(order.id, 'rejected')}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Rechazar
                      </Button>
                    </>
                  )}
                  {order.status === 'approved' && (
                    <Button
                      onClick={() => handleStatusChange(order.id, 'in_progress')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Iniciar Proceso
                    </Button>
                  )}
                  {order.status === 'in_progress' && (
                    <Button
                      onClick={() => handleStatusChange(order.id, 'completed')}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      Marcar Listo
                    </Button>
                  )}
                  {order.status === 'completed' && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-purple-900/20 border border-purple-500/30 rounded-md">
                      <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-purple-400 text-sm font-medium">Completado</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="bg-card border-border text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalles del Pedido</DialogTitle>
            <DialogDescription>
              Información completa del pedido seleccionado.
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">ID del Pedido</p>
                <p>{selectedOrder.id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p>{selectedOrder.customerName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl">${selectedOrder.total.toFixed(2)}</p>
              </div>

              {/* Payment Information */}
              {selectedOrder.paymentMethod && (
                <div className="bg-secondary/50 border border-border rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-2">Método de Pago</p>
                  <p className="font-semibold mb-3">
                    {selectedOrder.paymentMethod === 'card' && '💳 Tarjeta de Crédito/Débito'}
                    {selectedOrder.paymentMethod === 'zelle' && '💵 Zelle'}
                    {selectedOrder.paymentMethod === 'binance' && '₿ Binance'}
                    {selectedOrder.paymentMethod === 'pago_movil' && '📱 Pago Móvil'}
                    {selectedOrder.paymentMethod === 'transferencia' && '🏦 Transferencia Bancaria'}
                    {selectedOrder.paymentMethod === 'pesos_colombianos' && '🇨🇴 Pesos Colombianos'}
                  </p>

                  {selectedOrder.paymentProof && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Comprobante de Pago</p>
                      <img
                        src={selectedOrder.paymentProof}
                        alt="Comprobante de pago"
                        className="w-full max-h-96 object-contain rounded-lg border border-border cursor-pointer"
                        onClick={() => window.open(selectedOrder.paymentProof, '_blank')}
                      />
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        Click en la imagen para ver en tamaño completo
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground mb-2">Artículos</p>
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="flex gap-4 mb-3 p-3 bg-secondary rounded">
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div className="flex-1">
                      <p>{item.product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.size} / {item.color} × {item.quantity}
                      </p>
                      {item.isCustom && (
                        <>
                          <p className="text-sm text-green-400 mt-1">Diseño Personalizado</p>
                          {item.customNotes && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Notas: {item.customNotes}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}