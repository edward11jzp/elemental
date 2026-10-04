// Inventario estilo Bendito: alerta de stock bajo, movimientos (entrada/salida)
// y stock por categoría. Los movimientos se registran con register_movement()
// en Supabase, que ajusta el stock y deja el rastro en un solo paso.
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { supabase } from '../../lib/supabase';
import { uploadImageKeepAlpha } from '../../lib/storage';
import type { Product } from '../../types';
import { Btn, Card, Input, Label, Modal, Select, cx } from './ui';
import { useSedes } from '../../lib/sedes';
import { registerMovement, seedStockInto, transferStock, type StockRow } from '../../lib/stock';

export interface Movement {
  id: number;
  type: 'in' | 'out' | 'adjust';
  productName: string;
  qty: number;
  reason: string;
  userName: string;
  createdAt: string;
}

export async function listMovements(limit = 12): Promise<Movement[]> {
  const { data, error } = await supabase.from('inventory_movements').select('*').order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []).map((r: any) => ({ id: r.id, type: r.type, productName: r.product_name, qty: r.qty, reason: r.reason, userName: r.user_name ?? '', createdAt: r.created_at }));
}

export const isLow = (p: Product) => p.stock <= (p.minStock ?? 50);

export function StockChip({ p }: { p: Product }) {
  const [label, color] = p.stock <= 0 ? ['Agotado', '#ef4444'] : isLow(p) ? ['Bajo', '#f59e0b'] : ['OK', '#22c55e'];
  return (
    <span className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: color + '22', color }}>
      {label}
    </span>
  );
}

export function LowStockBanner({ products, active, onToggle }: { products: Product[]; active: boolean; onToggle: () => void }) {
  const n = products.filter(isLow).length;
  if (!n && !active) return null;
  return (
    <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-[13px] text-[#92400e]">
      <span className="text-lg">⚠️</span>
      <div className="flex-1"><b>{n}</b> producto{n === 1 ? '' : 's'} con inventario bajo necesita{n === 1 ? '' : 'n'} reposición.</div>
      <Btn variant="ghost" className="!py-1 !text-[12px]" onClick={onToggle}>{active ? 'Ver todos' : 'Ver'}</Btn>
    </div>
  );
}

const REASONS = { in: ['Compra', 'Producción', 'Devolución', 'Ajuste'], out: ['Venta', 'Merma', 'Muestra / regalo', 'Ajuste'] };

export function MovementModal({ open, onClose, products, productId, onSaved }: { open: boolean; onClose: () => void; products: Product[]; productId?: string | null; onSaved: () => void }) {
  const [type, setType] = useState<'in' | 'out'>('in');
  const [pid, setPid] = useState('');
  const [qty, setQty] = useState('1');
  const [reason, setReason] = useState('Compra');
  const [busy, setBusy] = useState(false);
  const { sedes, sede, mySede } = useSedes();
  const [loc, setLoc] = useState('');
  useEffect(() => {
    if (open) {
      setType('in'); setPid(productId ?? products[0]?.id ?? ''); setQty('1'); setReason('Compra');
      setLoc(sede || mySede || sedes[0]?.id || '');
    }
  }, [open, productId, products]);
  useEffect(() => setReason(REASONS[type][0]), [type]);

  const save = async () => {
    const n = Math.floor(Number(qty));
    if (!pid || !(n > 0)) return toast.error('Indica producto y cantidad');
    if (!loc) return toast.error('Indica la sede');
    setBusy(true);
    try {
      const q = await registerMovement(pid, type, n, reason, loc);
      toast.success(`Movimiento registrado · quedan ${q} en esa sede`);
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Registrar movimiento">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {(['in', 'out'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={cx('rounded-lg py-2.5 text-[13px] font-semibold border-2 transition-colors', type === t ? (t === 'in' ? 'border-[#16a34a] bg-[#f0fdf4] text-[#15803d]' : 'border-[#dc2626] bg-[#fef2f2] text-[#b91c1c]') : 'border-[#e6e6e9] text-[#71717a]')}
            >
              {t === 'in' ? '↑ Entrada' : '↓ Salida'}
            </button>
          ))}
        </div>
        <div>
          <Label>Producto</Label>
          <Select value={pid} onChange={(e) => setPid(e.target.value)}>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name} (stock {p.stock})</option>)}
          </Select>
        </div>
        <div>
          <Label>Sede</Label>
          <Select value={loc} onChange={(e) => setLoc(e.target.value)}>
            <option value="">— Elige la sede —</option>
            {sedes.filter((x) => x.active).map((x) => <option key={x.id} value={x.id}>{x.code}</option>)}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Cantidad</Label><Input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} /></div>
          <div>
            <Label>Motivo</Label>
            <Select value={reason} onChange={(e) => setReason(e.target.value)}>
              {REASONS[type].map((r) => <option key={r}>{r}</option>)}
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1"><Btn variant="ghost" onClick={onClose}>Cancelar</Btn><Btn disabled={busy} onClick={save}>{busy ? 'Registrando…' : 'Registrar'}</Btn></div>
      </div>
    </Modal>
  );
}

const SUBCAT_LABEL: Record<string, string> = { 't-shirts': 'Camisetas', polos: 'Polos', gorras: 'Gorras', hoodies: 'Hoodies', joggers: 'Joggers' };

export function InventoryPanels({ products, movements }: { products: Product[]; movements: Movement[] }) {
  const byCat = new Map<string, number>();
  products.forEach((p) => {
    const k = SUBCAT_LABEL[p.subcategory] ?? p.subcategory;
    byCat.set(k, (byCat.get(k) ?? 0) + p.stock);
  });
  const data = [...byCat.entries()].map(([name, stock]) => ({ name, stock })).sort((a, b) => b.stock - a.stock);
  const icon = { in: ['↑', '#16a34a'], out: ['↓', '#dc2626'], adjust: ['±', '#ca8a04'] } as const;

  return (
    <div className="grid lg:grid-cols-2 gap-4 mt-6">
      <Card className="p-4">
        <h3 className="text-[14px] font-semibold mb-3 text-[#111]">Movimientos recientes</h3>
        {movements.length ? (
          <div className="space-y-1.5">
            {movements.map((m) => {
              const [a, c] = icon[m.type] ?? ['·', '#71717a'];
              return (
                <div key={m.id} className="flex items-center gap-3 py-1 text-[13px] text-[#111]">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg font-bold" style={{ background: c + '22', color: c }}>{a}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{m.type === 'in' ? '+' : m.type === 'out' ? '-' : '±'}{m.qty} {m.productName}</div>
                    <div className="text-[11px] text-[#6b7280]">{m.reason} · {m.userName}</div>
                  </div>
                  <span className="text-[11px] text-[#6b7280] whitespace-nowrap">{new Date(m.createdAt).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit' })}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[13px] text-[#9ca3af] py-4">Aún no hay movimientos. Las ventas y los ajustes aparecen aquí.</p>
        )}
      </Card>
      <Card className="p-4">
        <h3 className="text-[14px] font-semibold mb-3 text-[#111]">Stock por categoría</h3>
        <div className="h-[240px]">
          <ResponsiveContainer>
            <BarChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="#f0f0f2" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e6e6e9', fontSize: 12, background: '#fff', color: '#111' }} formatter={(v: number) => [v.toLocaleString('es-VE') + ' uds', 'Stock']} />
              <Bar dataKey="stock" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

/* ---------- Optimizar imágenes de personalización guardadas en base64 ---------- */
type View = 'front' | 'back' | 'sleeves';
const VIEWS: View[] = ['front', 'back', 'sleeves'];

// Productos cuyas vistas de personalización siguen embebidas como data: (pesadas).
async function findHeavy(): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase
    .from('products')
    .select('id,name')
    .or(VIEWS.map((v) => `customization_images->>${v}.like.data:*`).join(','));
  if (error) throw error;
  return data ?? [];
}

export function HeavyImagesBanner() {
  const [heavy, setHeavy] = useState<{ id: string; name: string }[]>([]);
  const [progress, setProgress] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  useEffect(() => {
    findHeavy().then(setHeavy).catch(() => setHeavy([]));
  }, []);
  if (!heavy.length) return null;

  const run = async () => {
    let done = 0;
    setFailed(null);
    setProgress('Preparando…');
    try {
      for (const p of heavy) {
        setProgress(`Optimizando ${p.name} (${done + 1}/${heavy.length})…`);
        const { data, error } = await supabase.from('products').select('customization_images').eq('id', p.id).single();
        if (error) throw error;
        const ci = { ...(data?.customization_images ?? {}) } as Record<View, string>;
        for (const v of VIEWS) {
          const val = ci[v];
          if (typeof val === 'string' && val.startsWith('data:')) {
            const blob = await (await fetch(val)).blob();
            ci[v] = await uploadImageKeepAlpha(blob);
          }
        }
        const { error: e2 } = await supabase.from('products').update({ customization_images: ci }).eq('id', p.id);
        if (e2) throw e2;
        done++;
      }
      toast.success(`${done} producto(s) optimizado(s). Las imágenes quedaron iguales y ahora cargan rápido.`);
      setHeavy([]);
    } catch (e: any) {
      console.error('[optimizar imágenes]', e);
      const msg = `Se detuvo tras ${done} producto(s): ${e?.message ?? e}. Puedes volver a intentarlo; lo hecho se conserva.`;
      setFailed(msg);
      toast.error(msg);
      findHeavy().then(setHeavy).catch(() => {});
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3 text-[13px] text-[#1e3a8a]">
      <span className="text-lg">🖼️</span>
      <div className="flex-1 min-w-[220px]">
        {progress ?? (
          <>
            <b>{heavy.length}</b> producto{heavy.length === 1 ? '' : 's'} guarda{heavy.length === 1 ? '' : 'n'} sus vistas de personalización dentro de la base de datos (muy pesadas).
            <span className="block text-[11px] text-[#3b82f6]">{heavy.map((h) => h.name).join(' · ')}</span>
          </>
        )}
      </div>
      {failed && <div className="w-full text-[12px] text-[#b91c1c]">⚠️ {failed}</div>}
      <Btn disabled={!!progress} onClick={() => { run().catch((e) => { console.error(e); setFailed(String(e?.message ?? e)); setProgress(null); }); }}>{progress ? 'Optimizando…' : 'Optimizar imágenes'}</Btn>
    </div>
  );
}

/** Mover existencias de una sede a otra. */
export function TransferModal({ open, onClose, products, productId, onSaved }: { open: boolean; onClose: () => void; products: Product[]; productId?: string | null; onSaved: () => void }) {
  const { sedes, sede, mySede } = useSedes();
  const [pid, setPid] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [qty, setQty] = useState('1');
  const [reason, setReason] = useState('Traslado entre sedes');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    setPid(productId ?? products[0]?.id ?? '');
    setFrom(sede || mySede || sedes[0]?.id || '');
    setTo('');
    setQty('1');
  }, [open, productId, products, sede, mySede, sedes]);

  const save = async () => {
    const n = Math.floor(Number(qty));
    if (!pid || !(n > 0)) return toast.error('Indica producto y cantidad');
    if (!from || !to || from === to) return toast.error('Elige dos sedes distintas');
    setBusy(true);
    try {
      await transferStock(pid, from, to, n, reason);
      toast.success('Traslado registrado ✓');
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Trasladar entre sedes">
      <div className="space-y-3">
        <div>
          <Label>Producto</Label>
          <Select value={pid} onChange={(e) => setPid(e.target.value)}>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Sale de</Label>
            <Select value={from} onChange={(e) => setFrom(e.target.value)}>
              {sedes.filter((x) => x.active).map((x) => <option key={x.id} value={x.id}>{x.code}</option>)}
            </Select>
          </div>
          <div>
            <Label>Entra en</Label>
            <Select value={to} onChange={(e) => setTo(e.target.value)}>
              <option value="">— Elige la sede —</option>
              {sedes.filter((x) => x.active && x.id !== from).map((x) => <option key={x.id} value={x.id}>{x.code}</option>)}
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Cantidad</Label><Input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} /></div>
          <div><Label>Motivo</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} /></div>
        </div>
        <div className="flex justify-end gap-2 pt-1"><Btn variant="ghost" onClick={onClose}>Cancelar</Btn><Btn disabled={busy} onClick={save}>{busy ? 'Trasladando…' : 'Trasladar'}</Btn></div>
      </div>
    </Modal>
  );
}

/** Primera vez: carga todo el inventario actual en una sede, para repartirlo desde ahí. */
export function SeedStockBanner({ stock, onSaved }: { stock: StockRow[]; onSaved: () => void }) {
  const { sedes } = useSedes();
  const [loc, setLoc] = useState('');
  const [busy, setBusy] = useState(false);
  if (stock.length || !sedes.length) return null;
  const run = async () => {
    if (!loc) return toast.error('Elige la sede donde está hoy el inventario');
    setBusy(true);
    try {
      const n = await seedStockInto(loc);
      toast.success(`${n} producto(s) cargados en esa sede. Ahora repártelos con traslados.`);
      onSaved();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-[13px] text-[#78350f]">
      <span className="text-lg">🏢</span>
      <div className="flex-1 min-w-[240px]">
        <b>El inventario todavía no está repartido por sede.</b>
        <span className="block text-[11px]">Elige dónde está hoy la mercancía; después la repartes con traslados. Mientras tanto no se pueden registrar ventas.</span>
      </div>
      <Select value={loc} onChange={(e) => setLoc(e.target.value)} className="!w-auto">
        <option value="">— Sede —</option>
        {sedes.filter((x) => x.active).map((x) => <option key={x.id} value={x.id}>{x.code}</option>)}
      </Select>
      <Btn disabled={busy} onClick={run}>{busy ? 'Cargando…' : 'Cargar aquí'}</Btn>
    </div>
  );
}
