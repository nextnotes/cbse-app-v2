-- ============================================
-- Migration 8: Homepage visit counter
-- Run this in Supabase SQL Editor. Safe to run once.
-- ============================================

create table if not exists public.site_stats (
  id int primary key default 1,
  total_visits bigint not null default 0
);
insert into public.site_stats (id, total_visits) values (1, 0) on conflict (id) do nothing;

-- Atomic increment so concurrent visits don't lose counts to a race condition.
create or replace function increment_site_visits()
returns bigint
language plpgsql
security definer
as $$
declare
  new_count bigint;
begin
  update public.site_stats set total_visits = total_visits + 1 where id = 1
  returning total_visits into new_count;
  return new_count;
end;
$$;
