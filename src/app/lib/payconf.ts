// Confirmación de pagos: cobros que llegaron a las cuentas (hoy Binance Pay)
// emparejados con las ventas del POS y los pedidos web por monto y día.
import { supabase } from './supabase';
import { veDay, type Sale } from './sales';
import type { Order } from '../types';

export interface IncomingPayment {
  ref: string;
  time: number;
  amount: number;
  currency: string;
  from: string;
  note: string;
}
export interface PayLink {
  provider: string;
  ref: string;
  status: 'store' | 'ignored';
  saleId: string | null;
  userName: string;
}
export interface Candidate {
  id: string; // venta (NE-…) o pedido web (order-…)
  kind: 'sale' | 'order';
  total: number;
  date: string;
  customer: string;
  method: string;
}

export async function fetchProviderPayments(provider: string, days: number): Promise<{ connected: boolean; payments: IncomingPayment[]; checkedAt?: number }> {
  const { data } = await supabase.auth.getSession();
  const r = await fetch(`/api/${provider}-payments?days=${days}`, { headers: { Authorization: `Bearer ${data.session?.access_token ?? ''}` } });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.error || 'No se pudo consultar los cobros');
  return body;
}

export async function loadLinks(provider: string): Promise<PayLink[]> {
  const { data, error } = await supabase.from('payment_links').select('*').eq('provider', provider);
  if (error) throw error;
  return (data ?? []).map((r: any) => ({ provider: r.provider, ref: r.ref, status: r.status, saleId: r.sale_id, userName: r.user_name ?? '' }));
}
export async function markPayment(provider: string, ref: string, status: 'store' | 'ignored' | 'clear', saleId: string | null, userName: string) {
  const q =
    status === 'clear'
      ? supabase.from('payment_links').delete().eq('provider', provider).eq('ref', ref)
      : supabase.from('payment_links').upsert({ provider, ref, status, sale_id: saleId, user_name: userName, at: new Date().toISOString() });
  const { error } = await q;
  if (error) throw new Error(error.message);
}

export function candidatesFrom(sales: Sale[], orders: Order[]): Candidate[] {
  return [
    ...sales
      .filter((s) => s.doc !== 'cotizacion' && s.pay !== 'cancelado')
      .map((s) => ({ id: s.id, kind: 'sale' as const, total: s.total, date: s.date, customer: s.customer || 'Consumidor final', method: s.payMethod ?? '' })),
    ...orders
      .filter((o) => o.status !== 'rejected')
      .map((o) => ({ id: o.id, kind: 'order' as const, total: o.total, date: o.createdAt, customer: o.customerName, method: o.paymentMethod ?? '' })),
  ];
}

const dayDiff = (a: string, b: string) => Math.abs((new Date(a + 'T12:00:00Z').getTime() - new Date(b + 'T12:00:00Z').getTime()) / 864e5);

export interface MatchedPayment extends IncomingPayment {
  sale: Candidate | null;
  manual: boolean;
  ignored: boolean;
  markedBy: string;
  suggest: Candidate[];
}

/** Empareja cobros con ventas/pedidos de ese medio: mismo monto (±0,01) y el mismo día o el siguiente. */
export function matchPayments(payments: IncomingPayment[], cands: Candidate[], links: PayLink[], method: string) {
  const linkOf = new Map(links.map((l) => [l.ref, l]));
  const manualIds = new Set(links.filter((l) => l.status === 'store' && l.saleId).map((l) => l.saleId!));
  const mine = cands.filter((c) => c.method === method && !manualIds.has(c.id));
  const used = new Set<string>(manualIds);
  const out: MatchedPayment[] = [];
  // Del más viejo al más nuevo, para que cada cobro tome la venta más cercana disponible.
  for (const p of [...payments].sort((a, b) => a.time - b.time)) {
    const l = linkOf.get(p.ref);
    const day = veDay(new Date(p.time));
    if (l?.status === 'ignored') { out.push({ ...p, sale: null, manual: true, ignored: true, markedBy: l.userName, suggest: [] }); continue; }
    if (l?.status === 'store') {
      out.push({ ...p, sale: cands.find((c) => c.id === l.saleId) ?? (l.saleId ? { id: l.saleId, kind: 'sale', total: 0, date: '', customer: '', method: '' } : null), manual: true, ignored: false, markedBy: l.userName, suggest: [] });
      continue;
    }
    const hit = mine
      .filter((c) => !used.has(c.id) && Math.abs(c.total - p.amount) < 0.01 && dayDiff(veDay(c.date), day) <= 1)
      .sort((a, b) => Math.abs(new Date(a.date).getTime() - p.time) - Math.abs(new Date(b.date).getTime() - p.time))[0];
    if (hit) used.add(hit.id);
    out.push({ ...p, sale: hit ?? null, manual: false, ignored: false, markedBy: '', suggest: [] });
  }
  // Sugerencias: ventas/pedidos del mismo monto (cualquier medio) que no estén tomados.
  for (const m of out) {
    if (m.sale || m.ignored) continue;
    const day = veDay(new Date(m.time));
    m.suggest = cands.filter((c) => !used.has(c.id) && Math.abs(c.total - m.amount) < 0.01 && dayDiff(veDay(c.date), day) <= 1).slice(0, 4);
  }
  return { items: out.sort((a, b) => b.time - a.time), used };
}
