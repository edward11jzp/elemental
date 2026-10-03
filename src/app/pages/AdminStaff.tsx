import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useApp } from '../context';
import { usePerms, isStaffRole, ROLE_LABEL } from '../lib/perms';
import { Btn, Card, Input, Label, Modal, Select, Stat, Textarea } from '../components/admin/ui';
import { accountByKey, curSym, listCustomers, listExpenses, loadAdminSettings, MONEY_ACCOUNTS, saveCustomer, saveExpense, type Customer, type Expense } from '../lib/adminData';
import { addSalePayment, deleteSalePayment, fmt, listSales, saleBalance, salePaid, todayVe, addDays, type Sale } from '../lib/sales';
import { FREQ_LABEL, FREQ_MONTH, listStaff, saveStaff, seniority, type PayFreq, type Staff, type StaffInput } from '../lib/staff';

const initials = (n: string) => n.split(/\s+/).map((x) => x[0]).join('').slice(0, 2).toUpperCase();
const dmy = (iso?: string | null) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—');
const methodName = (m: string) => (m === 'nomina' ? '🧾 Nómina' : (() => { const a = accountByKey(m); return a ? `${a.icon} ${a.name}` : m; })());

export default function AdminStaff() {
  const { isManager } = usePerms();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [rate, setRate] = useState(0);
  const [qs, setQs] = useState('');
  const [qc, setQc] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editStaff, setEditStaff] = useState<Staff | null | undefined>(undefined);
  const [payFor, setPayFor] = useState<Staff | null>(null);
  const [abono, setAbono] = useState<{ customer: Customer; sale?: Sale } | null>(null);

  const reload = useCallback(async () => {
    try {
      const [st, cs, sl, ex, set] = await Promise.all([listStaff(), listCustomers(), listSales(), listExpenses(), loadAdminSettings()]);
      setStaff(st); setCustomers(cs); setSales(sl); setExpenses(ex); setRate(set.rates.exchangeRate); setError(null);
    } catch (e: any) {
      setError(e?.message ?? 'Error');
    }
  }, []);
  useEffect(() => { reload(); }, [reload]);

  // Créditos: ventas a crédito no anuladas, por persona del personal (cliente marcado como personal).
  const credits = useMemo(() => sales.filter((s) => s.payMethod === 'credito' && s.pay !== 'cancelado'), [sales]);
  const owedOf = (customerId: string | null) => (customerId ? credits.filter((s) => s.customerId === customerId).reduce((a, s) => a + saleBalance(s), 0) : 0);
  const payroll = expenses.filter((e) => e.staffId);
  const year = todayVe().slice(0, 4);
  const lastPay = (id: string) => payroll.filter((e) => e.staffId === id).sort((a, b) => b.date.localeCompare(a.date))[0];
  const paidYear = (id: string) => payroll.filter((e) => e.staffId === id && e.date.startsWith(year)).reduce((a, e) => a + e.amount, 0);

  const active = staff.filter((s) => s.active);
  const monthly = active.reduce((a, s) => a + s.salary * (FREQ_MONTH[s.payFreq] ?? 2), 0);
  const s1 = qs.trim().toLowerCase();
  const shownStaff = staff.filter((s) => !s1 || [s.name, s.position, s.cedula, s.phone, s.email].some((v) => v.toLowerCase().includes(s1)));

  const employees = customers.filter((c) => c.isEmployee);
  const owedTotal = employees.reduce((a, c) => a + owedOf(c.id), 0);
  const s2 = qc.trim().toLowerCase();
  const withDebt = employees
    .map((c) => ({ c, owed: owedOf(c.id), list: credits.filter((s) => s.customerId === c.id).sort((a, b) => a.date.localeCompare(b.date)) }))
    .filter((x) => x.owed > 0.005 && (!s2 || [x.c.name, x.c.employeeBranch, x.c.cedula, x.c.phone].some((v) => v.toLowerCase().includes(s2))));

  const removeAbono = async (id: string) => {
    if (!confirm('¿Eliminar este abono? La deuda vuelve a subir.')) return;
    try { await deleteSalePayment(id); toast.success('Abono eliminado'); reload(); } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="px-4 lg:px-6 py-5 max-w-[1600px]">
      {error && <div className="mb-4 rounded-lg border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-[13px] text-[#b91c1c]">{error.includes('staff') ? 'Falta ejecutar la migración de la fase 4 en Supabase.' : error}</div>}
      <div className="grid xl:grid-cols-2 gap-6 items-start">
        {/* Nómina */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex-1 min-w-[200px]">
              <h2 className="text-[17px] font-bold">👥 Personal</h2>
              <p className="text-[12px] text-[#6b7280]">Tu nómina: datos básicos, sueldo y pagos de cada persona.</p>
            </div>
            <Input placeholder="🔍 Buscar" value={qs} onChange={(e) => setQs(e.target.value)} className="!w-40" />
            <Btn onClick={() => setEditStaff(null)}>+ Agregar</Btn>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Personas activas" value={String(active.length)} />
            <Stat label="Nómina al mes (aprox.)" value={fmt(monthly)} />
            <Stat label="Pagado este año" value={fmt(payroll.filter((e) => e.date.startsWith(year)).reduce((a, e) => a + e.amount, 0))} />
          </div>
          {shownStaff.map((s) => {
            const lp = lastPay(s.id), owed = owedOf(s.customerId);
            return (
              <Card key={s.id} className={'p-4 ' + (s.active ? '' : 'opacity-60')}>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f3e8ff] font-bold text-[#9333ea]">{initials(s.name)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{s.name}{!s.active && <span className="text-[11px] font-normal text-[#71717a]"> · inactivo</span>}</div>
                    <div className="text-[12px] text-[#6b7280]">{[s.position, s.cedula && 'C.I. ' + s.cedula, s.phone].filter(Boolean).join(' · ') || '—'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[17px] font-extrabold">{s.salary ? fmt(s.salary) : '—'}</div>
                    <div className="text-[11px] text-[#6b7280]">{s.salary ? FREQ_LABEL[s.payFreq] : 'sin sueldo cargado'}</div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[12px]">
                  <div><div className="text-[#71717a]">Ingreso</div><div>{dmy(s.hireDate)}</div></div>
                  <div><div className="text-[#71717a]">Antigüedad</div><div>{seniority(s.hireDate) || '—'}</div></div>
                  <div><div className="text-[#71717a]">Último pago</div><div>{lp ? `${fmt(lp.amount)} · ${dmy(lp.date)}` : '—'}</div></div>
                  <div><div className="text-[#71717a]">Crédito</div><div style={{ color: owed > 0 ? '#dc2626' : undefined }}>{owed > 0 ? 'debe ' + fmt(owed) : s.customerId ? 'al día' : '—'}</div></div>
                </div>
                {s.email && <div className="mt-2 text-[11px] text-[#6b7280]">📧 {s.email}</div>}
                {s.notes && <div className="mt-1 text-[11px] text-[#6b7280]">📝 {s.notes}</div>}
                <div className="mt-1 text-[11px] text-[#9ca3af]">Pagado este año: {fmt(paidYear(s.id))}</div>
                <div className="mt-3 flex gap-2">
                  {s.active && <Btn className="!py-1 !px-3 !text-[12px]" onClick={() => setPayFor(s)}>💵 Registrar pago</Btn>}
                  <Btn variant="ghost" className="!py-1 !px-3 !text-[12px]" onClick={() => setEditStaff(s)}>✏️ Editar</Btn>
                </div>
              </Card>
            );
          })}
          {!shownStaff.length && <Card className="p-6 text-center text-[13px] text-[#9ca3af]">{qs ? 'Nadie coincide con la búsqueda.' : 'Todavía no hay personal. Toca «+ Agregar».'}</Card>}
        </div>

        {/* Créditos */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="flex-1 text-[17px] font-bold">💳 Créditos de personal</h2>
            <Input placeholder="🔍 Nombre, cédula o sucursal" value={qc} onChange={(e) => setQc(e.target.value)} className="!w-56" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Por cobrar" value={fmt(owedTotal)} color="#dc2626" />
            <Stat label="Con deuda" value={String(employees.filter((c) => owedOf(c.id) > 0).length)} />
          </div>
          {!isManager && <Card className="p-4 text-[13px] text-[#6b7280]">Sólo un administrador o gerente puede registrar abonos.</Card>}
          {withDebt.map(({ c, owed, list }) => {
            const pct = c.creditLimit ? Math.min(100, Math.round((owed / c.creditLimit) * 100)) : 0;
            return (
              <Card key={c.id} className="p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#dbeafe] font-bold text-[#2563eb]">{initials(c.name)}</div>
                  <div className="min-w-0">
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-[12px] text-[#6b7280]">{c.employeeBranch || 'Sin sucursal'}{c.cedula ? ' · C.I. ' + c.cedula : ''}{c.phone ? ' · ' + c.phone : ''}</div>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="text-[18px] font-extrabold text-[#dc2626]">{fmt(owed)}</div>
                    <div className="text-[11px] text-[#6b7280]">{c.creditLimit ? `de ${fmt(c.creditLimit)} · disponible ${fmt(Math.max(0, c.creditLimit - owed))}` : 'sin límite'}</div>
                    {isManager && list.filter((s) => saleBalance(s) > 0).length > 1 && (
                      <Btn className="mt-1 !py-1 !px-3 !text-[11px]" onClick={() => setAbono({ customer: c })} title="Se reparte desde la compra más vieja">+ Abonar a la deuda</Btn>
                    )}
                  </div>
                </div>
                {c.creditLimit > 0 && (
                  <div className="mt-3 h-1.5 rounded-full bg-[#f1f1f3]"><div className="h-full rounded-full" style={{ width: pct + '%', background: pct >= 100 ? '#dc2626' : pct >= 80 ? '#eab308' : '#3b82f6' }} /></div>
                )}
                {list.map((s) => {
                  const bal = saleBalance(s);
                  return (
                    <div key={s.id} className="mt-3 border-t border-[#f0f0f2] pt-3 text-[13px]">
                      <div className="flex flex-wrap items-center gap-2">
                        <b>{s.id}</b>
                        <span className="text-[12px] text-[#6b7280]">{dmy(s.date)} · {s.items.map((i) => i.qty + '× ' + i.name).join(', ')}</span>
                        <span className="ml-auto">Total {fmt(s.total)} · abonado {fmt(salePaid(s))} · <b style={{ color: bal > 0 ? '#dc2626' : '#16a34a' }}>{bal > 0 ? 'falta ' + fmt(bal) : 'pagado ✓'}</b></span>
                        {isManager && bal > 0 && <Btn className="!py-1 !px-3 !text-[11px]" onClick={() => setAbono({ customer: c, sale: s })}>+ Abono</Btn>}
                      </div>
                      {s.payments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {s.payments.map((p) => (
                            <div key={p.id} className="flex flex-wrap items-center gap-2 text-[12px] text-[#6b7280]">
                              <span>{dmy(p.date)}</span><span>+{fmt(p.amount)}</span><span>{methodName(p.method)}{p.bs ? ' · Bs ' + p.bs.toLocaleString('es-VE') : ''}</span>
                              {p.note && <span>· {p.note}</span>}<span>· {p.userName}</span>
                              {isManager && <button type="button" className="ml-auto hover:text-[#dc2626]" title="Eliminar abono" onClick={() => removeAbono(p.id)}>🗑</button>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </Card>
            );
          })}
          {!withDebt.length && <Card className="p-6 text-center text-[13px] text-[#9ca3af]">{qc ? 'Nadie coincide con la búsqueda.' : '✅ Nadie tiene créditos pendientes.'}</Card>}
          <p className="text-[11px] text-[#9ca3af]">Las compras a crédito se hacen en Ventas → Nueva venta, eligiendo como cliente a alguien del personal (sólo admin o gerente).</p>
        </div>
      </div>

      {editStaff !== undefined && <StaffModal staff={editStaff} customers={customers} onClose={() => setEditStaff(undefined)} onSaved={() => { setEditStaff(undefined); reload(); }} />}
      {payFor && <PayrollModal staff={payFor} credits={credits.filter((s) => s.customerId && s.customerId === payFor.customerId && saleBalance(s) > 0)} rate={rate} onClose={() => setPayFor(null)} onSaved={() => { setPayFor(null); reload(); }} />}
      {abono && <AbonoModal customer={abono.customer} sale={abono.sale} credits={credits.filter((s) => s.customerId === abono.customer.id && saleBalance(s) > 0)} rate={rate} onClose={() => setAbono(null)} onSaved={() => { setAbono(null); reload(); }} />}
    </div>
  );
}

function StaffModal({ staff: s, customers, onClose, onSaved }: { staff: Staff | null; customers: Customer[]; onClose: () => void; onSaved: () => void }) {
  const { users } = useApp();
  const { isAdmin } = usePerms();
  const linked = customers.find((c) => c.id === s?.customerId);
  const [f, setF] = useState<StaffInput>(
    s ? { ...s } : { name: '', position: '', cedula: '', phone: '', email: '', hireDate: '', salary: 0, payFreq: 'quincenal', customerId: null, userId: null, notes: '', active: true },
  );
  const [creditOn, setCreditOn] = useState(!!linked?.isEmployee);
  const [branch, setBranch] = useState(linked?.employeeBranch ?? '');
  const [limit, setLimit] = useState(linked?.creditLimit ? String(linked.creditLimit) : '');
  const set = (p: Partial<StaffInput>) => setF((x) => ({ ...x, ...p }));

  const save = async () => {
    if (!f.name.trim()) return toast.error('Escribe el nombre');
    if (!f.hireDate && !confirm('Sin fecha de ingreso no se calcula la antigüedad. ¿Guardar igual?')) return;
    try {
      let customerId = f.customerId;
      // Crédito al personal: la persona necesita una ficha de cliente marcada como personal.
      if (creditOn || linked) {
        const base = linked ?? null;
        const saved = await saveCustomer(
          {
            name: base?.name ?? f.name.trim(), cedula: base?.cedula || f.cedula, phone: base?.phone || f.phone, email: base?.email || f.email,
            docCurrency: base?.docCurrency ?? 'USD', tier: base?.tier ?? 'Regular', fav: base?.fav ?? '', notes: base?.notes ?? 'Personal de Elemental',
            isEmployee: creditOn, employeeBranch: branch.trim(), creditLimit: Number(limit) || 0,
          },
          base?.id,
        );
        customerId = saved.id;
      }
      await saveStaff({ ...f, name: f.name.trim(), customerId }, s?.id);
      toast.success('Empleado guardado ✓');
      onSaved();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Modal open onClose={onClose} title={s ? 'Editar · ' + s.name : 'Nuevo empleado'}>
      <div className="space-y-3">
        <div><Label>Nombre y apellido</Label><Input autoFocus value={f.name} onChange={(e) => set({ name: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Cargo</Label><Input value={f.position} onChange={(e) => set({ position: e.target.value })} placeholder="Ej: Costurera, Vendedor" /></div>
          <div><Label>Cédula</Label><Input value={f.cedula} onChange={(e) => set({ cedula: e.target.value })} /></div>
          <div><Label>Teléfono</Label><Input value={f.phone} onChange={(e) => set({ phone: e.target.value })} /></div>
          <div><Label>Fecha de ingreso</Label><Input type="date" value={f.hireDate ?? ''} onChange={(e) => set({ hireDate: e.target.value })} /></div>
          <div><Label>Sueldo ($)</Label><Input type="number" step="0.01" value={f.salary || ''} onChange={(e) => set({ salary: Number(e.target.value) || 0 })} /></div>
          <div>
            <Label>Frecuencia de pago</Label>
            <Select value={f.payFreq} onChange={(e) => set({ payFreq: e.target.value as PayFreq })}>
              <option value="semanal">Semanal</option><option value="quincenal">Quincenal</option><option value="mensual">Mensual</option>
            </Select>
          </div>
        </div>
        <div><Label>Correo (para el recibo)</Label><Input type="email" value={f.email} onChange={(e) => set({ email: e.target.value })} /></div>
        {isAdmin && (
          <div>
            <Label>Usuario del panel (opcional)</Label>
            <Select value={f.userId ?? ''} onChange={(e) => set({ userId: e.target.value || null })}>
              <option value="">— Ninguno —</option>
              {users.filter((u) => isStaffRole(u.role)).map((u) => <option key={u.id} value={u.id}>{u.name} · {ROLE_LABEL[u.role] ?? u.role}</option>)}
            </Select>
          </div>
        )}
        <div className="rounded-lg border border-[#ececef] p-3 space-y-2">
          <label className="flex items-center gap-2 text-[13px] font-medium cursor-pointer">
            <input type="checkbox" checked={creditOn} onChange={(e) => setCreditOn(e.target.checked)} /> 💳 Puede comprar a crédito (precio al mayor, paga con abonos)
          </label>
          {creditOn && (
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Sucursal / área</Label><Input value={branch} onChange={(e) => setBranch(e.target.value)} /></div>
              <div><Label>Límite de crédito ($)</Label><Input type="number" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="0 = sin límite" /></div>
            </div>
          )}
        </div>
        <div><Label>Notas</Label><Textarea rows={2} value={f.notes} onChange={(e) => set({ notes: e.target.value })} /></div>
        {s && <label className="flex items-center gap-2 text-[13px] cursor-pointer"><input type="checkbox" checked={f.active} onChange={(e) => set({ active: e.target.checked })} /> Activo</label>}
        <div className="flex justify-end gap-2"><Btn variant="ghost" onClick={onClose}>Cancelar</Btn><Btn onClick={save}>Guardar empleado</Btn></div>
      </div>
    </Modal>
  );
}

function periodFor(kind: 'semana' | 'quincena' | 'mes'): [string, string] {
  const t = todayVe();
  const d = +t.slice(8, 10);
  if (kind === 'semana') return [addDays(t, -6), t];
  if (kind === 'mes') { const end = addDays(addDays(t.slice(0, 8) + '01', 32).slice(0, 8) + '01', -1); return [t.slice(0, 8) + '01', end]; }
  if (d <= 15) return [t.slice(0, 8) + '01', t.slice(0, 8) + '15'];
  return [t.slice(0, 8) + '16', addDays(addDays(t.slice(0, 8) + '01', 32).slice(0, 8) + '01', -1)];
}

function PayrollModal({ staff: s, credits, rate, onClose, onSaved }: { staff: Staff; credits: Sale[]; rate: number; onClose: () => void; onSaved: () => void }) {
  const { currentUser } = useApp();
  const { isManager } = usePerms();
  const initial = periodFor(s.payFreq === 'semanal' ? 'semana' : s.payFreq === 'mensual' ? 'mes' : 'quincena');
  const [from, setFrom] = useState(initial[0]);
  const [to, setTo] = useState(initial[1]);
  const [amount, setAmount] = useState(String(s.salary || ''));
  const [account, setAccount] = useState('');
  const [accAmount, setAccAmount] = useState('');
  const [accTouched, setAccTouched] = useState(false);
  const [date, setDate] = useState(todayVe());
  const [ded, setDed] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const acc = accountByKey(account);
  const deductions = credits.map((c) => ({ saleId: c.id, amount: Math.min(saleBalance(c), Math.max(0, Number(ded[c.id]) || 0)) })).filter((d) => d.amount > 0);
  const net = Math.round(((Number(amount) || 0) - deductions.reduce((a, d) => a + d.amount, 0)) * 100) / 100;

  useEffect(() => {
    if (accTouched || !acc || acc.currency === 'USD') return;
    setAccAmount(acc.currency === 'BS' && rate && net > 0 ? String(Math.round(net * rate * 100) / 100) : '');
  }, [account, net, rate, accTouched, acc]);

  const save = async () => {
    const gross = Number(amount) || 0;
    if (!(gross > 0)) return toast.error('Indica el monto del pago');
    if (net < 0) return toast.error('Los descuentos superan el pago');
    if (deductions.length && !isManager) return toast.error('Sólo un administrador o gerente puede descontar créditos por nómina');
    if (!acc && !confirm('No elegiste "Pagado desde": el pago no se descontará de ninguna cuenta en Finanzas. ¿Continuar?')) return;
    const accountAmount = acc ? (acc.currency === 'USD' ? net : Number(accAmount)) : null;
    if (acc && acc.currency !== 'USD' && !(accountAmount! > 0)) return toast.error('Indica cuánto salió en ' + curSym(acc.currency));
    setBusy(true);
    try {
      for (const d of deductions) {
        await addSalePayment(d.saleId, { amount: d.amount, method: 'nomina', currency: 'USD', bs: null, date, note: `Descuento de nómina ${dmy(from)}–${dmy(to)}` });
      }
      await saveExpense(
        {
          type: 'operativo', category: 'Empleados', description: `Pago de nómina · ${s.name} (${dmy(from)} al ${dmy(to)})`, supplier: s.name,
          amount: gross, date, account: acc?.key ?? '', accountAmount, staffId: s.id, periodFrom: from, periodTo: to, deductions,
        },
        undefined,
        currentUser?.name,
      );
      toast.success(`Pago registrado: ${fmt(gross)}${deductions.length ? ` · descontado ${fmt(gross - net)} de créditos` : ''}`);
      onSaved();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={'Registrar pago · ' + s.name}>
      <div className="space-y-3">
        <div>
          <Label>Período que se paga</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="flex gap-1.5 mt-1.5">
            {(['quincena', 'semana', 'mes'] as const).map((k) => (
              <Btn key={k} variant="ghost" className="!py-1 !px-2 !text-[11px]" onClick={() => { const [a, b] = periodFor(k); setFrom(a); setTo(b); }}>{k[0].toUpperCase() + k.slice(1)}</Btn>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Monto bruto ($)</Label><Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div><Label>Fecha del pago</Label><Input type="date" value={date} max={todayVe()} onChange={(e) => setDate(e.target.value)} /></div>
        </div>
        {credits.length > 0 && (
          <div className="rounded-lg border border-[#fde68a] bg-[#fffbeb] p-3 space-y-2">
            <div className="text-[12px] font-semibold text-[#92400e]">Descontar créditos pendientes (opcional)</div>
            {credits.map((c) => (
              <div key={c.id} className="flex items-center gap-2 text-[12px]">
                <span className="flex-1">{c.id} · falta {fmt(saleBalance(c))}</span>
                <Input type="number" step="0.01" min={0} value={ded[c.id] ?? ''} onChange={(e) => setDed({ ...ded, [c.id]: e.target.value })} placeholder="$ 0" className="!w-24 !py-1" />
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div className={acc && acc.currency !== 'USD' ? '' : 'col-span-2'}>
            <Label>Pagado desde</Label>
            <Select value={account} onChange={(e) => { setAccount(e.target.value); setAccTouched(false); }}>
              <option value="">— Sin especificar —</option>
              {MONEY_ACCOUNTS.map((a) => <option key={a.key} value={a.key}>{a.icon} {a.name}</option>)}
            </Select>
          </div>
          {acc && acc.currency !== 'USD' && (
            <div><Label>Salió en {curSym(acc.currency)}</Label><Input type="number" step="0.01" value={accAmount} onChange={(e) => { setAccAmount(e.target.value); setAccTouched(true); }} /></div>
          )}
        </div>
        <div className="flex justify-between rounded-lg bg-[#f4f4f5] px-3 py-2 text-[13px]"><span>Neto a pagar</span><b>{fmt(net)}</b></div>
        <p className="text-[11px] text-[#9ca3af]">Se registra como gasto operativo (Empleados) por el monto bruto y descuenta el neto de la cuenta elegida.</p>
        <div className="flex justify-end gap-2"><Btn variant="ghost" onClick={onClose}>Cancelar</Btn><Btn disabled={busy} onClick={save}>{busy ? 'Guardando…' : 'Registrar pago'}</Btn></div>
      </div>
    </Modal>
  );
}

function AbonoModal({ customer, sale, credits, rate, onClose, onSaved }: { customer: Customer; sale?: Sale; credits: Sale[]; rate: number; onClose: () => void; onSaved: () => void }) {
  const owed = sale ? saleBalance(sale) : credits.reduce((a, s) => a + saleBalance(s), 0);
  const [amount, setAmount] = useState(String(owed));
  const [method, setMethod] = useState('efectivo_usd');
  const [bs, setBs] = useState('');
  const [bsTouched, setBsTouched] = useState(false);
  const [date, setDate] = useState(todayVe());
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const acc = accountByKey(method);
  const isBs = acc?.currency === 'BS';
  useEffect(() => {
    if (isBs && !bsTouched) { const a = Number(amount) || 0; setBs(a && rate ? String(Math.round(a * rate * 100) / 100) : ''); }
  }, [amount, isBs, bsTouched, rate]);

  const save = async () => {
    const amt = Math.round((Number(amount) || 0) * 100) / 100;
    if (!(amt > 0)) return toast.error('Indica el monto del abono');
    if (amt > owed + 0.01) return toast.error('El abono es mayor que la deuda (' + fmt(owed) + ')');
    const bsTotal = isBs ? Number(bs) || 0 : 0;
    if (isBs && !bsTotal) return toast.error('Indica cuánto entró en Bs');
    setBusy(true);
    try {
      const targets = sale ? [sale] : [...credits].sort((a, b) => a.date.localeCompare(b.date));
      let rest = amt, done = 0;
      for (const c of targets) {
        if (rest <= 0.005) break;
        const part = Math.min(rest, saleBalance(c));
        if (part <= 0) continue;
        await addSalePayment(c.id, { amount: part, method, currency: isBs ? 'BS' : 'USD', bs: isBs ? Math.round((bsTotal * part) / amt * 100) / 100 : null, date, note: note.trim() });
        rest = Math.round((rest - part) * 100) / 100;
        done++;
      }
      toast.success(`Abono de ${fmt(amt)}${done > 1 ? ` repartido en ${done} compras` : ''} · falta ${fmt(Math.max(0, owed - amt))}`);
      onSaved();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={sale ? 'Abono a ' + sale.id : 'Abono a la deuda de ' + customer.name}>
      <div className="space-y-3">
        <p className="text-[13px]">{customer.name} · falta <b>{fmt(owed)}</b></p>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Monto ($)</Label><Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div>
            <Label>Con qué pagó</Label>
            <Select value={method} onChange={(e) => { setMethod(e.target.value); setBsTouched(false); }}>
              {MONEY_ACCOUNTS.filter((a) => a.currency !== 'COP').map((a) => <option key={a.key} value={a.key}>{a.icon} {a.name}</option>)}
              <option value="nomina">🧾 Descuento de nómina</option>
            </Select>
          </div>
          {isBs && <div><Label>Bs que entraron</Label><Input type="number" step="0.01" value={bs} onChange={(e) => { setBs(e.target.value); setBsTouched(true); }} /></div>}
          <div><Label>Fecha</Label><Input type="date" value={date} max={todayVe()} onChange={(e) => setDate(e.target.value)} /></div>
        </div>
        {method === 'nomina' && <p className="text-[11px] text-[#92400e]">El descuento de nómina no entra a ninguna cuenta de Finanzas.</p>}
        <div><Label>Nota</Label><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opcional" /></div>
        <div className="flex justify-end gap-2"><Btn variant="ghost" onClick={onClose}>Cancelar</Btn><Btn disabled={busy} onClick={save}>{busy ? 'Registrando…' : 'Registrar abono'}</Btn></div>
      </div>
    </Modal>
  );
}
