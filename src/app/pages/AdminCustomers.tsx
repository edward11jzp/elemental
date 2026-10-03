import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useApp } from '../context';
import { Btn, Card, Input, Label, Modal, Select, Textarea } from '../components/admin/ui';
import { deleteCustomer, listCustomers, saveCustomer, type Customer, type CustomerInput } from '../lib/adminData';
import { fmt } from '../lib/sales';
import { usePerms } from '../lib/perms';
import type { Order } from '../types';

const TIER_COLOR: Record<string, string> = { VIP: '#a855f7', Mayorista: '#3b82f6', Regular: '#71717a' };
const digits = (s?: string) => (s ?? '').replace(/\D/g, '');
const initials = (n: string) => n.split(/\s+/).map((x) => x[0]).join('').slice(0, 2).toUpperCase();

// Pedidos web de un cliente (mismo teléfono o correo).
function webOrdersOf(c: Customer, orders: Order[]) {
  const ph = digits(c.phone), em = c.email.trim().toLowerCase();
  return orders.filter(
    (o) => o.status !== 'rejected' && ((ph.length >= 7 && digits(o.customerPhone).endsWith(ph.slice(-7))) || (em && (o.customerEmail ?? '').toLowerCase() === em)),
  );
}

export default function AdminCustomers() {
  const { orders } = useApp();
  const [list, setList] = useState<Customer[]>([]);
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState<Customer | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => listCustomers().then(setList).catch((e) => setError(e.message)), []);
  useEffect(() => { reload(); }, [reload]);

  const enriched = useMemo(
    () =>
      list.map((c) => {
        const web = webOrdersOf(c, orders);
        const count = c.ordersCount + web.length;
        const spent = c.spent + web.reduce((a, o) => a + o.total, 0);
        // Producto favorito: el más comprado en sus pedidos web (si no se escribió a mano).
        let fav = c.fav;
        if (!fav && web.length) {
          const m = new Map<string, number>();
          web.forEach((o) => o.items.forEach((i) => m.set(i.product.name, (m.get(i.product.name) ?? 0) + i.quantity)));
          fav = [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
        }
        return { c, count, spent, fav };
      }),
    [list, orders],
  );

  const shown = enriched.filter(({ c }) => {
    const s = q.trim().toLowerCase();
    return !s || c.name.toLowerCase().includes(s) || c.cedula.toLowerCase().includes(s) || c.email.toLowerCase().includes(s) || (digits(s).length >= 3 && digits(c.phone).includes(digits(s)));
  });

  // Crea clientes a partir de los pedidos de la web que todavía no están registrados.
  const importFromOrders = async () => {
    const known = new Set(list.flatMap((c) => [digits(c.phone).slice(-7), c.email.toLowerCase()]).filter(Boolean));
    const seen = new Set<string>();
    const fresh: CustomerInput[] = [];
    for (const o of orders) {
      const k1 = digits(o.customerPhone).slice(-7), k2 = (o.customerEmail ?? '').toLowerCase();
      if (!o.customerName || (k1 && known.has(k1)) || (k2 && known.has(k2))) continue;
      const key = k1 || k2 || o.customerName.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      fresh.push({ name: o.customerName, cedula: '', phone: o.customerPhone ?? '', email: o.customerEmail ?? '', docCurrency: 'USD', tier: 'Regular', fav: '', notes: 'Importado de pedidos web' });
    }
    if (!fresh.length) return toast('No hay clientes nuevos en los pedidos web');
    if (!confirm(`Se crearán ${fresh.length} cliente(s) a partir de los pedidos web. ¿Continuar?`)) return;
    try {
      for (const c of fresh) await saveCustomer(c);
      toast.success(`${fresh.length} cliente(s) importado(s)`);
      reload();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="px-4 lg:px-6 py-5 max-w-[1600px] space-y-4">
      {error && (
        <div className="rounded-lg border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-[13px] text-[#b91c1c]">
          {error.includes('tier') || error.includes('does not exist') ? 'Falta ejecutar la migración de la fase 2 en Supabase.' : error}
        </div>
      )}
      <Card className="p-3 flex flex-wrap gap-2">
        <Input placeholder="Buscar cliente por nombre, cédula, correo o teléfono…" value={q} onChange={(e) => setQ(e.target.value)} className="flex-1 min-w-[200px]" />
        <Btn variant="ghost" onClick={importFromOrders} title="Crea los clientes de los pedidos de la web">⇣ Importar de pedidos web</Btn>
        <Btn onClick={() => setEdit(null)}>+ Nuevo cliente</Btn>
      </Card>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {shown.map(({ c, count, spent, fav }) => (
          <Card key={c.id} className="p-5 cursor-pointer hover:border-[#a1a1aa] transition-colors" onClick={() => setEdit(c)}>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#a855f7] flex items-center justify-center font-bold [color:#fff]">{initials(c.name)}</div>
              <div className="min-w-0">
                <div className="font-semibold truncate">{c.name}</div>
                <div className="text-[12px] text-[#6b7280] truncate">
                  {c.cedula ? 'C.I. ' + c.cedula : ''}{c.cedula && c.email ? ' · ' : ''}{c.email || (c.cedula ? '' : '—')}
                </div>
              </div>
              <span className="ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: TIER_COLOR[c.tier] + '22', color: TIER_COLOR[c.tier] }}>{c.tier}</span>
              {c.isEmployee && <span className="rounded-full bg-[#dbeafe] px-2 py-0.5 text-[11px] font-semibold text-[#2563eb]" title="Personal">👩‍💼 {c.employeeBranch || 'Personal'}</span>}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center mb-3">
              <div><div className="text-[17px] font-extrabold">{count}</div><div className="text-[10px] uppercase text-[#71717a]">Pedidos</div></div>
              <div><div className="text-[17px] font-extrabold">{fmt(spent)}</div><div className="text-[10px] uppercase text-[#71717a]">Gastado</div></div>
              <div><div className="text-[17px] font-extrabold">{count ? fmt(spent / count) : '$0'}</div><div className="text-[10px] uppercase text-[#71717a]">Promedio</div></div>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-[#f0f0f2] pt-3 text-[12px] text-[#6b7280]">
              <span className="truncate">❤️ {fav || '—'}</span>
              <span className="whitespace-nowrap">{c.phone || '—'}</span>
            </div>
          </Card>
        ))}
        {!shown.length && <div className="col-span-full text-center text-[#9ca3af] py-10 text-[13px]">Sin clientes registrados.</div>}
      </div>

      {edit !== undefined && (
        <CustomerModal
          customer={edit}
          onClose={() => setEdit(undefined)}
          onSaved={() => {
            setEdit(undefined);
            reload();
          }}
        />
      )}
    </div>
  );
}

function CustomerModal({ customer: c, onClose, onSaved }: { customer: Customer | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<CustomerInput>({
    name: c?.name ?? '',
    cedula: c?.cedula ?? '',
    phone: c?.phone ?? '',
    email: c?.email ?? '',
    docCurrency: c?.docCurrency ?? 'USD',
    tier: c?.tier ?? 'Regular',
    fav: c?.fav ?? '',
    notes: c?.notes ?? '',
    isEmployee: c?.isEmployee ?? false,
    employeeBranch: c?.employeeBranch ?? '',
    creditLimit: c?.creditLimit ?? 0,
  });
  const { isManager } = usePerms();
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<CustomerInput>) => setF((x) => ({ ...x, ...patch }));

  const save = async () => {
    if (!f.name.trim()) return toast.error('El nombre es obligatorio');
    setBusy(true);
    try {
      const data = { ...f, name: f.name.trim() };
      if (!isManager) { delete data.isEmployee; delete data.employeeBranch; delete data.creditLimit; }
      await saveCustomer(data, c?.id);
      toast.success(c ? 'Cliente actualizado ✓' : 'Cliente creado ✓');
      onSaved();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const del = async () => {
    if (!c || !confirm(`¿Eliminar cliente "${c.name}"?`)) return;
    try {
      await deleteCustomer(c.id);
      toast.success('Cliente eliminado');
      onSaved();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Modal open onClose={onClose} title={c ? 'Editar cliente' : 'Nuevo cliente'}>
      <div className="space-y-3">
        <div><Label>Nombre y apellido</Label><Input autoFocus value={f.name} onChange={(e) => set({ name: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Cédula / RIF</Label><Input value={f.cedula} onChange={(e) => set({ cedula: e.target.value })} /></div>
          <div><Label>Teléfono</Label><Input value={f.phone} onChange={(e) => set({ phone: e.target.value })} /></div>
        </div>
        <div><Label>Correo</Label><Input type="email" value={f.email} onChange={(e) => set({ email: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Tipo de cliente</Label>
            <Select value={f.tier} onChange={(e) => set({ tier: e.target.value as CustomerInput['tier'] })}>
              <option>Regular</option>
              <option>Mayorista</option>
              <option>VIP</option>
            </Select>
          </div>
          <div>
            <Label>Documentos en</Label>
            <Select value={f.docCurrency} onChange={(e) => set({ docCurrency: e.target.value as 'USD' | 'BS' })}>
              <option value="USD">Dólares ($)</option>
              <option value="BS">Bolívares (Bs)</option>
            </Select>
          </div>
        </div>
        <div><Label>Producto favorito</Label><Input value={f.fav} onChange={(e) => set({ fav: e.target.value })} placeholder="Opcional" /></div>
        <div><Label>Notas</Label><Textarea rows={2} value={f.notes} onChange={(e) => set({ notes: e.target.value })} /></div>
        {isManager && (
          <div className="rounded-lg border border-[#ececef] p-3 space-y-2">
            <label className="flex items-center gap-2 text-[13px] font-medium cursor-pointer">
              <input type="checkbox" checked={!!f.isEmployee} onChange={(e) => set({ isEmployee: e.target.checked })} /> 👩‍💼 Es del personal (compra al mayor y a crédito)
            </label>
            {f.isEmployee && (
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Sucursal / área</Label><Input value={f.employeeBranch ?? ''} onChange={(e) => set({ employeeBranch: e.target.value })} /></div>
                <div><Label>Límite de crédito ($)</Label><Input type="number" value={f.creditLimit || ''} onChange={(e) => set({ creditLimit: Number(e.target.value) || 0 })} placeholder="0 = sin límite" /></div>
              </div>
            )}
          </div>
        )}
        <div className="flex items-center justify-between pt-1">
          {c ? <Btn variant="danger" onClick={del}>Eliminar</Btn> : <span />}
          <div className="flex gap-2"><Btn variant="ghost" onClick={onClose}>Cancelar</Btn><Btn disabled={busy} onClick={save}>{busy ? 'Guardando…' : 'Guardar'}</Btn></div>
        </div>
      </div>
    </Modal>
  );
}
