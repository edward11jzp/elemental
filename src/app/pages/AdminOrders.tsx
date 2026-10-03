import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Mail, Phone, MessageCircle, Truck, Store, X, Sparkles } from 'lucide-react';
import { useApp } from '../context';
import { Btn, Card, Chip, Input, Label, Modal, Pills, Select, Table, Textarea, cx } from '../components/admin/ui';
import { createAdminOrder, setDueDate } from '../lib/orders';
import { listCustomers, type Customer } from '../lib/adminData';
import { getUnitPrice } from '../lib/pricing';
import { fmt, todayVe, addDays } from '../lib/sales';
import type { CartItem, Order, OrderStatus, PaymentMethod } from '../types';

const STATUSES: { key: OrderStatus; label: string; color: string }[] = [
  { key: 'pending', label: 'Pendiente', color: '#8b8b92' },
  { key: 'approved', label: 'Aprobado', color: '#22c55e' },
  { key: 'in_progress', label: 'En Proceso', color: '#3b82f6' },
  { key: 'completed', label: 'Listo', color: '#a855f7' },
  { key: 'rejected', label: 'Rechazado', color: '#ef4444' },
];
const statusMeta = (s: string) => STATUSES.find((x) => x.key === s) ?? STATUSES[0];

const PAY_LABEL: Record<string, string> = {
  zelle: '💵 Zelle',
  binance: '🟡 Binance',
  pago_movil: '📱 Pago Móvil',
  transferencia: '🏦 Transferencia Bancaria',
  pesos_colombianos: '🇨🇴 Pesos Colombianos',
};

// Siguiente paso natural del flujo de Elemental.
const NEXT: Partial<Record<OrderStatus, { to: OrderStatus; label: string }[]>> = {
  pending: [{ to: 'approved', label: '✅ Aprobar' }, { to: 'rejected', label: '❌ Rechazar' }],
  approved: [{ to: 'in_progress', label: '▶ Iniciar proceso' }],
  in_progress: [{ to: 'completed', label: '📦 Marcar listo' }],
};

const isLate = (o: Order) => !!o.dueDate && o.dueDate < todayVe() && o.status !== 'completed' && o.status !== 'rejected';
const itemsLabel = (o: Order) => o.items.map((i) => `${i.quantity}× ${i.product.name}`).join(', ');

function toWhatsApp(phone?: string) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  return `https://wa.me/${digits.startsWith('0') ? '58' + digits.slice(1) : digits}`;
}

export default function AdminOrders() {
  const { orders, updateOrderStatus, users, markOrdersSeen, refreshOrders } = useApp();
  const [filter, setFilter] = useState<'all' | OrderStatus>('all');
  const [q, setQ] = useState('');
  const [layout, setLayout] = useState<'kanban' | 'list'>(() => {
    try {
      return (localStorage.getItem('admin_orders_layout') as 'kanban' | 'list') || 'kanban';
    } catch {
      return 'kanban';
    }
  });
  const [openId, setOpenId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  useEffect(() => {
    markOrdersSeen();
  }, [markOrdersSeen]);
  useEffect(() => {
    try {
      localStorage.setItem('admin_orders_layout', layout);
    } catch { /* sin almacenamiento */ }
  }, [layout]);

  const contactOf = (o: Order) => {
    const u = users.find((x) => x.id === o.customerId);
    return { email: o.customerEmail || u?.email, phone: o.customerPhone || u?.phone };
  };

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const digits = s.replace(/\D/g, '');
    return orders.filter((o) => {
      if (filter !== 'all' && o.status !== filter) return false;
      if (!s) return true;
      const phone = (o.customerPhone || '').replace(/\D/g, '');
      return o.id.toLowerCase().includes(s) || o.customerName?.toLowerCase().includes(s) || (digits.length >= 3 && phone.includes(digits));
    });
  }, [orders, filter, q]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    orders.forEach((o) => (c[o.status] = (c[o.status] || 0) + 1));
    return c;
  }, [orders]);

  const changeStatus = (id: string, status: OrderStatus) => {
    updateOrderStatus(id, status);
    toast.success('Estado actualizado → ' + statusMeta(status).label + ' ✅');
  };

  const open = orders.find((o) => o.id === openId) ?? null;

  return (
    <div className="px-4 lg:px-6 py-5 max-w-[1600px] space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1 flex-1 min-w-0">
          <FilterChip active={filter === 'all'} color="#111" onClick={() => setFilter('all')}>Todos ({orders.length})</FilterChip>
          {STATUSES.map((s) => (
            <FilterChip key={s.key} active={filter === s.key} color={s.color} onClick={() => setFilter(s.key)}>
              {s.label} ({counts[s.key] || 0})
            </FilterChip>
          ))}
        </div>
        <Pills<'kanban' | 'list'> value={layout} onChange={setLayout} options={[{ key: 'kanban', label: '▦ Kanban' }, { key: 'list', label: '≡ Lista' }]} />
        <Btn onClick={() => setNewOpen(true)}>+ Nuevo pedido</Btn>
      </div>

      <Card className="p-3">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por N° de pedido, teléfono o nombre…" />
      </Card>

      {layout === 'kanban' ? (
        <div className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 lg:mx-0 lg:px-0 snap-x">
          {STATUSES.filter((s) => filter === 'all' || s.key === filter).map((s) => {
            const items = list.filter((o) => o.status === s.key);
            return (
              <div key={s.key} className="flex-1 min-w-[250px] shrink-0 snap-start rounded-xl bg-[#efeff1] p-3">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                  <span className="text-[13px] font-semibold">{s.label}</span>
                  <span className="text-[12px] text-[#71717a]">{items.length}</span>
                </div>
                <div className="space-y-2.5 max-h-[calc(100dvh-280px)] overflow-y-auto">
                  {items.map((o) => (
                    <Card key={o.id} className="p-3 cursor-pointer hover:border-[#a1a1aa] transition-colors" onClick={() => setOpenId(o.id)}>
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-semibold text-[12px] font-mono truncate">{o.id}</span>
                        {isLate(o) && <span className="text-[10px] text-[#dc2626] whitespace-nowrap">⏰ atrasado</span>}
                      </div>
                      <div className="text-[12px] text-[#6b7280] mt-1">{o.customerName}</div>
                      <div className="text-[12px] mt-2 line-clamp-2">{itemsLabel(o)}</div>
                      <div className="flex justify-between items-center mt-3 text-[12px]">
                        <span className="text-[#71717a]">
                          {o.items.some((i) => i.isCustom) ? '🎨 personalizado' : o.source === 'admin' ? '🧑‍💼 manual' : '🌐 web'}
                          {o.dueDate ? ' · ' + o.dueDate.slice(5).split('-').reverse().join('/') : ''}
                        </span>
                        <span className="font-semibold">{fmt(o.total)}</span>
                      </div>
                    </Card>
                  ))}
                  {!items.length && <p className="text-center text-[12px] text-[#a1a1aa] py-6">Sin pedidos</p>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card>
          <Table head={['Pedido', 'Cliente', 'Producto', 'Estado', 'Entrega', 'Total', '']} empty={list.length ? false : 'No se encontraron pedidos'}>
            {list.map((o) => {
              const st = statusMeta(o.status);
              return (
                <tr key={o.id} className="cursor-pointer hover:bg-[#fafafa]" onClick={() => setOpenId(o.id)}>
                  <td className="font-semibold font-mono text-[12px] whitespace-nowrap">{o.id}</td>
                  <td>{o.customerName}</td>
                  <td className="text-[#6b7280] max-w-[280px] truncate">{itemsLabel(o)}</td>
                  <td><Chip color={st.color}>{st.label}</Chip></td>
                  <td className={cx('whitespace-nowrap', isLate(o) && 'text-[#dc2626]')}>{o.dueDate ?? '—'}</td>
                  <td className="font-semibold">{fmt(o.total)}</td>
                  <td className="text-[#a1a1aa]">›</td>
                </tr>
              );
            })}
          </Table>
        </Card>
      )}

      {open && (
        <OrderDrawer
          order={open}
          contact={contactOf(open)}
          onClose={() => setOpenId(null)}
          onStatus={(s) => changeStatus(open.id, s)}
          onDue={async (d) => {
            try {
              await setDueDate(open.id, d || null);
              await refreshOrders();
              toast.success('Fecha de entrega guardada');
            } catch (e: any) {
              toast.error(e.message);
            }
          }}
        />
      )}
      <NewOrderModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={async (id) => {
          await refreshOrders();
          setOpenId(id);
        }}
      />
    </div>
  );
}

function FilterChip({ active, color, onClick, children }: { active: boolean; color: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium whitespace-nowrap transition-colors"
      style={active ? { background: color, color: '#fff' } : { background: color + '1f', color: color === '#111' ? '#111' : color }}
    >
      {children}
    </button>
  );
}

function OrderDrawer({ order: o, contact, onClose, onStatus, onDue }: { order: Order; contact: { email?: string; phone?: string }; onClose: () => void; onStatus: (s: OrderStatus) => void; onDue: (d: string) => void }) {
  const wa = toWhatsApp(contact.phone);
  const [due, setDue] = useState(o.dueDate ?? '');
  useEffect(() => setDue(o.dueDate ?? ''), [o.dueDate]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  const st = statusMeta(o.status);
  const sec = 'text-[10px] uppercase tracking-[0.1em] text-[#71717a] mb-1.5';

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-[#000]/30" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full sm:w-[440px] bg-[#fff] text-[#111] shadow-2xl flex flex-col">
        <div className="flex items-center justify-between gap-2 border-b border-[#ececef] px-5 h-14 shrink-0">
          <div className="min-w-0">
            <h3 className="text-[15px] font-bold font-mono truncate">{o.id}</h3>
          </div>
          <div className="flex items-center gap-2">
            <Chip color={st.color}>{st.label}</Chip>
            <button type="button" onClick={onClose} className="p-1.5 rounded-md text-[#6b7280] hover:bg-[#f4f4f5]" aria-label="Cerrar"><X className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-[13px]">
          <div>
            <div className={sec}>Cliente</div>
            <div className="font-semibold text-[14px]">{o.customerName}</div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {contact.email && <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1 rounded-full border border-[#e6e6e9] px-2.5 py-1 text-[11px]"><Mail className="h-3 w-3" />{contact.email}</a>}
              {contact.phone && <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-1 rounded-full border border-[#e6e6e9] px-2.5 py-1 text-[11px]"><Phone className="h-3 w-3" />{contact.phone}</a>}
              {wa && <a href={wa} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-[#dcfce7] px-2.5 py-1 text-[11px] text-[#15803d]"><MessageCircle className="h-3 w-3" />WhatsApp</a>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className={sec}>Entrega</div>
              <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} onBlur={() => due !== (o.dueDate ?? '') && onDue(due)} className={cx('!py-1.5', isLate(o) && '!border-[#fca5a5] !text-[#dc2626]')} />
              {isLate(o) && <div className="text-[11px] text-[#dc2626] mt-1">⏰ atrasado</div>}
            </div>
            <div>
              <div className={sec}>Total</div>
              <div className="text-[20px] font-extrabold">{fmt(o.total)}</div>
            </div>
          </div>

          <div>
            <div className={sec}>Estado</div>
            <Select value={o.status} onChange={(e) => onStatus(e.target.value as OrderStatus)}>
              {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </Select>
            {NEXT[o.status] && (
              <div className="flex gap-2 mt-2">
                {NEXT[o.status]!.map((n) => (
                  <Btn key={n.to} variant={n.to === 'rejected' ? 'danger' : n.to === 'approved' ? 'success' : 'primary'} className="flex-1 !py-1.5 !text-[12px]" onClick={() => onStatus(n.to)}>{n.label}</Btn>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className={sec}>Artículos ({o.items.reduce((a, i) => a + i.quantity, 0)})</div>
            <div className="space-y-2">
              {o.items.map((it, i) => (
                <div key={i} className="flex gap-3 rounded-lg border border-[#f0f0f2] p-2">
                  <img src={it.product.image} alt={it.product.name} className="h-12 w-12 rounded-md object-cover bg-[#f4f4f5]" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{it.product.name}</div>
                    <div className="text-[12px] text-[#6b7280]">{[it.size, it.color].filter(Boolean).join(' / ')} × {it.quantity}</div>
                    {it.isCustom && (
                      <div className="mt-1 text-[12px] text-[#7e22ce]">
                        <Sparkles className="inline h-3 w-3 mr-1" />Personalizado{it.customPrintSize ? ` · ${it.customPrintSize}` : ''}
                        {it.customNotes && <div className="mt-1 rounded-md bg-[#faf5ff] p-2 text-[#52525b]">"{it.customNotes}"</div>}
                        {it.customLogo && <img src={it.customLogo} alt="Diseño" className="mt-1 max-h-32 rounded-md cursor-pointer" onClick={() => window.open(it.customLogo, '_blank')} />}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {o.notes && (
            <div>
              <div className={sec}>Notas</div>
              <div className="rounded-lg bg-[#fafafa] p-3">{o.notes}</div>
            </div>
          )}

          <div>
            <div className={sec}>💳 Método de pago</div>
            <div className="font-medium">{o.paymentMethod ? PAY_LABEL[o.paymentMethod] ?? o.paymentMethod : '—'}</div>
            {o.fulfillmentType && (
              <div className="flex items-start gap-2 mt-2 text-[12px] text-[#52525b]">
                {o.fulfillmentType === 'delivery' ? <Truck className="h-4 w-4 mt-0.5" /> : <Store className="h-4 w-4 mt-0.5" />}
                <div>
                  <div className="font-semibold">{o.fulfillmentType === 'delivery' ? 'Envío a domicilio' : 'Retiro en tienda'}</div>
                  <div>{o.fulfillmentType === 'delivery' ? [o.customerAddress, o.customerCity, o.customerState].filter(Boolean).join(', ') : o.pickupLocationName ?? 'Tienda seleccionada'}</div>
                </div>
              </div>
            )}
          </div>

          <div>
            <div className={sec}>📎 Comprobante de pago</div>
            {o.paymentProof ? (
              <img src={o.paymentProof} alt="Comprobante" className="w-full max-h-72 object-contain rounded-lg border border-[#ececef] bg-[#fafafa] cursor-pointer" onClick={() => window.open(o.paymentProof, '_blank')} />
            ) : (
              <div className="text-[12px] text-[#9ca3af]">El cliente aún no ha subido comprobante.</div>
            )}
          </div>

          <div>
            <div className={sec}>Historial</div>
            <div className="space-y-1.5 text-[12px] text-[#52525b]">
              {(o.history ?? []).length ? (
                o.history!.map((h, i) => (
                  <div key={i}>✅ {h.label} · {new Date(h.at).toLocaleString('es-VE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}{h.by ? ` · ${h.by}` : ''}</div>
                ))
              ) : (
                <div>✅ Pedido recibido · {new Date(o.createdAt).toLocaleString('es-VE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

interface NewLine {
  productId: string;
  size: string;
  color: string;
  qty: number;
}

function NewOrderModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const { products } = useApp();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [custId, setCustId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [due, setDue] = useState(addDays(todayVe(), 7));
  const [pay, setPay] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<NewLine[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    listCustomers().then(setCustomers).catch(() => setCustomers([]));
    setCustId(''); setName(''); setEmail(''); setPhone(''); setDue(addDays(todayVe(), 7)); setPay(''); setNotes('');
    setLines([{ productId: '', size: '', color: '', qty: 1 }]);
  }, [open]);

  const pick = (id: string) => {
    setCustId(id);
    const c = customers.find((x) => x.id === id);
    if (c) { setName(c.name); setEmail(c.email); setPhone(c.phone); }
  };

  const totalQty = lines.reduce((a, l) => a + (l.productId ? l.qty : 0), 0);
  const priced = lines.map((l) => {
    const p = products.find((x) => x.id === l.productId);
    return { ...l, p, unit: p ? getUnitPrice(p, l.size, totalQty) : 0 };
  });
  const total = priced.reduce((a, l) => a + l.unit * l.qty, 0);
  const setLine = (i: number, patch: Partial<NewLine>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const submit = async () => {
    if (!name.trim()) return toast.error('Debes indicar un cliente');
    const valid = priced.filter((l) => l.p && l.qty > 0);
    if (!valid.length) return toast.error('Agrega al menos un producto');
    const items: CartItem[] = valid.map((l) => {
      const { customizationImages, ...safe } = l.p!; // nunca guardar imágenes pesadas en el pedido
      void customizationImages;
      return { product: safe as typeof l.p & object, quantity: l.qty, size: l.size || l.p!.sizes?.[0] || '', color: l.color, isCustom: false };
    });
    const now = new Date().toISOString();
    const order: Order = {
      id: `order-${Date.now()}`,
      customerId: 'guest',
      customerName: name.trim(),
      customerEmail: email.trim() || undefined,
      customerPhone: phone.trim() || undefined,
      items,
      total: Math.round(total * 100) / 100,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      notes: notes.trim() || undefined,
      paymentMethod: (pay || undefined) as PaymentMethod | undefined,
      dueDate: due || undefined,
    };
    setBusy(true);
    try {
      await createAdminOrder(order);
      toast.success('Pedido ' + order.id + ' creado ✅');
      onClose();
      onCreated(order.id);
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo crear el pedido');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Nuevo pedido" wide>
      <div className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-2">
          <div>
            <Label>Cliente</Label>
            <Select value={custId} onChange={(e) => pick(e.target.value)}>
              <option value="">— Nuevo cliente —</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}{c.phone ? ` (${c.phone})` : ''}</option>)}
            </Select>
          </div>
          <div><Label>Nombre</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del cliente" /></div>
          <div><Label>Correo</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div><Label>Teléfono</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div><Label>Fecha de entrega</Label><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></div>
          <div>
            <Label>Método de pago</Label>
            <Select value={pay} onChange={(e) => setPay(e.target.value)}>
              <option value="">— Sin especificar —</option>
              {Object.entries(PAY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </div>
        </div>

        <div>
          <Label>Productos</Label>
          <div className="space-y-2">
            {priced.map((l, i) => (
              <div key={i} className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
                <Select value={l.productId} onChange={(e) => { const p = products.find((x) => x.id === e.target.value); setLine(i, { productId: e.target.value, size: p?.sizes?.[0] ?? '' }); }} className="flex-1 min-w-[180px]">
                  <option value="">Seleccionar producto…</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name} — {fmt(p.retailPrice ?? p.price)}</option>)}
                </Select>
                {l.p?.sizes?.length ? (
                  <Select value={l.size} onChange={(e) => setLine(i, { size: e.target.value })} className="!w-24">
                    {l.p.sizes.map((s) => <option key={s}>{s}</option>)}
                  </Select>
                ) : null}
                <Input placeholder="Color" value={l.color} onChange={(e) => setLine(i, { color: e.target.value })} className="!w-28" />
                <Input type="number" min={1} value={l.qty} onChange={(e) => setLine(i, { qty: Math.max(1, Number(e.target.value) || 1) })} className="!w-20" />
                <span className="w-20 text-right text-[12px] text-[#6b7280]">{l.p ? fmt(l.unit * l.qty) : ''}</span>
                <button type="button" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} className="text-[#9ca3af] hover:text-[#dc2626] px-1" aria-label="Quitar">✕</button>
              </div>
            ))}
          </div>
          <Btn variant="ghost" className="mt-2 !py-1.5 !text-[12px]" onClick={() => setLines((ls) => [...ls, { productId: '', size: '', color: '', qty: 1 }])}>+ Agregar producto</Btn>
          {totalQty >= 6 && <p className="text-[11px] text-[#15803d] mt-1">Precio al por mayor aplicado ({totalQty} unidades).</p>}
        </div>

        <div><Label>Notas / dirección de entrega</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>

        <div className="flex items-center justify-between pt-1">
          <div className="text-[18px] font-extrabold">Total {fmt(total)}</div>
          <div className="flex gap-2"><Btn variant="ghost" onClick={onClose}>Cancelar</Btn><Btn disabled={busy} onClick={submit}>{busy ? 'Creando…' : 'Crear pedido'}</Btn></div>
        </div>
      </div>
    </Modal>
  );
}
