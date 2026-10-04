import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useApp } from '../../context';
import { Btn, Card, Input, Label, Modal, Pills, Select, Textarea, cx } from '../../components/admin/ui';
import { fetchProviderPayments, loadLinks } from '../../lib/payconf';
import { addSalePayment, createSale, fmt, todayVe, PAY_STATES, DOC_TYPES, type DocType, type PayState } from '../../lib/sales';
import { createCustomer, fetchBcv, MONEY_ACCOUNTS, saveAdminSetting, accountByKey } from '../../lib/adminData';
import { getColorUpcharge, getSizeUpcharge } from '../../lib/pricing';
import type { Product } from '../../types';
import type { SalesCtx } from '../AdminSales';
import { useSedes } from '../../lib/sedes';
import { loadStock, qtyAt, stockIndex, type StockRow } from '../../lib/stock';

interface Line {
  key: string;
  id: string | null;
  free?: boolean;
  name: string;
  image?: string;
  sizes?: string[];
  size?: string;
  color?: string;
  qty: number;
  price: number;
  cost?: number;
  stock: number;
}

type Mode = 'detal' | 'mayor';

const SUBCAT_LABEL: Record<string, string> = {
  't-shirts': 'Camisetas',
  polos: 'Polos',
  gorras: 'Gorras',
  hoodies: 'Hoodies',
  joggers: 'Joggers',
};

const basePrice = (p: Product, mode: Mode) =>
  mode === 'mayor' && typeof p.wholesalePrice === 'number' ? p.wholesalePrice : p.retailPrice ?? p.price;

export default function PosTab({ ctx }: { ctx: SalesCtx }) {
  // El punto de venta trabaja con las existencias de la sede de quien vende.
  const { mySede, sede, nameOf, sedes } = useSedes();
  const vendeEn = mySede || sede;
  const [stockRows, setStockRows] = useState<StockRow[]>([]);
  useEffect(() => { loadStock().then(setStockRows).catch(() => setStockRows([])); }, []);
  const sIdx = useMemo(() => stockIndex(stockRows), [stockRows]);
  const stockOf = (id: string) => (vendeEn ? qtyAt(sIdx, id, vendeEn) : 0);
  // Tallas y colores con existencias en la sede, para no vender lo que no hay.
  const filasDe = (id: string) => (sIdx.get(id) ?? []).filter((r) => (!vendeEn || r.locationId === vendeEn) && r.qty > 0);
  const tallasCon = (id: string) => [...new Set(filasDe(id).map((r) => r.size))];
  const coloresCon = (id: string, size: string) =>
    [...new Set(filasDe(id).filter((r) => (r.size ?? '') === (size ?? '')).map((r) => r.color))];

  const { products } = useApp();
  const { settings, isAdmin } = ctx;

  // Tasas
  const [tasa, setTasa] = useState('');
  const [factor, setFactor] = useState('');
  const [rateLabel, setRateLabel] = useState('');
  const [bcvBusy, setBcvBusy] = useState(false);

  useEffect(() => {
    const r = settings.rates;
    setTasa(r.exchangeRate ? String(r.exchangeRate) : '');
    setFactor(r.realFactor ? String(r.realFactor) : '');
    setRateLabel(r.exchangeRate ? `Tasa: Bs ${r.exchangeRate.toLocaleString('es-VE')}/$ · Factor: ${r.realFactor || '—'}${r.rateDate ? ' · ' + r.rateDate : ''}` : '');
  }, [settings.rates]);

  // Catálogo
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [mode, setMode] = useState<Mode>('detal');

  // Venta
  const [lines, setLines] = useState<Line[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [docCur, setDocCur] = useState<'USD' | 'BS'>('USD');
  const [discount, setDiscount] = useState('0');
  const [taxRate, setTaxRate] = useState(String(settings.taxRate || 0));
  const [notes, setNotes] = useState('');
  const [doc, setDoc] = useState<DocType>('nota_entrega');
  const [pay, setPay] = useState<PayState>('pagado');
  const [method, setMethod] = useState('efectivo_usd');
  const [payCur, setPayCur] = useState<'USD' | 'BS'>('USD');
  const [date, setDate] = useState(todayVe());
  const [busy, setBusy] = useState(false);
  const [showDocHelp, setShowDocHelp] = useState(false);
  const [bnMsg, setBnMsg] = useState<{ text: string; color: string } | null>(null);
  // Venta al personal: a crédito (paga con abonos), con abono inicial opcional.
  const [credit, setCredit] = useState(true);
  const [iniAmt, setIniAmt] = useState('');
  const [iniMethod, setIniMethod] = useState('efectivo_usd');
  const [iniBs, setIniBs] = useState('');
  const [iniBsTouched, setIniBsTouched] = useState(false);

  // Modales
  const [freeOpen, setFreeOpen] = useState(false);
  // El catálogo del mostrador y la vitrina de la tienda se miran por separado.
  const [tipo, setTipo] = useState<'facturacion' | 'web' | 'todos'>(() => {
    try { return (localStorage.getItem('elemental_pos_tipo') as any) ?? 'facturacion'; } catch { return 'facturacion'; }
  });
  useEffect(() => { try { localStorage.setItem('elemental_pos_tipo', tipo); } catch { /* ventana privada */ } }, [tipo]);
  const [custOpen, setCustOpen] = useState(false);

  useEffect(() => setTaxRate(String(settings.taxRate || 0)), [settings.taxRate]);

  const esWeb = (p: { web?: boolean }) => p.web !== false;
  const cuentaFact = products.filter((p) => !esWeb(p)).length;
  const cuentaWeb = products.length - cuentaFact;
  const delTipo = useMemo(
    () => (tipo === 'todos' ? products : products.filter((p) => (tipo === 'web' ? esWeb(p) : !esWeb(p)))),
    [products, tipo],
  );
  const categories = useMemo(() => [...new Set(delTipo.map((p) => p.subcategory))], [delTipo]);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return delTipo.filter(
      (p) =>
        (!cat || p.subcategory === cat) &&
        (!s || p.name.toLowerCase().includes(s) || p.id.toLowerCase().includes(s)
          || [p.sku ?? '', ...Object.values(p.skuSizes ?? {})].join(' ').toLowerCase().includes(s)
          || (SUBCAT_LABEL[p.subcategory] ?? p.subcategory).toLowerCase().includes(s)),
    );
  }, [delTipo, q, cat]);

  const changeMode = (m: Mode) => {
    setMode(m);
    let changed = 0;
    const next = lines.map((l) => {
      if (l.free || !l.id) return l;
      const p = products.find((x) => x.id === l.id);
      if (!p) return l;
      const np = basePrice(p, m) + getSizeUpcharge(l.size) + getColorUpcharge(l.color);
      if (np !== l.price) changed++;
      return { ...l, price: np };
    });
    setLines(next);
    if (changed) toast(`Precios al ${m} · ${changed} línea${changed === 1 ? '' : 's'} actualizada${changed === 1 ? '' : 's'}`);
  };

  const addProduct = (p: Product) => {
    if (stockOf(p.id) <= 0) return;
    const conStock = filasDe(p.id);
    const size = conStock[0]?.size ?? p.sizes?.[0] ?? '';
    const color = conStock.find((r) => r.size === size)?.color ?? '';
    const key = `${p.id}|${size ?? ''}|${color}`;
    setLines((prev) => {
      const ex = prev.find((l) => l.key === key);
      const inSale = prev.filter((l) => l.id === p.id).reduce((a, l) => a + l.qty, 0);
      if (inSale >= stockOf(p.id)) {
        toast.error('Stock máximo en ' + (nameOf(vendeEn) || 'tu sede') + ': ' + stockOf(p.id));
        return prev;
      }
      if (ex) return prev.map((l) => (l.key === key ? { ...l, qty: l.qty + 1 } : l));
      return [
        ...prev,
        { key, id: p.id, name: p.name, image: p.image, sizes: p.sizes, size, color, qty: 1,
          price: basePrice(p, mode) + getSizeUpcharge(size) + getColorUpcharge(color),
          stock: qtyAt(sIdx, p.id, vendeEn, size, color) },
      ];
    });
  };

  const updateLine = (key: string, patch: Partial<Line>) =>
    setLines((prev) => {
      const l = prev.find((x) => x.key === key);
      if (!l) return prev;
      const next = { ...l, ...patch };
      if ((patch.size !== undefined || patch.color !== undefined) && l.id) {
        if (patch.size !== undefined) {
          const posibles = coloresCon(l.id, patch.size ?? '');
          if (posibles.length && !posibles.includes(next.color ?? '')) next.color = posibles[0];
        }
        const p = products.find((x) => x.id === l.id);
        if (p) {
          next.price = basePrice(p, mode) + getSizeUpcharge(next.size) + getColorUpcharge(next.color);
          next.stock = qtyAt(sIdx, p.id, vendeEn, next.size ?? '', next.color ?? '');
        }
      }
      if (patch.qty !== undefined) {
        let qn = Math.floor(Number(patch.qty));
        if (!qn || qn < 1) qn = 1;
        if (!l.free) {
          const others = prev.filter((x) => x.id === l.id && x.key !== key).reduce((a, x) => a + x.qty, 0);
          const max = Math.max(1, l.stock - others);
          if (qn > max) {
            toast.error(`Sólo hay ${l.stock} en stock de ${l.name}`);
            qn = max;
          }
        }
        next.qty = qn;
      }
      next.key = l.free ? l.key : `${l.id}|${next.size ?? ''}|${next.color ?? ''}`;
      // Si al cambiar talla/color coincide con otra línea, se unen.
      const dup = prev.find((x) => x.key === next.key && x.key !== key);
      if (dup) return prev.filter((x) => x.key !== key).map((x) => (x.key === dup.key ? { ...x, qty: x.qty + next.qty } : x));
      return prev.map((x) => (x.key === key ? next : x));
    });

  const removeLine = (key: string) => setLines((prev) => prev.filter((l) => l.key !== key));

  // Totales
  const sub = lines.reduce((a, l) => a + l.price * l.qty, 0);
  const disc = Number(discount) || 0;
  const taxR = Number(taxRate) || 0;
  const base = Math.max(0, sub - disc);
  const tax = Math.round(base * taxR) / 100;
  const total = base + tax;
  const tasaN = Number(tasa) || 0;
  const factorN = Number(factor) || 0;

  const customer = ctx.customers.find((c) => c.id === customerId) ?? null;
  useEffect(() => setDocCur(customer?.docCurrency === 'BS' ? 'BS' : 'USD'), [customer]);
  const employee = customer?.isEmployee ? customer : null;
  const aCredito = !!employee && credit;
  // Al personal: sólo admin/gerente y siempre al mayor.
  useEffect(() => {
    if (!employee) return;
    if (!isAdmin) {
      toast.error('Las ventas al personal sólo las puede facturar un administrador o gerente');
      setCustomerId('');
      return;
    }
    if (mode !== 'mayor') changeMode('mayor');
  }, [employee?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const iniIsBs = accountByKey(iniMethod)?.currency === 'BS';
  useEffect(() => {
    if (!iniIsBs || iniBsTouched) return;
    const a = Number(iniAmt) || 0;
    setIniBs(a && Number(tasa) ? String(Math.round(a * Number(tasa) * 100) / 100) : '');
  }, [iniAmt, iniIsBs, iniBsTouched, tasa]);
  useEffect(() => {
    const a = accountByKey(method);
    setPayCur(a?.currency === 'BS' ? 'BS' : 'USD');
  }, [method]);

  /* ---------- Tasas ---------- */
  const saveRates = async () => {
    if (!tasaN) return toast.error('Ingresa una tasa válida');
    const rates = { ...settings.rates, exchangeRate: tasaN, realFactor: factorN, rateDate: todayVe() };
    try {
      await saveAdminSetting('rates', rates);
      ctx.setSettings({ ...settings, rates });
      toast.success('Tasas guardadas ✓');
    } catch (e: any) {
      toast.error(e.message);
    }
  };
  const bringBcv = async (cur = settings.rates.rateCurrency) => {
    setBcvBusy(true);
    try {
      const b = await fetchBcv();
      const rate = cur === 'EUR' ? b.eur : b.usd;
      if (!(rate > 0)) {
        setTasa('');
        setRateLabel('⚠️ El BCV no publicó el euro hoy. Escribe la tasa a mano si necesitas cobrar en Bs.');
        return toast.error('El BCV no publicó el euro · tasa en 0');
      }
      setTasa(String(rate));
      const otra = cur === 'EUR' ? `dólar Bs ${Math.round(b.usd).toLocaleString('es-VE')}` : b.eur ? `euro Bs ${Math.round(b.eur).toLocaleString('es-VE')}` : '';
      setRateLabel(`BCV ${b.date ?? ''} · ${cur === 'EUR' ? 'euro' : 'dólar'}: Bs ${rate.toLocaleString('es-VE')}${otra ? ' (el ' + otra + ')' : ''} — pulsa "Guardar tasas" para aplicarla`);
      toast.success(`Tasa BCV ${cur === 'EUR' ? 'euro' : 'dólar'}: Bs ${rate.toLocaleString('es-VE')}`);
    } catch {
      toast.error('No se pudo consultar el BCV. Escribe la tasa a mano.');
    } finally {
      setBcvBusy(false);
    }
  };
  const setRateCurrency = async (cur: 'USD' | 'EUR') => {
    const rates = { ...settings.rates, rateCurrency: cur };
    try {
      await saveAdminSetting('rates', rates);
      ctx.setSettings({ ...settings, rates });
      toast(`Se cobrará con la tasa del ${cur === 'EUR' ? 'euro' : 'dólar'} del BCV`);
      bringBcv(cur);
    } catch (e: any) {
      toast.error(e.message);
    }
  };
  const toggleAuto = async () => {
    const on = !settings.rates.rateAuto;
    const rates = { ...settings.rates, rateAuto: on };
    try {
      await saveAdminSetting('rates', rates);
      ctx.setSettings({ ...settings, rates });
      toast(on ? 'Cada mañana a las 5:00 se tomará la tasa del BCV' : 'Actualización automática desactivada');
      if (on && !settings.rates.exchangeRate) bringBcv();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  /* ---------- ¿Ya entró por Binance un cobro por el total (últimas 6 h)? ---------- */
  const verifyBinance = async () => {
    const t = Math.round(total * 100) / 100;
    if (!(t > 0)) return setBnMsg({ text: 'Agrega productos primero.', color: '#6b7280' });
    setBnMsg({ text: 'Consultando Binance…', color: '#6b7280' });
    try {
      const [r, links] = await Promise.all([fetchProviderPayments('binance', 1), loadLinks('binance')]);
      if (!r.connected) return setBnMsg({ text: '⚠️ Binance todavía no está conectado (falta la clave de solo lectura).', color: '#dc2626' });
      const taken = new Set(links.map((l) => l.ref));
      const recent = r.payments.filter((p) => p.time >= Date.now() - 6 * 3600e3 && Math.abs(p.amount - t) < 0.01);
      const free = recent.filter((p) => !taken.has(p.ref));
      const hora = (x: number) => new Date(x).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
      if (free.length) setBnMsg({ text: `✅ Recibido: ${free[0].amount} ${free[0].currency}${free[0].from ? ' de ' + free[0].from : ''} a las ${hora(free[0].time)}${free.length > 1 ? ` (${free.length} cobros por ese monto)` : ''}`, color: '#15803d' });
      else if (recent.length) setBnMsg({ text: `🟡 Hay un cobro de ${t} USDT, pero ya está vinculado a otra venta.`, color: '#ca8a04' });
      else setBnMsg({ text: `⏳ No aparece ningún cobro de ${t} USDT en las últimas 6 horas. Espera un momento y vuelve a verificar.`, color: '#dc2626' });
    } catch (e: any) {
      setBnMsg({ text: '⚠️ ' + e.message, color: '#dc2626' });
    }
  };

  /* ---------- Completar venta ---------- */
  const complete = async () => {
    if (!lines.length) return toast.error('Agrega al menos un producto');
    const ini = aCredito ? Math.round((Number(iniAmt) || 0) * 100) / 100 : 0;
    if (ini > total + 0.005) return toast.error('El abono inicial supera el total');
    if (ini > 0 && iniIsBs && !(Number(iniBs) > 0)) return toast.error('Indica cuánto entró en Bs del abono inicial');
    setBusy(true);
    try {
      const payload = {
        doc,
        customerId: customer?.id ?? null,
        customer: customer?.name ?? '',
        email: customer?.email ?? '',
        items: lines.map((l) => ({ id: l.id, free: !!l.free, name: l.name, size: l.size ?? null, color: l.color || null, qty: l.qty, price: l.price, cost: l.cost })),
        discount: disc,
        taxRate: taxR,
        pay: aCredito ? ('pendiente' as const) : pay,
        payMethod: aCredito || pay === 'pendiente' ? null : method,
        payCurrency: aCredito || pay === 'pendiente' ? null : payCur,
        docCurrency: docCur,
        date: isAdmin ? date : null,
        notes: [notes, mode === 'mayor' ? 'Venta al mayor' : ''].filter(Boolean).join(' · '),
        exchangeRate: tasaN,
        realFactor: factorN,
        credit: aCredito,
        initialAbono: ini,
      };
      let sale;
      try {
        sale = await createSale(payload);
      } catch (e: any) {
        // Límite de crédito: avisa y admin/gerente pueden aprobar igual.
        const m = /LIMIT\|([^|]*)\|([^|]*)\|([^|]*)\|([^|\s]*)/.exec(e?.message ?? '');
        if (!m) throw e;
        const [, who, lim, owed, tot] = m;
        if (!confirm(`⚠️ ${who} pasaría su límite de crédito.\n\nLímite: $${lim}\nYa debe: $${owed}\nEsta venta: $${tot}\n\n¿Aprobar la venta de todas formas?`)) return;
        sale = await createSale({ ...payload, confirmOverLimit: true });
      }
      if (ini > 0) {
        try {
          await addSalePayment(sale.id, { amount: ini, method: iniMethod, currency: iniIsBs ? 'BS' : 'USD', bs: iniIsBs ? Number(iniBs) : null, date: date || todayVe(), note: 'Abono inicial' });
        } catch (e: any) {
          toast.error('La venta se registró, pero el abono inicial no: ' + e.message);
        }
      }
      setIniAmt(''); setIniBs(''); setIniBsTouched(false);
      setLines([]);
      setDiscount('0');
      setNotes('');
      await ctx.reloadSales();
      ctx.openInvoice(sale.id);
      toast.success(`Venta ${sale.id} registrada · inventario actualizado${aCredito ? (ini > 0 ? ` · abono inicial ${fmt(ini)}` : ' · a crédito') : ''}`);
    } catch (e: any) {
      toast.error('No se pudo: ' + (e?.message ?? 'error'));
    } finally {
      setBusy(false);
    }
  };

  const inSaleQty = (id: string) => lines.filter((l) => l.id === id).reduce((a, l) => a + l.qty, 0);

  return (
    <div className="space-y-4">
      {sedes.length > 1 && !vendeEn && (
        <div className="rounded-xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-[13px] text-[#b91c1c]">
          Tu usuario no tiene sede asignada, así que no se puede registrar la venta. Pídele a un administrador que te la asigne en Usuarios y permisos.
        </div>
      )}
      {sedes.length > 1 && vendeEn && (
        <p className="text-[12px] text-[#6b7280]">Vendiendo en <b>{nameOf(vendeEn)}</b> · las existencias y la venta salen de esa sede.</p>
      )}
      {/* Tasa del día */}
      <Card className="p-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-[#52525b] whitespace-nowrap">💱 Tasa cobro (Bs/$):</span>
          <Input type="number" step="any" value={tasa} onChange={(e) => setTasa(e.target.value)} disabled={!isAdmin} className="!w-28 !py-1.5" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-[#52525b] whitespace-nowrap">💵 $ real por $ cobrado:</span>
          <Input type="number" step="any" value={factor} onChange={(e) => setFactor(e.target.value)} disabled={!isAdmin} placeholder="ej: 0.77" className="!w-24 !py-1.5" />
        </div>
        {isAdmin && (
          <>
            <Btn className="!py-1.5 !text-[12px]" onClick={saveRates}>Guardar tasas</Btn>
            <Select value={settings.rates.rateCurrency} onChange={(e) => setRateCurrency(e.target.value as 'USD' | 'EUR')} className="!w-auto !py-1.5 !text-[12px]" title="Con cuál tasa del BCV cobras">
              <option value="USD">Tasa BCV · Dólar</option>
              <option value="EUR">Tasa BCV · Euro</option>
            </Select>
            <Btn variant="ghost" className="!py-1.5 !text-[12px]" disabled={bcvBusy} onClick={() => bringBcv()}>
              {bcvBusy ? 'Consultando…' : '🏦 Traer tasa del BCV'}
            </Btn>
            <label className="flex items-center gap-2 text-[12px] text-[#52525b] cursor-pointer select-none" title="Cada mañana a las 5:00 la tasa se actualiza sola con la del BCV">
              <span
                onClick={toggleAuto}
                className={cx('relative inline-block h-5 w-9 rounded-full transition-colors', settings.rates.rateAuto ? 'bg-[#16a34a]' : 'bg-[#d4d4d8]')}
              >
                <span className={cx('absolute top-0.5 h-4 w-4 rounded-full bg-[#fff] shadow transition-all', settings.rates.rateAuto ? 'left-[18px]' : 'left-0.5')} />
              </span>
              Automática 5:00 AM
            </label>
          </>
        )}
        {rateLabel && <span className="text-[11px] text-[#6b7280] basis-full">{rateLabel}</span>}
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-4 items-start">
        {/* Catálogo */}
        <div className="space-y-3 min-w-0">
          <Card className="p-3 flex flex-wrap gap-2 items-center">
            <div className="inline-flex rounded-lg border border-[#e6e6e9] bg-[#f1f1f3] p-0.5">
              {([
                ['facturacion', '🧾 Facturación', cuentaFact],
                ['web', '🛍️ Tienda', cuentaWeb],
                ['todos', 'Todos', products.length],
              ] as const).map(([k, label, n]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => { setTipo(k); setCat(''); }}
                  className={cx('rounded-md px-2.5 py-1.5 text-[12px] whitespace-nowrap', tipo === k ? 'bg-[#fff] font-semibold text-[#111] shadow-sm' : 'text-[#6b7280]')}
                >
                  {label} <span className="opacity-60">{n}</span>
                </button>
              ))}
            </div>
            <Input placeholder="Buscar por nombre, código o categoría…" value={q} onChange={(e) => setQ(e.target.value)} className="flex-1 min-w-[180px]" />
            <Select value={cat} onChange={(e) => setCat(e.target.value)} className="!w-auto">
              <option value="">Todas las categorías</option>
              {categories.map((c) => (
                <option key={c} value={c}>{SUBCAT_LABEL[c] ?? c}</option>
              ))}
            </Select>
            <Pills<Mode> value={mode} onChange={changeMode} options={[{ key: 'detal', label: 'Detal' }, { key: 'mayor', label: 'Mayor' }]} />
            <Btn variant="ghost" onClick={() => setFreeOpen(true)} title="Cobrar algo que no está en el inventario">＋ Línea libre</Btn>
          </Card>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3">
            {list.map((p) => {
              const left = stockOf(p.id) - inSaleQty(p.id);
              const out = stockOf(p.id) <= 0;
              return (
                <Card key={p.id} className={cx('p-3 transition-colors', out ? 'opacity-40' : 'cursor-pointer hover:border-[#a1a1aa]')} onClick={() => !out && addProduct(p)}>
                  {p.image ? (
                    <img src={p.image} alt={p.name} className="w-full aspect-square rounded-lg object-cover bg-[#f1f1f3]" loading="lazy" />
                  ) : (
                    <div className="w-full aspect-square rounded-lg bg-[#f1f1f3] flex items-center justify-center text-3xl">{p.emoji || '📦'}</div>
                  )}
                  <div className="text-[13px] font-medium mt-2 leading-tight line-clamp-2">{p.name}</div>
                  <div className="text-[11px] text-[#6b7280]">{p.sku ? <span className="font-mono">{p.sku}</span> : SUBCAT_LABEL[p.subcategory] ?? p.subcategory} · stock {left}</div>
                  <div className="font-semibold mt-1 text-[14px]">
                    {fmt(basePrice(p, mode))}
                    {mode === 'mayor' && <span className="ml-1 text-[10px] font-normal text-[#9333ea]">mayor</span>}
                  </div>
                  {mode === 'mayor' && <div className="text-[10px] text-[#6b7280]">detal {fmt(p.retailPrice ?? p.price)}</div>}
                </Card>
              );
            })}
            {!list.length && <div className="col-span-full text-center text-[#9ca3af] py-10 text-[13px]">Sin resultados.</div>}
          </div>
        </div>

        {/* Ticket de venta */}
        <Card className="p-4 xl:sticky xl:top-[72px] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-bold">Venta actual</h3>
            {mode === 'mayor' && <span className="text-[11px] text-[#9333ea]">Precios al mayor</span>}
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
            <div>
              <Label>Cliente</Label>
              <div className="flex gap-1.5">
                <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                  <option value="">Consumidor final</option>
                  {ctx.customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}{c.cedula ? ' · ' + c.cedula : ''}</option>
                  ))}
                </Select>
                <Btn variant="ghost" className="!px-2.5" onClick={() => setCustOpen(true)} title="Nuevo cliente">＋</Btn>
              </div>
            </div>
            <div>
              <Label>Documento en</Label>
              <Select value={docCur} onChange={(e) => setDocCur(e.target.value as 'USD' | 'BS')} title="Moneda en que se imprime la nota / factura">
                <option value="USD">Dólares ($)</option>
                <option value="BS">Bolívares (Bs)</option>
              </Select>
            </div>
          </div>

          {employee && (
            <div className="rounded-lg border border-[#bfdbfe] bg-[#eff6ff] p-3 space-y-2 text-[12px]">
              <div>👩‍💼 <b>Personal</b>{employee.employeeBranch ? ' · ' + employee.employeeBranch : ''} · precio al mayor{employee.creditLimit ? ' · límite ' + fmt(employee.creditLimit) : ''}</div>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={credit} onChange={(e) => setCredit(e.target.checked)} /> 💳 A crédito (paga con abonos)</label>
              {credit && (
                <div className="space-y-1.5">
                  <div className="text-[#52525b]">Abono inicial (opcional)</div>
                  <div className="flex gap-1.5">
                    <Input type="number" step="0.01" min={0} placeholder="$ 0.00" value={iniAmt} onChange={(e) => setIniAmt(e.target.value)} className="!py-1" />
                    <Select value={iniMethod} onChange={(e) => { setIniMethod(e.target.value); setIniBsTouched(false); }} className="!py-1">
                      {MONEY_ACCOUNTS.filter((a) => a.currency !== 'COP').map((a) => <option key={a.key} value={a.key}>{a.icon} {a.name}</option>)}
                    </Select>
                  </div>
                  {iniIsBs && Number(iniAmt) > 0 && (
                    <Input type="number" step="0.01" placeholder="Bs que entraron" value={iniBs} onChange={(e) => { setIniBs(e.target.value); setIniBsTouched(true); }} className="!py-1" />
                  )}
                  {Number(iniAmt) > 0 && (
                    <div>{Number(iniAmt) > total + 0.005 ? <span className="text-[#dc2626]">El abono supera el total</span> : <>Queda a crédito: <b>{fmt(Math.max(0, total - Number(iniAmt)))}</b></>}</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Líneas */}
          <div className="space-y-2 max-h-[340px] overflow-y-auto -mx-1 px-1">
            {lines.length === 0 && <div className="text-[13px] text-[#9ca3af] text-center py-6">Agrega productos a la venta.</div>}
            {lines.map((l) => (
              <div key={l.key} className="rounded-lg border border-[#f0f0f2] p-2 space-y-1.5">
                <div className="flex items-start gap-2 text-[13px]">
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">
                      {l.name}
                      {l.free && <span className="ml-1 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#f3e8ff] text-[#7e22ce]">libre</span>}
                    </div>
                    <div className="text-[11px] text-[#6b7280]">{fmt(l.price)} c/u</div>
                  </div>
                  <span className="w-20 text-right font-semibold">{fmt(l.price * l.qty)}</span>
                  <button type="button" onClick={() => removeLine(l.key)} className="text-[#9ca3af] hover:text-[#dc2626] px-1" aria-label="Quitar">✕</button>
                </div>
                <div className="flex items-center gap-1.5">
                  {!l.free && l.id && (() => {
                    // Sólo las tallas y colores con existencias en esta sede.
                    const tallas = tallasCon(l.id!);
                    const colores = coloresCon(l.id!, l.size ?? '');
                    const opcTallas = tallas.length ? tallas : (l.sizes ?? []);
                    return (
                      <>
                        {opcTallas.length > 0 && (
                          <Select value={l.size ?? ''} onChange={(e) => updateLine(l.key, { size: e.target.value })} className="!w-auto !py-1 !px-2 !text-[12px]">
                            {opcTallas.map((t) => (
                              <option key={t} value={t}>{t || 'única'}</option>
                            ))}
                          </Select>
                        )}
                        {colores.length > 0 ? (
                          <Select value={l.color ?? ''} onChange={(e) => updateLine(l.key, { color: e.target.value })} className="!py-1 !px-2 !text-[12px] min-w-0 flex-1">
                            {colores.map((c) => (
                              <option key={c} value={c}>
                                {c || 'sin color'} ({qtyAt(sIdx, l.id!, vendeEn, l.size ?? '', c)})
                              </option>
                            ))}
                          </Select>
                        ) : (
                          <Input placeholder="Color" value={l.color ?? ''} onChange={(e) => updateLine(l.key, { color: e.target.value })} className="!py-1 !px-2 !text-[12px] min-w-0 flex-1" />
                        )}
                      </>
                    );
                  })()}
                  {!l.free && !l.id && (
                    <Input placeholder="Color" value={l.color ?? ''} onChange={(e) => updateLine(l.key, { color: e.target.value })} className="!py-1 !px-2 !text-[12px] min-w-0 flex-1" />
                  )}
                  <div className="flex items-center gap-1 ml-auto">
                    <QtyBtn onClick={() => updateLine(l.key, { qty: l.qty - 1 })}>−</QtyBtn>
                    <input
                      type="number"
                      min={1}
                      inputMode="numeric"
                      value={l.qty}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => updateLine(l.key, { qty: Number(e.target.value) })}
                      className="w-12 rounded-md border border-[#e6e6e9] bg-[#fff] py-1 text-center text-[13px] text-[#111]"
                    />
                    <QtyBtn onClick={() => updateLine(l.key, { qty: l.qty + 1 })}>+</QtyBtn>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Totales */}
          <div className="border-t border-[#ececef] pt-3 space-y-1.5 text-[13px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[#6b7280]">Descuento $</span>
              <Input type="number" min={0} value={discount} onChange={(e) => setDiscount(e.target.value)} disabled={!isAdmin} className="!w-24 !py-1 text-right" />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[#6b7280]">Impuesto %</span>
              <Input type="number" min={0} value={taxRate} onChange={(e) => setTaxRate(e.target.value)} className="!w-24 !py-1 text-right" />
            </div>
            <div className="flex justify-between"><span>Subtotal</span><span>{fmt(sub)}</span></div>
            <div className="flex justify-between"><span>IVA</span><span>{fmt(tax)}</span></div>
            <div className="flex justify-between text-[18px] font-extrabold pt-1"><span>Total</span><span>{fmt(total)}</span></div>
            {tasaN > 0 && <div className="text-right text-[12px] text-[#b45309]">≈ Bs {Math.round(total * tasaN).toLocaleString('es-VE')} (tasa {tasaN.toLocaleString('es-VE')})</div>}
            {factorN > 0 && <div className="text-right text-[12px] text-[#15803d]">≈ $ real: {fmt(Math.round(total * factorN * 100) / 100)} (factor {factorN})</div>}
          </div>

          <Textarea rows={2} placeholder="Notas de la venta…" value={notes} onChange={(e) => setNotes(e.target.value)} />

          <div className="grid grid-cols-2 gap-2">
            <div className="relative flex gap-1">
              <Select value={doc} onChange={(e) => setDoc(e.target.value as DocType)}>
                {DOC_TYPES.filter((d) => d.key === 'nota_entrega' || d.key === 'cotizacion').map((d) => (
                  <option key={d.key} value={d.key}>{d.label}</option>
                ))}
              </Select>
              <button
                type="button"
                onClick={() => setShowDocHelp((v) => !v)}
                className="shrink-0 h-[38px] w-7 rounded-lg border border-[#e6e6e9] text-[12px] text-[#6b7280]"
                aria-label="¿Qué es cada documento?"
              >
                ?
              </button>
              {showDocHelp && (
                <div className="absolute z-10 top-full mt-1 left-0 w-64 rounded-lg border border-[#e6e6e9] bg-[#fff] p-3 text-[12px] shadow-lg space-y-1" onClick={() => setShowDocHelp(false)}>
                  <div><b>Nota de entrega</b> · el cliente recibió la mercancía. Es la de uso diario.</div>
                  <div><b>Cotización</b> · sólo precios. No es venta ni toca inventario.</div>
                </div>
              )}
            </div>
            <Select value={aCredito ? 'pendiente' : pay} disabled={aCredito} onChange={(e) => setPay(e.target.value as PayState)}>
              {PAY_STATES.filter((p) => ['pagado', 'parcial', 'pendiente'].includes(p.key)).map((p) => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </Select>
          </div>

          {!aCredito && pay !== 'pendiente' && (
            <div className="grid grid-cols-2 gap-2">
              <Select value={method} onChange={(e) => setMethod(e.target.value)} title="Con qué te pagaron">
                {MONEY_ACCOUNTS.map((m) => (
                  <option key={m.key} value={m.key}>{m.icon} {m.name}</option>
                ))}
              </Select>
              <Select value={payCur} onChange={(e) => setPayCur(e.target.value as 'USD' | 'BS')} title="Moneda en que recibiste el pago">
                <option value="BS">Cobrado en Bs</option>
                <option value="USD">Cobrado en $</option>
              </Select>
            </div>
          )}

          {!aCredito && pay !== 'pendiente' && method === 'binance' && (
            <div>
              <Btn variant="ghost" className="w-full !text-[12px]" onClick={verifyBinance}>🔎 Verificar cobro en Binance</Btn>
              {bnMsg && <p className="mt-1 text-[12px]" style={{ color: bnMsg.color }}>{bnMsg.text}</p>}
            </div>
          )}

          <div>
            <Label>Fecha de la venta</Label>
            <Input
              type="date"
              value={date}
              max={todayVe()}
              disabled={!isAdmin}
              title={isAdmin ? '' : 'Las ventas se registran con la fecha de hoy. Para otra fecha, pídeselo a un administrador.'}
              onChange={(e) => setDate(e.target.value || todayVe())}
            />
            {date !== todayVe() && (
              <p className="mt-1 text-[11px] text-[#b45309]">
                ⏱ Se registrará con fecha del {new Date(date + 'T12:00:00').toLocaleDateString('es-VE', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>

          <Btn variant="success" className="w-full !py-3 !text-[14px]" disabled={busy} onClick={complete}>
            {busy ? 'Registrando…' : '✓ Completar venta'}
          </Btn>
          <p className="text-[11px] text-[#9ca3af] text-center">Descuenta inventario y genera el documento automáticamente.</p>
        </Card>
      </div>

      <FreeLineModal
        open={freeOpen}
        isAdmin={ctx.canCosts}
        onClose={() => setFreeOpen(false)}
        onAdd={(l) => {
          setLines((prev) => [...prev, l]);
          toast('Agregado: ' + l.name);
        }}
      />
      <NewCustomerModal
        open={custOpen}
        onClose={() => setCustOpen(false)}
        onSaved={(c) => {
          ctx.setCustomers([...ctx.customers, c].sort((a, b) => a.name.localeCompare(b.name)));
          setCustomerId(c.id);
        }}
      />
    </div>
  );
}

function QtyBtn({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <button type="button" onClick={onClick} className="h-7 w-7 rounded-md border border-[#e6e6e9] bg-[#fff] text-[14px] text-[#111] hover:bg-[#f4f4f5]">
      {children}
    </button>
  );
}

// Línea libre: algo que se cobra sin estar en el inventario (un servicio, un encargo).
function FreeLineModal({ open, onClose, onAdd, isAdmin }: { open: boolean; onClose: () => void; onAdd: (l: Line) => void; isAdmin: boolean }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [qty, setQty] = useState('1');
  const [cost, setCost] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => {
    if (open) {
      setName(''); setPrice(''); setQty('1'); setCost(''); setErr('');
    }
  }, [open]);
  const add = () => {
    if (!name.trim()) return setErr('Escribe qué estás cobrando.');
    const p = Number(price);
    if (!(p > 0)) return setErr('El precio debe ser mayor que cero.');
    onAdd({ key: 'libre-' + Date.now(), id: null, free: true, name: name.trim(), qty: Math.max(1, Math.floor(Number(qty) || 1)), price: p, cost: Math.max(0, Number(cost) || 0), stock: Infinity });
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Línea libre">
      <p className="text-[12px] text-[#6b7280] mb-3">Cobra algo que no está en el inventario: un servicio, un estampado, un encargo puntual. No descuenta existencias.</p>
      <div className="space-y-3">
        <div><Label>Descripción</Label><Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Estampado personalizado" /></div>
        <div className="grid grid-cols-3 gap-2">
          <div><Label>Precio $</Label><Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
          <div><Label>Cantidad</Label><Input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} /></div>
          {isAdmin && <div><Label>Costo $ (opcional)</Label><Input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} /></div>}
        </div>
        {err && <p className="text-[12px] text-[#dc2626]">{err}</p>}
        <div className="flex justify-end gap-2"><Btn variant="ghost" onClick={onClose}>Cancelar</Btn><Btn onClick={add}>Agregar</Btn></div>
      </div>
    </Modal>
  );
}

function NewCustomerModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: (c: import('../../lib/adminData').Customer) => void }) {
  const [f, setF] = useState({ name: '', cedula: '', phone: '', email: '', docCurrency: 'USD' as 'USD' | 'BS' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) { setF({ name: '', cedula: '', phone: '', email: '', docCurrency: 'USD' }); setErr(''); }
  }, [open]);
  const save = async () => {
    if (!f.name.trim()) return setErr('Escribe al menos el nombre.');
    setBusy(true);
    try {
      const c = await createCustomer({ ...f, name: f.name.trim() });
      onSaved(c);
      toast.success('Cliente guardado: ' + c.name);
      onClose();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose} title="Nuevo cliente">
      <div className="space-y-3">
        <div><Label>Nombre y apellido</Label><Input autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Cédula / RIF</Label><Input value={f.cedula} onChange={(e) => setF({ ...f, cedula: e.target.value })} /></div>
          <div><Label>Teléfono</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
        </div>
        <div><Label>Correo</Label><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        <div>
          <Label>Documentos en</Label>
          <Select value={f.docCurrency} onChange={(e) => setF({ ...f, docCurrency: e.target.value as 'USD' | 'BS' })}>
            <option value="USD">Dólares ($)</option>
            <option value="BS">Bolívares (Bs)</option>
          </Select>
        </div>
        {err && <p className="text-[12px] text-[#dc2626]">{err}</p>}
        <div className="flex justify-end gap-2"><Btn variant="ghost" onClick={onClose}>Cancelar</Btn><Btn disabled={busy} onClick={save}>{busy ? 'Guardando…' : 'Guardar cliente'}</Btn></div>
      </div>
    </Modal>
  );
}
