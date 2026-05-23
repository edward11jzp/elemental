// User management for the admin panel.
// Uses an isolated Supabase client for sign-ups so creating a new staff member
// does NOT replace the current admin's session.

import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { User as AppUser } from '../types';

// Lazy-initialized isolated client — only created when admin creates a user.
// Uses a unique storageKey so it never conflicts with the main Supabase client.
let _signupClient: ReturnType<typeof createClient> | null = null;
function getSignupClient() {
  if (!_signupClient) {
    _signupClient = createClient(
      import.meta.env.VITE_SUPABASE_URL ?? '',
      import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
          storageKey: 'elemental-signup-tmp',
        },
      },
    );
  }
  return _signupClient;
}

function rowToUser(row: any): AppUser {
  return {
    id:        row.id,
    email:     row.email ?? '',
    name:      row.name ?? row.email ?? '',
    role:      row.role,
    active:    row.active,
    createdAt: row.created_at,
    phone:     row.phone ?? undefined,
  };
}

// List every user in the system (admin only — RPC enforces it).
export async function listUsers(): Promise<AppUser[]> {
  const { data, error } = await supabase.rpc('admin_list_users');
  if (error) throw error;
  return (data ?? []).map(rowToUser);
}

// Create a new staff member (admin or employee).
export async function createStaff(
  email: string,
  password: string,
  name: string,
  role: 'admin' | 'employee',
  phone?: string,
): Promise<void> {
  const client = getSignupClient();
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) throw error;
  if (!data.user) throw new Error('Signup returned no user');

  await client.auth.signOut();

  const { error: roleErr } = await supabase.rpc('admin_set_user_role', {
    target_id: data.user.id,
    new_role:  role,
    new_name:  name,
    new_phone: phone ?? null,
  });
  if (roleErr) throw roleErr;
}

export async function setUserActive(userId: string, active: boolean): Promise<void> {
  const { error } = await supabase.rpc('admin_set_user_active', {
    target_id: userId,
    is_active: active,
  });
  if (error) throw error;
}

export async function setUserRole(
  userId: string,
  role: 'admin' | 'employee' | 'customer',
  name?: string,
  phone?: string,
): Promise<void> {
  const { error } = await supabase.rpc('admin_set_user_role', {
    target_id: userId,
    new_role:  role,
    new_name:  name ?? null,
    new_phone: phone ?? null,
  });
  if (error) throw error;
}

export async function deleteUser(userId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_delete_user', { target_id: userId });
  if (error) throw error;
}
