import imageCompression from 'browser-image-compression';
import { supabase } from './supabase';

const BUCKET = 'product-images';

// Comprime y sube una imagen al bucket público de productos.
// Devuelve la URL pública. Reduce ~5MB → ~400KB sin pérdida visible.
export async function uploadProductImage(file: File): Promise<string> {
  // Comprimir antes de subir
  let compressed: File;
  try {
    compressed = await imageCompression(file, {
      maxSizeMB: 0.5,           // objetivo ~500KB
      maxWidthOrHeight: 1600,   // suficiente para retina/zoom
      useWebWorker: true,
      fileType: 'image/jpeg',   // jpg pesa menos que png
      initialQuality: 0.85,
    });
  } catch {
    // Si la compresión falla (formato raro, etc), sube el original
    compressed = file;
  }

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`;
  const path = `products/${filename}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, compressed, {
      cacheControl: '31536000',
      upsert: false,
      contentType: compressed.type || 'image/jpeg',
    });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// Borra una imagen del bucket usando su URL pública.
export async function deleteProductImage(url: string): Promise<void> {
  const marker = `/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return;
  const path = url.slice(idx + marker.length);
  await supabase.storage.from(BUCKET).remove([path]);
}
