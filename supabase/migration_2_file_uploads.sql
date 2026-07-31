-- ============================================
-- Migration 2: File uploads (PDF notes, 3D model files)
-- Run this in Supabase SQL Editor (in addition to the original schema.sql)
-- Safe to run once. Do not run schema.sql again — it would duplicate the seed row.
-- ============================================

-- New columns on content table to store uploaded file paths
alter table public.content add column if not exists pdf_path text;
alter table public.content add column if not exists model_3d_path text;

-- Private storage bucket — "private" means files are NOT publicly reachable by a
-- plain URL. Students only get temporary, expiring links generated at view-time.
insert into storage.buckets (id, name, public)
values ('chapter-files', 'chapter-files', false)
on conflict (id) do nothing;

-- Any logged-in user (student or admin) can read files, but only to generate a
-- signed/expiring link — there's no page that hands out a permanent download link.
drop policy if exists "Authenticated users can read chapter files" on storage.objects;
create policy "Authenticated users can read chapter files"
on storage.objects for select
using (bucket_id = 'chapter-files' and auth.role() = 'authenticated');

-- Only admins can upload
drop policy if exists "Admins can upload chapter files" on storage.objects;
create policy "Admins can upload chapter files"
on storage.objects for insert
with check (
  bucket_id = 'chapter-files' and
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Only admins can replace files
drop policy if exists "Admins can update chapter files" on storage.objects;
create policy "Admins can update chapter files"
on storage.objects for update
using (
  bucket_id = 'chapter-files' and
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Only admins can delete files
drop policy if exists "Admins can delete chapter files" on storage.objects;
create policy "Admins can delete chapter files"
on storage.objects for delete
using (
  bucket_id = 'chapter-files' and
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
