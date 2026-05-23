import { supabase } from './supabase';
import type { Product } from '../types';

function rowToProduct(row: any): Product {
  return {
    id:                 row.id,
    name:               row.name,
    category:           row.category,
    subcategory:        row.subcategory,
    price:              Number(row.retail_price),
    retailPrice:        Number(row.retail_price),
    wholesalePrice:     Number(row.wholesale_price),
    image:              row.image ?? '',
    images:             row.images ?? [],
    description:        row.description ?? '',
    sizes:              row.sizes ?? [],
    colors:             row.colors ?? [],
    colorPalette:       row.color_palette ?? [],
    stock:              row.stock ?? 0,
    allowCustom:        row.allow_custom ?? false,
    customPricing:      row.custom_pricing ?? undefined,
    featured:           row.featured ?? false,
    trending:           row.trending ?? false,
    customizationImages: row.customization_images ?? undefined,
  };
}

function productToRow(p: Partial<Product> & { name: string }) {
  const row: Record<string, any> = {};
  if (p.name !== undefined)               row.name                 = p.name;
  if (p.category !== undefined)           row.category             = p.category;
  if (p.subcategory !== undefined)        row.subcategory          = p.subcategory;
  if (p.retailPrice !== undefined)        row.retail_price         = p.retailPrice;
  if (p.wholesalePrice !== undefined)     row.wholesale_price      = p.wholesalePrice;
  if (p.price !== undefined && p.retailPrice === undefined) row.retail_price = p.price;
  if (p.image !== undefined)              row.image                = p.image;
  if (p.images !== undefined)             row.images               = p.images;
  if (p.description !== undefined)        row.description          = p.description;
  if (p.sizes !== undefined)              row.sizes                = p.sizes;
  if (p.colors !== undefined)             row.colors               = p.colors;
  if (p.colorPalette !== undefined)       row.color_palette        = p.colorPalette;
  if (p.stock !== undefined)              row.stock                = p.stock;
  if (p.allowCustom !== undefined)        row.allow_custom         = p.allowCustom;
  if (p.customPricing !== undefined)      row.custom_pricing       = p.customPricing;
  if (p.featured !== undefined)           row.featured             = p.featured;
  if (p.trending !== undefined)           row.trending             = p.trending;
  if (p.customizationImages !== undefined) row.customization_images = p.customizationImages;
  return row;
}

export async function listProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToProduct);
}

export async function createProduct(product: Omit<Product, 'id'>): Promise<Product> {
  const row = productToRow(product as any);
  const { data, error } = await supabase
    .from('products')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return rowToProduct(data);
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<void> {
  const row = productToRow(updates as any);
  const { error } = await supabase
    .from('products')
    .update(row)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
}
