-- ============================================
-- Migration 12: Star rating (1-5) for student feedback
-- Run this in Supabase SQL Editor. Safe to run once.
-- ============================================

alter table public.feedback add column if not exists rating smallint;
alter table public.feedback drop constraint if exists feedback_rating_check;
alter table public.feedback add constraint feedback_rating_check check (rating is null or (rating between 1 and 5));
