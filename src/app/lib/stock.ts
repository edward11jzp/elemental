// Existencias por sede. products.stock queda como el total de todas.
import { supabase } from './supabase';

export interface StockRow { productId: string; locationId: string; qty: number; minStock: number }

export async function loadStock(): Promise<StockRow[]> {
  const { data, error } = await supabase.from('product_stock').select('product_id,location_id,qty,min_stock');
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({ productId: r.product_id, locationId: r.location_id, qty: r.qty ?? 0, minStock: r.min_stock ?? 0 }));
}

/** Mapa producto → sede → cantidad. */
export function stockIndex(rows: StockRow[]) {
  const m = new Map<string, Map<string, number>>();
  for (const r of rows) {
    if (!m.has(r.productId)) m.set(r.productId, new Map());
    m.get(r.productId)!.set(r.locationId, r.qty);
  }
  return m;
}

export const qtyAt = (idx: ReturnType<typeof stockIndex>, product: string, sede: string) =>
  sede ? idx.get(product)?.get(sede) ?? 0 : [...(idx.get(product)?.values() ?? [])].reduce((a, b) => a + b, 0);

export async function registerMovement(productId: string, type: 'in' | 'out', qty: number, reason: string, locationId: string) {
  const { data, error } = await supabase.rpc('register_movement', { p_product: productId, p_type: type, p_qty: qty, p_reason: reason, p_loc: locationId });
  if (error) throw new Error(error.message);
  return data as number;
}

export async function transferStock(productId: string, from: string, to: string, qty: number, reason: string) {
  const { error } = await supabase.rpc('transfer_stock', { p_product: productId, p_from: from, p_to: to, p_qty: qty, p_reason: reason });
  if (error) throw new Error(error.message);
}

/** Carga el inventario actual en una sede. Sólo la primera vez. */
export async function seedStockInto(locationId: string) {
  const { data, error } = await supabase.rpc('seed_stock_into', { p_loc: locationId });
  if (error) throw new Error(error.message);
  return data as number;
}
