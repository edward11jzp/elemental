import { useNavigate, Link } from 'react-router';
import { useApp } from '../context';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Upload, CreditCard, DollarSign } from 'lucide-react';
import { PaymentMethod } from '../types';

export default function Checkout() {
  const { cart, cartTotal, addOrder, clearCart, currentUser, cartItemCount, updateUser, paymentInfo } = useApp();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    address: '',
    city: '',
    notes: '',
  });

  const [paymentType, setPaymentType] = useState<'card' | 'alternative'>('card');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [paymentProof, setPaymentProof] = useState<string>('');
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    if (!formData.name || !formData.email || !formData.address) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    if (paymentType === 'alternative' && !paymentProof) {
      toast.error('Por favor sube el comprobante de pago');
      return;
    }

    // Update user's phone number if logged in and is a customer
    if (currentUser && currentUser.role === 'customer' && formData.phone) {
      updateUser(currentUser.id, { phone: formData.phone });
    }

    const order = {
      id: `order-${Date.now()}`,
      customerId: currentUser?.id || 'guest',
      customerName: formData.name,
      items: cart,
      total: cartTotal,
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: formData.notes,
      paymentMethod: paymentMethod,
      paymentProof: paymentType === 'alternative' ? paymentProof : undefined,
    };

    addOrder(order);
    clearCart();
    toast.success('¡Pedido realizado! Pendiente de aprobación del administrador.');
    navigate('/account');
  };

  const calculateItemPrice = (totalCartQuantity: number): number => {
    if (totalCartQuantity >= 6) return 6.5;
    return 9;
  };

  // Calculate savings
  const regularPrice = cartItemCount * 9; // Regular price for all items
  const currentPrice = cartTotal; // Current price with wholesale discount
  const savings = cartItemCount >= 6 ? regularPrice - currentPrice : 0;

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
            {!currentUser && (
              <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="text-white font-medium mb-1">¿Ya tienes una cuenta?</p>
                    <p className="text-sm text-blue-200/80 mb-3">
                      Inicia sesión para autocompletar tu información y ver tu historial de pedidos.
                    </p>
                    <Link to="/account/login?redirect=/checkout">
                      <Button
                        type="button"
                        variant="outline"
                        className="bg-blue-600 hover:bg-blue-700 text-white border-blue-500"
                      >
                        Iniciar Sesión / Crear Cuenta
                      </Button>
                    </Link>
                    <p className="text-xs text-blue-200/60 mt-2">
                      No te preocupes, tu carrito se mantendrá guardado
                    </p>
                  </div>
                </div>
              </div>
            )}

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

                <div>
                  <Label htmlFor="address">Dirección *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="bg-secondary border-border text-white"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="city">Ciudad</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="bg-secondary border-border text-white"
                  />
                </div>

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

                <RadioGroup value={paymentType} onValueChange={(value: 'card' | 'alternative') => {
                  setPaymentType(value);
                  setPaymentMethod(value === 'card' ? 'card' : 'zelle');
                }}>
                  {/* Tarjeta de Crédito/Débito */}
                  <div className="flex items-start space-x-3 mb-4">
                    <RadioGroupItem value="card" id="card" className="mt-1" />
                    <Label htmlFor="card" className="flex-1 cursor-pointer">
                      <div className="bg-secondary/50 border border-border rounded-lg p-4 hover:border-white/30 transition-colors">
                        <div className="flex items-center gap-3 mb-2">
                          <CreditCard className="h-5 w-5 text-blue-400" />
                          <span className="font-semibold text-lg">Tarjeta de Crédito / Débito</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Pago seguro con tarjeta de crédito o débito
                        </p>
                      </div>
                    </Label>
                  </div>

                  {/* Métodos Alternativos */}
                  <div>
                    <div className="flex items-start space-x-3">
                      <RadioGroupItem value="alternative" id="alternative" className="mt-1" />
                      <Label htmlFor="alternative" className="flex-1 cursor-pointer">
                        <div className="bg-secondary/50 border border-border rounded-lg p-4 hover:border-white/30 transition-colors">
                          <div className="flex items-center gap-3 mb-2">
                            <DollarSign className="h-5 w-5 text-green-400" />
                            <span className="font-semibold text-lg">Métodos Alternativos</span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            Zelle, Binance, Pago Móvil, Transferencia, Pesos Colombianos
                          </p>
                        </div>
                      </Label>
                    </div>

                    {paymentType === 'alternative' && (
                      <div className="ml-8 space-y-4 mt-4 pt-4 border-t border-border">
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
                            {paymentMethod !== 'card' && (() => {
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
                        )}
                    </div>
                </RadioGroup>
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