// Authentication wrapper around Supabase Auth.
// All admin/employee logins go through here; customers never log in.

import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { User as AppUser } from '../types';

// Isolated client for first-admin signup. persistSession: false means it never
// stores a session or fires the main client's onAuthStateChange — avoiding the
// GoTrueClient lock deadlock that occurs when signup fires a callback that calls
// getSession() while the lock is still held.
let _firstAdminClient: ReturnType<typeof createClient> | null = null;
function getFirstAdminClient() {
  if (!_firstAdminClient) {
    _firstAdminClient = createClient(
      import.meta.env.VITE_SUPABASE_URL ?? '',
      import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
          storageKey: 'elemental-first-admin-tmp',
        },
      },
    );
  }
  return _firstAdminClient;
}

export async function signIn(email: string, password: string): Promise<AppUser> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.user) throw new Error('No user returned');

  // Load role/name from the public.profiles row created by the auth trigger.
  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select('name, role, phone, active, created_at')
    .eq('id', data.user.id)
    .single();
  if (pErr) throw pErr;
  if (!profile.active) {
    await supabase.auth.signOut();
    throw new Error('Tu cuenta está desactivada. Contacta al administrador.');
  }

  return {
    id:        data.user.id,
    email:     data.user.email ?? email,
    name:      profile.name ?? data.user.email ?? '',
    role:      profile.role as AppUser['role'],
    active:    profile.active,
    createdAt: profile.created_at,
    phone:     profile.phone ?? undefined,
  };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

// One-time setup: creates the very first admin account.
// Uses an isolated client so signup never fires the main onAuthStateChange callback
// (avoids the GoTrueClient lock deadlock). claim_first_admin is called on the
// subsequent signIn via signInAndMaybeClaimAdmin.
export async function signUpFirstAdmin(email: string, password: string, name?: string): Promise<void> {
  const client = getFirstAdminClient();
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: { name: name ?? email } },
  });
  if (error) throw error;
  if (!data.user) throw new Error('Signup returned no user');
  await client.auth.signOut();
}

// Sign in and, if the user is a first-time customer with no other admin, promote to admin.
export async function signInAndMaybeClaimAdmin(email: string, password: string): Promise<AppUser> {
  const user = await signIn(email, password);
  if (user.role === 'customer') {
    const { data: claimed } = await supabase.rpc('claim_first_admin');
    if (claimed) {
      // Re-fetch profile now that role is admin
      const updated = await getCurrentUser();
      if (updated) return updated;
    }
  }
  return user;
}

// Fetch the AppUser for the current session (or null if no session)
export async function getCurrentUser(): Promise<AppUser | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, role, phone, active, created_at')
    .eq('id', session.user.id)
    .single();
  if (!profile || !profile.active) return null;

  return {
    id:        session.user.id,
    email:     session.user.email ?? '',
    name:      profile.name ?? session.user.email ?? '',
    role:      profile.role as AppUser['role'],
    active:    profile.active,
    createdAt: profile.created_at,
    phone:     profile.phone ?? undefined,
  };
}
