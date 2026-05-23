// Locations, social media, payment info, and site settings — all admin-managed
// content that is public to read but admin-only to write.

import { supabase } from './supabase';
import type { Location, SocialMedia, SocialMediaPlatform, PaymentInfo, PaymentMethod, SiteSettings } from '../types';

// ─── Locations ────────────────────────────────────────────────────────────────

function rowToLocation(row: any): Location {
  return {
    id:             row.id,
    name:           row.name,
    shoppingCenter: row.shopping_center,
    address:        row.address ?? undefined,
    phone:          row.phone,
    hours:          row.hours ?? undefined,
    image:          row.image ?? undefined,
  };
}

export async function listLocations(): Promise<Location[]> {
  const { data, error } = await supabase.from('locations').select('*').order('created_at');
  if (error) throw error;
  return (data ?? []).map(rowToLocation);
}

export async function createLocation(loc: Omit<Location, 'id'>): Promise<void> {
  const { error } = await supabase.from('locations').insert({
    name:            loc.name,
    shopping_center: loc.shoppingCenter,
    address:         loc.address ?? null,
    phone:           loc.phone,
    hours:           loc.hours ?? null,
    image:           loc.image ?? null,
  });
  if (error) throw error;
}

export async function updateLocation(id: string, updates: Partial<Location>): Promise<void> {
  const row: Record<string, any> = {};
  if (updates.name !== undefined)           row.name            = updates.name;
  if (updates.shoppingCenter !== undefined) row.shopping_center = updates.shoppingCenter;
  if (updates.address !== undefined)        row.address         = updates.address;
  if (updates.phone !== undefined)          row.phone           = updates.phone;
  if (updates.hours !== undefined)          row.hours           = updates.hours;
  if (updates.image !== undefined)          row.image           = updates.image;
  const { error } = await supabase.from('locations').update(row).eq('id', id);
  if (error) throw error;
}

export async function deleteLocation(id: string): Promise<void> {
  const { error } = await supabase.from('locations').delete().eq('id', id);
  if (error) throw error;
}

// ─── Social Media ─────────────────────────────────────────────────────────────

function rowToSocial(row: any): SocialMedia {
  return {
    id:       row.id,
    platform: row.platform as SocialMediaPlatform,
    username: row.username,
    url:      row.url,
    active:   row.active,
  };
}

export async function listSocialMedia(): Promise<SocialMedia[]> {
  const { data, error } = await supabase.from('social_media').select('*').order('platform');
  if (error) throw error;
  return (data ?? []).map(rowToSocial);
}

export async function createSocialMedia(s: Omit<SocialMedia, 'id'>): Promise<void> {
  const { error } = await supabase.from('social_media').insert({
    platform: s.platform,
    username: s.username,
    url:      s.url,
    active:   s.active,
  });
  if (error) throw error;
}

export async function updateSocialMedia(id: string, updates: Partial<SocialMedia>): Promise<void> {
  const row: Record<string, any> = {};
  if (updates.platform !== undefined) row.platform = updates.platform;
  if (updates.username !== undefined) row.username = updates.username;
  if (updates.url !== undefined)      row.url      = updates.url;
  if (updates.active !== undefined)   row.active   = updates.active;
  const { error } = await supabase.from('social_media').update(row).eq('id', id);
  if (error) throw error;
}

export async function deleteSocialMedia(id: string): Promise<void> {
  const { error } = await supabase.from('social_media').delete().eq('id', id);
  if (error) throw error;
}

// ─── Payment Info ─────────────────────────────────────────────────────────────

// All method-specific fields are stored in the `details` JSONB column.
const DETAIL_FIELDS = [
  'zelleEmail','zellePhone','binanceEmail','binanceId','binanceWallet',
  'pagoMovilBank','pagoMovilPhone','pagoMovilId',
  'bankName','accountNumber','accountType','routingNumber',
  'colombiaBank','colombiaAccountNumber','colombiaAccountType',
  'colombiaDocumentType','colombiaDocumentNumber',
] as const;

function rowToPayment(row: any): PaymentInfo {
  const details = row.details ?? {};
  const result: PaymentInfo = {
    id:          row.id,
    method:      row.method as PaymentMethod,
    active:      row.active,
    accountName: row.account_name ?? undefined,
  };
  for (const field of DETAIL_FIELDS) {
    if (details[field] !== undefined) (result as any)[field] = details[field];
  }
  return result;
}

function paymentToRow(p: Omit<PaymentInfo, 'id'>) {
  const details: Record<string, any> = {};
  for (const field of DETAIL_FIELDS) {
    if ((p as any)[field] !== undefined) details[field] = (p as any)[field];
  }
  return {
    method:       p.method,
    active:       p.active,
    account_name: p.accountName ?? null,
    details,
  };
}

export async function listPaymentInfo(): Promise<PaymentInfo[]> {
  const { data, error } = await supabase.from('payment_info').select('*').order('method');
  if (error) throw error;
  return (data ?? []).map(rowToPayment);
}

export async function createPaymentInfo(p: Omit<PaymentInfo, 'id'>): Promise<void> {
  const { error } = await supabase.from('payment_info').insert(paymentToRow(p));
  if (error) throw error;
}

export async function updatePaymentInfo(id: string, updates: Partial<PaymentInfo>): Promise<void> {
  const row: Record<string, any> = {};
  if (updates.active !== undefined)      row.active       = updates.active;
  if (updates.accountName !== undefined) row.account_name = updates.accountName;
  const details: Record<string, any> = {};
  for (const field of DETAIL_FIELDS) {
    if ((updates as any)[field] !== undefined) details[field] = (updates as any)[field];
  }
  if (Object.keys(details).length > 0) row.details = details;
  const { error } = await supabase.from('payment_info').update(row).eq('id', id);
  if (error) throw error;
}

export async function deletePaymentInfo(id: string): Promise<void> {
  const { error } = await supabase.from('payment_info').delete().eq('id', id);
  if (error) throw error;
}

// ─── Site Settings ────────────────────────────────────────────────────────────

export async function getSiteSettings(): Promise<SiteSettings> {
  const { data, error } = await supabase.from('site_settings').select('tagline').eq('id', 1).single();
  if (error) throw error;
  return { tagline: data.tagline };
}

export async function updateSiteSettings(settings: Partial<SiteSettings>): Promise<void> {
  const { error } = await supabase.from('site_settings').update(settings).eq('id', 1);
  if (error) throw error;
}
