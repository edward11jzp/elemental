import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useApp } from '../context';
import { BarRow, Btn, Card, Input, Label, Modal, PALETTE, Select, Stat, Table, Tabs } from '../components/admin/ui';
import {
  accountByKey,
  curSym,
  deleteExpense,
  EXPENSE_CATEGORIES,
  EXPENSE_TYPES,
  expenseShare,
  expenseTotals,
  listExpenses,
  loadAdminSettings,
  MONEY_ACCOUNTS,
  receiptUrl,
  saveExpense,
  uploadExpenseReceipt,
  type Expense,
  type ExpenseType,
} from '../lib/adminData';
import { fmt, todayVe } from '../lib/sales';
import { compressImage, parseReceipt, readReceipt } from '../lib/receiptOcr';
import { SelfReviewBadge } from '../lib/selfReview';
import { useSedes } from '../lib/sedes';

type Tab = 'resumen' | ExpenseType;
const tip = { borderRadius: 8, border: '1px solid #e6e6e9', fontSize: 12, background: '#fff', color: '#111' };
const typeLabel = (t: ExpenseType) => (t === 'materia_prima' ? 'materia prima' : t === 'merma' ? 'mermas / desechos' : 'operativos');

export default function AdminExpenses() {
  const { currentUser } = useApp();
  const [tab, setTab] = useState<Tab>('resumen');
  const [list, setList] = useState<Expense[]>([]);
  const [rate, setRate] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ type: ExpenseType; edit?: Expense; image?: string } | null>(null);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => {
    try {
      setList(await listExpenses());
    } catch (e: any) {
      setError(e?.message ?? 'Error');
    }
  }, []);
  useEffect(() => {
    reload();
    loadAdminSettings().then((s) => setRate(s.rates.exchangeRate)).catch(() => {});
  }, [reload]);

  // Con una sede elegida arriba, cada gasto cuenta solo por la parte de esa sede.
  const { sede, nameOf } = useSedes();
  const shown = useMemo(
    () => (sede ? list.map((e) => ({ ...e, amount: expenseShare(e, sede) })).filter((e) => e.amount > 0) : list),
    [list, sede],
  );

  const tabType: ExpenseType = tab === 'resumen' ? 'operativo' : tab;

  const handleFile = useCallback(
    async (file: File) => {
      if (!/^image\//.test(file.type)) return toast.error('Sube una imagen (foto o captura). Los PDF no se pueden leer todavía.');
      try {
        const image = await compressImage(file);
        setModal({ type: tabType, image });
      } catch (e: any) {
        toast.error(e.message);
      }
    },
    [tabType],
  );

  // Pegar una captura con Ctrl/Cmd+V en cualquier parte de Gastos.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (modal) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      const item = [...(e.clipboardData?.items ?? [])].find((i) => i.kind === 'file' && /^image\//.test(i.type));
      const f = item?.getAsFile();
      if (f) {
        e.preventDefault();
        handleFile(new File([f], 'captura.png', { type: f.type }));
      }
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [handleFile, modal]);

  return (
    <div
      className="px-4 lg:px-6 py-5 max-w-[1600px]"
      onDragOver={(e) => {
        if ([...(e.dataTransfer.types || [])].includes('Files')) {
          e.preventDefault();
          setDrag(true);
        }
      }}
      onDragLeave={(e) => e.relatedTarget === null && setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const f = [...e.dataTransfer.files].find((x) => /^image\//.test(x.type)) ?? e.dataTransfer.files[0];
        if (f) handleFile(f);
      }}
    >
      {error && (
        <div className="mb-4 rounded-lg border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-[13px] text-[#b91c1c]">
          {error.includes('does not exist') || error.includes('schema cache') ? 'Falta ejecutar la migración supabase/admin_phase1_sales_expenses.sql en Supabase.' : error}
        </div>
      )}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex-1 min-w-0">
          <Tabs<Tab>
            value={tab}
            onChange={setTab}
            tabs={[
              { key: 'resumen', label: '📊 Resumen' },
              { key: 'operativo', label: '🏢 Gastos operativos' },
              { key: 'materia_prima', label: '🧵 Materia prima' },
              { key: 'merma', label: '🗑️ Mermas / Desechos' },
            ]}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className={`w-full mb-5 rounded-xl border-2 border-dashed px-4 py-4 text-center text-[13px] transition-colors ${drag ? 'border-[#a855f7] bg-[#faf5ff]' : 'border-[#e6e6e9] bg-[#fff] hover:border-[#a1a1aa]'}`}
      >
        📎 <b>Arrastra la factura aquí</b>, pégala con <kbd className="rounded border border-[#e6e6e9] px-1 text-[11px]">Ctrl</kbd>+<kbd className="rounded border border-[#e6e6e9] px-1 text-[11px]">V</kbd> o toca para elegirla
        <div className="text-[11px] text-[#9ca3af] mt-1">Foto o captura (JPG, PNG). La página la lee y te propone el gasto.</div>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) handleFile(f);
        }}
      />

      {sede && <p className="mb-3 text-[12px] text-[#6b7280]">Viendo solo lo que le toca a <b>{nameOf(sede)}</b>. Los gastos generales (sin sede) no se cuentan aquí.</p>}
      {tab === 'resumen' ? <Resumen list={shown} rate={rate} /> : <TypeTab type={tab} list={shown} rate={rate} onNew={() => setModal({ type: tab })} onEdit={(e) => setModal({ type: e.type, edit: list.find((x) => x.id === e.id) ?? e })} onDeleted={reload} />}

      {modal && (
        <ExpenseModal
          key={modal.edit?.id ?? modal.image ?? modal.type}
          type={modal.type}
          edit={modal.edit}
          image={modal.image}
          rate={rate}
          userName={currentUser?.name ?? ''}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function Resumen({ list, rate }: { list: Expense[]; rate: number }) {
  const t = expenseTotals(list);
  const pct = (v: number) => (t.total ? Math.round((v / t.total) * 100) : 0) + '%';
  const max = Math.max(1, ...t.byCategory.map((x) => x[1]));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Total gastos" value={fmt(t.total)} sub={rate ? '≈ Bs ' + Math.round(t.total * rate).toLocaleString('es-VE') : undefined} color="#dc2626" />
        <Stat label="🧵 Materia prima" value={fmt(t.materiaPrima)} sub={pct(t.materiaPrima)} />
        <Stat label="🗑️ Mermas / Desechos" value={fmt(t.merma)} sub={pct(t.merma)} />
        <Stat label="🏢 Operativos" value={fmt(t.operativo)} sub={pct(t.operativo)} />
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-4 space-y-3">
          <h3 className="text-[14px] font-semibold">Gastos por categoría</h3>
          {t.byCategory.length ? t.byCategory.map(([c, v], i) => <BarRow key={c} label={c} value={v} max={max} right={fmt(v)} color={PALETTE[i % PALETTE.length]} />) : <p className="text-[13px] text-[#9ca3af]">Sin datos.</p>}
        </Card>
        <Card className="p-4">
          <h3 className="text-[14px] font-semibold mb-2">Distribución</h3>
          <div className="h-[260px]">
            {t.total > 0 ? (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={[{ n: 'Materia prima', v: t.materiaPrima }, { n: 'Mermas', v: t.merma }, { n: 'Operativos', v: t.operativo }]} dataKey="v" nameKey="n" innerRadius="55%" outerRadius="82%" stroke="none">
                    {['#f59e0b', '#ef4444', '#8b5cf6'].map((c) => <Cell key={c} fill={c} />)}
                  </Pie>
                  <Tooltip contentStyle={tip} formatter={(v: number) => fmt(v)} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="h-full flex items-center justify-center text-[13px] text-[#9ca3af]">Sin gastos registrados.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function TypeTab({ type, list, rate, onNew, onEdit, onDeleted }: { type: ExpenseType; list: Expense[]; rate: number; onNew: () => void; onEdit: (e: Expense) => void; onDeleted: () => void }) {
  const [from, setFrom] = useState(todayVe().slice(0, 4) + '-01-01');
  const [to, setTo] = useState('');
  const rows = useMemo(() => list.filter((e) => e.type === type && (!from || e.date >= from) && e.date <= (to || '2099-12-31')), [list, type, from, to]);
  const total = rows.reduce((a, e) => a + e.amount, 0);
  const cats: Record<string, number> = {};
  rows.forEach((e) => (cats[e.category] = (cats[e.category] || 0) + e.amount));
  const topCats = Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const newLabel = type === 'materia_prima' ? '+ Registrar compra' : type === 'merma' ? '+ Registrar merma' : '+ Registrar gasto';

  const del = async (e: Expense) => {
    if (!confirm(`¿Eliminar "${e.description}" (${fmt(e.amount)})?`)) return;
    try {
      await deleteExpense(e);
      toast.success('Gasto eliminado');
      onDeleted();
    } catch (err: any) {
      toast.error(err.message);
    }
  };
  const openFile = async (e: Expense) => {
    try {
      window.open(await receiptUrl(e.receiptPath!), '_blank');
    } catch (err: any) {
      toast.error(err.message);
    }
  };
  const { nameOf } = useSedes();
  const sedeLabel = (e: Expense) =>
    e.splits?.length ? '➗ ' + e.splits.map((x) => `${nameOf(x.locationId)} ${fmt(x.amount)}`).join(' · ') : e.locationId ? '🏢 ' + nameOf(e.locationId) : 'General';
  const accLabel = (e: Expense) => {
    const a = accountByKey(e.account);
    if (!a) return '—';
    return `${a.icon} ${a.name}${a.currency !== 'USD' && e.accountAmount ? ` · ${curSym(a.currency)} ${e.accountAmount.toLocaleString('es-VE')}` : ''}`;
  };

  return (
    <div className="space-y-4">
      <Card className="p-3 flex flex-wrap items-end gap-3">
        <div><Label>Desde</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><Label>Hasta</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <Btn className="ml-auto" onClick={onNew}>{newLabel}</Btn>
      </Card>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label={'Total ' + typeLabel(type)} value={fmt(total)} sub={`${rate ? '≈ Bs ' + Math.round(total * rate).toLocaleString('es-VE') + ' · ' : ''}${rows.length} registros`} color="#dc2626" />
        {topCats.map(([c, v]) => <Stat key={c} label={c} value={fmt(v)} sub={`${total ? Math.round((v / total) * 100) : 0}% del total`} />)}
      </div>
      <Card>
        <Table
          head={['Fecha', 'Categoría', 'Nombre', 'Proveedor', 'Sede', 'Pagado desde', 'Monto', '']}
          empty={rows.length ? false : 'Sin gastos registrados.'}
          foot={rows.length ? <tr><td colSpan={6}>TOTAL ({rows.length})</td><td className="text-[#dc2626]">{fmt(total)}</td><td /></tr> : undefined}
        >
          {rows.map((e) => (
            <tr key={e.id}>
              <td className="text-[12px] text-[#6b7280] whitespace-nowrap">{e.date}</td>
              <td><span className="rounded-md border border-[#e6e6e9] bg-[#f4f4f5] px-2 py-0.5 text-[11px] whitespace-nowrap">{e.category}</span></td>
              <td>{e.description} <SelfReviewBadge refId={String(e.id)} /></td>
              <td className="text-[#6b7280]">{e.supplier || '—'}</td>
              <td className="text-[#6b7280] text-[12px]">{sedeLabel(e)}</td>
              <td className="text-[#6b7280] whitespace-nowrap text-[12px]">{accLabel(e)}</td>
              <td className="font-semibold text-[#dc2626] whitespace-nowrap">
                {e.currency && e.currency !== 'USD' && e.originalAmount ? (
                  <>{curSym(e.currency)} {e.originalAmount.toLocaleString('es-VE')}<div className="text-[11px] font-normal text-[#6b7280]">≈ {fmt(e.amount)}</div></>
                ) : fmt(e.amount)}
              </td>
              <td className="text-right whitespace-nowrap">
                {e.receiptPath && <IconBtn title="Ver comprobante" onClick={() => openFile(e)}>📎</IconBtn>}
                <IconBtn title="Editar" onClick={() => onEdit(e)}>✏️</IconBtn>
                <IconBtn title="Eliminar" onClick={() => del(e)}>🗑️</IconBtn>
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}

function IconBtn({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...p} className="rounded-md px-1.5 py-1 hover:bg-[#f4f4f5]" aria-label={p.title}>{children}</button>;
}

function ExpenseModal({ type: initialType, edit, image, rate, userName, onClose, onSaved }: { type: ExpenseType; edit?: Expense; image?: string; rate: number; userName: string; onClose: () => void; onSaved: () => void }) {
  const [type, setType] = useState<ExpenseType>(edit?.type ?? initialType);
  const [category, setCategory] = useState(edit?.category ?? EXPENSE_CATEGORIES[edit?.type ?? initialType][0]);
  const [description, setDescription] = useState(edit?.description ?? '');
  const [supplier, setSupplier] = useState(edit?.supplier ?? '');
  const [amount, setAmount] = useState(edit ? String(edit.amount) : '');
  // Moneda del gasto: se escribe en esa moneda y se convierte a $ con la tasa.
  const [cur, setCur] = useState<'USD' | 'BS' | 'COP'>(edit?.currency ?? 'USD');
  const [orig, setOrig] = useState(edit?.originalAmount != null ? String(edit.originalAmount) : '');
  const [fx, setFx] = useState(edit?.fxRate ? String(edit.fxRate) : rate ? String(rate) : '');
  const cambiarMoneda = (c: 'USD' | 'BS' | 'COP') => {
    setCur(c);
    setOrig('');
    setFx(c === 'BS' && rate ? String(rate) : '');
    if (c !== 'USD') {
      const a = MONEY_ACCOUNTS.find((x) => x.currency === c);
      if (a && accountByKey(account)?.currency !== c) setAccount(a.key);
    }
  };
  // En Bs o pesos, el monto en $ sale de la tasa.
  useEffect(() => {
    if (cur === 'USD') return;
    const o = Number(orig) || 0, t = Number(fx) || 0;
    setAmount(o && t ? String(Math.round((o / t) * 100) / 100) : '');
  }, [cur, orig, fx]);
  const [date, setDate] = useState(edit?.date ?? todayVe());
  const [account, setAccount] = useState(edit?.account ?? '');
  const [accAmount, setAccAmount] = useState(edit?.accountAmount != null ? String(edit.accountAmount) : '');
  const [accTouched, setAccTouched] = useState(edit?.accountAmount != null);
  const { sedes } = useSedes();
  const [sedeMode, setSedeMode] = useState<'general' | 'una' | 'dividir'>(edit?.splits?.length ? 'dividir' : edit?.locationId ? 'una' : 'general');
  const [sedeUna, setSedeUna] = useState(edit?.locationId ?? sedes[0]?.id ?? '');
  const [parts, setParts] = useState<Record<string, string>>(() => Object.fromEntries((edit?.splits ?? []).map((x) => [x.locationId, String(x.amount)])));
  const [unit, setUnit] = useState<'$' | '%'>('$');
  const partsSum = Math.round(Object.values(parts).reduce((a, v) => a + (Number(v) || 0), 0) * 100) / 100;
  const partesIguales = () => {
    const ids = Object.keys(parts).length ? Object.keys(parts) : sedes.map((x) => x.id);
    const amt = unit === '%' ? 100 : Number(amount) || 0;
    const base = Math.floor((amt / ids.length) * 100) / 100;
    const resto = Math.round((amt - base * ids.length) * 100) / 100;
    setParts(Object.fromEntries(ids.map((id, i) => [id, String(i === 0 ? Math.round((base + resto) * 100) / 100 : base)])));
  };
  const [busy, setBusy] = useState(false);
  const [ocr, setOcr] = useState<{ status: string; note: string; text: string } | null>(image ? { status: '📖 Leyendo la factura…', note: 'La primera vez tarda un poco más (descarga el lector).', text: '' } : null);
  const [savedReceipt, setSavedReceipt] = useState<string | null>(null);

  const acc = accountByKey(account);
  const local = !!acc && acc.currency !== 'USD';

  // Cambia la lista de categorías con el tipo.
  useEffect(() => {
    if (!EXPENSE_CATEGORIES[type].includes(category)) setCategory(EXPENSE_CATEGORIES[type][0]);
  }, [type]); // eslint-disable-line react-hooks/exhaustive-deps

  // Propone el monto en Bs con la tasa del día si la cuenta es en bolívares.
  useEffect(() => {
    if (!local || accTouched) return;
    if (acc?.currency === cur && cur !== 'USD') { setAccAmount(orig); return; }
    const usd = Number(amount) || 0;
    const r = acc?.currency === 'BS' ? rate : 0;
    setAccAmount(usd && r ? String(Math.round(usd * r * 100) / 100) : '');
  }, [amount, account, local, accTouched, rate, acc, cur, orig]);

  // Comprobante ya guardado (al editar).
  useEffect(() => {
    if (edit?.receiptPath) receiptUrl(edit.receiptPath).then(setSavedReceipt).catch(() => {});
  }, [edit]);

  // Lectura de la factura.
  useEffect(() => {
    if (!image) return;
    let alive = true;
    readReceipt(image, (p) => alive && setOcr((o) => o && { ...o, status: `📖 Leyendo la factura… ${p}%` }))
      .then((text) => {
        if (!alive) return;
        const g = parseReceipt(text, rate, todayVe());
        if (g.type) setType(g.type);
        if (g.category) setTimeout(() => setCategory(g.category), 0);
        if (g.description) setDescription((d) => d || g.description);
        if (g.supplier) setSupplier((s) => s || g.supplier);
        if (g.amountUsd) setAmount(String(g.amountUsd));
        if (g.date) setDate(g.date);
        if (g.bs) {
          const bsAcc = MONEY_ACCOUNTS.find((a) => a.key === 'pago_movil') ?? MONEY_ACCOUNTS.find((a) => a.currency === 'BS');
          if (bsAcc) {
            setAccount(bsAcc.key);
            setAccAmount(String(g.bs));
            setAccTouched(true);
          }
        }
        const found = [g.amountUsd ? 'monto' : '', g.date ? 'fecha' : '', g.supplier ? 'proveedor' : '', g.category ? 'categoría' : ''].filter(Boolean);
        setOcr({
          status: found.length ? '✅ Leída. Revisa y confirma los datos.' : '⚠️ No pude leer datos claros. Complétalos a mano.',
          note:
            (found.length ? 'Detecté: ' + found.join(', ') + '. ' : '') +
            (g.bs ? `Monto en Bs ${g.bs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}${g.amountUsd ? ' → ' + fmt(g.amountUsd) + ' a la tasa del día.' : ' (no hay tasa del día para convertir).'}` : ''),
          text: text || '(no se encontró texto)',
        });
      })
      .catch((e) => alive && setOcr({ status: '⚠️ No se pudo leer la imagen', note: (e?.message ?? '') + ' — Puedes completar los datos a mano; la imagen igual se guarda.', text: '' }));
    return () => {
      alive = false;
    };
  }, [image, rate]);

  const save = async () => {
    const amt = Number(amount) || 0;
    if (cur !== 'USD' && !(Number(fx) > 0)) return toast.error(`Indica la tasa: cuántos ${curSym(cur)} por dólar`);
    if (!description.trim() || !amt) return toast.error('Completa nombre y monto');
    if (!acc && !confirm('⚠️ No elegiste "Pagado desde".\n\nEste gasto NO se descontará del saldo de ninguna cuenta.\n\n¿Continuar sin indicar de dónde salió el dinero?')) return;
    let splits: { locationId: string; amount: number }[] = [];
    if (sedeMode === 'dividir') {
      if (unit === '%' && Math.abs(partsSum - 100) > 0.01) return toast.error(`Los porcentajes suman ${partsSum}% y deben sumar 100%`);
      const factor = unit === '%' ? amt / 100 : 1;
      splits = Object.entries(parts).map(([locationId, v]) => ({ locationId, amount: Math.round((Number(v) || 0) * factor * 100) / 100 })).filter((x) => x.amount > 0);
      if (splits.length < 2) return toast.error('Para dividir, pon un monto en al menos dos sedes');
      // Los centavos que se pierden al redondear los porcentajes van a la primera sede.
      if (unit === '%') splits[0].amount = Math.round((splits[0].amount + amt - splits.reduce((a, x) => a + x.amount, 0)) * 100) / 100;
      else if (Math.abs(partsSum - amt) > 0.01) return toast.error(`Las partes suman ${fmt(partsSum)} y el gasto es de ${fmt(amt)}`);
    }
    if (sedeMode === 'una' && !sedeUna) return toast.error('Elige la sede');
    let accountAmount: number | null = null;
    if (acc) {
      accountAmount = local ? Number(accAmount) : amt;
      if (!(accountAmount > 0)) return toast.error('Indica cuánto salió en ' + curSym(acc.currency));
      if (acc.currency === 'BS' && rate && amt > 0) {
        const esperado = amt * rate, dif = Math.abs(accountAmount - esperado) / esperado;
        if (dif > 0.3 && !confirm(`⚠️ Revisa el monto en bolívares.\n\nSalió: Bs ${accountAmount.toLocaleString('es-VE')}\nEl gasto es de $${amt}, que a la tasa de hoy son unos Bs ${Math.round(esperado).toLocaleString('es-VE')}.\n\n¿Seguro?`)) return;
      }
    }
    setBusy(true);
    try {
      const saved = await saveExpense({ type, category, description: description.trim(), supplier: supplier.trim(), amount: amt, date, account: acc?.key ?? '', accountAmount, splits, locationId: sedeMode === 'una' ? sedeUna : null, currency: cur, originalAmount: cur === 'USD' ? null : Number(orig) || null, fxRate: cur === 'USD' ? null : Number(fx) || null }, edit?.id, userName);
      if (image) {
        try {
          await uploadExpenseReceipt(saved.id, image);
        } catch (e: any) {
          toast.error('El gasto se guardó, pero el comprobante no: ' + e.message);
        }
      }
      toast.success(edit ? 'Gasto actualizado ✓' : 'Gasto registrado ✓');
      onSaved();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const title = edit ? 'Editar gasto' : type === 'materia_prima' ? 'Registrar compra de materia prima' : type === 'merma' ? 'Registrar merma / desecho' : 'Registrar gasto operativo';
  const receiptSrc = image ?? savedReceipt;

  return (
    <Modal open onClose={onClose} title={title}>
      <div className="space-y-3">
        {receiptSrc && (
          <div className="flex gap-3 rounded-lg border border-[#ececef] bg-[#fafafa] p-2">
            <img src={receiptSrc} alt="Comprobante" className="h-24 w-20 object-cover rounded-md cursor-pointer bg-[#fff]" onClick={() => window.open(receiptSrc, '_blank')} />
            <div className="min-w-0 text-[12px]">
              <div className="font-medium">{ocr?.status ?? '📎 Comprobante guardado'}</div>
              <div className="text-[#6b7280] mt-0.5">{ocr?.note ?? 'Toca la imagen para verla completa.'}</div>
              {ocr?.text && (
                <details className="mt-1">
                  <summary className="cursor-pointer text-[#6b7280]">Ver texto leído</summary>
                  <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap text-[10px] text-[#52525b]">{ocr.text}</pre>
                </details>
              )}
            </div>
          </div>
        )}
        {(image || edit) && (
          <div>
            <Label>Tipo de gasto</Label>
            <Select value={type} onChange={(e) => setType(e.target.value as ExpenseType)}>
              {EXPENSE_TYPES.map((t) => <option key={t.key} value={t.key}>{t.icon} {t.label}</option>)}
            </Select>
          </div>
        )}
        <div>
          <Label>Categoría</Label>
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            {EXPENSE_CATEGORIES[type].map((c) => <option key={c}>{c}</option>)}
          </Select>
        </div>
        <div><Label>Nombre</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej: Rollo de tela algodón 30/1 negro" /></div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Monto</Label>
            <div className="flex gap-1">
              <Select value={cur} onChange={(e) => cambiarMoneda(e.target.value as 'USD' | 'BS' | 'COP')} className="!w-[72px] !px-2">
                <option value="USD">$</option>
                <option value="BS">Bs</option>
                <option value="COP">COP</option>
              </Select>
              {cur === 'USD' ? (
                <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
              ) : (
                <Input type="number" step="0.01" value={orig} onChange={(e) => setOrig(e.target.value)} placeholder={curSym(cur)} />
              )}
            </div>
          </div>
          <div><Label>Fecha</Label><Input type="date" value={date} max={todayVe()} onChange={(e) => setDate(e.target.value)} /></div>
        </div>
        {cur !== 'USD' && (
          <div className="grid grid-cols-2 gap-2 items-end">
            <div><Label>Tasa ({curSym(cur)} por $1)</Label><Input type="number" step="0.01" value={fx} onChange={(e) => setFx(e.target.value)} placeholder={cur === 'COP' ? 'Ej: 4000' : ''} /></div>
            <div className="pb-2 text-[13px] text-[#6b7280]">= <b className="text-[#111]">{fmt(Number(amount) || 0)}</b></div>
          </div>
        )}
        <div><Label>Proveedor / descripción</Label><Input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Opcional" /></div>
        <div className="grid grid-cols-2 gap-2">
          <div className={local ? '' : 'col-span-2'}>
            <Label>Pagado desde</Label>
            <Select value={account} onChange={(e) => { setAccount(e.target.value); setAccTouched(false); }}>
              <option value="">— Sin especificar —</option>
              {MONEY_ACCOUNTS.map((a) => <option key={a.key} value={a.key}>{a.icon} {a.name}</option>)}
            </Select>
          </div>
          {local && (
            <div>
              <Label>Salió en {curSym(acc!.currency)}</Label>
              <Input type="number" step="0.01" value={accAmount} onChange={(e) => { setAccAmount(e.target.value); setAccTouched(true); }} />
            </div>
          )}
        </div>
        {sedes.length > 1 && (
          <div className="space-y-2">
            <Label>Sede</Label>
            <Select value={sedeMode} onChange={(e) => { const m = e.target.value as typeof sedeMode; setSedeMode(m); if (m === 'dividir' && !Object.keys(parts).length) setParts(Object.fromEntries(sedes.map((x) => [x.id, '']))); }}>
              <option value="general">General (de toda la empresa)</option>
              <option value="una">De una sola sede</option>
              <option value="dividir">➗ Dividir entre sedes</option>
            </Select>
            {sedeMode === 'una' && (
              <Select value={sedeUna} onChange={(e) => setSedeUna(e.target.value)}>
                {sedes.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </Select>
            )}
            {sedeMode === 'dividir' && (
              <div className="rounded-lg border border-[#ececef] p-2 space-y-1.5">
                {sedes.map((x) => (
                  <label key={x.id} className="flex items-center gap-2 text-[13px]">
                    <input
                      type="checkbox"
                      checked={x.id in parts}
                      onChange={(e) => setParts((p) => { const n = { ...p }; if (e.target.checked) n[x.id] = ''; else delete n[x.id]; return n; })}
                    />
                    <span className="flex-1 min-w-0 truncate">{x.name}</span>
                    {x.id in parts && (
                      <>
                      {unit === '%' && Number(parts[x.id]) > 0 && <span className="text-[11px] text-[#6b7280]">{fmt(Math.round((Number(amount) || 0) * Number(parts[x.id])) / 100)}</span>}
                      <Input type="number" step="0.01" min={0} placeholder={unit} value={parts[x.id]} onChange={(e) => setParts((p) => ({ ...p, [x.id]: e.target.value }))} className="!w-28 !py-1 text-right" />
                      </>
                    )}
                  </label>
                ))}
                <div className="flex items-center justify-between pt-1 text-[12px]">
                  <div className="flex items-center gap-1">
                    {(['$', '%'] as const).map((u) => (
                      <button key={u} type="button" onClick={() => { setUnit(u); setParts((p) => Object.fromEntries(Object.keys(p).map((k) => [k, '']))); }}
                        className={`rounded-md border px-2 py-0.5 ${unit === u ? 'border-[#111] bg-[#111] text-[#fff]' : 'border-[#e6e6e9]'}`}>{u === '$' ? 'En $' : 'En %'}</button>
                    ))}
                    <Btn variant="ghost" onClick={partesIguales}>Partes iguales</Btn>
                  </div>
                  {unit === '%' ? (
                    <span className={Math.abs(partsSum - 100) > 0.01 ? 'text-[#dc2626]' : 'text-[#15803d]'}>Suma {partsSum}% de 100%</span>
                  ) : (
                    <span className={Math.abs(partsSum - (Number(amount) || 0)) > 0.01 ? 'text-[#dc2626]' : 'text-[#15803d]'}>
                      Suma {fmt(partsSum)} de {fmt(Number(amount) || 0)}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn disabled={busy} onClick={save}>{busy ? (image ? 'Guardando comprobante…' : 'Guardando…') : 'Guardar'}</Btn>
        </div>
      </div>
    </Modal>
  );
}
