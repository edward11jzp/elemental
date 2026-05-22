import { useNavigate, Link } from 'react-router';
import { useApp } from '../context';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Upload, DollarSign, CheckCircle2, Mail, Truck, Store, MapPin, Sparkles, Copy } from 'lucide-react';
import { PaymentMethod, FulfillmentType } from '../types';
import { VENEZUELA_STATES } from '../venezuela';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';

export default function Checkout() {
  const { cart, cartTotal, addOrder, clearCart, currentUser, cartItemCount, updateUser, paymentInfo, locations } = useApp();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    address: '',
    city: '',
    state: '',
    notes: '',
  });
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>('delivery');
  const [pickupLocationId, setPickupLocationId] = useState<string>('');

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('zelle');
  const [paymentProof, setPaymentProof] = useState<string>('');
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmation, setConfirmation] = useState<{
    orderId: string;
    email: string;
    total: number;
    hasCustom: boolean;
    customerName: string;
    customerPhone: string;
  } | null>(null);
  const [customNoticeOpen, setCustomNoticeOpen] = useState(false);

  // Update form when user logs in
  useEffect(() => {
    if (currentUser) {
      setFormData(prev => ({
        ...prev,
        name: currentUser.name || prev.name,
        email: currentUser.email || prev.email,
        phone: currentUser.phone || prev.phone,
      }));
    }
  }, [currentUser]);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor sube una imagen válida');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      toast.error('La imagen no debe superar 5MB');
      return;
    }

    setIsUploadingProof(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPaymentProof(reader.result as string);
      setIsUploadingProof(false);
      toast.success('Comprobante cargado exitosamente');
    };
    reader.onerror = () => {
      setIsUploadingProof(false);
      toast.error('Error al cargar el comprobante');
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email) {
      toast.error('Completa nombre y correo');
      return;
    }

    if (fulfillmentType === 'delivery') {
      if (!formData.address || !formData.city || !formData.state) {
        toast.error('Completa dirección, ciudad y estado para el envío');
        return;
      }
    } else {
      if (!pickupLocationId) {
        toast.error('Selecciona una tienda para el retiro');
        return;
      }
    }

    if (!paymentProof) {
      toast.error('Por favor sube el comprobante de pago');
      return;
    }

    // Update user's phone number if logged in and is a customer
    if (currentUser && currentUser.role === 'customer' && formData.phone) {
      updateUser(currentUser.id, { phone: formData.phone });
    }

    const pickupLoc = locations.find((l) => l.id === pickupLocationId);
    const order = {
      id: `order-${Date.now()}`,
      customerId: currentUser?.id || 'guest',
      customerName: formData.name,
      customerEmail: formData.email,
      customerPhone: formData.phone,
      customerAddress: fulfillmentType === 'delivery' ? formData.address : undefined,
      customerCity: fulfillmentType === 'delivery' ? formData.city : undefined,
      customerState: fulfillmentType === 'delivery' ? formData.state : undefined,
      fulfillmentType,
      pickupLocationId: fulfillmentType === 'pickup' ? pickupLocationId : undefined,
      pickupLocationName: fulfillmentType === 'pickup' ? pickupLoc?.name : undefined,
      items: cart,
      total: cartTotal,
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: formData.notes,
      paymentMethod: paymentMethod,
      paymentProof: paymentProof,
    };

    const hasCustom = cart.some((item) => item.isCustom);

    addOrder(order);
    clearCart();
    toast.success('¡Pedido realizado! Te enviaremos confirmación por correo.');
    setConfirmation({
      orderId: order.id,
      email: formData.email,
      total: order.total,
      hasCustom,
      customerName: formData.name,
      customerPhone: formData.phone,
    });
    if (hasCustom) setCustomNoticeOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const calculateItemPrice = (totalCartQuantity: number): number => {
    if (totalCartQuantity >= 6) return 6.5;
    return 9;
  };

  // Calculate savings
  const regularPrice = cartItemCount * 9; // Regular price for all items
  const currentPrice = cartTotal; // Current price with wholesale discount
  const savings = cartItemCount >= 6 ? regularPrice - currentPrice : 0;

  // Post-checkout confirmation screen (guest-friendly: no account needed)
  if (confirmation) {
    return (
      <div className="bg-black min-h-screen py-20 px-4 flex items-start justify-center">
        <div className="max-w-xl w-full bg-card border border-border rounded-2xl p-8 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-500/15 border border-green-500/40 flex items-center justify-center mb-5">
            <CheckCircle2 className="h-8 w-8 text-green-400" />
          </div>
          <h1 className="text-3xl font-bold mb-2">¡Pedido recibido!</h1>
          <p className="text-muted-foreground mb-6">
            Tu pedido fue recibido y está pendiente de revisión.
          </p>

          <div className="bg-secondary/50 border border-border rounded-lg p-4 mb-6 text-left space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">N° de pedido</span>
              <span className="font-mono">{confirmation.orderId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span>${confirmation.total.toFixed(2)}</span>
            </div>
            {confirmation.email && (
              <div className="flex items-center gap-2 pt-2 border-t border-border/60 text-white/80">
                <Mail className="h-4 w-4" />
                <span>
                  Te enviaremos confirmación a <strong>{confirmation.email}</strong>
                </span>
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground mb-6">
            Guarda el N° de pedido. Si tu método de pago requiere verificación, te contactaremos por correo o WhatsApp.
          </p>

          {confirmation.hasCustom && (
            <div className="mb-6 bg-fuchsia-500/10 border border-fuchsia-400/30 rounded-lg p-4 text-left">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-fuchsia-300 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-fuchsia-100 font-semibold text-sm mb-1">Tu pedido incluye personalización</p>
                  <p className="text-fuchsia-200/80 text-xs mb-3">
                    Para máxima calidad, envíanos tu logo o diseño por correo después del pago.
                  </p>
                  <Button
                    type="button"
                    onClick={() => setCustomNoticeOpen(true)}
                    className="bg-fuchsia-500 hover:bg-fuchsia-600 text-white text-xs h-auto py-2"
                  >
                    Ver instrucciones
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Link to={`/revisar-pedido?id=${encodeURIComponent(confirmation.orderId)}`}>
              <Button className="bg-white text-black hover:bg-gray-200 w-full">
                Revisa Tu Pedido
              </Button>
            </Link>
            <Link to="/">
              <Button
                variant="outline"
                className="border-border w-full"
              >
                Volver a la Tienda
              </Button>
            </Link>
          </div>
        </div>

        {/* Custom design instructions popup */}
        <Dialog open={customNoticeOpen} onOpenChange={setCustomNoticeOpen}>
          <DialogContent className="bg-card border border-fuchsia-400/30 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-fuchsia-300" />
                Envíanos tu diseño
              </DialogTitle>
              <DialogDescription className="text-white/70">
                Para garantizar la mejor calidad en tu prenda personalizada, por favor envíanos
                tu logo o diseño después de realizar el pago.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              <div className="bg-secondary/50 border border-border rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">Enviar a:</p>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-white font-mono text-sm break-all">elementalpedido@gmail.com</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText('elementalpedido@gmail.com');
                      toast.success('Correo copiado');
                    }}
                    className="shrink-0 p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white"
                    title="Copiar"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="bg-secondary/50 border border-border rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-2">Asunto del correo:</p>
                <p className="text-white text-sm font-mono break-all">
                  {[confirmation.customerName, confirmation.customerPhone].filter(Boolean).join(' - ') || 'Tu nombre - Tu teléfono'}
                </p>
              </div>

              <ul className="text-sm text-white/70 space-y-1.5 list-disc pl-5">
                <li>Adjunta el logo en alta resolución (PNG, JPG o SVG).</li>
                <li>Incluye tu nombre y número de teléfono en el asunto.</li>
                <li>Menciona también tu N° de pedido: <span className="font-mono text-white">{confirmation.orderId}</span></li>
              </ul>

              {(() => {
                const subject = encodeURIComponent(
                  `${confirmation.customerName} - ${confirmation.customerPhone} - Pedido ${confirmation.orderId}`,
                );
                const body = encodeURIComponent(
                  `Hola, adjunto el diseño para mi pedido ${confirmation.orderId}.\n\nNombre: ${confirmation.customerName}\nTeléfono: ${confirmation.customerPhone}`,
                );
                return (
                  <a href={`mailto:elementalpedido@gmail.com?subject=${subject}&body=${body}`}>
                    <Button className="w-full bg-fuchsia-500 hover:bg-fuchsia-600 text-white">
                      <Mail className="h-4 w-4 mr-2" />
                      Abrir mi correo
                    </Button>
                  </a>
                );
              })()}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen py-12 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 right-10 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 left-10 w-64 h-64 bg-white rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.6s' }}></div>
      </div>
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <h1 className="text-4xl mb-8">Pagar</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Form */}
          <div className="lg:col-span-2">

            {currentUser && (
              <div className="bg-gradient-to-br from-green-900/20 to-green-800/10 border border-green-500/30 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-green-400 font-medium">
                    Sesión iniciada como {currentUser.name}
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="bg-card p-6 rounded-lg">
              <h2 className="text-2xl mb-6">Información de Contacto</h2>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Nombre Completo *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-secondary border-border text-white"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email">Correo Electrónico *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="bg-secondary border-border text-white"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="bg-secondary border-border text-white"
                  />
                </div>

                {/* Fulfillment selector */}
                <div className="pt-2">
                  <Label className="mb-2 block">Método de Entrega *</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFulfillmentType('delivery')}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        fulfillmentType === 'delivery'
                          ? 'border-white bg-white/5'
                          : 'border-border bg-secondary hover:border-white/40'
                      }`}
                    >
                      <Truck className="h-5 w-5 mb-2" />
                      <p className="font-semibold">Envío</p>
                      <p className="text-xs text-muted-foreground">A toda Venezuela</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFulfillmentType('pickup')}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        fulfillmentType === 'pickup'
                          ? 'border-white bg-white/5'
                          : 'border-border bg-secondary hover:border-white/40'
                      }`}
                    >
                      <Store className="h-5 w-5 mb-2" />
                      <p className="font-semibold">Retiro en Tienda</p>
                      <p className="text-xs text-muted-foreground">En nuestras sedes</p>
                    </button>
                  </div>
                </div>

                {fulfillmentType === 'delivery' && (
                  <>
                    <div>
                      <Label htmlFor="address">Dirección *</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="bg-secondary border-border text-white"
                        placeholder="Calle, urbanización, casa/edificio..."
                        required={fulfillmentType === 'delivery'}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="city">Ciudad *</Label>
                        <Input
                          id="city"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          className="bg-secondary border-border text-white"
                          required={fulfillmentType === 'delivery'}
                        />
                      </div>
                      <div>
                        <Label htmlFor="state">Estado *</Label>
                        <select
                          id="state"
                          value={formData.state}
                          onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                          className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-white text-sm"
                          required={fulfillmentType === 'delivery'}
                        >
                          <option value="">Selecciona estado</option>
                          {VENEZUELA_STATES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {fulfillmentType === 'pickup' && (
                  <div>
                    <Label className="mb-2 block">Tienda para Retiro *</Label>
                    {locations.length === 0 ? (
                      <p className="text-sm text-muted-foreground p-4 bg-secondary rounded-md">
                        No hay tiendas configuradas en este momento.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {locations.map((loc) => {
                          const selected = pickupLocationId === loc.id;
                          return (
                            <button
                              key={loc.id}
                              type="button"
                              onClick={() => setPickupLocationId(loc.id)}
                              className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                                selected
                                  ? 'border-white bg-white/5'
                                  : 'border-border bg-secondary hover:border-white/40'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <MapPin className="h-5 w-5 text-white/70 mt-0.5 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold">{loc.name}</p>
                                  <p className="text-xs text-muted-foreground">{loc.shoppingCenter}{loc.address ? ` · ${loc.address}` : ''}</p>
                                  {loc.hours && <p className="text-xs text-white/50 mt-1">{loc.hours}</p>}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <Label htmlFor="notes">Notas del Pedido</Label>
                  <Input
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="bg-secondary border-border text-white"
                    placeholder="Cualquier instrucción especial..."
                  />
                </div>
              </div>

              {/* Payment Method Section */}
              <div className="mt-8 pt-8 border-t border-border">
                <h2 className="text-2xl mb-6">Método de Pago</h2>

                <div className="bg-secondary/50 border border-border rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-green-400" />
                    <div>
                      <p className="font-semibold">Métodos Disponibles</p>
                      <p className="text-sm text-muted-foreground">
                        Zelle, Binance, Pago Móvil, Transferencia, Pesos Colombianos
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                            <div>
                              <Label htmlFor="payment-method" className="text-white">
                                Selecciona el método *
                              </Label>
                              <select
                                id="payment-method"
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                                className="w-full bg-black border border-border rounded-md px-3 py-2 text-white mt-2"
                                required
                              >
                                <option value="zelle">Zelle</option>
                                <option value="binance">Binance</option>
                                <option value="pago_movil">Pago Móvil</option>
                                <option value="transferencia">Transferencia Bancaria</option>
                                <option value="pesos_colombianos">Pesos Colombianos</option>
                              </select>
                            </div>

                            {/* Payment Information Display */}
                            {(() => {
                              const activePaymentInfoForMethod = paymentInfo.filter(
                                info => info.method === paymentMethod && info.active
                              );

                              if (activePaymentInfoForMethod.length === 0) {
                                return (
                                  <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                                    <p className="text-yellow-400 text-sm">
                                      No hay información de pago disponible para este método. Por favor contacta al administrador.
                                    </p>
                                  </div>
                                );
                              }

                              return (
                                <div className="space-y-3">
                                  {activePaymentInfoForMethod.map(info => (
                                    <div key={info.id} className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                                      <p className="text-blue-300 font-medium mb-3">
                                        Información para realizar el pago:
                                      </p>
                                      <div className="space-y-2 text-sm">
                                        {info.accountName && (
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">Nombre:</span>
                                            <span className="text-white font-medium">{info.accountName}</span>
                                          </div>
                                        )}

                                        {/* Zelle Fields */}
                                        {info.method === 'zelle' && (
                                          <>
                                            {info.zelleEmail && (
                                              <div className="flex justify-between">
                                                <span className="text-muted-foreground">Email:</span>
                                                <span className="text-white font-medium">{info.zelleEmail}</span>
                                              </div>
                                            )}
                                            {info.zellePhone && (
                                              <div className="flex justify-between">
                                                <span className="text-muted-foreground">Teléfono:</span>
                                                <span className="text-white font-medium">{info.zellePhone}</span>
                                              </div>
                                            )}
                                          </>
                                        )}

                                        {/* Binance Fields */}
                                        {info.method === 'binance' && (
                                          <>
                                            {info.binanceEmail && (
                                              <div className="flex justify-between">
                                                <span className="text-muted-foreground">Email:</span>
                                                <span className="text-white font-medium">{info.binanceEmail}</span>
                                              </div>
                                            )}
                                            {info.binanceId && (
                                              <div className="flex justify-between">
                                                <span className="text-muted-foreground">ID:</span>
                                                <span className="text-white font-medium">{info.binanceId}</span>
                                              </div>
                                            )}
                                            {info.binanceWallet && (
                                              <div className="flex flex-col gap-1">
                                                <span className="text-muted-foreground">Wallet:</span>
                                                <span className="text-white font-medium text-xs break-all">{info.binanceWallet}</span>
                                              </div>
                                            )}
                                          </>
                                        )}

                                        {/* Pago Móvil Fields */}
                                        {info.method === 'pago_movil' && (
                                          <>
                                            {info.pagoMovilBank && (
                                              <div className="flex justify-between">
                                                <span className="text-muted-foreground">Banco:</span>
                                                <span className="text-white font-medium">{info.pagoMovilBank}</span>
                                              </div>
                                            )}
                                            {info.pagoMovilPhone && (
                                              <div className="flex justify-between">
                                                <span className="text-muted-foreground">Teléfono:</span>
                                                <span className="text-white font-medium">{info.pagoMovilPhone}</span>
                                              </div>
                                            )}
                                            {info.pagoMovilId && (
                                              <div className="flex justify-between">
                                                <span className="text-muted-foreground">Cédula:</span>
                                                <span className="text-white font-medium">{info.pagoMovilId}</span>
                                              </div>
                                            )}
                                          </>
                                        )}

                                        {/* Transferencia Fields */}
                                        {info.method === 'transferencia' && (
                                          <>
                                            {info.bankName && (
                                              <div className="flex justify-between">
                                                <span className="text-muted-foreground">Banco:</span>
                                                <span className="text-white font-medium">{info.bankName}</span>
                                              </div>
                                            )}
                                            {info.accountNumber && (
                                              <div className="flex justify-between">
                                                <span className="text-muted-foreground">Número de Cuenta:</span>
                                                <span className="text-white font-medium">{info.accountNumber}</span>
                                              </div>
                                            )}
                                            {info.accountType && (
                                              <div className="flex justify-between">
                                                <span className="text-muted-foreground">Tipo:</span>
                                                <span className="text-white font-medium">{info.accountType}</span>
                                              </div>
                                            )}
                                            {info.routingNumber && (
                                              <div className="flex justify-between">
                                                <span className="text-muted-foreground">Routing:</span>
                                                <span className="text-white font-medium">{info.routingNumber}</span>
                                              </div>
                                            )}
                                          </>
                                        )}

                                        {/* Pesos Colombianos Fields */}
                                        {info.method === 'pesos_colombianos' && (
                                          <>
                                            {info.colombiaBank && (
                                              <div className="flex justify-between">
                                                <span className="text-muted-foreground">Banco:</span>
                                                <span className="text-white font-medium">{info.colombiaBank}</span>
                                              </div>
                                            )}
                                            {info.colombiaAccountNumber && (
                                              <div className="flex justify-between">
                                                <span className="text-muted-foreground">Número de Cuenta:</span>
                                                <span className="text-white font-medium">{info.colombiaAccountNumber}</span>
                                              </div>
                                            )}
                                            {info.colombiaAccountType && (
                                              <div className="flex justify-between">
                                                <span className="text-muted-foreground">Tipo:</span>
                                                <span className="text-white font-medium">{info.colombiaAccountType}</span>
                                              </div>
                                            )}
                                            {info.colombiaDocumentType && info.colombiaDocumentNumber && (
                                              <div className="flex justify-between">
                                                <span className="text-muted-foreground">{info.colombiaDocumentType}:</span>
                                                <span className="text-white font-medium">{info.colombiaDocumentNumber}</span>
                                              </div>
                                            )}
                                          </>
                                        )}
                                      </div>
                                      <p className="text-xs text-blue-300/70 mt-3 italic">
                                        Realiza el pago a esta cuenta y sube el comprobante a continuación
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}

                            {/* Upload Payment Proof */}
                            <div>
                              <p className="text-white text-sm mb-2">
                                Comprobante de Pago *
                              </p>
                              <div className="mt-2">
                                {paymentProof ? (
                                  <div className="relative w-full h-32 border-2 border-dashed border-border rounded-lg p-2 bg-black/50">
                                    <img
                                      src={paymentProof}
                                      alt="Comprobante de pago"
                                      className="w-full h-full object-contain rounded"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setPaymentProof('')}
                                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onDrop={handleDrop}
                                    onDragOver={handleDragOver}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      const input = document.createElement('input');
                                      input.type = 'file';
                                      input.accept = 'image/*';
                                      input.onchange = (event) => {
                                        const file = (event.target as HTMLInputElement).files?.[0];
                                        if (file) processFile(file);
                                      };
                                      input.click();
                                    }}
                                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-white/30 transition-colors bg-black/50 text-white"
                                  >
                                    <Upload className="w-8 h-8 mb-2 text-muted-foreground pointer-events-none" />
                                    <p className="mb-2 text-sm text-muted-foreground pointer-events-none">
                                      <span className="font-semibold">Click para subir</span> o arrastra aquí
                                    </p>
                                    <p className="text-xs text-muted-foreground pointer-events-none">
                                      PNG, JPG (MAX. 5MB)
                                    </p>
                                  </button>
                                )}
                                <p className="text-xs text-muted-foreground mt-2">
                                  Sube una foto clara del comprobante de tu pago
                                </p>
                              </div>
                            </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full mt-6 bg-white text-black hover:bg-gray-200 py-6"
              >
                Realizar Pedido (Pendiente de Aprobación)
              </Button>
            </form>
          </div>

          {/* Order Summary */}
          <div>
            <div className="bg-card p-6 rounded-lg sticky top-20">
              <h2 className="text-2xl mb-6">Resumen del Pedido</h2>
              
              <div className="space-y-4 mb-6">
                {cart.map((item, index) => {
                  const itemPrice = calculateItemPrice(cartItemCount);
                  return (
                    <div key={`${item.product.id}-${index}`} className="flex gap-4">
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                      <div className="flex-1">
                        <p className="text-sm">{item.product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.size} / {item.color} × {item.quantity}
                        </p>
                        {item.isCustom && (
                          <p className="text-xs text-green-400">Personalizado</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm">${(itemPrice * item.quantity).toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">${itemPrice} c/u</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal ({cartItemCount} artículos)</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>

                {savings > 0 && (
                  <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-green-400 font-medium">¡Precio al por mayor!</span>
                      <span className="text-green-400 font-medium">${calculateItemPrice(cartItemCount)} c/u</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-green-300/80">Precio regular sería:</span>
                      <span className="text-green-300/80 line-through">${regularPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-green-500/30">
                      <span className="text-green-400 font-semibold">Te ahorras:</span>
                      <span className="text-green-400 font-semibold">${savings.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between text-xl mt-4 pt-3 border-t border-border">
                  <span>Total</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-secondary rounded text-sm">
                <p className="text-muted-foreground">
                  Tu pedido estará pendiente de aprobación de nuestro equipo administrativo. Recibirás una notificación una vez que haya sido revisado.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}