-- ============================================
-- Migration 14: Chapter ordering
-- Adds an order_index so chapters can be arranged in a real sequence
-- within each grade/subject, instead of just showing in creation order.
-- Run this in Supabase SQL Editor. Safe to run once.
-- ============================================

alter table public.content add column if not exists order_index integer not null default 0;

-- Give any existing chapters a sensible starting order (by creation date)
-- within their own grade+subject group, so nothing looks broken right after
-- this migration runs.
with ranked as (
  select id, row_number() over (partition by grade, subject order by created_at asc) - 1 as rn
  from public.content
)
update public.content c
set order_index = ranked.rn
from ranked
where c.id = ranked.id;
