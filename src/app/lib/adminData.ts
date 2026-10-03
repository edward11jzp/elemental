// Datos internos del panel admin: ajustes (tasa, IVA, empresa), costos de
// productos, clientes, gastos y cuentas de dinero. Todo es de Elemental.
import { supabase } from './supabase';

/* ================= Ajustes ================= */
export interface Rates {
  exchangeRate: number;
  realFactor: number;
  rateCurrency: 'USD' | 'EUR';
  rateAuto: boolean;
  rateDate: string | null;
}
export interface Company {
  name: string;
  rif: string;
  email: string;
  phone: string;
  address: string;
}
export interface AdminSettings {
  rates: Rates;
  taxRate: number;
  company: Company;
}

export const DEFAULT_SETTINGS: AdminSettings = {
  rates: { exchangeRate: 0, realFactor: 0, rateCurrency: 'USD', rateAuto: false, rateDate: null },
  taxRate: 0,
  company: { name: 'Elemental Fábrica', rif: '', email: '', phone: '', address: '' },
};

export async function loadAdminSettings(): Promise<AdminSettings> {
  const { data, error } = await supabase.from('admin_settings').select('key, value');
  if (error) throw error;
  const map = Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value]));
  return {
    rates: { ...DEFAULT_SETTINGS.rates, ...(map.rates ?? {}) },
    taxRate: Number(map.taxRate ?? 0) || 0,
    company: { ...DEFAULT_SETTINGS.company, ...(map.company ?? {}) },
  };
}

export async function saveAdminSetting(key: 'rates' | 'taxRate' | 'company', value: unknown) {
  const { error } = await supabase
    .from('admin_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

/* ================= Tasa del BCV ================= */
export interface BcvRate {
  usd: number;
  eur: number;
  date: string | null;
  source: string;
}
export async function fetchBcv(): Promise<BcvRate> {
  const r = await fetch('/api/bcv-rate');
  const d = await r.json().catch(() => null);
  if (!r.ok || !d || !(d.usd > 0)) throw new Error((d && d.error) || 'No se pudo consultar el BCV');
  return d;
}

/* ================= Costos de productos ================= */
export async function loadProductCosts(): Promise<Record<string, number>> {
  const { data, error } = await supabase.from('product_costs').select('product_id, cost');
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((r: any) => [r.product_id, Number(r.cost) || 0]));
}
export async function saveProductCost(productId: string, cost: number) {
  const { error } = await supabase
    .from('product_costs')
    .upsert({ product_id: productId, cost, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

/* ================= Clientes ================= */
export interface Customer {
  id: string;
  name: string;
  cedula: string;
  phone: string;
  email: string;
  docCurrency: 'USD' | 'BS';
  ordersCount: number;
  spent: number;
  notes: string;
  tier: 'Regular' | 'Mayorista' | 'VIP';
  fav: string;
  isEmployee: boolean;
  employeeBranch: string;
  creditLimit: number;
  createdAt: string;
}
const rowToCustomer = (r: any): Customer => ({
  id: r.id,
  name: r.name,
  cedula: r.cedula ?? '',
  phone: r.phone ?? '',
  email: r.email ?? '',
  docCurrency: r.doc_currency === 'BS' ? 'BS' : 'USD',
  ordersCount: r.orders_count ?? 0,
  spent: Number(r.spent) || 0,
  notes: r.notes ?? '',
  tier: r.tier === 'VIP' || r.tier === 'Mayorista' ? r.tier : 'Regular',
  fav: r.fav ?? '',
  isEmployee: !!r.is_employee,
  employeeBranch: r.employee_branch ?? '',
  creditLimit: Number(r.credit_limit) || 0,
  createdAt: r.created_at,
});
export async function listCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase.from('customers').select('*').order('name');
  if (error) throw error;
  return (data ?? []).map(rowToCustomer);
}
export async function createCustomer(c: Pick<Customer, 'name' | 'cedula' | 'phone' | 'email' | 'docCurrency'>): Promise<Customer> {
  const { data, error } = await supabase
    .from('customers')
    .insert({ name: c.name, cedula: c.cedula, phone: c.phone, email: c.email, doc_currency: c.docCurrency })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToCustomer(data);
}

export type CustomerInput = Pick<Customer, 'name' | 'cedula' | 'phone' | 'email' | 'docCurrency' | 'tier' | 'fav' | 'notes'> &
  Partial<Pick<Customer, 'isEmployee' | 'employeeBranch' | 'creditLimit'>>;
const customerToRow = (c: CustomerInput) => ({
  name: c.name, cedula: c.cedula, phone: c.phone, email: c.email, doc_currency: c.docCurrency, tier: c.tier, fav: c.fav, notes: c.notes,
  ...(c.isEmployee !== undefined ? { is_employee: c.isEmployee, employee_branch: c.employeeBranch ?? '', credit_limit: c.creditLimit ?? 0 } : {}),
});
export async function saveCustomer(c: CustomerInput, id?: string): Promise<Customer> {
  const q = id ? supabase.from('customers').update(customerToRow(c)).eq('id', id) : supabase.from('customers').insert(customerToRow(c));
  const { data, error } = await q.select().single();
  if (error) throw new Error(error.message);
  return rowToCustomer(data);
}
export async function deleteCustomer(id: string) {
  const { error } = await supabase.from('customers').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/* ================= Cuentas de dinero (de dónde sale / entra) ================= */
// Medios de cobro del POS y cuentas para "Pagado desde" en Gastos.
export interface MoneyAccount {
  key: string;
  name: string;
  icon: string;
  currency: 'USD' | 'BS' | 'COP';
}
export const MONEY_ACCOUNTS: MoneyAccount[] = [
  { key: 'efectivo_usd', name: 'Efectivo $', icon: '💵', currency: 'USD' },
  { key: 'efectivo_bs', name: 'Efectivo Bs', icon: '💴', currency: 'BS' },
  { key: 'pago_movil', name: 'Pago Móvil', icon: '📱', currency: 'BS' },
  { key: 'transferencia', name: 'Transferencia', icon: '🏦', currency: 'BS' },
  { key: 'punto', name: 'Punto de venta / Débito', icon: '💳', currency: 'BS' },
  { key: 'zelle', name: 'Zelle', icon: '🇺🇸', currency: 'USD' },
  { key: 'binance', name: 'Binance (USDT)', icon: '🟡', currency: 'USD' },
  { key: 'pesos_colombianos', name: 'Pesos colombianos', icon: '🇨🇴', currency: 'COP' },
];
export const accountByKey = (k: string | null | undefined) => MONEY_ACCOUNTS.find((a) => a.key === k);
export const curSym = (c: string) => (c === 'BS' ? 'Bs' : c === 'COP' ? 'COP' : '$');

/* ================= Gastos ================= */
export type ExpenseType = 'materia_prima' | 'merma' | 'operativo';
export const EXPENSE_TYPES: { key: ExpenseType; label: string; icon: string }[] = [
  { key: 'materia_prima', label: 'Materia prima', icon: '🧵' },
  { key: 'merma', label: 'Mermas / Desechos', icon: '🗑️' },
  { key: 'operativo', label: 'Gastos operativos', icon: '🏢' },
];
// Categorías propias de una fábrica textil (Elemental).
export const EXPENSE_CATEGORIES: Record<ExpenseType, string[]> = {
  materia_prima: ['Tela', 'Hilo', 'Tinta / Serigrafía', 'Vinil / DTF', 'Etiquetas', 'Empaques / Bolsas', 'Botones / Cierres', 'Otros insumos'],
  merma: ['Retazos de tela', 'Prenda defectuosa', 'Estampado fallido', 'Tinta desperdiciada', 'Material dañado', 'Otros desechos'],
  operativo: ['Alquiler', 'Empleados', 'Servicios', 'Internet', 'Transporte', 'Mantenimiento', 'Impuestos', 'Seguros', 'Publicidad', 'Otros'],
};

export interface Expense {
  id: string;
  type: ExpenseType;
  category: string;
  description: string;
  supplier: string;
  amount: number;
  date: string;
  account: string;
  accountAmount: number | null;
  receiptPath: string | null;
  createdByName: string;
  createdAt: string;
  staffId?: string | null;
  periodFrom?: string | null;
  periodTo?: string | null;
  deductions?: { saleId: string; amount: number }[];
}
const rowToExpense = (r: any): Expense => ({
  id: r.id,
  type: r.type,
  category: r.category,
  description: r.description,
  supplier: r.supplier ?? '',
  amount: Number(r.amount) || 0,
  date: r.date,
  account: r.account ?? '',
  accountAmount: r.account_amount == null ? null : Number(r.account_amount),
  receiptPath: r.receipt_path ?? null,
  createdByName: r.created_by_name ?? '',
  createdAt: r.created_at,
  staffId: r.staff_id ?? null,
  periodFrom: r.period_from ?? null,
  periodTo: r.period_to ?? null,
  deductions: r.deductions ?? [],
});

export async function listExpenses(): Promise<Expense[]> {
  const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false }).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToExpense);
}

export type ExpenseInput = Omit<Expense, 'id' | 'createdAt' | 'receiptPath' | 'createdByName'>;
const expenseToRow = (e: ExpenseInput) => ({
  type: e.type,
  category: e.category,
  description: e.description,
  supplier: e.supplier,
  amount: e.amount,
  date: e.date,
  account: e.account,
  account_amount: e.accountAmount,
  ...(e.staffId !== undefined ? { staff_id: e.staffId, period_from: e.periodFrom ?? null, period_to: e.periodTo ?? null, deductions: e.deductions ?? [] } : {}),
});

export async function saveExpense(e: ExpenseInput, id?: string, createdByName?: string): Promise<Expense> {
  const q = id
    ? supabase.from('expenses').update(expenseToRow(e)).eq('id', id)
    : supabase.from('expenses').insert({ ...expenseToRow(e), created_by_name: createdByName ?? null });
  const { data, error } = await q.select().single();
  if (error) throw new Error(error.message);
  return rowToExpense(data);
}

export async function deleteExpense(e: Expense) {
  if (e.receiptPath) await supabase.storage.from('expense-receipts').remove([e.receiptPath]);
  const { error } = await supabase.from('expenses').delete().eq('id', e.id);
  if (error) throw new Error(error.message);
}

export async function uploadExpenseReceipt(expenseId: string, dataUrl: string): Promise<string> {
  const blob = await (await fetch(dataUrl)).blob();
  const path = `${expenseId}/${Date.now()}.jpg`;
  const { error } = await supabase.storage.from('expense-receipts').upload(path, blob, { contentType: 'image/jpeg', upsert: true });
  if (error) throw new Error(error.message);
  const { error: e2 } = await supabase.from('expenses').update({ receipt_path: path }).eq('id', expenseId);
  if (e2) throw new Error(e2.message);
  return path;
}

export async function receiptUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('expense-receipts').createSignedUrl(path, 300);
  if (error || !data) throw new Error(error?.message ?? 'No se pudo abrir el comprobante');
  return data.signedUrl;
}

export function expenseTotals(list: Expense[]) {
  const by = (t: ExpenseType) => list.filter((e) => e.type === t).reduce((a, e) => a + e.amount, 0);
  const cats: Record<string, number> = {};
  list.forEach((e) => (cats[e.category] = (cats[e.category] || 0) + e.amount));
  const materiaPrima = by('materia_prima');
  const merma = by('merma');
  const operativo = by('operativo');
  return {
    materiaPrima,
    merma,
    operativo,
    total: materiaPrima + merma + operativo,
    byCategory: Object.entries(cats).sort((a, b) => b[1] - a[1]),
  };
}
