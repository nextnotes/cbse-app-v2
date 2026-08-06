-- ============================================
-- Migration 9: Student feedback ("how did you feel about this session?")
-- Run this in Supabase SQL Editor. Safe to run once.
-- ============================================

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles(id) on delete cascade,
  student_name text,
  mood text,
  message text,
  created_at timestamptz not null default now()
);
alter table public.feedback enable row level security;

drop policy if exists "Students can submit their own feedback" on public.feedback;
create policy "Students can submit their own feedback"
on public.feedback for insert
with check (student_id = auth.uid());

drop policy if exists "Students see own feedback, admins see all" on public.feedback;
create policy "Students see own feedback, admins see all"
on public.feedback for select
using (
  student_id = auth.uid()
  or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
