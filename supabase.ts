// Supabase client singleton. Used by hooks, context, and direct callers.
//
// Credentials come from .env.local (development) or Vercel env vars (production).
// The anon/publishable key is safe to expose in client code — Row Level Security
// policies on the server enforce what each role can read/write.

import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  // Fail loud during development; in production this would only happen
  // if env vars aren't set on the host (Vercel).
  // eslint-disable-next-line no-console
  console.error(
    'Missing Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local',
  );
}

export const supabase = createClient(url ?? '', anonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
