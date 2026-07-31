-- ============================================
-- Migration 3: PDF uploads for Short Answer and Long Answer question sections
-- Run this in Supabase SQL Editor (in addition to schema.sql and migration_2).
-- Safe to run once.
-- ============================================

alter table public.content add column if not exists short_answer_pdf_path text;
alter table public.content add column if not exists long_answer_pdf_path text;

-- These reuse the same "chapter-files" private bucket and policies created in
-- migration_2_file_uploads.sql — no new bucket or policy needed.
