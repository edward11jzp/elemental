import { useApp } from '../context';
import { useNavigate } from 'react-router';
import { useEffect, useState } from 'react';
import AdminNav from '../components/AdminNav';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';
import {
  Mail, Phone, MessageCircle, MapPin, Truck, Store, Search, X,
  Clock, CheckCircle2, Loader2, Sparkles, PackageCheck, XCircle, Eye,
  ThumbsUp, ThumbsDown, Play, Package, ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Input } from '../components/ui/input';

export default function AdminOrders() {
  const { currentUser, orders, updateOrderStatus, users } = useApp();

  // Fallback: if order doesn't have email/phone, try looking them up by customerId
  const resolveContact = (order: typeof orders[0]) => {
    const user = users.find((u) => u.id === order.customerId);
    return {
      email: order.customerEmail || user?.email,
      phone: order.customerPhone || user?.phone,
      address: order.customerAddress,
      city: order.customerCity,
    };
  };

  // Build a WhatsApp link from a phone number (strip non-digits, prepend country code if missing)
  const toWhatsApp = (phone?: string) => {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, '');
    if (!digits) return null;
    // Assume Venezuela (+58) if number starts with 0; otherwise use as-is
    const intl = digits.startsWith('0') ? `58${digits.slice(1)}` : digits;
    return `https://wa.me/${intl}`;
  };
  const navigate = useNavigate();
  const [selectedOrder, setSelectedOrder] = useState<typeof orders[0] | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'employee')) {
      navigate('/admin/login');
    }
  }, [currentUser, navigate]);

  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'employee')) return null;

  // Normalize a phone string: strip non-digits for comparison
  const normalizePhone = (s: string) => s.replace(/\D/g, '');

  const queryDigits = normalizePhone(searchQuery);
  const queryLower = searchQuery.trim().toLowerCase();

  const filteredOrders = orders.filter((o) => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (!queryLower) return true;
    const c = resolveContact(o);
    const phoneDigits = normalizePhone(c.phone || '');
    // Match by order id (tracking number) or by phone (any partial digits)
    const matchesId = o.id.toLowerCase().includes(queryLower);
    const matchesPhone = queryDigits.length >= 3 && phoneDigits.includes(queryDigits);
    const matchesName = o.customerName?.toLowerCase().includes(queryLower);
    return matchesId || matchesPhone || matchesName;
  });

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

  const STATUS_META: Record<string, { label: string; icon: any; color: string; ring: string; pulse: boolean }> = {
    pending:     { label: 'Pendiente',  icon: Clock,        color: 'text-yellow-300 bg-yellow-400/15 border-yellow-400/30',  ring: 'ring-yellow-400/40',  pulse: true },
    approved:    { label: 'Aprobado',   icon: CheckCircle2, color: 'text-green-300 bg-green-400/15 border-green-400/30',     ring: 'ring-green-400/40',   pulse: false },
    in_progress: { label: 'En Proceso', icon: Loader2,      color: 'text-blue-300 bg-blue-400/15 border-blue-400/30',         ring: 'ring-blue-400/40',    pulse: false },
    completed:   { label: 'Listo',      icon: PackageCheck, color: 'text-purple-300 bg-purple-400/15 border-purple-400/30',   ring: 'ring-purple-400/40',  pulse: false },
    rejected:    { label: 'Rechazado',  icon: XCircle,      color: 'text-red-300 bg-red-400/15 border-red-400/30',            ring: 'ring-red-400/40',     pulse: false },
  };

  const statusCounts = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="bg-black min-h-screen">
      <AdminNav />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <motion.h1
          className="text-3xl md:text-4xl mb-6 md:mb-8 font-bold"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          Gestión de Pedidos
        </motion.h1>

        {/* Status quick-filter chips */}
        <motion.div
          className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1 snap-x"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          {[
            { value: 'all', label: 'Todos', count: orders.length, icon: Package },
            ...Object.keys(STATUS_META).map((s) => ({
              value: s,
              label: STATUS_META[s].label,
              count: statusCounts[s] || 0,
              icon: STATUS_META[s].icon,
            })),
          ].map((chip) => {
            const ChipIcon = chip.icon;
            const active = statusFilter === chip.value;
            return (
              <motion.button
                key={chip.value}
                type="button"
                onClick={() => setStatusFilter(chip.value)}
                whileTap={{ scale: 0.94 }}
                className={`group shrink-0 snap-start inline-flex items-center gap-2 px-3.5 py-2 rounded-full border text-sm transition-all ${
                  active
                    ? 'bg-white text-black border-white'
                    : 'bg-secondary border-border text-white hover:border-white/40'
                }`}
              >
                <ChipIcon className="h-3.5 w-3.5" />
                <span className="whitespace-nowrap">{chip.label}</span>
                <span
                  className={`text-[10px] font-semibold rounded-full px-1.5 py-0.5 ${
                    active ? 'bg-black/10 text-black' : 'bg-white/10 text-white/80'
                  }`}
                >
                  {chip.count}
                </span>
              </motion.button>
            );
          })}
        </motion.div>

        {/* Search Bar */}
        <div className="bg-card p-4 md:p-6 rounded-lg mb-6 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por N° de pedido, teléfono o nombre…"
              className="bg-secondary border-border text-white pl-9 pr-9 text-base"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <AnimatePresence>
              {searchQuery && (
                <motion.button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-white"
                  aria-label="Limpiar búsqueda"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                >
                  <X className="h-4 w-4" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
          <AnimatePresence>
            {(searchQuery || statusFilter !== 'all') && (
              <motion.p
                className="text-xs text-muted-foreground"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
              >
                {filteredOrders.length} resultado{filteredOrders.length === 1 ? '' : 's'}
                {searchQuery && ` para "${searchQuery}"`}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <motion.div
            className="bg-card p-12 rounded-lg text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Package className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No se encontraron pedidos</p>
          </motion.div>
        ) : (
          <motion.div
            className="space-y-3 md:space-y-4"
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
            }}
          >
            <AnimatePresence mode="popLayout">
              {filteredOrders.map((order, idx) => {
                const contact = resolveContact(order);
                const wa = toWhatsApp(contact.phone);
                const meta = STATUS_META[order.status] ?? STATUS_META.pending;
                const StatusIcon = meta.icon;
                const hasCustom = order.items.some((i) => i.isCustom);

                return (
                  <motion.div
                    key={order.id}
                    layout
                    variants={{
                      hidden: { opacity: 0, y: 24 },
                      show:   { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
                    }}
                    exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
                    whileHover={{ y: -2 }}
                    transition={{ type: 'spring', stiffness: 240, damping: 22 }}
                    className={`bg-card p-4 md:p-6 rounded-2xl ring-1 ring-white/5 hover:${meta.ring} hover:ring-2 transition-shadow shadow-lg`}
                  >
                    {/* Header: title + status badge */}
                    <div className="flex justify-between items-start gap-3 mb-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">N° de pedido</p>
                        <h3 className="text-base md:text-lg font-mono truncate">{order.id}</h3>
                      </div>
                      <motion.div
                        layout
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold shrink-0 ${meta.color}`}
                      >
                        <StatusIcon className={`h-3.5 w-3.5 ${order.status === 'in_progress' ? 'animate-spin' : ''} ${meta.pulse ? 'animate-pulse' : ''}`} />
                        {meta.label}
                      </motion.div>
                    </div>

                    {/* Customer + total */}
                    <div className="flex flex-wrap justify-between items-baseline gap-2 mb-3">
                      <div>
                        <p className="font-semibold text-white">{order.customerName}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.createdAt).toLocaleString('es-VE', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <p className="text-2xl font-bold text-white">${order.total.toFixed(2)}</p>
                    </div>

                    {/* Contact chips */}
                    {(contact.email || contact.phone) && (
                      <div className="flex flex-wrap items-center gap-1.5 mb-3">
                        {contact.email && (
                          <a
                            href={`mailto:${contact.email}`}
                            className="inline-flex items-center gap-1.5 text-[11px] bg-secondary border border-border hover:border-white/40 text-white rounded-full px-2.5 py-1 transition-colors max-w-full truncate"
                          >
                            <Mail className="h-3 w-3 shrink-0" />
                            <span className="truncate">{contact.email}</span>
                          </a>
                        )}
                        {contact.phone && (
                          <a
                            href={`tel:${contact.phone}`}
                            className="inline-flex items-center gap-1.5 text-[11px] bg-secondary border border-border hover:border-white/40 text-white rounded-full px-2.5 py-1 transition-colors"
                          >
                            <Phone className="h-3 w-3" />
                            {contact.phone}
                          </a>
                        )}
                        {wa && (
                          <a
                            href={wa}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-[11px] bg-green-600/20 border border-green-500/40 hover:border-green-400 text-green-300 rounded-full px-2.5 py-1 transition-colors"
                          >
                            <MessageCircle className="h-3 w-3" />
                            WhatsApp
                          </a>
                        )}
                      </div>
                    )}

                    {/* Items mini-row */}
                    <div className="flex items-center gap-2 -mx-1 px-1 overflow-x-auto pb-1 mb-3">
                      {order.items.map((item, i) => (
                        <div
                          key={i}
                          className="shrink-0 flex items-center gap-2 bg-secondary/60 rounded-lg p-1.5 pr-2.5 border border-border"
                        >
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="w-9 h-9 object-cover rounded-md"
                          />
                          <div className="text-xs">
                            <p className="font-medium truncate max-w-[120px]">{item.product.name}</p>
                            <p className="text-muted-foreground">
                              {item.size}/{item.color} ×{item.quantity}
                            </p>
                          </div>
                        </div>
                      ))}
                      {hasCustom && (
                        <div className="shrink-0 inline-flex items-center gap-1 text-[10px] bg-fuchsia-500/15 border border-fuchsia-400/40 text-fuchsia-200 rounded-full px-2 py-1">
                          <Sparkles className="h-3 w-3" />
                          Personalizado
                        </div>
                      )}
                    </div>

                    {order.notes && (
                      <div className="mb-3 p-3 bg-secondary/40 rounded-lg border border-border">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Notas</p>
                        <p className="text-sm text-white/90">{order.notes}</p>
                      </div>
                    )}

                    {/* Action row */}
                    <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-2 pt-1">
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setSelectedOrder(order)}
                        className="inline-flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/80 border border-border text-white text-sm px-4 py-2.5 rounded-lg transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                        Ver Detalles
                        <ChevronRight className="h-4 w-4 ml-auto sm:ml-0" />
                      </motion.button>

                      {order.status === 'pending' && (
                        <div className="grid grid-cols-2 gap-2">
                          <motion.button
                            whileTap={{ scale: 0.96 }}
                            onClick={() => handleStatusChange(order.id, 'approved')}
                            className="inline-flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-3 py-2.5 rounded-lg"
                          >
                            <ThumbsUp className="h-4 w-4" />
                            Aprobar
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.96 }}
                            onClick={() => handleStatusChange(order.id, 'rejected')}
                            className="inline-flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-3 py-2.5 rounded-lg"
                          >
                            <ThumbsDown className="h-4 w-4" />
                            Rechazar
                          </motion.button>
                        </div>
                      )}
                      {order.status === 'approved' && (
                        <motion.button
                          whileTap={{ scale: 0.96 }}
                          onClick={() => handleStatusChange(order.id, 'in_progress')}
                          className="inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-2.5 rounded-lg"
                        >
                          <Play className="h-4 w-4" />
                          Iniciar Proceso
                        </motion.button>
                      )}
                      {order.status === 'in_progress' && (
                        <motion.button
                          whileTap={{ scale: 0.96 }}
                          onClick={() => handleStatusChange(order.id, 'completed')}
                          className="inline-flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-3 py-2.5 rounded-lg"
                        >
                          <PackageCheck className="h-4 w-4" />
                          Marcar Listo
                        </motion.button>
                      )}
                      {order.status === 'completed' && (
                        <div className="inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-purple-900/20 border border-purple-500/30 rounded-lg text-purple-300 text-sm font-medium">
                          <CheckCircle2 className="h-4 w-4" />
                          Completado
                        </div>
                      )}
                      {order.status === 'rejected' && (
                        <div className="inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-red-900/20 border border-red-500/30 rounded-lg text-red-300 text-sm font-medium">
                          <XCircle className="h-4 w-4" />
                          Rechazado
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
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
              {(() => {
                const c = resolveContact(selectedOrder);
                const wa = toWhatsApp(c.phone);
                if (!c.email && !c.phone && !c.address) return null;
                return (
                  <div className="bg-secondary/40 border border-border rounded-lg p-4 space-y-2">
                    <p className="text-sm text-muted-foreground">Información de Contacto</p>
                    {c.email && (
                      <a href={`mailto:${c.email}`} className="flex items-center gap-2 text-sm hover:text-white text-white/80">
                        <Mail className="h-4 w-4" /> {c.email}
                      </a>
                    )}
                    {c.phone && (
                      <div className="flex items-center gap-2 text-sm text-white/80">
                        <a href={`tel:${c.phone}`} className="flex items-center gap-2 hover:text-white">
                          <Phone className="h-4 w-4" /> {c.phone}
                        </a>
                        {wa && (
                          <a
                            href={wa}
                            target="_blank"
                            rel="noreferrer"
                            className="ml-2 inline-flex items-center gap-1 text-xs bg-green-600/20 border border-green-500/40 hover:border-green-400 text-green-300 rounded-full px-2.5 py-0.5"
                          >
                            <MessageCircle className="h-3 w-3" />
                            WhatsApp
                          </a>
                        )}
                      </div>
                    )}
                    {selectedOrder.fulfillmentType && (
                      <div className="flex items-start gap-2 text-sm text-white/80 pt-1">
                        {selectedOrder.fulfillmentType === 'delivery' ? (
                          <>
                            <Truck className="h-4 w-4 mt-0.5" />
                            <div>
                              <p className="font-semibold">Envío a domicilio</p>
                              <p className="text-white/70">
                                {selectedOrder.customerAddress}
                                {selectedOrder.customerCity && `, ${selectedOrder.customerCity}`}
                                {selectedOrder.customerState && `, ${selectedOrder.customerState}`}
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <Store className="h-4 w-4 mt-0.5" />
                            <div>
                              <p className="font-semibold">Retiro en tienda</p>
                              <p className="text-white/70">{selectedOrder.pickupLocationName ?? 'Tienda seleccionada'}</p>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                    {selectedOrder.fulfillmentType === 'delivery' && !c.address && (c.address || c.city) && (
                      <div className="flex items-start gap-2 text-sm text-white/80">
                        <MapPin className="h-4 w-4 mt-0.5" />
                        <span>
                          {c.address}
                          {c.address && c.city ? ', ' : ''}
                          {c.city}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl">${selectedOrder.total.toFixed(2)}</p>
              </div>

              {/* Payment Information */}
              {selectedOrder.paymentMethod && (
                <div className="bg-secondary/50 border border-border rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-2">Método de Pago</p>
                  <p className="font-semibold mb-3">
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