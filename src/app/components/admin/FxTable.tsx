// Cambios de divisas realizados: cada fila saca dinero de una cuenta y lo mete
// en otra (mueve los saldos de Finanzas). La tasa se escribe como en la calle:
// unidades de la moneda débil por 1 de la fuerte ("Bs por 1 $", "COP por 1 $").
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useApp } from '../../context';
import { accountByKey, curSym, loadAdminSettings, MONEY_ACCOUNTS } from '../../lib/adminData';
import { addMove, deleteMove, loadFinance, moneyIn, updateMove, type FinanceMove } from '../../lib/finance';
import { todayVe } from '../../lib/sales';
import { Btn, Card, cx } from './ui';

const STRENGTH: Record<string, number> = { USD: 0, BS: 1, COP: 2 };
const cur = (k: string) => accountByKey(k)?.currency ?? '';
const num = (v: string | number | null | undefined) => { const n = parseFloat(String(v ?? '')); return isFinite(n) ? n : 0; };
const round = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d;

function modeOf(fromCur: string, toCur: string) {
  if (!fromCur || !toCur || fromCur === toCur) return null;
  const fromStrong = STRENGTH[fromCur] < STRENGTH[toCur];
  const strong = fromStrong ? fromCur : toCur, weak = fromStrong ? toCur : fromCur;
  return { fromStrong, label: `${curSym(weak)} por 1 ${curSym(strong)}` };
}

interface Row {
  id: string | null;
  date: string;
  account: string;
  to: string;
  amount: string;
  rate: string;
  amountTo: string;
  note: string;
  anchor: 'rate' | 'amountTo';
  saved?: Row;
}

const fromMove = (m: FinanceMove): Row => {
  const r: Row = { id: m.id, date: m.date, account: m.account, to: m.to ?? '', amount: String(m.amount), rate: m.rate == null ? '' : String(m.rate), amountTo: String(m.amountTo ?? ''), note: m.note, anchor: 'rate' };
  return { ...r, saved: { ...r } };
};
const snap = (r: Row) => [r.date, r.account, r.to, num(r.amount), r.rate === '' ? '' : num(r.rate), num(r.amountTo), r.note].join('|');

function recalc(r: Row): Row {
  const mode = modeOf(cur(r.account), cur(r.to));
  const amt = num(r.amount);
  if (!mode) return { ...r, rate: '', amountTo: r.anchor !== 'amountTo' ? (amt ? String(round(amt, 2)) : '') : r.amountTo };
  if (r.anchor === 'amountTo') {
    const got = num(r.amountTo);
    return { ...r, rate: amt && got ? String(round(mode.fromStrong ? got / amt : amt / got, 4)) : r.rate };
  }
  const rate = num(r.rate);
  return { ...r, amountTo: amt && rate ? String(round(mode.fromStrong ? amt * rate : amt / rate, 2)) : '' };
}

export default function FxTable() {
  const { currentUser } = useApp();
  const [rows, setRows] = useState<Row[]>([]);
  const [bsRate, setBsRate] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [f, st] = await Promise.all([loadFinance(), loadAdminSettings()]);
      setBsRate(st.rates.exchangeRate);
      setRows((prev) => [...prev.filter((r) => !r.id), ...f.moves.filter((m) => m.type === 'cambio').map(fromMove)]);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? 'Error');
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Tasa sugerida: la del último cambio del mismo par; si es Bs/$, la tasa del día.
  const suggest = (fc: string, tc: string) => {
    const pair = [fc, tc].sort().join('/');
    const prev = rows.find((r) => r.id && r.saved?.rate && [cur(r.saved.account), cur(r.saved.to)].sort().join('/') === pair);
    if (prev) return prev.saved!.rate;
    return pair === 'BS/USD' && bsRate ? String(round(bsRate, 4)) : '';
  };

  const add = () => {
    const last = rows.find((r) => r.id);
    const r: Row = { id: null, date: todayVe(), account: last?.account ?? '', to: last?.to ?? '', amount: '', rate: '', amountTo: '', note: '', anchor: 'rate' };
    if (r.account && r.to) r.rate = suggest(cur(r.account), cur(r.to));
    setRows((x) => [r, ...x]);
  };

  const edit = (i: number, field: keyof Row, val: string) =>
    setRows((x) =>
      x.map((r, j) => {
        if (j !== i) return r;
        const pairBefore = [cur(r.account), cur(r.to)].sort().join('/');
        let n: Row = { ...r, [field]: val };
        if (field === 'rate') n.anchor = 'rate';
        if (field === 'amountTo') n.anchor = 'amountTo';
        if (field === 'account' || field === 'to') {
          const fc = cur(n.account), tc = cur(n.to);
          if ([fc, tc].sort().join('/') !== pairBefore && modeOf(fc, tc)) { n.rate = suggest(fc, tc); n.anchor = 'rate'; }
          if (!modeOf(fc, tc)) n.anchor = 'rate';
        }
        if (['amount', 'rate', 'amountTo', 'account', 'to'].includes(field)) n = recalc(n);
        return n;
      }),
    );

  const save = async (i: number) => {
    const r = rows[i];
    const amount = num(r.amount), amountTo = num(r.amountTo);
    if (!r.account || !r.to) return toast.error('Elige la cuenta de origen y la de destino');
    if (r.account === r.to) return toast.error('La cuenta de destino debe ser distinta');
    if (!(amount > 0)) return toast.error('Indica cuánto envías');
    if (!(amountTo > 0)) return toast.error('Indica cuánto recibes');
    if (!r.date) return toast.error('Elige la fecha');
    const move = { type: 'cambio' as const, account: r.account, to: r.to, amount, amountTo, rate: r.rate === '' ? null : num(r.rate), date: r.date, note: r.note.trim() };
    try {
      if (r.id) await updateMove(r.id, move);
      else await addMove(move, currentUser?.name ?? '');
      const a = accountByKey(r.account)!, b = accountByKey(r.to)!;
      toast.success(`${r.id ? 'Cambio corregido' : 'Cambio registrado'}: −${moneyIn(amount, a.currency)} ${a.name} · +${moneyIn(amountTo, b.currency)} ${b.name}`);
      if (!r.id) setRows((x) => x.filter((_, j) => j !== i));
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const remove = async (i: number) => {
    const r = rows[i];
    if (!r.id || !r.saved) return;
    const a = accountByKey(r.saved.account), b = accountByKey(r.saved.to);
    if (!confirm(`¿Borrar este cambio?\n\nVuelven ${moneyIn(num(r.saved.amount), a?.currency ?? 'USD')} a ${a?.name} y salen ${moneyIn(num(r.saved.amountTo), b?.currency ?? 'USD')} de ${b?.name}.`)) return;
    try {
      await deleteMove(r.id);
      toast.success('Cambio borrado · saldos devueltos');
      setRows((x) => x.filter((_, j) => j !== i));
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const opts = (other: string) => (
    <>
      <option value="">Elegir…</option>
      {MONEY_ACCOUNTS.map((a) => <option key={a.key} value={a.key} disabled={a.key === other}>{a.icon} {a.name} ({curSym(a.currency)})</option>)}
    </>
  );
  const inp = 'w-full rounded-md border border-[#e6e6e9] bg-[#fff] px-2 py-1.5 text-[13px] text-[#111] outline-none focus:border-[#a1a1aa]';

  return (
    <Card className="p-4 mt-6 text-[#111]">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="max-w-2xl">
          <h3 className="text-[15px] font-semibold">Cambios realizados</h3>
          <p className="text-[12px] text-[#6b7280]">
            Cada fila es un cambio real: saca dinero de una cuenta y lo mete en otra. Los saldos de <b>Finanzas</b> se mueven al pulsar <b>Registrar</b>. Para un cambio en cadena (Bs → USDT → pesos) registra una fila por cada paso.
          </p>
        </div>
        <Btn onClick={add}>+ Nuevo cambio</Btn>
      </div>
      {error && <p className="text-[12px] text-[#b91c1c] mb-2">{error.includes('finance_') ? 'Falta ejecutar la migración de la fase 3 en Supabase.' : error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-[0.08em] text-[#71717a]">
              {['Fecha', 'Desde', 'Envías', 'Tasa', 'Hacia', 'Recibes', 'Nota', ''].map((h) => <th key={h} className="px-2 py-2 font-medium whitespace-nowrap border-b border-[#ececef]">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const fc = cur(r.account), tc = cur(r.to), mode = modeOf(fc, tc);
              const dirty = !r.id || !r.saved || snap(r) !== snap(r.saved);
              return (
                <tr key={r.id ?? 'new-' + i} className={cx('border-b border-[#f0f0f2] align-top', !r.id && 'bg-[#fafafa]')}>
                  <td className="p-1.5"><input type="date" className={inp} style={{ minWidth: 130 }} value={r.date} onChange={(e) => edit(i, 'date', e.target.value)} /></td>
                  <td className="p-1.5"><select className={inp} style={{ minWidth: 170 }} value={r.account} onChange={(e) => edit(i, 'account', e.target.value)}>{opts(r.to)}</select></td>
                  <td className="p-1.5"><div className="flex items-center gap-1"><input type="number" step="any" inputMode="decimal" className={inp} style={{ minWidth: 100 }} value={r.amount} onChange={(e) => edit(i, 'amount', e.target.value)} /><span className="text-[11px] text-[#71717a]">{fc ? curSym(fc) : ''}</span></div></td>
                  <td className="p-1.5">
                    {mode ? (
                      <>
                        <input type="number" step="any" inputMode="decimal" className={inp} style={{ minWidth: 90 }} value={r.rate} onChange={(e) => edit(i, 'rate', e.target.value)} />
                        <div className="text-[10px] text-[#71717a] mt-1 whitespace-nowrap">{mode.label}</div>
                      </>
                    ) : (
                      <span className="text-[11px] text-[#9ca3af]">{fc && tc ? 'misma moneda' : '—'}</span>
                    )}
                  </td>
                  <td className="p-1.5"><select className={inp} style={{ minWidth: 170 }} value={r.to} onChange={(e) => edit(i, 'to', e.target.value)}>{opts(r.account)}</select></td>
                  <td className="p-1.5"><div className="flex items-center gap-1"><input type="number" step="any" inputMode="decimal" className={inp} style={{ minWidth: 110 }} value={r.amountTo} onChange={(e) => edit(i, 'amountTo', e.target.value)} /><span className="text-[11px] text-[#71717a]">{tc ? curSym(tc) : ''}</span></div></td>
                  <td className="p-1.5"><input className={inp} style={{ minWidth: 120 }} value={r.note} placeholder="Opcional" onChange={(e) => edit(i, 'note', e.target.value)} /></td>
                  <td className="p-1.5 whitespace-nowrap">
                    {!r.id ? (
                      <>
                        <Btn className="!py-1.5 !px-3 !text-[12px]" onClick={() => save(i)}>Registrar</Btn>
                        <button type="button" className="px-2 text-[#9ca3af] hover:text-[#dc2626]" title="Descartar" onClick={() => setRows((x) => x.filter((_, j) => j !== i))}>✕</button>
                      </>
                    ) : dirty ? (
                      <>
                        <Btn className="!py-1.5 !px-3 !text-[12px]" onClick={() => save(i)}>Guardar</Btn>
                        <Btn variant="ghost" className="!py-1.5 !px-3 !text-[12px] ml-1" onClick={() => setRows((x) => x.map((y, j) => (j === i && y.saved ? { ...y.saved, saved: y.saved } : y)))}>Deshacer</Btn>
                      </>
                    ) : (
                      <>
                        <span className="rounded-md border border-[#e6e6e9] bg-[#f4f4f5] px-2 py-1 text-[11px]">✓ Registrado</span>
                        <button type="button" className="px-2 text-[#9ca3af] hover:text-[#dc2626]" title="Borrar y devolver el dinero" onClick={() => remove(i)}>🗑️</button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {!rows.length && <tr><td colSpan={8} className="text-center text-[#9ca3af] py-6">Sin cambios registrados. Pulsa «+ Nuevo cambio».</td></tr>}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
