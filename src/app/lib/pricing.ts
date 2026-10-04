import type { Product } from '../types';

// Recargos por talla (USD por unidad).
// Se suman al precio base (retail o wholesale) de cada artículo.
export const SIZE_UPCHARGES: Record<string, number> = {
  '2XL': 1,
  '3XL': 2,
  '4XL': 3,
};

// Umbral de unidades a partir del cual aplica el precio al por mayor.
export const WHOLESALE_THRESHOLD = 6;

// Recargo por color (USD por unidad): los camuflajeados cuestan más.
export const COLOR_UPCHARGE = 1;

// Devuelve el recargo por unidad de un color. 0 si no lleva.
export function getColorUpcharge(color: string | undefined | null): number {
  return (color ?? '').trim().toUpperCase().startsWith('CAMU') ? COLOR_UPCHARGE : 0;
}

// Devuelve el recargo por unidad para una talla dada.
// 0 si la talla no tiene recargo o es undefined.
export function getSizeUpcharge(size: string | undefined | null): number {
  if (!size) return 0;
  return SIZE_UPCHARGES[size] ?? 0;
}

// Precio retail real del producto (sin recargo de talla).
// Fallback al campo legado `price` si no hay retailPrice.
export function getRetailUnitPrice(product: Product): number {
  if (typeof product.retailPrice === 'number') return product.retailPrice;
  return product.price ?? 9;
}

// Precio wholesale real del producto (sin recargo de talla).
// Si el producto no tiene wholesalePrice configurado, cae a retail.
export function getWholesaleUnitPrice(product: Product): number {
  if (typeof product.wholesalePrice === 'number') return product.wholesalePrice;
  if (typeof product.retailPrice === 'number') return product.retailPrice;
  return product.price ?? 9;
}

// Precio base (retail o wholesale) según la cantidad total del carrito.
export function getBaseUnitPrice(product: Product, totalCartQuantity: number): number {
  return totalCartQuantity >= WHOLESALE_THRESHOLD
    ? getWholesaleUnitPrice(product)
    : getRetailUnitPrice(product);
}

// Precio unitario final: base (retail/wholesale) + recargo de talla.
// No incluye personalización (esa se calcula en ProductDetail).
export function getUnitPrice(
  product: Product,
  size: string | undefined | null,
  totalCartQuantity: number,
  color?: string | null,
): number {
  return getBaseUnitPrice(product, totalCartQuantity) + getSizeUpcharge(size) + getColorUpcharge(color);
}
