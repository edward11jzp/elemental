import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useApp } from '../../context';
import { Btn, Card, Input, Label, Modal, Pills, Select, Textarea, cx } from '../../components/admin/ui';
import { fetchProviderPayments, loadLinks } from '../../lib/payconf';
import { addSalePayment, createSale, fmt, todayVe, PAY_STATES, DOC_TYPES, type DocType, type PayState } from '../../lib/sales';
import { createCustomer, fetchBcv, MONEY_ACCOUNTS, saveAdminSetting, accountByKey, saveAdminSetting as saveSetting, type Customer, type PrintOpt } from '../../lib/adminData';
import { getColorUpcharge, getSizeUpcharge } from '../../lib/pricing';
import type { Product } from '../../types';
import type { SalesCtx } from '../AdminSales';
import { useSedes } from '../../lib/sedes';
import { pedirTraslado } from '../../lib/transfers';
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
  /** Por encargo: cuántas se entregan hoy (el resto queda pendiente). */
  entregar?: number;
  prints?: PrintOpt[];
}

type Mode = 'detal' | 'mayor';

// Tallas de menor a mayor: niños por número, luego XS … 5XL; las desconocidas al final.
const TALLAS = ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', 'XXL', '3XL', 'XXXL', '4XL', 'XXXXL', '5XL'];
const rankTalla = (t: string) => {
  const u = (t ?? '').toUpperCase().replace(/\s+/g, '');
  if (/^\d+$/.test(u)) return Number(u) - 1000;
  const i = TALLAS.indexOf(u);
  return i >= 0 ? i : 500;
};
const ordenTallas = (ts: string[]) => [...ts].sort((a, b) => rankTalla(a) - rankTalla(b) || a.localeCompare(b));

const printsSum = (l: { prints?: PrintOpt[] }) => (l.prints ?? []).reduce((a, p) => a + p.price, 0);
const lineKey = (l: { id?: string | null; size?: string; color?: string; prints?: PrintOpt[] }) =>
  `${l.id}|${l.size ?? ''}|${l.color ?? ''}|${(l.prints ?? []).map((p) => p.name).join('+')}`;

const norm = (t: string) => (t ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
/** Palabras de búsqueda; a las largas se les quita la terminación (negra/negro/negros → negr). */
const searchWords = (q: string) =>
  norm(q.trim()).split(/\s+/).filter(Boolean).map((w) => (w.length >= 4 ? w.replace(/(as|os|es|a|o|s)$/, '') : w));

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
  // Por encargo se puede pedir cualquier talla o color del producto, haya o no.
  const tallasCon = (id: string) =>
    ordenTallas([...new Set([...filasDe(id).map((r) => r.size), ...(encargo ? products.find((p) => p.id === id)?.sizes ?? [] : [])])]);
  // Lo que hay del producto en las demas sedes, para avisar al cliente.
  const enOtrasSedes = (id: string) =>
    (sIdx.get(id) ?? [])
      .filter((r) => r.locationId !== vendeEn && r.qty > 0)
      .reduce((acc, r) => {
        const nombre = nameOf(r.locationId);
        acc.set(nombre, (acc.get(nombre) ?? 0) + r.qty);
        return acc;
      }, new Map<string, number>());
  const coloresCon = (id: string, size: string) =>
    [...new Set([...filasDe(id).filter((r) => (r.size ?? '') === (size ?? '')).map((r) => r.color),
                 ...(encargo ? products.find((p) => p.id === id)?.colors ?? [] : [])])];

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
  const [colorF, setColorF] = useState('');
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
  // Método obligatorio (sin valor por defecto). Con «extra» la venta se cobra con varios métodos.
  const [method, setMethod] = useState('');
  const [amt0, setAmt0] = useState('');
  const [extra, setExtra] = useState<{ method: string; amount: string; local: string }[]>([]);
  const [payCur, setPayCur] = useState<'USD' | 'BS'>('USD');
  const [date, setDate] = useState(todayVe());
  const [busy, setBusy] = useState(false);
  const [encargo, setEncargo] = useState(false);
  const [envio, setEnvio] = useState(false);
  const [printsOpen, setPrintsOpen] = useState(false);
  // Presupuesto cargado para facturarlo: trae líneas, cliente y notas tal como se presupuestó.
  const quote = ctx.quote;
  useEffect(() => {
    if (!quote) return;
    setDoc('nota_entrega');
    setCustomerId(quote.customerId ?? '');
    setNotes(quote.notes);
    setDiscount(String(quote.discount || 0));
    setLines(quote.items.map((i, n) => {
      const p = i.id ? products.find((x) => x.id === i.id) : undefined;
      const key = i.id ? lineKey({ id: i.id, size: i.size ?? '', color: i.color ?? '', prints: i.prints }) : `free-${n}`;
      return {
        key, id: i.id, free: !i.id || !!i.free, name: i.name, image: p?.image, sizes: p?.sizes,
        size: i.size ?? '', color: i.color ?? '', qty: i.qty, price: i.price, cost: i.cost, prints: i.prints ?? [],
        stock: i.id ? qtyAt(sIdx, i.id, vendeEn, i.size ?? '', i.color ?? '') : 0,
      };
    }));
  }, [quote]); // eslint-disable-line react-hooks/exhaustive-deps
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
  // Búsqueda sin acentos y palabra por palabra, por nombre, código, categoría, color o talla:
  // «franela negra m» encuentra la FRANELA en NEGRO talla M («negra» y «negro» cuentan igual).
  const words = useMemo(() => searchWords(q), [q]);
  const list = useMemo(() => {
    return delTipo.filter((p) => {
      if (cat && p.subcategory !== cat) return false;
      if (colorF && !(sIdx.get(p.id) ?? []).some((r) => r.color === colorF && r.qty > 0 && (!vendeEn || r.locationId === vendeEn))
          && !(encargo && (p.colors ?? []).includes(colorF))) return false;
      if (!words.length) return true;
      const rows = sIdx.get(p.id) ?? [];
      const hay = norm([p.name, p.id, p.sku ?? '', ...Object.values(p.skuSizes ?? {}), SUBCAT_LABEL[p.subcategory] ?? p.subcategory,
        ...(p.colors ?? []), ...rows.map((r) => r.color)].join(' '));
      const tallas = new Set([...(p.sizes ?? []), ...rows.map((r) => r.size)].map((t) => norm(t)));
      return words.every((w) => hay.includes(w) || tallas.has(w));
    });
  }, [delTipo, q, cat, colorF, sIdx, vendeEn, encargo]);

  // Colores con existencias en la sede, para el filtro.
  const coloresDisponibles = useMemo(() => {
    const ids = new Set(delTipo.map((p) => p.id));
    const set = new Set<string>();
    stockRows.forEach((r) => { if (ids.has(r.productId) && r.qty > 0 && r.color && (!vendeEn || r.locationId === vendeEn)) set.add(r.color); });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [stockRows, delTipo, vendeEn]);

  const changeMode = (m: Mode) => {
    setMode(m);
    let changed = 0;
    const next = lines.map((l) => {
      if (l.free || !l.id) return l;
      const p = products.find((x) => x.id === l.id);
      if (!p) return l;
      const np = basePrice(p, m) + getSizeUpcharge(l.size) + getColorUpcharge(l.color) + printsSum(l);
      if (np !== l.price) changed++;
      return { ...l, price: np };
    });
    setLines(next);
    if (changed) toast(`Precios al ${m} · ${changed} línea${changed === 1 ? '' : 's'} actualizada${changed === 1 ? '' : 's'}`);
  };

  // Pide la mercancía a la tienda que la tiene, sin salir del mostrador.
  const pedirAOtra = async (p: Product) => {
    const filas = (sIdx.get(p.id) ?? []).filter((r) => r.locationId !== vendeEn && r.qty > 0);
    if (!filas.length) return toast.error('No hay en ninguna otra tienda');
    const opciones = filas.map((r, i) => `${i + 1}) ${nameOf(r.locationId)} · ${[r.size, r.color].filter(Boolean).join(' ') || 'sin talla'} · ${r.qty}`);
    const elegido = prompt(`¿Qué pides de ${p.name}?\n\n${opciones.join('\n')}\n\nEscribe el número:`);
    const idx = Number(elegido) - 1;
    const fila = filas[idx];
    if (!fila) return;
    const cuantas = Math.floor(Number(prompt(`¿Cuántas piezas? (hay ${fila.qty})`, '1') ?? 0));
    if (!(cuantas > 0)) return;
    const nota = prompt('Nota para la otra tienda (opcional)') ?? '';
    try {
      await pedirTraslado(p.id, fila.locationId, cuantas, fila.size, fila.color, nota);
      toast.success(`Pedido a ${nameOf(fila.locationId)} · lo verás en Traslados`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const addProduct = (p: Product, forced?: { size: string; color?: string }) => {
    const conStock = filasDe(p.id);
    // Si se buscó una talla o un color, se elige la variante que más coincide.
    const score = (r: { size: string; color: string }) =>
      (colorF && r.color === colorF ? 10 : 0) + words.filter((w) => norm(r.size) === w || (w.length >= 3 && norm(r.color).includes(w))).length;
    const mejor = forced
      ? conStock.find((r) => r.size === forced.size && (!forced.color || r.color === forced.color)) ?? { size: forced.size, color: forced.color ?? '' }
      : [...conStock].sort((a, b) => score(b) - score(a))[0];
    const size = mejor?.size ?? p.sizes?.[0] ?? '';
    const color = mejor?.color ?? conStock.find((r) => r.size === size)?.color ?? '';
    const key = lineKey({ id: p.id, size, color });
    setLines((prev) => {
      const ex = prev.find((l) => l.key === key);
      const inSale = prev.filter((l) => l.id === p.id).reduce((a, l) => a + l.qty, 0);
      // Se puede vender sin existencias: el inventario queda en negativo. Solo se avisa.
      if (!encargo && inSale >= stockOf(p.id)) toast.warning(`Sin existencias en ${nameOf(vendeEn) || 'tu sede'}: el inventario quedará en negativo`);
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
          next.price = basePrice(p, mode) + getSizeUpcharge(next.size) + getColorUpcharge(next.color) + printsSum(next);
          next.stock = qtyAt(sIdx, p.id, vendeEn, next.size ?? '', next.color ?? '');
        }
      }
      if (patch.qty !== undefined) {
        let qn = Math.floor(Number(patch.qty));
        if (!qn || qn < 1) qn = 1;
        if (!l.free && !encargo) {
          const others = prev.filter((x) => x.id === l.id && x.key !== key).reduce((a, x) => a + x.qty, 0);
          if (qn > Math.max(0, l.stock - others) && qn > l.qty) toast.warning(`Solo hay ${Math.max(0, l.stock)} de ${l.name}: el inventario quedará en negativo`);
        }
        next.qty = qn;
      }
      if (encargo && !l.free) next.entregar = Math.max(0, Math.min(Math.floor(Number(next.entregar) || 0), next.qty, next.stock));
      if (patch.prints !== undefined && !l.free) next.price = Math.round((l.price - printsSum(l) + printsSum(next)) * 100) / 100;
      next.key = l.free ? l.key : lineKey(next);
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

  const toggleEncargo = (on: boolean) => {
    setEncargo(on);
    if (!on) {
      setLines((prev) => prev.map((l) => (l.free ? l : { ...l, entregar: undefined })));
    }
  };

  /* ---------- Completar venta ---------- */
  const complete = async () => {
    if (!lines.length) return toast.error('Agrega al menos un producto');
    const cobra = !aCredito && pay !== 'pendiente' && doc !== 'cotizacion';
    let paySplit: { method: string; currency: string; amount: number; local: number | null }[] = [];
    if (cobra) {
      if (!method || extra.some((x) => !x.method)) return toast.error('Elige el método de pago');
      if (extra.length) {
        const rows = [{ method, amount: amt0, local: '' }, ...extra];
        paySplit = rows.map((x) => {
          const cur = accountByKey(x.method)?.currency ?? 'USD';
          const amount = Math.round((Number(x.amount) || 0) * 100) / 100;
          const local = cur === 'USD' ? null : Number(x.local) || (cur === 'BS' && tasaN ? Math.round(amount * tasaN * 100) / 100 : null);
          return { method: x.method, currency: cur, amount, local };
        });
        if (paySplit.some((x) => x.amount <= 0)) return toast.error('Pon el monto de cada método');
        const sum = paySplit.reduce((a, x) => a + x.amount, 0);
        if (pay === 'pagado' && Math.abs(sum - total) > 0.01) return toast.error(`Los pagos suman ${fmt(sum)} y la venta es de ${fmt(total)}`);
        if (sum > total + 0.01) return toast.error(`Los pagos suman ${fmt(sum)}, más que la venta (${fmt(total)})`);
      }
    }
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
        items: lines.map((l) => ({ id: l.id, free: !!l.free, name: l.name, size: l.size ?? null, color: l.color || null, qty: l.qty, price: l.price, cost: l.cost, prints: l.prints ?? [], deliverNow: l.free ? l.qty : (l.entregar ?? 0) })),
        encargo,
        shipping: envio,
        fromQuote: quote?.id ?? null,
        discount: disc,
        taxRate: taxR,
        pay: aCredito ? ('pendiente' as const) : pay,
        payMethod: aCredito || pay === 'pendiente' ? null : extra.length ? 'mixto' : method || null,
        paySplit,
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
      setEncargo(false);
      setEnvio(false);
      setMethod(''); setAmt0(''); setExtra([]);
      ctx.loadQuote(null);
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
            <Input
              placeholder="Buscar por nombre, código, color o talla…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                // Código exacto (de producto o de talla) + Enter: se agrega directo a la venta.
                const code = q.trim().toLowerCase();
                for (const p of delTipo) {
                  const talla = Object.entries(p.skuSizes ?? {}).find(([, c]) => c.toLowerCase() === code)?.[0];
                  if (talla !== undefined || (p.sku ?? '').toLowerCase() === code) {
                    addProduct(p, talla !== undefined ? { size: talla } : undefined);
                    setQ('');
                    return;
                  }
                }
                if (list.length === 1) { addProduct(list[0]); setQ(''); }
              }}
              className="flex-1 min-w-[180px]"
            />
            <Select value={cat} onChange={(e) => setCat(e.target.value)} className="!w-auto">
              <option value="">Todas las categorías</option>
              {categories.map((c) => (
                <option key={c} value={c}>{SUBCAT_LABEL[c] ?? c}</option>
              ))}
            </Select>
            <Select value={colorF} onChange={(e) => setColorF(e.target.value)} className="!w-auto" title="Ver solo productos que hay en este color">
              <option value="">Todos los colores</option>
              {coloresDisponibles.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
            <Pills<Mode> value={mode} onChange={changeMode} options={[{ key: 'detal', label: 'Detal' }, { key: 'mayor', label: 'Mayor' }]} />
            <Btn variant="ghost" onClick={() => setFreeOpen(true)} title="Cobrar algo que no está en el inventario">＋ Línea libre</Btn>
            <p className="basis-full text-[11px] text-[#6b7280]">
              <b>🧾 Facturación / 🛍️ Tienda / Todos</b>: qué catálogo ves (productos de las tiendas o los de la página web) ·{' '}
              <b>Categoría</b> y <b>Color</b>: filtran la lista · <b>Detal / Mayor</b>: cambia todos los precios de la venta ·{' '}
              <b>＋ Línea libre</b>: cobrar algo que no está en el inventario.
            </p>
          </Card>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3">
            {list.map((p) => {
              const left = stockOf(p.id) - inSaleQty(p.id);
              const out = stockOf(p.id) <= 0;
              return (
                <Card key={p.id} className={cx('p-3 transition-colors cursor-pointer hover:border-[#a1a1aa]', out && 'opacity-60')} onClick={() => addProduct(p)}>
                  {p.image ? (
                    <img src={p.image} alt={p.name} className="w-full aspect-square rounded-lg object-cover bg-[#f1f1f3]" loading="lazy" />
                  ) : (
                    <div className="w-full aspect-square rounded-lg bg-[#f1f1f3] flex items-center justify-center text-3xl">{p.emoji || '📦'}</div>
                  )}
                  <div className="text-[13px] font-medium mt-2 leading-tight line-clamp-2">{p.name}</div>
                  <div className="text-[11px] text-[#6b7280]">{p.sku ? <span className="font-mono">{p.sku}</span> : SUBCAT_LABEL[p.subcategory] ?? p.subcategory} · stock {left}</div>
                  {sedes.length > 1 && enOtrasSedes(p.id).size > 0 && (
                    <>
                      <div className={cx('text-[10px] mt-0.5', out ? 'text-[#b45309] font-medium' : 'text-[#9ca3af]')}>
                        {out ? '🏢 hay en: ' : 'otras: '}
                        {[...enOtrasSedes(p.id).entries()].map(([n, q]) => `${n} ${q}`).join(' · ')}
                      </div>
                      {out && (
                        <button
                          type="button"
                          className="mt-1 w-full rounded-md border border-[#e6e6e9] bg-[#fff] px-2 py-1 text-[10px] text-[#111] hover:bg-[#f4f4f5]"
                          onClick={(e) => { e.stopPropagation(); pedirAOtra(p); }}
                        >
                          ⇄ Pedir a otra tienda
                        </button>
                      )}
                    </>
                  )}
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
            {quote && (
              <span className="rounded-md bg-[#eff6ff] px-2 py-0.5 text-[11px] text-[#1d4ed8]">
                📝 de {quote.id}
                <button type="button" className="ml-1.5" title="Quitar presupuesto" onClick={() => { ctx.loadQuote(null); setLines([]); }}>✕</button>
              </span>
            )}
            {mode === 'mayor' && <span className="text-[11px] text-[#9333ea]">Precios al mayor</span>}
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
            <div>
              <Label>Cliente</Label>
              <div className="flex gap-1.5">
                <CustomerPicker customers={ctx.customers} value={customerId} onChange={setCustomerId} onNew={() => setCustOpen(true)} />
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
                    <div className="text-[11px] text-[#6b7280]">{fmt(l.price)} c/u{l.prints?.length ? ` · incluye 🎨 ${l.prints.map((p) => `${p.name} ${fmt(p.price)}`).join(' + ')}` : ''}</div>
                    {!l.free && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {ctx.settings.prints.map((p) => {
                          const on = !!l.prints?.some((x) => x.name === p.name);
                          return (
                            <button
                              key={p.name}
                              type="button"
                              onClick={() => updateLine(l.key, { prints: on ? (l.prints ?? []).filter((x) => x.name !== p.name) : [...(l.prints ?? []), p] })}
                              className={`rounded-full border px-2 py-0.5 text-[11px] ${on ? 'border-[#7e22ce] bg-[#f3e8ff] text-[#7e22ce]' : 'border-[#e6e6e9] text-[#52525b]'}`}
                            >
                              {on ? '✓ ' : '🎨 '}{p.name} +{fmt(p.price)}
                            </button>
                          );
                        })}
                        {isAdmin && (
                          <button type="button" onClick={() => setPrintsOpen(true)} className="rounded-full border border-dashed border-[#d4d4d8] px-2 py-0.5 text-[11px] text-[#6b7280]">
                            {ctx.settings.prints.length ? '⚙️' : '🎨 Configurar estampados'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="w-20 text-right font-semibold">{fmt(l.price * l.qty)}</span>
                  <button type="button" onClick={() => removeLine(l.key)} className="text-[#9ca3af] hover:text-[#dc2626] px-1" aria-label="Quitar">✕</button>
                </div>
                <div className="flex items-center gap-1.5">
                  {!l.free && l.id && (() => {
                    // Sólo las tallas y colores con existencias en esta sede.
                    const tallas = tallasCon(l.id!);
                    const colores = coloresCon(l.id!, l.size ?? '');
                    const opcTallas = tallas.length ? tallas : ordenTallas(l.sizes ?? []);
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
                {encargo && !l.free && (
                  <div className="flex items-center gap-2 mt-1.5 text-[12px] text-[#6b7280]">
                    <span>📦 Entregar hoy</span>
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={l.entregar ?? 0}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => updateLine(l.key, { entregar: Number(e.target.value) })}
                      className="w-14 rounded-md border border-[#e6e6e9] bg-[#fff] py-0.5 text-center text-[12px] text-[#111]"
                    />
                    <span>de {Math.min(l.qty, l.stock)} disponibles · queda pendiente <b className="text-[#b45309]">{l.qty - (l.entregar ?? 0)}</b></span>
                  </div>
                )}
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

          {doc !== 'cotizacion' && (
            <label className="flex items-center gap-2 rounded-lg border border-[#e6e6e9] p-2.5 text-[13px] cursor-pointer">
              <input type="checkbox" checked={envio} onChange={(e) => setEnvio(e.target.checked)} />
              <b>🚚 Es un envío</b>
            </label>
          )}
          {doc !== 'cotizacion' && (
            <label className="flex items-start gap-2 rounded-lg border border-[#e6e6e9] p-2.5 text-[13px] cursor-pointer">
              <input type="checkbox" className="mt-0.5" checked={encargo} onChange={(e) => toggleEncargo(e.target.checked)} />
              <span>
                <b>📦 Venta por encargo</b>
                <span className="block text-[11px] text-[#6b7280]">El cliente paga hoy y se le entrega después. Solo sale del inventario lo que entregues hoy; el resto queda en Encargos.</span>
              </span>
            </label>
          )}

          <Textarea rows={2} placeholder="Notas de la venta…" value={notes} onChange={(e) => setNotes(e.target.value)} />

          <div className="grid grid-cols-2 gap-2">
            <div className="relative flex gap-1">
              <Select value={doc} onChange={(e) => { setDoc(e.target.value as DocType); if (e.target.value === 'cotizacion') toggleEncargo(false); }}>
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
              <Select value={method} onChange={(e) => setMethod(e.target.value)} title="Con qué te pagaron" className={method ? '' : '!border-[#f59e0b]'}>
                <option value="">— Método de pago —</option>
                {MONEY_ACCOUNTS.map((m) => (
                  <option key={m.key} value={m.key}>{m.icon} {m.name}</option>
                ))}
              </Select>
              {extra.length ? (
                <Input type="number" step="0.01" min={0} placeholder="$ de este método" value={amt0} onChange={(e) => setAmt0(e.target.value)} />
              ) : (
                <Select value={payCur} onChange={(e) => setPayCur(e.target.value as 'USD' | 'BS')} title="Moneda en que recibiste el pago">
                  <option value="BS">Cobrado en Bs</option>
                  <option value="USD">Cobrado en $</option>
                </Select>
              )}
              {extra.map((x, i) => {
                const cur = accountByKey(x.method)?.currency ?? 'USD';
                const set = (patch: Partial<typeof x>) => setExtra((prev) => prev.map((y, j) => (j === i ? { ...y, ...patch } : y)));
                return (
                  <div key={i} className="col-span-2 grid grid-cols-[1fr_1fr_auto] gap-2">
                    <Select value={x.method} onChange={(e) => set({ method: e.target.value, local: '' })} className={x.method ? '' : '!border-[#f59e0b]'}>
                      <option value="">— Método —</option>
                      {MONEY_ACCOUNTS.map((m) => <option key={m.key} value={m.key}>{m.icon} {m.name}</option>)}
                    </Select>
                    <div className="flex gap-1">
                      <Input type="number" step="0.01" min={0} placeholder="$" value={x.amount} onChange={(e) => set({ amount: e.target.value })} />
                      {cur !== 'USD' && (
                        <Input type="number" step="0.01" min={0} title={`Cuánto entró en ${cur === 'BS' ? 'Bs' : 'COP'}`}
                          placeholder={cur === 'BS' ? (Number(x.amount) && tasaN ? 'Bs ' + Math.round(Number(x.amount) * tasaN) : 'Bs') : 'COP'}
                          value={x.local} onChange={(e) => set({ local: e.target.value })} />
                      )}
                    </div>
                    <button type="button" className="px-1 text-[#6b7280]" title="Quitar" onClick={() => setExtra((prev) => prev.filter((_, j) => j !== i))}>✕</button>
                  </div>
                );
              })}
              <div className="col-span-2 flex items-center justify-between text-[12px]">
                <button
                  type="button"
                  className="text-[#1d4ed8]"
                  onClick={() => {
                    // Al pasar a mixto, lo que falta se propone en la nueva línea.
                    if (!extra.length) setAmt0('');
                    const pagado = extra.length ? (Number(amt0) || 0) + extra.reduce((a, x) => a + (Number(x.amount) || 0), 0) : total;
                    const falta = Math.max(0, Math.round((total - pagado) * 100) / 100);
                    setExtra((prev) => [...prev, { method: '', amount: falta ? String(falta) : '', local: '' }]);
                  }}
                >
                  ＋ Pagar con otro método (mixto)
                </button>
                {extra.length > 0 && (() => {
                  const sum = (Number(amt0) || 0) + extra.reduce((a, x) => a + (Number(x.amount) || 0), 0);
                  const falta = Math.round((total - sum) * 100) / 100;
                  return <span className={Math.abs(falta) > 0.01 ? 'text-[#dc2626]' : 'text-[#15803d]'}>{Math.abs(falta) <= 0.01 ? '✓ Cuadra' : falta > 0 ? `Falta ${fmt(falta)}` : `Sobra ${fmt(-falta)}`}</span>;
                })()}
              </div>
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
      <PrintsModal open={printsOpen} onClose={() => setPrintsOpen(false)} value={ctx.settings.prints} onSaved={(prints) => ctx.setSettings({ ...ctx.settings, prints })} />
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

/** Buscador de clientes: por nombre, cédula/RIF o teléfono, sin acentos ni puntos. */
function CustomerPicker({ customers, value, onChange, onNew }: { customers: Customer[]; value: string; onChange: (id: string) => void; onNew: () => void }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const sel = customers.find((c) => c.id === value) ?? null;
  const digits = (t: string) => (t ?? '').replace(/\D/g, '');
  const res = useMemo(() => {
    const words = norm(q.trim()).split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const num = digits(q);
    return customers
      .filter((c) => {
        const hay = norm(`${c.name} ${c.email}`);
        return words.every((w) => hay.includes(w) || (digits(w).length >= 3 && (digits(c.cedula).includes(digits(w)) || digits(c.phone).includes(digits(w)))));
      })
      .sort((a, b) => Number(num && digits(b.cedula) === num) - Number(num && digits(a.cedula) === num) || b.ordersCount - a.ordersCount)
      .slice(0, 30);
  }, [customers, q]);

  if (sel && !open) {
    return (
      <div className="flex-1 min-w-0 flex items-center gap-2 rounded-lg border border-[#e6e6e9] bg-[#fff] px-3 py-2 text-[13px]">
        <span className="min-w-0 flex-1 truncate"><b>{sel.name}</b>{sel.cedula ? <span className="text-[#6b7280]"> · {sel.cedula}</span> : null}</span>
        <button type="button" title="Cambiar cliente" onClick={() => { onChange(''); setQ(''); setOpen(true); }} className="text-[#6b7280]">✕</button>
      </div>
    );
  }
  return (
    <div className="relative flex-1 min-w-0">
      <Input
        placeholder="Consumidor final · buscar nombre, cédula o teléfono"
        value={q}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onKeyDown={(e) => { if (e.key === 'Enter' && res[0]) { onChange(res[0].id); setOpen(false); } }}
      />
      {open && q.trim() && (
        <div className="absolute z-20 mt-1 w-full max-h-72 overflow-auto rounded-lg border border-[#e6e6e9] bg-[#fff] shadow-lg">
          {res.map((c) => (
            <button
              key={c.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onChange(c.id); setOpen(false); }}
              className="block w-full px-3 py-2 text-left text-[13px] hover:bg-[#f4f4f5]"
            >
              <b>{c.name}</b>
              <span className="block text-[11px] text-[#6b7280]">{[c.cedula, c.phone].filter(Boolean).join(' · ') || 'sin cédula'}</span>
            </button>
          ))}
          {!res.length && <div className="px-3 py-2 text-[12px] text-[#6b7280]">No hay clientes con «{q}».</div>}
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setOpen(false); onNew(); }} className="block w-full border-t border-[#f1f1f3] px-3 py-2 text-left text-[13px] text-[#1d4ed8] hover:bg-[#f4f4f5]">
            ＋ Crear cliente nuevo
          </button>
        </div>
      )}
    </div>
  );
}

/** Lista de estampados y sus precios (la edita un administrador o gerente). */
function PrintsModal({ open, onClose, value, onSaved }: { open: boolean; onClose: () => void; value: PrintOpt[]; onSaved: (p: PrintOpt[]) => void }) {
  const [rows, setRows] = useState<{ name: string; price: string }[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setRows(value.length ? value.map((p) => ({ name: p.name, price: String(p.price) })) : [{ name: '', price: '' }]);
  }, [open, value]);
  const save = async () => {
    const clean = rows.map((r) => ({ name: r.name.trim(), price: Math.round((Number(r.price) || 0) * 100) / 100 })).filter((r) => r.name);
    if (clean.some((r) => r.price < 0)) return toast.error('Precio inválido');
    if (new Set(clean.map((r) => r.name.toLowerCase())).size !== clean.length) return toast.error('Hay dos estampados con el mismo nombre');
    setBusy(true);
    try {
      await saveSetting('prints', clean);
      onSaved(clean);
      toast.success('Estampados guardados ✓');
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose} title="🎨 Estampados y precios">
      <div className="space-y-2">
        <p className="text-[12px] text-[#6b7280]">Aparecen como botones en cada prenda de la venta. El precio se suma por pieza.</p>
        {rows.map((r, i) => (
          <div key={i} className="flex gap-2">
            <Input placeholder="Ej: Frontal pequeño" value={r.name} onChange={(e) => setRows((p) => p.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
            <Input type="number" step="0.01" min={0} placeholder="$" value={r.price} onChange={(e) => setRows((p) => p.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} className="!w-24" />
            <button type="button" className="px-1 text-[#6b7280]" onClick={() => setRows((p) => p.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
        <Btn variant="ghost" onClick={() => setRows((p) => [...p, { name: '', price: '' }])}>＋ Agregar estampado</Btn>
        <div className="flex justify-end gap-2 pt-1">
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn disabled={busy} onClick={save}>{busy ? 'Guardando…' : 'Guardar'}</Btn>
        </div>
      </div>
    </Modal>
  );
}
