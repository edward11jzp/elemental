// Alertas de inventario. Sólo miran el catálogo de facturación, que es lo que
// físicamente hay en las tiendas; la vitrina de la web lleva su propio total y
// no tiene existencias por sede, así que no se alerta sobre ella.
//
// Cada producto tiene un mínimo POR SEDE (el campo «Stock mínimo» de su
// ficha). Si no se ha puesto, se usa MINIMO_POR_DEFECTO.
import type { Product } from '../types';
import type { Sede } from './sedes';
import type { StockIndex } from './stock';

export const MINIMO_POR_DEFECTO = 10;

// 'sin' = esa tienda nunca ha tenido el producto: no se alerta.
export type Estado = 'web' | 'sin' | 'agotado' | 'bajo' | 'ok';

export const minimoDe = (p: Product) => (p.minStock && p.minStock > 0 ? p.minStock : MINIMO_POR_DEFECTO);

export const esFacturacion = (p: Product) => p.web === false;

/**
 * Sedes donde el producto está por debajo de su mínimo.
 * Sólo cuentan las sedes que alguna vez lo tuvieron: si una tienda nunca
 * vende gorras, no tiene sentido avisar que no le quedan.
 */
export function sedesBajas(p: Product, idx: StockIndex, sedes: Sede[]) {
  if (!esFacturacion(p)) return [];
  const filas = idx.get(p.id) ?? [];
  const min = minimoDe(p);
  return sedes
    .filter((s) => filas.some((r) => r.locationId === s.id))
    .map((s) => ({
      sede: s,
      qty: filas.filter((r) => r.locationId === s.id).reduce((a, r) => a + r.qty, 0),
    }))
    .filter((x) => x.qty < min);
}

/** Estado del producto en la sede elegida; sin sede, mira todas a la vez. */
export function estadoDe(p: Product, idx: StockIndex, sede: string, sedes: Sede[]): Estado {
  if (!esFacturacion(p)) return 'web';
  const filas = idx.get(p.id) ?? [];
  if (sede) {
    const aqui = filas.filter((r) => r.locationId === sede);
    if (!aqui.length) return 'sin';
    const qty = aqui.reduce((a, r) => a + r.qty, 0);
    if (qty <= 0) return 'agotado';
    return qty < minimoDe(p) ? 'bajo' : 'ok';
  }
  const total = filas.reduce((a, r) => a + r.qty, 0);
  if (total <= 0) return 'agotado';
  return sedesBajas(p, idx, sedes).length ? 'bajo' : 'ok';
}
