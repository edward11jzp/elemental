import { supabase } from './supabase';

export type DocType = 'nota_entrega' | 'factura' | 'recibo' | 'cotizacion' | 'orden';
export type PayState = 'pagado' | 'parcial' | 'pendiente' | 'cancelado' | 'reembolsado';

export const DOC_TYPES: { key: DocType; label: string; prefix: string }[] = [
  { key: 'nota_entrega', label: 'Nota de Entrega', prefix: 'NE' },
  { key: 'factura', label: 'Factura', prefix: 'FAC' },
  { key: 'recibo', label: 'Recibo', prefix: 'REC' },
  { key: 'cotizacion', label: 'Cotización', prefix: 'COT' },
  { key: 'orden', label: 'Orden de Venta', prefix: 'ORD' },
];

export const PAY_STATES: { key: PayState; label: string; color: string }[] = [
  { key: 'pagado', label: 'Pagado', color: '#22c55e' },
  { key: 'parcial', label: 'Pago Parcial', color: '#f59e0b' },
  { key: 'pendiente', label: 'Pendiente', color: '#8b8b92' },
  { key: 'cancelado', label: 'Cancelado', color: '#ef4444' },
  { key: 'reembolsado', label: 'Reembolsado', color: '#a855f7' },
];

export const docLabel = (k: string) => DOC_TYPES.find((d) => d.key === k)?.label ?? k;
export const payState = (k: string) => PAY_STATES.find((p) => p.key === k) ?? { key: k, label: k, color: '#888' };

export interface SaleItem {
  id: string | null;
  free?: boolean;
  name: string;
  size?: string | null;
  color?: string | null;
  qty: number;
  price: number;
  cost?: number;
}

export interface Sale {
  id: string;
  doc: DocType;
  date: string; // ISO
  userName: string;
  customerId: string | null;
  customer: string;
  email: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  taxRate: number;
  tax: number;
  total: number;
  pay: PayState;
  payMethod: string | null;
  payCurrency: string | null;
  docCurrency: 'USD' | 'BS';
  notes: string;
  exchangeRate: number;
  totalBs: number;
  realFactor: number;
  totalReal: number;
  voidInfo: { reason: string; user: string; at: string } | null;
  payments: SalePayment[]; // abonos (ventas a crédito del personal)
}

export interface SalePayment {
  id: string;
  saleId: string;
  amount: number;
  method: string; // cuenta de dinero o 'nomina'
  currency: string;
  bs: number | null;
  date: string;
  note: string;
  userName: string;
  createdAt: string;
}

const n = (v: any) => Number(v) || 0;

function rowToSale(r: any): Sale {
  return {
    id: r.id,
    doc: r.doc,
    date: r.date,
    userName: r.user_name ?? '',
    customerId: r.customer_id ?? null,
    customer: r.customer ?? '',
    email: r.email ?? '',
    items: (r.items ?? []).map((i: any) => ({ ...i, qty: n(i.qty), price: n(i.price), cost: i.cost == null ? undefined : n(i.cost) })),
    subtotal: n(r.subtotal),
    discount: n(r.discount),
    taxRate: n(r.tax_rate),
    tax: n(r.tax),
    total: n(r.total),
    pay: r.pay,
    payMethod: r.pay_method ?? null,
    payCurrency: r.pay_currency ?? null,
    docCurrency: r.doc_currency === 'BS' ? 'BS' : 'USD',
    notes: r.notes ?? '',
    exchangeRate: n(r.exchange_rate),
    totalBs: n(r.total_bs),
    realFactor: n(r.real_factor),
    totalReal: n(r.total_real),
    voidInfo: r.void_info ?? null,
    payments: (r.payments ?? []).map((p: any) => ({
      id: p.id, saleId: p.sale_id, amount: n(p.amount), method: p.method, currency: p.currency, bs: p.bs == null ? null : n(p.bs),
      date: p.date, note: p.note ?? '', userName: p.user_name ?? '', createdAt: p.created_at,
    })),
  };
}

/** Ventas en un rango de días (fecha Venezuela, 'AAAA-MM-DD'). Sin rango = todas. */
export async function listSales(from?: string, to?: string): Promise<Sale[]> {
  const { data, error } = await supabase.rpc('list_sales', { p_from: from ?? null, p_to: to ?? null });
  if (error) throw error;
  return (data ?? []).map(rowToSale);
}

export interface NewSale {
  doc: DocType;
  customerId: string | null;
  customer: string;
  email: string;
  items: SaleItem[];
  discount: number;
  taxRate: number;
  pay: PayState;
  payMethod: string | null;
  payCurrency: string | null;
  docCurrency: 'USD' | 'BS';
  date: string | null;
  notes: string;
  exchangeRate: number;
  realFactor: number;
  credit?: boolean;
  confirmOverLimit?: boolean;
  initialAbono?: number;
}

export async function createSale(s: NewSale): Promise<Sale> {
  const { data, error } = await supabase.rpc('create_sale', { p: s });
  if (error) throw new Error(error.message);
  return rowToSale(data);
}

export async function setSalePay(id: string, pay: PayState) {
  const { error } = await supabase.rpc('set_sale_pay', { p_id: id, p_pay: pay });
  if (error) throw new Error(error.message);
}

export async function setSaleDate(id: string, date: string): Promise<string> {
  const { data, error } = await supabase.rpc('set_sale_date', { p_id: id, p_date: date });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function voidSale(id: string, reason: string) {
  const { data, error } = await supabase.rpc('void_sale', { p_id: id, p_reason: reason });
  if (error) throw new Error(error.message);
  return data as { reason: string; user: string; at: string };
}

/* ---------- Fechas en hora de Venezuela (UTC-4) ---------- */
export function veDay(iso: string | Date): string {
  const t = typeof iso === 'string' ? new Date(iso).getTime() : iso.getTime();
  return new Date(t - 4 * 3600e3).toISOString().slice(0, 10);
}
export const todayVe = () => veDay(new Date());
export function addDays(iso: string, k: number) {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + k);
  return d.toISOString().slice(0, 10);
}
export const daysBetween = (a: string, b: string) =>
  Math.round((new Date(b + 'T12:00:00Z').getTime() - new Date(a + 'T12:00:00Z').getTime()) / 864e5);

export const saleCost = (s: Sale) => s.items.reduce((a, i) => a + (i.cost ?? 0) * i.qty, 0);
export const isValidSale = (s: Sale) => s.doc !== 'cotizacion' && s.pay !== 'cancelado' && s.pay !== 'reembolsado';

/* ---------- Formatos ---------- */
export const fmt = (v: number) =>
  '$' + (Math.round((v || 0) * 100) / 100).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const bsFmt = (v: number) => 'Bs ' + Math.round(v || 0).toLocaleString('es-VE');
export const niceDay = (iso: string, opt?: Intl.DateTimeFormatOptions) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('es-VE', opt ?? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
export const saleDateLabel = (iso: string) =>
  new Date(iso).toLocaleString('es-VE', { timeZone: 'America/Caracas', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/* ---------- Créditos del personal ---------- */
export const salePaid = (s: Sale) => s.payments.reduce((a, p) => a + p.amount, 0);
export const saleBalance = (s: Sale) => Math.max(0, Math.round((s.total - salePaid(s)) * 100) / 100);

export async function addSalePayment(saleId: string, p: { amount: number; method: string; currency: string; bs: number | null; date: string; note: string }) {
  const { data, error } = await supabase.rpc('add_sale_payment', {
    p_sale: saleId, p_amount: p.amount, p_method: p.method, p_currency: p.currency, p_bs: p.bs, p_date: p.date, p_note: p.note,
  });
  if (error) throw new Error(error.message);
  return Number(data) || 0; // saldo pendiente
}
export async function deleteSalePayment(id: string) {
  const { error } = await supabase.rpc('delete_sale_payment', { p_id: id });
  if (error) throw new Error(error.message);
}
