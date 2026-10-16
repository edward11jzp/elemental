// Pedidos de traslado entre tiendas: una pide, la que tiene envía, la que
// pidió confirma que llegó. Mientras viaja no está en ninguna de las dos.
import { supabase } from './supabase';

export type EstadoTraslado = 'pedido' | 'enviado' | 'recibido' | 'rechazado' | 'cancelado';

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

export async function pedirTraslado(productId: string, from: string, qty: number, size = '', color = '', note = '') {
  const { data, error } = await supabase.rpc('request_transfer', {
    p_product: productId, p_from: from, p_qty: qty, p_size: size, p_color: color, p_note: note,
  });
  if (error) throw new Error(error.message);
  return data as number;
}

export async function enviarTraslado(id: number) {
  const { error } = await supabase.rpc('send_transfer', { p_id: id });
  if (error) throw new Error(error.message);
}

export async function recibirTraslado(id: number) {
  const { error } = await supabase.rpc('receive_transfer', { p_id: id });
  if (error) throw new Error(error.message);
}

export async function cerrarTraslado(id: number, estado: 'rechazado' | 'cancelado') {
  const { error } = await supabase.rpc('close_transfer', { p_id: id, p_estado: estado });
  if (error) throw new Error(error.message);
}
