-- ============================================
-- Migration 13: Fix missing admin UPDATE permission on feedback
-- Migration 9 only added INSERT (students) and SELECT (own + admin) policies
-- for the feedback table — it was missing an UPDATE policy, which silently
-- blocked the "Approve to show publicly" and display-name features.
-- Run this in Supabase SQL Editor. Safe to run once.
-- ============================================

drop policy if exists "Admins can update feedback" on public.feedback;
create policy "Admins can update feedback"
on public.feedback for update
using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

drop policy if exists "Admins can delete feedback" on public.feedback;
create policy "Admins can delete feedback"
on public.feedback for delete
using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
