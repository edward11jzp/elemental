import { supabase } from './supabase';

export type SupplierStatus = 'Activo' | 'Pendiente' | 'Inactivo';
export interface Supplier {
  id: string;
  name: string;
  category: string;
  contact: string;
  phone: string;
  email: string;
  notes: string;
  status: SupplierStatus;
}
export type SupplierInput = Omit<Supplier, 'id'>;

export async function listSuppliers(): Promise<Supplier[]> {
  const { data, error } = await supabase.from('suppliers').select('*').order('name');
  if (error) throw error;
  return (data ?? []) as Supplier[];
}
export async function saveSupplier(s: SupplierInput, id?: string) {
  const q = id ? supabase.from('suppliers').update(s).eq('id', id) : supabase.from('suppliers').insert(s);
  const { error } = await q;
  if (error) throw new Error(error.message);
}
export async function deleteSupplier(id: string) {
  const { error } = await supabase.from('suppliers').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
