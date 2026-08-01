import { createClient } from '@supabase/supabase-js';

// DANGER: this uses the SERVICE ROLE key, which bypasses all security rules.
// This file must only ever be imported from files inside app/api/ (server-side).
// NEVER import this from a page component or expose SUPABASE_SERVICE_ROLE_KEY
// with the NEXT_PUBLIC_ prefix, or it will leak to the browser.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
