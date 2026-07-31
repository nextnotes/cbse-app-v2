-- ============================================
-- Migration 5: Video notes + Mock Test system
-- Run this in Supabase SQL Editor. Safe to run once.
-- ============================================

-- Video links per chapter (array of {title, url})
alter table public.content add column if not exists video_links jsonb default '[]';

-- Mock tests: admin-created MCQ sets, independent of chapters
create table if not exists public.mock_tests (
  id uuid primary key default gen_random_uuid(),
  grade int not null,
  subject text not null,
  title text not null,
  questions jsonb not null default '[]',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.mock_tests enable row level security;

drop policy if exists "Authenticated users can read mock tests" on public.mock_tests;
create policy "Authenticated users can read mock tests"
on public.mock_tests for select
using (auth.role() = 'authenticated');

drop policy if exists "Admins can insert mock tests" on public.mock_tests;
create policy "Admins can insert mock tests"
on public.mock_tests for insert
with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

drop policy if exists "Admins can delete mock tests" on public.mock_tests;
create policy "Admins can delete mock tests"
on public.mock_tests for delete
using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Mock test attempts: one row per student submission, used for scoring + Excel export
create table if not exists public.mock_test_attempts (
  id uuid primary key default gen_random_uuid(),
  test_id uuid references public.mock_tests(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete cascade,
  student_name text,
  student_unique_id text,
  score int not null,
  total int not null,
  submitted_at timestamptz not null default now()
);
alter table public.mock_test_attempts enable row level security;

drop policy if exists "Students can insert their own attempt" on public.mock_test_attempts;
create policy "Students can insert their own attempt"
on public.mock_test_attempts for insert
with check (student_id = auth.uid());

drop policy if exists "Students see own attempts, admins see all" on public.mock_test_attempts;
create policy "Students see own attempts, admins see all"
on public.mock_test_attempts for select
using (
  student_id = auth.uid()
  or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
