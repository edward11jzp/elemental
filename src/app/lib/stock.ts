// Existencias por sede, talla y color. products.stock queda como el total.
import { supabase } from './supabase';

export interface StockRow { productId: string; locationId: string; size: string; color: string; qty: number }

export async function loadStock(): Promise<StockRow[]> {
  const { data, error } = await supabase.from('product_stock').select('product_id,location_id,size,color,qty');
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({
    productId: r.product_id, locationId: r.location_id,
    size: r.size ?? '', color: r.color ?? '', qty: r.qty ?? 0,
  }));
}

export type StockIndex = Map<string, StockRow[]>;

/** Agrupa por producto, para consultar rápido. */
export function stockIndex(rows: StockRow[]): StockIndex {
  const m: StockIndex = new Map();
  for (const r of rows) {
    const list = m.get(r.productId);
    if (list) list.push(r); else m.set(r.productId, [r]);
  }
  return m;
}

/** Cantidad de un producto. Sin sede, talla o color, suma todo lo que encaje. */
export function qtyAt(idx: StockIndex, product: string, sede = '', size = '', color = '') {
  const rows = idx.get(product) ?? [];
  return rows.reduce(
    (a, r) => a + (((!sede || r.locationId === sede) && (!size || r.size === size) && (!color || r.color === color)) ? r.qty : 0),
    0,
  );
}

/** Filas de un producto en una sede, para la tabla de tallas y colores. */
export const variantsOf = (idx: StockIndex, product: string, sede = '') =>
  (idx.get(product) ?? []).filter((r) => (!sede || r.locationId === sede) && r.qty !== 0);

export async function registerMovement(
  productId: string, type: 'in' | 'out', qty: number, reason: string, locationId: string, size = '', color = '',
) {
  const { data, error } = await supabase.rpc('register_movement', {
    p_product: productId, p_type: type, p_qty: qty, p_reason: reason, p_loc: locationId, p_size: size, p_color: color,
  });
  if (error) throw new Error(error.message);
  return data as number;
}

export async function transferStock(
  productId: string, from: string, to: string, qty: number, reason: string, size = '', color = '',
) {
  const { error } = await supabase.rpc('transfer_stock', {
    p_product: productId, p_from: from, p_to: to, p_qty: qty, p_reason: reason, p_size: size, p_color: color,
  });
  if (error) throw new Error(error.message);
}

/** Carga en bloque de existencias por talla y color. */
export async function setStockRows(rows: { productId: string; locationId: string; size: string; color: string; qty: number }[]) {
  const { data, error } = await supabase.rpc('set_stock_rows', { p: rows });
  if (error) throw new Error(error.message);
  return data as number;
}

/** Carga el inventario actual en una sede. Sólo la primera vez. */
export async function seedStockInto(locationId: string) {
  const { data, error } = await supabase.rpc('seed_stock_into', { p_loc: locationId });
  if (error) throw new Error(error.message);
  return data as number;
}
