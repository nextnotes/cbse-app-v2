import { createClient } from '@supabase/supabase-js';

// These come from your Supabase project settings (Project Settings > API)
// Set them as environment variables in Vercel — never hard-code real keys here.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// We give students a "Unique ID" instead of an email, but Supabase Auth
// needs an email-shaped string internally. This turns a unique ID into
// a hidden pseudo-email like "stu1234@cbseapp-users.com" that the student
// never sees or types. NOTE: we intentionally avoid reserved-looking TLDs
// like .local/.test/.invalid — Supabase's email validator rejects those.
export function idToPseudoEmail(uniqueId) {
  const clean = uniqueId.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${clean}@cbseapp-users.com`;
}
