// Data access for orders.
//
// - Customer Checkout: anonymous insert (RLS allows it)
// - Customer TrackOrder: rpc('get_order_by_id', {order_id}) to bypass staff-only read
// - Staff (admin/employee): full select + update via Supabase Auth session

import type { Order, OrderStatus } from '../types';
import { supabase } from './supabase';

// Map DB row -> Order type
function rowToOrder(row: any): Order {
  return {
    id:               row.id,
    customerId:       'guest',
    customerName:     row.customer_name,
    customerEmail:    row.customer_email ?? undefined,
    customerPhone:    row.customer_phone ?? undefined,
    customerAddress:  row.customer_address ?? undefined,
    customerCity:     row.customer_city ?? undefined,
    customerState:    row.customer_state ?? undefined,
    items:            row.items ?? [],
    total:            Number(row.total),
    status:           row.status,
    notes:            row.notes ?? undefined,
    paymentMethod:    row.payment_method ?? undefined,
    paymentProof:     row.payment_proof ?? undefined,
    fulfillmentType:  row.fulfillment_type ?? undefined,
    pickupLocationId: row.pickup_location_id ?? undefined,
    pickupLocationName: row.pickup_location_name ?? undefined,
    createdAt:        row.created_at,
    updatedAt:        row.updated_at,
  } as Order;
}

function orderToRow(o: Order) {
  return {
    id:                   o.id,
    customer_name:        o.customerName,
    customer_email:       o.customerEmail ?? null,
    customer_phone:       o.customerPhone ?? null,
    customer_address:     (o as any).customerAddress ?? null,
    customer_city:        (o as any).customerCity ?? null,
    customer_state:       (o as any).customerState ?? null,
    items:                o.items,
    total:                o.total,
    status:               o.status,
    notes:                o.notes ?? null,
    payment_method:       o.paymentMethod ?? null,
    payment_proof:        o.paymentProof ?? null,
    fulfillment_type:     (o as any).fulfillmentType ?? null,
    pickup_location_id:   (o as any).pickupLocationId ?? null,
    pickup_location_name: (o as any).pickupLocationName ?? null,
  };
}

// Customer: place a new order (no auth required)
export async function createOrder(order: Order): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .insert(orderToRow(order))
    .select()
    .single();
  if (error) throw error;
  return rowToOrder(data);
}

// Staff: list all orders, newest first
export async function listOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToOrder);
}

// Staff: change order status
export async function updateStatus(orderId: string, status: OrderStatus): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orderId);
  if (error) throw error;
}

// Customer: get one order by tracking number (works without auth via SECURITY DEFINER rpc)
export async function getOrderById(orderId: string): Promise<Order | null> {
  const { data, error } = await supabase.rpc('get_order_by_id', { order_id: orderId });
  if (error) throw error;
  if (!data || data.length === 0) return null;
  return rowToOrder(data[0]);
}
