import { supabase } from './supabase';

export type PayFreq = 'semanal' | 'quincenal' | 'mensual';
export interface Staff {
  id: string;
  name: string;
  position: string;
  cedula: string;
  phone: string;
  email: string;
  hireDate: string | null;
  salary: number;
  payFreq: PayFreq;
  customerId: string | null;
  userId: string | null;
  notes: string;
  active: boolean;
}
export type StaffInput = Omit<Staff, 'id'>;

const fromRow = (r: any): Staff => ({
  id: r.id, name: r.name, position: r.position ?? '', cedula: r.cedula ?? '', phone: r.phone ?? '', email: r.email ?? '',
  hireDate: r.hire_date ?? null, salary: Number(r.salary) || 0, payFreq: r.pay_freq ?? 'quincenal',
  customerId: r.customer_id ?? null, userId: r.user_id ?? null, notes: r.notes ?? '', active: r.active !== false,
});
const toRow = (s: StaffInput) => ({
  name: s.name, position: s.position, cedula: s.cedula, phone: s.phone, email: s.email, hire_date: s.hireDate || null,
  salary: s.salary, pay_freq: s.payFreq, customer_id: s.customerId || null, user_id: s.userId || null, notes: s.notes, active: s.active,
});

export async function listStaff(): Promise<Staff[]> {
  const { data, error } = await supabase.from('staff').select('*').order('active', { ascending: false }).order('name');
  if (error) throw error;
  return (data ?? []).map(fromRow);
}
export async function saveStaff(s: StaffInput, id?: string) {
  const q = id ? supabase.from('staff').update(toRow(s)).eq('id', id) : supabase.from('staff').insert(toRow(s));
  const { error } = await q;
  if (error) throw new Error(error.message);
}

export const FREQ_LABEL: Record<PayFreq, string> = { semanal: 'semanal', quincenal: 'quincenal', mensual: 'mensual' };
export const FREQ_MONTH: Record<PayFreq, number> = { semanal: 52 / 12, quincenal: 2, mensual: 1 };

export function seniority(iso: string | null) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number), n = new Date();
  const months = (n.getFullYear() - y) * 12 + (n.getMonth() + 1 - m) - (n.getDate() < d ? 1 : 0);
  if (months < 1) {
    const days = Math.max(0, Math.floor((n.getTime() - new Date(y, m - 1, d).getTime()) / 864e5));
    return days + ' día' + (days === 1 ? '' : 's');
  }
  const yy = Math.floor(months / 12), mm = months % 12;
  return [yy ? yy + ' año' + (yy > 1 ? 's' : '') : '', mm ? mm + ' mes' + (mm > 1 ? 'es' : '') : ''].filter(Boolean).join(' y ');
}
