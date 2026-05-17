import { useApp } from '../context';
import { useNavigate } from 'react-router';
import { useEffect, useState } from 'react';
import AdminNav from '../components/AdminNav';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';
import type { PaymentInfo, PaymentMethod } from '../types';

export default function AdminPaymentInfo() {
  const { currentUser, paymentInfo, addPaymentInfo, updatePaymentInfo, deletePaymentInfo } = useApp();
  const navigate = useNavigate();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingInfo, setEditingInfo] = useState<PaymentInfo | null>(null);
  const [formData, setFormData] = useState<Partial<PaymentInfo>>({
    method: 'zelle',
    active: true,
  });

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/admin/login');
    }
  }, [currentUser, navigate]);

  if (!currentUser || currentUser.role !== 'admin') return null;

  const handleOpenAddModal = () => {
    setFormData({
      method: 'zelle',
      active: true,
    });
    setEditingInfo(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (info: PaymentInfo) => {
    setFormData(info);
    setEditingInfo(info);
    setIsAddModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.method) {
      toast.error('Selecciona un método de pago');
      return;
    }

    if (editingInfo) {
      updatePaymentInfo(editingInfo.id, formData);
      toast.success('Información de pago actualizada');
    } else {
      addPaymentInfo(formData as Omit<PaymentInfo, 'id'>);
      toast.success('Información de pago agregada');
    }

    setIsAddModalOpen(false);
    setFormData({ method: 'zelle', active: true });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar esta información de pago?')) {
      deletePaymentInfo(id);
      toast.success('Información de pago eliminada');
    }
  };

  const getMethodIcon = (method: PaymentMethod) => {
    switch (method) {
      case 'zelle': return '💵';
      case 'binance': return '₿';
      case 'pago_movil': return '📱';
      case 'transferencia': return '🏦';
      case 'pesos_colombianos': return '🇨🇴';
      default: return '💳';
    }
  };

  const getMethodLabel = (method: PaymentMethod) => {
    switch (method) {
      case 'zelle': return 'Zelle';
      case 'binance': return 'Binance';
      case 'pago_movil': return 'Pago Móvil';
      case 'transferencia': return 'Transferencia Bancaria';
      case 'pesos_colombianos': return 'Pesos Colombianos';
      default: return method;
    }
  };

  return (
    <div className="bg-black min-h-screen">
      <AdminNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl">Métodos de Pago Alternativos</h1>
          <Button
            onClick={handleOpenAddModal}
            className="bg-white text-black hover:bg-gray-200"
          >
            + Agregar Método de Pago
          </Button>
        </div>

        {paymentInfo.length === 0 ? (
          <div className="bg-card p-12 rounded-lg text-center">
            <p className="text-muted-foreground mb-4">No hay métodos de pago configurados</p>
            <Button onClick={handleOpenAddModal} className="bg-white text-black hover:bg-gray-200">
              Agregar Primer Método
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {paymentInfo.map(info => (
              <div key={info.id} className="bg-card p-6 rounded-lg border-2 border-border">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl">{getMethodIcon(info.method)}</span>
                    <div>
                      <h3 className="text-xl">{getMethodLabel(info.method)}</h3>
                      <span className={`text-xs ${info.active ? 'text-green-400' : 'text-red-400'}`}>
                        {info.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-4 text-sm">
                  {info.accountName && (
                    <p><span className="text-muted-foreground">Nombre:</span> {info.accountName}</p>
                  )}

                  {/* Zelle Fields */}
                  {info.method === 'zelle' && (
                    <>
                      {info.zelleEmail && (
                        <p><span className="text-muted-foreground">Email:</span> {info.zelleEmail}</p>
                      )}
                      {info.zellePhone && (
                        <p><span className="text-muted-foreground">Teléfono:</span> {info.zellePhone}</p>
                      )}
                    </>
                  )}

                  {/* Binance Fields */}
                  {info.method === 'binance' && (
                    <>
                      {info.binanceEmail && (
                        <p><span className="text-muted-foreground">Email:</span> {info.binanceEmail}</p>
                      )}
                      {info.binanceId && (
                        <p><span className="text-muted-foreground">ID:</span> {info.binanceId}</p>
                      )}
                      {info.binanceWallet && (
                        <p><span className="text-muted-foreground">Wallet:</span> {info.binanceWallet}</p>
                      )}
                    </>
                  )}

                  {/* Pago Móvil Fields */}
                  {info.method === 'pago_movil' && (
                    <>
                      {info.pagoMovilBank && (
                        <p><span className="text-muted-foreground">Banco:</span> {info.pagoMovilBank}</p>
                      )}
                      {info.pagoMovilPhone && (
                        <p><span className="text-muted-foreground">Teléfono:</span> {info.pagoMovilPhone}</p>
                      )}
                      {info.pagoMovilId && (
                        <p><span className="text-muted-foreground">Cédula:</span> {info.pagoMovilId}</p>
                      )}
                    </>
                  )}

                  {/* Transferencia Fields */}
                  {info.method === 'transferencia' && (
                    <>
                      {info.bankName && (
                        <p><span className="text-muted-foreground">Banco:</span> {info.bankName}</p>
                      )}
                      {info.accountNumber && (
                        <p><span className="text-muted-foreground">Número de Cuenta:</span> {info.accountNumber}</p>
                      )}
                      {info.accountType && (
                        <p><span className="text-muted-foreground">Tipo:</span> {info.accountType}</p>
                      )}
                      {info.routingNumber && (
                        <p><span className="text-muted-foreground">Routing:</span> {info.routingNumber}</p>
                      )}
                    </>
                  )}

                  {/* Pesos Colombianos Fields */}
                  {info.method === 'pesos_colombianos' && (
                    <>
                      {info.colombiaBank && (
                        <p><span className="text-muted-foreground">Banco:</span> {info.colombiaBank}</p>
                      )}
                      {info.colombiaAccountNumber && (
                        <p><span className="text-muted-foreground">Número de Cuenta:</span> {info.colombiaAccountNumber}</p>
                      )}
                      {info.colombiaAccountType && (
                        <p><span className="text-muted-foreground">Tipo:</span> {info.colombiaAccountType}</p>
                      )}
                      {info.colombiaDocumentType && info.colombiaDocumentNumber && (
                        <p><span className="text-muted-foreground">{info.colombiaDocumentType}:</span> {info.colombiaDocumentNumber}</p>
                      )}
                    </>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleOpenEditModal(info)}
                    variant="outline"
                    className="flex-1 border-border"
                  >
                    Editar
                  </Button>
                  <Button
                    onClick={() => handleDelete(info.id)}
                    variant="outline"
                    className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="bg-card border-border text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingInfo ? 'Editar Método de Pago' : 'Agregar Método de Pago'}</DialogTitle>
            <DialogDescription>
              {editingInfo ? 'Actualiza la información del método de pago.' : 'Configura un nuevo método de pago alternativo.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm mb-2">Método de Pago *</label>
              <select
                value={formData.method}
                onChange={(e) => setFormData({ ...formData, method: e.target.value as PaymentMethod })}
                className="w-full bg-secondary border border-border rounded-md px-4 py-2 text-white"
                required
              >
                <option value="zelle">💵 Zelle</option>
                <option value="binance">₿ Binance</option>
                <option value="pago_movil">📱 Pago Móvil</option>
                <option value="transferencia">🏦 Transferencia Bancaria</option>
                <option value="pesos_colombianos">🇨🇴 Pesos Colombianos</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-2">Nombre del Titular</label>
              <input
                type="text"
                value={formData.accountName || ''}
                onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                className="w-full bg-secondary border border-border rounded-md px-4 py-2 text-white"
                placeholder="Nombre completo"
              />
            </div>

            {/* Zelle Fields */}
            {formData.method === 'zelle' && (
              <>
                <div>
                  <label className="block text-sm mb-2">Email de Zelle</label>
                  <input
                    type="email"
                    value={formData.zelleEmail || ''}
                    onChange={(e) => setFormData({ ...formData, zelleEmail: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-md px-4 py-2 text-white"
                    placeholder="email@ejemplo.com"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">Teléfono de Zelle</label>
                  <input
                    type="tel"
                    value={formData.zellePhone || ''}
                    onChange={(e) => setFormData({ ...formData, zellePhone: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-md px-4 py-2 text-white"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </>
            )}

            {/* Binance Fields */}
            {formData.method === 'binance' && (
              <>
                <div>
                  <label className="block text-sm mb-2">Email de Binance</label>
                  <input
                    type="email"
                    value={formData.binanceEmail || ''}
                    onChange={(e) => setFormData({ ...formData, binanceEmail: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-md px-4 py-2 text-white"
                    placeholder="email@ejemplo.com"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">ID de Binance</label>
                  <input
                    type="text"
                    value={formData.binanceId || ''}
                    onChange={(e) => setFormData({ ...formData, binanceId: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-md px-4 py-2 text-white"
                    placeholder="123456789"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">Dirección de Wallet</label>
                  <input
                    type="text"
                    value={formData.binanceWallet || ''}
                    onChange={(e) => setFormData({ ...formData, binanceWallet: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-md px-4 py-2 text-white"
                    placeholder="0x..."
                  />
                </div>
              </>
            )}

            {/* Pago Móvil Fields */}
            {formData.method === 'pago_movil' && (
              <>
                <div>
                  <label className="block text-sm mb-2">Banco</label>
                  <input
                    type="text"
                    value={formData.pagoMovilBank || ''}
                    onChange={(e) => setFormData({ ...formData, pagoMovilBank: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-md px-4 py-2 text-white"
                    placeholder="Banco de Venezuela"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">Teléfono</label>
                  <input
                    type="tel"
                    value={formData.pagoMovilPhone || ''}
                    onChange={(e) => setFormData({ ...formData, pagoMovilPhone: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-md px-4 py-2 text-white"
                    placeholder="0412-1234567"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">Cédula</label>
                  <input
                    type="text"
                    value={formData.pagoMovilId || ''}
                    onChange={(e) => setFormData({ ...formData, pagoMovilId: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-md px-4 py-2 text-white"
                    placeholder="V-12345678"
                  />
                </div>
              </>
            )}

            {/* Transferencia Fields */}
            {formData.method === 'transferencia' && (
              <>
                <div>
                  <label className="block text-sm mb-2">Nombre del Banco</label>
                  <input
                    type="text"
                    value={formData.bankName || ''}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-md px-4 py-2 text-white"
                    placeholder="Bank of America"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">Número de Cuenta</label>
                  <input
                    type="text"
                    value={formData.accountNumber || ''}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-md px-4 py-2 text-white"
                    placeholder="1234567890"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">Tipo de Cuenta</label>
                  <select
                    value={formData.accountType || ''}
                    onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-md px-4 py-2 text-white"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="Corriente">Corriente</option>
                    <option value="Ahorros">Ahorros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-2">Routing Number</label>
                  <input
                    type="text"
                    value={formData.routingNumber || ''}
                    onChange={(e) => setFormData({ ...formData, routingNumber: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-md px-4 py-2 text-white"
                    placeholder="021000021"
                  />
                </div>
              </>
            )}

            {/* Pesos Colombianos Fields */}
            {formData.method === 'pesos_colombianos' && (
              <>
                <div>
                  <label className="block text-sm mb-2">Banco</label>
                  <input
                    type="text"
                    value={formData.colombiaBank || ''}
                    onChange={(e) => setFormData({ ...formData, colombiaBank: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-md px-4 py-2 text-white"
                    placeholder="Bancolombia"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">Número de Cuenta</label>
                  <input
                    type="text"
                    value={formData.colombiaAccountNumber || ''}
                    onChange={(e) => setFormData({ ...formData, colombiaAccountNumber: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-md px-4 py-2 text-white"
                    placeholder="12345678901"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">Tipo de Cuenta</label>
                  <select
                    value={formData.colombiaAccountType || ''}
                    onChange={(e) => setFormData({ ...formData, colombiaAccountType: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-md px-4 py-2 text-white"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="Corriente">Corriente</option>
                    <option value="Ahorros">Ahorros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-2">Tipo de Documento</label>
                  <select
                    value={formData.colombiaDocumentType || ''}
                    onChange={(e) => setFormData({ ...formData, colombiaDocumentType: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-md px-4 py-2 text-white"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="CC">Cédula de Ciudadanía (CC)</option>
                    <option value="CE">Cédula de Extranjería (CE)</option>
                    <option value="NIT">NIT</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-2">Número de Documento</label>
                  <input
                    type="text"
                    value={formData.colombiaDocumentNumber || ''}
                    onChange={(e) => setFormData({ ...formData, colombiaDocumentNumber: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-md px-4 py-2 text-white"
                    placeholder="1234567890"
                  />
                </div>
              </>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="active" className="text-sm">Método activo</label>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1 bg-white text-black hover:bg-gray-200">
                {editingInfo ? 'Actualizar' : 'Agregar'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddModalOpen(false)}
                className="flex-1 border-border"
              >
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
