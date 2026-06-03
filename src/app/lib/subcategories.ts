import { supabase } from './supabase';

export interface Subcategory {
  value: string;
  label: string;
  is_default: boolean;
}

export async function listSubcategories(): Promise<Subcategory[]> {
  const { data, error } = await supabase
    .from('subcategories')
    .select('*')
    .order('is_default', { ascending: false })
    .order('label');
  if (error) throw error;
  return data ?? [];
}

export async function createSubcategory(value: string, label: string): Promise<void> {
  const { error } = await supabase
    .from('subcategories')
    .insert({ value, label, is_default: false });
  if (error) throw error;
}

export async function deleteSubcategory(value: string): Promise<void> {
  const { error } = await supabase
    .from('subcategories')
    .delete()
    .eq('value', value)
    .eq('is_default', false);
  if (error) throw error;
}
