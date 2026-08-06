-- ============================================
-- Migration 16: Security advisor fixes
-- Run this in Supabase SQL Editor. Safe to run once.
-- ============================================

-- "Function Search Path Mutable" + the SECURITY DEFINER warnings on
-- increment_site_visits: without a pinned search_path, a SECURITY DEFINER
-- function can in theory be tricked into resolving public.site_stats to a
-- different, attacker-controlled object if someone else could create one
-- earlier in the path. Pinning search_path closes that off. This function is
-- meant to be callable by anyone (every homepage visit increments it,
-- logged-in or not), so we keep it public-callable — that part is intended,
-- not a bug.
create or replace function public.increment_site_visits()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count bigint;
begin
  update public.site_stats set total_visits = total_visits + 1 where id = 1
  returning total_visits into new_count;
  return new_count;
end;
$$;

-- "RLS Enabled No Policy" on site_stats: the app only ever reads/writes this
-- table server-side via the service role key (which bypasses RLS anyway), so
-- the missing policy isn't an active hole — but Supabase flags it because,
-- with RLS on and zero policies, the intent is ambiguous. total_visits is a
-- public, non-sensitive number (it's shown on the homepage), so we make the
-- intent explicit: anyone can read it, nobody can write it directly (writes
-- only happen through the increment_site_visits function above).
drop policy if exists "Anyone can read site stats" on public.site_stats;
create policy "Anyone can read site stats"
on public.site_stats for select
using (true);
