-- ============================================
-- Migration 15: Chapter images (diagrams, maps, pictures used in notes)
-- Run this in Supabase SQL Editor (in addition to prior migrations)
-- Safe to run once.
-- ============================================

-- Public bucket — these are just diagrams/maps/illustrations shown inside notes,
-- not sensitive files, so a plain permanent URL is fine (no signed-link dance).
insert into storage.buckets (id, name, public)
values ('chapter-images', 'chapter-images', true)
on conflict (id) do nothing;

-- Anyone can view (bucket is public, but keep an explicit read policy for clarity)
drop policy if exists "Anyone can read chapter images" on storage.objects;
create policy "Anyone can read chapter images"
on storage.objects for select
using (bucket_id = 'chapter-images');

-- Only admins can upload (the AI-generation route uploads via the service role,
-- which bypasses this anyway, but this covers any direct admin-side uploads too)
drop policy if exists "Admins can upload chapter images" on storage.objects;
create policy "Admins can upload chapter images"
on storage.objects for insert
with check (
  bucket_id = 'chapter-images' and
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

drop policy if exists "Admins can delete chapter images" on storage.objects;
create policy "Admins can delete chapter images"
on storage.objects for delete
using (
  bucket_id = 'chapter-images' and
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
