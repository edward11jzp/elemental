import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useApp } from '../context';
import { Btn, Card, Input, Label, Modal, Select, Stat, Table } from '../components/admin/ui';
import { curSym, listExpenses, loadAdminSettings, MONEY_ACCOUNTS, accountByKey, type Expense } from '../lib/adminData';
import { listSales, todayVe, fmt, type Sale } from '../lib/sales';
import { addMove, adjustAccount, computeBalances, deleteMove, loadFinance, moneyIn, type AccountBalance, type AccountConfig, type FinanceMove } from '../lib/finance';

const TYPE_LABEL: Record<string, string> = { in: '➕ Ingreso', out: '➖ Egreso', transfer: '🔁 Transferencia', cambio: '💱 Cambio', ajuste: '✎ Ajuste de saldo', gasto: '💸 Gasto' };
const dayLabel = (s: string) => (s ? new Date(s.slice(0, 10) + 'T12:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '');

export default function AdminAccounts() {
  const { orders, currentUser } = useApp();
  const [configs, setConfigs] = useState<AccountConfig[]>([]);
  const [moves, setMoves] = useState<FinanceMove[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [rate, setRate] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [adjust, setAdjust] = useState<AccountBalance | null>(null);
  const [moveOpen, setMoveOpen] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [f, s, e, st] = await Promise.all([loadFinance(), listSales(), listExpenses(), loadAdminSettings()]);
      setConfigs(f.configs); setMoves(f.moves); setSales(s); setExpenses(e); setRate(st.rates.exchangeRate);
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? 'Error');
    }
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const fin = useMemo(() => computeBalances({ configs, moves, sales, orders, expenses, rate }), [configs, moves, sales, orders, expenses, rate]);
  const t = fin.totals;
  const accCur = (k: string | null) => accountByKey(k)?.currency ?? 'USD';
  const accName = (k: string | null) => { const a = accountByKey(k); return a ? `${a.icon} ${a.name}` : k ?? '—'; };

  // Movimientos + gastos con cuenta, más recientes primero.
  const rows = useMemo(() => {
    const exp = expenses.filter((e) => e.account).map((e) => ({
      id: 'exp-' + e.id, type: 'gasto', account: e.account, to: null, amount: e.accountAmount ?? e.amount, amountTo: null,
      date: e.date, note: [e.category, e.description].filter(Boolean).join(' · '), userName: e.createdByName, createdAt: e.createdAt, deletable: false,
    }));
    return [...moves.map((m) => ({ ...m, deletable: m.type !== 'ajuste' })), ...exp].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 200);
  }, [moves, expenses]);

  const del = async (id: string) => {
    if (!confirm('¿Eliminar este movimiento? El saldo se recalcula.')) return;
    try { await deleteMove(id); toast.success('Movimiento eliminado'); reload(); } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="px-4 lg:px-6 py-5 max-w-[1600px] space-y-4">
      {error && (
        <div className="rounded-lg border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-[13px] text-[#b91c1c]">
          {error.includes('finance_') ? 'Falta ejecutar la migración supabase/admin_phase3_finance.sql en Supabase.' : error}
        </div>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-bold">Saldos en cuentas</h2>
          <p className="text-[12px] text-[#6b7280]">
            {rate ? `Bolívares a la tasa del día: Bs ${rate.toLocaleString('es-VE', { maximumFractionDigits: 2 })} / $` : 'Sin tasa del día: los bolívares no se pueden convertir a $'}
            {fin.copRate ? ` · Pesos a la tasa del último cambio: COP ${fin.copRate.toLocaleString('es-VE')} / $` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Btn variant="ghost" onClick={reload}>↻ Actualizar</Btn>
          <Btn onClick={() => setMoveOpen(true)}>+ Movimiento</Btn>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Total en cuentas" value={fmt(t.total)} sub={rate ? '≈ ' + moneyIn(t.total * rate, 'BS') : undefined} />
        <Stat label="🇻🇪 En bolívares" value={moneyIn(t.bs, 'BS')} sub={'≈ ' + fmt(t.bsUsd)} color="#b45309" />
        <Stat label="💵 En divisas" value={fmt(t.usd)} sub="Zelle · Binance · Efectivo $" color="#15803d" />
        <Stat label="🇨🇴 En pesos" value={moneyIn(t.cop, 'COP')} sub={fin.copRate ? '≈ ' + fmt(t.copUsd) : t.cop ? 'Sin tasa aún: no se suma al total' : undefined} />
      </div>

      {fin.unassigned > 0 && (
        <p className="text-[12px] text-[#92400e] bg-[#fffbeb] border border-[#fde68a] rounded-lg px-3 py-2">
          {fin.unassigned} venta(s) cobrada(s) sin medio de pago registrado: no suman a ninguna cuenta.
        </p>
      )}

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {fin.accounts.map((a) => {
          const cur = a.currency;
          const line = (label: string, n: number, sign: string, color: string) =>
            n ? <div className="flex justify-between"><span>{label}</span><span style={{ color }}>{sign}{moneyIn(n, cur)}</span></div> : null;
          return (
            <Card key={a.key} className="p-4 flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-lg">{a.icon}</span>
                <span className="font-semibold text-[14px]">{a.name}</span>
                <span className="ml-auto rounded-md border border-[#e6e6e9] bg-[#f4f4f5] px-1.5 py-0.5 text-[10px]">{cur === 'BS' ? 'Bs' : cur}</span>
              </div>
              <div className="text-[22px] font-extrabold mt-3" style={{ color: a.balance < 0 ? '#dc2626' : '#111' }}>{moneyIn(a.balance, cur)}</div>
              <div className="text-[11px] text-[#6b7280] h-4">{cur !== 'USD' && (cur === 'BS' ? rate : fin.copRate) ? '≈ ' + fmt(a.usd) : ''}</div>
              <div className="text-[12px] text-[#6b7280] space-y-1 mt-3 pt-3 border-t border-[#f0f0f2] flex-1">
                <div className="flex justify-between"><span>{a.since ? 'Saldo al ' + dayLabel(a.since) : 'Saldo inicial'}</span><span>{moneyIn(a.opening, cur)}</span></div>
                {line(`Ventas cobradas (${a.salesCount})`, a.sales, '+ ', '#16a34a')}
                {line(`Pedidos web (${a.ordersCount})`, a.orders, '+ ', '#16a34a')}
                {line(`Abonos de crédito (${a.creditCount})`, a.creditIn, '+ ', '#16a34a')}
                {line('Ingresos', a.inflow, '+ ', '#16a34a')}
                {line('Transferencias recibidas', a.transfersIn, '+ ', '#16a34a')}
                {line('Cambios recibidos', a.exchangesIn, '+ ', '#16a34a')}
                {line(`Gastos (${a.expensesCount})`, a.expenses, '− ', '#dc2626')}
                {line('Egresos', a.outflow, '− ', '#dc2626')}
                {line('Transferencias enviadas', a.transfersOut, '− ', '#dc2626')}
                {line('Cambios enviados', a.exchangesOut, '− ', '#dc2626')}
              </div>
              <Btn variant="ghost" className="w-full mt-3 !py-1.5 !text-[12px]" onClick={() => setAdjust(a)}>✎ Ajustar saldo</Btn>
            </Card>
          );
        })}
      </div>

      <Card>
        <div className="flex items-center justify-between px-4 pt-4">
          <h3 className="text-[14px] font-semibold">Movimientos y ajustes</h3>
          <span className="text-[11px] text-[#6b7280]">Las ventas cobradas y los pedidos web aprobados se suman solos</span>
        </div>
        <Table head={['Fecha', 'Tipo', 'Cuenta', 'Monto', 'Nota', 'Usuario', '']} empty={rows.length ? false : 'Sin movimientos todavía. Empieza ajustando el saldo real de cada cuenta.'}>
          {rows.map((m) => {
            const two = m.type === 'transfer' || m.type === 'cambio';
            const monto = two
              ? moneyIn(m.amount, accCur(m.account)) + (accCur(m.account) !== accCur(m.to) ? ' → ' + moneyIn(m.amountTo ?? 0, accCur(m.to)) : '')
              : (m.type === 'out' || m.type === 'gasto' ? '−' : m.type === 'in' ? '+' : '= ') + moneyIn(m.amount, accCur(m.account));
            const color = m.type === 'out' || m.type === 'gasto' ? '#dc2626' : m.type === 'in' ? '#16a34a' : undefined;
            return (
              <tr key={m.id}>
                <td className="whitespace-nowrap">{dayLabel(m.date)}</td>
                <td className="whitespace-nowrap">{TYPE_LABEL[m.type] ?? m.type}</td>
                <td>{two ? `${accName(m.account)} → ${accName(m.to)}` : accName(m.account)}</td>
                <td className="whitespace-nowrap" style={{ color }}>{monto}</td>
                <td className="text-[#6b7280]">{m.note}</td>
                <td className="text-[#6b7280]">{m.userName}</td>
                <td>{m.deletable && <button type="button" onClick={() => del(m.id)} className="text-[#9ca3af] hover:text-[#dc2626]" title="Eliminar">🗑</button>}</td>
              </tr>
            );
          })}
        </Table>
      </Card>

      {adjust && <AdjustModal account={adjust} onClose={() => setAdjust(null)} onSaved={() => { setAdjust(null); reload(); }} />}
      {moveOpen && <MoveModal rate={rate} copRate={fin.copRate} userName={currentUser?.name ?? ''} onClose={() => setMoveOpen(false)} onSaved={() => { setMoveOpen(false); reload(); }} />}
    </div>
  );
}

function AdjustModal({ account: a, onClose, onSaved }: { account: AccountBalance; onClose: () => void; onSaved: () => void }) {
  const [amount, setAmount] = useState(String(a.balance || ''));
  const [since, setSince] = useState(todayVe());
  const [note, setNote] = useState('');
  const save = async () => {
    if (amount === '' || !Number.isFinite(Number(amount))) return toast.error('Escribe el saldo');
    try { await adjustAccount(a.key, Number(amount), since, note.trim()); toast.success('Saldo ajustado'); onSaved(); } catch (e: any) { toast.error(e.message); }
  };
  return (
    <Modal open onClose={onClose} title={`Ajustar saldo · ${a.icon} ${a.name}`}>
      <div className="space-y-3">
        <p className="text-[12px] text-[#6b7280]">Escribe cuánto hay <b>realmente</b> en la cuenta al cierre del día elegido. Las ventas de ese día y anteriores quedan incluidas.</p>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Saldo ({curSym(a.currency)})</Label><Input type="number" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus /></div>
          <div><Label>Al cierre del día</Label><Input type="date" value={since} max={todayVe()} onChange={(e) => setSince(e.target.value)} /></div>
        </div>
        <div><Label>Nota</Label><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opcional" /></div>
        <div className="flex justify-end gap-2"><Btn variant="ghost" onClick={onClose}>Cancelar</Btn><Btn onClick={save}>Guardar saldo</Btn></div>
      </div>
    </Modal>
  );
}

function MoveModal({ rate, copRate, userName, onClose, onSaved }: { rate: number; copRate: number; userName: string; onClose: () => void; onSaved: () => void }) {
  const [type, setType] = useState<'in' | 'out' | 'transfer'>('out');
  const [account, setAccount] = useState(MONEY_ACCOUNTS[0].key);
  const [to, setTo] = useState(MONEY_ACCOUNTS[1].key);
  const [amount, setAmount] = useState('');
  const [amountTo, setAmountTo] = useState('');
  const [touched, setTouched] = useState(false);
  const [date, setDate] = useState(todayVe());
  const [note, setNote] = useState('');
  const from = accountByKey(account)!, dest = accountByKey(to)!;

  // Entre monedas distintas se propone lo recibido pasando por dólares; se puede corregir.
  useEffect(() => {
    if (touched || type !== 'transfer') return;
    const amt = Number(amount) || 0;
    const per: Record<string, number> = { USD: 1, BS: rate, COP: copRate };
    let v = amt;
    if (from.currency !== dest.currency) v = per[from.currency] && per[dest.currency] ? (amt / per[from.currency]) * per[dest.currency] : 0;
    setAmountTo(v ? String(Math.round(v * 100) / 100) : '');
  }, [amount, account, to, type, touched, rate, copRate, from.currency, dest.currency]);

  const save = async () => {
    const amt = Number(amount);
    if (!(amt > 0)) return toast.error('El monto debe ser mayor que cero');
    if (type === 'transfer') {
      if (to === account) return toast.error('Elige una cuenta destino distinta');
      if (!(Number(amountTo) > 0)) return toast.error('Indica cuánto se recibió');
    }
    try {
      await addMove({ type, account, to: type === 'transfer' ? to : null, amount: amt, amountTo: type === 'transfer' ? Number(amountTo) : null, date, note: note.trim() }, userName);
      toast.success('Movimiento registrado');
      onSaved();
    } catch (e: any) { toast.error(e.message); }
  };
  const opts = MONEY_ACCOUNTS.map((a) => <option key={a.key} value={a.key}>{a.icon} {a.name}</option>);
  return (
    <Modal open onClose={onClose} title="Nuevo movimiento">
      <div className="space-y-3">
        <div>
          <Label>Tipo</Label>
          <Select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
            <option value="out">➖ Egreso (sale dinero)</option>
            <option value="in">➕ Ingreso (entra dinero)</option>
            <option value="transfer">🔁 Transferencia entre cuentas</option>
          </Select>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
          <div><Label>{type === 'transfer' ? 'Desde' : 'Cuenta'}</Label><Select value={account} onChange={(e) => { setAccount(e.target.value); setTouched(false); }}>{opts}</Select></div>
          <div className="w-36"><Label>Monto ({curSym(from.currency)})</Label><Input type="number" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
        </div>
        {type === 'transfer' && (
          <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
            <div><Label>Hacia</Label><Select value={to} onChange={(e) => { setTo(e.target.value); setTouched(false); }}>{opts}</Select></div>
            <div className="w-36"><Label>Recibido ({curSym(dest.currency)})</Label><Input type="number" step="any" value={amountTo} onChange={(e) => { setAmountTo(e.target.value); setTouched(true); }} /></div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Fecha</Label><Input type="date" value={date} max={todayVe()} onChange={(e) => setDate(e.target.value)} /></div>
          <div><Label>Nota</Label><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opcional" /></div>
        </div>
        <p className="text-[11px] text-[#9ca3af]">Los gastos se registran en «Gastos» y los cambios de divisas en «Cambio de divisas»; ambos mueven estos saldos solos.</p>
        <div className="flex justify-end gap-2"><Btn variant="ghost" onClick={onClose}>Cancelar</Btn><Btn onClick={save}>Registrar</Btn></div>
      </div>
    </Modal>
  );
}
