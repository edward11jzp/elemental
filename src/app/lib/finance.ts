// Finanzas: saldo de cada cuenta de dinero de Elemental.
// Saldo = saldo de partida (último ajuste)
//       + ventas del POS cobradas + pedidos web aprobados + ingresos
//       + transferencias y cambios recibidos
//       − gastos pagados desde la cuenta − egresos − transferencias y cambios enviados.
// Sólo cuenta lo posterior al último ajuste de saldo de esa cuenta.
import { supabase } from './supabase';
import { MONEY_ACCOUNTS, type Expense, type MoneyAccount } from './adminData';
import { veDay, type Sale } from './sales';
import type { Order } from '../types';

export type MoveType = 'in' | 'out' | 'transfer' | 'cambio' | 'ajuste';

export interface FinanceMove {
  id: string;
  type: MoveType;
  account: string;
  to: string | null;
  amount: number;
  amountTo: number | null;
  rate: number | null;
  date: string;
  note: string;
  userName: string;
  createdAt: string;
}
export interface AccountConfig {
  key: string;
  opening: number;
  since: string;
  setAt: string;
}

const rowToMove = (r: any): FinanceMove => ({
  id: r.id,
  type: r.type,
  account: r.account,
  to: r.to_account ?? null,
  amount: Number(r.amount) || 0,
  amountTo: r.amount_to == null ? null : Number(r.amount_to),
  rate: r.rate == null ? null : Number(r.rate),
  date: r.date,
  note: r.note ?? '',
  userName: r.user_name ?? '',
  createdAt: r.created_at,
});

export async function loadFinance(): Promise<{ configs: AccountConfig[]; moves: FinanceMove[] }> {
  const [a, m] = await Promise.all([
    supabase.from('finance_accounts').select('*'),
    supabase.from('finance_moves').select('*').order('created_at', { ascending: false }).limit(1000),
  ]);
  if (a.error) throw a.error;
  if (m.error) throw m.error;
  return {
    configs: (a.data ?? []).map((r: any) => ({ key: r.key, opening: Number(r.opening) || 0, since: r.since, setAt: r.set_at })),
    moves: (m.data ?? []).map(rowToMove),
  };
}

export async function adjustAccount(key: string, balance: number, since: string, note: string) {
  const { error } = await supabase.rpc('adjust_finance_account', { p_key: key, p_balance: balance, p_since: since, p_note: note });
  if (error) throw new Error(error.message);
}

export interface NewMove {
  type: Exclude<MoveType, 'ajuste'>;
  account: string;
  to?: string | null;
  amount: number;
  amountTo?: number | null;
  rate?: number | null;
  date: string;
  note: string;
}
const moveRow = (m: NewMove, userName?: string) => ({
  type: m.type,
  account: m.account,
  to_account: m.to ?? null,
  amount: m.amount,
  amount_to: m.amountTo ?? null,
  rate: m.rate ?? null,
  date: m.date,
  note: m.note,
  ...(userName !== undefined ? { user_name: userName } : {}),
});
export async function addMove(m: NewMove, userName: string) {
  const { error } = await supabase.from('finance_moves').insert(moveRow(m, userName));
  if (error) throw new Error(error.message);
}
export async function updateMove(id: string, m: NewMove) {
  const { error } = await supabase.from('finance_moves').update(moveRow(m)).eq('id', id);
  if (error) throw new Error(error.message);
}
export async function deleteMove(id: string) {
  const { error } = await supabase.from('finance_moves').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/* ---------- Cálculo de saldos ---------- */

// Método de pago de un pedido web → cuenta.
const ORDER_ACCOUNT: Record<string, string> = {
  zelle: 'zelle',
  binance: 'binance',
  pago_movil: 'pago_movil',
  transferencia: 'transferencia',
  pesos_colombianos: 'pesos_colombianos',
};
const PAID_ORDER = ['approved', 'in_progress', 'completed'];

export interface AccountBalance extends MoneyAccount {
  opening: number;
  since: string | null;
  setAt: string | null;
  sales: number;
  salesCount: number;
  orders: number;
  ordersCount: number;
  inflow: number;
  outflow: number;
  transfersIn: number;
  transfersOut: number;
  exchangesIn: number;
  exchangesOut: number;
  expenses: number;
  expensesCount: number;
  creditIn: number;
  creditCount: number;
  balance: number;
  usd: number;
}

// Pesos por dólar según el cambio con COP más reciente (si el otro lado fue en Bs, se pasa a $ con la tasa del día).
export function copRateFrom(moves: FinanceMove[], bsRate: number) {
  const cur = (k: string | null) => MONEY_ACCOUNTS.find((a) => a.key === k)?.currency;
  const last = moves
    .filter((m) => m.type === 'cambio' && (cur(m.account) === 'COP') !== (cur(m.to) === 'COP'))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (!last) return 0;
  const copIsTo = cur(last.to) === 'COP';
  const cop = (copIsTo ? last.amountTo : last.amount) ?? 0;
  const other = (copIsTo ? last.amount : last.amountTo) ?? 0;
  const otherCur = cur(copIsTo ? last.account : last.to);
  const usd = otherCur === 'BS' ? (bsRate ? other / bsRate : 0) : other;
  return usd ? cop / usd : 0;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function computeBalances(opts: { configs: AccountConfig[]; moves: FinanceMove[]; sales: Sale[]; orders: Order[]; expenses: Expense[]; rate: number }) {
  const { configs, moves, sales, orders, expenses, rate } = opts;
  const copRate = copRateFrom(moves, rate);
  const book: Record<string, AccountBalance> = {};
  for (const a of MONEY_ACCOUNTS) {
    const c = configs.find((x) => x.key === a.key);
    book[a.key] = {
      ...a, opening: c?.opening ?? 0, since: c?.since ?? null, setAt: c?.setAt ?? null,
      sales: 0, salesCount: 0, orders: 0, ordersCount: 0, inflow: 0, outflow: 0, transfersIn: 0, transfersOut: 0,
      exchangesIn: 0, exchangesOut: 0, expenses: 0, expensesCount: 0, creditIn: 0, creditCount: 0, balance: 0, usd: 0,
    };
  }
  // Monto en la moneda de la cuenta a partir de un valor en $.
  const fromUsd = (b: AccountBalance, usd: number, bs?: number) =>
    b.currency === 'BS' ? bs || usd * rate : b.currency === 'COP' ? usd * copRate : usd;

  // Ventas del POS cobradas (por día de la venta, posteriores al día del ajuste).
  let unassigned = 0;
  for (const s of sales) {
    // Abonos de créditos del personal: entran a la cuenta de su medio el día que se reciben.
    if (s.pay !== 'cancelado') {
      for (const p of s.payments ?? []) {
        if (p.method === 'nomina') continue; // el descuento de nómina no entra a ninguna cuenta
        const bp = book[p.method];
        if (!bp || (bp.since && p.date <= bp.since)) continue;
        bp.creditIn += bp.currency === 'BS' ? p.bs || p.amount * rate : bp.currency === 'COP' ? p.amount * copRate : p.amount;
        bp.creditCount++;
      }
    }
    if (s.doc === 'cotizacion' || s.pay !== 'pagado' || s.payMethod === 'credito') continue;
    const b = s.payMethod ? book[s.payMethod] : undefined;
    if (!b) { unassigned++; continue; }
    if (b.since && veDay(s.date) <= b.since) continue;
    b.sales += fromUsd(b, s.total, s.totalBs || (s.exchangeRate ? s.total * s.exchangeRate : 0));
    b.salesCount++;
  }
  // Pedidos web aprobados.
  for (const o of orders) {
    if (!PAID_ORDER.includes(o.status) || !o.paymentMethod) continue;
    const b = book[ORDER_ACCOUNT[o.paymentMethod] ?? ''];
    if (!b || (b.since && veDay(o.createdAt) <= b.since)) continue;
    b.orders += fromUsd(b, o.total);
    b.ordersCount++;
  }
  // Movimientos manuales y cambios: cuentan si se registraron después del último ajuste.
  const after = (b: AccountBalance | undefined, iso: string) => !!b && (!b.setAt || iso > b.setAt);
  for (const m of moves) {
    if (m.type === 'ajuste') continue;
    const from = book[m.account], to = m.to ? book[m.to] : undefined;
    if (m.type === 'in' && after(from, m.createdAt)) from.inflow += m.amount;
    if (m.type === 'out' && after(from, m.createdAt)) from.outflow += m.amount;
    if (m.type === 'transfer') {
      if (after(from, m.createdAt)) from.transfersOut += m.amount;
      if (after(to, m.createdAt)) to!.transfersIn += m.amountTo ?? m.amount;
    }
    if (m.type === 'cambio') {
      if (after(from, m.createdAt)) from.exchangesOut += m.amount;
      if (after(to, m.createdAt)) to!.exchangesIn += m.amountTo ?? 0;
    }
  }
  // Gastos pagados desde una cuenta.
  for (const e of expenses) {
    const b = book[e.account];
    if (!b || !after(b, e.createdAt)) continue;
    b.expenses += e.accountAmount ?? e.amount;
    b.expensesCount++;
  }

  const toUsd = (n: number, cur: string) => (cur === 'BS' ? (rate ? n / rate : 0) : cur === 'COP' ? (copRate ? n / copRate : 0) : n);
  const accounts = Object.values(book).map((b) => {
    const balance = b.opening + b.sales + b.orders + b.creditIn + b.inflow - b.outflow + b.transfersIn - b.transfersOut + b.exchangesIn - b.exchangesOut - b.expenses;
    return { ...b, balance: r2(balance), usd: r2(toUsd(balance, b.currency)) };
  });
  const sumCur = (c: string) => accounts.filter((a) => a.currency === c).reduce((s, a) => s + a.balance, 0);
  const bs = sumCur('BS'), usd = sumCur('USD'), cop = sumCur('COP');
  return {
    rate,
    copRate: r2(copRate),
    accounts,
    unassigned,
    totals: { bs: r2(bs), bsUsd: r2(toUsd(bs, 'BS')), usd: r2(usd), cop: r2(cop), copUsd: r2(toUsd(cop, 'COP')), total: r2(usd + toUsd(bs, 'BS') + toUsd(cop, 'COP')) },
  };
}

export const moneyIn = (n: number, cur: string) =>
  cur === 'BS'
    ? 'Bs ' + Number(n || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : cur === 'COP'
      ? 'COP ' + Number(n || 0).toLocaleString('es-VE', { maximumFractionDigits: 0 })
      : '$' + Number(n || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
