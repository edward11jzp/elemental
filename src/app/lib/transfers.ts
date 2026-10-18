// Pedidos de traslado entre tiendas: una pide, la que tiene envía, la que
// pidió confirma que llegó. Mientras viaja no está en ninguna de las dos.
import { supabase } from './supabase';

export type EstadoTraslado =
  | 'pedido' | 'aprobado' | 'enviado' | 'recibido' | 'con_diferencia' | 'revisado' | 'rechazado' | 'cancelado';

export interface Traslado {
  id: number;
  productId: string;
  productName: string;
  size: string;
  color: string;
  qty: number;
  from: string;
  to: string;
  status: EstadoTraslado;
  kind: 'pedido' | 'envio';
  qtyReceived: number | null;
  approvedBy: string;
  reviewedBy: string;
  reviewNote: string;
  note: string;
  askedBy: string;
  sentBy: string;
  gotBy: string;
  createdAt: string;
}

const row = (r: any): Traslado => ({
  id: r.id,
  productId: r.product_id,
  productName: r.product_name ?? '',
  size: r.size ?? '',
  color: r.color ?? '',
  qty: r.qty ?? 0,
  from: r.from_location,
  to: r.to_location,
  status: r.status,
  kind: r.kind ?? 'pedido',
  qtyReceived: r.qty_received ?? null,
  approvedBy: r.approved_by ?? '',
  reviewedBy: r.reviewed_by ?? '',
  reviewNote: r.review_note ?? '',
  note: r.note ?? '',
  askedBy: r.asked_by ?? '',
  sentBy: r.sent_by ?? '',
  gotBy: r.got_by ?? '',
  createdAt: r.created_at,
});

export async function listTraslados(): Promise<Traslado[]> {
  const { data, error } = await supabase
    .from('transfer_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(300);
  if (error) throw new Error(error.message);
  return (data ?? []).map(row);
}

export async function pedirTraslado(productId: string, from: string, qty: number, size = '', color = '', note = '', to: string | null = null) {
  const { data, error } = await supabase.rpc('request_transfer', {
    p_product: productId, p_from: from, p_qty: qty, p_size: size, p_color: color, p_note: note, p_to: to,
  });
  if (error) throw new Error(error.message);
  return data as number;
}

export async function enviarTraslado(id: number) {
  const { error } = await supabase.rpc('send_transfer', { p_id: id });
  if (error) throw new Error(error.message);
}

/** Confirma la llegada con las piezas que de verdad llegaron. */
export async function recibirTraslado(id: number, qty: number) {
  const { error } = await supabase.rpc('receive_transfer', { p_id: id, p_qty: qty });
  if (error) throw new Error(error.message);
}

/** La gerente aprueba un pedido para que la otra tienda pueda enviarlo. */
export async function aprobarTraslado(id: number) {
  const { error } = await supabase.rpc('approve_transfer', { p_id: id });
  if (error) throw new Error(error.message);
}

/** Envío sin pedido previo: sale ya de mi tienda hacia la otra. */
export async function enviarDirecto(productId: string, to: string, qty: number, size = '', color = '', note = '', from: string | null = null) {
  const { error } = await supabase.rpc('push_transfer', {
    p_product: productId, p_to: to, p_qty: qty, p_size: size, p_color: color, p_note: note, p_from: from,
  });
  if (error) throw new Error(error.message);
}

/** La gerente cierra un faltante: lo da por perdido o lo devuelve al origen. */
export async function revisarTraslado(id: number, devolver: boolean, note = '') {
  const { error } = await supabase.rpc('review_transfer', { p_id: id, p_devolver: devolver, p_note: note });
  if (error) throw new Error(error.message);
}

export async function cerrarTraslado(id: number, estado: 'rechazado' | 'cancelado') {
  const { error } = await supabase.rpc('close_transfer', { p_id: id, p_estado: estado });
  if (error) throw new Error(error.message);
}
