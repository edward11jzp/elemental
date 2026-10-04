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
    emoji:              row.emoji ?? '',
    web:                row.web !== false,
    minStock:           row.min_stock ?? 50,
    location:           row.location ?? '',
    supplier:           row.supplier ?? '',
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
  if (p.emoji !== undefined)              row.emoji                = p.emoji;
  if (p.web !== undefined)                row.web                  = p.web;
  if (p.minStock !== undefined)           row.min_stock            = p.minStock;
  if (p.location !== undefined)           row.location             = p.location;
  if (p.supplier !== undefined)           row.supplier             = p.supplier;
  if (p.allowCustom !== undefined)        row.allow_custom         = p.allowCustom;
  if (p.customPricing !== undefined)      row.custom_pricing       = p.customPricing;
  if (p.featured !== undefined)           row.featured             = p.featured;
  if (p.trending !== undefined)           row.trending             = p.trending;
  if (p.customizationImages !== undefined) row.customization_images = p.customizationImages;
  return row;
}

// Todas las columnas MENOS customization_images: algunas filas guardan esas
// vistas en base64 (varios MB cada una) y bajarlas en la lista hacía que la
// tienda y el inventario cargaran ~18 MB. Se piden aparte con getCustomizationImages().
const LIST_COLUMNS =
  'id,name,category,subcategory,description,retail_price,wholesale_price,image,images,sizes,colors,' +
  'color_palette,emoji,web,stock,min_stock,location,supplier,allow_custom,custom_pricing,featured,trending,created_at,updated_at';

export async function getCustomizationImages(id: string): Promise<Product['customizationImages']> {
  const { data, error } = await supabase.from('products').select('customization_images').eq('id', id).single();
  if (error) throw error;
  return data?.customization_images ?? undefined;
}

export async function listProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select(LIST_COLUMNS)
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
