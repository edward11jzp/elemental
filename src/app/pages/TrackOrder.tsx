import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Search, Package, CheckCircle2, XCircle, Clock, Loader2, Truck, Store } from 'lucide-react';
import { findColor } from '../colors';
import { getOrderById } from '../lib/orders';
import type { Order } from '../types';

const STATUS_META: Record<string, { label: string; color: string; icon: any; description: string }> = {
  pending:     { label: 'Pendiente',  color: 'text-yellow-300 border-yellow-400/40 bg-yellow-400/10', icon: Clock,        description: 'Tu pedido está esperando revisión de un administrador.' },
  approved:    { label: 'Aprobado',   color: 'text-green-300 border-green-400/40 bg-green-400/10',   icon: CheckCircle2, description: '¡Pago confirmado! Preparándonos para procesarlo.' },
  in_progress: { label: 'En Proceso', color: 'text-blue-300 border-blue-400/40 bg-blue-400/10',      icon: Loader2,      description: 'Estamos produciendo y preparando tu pedido.' },
  completed:   { label: 'Listo',      color: 'text-purple-300 border-purple-400/40 bg-purple-400/10', icon: CheckCircle2, description: 'Tu pedido está listo para entrega o retiro.' },
  rejected:    { label: 'Rechazado',  color: 'text-red-300 border-red-400/40 bg-red-400/10',         icon: XCircle,      description: 'Tu pedido fue rechazado. Te contactaremos por correo.' },
};

const STATUS_ORDER = ['pending', 'approved', 'in_progress', 'completed'] as const;

export default function TrackOrder() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [input, setInput] = useState(searchParams.get('id') ?? '');
  const [submitted, setSubmitted] = useState<string | null>(searchParams.get('id'));
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);

  // Normaliza para aceptar "order-123" o solo "123"
  const normalize = (s: string) =>
    s.trim().toLowerCase().replace(/\s+/g, '').replace(/^order-/, '');

  // Fetch from Supabase whenever the tracking number changes
  useEffect(() => {
    if (!submitted) { setOrder(null); return; }
    const trimmed = submitted.trim();
    const normalized = normalize(trimmed);
    setLoading(true);
    Promise.all([
      // Try the input as-is first
      getOrderById(trimmed),
      // Also try with "order-" prefix if user only typed digits
      normalized && !trimmed.startsWith('order-') ? getOrderById(`order-${normalized}`) : Promise.resolve(null),
    ])
      .then(([a, b]) => setOrder(a ?? b))
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [submitted]);

  // Re-sync when URL changes (e.g. direct link from confirmation page)
  useEffect(() => {
    const fromUrl = searchParams.get('id');
    if (fromUrl) {
      setInput(fromUrl);
      setSubmitted(fromUrl);
    }
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = input.trim();
    if (!id) return;
    setSubmitted(id);
    setSearchParams({ id });
  };

  const meta = order ? STATUS_META[order.status] : null;
  const StatusIcon = meta?.icon;
  const isRejected = order?.status === 'rejected';
  const currentIdx = order ? STATUS_ORDER.indexOf(order.status as any) : -1;

  return (
    <div className="bg-black min-h-screen py-10 md:py-16 px-6 sm:px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8 md:mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2 md:mb-3">Revisa Tu Pedido</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Ingresa el número de pedido que recibiste para ver el estado.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 mb-6">
          <Label htmlFor="order-id" className="mb-2 block">Número de pedido</Label>
          <div className="flex gap-2">
            <Input
              id="order-id"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="1779059704447"
              className="bg-secondary border-border text-white font-mono text-base"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              inputMode="text"
            />
            <Button type="submit" className="bg-white text-black hover:bg-gray-200">
              <Search className="h-4 w-4 mr-2" />
              Buscar
            </Button>
          </div>
        </form>

        {submitted && loading && (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <Loader2 className="h-8 w-8 mx-auto text-white animate-spin mb-2" />
            <p className="text-sm text-muted-foreground">Buscando tu pedido…</p>
          </div>
        )}

        {submitted && !loading && !order && (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h2 className="text-xl font-semibold mb-2">No encontramos ese pedido</h2>
            <p className="text-muted-foreground text-sm">
              Revisa el número e intenta de nuevo. Asegúrate de copiarlo completo, sin espacios.
            </p>
          </div>
        )}

        {order && meta && (
          <div className="bg-card border border-border rounded-2xl p-8">
            {/* Status Header */}
            <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 mb-5 text-sm font-semibold ${meta.color}`}>
              {StatusIcon && <StatusIcon className={`h-4 w-4 ${order.status === 'in_progress' ? 'animate-spin' : ''}`} />}
              {meta.label}
            </div>

            <h2 className="text-2xl font-bold mb-1">Pedido #{order.id}</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Realizado el {new Date(order.createdAt).toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>

            <p className="text-white/80 mb-8">{meta.description}</p>

            {/* Progress timeline (hide if rejected) */}
            {!isRejected && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  {STATUS_ORDER.map((s, i) => {
                    const reached = i <= currentIdx;
                    return (
                      <div key={s} className="flex-1 flex items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                            reached
                              ? 'bg-white text-black border-white'
                              : 'bg-transparent text-white/40 border-white/20'
                          }`}
                        >
                          {i + 1}
                        </div>
                        {i < STATUS_ORDER.length - 1 && (
                          <div className={`flex-1 h-[2px] mx-2 ${i < currentIdx ? 'bg-white' : 'bg-white/20'}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                  {STATUS_ORDER.map((s) => (
                    <span key={s} className="flex-1 text-center first:text-left last:text-right">
                      {STATUS_META[s].label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Fulfillment */}
            {order.fulfillmentType && (
              <div className="border-t border-border pt-6 mb-6">
                <p className="text-sm text-muted-foreground mb-2">Método de Entrega</p>
                <div className="flex items-start gap-3 text-sm">
                  {order.fulfillmentType === 'delivery' ? (
                    <>
                      <Truck className="h-5 w-5 text-white/70 mt-0.5" />
                      <div>
                        <p className="font-semibold">Envío</p>
                        <p className="text-white/70">
                          {order.customerAddress}
                          {order.customerCity && `, ${order.customerCity}`}
                          {order.customerState && `, ${order.customerState}`}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Store className="h-5 w-5 text-white/70 mt-0.5" />
                      <div>
                        <p className="font-semibold">Retiro en Tienda</p>
                        <p className="text-white/70">{order.pickupLocationName ?? 'Tienda seleccionada'}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Items */}
            <div className="border-t border-border pt-6 mb-6">
              <p className="text-sm text-muted-foreground mb-3">Artículos ({order.items.length})</p>
              <div className="space-y-3">
                {order.items.map((item, idx) => {
                  const colorInfo = findColor(item.color);
                  return (
                    <div key={idx} className="flex items-center gap-3">
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="w-12 h-12 rounded object-cover bg-secondary"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{item.product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.size} · {colorInfo ? `${colorInfo.name} (${colorInfo.code})` : item.color} · ×{item.quantity}
                        </p>
                      </div>
                      {item.isCustom && (
                        <span className="text-[10px] bg-white/10 border border-white/20 rounded-full px-2 py-0.5">
                          Personalizado
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Total */}
            <div className="flex justify-between items-baseline pt-4 border-t border-border">
              <span className="text-muted-foreground">Total</span>
              <span className="text-2xl font-bold">${order.total.toFixed(2)}</span>
            </div>

            <div className="mt-6 text-xs text-muted-foreground text-center">
              Si tienes dudas, contáctanos por WhatsApp o correo y menciona tu número de pedido.
            </div>
          </div>
        )}

        <div className="text-center mt-8">
          <Link to="/" className="text-sm text-muted-foreground hover:text-white">
            ← Volver a la tienda
          </Link>
        </div>
      </div>
    </div>
  );
}
