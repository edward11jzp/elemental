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

// Sube una imagen conservando la transparencia (mockups de personalización).
// Redimensiona a 1600px y la guarda en WebP (o PNG si el navegador no codifica WebP).
export async function uploadImageKeepAlpha(source: Blob): Promise<string> {
  const bmp = await createImageBitmap(source);
  const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  const blob: Blob = await new Promise((ok, fail) =>
    c.toBlob((b) => (b ? ok(b) : fail(new Error('No se pudo procesar la imagen'))), 'image/webp', 0.9),
  );
  const ext = blob.type === 'image/webp' ? 'webp' : 'png';
  const path = `products/custom-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { cacheControl: '31536000', upsert: false, contentType: blob.type });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
